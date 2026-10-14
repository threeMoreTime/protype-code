import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseReactProject } from '../../prototype/inputs/react.mjs';
import { coverageReport } from '../../prototype/core/coverage.mjs';
import { renderFigma } from '../../prototype/renderers/figma.mjs';
import { applyRuntimeCaptures } from '../../prototype/inputs/captures.mjs';
import { minimal, capture } from './fixtures.mjs';
import { validatePrototype } from '../../prototype/core/model.mjs';

test('content project: JSX routes, imported components and content navigation are extracted without execution', async () => {
  const model = await parseReactProject(new URL('../../examples/prototypes/content', import.meta.url), { id: 'content' });
  assert.deepEqual(model.pages.map(p => p.path).sort(), ['/', '/about', '/article']);
  assert.equal(model.actions.length, 4);
  assert.ok(model.pages.find(p => p.path === '/').elements.some(e => e.label.includes('社区内容站')));
  assert.equal(coverageReport(model).status, 'READY_FOR_REVIEW');
  assert.equal(renderFigma(model).reactions.length, 4);
  assert.ok(model.requirements.every(r => r.evidence[0].file.startsWith('src/')));
});

test('object routes, TSX fields and missing dynamic UI evidence; target code and symlinks never execute', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'react-understand-'));
  try {
    await mkdir(path.join(dir, 'src')); await writeFile(path.join(dir, 'outside.tsx'), 'export default () => <p>SECRET_OUTSIDE</p>');
    await symlink(path.join(dir, 'outside.tsx'), path.join(dir, 'src', 'escape.tsx'));
    await writeFile(path.join(dir, 'src', 'App.tsx'), `
      import { createBrowserRouter } from 'react-router-dom';
      throw new Error('THIS_MUST_NEVER_EXECUTE');
      function Form() { return <main><h1>登记</h1><label htmlFor="mail">邮箱</label><input id="mail" type="email" required/><button onClick={() => fetch('/api/save')}>保存</button>{loading ? <p>等待</p> : <p>成功</p>}<VendorWidget/></main>; }
      export const router = createBrowserRouter([{ path: '/', element: <Form/> }]);
    `);
    const model = await parseReactProject(dir);
    const email = model.pages[0].elements.find(e => e.kind === 'field');
    assert.equal(email.label, '邮箱'); assert.equal(email.required, true);
    assert.equal(model.actions.length, 0);
    assert.ok(model.diagnostics.some(d => d.code === 'DYNAMIC_UI'));
    assert.ok(model.diagnostics.some(d => d.code === 'UNKNOWN_COMPONENT'));
    assert.equal(coverageReport(model).status, 'NEEDS_REVIEW');
    assert.doesNotMatch(JSON.stringify(model), /SECRET_OUTSIDE/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime captures replace template geometry and retain links only with explicit semantic mappings', () => {
  const model = validatePrototype(minimal()), spec = renderFigma(model), live = capture();
  live.root.children.push({ id: 'button', kind: 'element', tag: 'button', rect: { x: 40, y: 80, width: 150, height: 45 }, style: { backgroundColor: '#315bea' }, children: [] });
  const input = { snapshots: [{ pageId: 'request', stateId: 'default', capture: live, elementMap: { submit: 'button' } }] };
  const result = applyRuntimeCaptures(model, spec, input);
  const source = result.spec.nodes.find(n => n.key === result.spec.reactions[0].sourceKey);
  assert.equal(source.width, 150); assert.equal(source.x, 40);
  assert.ok(result.spec.nodes.some(n => n.key === 'request/success'));
  assert.notEqual(result.spec.id, spec.id);
  delete input.snapshots[0].elementMap.submit;
  assert.throws(() => applyRuntimeCaptures(model, spec, input), /elementMap/);
  input.snapshots[0].pageId = 'missing';
  assert.throws(() => applyRuntimeCaptures(model, spec, input), /Unknown/);
});

test('only imported router navigation is trusted, aliases work and dynamic path declarations do not invent pages', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'react-router-evidence-'));
  try {
    await mkdir(path.join(dir, 'src'));
    await writeFile(path.join(dir, 'src', 'App.tsx'), `
      import { Routes, Route, useNavigate } from 'react-router-dom';
      function Home() { const go = useNavigate(); function navigate(x) { console.log(x); }
        return <main><h1>首页</h1><button data-prototype-id="real" onClick={() => go('/about')}>真的导航</button><button onClick={() => navigate('/about')}>同名普通函数</button></main>;
      }
      function About() { return <h1>关于</h1>; }
      export default function App() { return <Routes><Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path={unknownPath} element={<About/>}/></Routes>; }
    `);
    const model = await parseReactProject(dir);
    assert.equal(model.pages.length, 2); assert.equal(model.actions.length, 1);
    assert.equal(model.actions[0].elementId, 'real');
    assert.ok(model.diagnostics.some(d => d.code === 'DYNAMIC_ROUTE'));
    assert.ok(model.diagnostics.some(d => d.code === 'UNRESOLVED_ACTION'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a symlinked src directory cannot expand the source read boundary', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'react-boundary-')), external = await mkdtemp(path.join(tmpdir(), 'react-outside-'));
  try {
    await writeFile(path.join(external, 'App.tsx'), 'export default () => <h1>OUTSIDE</h1>');
    await symlink(external, path.join(dir, 'src'));
    await assert.rejects(() => parseReactProject(dir), /No supported React source/);
  } finally { await rm(dir, { recursive: true, force: true }); await rm(external, { recursive: true, force: true }); }
});
