import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { deferIdleCloseForDesignRequest } from '../relay/bridge-server.mjs';
import { DESIGN_ACTIONS } from '../design/commands.mjs';
import { MAX_DESIGN_TIMEOUT_MS } from '../design/request-timeout.mjs';

function fixture(command = 'scope_design_apply', duration = 120_000) {
  const connection = { authenticated: true, ready: true, connectionId: 'connection-original', lastSeen: 1_000,
    metadata: { sessionId: 'session-original', fileIdentity: 'figma-file:test' }, socket: { readyState: WebSocket.OPEN } };
  const entry = { connection, connectionId: connection.connectionId, sessionId: connection.metadata.sessionId,
    fileIdentity: connection.metadata.fileIdentity, command, startedAt: 1_000, deadlineAt: 1_000 + duration };
  return { connection, entry, pending: new Map([['request-original', entry]]) };
}

test('authenticated same-connection DESIGN work defers idle close only before its original deadline', () => {
  for (const command of Object.keys(DESIGN_ACTIONS)) {
    const { connection, pending } = fixture(command);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), true, command);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 120_999), true, command);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 121_000), false, command);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 121_001), false, command);
    assert.equal(connection.lastSeen, 1_000, 'work must not refresh the heartbeat or renew its lease');
  }
});

test('ordinary requests, unauthenticated clients and connections that are not ready or open get no idle exemption', () => {
  for (const command of ['status', 'read_document', 'scope_read_node', 'scope_create_frame', 'scope_set_prototype', 'scope_design_unknown']) {
    const { connection, pending } = fixture(command);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false, command);
  }
  for (const mutate of [connection => { connection.authenticated = false; }, connection => { connection.ready = false; },
    connection => { connection.socket.readyState = WebSocket.CLOSING; }, connection => { connection.metadata = null; }]) {
    const { connection, pending } = fixture(); mutate(connection);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
  }
});

test('pending DESIGN work cannot defer another connection, session or file even when its deadline is valid', () => {
  for (const mutate of [entry => { entry.connection = { ...entry.connection }; }, entry => { entry.connectionId = 'other-connection'; },
    entry => { entry.sessionId = 'other-session'; }, entry => { entry.fileIdentity = 'figma-file:other'; }]) {
    const { connection, entry, pending } = fixture(); mutate(entry);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
  }
});

test('DESIGN idle deferral has a finite maximum and rejects malformed or future-started deadlines', () => {
  const valid = fixture('scope_design_audit', MAX_DESIGN_TIMEOUT_MS);
  assert.equal(deferIdleCloseForDesignRequest(valid.connection, valid.pending, 180_999), true);
  assert.equal(deferIdleCloseForDesignRequest(valid.connection, valid.pending, 181_000), false);
  for (const duration of [0, -1, Infinity, NaN, MAX_DESIGN_TIMEOUT_MS + 1]) {
    const { connection, pending } = fixture('scope_design_audit', duration);
    assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
  }
  const { connection, entry, pending } = fixture();
  entry.startedAt = 36_002; entry.deadlineAt = 120_000;
  assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
  assert.equal(deferIdleCloseForDesignRequest(connection, pending, NaN), false);
});

test('timeout, completion or removal of pending DESIGN work immediately restores normal idle closing', () => {
  const { connection, pending } = fixture();
  pending.set('ordinary-request', { ...pending.get('request-original'), command: 'status' });
  assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), true);
  pending.delete('request-original');
  assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
  pending.clear();
  assert.equal(deferIdleCloseForDesignRequest(connection, pending, 36_001), false);
});
