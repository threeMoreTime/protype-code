import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePRD } from '../../prototype/inputs/prd.mjs';
import { parseReactProject } from '../../prototype/inputs/react.mjs';
import { renderFigma } from '../../prototype/renderers/figma.mjs';
import { fixture, complete } from '../../.research/local-figma-bridge-poc/tests/helpers/design-fixture.mjs';

for (const domain of ['admin', 'mobile', 'content']) test(`${domain} output completes existing Figma API-double apply/audit and preserves human-edit guard`, async () => {
  const base = new URL(`../../examples/prototypes/${domain}`, import.meta.url);
  const model = domain === 'content' ? await parseReactProject(base) : parsePRD(await readFile(new URL(`${base.href}/requirements.md`), 'utf8'));
  const spec = renderFigma(model), f = fixture();
  const before = f.writes();
  assert.equal((await f.run('scope_design_plan', spec)).status, 'PLANNED'); assert.equal(f.writes(), before);
  await complete(f, spec, { batchSize: 50 });
  const audit = await f.run('scope_design_audit', spec);
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  assert.equal(audit.nodes.length, spec.nodes.length);
  const text = [...f.nodes.values()].find(n => n.type === 'TEXT'); text.characters = '人工改动，应受保护';
  await assert.rejects(() => f.run('scope_design_apply', spec), /DESIGN_USER_EDIT_CONFLICT/);
  assert.equal(text.characters, '人工改动，应受保护');
});
