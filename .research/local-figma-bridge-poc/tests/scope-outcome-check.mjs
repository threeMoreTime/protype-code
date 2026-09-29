// Read-only follow-up after an uncertain Figma API result. No mutation and no retry.
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { requireLocalTestNodeIds, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_SCOPE_OUTCOME_CHECK_DOCUMENT_NAME_1");
const targetNodeIds = requireLocalTestNodeIds("FIGMA_TEST_SCOPE_OUTCOME_NODE_IDS");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "logs", `phase8-0d-outcome-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
const client = new Client({ name: "phase8-0d-read-only-outcome", version: "0.0.1" });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, "mcp", "server.mjs")], cwd: root, stderr: "pipe" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  await client.connect(transport);
  async function call(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    const raw = result.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const item = { timestamp: new Date().toISOString(), name, args, isError: result.isError === true, value };
    await appendFile(logPath, `${JSON.stringify(item)}\n`, "utf8");
    return item;
  }
  let status;
  for (let index = 0; index < 30; index += 1) {
    status = await call("figma_status");
    if (!status.isError && status.value.bridgeAuth?.authenticated) break;
    await pause(1_000);
  }
  if (status.isError || status.value.documentName !== TEST_DOCUMENT_NAME_1) {
    throw new Error("Dedicated test file did not reconnect; no state conclusion");
  }
  await call("figma_read_document");
  for (const id of targetNodeIds) await call("figma_scope_read_node", { targetNodeId: id });
  process.stdout.write(`OUTCOME_EVIDENCE=${logPath}\n`);
} finally {
  await client.close().catch(() => {});
}
