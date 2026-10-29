import path from 'node:path';
import { parse } from '@babel/parser';

const normalized = value => String(value).replaceAll('\\', '/').toLowerCase();
const fail = code => { const error = new Error(code); error.code = code; throw error; };
export const isWithin = (root, target) => {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

/** Called before resolving or reading source imports. Alias targets are trusted caller configuration. */
export function assertSourceImportAllowed(target, { sourceRoot, workspaceRoot, aliasRoots = [], kind = 'script' } = {}) {
  const value = normalized(target);
  if (!path.isAbsolute(target)) {
    if (/^(?:node:|https?:|data:|file:|@monorepo\/(?:network|utils)(?:\/|$)|axios(?:\/|$))/.test(value)) fail('FIDELITY_IMPORT_FORBIDDEN');
    return;
  }
  if (/(?:^|\/)\.env[^/]*(?:\/|$)|\/rsbuild\.config\.[^/]+$/.test(value)
    || /\/node_modules\/(?:@monorepo\/(?:network|utils)|axios)(?:\/|$)/.test(value)) fail('FIDELITY_IMPORT_FORBIDDEN');
  const relative = normalized(path.relative(sourceRoot, target));
  if (kind !== 'style' && (/^src\/(?:app|index|main)\.[cm]?[jt]sx?$/.test(relative)
    || /(?:^|\/)(?:initapp|initnetwork|embeddedsessionguard|autoregisterroutes|bootstrap)(?:\.[cm]?[jt]sx?|\/)/.test(relative))) fail('FIDELITY_IMPORT_FORBIDDEN');
  const roots = [path.join(sourceRoot, 'src'), path.join(sourceRoot, 'node_modules'), path.join(workspaceRoot, 'node_modules'),
    path.join(workspaceRoot, '.research', 'local-figma-bridge-poc', 'node_modules'), path.join(workspaceRoot, 'prototype', 'feedback-fidelity'), ...aliasRoots];
  if (!roots.some(root => isWithin(root, target))) fail('FIDELITY_IMPORT_OUTSIDE_SCOPE');
}

const property = node => node?.computed ? node.property?.type === 'StringLiteral' ? node.property.value : null : node?.property?.name;
function memberParts(node) {
  if (node?.type === 'Identifier') return [node.name];
  if (!['MemberExpression', 'OptionalMemberExpression'].includes(node?.type)) return [];
  const left = memberParts(node.object), right = property(node);
  return left.length && typeof right === 'string' ? [...left, right] : [];
}

/** No target source is evaluated during inspection and diagnostics never quote its contents. */
export function assertSourceTextSafe(text, { filename = 'source.tsx' } = {}) {
  let ast;
  try { ast = parse(text, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx', 'decorators-legacy'], errorRecovery: false }); }
  catch { fail('FIDELITY_SOURCE_PARSE_FAILED'); }
  const stack = [[ast, null]];
  while (stack.length) {
    const [node, parent] = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (['MemberExpression', 'OptionalMemberExpression'].includes(node.type)) {
      const parts = memberParts(node);
      if (['window', 'globalThis', 'self'].includes(parts[0]) && ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker'].includes(parts.at(-1))
        || parts[0] === 'navigator' && parts.at(-1) === 'sendBeacon') fail('FIDELITY_SOURCE_TRANSPORT_FORBIDDEN');
      if (['window', 'globalThis', 'self'].includes(parts[0]) && parts[1] === 'process') fail('FIDELITY_SOURCE_ENVIRONMENT_FORBIDDEN');
      if (parts[0] === 'process' && parts[1] === 'env' && parts.length === 2) {
        const enclosing = memberParts(parent);
        if (enclosing.length !== 3 || enclosing[2] !== 'NODE_ENV') fail('FIDELITY_SOURCE_ENVIRONMENT_FORBIDDEN');
      }
      if (node.object?.type === 'MetaProperty' && node.object.meta?.name === 'import' && property(node) === 'env') fail('FIDELITY_SOURCE_ENVIRONMENT_FORBIDDEN');
    }
    if (node.type === 'Identifier' && node.name === 'process' && !(parent?.object === node && property(parent) === 'env')) fail('FIDELITY_SOURCE_ENVIRONMENT_FORBIDDEN');
    if (['CallExpression', 'OptionalCallExpression', 'NewExpression'].includes(node.type)) {
      const parts = memberParts(node.callee), direct = node.callee?.name;
      if (direct === 'fetch' || parts.at(-1) === 'fetch' && ['window', 'globalThis', 'self'].includes(parts[0])
        || ['XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker'].includes(direct)
        || parts[0] === 'navigator' && parts.at(-1) === 'sendBeacon') fail('FIDELITY_SOURCE_TRANSPORT_FORBIDDEN');
      if (node.callee?.type === 'Import' && (node.arguments.length !== 1 || node.arguments[0].type !== 'StringLiteral')) fail('FIDELITY_SOURCE_DYNAMIC_IMPORT_FORBIDDEN');
      if (direct === 'require' && (node.arguments.length !== 1 || node.arguments[0].type !== 'StringLiteral')) fail('FIDELITY_SOURCE_DYNAMIC_IMPORT_FORBIDDEN');
      if (parts[0] === 'require' && parts.at(-1) === 'context') fail('FIDELITY_SOURCE_DYNAMIC_IMPORT_FORBIDDEN');
    }
    if (node.type === 'ImportExpression' && node.source?.type !== 'StringLiteral') fail('FIDELITY_SOURCE_DYNAMIC_IMPORT_FORBIDDEN');
    if (node.type === 'JSXAttribute' && ['src', 'poster'].includes(node.name?.name) && node.value?.type === 'StringLiteral' && /^https?:\/\//i.test(node.value.value)) fail('FIDELITY_SOURCE_REMOTE_ASSET_FORBIDDEN');
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child === 'object') stack.push([child, node]);
      } else if (value && typeof value === 'object') stack.push([value, node]);
    }
  }
  return { filename: path.basename(filename), status: 'SAFE_APPLICATION_SOURCE' };
}

function staticValue(node) {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node?.type)) return node.value;
  if (node?.type === 'NullLiteral') return null;
  if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument?.type === 'NumericLiteral') return -node.argument.value;
  if (node?.type === 'ArrayExpression') return node.elements.map(staticValue);
  if (node?.type === 'ObjectExpression') {
    const result = {};
    for (const entry of node.properties) {
      if (entry.type !== 'ObjectProperty' || entry.computed || entry.method) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
      const key = entry.key.name ?? entry.key.value;
      if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key)) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
      result[key] = staticValue(entry.value);
    }
    return result;
  }
  fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
}

/** Extract literal theme and addUtilities data; never require a project's executable config. */
export function extractTailwindSettings(text) {
  let ast;
  try { ast = parse(text, { sourceType: 'unambiguous' }); } catch { fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED'); }
  const assignments = ast.program.body.filter(statement => statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression'
    && memberParts(statement.expression.left).join('.') === 'module.exports');
  const exportDefault = ast.program.body.filter(statement => statement.type === 'ExportDefaultDeclaration');
  const definition = assignments[0]?.expression.right ?? exportDefault[0]?.declaration;
  if (assignments.length + exportDefault.length !== 1 || definition?.type !== 'ObjectExpression') fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
  const settings = {}, utilities = [];
  for (const entry of definition.properties) {
    if (entry.type !== 'ObjectProperty' || entry.computed) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
    const key = entry.key.name ?? entry.key.value;
    if (key === 'content') continue;
    if (key === 'plugins') {
      if (entry.value.type !== 'ArrayExpression') fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
      for (const plugin of entry.value.elements) {
        if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(plugin.type) || plugin.body.type !== 'BlockStatement') fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
        for (const statement of plugin.body.body) {
          const call = statement.type === 'ExpressionStatement' ? statement.expression : null;
          if (call?.type !== 'CallExpression' || call.callee?.name !== 'addUtilities' || call.arguments.length !== 1) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
          utilities.push(staticValue(call.arguments[0]));
        }
      }
      continue;
    }
    if (!['theme', 'darkMode', 'prefix', 'important', 'safelist', 'corePlugins', 'separator'].includes(key)) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
    settings[key] = staticValue(entry.value);
  }
  return { settings, utilities };
}
