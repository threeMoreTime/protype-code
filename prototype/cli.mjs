#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parsePRD } from './inputs/prd.mjs';
import { validatePrototype } from './core/model.mjs';
import { buildArtifacts, writeArtifacts } from './pipeline.mjs';

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, strict: true, options: { input: { type: 'string' }, out: { type: 'string' }, id: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) { console.log('Usage: npm run prototype -- --input requirements.md --out prototype-output/new [--id project-id]\nInputs: .md, .txt, PrototypeSpec .json. Existing output directories are never overwritten.'); return; }
  if (!values.input || !values.out) throw new Error('--input and --out are required');
  const source = await stat(values.input); if (!source.isFile() || source.size > 4 * 1024 * 1024) throw new Error('Input must be a file up to 4 MiB');
  const text = await readFile(values.input, 'utf8'), extension = path.extname(values.input).toLowerCase();
  const model = extension === '.json' ? validatePrototype(JSON.parse(text)) : ['.md', '.txt'].includes(extension) ? parsePRD(text, { file: path.basename(values.input), id: values.id, name: values.name }) : (() => { throw new Error('Unsupported document format'); })();
  const artifacts = buildArtifacts(model); const output = await writeArtifacts(artifacts, values.out);
  console.log(JSON.stringify({ output, revision: artifacts.manifest.revision, status: artifacts.coverage.status, counts: artifacts.coverage.counts }, null, 2));
  return artifacts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
