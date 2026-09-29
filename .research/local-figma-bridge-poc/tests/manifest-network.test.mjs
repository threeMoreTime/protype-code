import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { LOOPBACK_HOST } from "../relay/protocol.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(root, "plugin", "manifest.json"), "utf8"));
const ui = readFileSync(path.join(root, "plugin", "ui.html"), "utf8");

test("Figma development domain and UI URL match while the server stays on IPv4 loopback", () => {
  assert.equal(LOOPBACK_HOST, "127.0.0.1");
  assert.deepEqual(manifest.networkAccess.allowedDomains, ["none"]);
  assert.deepEqual(manifest.networkAccess.devAllowedDomains, ["ws://localhost:41731"]);
  assert.match(ui, /const WS_URL = "ws:\/\/localhost:41731";/);
});

test("local identity spike opts into Figma's private plugin API", () => {
  assert.equal(manifest.enablePrivatePluginApi, true);
});
