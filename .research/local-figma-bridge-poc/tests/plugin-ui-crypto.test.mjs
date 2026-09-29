import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import { createPairingProof } from "../relay/pairing-store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "plugin", "ui.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("plugin UI computes the same client and server HMAC without Web Crypto", async () => {
  assert.ok(script);
  const element = () => ({ textContent: "", style: {}, value: "", hidden: false,
    disabled: false, addEventListener() {} });
  class FakeWebSocket {
    constructor() { this.readyState = 0; }
    addEventListener() {}
  }
  const context = {
    WebSocket: FakeWebSocket,
    document: { getElementById: element },
    parent: { postMessage() {} },
    window: {},
    crypto: {},
    TextEncoder,
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    Map, Set, JSON, String,
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  const pairingProof = vm.runInNewContext(`${script}\npairingProof`, context);
  const secret = Buffer.alloc(32, 7).toString("base64url");
  const fields = {
    protocolVersion: "1",
    serverId: "server-12345678",
    clientId: "client-12345678",
    pairingId: "pairing-12345678",
    nonce: Buffer.alloc(32, 9).toString("base64url"),
  };
  for (const role of ["client", "server"]) {
    assert.equal(await pairingProof(secret, fields, role),
      createPairingProof({ secret, ...fields, role }));
  }
});
