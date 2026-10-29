import {
  ACTOR_STAFF_ID, FIXTURE_NOW, STATUS_OPTIONS, GAME_GROUPS, GAMES,
  TEAMS, WORK_ORDER_TYPES, LANGUAGES, FAST_REPLIES, SYNTHETIC_IMAGE,
  createFixtureState, createAuditFixtureTask,
} from '../fixtures.mjs';

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const fail = (code) => { throw new Error(code); };
const initialReplySequences = histories => new Map(Object.entries(histories).map(([key, rows]) => [key, rows.length]));
const listeners = new Set();
let state = createFixtureState();
let replySequences = initialReplySequences(state.histories);
let permissions = ['*:*:*'];
let actorStatus = 1;
let isAdmin = true;
let revision = 0;
let generation = 0;
let navigation = null;
const endpointModes = new Map();
const nextFailures = new Set();
const delays = new Map();
const pending = new Map();
const requests = [];

function emitChange() {
  revision += 1;
  for (const listener of listeners) listener();
}

export function getMockUserInfo() {
  return {
    permissions: [...permissions],
    user: { isStaff: true, admin: isAdmin, staffId: ACTOR_STAFF_ID, userId: ACTOR_STAFF_ID, nickName: '演示客服甲', customerName: '演示客服甲' },
  };
}

export function recordMockNavigation(target) {
  const route = typeof target === 'string' ? target : target?.url ?? target?.path;
  if (route !== '/workOrder/imageAudit') fail('MOCK_ROUTE_UNSUPPORTED');
  const search = String(target?.search ?? '');
  if (search && (!search.startsWith('?') || /[\r\n]/u.test(search))) fail('MOCK_ROUTE_UNSUPPORTED');
  navigation = { path: route, title: typeof target?.title === 'string' ? target.title : '图片审核（演示）', search };
  emitChange();
}

function requirePermission(permission) {
  if (!permissions.includes('*:*:*') && !permissions.includes(permission)) fail('MOCK_FORBIDDEN');
}
function requireActorOnline() {
  if (actorStatus === 3) fail('MOCK_ACTOR_SUSPENDED');
}
function requireAdmin() { if (!isAdmin) fail('MOCK_FORBIDDEN'); }
function findRecord(id) {
  return state.records.find((item) => item.id === String(id)) ?? fail('MOCK_RECORD_NOT_FOUND');
}
function normalizedText(value) { return String(value ?? '').trim(); }
function present(value) { return value !== undefined && value !== null && value !== ''; }
function asArray(value) { return Array.isArray(value) ? value.map(String) : present(value) ? [String(value)] : []; }
function paginate(rows, params = {}) {
  const page = Math.max(1, Math.trunc(Number(params.pageNum) || 1));
  const size = Math.min(1000, Math.max(1, Math.trunc(Number(params.pageSize) || 10)));
  return { rows: rows.slice((page - 1) * size, page * size), total: rows.length };
}

export function queryMockWorkOrders(params = {}) {
  let rows = state.records.filter((row) => {
    if (present(params.workOrderId) && row.id !== normalizedText(params.workOrderId)) return false;
    for (const key of ['playerId', 'roleId', 'roleDid', 'thirdPartyTicketId']) {
      if (present(params[key]) && !String(row[key] ?? '').includes(normalizedText(params[key]))) return false;
    }
    if (present(params.workOrderTeamId) && String(row.workOrderTeamId) !== String(params.workOrderTeamId)) return false;
    if (present(params.workOrderTypeId) && Number(row.workOrderTypeId) !== Number(params.workOrderTypeId)) return false;
    if (present(params.workOrderStatus) && row.status !== String(params.workOrderStatus)) return false;
    if (asArray(params.gameGroupIds).length && !asArray(params.gameGroupIds).includes(String(row.gameGroupId))) return false;
    if (asArray(params.gameIds).length && !asArray(params.gameIds).includes(String(row.gameId))) return false;
    if (present(params.vipLevelStart) && Number.isFinite(Number(params.vipLevelStart)) && row.vipLevel < Number(params.vipLevelStart)) return false;
    if (present(params.vipLevelEnd) && Number.isFinite(Number(params.vipLevelEnd)) && row.vipLevel > Number(params.vipLevelEnd)) return false;
    if (typeof params.isClaim === 'boolean' && Boolean(row.currentHandler) !== params.isClaim) return false;
    if ([0, 1, '0', '1'].includes(params.isAnonymous) && row.isAnonymous !== Number(params.isAnonymous)) return false;
    const keyword = normalizedText(params.keyword).toLowerCase();
    if (keyword && ![row.title, row.summary, row.playerName, row.id].some((text) => String(text ?? '').toLowerCase().includes(keyword))) return false;
    // Source table labels this range “认领时间”. Null claim times do not match.
    if (present(params.startTime) && present(params.endTime)) {
      if (!row.claimTime || row.claimTime < String(params.startTime) || row.claimTime > String(params.endTime)) return false;
    }
    if (params.viewType === 'MY' && row.handlerId !== ACTOR_STAFF_ID) return false;
    const isDone = ['已完成', '已关闭'].includes(row.status);
    if (params.workOrderType === 'pending' && isDone) return false;
    if (params.workOrderType === 'done' && !isDone) return false;
    return true;
  });
  if (['asc', 'desc'].includes(params.vipLevelSort)) {
    rows = [...rows].sort((a, b) => params.vipLevelSort === 'asc' ? a.vipLevel - b.vipLevel : b.vipLevel - a.vipLevel);
  }
  return paginate(rows, params);
}

function addReply(row, data) {
  const historyKey = `${row.id}:HUMAN`;
  const history = state.histories[historyKey];
  // A recall removes rows but must never rewind the identity sequence.
  const sequence = replySequences.get(historyKey) + 1;
  replySequences.set(historyKey, sequence);
  history.push({
    replayId: `${row.id}-HUMAN-local-${sequence}`, messageRole: data.replyerType === 'USER' ? 'USER' : 'ADMIN',
    messageTime: FIXTURE_NOW, originalContent: data.attachmentUrl || normalizedText(data.content),
    targetContent: data.attachmentUrl || normalizedText(data.content), messageType: data.messageType || 'TEXT',
    nickName: data.replyerType === 'USER' ? row.playerName : '演示客服甲', sourceLanguage: 'zh_cn', sensitiveImage: false,
  });
  row.updateTime = FIXTURE_NOW;
  row.unreplied = false;
}
function assignRecord(row, staff) {
  row.handlerId = staff.staffId;
  row.currentHandler = staff.customerName;
  row.canClaim = false;
  row.claimTime = FIXTURE_NOW;
  row.updateTime = FIXTURE_NOW;
  if (row.status === '4') row.status = '待处理';
}
function getHistory(data) {
  findRecord(data.workOrderId);
  const kind = data.recordType === 'AI' ? 'AI' : 'HUMAN';
  const rows = state.histories[`${data.workOrderId}:${kind}`];
  const page = Math.max(1, Math.trunc(Number(data.pageNum) || 1));
  const size = Math.min(1000, Math.max(1, Math.trunc(Number(data.pageSize) || 20)));
  const end = Math.max(0, rows.length - (page - 1) * size);
  return { rows: rows.slice(Math.max(0, end - size), end), total: rows.length };
}

function findAuditTask(id) {
  return state.auditTasks.find((item) => item.id === Number(id)) ?? fail('MOCK_AUDIT_TASK_NOT_FOUND');
}
function appendAuditLog(task, action, remark, before) {
  state.auditLogSerial += 1;
  (state.auditLogs[task.id] ??= []).push({
    id: 1200000 + state.auditLogSerial, taskId: task.id, chatImgId: task.chatImgId, chatImgDubiousId: task.chatImgDubiousId,
    action, operatorId: ACTOR_STAFF_ID, operatorType: isAdmin ? 'ADMIN' : 'STAFF', remark: String(remark ?? ''),
    beforeSnapshot: before ? JSON.stringify(before) : undefined, afterSnapshot: JSON.stringify(task), createTime: FIXTURE_NOW,
  });
}
function addAuditTask(record, kind) {
  const task = createAuditFixtureTask(record, state.auditSerial, kind);
  state.auditSerial += 1;
  state.auditTasks.push(task);
  state.auditImages[task.chatImgId] = SYNTHETIC_IMAGE;
  state.auditImages[task.chatImgDubiousId] = SYNTHETIC_IMAGE;
  appendAuditLog(task, 'BACKFILL', '为合成反馈补录历史图片任务');
  return task;
}
function listAuditTasks(data) {
  const staff = state.staff.find((item) => String(item.staffId) === String(data.currentHandler));
  const rows = state.auditTasks.filter((task) => {
    for (const key of ['reviewStatus', 'bizType', 'bizId']) {
      if (present(data[key]) && String(task[key]) !== String(data[key])) return false;
    }
    if (present(data.workOrderId) && task.workOrderId !== Number(data.workOrderId)) return false;
    if (present(data.chatImgId) && task.chatImgId !== Number(data.chatImgId)) return false;
    if (present(data.currentHandler) && task.currentHandler !== (staff?.customerName ?? String(data.currentHandler))) return false;
    return true;
  });
  return paginate(rows, data);
}

const getRoutes = new Map([
  ['/workOrder/statusList', () => ({ data: STATUS_OPTIONS })],
  ['/games/groupOptions', () => ({ data: GAME_GROUPS })],
  ['/games/names', () => GAME_GROUPS],
  ['/language/list', () => ({ data: LANGUAGES })],
  ['/workOrder/getAssignableStaff', () => ({ data: state.staff })],
  ['/cs/staff/getOnlineStatus', () => ({ data: actorStatus })],
  ['/cs/staff/allOptions', () => ({ data: state.staff.map((staff) => ({ label: staff.customerName, value: String(staff.staffId) })) })],
  ['/workOrder/image/audit/logs', (query) => {
    requireAdmin();
    const logs = state.auditLogs[Number(query.taskId)] ?? fail('MOCK_AUDIT_TASK_NOT_FOUND');
    return { rows: logs, total: logs.length };
  }],
  ['/upload/chat/upload/dubious/image', (query) => ({ data: state.auditImages[Number(query.imageId)] ?? fail('MOCK_AUDIT_IMAGE_NOT_FOUND') })],
  ['/workOrder/inputParams', (query) => ({ data: findRecord(query.workOrderId).inputParams })],
  ['/workOrder/getUserDetail', (query) => ({ data: state.users[String(query.gameUserId)] ?? fail('MOCK_PLAYER_NOT_FOUND') })],
  ['/workOrder/poll', () => {
    const ids = state.records.filter((row) => row.unreplied).map((row) => row.id);
    return { data: { hasUnreplied: ids.length > 0, count: ids.length, workOrderIds: ids } };
  }],
  ['/third/issueTypes/list', () => ({ data: [{ label: '问题核实（演示）', value: 8501 }, { label: '技术排查（演示）', value: 8502 }] })],
  ['/address/options', () => [{ label: '测试区域', value: 'demo-region' }]],
]);

const postRoutes = new Map([
  ['/workOrder/image/audit/list', listAuditTasks],
  ['/workOrder/image/audit/review', (data) => {
    const task = findAuditTask(data.taskId);
    if (!['PASS', 'REJECT'].includes(data.reviewStatus)) fail('MOCK_AUDIT_STATUS_INVALID');
    if (task.reviewStatus !== 'PENDING') fail('MOCK_AUDIT_ALREADY_REVIEWED');
    if (data.reviewStatus === 'REJECT' && !normalizedText(data.reviewReason)) fail('MOCK_AUDIT_REASON_REQUIRED');
    const before = clone(task);
    task.reviewStatus = data.reviewStatus; task.reviewReason = normalizedText(data.reviewReason);
    task.reviewer = '演示客服甲'; task.reviewerId = ACTOR_STAFF_ID; task.reviewTime = FIXTURE_NOW; task.updateTime = FIXTURE_NOW;
    if (data.reviewStatus === 'PASS') {
      task.restoreResult = 'SUCCESS'; task.restoreTime = FIXTURE_NOW;
      const record = findRecord(task.workOrderId);
      if (task.bizType === 'WORK_ORDER_FORM') record.hasWorkOrderSensitiveImage = false;
      else {
        record.hasChatSensitiveImage = false;
        const message = state.histories[`${record.id}:HUMAN`].find((item) => item.replayId === task.bizId);
        if (message) message.sensitiveImage = false;
      }
    }
    appendAuditLog(task, `REVIEW_${task.reviewStatus}`, data.reviewReason, before);
    emitChange(); return { data: true };
  }],
  ['/workOrder/image/audit/delete', (data) => {
    requireAdmin();
    const task = findAuditTask(data.taskId);
    if (!normalizedText(data.remark)) fail('MOCK_AUDIT_REASON_REQUIRED');
    appendAuditLog(task, 'DELETE', data.remark, task);
    state.auditTasks.splice(state.auditTasks.indexOf(task), 1);
    emitChange(); return { data: true };
  }],
  ['/workOrder/image/audit/backfill', (data) => {
    requireAdmin();
    const record = findRecord(data.workOrderId);
    let count = 0;
    for (const kind of ['WORK_ORDER_FORM', 'WORK_ORDER_REPLY']) {
      if (!state.auditTasks.some((task) => task.workOrderId === Number(record.id) && task.bizType === kind)) {
        addAuditTask(record, kind); count += 1;
      }
    }
    emitChange(); return { data: count };
  }],
  ['/workOrder/list', queryMockWorkOrders],
  ['/workOrder/myList', (data) => queryMockWorkOrders({ ...data, viewType: 'MY' })],
  ['/workOrderConfigTemplate/typeMapping', () => ({ data: WORK_ORDER_TYPES })],
  ['/games/gameOptions', (data) => ({ data: GAMES.filter((game) => game.gameGroupId === Number(data.gameGroupId)).map(({ label, value }) => ({ label, value })) })],
  ['/games/gameOptions/byGroupIds', (data) => ({ data: GAMES.filter((game) => asArray(data.gameGroupIds).includes(String(game.gameGroupId))).map(({ label, value }) => ({ label, value })) })],
  ['/third/team/list', () => TEAMS],
  ['/third/templateTeams/getByTemplateId', () => ({ data: TEAMS })],
  ['/workOrder/detail/chat-history', getHistory],
  ['/workOrder/dialog/list', (data) => {
    const result = getHistory({ ...data, recordType: 'HUMAN' });
    return { ...result, rows: result.rows.map((item) => ({ id: item.replayId, workOrderId: data.workOrderId, senderId: item.messageRole === 'USER' ? 97001 : ACTOR_STAFF_ID, senderName: item.nickName, senderRole: item.messageRole, content: item.originalContent, sendTime: item.messageTime })) };
  }],
  ['/games/players/chat-record/history', (data) => {
    const record = state.records.find((item) => item.playerId === String(data.gameUserId));
    return record ? getHistory({ ...data, workOrderId: record.id, recordType: 'AI' }) : { rows: [], total: 0 };
  }],
  ['/games/players/page', (data) => paginate(Object.values(state.users), data)],
  ['/translate/detail', (data) => ({ data: { translatedText: data.targetLanguage === 'en' ? 'Demo translation: your synthetic feedback has been recorded.' : data.targetLanguage === 'ja' ? 'デモ翻訳：テスト用の問い合わせを受け付けました。' : '演示翻译：您的测试反馈已收到，我们会继续协助处理。', sourceLanguage: /[\u3400-\u9fff]/u.test(String(data.text ?? '')) ? 'zh_cn' : 'en' } })],
  ['/workOrder/node-relation/detail', (data) => ({ data: state.nodeRelations[findRecord(data.workOrderId).id] })],
  ['/workOrder/node-relation/summary', (data) => ({ data: { summary: `演示反馈 ${findRecord(data.workOrderId).id}：问题已记录，正在按合成流程核查，所有内容均为本地测试数据。` } })],
  ['/workOrder/unread-server/detail', () => {
    const rows = state.records.filter((row) => row.unreplied);
    const unhandledIds = rows.filter((row) => !row.currentHandler).map((row) => row.id);
    const handledIds = rows.filter((row) => row.currentHandler).map((row) => row.id);
    return { data: { workOrderIds: rows.map((row) => row.id), unhandledIds, handledIds, unhandledCount: unhandledIds.length, handledCount: handledIds.length } };
  }],
  ['/fast-reply-item/list', (data) => ({ data: FAST_REPLIES.filter((item) => (!present(data.groupId) || String(item.groupId) === String(data.groupId)) && (!present(data.keyword) || item.replyContent.includes(String(data.keyword)))).map((item) => ({ ...item, replyContent: item.replyI18n[data.language] || item.replyContent })) })],
  ['/fast-reply-item/detail', (data) => ({ data: FAST_REPLIES.find((item) => String(item.id) === String(data.id)) ?? fail('MOCK_REPLY_NOT_FOUND') })],
  ['/fast-reply-item/page', (data) => paginate(FAST_REPLIES, data)],
  ['/fast-reply-group/list', () => ({ data: [{ id: 8701, groupName: '常用答复' }] })],
  ['/workOrder/claim', (data) => {
    requirePermission('workOrder:list:claim'); requireActorOnline();
    const row = findRecord(data.workOrderId);
    if (!row.canClaim) fail('MOCK_NOT_CLAIMABLE');
    assignRecord(row, state.staff[0]); emitChange();
    return { data: true };
  }],
  ['/workOrder/assigned', (data) => {
    requirePermission('workOrder:list:assigned');
    const row = findRecord(data.workOrderId);
    const staff = state.staff.find((item) => item.staffId === Number(data.handlerId)) ?? fail('MOCK_STAFF_NOT_FOUND');
    if (staff.onlineStatus === 3) fail('MOCK_STAFF_SUSPENDED');
    if (row.currentHandler || !['4', '待处理'].includes(row.status)) fail('MOCK_NOT_ASSIGNABLE');
    assignRecord(row, staff); emitChange(); return { data: true };
  }],
  ['/workOrder/batchReply', (data) => {
    requirePermission('workOrder:list:batchReply'); requireActorOnline();
    const ids = Array.from(new Set(asArray(data.workOrderIds)));
    const rows = ids.map(findRecord);
    if (!rows.length || rows.some((row) => row.status !== '4')) fail('MOCK_BATCH_STATUS');
    if (!normalizedText(data.content) || String(data.content).length > 2048) fail('MOCK_REPLY_INVALID');
    rows.forEach((row) => addReply(row, { content: data.content }));
    emitChange(); return { data: true };
  }],
  ['/workOrder/reply', (data) => {
    const row = findRecord(data.workOrderId);
    if (!normalizedText(data.content) && !data.attachmentUrl) fail('MOCK_REPLY_INVALID');
    addReply(row, data); emitChange(); return { data: true };
  }],
  ['/workOrder/reply/recall', (data) => {
    findRecord(data.workOrderId);
    const key = `${data.workOrderId}:HUMAN`;
    const index = state.histories[key].findIndex((item) => String(item.replayId) === String(data.replyId));
    if (index === -1) fail('MOCK_REPLY_NOT_FOUND');
    state.histories[key].splice(index, 1); emitChange(); return { data: true };
  }],
  ['/workOrder/transfer', (data) => {
    const row = findRecord(data.workOrderId);
    const staff = state.staff.find((item) => item.staffId === Number(data.targetHandlerId));
    if (staff?.onlineStatus === 3) fail('MOCK_STAFF_SUSPENDED');
    if (staff) assignRecord(row, staff);
    else { row.handlerId = null; row.currentHandler = ''; row.canClaim = true; row.status = '4'; row.claimTime = null; }
    emitChange(); return { data: true };
  }],
  ['/workOrder/close', (data) => {
    const row = findRecord(data.workOrderId);
    row.status = '已关闭'; row.canClaim = false; row.finishedTime = FIXTURE_NOW; row.systemFinishReason = normalizedText(data.closeReason);
    emitChange(); return { data: true };
  }],
  ['/workOrder/finished', (data) => {
    const row = findRecord(data.workOrderId);
    addReply(row, data); row.status = '已完成'; row.canClaim = false; row.finishedTime = FIXTURE_NOW;
    row.canManualInviteEvaluation = true; row.evaluationStatus = 'WAIT_MANUAL_INVITE'; emitChange();
    return { data: { workOrderId: row.id, status: row.evaluationStatus, inviteType: null, canManualInviteEvaluation: true, autoInviteAt: null, evaluateDeadline: null } };
  }],
  ['/workOrder/evaluation/invite-decision', (data) => {
    const row = findRecord(data.workOrderId);
    if (!['MANUAL_INVITE', 'AUTO_INVITE'].includes(data.decision)) fail('MOCK_INVITE_DECISION_INVALID');
    row.evaluationStatus = data.decision === 'MANUAL_INVITE' ? 'INVITED' : 'AUTO_PENDING';
    row.canManualInviteEvaluation = false; emitChange();
    return { data: { workOrderId: row.id, status: row.evaluationStatus, inviteType: data.decision === 'MANUAL_INVITE' ? 'MANUAL' : 'AUTO', canManualInviteEvaluation: false, autoInviteAt: null, evaluateDeadline: '2026-10-27 10:30:00' } };
  }],
  ['/third/tickets/createByTemplateId', (data) => {
    const row = findRecord(data.workOrderId); row.isSubmitted = 1; row.thirdPartyTicketId ||= String(930000 + Number(row.id) - 910000); emitChange();
    return { data: { id: Number(row.thirdPartyTicketId), workOrderId: row.id } };
  }],
  ['/third/tickets/system/sync', (data) => {
    const row = findRecord(data.workOrderId);
    const nodes = state.nodeRelations[row.id];
    const node = nodes.find((item) => item.nodeId === Number(data.nodeId)) ?? nodes[0];
    if (!node) fail('MOCK_NODE_NOT_FOUND');
    node.nodeReplies.push({ id: 980000 + node.nodeReplies.length, replyContent: String(data.data ?? ''), creator: '演示客服甲', createTime: FIXTURE_NOW });
    emitChange(); return { data: true };
  }],
  ['/cs/staff/onlineStatus', (data) => { mockControl.setActorStatus(Number(data.onlineStatus)); return { data: true }; }],
  // Upload contents are never read or persisted; the result is fabricated too.
  ['/file/image', () => ({ data: { url: SYNTHETIC_IMAGE, fileName: 'synthetic-demo.svg' } })],
  ['/file/image/delete', () => ({ data: true })],
]);

function parseEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//') || /[\\\r\n]/u.test(endpoint)) fail('MOCK_ENDPOINT_UNSUPPORTED');
  const separator = endpoint.indexOf('?');
  const pathname = separator === -1 ? endpoint : endpoint.slice(0, separator);
  const query = Object.fromEntries(new URLSearchParams(separator === -1 ? '' : endpoint.slice(separator + 1)));
  return { pathname, query };
}

export async function dispatchMockRequest(method, endpoint, payload, options) {
  const { pathname, query } = parseEndpoint(endpoint);
  const routes = method === 'GET' ? getRoutes : method === 'POST' ? postRoutes : null;
  const handler = routes?.get(pathname);
  if (!handler) fail('MOCK_ENDPOINT_UNSUPPORTED');
  const requestGeneration = generation;
  requests.push({ method, path: pathname });
  if (requests.length > 200) requests.shift();
  const mode = endpointModes.get(pathname);
  if (mode === 'error' || nextFailures.delete(pathname)) fail('MOCK_REQUEST_FAILED');
  if (mode === 'pending') {
    await new Promise((resolve, reject) => {
      const queue = pending.get(pathname) ?? [];
      queue.push({ resolve, reject }); pending.set(pathname, queue);
    });
  }
  const delay = delays.get(pathname) ?? 0;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  if (requestGeneration !== generation) fail('MOCK_RESET');
  if (mode === 'empty') {
    if (pathname === '/workOrder/list' || pathname === '/workOrder/myList' || pathname.endsWith('/chat-history') || pathname.endsWith('/dialog/list')) return { rows: [], total: 0 };
    return { data: [] };
  }
  // GET's second argument is a request config, not a body in the source API.
  const data = method === 'GET' ? { ...(payload?.params ?? options?.params ?? {}), ...query } : (payload ?? {});
  return clone(handler(data));
}

export const mockControl = Object.freeze({
  reset() {
    generation += 1;
    for (const queue of pending.values()) for (const gate of queue) gate.reject(new Error('MOCK_RESET'));
    pending.clear(); endpointModes.clear(); nextFailures.clear(); delays.clear(); requests.length = 0;
    state = createFixtureState(); permissions = ['*:*:*']; actorStatus = 1; isAdmin = true; navigation = null;
    replySequences = initialReplySequences(state.histories);
    emitChange();
  },
  setPermissions(values) {
    if (!Array.isArray(values) || values.some((item) => typeof item !== 'string')) throw new TypeError('permissions must be strings');
    permissions = [...values]; emitChange();
  },
  setActorStatus(status) {
    if (![1, 2, 3].includes(status)) throw new TypeError('invalid mock online status');
    actorStatus = status; state.staff[0].onlineStatus = status; emitChange();
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('staff-online-status-change', { detail: { status } }));
    }
  },
  setAdmin(value) {
    if (typeof value !== 'boolean') throw new TypeError('admin must be boolean');
    isAdmin = value; emitChange();
  },
  failNext(endpoint) { nextFailures.add(parseEndpoint(endpoint).pathname); },
  setDelay(endpoint, milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 60000) throw new TypeError('invalid mock delay');
    delays.set(parseEndpoint(endpoint).pathname, milliseconds);
  },
  setEndpointMode(endpoint, mode = 'normal') {
    if (!['normal', 'error', 'pending', 'empty'].includes(mode)) throw new TypeError('invalid endpoint mode');
    endpointModes.set(parseEndpoint(endpoint).pathname, mode);
  },
  releasePending(endpoint) {
    const key = parseEndpoint(endpoint).pathname;
    endpointModes.delete(key);
    for (const gate of pending.get(key) ?? []) gate.resolve();
    pending.delete(key);
  },
  clearNavigation() { navigation = null; emitChange(); },
  getNavigation() { return clone(navigation); },
  getRevision() { return revision; },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  snapshot() { return clone({ records: state.records, staff: state.staff, permissions, actorStatus, isAdmin, navigation, requests, auditTasks: state.auditTasks }); },
});
