import { createHash } from 'node:crypto';

/** Bounded, explicit state transitions over existing source-backed native nodes.
 * A click on a captured text area previews the captured filled state; this is
 * a preset prototype transition, not arbitrary input or backend integration.
 */
export function buildFeedbackPrototypePlan(states) {
  const ensure = (condition, code) => { if (!condition) throw new Error(code); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const normalize = value => String(value ?? '').replace(/\s+/g, '').trim();
  const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
  ensure(Array.isArray(states) && states.length > 0 && states.length <= 100, 'FEEDBACK_PROTOTYPE_STATES_INVALID');
  const byId = new Map(), nodeIndexes = new Map(), textIndexes = new Map(), nativeIds = new Set();
  for (const state of states) {
    ensure(plain(state) && typeof state.id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(state.id) && !byId.has(state.id) && typeof state.operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(state.operationKey) && validId(state.rootNodeId), 'FEEDBACK_PROTOTYPE_STATE_INVALID');
    const capture = state.capture;
    ensure(plain(capture) && capture.schemaVersion === 'feedback-fidelity-capture/1' && capture.privacy?.mockOnly === true && capture.privacy.authenticatedCapture === false && capture.privacy.credentialsRead === false, 'FEEDBACK_PROTOTYPE_SYNTHETIC_ONLY');
    ensure(Array.isArray(capture.nodes) && capture.nodes.length > 0 && capture.nodes.length <= 20000 && plain(state.nativeNodeIdByCaptureId), 'FEEDBACK_PROTOTYPE_CAPTURE_INVALID');
    const nodes = new Map(capture.nodes.map(node => [node.id, node]));
    ensure(nodes.size === capture.nodes.length && nodes.get(capture.rootId)?.parentId === null, 'FEEDBACK_PROTOTYPE_CAPTURE_GRAPH_INVALID');
    for (const node of capture.nodes) {
      ensure(validId(node.id) && (!node.parentId || nodes.has(node.parentId)), 'FEEDBACK_PROTOTYPE_CAPTURE_GRAPH_INVALID');
      const seen = new Set(); let parent = node;
      while (parent) { ensure(!seen.has(parent.id), 'FEEDBACK_PROTOTYPE_CAPTURE_CYCLE'); seen.add(parent.id); parent = nodes.get(parent.parentId); }
    }
    ensure(!nativeIds.has(state.rootNodeId), 'FEEDBACK_PROTOTYPE_MAPPING_INVALID'); nativeIds.add(state.rootNodeId);
    for (const [sourceId, nativeId] of Object.entries(state.nativeNodeIdByCaptureId)) {
      ensure(nodes.has(sourceId) && validId(nativeId) && (!nativeIds.has(nativeId) || sourceId === capture.rootId && nativeId === state.rootNodeId), 'FEEDBACK_PROTOTYPE_MAPPING_INVALID');
      nativeIds.add(nativeId);
    }
    const textIndex = new Map();
    for (const node of capture.nodes) if (['text', 'pseudo'].includes(node.kind) && (node.renderedText || node.text)) {
      const text = node.renderedText ?? node.text; let parent = node;
      while (parent) { textIndex.set(parent.id, (textIndex.get(parent.id) ?? '') + text); parent = nodes.get(parent.parentId); }
    }
    byId.set(state.id, state); nodeIndexes.set(state.id, nodes); textIndexes.set(nodes, textIndex);
  }
  const links = [], unmatched = [], used = new Map();
  const orderedStates = [...states].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const ancestors = (node, nodes) => { const result = []; while (node) { result.push(node); node = nodes.get(node.parentId); } return result; };
  const hasClass = (node, name) => String(node.attrs?.class ?? '').split(/\s+/).includes(name);
  const actionable = node => ['button', 'a', 'textarea', 'input', 'select', 'label'].includes(node.tag) || ['button', 'tab', 'checkbox', 'radio', 'option', 'combobox', 'menuitem'].includes(node.attrs?.role) || hasClass(node, 'ant-segmented-item') || hasClass(node, 'ant-select-item-option');
  function visible(node, nodes) {
    const rect = Object.hasOwn(node, 'visibleRect') ? node.visibleRect : node.rect;
    return !!rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0
      && !ancestors(node, nodes).some(value => value.attrs?.hidden === true || value.attrs?.hidden === '' || value.attrs?.['aria-hidden'] === 'true' || value.style?.display === 'none' || ['hidden', 'collapse'].includes(value.style?.visibility) || value.style?.opacity !== undefined && Number(value.style.opacity) === 0);
  }
  function disabled(node, nodes) {
    return ancestors(node, nodes).some(value => value.attrs?.disabled === true || value.attrs?.disabled === '' || value.attrs?.disabled === 'disabled' || value.attrs?.['aria-disabled'] === 'true' || /(?:^|\s)\S*(?:checkbox|select|segmented|btn)-disabled(?:\s|$)/.test(value.attrs?.class ?? ''));
  }
  function textFor(node, nodes) {
    const direct = node.attrs?.['aria-label'] || node.attrs?.title || node.label || node.renderedText || node.text;
    if (direct) return normalize(direct);
    return normalize(textIndexes.get(nodes)?.get(node.id));
  }
  function matchText(state, labels, { role, within } = {}) {
    const nodes = nodeIndexes.get(state.id), expected = new Set(labels.map(normalize)), result = [];
    for (const source of state.capture.nodes) {
      if (!expected.has(textFor(source, nodes))) continue;
      const node = ancestors(source, nodes).find(value => actionable(value) && (!role || value.attrs?.role === role || role === 'tab' && hasClass(value, 'ant-segmented-item')));
      if (node && visible(node, nodes) && !disabled(node, nodes) && (!within || ancestors(node, nodes).some(value => within(value))) && !result.some(value => value.id === node.id)) result.push(node);
    }
    return result[0] ?? null;
  }
  function firstRowCheckbox(state) {
    const nodes = nodeIndexes.get(state.id);
    const inner = state.capture.nodes.filter(node => hasClass(node, 'ant-checkbox-inner') && visible(node, nodes) && !disabled(node, nodes)).filter(node => {
      const chain = ancestors(node, nodes);
      return !chain.some(value => value.tag === 'thead') && chain.some(value => value.tag === 'tbody' || value.tag === 'td' && /selection/.test(value.attrs?.class ?? ''));
    }).sort((a, b) => (a.rect?.y ?? 0) - (b.rect?.y ?? 0) || (a.rect?.x ?? 0) - (b.rect?.x ?? 0))[0] ?? null;
    return inner && (ancestors(inner, nodes).find(node => node.tag === 'label' && visible(node, nodes)) ?? inner);
  }
  function add(state, control, node, targetStateId, interaction, unavailableReason) {
    const base = { stateId: state.id, control, ...(node ? { sourceCaptureId: node.id, label: textFor(node, nodeIndexes.get(state.id)) } : {}), targetStateId };
    if (!node || !visible(node, nodeIndexes.get(state.id)) || disabled(node, nodeIndexes.get(state.id))) { unmatched.push({ ...base, reason: 'SOURCE_CONTROL_MISSING' }); return; }
    if (!used.has(state.id)) used.set(state.id, new Set()); used.get(state.id).add(node.id);
    if (unavailableReason) { unmatched.push({ ...base, reason: unavailableReason }); return; }
    const target = byId.get(targetStateId);
    if (!target) { unmatched.push({ ...base, reason: 'TARGET_STATE_MISSING' }); return; }
    if (target.id === state.id) { unmatched.push({ ...base, reason: 'NO_STATE_CHANGE' }); return; }
    const sourceNodeId = state.nativeNodeIdByCaptureId[node.id];
    if (!sourceNodeId) { unmatched.push({ ...base, reason: 'NATIVE_SOURCE_MISSING' }); return; }
    ensure(!links.some(link => link.sourceNodeId === sourceNodeId), 'FEEDBACK_PROTOTYPE_CONTROL_CONFLICT');
    links.push({ id: `${state.id}/${control}`, control, sourceStateId: state.id, sourceCaptureId: node.id, sourceNodeId, destinationStateId: target.id, destinationRootNodeId: target.rootNodeId, ...(interaction ? { interaction } : {}),
      reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: target.rootNodeId, navigation: 'NAVIGATE', transition: null, resetScrollPosition: true, resetVideoPosition: false }] }] });
  }
  const under = (node, id, nodes) => ancestors(node, nodes).some(value => value.id === id);
  function fieldTrigger(state, title) {
    const nodes = nodeIndexes.get(state.id), label = state.capture.nodes.find(node => node.tag === 'label' && normalize(node.attrs?.title ?? textFor(node, nodes)) === normalize(title));
    const field = label && ancestors(label, nodes).find(node => hasClass(node, 'ant-form-item'));
    if (!field) return null;
    const descendants = state.capture.nodes.filter(node => under(node, field.id, nodes));
    return descendants.find(node => hasClass(node, 'ant-select-selector') && visible(node, nodes) && !disabled(node, nodes))
      ?? descendants.find(node => node.tag === 'div' && hasClass(nodes.get(node.parentId) ?? {}, 'ant-form-item-control-input-content') && visible(node, nodes) && !disabled(node, nodes)) ?? null;
  }
  function inputControl(state, placeholder, within) {
    const nodes = nodeIndexes.get(state.id);
    return state.capture.nodes.find(node => ['input', 'textarea'].includes(node.tag) && node.attrs?.placeholder === placeholder && visible(node, nodes) && !disabled(node, nodes) && (!within || ancestors(node, nodes).some(within))) ?? null;
  }
  function namedIcon(state, name, within) {
    const nodes = nodeIndexes.get(state.id);
    return state.capture.nodes.find(node => node.attrs?.['aria-label'] === name && node.attrs?.role === 'img' && visible(node, nodes) && !disabled(node, nodes) && (!within || ancestors(node, nodes).some(within))) ?? null;
  }
  function pageControl(state, number) {
    const nodes = nodeIndexes.get(state.id), item = state.capture.nodes.find(node => hasClass(node, `ant-pagination-item-${number}`) && visible(node, nodes) && !disabled(node, nodes));
    if (!item) return null;
    return state.capture.nodes.find(node => node.tag === 'a' && under(node, item.id, nodes) && visible(node, nodes)) ?? item;
  }
  function formContext(state, excludeFeedbackId) {
    if (!state) return null;
    const nodes = nodeIndexes.get(state.id), fields = [];
    for (const field of state.capture.nodes.filter(node => hasClass(node, 'ant-form-item'))) {
      const descendants = state.capture.nodes.filter(node => under(node, field.id, nodes));
      const label = descendants.find(node => node.tag === 'label'), title = normalize(label?.attrs?.title ?? (label && textFor(label, nodes)));
      if (!title) continue;
      const controls = descendants.filter(node => ['input', 'textarea', 'select'].includes(node.tag));
      if (excludeFeedbackId && controls.some(node => node.attrs?.placeholder === '输入反馈ID搜索')) continue;
      fields.push({ title, text: textFor(field, nodes), values: controls.map(node => ({ placeholder: node.attrs?.placeholder ?? '', value: String(node.attrs?.value ?? node.controlText?.value ?? '').trim(), checked: node.attrs?.checked === true })) });
    }
    const table = state.capture.nodes.find(node => hasClass(node, 'ant-table'));
    // Captures contain visible nodes only. A different result count can expose
    // another unpinned heading without changing column configuration; pinned
    // headings remain independently observable at the viewport edges.
    const pinnedColumns = state.capture.nodes.filter(node => node.tag === 'th' && (hasClass(node, 'ant-table-cell-fix-left') || hasClass(node, 'ant-table-cell-fix-right')))
      .map(node => ({ text: textFor(node, nodes), fixed: hasClass(node, 'ant-table-cell-fix-left') ? 'left' : 'right' }));
    return { fields: fields.sort((a, b) => a.title.localeCompare(b.title, 'en')), density: table ? hasClass(table, 'ant-table-small') ? 'small' : hasClass(table, 'ant-table-middle') ? 'middle' : 'large' : null, pinnedColumns };
  }
  const selectionIndexes = new Map();
  function selectionEvidence(state) {
    if (selectionIndexes.has(state.id)) return selectionIndexes.get(state.id);
    const nodes = nodeIndexes.get(state.id), rows = new Map(); let valid = true;
    for (const row of state.capture.nodes.filter(node => node.tag === 'tr' && hasClass(node, 'ant-table-row'))) {
      const descendants = state.capture.nodes.filter(node => under(node, row.id, nodes));
      const identityCell = descendants.find(node => node.tag === 'td' && !hasClass(node, 'ant-table-selection-column'));
      const cellId = identityCell && textFor(identityCell, nodes), attributeId = row.attrs?.['data-row-key'];
      const id = attributeId === undefined ? cellId : String(attributeId);
      const selected = hasClass(row, 'ant-table-row-selected');
      // A clipped row can have no ID cell. It cannot prove a selected entity.
      if (!/^\d+$/.test(id ?? '')) { if (selected) valid = false; continue; }
      if (attributeId !== undefined && cellId && cellId !== id || rows.has(id)) { valid = false; continue; }
      const inner = descendants.find(node => hasClass(node, 'ant-checkbox-inner'));
      const ownerSelected = inner && ancestors(inner, nodes).some(node => hasClass(node, 'ant-checkbox-checked'));
      if (selected && !inner || inner && selected !== !!ownerSelected) valid = false;
      const checkbox = inner && (ancestors(inner, nodes).find(node => node.tag === 'label' && visible(node, nodes)) ?? inner);
      rows.set(id, { row, checkbox, selected, text: textFor(row, nodes) });
    }
    const selectedIds = [...rows].filter(([, row]) => row.selected).map(([id]) => id).sort();
    const summaries = state.capture.nodes.filter(node => hasClass(node, 'ant-pro-table-alert-info-content')).map(node => /已选择(\d+)项/.exec(textFor(node, nodes))?.[1]).filter(value => value !== undefined);
    if (summaries.length > 1 || selectedIds.length && summaries.length !== 1 || summaries.length && Number(summaries[0]) !== selectedIds.length) valid = false;
    const evidence = { rows, selectedIds, valid }; selectionIndexes.set(state.id, evidence); return evidence;
  }
  function addSelection(state, control, feedbackId, targetStateId, expectedSourceIds, expectedTargetIds) {
    const source = selectionEvidence(state), target = byId.get(targetStateId);
    const node = source.rows.get(feedbackId)?.checkbox ?? (feedbackId === '910001' ? firstRowCheckbox(state) : null);
    if (!target) { add(state, control, node, targetStateId, undefined, 'TARGET_SELECTION_NOT_CAPTURED'); return; }
    const destination = selectionEvidence(target);
    if (!source.valid || !destination.valid || JSON.stringify(source.selectedIds) !== JSON.stringify(expectedSourceIds) || JSON.stringify(destination.selectedIds) !== JSON.stringify(expectedTargetIds)) {
      add(state, control, node, targetStateId, undefined, 'TARGET_SELECTION_NOT_PROVEN'); return;
    }
    const sourceContext = formContext(state, false), targetContext = formContext(target, false);
    const sharedRows = [...source.rows].filter(([id]) => destination.rows.has(id));
    const sameRows = source.rows.has(feedbackId) && destination.rows.has(feedbackId) && sharedRows.length > 0 && sharedRows.every(([id, row]) => row.text === destination.rows.get(id).text);
    if (!sourceContext.fields.length || JSON.stringify(sourceContext) !== JSON.stringify(targetContext) || JSON.stringify(state.capture.viewport) !== JSON.stringify(target.capture.viewport) || !sameRows) {
      add(state, control, node, targetStateId, undefined, 'TARGET_CONTEXT_NOT_CAPTURED'); return;
    }
    // Never use the positional fallback as a live source. It only identifies
    // an unmatched control in old/partial captures without row-ID evidence.
    add(state, control, source.rows.get(feedbackId)?.checkbox ?? null, targetStateId);
  }
  function queryContextReason(state, targetStateId, excludeFeedbackId) {
    const target = byId.get(targetStateId);
    if (!target) return undefined;
    const sourceContext = formContext(state, excludeFeedbackId), targetContext = formContext(target, excludeFeedbackId);
    // Submitting/resetting clears selection in the source; merely previewing
    // an edited input does not. Neither action undoes a completed mutation or
    // changes the table's density or pinned columns.
    const uncapturedContext = ['batch-success', 'assign-success'].includes(state.id)
      || excludeFeedbackId && ['selected', 'selected-one'].includes(state.id)
      || state.id === 'compact-list' && target.id !== 'compact-list'
      || sourceContext.fields.length === 0
      || JSON.stringify(sourceContext) !== JSON.stringify(targetContext);
    return uncapturedContext ? 'TARGET_CONTEXT_NOT_CAPTURED' : undefined;
  }
  const filterStates = new Set(['list', 'selected', 'batch-success', 'assign-success', 'game-open', 'game-partial', 'game-all', 'game-empty', 'server-open', 'server-selected', 'vip-sort-open', 'type-open', 'status-open', 'team-open', 'assigned-open', 'anonymous-open', 'calendar-open', 'calendar-selected', 'density-menu', 'compact-list', 'columns-settings', 'columns-pinned', 'query-filtered', 'query-empty', 'page2', 'table-horizontal-end']);
  for (const state of orderedStates) {
    const nodes = nodeIndexes.get(state.id), text = (labels, options) => matchText(state, labels, options), close = () => state.capture.nodes.find(node => actionable(node) && visible(node, nodes) && ['Close', '关闭'].includes(node.attrs?.['aria-label']) && !disabled(node, nodes));
    const firstRow = state.capture.nodes.find(node => node.tag === 'tr' && visible(node, nodes) && hasClass(node, 'ant-table-row') && ancestors(node, nodes).some(value => value.tag === 'tbody'));
    const rowText = labels => text(labels, firstRow ? { within: value => value.id === firstRow.id } : {});
    const inPopover = node => hasClass(node, 'ant-popover'), inSelectPopup = node => hasClass(node, 'ant-select-dropdown');
    if (['list', 'selected', 'batch-success', 'assign-success', 'compact-list', 'table-horizontal-end'].includes(state.id)) {
      const contextReason = ['selected', 'batch-success', 'assign-success', 'compact-list'].includes(state.id) ? 'TARGET_CONTEXT_NOT_CAPTURED' : undefined;
      add(state, 'view-detail', rowText(['查看详情']), 'detail', undefined, contextReason); add(state, 'assign-first-row', rowText(['分配']), 'assign', undefined, contextReason); add(state, 'open-chat', rowText(['对话记录']), 'chat-ai', undefined, contextReason);
    }
    if (state.id === 'list') addSelection(state, 'select-first-row', '910001', 'selected-one', [], ['910001']);
    if (state.id === 'selected-one') {
      addSelection(state, 'unselect-first-row', '910001', 'list', ['910001'], []);
      addSelection(state, 'select-feedback-910007', '910007', 'selected', ['910001'], ['910001', '910007']);
      add(state, 'batch-reply', text(['批量回复']), 'batch', undefined, 'TARGET_SELECTION_NOT_CAPTURED');
    }
    if (['selected', 'batch-success'].includes(state.id)) {
      const hasSelection = state.id === 'selected';
      add(state, hasSelection ? 'unselect-first-row' : 'select-first-row', firstRowCheckbox(state), 'selected-other-row-not-captured', undefined, 'TARGET_SELECTION_NOT_CAPTURED');
      if (hasSelection && byId.has('selected-one')) addSelection(state, 'unselect-feedback-910007', '910007', 'selected-one', ['910001', '910007'], ['910001']);
      if (state.id === 'selected') { add(state, 'batch-reply', text(['批量回复']), 'batch'); add(state, 'clear-selection', text(['取消选择']), 'list'); }
    }
    if (filterStates.has(state.id)) {
      const resetTarget = state.id === 'compact-list' ? 'compact-list' : state.id === 'columns-pinned' ? 'columns-pinned-closed' : state.id === 'table-horizontal-end' ? 'table-horizontal-reset-not-captured' : 'list';
      const reset = text(['重置'], { within: node => hasClass(node, 'ant-pro-query-filter') });
      // Synthetic fixtures can omit wrappers; never borrow a popover's own Reset.
      add(state, 'reset-filters', reset ?? state.capture.nodes.find(node => actionable(node) && textFor(node, nodes) === '重置' && !ancestors(node, nodes).some(inPopover) && visible(node, nodes)), resetTarget, undefined, ['batch-success', 'assign-success'].includes(state.id) ? 'TARGET_CONTEXT_NOT_CAPTURED' : undefined);
      const queryInput = inputControl(state, '输入反馈ID搜索');
      if (queryInput) {
        const value = String(queryInput.attrs?.value ?? queryInput.controlText?.value ?? '').trim();
        const previewTarget = value === '910007' ? 'query-empty' : 'query-filtered', submitTarget = value === '910007' ? 'query-filtered' : value === '910999' ? 'query-empty' : value ? 'query-result-not-captured' : 'list';
        add(state, value === '910007' ? 'preview-empty-query' : 'preview-query-result', queryInput, previewTarget, 'PRESET_INPUT_PREVIEW', queryContextReason(state, previewTarget, true));
        add(state, 'query-submit', text(['查询']), submitTarget, undefined, queryContextReason(state, submitTarget, false));
      }
    }
    if (state.id === 'list') {
      for (const [control, title, target] of [['open-game', '游戏', 'game-open'], ['open-vip-sort', 'VIP等级排序', 'vip-sort-open'], ['open-type', '反馈类型', 'type-open'], ['open-status', '工单状态', 'status-open'], ['open-team', '所属团队', 'team-open'], ['open-assigned', '是否分配处理人', 'assigned-open'], ['open-anonymous', '匿名用户', 'anonymous-open']]) add(state, control, fieldTrigger(state, title), target);
      add(state, 'open-server', fieldTrigger(state, '专服/混服'), 'server-without-game-not-captured');
      add(state, 'open-calendar', inputControl(state, '开始日期'), 'calendar-open');
      add(state, 'open-related', rowText(['910002']), 'related');
      add(state, 'open-page2', pageControl(state, 2), 'page2');
      const scroller = state.capture.nodes.find(node => hasClass(node, 'ant-table-content'));
      unmatched.push({ stateId: state.id, control: 'horizontal-scroll', ...(scroller ? { sourceCaptureId: scroller.id } : {}), targetStateId: 'table-horizontal-end', reason: 'NON_CLICK_INTERACTION_NOT_IMPLEMENTED' });
    }
    if (['list', 'compact-list'].includes(state.id)) {
      const contextReason = state.id === 'compact-list' ? 'TARGET_CONTEXT_NOT_CAPTURED' : undefined;
      add(state, 'open-density', namedIcon(state, 'column-height', node => hasClass(node, 'ant-pro-table-list-toolbar')), 'density-menu', undefined, contextReason);
      add(state, 'open-columns', namedIcon(state, 'setting', node => hasClass(node, 'ant-pro-table-list-toolbar')), 'columns-settings', undefined, contextReason);
    }
    if (state.id === 'page2') { add(state, 'open-related-multi', rowText(['910012']), 'related-multi'); add(state, 'open-page1', pageControl(state, 1), 'list'); }
    if (['related', 'related-multi', 'related-multi-second'].includes(state.id)) {
      if (state.id === 'related-multi') add(state, 'related-second-tab', text(['910013'], { role: 'tab' }), 'related-multi-second');
      if (state.id === 'related-multi-second') add(state, 'related-first-tab', text(['910012'], { role: 'tab' }), 'related-multi');
      add(state, 'close', close(), state.id === 'related' ? 'list' : 'page2');
    }
    if (['game-open', 'game-partial', 'game-all', 'game-empty'].includes(state.id)) {
      const choice = text(['星海远征（演示）'], { within: inPopover }), all = text(['全选'], { within: inPopover });
      if (['game-open', 'game-partial'].includes(state.id)) add(state, state.id === 'game-open' ? 'select-game' : 'clear-game', choice, state.id === 'game-open' ? 'game-partial' : 'game-open');
      if (state.id !== 'game-empty') add(state, state.id === 'game-all' ? 'clear-all-games' : 'select-all-games', all, state.id === 'game-all' ? 'game-open' : 'game-all');
      const search = inputControl(state, '搜索', inPopover);
      add(state, state.id === 'game-empty' ? 'preview-clear-game-search' : 'preview-empty-game-search', search, state.id === 'game-empty' ? 'game-open' : 'game-empty', 'PRESET_INPUT_PREVIEW', ['game-partial', 'game-all'].includes(state.id) ? 'TARGET_CONTEXT_NOT_CAPTURED' : undefined);
      if (state.id === 'game-partial') add(state, 'open-server', fieldTrigger(state, '专服/混服'), 'server-open');
    }
    if (['server-open', 'server-selected'].includes(state.id)) {
      add(state, state.id === 'server-open' ? 'select-server' : 'clear-server', text(['星海远征（演示） · 专服'], { within: inPopover }), state.id === 'server-open' ? 'server-selected' : 'server-open');
      add(state, 'select-all-servers', text(['全选'], { within: inPopover }), 'server-all-not-captured');
    }
    const dropdownLabels = { 'vip-sort-open': ['高等级优先', '低等级优先'], 'type-open': ['充值问题', '账号问题', '游戏建议', '异常反馈'], 'status-open': ['待分配', '待处理', '处理中', '已完成', '已关闭'], 'team-open': ['综合客服组（演示）', '游戏支持组（演示）', '技术协助组（演示）'], 'assigned-open': ['是', '否'], 'anonymous-open': ['匿名用户', '非匿名用户'] };
    for (const [index, label] of (dropdownLabels[state.id] ?? []).entries()) add(state, `select-option-${index}`, text([label], { within: inSelectPopup }), `${state.id.replace(/-open$/, '')}-selected-${index}`);
    if (['calendar-open', 'calendar-selected'].includes(state.id)) add(state, state.id === 'calendar-open' ? 'preview-date-range' : 'preview-clear-date-range', inputControl(state, '开始日期'), state.id === 'calendar-open' ? 'calendar-selected' : 'calendar-open', 'PRESET_INPUT_PREVIEW');
    if (state.id === 'density-menu') { add(state, 'density-compact', text(['紧凑'], { role: 'menuitem' }), 'compact-list'); add(state, 'density-middle', text(['中等'], { role: 'menuitem' }), 'list'); add(state, 'density-large', text(['宽松'], { role: 'menuitem' }), 'large-list-not-captured'); }
    if (['columns-settings', 'columns-pinned'].includes(state.id)) {
      add(state, 'reset-columns', text(['重置'], { within: inPopover }), 'columns-settings');
      if (state.id === 'columns-settings') add(state, 'pin-feedback-id', namedIcon(state, 'vertical-align-top', node => hasClass(node, 'ant-pro-table-column-setting-list-item') && textFor(node, nodes).includes('反馈ID')), 'columns-pinned');
    }
    if (['batch', 'batch-invalid', 'batch-filled', 'batch-failed'].includes(state.id)) {
      add(state, 'send-reply', text(['发送']), ['batch-filled', 'batch-failed'].includes(state.id) ? 'batch-success' : 'batch-invalid');
      if (['batch', 'batch-invalid'].includes(state.id)) add(state, 'fill-reply', state.capture.nodes.find(node => node.tag === 'textarea' && !disabled(node, nodes)), 'batch-filled');
      add(state, 'cancel', text(['取消']), byId.has('selected') ? 'selected' : 'list'); add(state, 'close', close(), byId.has('selected') ? 'selected' : 'list');
    }
    if (['assign', 'assign-selected'].includes(state.id)) {
      if (state.id === 'assign') {
        const target = byId.get('assign-selected'), targetNodes = target && nodeIndexes.get(target.id);
        const selected = target?.capture.nodes.filter(node => (node.tag === 'button' || node.attrs?.role === 'button') && visible(node, targetNodes) && !disabled(node, targetNodes)
          && (node.attrs?.['aria-pressed'] === 'true' || node.attrs?.['aria-selected'] === 'true' || hasClass(node, 'border-blue-500') && hasClass(node, 'bg-blue-50'))) ?? [];
        if (selected.length !== 1) unmatched.push({ stateId: state.id, control: 'select-staff', targetStateId: 'assign-selected', reason: !target ? 'TARGET_STATE_MISSING' : selected.length ? 'TARGET_SELECTION_AMBIGUOUS' : 'TARGET_SELECTION_UNPROVEN' });
        else {
          const label = textFor(selected[0], targetNodes), candidates = state.capture.nodes.filter(node => (node.tag === 'button' || node.attrs?.role === 'button') && visible(node, nodes) && !disabled(node, nodes) && textFor(node, nodes) === label);
          if (candidates.length > 1) unmatched.push({ stateId: state.id, control: 'select-staff', targetStateId: 'assign-selected', reason: 'SOURCE_CONTROL_AMBIGUOUS' });
          else add(state, 'select-staff', candidates[0] ?? null, 'assign-selected');
        }
      }
      if (state.id === 'assign-selected') add(state, 'confirm-assignment', text(['确认分配']), 'assign-success');
      add(state, 'cancel', text(['取消']), 'list'); add(state, 'close', close(), 'list');
    }
    if (['detail', 'detail-communication', 'detail-system'].includes(state.id)) {
      for (const [control, labels, destination] of [['detail-tab', ['处理信息', '反馈详情'], 'detail'], ['communication-tab', ['沟通记录'], 'detail-communication'], ['system-tab', ['系统留言'], 'detail-system']]) if (state.id !== destination) add(state, control, text(labels, { role: 'tab' }), destination);
      add(state, 'close', close(), 'list');
    }
    if (['chat-ai', 'chat-human'].includes(state.id)) {
      if (state.id === 'chat-ai') add(state, 'human-chat-tab', text(['人工沟通记录']), 'chat-human');
      else add(state, 'ai-chat-tab', text(['AI对话记录', 'AI沟通记录']), 'chat-ai');
      add(state, 'close', close(), 'list');
    }
    for (const node of state.capture.nodes) if (actionable(node) && visible(node, nodes) && !disabled(node, nodes) && !used.get(state.id)?.has(node.id)) {
      // Child labels inside an already linked real control are not extra controls.
      if (ancestors(nodes.get(node.parentId), nodes).some(parent => used.get(state.id)?.has(parent.id))) continue;
      unmatched.push({ stateId: state.id, control: 'unplanned-control', sourceCaptureId: node.id, label: textFor(node, nodes), reason: 'CONTROL_NOT_PLANNED' });
    }
  }
  ensure(links.length <= 1000 && unmatched.length <= 20000, 'FEEDBACK_PROTOTYPE_PLAN_BUDGET');
  const flows = [], reachable = new Set(), destinations = new Map();
  for (const link of links) { if (!destinations.has(link.sourceStateId)) destinations.set(link.sourceStateId, []); destinations.get(link.sourceStateId).push(link.destinationStateId); }
  const markReachable = start => {
    const pending = [start];
    while (pending.length) { const id = pending.pop(); if (reachable.has(id)) continue; reachable.add(id); pending.push(...(destinations.get(id) ?? [])); }
  };
  if (byId.has('list')) {
    flows.push({ nodeId: byId.get('list').rootNodeId, name: '反馈列表 · PC · Mock', stateId: 'list' }); markReachable('list');
    // These native Flow entries expose captured presets. They do not invent
    // clicks for viewport-excluded pagination, hover, scrolling or failures.
    for (const [id, name] of [['page2', '场景 · 第二页与多关联'], ['batch-failed', '场景 · 批量回复失败后重试'], ['table-horizontal-end', '场景 · 表格已滚至末端'], ['columns-pinned', '场景 · 反馈ID已固定']]) if (byId.has(id) && !reachable.has(id)) {
      flows.push({ nodeId: byId.get(id).rootNodeId, name, stateId: id }); markReachable(id);
    }
  }
  const payload = { schemaVersion: 'feedback-fidelity-prototype-plan/1', states: orderedStates.map(state => ({ id: state.id, operationKey: state.operationKey, rootNodeId: state.rootNodeId, captureRootId: state.capture.rootId, captureHash: hash(state.capture) })), links, flows, unmatched,
    verification: { sourceBackedControls: 'PLANNED', arbitraryInput: 'NOT IMPLEMENTED', realAPI: 'NOT IMPLEMENTED', present: 'NOT RUN' } };
  return { ...payload, planHash: hash(payload) };
}

/** Self-contained public Plugin API function: callers may serialize toString().
 * The file identity must be verified by the caller; this function bounds its
 * writes to the supplied page and exact native-import operation-owned nodes.
 * A failed/pending batch is deliberately never automatically replayed.
 */
export async function applyFeedbackPrototypePlan(figma, plan, options = {}) {
  const ensure = (condition, code) => { if (!condition) throw new Error(code); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
  const same = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
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
  const { targetPageId, operationKey, mode = 'preflight', batchSize = 100, hostAutoFlowPolicy = null } = options;
  const validHostFlowPolicy = value => value === null || plain(value) && Object.keys(value).length === 2 && value.namePrefix === 'Flow ' && value.startIndex === 1;
  ensure(typeof targetPageId === 'string' && targetPageId && typeof operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(operationKey), 'FEEDBACK_PROTOTYPE_SCOPE_INVALID');
  ensure(['preflight', 'apply', 'audit'].includes(mode) && Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100, 'FEEDBACK_PROTOTYPE_OPTIONS_INVALID');
  ensure(validHostFlowPolicy(hostAutoFlowPolicy), 'FEEDBACK_PROTOTYPE_FLOW_POLICY_INVALID');
  ensure(plain(plan) && plan.schemaVersion === 'feedback-fidelity-prototype-plan/1' && typeof plan.planHash === 'string', 'FEEDBACK_PROTOTYPE_PLAN_INVALID');
  const { planHash, ...payload } = plan, serializedPlan = JSON.stringify(payload);
  ensure(serializedPlan.length <= 4000000 && /^[a-f0-9]{64}$/.test(planHash) && sha256(serializedPlan) === planHash, 'FEEDBACK_PROTOTYPE_PLAN_HASH_MISMATCH');
  ensure(Array.isArray(plan.states) && plan.states.length > 0 && plan.states.length <= 100 && Array.isArray(plan.links) && plan.links.length <= 1000 && Array.isArray(plan.flows) && plan.flows.length <= 5, 'FEEDBACK_PROTOTYPE_PLAN_BUDGET');
  const states = new Map();
  for (const state of plan.states) { ensure(plain(state) && typeof state.id === 'string' && !states.has(state.id) && typeof state.operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(state.operationKey) && typeof state.rootNodeId === 'string' && typeof state.captureRootId === 'string' && /^[a-f0-9]{64}$/.test(state.captureHash), 'FEEDBACK_PROTOTYPE_STATE_INVALID'); states.set(state.id, state); }
  const sourceIds = new Set();
  const canonical = destinationId => [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId, navigation: 'NAVIGATE', transition: null, resetScrollPosition: true, resetVideoPosition: false }] }];
  for (const link of plan.links) {
    const source = states.get(link.sourceStateId), target = states.get(link.destinationStateId);
    ensure(source && target && source.id !== target.id && typeof link.id === 'string' && typeof link.sourceCaptureId === 'string' && typeof link.sourceNodeId === 'string' && !sourceIds.has(link.sourceNodeId) && link.sourceNodeId !== source.rootNodeId && link.destinationRootNodeId === target.rootNodeId && same(link.reactions, canonical(target.rootNodeId)), 'FEEDBACK_PROTOTYPE_LINK_INVALID'); sourceIds.add(link.sourceNodeId);
  }
  const allowedFlowStates = new Set(['list', 'page2', 'batch-failed', 'table-horizontal-end', 'columns-pinned']), flowStates = new Set(), flowNodes = new Set();
  for (const flow of plan.flows) {
    ensure(plain(flow) && allowedFlowStates.has(flow.stateId) && typeof flow.nodeId === 'string' && states.get(flow.stateId)?.rootNodeId === flow.nodeId && !flowStates.has(flow.stateId) && !flowNodes.has(flow.nodeId) && typeof flow.name === 'string' && flow.name.trim().length > 0 && flow.name.length <= 200, 'FEEDBACK_PROTOTYPE_FLOW_INVALID');
    flowStates.add(flow.stateId); flowNodes.add(flow.nodeId);
  }
  const page = await figma.getNodeByIdAsync(targetPageId);
  ensure(page?.type === 'PAGE' && figma.root.children.some(node => node.id === page.id), 'FEEDBACK_PROTOTYPE_PAGE_SCOPE');
  await figma.setCurrentPageAsync(page);
  const guard = () => ensure(figma.currentPage?.id === targetPageId && page.type === 'PAGE', 'FEEDBACK_PROTOTYPE_PAGE_CHANGED');
  guard();
  const prefix = `feedback_fidelity_prototype_v1__${operationKey}__`, mutatedNodeIds = new Set(), roots = new Map(), sources = new Map(), nativeEvidence = new Map();
  function checkRoot(state, node) {
    guard(); const nativePrefix = `feedback_fidelity_native_v1__${state.operationKey}__`;
    ensure(node?.type === 'FRAME' && node.parent?.id === page.id && node.getPluginData?.(`${nativePrefix}operation`) === state.operationKey && node.getPluginData(`${nativePrefix}capture`) === state.captureRootId, 'FEEDBACK_PROTOTYPE_ROOT_SCOPE');
    const evidence = nativeEvidence.get(state.id);
    if (evidence) ensure(page.getPluginData(`${nativePrefix}header`) === evidence.headerText && page.getPluginData(`${nativePrefix}intent`) === '', 'FEEDBACK_PROTOTYPE_NATIVE_IMPORT_CHANGED');
  }
  function readNativeEvidence(state) {
    const nativePrefix = `feedback_fidelity_native_v1__${state.operationKey}__`, headerText = page.getPluginData(`${nativePrefix}header`);
    ensure(headerText && page.getPluginData(`${nativePrefix}intent`) === '', 'FEEDBACK_PROTOTYPE_NATIVE_LEDGER_PENDING_OR_MISSING');
    try {
      const header = JSON.parse(headerText);
      ensure(header.operationKey === state.operationKey && header.targetPageId === targetPageId && header.specHash === state.captureHash && Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256 && /^[a-f0-9]{64}$/.test(header.hash), 'FEEDBACK_PROTOTYPE_NATIVE_HEADER_SCOPE');
      let data = '';
      for (let index = 0; index < header.chunks; index++) { const chunk = page.getPluginData(`${nativePrefix}chunk_${index}`); ensure(chunk && chunk.length <= 16000, 'FEEDBACK_PROTOTYPE_NATIVE_LEDGER_CHUNK'); data += chunk; }
      ensure(sha256(data) === header.hash, 'FEEDBACK_PROTOTYPE_NATIVE_LEDGER_HASH');
      const ledger = JSON.parse(data);
      ensure(ledger.schemaVersion === 'feedback-fidelity-native-ledger/1' && ledger.operationKey === state.operationKey && ledger.targetPageId === targetPageId && ledger.specHash === state.captureHash && ledger.rootNodeId === state.rootNodeId && ledger.complete === true && ledger.pending === false && plain(ledger.nativeNodeIdByCaptureId), 'FEEDBACK_PROTOTYPE_NATIVE_LEDGER_SCOPE');
      nativeEvidence.set(state.id, { headerText, mapping: ledger.nativeNodeIdByCaptureId });
    } catch (error) { if (String(error.message).startsWith('FEEDBACK_PROTOTYPE_NATIVE_')) throw error; throw new Error('FEEDBACK_PROTOTYPE_NATIVE_LEDGER_UNREADABLE'); }
  }
  function checkSource(link, node) {
    guard(); const state = states.get(link.sourceStateId), nativePrefix = `feedback_fidelity_native_v1__${state.operationKey}__`;
    checkRoot(state, roots.get(state.id)); checkRoot(states.get(link.destinationStateId), roots.get(link.destinationStateId));
    ensure(nativeEvidence.get(state.id)?.mapping[link.sourceCaptureId] === link.sourceNodeId, 'FEEDBACK_PROTOTYPE_NATIVE_MAPPING_MISMATCH');
    ensure(node && node.getPluginData?.(`${nativePrefix}operation`) === state.operationKey && node.getPluginData(`${nativePrefix}capture`) === link.sourceCaptureId && typeof node.setReactionsAsync === 'function', 'FEEDBACK_PROTOTYPE_SOURCE_SCOPE');
    let parent = node.parent; const seen = new Set();
    while (parent && parent.id !== state.rootNodeId && !seen.has(parent.id)) { ensure(seen.size < 1000, 'FEEDBACK_PROTOTYPE_ANCESTRY_BUDGET'); seen.add(parent.id); parent = parent.parent; }
    ensure(parent?.id === state.rootNodeId, 'FEEDBACK_PROTOTYPE_SOURCE_SCOPE');
  }
  async function checkOwnership() {
    for (const state of plan.states) {
      const node = await figma.getNodeByIdAsync(state.rootNodeId); checkRoot(state, node); readNativeEvidence(state); roots.set(state.id, node);
    }
    for (const link of plan.links) {
      const node = await figma.getNodeByIdAsync(link.sourceNodeId); checkSource(link, node); sources.set(node.id, node);
    }
  }
  await checkOwnership();
  let ledger = null, pendingIntent = null;
  try {
    const intent = page.getPluginData(`${prefix}intent`), headerText = page.getPluginData(`${prefix}header`);
    if (intent) pendingIntent = JSON.parse(intent);
    if (headerText) {
      const header = JSON.parse(headerText); ensure(Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256, 'FEEDBACK_PROTOTYPE_LEDGER_INVALID'); let data = '';
      for (let index = 0; index < header.chunks; index++) { const chunk = page.getPluginData(`${prefix}chunk_${index}`); ensure(chunk && chunk.length <= 16000, 'FEEDBACK_PROTOTYPE_LEDGER_CHUNK'); data += chunk; }
      ensure(sha256(data) === header.hash, 'FEEDBACK_PROTOTYPE_LEDGER_HASH'); ledger = JSON.parse(data);
      ensure(ledger.schemaVersion === 'feedback-fidelity-prototype-ledger/1' && ledger.operationKey === operationKey && ledger.targetPageId === targetPageId && ledger.planHash === planHash && Number.isInteger(ledger.cursor) && ledger.cursor >= 0 && ledger.cursor <= plan.links.length + 1 && Array.isArray(ledger.applied) && ledger.applied.length <= plan.links.length + 1, 'FEEDBACK_PROTOTYPE_LEDGER_SCOPE_MISMATCH');
    }
    if (pendingIntent) ensure(pendingIntent.operationKey === operationKey && pendingIntent.targetPageId === targetPageId && pendingIntent.planHash === planHash, 'FEEDBACK_PROTOTYPE_INTENT_SCOPE_MISMATCH');
  } catch (error) { if (String(error.message).startsWith('FEEDBACK_PROTOTYPE_')) throw error; throw new Error('FEEDBACK_PROTOTYPE_LEDGER_UNREADABLE'); }
  const totalUnits = plan.links.length + (plan.flows.length ? 1 : 0);
  const plannedRoots = new Set(plan.states.map(state => state.rootNodeId));
  const validFlowList = (value, limit) => Array.isArray(value) && value.length <= limit && value.every(flow => plain(flow) && Object.keys(flow).length === 2 && typeof flow.nodeId === 'string' && flow.nodeId.length > 0 && flow.nodeId.length <= 200 && typeof flow.name === 'string' && flow.name.trim().length > 0 && flow.name.length <= 200) && new Set(value.map(flow => flow.nodeId)).size === value.length;
  const response = (status, extra = {}) => ({ status, operationKey, targetPageId, planHash, cursor: ledger?.cursor ?? 0, totalUnits, complete: ledger?.complete ?? false, pending: !!pendingIntent || !!ledger?.pending, createdNodeIds: [], mutatedNodeIds: [...mutatedNodeIds], plannedLinkCount: plan.links.length, unmatchedCount: plan.unmatched?.length ?? 0, verification: { nativeReadback: 'NOT RUN', arbitraryInput: 'NOT IMPLEMENTED', realAPI: 'NOT IMPLEMENTED', present: 'NOT RUN' }, ...extra });
  function canonicalReadback(reactions) {
    // Figma may return legacy action plus actions. Only ignore the duplicate
    // legacy view when it is consistent; all other reactions stay observable.
    return reactions.map(reaction => {
      const result = copy(reaction);
      const defaults = action => { if (action?.type === 'NODE') { if (action.resetInteractiveComponents === false) delete action.resetInteractiveComponents; if (action.resetVideoPosition === undefined) action.resetVideoPosition = false; } return action; };
      if (result.actions) result.actions = result.actions.map(defaults);
      if (result.action) result.action = defaults(result.action);
      if ('action' in result && result.actions?.length === 1 && same(result.action, result.actions[0])) delete result.action;
      return result;
    });
  }
  function audit() {
    const issues = [];
    if (!ledger) issues.push({ code: 'LEDGER_MISSING' });
    const trackingPresent = ledger && ['flowBaseline', 'hostGeneratedFlows', 'hostAutoFlowPolicy'].every(key => Object.prototype.hasOwnProperty.call(ledger, key));
    let trackingValid = false;
    if (ledger && !trackingPresent) issues.push({ code: 'FLOW_TRACKING_MISSING' });
    if (trackingPresent) {
      const writtenRoots = new Set(plan.links.slice(0, ledger.applied.length).map(link => states.get(link.sourceStateId).rootNodeId));
      trackingValid = validHostFlowPolicy(ledger.hostAutoFlowPolicy) && validFlowList(ledger.flowBaseline, 1000) && validFlowList(ledger.hostGeneratedFlows, plan.states.length)
        && ledger.flowBaseline.every(flow => !plannedRoots.has(flow.nodeId))
        && ledger.hostGeneratedFlows.every((flow, index) => ledger.hostAutoFlowPolicy !== null && plannedRoots.has(flow.nodeId) && writtenRoots.has(flow.nodeId) && flow.name === ledger.hostAutoFlowPolicy.namePrefix + (ledger.hostAutoFlowPolicy.startIndex + index));
      if (!trackingValid) issues.push({ code: 'FLOW_TRACKING_INVALID' });
      else {
        const flowWritten = ledger.applied[plan.links.length]?.kind === 'flow';
        const expectedFlows = flowWritten ? [...ledger.flowBaseline, ...plan.flows.map(({ nodeId, name }) => ({ nodeId, name }))] : [...ledger.flowBaseline, ...ledger.hostGeneratedFlows];
        if (!same(page.flowStartingPoints, expectedFlows)) issues.push({ code: 'FLOW_DRIFT', nodeId: page.id });
      }
    }
    for (const [index, entry] of (ledger?.applied ?? []).entries()) {
      const link = plan.links[index];
      if (link ? entry.kind !== 'reaction' || entry.nodeId !== link.sourceNodeId || !same(entry.reactions, link.reactions) : index !== plan.links.length || !plan.flows.length || entry.kind !== 'flow' || !Array.isArray(entry.flows) || !plan.flows.every(flow => entry.flows.some(value => value.nodeId === flow.nodeId && value.name === flow.name)) || trackingValid && !same(entry.flows, [...ledger.flowBaseline, ...plan.flows.map(({ nodeId, name }) => ({ nodeId, name }))])) issues.push({ code: 'LEDGER_ENTRY_INVALID', index });
      if (entry.kind === 'reaction') {
        const node = sources.get(entry.nodeId);
        if (!node || !same(canonicalReadback(node.reactions ?? []), entry.reactions)) issues.push({ code: 'REACTION_DRIFT', nodeId: entry.nodeId });
      } else if (entry.kind === 'flow' && !same(page.flowStartingPoints, entry.flows)) issues.push({ code: 'FLOW_DRIFT', nodeId: page.id });
      else if (!['reaction', 'flow'].includes(entry.kind)) issues.push({ code: 'LEDGER_ENTRY_INVALID' });
    }
    if (ledger && (ledger.cursor !== ledger.applied.length || ledger.cursor > totalUnits || ledger.complete !== (ledger.cursor === totalUnits))) issues.push({ code: 'LEDGER_CURSOR_INVALID' });
    if (pendingIntent || ledger?.pending) issues.push({ code: 'PENDING_WRITE_REQUIRES_MANUAL_REVIEW', stage: pendingIntent?.stage ?? ledger?.failedStage ?? null });
    return issues;
  }
  if (mode === 'audit') {
    const issues = audit(); return response(issues.length ? 'AUDIT_FAIL' : 'AUDIT_PASS', { issues, verification: { nativeReadback: issues.length ? 'FAIL' : 'PASS', arbitraryInput: 'NOT IMPLEMENTED', realAPI: 'NOT IMPLEMENTED', present: 'NOT RUN' } });
  }
  if (mode === 'preflight') return response('PREFLIGHT', { issues: ledger ? audit() : [], sourceControlCount: sources.size });
  if (pendingIntent || ledger?.pending) return response('PENDING_REQUIRES_AUDIT');
  if (ledger) { const issues = audit(); if (issues.length) return response('AUDIT_FAIL', { issues }); if (ledger.complete) return response('ALREADY_COMPLETE'); }
  if (ledger) ensure(same(ledger.hostAutoFlowPolicy, hostAutoFlowPolicy), 'FEEDBACK_PROTOTYPE_FLOW_POLICY_MISMATCH');
  const done = new Set((ledger?.applied ?? []).filter(entry => entry.kind === 'reaction').map(entry => entry.nodeId));
  for (const link of plan.links) if (!done.has(link.sourceNodeId)) ensure((sources.get(link.sourceNodeId).reactions ?? []).length === 0, 'FEEDBACK_PROTOTYPE_REACTIONS_EXIST');
  if (!ledger) {
    ensure(validFlowList(page.flowStartingPoints, 1000), 'FEEDBACK_PROTOTYPE_FLOW_BASELINE_INVALID');
    for (const flow of page.flowStartingPoints) ensure(!plannedRoots.has(flow.nodeId), 'FEEDBACK_PROTOTYPE_FLOW_EXISTS');
    ledger = { schemaVersion: 'feedback-fidelity-prototype-ledger/1', operationKey, targetPageId, planHash, cursor: 0, complete: false, pending: false, applied: [], flowBaseline: copy(page.flowStartingPoints), hostGeneratedFlows: [], hostAutoFlowPolicy: copy(hostAutoFlowPolicy) };
  }
  function checkFlows(sourceRootId) {
    guard(); const expected = [...ledger.flowBaseline, ...ledger.hostGeneratedFlows], actual = page.flowStartingPoints;
    if (same(actual, expected)) return;
    // Only a single appended starting point produced by this exact awaited
    // reaction write is eligible. Unknown or preexisting flows are never adopted.
    const policy = ledger.hostAutoFlowPolicy, next = actual[expected.length];
    ensure(sourceRootId && policy && ledger.hostGeneratedFlows.length < plan.states.length && validFlowList(actual, 1000 + plan.states.length)
      && actual.length === expected.length + 1 && same(actual.slice(0, expected.length), expected)
      && next.nodeId === sourceRootId && !ledger.hostGeneratedFlows.some(flow => flow.nodeId === next.nodeId)
      && next.name === policy.namePrefix + (policy.startIndex + ledger.hostGeneratedFlows.length), 'FEEDBACK_PROTOTYPE_FLOW_DRIFT');
    ledger.hostGeneratedFlows.push(copy(next));
  }
  function setData(key, value) { guard(); mutatedNodeIds.add(page.id); page.setPluginData(key, value); }
  function persist() {
    guard(); const data = JSON.stringify(ledger); ensure(data.length <= 4096000, 'FEEDBACK_PROTOTYPE_LEDGER_BUDGET'); const chunks = Math.ceil(data.length / 16000);
    for (let index = 0; index < chunks; index++) setData(`${prefix}chunk_${index}`, data.slice(index * 16000, (index + 1) * 16000));
    setData(`${prefix}header`, JSON.stringify({ chunks, hash: sha256(data), planHash, operationKey, targetPageId }));
  }
  function intent(stage) { pendingIntent = { operationKey, targetPageId, planHash, cursor: ledger.cursor, stage }; setData(`${prefix}intent`, JSON.stringify(pendingIntent)); }
  const start = ledger.cursor; let stage = 'BEGIN_BATCH';
  try {
    ledger.pending = true; intent(stage); persist();
    const stop = Math.min(totalUnits, start + batchSize);
    for (let index = start; index < stop; index++) {
      guard(); checkFlows();
      if (index < plan.links.length) {
        const link = plan.links[index], node = sources.get(link.sourceNodeId); stage = `REACTION:${link.id}`; intent(stage);
        checkSource(link, node); ensure((node.reactions ?? []).length === 0, 'FEEDBACK_PROTOTYPE_REACTIONS_EXIST');
        mutatedNodeIds.add(node.id); await node.setReactionsAsync(copy(link.reactions)); checkSource(link, node);
        ensure(same(canonicalReadback(node.reactions ?? []), link.reactions), 'FEEDBACK_PROTOTYPE_REACTION_READBACK');
        checkFlows(states.get(link.sourceStateId).rootNodeId);
        ledger.applied.push({ kind: 'reaction', nodeId: node.id, reactions: copy(link.reactions) });
      } else {
        stage = 'FLOW_START'; intent(stage); for (const flow of plan.flows) checkRoot(states.get(flow.stateId), roots.get(flow.stateId));
        checkFlows();
        const flows = [...copy(ledger.flowBaseline), ...plan.flows.map(flow => ({ nodeId: flow.nodeId, name: flow.name }))];
        mutatedNodeIds.add(page.id); page.flowStartingPoints = flows; guard(); ensure(same(page.flowStartingPoints, flows), 'FEEDBACK_PROTOTYPE_FLOW_READBACK'); ledger.applied.push({ kind: 'flow', flows });
      }
      ledger.cursor = index + 1;
    }
    ledger.complete = ledger.cursor === totalUnits; ledger.pending = false; persist(); setData(`${prefix}intent`, ''); pendingIntent = null;
    return response(ledger.complete ? 'COMPLETE' : 'APPLIED_BATCH', { processedThisBatch: ledger.cursor - start, verification: { nativeReadback: 'OBSERVED', arbitraryInput: 'NOT IMPLEMENTED', realAPI: 'NOT IMPLEMENTED', present: 'NOT RUN' } });
  } catch (error) {
    ledger.pending = true; ledger.failedStage = stage; ledger.failure = String(error?.message ?? error).slice(0, 300); let ledgerSaved = false;
    try { persist(); ledgerSaved = true; } catch { /* Saved intent and returned IDs bound manual recovery. */ }
    return response('FAILED', { error: ledger.failure, failedStage: stage, processedThisBatch: ledger.cursor - start, ledgerSaved, pending: true });
  }
}
