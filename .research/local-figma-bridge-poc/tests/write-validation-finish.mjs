// Resume only the safe export verification, owned-node deletion, and wrong-identity test.
// The prior write run exported the PNG and stopped on an unexpected 375x64 dimension.
import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_WRITE_VALIDATION_FINISH_NODE_ID_1");
const PROTECTED_FILE_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_PROTECTED_FILE_IDENTITY");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_WRITE_VALIDATION_FINISH_DOCUMENT_NAME_1");
const expectedSessionId = requireLocalTestValue("FIGMA_TEST_SESSION_ID");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const mcpLog = path.join(root, "logs", `write-validation-finish-${stamp}-mcp.jsonl`);
const wsLog = path.join(root, "logs", `write-validation-finish-${stamp}-websocket.log`);
const summaryPath = path.join(root, "logs", `write-validation-finish-${stamp}-summary.json`);
const pngPath = path.join(root, "artifacts", "c2c-bridge-poc.png");
const owner = "local-codex-figma-bridge-poc";
const summary = { statuses: {}, errors: [], computerUse: 0, restApiCorePath: 0, remoteMcp: 0, chatGptWeb: 0 };
writeFileSync(mcpLog, "", { flag: "wx" });
writeFileSync(wsLog, "", { flag: "wx" });
const record = (entry) => appendFileSync(mcpLog, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "mcp", "server.mjs")],
  cwd: root,
  stderr: "pipe",
});
transport.stderr?.on("data", (chunk) => appendFileSync(wsLog, chunk));
const client = new Client({ name: "local-figma-write-validation-finish", version: "0.0.1" });

async function call(tool, args = {}) {
  const started = Date.now();
  record({ event: "mcp_request", tool, arguments: args });
  const result = await client.callTool({ name: tool, arguments: args });
  const latencyMs = Date.now() - started;
  record({ event: "mcp_response", tool, arguments: args, latencyMs, result });
  const content = result.content?.find((item) => item.type === "text")?.text || "";
  if (result.isError) return { ok: false, error: content };
  return { ok: true, data: JSON.parse(content) };
}

async function requireRead(tool) {
  const result = await call(tool);
  assert.equal(result.ok, true, `${tool}: ${result.error}`);
  return result.data;
}

async function statusAfterConnect() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const result = await call("figma_status");
    if (result.ok) return result.data;
    if (!result.error.includes("Figma Development Plugin is not connected")) throw new Error(result.error);
    await delay(1_000);
  }
  throw new Error("Plugin did not reconnect in 20 seconds");
}

try {
  await client.connect(transport);
  record({ event: "mcp_connected", childPid: transport.pid });
  const status = await statusAfterConnect();
  assert.equal(status.connected, true);
  assert.equal(status.documentName, TEST_DOCUMENT_NAME_1);
  assert.notEqual(status.fileIdentity, PROTECTED_FILE_IDENTITY);
  assert.equal(status.sessionId, expectedSessionId, "Plugin session changed; stop before deleting");
  assert.equal(status.fileIdentityQuality, "session-only");
  summary.pinned = {
    documentName: status.documentName,
    sessionId: status.sessionId,
    connectionId: status.connectionId,
    fileIdentity: status.fileIdentity,
  };
  const before = await requireRead("figma_read_document");
  assert.equal(before.fileIdentity, status.fileIdentity);
  assert.ok(before.ownedPocNodes.some((node) => node.id === TEST_NODE_ID_1 && node.role === "poc-frame"));
  assert.ok(before.ownedPocNodes.length >= 6);
  assert.ok(before.ownedPocNodes.every((node) => node.owner === owner));
  const button = before.ownedPocNodes.find((node) => node.role === "prototype-button");
  const frameB = before.ownedPocNodes.find((node) => node.role === "prototype-frame-b");
  assert.ok(button?.reactions?.some((reaction) =>
    reaction.trigger?.type === "ON_CLICK" &&
    reaction.actions?.some((action) =>
      action.type === "NODE" && action.navigation === "NAVIGATE" && action.destinationId === frameB?.id,
    ),
  ));
  summary.prototypeIndependentReadBack = { buttonId: button.id, frameBId: frameB.id, reactions: button.reactions };

  const png = readFileSync(pngPath);
  assert.ok(png.length > 24);
  assert.deepEqual(png.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  summary.export = { path: pngPath, bytes: png.length, width: png.readUInt32BE(16), height: png.readUInt32BE(20), localImageOpened: true };
  summary.statuses.exportPng = "VERIFIED";
  summary.exportDimensionGap = "Frame originally 375x812; Auto Layout shrank it to 375x48, update enlarged it to 375x64; PNG is 375x64.";

  const beforeDeleteStatus = await requireRead("figma_status");
  assert.equal(beforeDeleteStatus.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(beforeDeleteStatus.fileIdentity, status.fileIdentity);
  assert.equal(beforeDeleteStatus.sessionId, expectedSessionId);
  const deletion = await call("figma_delete_poc_owned", { expectedFileIdentity: status.fileIdentity });
  const after = await requireRead("figma_read_document");
  assert.equal(after.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(after.fileIdentity, status.fileIdentity);
  summary.deleteResponse = deletion;
  summary.afterDelete = { pages: after.pages, ownedPocNodes: after.ownedPocNodes };
  summary.statuses.deleteOwnedNode = deletion.ok && deletion.data?.deletedNodes > 0 &&
    deletion.data?.readBackAbsent === true && after.ownedPocNodes.length === 0 ? "VERIFIED" : "NOT VERIFIED";
  if (!deletion.ok) summary.errors.push({ tool: "figma_delete_poc_owned", error: deletion.error });

  const beforeWrong = await requireRead("figma_read_document");
  const wrong = await call("figma_create_poc", { expectedFileIdentity: "intentionally-wrong-file-identity" });
  const afterWrong = await requireRead("figma_read_document");
  assert.equal(wrong.ok, false);
  assert.deepEqual(afterWrong.pages, beforeWrong.pages);
  assert.deepEqual(afterWrong.ownedPocNodes, beforeWrong.ownedPocNodes);
  summary.statuses.wrongFileIdentityRejected = "VERIFIED";
  summary.wrongIdentityError = wrong.error;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  summary.errors.push({ fatal: message });
  record({ event: "fatal", message });
  process.exitCode = 1;
} finally {
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  await client.close().catch(() => {});
  process.stdout.write(`MCP_LOG=${mcpLog}\nWS_LOG=${wsLog}\nSUMMARY=${summaryPath}\n`);
}
