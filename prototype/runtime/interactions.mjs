// This function deliberately closes over no module state: the renderer embeds
// the same browser-safe implementation under its CSP script hash.
export function installPresentationInteractions(config, environment = {}) {
  const doc = environment.document ?? document, win = environment.window ?? window;
  const loc = environment.location ?? win.location, history = environment.history ?? win.history;
  const later = environment.setTimeout ?? win.setTimeout.bind(win), cancel = environment.clearTimeout ?? win.clearTimeout.bind(win);
  const scenes = [...doc.querySelectorAll('section[data-scene-id]')], nodes = new Map(config.nodes.map(node => [node.id, node]));
  const actions = config.actions, results = [], listeners = [], sceneListeners = [], timers = new Map(), pending = new Map(), clipboardWaits = new Map(), hoverStates = new Map(), scheduled = new Map();
  let activeScene, epoch = 0, destroyed = false, timeoutCount = 0, clipboardNotice, tooltip, tooltipSource, tooltipCloseTimer, operation = 0;
  const initial = new Map();
  const stateVersions = new WeakMap();
  const record = (action, status, extra = {}) => {
    const value = { actionId: action?.id, effect: action?.effect.type, status, sceneId: activeScene, ...extra };
    if (results.length === 5000) results.shift(); results.push(value); return value;
  };
  const listen = (target, type, callback, scoped = false) => { target.addEventListener(type, callback); (scoped ? sceneListeners : listeners).push(() => target.removeEventListener(type, callback)); };
  const sceneElement = id => scenes.find(scene => scene.dataset.sceneId === id);
  const sceneNodes = new Map();
  function refreshSceneNodes(id) {
    const index = new Map();
    for (const element of sceneElement(id)?.querySelectorAll('[data-definition-id]') ?? []) { const key = element.dataset.definitionId; if (!index.has(key)) index.set(key, []); index.get(key).push(element); }
    sceneNodes.set(id, index); return index;
  }
  const matches = (id, sceneId = activeScene) => (sceneNodes.get(sceneId) ?? refreshSceneNodes(sceneId)).get(id) ?? [];
  const familyByMember = new Map((config.componentFamilies ?? []).flatMap(family => family.memberNodeIds.map(id => [id, family.id])));
  const elementKey = element => element?.dataset.nodeId ?? element?.dataset.definitionId ?? '';
  const targetElements = (id, origin) => {
    const definition = nodes.get(id);
    for (let element = origin; element && element !== sceneElement(activeScene); element = element.parentElement) {
      if (!element.dataset.componentState) continue;
      if (elementKey(element) === id || element.dataset.definitionId === id || definition?.kind === 'component' && familyByMember.has(id) && familyByMember.get(element.dataset.componentState) === familyByMember.get(id)) return [element];
    }
    return matches(id);
  };
  const stateOf = (id, origin) => targetElements(id, origin)[0]?.dataset.componentState ?? nodes.get(id)?.componentId ?? id;
  const guardAllows = (action, origin) => !action.guard || stateOf(action.guard.nodeId, origin) === action.guard.stateNodeId;
  const sourceElements = action => nodes.get(action.source.nodeId)?.kind === 'component'
    ? [...(sceneElement(activeScene)?.querySelectorAll('[data-component-state]') ?? [])].filter(element => element.dataset.componentState === action.source.nodeId)
    : matches(action.source.nodeId);
  const templates = [...doc.querySelectorAll('template[data-state-target-id]')];
  for (const node of config.nodes) {
    for (const element of matches(node.id, node.sceneId)) {
      if (!['instance', 'component'].includes(node.kind)) continue;
      const state = node.kind === 'instance' ? node.componentId : node.id;
      element.dataset.componentState = state; initial.set(element, { state, html: element.innerHTML, style: element.getAttribute('style') ?? '' });
    }
  }
  function setState(nodeId, stateNodeId, origin) {
    const target = targetElements(nodeId, origin);
    if (!target.length) throw new Error('COMPONENT_STATE_TEMPLATE_MISSING');
    let changed = false;
    for (const element of target) {
      if (element.dataset.componentState === stateNodeId) continue;
      const template = templates.find(value => value.dataset.stateTargetId === elementKey(element) && value.dataset.stateNodeId === stateNodeId);
      if (!template) throw new Error('COMPONENT_STATE_TEMPLATE_MISSING');
      const replacement = template.content?.firstElementChild;
      if (replacement?.dataset.definitionId === element.dataset.definitionId) { element.innerHTML = replacement.innerHTML; element.setAttribute('style', replacement.getAttribute('style') ?? ''); }
      else element.innerHTML = template.innerHTML;
      element.dataset.componentState = stateNodeId; changed = true;
      stateVersions.set(element, (stateVersions.get(element) ?? 0) + 1);
      for (const [key, previous] of hoverStates) {
        if (previous.element !== element) continue;
        // Child replacement can drop focus and reissue mouseenter without a new engagement.
        if (doc.activeElement !== undefined) previous.keyboard = previous.keyboard && element.contains(doc.activeElement);
        if (previous.applied !== stateNodeId && !previous.pointer && !previous.keyboard) hoverStates.delete(key);
      }
    }
    if (changed) { bindScene(); scheduleTimers(); }
    return changed;
  }
  function hideClipboardNotice() { clipboardNotice?.remove(); clipboardNotice = undefined; }
  function clipboardFallback(text, uncertain = false) {
    hideClipboardNotice(); const panel = doc.createElement('div'); panel.dataset.clipboardFallback = 'true'; panel.setAttribute('role', 'status');
    panel.style.cssText = 'position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;padding:16px;background:white;color:#222;border:1px solid #777;font:16px/1.5 sans-serif';
    const label = doc.createElement('p'); label.textContent = uncertain ? '未能确认复制结果，请选中下方文本后手动复制。' : '复制失败，请选中下方文本后手动复制。';
    const field = doc.createElement('textarea'); field.value = text; field.readOnly = true; field.setAttribute('aria-label', '待复制文本'); field.style.cssText = 'display:block;width:100%;min-height:64px';
    const select = doc.createElement('button'); select.type = 'button'; select.textContent = '选中文本'; select.addEventListener('click', () => { field.focus(); field.select?.(); });
    const close = doc.createElement('button'); close.type = 'button'; close.textContent = '关闭'; close.addEventListener('click', hideClipboardNotice);
    panel.append(label, field, select, close); doc.body.append(panel); clipboardNotice = panel; field.focus(); field.select?.();
  }
  async function execute(action, origin) {
    if (destroyed || action.source.sceneId !== activeScene) return record(action, 'STALE');
    if (!guardAllows(action, origin)) return record(action, 'SKIPPED_GUARD');
    const effect = action.effect;
    if (effect.type === 'unresolved') return record(action, 'UNRESOLVED', { reason: effect.reason });
    if (action.trigger.type === 'hover' && effect.type !== 'change-state') return record(action, 'UNSUPPORTED', { code: 'HOVER_EFFECT_NOT_REVERSIBLE' });
    if (effect.type === 'navigate') {
      if (effect.sceneId !== activeScene) { history.pushState(null, '', `#scene=${encodeURIComponent(effect.sceneId)}`); activateScene(effect.sceneId); }
      return record(action, 'SUCCESS');
    }
    if (effect.type === 'change-state') {
      try { setState(effect.nodeId, effect.stateNodeId, origin); return record(action, 'SUCCESS'); }
      catch (error) { return record(action, 'FAILURE', { code: error.message }); }
    }
    if (effect.type !== 'clipboard') return record(action, 'UNSUPPORTED');
    if (pending.has(action.id)) return record(action, 'IGNORED_PENDING');
    const started = epoch, token = ++operation; pending.set(action.id, token);
    try {
      const clipboard = environment.clipboard ?? win.navigator?.clipboard;
      if (typeof clipboard?.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
      const deadline = new Promise(resolve => {
        const timer = later(() => resolve({ status: 'timeout' }), 5000);
        clipboardWaits.set(token, { timer, cancel: () => resolve({ status: 'cancelled' }) });
      });
      const result = await Promise.race([Promise.resolve(clipboard.writeText(effect.text)).then(() => ({ status: 'written' })), deadline]);
      if (destroyed || started !== epoch || token !== operation) return record(action, 'STALE');
      if (result.status === 'timeout') { clipboardFallback(effect.text, true); return record(action, 'UNKNOWN', { code: 'CLIPBOARD_TIMEOUT', fallback: 'selectable-text' }); }
      hideClipboardNotice(); return record(action, 'SUCCESS');
    } catch {
      if (destroyed || started !== epoch || token !== operation) return record(action, 'STALE');
      clipboardFallback(effect.text); return record(action, 'FAILURE', { code: 'CLIPBOARD_FAILED', fallback: 'selectable-text' });
    } finally { const wait = clipboardWaits.get(token); if (wait) cancel(wait.timer); clipboardWaits.delete(token); if (pending.get(action.id) === token) pending.delete(action.id); }
  }
  function scheduleTimers() {
    const stateToken = (id, element) => {
      const target = id ? targetElements(id, element)[0] : element.closest('[data-component-state]');
      return target ? elementKey(target) + ':' + (stateVersions.get(target) ?? 0) : '';
    };
    const signature = (action, element) => String(epoch) + '|' + stateToken(null, element) + (action.guard ? '|' + stateToken(action.guard.nodeId, element) : '');
    for (const [key, value] of timers) {
      if (value.action.source.sceneId !== activeScene || !value.element.isConnected || !guardAllows(value.action, value.element) || !sourceElements(value.action).includes(value.element) || value.signature !== signature(value.action, value.element)) { cancel(value.timer); timers.delete(key); }
    }
    for (const action of actions) {
      if (action.source.sceneId !== activeScene || action.trigger.type !== 'timeout') continue;
      for (const element of sourceElements(action)) {
        const key = action.id + '|' + elementKey(element);
        if (!guardAllows(action, element) || timers.has(key)) continue;
        const token = signature(action, element);
        const previous = scheduled.get(key);
        // An outer variant can recreate the same source IDs with a fresh local state version.
        if (previous?.token === token && previous.element === element) continue;
        scheduled.set(key, { token, element }); const captured = epoch;
        const timer = later(() => {
          timers.delete(key);
          if (destroyed || captured !== epoch || !element.isConnected || !guardAllows(action, element)) return;
          if (++timeoutCount > 256) { record(action, 'FAILURE', { code: 'TIMEOUT_EVENT_BUDGET' }); return; }
          void execute(action, element);
        }, action.trigger.delayMs);
        timers.set(key, { timer, action, element, signature: token });
      }
    }
  }

  function bindScene() {
    for (const remove of sceneListeners.splice(0)) remove();
    hideTooltip();
    refreshSceneNodes(activeScene);
    for (const element of sceneElement(activeScene).querySelectorAll('[data-definition-id]')) {
      const node = nodes.get(element.dataset.definitionId);
      if (!element.dataset.componentState && ['component', 'instance'].includes(node?.kind)) element.dataset.componentState = node.kind === 'instance' ? node.componentId : node.id;
    }
    for (const action of actions) {
      if (action.source.sceneId !== activeScene || action.trigger.type === 'timeout') continue;
      for (const element of sourceElements(action)) {
        const type = action.trigger.type;
        if (['click', 'submit', 'hover', 'focus', 'blur'].includes(type)) { if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0'); }
        if (['click', 'submit'].includes(type)) {
          element.setAttribute('role', 'button'); listen(element, type, event => { event.preventDefault(); void execute(action, element); }, true);
          listen(element, 'keydown', event => { if (event.key === 'Enter' || type === 'click' && event.key === ' ') { event.preventDefault(); void execute(action, element); } }, true);
        } else if (type === 'hover') {
          const target = targetElements(action.effect.nodeId, element)[0] ?? element, key = action.id + '|' + elementKey(target);
          const enter = mode => {
            const existing = hoverStates.get(key);
            if (existing) { existing[mode] = true; return; }
            if (!guardAllows(action, element)) return;
            if (action.effect.type === 'change-state') hoverStates.set(key, { action, prior: stateOf(action.effect.nodeId, target), applied: action.effect.stateNodeId, element: target, source: element, bounds: element.getBoundingClientRect?.(), pointer: mode === 'pointer', keyboard: mode === 'keyboard' });
            void execute(action, element);
          };
          const leave = mode => {
            const previous = hoverStates.get(key);
            if (previous) { previous[mode] = false; if (previous.pointer || previous.keyboard) return; }
            hoverStates.delete(key);
            if (previous && action.effect.type === 'change-state' && stateOf(action.effect.nodeId, previous.element) === previous.applied) setState(action.effect.nodeId, previous.prior, previous.element);
          };
          listen(element, 'mouseenter', () => enter('pointer'), true); listen(element, 'mouseleave', () => leave('pointer'), true); listen(element, 'focus', () => enter('keyboard'), true); listen(element, 'blur', () => leave('keyboard'), true);
        } else listen(element, ({ 'mouse-enter': 'mouseenter', 'mouse-leave': 'mouseleave' })[type] ?? type, () => { void execute(action, element); }, true);
      }
    }
    const assetData = doc.getElementById('presentation-assets');
    if (assetData) { const assets = JSON.parse(assetData.textContent); for (const image of sceneElement(activeScene).querySelectorAll('[data-asset-sha]')) image.setAttribute(image.tagName.toLowerCase() === 'img' ? 'src' : 'href', assets[image.dataset.assetSha]); }
    bindBehaviors();
  }
  const originalText = new WeakMap();
  function hideTooltip() {
    if (tooltipCloseTimer !== undefined) cancel(tooltipCloseTimer); tooltipCloseTimer = undefined;
    const prior = tooltip, source = tooltipSource; tooltip = undefined; tooltipSource = undefined;
    source?.removeAttribute('aria-describedby'); prior?.remove();
  }
  function bindBehaviors() {
    for (const behavior of config.behaviors ?? []) {
      if (behavior.source.sceneId !== activeScene) continue;
      for (const element of matches(behavior.source.nodeId)) {
        if (behavior.type === 'truncate-tooltip') {
          let original = originalText.get(element);
          if (!original) { original = { text: element.textContent, html: element.innerHTML }; originalText.set(element, original); }
          if (Array.from(original.text).length <= behavior.maxCharacters) continue;
          element.innerHTML = original.html;
          let remaining = behavior.maxCharacters, last;
          const walker = doc.createTreeWalker(element, 4), textNodes = [];
          while (walker.nextNode()) textNodes.push(walker.currentNode);
          for (const node of textNodes) { const characters = Array.from(node.textContent); node.textContent = characters.slice(0, remaining).join(''); if (node.textContent) last = node; remaining = Math.max(0, remaining - characters.length); }
          if (last) last.textContent += '…';
          element.setAttribute('tabindex', '0');
          let hovered = false, focused = false, tipHovered = false, tipFocused = false, suppressFocus = false;
          const clearClose = () => { if (tooltipCloseTimer !== undefined) cancel(tooltipCloseTimer); tooltipCloseTimer = undefined; };
          const hide = (relatedTarget, pointer = false) => {
            if (tooltipSource !== element || hovered || focused || tipHovered || tipFocused || tooltip?.contains(relatedTarget)) return;
            clearClose();
            if (pointer) tooltipCloseTimer = later(() => { tooltipCloseTimer = undefined; if (tooltipSource === element && !hovered && !focused && !tipHovered && !tipFocused) hideTooltip(); }, 100);
            else hideTooltip();
          };
          const show = () => {
            clearClose(); if (tooltipSource === element && tooltip) return;
            hideTooltip(); tipHovered = false; tipFocused = false;
            const tip = doc.createElement('div'); tip.setAttribute('role', 'tooltip'); tip.id = 'presentation-tooltip'; tip.textContent = original.text;
            tip.setAttribute('tabindex', '0');
            const bounds = element.getBoundingClientRect?.() ?? { left: 0, bottom: 0 };
            tip.style.cssText = 'position:fixed;z-index:2147483647;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#222;color:#fff;padding:8px 12px;border-radius:4px;font:14px/1.5 sans-serif;pointer-events:auto';
            tip.style.left = Math.max(12, Math.min(bounds.left, (win.innerWidth ?? 640) - 36)) + 'px'; tip.style.top = Math.max(12, Math.min(bounds.bottom + 6, (win.innerHeight ?? 480) - 36)) + 'px';
            doc.body.append(tip); tooltip = tip; tooltipSource = element; element.setAttribute('aria-describedby', tip.id);
            const tipBounds = tip.getBoundingClientRect?.();
            if (tipBounds) { if (tipBounds.right > win.innerWidth - 12) tip.style.left = Math.max(12, win.innerWidth - tipBounds.width - 12) + 'px'; if (tipBounds.bottom > win.innerHeight - 12) tip.style.top = Math.max(12, win.innerHeight - tipBounds.height - 12) + 'px'; }
            tip.addEventListener('mouseenter', () => { tipHovered = true; clearClose(); });
            tip.addEventListener('mouseleave', event => { tipHovered = false; hide(event.relatedTarget, true); });
            tip.addEventListener('focus', () => { tipFocused = true; clearClose(); });
            tip.addEventListener('blur', event => { tipFocused = false; if (event.relatedTarget === element) focused = true; hide(event.relatedTarget); });
            tip.addEventListener('keydown', event => {
              if (event.key === 'Escape') { event.preventDefault(); tipFocused = false; tipHovered = false; hideTooltip(); suppressFocus = true; element.focus(); }
            });
          };
          listen(element, 'mouseenter', () => { hovered = true; show(); }, true); listen(element, 'mouseleave', event => { hovered = false; hide(event.relatedTarget, true); }, true);
          listen(element, 'focus', () => { focused = true; if (suppressFocus) suppressFocus = false; else show(); }, true); listen(element, 'blur', event => { focused = false; hide(event.relatedTarget); }, true);
          listen(element, 'keydown', event => {
            if (event.key === 'Escape') { hideTooltip(); element.removeAttribute('aria-describedby'); }
            else if (event.key === 'Tab' && !event.shiftKey && tooltipSource === element && tooltip) { event.preventDefault(); tooltip.focus(); }
          }, true);
        } else if (behavior.type === 'sticky-copy') {
          const targets = matches(behavior.targetNodeId), viewport = sceneElement(activeScene);
          const update = () => {
            const top = Math.max(0, viewport.getBoundingClientRect().top + (viewport.clientTop ?? 0));
            const crossed = element.getBoundingClientRect().bottom <= top;
            for (const target of targets) { target.hidden = !crossed; target.setAttribute('aria-hidden', String(!crossed)); }
          };
          listen(viewport, 'scroll', update, true); listen(win, 'scroll', update, true); listen(win, 'resize', update, true); update();
        }
      }
    }
  }
  function activateScene(id) {
    if (destroyed) return;
    const current = sceneElement(id) ?? scenes[0]; if (!current) throw new Error('SCENE_MISSING');
    if (activeScene === current.dataset.sceneId) return;
    epoch++; timeoutCount = 0;
    for (const wait of clipboardWaits.values()) { cancel(wait.timer); wait.cancel(); } clipboardWaits.clear();
    for (const value of timers.values()) cancel(value.timer); timers.clear(); pending.clear(); hoverStates.clear(); hideClipboardNotice(); hideTooltip();
    for (const [element, value] of initial) { element.innerHTML = value.html; element.setAttribute('style', value.style); element.dataset.componentState = value.state; }
    activeScene = current.dataset.sceneId;
    for (const scene of scenes) scene.hidden = scene !== current;
    doc.documentElement.dataset.sceneId = activeScene; bindScene(); scheduleTimers();
  }
  function fromLocation() {
    let id; try { id = decodeURIComponent(/^#scene=(.*)$/.exec(loc.hash)?.[1] ?? ''); } catch { id = ''; }
    activateScene(id);
  }
  // Replacing the visual child under a pointer can cause Chromium to discard
  // that child's mouse-leave chain. Observe the next real pointer position to
  // end ON_HOVER, without changing one-way mouse-enter/mouse-leave actions.
  listen(doc, 'pointermove', event => {
    for (const [id, previous] of [...hoverStates]) {
      const bounds = previous.source.isConnected ? previous.source.getBoundingClientRect?.() : previous.bounds;
      if (!bounds || event.clientX >= bounds.left && event.clientX < bounds.right && event.clientY >= bounds.top && event.clientY < bounds.bottom) continue;
      previous.pointer = false;
      if (previous.keyboard || previous.element === doc.activeElement || previous.element.contains(doc.activeElement)) continue;
      const action = previous.action; hoverStates.delete(id);
      if (action?.effect.type === 'change-state' && stateOf(action.effect.nodeId, previous.element) === previous.applied) setState(action.effect.nodeId, previous.prior, previous.element);
    }
  });
  listen(doc, 'focusout', event => {
    for (const [key, previous] of [...hoverStates]) {
      if (!previous.element.contains(event.target) || previous.element.contains(event.relatedTarget)) continue;
      previous.keyboard = false; if (previous.pointer) continue;
      hoverStates.delete(key); const action = previous.action;
      if (stateOf(action.effect.nodeId, previous.element) === previous.applied) setState(action.effect.nodeId, previous.prior, previous.element);
    }
  });
  listen(win, 'hashchange', fromLocation); listen(win, 'popstate', fromLocation); fromLocation();
  return { activateScene, dispatch: id => { const action = actions.find(value => value.id === id); if (!action) throw new Error('ACTION_MISSING'); return execute(action); }, getResults: () => results.map(value => ({ ...value })), destroy() {
    if (destroyed) return; destroyed = true; epoch++;
    for (const wait of clipboardWaits.values()) { cancel(wait.timer); wait.cancel(); } clipboardWaits.clear();
    for (const remove of [...listeners.splice(0), ...sceneListeners.splice(0)]) remove(); for (const value of timers.values()) cancel(value.timer); timers.clear(); pending.clear(); hoverStates.clear(); hideClipboardNotice(); hideTooltip();
  } };
}
