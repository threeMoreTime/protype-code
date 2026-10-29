import { createHash } from 'node:crypto';

/** Build an additive manifest only from the explicitly supplied captured mock states. */
export function buildFeedbackInteractionExtensionPlan(input) {
  const ensure = (condition, code) => { if (!condition) throw new Error(`FEEDBACK_EXTENSION_${code}`); };
  const copy = value => JSON.parse(JSON.stringify(value));
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
  const same = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
  const canonical = (destinationId, trigger = { type: 'ON_CLICK' }) => [{ trigger: copy(trigger), actions: [{ type: 'NODE', destinationId, navigation: 'NAVIGATE', transition: null, resetScrollPosition: true, resetVideoPosition: false }] }];
  function triggerFor(link) {
    const trigger = link.trigger === undefined ? { type: 'ON_CLICK' } : link.trigger;
    ensure(trigger && typeof trigger === 'object' && !Array.isArray(trigger) && (trigger.type === 'ON_CLICK' && Object.keys(trigger).length === 1 && Object.keys(trigger)[0] === 'type' || trigger.type === 'AFTER_TIMEOUT' && Object.keys(trigger).length === 2 && Object.keys(trigger).every(key => ['type', 'timeout'].includes(key)) && Number.isInteger(trigger.timeout) && trigger.timeout > 0 && trigger.timeout <= 60000), 'TRIGGER_CANONICAL');
    return trigger;
  }
  ensure(input && typeof input.targetPageId === 'string' && input.predecessor?.plan && Array.isArray(input.approvedStates) && Array.isArray(input.links), 'BUILD_INPUT');
  const previous = input.predecessor.plan, { planHash: oldHash, ...oldPayload } = previous;
  ensure(hash(oldPayload) === oldHash && previous.schemaVersion === 'feedback-fidelity-prototype-plan/1' && previous.states?.length === 41 && previous.links?.length === 125 && previous.flows?.length === 5, 'PREDECESSOR_PLAN');
  const priorStates = new Map(previous.states.map(state => [state.id, state]));
  ensure(priorStates.size === 41 && new Set(previous.links.map(link => link.id)).size === 125 && new Set(previous.links.map(link => link.sourceNodeId)).size === 125
    && previous.links.every(link => priorStates.has(link.sourceStateId) && link.destinationRootNodeId === priorStates.get(link.destinationStateId)?.rootNodeId && same(link.reactions, canonical(link.destinationRootNodeId)))
    && previous.flows.every(flow => flow.nodeId === priorStates.get(flow.stateId)?.rootNodeId), 'PREDECESSOR_GRAPH');
  const states = [], byId = new Map(), roots = new Set(), operations = new Set(), captureIndexes = new Map();
  for (const state of input.approvedStates) {
    const capture = state.capture;
    ensure(capture?.schemaVersion === 'feedback-fidelity-capture/1' && capture.privacy?.mockOnly === true && capture.privacy.authenticatedCapture === false && capture.privacy.credentialsRead === false && capture.viewport?.width === 1440 && capture.viewport.height === 1000 && capture.viewport.dpr === 1 && Array.isArray(capture.nodes) && capture.nodes.length > 0 && capture.nodes.length <= 20000 && !capture.unsupported?.length && hash(capture) === state.captureHash && capture.rootId === state.captureRootId, 'CAPTURE_EVIDENCE');
    ensure(typeof state.id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(state.id) && typeof state.rootNodeId === 'string' && state.rootNodeId.length > 0 && state.rootNodeId.length <= 200 && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(state.operationKey)
      && !byId.has(state.id) && !roots.has(state.rootNodeId) && !operations.has(state.operationKey) && /^[a-f0-9]{64}$/.test(state.expectedNativeLedgerHash), 'STATE_CONFLICT');
    const value = { id: state.id, operationKey: state.operationKey, rootNodeId: state.rootNodeId, captureRootId: state.captureRootId, captureHash: state.captureHash, expectedNativeLedgerHash: state.expectedNativeLedgerHash, mockOnly: true };
    const index = new Map(capture.nodes.map(node => [node.id, node]));
    ensure(index.size === capture.nodes.length && index.get(capture.rootId)?.parentId === null && capture.nodes.every(node => !node.parentId || index.has(node.parentId)), 'CAPTURE_GRAPH');
    captureIndexes.set(state.id, index);
    states.push(value); byId.set(state.id, state); roots.add(state.rootNodeId); operations.add(state.operationKey);
  }
  for (const oldState of previous.states) ensure(same(Object.fromEntries(Object.keys(oldState).map(key => [key, byId.get(oldState.id)?.[key]])), oldState), 'PREDECESSOR_STATE_WHITELIST');
  const rectValid = rect => rect && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) && rect.width > 0 && rect.height > 0;
  const intersect = (a, b) => { if (!rectValid(a) || !rectValid(b)) return null; const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; };
  function chainFor(node, state) {
    const index = captureIndexes.get(state.id), chain = [], seen = new Set();
    while (node) { ensure(!seen.has(node.id) && chain.length < 20000, 'CAPTURE_GRAPH'); seen.add(node.id); chain.push(node); node = index.get(node.parentId); }
    ensure(chain.at(-1)?.id === state.captureRootId, 'CAPTURE_GRAPH'); return chain;
  }
  const presentAttribute = (attrs, name) => Object.prototype.hasOwnProperty.call(attrs, name) && attrs[name] !== false;
  function hidden(chain) {
    return chain.some(node => { const attrs = node.attrs ?? {}, style = node.style ?? {}; return presentAttribute(attrs, 'hidden') || presentAttribute(attrs, 'inert') || attrs['aria-hidden'] === true || attrs['aria-hidden'] === 'true' || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity !== undefined && style.opacity !== '' && Number(style.opacity) === 0; });
  }
  function visibleRect(node, state) {
    if (hidden(chainFor(node, state))) return null;
    const measured = Object.prototype.hasOwnProperty.call(node, 'visibleRect') ? node.visibleRect : node.rect;
    let result = intersect(measured, { x: 0, y: 0, width: 1440, height: 1000 });
    for (const clip of node.clips ?? []) result = intersect(result, clip.rect);
    return result;
  }
  function sourceEligibility(node, state) {
    const chain = chainFor(node, state);
    ensure(!hidden(chain), 'SOURCE_HIDDEN'); ensure(visibleRect(node, state), 'SOURCE_CLIPPED');
    ensure(!chain.some(value => {
      const attrs = value.attrs ?? {}, classes = String(attrs.class ?? '').split(/\s+/);
      return presentAttribute(attrs, 'disabled') || attrs['aria-disabled'] === true || attrs['aria-disabled'] === 'true' || value.style?.pointerEvents === 'none' || classes.some(name => /^ant-(?:checkbox|radio|select|segmented|btn|tree|picker-cell)(?:-[a-z0-9]+)*-disabled$/.test(name));
    }), 'SOURCE_DISABLED');
    const dialogs = state.capture.nodes.filter(value => ['dialog', 'alertdialog'].includes(value.attrs?.role) && visibleRect(value, state))
      .sort((a, b) => (a.paintIndex ?? state.capture.nodes.indexOf(a)) - (b.paintIndex ?? state.capture.nodes.indexOf(b)));
    if (dialogs.length) ensure(chain.some(value => value.id === dialogs.at(-1).id), 'SOURCE_MODAL_BACKGROUND');
    if (node.attrs?.role === 'img') ensure(chain.some(value => ['button', 'a', 'input', 'textarea', 'select', 'label'].includes(value.tag)
      || ['button', 'tab', 'checkbox', 'radio', 'option', 'menuitem', 'combobox'].includes(value.attrs?.role)
      || String(value.attrs?.class ?? '').split(/\s+/).some(name => ['ant-pro-table-list-toolbar-setting-item', 'ant-select-selector', 'ant-segmented-item', 'ant-tree-checkbox', 'ant-checkbox-wrapper', 'ant-radio-wrapper', 'ant-picker-cell'].includes(name))), 'SOURCE_ICON_CONTROL_CHAIN');
  }
  const oldSources = new Set(previous.links.map(link => link.sourceNodeId)), used = new Set(), ids = new Set();
  const links = input.links.map(link => {
    ensure(typeof link.id === 'string' && link.id.length > 0 && link.id.length <= 200 && typeof link.sourceCaptureId === 'string' && link.sourceCaptureId.length > 0 && link.sourceCaptureId.length <= 200 && typeof link.sourceNodeId === 'string' && link.sourceNodeId.length > 0 && link.sourceNodeId.length <= 200, 'LINK_IDENTITY');
    ensure(Object.keys(link).every(key => ['id', 'control', 'sourceStateId', 'sourceCaptureId', 'sourceNodeId', 'destinationStateId', 'destinationRootNodeId', 'reactions', 'trigger'].includes(key)), 'LINK_METADATA_UNSUPPORTED');
    const trigger = triggerFor(link), timer = trigger.type === 'AFTER_TIMEOUT';
    const source = byId.get(link.sourceStateId), destination = byId.get(link.destinationStateId);
    ensure(source && destination && source.id !== destination.id && source.capture.nodes.some(node => node.id === link.sourceCaptureId) && link.destinationRootNodeId === destination.rootNodeId, 'LINK_CAPTURE_SCOPE');
    ensure(timer ? link.sourceCaptureId === source.captureRootId && link.sourceNodeId === source.rootNodeId : link.sourceNodeId !== source.rootNodeId, 'TRIGGER_SCENE_SCOPE');
    const capturedSource = captureIndexes.get(source.id).get(link.sourceCaptureId);
    if (timer) ensure(visibleRect(capturedSource, source), 'TIMER_SCENE_CLIPPED'); else sourceEligibility(capturedSource, source);
    ensure(!oldSources.has(link.sourceNodeId) && !used.has(link.sourceNodeId) && !ids.has(link.id), 'SOURCE_CONFLICT');
    const reactions = canonical(destination.rootNodeId, trigger);
    ensure(link.reactions === undefined || same(link.reactions, reactions), 'LINK_REACTION');
    used.add(link.sourceNodeId); ids.add(link.id);
    return { ...copy(link), reactions };
  });
  const payload = { schemaVersion: 'feedback-fidelity-interaction-extension-plan/1', mockOnly: true, targetPageId: input.targetPageId, predecessor: copy(input.predecessor), states, links, hostAutoFlowPolicy: copy(input.hostAutoFlowPolicy ?? null) };
  if (input.flowStaging !== undefined) {
    const staging = input.flowStaging, baselineRoots = new Set(previous.flows.map(flow => flow.nodeId)), required = new Set(links.map(link => byId.get(link.sourceStateId).rootNodeId).filter(id => !baselineRoots.has(id)));
    ensure(staging && typeof staging === 'object' && !Array.isArray(staging) && Object.keys(staging).length === 2 && staging.strategy === 'EXPLICIT_SOURCE_ROOTS' && Array.isArray(staging.entries) && staging.entries.length === required.size && payload.hostAutoFlowPolicy === null, 'STAGING_POLICY');
    const seen = new Set();
    for (const entry of staging.entries) {
      ensure(entry && typeof entry === 'object' && Object.keys(entry).length === 3 && ['sourceStateId', 'nodeId', 'name'].every(key => Object.prototype.hasOwnProperty.call(entry, key)) && required.has(entry.nodeId) && byId.get(entry.sourceStateId)?.rootNodeId === entry.nodeId && !seen.has(entry.nodeId) && typeof entry.name === 'string' && /^FEEDBACK_EXT:[A-Za-z0-9][A-Za-z0-9_-]{0,63}:[a-z][a-z0-9-]{0,63}$/.test(entry.name) && entry.name.endsWith(':' + entry.sourceStateId), 'STAGING_ENTRY'); seen.add(entry.nodeId);
    }
    payload.flowStaging = copy(staging);
  }
  return { ...payload, planHash: hash(payload) };
}

/** Public Plugin API runtime; serializable without module closures.
 * Native integrity here means complete, hash-bound ledger bytes plus exact endpoint
 * ownership. Scene snapshot/PNG/Present audits remain separate. The final bounded
 * unit removes only journaled host Flow N extras. Opt-in explicit flow staging
 * adds a first bounded unit and removes only its declared temporary entries at
 * cleanup. The predecessor125/5 denominator and namespace are never rewritten.
 * Pending/unknown writes require manual audit; catch never cleans up or retries.
 */
export async function applyFeedbackInteractionExtensions(figma, suppliedPlan, options = {}) {
  const ensure = (condition, code) => { if (!condition) throw new Error(`FEEDBACK_EXTENSION_${code}`); };
  const copy = value => JSON.parse(JSON.stringify(value));
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const ordered = value => Array.isArray(value) ? value.map(ordered) : plain(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
  const same = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
  const rawReaction = node => JSON.stringify(node.reactions ?? []);
  function sha256(text) {
    const bytes = [];
    for (const character of text) { const code = character.codePointAt(0); if (code < 128) bytes.push(code); else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63); else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63); }
    const bitLength = bytes.length * 8; bytes.push(128); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let index = 7; index >= 0; index--) bytes.push(index >= 4 ? 0 : Math.floor(bitLength / 2 ** (index * 8)) & 255);
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], rotate = (word, count) => word >>> count | word << 32 - count;
    for (let begin = 0; begin < bytes.length; begin += 64) {
      const words = new Array(64);
      for (let index = 0; index < 16; index++) words[index] = (bytes[begin + index * 4] << 24 | bytes[begin + index * 4 + 1] << 16 | bytes[begin + index * 4 + 2] << 8 | bytes[begin + index * 4 + 3]) >>> 0;
      for (let index = 16; index < 64; index++) { const a = words[index - 15], b = words[index - 2]; words[index] = (words[index - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + words[index - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10)) >>> 0; }
      let [a,b,c,d,e,f,g,h] = state;
      for (let index = 0; index < 64; index++) { const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + constants[index] + words[index]) >>> 0, second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) >>> 0; h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0; }
      for (const [index, word] of [a,b,c,d,e,f,g,h].entries()) state[index] = (state[index] + word) >>> 0;
    }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }
  const hash = value => sha256(typeof value === 'string' ? value : JSON.stringify(value));
  const canonical = (destinationId, trigger = { type: 'ON_CLICK' }) => [{ trigger: copy(trigger), actions: [{ type: 'NODE', destinationId, navigation: 'NAVIGATE', transition: null, resetScrollPosition: true, resetVideoPosition: false }] }];
  function triggerFor(link) {
    const trigger = link.trigger === undefined ? { type: 'ON_CLICK' } : link.trigger;
    ensure(plain(trigger) && (trigger.type === 'ON_CLICK' && Object.keys(trigger).length === 1 && Object.keys(trigger)[0] === 'type' || trigger.type === 'AFTER_TIMEOUT' && Object.keys(trigger).length === 2 && Object.keys(trigger).every(key => ['type', 'timeout'].includes(key)) && Number.isInteger(trigger.timeout) && trigger.timeout > 0 && trigger.timeout <= 60000), 'TRIGGER_CANONICAL');
    return trigger;
  }
  function normalizeReadback(reactions) {
    return copy(reactions).map(reaction => {
      const defaults = action => { if (action?.type === 'NODE') { if (action.resetInteractiveComponents === false) delete action.resetInteractiveComponents; if (action.resetVideoPosition === undefined) action.resetVideoPosition = false; } return action; };
      if (reaction.actions) reaction.actions = reaction.actions.map(defaults);
      if (reaction.action) reaction.action = defaults(reaction.action);
      if (reaction.actions?.length === 1 && same(reaction.action, reaction.actions[0])) delete reaction.action;
      return reaction;
    });
  }
  let plan, page, ledger = null, ownSpace = null, prefix, stage = 'VALIDATION', mutationStarted = false, stagingEnabled = false, stagingFlows = [], ownWitness = null, ownNamespaceDrift = false;
  const mode = options.mode ?? 'preflight', batchSize = options.batchSize ?? 20, operationKey = options.operationKey, mutated = new Set(), states = new Map(), roots = new Map(), nodes = new Map(), nativeSpaces = new Map();
  let oldSpace, oldNodes = [], previousFlows = [], initialOldReactions = [];
  const response = (status, extra = {}) => {
    const planned = Array.isArray(plan?.links) ? plan.links.length : 0, applied = Array.isArray(ledger?.applied) ? ledger.applied.length : 0;
    const verified = ['PREFLIGHT', 'APPLIED_BATCH', 'COMPLETE', 'ALREADY_COMPLETE', 'AUDIT_PASS'].includes(status) && !extra.issues?.length;
    return { tag: 'FEEDBACK_INTERACTION_EXTENSIONS', status, operationKey, targetPageId: plan?.targetPageId ?? null, planHash: plan?.planHash ?? null, cursor: ledger?.cursor ?? 0, totalUnits: planned + (stagingEnabled ? 2 : 1), complete: ledger?.complete ?? false, pending: !!ledger?.pending || !!ownSpace?.intent, createdNodeIds: [], mutatedNodeIds: [...mutated], generatedAutoFlowCount: ledger?.hostGeneratedFlows?.length ?? 0,
      ...(stagingEnabled ? { flowStaging: { strategy: 'EXPLICIT_SOURCE_ROOTS', temporaryFlowCount: stagingFlows.length, stagingDone: ledger?.stagingDone ?? false, cleanupDone: ledger?.cleanupDone ?? false } } : {}),
      coverage: { predecessor: { planned: 125, verified: oldNodes.length }, extension: { planned, applied }, combined: { planned: 125 + planned, applied: oldNodes.length + applied } },
      verification: { nativeLedgerIntegrity: verified ? 'PASS' : 'NOT VERIFIED', sourceDestinationOwnership: verified ? 'PASS' : 'NOT VERIFIED', nativeSceneSnapshots: 'NOT RUN', arbitraryInput: 'NOT IMPLEMENTED', realAPI: 'NOT IMPLEMENTED', present: 'NOT RUN' }, ...extra };
  };
  const guard = () => ensure(figma.currentPage?.id === plan.targetPageId && page?.type === 'PAGE', 'PAGE_CHANGED');
  function readSpace(namespace) {
    const headerText = page.getPluginData(namespace + 'header'), intent = page.getPluginData(namespace + 'intent');
    if (!headerText) { ensure(!intent, 'ORPHAN_INTENT'); return null; }
    const header = JSON.parse(headerText);
    ensure(Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256 && /^[a-f0-9]{64}$/.test(header.hash), 'HEADER_INVALID');
    const chunks = [];
    for (let i = 0; i < header.chunks; i += 1) { const chunk = page.getPluginData(namespace + 'chunk_' + i); ensure(chunk && chunk.length <= 16000, 'CHUNK_INVALID'); chunks.push(chunk); }
    const raw = chunks.join(''); ensure(raw.length <= 4096000 && hash(raw) === header.hash, 'LEDGER_HASH');
    return { namespace, headerText, header, intent, chunks, raw, value: JSON.parse(raw) };
  }
  function spaceUnchanged(space) {
    ensure(page.getPluginData(space.namespace + 'header') === space.headerText && page.getPluginData(space.namespace + 'intent') === space.intent, 'PROTECTED_METADATA_DRIFT');
    for (let i = 0; i < space.chunks.length; i += 1) ensure(page.getPluginData(space.namespace + 'chunk_' + i) === space.chunks[i], 'PROTECTED_CHUNK_DRIFT');
  }
  function ownNamespaceSnapshot() {
    return JSON.stringify(page.getPluginDataKeys().filter(key => key.startsWith(prefix)).sort().map(key => [key, page.getPluginData(key)]).filter(([, value]) => value !== ''));
  }
  function ownNamespaceUnchanged() {
    if (!stagingEnabled) return;
    if (ownNamespaceDrift || ownWitness === null || ownNamespaceSnapshot() !== ownWitness) { ownNamespaceDrift = true; ensure(false, 'STAGING_OWN_NAMESPACE_DRIFT'); }
  }
  function checkRoot(state) {
    const root = roots.get(state.id), np = `feedback_fidelity_native_v1__${state.operationKey}__`;
    ensure(root?.type === 'FRAME' && root.parent?.id === page.id && root.removed !== true && root.getPluginData(np + 'operation') === state.operationKey && root.getPluginData(np + 'capture') === state.captureRootId && root.getPluginData(np + 'role') === 'Scene', 'ROOT_OWNERSHIP');
  }
  function checkSource(link) {
    const state = states.get(link.sourceStateId), destination = states.get(link.destinationStateId), node = nodes.get(link.sourceNodeId), native = nativeSpaces.get(state.id).value, np = `feedback_fidelity_native_v1__${state.operationKey}__`;
    checkRoot(state); checkRoot(destination);
    const entry = native.entries.find(value => value.id === link.sourceNodeId);
    ensure(entry?.sourceId === link.sourceCaptureId && node && node.removed !== true && node.getPluginData(np + 'operation') === state.operationKey && node.getPluginData(np + 'capture') === link.sourceCaptureId && node.getPluginData(np + 'role') === entry.role && typeof node.setReactionsAsync === 'function', 'SOURCE_OWNERSHIP');
    if (link.trigger?.type === 'AFTER_TIMEOUT') {
      // The Scene entry is distinct from capture-root Source bounds mapping.
      ensure(entry.role === 'Scene' && link.sourceCaptureId === state.captureRootId && node.id === state.rootNodeId && node.type === 'FRAME' && node.parent?.id === page.id, 'TIMER_SCENE_OWNERSHIP'); return;
    }
    ensure(native.nativeNodeIdByCaptureId[link.sourceCaptureId] === link.sourceNodeId, 'SOURCE_OWNERSHIP');
    let parent = node.parent; const seen = new Set();
    while (parent && parent.id !== state.rootNodeId && !seen.has(parent.id)) { ensure(seen.size < 1000, 'ANCESTRY_BUDGET'); seen.add(parent.id); parent = parent.parent; }
    ensure(parent?.id === state.rootNodeId, 'SOURCE_ANCESTRY');
  }
  function protectedUnchanged() {
    guard(); ownNamespaceUnchanged(); spaceUnchanged(oldSpace);
    for (const space of nativeSpaces.values()) spaceUnchanged(space);
    for (const state of states.values()) checkRoot(state);
    for (let i = 0; i < oldNodes.length; i += 1) ensure(rawReaction(oldNodes[i]) === (ledger?.oldReactions ?? initialOldReactions)[i].raw, 'OLD_REACTION_RAW_DRIFT');
  }
  async function freshStagingReadback(pendingLink = null) {
    guard();
    const freshPage = await figma.getNodeByIdAsync(page.id);
    ensure(freshPage?.id === plan.targetPageId && freshPage.type === 'PAGE', 'FRESH_PAGE_SCOPE'); page = freshPage;
    for (const state of states.values()) { roots.set(state.id, await figma.getNodeByIdAsync(state.rootNodeId)); checkRoot(state); }
    for (const [index, link] of plan.predecessor.plan.links.entries()) {
      const node = await figma.getNodeByIdAsync(link.sourceNodeId); nodes.set(link.sourceNodeId, node); checkSource(link);
      ensure(rawReaction(node) === (ledger?.oldReactions ?? initialOldReactions)[index].raw, 'OLD_REACTION_RAW_DRIFT'); oldNodes[index] = node;
    }
    function checkAdditional(link) {
      const node = nodes.get(link.sourceNodeId); checkSource(link);
      const applied = ledger?.applied?.find(record => record.linkId === link.id), expected = applied?.expectedReactions ?? (pendingLink?.id === link.id ? link.reactions : []);
      ensure(same(normalizeReadback(node.reactions ?? []), expected), 'FRESH_EXTENSION_REACTION_DRIFT');
    }
    for (const link of plan.links) { nodes.set(link.sourceNodeId, await figma.getNodeByIdAsync(link.sourceNodeId)); checkAdditional(link); }
    // All expected values remain local; no await after this retained-object proof.
    for (const link of plan.predecessor.plan.links) checkSource(link);
    for (const link of plan.links) checkAdditional(link);
    protectedUnchanged();
  }
  function validFlows(flows) { return Array.isArray(flows) && flows.length <= 133 && flows.every(flow => plain(flow) && Object.keys(flow).length === 2 && typeof flow.nodeId === 'string' && typeof flow.name === 'string' && flow.name.length > 0 && flow.name.length <= 200) && new Set(flows.map(flow => flow.nodeId)).size === flows.length; }
  const currentFlows = () => copy(page.flowStartingPoints.map(({ nodeId, name }) => ({ nodeId, name })));
  function checkFlowJournal() {
    ensure(validFlows(ledger.flowBaseline) && same(ledger.flowBaseline, previousFlows) && validFlows(ledger.flowOrder) && Array.isArray(ledger.hostGeneratedFlows) && ledger.hostGeneratedFlows.length <= plan.states.length, 'FLOW_JOURNAL');
    if (stagingEnabled) {
      ensure(typeof ledger.stagingDone === 'boolean' && typeof ledger.cleanupDone === 'boolean' && (!ledger.cleanupDone || ledger.stagingDone) && same(ledger.stagingFlows, stagingFlows) && ledger.hostGeneratedFlows.length === 0, 'STAGING_JOURNAL');
      const expected = ledger.stagingDone && !ledger.cleanupDone ? [...previousFlows, ...stagingFlows] : previousFlows;
      ensure(same(ledger.flowOrder, expected) && same(currentFlows(), expected), 'STAGING_FLOW_DRIFT'); return;
    }
    const autoIds = new Set();
    for (const [i, flow] of ledger.hostGeneratedFlows.entries()) {
      const link = plan.links.find(value => value.id === flow.linkId), applied = ledger.applied.some(value => value.linkId === flow.linkId);
      ensure(plan.hostAutoFlowPolicy && applied && link && flow.nodeId === states.get(link.sourceStateId).rootNodeId && flow.name === 'Flow ' + (plan.hostAutoFlowPolicy.startIndex + i) && !autoIds.has(flow.nodeId) && !previousFlows.some(value => value.nodeId === flow.nodeId), 'AUTO_FLOW_JOURNAL'); autoIds.add(flow.nodeId);
    }
    const active = ledger.flowCleanupComplete ? new Set() : autoIds;
    ensure(same(ledger.flowOrder.filter(flow => !active.has(flow.nodeId)), previousFlows) && ledger.flowOrder.length === previousFlows.length + active.size && ledger.flowOrder.filter(flow => active.has(flow.nodeId)).every(flow => ledger.hostGeneratedFlows.some(value => value.nodeId === flow.nodeId && value.name === flow.name)), 'FLOW_BASELINE_DRIFT');
    ensure(same(currentFlows(), ledger.flowOrder), 'FLOW_DRIFT');
  }
  function adoptCurrentSourceFlow(link) {
    const actual = currentFlows();
    if (same(actual, ledger.flowOrder)) return;
    ensure(!stagingEnabled, 'STAGING_UNKNOWN_HOST_FLOW');
    const known = new Set(ledger.flowOrder.map(flow => flow.nodeId)), additions = actual.filter(flow => !known.has(flow.nodeId)), rootId = states.get(link.sourceStateId).rootNodeId;
    ensure(plan.hostAutoFlowPolicy && validFlows(actual) && actual.length === ledger.flowOrder.length + 1 && additions.length === 1 && additions[0].nodeId === rootId && additions[0].name === 'Flow ' + (plan.hostAutoFlowPolicy.startIndex + ledger.hostGeneratedFlows.length) && same(actual.filter(flow => flow.nodeId !== rootId), ledger.flowOrder), 'UNKNOWN_HOST_FLOW');
    ledger.hostGeneratedFlows.push({ ...additions[0], linkId: link.id }); ledger.flowOrder = copy(actual);
  }
  function audit() {
    const issues = [];
    try { protectedUnchanged(); } catch (error) { issues.push({ code: error.message }); }
    if (!ledger) return [...issues, { code: 'EXTENSION_LEDGER_MISSING' }];
    try {
      ensure(same(ledger.oldSpace, { headerText: oldSpace.headerText, chunks: oldSpace.chunks, intent: oldSpace.intent }) && Array.isArray(ledger.oldReactions) && ledger.oldReactions.length === 125 && ledger.oldReactions.every((value, i) => value.nodeId === plan.predecessor.plan.links[i].sourceNodeId && value.raw === rawReaction(oldNodes[i])), 'OLD_SNAPSHOT_DRIFT');
      ensure(same(ledger.nativeBindings, plan.states.map(state => ({ id: state.id, hash: state.expectedNativeLedgerHash }))), 'NATIVE_BINDING_DRIFT');
      ensure(Array.isArray(ledger.applied) && ledger.applied.length <= plan.links.length, 'CURSOR_DRIFT');
      if (stagingEnabled) ensure(typeof ledger.stagingDone === 'boolean' && typeof ledger.cleanupDone === 'boolean' && (ledger.stagingDone || ledger.applied.length === 0) && (!ledger.cleanupDone || ledger.stagingDone && ledger.applied.length === plan.links.length) && ledger.cursor === Number(ledger.stagingDone) + ledger.applied.length + Number(ledger.cleanupDone) && ledger.complete === (ledger.cursor === plan.links.length + 2), 'STAGING_CURSOR_DRIFT');
      else ensure(ledger.cursor === ledger.applied.length + (ledger.flowCleanupComplete ? 1 : 0) && ledger.complete === (ledger.cursor === plan.links.length + 1), 'CURSOR_DRIFT');
      for (const [i, link] of plan.links.entries()) {
        checkSource(link); const node = nodes.get(link.sourceNodeId), record = ledger.applied[i];
        if (record) ensure(record.linkId === link.id && record.nodeId === link.sourceNodeId && same(record.expectedReactions, link.reactions) && same(normalizeReadback(node.reactions ?? []), link.reactions), 'EXTENSION_REACTION_DRIFT');
        else ensure((node.reactions ?? []).length === 0, 'UNAPPLIED_REACTION_NOT_EMPTY');
      }
      checkFlowJournal();
    } catch (error) { issues.push({ code: error.message }); }
    if (ledger.pending || ownSpace?.intent) issues.push({ code: 'PENDING_REQUIRES_MANUAL_AUDIT', stage: ledger.failedStage ?? null });
    return issues;
  }
  function setData(key, value) {
    guard(); ensure(key.startsWith(prefix) && typeof value === 'string' && value.length <= 16000, 'WRITE_SCOPE');
    ownNamespaceUnchanged(); let expected;
    if (stagingEnabled) { const fields = new Map(JSON.parse(ownWitness)); if (value === '') fields.delete(key); else fields.set(key, value); expected = JSON.stringify([...fields].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)); }
    mutated.add(page.id); page.setPluginData(key, value);
    if (stagingEnabled) { if (ownNamespaceSnapshot() !== expected) { ownNamespaceDrift = true; ensure(false, 'STAGING_OWN_NAMESPACE_DRIFT'); } ownWitness = expected; }
    ensure(page.getPluginData(key) === value, 'METADATA_READBACK');
  }
  function persist() {
    const raw = JSON.stringify(ledger); ensure(raw.length <= 4096000, 'JOURNAL_BUDGET'); const chunks = Math.max(1, Math.ceil(raw.length / 16000));
    for (let i = 0; i < chunks; i += 1) setData(prefix + 'chunk_' + i, raw.slice(i * 16000, (i + 1) * 16000));
    setData(prefix + 'header', JSON.stringify({ chunks, hash: hash(raw), operationKey, targetPageId: plan.targetPageId, planHash: plan.planHash }));
  }
  function intent(nextStage, link, expectedFlows) { stage = nextStage; setData(prefix + 'intent', JSON.stringify({ schemaVersion: 'feedback-fidelity-interaction-extension-intent/1', operationKey, targetPageId: plan.targetPageId, planHash: plan.planHash, cursor: ledger.cursor, stage, ...(link ? { linkId: link.id, sourceNodeId: link.sourceNodeId, expectedReactions: copy(link.reactions) } : {}), ...(expectedFlows ? { expectedFlows: copy(expectedFlows) } : {}) })); }
  async function writeStagingFlows(expected, nextStage) {
    // Freeze before the setter; a host must never redefine its write argument.
    const signature = JSON.stringify(expected);
    intent(nextStage, null, expected); persist();
    if (JSON.stringify(currentFlows()) !== signature) { mutated.add(page.id); page.flowStartingPoints = copy(expected); }
    ensure(JSON.stringify(currentFlows()) === signature, 'STAGING_FLOW_SYNC_READBACK');
    await freshStagingReadback();
    ensure(JSON.stringify(currentFlows()) === signature, 'STAGING_FLOW_FRESH_READBACK');
    ledger.flowOrder = JSON.parse(signature);
  }
  try {
    // Freeze the caller's plan and every expected reaction before the first await.
    plan = copy(suppliedPlan);
    const { planHash, ...payload } = plan;
    ensure(plan.schemaVersion === 'feedback-fidelity-interaction-extension-plan/1' && plan.mockOnly === true && /^[a-f0-9]{64}$/.test(planHash) && JSON.stringify(payload).length <= 4000000 && hash(payload) === planHash, 'PLAN_HASH');
    ensure(['preflight', 'apply', 'audit'].includes(mode) && Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 20 && typeof operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(operationKey) && operationKey !== plan.predecessor.operationKey && (options.targetPageId ?? plan.targetPageId) === plan.targetPageId, 'OPTIONS_SCOPE');
    const oldPlan = plan.predecessor.plan, { planHash: oldHash, ...oldPayload } = oldPlan;
    ensure(oldPlan.schemaVersion === 'feedback-fidelity-prototype-plan/1' && oldPlan.states.length === 41 && oldPlan.links.length === 125 && oldPlan.flows.length === 5 && hash(oldPayload) === oldHash && /^[a-f0-9]{64}$/.test(plan.predecessor.expectedLedgerHash), 'PREDECESSOR_PLAN');
    ensure(new Set(oldPlan.states.map(state => state.id)).size === 41 && new Set(oldPlan.links.map(link => link.id)).size === 125 && new Set(oldPlan.links.map(link => link.sourceNodeId)).size === 125, 'PREDECESSOR_GRAPH');
    ensure(Array.isArray(plan.states) && plan.states.length >= 41 && plan.states.length <= 128 && Array.isArray(plan.links) && plan.links.length > 0 && plan.links.length <= 1000, 'PLAN_BUDGET');
    ensure(plan.hostAutoFlowPolicy === null || plain(plan.hostAutoFlowPolicy) && Object.keys(plan.hostAutoFlowPolicy).length === 2 && plan.hostAutoFlowPolicy.namePrefix === 'Flow ' && Number.isInteger(plan.hostAutoFlowPolicy.startIndex) && plan.hostAutoFlowPolicy.startIndex > 0 && plan.hostAutoFlowPolicy.startIndex <= 10000, 'FLOW_POLICY');
    const rootIds = new Set(), nativeOps = new Set();
    for (const state of plan.states) {
      ensure(plain(state) && typeof state.id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(state.id) && !states.has(state.id) && typeof state.rootNodeId === 'string' && state.rootNodeId.length > 0 && state.rootNodeId.length <= 200 && !rootIds.has(state.rootNodeId) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(state.operationKey) && !nativeOps.has(state.operationKey) && typeof state.captureRootId === 'string' && state.captureRootId.length > 0 && state.captureRootId.length <= 200 && /^[a-f0-9]{64}$/.test(state.captureHash) && /^[a-f0-9]{64}$/.test(state.expectedNativeLedgerHash) && state.mockOnly === true, 'STATE_WHITELIST');
      states.set(state.id, state); rootIds.add(state.rootNodeId); nativeOps.add(state.operationKey);
    }
    for (const state of oldPlan.states) ensure(states.has(state.id) && ['id', 'operationKey', 'rootNodeId', 'captureRootId', 'captureHash'].every(key => states.get(state.id)[key] === state[key]), 'PREDECESSOR_STATE_WHITELIST');
    ensure(oldPlan.flows.every(flow => states.get(flow.stateId)?.rootNodeId === flow.nodeId) && oldPlan.links.every(link => states.get(link.destinationStateId)?.rootNodeId === link.destinationRootNodeId), 'PREDECESSOR_GRAPH');
    const oldSourceIds = new Set(oldPlan.links.map(link => link.sourceNodeId)), sourceIds = new Set(), linkIds = new Set();
    for (const link of plan.links) {
      const source = states.get(link.sourceStateId), destination = states.get(link.destinationStateId), trigger = triggerFor(link), timer = trigger.type === 'AFTER_TIMEOUT';
      ensure(Object.keys(link).every(key => ['id', 'control', 'sourceStateId', 'sourceCaptureId', 'sourceNodeId', 'destinationStateId', 'destinationRootNodeId', 'reactions', 'trigger'].includes(key)) && source && destination && source.id !== destination.id && typeof link.id === 'string' && link.id.length > 0 && link.id.length <= 200 && !linkIds.has(link.id) && typeof link.sourceCaptureId === 'string' && link.sourceCaptureId.length > 0 && link.sourceCaptureId.length <= 200 && typeof link.sourceNodeId === 'string' && link.sourceNodeId.length > 0 && link.sourceNodeId.length <= 200 && (timer ? link.sourceNodeId === source.rootNodeId && link.sourceCaptureId === source.captureRootId : link.sourceNodeId !== source.rootNodeId) && !oldSourceIds.has(link.sourceNodeId) && !sourceIds.has(link.sourceNodeId) && link.destinationRootNodeId === destination.rootNodeId && same(link.reactions, canonical(destination.rootNodeId, trigger)), 'LINK_SCOPE'); sourceIds.add(link.sourceNodeId); linkIds.add(link.id);
    }
    if (plan.flowStaging !== undefined) {
      const policy = plan.flowStaging, baselineRoots = new Set(oldPlan.flows.map(flow => flow.nodeId)), required = new Set(plan.links.map(link => states.get(link.sourceStateId).rootNodeId).filter(id => !baselineRoots.has(id)));
      ensure(plain(policy) && Object.keys(policy).length === 2 && policy.strategy === 'EXPLICIT_SOURCE_ROOTS' && Array.isArray(policy.entries) && policy.entries.length === required.size && plan.hostAutoFlowPolicy === null, 'STAGING_POLICY');
      const seen = new Set();
      for (const entry of policy.entries) {
        ensure(plain(entry) && Object.keys(entry).length === 3 && ['sourceStateId', 'nodeId', 'name'].every(key => Object.prototype.hasOwnProperty.call(entry, key)) && required.has(entry.nodeId) && states.get(entry.sourceStateId)?.rootNodeId === entry.nodeId && !seen.has(entry.nodeId) && entry.name === 'FEEDBACK_EXT:' + operationKey + ':' + entry.sourceStateId && entry.name.length <= 200, 'STAGING_ENTRY'); seen.add(entry.nodeId);
      }
      stagingEnabled = true; stagingFlows = policy.entries.map(({ nodeId, name }) => ({ nodeId, name }));
    }
    prefix = `feedback_fidelity_interaction_extensions_v1__${operationKey}__`;
    page = await figma.getNodeByIdAsync(plan.targetPageId);
    ensure(page?.type === 'PAGE' && figma.root.children.some(node => node.id === page.id) && figma.currentPage?.id === page.id, 'PAGE_SCOPE');
    ownSpace = readSpace(prefix);
    if (stagingEnabled && !ownSpace) ensure(typeof page.getPluginDataKeys === 'function' && !page.getPluginDataKeys().some(key => key.startsWith(prefix) && page.getPluginData(key) !== ''), 'STAGING_NAMESPACE_NOT_EMPTY');
    if (stagingEnabled) ownWitness = ownNamespaceSnapshot();
    if (ownSpace) {
      ledger = ownSpace.value;
      ensure(ledger.schemaVersion === 'feedback-fidelity-interaction-extension-ledger/1' && ledger.operationKey === operationKey && ledger.targetPageId === plan.targetPageId && ledger.planHash === plan.planHash && ownSpace.header.planHash === plan.planHash && ownSpace.header.operationKey === operationKey && ownSpace.header.targetPageId === plan.targetPageId, 'EXTENSION_LEDGER_SCOPE');
      if (ownSpace.intent) { const value = JSON.parse(ownSpace.intent); ensure(value.operationKey === operationKey && value.targetPageId === plan.targetPageId && value.planHash === plan.planHash, 'INTENT_SCOPE'); }
      if (mode === 'apply' && (ledger.pending || ownSpace.intent)) return response('PENDING_REQUIRES_AUDIT');
    }
    for (const state of states.values()) {
      const native = readSpace(`feedback_fidelity_native_v1__${state.operationKey}__`), value = native?.value;
      ensure(native && !native.intent && native.header.hash === state.expectedNativeLedgerHash && native.header.operationKey === state.operationKey && native.header.targetPageId === plan.targetPageId && native.header.specHash === state.captureHash && value.schemaVersion === 'feedback-fidelity-native-ledger/1' && value.operationKey === state.operationKey && value.targetPageId === plan.targetPageId && value.rootNodeId === state.rootNodeId && value.specHash === state.captureHash && value.complete === true && value.pending === false && Number.isInteger(value.cursor) && value.cursor === value.totalUnits && plain(value.nativeNodeIdByCaptureId) && Array.isArray(value.entries) && value.entries.length > 0 && value.entries.length <= 100000 && new Set(value.entries.map(entry => entry.id)).size === value.entries.length && value.entries.every(entry => typeof entry.id === 'string' && typeof entry.sourceId === 'string' && typeof entry.role === 'string' && (plain(entry.snapshot) || /^[a-f0-9]{64}$/.test(entry.snapshotHash))), 'NATIVE_LEDGER_SCOPE');
      ensure(value.entries.some(entry => entry.id === state.rootNodeId && entry.sourceId === state.captureRootId && entry.role === 'Scene'), 'NATIVE_ROOT_ENTRY');
      nativeSpaces.set(state.id, native); roots.set(state.id, await figma.getNodeByIdAsync(state.rootNodeId)); checkRoot(state);
    }
    oldSpace = readSpace(`feedback_fidelity_prototype_v1__${plan.predecessor.operationKey}__`);
    const old = oldSpace?.value;
    previousFlows = oldPlan.flows.map(({ nodeId, name }) => ({ nodeId, name }));
    ensure(validFlows(previousFlows) && previousFlows.length === 5 && oldSpace && !oldSpace.intent && oldSpace.header.hash === plan.predecessor.expectedLedgerHash && oldSpace.header.operationKey === plan.predecessor.operationKey && oldSpace.header.targetPageId === plan.targetPageId && oldSpace.header.planHash === oldHash && old.schemaVersion === 'feedback-fidelity-prototype-ledger/1' && old.operationKey === plan.predecessor.operationKey && old.targetPageId === plan.targetPageId && old.planHash === oldHash && old.complete === true && old.pending === false && old.cursor === 126 && old.applied.length === 126 && old.applied[125].kind === 'flow' && same(old.applied[125].flows, previousFlows), 'PREDECESSOR_LEDGER');
    for (const [i, link] of oldPlan.links.entries()) {
      ensure(states.has(link.sourceStateId) && states.has(link.destinationStateId) && same(link.reactions, canonical(link.destinationRootNodeId)) && old.applied[i].kind === 'reaction' && old.applied[i].nodeId === link.sourceNodeId && same(old.applied[i].reactions, link.reactions), 'PREDECESSOR_LINK');
      const node = await figma.getNodeByIdAsync(link.sourceNodeId); nodes.set(link.sourceNodeId, node); checkSource(link);
      ensure(same(normalizeReadback(node.reactions ?? []), link.reactions), 'PREDECESSOR_REACTION'); oldNodes.push(node); initialOldReactions.push({ nodeId: node.id, raw: rawReaction(node) });
    }
    for (const link of plan.links) { nodes.set(link.sourceNodeId, await figma.getNodeByIdAsync(link.sourceNodeId)); checkSource(link); }
    if (stagingEnabled) await freshStagingReadback();
    if (ledger) {
      const issues = audit();
      if (mode === 'audit') return response(issues.length ? 'AUDIT_FAIL' : 'AUDIT_PASS', { issues });
      if (mode === 'preflight') return response('PREFLIGHT', { issues });
      if (issues.length) return response('AUDIT_FAIL', { issues });
      if (ledger.complete) return response('ALREADY_COMPLETE');
    } else {
      ensure(same(currentFlows(), previousFlows), 'INITIAL_FLOW_BASELINE');
      for (const link of plan.links) ensure((nodes.get(link.sourceNodeId).reactions ?? []).length === 0, 'REACTIONS_EXIST');
      protectedUnchanged();
      if (mode === 'audit') return response('AUDIT_FAIL', { issues: [{ code: 'EXTENSION_LEDGER_MISSING' }] });
      if (mode === 'preflight') return response('PREFLIGHT', { issues: [] });
      ledger = { schemaVersion: 'feedback-fidelity-interaction-extension-ledger/1', operationKey, targetPageId: plan.targetPageId, planHash: plan.planHash, cursor: 0, complete: false, pending: false, applied: [], ...(stagingEnabled ? { stagingDone: false, cleanupDone: false, stagingFlows: copy(stagingFlows) } : { flowCleanupComplete: false }), flowBaseline: copy(previousFlows), flowOrder: currentFlows(), hostGeneratedFlows: [], oldSpace: { headerText: oldSpace.headerText, chunks: copy(oldSpace.chunks), intent: oldSpace.intent }, oldReactions: copy(initialOldReactions), nativeBindings: plan.states.map(state => ({ id: state.id, hash: state.expectedNativeLedgerHash })) };
    }
    const totalUnits = plan.links.length + (stagingEnabled ? 2 : 1), start = ledger.cursor, stop = Math.min(totalUnits, start + batchSize);
    mutationStarted = true; ledger.pending = true; intent('BEGIN_BATCH'); persist();
    for (let index = start; index < stop; index += 1) {
      if (stagingEnabled) await freshStagingReadback();
      protectedUnchanged(); checkFlowJournal();
      const linkIndex = index - (stagingEnabled ? 1 : 0);
      if (stagingEnabled && index === 0) {
        ensure(!ledger.stagingDone && ledger.applied.length === 0 && !ledger.cleanupDone, 'STAGING_PHASE');
        await writeStagingFlows([...previousFlows, ...stagingFlows], 'FLOW_STAGE_PENDING'); ledger.stagingDone = true;
      } else if (linkIndex < plan.links.length) {
        const link = plan.links[linkIndex], node = nodes.get(link.sourceNodeId), expected = copy(link.reactions);
        checkSource(link); ensure((node.reactions ?? []).length === 0, 'REACTIONS_EXIST'); intent('REACTION:' + link.id, link);
        const expectedSignature = JSON.stringify(ordered(expected));
        mutated.add(node.id); const write = node.setReactionsAsync(copy(expected));
        // The frozen signature does not alias the host's write argument/readback.
        await write;
        ownNamespaceUnchanged();
        protectedUnchanged(); checkSource(link);
        const readbackNode = await figma.getNodeByIdAsync(link.sourceNodeId);
        ensure(readbackNode === node || readbackNode?.id === node.id, 'REACTION_NODE_CHANGED');
        nodes.set(link.sourceNodeId, readbackNode); checkSource(link);
        if (stagingEnabled) await freshStagingReadback(link);
        protectedUnchanged(); ensure(JSON.stringify(ordered(normalizeReadback(readbackNode.reactions ?? []))) === expectedSignature, 'REACTION_READBACK');
        adoptCurrentSourceFlow(link);
        ledger.applied.push({ linkId: link.id, nodeId: node.id, expectedReactions: copy(expected) });
      } else {
        if (stagingEnabled) {
          ensure(ledger.stagingDone && !ledger.cleanupDone && ledger.applied.length === plan.links.length, 'STAGING_CLEANUP_PHASE');
          await writeStagingFlows(copy(ledger.flowBaseline), 'FLOW_STAGE_CLEANUP_PENDING'); ledger.cleanupDone = true;
        } else {
          intent('FLOW_CLEANUP');
          const frozenBaseline = JSON.stringify(ledger.flowBaseline);
          if (!same(currentFlows(), ledger.flowBaseline)) { mutated.add(page.id); page.flowStartingPoints = copy(ledger.flowBaseline); }
          ensure(JSON.stringify(currentFlows()) === frozenBaseline, 'FLOW_CLEANUP_READBACK');
          ledger.flowOrder = copy(ledger.flowBaseline); ledger.flowCleanupComplete = true;
        }
      }
      ledger.cursor = index + 1; protectedUnchanged(); persist();
    }
    ledger.complete = ledger.cursor === totalUnits; ledger.pending = false; persist(); setData(prefix + 'intent', ''); ownSpace = null;
    return response(ledger.complete ? 'COMPLETE' : 'APPLIED_BATCH', { processedThisBatch: ledger.cursor - start, ledgerHash: hash(JSON.stringify(ledger)), issues: [] });
  } catch (error) {
    if (mutationStarted && ledger) {
      ledger.pending = true; ledger.failedStage = stage; ledger.failure = String(error?.message ?? error).slice(0, 300);
      let ledgerSaved = false;
      try { ownNamespaceUnchanged(); if (!ownNamespaceDrift) { persist(); ledgerSaved = true; } } catch { /* Unknown namespace bytes and the intent stay untouched for recovery. */ }
      return response('FAILED', { pending: true, failure: ledger.failure, failedStage: stage, ledgerSaved, ...(ownNamespaceDrift ? { ownNamespaceDrift: true } : {}) });
    }
    const unresolvedIntent = !!(page && prefix && page.getPluginData(prefix + 'intent'));
    return response(mode === 'audit' ? 'AUDIT_FAIL' : mode === 'apply' && (unresolvedIntent || ownNamespaceDrift) ? 'PENDING_REQUIRES_AUDIT' : 'REJECTED', { pending: unresolvedIntent || !!ledger?.pending || ownNamespaceDrift, failure: String(error?.message ?? error), issues: [{ code: String(error?.message ?? error) }], ...(ownNamespaceDrift ? { ownNamespaceDrift: true } : {}) });
  }
}
