import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'plugin', 'code.js');
const beginMarker = '// BEGIN GENERATED DESIGN RUNTIME';
const endMarker = '// END GENERATED DESIGN RUNTIME';
const source = await readFile(file, 'utf8');
const begin = source.indexOf(beginMarker);
const end = source.indexOf(endMarker);
if (begin < 0 || end <= begin || source.indexOf(beginMarker, begin + 1) !== -1 || source.indexOf(endMarker, end + 1) !== -1) {
  throw new Error('Design runtime bundle markers are missing or duplicated');
}
const result = await build({ entryPoints: [path.join(root, 'plugin', 'design-runtime.mjs')], bundle: true,
  platform: 'browser', format: 'iife', globalName: 'BridgeDesignRuntime', target: 'es2020', minify: true, write: false });
const updated = `${source.slice(0, begin + beginMarker.length)}\n${result.outputFiles[0].text.trim()}\n${source.slice(end)}`;
if (process.argv.includes('--check')) {
  if (updated !== source) { process.stderr.write('plugin/code.js design runtime is stale. Run npm run build:plugin-code.\n'); process.exitCode = 1; }
} else if (updated !== source) await writeFile(file, updated, 'utf8');
