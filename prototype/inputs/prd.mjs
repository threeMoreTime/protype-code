import { digest, stableId, validatePrototype } from '../core/model.mjs';

const stateNames = new Map(Object.entries({ 默认: 'default', 正常: 'default', 加载中: 'loading', 加载: 'loading', 空: 'empty', 空状态: 'empty', 失败: 'error', 错误: 'error', 成功: 'success' }));
const knownStates = new Set(['default', 'loading', 'empty', 'error', 'success']);
const stateId = value => stateNames.get(value.trim()) ?? (/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(value.trim()) ? value.trim() : stableId('state', value.trim()));
const plain = value => value.replace(/\*\*|`/g, '').trim();
const explicitName = (value, prefix) => {
  const match = /\s*\{#([A-Za-z0-9][A-Za-z0-9_.-]{0,39})\}/.exec(value);
  const title = value.replace(match?.[0] ?? '\u0000', '').trim();
  return { id: match?.[1] ?? stableId(prefix, title), title };
};
const namedItem = (value, prefix) => {
  const parts = value.split('|').map(plain);
  return parts.length >= 2 && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(parts[0])
    ? { id: parts[0], label: parts[1], rest: parts.slice(2) }
    : { id: stableId(prefix, parts[0]), label: parts[0], rest: parts.slice(1) };
};

/** Deterministic, source-linked PRD extraction. Ambiguous prose stays unresolved. */
export function parsePRD(text, { file = 'requirements.md', id, name } = {}) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 4 * 1024 * 1024) throw new Error('PRD exceeds 4 MiB');
  const model = { schemaVersion: '1.0', id: id ?? stableId('project', file), name: name ?? file, sources: [{ file, kind: 'prd', sha256: digest(text) }], requirements: [], pages: [], actions: [], flows: [], assumptions: ['布局、颜色与字体使用通用模板；列表内容仅来自输入，表单提交为原型模拟。'], diagnostics: [] };
  const pending = [], flowRequests = [], seenRequirements = new Map(); let page = null, platform = 'desktop', inFence = false;
  const diagnostic = (code, message, line, requirementId) => model.diagnostics.push({ code, severity: 'warning', message, source: { file, line, kind: 'prd' }, ...(requirementId ? { requirementId } : {}) });
  const requirement = (value, line) => {
    const key = `${page?.id ?? 'global'}:${value}`;
    if (!seenRequirements.has(key)) {
      const item = { id: stableId('req', key), text: value, evidence: [{ file, line, kind: 'prd' }] };
      model.requirements.push(item); seenRequirements.set(key, item);
    }
    return seenRequirements.get(key);
  };
  const createPage = (value, line, inferred = false) => {
    const route = /\s+(\/[^\s]*)\s*$/.exec(value), named = explicitName(route ? value.slice(0, route.index) : value, 'page');
    if (model.pages.some(p => p.id === named.id)) throw new Error(`Duplicate page at ${file}:${line}; use a unique {#id}`);
    page = { id: named.id, title: named.title, path: route?.[1] ?? `/${named.id}`, viewport: platform === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 }, elements: [], states: [{ id: 'default', label: '默认', kind: 'default', requirementIds: [] }], requirementIds: [], evidence: [{ file, line, kind: 'prd' }] };
    model.pages.push(page);
    const req = requirement(`页面：${named.title}`, line); page.requirementIds.push(req.id);
    if (inferred) diagnostic('INFERRED_PAGE', `将二级标题“${named.title}”视为页面，请核对。`, line);
  };
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = index + 1, original = lines[index].trim();
    if (!original) continue;
    if (/^```|^~~~/.test(original)) { inFence = !inFence; if (inFence) diagnostic('CODE_BLOCK_IGNORED', '代码块不作为业务需求自动解析。', line); continue; }
    if (inFence || /^<!--.*-->$/.test(original)) continue;
    const value = plain(original.replace(/^[-*+]\s+|^\d+[.)]\s+/, ''));
    if (/^#\s+/.test(value)) { if (!name) model.name = value.replace(/^#\s+/, ''); continue; }
    const platformMatch = /^(?:平台|设备|platform)\s*[:：]\s*(.+)$/i.exec(value);
    if (platformMatch) { platform = /mobile|移动|手机/i.test(platformMatch[1]) ? 'mobile' : 'desktop'; continue; }
    const pageMatch = /^(?:#{2,3}\s+)?(?:页面|page)\s*[:：]\s*(.+)$/i.exec(value);
    if (pageMatch) { createPage(pageMatch[1], line); continue; }
    if (/^#{2,6}\s+/.test(value)) {
      const heading = value.replace(/^#{2,6}\s+/, '');
      if (/^(?:背景|目标|概述|角色|约束|非功能需求|功能需求|流程|验收|需求|overview|requirements|flows)$/i.test(heading)) page = null;
      else if (/^##\s+/.test(value)) createPage(heading, line, true);
      else diagnostic('SECTION_NOT_PAGE', `小节“${heading}”不自动创建页面。`, line);
      continue;
    }
    const req = requirement(value, line), refs = [req.id], evidence = req.evidence;
    const directive = /^(流程|flow|字段|field|内容|content|展示|列表|list|按钮|button|提交|submit|交互|interaction|状态|state)\s*[:：]\s*(.+)$/i.exec(value);
    if (!directive) { diagnostic('UNRESOLVED_REQUIREMENT', '未识别为明确的页面、字段、状态或动作；保留原文供人工建模。', line, req.id); continue; }
    const kind = directive[1].toLowerCase(), body = directive[2];
    if (['流程', 'flow'].includes(kind)) { flowRequests.push({ body, req, line }); continue; }
    if (!page) { diagnostic('MISSING_PAGE', '该需求缺少所属页面。', line, req.id); continue; }
    if (['状态', 'state'].includes(kind)) {
      for (const part of body.includes('|') ? [body] : body.split(/[,，、]/)) {
        const [rawId, label] = part.split('|').map(plain), sid = stateId(rawId);
        const old = page.states.find(s => s.id === sid);
        if (old) old.requirementIds.push(req.id);
        else page.states.push({ id: sid, label: label || rawId, kind: knownStates.has(sid) ? sid : 'custom', requirementIds: refs });
      }
      continue;
    }
    if (['交互', 'interaction'].includes(kind)) {
      const match = /^([^\s@]+)(?:@([^\s]+))?\s*(?:->|→)\s*(.+)$/.exec(body);
      if (!match) diagnostic('AMBIGUOUS_ACTION', '交互格式为 控件ID@起始状态 -> 页面ID/目标状态。', line, req.id);
      else pending.push({ pageId: page.id, elementId: match[1], fromState: stateId(match[2] ?? 'default'), target: match[3], trigger: 'click', requirementIds: refs, line });
      continue;
    }
    if (['按钮', 'button', '提交', 'submit'].includes(kind)) {
      const [left, ...right] = body.split(/\s*(?:->|→)\s*/), match = /@([A-Za-z0-9_.-]+)\s*$/.exec(left);
      const item = namedItem(match ? left.slice(0, match.index).trim() : left, 'button');
      const element = { id: item.id, kind: 'button', label: item.label, requirementIds: refs, evidence };
      page.elements.push(element);
      if (right.length === 1) pending.push({ pageId: page.id, elementId: item.id, fromState: stateId(match?.[1] ?? 'default'), target: right[0], trigger: ['提交', 'submit'].includes(kind) ? 'submit' : 'click', requirementIds: refs, line });
      else diagnostic('UNBOUND_BUTTON', `按钮“${item.label}”缺少唯一目标。`, line, req.id);
      continue;
    }
    const item = namedItem(body, 'element');
    if (['字段', 'field'].includes(kind)) {
      const types = ['text', 'email', 'number', 'date', 'select', 'checkbox', 'textarea', 'password'];
      const type = item.rest.find(p => types.includes(p)) ?? 'text';
      const options = item.rest.find(p => p.startsWith('options='))?.slice(8).split(';').filter(Boolean);
      page.elements.push({ id: item.id, kind: 'field', label: item.label, fieldType: type, required: item.rest.some(p => /^(required|必填)$/i.test(p)), ...(options ? { items: options } : {}), requirementIds: refs, evidence });
    } else if (['列表', 'list'].includes(kind)) page.elements.push({ id: item.id, kind: 'list', label: item.label, items: item.rest.join('|').split(';').filter(Boolean), requirementIds: refs, evidence });
    else page.elements.push({ id: item.id, kind: 'text', label: item.label, requirementIds: refs, evidence });
  }
  const resolvePage = value => model.pages.find(p => p.id === value || p.title === value || p.path === value);
  for (const action of pending) {
    let targetPage = resolvePage(action.target), targetState = 'default';
    if (!targetPage) {
      const split = action.target.lastIndexOf('/');
      if (split >= 0) { targetPage = resolvePage(action.target.slice(0, split)); targetState = stateId(action.target.slice(split + 1)); }
      else if (['当前页', 'self'].includes(action.target)) targetPage = resolvePage(action.pageId);
    }
    const owner = resolvePage(action.pageId);
    if (!targetPage || !targetPage.states.some(s => s.id === targetState) || !owner.states.some(s => s.id === action.fromState) || !owner.elements.some(e => e.id === action.elementId && e.kind === 'button')) {
      diagnostic('UNRESOLVED_ACTION', `无法解析交互 ${action.elementId} -> ${action.target}，未生成猜测连线。`, action.line, action.requirementIds[0]); continue;
    }
    model.actions.push({ id: stableId('action', `${action.pageId}.${action.elementId}.${action.fromState}`), pageId: action.pageId, elementId: action.elementId, fromState: action.fromState, targetPageId: targetPage.id, targetState, trigger: action.trigger, requirementIds: action.requirementIds });
  }
  if (!model.pages.length) {
    model.pages.push({ id: 'review', title: '待梳理需求', path: '/', elements: [{ id: 'notice', kind: 'text', label: '未识别到页面。请根据 coverage.json 补充页面、字段和交互。', requirementIds: [] }], states: [{ id: 'default', label: '默认', kind: 'default' }], requirementIds: [] });
    diagnostic('NO_PAGES', '输入没有明确页面；生成待梳理页面，未映射原始需求。', 1);
  }
  for (const request of flowRequests) {
    const [flowName, start, steps = ''] = request.body.split('|').map(plain);
    const [pageId, sid = 'default'] = (start ?? '').split('/');
    const startPage = resolvePage(pageId); let current = startPage?.id, state = stateId(sid), valid = Boolean(startPage?.states.some(s => s.id === state)), actions = [];
    for (const step of steps.split(',').map(plain).filter(Boolean)) {
      const action = model.actions.find(a => a.pageId === current && a.fromState === state && (a.id === step || `${a.pageId}.${a.elementId}` === step || a.elementId === step));
      if (!action) { valid = false; break; }
      actions.push(action.id); current = action.targetPageId; state = action.targetState;
    }
    if (!valid) diagnostic('BROKEN_FLOW', `主流程“${flowName}”无法连续执行。`, request.line, request.req.id);
    else {
      model.flows.push({ id: stableId('flow', flowName), name: flowName, startPageId: startPage.id, startState: stateId(sid), actionIds: actions });
      startPage.requirementIds.push(request.req.id);
    }
  }
  if (!model.flows.length) model.flows.push({ id: 'main', name: model.name, startPageId: model.pages[0].id, startState: 'default', actionIds: [] });
  return validatePrototype(model);
}
