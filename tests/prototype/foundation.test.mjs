import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { deflateSync } from 'node:zlib';
import { randomBytes, createHash } from 'node:crypto';
import { validatePrototype, digest } from '../../prototype/core/model.mjs';
import { coverageReport } from '../../prototype/core/coverage.mjs';
import { isBase64 } from '../../.research/local-figma-bridge-poc/design/base64.mjs';
import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';
import { validateDesignPng } from '../../.research/local-figma-bridge-poc/mcp/server.mjs';
import { crc32 } from '../../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { captureDOM } from '../../.research/local-figma-bridge-poc/capture/dom-capture.mjs';
import { adaptDOMCaptures } from '../../.research/local-figma-bridge-poc/capture/generic.mjs';
import { minimal, capture } from './fixtures.mjs';

test('model validates cross-domain semantics and rejects dangling references and broken flows', () => {
  const model = validatePrototype(minimal());
  assert.equal(coverageReport(model).counts.unresolved, 0);
  for (const mutate of [m => m.actions[0].targetState = 'missing', m => m.pages[0].elements[0].requirementIds = ['missing'], m => m.flows[0].actionIds = ['missing'], m => m.pages.push(m.pages[0])]) {
    const bad = structuredClone(model); mutate(bad); assert.throws(() => validatePrototype(bad));
  }
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
  model.requirements.push({ id: 'r2', text: '未支持的支付', evidence: [] });
  assert.equal(coverageReport(model).status, 'NEEDS_REVIEW');
});

test('large valid PNG passes both image paths without regexp stack exhaustion', () => {
  const width = 1024, height = 1024, row = width * 4 + 1, pixels = randomBytes(height * row);
  for (let y = 0; y < height; y++) pixels[y * row] = 0;
  const chunk = (name, data) => { const type = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4); size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([size, type, data, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
  const base64 = png.toString('base64'); assert.ok(base64.length > 5e6); assert.ok(isBase64(base64));
  const spec = adaptDOMCaptures([capture()]).spec; spec.assets = [{ key: 'large', mimeType: 'image/png', dataBase64: base64 }];
  assert.doesNotThrow(() => validateDesignSpec(spec));
  assert.equal(validateDesignPng({ bytesBase64: base64, sha256: createHash('sha256').update(png).digest('hex') }).pixelWidth, width);
  for (const bad of ['', 'a', '=AAA', 'AA=A', '====', 'AA A', `${base64.slice(0, -4)}@@@@`]) assert.equal(isBase64(bad), false);
});

test('SVG privacy applies to nested data and root ancestry without modifying the page', () => {
  const { window, document } = parseHTML('<html><body><svg aria-label="chart"><g data-capture-private><text>private-value</text></g><text title="Alice">Alice &amp; Bob</text><path stroke="currentColor" d="M0 0L10 10"/><script>secret()</script><image href="https://example.com/private"/></svg><div data-capture-private><svg id="private-root"></svg></div></body></html>');
  const before = document.toString(), saved = new Map();
  const globals = { document, Element: window.Element, Node: window.Node, innerWidth: 100, innerHeight: 100,
    XMLSerializer: class { serializeToString(node) { return node.outerHTML; } },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', color: 'rgb(0, 0, 0)' }),
  };
  for (const [key, value] of Object.entries(globals)) { saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
  try {
    for (const node of document.querySelectorAll('*')) node.getBoundingClientRect = () => ({ x: 0, y: 0, width: 100, height: 100 });
    const result = captureDOM({ rootSelector: 'svg', redactions: [{ from: 'Alice', to: '<redacted>' }] });
    assert.doesNotMatch(result.root.svg, /private-value|Alice|secret|https:/);
    assert.match(result.root.svg, /&lt;redacted&gt;/); assert.match(result.root.svg, /rgb\(0, 0, 0\)/);
    assert.equal(document.toString(), before);
    assert.throws(() => captureDOM({ rootSelector: '#private-root' }), /private/);
  } finally { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
});

test('generic capture does not implicitly apply legacy rules or accept unversioned evidence', () => {
  assert.equal(adaptDOMCaptures([capture()]).spec.source.adapter, 'dom-capture-1.0');
  const legacy = capture(); delete legacy.captureVersion;
  assert.throws(() => adaptDOMCaptures([legacy]), /captureVersion/);
  const forged = capture(); forged.root.styleEvidence = {};
  assert.throws(() => adaptDOMCaptures([forged]), /explicit adapter/);
  const cyclic = capture(); cyclic.root.children.push(cyclic.root);
  assert.throws(() => adaptDOMCaptures([cyclic]), /Invalid capture/);
});
