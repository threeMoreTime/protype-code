// Read-only reconciliation after the 8.0-E fixture request timed out.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_OWNERSHIP_GUARD_OUTCOME_CHECK_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_OWNERSHIP_GUARD_OUTCOME_CHECK_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = path.join(root, "logs", `phase8-0e-reconciliation-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
await mkdir(path.dirname(log), { recursive: true });
const record = (event, data) => appendFile(log, `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...data })}\n`, "utf8");
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, "mcp", "server.mjs")], cwd: root,
  env: { ...process.env }, stderr: "pipe" });
const client = new Client({ name: "phase8-0e-readonly-reconciliation", version: "0.0.1" });
try {
  await client.connect(transport);
  async function call(name, args = {}) {
    const response = await client.callTool({ name, arguments: args });
    const raw = response.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const result = { isError: response.isError === true, value };
    await record("mcp_call", { name, args, result });
    return result;
  }
  let status;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    status = await call("figma_status");
    if (!status.isError && status.value?.connected) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (status?.isError || !status?.value?.connected) throw new Error("Figma Plugin is not connected");
  if (status.value.fileIdentity !== TEST_FILE_A_IDENTITY ||
      status.value.documentName !== TEST_DOCUMENT_NAME_1) {
    await record("wrong_active_file", { actual: status.value.fileIdentity,
      documentName: status.value.documentName });
    throw new Error("Active Plugin is not connected to the dedicated file with uncertain mutation");
  }
  const page = await call("figma_scope_read_node", { targetNodeId: TEST_NODE_ID_1 });
  if (page.isError) throw new Error("Cannot read target Page");
  for (const id of page.value.childIds || []) {
    await call("figma_scope_read_node", { targetNodeId: id });
  }
  await record("reconciliation_complete", { fileIdentity: status.value.fileIdentity,
    pageChildIds: page.value.childIds,
    scopedMutationAttemptCount: status.value.scopedMutationAttemptCount });
  process.stdout.write(`${log}\n`);
} catch (error) {
  await record("reconciliation_failed", { error: String(error) });
  process.stderr.write(`${String(error)}\nEvidence: ${log}\n`);
  process.exitCode = 1;
} finally {
  await client.close();
}
