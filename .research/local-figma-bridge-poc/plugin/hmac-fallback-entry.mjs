import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

globalThis.localBridgeHmacSha256 = (key, payload) => hmac(sha256, key, payload);
