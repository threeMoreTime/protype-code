import { mkdir, writeFile, rename, rm, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validatePrototype, digest, assertPrototypePhase } from './core/model.mjs';
import { coverageReport } from './core/coverage.mjs';
import { renderHTML } from './renderers/html.mjs';
import { pageProjection, changedPages, sceneProjection, changedScenes } from './core/merge.mjs';
import { createZip } from '../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { applyRuntimeCaptures } from './inputs/captures.mjs';
import { renderFigma } from './renderers/figma.mjs';
import { resolveAssets } from './core/assets.mjs';
import { getPresentationRenderContext } from './core/presentation-render.mjs';
import { renderPresentationCatalog } from './renderers/presentation-html.mjs';
import { compileInteractionCapabilities } from './core/interaction-capabilities.mjs';
import { planOutputPackages, selectOutputPackage } from './core/output-packages.mjs';
import { assertOutputPaths, verifyOutputPackage, verifyOutputCollection } from './core/delivery-verification.mjs';

export function buildArtifacts(input, options = {}) {
  const { captures, generated, previous, merge } = options;
  const model = validatePrototype(input);
  if (model.schemaVersion === '1.1') return buildPresentationArtifacts(model, options);
  assertPrototypePhase(previous, 5);
  if (generated && validatePrototype(generated).schemaVersion === '1.1') throw new Error('Cannot mix PrototypeSpec 1.0 and 1.1');
  const coverage = coverageReport(model);
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

async function buildPresentationArtifacts(input, options) {
  if (options.captures) throw new Error('Prototype 1.1 cannot use the legacy runtime capture adapter');
  const model = validatePrototype(input), modelRevision = digest(model);
  const presentationInput = value => {
    const version = value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, 'schemaVersion') : null;
    if (version?.get || version?.set) throw new Error('PROTOTYPE_DATA_ONLY');
    if (version?.value !== '1.1') throw new Error('Cannot mix PrototypeSpec 1.0 and 1.1');
    return validatePrototype(value);
  };
  const generated = presentationInput(options.generated ?? model), previous = options.previous === undefined ? null : presentationInput(options.previous);
  if (generated.schemaVersion !== '1.1' || previous && previous.schemaVersion !== '1.1') throw new Error('Cannot mix PrototypeSpec 1.0 and 1.1');
  if (generated.id !== model.id || previous && previous.id !== model.id) throw new Error('PRESENTATION_PROJECT_MISMATCH');
  if (options.merge && (options.merge.status !== 'MERGED' || !options.merge.model || digest(validatePrototype(options.merge.model)) !== modelRevision)) throw new Error('PRESENTATION_MERGE_NOT_RESOLVED');
  if (options.merge && (!previous || options.merge.revisions?.edited !== digest(previous))) throw new Error('PRESENTATION_MERGE_BASELINE_MISMATCH');
  if (digest(generated) !== modelRevision && (!options.merge || options.merge.revisions.generated !== digest(generated))) throw new Error('PRESENTATION_GENERATED_MISMATCH');
  const plan = planOutputPackages(model, { ...(options.packageLimits ? { limits: options.packageLimits } : {}), ...(options.catalogDecisions ? { catalogDecisions: options.catalogDecisions } : {}) });
  if (options.planOnly) return buildPresentationPlan(model, generated, previous, options, plan);
  if (options.packageOutput) return buildPresentationCollection(model, generated, previous, options, plan);
  return buildPresentationPackage(model, generated, previous, options, plan);
}

const json = value => JSON.stringify(value, null, 2) + '\n';
function presentationChanges(model, previous, merge) {
  const changed = previous ? changedScenes(previous, model) : { added: model.presentation.scenes.map(s => s.id), removed: [], changed: [], unchanged: [] };
  return { schemaVersion: '1.1', ...changed, ...(merge ? { preservedEdits: merge.preserved, resolvedConflicts: merge.conflicts, revisions: merge.revisions } : {}),
    modelRevision: digest(model), comparisonRevision: previous ? digest(previous) : null,
    figmaLiveUpdate: 'NOT_APPLIED', nativeUpdate: { mode: previous && digest(previous) === digest(model) ? 'NO_CHANGES' : 'NEW_REVISION',
      reason: 'Generated DesignSpec IDs and source.modelRevision bind the complete revision; do not rewrite metadata to force a text-only update.',
      textRevision: 'NOT_ELIGIBLE_WITH_CHANGED_SPEC_ID_OR_SOURCE', nativePlan: 'NOT_RUN',
      requiredForNarrowUpdate: ['same spec ID and all non-text fields', '1-100 standalone TEXT changes without COMPONENT/INSTANCE ancestors', 'complete finalized ledger, matching base signature and scope', 'native audit, mapping, resources, fonts and user-edit checks', 'combined base/target request at most 7 MiB'] } };
}

function packageFiles(model, generated, coverage, plan, previous, merge) {
  return new Map([['prototype.json', json(model)], ['generated.json', json(generated)], ['coverage.json', json(coverage)],
    ['output-packages.json', json(plan)], ['catalog-manifest.json', json({ schemaVersion: '1.1', entries: plan.catalogManifest })],
    ['changes.json', json(presentationChanges(model, previous, merge))]]);
}

function deliveryCatalog(plan, sceneIds) {
  const generated = new Set(sceneIds);
  return plan.catalogManifest.map(entry => entry.status === 'INCLUDED' && !entry.sceneIds.every(id => generated.has(id))
    ? { ...entry, plannedStatus: entry.status, status: 'UNRESOLVED', generatedSceneIds: entry.sceneIds.filter(id => generated.has(id)),
      reason: 'The planned source binding has no complete generated scene artifact; inspect scenario-manifest.json for visual or budget blockers.' } : entry);
}

function sealPresentationPackage(artifacts, options = {}) {
  const { files, manifest } = artifacts;
  manifest.archive ??= 'prototype.zip';
  manifest.files = [...files].map(([file, content]) => ({ file, sha256: digest(content), bytes: Buffer.byteLength(content) }));
  files.set('manifest.json', json(manifest)); assertOutputPaths(files);
  const limit = options.packageLimits?.deliveryBytes ?? 32 * 1024 * 1024;
  if ([...files.values()].reduce((sum, content) => sum + Buffer.byteLength(content), 0) > limit) throw new Error('OUTPUT_DELIVERY_BUDGET: Delivery exceeds 32 MiB or the tightened limit; keep the connected package whole');
  files.set(manifest.archive, createZip([...files].map(([name, content]) => [name, Buffer.isBuffer(content) ? content : Buffer.from(content)])));
  artifacts.verification = verifyOutputPackage(artifacts, { ...(options.packageLimits ? { limits: options.packageLimits } : {}) });
  return artifacts;
}

function buildPresentationPlan(model, generated, previous, options, plan) {
  const catalog = deliveryCatalog(plan, []), modelRevision = digest(model), coverage = coverageReport(model, { catalogManifest: catalog });
  const files = packageFiles(model, generated, coverage, plan, previous, options.merge);
  files.set('catalog-manifest.json', json({ schemaVersion: '1.1', entries: catalog }));
  files.set('scenario-manifest.json', json({ schemaVersion: '1.1', scenarios: plan.scenarioManifest.map(s => ({ ...s, status: 'UNRESOLVED', reason: 'PLAN_ONLY: visual, asset and dual-output execution have not been generated or accepted.' })) }));
  files.set('asset-manifest.json', json({ schemaVersion: '1.1', assets: plan.assetManifest }));
  files.set('capability-manifest.json', json(compileInteractionCapabilities(model)));
  files.set('dual-validation.json', json({ html: 'NOT_GENERATED', figma: 'NOT_GENERATED', browser: 'NOT_RUN', native: 'NOT_RUN' }));
  files.set('README.md', '仅规划与未决目录。没有生成 HTML 或 DesignSpec，不能作为视觉、浏览器或真实 Figma 验收。output-packages.json 的预算仅为元数据下界，超限连通包保持整体 BLOCKED。\n');
  return sealPresentationPackage({ model, coverage, files, manifest: { schemaVersion: '1.1', kind: 'PLAN_ONLY', projectId: model.id, revision: modelRevision, modelRevision, status: 'NEEDS_REVIEW', scenes: [] } }, options);
}

async function buildPresentationPackage(model, generated, previous, options, plan, lineage) {
  const modelRevision = digest(model);
  const resolvedAssets = options.resolvedAssets ?? await resolveAssets(model, options.inputRoot);
  const context = getPresentationRenderContext(model, { ...options, resolvedAssets });
  const renderOptions = { ...options, context, resolvedAssets }, spec = renderFigma(model, renderOptions), html = renderHTML(model, renderOptions);
  const coverage = coverageReport(model, { visualRendered: true, interactionRuntime: true, catalogManifest: plan.catalogManifest });
  const capabilities = compileInteractionCapabilities(model), files = packageFiles(model, generated, coverage, plan, previous, options.merge);
  files.set('design-spec.json', json(spec)); files.set('interaction-capabilities.json', json(capabilities)); files.set('capability-manifest.json', json(capabilities));
  files.set('index.html', html); files.set('catalog.html', renderPresentationCatalog(model, renderOptions));
  files.set('README.md', `# ${model.name}\n\ncatalog.html 是独立场景入口，index.html 执行已声明有界动作。prototype.json 保留合并后的人工编辑，generated.json 是未合并基线；changes.json 按场景依赖计算变化。scenario/asset/capability/catalog manifest 分别记录来源、资源、双端能力和未决项。浏览器结果通过 window.__presentationInteractions.getResults() 读取，静态编译不代表执行验收。DesignSpec 不会自动写 Figma；结构变化使用新 revision，文字窄通道必须另经既有严格 native plan/audit。状态保持 NEEDS_REVIEW。\n`);
  if (lineage) files.set('README.md', files.get('README.md').replace('generated.json 是未合并基线', 'generated.json 是本包分包阶段的输入基线') + '\n本包 generated.json 是上游合并后分包阶段的输入（PARTITION_INPUT）。全项目的原始未合并基线仍在集合根 generated.json；下一轮三方合并须使用集合根 generated/prototype，不能把分包阶段输入当作原始需求基线。lineage 保存两种 revision 的对应。\n');
  const assetFiles = new Map();
  for (const asset of context.resolvedAssets.assets) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[asset.mimeType], file = `assets/${asset.sha256}.${extension}`;
    files.set(file, asset.bytes); assetFiles.set(asset.sha256, file);
  }
  const assetManifest = spec.assets.map(asset => ({ ...asset, file: assetFiles.get(asset.sha256) }));
  files.set('design-assets.json', json({ schemaVersion: '1.0', specId: spec.id, modelRevision, assets: assetManifest }));
  const htmlNodes = [], pending = context.renderScenes.map(scene => scene.root);
  while (pending.length) {
    const tree = pending.pop(), n = tree.node;
    htmlNodes.push({ nodeId: n.id, definitionId: n.definitionId, sourceNodeId: n.sourceNodeId, ...(n.instanceId ? { instanceId: n.instanceId } : {}) });
    pending.push(...tree.children);
  }
  files.set('node-map.json', json({ modelRevision, figma: spec.nodes.map(n => ({ nodeId: n.key, key: n.key })), html: htmlNodes }));
  const scenes = context.renderScenes.map(scene => {
    const file = `scenes/${digest(scene.id).slice(0, 24)}.json`, projection = { ...sceneProjection(model, scene.id), sceneId: scene.id, viewport: scene.viewport, root: scene.root };
    files.set(file, json(projection));
    return { sceneId: scene.id, pageId: scene.pageId, stateId: scene.stateId, sourceBoardId: scene.sourceBoardId,
      nodeKey: spec.source.sceneRoots?.[scene.id], file, contentHash: digest(projection), interactionRuntime: 'AVAILABLE_NOT_RUN',
      dualValidation: { html: 'COMPILED_NOT_EXECUTED', figma: 'SCHEMA_VALID_NOT_APPLIED' } };
  });
  files.set('scenario-manifest.json', json({ schemaVersion: '1.1', scenarios: scenes.map(s => ({ ...s, status: 'GENERATED', source: plan.scenarioManifest.find(p => p.sceneId === s.sceneId) })) }));
  files.set('asset-manifest.json', json({ schemaVersion: '1.1', assets: plan.assetManifest.map(a => ({ ...a, ...(assetFiles.has(a.sha256) ? { file: assetFiles.get(a.sha256), verification: 'CONTENT_VERIFIED' } : {}) })) }));
  files.set('dual-validation.json', json({ status: 'LOCAL_CONTRACTS_VALID', sceneIds: scenes.map(s => s.sceneId), html: { generated: true, boundNodes: htmlNodes.length },
    figma: { schema: 'PASS', nodes: spec.nodes.length, reactions: spec.reactions.length }, browser: 'NOT_RUN', native: 'NOT_RUN', visualComparison: 'NOT_RUN' }));
  const manifest = { schemaVersion: '1.1', projectId: model.id, revision: modelRevision, modelRevision, scenes, assets: assetManifest, archive: 'prototype.zip',
    ...(lineage ? { generatedRole: 'PARTITION_INPUT', lineage } : {}), visualComparison: 'NOT_RUN', figma: { specId: spec.id, nativeVerification: 'NOT_RUN' } };
  return sealPresentationPackage({ model, spec, coverage, manifest, files }, options);
}

async function buildPresentationCollection(model, generated, previous, options, plan) {
  const collectionLimit = options.collectionByteLimit ?? 128 * 1024 * 1024;
  if (!Number.isSafeInteger(collectionLimit) || collectionLimit < 1 || collectionLimit > 128 * 1024 * 1024) throw new Error('OUTPUT_COLLECTION_LIMIT');
  let coverage = coverageReport(model, { catalogManifest: deliveryCatalog(plan, []) });
  const files = packageFiles(model, generated, coverage, plan, previous, options.merge), packages = [], scenarios = [];
  const fileBytes = () => [...files.values()].reduce((sum, bytes) => sum + Buffer.byteLength(bytes), 0);
  const indexReserve = Math.min(16 * 1024 * 1024, Math.floor(collectionLimit / 4));
  if (fileBytes() > collectionLimit) throw new Error('OUTPUT_COLLECTION_BUDGET: index metadata exceeds the staging limit; select bounded packages in separate runs');
  for (const record of plan.packages) {
    const prefix = `packages/${record.id}`;
    if (record.status === 'BLOCKED') { packages.push({ ...record, status: 'BLOCKED' }); continue; }
    try {
      const selected = selectOutputPackage(model, record);
      // Previous revisions may have different connected closures. Scene-local
      // change reporting belongs to the collection; no old flow is silently cut.
      const lineage = { incrementalScope: 'COLLECTION_ROOT', modelRevision: digest(model), generatedRevision: digest(generated), partitionInputRevision: digest(selected) };
      const leaf = await buildPresentationPackage(selected, selected, null, { ...options, merge: undefined }, planOutputPackages(selected), lineage);
      const bytes = [...leaf.files.values()].reduce((sum, content) => sum + Buffer.byteLength(content), 0);
      if (fileBytes() + bytes > collectionLimit - indexReserve) throw new Error('OUTPUT_COLLECTION_BUDGET: collection staging reserves space for its final index; deliver this complete connected package in a separate run');
      for (const [name, bytes] of leaf.files) files.set(`${prefix}/${name}`, bytes);
      const archive = `${prefix}/prototype.zip`;
      packages.push({ ...record, status: 'GENERATED', archive, sha256: digest(files.get(archive)), bytes: Buffer.byteLength(files.get(archive)), verification: leaf.verification });
      scenarios.push(...leaf.manifest.scenes.map(s => ({ ...s, packageId: record.id, file: `${prefix}/${s.file}`, status: 'GENERATED' })));
    } catch (error) {
      if (!(error instanceof Error) || !/^(PRESENTATION_|ASSET_|OUTPUT_|DELIVERY_|Invalid DesignSpec)/.test(error.message)) throw error;
      packages.push({ ...record, status: 'BLOCKED', blockers: [...record.blockers, { code: 'OUTPUT_RENDER_OR_BUDGET_BLOCKED', reason: error.message, basis: 'REAL_BUILD' }] });
    }
  }
  for (const record of packages.filter(p => p.status === 'BLOCKED')) for (const sceneId of record.sceneIds) scenarios.push({ sceneId, packageId: record.id, status: 'UNRESOLVED', reason: record.blockers.map(b => b.reason ?? b.code).join('; ') });
  const generatedScenes = scenarios.filter(s => s.status === 'GENERATED').map(s => s.sceneId), catalog = deliveryCatalog(plan, generatedScenes);
  coverage = coverageReport(model, { catalogManifest: catalog, visualRendered: generatedScenes.length > 0, interactionRuntime: generatedScenes.length > 0 });
  files.set('coverage.json', json(coverage)); files.set('catalog-manifest.json', json({ schemaVersion: '1.1', entries: catalog }));
  files.set('scenario-manifest.json', json({ schemaVersion: '1.1', scenarios }));
  files.set('asset-manifest.json', json({ schemaVersion: '1.1', assets: plan.assetManifest }));
  files.set('capability-manifest.json', json(compileInteractionCapabilities(model)));
  files.set('dual-validation.json', json({ packages: packages.map(p => ({ id: p.id, status: p.status, verification: p.verification ?? 'NOT_RUN' })), browser: 'NOT_RUN', native: 'NOT_RUN' }));
  files.set('README.md', '这是独立交付包目录。每个 packages/<id>/prototype.zip 自含完整相连流程并独立受32MiB限制。目录不创建跨包流程，不生成聚合ZIP绕过预算。BLOCKED包只登记完整最小连通闭包和原因，没有HTML或DesignSpec。源模型、人工编辑、变化和未决项目见根目录JSON；真实Figma与人工验收均未运行。\n');
  files.set('README.md', files.get('README.md') + '\n集合内存暂存序列化内容限制128MiB（包含各包ZIP与展开文件），不会输出超大聚合ZIP。超出时保留未交付包的完整闭包和原因；可用selectOutputPackage(model,id)在独立运行生成该完整包。\n');
  const modelRevision = digest(model), manifest = { schemaVersion: '1.1', kind: 'PACKAGE_COLLECTION', projectId: model.id, revision: modelRevision, modelRevision, stagingLimitBytes: collectionLimit,
    status: 'NEEDS_REVIEW', packages, scenes: scenarios, archive: null, files: [...files].map(([file, bytes]) => ({ file, bytes: Buffer.byteLength(bytes), sha256: digest(bytes) })) };
  files.set('manifest.json', json(manifest)); assertOutputPaths(files);
  if (fileBytes() > collectionLimit) throw new Error('OUTPUT_COLLECTION_BUDGET: final index metadata exceeds the staging limit');
  const artifacts = { model, coverage, manifest, files };
  artifacts.verification = verifyOutputCollection(artifacts);
  return artifacts;
}

export async function writeArtifacts(artifacts, output) {
  assertOutputPaths(artifacts.files);
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
