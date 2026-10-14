import { readdir, readFile, realpath, stat, lstat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import { digest, stableId, validatePrototype } from '../core/model.mjs';

const ignored = new Set(['node_modules', 'dist', 'build', 'coverage', 'public', 'vendor', '__tests__', 'test', 'tests', 'prototype-output']);
const literal = n => n?.type === 'StringLiteral' ? n.value : n?.type === 'JSXExpressionContainer' ? literal(n.expression) : undefined;
const tagName = n => n?.openingElement?.name?.type === 'JSXIdentifier' ? n.openingElement.name.name : '';
const attr = (node, name) => node.openingElement?.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === name);
const attrText = (node, name) => literal(attr(node, name)?.value);
const attrBoolean = (node, name) => {
  const attribute = attr(node, name);
  if (!attribute) return false;
  if (attribute.value === null) return true;
  const expression = attribute.value?.expression;
  return expression?.type === 'BooleanLiteral' ? expression.value : undefined;
};
const jsxText = node => (node?.children ?? []).map(c => c.type === 'JSXText' ? c.value : c.type === 'JSXElement' ? jsxText(c) : literal(c) ?? '').join(' ').replace(/\s+/g, ' ').trim();
function visit(node, callback, depth = 0, budget = { count: 0 }) {
  if (!node || typeof node !== 'object') return;
  if (depth > 300 || ++budget.count > 250000) throw new Error('AST budget exceeded');
  if (Array.isArray(node)) { for (const child of node) visit(child, callback, depth + 1, budget); return; }
  if (callback(node) === false) return;
  for (const [key, value] of Object.entries(node)) if (!['loc', 'start', 'end', 'comments', 'tokens', 'extra'].includes(key) && value && typeof value === 'object') visit(value, callback, depth + 1, budget);
}

/** Static React/React Router JSX/TSX only. Never installs, imports or runs target code. */
export async function parseReactProject(directory, { id, name } = {}) {
  const root = await realpath(directory), modules = new Map(), diagnostics = [], sources = []; let bytes = 0, directories = 0;
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const diagnostic = (code, message, file, node) => diagnostics.push({ code, severity: 'warning', message: message.slice(0, 4000), source: { kind: 'code', file: relative(file), line: node?.loc?.start.line ?? 1 } });
  async function scan(dir) {
    if (++directories > 1000) throw new Error('React directory budget exceeded');
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink() || ignored.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await scan(file); continue; }
      if (!entry.isFile() || !/\.(?:jsx?|tsx?)$/.test(entry.name) || /(?:\.d\.ts|\.(?:test|spec)\.[jt]sx?)$/.test(entry.name)) continue;
      const info = await stat(file); bytes += info.size;
      if (info.size > 512 * 1024 || bytes > 12 * 1024 * 1024 || sources.length >= 300) throw new Error('React source budget exceeded (300 files / 12 MiB / 512 KiB per file)');
      const text = await readFile(file, 'utf8'); sources.push({ file: relative(file), kind: 'code', sha256: digest(text) });
      let ast;
      try { ast = parse(text, { sourceType: 'unambiguous', plugins: ['jsx', ...(entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? ['typescript'] : [])] }); }
      catch (error) { diagnostic('PARSE_ERROR', `无法解析源码：${error.message}`, file); continue; }
      const imports = new Map(), locals = new Map(), exports = new Map();
      for (const statement of ast.program.body) {
        if (statement.type === 'ImportDeclaration') for (const s of statement.specifiers) imports.set(s.local.name, { from: statement.source.value, name: s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported?.name });
        const declaration = statement.declaration ?? statement;
        if (declaration.type === 'FunctionDeclaration' && declaration.id) locals.set(declaration.id.name, declaration);
        if (declaration.type === 'VariableDeclaration') for (const d of declaration.declarations) if (d.id.type === 'Identifier') locals.set(d.id.name, d.init);
        if (statement.type === 'ExportDefaultDeclaration') exports.set('default', declaration.type === 'Identifier' ? declaration.name : declaration.id?.name ?? declaration);
        if (statement.type === 'ExportNamedDeclaration') {
          if (declaration.id?.name) exports.set(declaration.id.name, declaration.id.name);
          if (declaration.declarations) for (const d of declaration.declarations) if (d.id.name) exports.set(d.id.name, d.id.name);
          for (const s of statement.specifiers ?? []) if (s.local?.name) exports.set(s.exported.name, s.local.name);
        }
      }
      modules.set(file, { file, ast, imports, locals, exports });
    }
  }
  const src = path.join(root, 'src');
  await scan(await lstat(src).then(s => s.isDirectory() && !s.isSymbolicLink() ? src : root).catch(() => root));
  if (!modules.size) throw new Error('No supported React source files found');
  const resolveImport = (module, local) => {
    const imported = module.imports.get(local);
    if (!imported?.from.startsWith('.')) return null;
    const base = path.resolve(path.dirname(module.file), imported.from);
    // Only already enumerated, non-symlink source modules may be resolved.
    const target = [base, ...['.tsx', '.jsx', '.ts', '.js', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'].map(ext => base + ext)].map(file => modules.get(file)).find(Boolean);
    if (!target) return null;
    const exported = target.exports.get(imported.name);
    const node = typeof exported === 'string' ? target.locals.get(exported) : exported;
    return node ? { module: target, node } : null;
  };
  const component = (module, local) => module.locals.has(local) ? { module, node: module.locals.get(local) } : resolveImport(module, local);
  const routeDefinitions = [];
  const routePath = (parent, child) => child.startsWith('/') ? child : `${parent}/${child}`.replace(/\/+/g, '/');
  function jsxRoutes(node, module, parent = '') {
    if (node?.type === 'JSXElement') {
      const tag = tagName(node), imported = module.imports.get(tag);
      if (imported?.name === 'Route' && /^react-router(?:-dom)?$/.test(imported.from)) {
        const part = attrText(node, 'path');
        if (part === undefined && !attr(node, 'index')) { diagnostic('DYNAMIC_ROUTE', '无静态路径的布局/动态 Route 需运行采集确认。', module.file, node); }
        if (attr(node, 'path') && part === undefined) return;
        const route = part === undefined ? parent || '/' : routePath(parent, part) || '/';
        const element = attr(node, 'element')?.value?.expression, Component = attr(node, 'Component')?.value?.expression;
        if ((element || Component) && (part !== undefined || attr(node, 'index'))) routeDefinitions.push({ route, module, node: element ?? Component });
        for (const child of node.children) jsxRoutes(child, module, route);
        return;
      }
    }
    if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) if (!['loc', 'comments', 'extra'].includes(key)) {
      if (Array.isArray(value)) value.forEach(child => child && typeof child === 'object' && jsxRoutes(child, module, parent));
      else if (value && typeof value === 'object') jsxRoutes(value, module, parent);
    }
  }
  function objectRoutes(node, module, parent = '') {
    if (node?.type === 'Identifier') node = module.locals.get(node.name);
    if (node?.type !== 'ArrayExpression') { diagnostic('DYNAMIC_ROUTE', '路由配置不是静态数组。', module.file, node); return; }
    for (const entry of node.elements) {
      if (entry?.type !== 'ObjectExpression') { diagnostic('DYNAMIC_ROUTE', '路由项不是静态对象。', module.file, entry); continue; }
      const props = new Map(entry.properties.filter(p => p.type === 'ObjectProperty' && !p.computed).map(p => [p.key.name ?? p.key.value, p.value]));
      const part = literal(props.get('path')), route = part === undefined ? parent || '/' : routePath(parent, part);
      const element = props.get('element') ?? props.get('Component');
      if (props.has('path') && part === undefined) { diagnostic('DYNAMIC_ROUTE', '动态对象路由路径无法解析。', module.file, entry); continue; }
      if (element && (part !== undefined || props.get('index')?.value === true)) routeDefinitions.push({ route, module, node: element });
      if (props.has('children')) objectRoutes(props.get('children'), module, route);
    }
  }
  for (const module of modules.values()) {
    jsxRoutes(module.ast, module);
    visit(module.ast, node => {
      const imported = module.imports.get(node.callee?.name);
      if (node.type === 'CallExpression' && ['createBrowserRouter', 'createHashRouter'].includes(imported?.name) && /^react-router(?:-dom)?$/.test(imported.from)) objectRoutes(node.arguments[0], module);
    });
  }
  if (!routeDefinitions.length) {
    const entry = [...modules.values()].find(m => /(?:^|\/)App\.[jt]sx?$/.test(m.file)) ?? [...modules.values()].find(m => m.exports.has('default'));
    if (!entry) throw new Error('No static React Router routes or exported App component found');
    const target = entry.exports.get('default') ?? 'App';
    routeDefinitions.push({ route: '/', module: entry, node: typeof target === 'string' ? entry.locals.get(target) : target });
    diagnostic('INFERRED_ROUTE', '未找到静态路由，以导出组件作为 / 页面；需核对入口。', entry.file);
  }
  const model = { schemaVersion: '1.0', id: id ?? stableId('project', path.basename(root)), name: name ?? path.basename(root), sources, requirements: [], pages: [], actions: [], flows: [], diagnostics, assumptions: ['React 静态分析不会执行应用。布局来自通用模板，运行采集可补充真实几何。条件分支、数据请求、权限和第三方组件需运行验证。'] };
  const navigation = [];
  for (const definition of routeDefinitions) {
    if (model.pages.some(p => p.path === definition.route)) { diagnostic('AMBIGUOUS_ROUTE', `重复路由 ${definition.route}，保留第一个并要求核对布局/索引路由。`, definition.module.file, definition.node); continue; }
    if (/[:*]/.test(definition.route)) diagnostic('DYNAMIC_ROUTE', `参数路由 ${definition.route} 需要样例参数与运行采集。`, definition.module.file, definition.node);
    const page = { id: stableId('page', definition.route), title: definition.route === '/' ? model.name : definition.route, path: definition.route, elements: [], states: [{ id: 'default', label: '默认', kind: 'default' }], requirementIds: [], evidence: [{ file: relative(definition.module.file), line: definition.node?.loc?.start.line ?? 1, kind: 'code' }] };
    model.pages.push(page); const seen = new Set(), occurrences = new Map();
    const add = (element, module, node) => {
      const base = element.id ?? attrText(node, 'data-prototype-id') ?? stableId('element', `${relative(module.file)}:${element.kind}:${element.label}`);
      const n = occurrences.get(base) ?? 0; occurrences.set(base, n + 1); element.id = n ? stableId('element', `${base}:${n}`) : base;
      const req = { id: stableId('req', `${page.id}/${element.id}`), text: `代码界面：${element.label}`, evidence: [{ file: relative(module.file), line: node.loc?.start.line ?? 1, kind: 'code' }] };
      model.requirements.push(req); page.elements.push({ ...element, requirementIds: [req.id], evidence: req.evidence }); return element;
    };
    function expand(node, module, depth = 0) {
      if (!node) return;
      if (depth > 16) { diagnostic('COMPONENT_DEPTH', '组件展开深度超限。', module.file, node); return; }
      if (node.type === 'Identifier') {
        const resolved = component(module, node.name);
        if (resolved) return expand(resolved.node, resolved.module, depth + 1);
      }
      const identity = `${module.file}:${node.start}`;
      if (seen.has(identity)) { diagnostic('REPEATED_COMPONENT', '同一组件多次引用或循环依赖，当前仅展开一次；需运行采集确认实例。', module.file, node); return; } seen.add(identity);
      const labels = new Map();
      visit(node, current => { if (tagName(current) === 'label' && attrText(current, 'htmlFor')) labels.set(attrText(current, 'htmlFor'), jsxText(current)); });
      const handlers = new Map(module.locals), navigateBindings = new Set();
      visit(node, current => {
        if (current.type === 'VariableDeclarator' && current.id.type === 'Identifier' && current.init?.type === 'CallExpression') {
          const imported = module.imports.get(current.init.callee?.name);
          if (imported?.name === 'useNavigate' && /^react-router(?:-dom)?$/.test(imported.from)) navigateBindings.add(current.id.name);
        }
        if (current.type === 'VariableDeclarator' && current.id.type === 'Identifier') handlers.set(current.id.name, current.init); if (current.type === 'FunctionDeclaration' && current.id) handlers.set(current.id.name, current); });
      visit(node, current => {
        if (['IfStatement', 'SwitchStatement', 'ConditionalExpression'].includes(current.type)) diagnostic('DYNAMIC_UI', '条件分支需要运行采集确认；静态展示不代表同时可见。', module.file, current);
        if (current.type === 'JSXExpressionContainer' && !literal(current) && !['BooleanLiteral', 'NullLiteral'].includes(current.expression?.type)) {
          diagnostic('DYNAMIC_UI', '表达式/条件内容仅静态扫描，需运行采集确认当前状态。', module.file, current);
        }
        if (current.type !== 'JSXElement') return;
        const tag = tagName(current), label = jsxText(current);
        if (/^[A-Z]/.test(tag)) {
          const imported = module.imports.get(tag);
          if (['Link', 'NavLink'].includes(imported?.name) && /^react-router(?:-dom)?$/.test(imported.from)) {
            const element = add({ kind: 'button', label: label || '未命名链接' }, module, current);
            navigation.push({ page, element, target: attrText(current, 'to'), module, node: current }); return false;
          }
          if (['Outlet', 'Routes', 'Route'].includes(imported?.name)) return false;
          const resolved = component(module, tag);
          if (resolved) {
            if (current.openingElement.attributes.length) diagnostic('COMPONENT_PROPS', `组件 ${tag} 的属性尚未代入展开结果。`, module.file, current);
            expand(resolved.node, resolved.module, depth + 1);
          }
          else diagnostic('UNKNOWN_COMPONENT', `组件 ${tag} 无法静态展开。`, module.file, current);
          return false;
        }
        if (/^h[1-6]$/.test(tag) && label) { if (tag === 'h1') page.title = label.slice(0, 200); add({ kind: 'heading', label }, module, current); return false; }
        if (['input', 'textarea', 'select'].includes(tag)) {
          const type = tag === 'input' ? attrText(current, 'type') ?? 'text' : tag;
          if (['hidden', 'password'].includes(type)) { diagnostic('PRIVATE_CONTROL', `不读取 ${type} 字段值。`, module.file, current); if (type === 'hidden') return false; }
          const label = attrText(current, 'aria-label') ?? labels.get(attrText(current, 'id')) ?? attrText(current, 'placeholder') ?? attrText(current, 'name') ?? '未命名字段';
          const fieldType = ['text', 'email', 'number', 'date', 'select', 'checkbox', 'textarea', 'password'].includes(type) ? type : 'text';
          const items = tag === 'select' ? current.children.filter(c => tagName(c) === 'option').map(jsxText).filter(Boolean) : undefined;
          const required = attrBoolean(current, 'required');
          if (required === undefined) diagnostic('DYNAMIC_REQUIRED', `字段“${label}”的 required 不是静态布尔值，必填规则需人工确认。`, module.file, current);
          add({ kind: 'field', label, fieldType, ...(required === undefined ? {} : { required }), ...(items ? { items } : {}) }, module, current); return false;
        }
        if (['button', 'a'].includes(tag)) {
          const element = add({ kind: 'button', label: label || attrText(current, 'aria-label') || '未命名按钮' }, module, current);
          let target = attrText(current, 'href'), handler = attr(current, 'onClick')?.value?.expression;
          if (handler?.type === 'Identifier') handler = handlers.get(handler.name);
          if (handler) {
            const destinations = []; let conditional = false;
            visit(handler, n => { if (['IfStatement', 'ConditionalExpression', 'LogicalExpression', 'SwitchStatement'].includes(n.type)) conditional = true; if (n.type === 'CallExpression' && navigateBindings.has(n.callee?.name) && literal(n.arguments[0])) destinations.push(literal(n.arguments[0])); });
            if (!conditional && destinations.length === 1) target = destinations[0];
          }
          navigation.push({ page, element, target, module, node: current }); return false;
        }
        if (['ul', 'ol'].includes(tag)) { const items = current.children.filter(c => tagName(c) === 'li').map(jsxText).filter(Boolean); if (items.length) add({ kind: 'list', label: attrText(current, 'aria-label') ?? '内容列表', items }, module, current); }
        if (['p', 'article', 'section', 'div', 'span'].includes(tag)) {
          const direct = current.children.filter(c => c.type === 'JSXText').map(c => c.value).join(' ').replace(/\s+/g, ' ').trim();
          if (direct) add({ kind: 'text', label: direct }, module, current);
        }
      });
    }
    expand(definition.node, definition.module);
    if (!page.elements.length) diagnostic('EMPTY_PAGE', `页面 ${page.path} 缺少可静态提取内容。`, definition.module.file, definition.node);
  }
  for (const nav of navigation) {
    const target = model.pages.find(p => p.path === nav.target);
    if (!target) { diagnostic('UNRESOLVED_ACTION', `控件“${nav.element.label}”没有可确认的站内目标。`, nav.module.file, nav.node); continue; }
    model.actions.push({ id: stableId('action', `${nav.page.id}/${nav.element.id}`), pageId: nav.page.id, elementId: nav.element.id, fromState: 'default', targetPageId: target.id, targetState: 'default', trigger: 'click', requirementIds: nav.page.elements.find(e => e.id === nav.element.id).requirementIds });
  }
  model.flows = [{ id: 'main', name: model.name, startPageId: model.pages.find(p => p.path === '/')?.id ?? model.pages[0].id, startState: 'default', actionIds: [] }];
  model.diagnostics = [...new Map(diagnostics.map(d => [`${d.code}:${d.source.file}:${d.source.line}:${d.message}`, d])).values()];
  return validatePrototype(model);
}
