import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { captureURL } from '../../../prototype/capture.mjs';

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
