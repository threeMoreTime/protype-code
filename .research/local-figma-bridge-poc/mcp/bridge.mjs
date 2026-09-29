import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

export class Bridge {
  constructor({ host = '127.0.0.1', port = 3056, token, timeoutMs = 15000, log = () => {} }) {
    if (host !== '127.0.0.1') throw new Error('LOOPBACK_ONLY');
    if (!token) throw new Error('AUTH_TOKEN_REQUIRED');
    this.host = host;
    this.requestedPort = port;
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.log = log;
    this.pending = new Map();
    this.client = null;
    this.sessionId = null;
    this.connectionId = null;
    this.reconnectCount = 0;
  }

  async start() {
    this.server = new WebSocketServer({ host: this.host, port: this.requestedPort, maxPayload: 16 * 1024 * 1024 });
    this.server.on('connection', socket => this.#onConnection(socket));
    await new Promise((resolve, reject) => {
      this.server.once('listening', resolve);
      this.server.once('error', reject);
    });
    this.address = this.server.address();
    this.port = this.address.port;
    this.log({ event: 'listening', address: this.address.address, port: this.port });
    return this.address;
  }

  #onConnection(socket) {
    let authenticated = false;
    const authTimer = setTimeout(() => socket.close(1008, 'AUTH_TIMEOUT'), 3000);
    socket.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString()); }
      catch { socket.close(1008, 'BAD_JSON'); return; }
      if (!authenticated) {
        if (message.type !== 'hello' || message.token !== this.token || !/^[\w-]{8,100}$/.test(message.sessionId || '') || this.client) {
          socket.close(1008, 'UNAUTHORIZED');
          return;
        }
        clearTimeout(authTimer);
        authenticated = true;
        this.client = socket;
        this.sessionId = message.sessionId;
        this.connectionId = randomUUID();
        if (this.everConnected) this.reconnectCount++;
        this.everConnected = true;
        socket.send(JSON.stringify({ type: 'hello_ack', sessionId: this.sessionId, connectionId: this.connectionId }));
        this.log({ event: 'connected', sessionId: this.sessionId, connectionId: this.connectionId, reconnectCount: this.reconnectCount });
        return;
      }
      if (message.type !== 'response' || message.sessionId !== this.sessionId || typeof message.requestId !== 'string') return;
      const pending = this.pending.get(message.requestId);
      if (!pending) {
        this.log({ event: 'stale_response', requestId: message.requestId });
        return;
      }
      this.pending.delete(message.requestId);
      clearTimeout(pending.timer);
      this.log({ event: 'response', requestId: message.requestId, sessionId: message.sessionId, ok: message.ok, latencyMs: Date.now() - pending.startedAt });
      if (message.ok === true) pending.resolve(message.result);
      else pending.reject(new Error(message.error || 'PLUGIN_ERROR'));
    });
    socket.on('close', (code, reason) => {
      clearTimeout(authTimer);
      if (socket !== this.client) return;
      this.log({ event: 'disconnected', connectionId: this.connectionId, code, reason: reason.toString() });
      this.client = null;
      this.sessionId = null;
      this.connectionId = null;
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('PLUGIN_DISCONNECTED'));
      }
      this.pending.clear();
    });
  }

  request(command, args, timeoutMs = this.timeoutMs) {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) return Promise.reject(new Error('PLUGIN_DISCONNECTED'));
    const requestId = randomUUID();
    const sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        this.log({ event: 'timeout', requestId, sessionId, command });
        reject(new Error('TIMEOUT'));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer, startedAt });
      this.client.send(JSON.stringify({ type: 'command', sessionId, requestId, command, args }));
      this.log({ event: 'request', requestId, sessionId, command });
    });
  }

  disconnectForTest() {
    if (!this.client) throw new Error('PLUGIN_DISCONNECTED');
    this.client.close(1012, 'SIMULATED_RESTART');
  }

  async close() {
    if (!this.server) return;
    for (const socket of this.server.clients) socket.terminate();
    await new Promise(resolve => this.server.close(resolve));
  }
}
