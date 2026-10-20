// This function is deliberately self contained: the HTML renderer serializes it.
export function createBusinessRuntime({ catalog, seed }) {
  const schemaVersion = 'business-suite-data/1';
  const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
  const businessCollections = new Set(['feedback', 'workflowTickets', 'workflowTasks', 'messages', 'sessions', 'evaluations', 'cards', 'chatEvaluations', 'consumers', 'tokenRecords', 'staffSnapshots', 'runs', 'imageAudits', 'complaints']);
  const terminalWorkflow = new Set(['completed', 'closed', 'rejected']);
  const terminalFeedback = new Set(['completed', 'evaluated']);
  const externalCommands = new Set(['chat.connect', 'chat.send', 'chat.retry', 'config.translate', 'robot.test', 'workflow.sync', 'workflow.sync-customer', 'workflow.recover', 'workflow.recover-robot', 'task.run', 'run.restart', 'task.restart', 'alert.trigger', 'config.publish']);
  const metadata = catalog.collections || {};
  let state;

  function fail(code, message = code) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function safe(value) {
    let nodes = 0;
    let characters = 0;
    function walk(item, depth) {
      if (++nodes > 80000 || depth > 40) fail('DATA_LIMIT');
      if (item === null || typeof item === 'boolean') return;
      if (typeof item === 'number') { if (!Number.isFinite(item)) fail('UNSAFE_DATA'); return; }
      if (typeof item === 'string') { characters += item.length; if (characters > 12000000 || item.length > 3000000) fail('DATA_LIMIT'); return; }
      if (typeof item !== 'object' || (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item)))) fail('UNSAFE_DATA');
      for (const key of Object.keys(item)) {
        if (blockedKeys.has(key)) fail('UNSAFE_DATA');
        walk(item[key], depth + 1);
      }
    }
    walk(value, 0);
    return value;
  }

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  function signature(value) {
    const text = stable(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16);
  }
  function collection(data, name) {
    if (!Object.hasOwn(metadata, name) || !Object.hasOwn(data.collections, name)) fail('UNKNOWN_COLLECTION', name);
    return data.collections[name];
  }
  function find(data, name, id) {
    const result = collection(data, name).find((item) => item.id === id);
    if (!result) fail('NOT_FOUND', `${name}:${id}`);
    return result;
  }
  function actor(data, id) {
    const result = data.actors.find((item) => item.id === id);
    const user = data.collections.users?.find((item) => item.id === id);
    if (!result || result.enabled === false || result.status === 'disabled' || user?.enabled === false) fail('FORBIDDEN');
    if (!user) return result;
    const currentRoles = (user.roles || result.roles).filter((code) => !data.collections.roles?.some((role) => role.code === code && role.enabled === false));
    return { ...result, roles: currentRoles, teamIds: user.teamIds || result.teamIds || [], organizationId: user.organizationId || '' };
  }
  function roles(person) { return Array.isArray(person.roles) ? person.roles : [person.role]; }
  function permit(person, allowed) {
    if (!roles(person).some((role) => role === 'admin' || allowed.includes(role))) fail('FORBIDDEN');
  }
  function owned(person, item) {
    if (roles(person).includes('consumer') && (Object.hasOwn(item, 'consumerId') || Object.hasOwn(item, 'creatorId')) && item.consumerId !== person.id && item.creatorId !== person.id) fail('FORBIDDEN');
  }
  function teamAccess(person, item) {
    if (!item.teamId || roles(person).some((role) => ['admin', 'consumer'].includes(role))) return;
    if (!person.teamIds?.includes(item.teamId)) fail('FORBIDDEN');
  }
  function scopeFor(data, person) {
    if (roles(person).includes('admin')) return 'all';
    if (roles(person).includes('consumer')) return 'self';
    if (!data.collections.users && !data.collections.roles) return 'all';
    const assigned = (data.collections.roles || []).filter((role) => roles(person).includes(role.code) && role.enabled !== false);
    const order = ['self', 'team', 'organization', 'all'];
    return assigned.length ? order[Math.max(...assigned.map((role) => Math.max(0, order.indexOf(role.dataScope || 'self'))))] : 'team';
  }
  function normalizeScope(value) { return ({ '1': 'all', '2': 'custom', '3': 'organization', '4': 'org-children', '5': 'self', 'organization-and-children': 'org-children' })[value] || value; }
  function scopedOrganizations(data, person, rule) {
    const selected = normalizeScope(rule.dataScope) === 'custom' ? rule.organizationIds || rule.deptIds || [] : [person.organizationId];
    const result = new Set(selected.filter(Boolean));
    if (normalizeScope(rule.dataScope) === 'org-children') {
      let changed = true;
      while (changed) { changed = false; for (const entry of data.collections.organizations || []) if (result.has(entry.parentId) && !result.has(entry.id)) { result.add(entry.id); changed = true; } }
    }
    return result;
  }
  function visible(data, name, item, person, depth = 0) {
    if (depth > 8) return false;
    if (roles(person).includes('admin')) return true;
    const consumer = roles(person).includes('consumer');
    if (consumer && name === 'workflowTickets' && item.creatorId === person.id) return true;
    const publicNames = ['knowledge', 'knowledgeCategories', 'games', 'welcomeMessages', 'announcements', 'feedbackTypes', 'cardTemplates', 'evaluationConfigs', 'evaluationTags'];
    if (consumer && publicNames.includes(name)) return item.enabled !== false && !['draft', 'disabled'].includes(item.status) && (!item.expiresAt || Date.parse(item.expiresAt) >= Date.parse(data.clock));
    if (consumer && !['feedback', 'messages', 'sessions', 'cards', 'evaluations', 'chatEvaluations', 'consumers', 'tokenRecords', 'files'].includes(name)) return false;
    const nested = (target, id) => { const found = data.collections[target]?.find((entry) => entry.id === id); return !!found && visible(data, target, found, person, depth + 1); };
    if (['messages', 'cards', 'evaluations'].includes(name) && item.feedbackId) return nested('feedback', item.feedbackId);
    if (['messages', 'chatEvaluations'].includes(name) && item.sessionId) return nested('sessions', item.sessionId);
    if (name === 'workflowTasks') return nested('workflowTickets', item.workflowTicketId || item.ticketId);
    if (['staffStatus', 'staffSnapshots'].includes(name)) return nested('staff', item.staffId);
    if (name === 'imageAudits') return nested('files', item.fileId);
    if (!consumer && name === 'runs' && !item.creatorId && item.applicationId) return nested('applications', item.applicationId);
    if (!consumer && ['consumers', 'sessions'].includes(name)) {
      const consumerId = name === 'consumers' ? item.id : item.consumerId;
      if ((data.collections.feedback || []).some((entry) => entry.consumerId === consumerId && visible(data, 'feedback', entry, person, depth + 1))) return true;
    }
    if (name === 'files' && !item.ownerId) {
      const owners = (data.collections.feedback || []).filter((entry) => (entry.fileIds || []).includes(item.id) || Object.values(entry.formData || entry.fields || {}).includes(item.id) || Object.values(entry.completionData || {}).includes(item.id));
      if (owners.length) return owners.some((entry) => visible(data, 'feedback', entry, person, depth + 1));
      if (consumer) return false;
      if (item.storageId) return nested('storage', item.storageId);
    }
    if (consumer) return name === 'consumers' ? item.id === person.id : item.consumerId === person.id || item.ownerId === person.id || item.creatorId === person.id;
    const rules = (data.collections.roles || []).filter((role) => roles(person).includes(role.code) && role.enabled !== false);
    if (!rules.length) rules.push({ dataScope: scopeFor(data, person) });
    if (rules.some((rule) => normalizeScope(rule.dataScope) === 'all')) return true;
    const ownership = ['creatorId', 'assigneeId', 'actorId', 'ownerId', 'userId', 'agentId', 'senderId'].map((key) => item[key]).filter(Boolean);
    if (name === 'users') ownership.push(item.id);
    if (name === 'workflowTickets') ownership.push(...(data.collections.workflowTasks || []).filter((task) => (task.workflowTicketId || task.ticketId) === item.id && task.status !== 'ignored').map((task) => task.actorId || task.assigneeId));
    if (name === 'staff') ownership.push(item.userId);
    const owners = (data.collections.users || []).filter((user) => ownership.includes(user.id));
    const teamIds = [...(item.teamIds || []), ...(item.teamId ? [item.teamId] : []), ...(name === 'teams' ? [item.id] : [])];
    const privateRecord = businessCollections.has(name) || ['users', 'teams', 'staff', 'staffStatus'].includes(name);
    if (!privateRecord && !item.organizationId && !teamIds.length && !ownership.length) return true;
    const organizations = item.organizationId ? [item.organizationId] : owners.map((user) => user.organizationId).filter(Boolean);
    if (name === 'organizations') organizations.push(item.id);
    if (name === 'teams') organizations.push(...(data.collections.users || []).filter((user) => user.teamIds?.includes(item.id)).map((user) => user.organizationId));
    return rules.some((rule) => {
      const scope = normalizeScope(rule.dataScope || 'self');
      if (scope === 'self') return ownership.includes(person.id);
      if (scope === 'team') return teamIds.length ? teamIds.some((id) => person.teamIds?.includes(id)) : owners.some((user) => user.teamIds?.some((id) => person.teamIds?.includes(id)));
      return ['organization', 'org-children', 'custom'].includes(scope) && organizations.some((id) => scopedOrganizations(data, person, rule).has(id));
    });
  }
  function scopeAccess(data, person, name, item) {
    if (!visible(data, name, item, person)) fail('FORBIDDEN');
  }
  function filtered(data, name, filter, person) {
    return collection(data, name).filter((item) => visible(data, name, item, person)).filter((item) => Object.entries(filter).every(([key, value]) => key === 'search' ? stable(item).toLowerCase().includes(String(value).toLowerCase()) : Array.isArray(value) ? value.includes(item[key]) : item[key] === value));
  }
  function authorize(data, person, command) {
    if (roles(person).includes('admin') || roles(person).includes('consumer')) return;
    const domain = command.split('.')[0];
    if (!['feedback', 'workflow'].includes(domain)) return;
    const assigned = (data.collections.roles || []).filter((role) => roles(person).includes(role.code) && role.enabled !== false);
    if (!assigned.length) return;
    const permissions = assigned.flatMap((role) => role.permissions || []);
    if (!permissions.some((permission) => permission === '*' || permission === `${domain}.*` || permission === command || (permission === 'workflow.process' && ['workflow.claim', 'workflow.ignore', 'workflow.approve', 'workflow.reject', 'workflow.comment', 'workflow.read', 'workflow.transfer', 'workflow.request-info', 'workflow.recover', 'workflow.sync'].includes(command)))) fail('FORBIDDEN');
  }
  function active(item, statuses) { if (!statuses.includes(item.status)) fail('INVALID_STATE', item.status); }
  function expected(item, context) {
    if (context.expectedVersion !== undefined && item.version !== context.expectedVersion) fail('VERSION_CONFLICT');
  }
  function nextId(data, prefix) {
    let id;
    do { id = `${prefix.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}-${data.nextSequence++}`; }
    while (Object.values(data.collections).some((items) => items.some((item) => item.id === id)) || data.operations.some((item) => item.id === id));
    return id;
  }
  function tick(data) { data.clock = new Date(Date.parse(data.clock) + 1000).toISOString(); return data.clock; }
  function touch(data, item) { item.version = (item.version || 0) + 1; item.updatedAt = data.clock; return item; }
  function insert(data, name, values) {
    const item = { ...values, id: nextId(data, name), version: 1, createdAt: data.clock, updatedAt: data.clock };
    collection(data, name).push(item);
    return item;
  }
  function requiredText(value, key, max = 4000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) fail('VALIDATION', key);
    return value.trim();
  }
  function fieldRelation(field) { return field.relation || field.collection || field.reference; }
  function reference(data, target, value) {
    if (value === undefined || value === null || value === '') return;
    for (const id of Array.isArray(value) ? value : [value]) {
      if (typeof id !== 'string') fail('VALIDATION');
      if (target === 'actors') { if (!data.actors.some((item) => item.id === id)) fail('REFERENCE_NOT_FOUND', `${target}:${id}`); }
      else if (!data.collections[target]?.some((item) => item.id === id)) fail('REFERENCE_NOT_FOUND', `${target}:${id}`);
    }
  }
  function fieldCheck(data, field, value) {
    const mapping = { 'input-text': 'text', 'rich-text': 'textarea', 'input-number': 'number', 'input-date': 'date', 'input-time': 'time', 'input-dateRange': 'dateRange', 'input-image': 'image', 'input-file': 'file', radios: 'select' };
    field = { ...field, key: field.key || field.name, type: mapping[field.type] || field.type };
    if (field.hidden === true || field.disabled === true) return;
    if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) fail('VALIDATION', field.key);
    if (value === undefined || value === null || value === '') return;
    const type = field.type;
    if (['text', 'textarea', 'date', 'datetime', 'image'].includes(type) && typeof value !== 'string') fail('VALIDATION', field.key);
    if (typeof value === 'string' && ((field.minLength !== undefined && value.length < field.minLength) || (field.maxLength !== undefined && value.length > field.maxLength))) fail('VALIDATION', field.key);
    if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) fail('VALIDATION', field.key);
    if (['checkbox', 'boolean'].includes(type) && typeof value !== 'boolean') fail('VALIDATION', field.key);
    if (['date', 'datetime'].includes(type) && !Number.isFinite(Date.parse(value))) fail('VALIDATION', field.key);
    if (type === 'select' && field.key === 'dataScope') { if (!['self', 'team', 'organization', 'org-children', 'custom', 'all'].includes(normalizeScope(value))) fail('VALIDATION', field.key); }
    else if (type === 'select' && field.options?.length && !field.options.some((item) => (typeof item === 'object' ? item.value : item) === value)) fail('VALIDATION', field.key);
    if (type === 'checkboxes' && (!Array.isArray(value) || value.some((selected) => !field.options?.some((item) => (typeof item === 'object' ? item.value : item) === selected)))) fail('VALIDATION', field.key);
    if (type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) fail('VALIDATION', field.key);
    if (type === 'dateRange' && (!Array.isArray(value) || value.length !== 2 || value.some((date) => typeof date !== 'string' || !Number.isFinite(Date.parse(date))) || Date.parse(value[0]) > Date.parse(value[1]))) fail('VALIDATION', field.key);
    if (['image', 'file'].includes(type)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        const id = typeof item === 'string' ? item : item?.id;
        if (typeof id !== 'string') fail('VALIDATION', field.key);
        if (id.startsWith('data:')) validateMedia({ data: id });
        else reference(data, 'files', id);
      }
    }
    if (type === 'json' && (typeof value !== 'object' || value === null)) fail('VALIDATION', field.key);
    if (fieldRelation(field)) reference(data, fieldRelation(field), value);
  }
  function validateFields(data, name, values, strict = true) {
    const fields = metadata[name].fields || [];
    if (strict && fields.length) for (const key of Object.keys(values)) {
      if (!fields.some((field) => field.key === key)) fail('UNKNOWN_FIELD', key);
    }
    for (const field of fields) fieldCheck(data, field, values[field.key]);
  }
  function refsFor(name, item) {
    const refs = (metadata[name]?.fields || []).filter(fieldRelation).map((field) => [fieldRelation(field), item[field.key]]);
    const actorFields = ['consumerId', 'creatorId', 'assigneeId', 'actorId', 'invitedBy', 'ownerId'];
    for (const key of actorFields) if (item[key]) refs.push(['actors', item[key]]);
    const known = { feedbackId: 'feedback', workflowTicketId: 'workflowTickets', ticketId: 'workflowTickets', sessionId: 'sessions', categoryId: 'knowledgeCategories', templateId: 'workflowTemplates', cardTemplateId: 'cardTemplates', evaluationId: 'evaluations', robotId: 'robots', teamId: 'teams', fileIds: 'files', relatedFeedbackId: 'feedback' };
    for (const [key, target] of Object.entries(known)) if (item[key] && Object.hasOwn(metadata, target)) refs.push([target, item[key]]);
    const arrayRefs = { teamIds: 'teams', organizationIds: 'organizations', deptIds: 'organizations', adminIds: 'users', userIds: 'users', staffIds: 'staff', gameIds: 'games', feedbackTypeIds: 'feedbackTypes', workflowTemplateIds: 'workflowTemplates', templateIds: 'workflowTemplates', packageIds: 'packages', tagIds: 'evaluationTags', relatedIds: 'knowledge' };
    for (const [key, target] of Object.entries(arrayRefs)) if (item[key] && Object.hasOwn(metadata, target)) refs.push([target, item[key]]);
    if (name === 'teams') for (const member of item.members || []) refs.push(['users', member.userId]);
    if (name === 'workflowTemplates') for (const node of item.workflow?.nodes || item.nodes || []) {
      if (node.robotId) refs.push(['robots', node.robotId]);
      if (node.approverIds) refs.push(['users', node.approverIds]);
      if (node.userIds) refs.push(['users', node.userIds]);
    }
    if (name === 'schedules') for (const shift of item.shifts || []) refs.push(['users', shift.userId || shift.assigneeId]);
    return refs.filter(([target]) => target === 'actors' || Object.hasOwn(metadata, target));
  }
  function validateData(data) {
    safe(data);
    if (data.schemaVersion !== schemaVersion || !Number.isInteger(data.revision) || data.revision < 0 || !Number.isFinite(Date.parse(data.clock)) || !Number.isInteger(data.nextSequence) || data.nextSequence < 1 || !Array.isArray(data.actors) || !Array.isArray(data.timeline) || !Array.isArray(data.operations) || !data.collections || Array.isArray(data.collections)) fail('INVALID_DATA');
    if (data.actors.length > 500 || data.timeline.length > 20000 || data.operations.length > 20000) fail('DATA_LIMIT');
    const ids = new Set();
    for (const person of data.actors) {
      if (!person.id || typeof person.id !== 'string' || person.id.length > 200 || ids.has(person.id) || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 200 || !roles(person).every((role) => typeof role === 'string' && role.length > 0 && role.length <= 100) || (person.teamIds !== undefined && (!Array.isArray(person.teamIds) || person.teamIds.some((id) => typeof id !== 'string')))) fail('INVALID_DATA');
      ids.add(person.id);
    }
    if (data.actors.length !== initialActors.length || initialActors.some((person) => !data.actors.some((item) => item.id === person.id && stable(roles(item).slice().sort()) === stable(roles(person).slice().sort())))) fail('FORBIDDEN', 'Actor identities cannot be replaced by a data file');
    for (const name of Object.keys(data.collections)) if (!Object.hasOwn(metadata, name)) fail('UNKNOWN_COLLECTION', name);
    for (const name of Object.keys(metadata)) {
      if (!Array.isArray(data.collections[name]) || data.collections[name].length > 10000) fail('INVALID_DATA', name);
      const localIds = new Set();
      for (const item of data.collections[name]) {
        if (!item || typeof item.id !== 'string' || !item.id || localIds.has(item.id) || !Number.isInteger(item.version) || item.version < 1) fail('INVALID_DATA', name);
        localIds.add(item.id);
        validateFields(data, name, item, false);
        for (const [target, value] of refsFor(name, item)) reference(data, target, value);
        if (name === 'files') validateMedia(item);
      }
    }
    for (const operation of data.operations) if (!operation.id || !['success', 'failure', 'pending'].includes(operation.status)) fail('INVALID_DATA');
    return data;
  }
  function validateMedia(item) {
    if (typeof item.data !== 'string' || !/^data:(image\/(png|jpeg|gif|webp)|text\/plain|application\/pdf);base64,[A-Za-z0-9+/]*={0,2}$/.test(item.data) || item.data.length > 2800000) fail('INVALID_MEDIA');
    if (item.mime && !item.data.startsWith(`data:${item.mime};base64,`)) fail('INVALID_MEDIA');
  }
  const initialActors = copy(safe(seed.actors || []));
  const initial = copy(safe(seed));
  for (const name of Object.keys(metadata)) initial.collections[name] ||= [];
  validateData(initial);
  state = copy(initial);

  function configPermission(person, name) {
    if (businessCollections.has(name)) fail('BUSINESS_COMMAND_REQUIRED');
    if (metadata[name].readOnly || metadata[name].editable === false) fail('FORBIDDEN');
    const restricted = ['users', 'roles', 'menus', 'systemSettings', 'storage', 'organizations', 'projects'];
    permit(person, restricted.includes(name) ? ['admin'] : ['supervisor', 'team-admin']);
    if (metadata[name].roles) permit(person, metadata[name].roles);
  }
  function referenceInUse(data, name, id) {
    return Object.entries(data.collections).some(([source, items]) => items.some((item) => !(source === name && item.id === id) && refsFor(source, item).some(([target, value]) => target === name && (Array.isArray(value) ? value.includes(id) : value === id))));
  }
  function staffAvailability(data, item, next) {
    if (!['online', 'busy', 'offline'].includes(next)) fail('VALIDATION');
    if (item.availability === next) return;
    for (const status of data.collections.staffStatus || []) if (status.staffId === item.id && !status.endedAt) { status.endedAt = data.clock; touch(data, status); }
    item.availability = next;
    if (data.collections.staffStatus) insert(data, 'staffStatus', { staffId: item.id, status: next, startedAt: data.clock, endedAt: null });
  }
  function generic(data, command, payload, person, context) {
    const name = payload.collection;
    collection(data, name);
    if (command === 'record.export') { permit(person, ['agent', 'processor', 'supervisor', 'team-admin']); return { schemaVersion, collection: name, records: copy(filtered(data, name, {}, person)), offline: true }; }
    configPermission(person, name);
    if (command === 'record.import') {
      if (!Array.isArray(payload.records) || payload.records.length > 1000) fail('VALIDATION');
      return payload.records.map((values) => generic(data, 'record.create', { collection: name, values }, person, context));
    }
    const values = payload.values || payload.data || {};
    if (command === 'record.create') {
      const candidate = { ...values, version: 1, createdAt: data.clock, updatedAt: data.clock };
      if ((metadata[name].fields || []).length) for (const key of Object.keys(values)) if (!metadata[name].fields.some((field) => field.key === key)) fail('UNKNOWN_FIELD', key);
      validateFields(data, name, candidate, false);
      if (Object.keys(values).some((key) => ['id', 'version', 'createdAt', 'updatedAt'].includes(key))) fail('IMMUTABLE_FIELD');
      return insert(data, name, ['robots', 'workflowTemplates', 'announcements'].includes(name) && values.status === 'published' ? { ...values, status: 'draft' } : values);
    }
    const item = find(data, name, payload.id);
    scopeAccess(data, person, name, item);
    expected(item, context);
    if (command === 'record.delete') {
      if (referenceInUse(data, name, item.id)) fail('REFERENCE_IN_USE');
      collection(data, name).splice(collection(data, name).indexOf(item), 1);
      return { id: item.id, deleted: true };
    }
    if (command === 'record.duplicate') {
      const values = copy(item);
      for (const key of ['id', 'version', 'createdAt', 'updatedAt', 'testFingerprint', 'publishedFingerprint']) delete values[key];
      if (values.name) values.name += ' (copy)';
      if (values.title) values.title += ' (copy)';
      if (values.status === 'published') values.status = 'draft';
      return insert(data, name, values);
    }
    if (command === 'record.toggle') {
      item.enabled = !item.enabled;
      return touch(data, item);
    }
    if (command === 'record.pin') { item.pinned = !item.pinned; return touch(data, item); }
    if (command !== 'record.update') fail('UNKNOWN_COMMAND');
    if (Object.keys(values).some((key) => ['id', 'version', 'createdAt', 'updatedAt'].includes(key))) fail('IMMUTABLE_FIELD');
    if (values.status === 'published' && item.status !== 'published' && ['robots', 'workflowTemplates', 'announcements'].includes(name)) fail(name === 'robots' ? 'TEST_REQUIRED' : 'INVALID_STATE');
    const candidate = { ...item, ...values };
    if ((metadata[name].fields || []).length) for (const key of Object.keys(values)) if (!metadata[name].fields.some((field) => field.key === key)) fail('UNKNOWN_FIELD', key);
    validateFields(data, name, candidate, false);
    if (name === 'robots' && item.status === 'published' && item.versions?.length) {
      const last = item.versions.at(-1);
      if (!last.snapshot?.request) { const snapshot = copy(item); delete snapshot.versions; delete snapshot.testResult; last.snapshot = snapshot; }
    }
    if (name === 'staff' && values.availability !== undefined) staffAvailability(data, item, values.availability);
    Object.assign(item, values);
    for (const key of Object.keys(values)) if (Object.hasOwn(item, `${key}Key`)) delete item[`${key}Key`];
    if (name === 'robots') { item.testFingerprint = null; if (item.status === 'published') item.status = 'draft'; }
    return touch(data, item);
  }

  function formValues(fields, values, data) {
    if (!Array.isArray(fields)) fail('VALIDATION', 'form fields');
    if (!values || typeof values !== 'object' || Array.isArray(values)) fail('VALIDATION');
    for (const field of fields || []) fieldCheck(data, { ...field, key: field.key || field.name }, values[field.key || field.name]);
    return copy(values);
  }
  function feedbackRecord(data, payload, person, context) {
    const item = find(data, 'feedback', payload.id || payload.feedbackId);
    owned(person, item);
    scopeAccess(data, person, 'feedback', item);
    expected(item, context);
    return item;
  }
  function processorAssignment(data, id, allowed = ['agent', 'supervisor']) {
    if (typeof id !== 'string' || !id) fail('VALIDATION', 'assigneeId');
    const person = actor(data, id);
    permit(person, allowed);
    return person.id;
  }
  function createFeedback(data, payload, person) {
    permit(person, ['consumer', 'agent', 'supervisor']);
    const consumerId = roles(person).includes('consumer') ? person.id : payload.consumerId || 'consumer-01';
    reference(data, 'actors', consumerId);
    const gameId = payload.gameId || data.collections.games?.find((item) => item.enabled !== false)?.id || '';
    const game = data.collections.games?.find((item) => item.id === gameId);
    if (game && (game.enabled === false || game.switches?.feedbackEnabled === false)) fail('CONFIG_DISABLED');
    if (game?.languages?.length && !game.languages.includes(payload.language || 'zh_cn')) fail('CONFIG_DISABLED');
    if (game?.dailyTicketLimit > 0 && collection(data, 'feedback').filter((item) => item.consumerId === consumerId && item.gameId === gameId && item.createdAt?.slice(0, 10) === data.clock.slice(0, 10)).length >= game.dailyTicketLimit) fail('VALIDATION', 'dailyTicketLimit');
    const typeId = payload.typeId || data.collections.feedbackTypes?.find((item) => item.enabled !== false)?.id || '';
    if (game?.feedbackTypeIds?.length && !game.feedbackTypeIds.includes(typeId)) fail('CONFIG_DISABLED');
    const type = typeId ? find(data, 'feedbackTypes', typeId) : null;
    if (type && (type.enabled === false || type.status === 'disabled')) fail('INVALID_STATE');
    const fields = formValues(type?.formSchema?.fields || type?.formSchema || type?.fields || [], payload.fields || payload.formData || {}, data);
    reference(data, 'files', payload.fileIds || []);
    if (payload.relatedFeedbackId) find(data, 'feedback', payload.relatedFeedbackId);
    const rule = (data.collections.assignmentRules || []).filter((item) => item.enabled !== false && (!item.typeId || item.typeId === typeId) && (!item.gameId || item.gameId === gameId) && (!item.language || item.language === (payload.language || 'zh_cn'))).sort((a, b) => (b.priority || 0) - (a.priority || 0)).find((item) => item.assigneeId || item.assigneeIds?.length);
    const assigneeId = rule ? processorAssignment(data, rule.assigneeId || rule.assigneeIds[0]) : '';
    return insert(data, 'feedback', { title: requiredText(payload.title, 'title', 200), description: requiredText(payload.description || payload.content, 'description'), typeId, gameId, language: payload.language || 'zh_cn', consumerId, creatorId: person.id, assigneeId, status: rule ? 'processing' : 'pending', fields, formData: fields, fileIds: copy(payload.fileIds || []), relatedFeedbackId: payload.relatedFeedbackId || '', workflowTicketId: '', completionRequest: null, completionData: {}, evaluationId: '', unread: true, unreadCount: 1 });
  }
  function feedbackCommand(data, command, payload, person, context) {
    if (command === 'feedback.create') return createFeedback(data, payload, person);
    if (command === 'feedback.batch-reply') {
      permit(person, ['agent', 'supervisor']);
      if (!Array.isArray(payload.feedbackIds) || !payload.feedbackIds.length || payload.feedbackIds.length > 100) fail('VALIDATION');
      return payload.feedbackIds.map((id) => feedbackCommand(data, 'feedback.reply', { ...payload, id }, person, {}));
    }
    const item = feedbackRecord(data, payload, person, context);
    if (command === 'feedback.relate') {
      permit(person, ['agent', 'supervisor']);
      const related = find(data, 'feedback', payload.relatedFeedbackId);
      if (related.id === item.id || related.consumerId !== item.consumerId) fail('VALIDATION');
      item.relatedFeedbackId = related.id;
      return touch(data, item);
    }
    if (command === 'feedback.related') {
      if (!terminalFeedback.has(item.status)) fail('INVALID_STATE');
      return createFeedback(data, { ...payload, relatedFeedbackId: item.id }, person);
    }
    if (['feedback.submit-completion', 'card.submit'].includes(command)) {
      permit(person, ['consumer']);
      active(item, ['waiting_completion']);
      if (!item.completionRequest || item.completionRequest.status !== 'pending') fail('INVALID_STATE');
      item.completionData = formValues(item.completionRequest.fields, payload.values || payload.fields || payload.completionData || {}, data);
      item.completionRequest.status = 'submitted';
      item.status = 'processing';
      if (item.workflowTicketId) {
        const ticket = find(data, 'workflowTickets', item.workflowTicketId);
        ticket.completionData = copy(item.completionData);
        ticket.waitingForCompletion = false;
        touch(data, ticket);
      }
      const card = (data.collections.cards || []).find((entry) => entry.feedbackId === item.id && entry.status === 'pending');
      if (card) { card.status = 'submitted'; card.data = copy(item.completionData); touch(data, card); }
      return touch(data, item);
    }
    if (command === 'feedback.reply') {
      permit(person, ['consumer', 'agent', 'supervisor']);
      if (terminalFeedback.has(item.status)) fail('INVALID_STATE');
      if (!roles(person).includes('consumer')) requireAssignee(person, item);
      reference(data, 'files', payload.fileIds || []);
      const text = requiredText(payload.text || payload.content, 'text');
      const attachments = payload.attachments || [];
      if (!Array.isArray(attachments) || attachments.length + (payload.fileIds || []).length > 5) fail('INVALID_MEDIA');
      const files = attachments.map((attachment) => {
        validateMedia(attachment);
        if (!attachment.mime?.startsWith('image/') || Math.floor((attachment.data.split(',')[1]?.length || 0) * 3 / 4) > 2097152) fail('INVALID_MEDIA');
        return insert(data, 'files', { name: requiredText(attachment.name, 'name', 200), mime: attachment.mime, data: attachment.data, size: Math.floor(attachment.data.split(',')[1].length * 3 / 4), storageId: data.collections.storage?.find((entry) => entry.enabled !== false)?.id || '', ownerId: person.id, previewEnabled: true, auditStatus: 'pending', offline: true });
      });
      const message = insert(data, 'messages', { feedbackId: item.id, consumerId: item.consumerId, actorId: person.id, senderId: person.id, senderType: roles(person).includes('consumer') ? 'consumer' : 'agent', text, content: text, fileIds: [...(payload.fileIds || []), ...files.map((file) => file.id)], kind: 'feedback', offline: true });
      for (const file of files) if (data.collections.imageAudits) insert(data, 'imageAudits', { name: file.name, fileId: file.id, sourceType: 'feedback_reply', sourceId: message.id, status: 'pending', reason: '', history: [] });
      item.unread = roles(person).includes('consumer');
      touch(data, item);
      return message;
    }
    permit(person, ['agent', 'supervisor']);
    if (command === 'feedback.claim') {
      active(item, ['pending']);
      item.assigneeId = person.id;
      item.status = 'processing';
    } else if (['feedback.assign', 'feedback.transfer'].includes(command)) {
      active(item, ['pending', 'processing', 'waiting_completion']);
      if (command === 'feedback.transfer') requireAssignee(person, item);
      else permit(person, ['supervisor']);
      item.assigneeId = processorAssignment(data, payload.assigneeId);
      if (item.status === 'pending') item.status = 'processing';
    } else if (command === 'feedback.escalate') {
      active(item, ['processing']);
      requireAssignee(person, item);
      if (item.workflowTicketId) fail('ALREADY_LINKED');
      const ticket = createWorkflow(data, { ...payload, title: payload.title || item.title, description: payload.description || item.description, feedbackId: item.id, fields: payload.fields || item.fields || item.formData, consumerId: item.consumerId }, person);
      item.workflowTicketId = ticket.id;
      touch(data, item);
      return ticket;
    } else if (command === 'feedback.request-completion') {
      active(item, ['processing']);
      requireAssignee(person, item);
      requestCompletion(data, item, payload);
    } else if (command === 'feedback.complete') {
      active(item, ['processing']);
      requireAssignee(person, item);
      if (item.workflowTicketId && !['completed', 'closed'].includes(find(data, 'workflowTickets', item.workflowTicketId).status)) fail('WORKFLOW_ACTIVE');
      item.status = 'completed';
      item.completedAt = data.clock;
    } else if (command === 'feedback.invite') {
      active(item, ['completed']);
      requireAssignee(person, item);
      if (item.invitation || item.evaluationId) fail('ALREADY_EVALUATED');
      const config = (data.collections.evaluationConfigs || []).find((entry) => entry.enabled !== false);
      if (!config) fail('CONFIG_DISABLED');
      item.invitation = { invitedAt: data.clock, expiresAt: new Date(Date.parse(data.clock) + (config.deadlineHours || config.expiryHours || 72) * 3600000).toISOString(), invitedBy: person.id, configId: config.id };
      const pending = insert(data, 'evaluations', { feedbackId: item.id, consumerId: item.consumerId, assigneeId: item.assigneeId, score: null, resolved: null, tagIds: [], comment: '', status: 'pending', expiresAt: item.invitation.expiresAt, scale: 5, titleKey: config.titleKey || 'demo.evaluation.title', contentKey: config.contentKey || 'demo.evaluation.content' });
      item.evaluationId = pending.id;
    } else if (command === 'feedback.retract') {
      const message = find(data, 'messages', payload.messageId);
      if (message.feedbackId !== item.id || message.actorId !== person.id || Date.parse(data.clock) - Date.parse(message.createdAt) > 120000) fail('FORBIDDEN');
      message.text = '';
      message.content = '[retracted]';
      delete message.contentKey;
      message.retracted = true;
      touch(data, message);
      return message;
    } else fail('UNKNOWN_COMMAND');
    return touch(data, item);
  }
  function requireAssignee(person, item) {
    if (item.assigneeId !== person.id && !roles(person).some((role) => ['admin', 'supervisor', 'team-admin'].includes(role))) fail('FORBIDDEN');
  }
  function requestCompletion(data, feedback, payload) {
    const template = payload.cardTemplateId ? find(data, 'cardTemplates', payload.cardTemplateId) : null;
    const fields = payload.fields || template?.formSchema?.fields || template?.fields || [];
    if (!Array.isArray(fields) || !fields.length) fail('VALIDATION', 'completion fields');
    const request = { id: nextId(data, 'completion'), cardTemplateId: payload.cardTemplateId || '', status: 'pending', prompt: payload.prompt || '', fields: copy(fields), requestedAt: data.clock };
    feedback.completionRequest = request;
    feedback.status = 'waiting_completion';
    if (data.collections.cards) insert(data, 'cards', { feedbackId: feedback.id, consumerId: feedback.consumerId, requestId: request.id, cardTemplateId: payload.cardTemplateId || '', status: 'pending', fields: copy(fields) });
  }

  function evaluate(data, payload, person) {
    permit(person, ['consumer']);
    const pending = data.collections.evaluations.find((entry) => entry.id === payload.id);
    const item = find(data, 'feedback', payload.feedbackId || pending?.feedbackId || payload.id);
    owned(person, item);
    active(item, ['completed']);
    const existing = pending || data.collections.evaluations.find((entry) => entry.id === item.evaluationId);
    if (!item.invitation && !existing) fail('INVITATION_REQUIRED');
    if (existing?.status === 'submitted') fail('ALREADY_EVALUATED');
    if (existing?.status === 'expired' || Date.parse(data.clock) > Date.parse(existing?.expiresAt || item.invitation?.expiresAt)) fail('EVALUATION_EXPIRED');
    if (!Number.isInteger(payload.score) || payload.score < 1 || payload.score > 5) fail('VALIDATION', 'score');
    const values = { feedbackId: item.id, consumerId: person.id, assigneeId: item.assigneeId, score: payload.score, tags: copy(payload.tags || payload.tagIds || []), tagIds: copy(payload.tags || payload.tagIds || []), comment: payload.comment || '', status: 'submitted', resolved: payload.resolved ?? true, submittedAt: data.clock };
    const result = existing ? Object.assign(existing, values) : insert(data, 'evaluations', values);
    if (existing) touch(data, existing);
    item.evaluationId = result.id;
    item.status = 'completed';
    touch(data, item);
    return result;
  }

  function templateNodes(template, data) {
    const workflow = template.workflow || template.flow || {};
    const mapping = { START: 'start', END: 'end', AUDIT: 'approval', CONDITION_SPLIT: 'condition', PARALLEL_SPLIT: 'parallel', ROBOT: 'robot', CC: 'cc' };
    return copy(template.nodes || workflow.nodes || [{ id: 'process', type: 'approval', approverIds: ['processor-01'], mode: 'any' }]).map((node) => {
      const approverIds = node.approverIds || node.assigneeIds || (node.roleIds && data ? data.actors.filter((person) => roles(person).some((role) => node.roleIds.includes(role))).map((person) => person.id) : null);
      return { ...node, type: mapping[node.type] || node.type, ...(approverIds ? { approverIds } : {}) };
    });
  }
  function graphTargets(node) {
    if (!node) return [];
    if (node.type === 'parallel') return (node.branches || []).flat().map((entry) => typeof entry === 'string' ? entry : entry.id);
    if (node.type === 'condition' && !node.condition && !node.expression && !node.conditions) return (node.branches || []).map((entry) => entry.target).filter(Boolean);
    return node.next || [];
  }
  function pathSegments(path) {
    if (typeof path !== 'string' || path.length > 400) fail('VALIDATION', 'path');
    const segments = [];
    let index = path.startsWith('$') ? 1 : 0;
    while (index < path.length) {
      if (path[index] === '.') { index += 1; if (index === path.length) fail('VALIDATION', 'path'); }
      if (path[index] === '[') {
        const match = path.slice(index).match(/^\[\s*(\*|\d+|"(?:\\.|[^"\\])*")\s*\]/);
        if (!match) fail('VALIDATION', 'path');
        const token = match[1];
        let key;
        try { key = token.startsWith('"') ? JSON.parse(token) : token; } catch { fail('VALIDATION', 'path'); }
        segments.push({ key, wildcard: token === '*', index: /^\d+$/.test(token) });
        index += match[0].length;
      } else {
        const start = index;
        while (index < path.length && !['.', '['].includes(path[index])) index += 1;
        const key = path.slice(start, index);
        if (!key || /[\]\s();{}]/.test(key)) fail('VALIDATION', 'path');
        segments.push({ key, wildcard: false, index: /^\d+$/.test(key) });
      }
      const last = segments.at(-1);
      if (blockedKeys.has(last.key) || last.key.length > 200 || (last.index && Number(last.key) > 10000) || segments.length > 40) fail('VALIDATION', 'path');
      if (index < path.length && !['.', '['].includes(path[index])) fail('VALIDATION', 'path');
    }
    return segments;
  }
  function readPath(value, path) {
    if (path === '' || path === '$' || path === undefined) return value;
    const segments = pathSegments(path);
    function descend(current, index) {
      if (index === segments.length) return current;
      const token = segments[index];
      if (token.wildcard) return Array.isArray(current) ? current.map((item) => descend(item, index + 1)).filter((item) => item !== undefined) : undefined;
      if (!current || typeof current !== 'object' || !Object.hasOwn(current, token.key)) return undefined;
      return descend(current[token.key], index + 1);
    }
    return descend(value, 0);
  }
  function conditionPass(condition, values, depth = 0) {
    if (!condition) return true;
    if (depth > 15 || typeof condition !== 'object') fail('INVALID_CONDITION');
    const group = condition.type === 'group' ? condition.group : condition.groupType ? condition : null;
    if (group) {
      const mode = String(group.groupType || '').toLowerCase();
      if (!['and', 'or'].includes(mode) || !Array.isArray(group.elements) || !group.elements.length || group.elements.length > 100) fail('INVALID_CONDITION');
      const valuesByChild = group.elements.map((child) => conditionPass(child, values, depth + 1));
      return mode === 'and' ? valuesByChild.every(Boolean) : valuesByChild.some(Boolean);
    }
    if (condition.type === 'expression') return conditionPass(condition.expression, values, depth + 1);
    const field = condition.field || condition.key || condition.left;
    if (typeof field !== 'string') fail('INVALID_CONDITION');
    const left = readPath(values, field.replace(/^\$(form|input)\./, ''));
    const right = Object.hasOwn(condition, 'value') ? condition.value : condition.right;
    const aliases = { ne: 'neq', ge: 'gte', le: 'lte', not_in: 'not-in', not_contains: 'not-contains', is_empty: 'empty', not_empty: 'not-empty' };
    const rawOperator = String(condition.operator || condition.op || 'eq').toLowerCase();
    switch (aliases[rawOperator] || rawOperator) {
      case 'eq': return left === right;
      case 'neq': return left !== right;
      case 'gt': return left > right;
      case 'gte': return left >= right;
      case 'lt': return left < right;
      case 'lte': return left <= right;
      case 'in': return Array.isArray(right) && right.includes(left);
      case 'not-in': return Array.isArray(right) && !right.includes(left);
      case 'contains': return (typeof left === 'string' || Array.isArray(left)) && left.includes(right);
      case 'not-contains': return (typeof left === 'string' || Array.isArray(left)) && !left.includes(right);
      case 'empty': return left === null || left === undefined || left === '' || (Array.isArray(left) && !left.length);
      case 'not-empty': return left !== null && left !== undefined && left !== '' && (!Array.isArray(left) || left.length > 0);
      default: fail('INVALID_CONDITION');
    }
  }
  function workflowValues(ticket) { return { ...(ticket.fields || ticket.parameters || {}), form: ticket.fields || ticket.parameters || {}, node: ticket.nodeOutputs || {} }; }
  function runWorkflowRobot(data, ticket, node) {
    const robot = find(data, 'robots', node.robotId);
    const versionId = node.nodeConfig?.robotVersionId || node.robotVersion;
    const version = versionId ? (robot.versions || []).find((entry) => String(entry.versionId || entry.version) === String(versionId)) : robot.versions?.at(-1);
    if (robot.enabled === false || (robot.status !== 'published' && !version?.snapshot?.request)) { ticket.status = 'robot_failed'; return false; }
    const pinned = version?.snapshot?.request ? { ...robot, ...copy(version.snapshot), draft: null } : { ...robot, draft: null };
    const config = robotConfiguration(pinned);
    const fields = config.fields || config.inputs || [];
    const mappings = node.nodeConfig?.nodeParamConfig?.inputMappings || node.inputMappings;
    const input = {};
    if (Array.isArray(mappings)) {
      for (const mapping of mappings) {
        const field = fields.find((entry) => entry.id === mapping.robotInputFieldId);
        if (!field) fail('VALIDATION', 'robotInputFieldId');
        let value;
        if (mapping.sourceType === 'TEMPLATE_FIELD') value = readPath(ticket.fields || ticket.parameters || {}, String(mapping.sourceKey || '').replace(/^(form|template)\./, ''));
        else if (mapping.sourceType === 'UPSTREAM_NODE_OUTPUT') value = readPath({ node: ticket.nodeOutputs || {} }, mapping.sourceKey);
        else if (mapping.sourceType === 'FIXED') value = mapping.fixedValue;
        else fail('VALIDATION', 'sourceType');
        if (value !== undefined) input[field.key || field.name] = value;
      }
    } else {
      for (const field of fields) {
        const key = field.key || field.name;
        const source = mappings?.[key];
        const value = typeof source === 'string' && source.startsWith('$form.') ? readPath(ticket.fields || ticket.parameters || {}, source.slice(6)) : source !== undefined ? source : (ticket.fields || ticket.parameters || {})[key];
        if (value !== undefined) input[key] = value;
      }
    }
    try {
      const result = robotSimulation(data, pinned, { input });
      ticket.robotResult = { ...result, robotId: robot.id, version: versionId || version?.version || robot.publishedVersion || robot.version, result: result.success ? 'success' : 'failure' };
      if (!result.success) { ticket.status = 'robot_failed'; ticket.robotError = { robotId: robot.id, code: 'EXTERNAL_FAILURE', recoverable: true, offline: true }; return false; }
      const allowed = node.nodeConfig?.nodeParamConfig?.robotOutputParams;
      ticket.nodeOutputs ||= {};
      ticket.nodeOutputs[node.id] = Object.fromEntries(Object.entries(result.output).filter(([key]) => !allowed || allowed.some((field) => field.name === key && field.enabled !== false)));
      return true;
    } catch (error) { if (!error.code) throw error; ticket.status = 'robot_failed'; ticket.robotError = { robotId: robot.id, code: error.code, recoverable: true, offline: true }; return false; }
  }
  function advanceWorkflow(data, ticket) {
    if (ticket.graphMode) return advanceGraph(data, ticket);
    const nodes = ticket.flowNodes || [];
    let steps = 0;
    while (ticket.stageIndex < nodes.length) {
      if (++steps > 100) fail('INVALID_WORKFLOW');
      const node = nodes[ticket.stageIndex];
      if (node.type === 'condition') {
        const branch = (node.branches || []).find((entry) => conditionPass(entry.condition, workflowValues(ticket)));
        if (branch?.nodes) nodes.splice(ticket.stageIndex + 1, 0, ...copy(branch.nodes));
        else if (branch?.target) {
          const index = nodes.findIndex((entry) => entry.id === branch.target);
          if (index <= ticket.stageIndex) fail('INVALID_WORKFLOW');
          ticket.stageIndex = index;
          continue;
        }
        ticket.stageIndex += 1;
        continue;
      }
      if (['start', 'end', 'cc', 'copy'].includes(node.type)) { ticket.stageIndex += 1; continue; }
      if (node.type === 'robot') {
        if (!runWorkflowRobot(data, ticket, node)) return;
        ticket.stageIndex += 1;
        continue;
      }
      const groups = node.type === 'parallel' ? (node.branches || node.nodes || []).map((entry) => typeof entry === 'string' ? nodes.find((candidate) => candidate.id === entry) : entry) : [node];
      if (!groups.length || groups.some((entry) => !entry)) fail('INVALID_WORKFLOW');
      ticket.activeGroups = groups.map((entry) => ({ id: entry.id, mode: entry.mode || entry.approvalMode || 'any' }));
      for (const group of groups) {
        const assigned = group.approverIds || group.assigneeIds || [group.assigneeId || 'processor-01'];
        if (!Array.isArray(assigned) || !assigned.length) fail('INVALID_WORKFLOW');
        for (const assigneeId of assigned) {
          processorAssignment(data, assigneeId, ['processor', 'team-admin']);
          insert(data, 'workflowTasks', { ticketId: ticket.id, workflowTicketId: ticket.id, nodeId: group.id, round: ticket.round, assigneeId, actorId: assigneeId, status: 'pending', stageIndex: ticket.stageIndex });
        }
      }
      ticket.status = 'pending';
      autoClaim(data, ticket);
      return;
    }
    ticket.status = 'completed';
    ticket.completedAt = data.clock;
    ticket.activeGroups = [];
  }
  function advanceGraph(data, ticket) {
    let steps = 0;
    const nodes = ticket.flowNodes;
    ticket.completedNodes ||= [];
    ticket.pendingNodes ||= [nodes[0]?.id];
    ticket.waitingNodes ||= [];
    ticket.activatedNodes ||= [...new Set([...ticket.completedNodes, ...ticket.pendingNodes, ...collection(data, 'workflowTasks').filter((task) => (task.workflowTicketId || task.ticketId) === ticket.id && task.round === ticket.round).map((task) => task.nodeId)])];
    function reaches(from, target, visited = new Set()) {
      if (from === target) return true;
      if (visited.has(from)) return false;
      visited.add(from);
      const source = nodes.find((node) => node.id === from);
      return graphTargets(source).some((id) => reaches(id, target, visited));
    }
    function blocked(id) { return ticket.activatedNodes.some((other) => other !== id && !ticket.completedNodes.includes(other) && reaches(other, id)); }
    function enqueue(target) {
      if (!ticket.activatedNodes.includes(target)) ticket.activatedNodes.push(target);
      if (!ticket.completedNodes.includes(target) && !ticket.pendingNodes.includes(target)) ticket.pendingNodes.push(target);
    }
    for (const id of ticket.waitingNodes) if (!blocked(id)) enqueue(id);
    ticket.waitingNodes = ticket.waitingNodes.filter(blocked);
    while (ticket.pendingNodes.length) {
      if (++steps > 200) fail('INVALID_WORKFLOW');
      const id = ticket.pendingNodes.shift();
      if (ticket.completedNodes.includes(id)) continue;
      const node = nodes.find((entry) => entry.id === id);
      if (!node) fail('INVALID_WORKFLOW');
      if (!ticket.activatedNodes.includes(id)) ticket.activatedNodes.push(id);
      if (blocked(id)) { if (!ticket.waitingNodes.includes(id)) ticket.waitingNodes.push(id); continue; }
      ticket.currentNodeId = id;
      if (node.type === 'approval') {
        if (!collection(data, 'workflowTasks').some((task) => (task.ticketId || task.workflowTicketId) === ticket.id && task.nodeId === id && task.round === ticket.round && ['pending', 'claimed'].includes(task.status))) {
          for (const assigneeId of node.approverIds || ['processor-01']) {
            processorAssignment(data, assigneeId, ['processor', 'team-admin']);
            insert(data, 'workflowTasks', { ticketId: ticket.id, workflowTicketId: ticket.id, nodeId: id, round: ticket.round, assigneeId, actorId: assigneeId, status: 'pending', stageIndex: ticket.stageIndex, isRead: false });
          }
        }
        continue;
      }
      let next = graphTargets(node);
      if (node.type === 'condition') {
        if (node.condition || node.expression) {
          next = [next[conditionPass(node.condition || node.expression, workflowValues(ticket)) ? 0 : 1]].filter(Boolean);
        } else if (node.conditions) {
          const convert = { GE: 'gte', GT: 'gt', LE: 'lte', LT: 'lt', EQ: 'eq', NE: 'neq', IN: 'in' };
          const checks = node.conditions.map((entry) => conditionPass(entry.type || entry.groupType ? entry : { field: entry.left, operator: convert[entry.operator] || entry.operator, value: entry.right }, workflowValues(ticket)));
          const result = node.mode === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
          next = [next[result ? 0 : 1]].filter(Boolean);
        } else {
          const branch = (node.branches || []).find((entry) => conditionPass(entry.condition, workflowValues(ticket)));
          next = branch?.target ? [branch.target] : [];
        }
      }
      if (node.type === 'robot') {
        if (!runWorkflowRobot(data, ticket, node)) { ticket.pendingNodes.unshift(id); return; }
      }
      ticket.completedNodes.push(id);
      for (const target of next) enqueue(target);
      for (const waiting of ticket.waitingNodes) if (!blocked(waiting)) enqueue(waiting);
      ticket.waitingNodes = ticket.waitingNodes.filter(blocked);
    }
    const activeTasks = collection(data, 'workflowTasks').filter((task) => (task.ticketId || task.workflowTicketId) === ticket.id && task.round === ticket.round && ['pending', 'claimed'].includes(task.status));
    ticket.status = activeTasks.some((task) => task.status === 'claimed') ? 'processing' : activeTasks.length || ticket.waitingNodes.length ? 'pending' : 'completed';
    ticket.activeGroups = [...new Set(activeTasks.map((task) => task.nodeId))].map((id) => ({ id, mode: nodes.find((node) => node.id === id)?.mode || 'any' }));
    if (ticket.status === 'completed') { ticket.currentNodeId = null; ticket.completedAt = data.clock; }
    else autoClaim(data, ticket);
  }
  function autoClaim(data, ticket) {
    const team = data.collections.teams?.find((item) => item.id === ticket.teamId);
    if (!team?.autoClaim || team.enabled === false) return;
    const schedules = (data.collections.schedules || []).filter((item) => item.teamId === team.id && item.enabled !== false && item.autoClaim);
    for (const task of collection(data, 'workflowTasks').filter((item) => (item.ticketId || item.workflowTicketId) === ticket.id && item.round === ticket.round && item.status === 'pending')) {
      const id = task.assigneeId || task.actorId;
      const person = actor(data, id);
      if (!person.teamIds?.includes(team.id) || (data.collections.staff || []).some((entry) => entry.userId === id && (entry.enabled === false || entry.availability !== 'online'))) continue;
      const available = schedules.some((schedule) => (schedule.shifts || []).some((shift) => {
        if ((shift.userId || shift.assigneeId) !== id) return false;
        let parts;
        try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: shift.timezone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(data.clock)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); }
        catch { fail('VALIDATION', 'timezone'); }
        const date = `${parts.year}-${parts.month}-${parts.day}`;
        const time = `${parts.hour}:${parts.minute}`;
        return shift.date === date && time >= (shift.startTime || shift.start) && time < (shift.endTime || shift.end);
      }));
      if (available) { task.status = 'claimed'; task.autoClaimed = true; touch(data, task); ticket.status = 'processing'; ticket.assigneeId ||= id; }
    }
  }
  function createWorkflow(data, payload, person) {
    permit(person, ['consumer', 'agent', 'processor', 'supervisor', 'team-admin']);
    const templateId = payload.templateId || (data.collections.workflowTemplates || []).find((item) => item.status === 'published' && item.enabled !== false)?.id;
    if (!templateId) fail('TEMPLATE_REQUIRED');
    const template = find(data, 'workflowTemplates', templateId);
    if (template.status !== 'published' || template.enabled === false) fail('TEMPLATE_NOT_PUBLISHED');
    const fields = formValues(template.formSchema?.fields || template.formSchema || [], payload.fields || payload.parameters || {}, data);
    const flowNodes = templateNodes(template, data);
    const ticket = insert(data, 'workflowTickets', { title: requiredText(payload.title, 'title', 200), description: payload.description || payload.title, creatorId: person.id, consumerId: payload.consumerId || (roles(person).includes('consumer') ? person.id : ''), assigneeId: '', teamId: payload.teamId || template.teamIds?.[0] || '', feedbackId: payload.feedbackId || '', templateId, status: 'pending', round: 1, history: [], comments: [], fields, parameters: fields, urgent: payload.urgent || false, flowNodes, graphMode: flowNodes.some((node) => node.next), pendingNodes: [flowNodes[0]?.id], completedNodes: [], stageIndex: 0, activeGroups: [] });
    advanceWorkflow(data, ticket);
    return ticket;
  }
  function workflowCommand(data, command, payload, person, context) {
    if (command === 'workflow.create') return createWorkflow(data, payload, person);
    const ticket = find(data, 'workflowTickets', payload.id || payload.ticketId);
    scopeAccess(data, person, 'workflowTickets', ticket);
    expected(ticket, context);
    if (command === 'workflow.edit') {
      if (ticket.creatorId !== person.id) fail('FORBIDDEN');
      active(ticket, ['rejected']);
      if (ticket.feedbackId) fail('SOURCE_RESTRICTED');
      const template = find(data, 'workflowTemplates', ticket.templateId);
      const values = formValues(template.formSchema?.fields || template.formSchema || [], payload.parameters || payload.fields || ticket.parameters || ticket.fields, data);
      ticket.rejectedSnapshot ||= { round: ticket.round, title: ticket.title, ...(ticket.titleKey ? { titleKey: ticket.titleKey } : {}),
        description: ticket.description, fields: copy(ticket.fields || ticket.parameters || {}), status: ticket.status,
        completedAt: ticket.completedAt || data.clock, comments: copy(ticket.comments || []),
        flowNodes: copy(ticket.flowNodes || templateNodes(template, data)) };
      if (!ticket.history.some((entry) => entry.event === 'rejected-snapshot' && entry.round === ticket.round)) ticket.history.push({ event: 'rejected-snapshot', round: ticket.round, title: ticket.title, description: ticket.description, parameters: copy(ticket.parameters || ticket.fields || {}), at: data.clock });
      if (payload.title) { ticket.title = requiredText(payload.title, 'title', 200); delete ticket.titleKey; }
      if (payload.description) { ticket.description = requiredText(payload.description, 'description'); delete ticket.descriptionKey; }
      ticket.parameters = values;
      ticket.fields = copy(values);
      return touch(data, ticket);
    }
    if (command === 'workflow.resubmit') {
      if (ticket.creatorId !== person.id) fail('FORBIDDEN');
      active(ticket, ['rejected']);
      if (ticket.feedbackId) fail('SOURCE_RESTRICTED');
      ticket.history.push(ticket.rejectedSnapshot || { round: ticket.round, title: ticket.title, fields: copy(ticket.fields || ticket.parameters || {}), status: ticket.status, completedAt: ticket.completedAt || data.clock, comments: copy(ticket.comments || []), flowNodes: copy(ticket.flowNodes || templateNodes(find(data, 'workflowTemplates', ticket.templateId), data)) });
      delete ticket.rejectedSnapshot;
      if (payload.title) ticket.title = requiredText(payload.title, 'title', 200);
      const template = find(data, 'workflowTemplates', ticket.templateId);
      ticket.fields = formValues(template.formSchema?.fields || template.formSchema || [], payload.fields || payload.parameters || ticket.fields || ticket.parameters, data);
      ticket.parameters = copy(ticket.fields);
      ticket.round += 1;
      ticket.comments = [];
      ticket.stageIndex = 0;
      ticket.flowNodes = templateNodes(template, data);
      ticket.pendingNodes = [ticket.flowNodes[0]?.id];
      ticket.completedNodes = [];
      ticket.waitingNodes = [];
      ticket.activatedNodes = [];
      ticket.assigneeId = '';
      delete ticket.completedAt;
      advanceWorkflow(data, ticket);
      return touch(data, ticket);
    }
    permit(person, ['processor', 'team-admin', 'supervisor']);
    if (command === 'workflow.read') { owned(person, ticket); ticket.readBy = [...new Set([...(ticket.readBy || []), person.id])]; return touch(data, ticket); }
    if (command === 'workflow.comment') { ticket.comments.push({ id: nextId(data, 'comment'), actorId: person.id, text: requiredText(payload.text || payload.comment || payload.content, 'comment'), mentionIds: payload.mentionIds || [], replyTo: payload.replyTo || '', at: data.clock, round: ticket.round }); return touch(data, ticket); }
    if (['workflow.sync', 'workflow.sync-customer'].includes(command)) {
      if (!ticket.feedbackId) fail('NOT_LINKED');
      const feedback = find(data, 'feedback', ticket.feedbackId);
      feedback.workflowStatus = ticket.status;
      touch(data, feedback);
      ticket.syncResult = { offline: true, status: 'success', at: data.clock };
      return touch(data, ticket);
    }
    if (['workflow.urgent', 'workflow.expedite'].includes(command)) { if (terminalWorkflow.has(ticket.status)) fail('INVALID_STATE'); ticket.urgent = payload.urgent ?? true; return touch(data, ticket); }
    if (['workflow.recover', 'workflow.recover-robot'].includes(command)) {
      active(ticket, ['robot_failed']);
      if (!ticket.flowNodes) {
        ticket.flowNodes = templateNodes(find(data, 'workflowTemplates', ticket.templateId), data);
        ticket.graphMode = ticket.flowNodes.some((node) => node.next);
        ticket.fields = ticket.fields || ticket.parameters || {};
        ticket.stageIndex = Math.max(0, ticket.flowNodes.findIndex((node) => node.id === ticket.currentNodeId));
        ticket.pendingNodes = [ticket.currentNodeId || ticket.flowNodes[ticket.stageIndex]?.id];
        ticket.completedNodes = ticket.flowNodes.slice(0, ticket.stageIndex).map((node) => node.id);
        ticket.activeGroups = [];
      }
      for (const task of collection(data, 'workflowTasks').filter((entry) => (entry.ticketId || entry.workflowTicketId) === ticket.id && entry.nodeId === ticket.currentNodeId && ['pending', 'claimed'].includes(entry.status))) { task.status = 'processed'; task.decision = 'recovered'; touch(data, task); }
      delete ticket.robotError;
      advanceWorkflow(data, ticket);
      return touch(data, ticket);
    }
    if (command === 'workflow.approve' && (ticket.waitingForCompletion || (ticket.feedbackId && data.collections.feedback?.some((entry) => entry.id === ticket.feedbackId && entry.completionRequest?.status === 'pending')))) fail('INVALID_STATE', 'completion pending');
    if (command === 'workflow.request-info') {
      active(ticket, ['processing']);
      requireAssignee(person, ticket);
      if (!ticket.feedbackId) fail('NOT_LINKED');
      const feedback = find(data, 'feedback', ticket.feedbackId);
      requestCompletion(data, feedback, payload);
      touch(data, feedback);
      ticket.waitingForCompletion = true;
      return touch(data, ticket);
    }
    if (command === 'workflow.close') {
      permit(person, ['team-admin', 'supervisor']);
      if (terminalWorkflow.has(ticket.status)) fail('INVALID_STATE');
      ticket.status = 'closed';
      ticket.completedAt = data.clock;
      for (const task of collection(data, 'workflowTasks').filter((entry) => (entry.ticketId || entry.workflowTicketId) === ticket.id && ['pending', 'claimed'].includes(entry.status))) { task.status = 'ignored'; touch(data, task); }
      return touch(data, ticket);
    }
    active(ticket, ['pending', 'processing']);
    if (!ticket.flowNodes) {
      ticket.flowNodes = templateNodes(find(data, 'workflowTemplates', ticket.templateId), data);
      ticket.graphMode = ticket.flowNodes.some((node) => node.next);
      ticket.fields = ticket.fields || ticket.parameters || {};
      ticket.pendingNodes = [];
      ticket.completedNodes = [];
      ticket.activeGroups = [{ id: ticket.currentNodeId, mode: 'any' }];
    }
    const tasks = collection(data, 'workflowTasks').filter((entry) => (entry.ticketId || entry.workflowTicketId) === ticket.id && entry.round === ticket.round && ['pending', 'claimed'].includes(entry.status));
    const task = payload.taskId ? tasks.find((entry) => entry.id === payload.taskId) : tasks.find((entry) => (entry.assigneeId || entry.actorId) === person.id);
    if (['workflow.assign', 'workflow.transfer'].includes(command)) {
      if (command === 'workflow.assign') permit(person, ['team-admin', 'supervisor']);
      else requireAssignee(person, ticket);
      const target = task || tasks[0];
      if (!target) fail('NOT_FOUND');
      target.assigneeId = processorAssignment(data, payload.assigneeId, ['processor', 'team-admin']);
      target.actorId = target.assigneeId;
      target.status = 'pending';
      ticket.assigneeId = target.assigneeId;
      touch(data, target);
      return touch(data, ticket);
    }
    if (!task || ((task.assigneeId || task.actorId) !== person.id && !roles(person).includes('admin'))) fail('FORBIDDEN');
    if (command === 'workflow.claim') {
      if (task.status !== 'pending') fail('INVALID_STATE');
      task.status = 'claimed';
      ticket.assigneeId = person.id;
      ticket.status = 'processing';
    } else if (command === 'workflow.ignore') {
      if (task.status !== 'pending') fail('INVALID_STATE');
      task.status = 'ignored';
    } else if (['workflow.approve', 'workflow.reject'].includes(command)) {
      if (task.status !== 'claimed') fail('CLAIM_REQUIRED');
      task.status = 'processed';
      task.decision = command === 'workflow.approve' ? 'approved' : 'rejected';
      task.comment = payload.comment || payload.reason || '';
      if (command === 'workflow.reject') {
        ticket.status = 'rejected';
        ticket.completedAt = data.clock;
        for (const other of tasks.filter((entry) => entry.id !== task.id)) { other.status = 'ignored'; touch(data, other); }
      } else {
        const group = ticket.activeGroups.find((entry) => entry.id === task.nodeId);
        if (group?.mode !== 'all') for (const other of tasks.filter((entry) => entry.nodeId === task.nodeId && entry.id !== task.id)) { other.status = 'ignored'; touch(data, other); }
        const unfinished = collection(data, 'workflowTasks').some((entry) => (entry.ticketId || entry.workflowTicketId) === ticket.id && entry.round === ticket.round && (ticket.graphMode ? entry.nodeId === task.nodeId : entry.stageIndex === ticket.stageIndex) && ['pending', 'claimed'].includes(entry.status));
        if (!unfinished) {
          ticket.stageIndex = (ticket.stageIndex || 0) + 1;
          ticket.assigneeId = '';
          if (ticket.graphMode) {
            ticket.completedNodes.push(task.nodeId);
            ticket.pendingNodes.push(...graphTargets(ticket.flowNodes.find((node) => node.id === task.nodeId)));
          }
          advanceWorkflow(data, ticket);
        }
      }
    } else fail('UNKNOWN_COMMAND');
    touch(data, task);
    return touch(data, ticket);
  }

  function robotFingerprint(robot) {
    const content = copy(robot);
    for (const key of ['id', 'version', 'createdAt', 'updatedAt', 'status', 'testFingerprint', 'publishedFingerprint', 'publishedVersion', 'testResult', 'versions', 'publishedAt']) delete content[key];
    return signature(content);
  }
  function publish(data, name, payload, person, context) {
    configPermission(person, name);
    const item = find(data, name, payload.id);
    expected(item, context);
    if (name === 'robots') {
      const fingerprint = robotFingerprint(item);
      if (!item.testFingerprint || item.testFingerprint.fingerprint !== fingerprint || !item.testFingerprint.success) fail('TEST_REQUIRED');
      item.publishedFingerprint = fingerprint;
      item.publishedVersion = (item.publishedVersion || item.versions?.at(-1)?.version || 0) + 1;
      if (item.draft) {
        const effective = robotConfiguration(item);
        for (const key of ['fields', 'outputFields', 'request', 'response', 'requestSigning', 'auth', 'callPolicy', 'offlineResponse']) if (effective[key] !== undefined) item[key] = copy(effective[key]);
        item.inputs = copy(effective.fields || effective.inputs || []);
        item.outputs = copy(effective.outputFields || effective.outputs || []);
        item.draft = null;
      }
      const snapshot = copy(item);
      for (const key of ['versions', 'testResult', 'testFingerprint', 'publishedFingerprint']) delete snapshot[key];
      item.versions ||= [];
      item.versions.push({ version: item.publishedVersion, publishedAt: data.clock, snapshot });
    }
    if (name === 'workflowTemplates') {
      const nodes = templateNodes(item, data);
      if (!nodes.length || nodes.length > 100 || new Set(nodes.map((node) => node.id)).size !== nodes.length) fail('INVALID_WORKFLOW');
      const graphMode = nodes.some((node) => node.next);
      const targets = (node) => graphMode ? graphTargets(node) : node.next || [];
      for (const node of nodes) {
        if (!node.id || !['start', 'end', 'approval', 'approve', 'process', 'condition', 'parallel', 'robot', 'cc', 'copy'].includes(node.type)) fail('INVALID_WORKFLOW');
        if (node.type === 'robot') reference(data, 'robots', node.robotId);
        for (const id of node.approverIds || node.assigneeIds || []) processorAssignment(data, id, ['processor', 'team-admin']);
        for (const target of targets(node)) if (!nodes.some((entry) => entry.id === target)) fail('INVALID_WORKFLOW');
      }
      const visited = new Set();
      const visiting = new Set();
      function visit(id) {
        if (visiting.has(id)) fail('INVALID_WORKFLOW');
        if (visited.has(id)) return;
        visiting.add(id);
        const node = nodes.find((entry) => entry.id === id);
        for (const target of targets(node)) visit(target);
        visiting.delete(id);
        visited.add(id);
      }
      for (const node of nodes) visit(node.id);
    }
    item.status = 'published';
    item.enabled = true;
    item.publishedAt = data.clock;
    return touch(data, item);
  }
  function chat(data, payload, person) {
    permit(person, ['consumer', 'agent', 'supervisor']);
    const consumerId = roles(person).includes('consumer') ? person.id : payload.consumerId || 'consumer-01';
    const sessionId = payload.sessionId || payload.id;
    const session = sessionId ? find(data, 'sessions', sessionId) : insert(data, 'sessions', { consumerId, gameId: payload.gameId || data.collections.games?.[0]?.id || '', status: 'active', language: payload.language || 'zh_cn' });
    owned(person, session);
    if (session.status !== 'active') fail('INVALID_STATE');
    const text = requiredText(payload.text || payload.content, 'text', 2000);
    insert(data, 'messages', { sessionId: session.id, consumerId, actorId: person.id, senderId: person.id, senderType: 'consumer', kind: 'user', text, content: text, offline: true });
    const matches = (data.collections.knowledge || []).filter((entry) => entry.enabled !== false && entry.status !== 'draft' && entry.status !== 'disabled' && `${entry.title || entry.question || ''} ${entry.answer || entry.content || ''}`.toLowerCase().split(/\s+/).some((word) => word.length > 2 && text.toLowerCase().includes(word)));
    const answer = matches[0];
    const responseText = answer?.answer || answer?.content || 'This is an offline demonstration response. You can submit feedback for further assistance.';
    const response = insert(data, 'messages', { sessionId: session.id, consumerId, senderId: 'offline-ai', senderType: 'ai', kind: 'assistant', text: responseText, content: responseText, ...(answer ? (answer.contentKey ? { contentKey: answer.contentKey } : {}) : { textKey: 'demo.aiOfflineResponse', contentKey: 'demo.aiOfflineResponse' }), knowledgeIds: matches.slice(0, 3).map((entry) => entry.id), offline: true, source: answer ? 'published-knowledge' : 'offline-demo', status: 'success' });
    touch(data, session);
    return { sessionId: session.id, message: response, offline: true };
  }

  function typedParameters(schema, input, data) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('VALIDATION', 'input');
    const fields = Array.isArray(schema) ? schema : Object.entries(schema || {}).map(([key, value]) => ({ key, ...value }));
    if (fields.length > 1000 || fields.some((field) => !field || typeof field !== 'object' || typeof (field.key || field.name) !== 'string' || !(field.key || field.name) || blockedKeys.has(field.key || field.name))) fail('VALIDATION', 'fields');
    if (new Set(fields.map((field) => field.key || field.name)).size !== fields.length) fail('VALIDATION', 'duplicate fields');
    function check(field, value, depth = 0) {
      if (depth > 15) fail('VALIDATION');
      const type = String(field.type || 'STRING').toUpperCase();
      if (field.required && (value === undefined || value === null || value === '')) fail('VALIDATION', field.key);
      if (value === undefined || value === null || value === '') return;
      if (['STRING', 'TEXT'].includes(type) && typeof value !== 'string') fail('VALIDATION', field.key);
      if (['NUMBER', 'INTEGER', 'INT', 'FLOAT', 'DECIMAL'].includes(type) && (typeof value !== 'number' || !Number.isFinite(value) || (['INTEGER', 'INT'].includes(type) && !Number.isInteger(value)))) fail('VALIDATION', field.key);
      if (['BOOL', 'BOOLEAN'].includes(type) && typeof value !== 'boolean') fail('VALIDATION', field.key);
      if (type.startsWith('ARRAY')) {
        if (!Array.isArray(value) || value.length > 1000) fail('VALIDATION', field.key);
        const itemType = field.items?.type || field.itemType || type.match(/<([^>]+)>/)?.[1] || 'STRING';
        if ((field.minItems !== undefined && value.length < field.minItems) || (field.maxItems !== undefined && value.length > field.maxItems) || (field.uniqueItems && new Set(value.map(stable)).size !== value.length)) fail('VALIDATION', field.key);
        for (const item of value) check({ type: itemType, children: field.items?.children || field.children || [], required: false }, item, depth + 1);
      }
      if (['OBJECT', 'JSON'].includes(type)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) fail('VALIDATION', field.key);
        const children = field.children || field.fields || [];
        if ((field.minProperties !== undefined && Object.keys(value).length < field.minProperties) || (field.maxProperties !== undefined && Object.keys(value).length > field.maxProperties)) fail('VALIDATION', field.key);
        if (children.length && Object.keys(value).some((key) => !children.some((child) => (child.key || child.name) === key))) fail('UNKNOWN_FIELD');
        for (const child of children) check(child, value[child.key || child.name], depth + 1);
      }
      if (['FILE', 'IMAGE'].includes(type)) {
        if (typeof value !== 'string') fail('VALIDATION', field.key);
        if (value.startsWith('data:')) validateMedia({ data: value });
        else reference(data, 'files', value);
      }
      if (typeof value === 'string' && ((field.minLength !== undefined && value.length < field.minLength) || (field.maxLength !== undefined && value.length > field.maxLength))) fail('VALIDATION', field.key);
      if (typeof value === 'number' && ((field.minimum !== undefined && value < field.minimum) || (field.maximum !== undefined && value > field.maximum))) fail('VALIDATION', field.key);
      if (!['STRING', 'TEXT', 'NUMBER', 'INTEGER', 'INT', 'FLOAT', 'DECIMAL', 'BOOL', 'BOOLEAN', 'OBJECT', 'JSON', 'FILE', 'IMAGE'].includes(type) && !type.startsWith('ARRAY')) fail('VALIDATION', field.key);
    }
    for (const key of Object.keys(input)) if (!fields.some((field) => field.key === key || field.name === key)) fail('UNKNOWN_FIELD', key);
    for (const field of fields) check({ ...field, key: field.key || field.name }, input[field.key || field.name]);
    return copy(input);
  }
  function writePath(target, path, value) {
    const segments = pathSegments(path);
    if (!segments.length || segments.some((entry) => entry.wildcard)) fail('VALIDATION', 'mapping target');
    let current = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const key = segments[index].key;
      if (!Object.hasOwn(current, key)) current[key] = segments[index + 1].index ? [] : {};
      if (!current[key] || typeof current[key] !== 'object') fail('VALIDATION', 'mapping collision');
      current = current[key];
    }
    if (value !== undefined) current[segments.at(-1).key] = copy(value);
  }
  function robotConfiguration(item) { return { ...item, ...(item.config || {}), ...(item.draft || {}) }; }
  function robotSimulation(data, item, payload) {
    const config = robotConfiguration(item);
    const inputFields = config.fields || config.inputs || [];
    const outputFields = config.outputFields || config.outputs || [];
    if (!Array.isArray(inputFields) || !Array.isArray(outputFields)) fail('VALIDATION', 'robot fields');
    const policy = config.callPolicy || { timeoutSeconds: 10, retryCount: 0, retryIntervalSeconds: 0 };
    if (!Number.isInteger(policy.timeoutSeconds) || policy.timeoutSeconds < 0 || policy.timeoutSeconds > 180 || !Number.isInteger(policy.retryCount) || policy.retryCount < 0 || policy.retryCount > 5 || !Number.isInteger(policy.retryIntervalSeconds) || policy.retryIntervalSeconds < 0 || policy.retryIntervalSeconds > 300) fail('VALIDATION', 'callPolicy');
    const input = typedParameters(inputFields, payload.input || payload.fieldValues || {}, data);
    const indexed = new Map();
    function indexFields(fields, value) {
      for (const field of fields) {
        const key = field.key || field.name;
        if (field.id) indexed.set(field.id, value?.[key]);
        if (field.children && value?.[key]) indexFields(field.children, value[key]);
      }
    }
    indexFields(inputFields, input);
    const request = config.request || {};
    const method = String(request.method || 'POST').toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) fail('VALIDATION', 'method');
    let urlText = request.url || 'https://demo.invalid/offline';
    const sections = { PATH: {}, QUERY: {}, BODY: {} };
    const signatureMappings = [];
    let signing = null;
    function mapValue(mapping, section) {
      let value;
      if (mapping.sourceType === 'ROBOT_FIELD') { if (!indexed.has(mapping.fieldId)) fail('VALIDATION', 'fieldId'); value = indexed.get(mapping.fieldId); }
      else if (mapping.sourceType === 'FIXED') value = mapping.fixedValue;
      else if (mapping.sourceType === 'DYNAMIC_TIMESTAMP') {
        const format = String(mapping.timestampType || 'MILLISECONDS').toUpperCase();
        if (['SECONDS', 'UNIX_SECONDS', 'UNIX_SECOND', 'SECOND', 'UNIX_S'].includes(format)) value = Math.floor(Date.parse(data.clock) / 1000);
        else if (['MILLISECONDS', 'UNIX_MILLISECONDS', 'UNIX_MILLISECOND', 'MILLISECOND', 'UNIX_MS', 'TIMESTAMP'].includes(format)) value = Date.parse(data.clock);
        else if (['ISO', 'ISO8601', 'ISO_8601'].includes(format)) value = data.clock;
        else fail('VALIDATION', 'timestampType');
      } else if (mapping.sourceType === 'SIGNATURE') { if (section === 'PATH') fail('VALIDATION', 'signature section'); signatureMappings.push({ mapping, section }); return; }
      else fail('VALIDATION', 'sourceType');
      if (mapping.required && (value === undefined || value === null || value === '')) fail('VALIDATION', mapping.target);
      if (value === undefined) return;
      if (mapping.valueDefinition) typedParameters([{ ...mapping.valueDefinition, key: 'value' }], { value }, data);
      else if (mapping.valueType === 'ARRAY') { if (!Array.isArray(value)) fail('VALIDATION', mapping.target); }
      else if (mapping.valueType === 'OBJECT') { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('VALIDATION', mapping.target); }
      else if (mapping.valueType) typedParameters([{ key: 'value', type: mapping.valueType, required: mapping.required }], { value }, data);
      if (Object.hasOwn(sections[section], mapping.target)) fail('VALIDATION', 'duplicate mapping');
      writePath(sections[section], mapping.target, value);
    }
    for (const section of ['PATH', 'QUERY', 'BODY']) {
      const mappings = request[section.toLowerCase()] || [];
      if (!Array.isArray(mappings) || mappings.length > 100) fail('VALIDATION', 'mappings');
      for (const mapping of mappings) mapValue(mapping, section);
    }
    for (const [target, source] of Object.entries(request.mapping || {})) {
      const value = typeof source === 'string' && source.startsWith('$input.') ? readPath(input, source.slice(7)) : source;
      if (value === undefined) fail('VALIDATION', target);
      writePath(sections.BODY, target, value);
    }
    for (const { mapping, section } of signatureMappings) {
      if (signatureMappings.length > 1 || (section === 'BODY' && Object.keys(sections.QUERY).length) || (section === 'QUERY' && Object.keys(sections.BODY).length)) fail('VALIDATION', 'signature sections');
      const selector = config.requestSigning?.keySelector;
      const rule = selector && selector.section === section ? (selector.rules || []).find((entry) => conditionPass(entry.condition, sections[section])) : null;
      if (selector && !rule) fail('VALIDATION', 'signing rule');
      signing = { offline: true, ruleId: rule?.id || '', scheme: mapping.signatureScheme || 'demo' };
      writePath(sections[section], mapping.target, `OFFLINE_DEMO_SIGNATURE_${signature({ value: sections[section], scheme: mapping.signatureScheme || 'demo', ruleId: rule?.id || 'none' })}`);
    }
    for (const [key, value] of Object.entries(sections.PATH)) {
      if (!/^[\w-]+$/.test(key) || (value !== null && typeof value === 'object')) fail('VALIDATION', 'path mapping');
      urlText = urlText.split(`{${key}}`).join(encodeURIComponent(String(value))).split(`:${key}`).join(encodeURIComponent(String(value)));
    }
    if (/\{[^}]+\}/.test(urlText)) fail('VALIDATION', 'unresolved path');
    let parsed;
    try { parsed = new URL(urlText); } catch { fail('VALIDATION', 'url'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('VALIDATION', 'url');
    for (const [key, value] of Object.entries(sections.QUERY)) parsed.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    const headers = {};
    for (const header of request.headers || []) {
      if (!header || typeof header.name !== 'string' || !/^[\w-]+$/.test(header.name) || typeof header.value !== 'string') fail('VALIDATION', 'header');
      headers[header.name] = /authorization|cookie|secret|token|api-key|signature/i.test(header.name) ? 'OFFLINE_DEMO_REDACTED' : header.value;
    }
    function demoValue(field) {
      const type = String(field.type || 'STRING').toUpperCase();
      if (input[field.key || field.name] !== undefined) return input[field.key || field.name];
      if (['BOOLEAN', 'BOOL'].includes(type)) return true;
      if (['NUMBER', 'INTEGER', 'INT', 'FLOAT', 'DECIMAL'].includes(type)) return 128;
      if (type.startsWith('ARRAY')) return [];
      if (['OBJECT', 'JSON'].includes(type)) return Object.fromEntries((field.children || []).map((child) => [child.key || child.name, demoValue(child)]));
      return 'DEMO_RESULT';
    }
    let raw = payload.mockResponse || payload.responseFixture || config.offlineResponse;
    if (raw === undefined) {
      raw = {};
      for (const field of outputFields.filter((entry) => entry.enabled !== false)) writePath(raw, field.sourcePath || field.key || field.name, demoValue(field));
      if (config.response?.successPath) writePath(raw, config.response.successPath, config.response.expectedValue ?? true);
    }
    safe(raw);
    function project(fields, source, inherited = false) {
      const output = {};
      for (const field of fields.filter((entry) => entry.enabled !== false)) {
        const key = field.key || field.name;
        let value = readPath(source, inherited ? key : field.sourcePath || request.response?.[key] || key);
        if (value === undefined) { if (field.required) fail('VALIDATION', `output:${key}`); continue; }
        if (String(field.type).toUpperCase() === 'OBJECT' && field.children?.length) value = project(field.children, value, true);
        if (String(field.type).toUpperCase() === 'ARRAY' && field.items?.type === 'OBJECT' && field.items.children?.length) {
          if (!Array.isArray(value)) fail('VALIDATION', `output:${key}`);
          value = value.map((entry) => project(field.items.children, entry, true));
        }
        typedParameters([{ ...field, key }], { [key]: value }, data);
        output[key] = value;
      }
      return output;
    }
    const success = config.response?.successPath ? conditionPass({ field: config.response.successPath, operator: config.response.successOperator || 'EQ', value: config.response.expectedValue }, raw) : true;
    const output = project(outputFields, raw);
    return { offline: true, success, httpStatus: 200, elapsedMillis: 0, input, signing, callPolicy: copy(policy), attempts: success ? 1 : policy.retryCount + 1, requestSummary: { method, url: parsed.toString(), headers, query: sections.QUERY, body: sections.BODY }, rawResponse: JSON.stringify(raw), output: outputFields.length ? output : { result: success ? 'success' : 'failure', message: 'Offline demonstration response', messageKey: 'demo.robotOfflineResponse' }, outputValues: output, at: data.clock };
  }
  function schedules(data, payload, person) {
    configPermission(person, 'schedules');
    if (payload.shifts) {
      reference(data, 'teams', payload.teamId);
      if (!Array.isArray(payload.shifts) || !payload.shifts.length || payload.shifts.length > 1000 || !Number.isFinite(Date.parse(payload.startDate)) || !Number.isFinite(Date.parse(payload.endDate)) || payload.startDate > payload.endDate) fail('VALIDATION');
      const rows = payload.shifts.map((shift) => ({ ...shift, assigneeId: shift.userId || shift.assigneeId, start: shift.startTime || shift.start, end: shift.endTime || shift.end }));
      const scratch = copy(data);
      let retained = copy(data.collections.schedules);
      if (payload.replace) retained = retained.flatMap((entry) => {
        if (entry.teamId !== payload.teamId || entry.endDate < payload.startDate || entry.startDate > payload.endDate) return [entry];
        const shifts = (entry.shifts || []).filter((shift) => shift.date < payload.startDate || shift.date > payload.endDate);
        if (!shifts.length) return [];
        return [{ ...entry, shifts, startDate: shifts.map((shift) => shift.date).sort()[0], endDate: shifts.map((shift) => shift.date).sort().at(-1) }];
      });
      scratch.collections.schedules = retained.flatMap((entry) => entry.shifts ? entry.shifts.map((shift) => ({ assigneeId: shift.userId || shift.assigneeId, date: shift.date, start: shift.startTime || shift.start, end: shift.endTime || shift.end })) : [entry]);
      schedules(scratch, { rows }, person);
      for (const row of rows) if (row.date < payload.startDate || row.date > payload.endDate) fail('VALIDATION');
      if (payload.replace) data.collections.schedules = retained;
      return insert(data, 'schedules', { name: payload.name || 'Imported schedule', teamId: payload.teamId, startDate: payload.startDate, endDate: payload.endDate, enabled: true, autoClaim: false, view: 'week', shifts: copy(payload.shifts) });
    }
    if (!Array.isArray(payload.rows) || !payload.rows.length || payload.rows.length > 1000) fail('VALIDATION');
    const normalized = payload.rows.map((row) => {
      processorAssignment(data, row.assigneeId || row.userId, ['processor', 'team-admin', 'agent']);
      const date = row.date;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) fail('VALIDATION', 'date');
      if (!/^\d{2}:\d{2}$/.test(row.start || '') || !/^\d{2}:\d{2}$/.test(row.end || '') || row.start >= row.end || +row.end.slice(0, 2) > 23 || +row.start.slice(0, 2) > 23 || +row.start.slice(3) > 59 || +row.end.slice(3) > 59) fail('VALIDATION', 'time');
      return { ...row, assigneeId: row.assigneeId || row.userId, enabled: row.enabled !== false };
    });
    const seen = new Set();
    for (const row of normalized) {
      const key = `${row.assigneeId}:${row.date}:${row.start}:${row.end}`;
      if (seen.has(key)) fail('DUPLICATE_SCHEDULE');
      seen.add(key);
      const existing = payload.replace ? [] : collection(data, 'schedules');
      if ([...existing, ...normalized.filter((candidate) => candidate !== row)].some((candidate) => candidate.assigneeId === row.assigneeId && candidate.date === row.date && candidate.start < row.end && candidate.end > row.start)) fail('SCHEDULE_OVERLAP');
    }
    if (payload.replace) data.collections.schedules = [];
    return normalized.map((row) => insert(data, 'schedules', row));
  }
  function execute(data, command, payload, person, context) {
    authorize(data, person, command);
    const domains = { feedback: 'feedback', workflow: 'workflowTickets', file: 'files', audit: 'imageAudits', robot: 'robots', run: 'runs', chat: 'sessions' };
    const target = domains[command.split('.')[0]];
    if (target && (payload.id || payload.sessionId) && !['feedback.create', 'workflow.create', 'file.add', 'audit.backfill', 'chat.connect'].includes(command)) {
      const item = find(data, target, payload.sessionId || payload.id);
      scopeAccess(data, person, target, item);
    }
    if (command.startsWith('record.')) return generic(data, command, payload, person, context);
    if (['feedback.evaluate', 'evaluation.submit'].includes(command)) return evaluate(data, payload, person);
    if (command.startsWith('feedback.') || command === 'card.submit') return feedbackCommand(data, command, payload, person, context);
    if (command.startsWith('workflow.')) return workflowCommand(data, command, payload, person, context);
    if (command === 'chat.send') return chat(data, payload, person);
    if (command === 'chat.connect') {
      permit(person, ['consumer', 'agent', 'supervisor']);
      const gameId = payload.gameId || data.collections.games?.[0]?.id || '';
      reference(data, 'games', gameId);
      const game = data.collections.games?.find((item) => item.id === gameId);
      if (game?.enabled === false || game?.switches?.ai === false || game?.switches?.aiEnabled === false) fail('CONFIG_DISABLED');
      return insert(data, 'sessions', { consumerId: roles(person).includes('consumer') ? person.id : payload.consumerId || 'consumer-01', gameId, language: payload.language || 'zh_cn', device: payload.device || 'mobile', status: 'active', additionalInfo: payload.additionalInfo || {}, scenario: 'offline-demonstration', offline: true });
    }
    if (command === 'chat.retry') {
      const operation = payload.operationId ? data.operations.find((item) => item.id === payload.operationId) : data.operations.slice().reverse().find((item) => item.actorId === person.id && item.command === 'chat.send' && (item.payload.sessionId || item.payload.id) === (payload.sessionId || payload.id) && ['failure', 'pending'].includes(item.status));
      if (!operation || operation.actorId !== person.id) fail('NOT_FOUND');
      if (operation.status === 'pending') fail('OPERATION_PENDING');
      if (operation.status !== 'failure' || operation.command !== 'chat.send') fail('INVALID_STATE');
      const result = chat(data, operation.payload, person);
      operation.status = 'success';
      operation.result = copy(result);
      return result;
    }
    if (command === 'chat.evaluate') {
      permit(person, ['consumer']);
      const session = find(data, 'sessions', payload.sessionId || payload.id);
      owned(person, session);
      if (collection(data, 'chatEvaluations').some((entry) => entry.sessionId === session.id)) fail('ALREADY_EVALUATED');
      if (![1, 2, 3].includes(payload.score)) fail('VALIDATION', 'chat score is 1..3');
      return insert(data, 'chatEvaluations', { sessionId: session.id, consumerId: person.id, score: payload.score, comment: payload.comment || '' });
    }
    if (command === 'chat.reset') { const session = find(data, 'sessions', payload.sessionId || payload.id); owned(person, session); session.status = 'ended'; return touch(data, session); }
    if (command === 'schedule.import') return schedules(data, payload, person);
    if (command === 'robot.test') {
      configPermission(person, 'robots');
      const item = find(data, 'robots', payload.id);
      expected(item, context);
      item.testResult = robotSimulation(data, item, payload);
      item.testFingerprint = { fingerprint: robotFingerprint(item), success: item.testResult.success };
      touch(data, item);
      return item.testResult;
    }
    if (command === 'robot.publish') return publish(data, 'robots', payload, person, context);
    if (command === 'template.publish') return publish(data, payload.collection || 'workflowTemplates', payload, person, context);
    if (command === 'config.publish') return { ...publish(data, payload.collection, payload, person, context), offline: true };
    if (command === 'config.translate') {
      configPermission(person, payload.collection);
      const item = find(data, payload.collection, payload.id);
      const translations = payload.translations;
      item.translations ||= {};
      if (translations) {
        if (typeof translations !== 'object' || Array.isArray(translations)) fail('VALIDATION');
        for (const [language, content] of Object.entries(translations)) {
          if (!['zh_cn', 'zh_tw', 'en', 'ja', 'ko', 'fr', 'ru', 'th', 'vi', 'ms', 'id', 'ar', 'es', 'pt', 'it', 'de', 'tr'].includes(language) || !content || typeof content !== 'object') fail('VALIDATION');
          item.translations[language] = copy(content);
        }
      }
      item.translationResult = { offline: true, status: translations ? 'success' : 'requires-demo-content', languages: Object.keys(item.translations), at: data.clock };
      return touch(data, item);
    }
    if (command === 'robot.discard') { configPermission(person, 'robots'); const item = find(data, 'robots', payload.id); item.draft = null; item.testFingerprint = null; return touch(data, item); }
    if (command === 'robot.import') return generic(data, 'record.import', { collection: 'robots', records: payload.records }, person, context);
    if (command === 'robot.export') return generic(data, 'record.export', { collection: 'robots' }, person, context);
    if (command === 'file.add') {
      permit(person, ['consumer', 'agent', 'processor', 'supervisor', 'team-admin']);
      const item = { name: requiredText(payload.name, 'name', 200), mime: payload.mime || '', data: payload.data, ownerId: person.id, storageId: payload.storageId || data.collections.storage?.[0]?.id || '', size: Math.floor((payload.data?.split(',')[1]?.length || 0) * 3 / 4), status: 'ready', previewEnabled: true, offline: true };
      validateMedia(item);
      return insert(data, 'files', item);
    }
    if (command === 'file.delete') {
      const item = find(data, 'files', payload.id);
      if (item.ownerId !== person.id) permit(person, ['supervisor']);
      if (referenceInUse(data, 'files', item.id)) fail('REFERENCE_IN_USE');
      collection(data, 'files').splice(collection(data, 'files').indexOf(item), 1);
      return { id: item.id, deleted: true };
    }
    if (command === 'file.batch-delete') {
      permit(person, ['agent', 'supervisor']);
      if (!Array.isArray(payload.fileIds) || !payload.fileIds.length) fail('VALIDATION');
      return payload.fileIds.map((id) => execute(data, 'file.delete', { id }, person, {}));
    }
    if (command === 'file.toggle-preview') { permit(person, ['agent', 'supervisor']); const item = find(data, 'files', payload.id); item.previewEnabled = !item.previewEnabled; return touch(data, item); }
    if (command === 'menu.cascade-delete') {
      permit(person, ['admin']);
      find(data, 'menus', payload.id);
      const ids = new Set([payload.id]);
      let changed = true;
      while (changed) { changed = false; for (const item of collection(data, 'menus')) if (ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); changed = true; } }
      for (const item of collection(data, 'roles')) if ((item.menuIds || []).some((id) => ids.has(id))) fail('REFERENCE_IN_USE');
      data.collections.menus = collection(data, 'menus').filter((item) => !ids.has(item.id));
      return { deletedIds: [...ids] };
    }
    if (['task.create', 'task.update', 'task.delete'].includes(command)) {
      permit(person, ['processor', 'team-admin', 'supervisor']);
      const application = find(data, 'applications', payload.applicationId || payload.id);
      expected(application, context);
      application.tasks ||= [];
      if (command === 'task.delete') {
        const index = application.tasks.findIndex((task) => task.id === payload.taskId);
        if (index < 0) fail('NOT_FOUND');
        application.tasks.splice(index, 1);
        touch(data, application);
        return { id: payload.taskId, deleted: true };
      }
      const schedule = payload.schedule;
      if (!schedule || !['daily', 'weekly', 'monthly', 'once', 'interval'].includes(schedule.frequency)) fail('VALIDATION', 'schedule');
      if (schedule.frequency === 'once' && !Number.isFinite(Date.parse(schedule.at))) fail('VALIDATION');
      if (schedule.frequency === 'daily' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time || '')) fail('VALIDATION');
      if (['weekly', 'monthly'].includes(schedule.frequency)) {
        const days = schedule.days || schedule.weekdays || schedule.monthDays;
        const minimum = schedule.frequency === 'weekly' ? 0 : 1;
        const maximum = schedule.frequency === 'weekly' ? 6 : 31;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time || '') || !Array.isArray(days) || !days.length || new Set(days).size !== days.length || days.some((day) => !Number.isInteger(day) || day < minimum || day > maximum)) fail('VALIDATION');
      }
      if (schedule.frequency === 'interval' && (!Number.isInteger(schedule.minutes) || schedule.minutes < 1 || schedule.minutes > 525600)) fail('VALIDATION');
      const values = { name: requiredText(payload.name, 'name', 200), schedule: copy(schedule), inputs: copy(payload.inputs || {}), enabled: payload.enabled !== false };
      let task;
      if (command === 'task.create') { task = { ...values, id: nextId(data, 'task') }; application.tasks.push(task); }
      else { task = application.tasks.find((entry) => entry.id === payload.taskId); if (!task) fail('NOT_FOUND'); Object.assign(task, values); }
      touch(data, application);
      return task;
    }
    if (command.startsWith('audit.')) {
      permit(person, ['agent', 'supervisor']);
      if (command === 'audit.backfill') {
        const values = payload.values || payload.data || payload;
        validateFields(data, 'imageAudits', values, false);
        return insert(data, 'imageAudits', { ...values, history: [], status: values.status || 'pending' });
      }
      const audit = find(data, 'imageAudits', payload.id);
      expected(audit, context);
      if (command === 'audit.delete') { collection(data, 'imageAudits').splice(collection(data, 'imageAudits').indexOf(audit), 1); return { id: audit.id, deleted: true }; }
      active(audit, ['pending']);
      if (!['audit.approve', 'audit.reject'].includes(command)) fail('UNKNOWN_COMMAND');
      audit.status = command === 'audit.approve' ? 'approved' : 'rejected';
      audit.reason = command === 'audit.reject' ? requiredText(payload.reason, 'reason') : '';
      audit.history ||= [];
      audit.history.push({ status: audit.status, reason: audit.reason, actorId: person.id, at: data.clock });
      const file = find(data, 'files', audit.fileId);
      file.auditStatus = audit.status;
      touch(data, file);
      return touch(data, audit);
    }
    if (['role.authorize', 'role.revoke'].includes(command)) {
      permit(person, ['admin']);
      const role = find(data, 'roles', payload.id);
      const ids = payload.userIds || [];
      if (!Array.isArray(ids) || !ids.length) fail('VALIDATION');
      reference(data, 'users', ids);
      role.userIds = command === 'role.authorize' ? [...new Set([...(role.userIds || []), ...ids])] : (role.userIds || []).filter((id) => !ids.includes(id));
      for (const id of ids) {
        const user = find(data, 'users', id);
        user.roles = command === 'role.authorize' ? [...new Set([...(user.roles || []), role.code])] : (user.roles || []).filter((code) => code !== role.code);
        if (id === 'admin-01' && !user.roles.includes('admin')) fail('FORBIDDEN', 'Keep the demo administrator usable');
        touch(data, user);
      }
      return touch(data, role);
    }
    if (command === 'staff.batch-configure') {
      permit(person, ['supervisor']);
      const values = payload.values || payload.data || { ...(payload.availability ? { availability: payload.availability } : {}), ...(payload.groupId ? { groupId: payload.groupId } : {}) };
      if (!Array.isArray(payload.staffIds) || !payload.staffIds.length) fail('VALIDATION');
      return payload.staffIds.map((id) => {
        const item = find(data, 'staff', id);
        scopeAccess(data, person, 'staff', item);
        const candidate = { ...item, ...values };
        validateFields(data, 'staff', candidate, false);
        if (values.availability !== undefined) staffAvailability(data, item, values.availability);
        Object.assign(item, values);
        return touch(data, item);
      });
    }
    if (command === 'system.update-version') {
      permit(person, ['admin']);
      const item = payload.id ? find(data, 'systemSettings', payload.id) : collection(data, 'systemSettings')[0];
      if (!item) fail('NOT_FOUND');
      item.h5Version = payload.h5Version ? requiredText(payload.h5Version, 'h5Version', 80) : `${item.h5Version}-demo-update`;
      item.offlineOnly = true;
      item.lastUpdate = { offline: true, at: data.clock, status: 'success' };
      return touch(data, item);
    }
    if (['task.run', 'task.restart', 'run.restart', 'task.stop', 'run.stop'].includes(command)) {
      permit(person, ['processor', 'team-admin', 'supervisor']);
      if (command === 'task.run') {
        const application = find(data, 'applications', payload.applicationId || payload.id);
        if (application.enabled === false) fail('INVALID_STATE');
        return insert(data, 'runs', { applicationId: application.id, taskId: payload.taskId || '', name: application.name, status: 'succeeded', result: { offline: true, success: true }, creatorId: person.id, attempts: 1, startedAt: data.clock, finishedAt: data.clock, inputs: payload.inputs || {} });
      }
      const run = find(data, 'runs', payload.id);
      expected(run, context);
      if (command.endsWith('stop')) { if (run.status !== 'running') fail('INVALID_STATE'); run.status = 'stopped'; }
      else { if (!['failed', 'stopped', 'succeeded', 'completed'].includes(run.status)) fail('INVALID_STATE'); run.status = 'succeeded'; run.attempts = (run.attempts || 0) + 1; run.result = { offline: true, success: true }; run.finishedAt = data.clock; }
      return touch(data, run);
    }
    if (['knowledge.helpful', 'knowledge.unresolved'].includes(command)) { permit(person, ['consumer']); const item = find(data, 'knowledge', payload.id); if (item.enabled === false || item.status === 'draft') fail('INVALID_STATE'); const key = command.endsWith('helpful') ? 'helpfulCount' : 'unresolvedCount'; item[key] = (item[key] || 0) + 1; return touch(data, item); }
    if (command === 'stat.recalculate') {
      permit(person, ['supervisor']);
      const feedback = filtered(data, 'feedback', {}, person);
      const evaluations = filtered(data, 'evaluations', {}, person);
      const staff = data.collections.staff ? filtered(data, 'staff', {}, person) : [{ id: person.id, userId: person.id }];
      return staff.map((person) => {
        const items = feedback.filter((item) => item.assigneeId === person.userId);
        const scores = evaluations.filter((item) => item.assigneeId === person.userId && item.status === 'submitted');
        const date = payload.date || data.clock.slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) fail('VALIDATION');
        const dayStart = Date.parse(`${date}T00:00:00.000Z`);
        const dayEnd = Math.min(dayStart + 86400000, Date.parse(data.clock));
        const onlineMillis = (data.collections.staffStatus || []).filter((entry) => entry.staffId === person.id && entry.status === 'online').reduce((sum, entry) => sum + Math.max(0, Math.min(Date.parse(entry.endedAt || data.clock), dayEnd) - Math.max(Date.parse(entry.startedAt), dayStart)), 0);
        const values = { staffId: person.id, date, total: items.length, completed: items.filter((item) => terminalFeedback.has(item.status)).length, completedCount: items.filter((item) => terminalFeedback.has(item.status)).length, replyCount: collection(data, 'messages').filter((item) => item.senderId === person.userId && item.feedbackId && item.createdAt?.slice(0, 10) === date).length, active: items.filter((item) => !terminalFeedback.has(item.status)).length, averageScore: scores.length ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length : 0, onlineMinutes: Math.floor(onlineMillis / 60000), calculatedAt: data.clock, offline: true };
        const existing = collection(data, 'staffSnapshots').find((entry) => entry.staffId === person.id && entry.date === date);
        if (!existing) return insert(data, 'staffSnapshots', values);
        Object.assign(existing, values);
        return touch(data, existing);
      });
    }
    if (command === 'alert.trigger') {
      permit(person, ['supervisor']);
      const item = find(data, 'alertRules', payload.id);
      if (item.enabled === false) fail('CONFIG_DISABLED');
      const windowStart = Date.parse(data.clock) - (item.windowMinutes || 1440) * 60000;
      const matches = (entry) => (!item.gameIds?.length || item.gameIds.includes(entry.gameId)) && (!item.typeIds?.length || item.typeIds.includes(entry.typeId));
      let value;
      if (item.metric === 'workflowFailures') value = collection(data, 'workflowTickets').filter((entry) => entry.status === 'robot_failed' && matches(entry)).length;
      else if (item.metric === 'replyDelay') value = collection(data, 'feedback').filter((entry) => !terminalFeedback.has(entry.status) && Date.parse(entry.updatedAt || entry.createdAt) < windowStart && matches(entry)).length;
      else value = collection(data, 'feedback').filter((entry) => entry.status === 'pending' && matches(entry)).length;
      const cooldown = item.lastResult?.triggered && Date.parse(data.clock) - Date.parse(item.lastResult.at) < (item.cooldownMinutes || 0) * 60000;
      item.lastResult = { offline: true, triggered: !cooldown && (item.comparison === 'GT' ? value > item.threshold : value >= item.threshold), cooldown: !!cooldown, value, at: data.clock };
      return touch(data, item);
    }
    fail('UNKNOWN_COMMAND', command);
  }

  function dispatch(command, payload = {}, context = {}) {
    safe(payload);
    safe(context);
    if (typeof command !== 'string' || command.length > 100) fail('UNKNOWN_COMMAND');
    const person = actor(state, context.actorId || 'consumer-01');
    authorize(state, person, command);
    if (command === 'record.view') { const item = find(state, payload.collection, payload.id); scopeAccess(state, person, payload.collection, item); return copy(item); }
    if (command === 'query.refresh') return { records: copy(filtered(state, payload.collection, {}, person)), revision: state.revision };
    if (command === 'config.describe') { configPermission(person, payload.collection); return { record: copy(find(state, payload.collection, payload.id)), fields: copy(metadata[payload.collection].fields || []), offline: true }; }
    if (['consumer.history', 'consumer.translate'].includes(command)) {
      permit(person, ['agent', 'supervisor']);
      const consumerId = payload.id || payload.consumerId;
      scopeAccess(state, person, 'consumers', find(state, 'consumers', consumerId));
      const feedback = filtered(state, 'feedback', { consumerId }, person);
      const sessions = filtered(state, 'sessions', { consumerId }, person);
      const messages = filtered(state, 'messages', {}, person).filter((item) => item.consumerId === consumerId || sessions.some((session) => session.id === item.sessionId) || feedback.some((entry) => entry.id === item.feedbackId));
      return { consumerId, messages: copy(messages), feedback: copy(feedback), offline: true, ...(command === 'consumer.translate' ? { translationStatus: 'offline-demonstration', targetLanguage: payload.language || 'en' } : {}) };
    }
    if (command === 'file.download') { const file = find(state, 'files', payload.id); scopeAccess(state, person, 'files', file); return { name: file.name, mime: file.mime, data: file.data }; }
    const requestId = context.requestId;
    if (requestId !== undefined && (typeof requestId !== 'string' || !requestId || requestId.length > 200)) fail('VALIDATION', 'requestId');
    const fingerprint = stable({ command, payload, actorId: person.id, scenario: context.scenario || 'success' });
    const previous = requestId && state.operations.find((entry) => entry.requestId === requestId && entry.actorId === person.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('IDEMPOTENCY_CONFLICT');
      if (previous.status === 'failure') fail(previous.result?.code || 'EXTERNAL_FAILURE');
      return copy(previous.result || { id: previous.id, status: previous.status, offline: true });
    }
    const data = copy(state);
    tick(data);
    if (command === 'operation.resolve') {
      const operation = data.operations.find((entry) => entry.id === payload.operationId);
      if (!operation) fail('NOT_FOUND');
      if (operation.actorId !== person.id) permit(person, ['admin']);
      if (operation.status !== 'pending') fail('INVALID_STATE');
      if (!['success', 'failure'].includes(payload.outcome)) fail('VALIDATION');
      let result;
      if (payload.outcome === 'success') result = execute(data, operation.command, operation.payload, actor(data, operation.actorId), operation.context || {});
      else result = { offline: true, status: 'failure', code: 'EXTERNAL_FAILURE' };
      operation.status = payload.outcome;
      operation.result = copy(result);
      data.revision += 1;
      data.timeline.push({ id: nextId(data, 'event'), command, actorId: person.id, at: data.clock, revision: data.revision, targetId: operation.id });
      validateData(data);
      state = data;
      return copy(result);
    }
    if (externalCommands.has(command) && data.operations.some((entry) => entry.status === 'pending' && entry.actorId === person.id && entry.command === command && stable(entry.payload) === stable(payload))) fail('OPERATION_PENDING');
    if (externalCommands.has(command) && context.scenario === 'failure') {
      execute(copy(data), command, payload, person, context);
      const operation = { id: nextId(data, 'operation'), command, payload: copy(payload), actorId: person.id, context: { actorId: person.id, ...(context.expectedVersion === undefined ? {} : { expectedVersion: context.expectedVersion }) }, status: 'failure', requestId: requestId || '', fingerprint, createdAt: data.clock, result: { status: 'failure', code: 'EXTERNAL_FAILURE', offline: true } };
      data.operations.push(operation);
      data.revision += 1;
      data.timeline.push({ id: nextId(data, 'event'), command, actorId: person.id, at: data.clock, revision: data.revision, targetId: operation.id, outcome: 'failure', offline: true });
      validateData(data);
      state = data;
      fail('EXTERNAL_FAILURE', 'Offline demonstration failure');
    }
    if (context.scenario && !['success', 'failure', 'unknown'].includes(context.scenario)) fail('VALIDATION', 'scenario');
    if (externalCommands.has(command) && context.scenario === 'unknown') {
      // Dry-run first: a pending outcome must not bypass validation or permissions.
      execute(copy(data), command, payload, person, context);
      const operation = { id: nextId(data, 'operation'), command, payload: copy(payload), actorId: person.id, context: { actorId: person.id, ...(context.expectedVersion === undefined ? {} : { expectedVersion: context.expectedVersion }) }, status: 'pending', requestId: requestId || '', fingerprint, createdAt: data.clock };
      operation.result = { id: operation.id, status: 'pending', offline: true };
      data.operations.push(operation);
      data.revision += 1;
      data.timeline.push({ id: nextId(data, 'event'), command, actorId: person.id, at: data.clock, revision: data.revision, targetId: operation.id, outcome: 'pending' });
      validateData(data);
      state = data;
      return copy(operation.result);
    }
    const result = execute(data, command, payload, person, context);
    data.revision += 1;
    data.timeline.push({ id: nextId(data, 'event'), command, actorId: person.id, at: data.clock, revision: data.revision, targetId: result?.id || payload.id || '', offline: true });
    if (requestId) data.operations.push({ id: nextId(data, 'operation'), command, actorId: person.id, requestId, fingerprint, payload: copy(payload), status: 'success', result: copy(result), createdAt: data.clock });
    validateData(data);
    state = data;
    return copy(result);
  }

  return {
    snapshot() { return copy(state); },
    list(name, filter = {}) {
      safe(filter);
      return copy(collection(state, name).filter((item) => Object.entries(filter).every(([key, value]) => {
        if (key === 'search') return stable(item).toLowerCase().includes(String(value).toLowerCase());
        if (Array.isArray(value)) return value.includes(item[key]);
        return item[key] === value;
      })));
    },
    record(name, id) { return copy(find(state, name, id)); },
    visibleList(name, filter = {}, context = {}) {
      safe(filter);
      try { return copy(filtered(state, name, filter, actor(state, context.actorId || 'consumer-01'))); }
      catch (error) { if (error.code === 'FORBIDDEN') return []; throw error; }
    },
    visibleRecord(name, id, context = {}) { const person = actor(state, context.actorId || 'consumer-01'); const item = find(state, name, id); scopeAccess(state, person, name, item); return copy(item); },
    referenceOptions(name, context = {}) {
      safe(context);
      const person = actor(state, context.actorId || 'consumer-01');
      const command = context.command || '';
      let candidates = filtered(state, name, {}, person);
      if (['feedback.escalate', 'workflow.create'].includes(command) && ['teams', 'workflowTemplates'].includes(name)) {
        permit(person, command === 'feedback.escalate' ? ['agent', 'supervisor'] : ['processor', 'team-admin']);
        const feedback = context.id && command === 'feedback.escalate' ? find(state, 'feedback', context.id) : null;
        if (feedback) scopeAccess(state, person, 'feedback', feedback);
        const game = feedback && state.collections.games?.find((item) => item.id === feedback.gameId);
        const templates = (state.collections.workflowTemplates || []).filter((item) => item.status === 'published' && item.enabled !== false && (!context.templateId || item.id === context.templateId) && (!game?.workflowTemplateIds?.length || game.workflowTemplateIds.includes(item.id)));
        const teams = new Set(templates.flatMap((item) => item.teamIds || []));
        candidates = name === 'workflowTemplates' ? templates : collection(state, 'teams').filter((item) => teams.has(item.id) && item.enabled !== false && (!game?.teamIds?.length || game.teamIds.includes(item.id)));
      }
      if (name === 'users' && ['feedback.assign', 'feedback.transfer', 'workflow.assign', 'workflow.transfer'].includes(command)) {
        const target = command.startsWith('feedback.') ? 'feedback' : 'workflowTickets';
        const item = context.id ? find(state, target, context.id) : null;
        if (item) scopeAccess(state, person, target, item);
        permit(person, command.startsWith('feedback.') ? ['agent', 'supervisor'] : ['processor', 'team-admin']);
        const desired = command.startsWith('feedback.') ? ['agent', 'supervisor', 'admin'] : ['processor', 'team-admin', 'admin'];
        candidates = collection(state, 'users').filter((user) => user.enabled !== false && user.roles?.some((role) => desired.includes(role)) && (!item?.teamId || user.teamIds?.includes(item.teamId)));
      }
      return copy(candidates.map((item) => ({ id: item.id, name: item.name || item.title || item.id, ...(item.nameKey || item.titleKey ? { nameKey: item.nameKey || item.titleKey } : {}) })));
    },
    can(command, payload = {}, context = {}) {
      const previous = state;
      try { dispatch(command, payload, context); return { allowed: true }; }
      catch (error) { return { allowed: false, code: error.code || 'VALIDATION' }; }
      finally { state = previous; }
    },
    dispatch,
    exportData() { return copy(state); },
    importData(value) { const incoming = copy(safe(value)); validateData(incoming); state = incoming; return { revision: state.revision, imported: true }; },
    reset() { state = copy(initial); return copy(state); }
  };
}
