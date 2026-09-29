// Live MCP/Figma write evidence runner for the user-authorized blank test Design file.
// It refuses the locally protected file document and pins the current session-scoped file identity.
import assert from "node:assert/strict";
import { appendFileSync, constants, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_WRITE_VALIDATION_EVIDENCE_NODE_ID_1");
const PROTECTED_FILE_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_PROTECTED_FILE_IDENTITY");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_WRITE_VALIDATION_EVIDENCE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const mcpLog = path.join(root, "logs", `write-validation-${stamp}-mcp.jsonl`);
const wsLog = path.join(root, "logs", `write-validation-${stamp}-websocket.log`);
const summaryPath = path.join(root, "logs", `write-validation-${stamp}-summary.json`);
const pngPath = path.join(root, "artifacts", "c2c-bridge-poc.png");
const expectedDocumentName = TEST_DOCUMENT_NAME_1;
const owner = "local-codex-figma-bridge-poc";
const summary = {
  date: new Date().toISOString(),
  authorizedTarget: "User confirmed TEST_FILE_READY and PLUGIN_RUNNING for a new blank Design file",
  expectedDocumentName,
  statuses: {},
  errors: [],
  reconnections: [],
  computerUse: 0,
  restApiCorePath: 0,
  remoteMcp: 0,
  chatGptWeb: 0,
};
writeFileSync(mcpLog, "", { flag: "wx" });
writeFileSync(wsLog, "", { flag: "wx" });

function record(entry) {
  appendFileSync(mcpLog, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "mcp", "server.mjs")],
  cwd: root,
  stderr: "pipe",
});
transport.stderr?.on("data", (chunk) => appendFileSync(wsLog, chunk));
const client = new Client({ name: "local-figma-write-validation", version: "0.0.1" });

async function call(tool, args = {}) {
  const startedAt = Date.now();
  record({ event: "mcp_request", tool, arguments: args });
  const result = await client.callTool({ name: tool, arguments: args });
  const latencyMs = Date.now() - startedAt;
  record({ event: "mcp_response", tool, arguments: args, latencyMs, result });
  const text = result.content?.find((item) => item.type === "text")?.text || "";
  if (result.isError) return { ok: false, error: text, latencyMs, raw: result };
  try { return { ok: true, data: JSON.parse(text), latencyMs, raw: result }; }
  catch { return { ok: false, error: `Tool returned non-JSON text: ${text}`, latencyMs, raw: result }; }
}

async function requireRead(tool) {
  const response = await call(tool);
  assert.equal(response.ok, true, `${tool}: ${response.error}`);
  return response.data;
}

let pinned = null;
async function checkTarget() {
  const status = await requireRead("figma_status");
  assert.equal(status.connected, true);
  assert.notEqual(status.fileIdentity, PROTECTED_FILE_IDENTITY);
  assert.equal(status.documentName, expectedDocumentName, "Active Design file changed");
  assert.equal(status.fileIdentityQuality, "session-only");
  if (pinned) {
    assert.equal(status.fileIdentity, pinned.fileIdentity, "Session/file identity changed");
    assert.equal(status.sessionId, pinned.sessionId, "Plugin session changed");
    if (status.connectionId !== pinned.connectionId) {
      summary.reconnections.push({ from: pinned.connectionId, to: status.connectionId, time: new Date().toISOString() });
      pinned.connectionId = status.connectionId;
    }
  } else {
    pinned = {
      documentName: status.documentName,
      fileIdentity: status.fileIdentity,
      sessionId: status.sessionId,
      connectionId: status.connectionId,
      fileIdentityQuality: status.fileIdentityQuality,
    };
    summary.pinned = { ...pinned };
    record({ event: "identity_pinned", ...pinned });
  }
  return status;
}

async function readBack() {
  const read = await requireRead("figma_read_document");
  assert.equal(read.documentName, pinned.documentName);
  assert.equal(read.fileIdentity, pinned.fileIdentity);
  assert.equal(read.sessionId, pinned.sessionId);
  return read;
}

async function write(tool) {
  await checkTarget();
  return call(tool, { expectedFileIdentity: pinned.fileIdentity });
}

function ownedNode(read, role) {
  return read.ownedPocNodes.find((node) => node.role === role && node.owner === owner);
}

async function waitForPlugin() {
  const deadline = Date.now() + 20_000;
  let lastError;
  while (Date.now() < deadline) {
    try { return await checkTarget(); }
    catch (error) {
      lastError = error;
      if (!error.message.includes("Figma Development Plugin is not connected")) throw error;
      await delay(1_000);
    }
  }
  throw lastError || new Error("Plugin did not connect within 20 seconds");
}

try {
  await client.connect(transport);
  record({ event: "mcp_connected", childPid: transport.pid });
  await waitForPlugin();
  let read = await readBack();
  const page = read.pages.find((item) => item.name === "Codex Bridge POC");
  let frame = ownedNode(read, "poc-frame");
  assert.ok(page && frame, "Previously created owned POC page/frame must exist");
  assert.equal(frame.id, TEST_NODE_ID_1, "Unexpected frame identity; stop before any write");
  assert.equal(frame.parentId, page.id);
  assert.equal(frame.type, "FRAME");
  assert.equal(frame.name, "C2C Bridge POC");
  assert.equal(frame.width, 375);
  assert.ok([64, 812].includes(frame.height), "Unexpected existing frame height before layout repair");
  summary.preexistingFrameHeight = frame.height;
  summary.frameId = frame.id;
  summary.pocPageId = page.id;
  record({ event: "preexisting_frame_readback", frame, page });

  // Reconcile the prior timed-out create without creating a second node.
  const frameCall = await write("figma_create_poc");
  read = await readBack();
  frame = ownedNode(read, "poc-frame");
  assert.ok(frame && frame.id === summary.frameId, "Create retry changed or lost the original frame");
  assert.equal(read.ownedPocNodes.filter((node) => node.role === "poc-frame").length, 1);
  summary.statuses.createFrame = frameCall.ok && frameCall.data?.id === frame.id ? "VERIFIED" : "OBSERVED";
  if (!frameCall.ok) summary.errors.push({ tool: "figma_create_poc", error: frameCall.error });

  const textCall = await write("figma_create_text");
  read = await readBack();
  const text = ownedNode(read, "poc-text");
  assert.ok(text, "Text was not present in independent read-back");
  assert.equal(text.type, "TEXT");
  assert.equal(text.parentId, frame.id);
  assert.ok(["Local Codex → Local Figma", "Local Codex ↔ Local Figma VERIFIED"].includes(text.characters));
  assert.equal(text.fontName?.family, "Inter");
  assert.equal(text.fontName?.style, "Regular");
  summary.textId = text.id;
  summary.statuses.createText = textCall.ok && textCall.data?.id === text.id ? "VERIFIED" : "OBSERVED";
  if (!textCall.ok) summary.errors.push({ tool: "figma_create_text", error: textCall.error });

  const layoutCall = await write("figma_set_layout");
  read = await readBack();
  frame = ownedNode(read, "poc-frame");
  assert.equal(frame.layoutMode, "VERTICAL");
  for (const side of ["Top", "Right", "Bottom", "Left"]) assert.equal(frame[`padding${side}`], 24);
  assert.equal(frame.itemSpacing, 16);
  assert.equal(frame.height, 812, "Auto Layout must preserve the 812px POC viewport");
  summary.statuses.autoLayout = layoutCall.ok ? "VERIFIED" : "OBSERVED";
  if (!layoutCall.ok) summary.errors.push({ tool: "figma_set_layout", error: layoutCall.error });

  const oldValues = { text: text.characters, padding: frame.paddingTop, itemSpacing: frame.itemSpacing };
  const updateCall = await write("figma_update_poc");
  read = await readBack();
  frame = ownedNode(read, "poc-frame");
  const updatedText = ownedNode(read, "poc-text");
  assert.equal(updatedText.characters, "Local Codex ↔ Local Figma VERIFIED");
  for (const side of ["Top", "Right", "Bottom", "Left"]) assert.equal(frame[`padding${side}`], 32);
  assert.equal(frame.itemSpacing, 20);
  assert.equal(frame.height, 812, "Update must preserve the 812px POC viewport");
  summary.updateValues = { before: oldValues, after: { text: updatedText.characters, padding: frame.paddingTop, itemSpacing: frame.itemSpacing } };
  summary.statuses.update = updateCall.ok && oldValues.text !== updatedText.characters ? "VERIFIED" : "OBSERVED";
  summary.statuses.readBack = "VERIFIED";
  if (!updateCall.ok) summary.errors.push({ tool: "figma_update_poc", error: updateCall.error });

  const prototypeCall = await write("figma_create_prototype_sample");
  read = await readBack();
  const frameB = ownedNode(read, "prototype-frame-b");
  const button = ownedNode(read, "prototype-button");
  const reaction = button?.reactions?.find((item) =>
    item.trigger?.type === "ON_CLICK" &&
    item.actions?.some((action) =>
      action.type === "NODE" && action.navigation === "NAVIGATE" &&
      action.destinationId === frameB?.id,
    ),
  );
  summary.prototypeReadBack = { frameBId: frameB?.id || null, buttonId: button?.id || null, reaction: reaction || null };
  summary.prototypeFrameAHeight = ownedNode(read, "prototype-frame-a")?.height;
  summary.statuses.prototype = prototypeCall.ok && reaction ? "VERIFIED" : "NOT VERIFIED";
  if (!prototypeCall.ok) summary.errors.push({ tool: "figma_create_prototype_sample", error: prototypeCall.error });

  if (existsSync(pngPath)) {
    const backup = path.join(root, "artifacts", `c2c-bridge-poc-before-${stamp}.png`);
    copyFileSync(pngPath, backup, constants.COPYFILE_EXCL);
    summary.previousPngBackup = backup;
  }
  const exportCall = await write("figma_export_poc");
  if (exportCall.ok) {
    assert.equal(existsSync(pngPath), true, "MCP export did not create a local PNG");
    const bytes = readFileSync(pngPath);
    assert.ok(bytes.length > 24);
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assert.equal(width, 375);
    assert.equal(height, 812);
    summary.export = { path: pngPath, bytes: bytes.length, width, height };
    summary.statuses.exportPng = "VERIFIED";
  } else {
    summary.statuses.exportPng = "NOT VERIFIED";
    summary.errors.push({ tool: "figma_export_poc", error: exportCall.error });
  }

  read = await readBack();
  assert.ok(read.ownedPocNodes.length > 0);
  assert.ok(read.ownedPocNodes.every((node) => node.owner === owner), "Foreign ownership in POC tree; refusing delete");
  const deleteCall = await write("figma_delete_poc_owned");
  const afterDelete = await readBack();
  summary.deleteResult = deleteCall.ok ? deleteCall.data : { error: deleteCall.error };
  summary.statuses.deleteOwnedNode = deleteCall.ok &&
    deleteCall.data?.deletedNodes > 0 &&
    deleteCall.data?.readBackAbsent === true &&
    afterDelete.ownedPocNodes.length === 0 ? "VERIFIED" : "NOT VERIFIED";
  if (!deleteCall.ok) summary.errors.push({ tool: "figma_delete_poc_owned", error: deleteCall.error });

  await checkTarget();
  const beforeWrongIdentity = await readBack();
  const wrong = await call("figma_create_poc", { expectedFileIdentity: "intentionally-wrong-file-identity" });
  const afterWrongIdentity = await readBack();
  assert.equal(wrong.ok, false, "Wrong identity write unexpectedly succeeded");
  assert.deepEqual(afterWrongIdentity.pages, beforeWrongIdentity.pages);
  assert.deepEqual(afterWrongIdentity.ownedPocNodes, beforeWrongIdentity.ownedPocNodes);
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
