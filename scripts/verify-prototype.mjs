import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parsePRD } from '../prototype/inputs/prd.mjs';
import { parseReactProject } from '../prototype/inputs/react.mjs';
import { buildArtifacts } from '../prototype/pipeline.mjs';
import { readZip } from '../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { digest } from '../prototype/core/model.mjs';

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const cases = [];
for (const domain of ['admin', 'mobile', 'content']) {
  const input = new URL(`../examples/prototypes/${domain}`, import.meta.url);
  const model = domain === 'content' ? await parseReactProject(input, { id: domain }) : parsePRD(await readFile(new URL(input.href + '/requirements.md'), 'utf8'), { file: `${domain}/requirements.md`, id: domain });
  const { spec, coverage, files, manifest } = buildArtifacts(model), zip = readZip(files.get('prototype.zip'));
  assert.equal(coverage.counts.unresolved, 0); assert.equal(coverage.unboundButtons.length, 0);
  assert.equal(spec.reactions.length, model.actions.length);
  assert.equal(spec.nodes.filter(n => n.parentKey === null).length, coverage.counts.states);
  assert.ok(spec.nodes.some(n => n.type === 'TEXT')); assert.equal(spec.assets.length, 0);
  for (const file of manifest.files) assert.equal(digest(zip.get(file.file)), file.sha256);
  cases.push({ domain, input: domain === 'content' ? 'React TSX' : 'PRD only', counts: coverage.counts, editableNodes: spec.nodes.length, mappingStatus: coverage.status, schemaAndArchive: 'PASS', unreachableStates: coverage.unreachableStates, humanCorrections: 'NOT_MEASURED', figmaNative: 'NOT_RUN' });
}
const report = { schemaVersion: '1.0', cases, meaning: '结构、引用、需求映射、可编辑节点和打包校验；不替代真实浏览器、人工需求评审或 Figma 原生验收。' };
const json = JSON.stringify(report, null, 2) + '\n';
if (values.out) await writeFile(values.out, json);
console.log(json);
