import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parsePRD } from '../../prototype/inputs/prd.mjs';
import { renderFigma } from '../../prototype/renderers/figma.mjs';
import { coverageReport } from '../../prototype/core/coverage.mjs';
import { buildArtifacts, writeArtifacts } from '../../prototype/pipeline.mjs';

for (const domain of ['admin', 'mobile']) test(`PRD-only ${domain}: all declared requirements trace to editable scenes and continuous flows`, async () => {
  const text = await readFile(new URL(`../../examples/prototypes/${domain}/requirements.md`, import.meta.url), 'utf8');
  const model = parsePRD(text, { file: `${domain}.md`, id: domain });
  const report = coverageReport(model), spec = renderFigma(model);
  assert.equal(report.counts.unresolved, 0); assert.deepEqual(report.unboundButtons, []); assert.equal(report.status, 'READY_FOR_REVIEW');
  assert.equal(spec.nodes.filter(n => n.parentKey === null).length, report.counts.states);
  assert.equal(spec.reactions.length, model.actions.length);
  assert.ok(spec.nodes.some(n => n.type === 'TEXT' && n.props.characters.includes(domain === 'admin' ? '邮箱' : '联系人')));
  assert.equal(model.pages[0].viewport.width, domain === 'mobile' ? 390 : 1280);
  assert.ok(model.flows[0].actionIds.length >= 2);
  assert.deepEqual(buildArtifacts(model).manifest, buildArtifacts(model).manifest);
  assert.equal(report.verification.figmaNative, 'NOT_RUN');
});

test('free-form prose and ambiguous interactions remain explicit review work', () => {
  const model = parsePRD('# 项目\n需要复杂的计费和权限审批。\n');
  assert.equal(coverageReport(model).counts.unresolved, 1);
  assert.equal(model.pages[0].id, 'review');
  const partial = parsePRD('页面：登录 {#login} /login\n- 按钮：send | 登录 -> 未定义页面\n- 只有管理员才可以删除账户\n');
  assert.equal(partial.actions.length, 0);
  assert.ok(partial.diagnostics.some(d => d.code === 'UNRESOLVED_ACTION'));
  assert.equal(coverageReport(partial).status, 'NEEDS_REVIEW');
});

test('stable explicit IDs survive title edits and invalid duplicate IDs fail visibly', () => {
  const input = '## 页面：首页 {#home} /\n- 内容：message | 初始内容';
  const a = parsePRD(input), b = parsePRD(input.replace('首页', '新首页'));
  assert.equal(a.pages[0].id, b.pages[0].id);
  assert.equal(a.pages[0].elements[0].id, b.pages[0].elements[0].id);
  assert.notEqual(renderFigma(a).id, renderFigma(b).id);
  assert.throws(() => parsePRD(`${input}\n## 页面：重复 {#home} /other`), /Duplicate page/);
});

test('delivery writes hashes and refuses existing destinations without losing manual edits', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'prototype-delivery-'));
  try {
    const artifact = buildArtifacts(parsePRD('页面：首页 {#home} /\n内容：message | 欢迎'));
    const output = path.join(dir, 'v1'); await writeArtifacts(artifact, output);
    const before = await readFile(path.join(output, 'prototype.json'), 'utf8');
    await assert.rejects(() => writeArtifacts(artifact, output), /already exists/);
    assert.equal(await readFile(path.join(output, 'prototype.json'), 'utf8'), before);
    assert.ok((await readdir(output)).includes('design-spec.json'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('user control IDs cannot collide with renderer nodes; custom Chinese states keep resolvable identities', () => {
  const model = parsePRD('页面：审批 {#approval} /approval\n状态：待审核\n按钮：title | 提交审核 -> approval/待审核\n交互：title@待审核 -> approval/default');
  const spec = renderFigma(model);
  assert.equal(spec.reactions.length, 2);
  assert.equal(new Set(spec.nodes.map(n => n.key)).size, spec.nodes.length);
  assert.ok(model.pages[0].states.some(s => s.label === '待审核' && s.kind === 'custom'));
});
