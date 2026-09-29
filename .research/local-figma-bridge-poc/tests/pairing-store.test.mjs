import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const pairingModule = await import("../relay/pairing-store.mjs").catch(() => ({}));
const { PairingStore, createPairingProof, verifyPairingProof } = pairingModule;

async function withTempStore(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "figma-bridge-pairing-"));
  try {
    await run(path.join(directory, "pairing-store.json"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("one-time pairing persists stable IDs and a secret without persisting the bootstrap code", async () => {
  assert.equal(typeof PairingStore, "function", "PairingStore export is not implemented");
  await withTempStore(async (filePath) => {
    const first = new PairingStore({ filePath });
    await first.initialize();
    const bootstrap = first.beginPairing({ clientId: "client-persist-1", ttlMs: 30_000 });
    const beforePair = await readFile(filePath, "utf8");
    assert.equal(beforePair.includes(bootstrap.code), false);

    const paired = await first.completePairing({ clientId: "client-persist-1", code: bootstrap.code });
    assert.equal(paired.serverId, first.serverId);
    assert.equal(paired.clientId, "client-persist-1");
    assert.ok(paired.pairingId);
    assert.ok(paired.secret);
    assert.equal(await first.completePairing({ clientId: "client-persist-1", code: bootstrap.code }), null);

    const second = new PairingStore({ filePath });
    await second.initialize();
    const restored = second.getPairing({ clientId: paired.clientId, pairingId: paired.pairingId });
    assert.equal(second.serverId, first.serverId);
    assert.deepEqual(restored, paired);
    assert.equal((await readFile(filePath, "utf8")).includes(bootstrap.code), false);
  });
});

test("rejects wrong client, wrong code, and expired one-time pairing codes", async () => {
  assert.equal(typeof PairingStore, "function", "PairingStore export is not implemented");
  let now = 1_000;
  const store = new PairingStore({ now: () => now });
  await store.initialize();

  const wrongClientCode = store.beginPairing({ clientId: "client-a", ttlMs: 1_000 });
  assert.equal(await store.completePairing({ clientId: "client-b", code: wrongClientCode.code }), null);
  assert.equal(await store.completePairing({ clientId: "client-a", code: "wrong-code" }), null);
  assert.equal(store.getPairing({ clientId: "client-a" }), null);

  const expired = store.beginPairing({ clientId: "client-a", ttlMs: 1_000 });
  now += 1_001;
  assert.equal(await store.completePairing({ clientId: "client-a", code: expired.code }), null);
  assert.equal(store.getPairing({ clientId: "client-a" }), null);
});

test("auth proof binds protocol, server, client, pairing, and fresh challenge", async () => {
  assert.equal(typeof PairingStore, "function", "PairingStore export is not implemented");
  await withTempStore(async (filePath) => {
    const store = new PairingStore({ filePath });
    await store.initialize();
    const code = store.beginPairing({ clientId: "client-proof-1" });
    const pairing = await store.completePairing({ clientId: "client-proof-1", code: code.code });
    const fields = {
      secret: pairing.secret,
      protocolVersion: "1",
      serverId: pairing.serverId,
      clientId: pairing.clientId,
      pairingId: pairing.pairingId,
      nonce: "A".repeat(43),
      role: "client",
    };
    const proof = createPairingProof(fields);
    assert.equal(verifyPairingProof({ ...fields, proof }), true);
    assert.equal(verifyPairingProof({ ...fields, nonce: "B".repeat(43), proof }), false);
    assert.equal(verifyPairingProof({ ...fields, clientId: "other-client", proof }), false);
    assert.notEqual(createPairingProof({ ...fields, role: "server" }), proof);
    assert.notEqual(proof, pairing.secret);
  });
});
