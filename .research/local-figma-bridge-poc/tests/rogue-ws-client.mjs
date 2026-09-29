// G4 test helper: a distinct localhost WebSocket process without pairing material.
import { WebSocket } from 'ws';
import { FIGMA_PLUGIN_ORIGIN } from '../relay/protocol.mjs';

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('A valid localhost port is required');
}
const events = [];
const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: FIGMA_PLUGIN_ORIGIN });
const timer = setTimeout(() => {
  process.stdout.write(`${JSON.stringify({ events, outcome: 'TIMEOUT' })}\n`);
  socket.terminate();
  process.exitCode = 1;
}, 5_000);
socket.on('open', () => events.push({ event: 'open' }));
socket.on('message', () => events.push({ event: 'unexpected_message' }));
socket.on('error', (error) => events.push({ event: 'error', message: error.message }));
socket.on('close', (code, reason) => {
  clearTimeout(timer);
  events.push({ event: 'close', code, reason: reason.toString() });
  process.stdout.write(`${JSON.stringify({ events, outcome: code === 1013 ? 'REJECTED' : 'UNEXPECTED' })}\n`);
  if (code !== 1013) process.exitCode = 1;
});
