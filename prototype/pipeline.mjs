import { mkdir, writeFile, rename, rm, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validatePrototype, digest } from './core/model.mjs';
import { coverageReport } from './core/coverage.mjs';
import { renderHTML } from './renderers/html.mjs';
import { pageProjection, changedPages } from './core/merge.mjs';
import { createZip } from '../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { applyRuntimeCaptures } from './inputs/captures.mjs';
import { renderFigma } from './renderers/figma.mjs';

export function buildArtifacts(input, { captures, generated, previous, merge } = {}) {
  const model = validatePrototype(input), coverage = coverageReport(model);
  const runtime = captures ? applyRuntimeCaptures(model, renderFigma(model), captures) : null;
  const spec = runtime?.spec ?? renderFigma(model);
  if (runtime) {
    coverage.runtime = { applied: runtime.applied, warnings: runtime.warnings, htmlLayout: 'SEMANTIC_TEMPLATE' };
    if (runtime.warnings.length) coverage.status = 'NEEDS_REVIEW';
  }
  const json = value => JSON.stringify(value, null, 2) + '\n';
  const files = new Map([['prototype.json', json(model)], ['design-spec.json', json(spec)], ['coverage.json', json(coverage)], ['README.md', `# ${model.name}\n\nindex.html 是可离线打开的交互原型。prototype.json 是可人工编辑的通用定义。generated.json 保存未合并的生成基线；下一次用它配合人工编辑版本进行三方比较。pages/ 中未受影响的页面保持相同内容摘要，changes.json 列出受影响页面。prototype.zip 包含除自身以外的完整交付。design-spec.json 交给现有 Figma design_plan → design_apply → design_audit 流程。\n\n不要更改已有任务的授权范围；按 docs/guide/generation.md 创建新的交付任务。实际字体和原生节点仍须在 Figma 中验证。表单为模拟交互，不包含后端。\n\n需求状态：${coverage.status}。详见 coverage.json；映射关系不等于语义已验收。\n`]]);
  files.set('index.html', renderHTML(model));
  files.set('generated.json', json(validatePrototype(generated ?? model)));
  const pages = model.pages.map(page => {
    const projection = pageProjection(model, page), file = `pages/${page.id}.json`;
    files.set(file, json(projection));
    return { pageId: page.id, file, contentHash: digest(projection) };
  });
  const incremental = previous ? changedPages(validatePrototype(previous), model) : { added: model.pages.map(p => p.id), removed: [], changed: [], unchanged: [] };
  files.set('changes.json', json({ ...incremental, ...(merge ? { preservedEdits: merge.preserved, resolvedConflicts: merge.conflicts, revisions: merge.revisions } : {}), figmaLiveUpdate: 'NOT_APPLIED' }));
  if (runtime) files.set('captures.json', json(runtime.attachments));
  const manifest = { schemaVersion: '1.0', projectId: model.id, revision: spec.source.revision, pages, archive: 'prototype.zip', files: [...files].map(([file, content]) => ({ file, sha256: digest(content), bytes: Buffer.byteLength(content) })), figma: { specId: spec.id, nativeVerification: 'NOT_RUN' } };
  files.set('manifest.json', json(manifest));
  if ([...files.values()].reduce((sum, content) => sum + Buffer.byteLength(content), 0) > 32 * 1024 * 1024) throw new Error('Delivery exceeds 32 MiB; split the prototype');
  files.set('prototype.zip', createZip([...files].map(([name, content]) => [name, Buffer.from(content)])));
  return { model, spec, coverage, manifest, files };
}

export async function writeArtifacts(artifacts, output) {
  const target = path.resolve(output);
  if (await lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; return null; })) throw new Error('Output already exists; choose a new directory to preserve edits');
  await mkdir(path.dirname(target), { recursive: true });
  const staging = path.join(path.dirname(target), `.prototype-${randomUUID()}`);
  await mkdir(staging);
  try {
    for (const [file, content] of artifacts.files) {
      if (!/^[A-Za-z0-9_.\/-]+$/.test(file) || file.startsWith('/') || file.split('/').includes('..')) throw new Error('Unsafe output path');
      const destination = path.join(staging, file); await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, content, { flag: 'wx' });
    }
    // Reserve the final name, then publish files. Existing outputs are never replaced.
    await mkdir(target);
    try { for (const entry of await readdir(staging)) await rename(path.join(staging, entry), path.join(target, entry)); }
    catch (error) { await rm(target, { recursive: true, force: true }); throw error; }
  } finally { await rm(staging, { recursive: true, force: true }); }
  return target;
}
