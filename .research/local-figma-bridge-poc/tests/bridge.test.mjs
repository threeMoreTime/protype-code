import assert from 'node:assert/strict';
import { test } from 'node:test';
import WebSocket from 'ws';
import { Bridge } from '../mcp/bridge.mjs';

const waitFor = (socket, event) => new Promise((resolve, reject) => {
  socket.once(event, (...args) => resolve(args));
  socket.once('error', reject);
});

async function fixture(t) {
  const bridge = new Bridge({ host: '127.0.0.1', port: 0, token: 'test-token', timeoutMs: 100 });
  await bridge.start();
  t.after(async () => bridge.close());
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
  await waitFor(socket, 'open');
  socket.send(JSON.stringify({ type: 'hello', token: 'test-token', sessionId: 'session-a' }));
  const [hello] = await waitFor(socket, 'message');
  assert.equal(JSON.parse(hello.toString()).type, 'hello_ack');
  t.after(() => socket.close());
  return { bridge, socket };
}

test('binds only to IPv4 loopback', async t => {
  const { bridge } = await fixture(t);
  assert.equal(bridge.address.address, '127.0.0.1');
});

test('correlates a response with requestId and sessionId', async t => {
  const { bridge, socket } = await fixture(t);
  socket.once('message', raw => {
    const request = JSON.parse(raw.toString());
    assert.equal(request.type, 'command');
    socket.send(JSON.stringify({ type: 'response', sessionId: request.sessionId, requestId: request.requestId, ok: true, result: { page: 'test' } }));
  });
  assert.deepEqual(await bridge.request('figma_status', {}), { page: 'test' });
  assert.equal(bridge.pending.size, 0);
});

test('rejects stale response and times out instead of hanging', async t => {
  const { bridge, socket } = await fixture(t);
  socket.once('message', raw => {
    const request = JSON.parse(raw.toString());
    socket.send(JSON.stringify({ type: 'response', sessionId: 'wrong-session', requestId: request.requestId, ok: true, result: {} }));
  });
  await assert.rejects(bridge.request('figma_status', {}), /TIMEOUT/);
  assert.equal(bridge.pending.size, 0);
});

test('rejects a pending request on disconnect', async t => {
  const { bridge, socket } = await fixture(t);
  socket.once('message', () => socket.close());
  await assert.rejects(bridge.request('figma_status', {}), /PLUGIN_DISCONNECTED/);
  assert.equal(bridge.pending.size, 0);
});

test('rejects unauthenticated and second plugin connections', async t => {
  const { bridge } = await fixture(t);
  const bad = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
  await waitFor(bad, 'open');
  bad.send(JSON.stringify({ type: 'hello', token: 'bad', sessionId: 'intruder' }));
  const [code] = await waitFor(bad, 'close');
  assert.equal(code, 1008);
  const second = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
  await waitFor(second, 'open');
  second.send(JSON.stringify({ type: 'hello', token: 'test-token', sessionId: 'second' }));
  const [secondCode] = await waitFor(second, 'close');
  assert.equal(secondCode, 1008);
});
