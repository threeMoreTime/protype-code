import { digest } from '../core/model.mjs';
import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';

// Six decimal places preserve every eight-bit channel while bounding repeated paint metadata.
const paint = hex => [{ type: 'SOLID', color: Object.fromEntries(['r', 'g', 'b'].map((channel, index) => [channel, Math.round(parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255 * 1e6) / 1e6])) }];
const colors = { canvas: '#f5f7fa', surface: '#ffffff', ink: '#1d2637', muted: '#66768c', line: '#e1e7ef', primary: '#315bea', soft: '#edf2ff', danger: '#be3333' };

/** Build a bounded native design snapshot. Reactions illustrate declared states; HTML owns business execution. */
export function renderBusinessFigma({ catalog, seed, locales, messages }, options = {}) {
  const app = catalog.apps.find(item => item.id === options.app);
  if (!app) throw new RangeError(`Unknown business app: ${options.app}`);
  const locale = locales.find(item => item.id === (options.locale || 'zh_cn'));
  if (!locale || !messages[locale.id]) throw new RangeError(`Unknown business locale: ${options.locale}`);
  const device = options.device || 'desktop';
  if (!['desktop', 'mobile'].includes(device)) throw new RangeError(`Unknown business device: ${device}`);
  const dictionary = messages[locale.id];
  const t = (key, vars = {}) => {
    if (typeof dictionary[key] !== 'string') throw new RangeError(`Missing translation key: ${key} (${locale.id})`);
    return dictionary[key].replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, name) => {
      if (!Object.hasOwn(vars, name)) throw new TypeError(`Missing translation variable: ${name}`);
      return String(vars[name]);
    });
  };
  const mobile = device === 'mobile', rtl = locale.dir === 'rtl';
  const width = mobile ? 375 : 1440, height = mobile ? 844 : 960;
  const font = options.fontName || { family: locale.id === 'ar' ? 'Noto Sans Arabic' : locale.id === 'th' ? 'Noto Sans Thai' : ['zh_cn', 'zh_tw', 'ja', 'ko'].includes(locale.id) ? 'Noto Sans SC' : 'Inter', style: 'Regular' };
  const modules = app.moduleIds.map(id => catalog.modules.find(item => item.id === id));
  if (modules.some(item => !item)) throw new TypeError('App references an unknown business module');
  const nodes = [], reactions = [], flows = [], byKey = new Map();
  const recordViews = new Map(), formRequests = new Map(), historyRequests = new Map();
  const prefix = `${app.id}/${device}`;
  const rootKey = (module, state) => `${device}/${module.id}/${state}`;
  const navigationKey = `${prefix}/navigation`;
  const sidebarKey = `${prefix}/sidebar-component`;
  let sidebarBottom = 82;
  const navigationRows = modules.map(module => {
    const row = { module, y: sidebarBottom, height: Math.max(36, textHeight(t(module.titleKey), 200, 12) + 15) };
    sidebarBottom += row.height;
    return row;
  });
  const sidebarContentHeight = Math.max(height, sidebarBottom + 20);
  let frameIndex = 0;

  function add(key, type, parentKey, x, y, nodeWidth, nodeHeight, props = {}, name = key.split('/').at(-1)) {
    if (byKey.has(key)) throw new Error(`Duplicate business design key: ${key}`);
    if (nodes.length >= 25000) throw new Error('Business Figma node budget exceeded; select a smaller app');
    const parent = parentKey ? byKey.get(parentKey) : null;
    const node = { key, type, name: name.slice(0, 512), parentKey, x: rtl && parent ? parent.width - x - nodeWidth : x, y, width: nodeWidth, height: Math.max(1, nodeHeight), props };
    nodes.push(node); byKey.set(key, node); return node;
  }
  function textHeight(value, nodeWidth, size) {
    const lines = String(value).split('\n').reduce((sum, line) => {
      const units = [...line].reduce((total, char) => total + (/[\u3000-\u9fff\uac00-\ud7ff\u0e00-\u0e7f]/u.test(char) ? 1 : 0.59), 0);
      return sum + Math.max(1, Math.ceil(units / Math.max(1, nodeWidth / size)));
    }, 0);
    return lines * size * 1.5;
  }
  function text(key, parent, value, x, y, nodeWidth, size = 14, color = colors.ink, mapping = {}) {
    const characters = String(value ?? '');
    const measured = textHeight(characters, nodeWidth, size);
    add(key, 'TEXT', parent, x, y, nodeWidth, measured, { characters, fontName: font, fontSize: size, lineHeight: { unit: 'PIXELS', value: size * 1.5 }, textAutoResize: 'HEIGHT', textAlignHorizontal: rtl ? 'RIGHT' : 'LEFT', fills: paint(color) }, `textmap:${JSON.stringify({ ...mapping, locale: locale.id })}`);
    return measured;
  }
  function label(key, parent, translationKey, x, y, nodeWidth, size = 14, color = colors.ink, vars = {}) {
    return text(key, parent, t(translationKey, vars), x, y, nodeWidth, size, color, { key: translationKey, ...(Object.keys(vars).length ? { vars } : {}) });
  }
  function box(key, parent, x, y, nodeWidth, nodeHeight, color = colors.surface, border = false) {
    return add(key, 'FRAME', parent, x, y, nodeWidth, nodeHeight, { fills: paint(color), cornerRadius: 6, ...(border ? { strokes: paint(colors.line), strokeWeight: 1 } : {}) });
  }
  function link(sourceKey, destinationKey) { reactions.push({ sourceKey, destinationKey, trigger: { type: 'ON_CLICK' } }); }
  function button(key, parent, translationKey, x, y, nodeWidth, destinationKey, primary = false) {
    const value = t(translationKey), nodeHeight = Math.max(40, textHeight(value, nodeWidth - 24, 12) + 20);
    box(key, parent, x, y, nodeWidth, nodeHeight, primary ? colors.primary : colors.surface, !primary);
    label(`${key}/label`, key, translationKey, 12, 10, nodeWidth - 24, 12, primary ? '#ffffff' : colors.primary);
    if (destinationKey) link(key, destinationKey);
    return nodeHeight;
  }
  function rowLabel(record, fieldKey, collection) {
    const key = record?.[`${fieldKey}Key`];
    if (key) return { value: t(key), mapping: { key, collection, recordId: record.id, field: fieldKey } };
    if (record?.translations?.[locale.id]?.[fieldKey] !== undefined) return { value: record.translations[locale.id][fieldKey], mapping: { collection, recordId: record.id, field: fieldKey, locale: locale.id } };
    const value = record?.[fieldKey];
    if (typeof value === 'boolean') {
      const isSwitch = fieldKey === 'enabled' || fieldKey.endsWith('Enabled') || ['autoClaim', 'anonymous'].includes(fieldKey);
      const key = isSwitch ? (value ? 'value.enabled' : 'value.disabled') : (value ? 'value.yes' : 'value.no');
      return { value: t(key), mapping: { key, collection, recordId: record?.id, field: fieldKey } };
    }
    if (value === null || value === undefined || value === '') return { value: '—', mapping: { collection, recordId: record?.id, field: fieldKey } };
    if (typeof value === 'string' && dictionary[`value.${value}`]) return { value: t(`value.${value}`), mapping: { key: `value.${value}`, collection, recordId: record.id, field: fieldKey } };
    if (typeof value === 'object') return { value: jsonPreview(value), mapping: { collection, recordId: record.id, field: fieldKey } };
    const descriptor = catalog.collections[collection]?.fields.find(item => item.key === fieldKey);
    if (descriptor?.relation) {
      const target = seed.collections[descriptor.relation]?.find(item => item.id === value);
      if (target) {
        const targetKey = target.nameKey || target.titleKey;
        return { value: targetKey ? t(targetKey) : target.name || target.title || value, mapping: { ...(targetKey ? { key: targetKey } : {}), collection: descriptor.relation, recordId: target.id, field: target.name ? 'name' : 'title' } };
      }
    }
    return { value: String(value), mapping: { collection, recordId: record?.id, field: fieldKey } };
  }
  function jsonPreview(value) {
    const localize = item => {
      if (Array.isArray(item)) return item.map(localize);
      if (!item || typeof item !== 'object') return item;
      const result = {};
      for (const [key, child] of Object.entries(item)) {
        if (key.endsWith('Key') || key === 'translations') continue;
        if (item[`${key}Key`] && dictionary[item[`${key}Key`]]) result[key] = t(item[`${key}Key`]);
        else if (key === 'label' && item.labelKey && dictionary[item.labelKey]) result[key] = t(item.labelKey);
        else result[key] = localize(child);
      }
      return result;
    };
    const result = JSON.stringify(localize(value), null, 2);
    return result.length > 700 ? `${result.slice(0, 697)}…` : result;
  }
  function valueText(key, parent, record, descriptor, collection, x, y, nodeWidth, size = 13) {
    const value = rowLabel(record, descriptor.key, collection);
    return text(key, parent, value.value, x, y, nodeWidth, size, colors.ink, value.mapping);
  }
  function newScreen(module, state) {
    const key = rootKey(module, state);
    const node = add(key, 'FRAME', null, (frameIndex % 5) * (width + 120), Math.floor(frameIndex / 5) * (height + 120), width, height, { fills: paint(colors.canvas), clipsContent: true, overflowDirection: 'VERTICAL' }, `${t(module.titleKey)} · ${state}`);
    frameIndex++;
    const contentX = mobile ? 16 : 280, contentWidth = mobile ? width - 32 : width - 312;
    if (!mobile) {
      const sidebar = add(`${key}/sidebar`, 'FRAME', key, 0, 0, 248, height, { clipsContent: true, overflowDirection: 'VERTICAL', fills: paint(colors.surface) });
      add(`${key}/sidebar/content`, 'INSTANCE', sidebar.key, 0, 0, 248, sidebarContentHeight, { componentKey: sidebarKey, overrides: [{ sourceKey: `${sidebarKey}/nav-${module.id}`, fills: paint(colors.primary) }] });
      for (const row of navigationRows) {
        const hit = add(`${key}/sidebar/nav-${row.module.id.slice(app.id.length + 1)}`, 'FRAME', sidebar.key, 12, row.y - 6, 224, row.height, { opacity: 0 }, 'Nav');
        if (row.module.id !== module.id || state !== 'list') link(hit.key, rootKey(row.module, 'list'));
      }
    }
    box(`${key}/header`, key, mobile ? 0 : 248, 0, mobile ? width : width - 248, mobile ? 64 : 72);
    if (mobile) button(`${key}/header/menu`, key, 'ui.navigation', 16, 12, 102, navigationKey);
    label(`${key}/header/app`, key, app.nameKey, mobile ? 134 : 280, mobile ? 20 : 26, mobile ? width - 150 : 450, mobile ? 12 : 15, colors.muted);
    let y = mobile ? 86 : 102;
    y += label(`${key}/header/title`, key, module.titleKey, contentX, y, contentWidth, mobile ? 23 : 28) + 8;
    y += label(`${key}/header/demo`, key, 'ui.offlineDemo', contentX, y, contentWidth, 11, colors.muted) + 22;
    return { key, node, x: contentX, width: contentWidth, y };
  }
  function actionFields(module, operation) {
    if (operation.fields) return operation.fields;
    if (['record.create', 'record.update', 'record.duplicate'].includes(operation.command)) return catalog.collections[operation.collection || module.collection].fields;
    return [];
  }
  function recordDestination(module, record) {
    const records = seed.collections[module.collection] || [];
    if (!record.id || record.id === records[0]?.id && record.status === records[0]?.status) return rootKey(module, 'detail');
    if (statusScenes(module).includes(record.status) && records.find(item => item.status === record.status)?.id === record.id) return rootKey(module, `state-${record.status}`);
    const state = `record-${record.id}`, key = rootKey(module, state);
    recordViews.set(key, { module, state, record });
    return key;
  }
  function recordContext(module, record) {
    const records = seed.collections[module.collection] || [];
    const actual = records.find(item => item.id === record.id && item.status === record.status);
    const isDefault = record.id === records[0]?.id && record.status === records[0]?.status;
    return {
      suffix: isDefault ? '' : `${record.id || 'sample'}-${record.status || 'record'}`,
      backKey: actual ? recordDestination(module, actual) : rootKey(module, record.status ? `state-${record.status}` : 'detail')
    };
  }
  function actionDestination(module, operation, screen) {
    const record = screen.record || seed.collections[module.collection]?.[0] || {};
    if (operation.command === 'record.view') return recordDestination(module, record);
    if (operation.command === 'consumer.history') {
      const context = recordContext(module, record), state = `history${context.suffix ? `-${context.suffix}` : ''}`;
      const key = rootKey(module, state);
      historyRequests.set(key, { module, state, record, backKey: context.backKey });
      return key;
    }
    if (operation.command === 'query.refresh') return rootKey(module, 'success');
    if (actionFields(module, operation).length) {
      const context = operation.scope === 'record' ? recordContext(module, record) : null;
      const state = `form-${operation.id}${context?.suffix ? `-${context.suffix}` : ''}`;
      const key = rootKey(module, state);
      const formRecord = operation.collection && operation.collection !== module.collection ? seed.collections[operation.collection]?.[0] || {} : record;
      formRequests.set(key, { module, state, operation, record: formRecord, contextRecord: context ? record : null, backKey: context?.backKey || rootKey(module, 'list') });
      return key;
    }
    return rootKey(module, 'success');
  }
  function actionBar(screen, module, operations, y) {
    let x = 0, rowHeight = 0;
    const visibleOperations = operations.filter(operation => !(screen.hasRecordDetails && operation.command === 'record.view')).filter(operation => actionDestination(module, operation, screen) !== screen.key);
    for (const operation of visibleOperations) {
      const labelWidth = Math.max(mobile ? 116 : 132, Math.min(screen.width, textHeight(t(operation.labelKey), 100000, 12) === 18 ? [...t(operation.labelKey)].length * 7.5 + 30 : 170));
      const buttonWidth = Math.min(screen.width, labelWidth, mobile ? 164 : 220);
      if (x && x + buttonWidth > screen.width) { y += rowHeight + 8; x = 0; rowHeight = 0; }
      rowHeight = Math.max(rowHeight, button(`${screen.key}/action-${operation.id}`, screen.key, operation.labelKey, screen.x + x, y, buttonWidth, actionDestination(module, operation, screen), visibleOperations.indexOf(operation) === 0));
      x += buttonWidth + 8;
    }
    return y + rowHeight + (visibleOperations.length ? 22 : 0);
  }
  function availableActions(module, record) {
    return module.actions.filter(operation => {
      if (operation.scope !== 'record') return false;
      const command = operation.command;
      if (['record.view', 'consumer.history', 'record.export', 'file.download'].includes(command)) return true;
      if (module.collection === 'workflowTickets') {
        if (command === 'workflow.edit' || command === 'workflow.resubmit') return record.status === 'rejected' && !record.feedbackId;
        if (['completed', 'closed', 'rejected'].includes(record.status)) return command === 'workflow.read';
        if (command === 'workflow.recover') return record.status === 'robot_failed';
        if (command === 'workflow.claim' || command === 'workflow.ignore') return record.status === 'pending';
        if (command === 'workflow.approve' || command === 'workflow.reject') return record.status === 'processing';
      }
      if (module.collection === 'feedback') {
        if (command === 'feedback.related') return record.status === 'completed';
        if (command === 'feedback.invite') return record.status === 'completed' && !record.evaluationId;
        if (record.status === 'completed') return false;
        if (command === 'feedback.claim') return record.status === 'pending';
        if (command === 'feedback.escalate') return record.status === 'processing' && !record.workflowTicketId;
        if (command === 'feedback.submit-completion') return record.status === 'waiting_completion';
        if (command === 'feedback.complete') return record.status === 'processing';
      }
      if (module.collection === 'evaluations' && command === 'evaluation.submit') return record.status === 'pending';
      if (module.collection === 'runs' && ['run.restart', 'run.stop'].includes(command)) return command === 'run.stop' ? record.status === 'running' : ['failed', 'stopped'].includes(record.status);
      if (module.kind === 'chat' && command === 'chat.send') return record.status === 'active';
      return true;
    });
  }
  function tableOrCards(screen, module, records, y) {
    const columns = module.columns.slice(0, mobile ? 4 : 5);
    if (!mobile) {
      const tableKey = `${screen.key}/table`;
      box(tableKey, screen.key, screen.x, y, screen.width, 62, colors.surface, true);
      const cellWidth = screen.width / columns.length;
      let headerHeight = 44;
      columns.forEach((column, index) => { headerHeight = Math.max(headerHeight, label(`${tableKey}/header-${column.key}`, tableKey, column.labelKey, index * cellWidth + 16, 14, cellWidth - 30, 11, colors.muted) + 28); });
      byKey.get(tableKey).height = headerHeight;
      let rowY = y + headerHeight;
      records.slice(0, 3).forEach((record, index) => {
        const rowKey = `${tableKey}/row-${record.id}`;
        const row = box(rowKey, screen.key, screen.x, rowY, screen.width, 62, colors.surface, true);
        let rowHeight = 54;
        columns.forEach((column, columnIndex) => { rowHeight = Math.max(rowHeight, valueText(`${rowKey}/cell-${column.key}`, rowKey, record, column, module.collection, columnIndex * cellWidth + 16, 15, cellWidth - 30, 12) + 30); });
        row.height = rowHeight; link(rowKey, recordDestination(module, record)); rowY += rowHeight;
      });
      return rowY + 20;
    }
    let cardY = y;
    for (const record of records.slice(0, 3)) {
      const cardKey = `${screen.key}/cards/${record.id}`, card = box(cardKey, screen.key, screen.x, cardY, screen.width, 140, colors.surface, true);
      let localY = 16;
      for (const [index, column] of columns.entries()) {
        localY += label(`${cardKey}/label-${column.key}`, cardKey, column.labelKey, 16, localY, screen.width - 32, 10, colors.muted) + 3;
        localY += valueText(`${cardKey}/value-${column.key}`, cardKey, record, column, module.collection, 16, localY, screen.width - 32, index ? 12 : 15) + 12;
      }
      card.height = localY + 4; link(cardKey, recordDestination(module, record)); cardY += card.height + 12;
    }
    return cardY + 10;
  }
  function detailContent(screen, module, record, y) {
    const detailKey = `${screen.key}/detail`, panel = box(detailKey, screen.key, screen.x, y, screen.width, 120, colors.surface, true);
    let localY = 20;
    for (const descriptor of module.fields) {
      if (['data', 'cover', 'icon', 'aiAvatar'].includes(descriptor.key) && typeof record?.[descriptor.key] === 'string' && record[descriptor.key].startsWith('data:')) continue;
      localY += label(`${detailKey}/label-${descriptor.key}`, detailKey, descriptor.labelKey, 18, localY, screen.width - 36, 11, colors.muted) + 4;
      const value = rowLabel(record, descriptor.key, module.collection);
      const display = value.value.length > 360 ? `${value.value.slice(0, 357)}…` : value.value;
      localY += text(`${detailKey}/value-${descriptor.key}`, detailKey, display, 18, localY, screen.width - 36, 13, colors.ink, value.mapping) + 20;
    }
    panel.height = localY;
    return y + localY + 20;
  }
  function recordDetailScreen(module, state, record) {
    const screen = Object.assign(newScreen(module, state), { record, hasRecordDetails: true });
    let y = actionBar(screen, module, availableActions(module, record), screen.y);
    y = detailContent(screen, module, record, y);
    button(`${screen.key}/back`, screen.key, 'ui.back', screen.x, y, 180, rootKey(module, 'list'));
  }
  function consumerHistoryScreen(module, state, record, backKey) {
    const screen = newScreen(module, state);
    let y = screen.y + label(`${screen.key}/title`, screen.key, 'ui.history', screen.x, screen.y, screen.width, 20) + 20;
    for (const [collection, sectionLabel] of [['feedback', 'field.feedbackId'], ['sessions', 'field.sessionId']]) {
      y += label(`${screen.key}/${collection}/title`, screen.key, sectionLabel, screen.x, y, screen.width, 16) + 12;
      const records = (seed.collections[collection] || []).filter(item => record.id && item.consumerId === record.id);
      if (!records.length) y += label(`${screen.key}/${collection}/empty`, screen.key, 'ui.empty', screen.x, y, screen.width, 13, colors.muted) + 12;
      for (const item of records) {
        const cardKey = `${screen.key}/${collection}/${item.id}`;
        const card = box(cardKey, screen.key, screen.x, y, screen.width, 100, colors.surface, true);
        let localY = 16;
        localY += text(`${cardKey}/id`, cardKey, item.id, 16, localY, screen.width - 32, 15, colors.ink, { collection, recordId: item.id, field: 'id' }) + 12;
        for (const descriptor of catalog.collections[collection].fields.filter(field => ['title', 'status', 'createdAt'].includes(field.key))) {
          localY += label(`${cardKey}/label-${descriptor.key}`, cardKey, descriptor.labelKey, 16, localY, screen.width - 32, 10, colors.muted) + 3;
          localY += valueText(`${cardKey}/value-${descriptor.key}`, cardKey, item, descriptor, collection, 16, localY, screen.width - 32, 12) + 12;
        }
        card.height = localY + 4;
        y += card.height + 12;
      }
      y += 12;
    }
    button(`${screen.key}/back`, screen.key, 'ui.back', screen.x, y, 180, backKey);
  }
  function formContent(screen, module, operation, record, contextRecord, backKey) {
    const formKey = `${screen.key}/form`, form = box(formKey, screen.key, screen.x, screen.y, screen.width, 100, colors.surface, true);
    const formFields = actionFields(module, operation), collection = operation.collection || module.collection;
    let y = 22;
    if (contextRecord?.id) {
      y += text(`${formKey}/record-id`, formKey, contextRecord.id, 18, y, screen.width - 36, 13, colors.ink, { collection: module.collection, recordId: contextRecord.id, field: 'id' }) + 12;
      if (contextRecord.status) {
        const value = rowLabel(contextRecord, 'status', module.collection);
        y += text(`${formKey}/record-status`, formKey, value.value, 18, y, screen.width - 36, 12, colors.muted, value.mapping) + 12;
      }
    }
    for (const descriptor of formFields) {
      const fieldKey = `${formKey}/field-${descriptor.key}`;
      y += label(`${fieldKey}/label`, formKey, descriptor.labelKey, 18, y, screen.width - 36, 12, colors.muted) + 8;
      if (descriptor.required) y += label(`${fieldKey}/required`, formKey, 'ui.required', 18, y, screen.width - 36, 10, colors.danger) + 4;
      let value = rowLabel(record, descriptor.key, collection);
      if (descriptor.options?.length && (record?.[descriptor.key] === undefined || record?.[descriptor.key] === null)) value = { value: t(descriptor.options[0].labelKey), mapping: { key: descriptor.options[0].labelKey } };
      const maxCharacters = descriptor.type === 'json' ? (mobile ? 140 : 350) : descriptor.type === 'textarea' ? (mobile ? 120 : 240) : 120;
      const display = value.value.length > maxCharacters ? `${value.value.slice(0, maxCharacters - 1)}…` : value.value;
      const controlHeight = Math.max(descriptor.type === 'json' ? 148 : descriptor.type === 'textarea' ? 100 : 48, descriptor.type === 'image' ? 48 : textHeight(display, screen.width - 60, 12) + 24);
      const control = box(fieldKey, formKey, 18, y, screen.width - 36, controlHeight, colors.surface, true);
      if (descriptor.type === 'image') {
        label(`${fieldKey}/upload`, control.key, 'ui.upload', 12, 12, control.width - 24, 13, colors.primary);
      } else {
        text(`${fieldKey}/value`, control.key, display, 12, 12, control.width - 24, 12, colors.ink, value.mapping);
      }
      y += controlHeight + 22;
    }
    const submitHeight = button(`${formKey}/submit`, formKey, operation.labelKey, 18, y, Math.min(screen.width - 36, 240), rootKey(module, 'success'), true);
    y += submitHeight + 12;
    y += button(`${formKey}/cancel`, formKey, 'ui.cancel', 18, y, Math.min(screen.width - 36, 180), backKey) + 22;
    form.height = y;
  }
  function stateScreen(module, state, messageKey) {
    const screen = newScreen(module, state);
    const card = box(`${screen.key}/state`, screen.key, screen.x, screen.y, screen.width, 220, colors.surface, true);
    const labelHeight = label(`${screen.key}/state/message`, card.key, messageKey, 24, 32, screen.width - 48, 20, state === 'error' ? colors.danger : colors.ink);
    const buttonY = 32 + labelHeight + 30;
    card.height = buttonY + button(`${screen.key}/state/back`, card.key, state === 'error' ? 'ui.refresh' : 'ui.back', 24, buttonY, Math.min(220, screen.width - 48), rootKey(module, 'list')) + 28;
  }
  function statusScenes(module) {
    if (module.kind === 'chat') return ['active', 'failed', 'unknown', 'ended'];
    if (module.collection === 'workflowTickets') return ['pending', 'processing', 'rejected', 'completed', 'closed', 'robot_failed'];
    if (module.collection === 'feedback') return ['pending', 'processing', 'waiting_completion', 'completed'];
    if (module.collection === 'evaluations') return ['pending', 'submitted', 'expired'];
    if (module.collection === 'runs') return ['running', 'failed', 'succeeded', 'stopped'];
    if (['robots', 'workflowTemplates', 'announcements'].includes(module.collection)) return ['draft', 'published', 'disabled'];
    if (module.collection === 'imageAudits') return ['pending', 'approved', 'rejected'];
    return [];
  }

  for (const module of modules) {
    const records = seed.collections[module.collection] || [], record = records[0] || {};
    const list = Object.assign(newScreen(module, 'list'), { record });
    let listY = actionBar(list, module, module.actions.filter(operation => operation.scope === 'module'), list.y);
    const search = box(`${list.key}/search`, list.key, list.x, listY, Math.min(list.width, 420), 44, colors.surface, true);
    label(`${search.key}/label`, search.key, 'ui.search', 14, 12, search.width - 28, 12, colors.muted); listY += 60;
    if (module.kind === 'dashboard') {
      const statsKey = `${list.key}/stats`, labels = ['ui.total', 'value.pending', 'value.completed'];
      let x = 0;
      for (const [index, translationKey] of labels.entries()) {
        const statWidth = mobile ? (list.width - 16) / 2 : (list.width - 32) / 3;
        const row = mobile && index === 2 ? 1 : 0;
        if (row) x = 0;
        const card = box(`${statsKey}/${index}`, list.key, list.x + x, listY + row * 116, statWidth, 100, colors.surface, true);
        label(`${card.key}/label`, card.key, translationKey, 16, 12, statWidth - 32, 11, colors.muted);
        const count = index === 0 ? records.length : records.filter(item => item.status === (index === 1 ? 'pending' : 'completed')).length;
        text(`${card.key}/value`, card.key, count, 16, 44, statWidth - 32, 26, colors.ink, { collection: module.collection, metric: index });
        x += statWidth + 16;
      }
      listY += mobile ? 240 : 124;
    }
    if (module.kind === 'chat') {
      for (const message of seed.collections.messages.filter(item => item.sessionId === record.id).slice(0, 3)) {
        const value = rowLabel(message, 'content', 'messages'), bubbleKey = `${list.key}/messages/${message.id}`;
        const bubbleHeight = textHeight(value.value, list.width - 48, 14) + 32;
        box(bubbleKey, list.key, list.x, listY, list.width, bubbleHeight, message.senderType === 'consumer' ? colors.soft : colors.surface, true);
        text(`${bubbleKey}/content`, bubbleKey, value.value, 18, 16, list.width - 36, 14, colors.ink, value.mapping); listY += bubbleHeight + 14;
      }
      listY = actionBar(list, module, availableActions(module, record), listY);
    } else listY = tableOrCards(list, module, records, listY);
    label(`${list.key}/pagination`, list.key, 'ui.showing', list.x, listY, list.width, 11, colors.muted, { count: Math.min(records.length, 3) });
    recordDetailScreen(module, 'detail', record);
    for (const context of recordViews.values()) if (context.module === module) recordDetailScreen(module, context.state, context.record);
    stateScreen(module, 'empty', 'ui.empty');
    stateScreen(module, 'error', 'ui.failedOperation');
    stateScreen(module, 'success', 'ui.success');
    for (const state of statusScenes(module)) {
      const screen = newScreen(module, `state-${state}`);
      const stateKey = dictionary[`value.${state}`] ? `value.${state}` : 'ui.unknown';
      let y = screen.y + label(`${screen.key}/status`, screen.key, stateKey, screen.x, screen.y, screen.width, 18, ['rejected', 'failed', 'robot_failed'].includes(state) ? colors.danger : colors.primary) + 22;
      const stateRecord = records.find(item => item.status === state) || {
        ...record, status: state,
        ...(module.kind === 'chat' && ['failed', 'unknown'].includes(state) ? { scenario: state === 'failed' ? 'failure' : 'unknown' } : {})
      };
      Object.assign(screen, { record: stateRecord, hasRecordDetails: true });
      y = actionBar(screen, module, availableActions(module, stateRecord), y);
      y = detailContent(screen, module, stateRecord, y);
      button(`${screen.key}/back`, screen.key, 'ui.back', screen.x, y, 180, rootKey(module, 'list'));
      flows.push({ nodeKey: screen.key, name: `${t(module.titleKey)} · ${t(stateKey)}` });
    }
    for (const context of historyRequests.values()) if (context.module === module) consumerHistoryScreen(module, context.state, context.record, context.backKey);
    for (const context of formRequests.values()) if (context.module === module) {
      const screen = newScreen(module, context.state);
      formContent(screen, module, context.operation, context.record, context.contextRecord, context.backKey);
    }
    flows.push({ nodeKey: rootKey(module, 'list'), name: t(module.titleKey) });
  }
  if (mobile) {
    add(navigationKey, 'FRAME', null, (frameIndex % 5) * (width + 120), Math.floor(frameIndex / 5) * (height + 120), width, height, { fills: paint(colors.surface), clipsContent: true, overflowDirection: 'VERTICAL' }, t('ui.navigation'));
    label(`${navigationKey}/title`, navigationKey, app.nameKey, 20, 24, width - 40, 24);
    let y = 90;
    for (const module of modules) y += button(`${navigationKey}/${module.id}`, navigationKey, module.titleKey, 20, y, width - 40, rootKey(module, 'list')) + 10;
  } else {
    add(sidebarKey, 'COMPONENT', null, -400, 0, 248, sidebarContentHeight, { fills: paint(colors.surface) }, t('ui.navigation'));
    label(`${sidebarKey}/brand`, sidebarKey, app.nameKey, 20, 24, 208, 18);
    let y = 82;
    for (const module of modules) {
      const key = `${sidebarKey}/nav-${module.id}`;
      const measured = label(key, sidebarKey, module.titleKey, 24, y, 200, 12, colors.muted);
      y += Math.max(36, measured + 15);
    }
  }
  const revision = digest({ catalog, seed, app: app.id, device, locale: locale.id, messages: dictionary, font, nodes, reactions, flows });
  const spec = validateDesignSpec({
    schemaVersion: '1.0', id: `business-${app.id}-${device}-${locale.id}-${revision.slice(0, 12)}`,
    name: `${t(app.nameKey)} · ${t(mobile ? 'ui.mobile' : 'ui.desktop')} · ${locale.label}`,
    source: { revision, adapter: `business-suite/1/${device}/${locale.id}/${rtl ? 'rtl' : 'ltr'}` },
    fontPolicy: { allowFallback: true, fallback: { family: 'Inter', style: 'Regular' } },
    nodes, assets: [], textStyles: [], variables: [], reactions, flows
  });
  const designBytes = Buffer.byteLength(JSON.stringify(spec));
  if (designBytes > 6.5 * 1024 * 1024) throw new Error(`Business Figma spec exceeds bridge payload budget: ${app.id}/${device}/${locale.id} uses ${designBytes} bytes; select a smaller app`);
  return spec;
}
