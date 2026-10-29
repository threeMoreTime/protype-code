#!/usr/bin/env node
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { prepareMockMenuInput } from './business/mock-menu.mjs';
import { renderBusinessHTML } from './renderers/business-html.mjs';
import { renderBusinessFigma } from './business/figma.mjs';
import { writeArtifacts } from './pipeline.mjs';

const json = value => `${JSON.stringify(value, null, 2)}\n`;

// The raw input never reaches either renderer. Only newly generated mock data
// and the repository's trusted menu definitions cross this boundary.
export function buildMenuProbe(input) {
  const { bundle, report: privacy } = prepareMockMenuInput(input);
  const report = { ...privacy, verification: {
    browser: 'NOT RUN', realFigma: 'NOT RUN', visualComparison: 'NOT RUN',
    figmaInteraction: 'DECLARED_SCENARIOS_ONLY',
  } };
  const options = { app: 'cs-admin', locale: 'zh_cn' };
  const files = new Map([
    ['index.html', renderBusinessHTML(bundle, { ...options, device: 'auto' })],
    ['demo-data.json', json(bundle.seed)],
    ['privacy-report.json', json(report)],
  ]);
  for (const device of ['desktop', 'mobile']) {
    const spec = renderBusinessFigma(bundle, { ...options, device, validationScenarios: true });
    files.set(`figma/${device}.design-spec.json`, json(spec));
  }
  return { files, report };
}

export async function main(args = process.argv.slice(2)) {
  let values;
  try { ({ values } = parseArgs({ args, strict: true, options: { input: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } } })); }
  catch { throw new Error('MENU_PROBE_ARGUMENTS_INVALID'); }
  if (values.help) {
    console.log('Usage: npm run prototype:menu -- --input <local-json> --out <new-directory>\nQuick-replies only. Automatically generates mock data; does not capture a live site or write Figma.');
    return;
  }
  if (!values.input || !values.out) throw new Error('MENU_PROBE_ARGUMENTS_INVALID');
  let input;
  try {
    const info = await lstat(values.input);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024) throw new Error();
    const bytes = await readFile(values.input);
    if (bytes.byteLength > 1024 * 1024) throw new Error();
    input = JSON.parse(bytes.toString('utf8'));
  } catch { throw new Error('MENU_PROBE_INPUT_INVALID'); }
  const artifacts = buildMenuProbe(input);
  try { await writeArtifacts(artifacts, values.out); }
  catch { throw new Error('MENU_PROBE_OUTPUT_FAILED'); }
  console.log(JSON.stringify({ status: 'GENERATED_NOT_VERIFIED', fileCount: artifacts.files.size, report: artifacts.report }, null, 2));
  return artifacts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    // JSON parser, filesystem and downstream validation errors can contain raw
    // values or private paths. Only fixed, value-free codes may reach stderr.
    console.error(/^(?:MENU_PROBE|MOCK_MENU)_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'MENU_PROBE_FAILED');
    process.exitCode = 1;
  });
}
