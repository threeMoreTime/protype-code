import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { captureURL } from '../../../prototype/capture.mjs';
import { captureDOM } from '../../../.research/local-figma-bridge-poc/capture/dom-capture.mjs';
import { chromium } from 'playwright';

test('Chromium capture reads geometry and excludes SVG secrets and input values', async () => {
  let posted = false;
  const server = createServer((req, res) => {
    if (req.method === 'POST') posted = true;
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body style="margin:0"><button data-prototype-id="submit" style="width:150px;height:48px">提交</button><input value="PRIVATE_INPUT" placeholder="邮箱"><svg width="100" height="100"><text data-capture-private>SVG_SECRET</text><path d="M0 0L50 50" stroke="currentColor"/></svg><script>fetch("/write",{method:"POST"})</script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await captureURL({ url: `http://127.0.0.1:${server.address().port}/`, pageId: 'request' });
    assert.ok(result.snapshots[0].elementMap.submit);
    assert.doesNotMatch(JSON.stringify(result), /SVG_SECRET|PRIVATE_INPUT/);
    assert.equal(posted, false);
    const button = result.snapshots[0].capture.root.children.find(n => n.tag === 'button');
    assert.equal(button.rect.width, 150);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('selected options respect private options and optgroups even when input values are opted in', async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PROTOTYPE_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PROTOTYPE_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'] } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent('<select id="private-option"><option data-capture-private selected>PRIVATE_OPTION</option></select><select id="private-group"><optgroup data-capture-private label="Private"><option selected>PRIVATE_GROUP</option></optgroup></select><select id="public"><option selected>Public label</option></select><select id="private-select" data-capture-private><option>PRIVATE_SELECT</option></select>');
    const before = await page.locator('body').innerHTML();
    for (const includeInputValues of [false, true]) {
      const result = await page.evaluate(captureDOM, { includeInputValues, redactions: [{ from: 'Public', to: 'Visible' }] });
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE_OPTION|PRIVATE_GROUP|PRIVATE_SELECT/);
      const controls = result.root.children.filter(n => n.tag === 'select');
      assert.deepEqual(controls.map(n => n.attrs.value), ['', '', 'Visible label']);
      assert.deepEqual(controls.map(n => n.attrs.valueCaptured), [false, false, true]);
    }
    assert.equal(await page.locator('body').innerHTML(), before, 'capture must not remove source options');
  } finally { await browser.close(); }
});
