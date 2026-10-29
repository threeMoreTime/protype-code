#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const fail = code => { const error = new Error(code); error.code = code; throw error; };
const usage = `Usage: node prototype/feedback-fidelity.mjs --source <root> --device desktop --out <new-directory>

Builds the source-backed feedback list as local, offline mock HTML.
PC only. Confirm this project's PC scope with the user before calling.
The source and output parent directories must exist; the output directory must be new.
Figma export and visual/interaction acceptance are separate steps.
`;

/** Validate the complete calling choice before loading the builder or reading any source. */
export function parseFeedbackFidelityArgs(args = []) {
  let values, tokens;
  try {
    ({ values, tokens } = parseArgs({ args, strict: true, allowPositionals: false, tokens: true,
      options: { source: { type: 'string' }, device: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } },
    }));
  } catch (error) {
    fail(error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE' && error.message.includes('--device') ? 'FIDELITY_DESKTOP_ONLY' : 'FIDELITY_ARGUMENTS_INVALID');
  }
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== 'option') continue;
    if (seen.has(token.name)) fail('FIDELITY_ARGUMENTS_INVALID');
    seen.add(token.name);
  }
  if (values.help) return { help: true };
  if (values.device === undefined) fail('FIDELITY_DEVICE_CONFIRMATION_REQUIRED');
  if (values.device !== 'desktop') fail('FIDELITY_DESKTOP_ONLY');
  if (typeof values.source !== 'string' || !values.source.trim()) fail('FIDELITY_SOURCE_REQUIRED');
  if (typeof values.out !== 'string' || !values.out.trim()) fail('FIDELITY_OUTPUT_REQUIRED');
  if (values.source.includes('\0') || values.out.includes('\0')) fail('FIDELITY_ARGUMENTS_INVALID');
  return { sourceRoot: values.source, device: 'desktop', out: values.out, help: false };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseFeedbackFidelityArgs(args);
  if (options.help) { console.log(usage); return; }
  const { buildSourceFeedbackHTML } = await import('./feedback-fidelity/build.mjs');
  const result = await buildSourceFeedbackHTML({ sourceRoot: options.sourceRoot, device: options.device, out: options.out });
  console.log(JSON.stringify({ status: 'GENERATED_LOCAL_MOCK_HTML', device: result.report.device, sourceMode: result.report.sourceMode,
    outputFiles: result.report.outputFiles, htmlSha256: result.report.htmlSha256, verification: result.report.verification }, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => {
  console.error(/^FIDELITY_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'FIDELITY_BUILD_FAILED');
  process.exitCode = 1;
});
