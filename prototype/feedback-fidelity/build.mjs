import { createHash, randomBytes } from 'node:crypto';
import { lstat, readFile, realpath, rename, rmdir, unlink, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build as bundle } from '../../.research/local-figma-bridge-poc/node_modules/esbuild/lib/main.js';
import { assertSourceImportAllowed, assertSourceTextSafe, extractTailwindSettings, isWithin } from './source-policy.mjs';
import { applyFeedbackSourceRepairs } from './source-repairs.mjs';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultEntry = fileURLToPath(new URL('./entry.tsx', import.meta.url));
const fail = (code, details) => { const error = new Error(code); error.code = code; if (details) error.details = details; throw error; };
const hash = value => createHash('sha256').update(value).digest('hex');
const exists = async value => { try { await lstat(value); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const normalize = value => path.resolve(value).replaceAll('\\', '/');
const escaped = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const remote = value => /(?:url\(\s*["']?\s*|@import\s+["'])\s*(?:https?:)?\/\//i.test(value);

export function assembleOfflineFeedbackHTML({ script, css = '', nonce, title = '反馈列表 · 本地 Mock' } = {}) {
  if (typeof nonce !== 'string' || !/^[A-Za-z0-9_+\/-]{16,128}={0,2}$/.test(nonce)) fail('FIDELITY_NONCE_INVALID');
  if (typeof script !== 'string' || !script.trim() || typeof css !== 'string') fail('FIDELITY_HTML_INPUT_INVALID');
  // AntD 5.7 static message/Modal holders have a separate ConfigProvider that
  // cannot inherit csp. Tag only style elements created by this trusted bundle;
  // keep the nonce policy rather than allowing arbitrary inline styles.
  const bootstrap = `(()=>{window.__FEEDBACK_STYLE_NONCE__=${JSON.stringify(nonce)};const createElement=document.createElement;document.createElement=function(tagName,...options){const element=createElement.call(this,tagName,...options);if(String(tagName).toLowerCase()==='style')element.nonce=window.__FEEDBACK_STYLE_NONCE__;return element};window.__FEEDBACK_NETWORK_BLOCKS__=[];const block=(kind)=>{window.__FEEDBACK_NETWORK_BLOCKS__.push(kind);throw new Error('OFFLINE_NETWORK_BLOCKED')};window.fetch=()=>{try{block('fetch')}catch(error){return Promise.reject(error)}};window.XMLHttpRequest=class{constructor(){block('xhr')}};window.WebSocket=class{constructor(){block('websocket')}};window.EventSource=class{constructor(){block('eventsource')}};try{navigator.sendBeacon=()=>{window.__FEEDBACK_NETWORK_BLOCKS__.push('beacon');return false}}catch(_){};})();`;
  const executable = `${bootstrap}\n${script}`.replace(/<\/script/gi, '<\\/script');
  const scriptHash = createHash('sha256').update(executable).digest('base64');
  const policy = `default-src 'none'; base-uri 'none'; object-src 'none'; connect-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'nonce-${nonce}'; img-src data: blob:; media-src data: blob:; font-src data:; frame-src 'none'; form-action 'none'; worker-src 'none'`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>${escaped(title)}</title><style nonce="${nonce}">${css.replace(/<\/style/gi, '\\3c /style')}</style></head><body><div id="root"></div><noscript>请启用 JavaScript 查看本地原型。</noscript><script>${executable}</script></body></html>`;
}

function safeLabel(file, sourceRoot) {
  if (isWithin(path.join(sourceRoot, 'node_modules'), file)) return `<dependency>/${path.relative(path.join(sourceRoot, 'node_modules'), file).replaceAll('\\', '/')}`;
  if (isWithin(sourceRoot, file)) return `<source>/${path.relative(sourceRoot, file).replaceAll('\\', '/')}`;
  if (isWithin(path.join(workspaceRoot, 'prototype', 'feedback-fidelity'), file)) return `<prototype>/${path.relative(path.join(workspaceRoot, 'prototype', 'feedback-fidelity'), file).replaceAll('\\', '/')}`;
  return '<local-entry-or-mock>';
}

async function writeOutput(out, html, report) {
  const parent = await realpath(path.dirname(out));
  if (!isWithin(workspaceRoot, parent)) fail('FIDELITY_OUTPUT_OUTSIDE_WORKSPACE');
  const temporary = await mkdtemp(path.join(parent, `.${path.basename(out)}.build-`));
  if (path.dirname(temporary) !== parent || !path.basename(temporary).startsWith(`.${path.basename(out)}.build-`)) fail('FIDELITY_TEMP_SCOPE_INVALID');
  try {
    await writeFile(path.join(temporary, 'index.html'), html, { encoding: 'utf8', flag: 'wx' });
    await writeFile(path.join(temporary, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    if (await exists(out)) fail('FIDELITY_OUTPUT_EXISTS');
    await rename(temporary, out);
  } finally {
    if (await exists(temporary)) {
      // Only remove our two known staging files, never another actor's files.
      for (const file of ['index.html', 'build-report.json']) { try { await unlink(path.join(temporary, file)); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      try { await rmdir(temporary); } catch (error) { if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) throw error; }
    }
  }
}

/** Build a local source-backed PC reference. It never imports a source app/bootstrap/config or environment file. */
export async function buildSourceFeedbackHTML({ sourceRoot, device, entryPath = defaultEntry, aliases, out } = {}) {
  if (device === undefined) fail('FIDELITY_DEVICE_CONFIRMATION_REQUIRED');
  if (device !== 'desktop') fail('FIDELITY_DESKTOP_ONLY');
  if (out !== undefined) {
    if (typeof out !== 'string' || !out) fail('FIDELITY_OUTPUT_INVALID');
    out = path.resolve(out);
    if (!isWithin(workspaceRoot, out) || out === path.resolve(workspaceRoot)) fail('FIDELITY_OUTPUT_OUTSIDE_WORKSPACE');
    if (await exists(out)) fail('FIDELITY_OUTPUT_EXISTS');
  }
  if (typeof sourceRoot !== 'string' || !sourceRoot || typeof entryPath !== 'string' || !entryPath) fail('FIDELITY_INPUT_INVALID');
  try { sourceRoot = await realpath(sourceRoot); entryPath = await realpath(entryPath); }
  catch { fail('FIDELITY_SOURCE_UNAVAILABLE'); }
  const sourceSrc = path.join(sourceRoot, 'src'), sourceModules = path.join(sourceRoot, 'node_modules');
  if (!isWithin(sourceSrc, entryPath) && !isWithin(path.join(workspaceRoot, 'prototype', 'feedback-fidelity'), entryPath)) fail('FIDELITY_ENTRY_OUTSIDE_SCOPE');
  if (aliases === undefined) {
    try { const { createSourceMockAliases } = await import('./mocks/aliases.mjs'); aliases = createSourceMockAliases(sourceRoot); }
    catch { fail('FIDELITY_MOCK_ALIASES_UNAVAILABLE'); }
  }
  if (!(aliases instanceof Map)) fail('FIDELITY_MOCK_ALIASES_INVALID');
  const aliasMap = new Map(), aliasRoots = [];
  for (const [from, to] of aliases) {
    if (typeof from !== 'string' || !from || typeof to !== 'string' || !path.isAbsolute(to) || !isWithin(workspaceRoot, to)) fail('FIDELITY_MOCK_ALIASES_INVALID');
    const target = await realpath(to).catch(() => fail('FIDELITY_MOCK_TARGET_UNAVAILABLE'));
    if (!isWithin(workspaceRoot, target)) fail('FIDELITY_MOCK_ALIASES_INVALID');
    aliasMap.set(path.isAbsolute(from) ? normalize(from).toLowerCase() : from, target); aliasRoots.push(path.dirname(target));
  }
  const policyOptions = { sourceRoot, workspaceRoot, aliasRoots };
  assertSourceImportAllowed(entryPath, policyOptions);
  const sourceRequire = createRequire(path.join(sourceRoot, 'package.json'));
  const inputs = new Map(), assets = new Set(), localUIRepairs = new Set(); let applicationBytes = 0, compiler;
  async function readApplication(file) {
    assertSourceImportAllowed(file, policyOptions);
    const actual = await realpath(file);
    assertSourceImportAllowed(actual, policyOptions);
    let contents = await readFile(actual, 'utf8');
    const repaired = applyFeedbackSourceRepairs({ sourceRoot, filename: actual, source: contents });
    contents = repaired.source;
    for (const repair of repaired.repairs) localUIRepairs.add(repair);
    if (!inputs.has(actual)) { applicationBytes += Buffer.byteLength(contents); inputs.set(actual, contents); }
    if (inputs.size > 350 || applicationBytes > 10 * 1024 * 1024) fail('FIDELITY_APPLICATION_BUDGET_EXCEEDED');
    return contents;
  }
  function getCompiler() {
    if (compiler) return compiler;
    try {
      const less = sourceRequire(path.join(sourceModules, '@rsbuild', 'plugin-less', 'compiled', 'less', 'index.js'));
      const postcss = sourceRequire('postcss'), tailwind = sourceRequire('tailwindcss');
      compiler = { less, postcss, tailwind }; return compiler;
    } catch { fail('FIDELITY_STYLE_TOOLCHAIN_UNAVAILABLE'); }
  }
  async function compileLess(file, contents) {
    if (!contents.trim()) return '';
    if (remote(contents)) fail('FIDELITY_REMOTE_STYLE_ASSET_FORBIDDEN');
    const { less } = getCompiler();
    class RestrictedFileManager extends less.FileManager {
      supports() { return true; }
      supportsSync() { return false; }
      async loadFile(filename, currentDirectory) {
        if (/^(?:https?:|\/\/|data:)/i.test(filename)) fail('FIDELITY_REMOTE_STYLE_ASSET_FORBIDDEN');
        filename = filename.replace(/^~/, '');
        const candidates = path.isAbsolute(filename) ? [filename] : [path.resolve(currentDirectory, filename), path.resolve(sourceModules, filename)];
        for (const candidate of candidates.flatMap(candidate => [candidate, `${candidate}.less`, `${candidate}.css`, path.join(candidate, 'index.less')])) {
          assertSourceImportAllowed(candidate, { ...policyOptions, kind: 'style' });
          if (!await exists(candidate) || (await lstat(candidate)).isDirectory()) continue;
          const actual = await realpath(candidate); assertSourceImportAllowed(actual, { ...policyOptions, kind: 'style' });
          return { contents: await readFile(actual, 'utf8'), filename: actual };
        }
        fail('FIDELITY_LESS_IMPORT_UNRESOLVED');
      }
    }
    try {
      const result = await less.render(contents, { filename: file, javascriptEnabled: false, plugins: [{ install(_less, manager) { manager.addFileManager(new RestrictedFileManager()); } }] });
      if (remote(result.css)) fail('FIDELITY_REMOTE_STYLE_ASSET_FORBIDDEN');
      return result.css;
    } catch (error) { if (error.code?.startsWith('FIDELITY_')) throw error; fail('FIDELITY_LESS_COMPILE_FAILED'); }
  }
  const plugin = {
    name: 'source-feedback-boundary',
    setup(context) {
      context.onResolve({ filter: /.*/ }, async args => {
        if (args.pluginData?.fidelityResolved) return;
        if (args.kind === 'url-token' && /^(?:data:(?:image\/|font\/|application\/(?:font-|x-font-))|#)/i.test(args.path)) return { path: args.path, external: true };
        let specifier = args.path;
        const aliasKey = path.isAbsolute(specifier) ? normalize(specifier).toLowerCase() : specifier;
        if (aliasMap.has(aliasKey)) return { path: aliasMap.get(aliasKey) };
        assertSourceImportAllowed(specifier, policyOptions);
        if (specifier.startsWith('@/')) specifier = path.resolve(sourceSrc, specifier.slice(2));
        const result = await context.resolve(specifier, { importer: args.importer, resolveDir: args.resolveDir || path.dirname(entryPath), kind: args.kind, pluginData: { fidelityResolved: true } });
        if (result.errors?.length || !result.path) return { errors: [{ text: 'FIDELITY_IMPORT_UNRESOLVED' }] };
        const resolvedAlias = aliasMap.get(normalize(result.path).toLowerCase());
        if (resolvedAlias) return { path: resolvedAlias };
        assertSourceImportAllowed(result.path, { ...policyOptions, kind: /\.(?:css|less)$/.test(result.path) ? 'style' : 'script' });
        return { path: result.path, namespace: result.namespace || 'file' };
      });
      context.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
        if (args.path.includes(`${path.sep}node_modules${path.sep}`)) return;
        const contents = await readApplication(args.path);
        assertSourceTextSafe(contents, { filename: args.path });
        const extension = path.extname(args.path).slice(1);
        return { contents, loader: ({ mjs: 'js', cjs: 'js' })[extension] || extension, resolveDir: path.dirname(args.path) };
      });
      context.onLoad({ filter: /\.less$/ }, async args => {
        assertSourceImportAllowed(args.path, { ...policyOptions, kind: 'style' });
        const contents = await readFile(args.path, 'utf8');
        return { contents: await compileLess(args.path, contents), loader: args.path.endsWith('.module.less') ? 'local-css' : 'css', resolveDir: path.dirname(args.path) };
      });
      context.onLoad({ filter: /\.(?:png|jpe?g|gif|webp|svg|woff2?|ttf|eot)$/i }, async args => {
        assertSourceImportAllowed(args.path, { ...policyOptions, kind: 'style' }); assets.add(args.path);
        return { contents: await readFile(args.path), loader: 'dataurl' };
      });
    },
  };
  let result;
  try {
    result = await bundle({ absWorkingDir: workspaceRoot, entryPoints: [entryPath], outfile: path.join(workspaceRoot, 'feedback-virtual.js'), write: false, bundle: true,
      platform: 'browser', format: 'iife', target: ['chrome110'], nodePaths: [sourceModules], jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
      minify: true, legalComments: 'inline', sourcemap: false, metafile: true, logLevel: 'silent', plugins: [plugin],
      loader: { '.css': 'css', '.module.css': 'local-css' },
    });
  } catch (error) {
    const diagnostic = error.errors?.map(value => value.text).find(value => /^FIDELITY_[A-Z_]+$/.test(value));
    fail(diagnostic || error.code?.startsWith('FIDELITY_') && error.code || 'FIDELITY_BUNDLE_FAILED');
  }
  const globalPath = path.join(sourceSrc, 'App.less');
  const actualGlobalPath = await realpath(globalPath).catch(() => fail('FIDELITY_GLOBAL_STYLES_UNAVAILABLE'));
  assertSourceImportAllowed(actualGlobalPath, { ...policyOptions, kind: 'style' });
  const globalSource = await readFile(actualGlobalPath, 'utf8').catch(() => fail('FIDELITY_GLOBAL_STYLES_UNAVAILABLE'));
  const globalCss = await compileLess(actualGlobalPath, globalSource);
  let bundledGlobalCss = '';
  if (globalCss.trim()) {
    try {
      const styles = await bundle({ absWorkingDir: workspaceRoot,
        stdin: { contents: globalCss, loader: 'css', sourcefile: 'source-global.css', resolveDir: path.dirname(actualGlobalPath) },
        outfile: path.join(workspaceRoot, 'feedback-global-virtual.css'), write: false, bundle: true, minify: true, legalComments: 'inline',
        nodePaths: [sourceModules], logLevel: 'silent', plugins: [plugin],
      });
      bundledGlobalCss = styles.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n');
    } catch (error) {
      const diagnostic = error.errors?.map(value => value.text).find(value => /^FIDELITY_[A-Z_]+$/.test(value));
      fail(diagnostic || 'FIDELITY_GLOBAL_STYLE_BUNDLE_FAILED');
    }
  }
  let css = `${bundledGlobalCss}\n${result.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n')}`;
  if (/@tailwind\s/.test(css)) {
    const configPath = path.join(sourceRoot, 'tailwind.config.js');
    const actualConfigPath = await realpath(configPath).catch(() => fail('FIDELITY_TAILWIND_CONFIG_UNAVAILABLE'));
    if (normalize(actualConfigPath).toLowerCase() !== normalize(configPath).toLowerCase()) fail('FIDELITY_TAILWIND_CONFIG_UNSUPPORTED');
    const configText = await readFile(actualConfigPath, 'utf8').catch(() => fail('FIDELITY_TAILWIND_CONFIG_UNAVAILABLE'));
    const { settings, utilities } = extractTailwindSettings(configText), { postcss, tailwind } = getCompiler();
    const content = [];
    for (const input of Object.keys(result.metafile.inputs)) {
      const file = path.resolve(workspaceRoot, input);
      if (/\.[cm]?[jt]sx?$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`)) content.push({ raw: inputs.get(file) ?? await readApplication(file), extension: path.extname(file).slice(1) });
    }
    try { css = (await postcss([tailwind({ ...settings, content, plugins: utilities.map(utility => ({ addUtilities }) => addUtilities(utility)) })]).process(css, { from: undefined })).css; }
    catch { fail('FIDELITY_TAILWIND_COMPILE_FAILED'); }
  }
  if (remote(css) || /@import\s/.test(css)) fail('FIDELITY_UNRESOLVED_STYLE_ASSET');
  const script = result.outputFiles.find(file => file.path.endsWith('.js'))?.text;
  if (!script || /process\.env\.(?!NODE_ENV\b)|import\.meta\.env|REACT_APP_(?:SIGN|SECRET|TOKEN)|https?:\/\/(?:192\.168\.|10\.|127\.)/.test(script)
    || script.includes(normalize(sourceRoot)) || script.includes(sourceRoot)) fail('FIDELITY_UNSAFE_BUNDLE');
  const nonce = randomBytes(18).toString('base64url');
  const html = assembleOfflineFeedbackHTML({ script, css, nonce });
  const report = { schemaVersion: 'source-feedback-build/1', device: 'desktop', sourceMode: 'ORIGINAL_PAGE_COMPONENTS_LOCAL_MOCK_TRANSPORT',
    environmentFilesRead: false, appBootstrapImported: false, executableSourceConfigImported: false, networkTransport: 'LOCAL_MOCK_ONLY', localUIRepairs: [...localUIRepairs].sort(),
    inputCount: Object.keys(result.metafile.inputs).length, applicationSourceCount: inputs.size, inlineAssetCount: assets.size, cssBytes: Buffer.byteLength(css), scriptBytes: Buffer.byteLength(script),
    inputModules: Object.keys(result.metafile.inputs).map(file => safeLabel(path.resolve(workspaceRoot, file), sourceRoot)).filter(value => !value.startsWith('<dependency>/')),
    cssSha256: hash(css), scriptSha256: hash(script), htmlSha256: hash(html), outputFiles: ['index.html', 'build-report.json'],
    verification: { build: 'PASS', liveReferencePixelComparison: 'NOT RUN', interactiveBrowser: 'NOT RUN', realFigma: 'NOT RUN' },
  };
  if (out !== undefined) await writeOutput(out, html, report);
  return { html, report };
}
