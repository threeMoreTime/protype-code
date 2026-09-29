import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const PAIRING_PROTOCOL_VERSION = "1";
export const DEFAULT_PAIRING_CODE_TTL_MS = 3 * 60_000;
const MAX_CODE_ATTEMPTS = 5;

function boundedIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,160}$/.test(value);
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

function equalDigest(left, right) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function proofPayload({ protocolVersion, serverId, clientId, pairingId, nonce, role }) {
  return [protocolVersion, serverId, clientId, pairingId, nonce, role].join("\n");
}

export function createPairingProof({ secret, protocolVersion = PAIRING_PROTOCOL_VERSION, serverId, clientId, pairingId, nonce, role }) {
  if (
    typeof secret !== "string" || secret.length < 32 ||
    !boundedIdentifier(serverId) || !boundedIdentifier(clientId) ||
    !boundedIdentifier(pairingId) || typeof nonce !== "string" || nonce.length < 32 ||
    !["client", "server"].includes(role)
  ) {
    throw new Error("Pairing proof inputs are invalid");
  }
  return createHmac("sha256", Buffer.from(secret, "base64url"))
    .update(proofPayload({ protocolVersion, serverId, clientId, pairingId, nonce, role }), "utf8")
    .digest("base64url");
}

export function verifyPairingProof(fields) {
  try {
    if (typeof fields?.proof !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(fields.proof)) return false;
    const expected = Buffer.from(createPairingProof(fields), "base64url");
    const actual = Buffer.from(fields.proof, "base64url");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createPairingNonce() {
  return randomBytes(32).toString("base64url");
}

export class PairingStore {
  #filePath;
  #now;
  #state = null;
  #pendingCode = null;

  constructor({ filePath = null, now = Date.now } = {}) {
    this.#filePath = filePath ? path.resolve(filePath) : null;
    this.#now = now;
  }

  get serverId() {
    if (!this.#state) throw new Error("Pairing store has not been initialized");
    return this.#state.serverId;
  }

  async initialize() {
    if (this.#state) return this.#state.serverId;
    if (!this.#filePath) {
      this.#state = { schemaVersion: 1, serverId: randomUUID(), pairings: {} };
      return this.#state.serverId;
    }

    try {
      const parsed = JSON.parse(await readFile(this.#filePath, "utf8"));
      if (
        parsed?.schemaVersion !== 1 || !boundedIdentifier(parsed.serverId) ||
        !parsed.pairings || typeof parsed.pairings !== "object" || Array.isArray(parsed.pairings)
      ) {
        throw new Error("Pairing state is invalid; refusing to reset identity");
      }
      for (const [clientId, pairing] of Object.entries(parsed.pairings)) {
        if (
          !boundedIdentifier(clientId) || pairing?.clientId !== clientId ||
          !boundedIdentifier(pairing.pairingId) || typeof pairing.secret !== "string" ||
          Buffer.from(pairing.secret, "base64url").length !== 32 || typeof pairing.createdAt !== "string"
        ) {
          throw new Error("Pairing record is invalid; refusing to reset identity");
        }
      }
      this.#state = parsed;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      this.#state = { schemaVersion: 1, serverId: randomUUID(), pairings: {} };
      await this.#save();
    }
    return this.#state.serverId;
  }

  beginPairing({ clientId, ttlMs = DEFAULT_PAIRING_CODE_TTL_MS } = {}) {
    this.#assertInitialized();
    if (!boundedIdentifier(clientId)) throw new Error("Client identity is invalid");
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 10 * 60_000) {
      throw new Error("Pairing code lifetime must be between 1 second and 10 minutes");
    }
    if (this.#state.pairings[clientId]) throw new Error("Client is already paired; explicit revoke is required first");

    const code = randomBytes(24).toString("base64url");
    const expiresAtMs = this.#now() + ttlMs;
    this.#pendingCode = { clientId, digest: digest(code), expiresAtMs, attempts: 0 };
    return { code, serverId: this.#state.serverId, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  cancelPendingPairing({ clientId } = {}) {
    if (this.#pendingCode?.clientId !== clientId) return false;
    this.#pendingCode = null;
    return true;
  }

  async completePairing({ clientId, code } = {}) {
    this.#assertInitialized();
    const pending = this.#pendingCode;
    if (!pending || this.#now() >= pending.expiresAtMs || !boundedIdentifier(clientId) || clientId !== pending.clientId) {
      if (pending && this.#now() >= pending.expiresAtMs) this.#pendingCode = null;
      return null;
    }
    if (typeof code !== "string" || code.length > 80 || !equalDigest(digest(code), pending.digest)) {
      pending.attempts += 1;
      if (pending.attempts >= MAX_CODE_ATTEMPTS) this.#pendingCode = null;
      return null;
    }
    this.#pendingCode = null;
    if (this.#state.pairings[clientId]) return null;

    const pairing = {
      serverId: this.#state.serverId,
      clientId,
      pairingId: randomUUID(),
      secret: randomBytes(32).toString("base64url"),
      createdAt: new Date(this.#now()).toISOString(),
    };
    this.#state.pairings[clientId] = pairing;
    try {
      await this.#save();
    } catch (error) {
      delete this.#state.pairings[clientId];
      throw error;
    }
    return { ...pairing };
  }

  getPairing({ clientId, pairingId } = {}) {
    this.#assertInitialized();
    if (!boundedIdentifier(clientId)) return null;
    const pairing = this.#state.pairings[clientId];
    if (!pairing || (pairingId !== undefined && pairing.pairingId !== pairingId)) return null;
    return { ...pairing };
  }

  async revokePairing({ clientId, pairingId } = {}) {
    this.#assertInitialized();
    const pairing = this.getPairing({ clientId, pairingId });
    if (!pairing) return false;
    delete this.#state.pairings[clientId];
    try {
      await this.#save();
    } catch (error) {
      this.#state.pairings[clientId] = pairing;
      throw error;
    }
    return true;
  }

  #assertInitialized() {
    if (!this.#state) throw new Error("Pairing store has not been initialized");
  }

  async #save() {
    if (!this.#filePath) return;
    await mkdir(path.dirname(this.#filePath), { recursive: true });
    const temporaryPath = `${this.#filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(this.#state, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporaryPath, this.#filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}
