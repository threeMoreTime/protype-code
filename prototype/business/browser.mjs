// Kept self contained so the renderer can embed the application without a server.
export function startBusinessSuite(bundle, runtimeFactory) {
  'use strict';
  const runtime = runtimeFactory({ catalog: bundle.catalog, seed: bundle.seed });
  const catalog = bundle.catalog;
  const root = document.getElementById('business-app');
  const view = { app: bundle.initial.app, module: '', locale: bundle.initial.locale,
    device: bundle.initial.device, actorId: 'consumer-01', scenario: 'success',
    search: '', filter: '', filters: {}, page: 0, selected: '', menu: false };
  let serial = 0;
  let toastTimer;
  const missing = new Set();
  const pageSize = 10;
  const defaultActors = { workflow: 'processor-01', 'cs-admin': 'supervisor-01', 'cs-h5': 'consumer-01' };
  view.actorId = defaultActors[view.app];
  const dictionary = () => bundle.messages[view.locale];
  function t(key, variables = {}) {
    let value = dictionary()?.[key];
    if (value === undefined) { missing.add(key); root.dataset.missingTranslations = [...missing].join(','); return `⟦${key}⟧`; }
    for (const [name, replacement] of Object.entries(variables)) value = value.replaceAll(`{${name}}`, String(replacement));
    return value;
  }
  function element(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key === 'checked' || key === 'disabled' || key === 'required') node[key] = Boolean(value);
      else node.setAttribute(key, String(value));
    }
    for (const child of children.flat(Infinity)) if (child !== undefined && child !== null) node.append(child.nodeType ? child : document.createTextNode(String(child)));
    return node;
  }
  function button(key, handler, attrs = {}) { return element('button', { type: 'button', ...attrs, onclick: handler }, t(key)); }
  function actor() {
    const state = runtime.snapshot();
    const person = state.actors.find(item => item.id === view.actorId);
    const user = state.collections.users?.find(item => item.id === view.actorId);
    return { ...person, ...(user ? { roles: user.roles, name: user.name } : {}) };
  }
  function roleText(role) { return dictionary()?.[`role.${role}`] ?? runtime.snapshot().collections.roles?.find(item => item.code === role)?.name ?? role ?? t('ui.role'); }
  function readList(name, filter = {}) { return runtime.visibleList ? runtime.visibleList(name, filter, { actorId: view.actorId }) : runtime.list(name, filter); }
  function currentModule() { return catalog.modules.find(item => item.id === view.module); }
  function booleanKey(value, fieldKey = '', switchContext = false) {
    const isSwitch = switchContext || fieldKey === 'enabled' || fieldKey.endsWith('Enabled') || ['autoClaim', 'anonymous'].includes(fieldKey);
    return isSwitch ? (value ? 'value.enabled' : 'value.disabled') : (value ? 'value.yes' : 'value.no');
  }
  function display(record, key) {
    const translated = record.translations?.[view.locale]?.[key];
    if (translated !== undefined) return translated;
    if (record[`${key}Key`]) return t(record[`${key}Key`]);
    const value = record[key];
    if (value === undefined || value === null || value === '') return '·';
    if (typeof value === 'boolean') return t(booleanKey(value, key));
    if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? JSON.stringify(item) : enumText(item)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) return dateText(value);
    return enumText(value);
  }
  function dateText(value) {
    try { return new Intl.DateTimeFormat(view.locale.replace('_', '-'), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
    catch { return String(value); }
  }
  function enumText(value) {
    const key = `value.${value}`;
    if (dictionary()?.[key]) return dictionary()[key];
    const events = { created: 'create', updated: 'edit', claimed: 'claim', approved: 'approve', rejected: 'reject', closed: 'close', submitted: 'submit' };
    if (events[value] && dictionary()?.[`action.${events[value]}`]) return t(`action.${events[value]}`);
    const action = catalog.modules.flatMap(module => module.actions).find(item => item.command === value);
    return action ? t(action.labelKey) : String(value);
  }
  function title(record) { return display(record, record.title !== undefined ? 'title' : record.name !== undefined ? 'name' : 'id'); }
  function notify(message, error = false) {
    document.querySelector('.toast')?.remove(); clearTimeout(toastTimer);
    const node = element('div', { class: 'toast', role: error ? 'alert' : 'status' }, message);
    document.body.append(node); toastTimer = setTimeout(() => node.remove(), 5000);
  }
  function errorText(error) { return dictionary()?.[`error.${error.code}`] ?? `${t('ui.validationError')} (${error.code || error.message})`; }
  function switchModule(id, selected = '') {
    const module = catalog.modules.find(item => item.id === id);
    if (!module) return;
    view.app = module.appId; view.module = id; view.selected = selected;
    view.search = ''; view.filter = ''; view.filters = {}; view.page = 0; view.menu = false;
    history.replaceState(null, '', `#${encodeURIComponent(id)}${selected ? `/${encodeURIComponent(selected)}` : ''}`);
    render();
  }
  function download(name, value, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], { type }));
    const link = element('a', { href: url, download: name }); document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function modal(titleText, content) {
    const dialog = element('dialog', { 'aria-label': titleText },
      element('div', { class: 'dialog-head' }, element('h2', {}, titleText), button('ui.close', () => dialog.close())),
      element('div', { class: 'dialog-body' }, content));
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog); dialog.showModal(); return dialog;
  }
  function confirm(key, operation) {
    let dialog;
    const content = element('div', {}, element('p', {}, t(key)),
      element('div', { class: 'form-actions' }, button('ui.cancel', () => dialog.close()), button('ui.confirm', () => {
        try { operation(); dialog.close(); } catch (error) { notify(errorText(error), true); }
      }, { class: 'primary', 'data-testid': 'confirm-action' })));
    dialog = modal(t('ui.confirm'), content);
  }
  function dataTools() {
    let dialog;
    const file = element('input', { type: 'file', accept: '.json,application/json', class: 'safe-file', 'aria-label': t('ui.importData') });
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      try {
        if (file.files[0].size > 16000000) throw Object.assign(new Error(), { code: 'DATA_LIMIT' });
        const incoming = JSON.parse(await file.files[0].text());
        confirm('ui.dataImportConfirm', () => { runtime.importData(incoming); view.selected = ''; render(); notify(t('ui.operationComplete')); });
      } catch (error) { notify(errorText(error), true); }
    });
    const state = runtime.snapshot();
    const content = element('div', {}, element('p', { class: 'notice' }, t('ui.offlineDemo')),
      element('div', { class: 'actions' },
        button('ui.exportData', () => download('business-suite-demo-data.json', runtime.exportData())),
        button('ui.importData', () => file.click()),
        button('ui.resetData', () => confirm('ui.dataResetConfirm', () => { runtime.reset(); view.selected = ''; render(); notify(t('ui.operationComplete')); }), { class: 'danger' })), file);
    const pending = state.operations.filter(item => item.status === 'pending');
    for (const operation of pending) content.append(element('section', { class: 'detail-panel' }, element('p', {}, `${operation.command} · ${operation.id}`),
      element('div', { class: 'actions' }, ...['success', 'failure'].map(outcome => button(`ui.${outcome}`, () => {
        try { runtime.dispatch('operation.resolve', { operationId: operation.id, outcome }, { actorId: view.actorId }); dialog.close(); render(); dataTools(); notify(t('ui.operationComplete')); }
        catch (error) { notify(errorText(error), true); }
      })))));
    dialog = modal(t('ui.dataTools'), content);
  }
  function selectControl(key, id, items, value, changed) {
    const select = element('select', { 'data-testid': id, id }, items.map(item => element('option', { value: item.value }, item.label)));
    select.value = value; select.addEventListener('change', () => changed(select.value));
    return element('label', { for: id }, t(key), select);
  }
  function toolbar() {
    const state = runtime.snapshot();
    return element('div', { class: 'demo-bar' }, element('strong', {}, t('ui.offlineDemo')),
      element('div', { class: 'demo-controls' },
        selectControl('ui.product', 'app-select', catalog.apps.map(item => ({ value: item.id, label: t(item.nameKey) })), view.app, value => {
          view.actorId = defaultActors[value]; switchModule(catalog.apps.find(item => item.id === value).moduleIds[0]);
        }),
        selectControl('ui.language', 'locale-select', bundle.locales.map(item => ({ value: item.id, label: item.label })), view.locale, value => { view.locale = value; render(); }),
        selectControl('ui.role', 'actor-select', state.actors.map(item => ({ value: item.id, label: `${roleText(state.collections.users?.find(user => user.id === item.id)?.roles?.[0] ?? item.roles[0])} · ${item.name}` })), view.actorId, value => { view.actorId = value; view.selected = ''; render(); }),
        selectControl('ui.device', 'device-select', ['desktop', 'mobile'].map(value => ({ value, label: t(`ui.${value}`) })), view.device === 'auto' ? (matchMedia('(max-width:900px)').matches ? 'mobile' : 'desktop') : view.device, value => { view.device = value; render(); }),
        selectControl('ui.scenario', 'scenario-select', ['success', 'failure', 'unknown'].map(value => ({ value, label: t(`ui.${value}`) })), view.scenario, value => { view.scenario = value; }),
        button('ui.dataTools', dataTools, { class: 'tools-button' })));
  }
  function visibleRecords(module) {
    let rows = readList(module.collection);
    if (module.id === 'cs-h5.feedback-evaluation') {
      rows = [...rows, ...readList('feedback').filter(item => item.invitation && !item.evaluationId).map(item => ({
        id: item.id, feedbackId: item.id, consumerId: item.consumerId, status: 'invited', version: item.version, createdAt: item.invitation.invitedAt,
      }))];
    }
    const person = actor();
    if (view.app === 'cs-h5' && ['feedback', 'sessions', 'evaluations', 'tokenRecords'].includes(module.collection)) rows = rows.filter(item => item.consumerId === person.id);
    if (module.id === 'workflow.my-tickets') rows = rows.filter(item => item.creatorId === person.id || item.assigneeId === person.id || readList('workflowTasks').some(task => (task.workflowTicketId || task.ticketId) === item.id && (task.actorId || task.assigneeId) === person.id));
    if (module.id === 'cs-admin.my-tasks') rows = rows.filter(item => item.assigneeId === person.id);
    if (view.app === 'cs-h5' && ['knowledge', 'announcements'].includes(module.collection)) rows = rows.filter(item => item.enabled !== false && !['draft', 'disabled'].includes(item.status));
    if (view.filter) rows = rows.filter(item => item.status === view.filter);
    for (const [key, value] of Object.entries(view.filters)) if (value) rows = rows.filter(item => {
      const actual = item[key] ?? (key === 'projectId' && item.applicationId ? readList('applications').find(application => application.id === item.applicationId)?.projectId : undefined);
      return ['date', 'createdAt', 'startedAt'].includes(key) ? String(actual || '').startsWith(value) : String(actual ?? '') === value;
    });
    if (view.search) rows = rows.filter(item => (Object.keys(item).map(key => display(item, key)).join(' ')).toLowerCase().includes(view.search.toLowerCase()));
    return rows;
  }
  function canAction(action, record, module) {
    if (['record.view', 'query.refresh', 'record.export', 'robot.export', 'file.download', 'consumer.history'].includes(action.command)) return true;
    if (!runtime.can) return true;
    const result = runtime.can(action.command, { collection: action.collection || module.collection, ...(record ? { id: record.id } : {}), data: {} }, { actorId: view.actorId });
    return result.allowed || ['VALIDATION', 'UNKNOWN_FIELD', 'REFERENCE_NOT_FOUND'].includes(result.code) ||
      (result.code === 'NOT_FOUND' && action.scope === 'module' && action.fields?.some(field => field.key === 'id'));
  }
  function actionButtons(module, record, scope) {
    return element('div', { class: scope === 'record' ? 'row-actions' : 'actions' }, module.actions.filter(action => action.scope === scope && action.command !== 'record.view').map((action, index) =>
      button(action.labelKey, () => perform(action, record, module), { 'data-command': action.command, 'data-action': action.id, 'data-record': record?.id,
        disabled: !canAction(action, record, module), class: scope === 'module' && index === 0 ? 'primary' : action.id.toLowerCase().includes('delete') ? 'danger' : undefined })));
  }
  function dispatch(action, record, module, values = {}) {
    const data = { ...values };
    if (action.command.startsWith('record.')) delete data.id;
    const payload = { collection: action.collection || module.collection, ...(record ? { id: record.id } : {}), ...values,
      ...(!Object.hasOwn(values, 'data') || action.command.startsWith('record.') ? { data } : {}) };
    if (action.command === 'evaluation.submit' && record.feedbackId) { payload.id = record.feedbackId; payload.feedbackId = record.feedbackId; }
    const result = runtime.dispatch(action.command, payload, { actorId: view.actorId, requestId: `ui-${Date.now()}-${++serial}`, ...(record ? { expectedVersion: record.version } : {}), scenario: view.scenario });
    if (result?.id && result.status === 'pending' && result.offline) notify(t('ui.unknown'));
    else notify(t('ui.operationComplete'));
    render(); return result;
  }
  function perform(action, record, module) {
    if (action.command === 'query.refresh') { render(); return; }
    if (action.command === 'record.view') { view.selected = record.id; render(); return; }
    if (['record.export', 'robot.export'].includes(action.command)) { download(`${module.collection}-demo.json`, record || visibleRecords(module)); return; }
    if (action.command === 'file.download') {
      const link = element('a', { href: record.data, download: record.name }); document.body.append(link); link.click(); link.remove(); return;
    }
    if (action.command === 'consumer.history') {
      const rows = readList('feedback').filter(item => item.consumerId === record.id);
      modal(t(action.labelKey), element('div', {}, rows.map(item => element('p', {}, `${item.id} · ${title(item)} · ${display(item, 'status')}`)))); return;
    }
    if (action.command === 'config.translate') { translationForm(action, record, module); return; }
    if (action.command === 'knowledge.unresolved') {
      confirm('ui.submitAndContinue', () => { dispatch(action, record, module); view.draftFeedback = { title: title(record) }; switchModule('cs-h5.submit-feedback'); }); return;
    }
    const robotInputs = record?.draft?.fields || record?.draft?.inputs || record?.fields || record?.inputs;
    if (action.command === 'robot.test' && robotInputs?.length) {
      const types = { STRING: 'text', NUMBER: 'number', BOOLEAN: 'checkbox', ARRAY: 'json', OBJECT: 'json', FILE: 'image' };
      showForm(action, record, module, robotInputs.map(field => ({ ...field, labelKey: field.labelKey || `field.${field.key || field.name}`, type: types[field.type] || field.type || 'text' })), { wrap: 'input', result: true }); return;
    }
    if (['config.describe', 'consumer.translate', 'robot.test', 'alert.trigger'].includes(action.command)) {
      try { const result = dispatch(action, record, module); modal(t(action.labelKey), element('div', {}, element('p', { class: 'notice' }, t('ui.offlineDemo')), structuredDisplay(result))); }
      catch (error) { notify(errorText(error), true); } return;
    }
    const fields = action.fields || (['record.create', 'record.update'].includes(action.command) ? catalog.collections[action.collection || module.collection].fields.filter(field => !['version', 'createdAt', 'updatedAt'].includes(field.key)) : []);
    if (action.command === 'feedback.submit-completion' && record.completionRequest?.fields) {
      showForm(action, record, module, record.completionRequest.fields, { wrap: 'completionData' }); return;
    }
    if (fields.length) { showForm(action, record, module, fields); return; }
    const execute = () => dispatch(action, record, module);
    if (action.id.toLowerCase().includes('delete')) confirm('ui.deleteConfirm', execute);
    else try { execute(); } catch (error) { notify(errorText(error), true); }
  }
  function translationForm(action, record, module) {
    const form = element('form', {});
    const errors = element('div', { role: 'alert' });
    form.append(element('p', { class: 'notice' }, t('ui.offlineDemo')), errors);
    const keys = ['name', 'title', 'content', 'description', 'summary'].filter(key => typeof record[key] === 'string');
    const controls = [];
    for (const locale of bundle.locales) {
      const group = element('fieldset', {}, element('legend', {}, locale.label));
      for (const key of keys) {
        const value = record.translations?.[locale.id]?.[key] ?? bundle.messages[locale.id]?.[record[`${key}Key`]] ?? (locale.id === view.locale ? record[key] : '');
        const input = element(['content', 'description'].includes(key) ? 'textarea' : 'input', { name: `${locale.id}.${key}`, required: true, dir: locale.dir, 'aria-label': `${locale.label} · ${t(`field.${key}`)}` });
        input.value = value; controls.push({ locale: locale.id, key, input });
        group.append(element('label', { class: 'form-field' }, t(`field.${key}`), input));
      }
      form.append(group);
    }
    form.append(element('div', { class: 'form-actions' }, element('button', { type: 'submit', class: 'primary', 'data-testid': 'save-translations' }, t('ui.save'))));
    const dialog = modal(t(action.labelKey), form);
    form.addEventListener('submit', event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const translations = {};
      for (const control of controls) { translations[control.locale] ||= {}; translations[control.locale][control.key] = control.input.value; }
      try { dispatch(action, record, module, { translations }); dialog.close(); }
      catch (error) { errors.className = 'notice error'; errors.textContent = errorText(error); }
    });
  }
  function fieldInput(field, value, index, context = {}) {
    const types = { STRING: 'text', NUMBER: 'number', BOOLEAN: 'checkbox', ARRAY: 'json', OBJECT: 'json', FILE: 'image',
      'input-text': 'text', 'input-number': 'number', 'input-date': 'date', 'input-time': 'time', 'input-dateRange': 'date-range',
      'input-image': 'image', 'input-file': 'image', file: 'image', radio: 'select', radios: 'select', checkboxes: 'multi-select', 'rich-text': 'textarea', RICH_TEXT: 'textarea' };
    field = { ...field, sourceType: field.type, key: field.key || field.name, type: types[field.type] || field.type || 'text' };
    const id = `form-${++serial}-${index}`;
    const label = dictionary()?.[field.labelKey || `field.${field.key}`] ? t(field.labelKey || `field.${field.key}`) : field.label || field.key;
    const wrapper = element(field.type === 'json' ? 'div' : 'label', { class: `form-field${['json', 'textarea', 'image'].includes(field.type) ? ' wide' : ''}`, for: field.type === 'json' ? undefined : id }, `${label}${field.required ? ' *' : ''}`);
    let input;
    if (field.relation) {
      const rows = field.relation === 'actors' ? runtime.snapshot().actors : runtime.referenceOptions ? runtime.referenceOptions(field.relation,
        { actorId: view.actorId, command: context.command || '', ...(context.id ? { id: context.id } : {}), ...(context.templateId ? { templateId: context.templateId } : {}) }) : readList(field.relation);
      input = element('select', { id, name: field.key, required: field.required }, element('option', { value: '' }, t('ui.choose')),
        rows.map(item => element('option', { value: item.id }, `${title(item)} · ${item.id}`)));
      input.value = value ?? '';
    } else if (field.options) {
      input = element('select', { id, name: field.key, required: field.required, multiple: field.type === 'multi-select' ? '' : undefined }, field.options.map(option => element('option', { value: option.value ?? option }, option.labelKey ? t(option.labelKey) : option.label ?? enumText(option.value ?? option))));
      if (field.type === 'multi-select') for (const option of input.options) option.selected = (value || []).includes(option.value);
      else input.value = value ?? field.options[0]?.value ?? '';
    } else if (field.type === 'date-range') {
      input = element('input', { id, name: field.key, type: 'hidden', value: JSON.stringify(value || []) });
      const controls = ['start', 'end'].map((key, position) => {
        const control = element('input', { type: 'date', value: value?.[position] || '', required: field.required, 'aria-label': `${label} · ${t(`ui.${key}`)}` });
        control.addEventListener('change', () => { input.value = JSON.stringify(controls.map(item => item.value)); }); return control;
      });
      wrapper.append(...controls, input); return { field, wrapper, input };
    } else if (field.type === 'json') {
      input = element('textarea', { id, name: field.key, class: 'code', required: field.required, spellcheck: 'false' }, JSON.stringify(value ?? (field.sourceType === 'ARRAY' || field.key.endsWith('Ids') || ['fields', 'shifts', 'records', 'inputs', 'outputs', 'permissions'].includes(field.key) ? [] : {}), null, 2));
      input.setAttribute('aria-label', `${label} · ${t('ui.jsonEditor')}`);
      const structured = jsonEditor(input, field.key);
      wrapper.append(structured, element('details', {}, element('summary', {}, t('ui.jsonEditor')), input));
      return { field, wrapper, input };
    } else if (field.type === 'textarea') input = element('textarea', { id, name: field.key, required: field.required }, value ?? '');
    else if (field.type === 'checkbox') input = element('input', { id, name: field.key, type: 'checkbox', checked: value ?? false });
    else if (field.type === 'image') {
      input = element('input', { id, name: field.key, type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain' });
      input.dataset.data = value || '';
      const preview = element('div', { class: 'field-hint' }, value ? t('ui.attachments') : '');
      input.addEventListener('change', () => {
        const file = input.files[0]; if (!file) return;
        if (file.size > 2000000) { input.value = ''; notify(errorText({ code: 'INVALID_MEDIA' }), true); return; }
        const reader = new FileReader(); reader.onload = () => { input.dataset.data = String(reader.result); preview.textContent = file.name; input.dispatchEvent(new Event('media-ready')); }; reader.readAsDataURL(file);
      }); wrapper.append(input, preview); return { field, wrapper, input };
    } else {
      input = element('input', { id, name: field.key, type: field.type === 'datetime' ? 'datetime-local' : ['number', 'date', 'time'].includes(field.type) ? field.type : 'text',
        required: field.required, min: field.min, max: field.max, minlength: field.minLength, maxlength: field.maxLength, disabled: field.disabled, step: field.type === 'number' ? 'any' : undefined });
      input.value = field.type === 'datetime' && value ? String(value).slice(0, 16) : value ?? '';
    }
    wrapper.append(input); return { field, wrapper, input };
  }
  function jsonEditor(input, key) {
    const host = element('div', { class: 'structured-editor' });
    let data = JSON.parse(input.value);
    let editorNodes = 0;
    const clone = item => JSON.parse(JSON.stringify(item));
    const sync = () => { input.value = JSON.stringify(data, null, 2); };
    const labelFor = value => dictionary()?.[`field.${value}`] ?? value;
    function editor(value, change, path, depth) {
      if (depth > 8 || ++editorNodes > 1000) return element('small', {}, t('ui.jsonEditor'));
      if (Array.isArray(value)) {
        const group = element('div', { class: 'json-array' });
        value.forEach((item, index) => group.append(element('div', { class: 'json-entry' },
          element('div', { class: 'json-tools' }, element('strong', {}, `${labelFor(path.split('.').pop())} ${index + 1}`), button('ui.removeItem', () => { value.splice(index, 1); sync(); renderEditor(); }, { class: 'danger' })),
          editor(item, replacement => { value[index] = replacement; sync(); }, `${path}.${index}`, depth + 1))));
        group.append(button('ui.addItem', () => {
          const example = value[0];
          const next = example === undefined ? '' : typeof example === 'object' ? clone(example) : typeof example === 'number' ? 0 : typeof example === 'boolean' ? false : '';
          if (next && typeof next === 'object' && !Array.isArray(next) && Object.hasOwn(next, 'id')) next.id = `demo-node-${++serial}`;
          value.push(next); sync(); renderEditor();
        })); return group;
      }
      if (value && typeof value === 'object') {
        const group = element('div', { class: 'json-object' });
        for (const [name, child] of Object.entries(value)) {
          if (name.endsWith('Key')) continue;
          const body = editor(child, replacement => { value[name] = replacement; delete value[`${name}Key`]; sync(); }, `${path}.${name}`, depth + 1);
          if (child && typeof child === 'object') group.append(element('details', { open: depth < 2 ? '' : undefined }, element('summary', {}, labelFor(name)), body));
          else group.append(element('label', { class: 'form-field' }, labelFor(name), body));
        }
        group.append(button('ui.addItem', () => {
          const property = element('input', { required: true, 'aria-label': t('ui.name') });
          const form = element('form', {}, element('label', {}, t('ui.name'), property), element('button', { class: 'primary', type: 'submit' }, t('ui.addItem')));
          const dialog = modal(t('ui.addItem'), form);
          form.addEventListener('submit', event => { event.preventDefault(); const name = property.value.trim();
            if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name) || Object.hasOwn(value, name)) { notify(t('ui.invalidData'), true); return; }
            value[name] = ''; sync(); renderEditor(); dialog.close();
          });
        })); return group;
      }
      const control = element('input', { type: typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text',
        checked: typeof value === 'boolean' ? value : undefined, step: typeof value === 'number' ? 'any' : undefined,
        'aria-label': path, value: typeof value === 'boolean' ? undefined : value ?? '' });
      control.addEventListener('input', () => change(typeof value === 'boolean' ? control.checked : typeof value === 'number' ? Number(control.value) : control.value));
      return control;
    }
    function renderEditor() { editorNodes = 0; host.replaceChildren(editor(data, replacement => { data = replacement; sync(); }, key, 0)); }
    input.addEventListener('change', () => { try { data = JSON.parse(input.value); renderEditor(); } catch { /* The submit handler presents the validation error. */ } });
    renderEditor(); return host;
  }
  function readFields(controls, includeEmpty = false) {
    const result = {};
    for (const { field, input } of controls) {
      let value;
      if (field.type === 'checkbox') value = input.checked;
      else if (field.type === 'multi-select') value = [...input.selectedOptions].map(option => option.value);
      else if (field.type === 'json' || field.type === 'date-range') {
        try { value = JSON.parse(input.value); } catch { throw Object.assign(new Error(field.key), { code: 'VALIDATION' }); }
      } else if (field.type === 'image') value = input.dataset.data || undefined;
      else if (field.type === 'number') value = input.value === '' ? undefined : Number(input.value);
      else if (field.type === 'datetime') value = input.value ? new Date(input.value).toISOString() : undefined;
      else value = input.value;
      if (field.required && (value === undefined || value === '')) throw Object.assign(new Error(field.key), { code: 'VALIDATION' });
      if (includeEmpty && value === undefined && ['number', 'datetime'].includes(field.type)) value = null;
      if (value !== undefined && (value !== '' || field.required || includeEmpty)) result[field.key] = value;
    }
    return result;
  }
  function formContent(action, record, module, fields, onSaved, options = {}) {
    const form = element('form', { class: 'business-form', 'data-testid': 'business-form' });
    const grid = element('div', { class: 'form-grid' });
    let attachments = [];
    let attachmentsLoading = false;
    let attachmentRead = 0;
    const sample = record || (action.command === 'feedback.create' ? view.draftFeedback : action.command === 'record.create' ? readList(action.collection || module.collection)[0] : null);
    const controls = fields.filter(field => !(field.key === 'formData' && ['feedback.create', 'feedback.related'].includes(action.command)) && !(field.key === 'parameters' && action.command === 'workflow.create')).map((field, index) => {
      let value = sample?.[field.key];
      if (sample && action.command === 'record.update' && ['text', 'textarea'].includes(field.type) && (sample[`${field.key}Key`] || sample.translations?.[view.locale]?.[field.key] !== undefined)) value = display(sample, field.key);
      if (options.wrap) value = record?.[options.wrap]?.[field.key];
      if (field.key === 'language') value = view.locale;
      if (field.key === 'date') value = runtime.snapshot().clock.slice(0, 10);
      const control = { field, ...fieldInput(field, value, index, { command: action.command, id: record?.id, templateId: record?.templateId }) };
      control.initial = control.input.type === 'checkbox' ? control.input.checked : control.input.value;
      grid.append(control.wrapper); return control;
    });
    let dynamicControls = [];
    let dynamicKey;
    if (['feedback.create', 'feedback.related', 'workflow.create'].includes(action.command)) {
      dynamicKey = action.command === 'workflow.create' ? 'parameters' : 'formData';
      const sourceKey = dynamicKey === 'parameters' ? 'templateId' : 'typeId';
      const sourceCollection = dynamicKey === 'parameters' ? 'workflowTemplates' : 'feedbackTypes';
      const sourceControl = controls.find(control => control.field.key === sourceKey);
      const dynamic = element('fieldset', { class: 'form-field wide' }, element('legend', {}, t('ui.fieldConfiguration')));
      grid.append(dynamic);
      const update = () => {
        const record = readList(sourceCollection).find(item => item.id === sourceControl?.input.value);
        const schema = record?.formSchema?.fields || record?.formSchema || [];
        dynamic.replaceChildren(element('legend', {}, t('ui.fieldConfiguration')));
        dynamicControls = (Array.isArray(schema) ? schema : []).filter(field => !field.hidden).map((field, index) => {
          const control = { field, ...fieldInput(field, sample?.[dynamicKey]?.[field.key], index, { command: action.command }) };
          dynamic.append(control.wrapper); return control;
        });
      };
      sourceControl?.input.addEventListener('change', update); update();
    }
    if (['feedback.reply', 'feedback.batch-reply'].includes(action.command) && !actor().roles.includes('consumer')) {
      const replies = readList('quickReplies').filter(item => item.enabled !== false).sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)));
      const select = element('select', { 'aria-label': t('module.cs-admin.quick-replies'), 'data-testid': 'quick-reply-select' }, element('option', { value: '' }, t('ui.choose')),
        replies.map(reply => element('option', { value: reply.id }, display(reply, 'content'))));
      select.addEventListener('change', () => { const reply = replies.find(item => item.id === select.value); const target = controls.find(control => control.field.key === 'content'); if (reply && target) target.input.value = display(reply, 'content'); });
      grid.prepend(element('label', { class: 'form-field wide' }, t('module.cs-admin.quick-replies'), select));
    }
    if (['feedback.reply', 'feedback.batch-reply'].includes(action.command)) {
      const picker = element('input', { type: 'file', multiple: '', accept: 'image/png,image/jpeg,image/webp,image/gif', 'data-testid': 'reply-attachments', 'aria-label': t('ui.attachments') });
      const preview = element('div', { class: 'actions' });
      picker.addEventListener('change', async () => {
        const generation = ++attachmentRead; attachmentsLoading = true; picker.dataset.ready = 'false';
        const save = form.querySelector('[type="submit"]'); if (save) save.disabled = true;
        try {
          const files = [...picker.files];
          if (files.length > 5 || files.some(file => file.size > 2000000 || !/^image\/(png|jpeg|webp|gif)$/.test(file.type))) throw Object.assign(new Error(), { code: 'INVALID_MEDIA' });
          const data = await Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: file.type, data: String(reader.result) }); reader.onerror = reader.onabort = () => reject(Object.assign(new Error(), { code: 'INVALID_MEDIA' })); reader.readAsDataURL(file);
          })));
          if (generation !== attachmentRead) return;
          attachments = data; preview.replaceChildren(...data.map(item => element('img', { class: 'local-image', src: item.data, alt: item.name })));
        } catch (error) { if (generation === attachmentRead) { attachments = []; picker.value = ''; notify(errorText(error), true); } }
        finally { if (generation === attachmentRead) { attachmentsLoading = false; picker.dataset.ready = 'true'; if (save) save.disabled = false; } }
      });
      grid.append(element('label', { class: 'form-field wide' }, t('ui.attachments'), picker, preview));
    }
    const errors = element('div', { role: 'alert' });
    form.append(errors, grid, element('div', { class: 'form-actions' }, element('button', { type: 'submit', class: 'primary', 'data-testid': 'save-form' }, t(action.labelKey))));
    form.addEventListener('submit', event => {
      event.preventDefault(); if (attachmentsLoading || !form.reportValidity()) return;
      try {
        let values = readFields(controls, action.command === 'record.update');
        if (attachments.length) values.attachments = attachments;
        if (action.command === 'record.update') for (const control of controls) {
          const current = control.input.type === 'checkbox' ? control.input.checked : control.input.value;
          if (current === control.initial) delete values[control.field.key];
        }
        if (action.command === 'record.update' && sample?.translations?.[view.locale]) {
          const changed = Object.keys(values).filter(key => Object.hasOwn(sample.translations[view.locale], key));
          if (changed.length) {
            values.translations = JSON.parse(JSON.stringify(sample.translations));
            for (const key of changed) values.translations[view.locale][key] = values[key];
          }
        }
        if (dynamicKey) values[dynamicKey] = readFields(dynamicControls);
        if (options.wrap) values = { [options.wrap]: values };
        const result = dispatch(action, record, module, values); onSaved?.(result);
      } catch (error) { errors.className = 'notice error'; errors.textContent = errorText(error); }
    });
    return form;
  }
  function showForm(action, record, module, fields, options = {}) {
    let dialog;
    dialog = modal(t(action.labelKey), formContent(action, record, module, fields, result => {
      dialog.close();
      if (options.result) modal(t('ui.result'), element('div', {}, element('p', { class: 'notice' }, t('ui.offlineDemo')), structuredDisplay(result)));
    }, options));
  }
  function badge(record) {
    const status = record.status ?? (record.enabled !== undefined ? (record.enabled ? 'enabled' : 'disabled') : undefined);
    if (!status) return null;
    return element('span', { class: `badge ${['completed', 'published', 'active', 'enabled', 'succeeded', 'online'].includes(status) ? 'active' : ['failed', 'rejected', 'robot_failed', 'disabled'].includes(status) ? 'danger' : 'warning'}` }, enumText(status));
  }
  function recordLink(record, module, label = title(record)) {
    return element('a', { href: `#${encodeURIComponent(module.id)}/${encodeURIComponent(record.id)}`, class: 'record-title', 'data-testid': `record-${record.id}`,
      onclick: event => { event.preventDefault(); view.selected = record.id; render(); } }, label);
  }
  function tableView(module, rows) {
    const region = element('div', { class: 'data-region' });
    region.append(element('div', { class: 'data-toolbar' }, element('strong', {}, t(module.titleKey)), element('span', {}, `${rows.length} ${t('ui.records')}`)));
    if (!rows.length) { region.append(element('div', { class: 'empty' }, t('ui.empty'))); return region; }
    const columns = module.columns.length ? module.columns : module.fields.slice(0, 4);
    view.page = Math.min(view.page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
    const page = rows.slice(view.page * pageSize, (view.page + 1) * pageSize);
    region.append(element('div', { class: 'table-scroll' }, element('table', {},
      element('thead', {}, element('tr', {}, columns.map(column => element('th', { scope: 'col' }, t(column.labelKey))), element('th', { scope: 'col' }, t('ui.actions')))),
      element('tbody', {}, page.map(record => element('tr', {}, columns.map((column, index) => element('td', {}, index === 0 ? [recordLink(record, module, display(record, column.key)), element('span', { class: 'record-subtitle' }, record.id)] : column.key === 'status' ? badge(record) : display(record, column.key))),
        element('td', {}, button('ui.details', () => { view.selected = record.id; render(); }, { 'data-open-record': record.id }))))))));
    region.append(element('div', { class: 'record-cards' }, page.map(record => element('article', { class: 'record-card' },
      element('div', { class: 'record-card-head' }, element('div', {}, recordLink(record, module), element('small', {}, record.id)), badge(record)),
      element('div', { class: 'record-card-data' }, columns.filter(column => !['name', 'title', 'status'].includes(column.key)).slice(0, 4).map(column => element('div', {}, element('small', {}, t(column.labelKey)), display(record, column.key)))),
      element('div', { class: 'row-actions' }, button('ui.details', () => { view.selected = record.id; render(); }, { 'data-open-record': record.id }))))));
    region.append(element('div', { class: 'pagination' }, `${view.page * pageSize + 1}–${Math.min(rows.length, (view.page + 1) * pageSize)} / ${rows.length}`,
      element('div', { class: 'actions' }, button('ui.previous', () => { view.page--; render(); }, { disabled: view.page === 0 }),
        button('ui.next', () => { view.page++; render(); }, { disabled: (view.page + 1) * pageSize >= rows.length }))));
    return region;
  }
  function detailView(module, record) {
    const panel = element('section', { class: 'detail-panel', 'data-testid': 'record-detail', 'data-record-id': record.id },
      element('div', { class: 'detail-top' }, element('div', {}, element('h2', {}, title(record)), element('small', {}, record.id)), button('ui.back', () => { view.selected = ''; render(); })),
      actionButtons(module, record, 'record'));
    const fields = module.fields.filter(field => record[field.key] !== undefined);
    panel.append(element('dl', { class: 'detail-grid' }, fields.map(field => element('div', { class: `detail-field ${['json', 'textarea', 'image'].includes(field.type) ? 'wide' : ''}` },
      element('dt', {}, t(field.labelKey)), element('dd', {}, field.type === 'image' && /^data:image\//.test(record[field.key]) ? element('img', { class: 'local-image', src: record[field.key], alt: title(record) }) :
        field.type === 'json' || field.relation === 'files' ? structuredDisplay(record[field.key], 0, field.key) : display(record, field.key))))));
    for (const [key, target] of [['workflowTicketId', 'workflow.my-tickets'], ['feedbackId', view.app === 'cs-h5' ? 'cs-h5.feedback-detail' : 'cs-admin.feedback-list'], ['evaluationId', 'cs-h5.feedback-evaluation']]) {
      if (record[key]) panel.append(button(`field.${key}`, () => switchModule(target, record[key])));
    }
    if (module.collection === 'feedback') {
      const messages = readList('messages').filter(item => item.feedbackId === record.id);
      panel.append(element('div', { class: 'timeline' }, element('h3', {}, t('ui.messages')), messages.map(message => element('div', { class: 'timeline-entry' },
        element('span', { class: 'nav-dot' }), element('div', {}, message.retracted ? t('ui.empty') : display(message, 'content'),
          ...(message.retracted ? [] : (message.fileIds || []).map(id => structuredDisplay(id))),
          element('small', {}, `${enumText(message.senderType)} · ${dateText(message.createdAt)}`))))));
    }
    if (module.collection === 'knowledge') {
      const related = readList('knowledge').filter(item => (record.relatedIds || []).includes(item.id));
      if (related.length) panel.append(element('div', { class: 'timeline' }, element('h3', {}, t('ui.more')), element('div', { class: 'faq-grid' }, related.map(item => element('button', { class: 'faq-item', onclick: () => { view.selected = item.id; render(); } }, title(item))))));
    }
    if (module.id === 'cs-h5.announcement-detail') panel.append(button('ui.back', () => switchModule('cs-h5.faq')));
    const historyRows = [...(record.history || []), ...runtime.snapshot().timeline.filter(item => item.targetId === record.id)];
    if (historyRows.length) panel.append(element('div', { class: 'timeline' }, element('h3', {}, t('ui.history')), historyRows.map(entry =>
      element('div', { class: 'timeline-entry' }, element('span', { class: 'nav-dot' }), element('div', {}, enumText(entry.event || entry.command || entry.status),
        element('small', {}, `${entry.actorId || ''} · ${entry.at || entry.completedAt ? dateText(entry.at || entry.completedAt) : ''}${entry.round ? ` · ${t('field.round')} ${entry.round}` : ''}`),
        entry.title ? element('details', {}, element('summary', {}, display(entry, 'title')), structuredDisplay(entry.fields || {})) : null)))));
    return panel;
  }
  function structuredDisplay(value, depth = 0, fieldKey = '', switchContext = false) {
    if (depth > 10) return element('small', {}, '…');
    const isSwitchContext = switchContext || fieldKey === 'switches';
    if (typeof value === 'string') {
      if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(value)) return element('img', { class: 'local-image', src: value, alt: t('ui.attachments') });
      const file = readList('files').find(item => item.id === value);
      if (file?.auditStatus === 'rejected' && actor().roles.includes('consumer')) return element('span', { class: 'badge danger' }, `${file.name} · ${enumText('rejected')}`);
      if (file?.previewEnabled && /^data:image\//.test(file.data)) return element('div', {}, element('img', { class: 'local-image', src: file.data, alt: file.name }), element('small', {}, file.name));
      return element('span', {}, enumText(value));
    }
    if (value?.nodes) return element('div', { class: 'graph-list' }, value.nodes.map(node => element('div', { class: 'graph-node' }, element('span', { class: 'badge' }, node.type), element('strong', {}, node.nameKey ? t(node.nameKey) : node.name || node.id), element('small', {}, (node.next || []).join(' → ')))));
    if (Array.isArray(value)) return value.length ? element('div', { class: 'graph-list' }, value.map(item => element('div', { class: 'structured-value' }, structuredDisplay(item, depth + 1, fieldKey, isSwitchContext)))) : element('small', {}, t('ui.empty'));
    if (value && typeof value === 'object') return element('dl', { class: 'structured-values' }, Object.entries(value).filter(([key]) => !key.endsWith('Key') && key !== 'translations').map(([key, child]) =>
      element('div', { class: 'detail-field' }, element('dt', {}, dictionary()?.[`field.${key}`] ?? key), element('dd', {},
        value[`${key}Key`] ? t(value[`${key}Key`]) : structuredDisplay(child, depth + 1, key, isSwitchContext)))));
    return element('span', {}, value === undefined || value === null ? '·' : typeof value === 'boolean' ? t(booleanKey(value, fieldKey, isSwitchContext)) : String(value));
  }
  function dashboard(module, rows) {
    const statuses = [...new Set(rows.map(item => item.status || (typeof item.enabled === 'boolean' ? (item.enabled ? 'enabled' : 'disabled') : undefined)).filter(Boolean))];
    const countStatus = status => rows.filter(item => (item.status || (item.enabled ? 'enabled' : 'disabled')) === status).length;
    let metrics = [{ label: t('ui.total'), value: rows.length }, ...statuses.slice(0, 3).map(status => ({ label: enumText(status), value: countStatus(status) }))];
    if (module.id === 'cs-admin.staff-performance') metrics = [{ label: t('ui.total'), value: rows.length }, ...['completedCount', 'replyCount', 'onlineMinutes'].map(key => ({ label: t(`field.${key}`), value: rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) }))];
    if (module.id === 'cs-admin.ai-statistics') {
      const sessionIds = new Set(rows.map(row => row.id));
      const messages = readList('messages').filter(message => sessionIds.has(message.sessionId));
      metrics = [{ label: t('module.cs-h5.chat'), value: rows.length }, { label: t('field.replyCount'), value: messages.filter(message => message.senderType === 'ai').length },
        { label: t('module.cs-admin.knowledge'), value: new Set(messages.flatMap(message => message.knowledgeIds || [])).size },
        { label: t('field.tokenUsage'), value: messages.reduce((sum, message) => sum + (Number(message.tokenUsage) || 0), 0) }];
    }
    const stats = element('div', { class: 'stats' }, metrics.map(metric => element('div', { class: 'stat' }, element('small', {}, metric.label), element('strong', {}, metric.value), element('p', {}, t('ui.records')))));
    return element('div', {}, stats, element('section', { class: 'chart-panel' }, element('h2', {}, t('ui.overview')),
      element('div', { class: 'chart-bars' }, statuses.map(status => element('div', { class: 'chart-row' }, enumText(status), element('progress', { max: rows.length || 1, value: countStatus(status), 'aria-label': enumText(status) }), countStatus(status))))), tableView(module, rows));
  }
  function faqView(module, rows) {
    return element('div', {}, element('div', { class: 'help-banner' }, element('h2', {}, t('app.cs-h5')),
      element('p', { class: 'muted' }, t('ui.offlineDemo')), element('div', { class: 'actions' },
        button('module.cs-h5.chat', () => switchModule('cs-h5.chat'), { class: 'primary' }), button('module.cs-h5.submit-feedback', () => switchModule('cs-h5.submit-feedback')))),
      element('div', { class: 'faq-grid' }, rows.map(record => element('button', { class: 'faq-item', onclick: () => switchModule('cs-h5.faq-detail', record.id) }, element('h3', {}, title(record)), element('p', {}, display(record, 'content')), element('span', { class: 'arrow', 'aria-hidden': 'true' }, '→')))));
  }
  function previewFAQ(faq) {
    let dialog;
    dialog = modal(title(faq), element('div', {}, element('p', {}, display(faq, 'content')),
      button('ui.details', () => { dialog.close(); switchModule('cs-h5.faq-detail', faq.id); })));
  }
  function chatView(module, rows) {
    let session = rows.find(item => item.id === view.selected) || rows.find(item => item.status === 'active') || rows[0];
    if (!session) return element('div', { class: 'empty' }, t('ui.empty'), actionButtons(module, null, 'module'));
    const stream = element('div', { class: 'chat-stream', role: 'log', 'aria-label': t('ui.messages') });
    const welcome = readList('welcomeMessages').find(item => item.gameId === session.gameId);
    if (welcome) stream.append(element('div', { class: 'message' }, element('span', { class: 'avatar', 'aria-hidden': 'true' }, 'AI'), element('div', { class: 'message-bubble' }, display(welcome, 'content'))));
    readList('messages').filter(item => item.sessionId === session.id).forEach(message => {
      const actions = [...(message.actions || []), ...(message.knowledgeIds || []).filter(id => !(message.actions || []).some(action => action.knowledgeId === id)).map(knowledgeId => ({ type: 'FAQ', knowledgeId }))];
      stream.append(element('div', { class: `message ${message.senderType === 'consumer' ? 'user' : ''}` }, element('span', { class: 'avatar', 'aria-hidden': 'true' }, message.senderType === 'consumer' ? 'U' : 'AI'),
        element('div', {}, element('div', { class: 'message-bubble' }, display(message, 'content')),
          ...(message.fileIds || []).map(id => structuredDisplay(id)),
          element('div', { class: 'actions' }, actions.map(action => {
            if (action.type === 'FAQ') { const faq = readList('knowledge').find(item => item.id === action.knowledgeId); return faq ? element('button', { type: 'button', 'data-chat-action': 'faq', onclick: () => previewFAQ(faq) }, title(faq)) : null; }
            if (action.type === 'NAVIGATE' && catalog.modules.some(item => item.id === action.moduleId && item.appId === 'cs-h5')) return button(`module.${action.moduleId}`, () => switchModule(action.moduleId), { 'data-chat-action': 'navigate' });
            if (action.type === 'SEND_MESSAGE') return button('ui.send', () => { try { dispatch({ command: 'chat.send' }, session, module, { content: action.textKey ? t(action.textKey) : action.text || '' }); } catch (error) { notify(errorText(error), true); } }, { 'data-chat-action': 'send' });
            if (action.type === 'OPEN_URL') return button('ui.preview', () => { let url; try { const target = new URL(action.url); if (/^https?:$/.test(target.protocol) && !target.username && !target.password) url = target.href; } catch { /* Invalid links remain inert. */ }
              modal(t('ui.preview'), element('div', {}, element('p', { class: 'notice' }, t('ui.offlineDemo')), element('p', {}, url || t('ui.invalidData')))); }, { 'data-chat-action': 'preview' });
            if (['CREATE_FEEDBACK', 'FEEDBACK'].includes(action.type)) return button('module.cs-h5.submit-feedback', () => { view.draftFeedback = { title: action.title || '' }; switchModule('cs-h5.submit-feedback'); });
            return null;
          })), element('small', {}, dateText(message.createdAt)))));
    });
    const text = element('textarea', { name: 'content', rows: '1', required: true, 'aria-label': t('field.content'), 'data-testid': 'chat-message' });
    const form = element('form', { class: 'chat-compose' }, text, element('button', { type: 'submit', class: 'primary' }, t('ui.send')));
    form.addEventListener('submit', event => { event.preventDefault(); if (!form.reportValidity()) return;
      try { dispatch({ command: 'chat.send' }, session, module, { content: text.value }); } catch (error) { notify(errorText(error), true); }
    });
    return element('div', { class: 'chat-layout' }, element('section', { class: 'chat-window' },
      element('div', { class: 'chat-heading' }, element('span', { class: 'avatar' }, 'AI'), element('div', {}, element('h3', {}, t('app.cs-h5')), element('small', {}, t('ui.offlineDemo'))), badge(session)), stream, form),
      element('aside', { class: 'chat-aside' }, element('div', { class: 'context-block' }, element('h3', {}, t('ui.settings')), session.id, actionButtons(module, session, 'record')),
        element('div', { class: 'context-block' }, button('module.cs-h5.submit-feedback', () => switchModule('cs-h5.submit-feedback')), button('module.cs-h5.my-feedback', () => switchModule('cs-h5.my-feedback')))),
      element('div', { class: 'actions' }, actionButtons(module, session, 'record')));
  }
  function contentView(module) {
    const rows = visibleRecords(module);
    const selected = rows.find(item => item.id === view.selected || (module.id === 'cs-h5.feedback-evaluation' && item.feedbackId === view.selected));
    const content = element('div', { class: 'content', id: 'content', tabindex: '-1', 'data-testid': 'module-content', 'data-module': module.id },
      element('div', { class: 'page-heading' }, element('div', { class: 'heading-copy' }, element('span', { class: 'eyebrow' }, t(`app.${view.app}`)), element('h1', {}, t(module.titleKey)),
        element('p', {}, `${t('ui.offlineDemo')} · ${t('ui.revision')} ${runtime.snapshot().revision}`)), actionButtons(module, null, 'module')));
    if (selected && module.kind !== 'chat') { content.append(detailView(module, selected)); return content; }
    if (module.kind === 'form' && module.actions.some(action => action.scope === 'module' && action.fields)) {
      const action = module.actions.find(item => item.scope === 'module' && item.fields);
      content.append(element('section', { class: 'inline-form' }, formContent(action, null, module, action.fields, result => {
        if (module.collection === 'feedback') { delete view.draftFeedback; switchModule('cs-h5.feedback-detail', result.id); }
      }))); return content;
    }
    const search = element('input', { type: 'search', placeholder: t('ui.search'), 'aria-label': t('ui.search'), value: view.search, 'data-testid': 'record-search' });
    search.addEventListener('input', () => { const start = search.selectionStart; view.search = search.value; view.page = 0; render(); const replacement = document.querySelector('[data-testid="record-search"]'); replacement?.focus(); replacement?.setSelectionRange(start, start); });
    const statuses = [...new Set(readList(module.collection).map(item => item.status).filter(Boolean))];
    const filter = element('select', { 'aria-label': t('ui.status'), 'data-testid': 'status-filter' }, element('option', { value: '' }, t('ui.all')), statuses.map(status => element('option', { value: status }, enumText(status))));
    filter.value = view.filter; filter.addEventListener('change', () => { view.filter = filter.value; view.page = 0; render(); });
    const filters = (module.filters || []).filter(field => field.key !== 'status').map(field => {
      const key = field.key;
      const control = ['date', 'datetime'].includes(field.type) || key.endsWith('At') ? element('input', { type: 'date', 'aria-label': t(field.labelKey), 'data-filter': key }) :
        element('select', { 'aria-label': t(field.labelKey), 'data-filter': key }, element('option', { value: '' }, `${t(field.labelKey)} · ${t('ui.all')}`),
          field.relation ? readList(field.relation).map(record => element('option', { value: record.id }, title(record))) : [...new Set(readList(module.collection).map(record => record[key]).filter(value => value !== undefined))].map(value => element('option', { value }, enumText(value))));
      control.value = view.filters[key] || ''; control.addEventListener('change', () => { view.filters[key] = control.value; view.page = 0; render(); }); return control;
    });
    content.append(element('div', { class: 'filter-bar' }, element('div', { class: 'search' }, search), statuses.length ? filter : null, filters));
    if (module.kind === 'chat') content.append(chatView(module, rows));
    else if (module.kind === 'faq') content.append(faqView(module, rows));
    else if (module.kind === 'dashboard') content.append(dashboard(module, rows));
    else content.append(tableView(module, rows));
    return content;
  }
  function render() {
    missing.clear(); root.dataset.missingTranslations = '';
    const locale = bundle.locales.find(item => item.id === view.locale);
    document.documentElement.lang = view.locale.replace('_', '-'); document.documentElement.dir = locale.dir;
    if (!view.module) view.module = catalog.apps.find(item => item.id === view.app).moduleIds[0];
    const module = currentModule();
    document.title = `${t(module.titleKey)} · ${t(`app.${view.app}`)}`;
    const app = catalog.apps.find(item => item.id === view.app);
    const nav = element('nav', { class: 'side-nav', 'aria-label': t('ui.navigation') }, app.moduleIds.map(id => {
      const item = catalog.modules.find(candidate => candidate.id === id);
      return element('a', { href: `#${encodeURIComponent(id)}`, 'data-module': id, 'aria-current': id === module.id ? 'page' : undefined,
        onclick: event => { event.preventDefault(); switchModule(id); } }, element('span', { class: 'nav-dot', 'aria-hidden': 'true' }), t(item.titleKey));
    }));
    const sidebar = element('aside', { class: `sidebar${view.menu ? ' open' : ''}` }, element('div', { class: 'brand' }, element('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'S'), t(app.nameKey)),
      view.menu ? button('ui.close', () => { view.menu = false; render(); }) : null, nav,
      element('div', { class: 'side-footer' }, t('ui.offlineDemo')));
    root.replaceChildren(element('a', { href: '#content', class: 'skip' }, t('ui.skipToContent')), toolbar(),
      element('div', { class: `suite${view.device === 'mobile' ? ' mobile-suite' : ''}`, 'data-testid': 'suite' }, sidebar,
        element('main', { class: 'main' }, element('header', { class: 'app-header' },
          button('ui.menu', () => { view.menu = !view.menu; render(); }, { class: 'menu-button', 'aria-expanded': view.menu, 'aria-label': t('ui.menu') }),
          element('div', { class: 'breadcrumb' }, `${t(app.nameKey)} / ${t(module.titleKey)}`), element('div', { class: 'identity' }, element('span', { class: 'avatar', 'aria-hidden': 'true' }, actor().name.slice(0, 1)), element('span', { class: 'identity-name' }, roleText(actor().roles[0])))), contentView(module))));
    root.dataset.missingTranslations = [...missing].join(',');
  }
  let hash = [];
  try { hash = location.hash.slice(1).split('/').map(value => decodeURIComponent(value)); } catch { /* Recover to the selected product when a copied URL is malformed. */ }
  if (catalog.modules.some(item => item.id === hash[0])) { view.module = hash[0]; view.app = currentModule().appId; view.actorId = defaultActors[view.app]; view.selected = hash[1] || ''; }
  // A small read-only inspection surface supports deterministic browser acceptance.
  Object.defineProperty(window, 'businessSuite', { value: Object.freeze({ snapshot: () => runtime.snapshot(),
    navigate: (module, record) => switchModule(module, record), get state() { return { ...view }; } }) });
  render();
}
