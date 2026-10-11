import { readFile, readdir, mkdir, writeFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { adaptCaptures } from './adapter.mjs';
import { enrichFromArchivedHTML } from './archive-html.mjs';
import { enrichDesignSystem } from '../design/enrich.mjs';

export async function captureCommand(argv) {
  const options = {};
  const allowed = new Set(['input', 'output', 'links', 'id', 'name', 'revision', 'captured-at', 'flow-starts', 'fallback-family', 'index', 'html-directory', 'assets-directory', 'text-bounds', 'paint-order', 'native-controls', 'inline-text']);
  for (let i = 0; i < argv.length; i++) { const key = argv[i]?.replace(/^--/, ''); if (key === 'design-system' && argv[i] === '--design-system' && options[key] === undefined) { options[key] = true; continue; } if (!argv[i]?.startsWith('--') || !allowed.has(key) || !argv[i + 1] || options[key] !== undefined) throw new Error(`Invalid or repeated option ${argv[i]}`); options[key] = argv[++i]; }
  if (!options.input || !options.output) throw new Error('Usage: node capture/cli.mjs --input <capture.json|directory> --output <new-output-directory> [--links links.json] [--index index.json] [--flow-starts home,compact-home] [--revision commit] [--text-bounds tight-range|single-block-content] [--paint-order captured|positioned-siblings] [--native-controls captured|sampled]');
  if (options['text-bounds'] !== undefined && !['tight-range', 'single-block-content'].includes(options['text-bounds'])) throw new Error('--text-bounds must be tight-range or single-block-content');
  if (options['paint-order'] !== undefined && !['captured', 'positioned-siblings'].includes(options['paint-order'])) throw new Error('--paint-order must be captured or positioned-siblings');
  if (options['native-controls'] !== undefined && !['captured', 'sampled'].includes(options['native-controls'])) throw new Error('--native-controls must be captured or sampled');
  if (options['inline-text'] !== undefined && !['captured', 'uniform-run'].includes(options['inline-text'])) throw new Error('--inline-text must be captured or uniform-run');
  let totalBytes = 0;
  async function load(filename) { const info = await stat(filename); if (!info.isFile() || info.size > 25 * 1024 * 1024 || (totalBytes += info.size) > 160 * 1024 * 1024) throw new Error('Capture input byte budget exceeded'); return JSON.parse(await readFile(filename, 'utf8')); }
  const input = path.resolve(options.input), output = path.resolve(options.output); const info = await stat(input);
  let files;
  if (info.isDirectory()) {
    if (options.index) { const index = await load(options.index); if (!Array.isArray(index)) throw new Error('Index must be an array'); files = index.map(scene => { if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(scene.id)) throw new Error('Unsafe capture index id'); return path.join(input, `${scene.id}.json`); }); }
    else files = (await readdir(input)).filter(name => name.endsWith('.json')).sort().map(name => path.join(input, name));
  } else files = [input];
  if (!files.length || files.length > 1000) throw new Error('Expected 1 to 1000 capture files');
  const resources = new Map();
  if (options['assets-directory']) {
    const resourceRoot = await realpath(options['assets-directory']); let resourceBytes = 0;
    for (const entry of await readdir(resourceRoot, { withFileTypes: true })) {
      const mimeType = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[path.extname(entry.name).toLowerCase()];
      if (!entry.isFile() || !mimeType) continue;
      const resourcePath = await realpath(path.join(resourceRoot, entry.name)); const relative = path.relative(resourceRoot, resourcePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Image resource escapes explicit directory');
      const info = await stat(resourcePath); if (info.size > 20 * 1024 * 1024 || (resourceBytes += info.size) > 80 * 1024 * 1024) throw new Error('Image resource byte budget exceeded');
      resources.set(entry.name, `data:${mimeType};base64,${(await readFile(resourcePath)).toString('base64')}`);
    }
  }
  const captures = [];
  for (const file of files) {
    let capture = await load(file);
    if (options['html-directory']) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(capture.id)) throw new Error('Unsafe capture id');
      const htmlRoot = await realpath(options['html-directory']); const htmlPath = await realpath(path.join(htmlRoot, `${capture.id}.html`)); const relative = path.relative(htmlRoot, htmlPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Archived HTML escapes explicit directory');
      const htmlInfo = await stat(htmlPath); if (htmlInfo.size > 25 * 1024 * 1024) throw new Error('Archived HTML byte budget exceeded');
      const html = await readFile(htmlPath, 'utf8');
      capture = options['native-controls'] === 'sampled' ? enrichFromArchivedHTML(capture, html, resources, { nativeControls: true }) : enrichFromArchivedHTML(capture, html, resources);
    }
    captures.push(capture);
  }
  const links = options.links ? await load(options.links) : null;
  let { spec, manifest } = adaptCaptures(captures, { id: options.id, name: options.name, revision: options.revision, capturedAt: options['captured-at'], links: Array.isArray(links) ? links : links?.links, flowStarts: options['flow-starts']?.split(','), fallbackFont: options['fallback-family'] ? { family: options['fallback-family'], style: 'Regular' } : undefined, textBounds: options['text-bounds'], paintOrder: options['paint-order'], nativeControls: options['native-controls'], inlineText: options['inline-text'] });
  if (options['design-system']) { const enriched = enrichDesignSystem(spec); spec = enriched.spec; manifest.designSystem = enriched.summary; manifest.nodeCount = spec.nodes.length; }
  const data = `${JSON.stringify(spec)}\n`; manifest.specBytes = Buffer.byteLength(data); manifest.transportLimitBytes = 7 * 1024 * 1024;
  if (manifest.specBytes > manifest.transportLimitBytes) throw new Error('DesignSpec exceeds 7 MiB transport budget. Reduce scenes/assets before importing; cross-scene links require the complete target set.');
  manifest.specSha256 = createHash('sha256').update(data).digest('hex');
  // New directory only: never overwrite a previous capture or a user-edited spec.
  await mkdir(path.dirname(output), { recursive: true }); await mkdir(output);
  await writeFile(path.join(output, 'design-spec.json'), data, { encoding: 'utf8', flag: 'wx' });
  await writeFile(path.join(output, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { output, sceneCount: manifest.sceneCount, nodeCount: manifest.nodeCount, reactionCount: manifest.reactionCount, warnings: manifest.warnings.length, specSha256: manifest.specSha256, ...(manifest.textBounds ? { textBounds: { mode: manifest.textBounds.mode, expandedCount: manifest.textBounds.expandedCount } } : {}), ...(manifest.paintOrder ? { paintOrder: { mode: manifest.paintOrder.mode, changedParentCount: manifest.paintOrder.changedParentCount } } : {}), ...(manifest.nativeControls ? { nativeControls: { mode: manifest.nativeControls.mode, progressFillCount: manifest.nativeControls.progressFillCount, closedDetailsCount: manifest.nativeControls.closedDetailsCount, hiddenNodeCount: manifest.nativeControls.hiddenNodeCount, nativeVisual: manifest.nativeControls.nativeVisual } } : {}), verification: manifest.verification };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  captureCommand(process.argv.slice(2)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
