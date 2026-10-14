import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { documentToText, loadDocument } from '../../prototype/inputs/documents.mjs';
import { mergePrototype, changedPages } from '../../prototype/core/merge.mjs';
import { renderHTML } from '../../prototype/renderers/html.mjs';
import { buildArtifacts } from '../../prototype/pipeline.mjs';
import { parsePRD } from '../../prototype/inputs/prd.mjs';
import { validatePrototype, digest } from '../../prototype/core/model.mjs';
import { createZip, readZip } from '../../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { minimal } from './fixtures.mjs';
import { coverageReport } from '../../prototype/core/coverage.mjs';

test('HTML and DOCX PRDs preserve headings and literal text without executing embedded content', async () => {
  const html = '<h1>帮助中心</h1><h2>页面：首页 {#home} /</h2><p>内容：greeting | 欢迎 &amp; 使用</p><script>LEAK_SECRET()</script>';
  const extracted = documentToText(Buffer.from(html), '.html');
  assert.doesNotMatch(extracted, /LEAK_SECRET/); assert.match(extracted, /## 页面/);
  assert.equal(parsePRD(extracted).pages[0].elements[0].label, '欢迎 & 使用');
  const docx = createZip([['word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>帮助中心</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>页面：首页 {#home} /</w:t></w:r></w:p><w:p><w:r><w:t>内容：greeting | 欢迎 &amp; 使用</w:t></w:r></w:p></w:body></w:document>']]);
  assert.equal(parsePRD(documentToText(docx, '.docx')).pages[0].elements[0].label, '欢迎 & 使用');
  const dir = await mkdtemp(path.join(tmpdir(), 'docx-prd-'));
  try {
    const file = path.join(dir, 'prd.docx'); await writeFile(file, docx); const model = await loadDocument(file);
    assert.equal(model.sources[0].sha256, digest(docx)); assert.ok(model.diagnostics.some(d => d.code === 'TEXT_EXTRACTION'));
  } finally { await rm(dir, { recursive: true, force: true }); }
  assert.throws(() => documentToText(createZip([['word/document.xml', '<!DOCTYPE x><w:p/>']]), '.docx'), /DTD/);
  assert.throws(() => documentToText(Buffer.from('not a zip'), '.docx'), /ZIP_/);
  assert.throws(() => documentToText(Buffer.from('%PDF'), '.pdf'), /Supported documents/);
});

test('HTML PRDs retain nested container text, inline labels and line breaks once in document order', () => {
  const html = '<html><head><title>Not a requirement</title></head><body><h1>测试产品</h1><main><h2>页面：首页 {#home} /</h2><div><div>内容：notice | 必须<span>核验</span>身份</div><section><div>字段：email | 邮箱 | email | required</div></section><div>状态：success | 完成<br>提交：save | 保存 -> home/success</div></div></main><script>SECRET_SCRIPT()</script><div hidden>SECRET_HIDDEN</div><div data-capture-private>SECRET_PRIVATE</div></body></html>';
  const extracted = documentToText(Buffer.from(html), '.html');
  assert.equal(extracted, '# 测试产品\n## 页面：首页 {#home} /\n内容：notice | 必须核验身份\n字段：email | 邮箱 | email | required\n状态：success | 完成\n提交：save | 保存 -> home/success');
  const model = parsePRD(extracted), artifacts = buildArtifacts(model);
  assert.deepEqual(model.pages[0].elements.map(e => e.id), ['notice', 'email', 'save']);
  assert.equal(model.pages[0].elements[1].required, true);
  assert.equal(model.actions[0].targetState, 'success');
  assert.ok(artifacts.spec.nodes.some(n => n.props.characters === '必须核验身份'));
  assert.equal(artifacts.coverage.counts.unresolved, 0);
});

test('HTML text outside paragraph tags stays available for unresolved-requirement review', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'html-prd-'));
  try {
    const file = path.join(dir, 'requirements.html');
    await writeFile(file, '<h1>产品</h1><h2>页面：首页 {#home} /</h2><div>需要执行复杂的身份核验。</div><custom-note>需要记录审计日志。</custom-note>');
    const model = await loadDocument(file), report = coverageReport(model);
    assert.equal(report.status, 'NEEDS_REVIEW'); assert.equal(report.counts.unresolved, 2);
    assert.ok(model.requirements.some(r => r.text === '需要执行复杂的身份核验。'));
    assert.ok(model.requirements.some(r => r.text === '需要记录审计日志。'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('HTML tables retain pipe-separated rows without duplicate cell text', () => {
  const extracted = documentToText(Buffer.from('<h2>页面：首页 {#home} /</h2><table><tr><td><div>字段：email</div></td><td><span>邮箱</span></td><td>email</td><td>required</td></tr></table>'), '.html');
  const model = parsePRD(extracted);
  assert.equal(model.pages[0].elements.length, 1);
  assert.equal(model.pages[0].elements[0].id, 'email');
  assert.equal(model.pages[0].elements[0].required, true);
});

test('three-way merge preserves human edits while applying independent requirement changes', () => {
  const base = validatePrototype(minimal()), generated = structuredClone(base), edited = structuredClone(base);
  edited.pages[0].elements[0].label = '人工调整：确认提交';
  generated.pages[0].title = '新的申请标题';
  const result = mergePrototype(base, generated, edited);
  assert.equal(result.status, 'MERGED'); assert.equal(result.model.pages[0].title, '新的申请标题');
  assert.equal(result.model.pages[0].elements[0].label, '人工调整：确认提交');
  assert.ok(result.preserved.includes('/pages/@request/elements/@submit/label'));
  assert.equal(base.pages[0].title, '申请');
});

test('same-property conflict cannot publish until an explicit choice resolves it', () => {
  const base = validatePrototype(minimal()), generated = structuredClone(base), edited = structuredClone(base);
  generated.pages[0].elements[0].label = '新的提交'; edited.pages[0].elements[0].label = '人工文案';
  const result = mergePrototype(base, generated, edited);
  assert.equal(result.model, null); assert.equal(result.conflicts.length, 1);
  const location = result.conflicts[0].path;
  assert.equal(mergePrototype(base, generated, edited, { [location]: 'edited' }).model.pages[0].elements[0].label, '人工文案');
  assert.equal(mergePrototype(base, generated, edited, { [location]: 'generated' }).model.pages[0].elements[0].label, '新的提交');
  assert.throws(() => mergePrototype(base, generated, edited, { '/unknown': 'edited' }), /Stale/);
});

test('stable-ID merge handles delete/edit and competing array orders without index drift', () => {
  const base = validatePrototype(minimal());
  base.pages[0].elements.push({ id: 'a', kind: 'text', label: '甲', requirementIds: [], evidence: [] }, { id: 'b', kind: 'text', label: '乙', requirementIds: [], evidence: [] });
  const generated = structuredClone(base), edited = structuredClone(base);
  generated.pages[0].elements = [generated.pages[0].elements[1], generated.pages[0].elements[0], generated.pages[0].elements[2]];
  edited.pages[0].elements.reverse();
  const result = mergePrototype(base, generated, edited); assert.ok(result.conflicts.some(c => c.kind === 'ORDER'));
  generated.pages[0].elements = generated.pages[0].elements.filter(e => e.id !== 'a');
  edited.pages[0].elements.find(e => e.id === 'a').label = '人工新增说明';
  const deletion = mergePrototype(base, generated, edited); assert.ok(deletion.conflicts.some(c => c.kind === 'DELETE_EDIT' && c.path.endsWith('/@a')));
});

test('one changed requirement updates its page fragment; unrelated page bytes and hashes stay identical', () => {
  const input = '# 跨页\n页面：甲 {#a} /a\n内容：message | 初始说明\n页面：乙 {#b} /b\n内容：other | 固定内容';
  const before = parsePRD(input), after = parsePRD(input.replace('初始说明', '修改说明'));
  assert.deepEqual(changedPages(before, after), { added: [], removed: [], changed: ['a'], unchanged: ['b'] });
  const a = buildArtifacts(before), b = buildArtifacts(after, { previous: before });
  assert.equal(a.files.get('pages/b.json'), b.files.get('pages/b.json'));
  assert.notEqual(a.files.get('pages/a.json'), b.files.get('pages/a.json'));
  assert.deepEqual(a.spec.nodes.filter(n => n.key.startsWith('b/')), b.spec.nodes.filter(n => n.key.startsWith('b/')));
});

test('offline HTML keeps adversarial labels inert; ZIP has complete hash-verifiable artifacts', () => {
  const model = validatePrototype(minimal()); model.name = '</title><script>alert(1)</script>'; model.pages[0].elements[0].label = '</script><img src=x onerror=alert(1)>';
  const html = renderHTML(model);
  assert.doesNotMatch(html, /<img src=x/); assert.match(html, /\\u003c\/script\\u003e/); assert.match(html, /default-src 'none'/);
  const artifact = buildArtifacts(model), zip = readZip(artifact.files.get('prototype.zip'));
  assert.ok(zip.has('index.html') && zip.has('design-spec.json') && zip.has('generated.json'));
  for (const file of artifact.manifest.files) assert.equal(digest(zip.get(file.file)), file.sha256);
});

test('CLI writes review artifacts and exit 2 on conflict, then emits delivery after resolution', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'merge-cli-'));
  try {
    const base = validatePrototype(minimal()), generated = structuredClone(base), edited = structuredClone(base);
    generated.pages[0].title = '新需求'; edited.pages[0].title = '人工标题';
    for (const [name, data] of [['base', base], ['generated', generated], ['edited', edited]]) await writeFile(path.join(dir, `${name}.json`), JSON.stringify(data));
    const args = ['prototype/cli.mjs', '--input', path.join(dir, 'generated.json'), '--base', path.join(dir, 'base.json'), '--edited', path.join(dir, 'edited.json')];
    const conflict = spawnSync(process.execPath, [...args, '--out', path.join(dir, 'conflict')], { encoding: 'utf8' });
    assert.equal(conflict.status, 2, conflict.stderr);
    await assert.rejects(() => access(path.join(dir, 'conflict', 'design-spec.json')));
    const report = JSON.parse(await readFile(path.join(dir, 'conflict', 'conflicts.json'), 'utf8'));
    await writeFile(path.join(dir, 'resolutions.json'), JSON.stringify({ [report.conflicts[0].path]: 'edited' }));
    const complete = spawnSync(process.execPath, [...args, '--resolutions', path.join(dir, 'resolutions.json'), '--out', path.join(dir, 'complete')], { encoding: 'utf8' });
    assert.equal(complete.status, 0, complete.stderr);
    const final = JSON.parse(await readFile(path.join(dir, 'complete', 'prototype.json'), 'utf8'));
    assert.equal(final.pages[0].title, '人工标题');
    const baseline = JSON.parse(await readFile(path.join(dir, 'complete', 'generated.json'), 'utf8'));
    assert.equal(baseline.pages[0].title, '新需求');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
