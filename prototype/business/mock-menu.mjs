import { types } from 'node:util';
import { businessCatalog } from '../../examples/business-suite/catalog.mjs';
import { SUPPORTED_LOCALES, messages } from './locales.mjs';

const menuId = 'cs-admin.quick-replies';
const limits = Object.freeze({ groups: 100, replies: 200, inputBytes: 1048576, depth: 32, nodes: 20000 });
const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
const errorCodes = new Set(['MOCK_MENU_INPUT_INVALID', 'MOCK_MENU_INPUT_LIMIT', 'MOCK_MENU_DUPLICATE_ID', 'MOCK_MENU_REFERENCE_INVALID']);

function fail(code = 'MOCK_MENU_INPUT_INVALID') {
  const error = new Error(code);
  error.code = code;
  throw error;
}

// Validate descriptors before reading values, so ignored fields cannot run getters
// or hide a non-JSON payload. No source value is retained beyond this call.
function validateJson(input) {
  const ancestors = new Set();
  let nodes = 0;
  let stringBytes = 0;
  function bytes(value) {
    stringBytes += Buffer.byteLength(value, 'utf8');
    if (stringBytes > limits.inputBytes) fail('MOCK_MENU_INPUT_LIMIT');
  }
  function visit(value, depth) {
    if (++nodes > limits.nodes || depth > limits.depth) fail('MOCK_MENU_INPUT_LIMIT');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'string') { bytes(value); return; }
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail(); return; }
    if (typeof value !== 'object' || types.isProxy(value)) fail();
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if ((!array && prototype !== Object.prototype && prototype !== null) || (array && prototype !== Array.prototype) || ancestors.has(value)) fail();
    const keys = Reflect.ownKeys(value);
    if (keys.length > limits.nodes) fail('MOCK_MENU_INPUT_LIMIT');
    if (array && (value.length > limits.nodes || keys.length !== value.length + 1)) fail();
    ancestors.add(value);
    for (const key of keys) {
      if (typeof key !== 'string' || blockedKeys.has(key)) fail();
      if (array && key === 'length') continue;
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) fail();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail();
      bytes(key);
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
  }
  visit(input, 0);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > limits.inputBytes) fail('MOCK_MENU_INPUT_LIMIT');
}

function identity(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) fail();
  return value;
}

function validateInput(input) {
  // A fixed error vocabulary keeps malformed input and proxy failures out of logs.
  try {
    validateJson(input);
    if (!input || Array.isArray(input) || !Array.isArray(input.groups) || !Array.isArray(input.replies)) fail();
    if (input.groups.length > limits.groups || input.replies.length > limits.replies) fail('MOCK_MENU_INPUT_LIMIT');
    const groups = new Set();
    const replies = new Set();
    for (const group of input.groups) {
      if (!group || Array.isArray(group) || typeof group !== 'object') fail();
      const id = identity(group.id);
      if (groups.has(id)) fail('MOCK_MENU_DUPLICATE_ID');
      groups.add(id);
    }
    for (const reply of input.replies) {
      if (!reply || Array.isArray(reply) || typeof reply !== 'object') fail();
      const id = identity(reply.id);
      const groupId = identity(reply.groupId);
      if (typeof reply.pinned !== 'boolean') fail();
      if (replies.has(id)) fail('MOCK_MENU_DUPLICATE_ID');
      if (!groups.has(groupId)) fail('MOCK_MENU_REFERENCE_INVALID');
      replies.add(id);
    }
  } catch (error) {
    fail(errorCodes.has(error?.code) ? error.code : 'MOCK_MENU_INPUT_INVALID');
  }
}

export function prepareMockMenuInput(input) {
  validateInput(input);
  const serial = index => String(index + 1).padStart(3, '0');
  const groupIds = new Map(input.groups.map((group, index) => [group.id, `mock-group-${serial(index)}`]));
  const clock = '2026-10-26T00:00:00.000Z';
  const record = values => ({ ...values, version: 1, createdAt: clock, updatedAt: clock });
  const collections = {
    quickReplyGroups: input.groups.map((group, index) => record({ id: groupIds.get(group.id), name: `演示分组 ${serial(index)}`, sortOrder: index + 1 })),
    quickReplies: input.replies.map((reply, index) => record({ id: `mock-reply-${serial(index)}`, groupId: groupIds.get(reply.groupId), name: `演示回复 ${serial(index)}`, content: `这是第 ${serial(index)} 条虚构回复，仅用于本地流程验证。`, pinned: reply.pinned })),
    organizations: [record({ id: 'mock-organization-001', name: '演示组织', parentId: '', sortOrder: 1, enabled: true })],
    roles: [record({ id: 'mock-role-001', name: '演示主管', code: 'supervisor', enabled: true, dataScope: 'all', organizationIds: ['mock-organization-001'], permissions: ['record.*'], userIds: ['supervisor-01'] })],
    users: [record({ id: 'supervisor-01', name: '演示操作员', organizationId: 'mock-organization-001', roles: ['supervisor'], teamIds: [], enabled: true })]
  };
  const originalModule = businessCatalog.modules.find(module => module.id === menuId);
  const { source, ...module } = originalModule;
  const catalog = structuredClone({
    schemaVersion: businessCatalog.schemaVersion,
    apps: [{ id: 'cs-admin', nameKey: 'app.cs-admin', moduleIds: [menuId] }],
    modules: [module],
    collections: Object.fromEntries(Object.keys(collections).map(name => [name, businessCatalog.collections[name]]))
  });
  const seed = {
    schemaVersion: 'business-suite-data/1', revision: 0, clock, nextSequence: 1,
    actors: [{ id: 'supervisor-01', name: '演示操作员', roles: ['supervisor'], teamIds: [] }],
    collections, timeline: [], operations: []
  };
  return {
    bundle: { catalog, seed, locales: structuredClone(SUPPORTED_LOCALES), messages: structuredClone(messages) },
    report: {
      schemaVersion: 'mock-menu-report/1', menuId,
      counts: { groups: input.groups.length, replies: input.replies.length },
      limits: { ...limits },
      limitations: [
        '仅支持快捷回复及其分组；只保留数量、分组关联和置顶布尔状态。',
        '全部业务文本和记录身份均为新建虚构值；不保留源文案、翻译、媒体、凭据或额外字段。',
        '本地数据转换不代表任意网页敏感信息识别、原站视觉还原或真实业务集成。'
      ]
    }
  };
}
