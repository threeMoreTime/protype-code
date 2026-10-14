#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseReactProject } from './inputs/react.mjs';
import { loadDocument } from './inputs/documents.mjs';
import { mergePrototype } from './core/merge.mjs';
import { validatePrototype } from './core/model.mjs';
import { buildArtifacts, writeArtifacts } from './pipeline.mjs';

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, strict: true, options: { input: { type: 'string' }, project: { type: 'string' }, captures: { type: 'string' }, out: { type: 'string' }, id: { type: 'string' }, name: { type: 'string' }, base: { type: 'string' }, edited: { type: 'string' }, resolutions: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) { console.log('Usage: npm run prototype -- --input requirements.md --out prototype-output/new [--id project-id]\nOr --project path/to/react-project [--captures snapshots.json]. Inputs: .md, .txt, .html, .docx, PrototypeSpec .json. Incremental: --base previous/generated.json --edited edited-prototype.json [--resolutions choices.json]. Existing output directories are never overwritten.'); return; }
  if ((!values.input === !values.project) || !values.out) throw new Error('Choose exactly one of --input or --project, and supply --out');
  let model;
  if (values.project) model = await parseReactProject(values.project, { id: values.id, name: values.name });
  else model = await loadDocument(values.input, { id: values.id, name: values.name });
  let captures;
  if (values.captures) {
    if ((await stat(values.captures)).size > 6 * 1024 * 1024) throw new Error('Capture attachment exceeds 6 MiB');
    captures = JSON.parse(await readFile(values.captures, 'utf8'));
  }
  const generated = model; let merge, previous;
  const readJSON = async file => {
    const info = await stat(file); if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new Error('Merge input exceeds file budget');
    return JSON.parse(await readFile(file, 'utf8'));
  };
  if (Boolean(values.base) !== Boolean(values.edited) || values.resolutions && !values.base) throw new Error('--base and --edited are required together; resolutions require a merge');
  if (values.base) {
    previous = validatePrototype(await readJSON(values.edited));
    merge = mergePrototype(await readJSON(values.base), generated, previous, values.resolutions ? await readJSON(values.resolutions) : {});
    if (!merge.model) {
      const files = new Map([
        ['conflicts.json', JSON.stringify({ ...merge, model: undefined, candidate: undefined }, null, 2) + '\n'],
        ['merge-candidate.json', JSON.stringify(merge.candidate, null, 2) + '\n'],
        ['generated.json', JSON.stringify(generated, null, 2) + '\n'],
        ['README.md', '存在编辑冲突或合并后引用失效，尚未生成可交付原型。根据 conflicts.json 创建路径到 edited/generated 的选择文件，用 --resolutions 重试到新目录；也可修正人工编辑定义后重试。\n'],
      ]);
      const output = await writeArtifacts({ files }, values.out);
      console.log(JSON.stringify({ output, status: merge.status, conflicts: merge.conflicts.filter(c => c.resolution === 'UNRESOLVED').length, validationError: merge.validationError }, null, 2));
      process.exitCode = 2; return merge;
    }
    model = merge.model;
  }
  const artifacts = buildArtifacts(model, { captures, generated, previous, merge }); const output = await writeArtifacts(artifacts, values.out);
  console.log(JSON.stringify({ output, revision: artifacts.manifest.revision, status: artifacts.coverage.status, counts: artifacts.coverage.counts }, null, 2));
  return artifacts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
