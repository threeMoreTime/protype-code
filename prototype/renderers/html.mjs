import { createHash } from 'node:crypto';
import { validatePrototype } from '../core/model.mjs';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function startPrototype(model) {
  const root = document.getElementById('app'), draft = new Map(); let timer;
  const create = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  const defaultFlow = model.flows[0] ?? { startPageId: model.pages[0].id, startState: 'default' };
  const resolve = () => {
    const [pid, sid] = location.hash.slice(1).split('/');
    const page = model.pages.find(p => p.id === pid) ?? model.pages.find(p => p.id === defaultFlow.startPageId);
    return [page, page.states.find(s => s.id === sid) ?? page.states.find(s => s.id === (pid ? 'default' : defaultFlow.startState)) ?? page.states[0]];
  };
  function draw() {
    clearTimeout(timer); root.replaceChildren();
    const [page, state] = resolve(); document.title = `${page.title} · ${model.name}`;
    const shell = create('div', undefined, 'shell'); root.append(shell);
    const sidebar = create('aside', undefined, 'sidebar'); shell.append(sidebar);
    sidebar.append(create('div', 'P', 'mark'), create('h1', model.name, 'brand'), create('p', '交互原型', 'eyebrow'));
    const nav = create('nav'); nav.setAttribute('aria-label', '页面'); sidebar.append(nav);
    for (const target of model.pages) {
      const link = create('a', target.title); link.href = `#${target.id}/default`;
      if (target.id === page.id) link.setAttribute('aria-current', 'page'); nav.append(link);
    }
    sidebar.append(create('p', '本地演示 · 数据不会提交到服务器', 'privacy-note'));
    const main = create('main'); shell.append(main);
    const toolbar = create('header', undefined, 'toolbar'); main.append(toolbar);
    toolbar.append(create('span', page.path, 'route'));
    const stateLabel = create('label', '查看状态 ', 'state-switch');
    const picker = create('select'); picker.setAttribute('aria-label', '查看状态');
    for (const item of page.states) { const option = create('option', item.label); option.value = item.id; option.selected = item.id === state.id; picker.append(option); }
    picker.addEventListener('change', () => { location.hash = `${page.id}/${picker.value}`; }); stateLabel.append(picker); toolbar.append(stateLabel);
    const surface = create('section', undefined, `surface ${page.viewport.width < 600 ? 'mobile' : ''}`); main.append(surface);
    surface.append(create('p', model.name, 'eyebrow'), create('h2', page.title), create('div', undefined, 'accent-line'));
    if (state.kind !== 'default') { const banner = create('div', state.message ?? state.label, `banner ${state.kind}`); banner.setAttribute('role', state.kind === 'error' ? 'alert' : 'status'); surface.append(banner); }
    const form = create('form'); form.noValidate = false; surface.append(form); const fields = new Map();
    const actions = model.actions.filter(a => a.pageId === page.id && a.fromState === state.id);
    const remember = () => { for (const [id, input] of fields) if (input.type !== 'password') draft.set(`${page.id}/${id}`, input.type === 'checkbox' ? input.checked : input.value); };
    function perform(action) { remember(); location.hash = `${action.targetPageId}/${action.targetState}`; if (action.targetPageId === page.id && action.targetState === state.id) draw(); }
    for (const element of page.elements) {
      if (element.kind === 'field') {
        const wrapper = create('div', undefined, 'field'), label = create('label', element.label + (element.required ? ' *' : ''));
        const input = create(element.fieldType === 'textarea' ? 'textarea' : element.fieldType === 'select' ? 'select' : 'input');
        input.id = `field-${element.id}`; input.name = element.id; input.required = Boolean(element.required); label.htmlFor = input.id;
        if (input.tagName === 'INPUT') input.type = element.fieldType ?? 'text';
        if (input.tagName === 'SELECT') { const placeholder = create('option', `请选择${element.label}`); placeholder.value = ''; input.append(placeholder); for (const item of element.items ?? []) { const option = create('option', item); option.value = item; input.append(option); } }
        else input.placeholder = `请输入${element.label}`;
        const old = draft.get(`${page.id}/${element.id}`); if (old !== undefined) { if (input.type === 'checkbox') input.checked = old; else input.value = old; }
        input.addEventListener('input', remember); fields.set(element.id, input); wrapper.append(label, input); form.append(wrapper);
      } else if (element.kind === 'button') {
        const action = actions.find(a => a.elementId === element.id && a.trigger !== 'timeout');
        const button = create('button', element.label, 'action'); button.type = action?.trigger === 'submit' ? 'submit' : 'button'; button.dataset.elementId = element.id;
        button.disabled = !action; if (!action) button.title = '此状态尚未定义该交互';
        if (action?.trigger === 'click') button.addEventListener('click', () => perform(action)); form.append(button);
      } else if (element.kind === 'list') {
        const section = create('section', undefined, 'list-card'); section.append(create('h3', element.label));
        const list = create('ul');
        for (const text of state.kind === 'empty' ? ['暂无数据'] : element.items?.length ? element.items : ['待补充示例数据']) list.append(create('li', text));
        section.append(list); form.append(section);
      } else form.append(create(element.kind === 'heading' ? 'h3' : 'p', element.label, element.kind === 'text' ? 'body-text' : ''));
    }
    form.addEventListener('submit', event => { event.preventDefault(); const action = actions.find(a => a.elementId === event.submitter?.dataset.elementId && a.trigger === 'submit'); if (action && form.reportValidity()) perform(action); });
    const timeout = actions.find(a => a.trigger === 'timeout'); if (timeout) timer = setTimeout(() => perform(timeout), timeout.delaySeconds * 1000);
    const notes = create('details', undefined, 'notes'); notes.append(create('summary', '原型说明'));
    for (const text of [...model.assumptions, ...model.diagnostics.map(d => d.message)]) notes.append(create('p', text)); main.append(notes);
  }
  window.addEventListener('hashchange', draw); draw();
}
const css = `*{box-sizing:border-box}body{margin:0;background:#eef2f8;color:#18243b;font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif}button,input,textarea,select{font:inherit}button,a,select,input,textarea{outline-offset:4px}a{color:inherit}.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh}.sidebar{background:#101d34;color:#d6dfef;padding:36px 22px;display:flex;flex-direction:column;gap:12px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--primary);color:white;font-size:26px;font-weight:700}.brand{font-size:20px;line-height:1.4;margin:12px 0 0;overflow-wrap:anywhere}.eyebrow{font-size:12px;letter-spacing:.12em;color:#718199;margin:0 0 10px}nav{display:grid;gap:7px;margin-top:22px}nav a{padding:11px 14px;border-radius:9px;text-decoration:none;font-size:14px}nav a:hover,nav a[aria-current]{background:#243854;color:#fff}.privacy-note{margin-top:auto;padding-top:48px;font-size:12px;color:#8c9eb8}main{padding:26px 48px 48px;min-width:0}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px;flex-wrap:wrap}.route{font-size:13px;color:#718199}.state-switch{font-size:13px;color:#5e6d85}.state-switch select{margin-left:8px;border:1px solid #d7dfec;border-radius:7px;background:white;padding:6px 10px;max-width:220px}.surface{max-width:940px;margin:0 auto;background:white;border:1px solid #e0e6f0;border-radius:18px;box-shadow:0 12px 32px #13203908;padding:34px 38px}.surface.mobile{max-width:430px;min-height:660px;padding:26px 24px}h2{font-size:30px;letter-spacing:-.035em;margin:0 0 14px;line-height:1.3;overflow-wrap:anywhere}.accent-line{width:40px;height:4px;background:var(--primary);border-radius:4px;margin-bottom:28px}h3{font-size:17px;margin:0 0 14px}.body-text{color:#596880;white-space:pre-wrap;overflow-wrap:anywhere}.banner{padding:14px 18px;background:#ecf2ff;border:1px solid #d3defb;border-radius:10px;margin-bottom:24px}.banner.success{background:#effaf4;color:#176340;border-color:#c5e9d4}.banner.error{background:#fff3f1;color:#a32722;border-color:#f2cdc8}.field{display:grid;gap:7px;margin:20px 0}.field label{font-weight:600;font-size:14px}.field input,.field select,.field textarea{width:100%;min-width:0;border:1px solid #ccd6e5;border-radius:8px;padding:11px 12px;color:#1e2d47;background:#fbfcfe}.field input[type=checkbox]{width:20px;height:20px}.field textarea{min-height:112px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid var(--primary);border-color:transparent}.action{display:inline-block;margin:12px 10px 0 0;background:var(--primary);color:white;border:0;border-radius:9px;padding:12px 22px;font-weight:600;cursor:pointer;max-width:100%;white-space:normal}.action:hover{filter:brightness(.93)}.action:disabled{background:#c5ccd8;color:#586780;cursor:not-allowed}.list-card{border:1px solid #e0e6ef;border-radius:11px;margin:22px 0;overflow:hidden}.list-card h3{padding:16px 20px;margin:0;background:#f8fafd}.list-card ul{list-style:none;margin:0;padding:0}.list-card li{padding:17px 20px;border-top:1px solid #e8edf5;overflow-wrap:anywhere}.notes{max-width:940px;margin:24px auto 0;color:#738199;font-size:12px}.notes summary{cursor:pointer}.notes p{margin:8px 0}@media(max-width:800px){.shell{grid-template-columns:1fr}.sidebar{padding:18px 20px;display:block}.mark{display:none}.brand{font-size:17px;margin:0}.sidebar>.eyebrow,.privacy-note{display:none}nav{display:flex;overflow:auto;margin-top:12px;gap:6px}nav a{white-space:nowrap;padding:8px 12px}main{padding:20px 16px 36px}.surface{padding:26px 22px}.toolbar{margin-bottom:20px}h2{font-size:25px}.surface.mobile{min-height:580px}}`;
export function renderHTML(input) {
  const model = validatePrototype(input);
  const data = JSON.stringify(model).replace(/[<>&\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const script = `(${startPrototype.toString()})(JSON.parse(document.getElementById('prototype-data').textContent));`;
  const hash = createHash('sha256').update(script).digest('base64');
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><title>${escape(model.name)}</title><style>:root{--primary:${model.theme.primary}}${css}</style></head><body><div id="app"></div><noscript>此交互原型需要 JavaScript。</noscript><script type="application/json" id="prototype-data">${data}</script><script>${script}</script></body></html>\n`;
}
