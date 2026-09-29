// Read-only local Figma identity snapshot. Each invocation starts and stops one
// stdio MCP/Node server process so repeated runs exercise the restart boundary.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logs = path.join(root, "logs");
mkdirSync(logs, { recursive: true });
const rawLabel = process.argv.find((arg) => arg.startsWith("--label="))?.slice("--label=".length) || "snapshot";
const label = rawLabel.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const prefix = path.join(logs, `file-identity-${label}-${stamp}`);
const mcpPath = `${prefix}-mcp.jsonl`;
const wsPath = `${prefix}-websocket.log`;
const summaryPath = `${prefix}-summary.json`;
writeFileSync(mcpPath, "", { flag: "wx" });
writeFileSync(wsPath, "", { flag: "wx" });

function record(entry) {
  appendFileSync(mcpPath, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "mcp", "server.mjs")],
  cwd: root,
  stderr: "pipe",
});
transport.stderr?.on("data", (chunk) => appendFileSync(wsPath, chunk));
const client = new Client({ name: "local-figma-identity-spike", version: "0.0.1" });
const summary = { label, startedAt: new Date().toISOString(), result: "NOT VERIFIED", retries: 0 };

try {
  await client.connect(transport);
  summary.nodePid = transport.pid;
  const deadline = Date.now() + 30_000;
  let status;
  while (Date.now() < deadline) {
    const requestId = randomUUID();
    record({ event: "mcp_request", requestId, method: "figma_status", arguments: {} });
    const started = Date.now();
    const response = await client.callTool({ name: "figma_status", arguments: {} });
    const latencyMs = Date.now() - started;
    const text = response.content?.find((item) => item.type === "text")?.text || "";
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    record({ event: "mcp_response", requestId, latencyMs, isError: Boolean(response.isError), data, error: response.isError ? text : undefined });
    if (!response.isError && data?.connected === true) {
      Object.assign(summary, {
        result: "OBSERVED",
        latencyMs,
        documentName: data.documentName,
        fileIdentity: data.fileIdentity,
        fileIdentityQuality: data.fileIdentityQuality,
        sessionId: data.sessionId,
        connectionId: data.connectionId,
        currentPageId: data.currentPageId,
        currentPageName: data.currentPageName,
        pageCount: data.pageCount,
      });
      break;
    }
    summary.retries += 1;
    await delay(1_000);
  }
  if (summary.result !== "OBSERVED") throw new Error("No connected figma_status response within 30 seconds");
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
  record({ event: "fatal", error: summary.error });
  process.exitCode = 1;
} finally {
  summary.finishedAt = new Date().toISOString();
  summary.logs = { mcp: mcpPath, websocket: wsPath };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  await client.close().catch(() => {});
  process.stdout.write(`${JSON.stringify({ summary: summaryPath, result: summary.result, documentName: summary.documentName, fileIdentityQuality: summary.fileIdentityQuality, sessionId: summary.sessionId, connectionId: summary.connectionId })}\n`);
}
