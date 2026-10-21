import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parsePRD } from '../prototype/inputs/prd.mjs';
import { parseReactProject } from '../prototype/inputs/react.mjs';
import { buildArtifacts } from '../prototype/pipeline.mjs';
import { readZip } from '../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { digest } from '../prototype/core/model.mjs';
import { loadDocument } from '../prototype/inputs/documents.mjs';
import path from 'node:path';
import * as delivery from '../prototype/core/delivery-verification.mjs';

const { values } = parseArgs({ options: { out: { type: 'string' }, input: { type: 'string' }, packages: { type: 'boolean' }, 'plan-only': { type: 'boolean' } } });
if (values.packages && values['plan-only']) throw new Error('Choose --packages or --plan-only');
const verify = built => built.manifest.kind === 'PACKAGE_COLLECTION' ? delivery.verifyOutputCollection(built) : delivery.verifyOutputPackage(built);
const cases = [];
if (values.input) {
  const model = await loadDocument(values.input);
  if (model.schemaVersion !== '1.1' && (values.packages || values['plan-only'])) throw new Error('Package options require PrototypeSpec 1.1');
  const built = await buildArtifacts(model, { inputRoot: path.dirname(path.resolve(values.input)), packageOutput: values.packages, planOnly: values['plan-only'] });
  cases.push({ input: values.input, counts: built.coverage.counts, mappingStatus: built.coverage.status, localDelivery: verify(built),
    dimensions: built.coverage.dimensions, figmaNative: 'NOT_RUN', visualComparison: 'NOT_RUN', humanCorrections: 'NOT_MEASURED' });
} else for (const domain of ['admin', 'mobile', 'content']) {
  const input = new URL(`../examples/prototypes/${domain}`, import.meta.url);
  const model = domain === 'content' ? await parseReactProject(input, { id: domain }) : parsePRD(await readFile(new URL(input.href + '/requirements.md'), 'utf8'), { file: `${domain}/requirements.md`, id: domain });
  const built = buildArtifacts(model), { spec, coverage, files, manifest } = built, zip = readZip(files.get('prototype.zip'));
  assert.equal(coverage.counts.unresolved, 0); assert.equal(coverage.unboundButtons.length, 0);
  assert.equal(spec.reactions.length, model.actions.length);
  assert.equal(spec.nodes.filter(n => n.parentKey === null).length, coverage.counts.states);
  assert.ok(spec.nodes.some(n => n.type === 'TEXT')); assert.equal(spec.assets.length, 0);
  for (const file of manifest.files) assert.equal(digest(zip.get(file.file)), file.sha256);
  cases.push({ domain, input: domain === 'content' ? 'React TSX' : 'PRD only', counts: coverage.counts, editableNodes: spec.nodes.length, mappingStatus: coverage.status, schemaAndArchive: 'PASS', localDelivery: verify(built), unreachableStates: coverage.unreachableStates, humanCorrections: 'NOT_MEASURED', figmaNative: 'NOT_RUN' });
}
if (!values.input && (values.packages || values['plan-only'])) throw new Error('Selection options require --input');
const report = { schemaVersion: '1.1', cases, meaning: '结构、引用、清单、双端编译契约、预算、manifest和ZIP校验；不替代真实浏览器、人工差异或 Figma 原生验收。' };
const json = JSON.stringify(report, null, 2) + '\n';
if (values.out) await writeFile(values.out, json, { flag: 'wx' });
console.log(json);
