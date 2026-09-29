// Read-only live evidence runner. It never calls a Figma write/export/delete tool.
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runTag = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const mcpLog = path.join(root, "logs", `live-read-${runTag}-mcp.jsonl`);
const wsLog = path.join(root, "logs", `live-read-${runTag}-websocket.log`);
writeFileSync(mcpLog, "", { flag: "wx" });
writeFileSync(wsLog, "", { flag: "wx" });

function record(entry) {
  appendFileSync(mcpLog, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
}

async function startCycle(cycle) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, "mcp", "server.mjs")],
    cwd: root,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => appendFileSync(wsLog, chunk));
  const client = new Client({ name: `live-read-evidence-${cycle}`, version: "0.0.1" });
  await client.connect(transport);
  record({ event: "mcp_connected", cycle, childPid: transport.pid });
  return { client, transport };
}

async function callRead(client, cycle, tool) {
  const args = {};
  record({ event: "mcp_request", cycle, tool, arguments: args });
  const result = await client.callTool({ name: tool, arguments: args });
  record({ event: "mcp_response", cycle, tool, result });
  if (result.isError) throw new Error(result.content?.[0]?.text || `${tool} failed`);
  return JSON.parse(result.content.find((item) => item.type === "text").text);
}

async function waitForPlugin(client, cycle) {
  const deadline = Date.now() + 20_000;
  let lastError;
  while (Date.now() < deadline) {
    try { return await callRead(client, cycle, "figma_status"); }
    catch (error) { lastError = error; await delay(1_000); }
  }
  throw lastError || new Error("Plugin did not connect within 20 seconds");
}

let first = null;
let second = null;
try {
  first = await startCycle("first");
  const status1 = await waitForPlugin(first.client, "first");
  const document = await callRead(first.client, "first", "figma_read_document");
  if (document.fileIdentity !== status1.fileIdentity || document.connectionId !== status1.connectionId) {
    throw new Error("Status and document read returned different active Figma connections");
  }
  await delay(11_000);
  const status2 = await callRead(first.client, "first", "figma_status");
  if (status2.connectionId !== status1.connectionId || status2.sessionId !== status1.sessionId) {
    throw new Error("Connection changed during the long-lived read-only interval");
  }
  record({ event: "same_connection_after_11s", connectionId: status2.connectionId,
    sessionId: status2.sessionId });
  await first.client.close();
  first = null;
  record({ event: "mcp_child_stopped_for_reconnect" });
  await delay(2_000);

  second = await startCycle("reconnect");
  const status3 = await waitForPlugin(second.client, "reconnect");
  if (status3.sessionId !== status1.sessionId || status3.connectionId === status1.connectionId) {
    throw new Error("Plugin session did not reconnect to a fresh MCP/WS connection");
  }
  record({ event: "reconnected", previousConnectionId: status1.connectionId,
    connectionId: status3.connectionId, sessionId: status3.sessionId });
  process.stdout.write(`LIVE_READ_CONNECTION_AND_RECOVERY_VERIFIED\nMCP_LOG=${mcpLog}\nWS_LOG=${wsLog}\n`);
} catch (error) {
  record({ event: "error", message: error instanceof Error ? error.message : String(error) });
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await first?.client.close().catch(() => {});
  await second?.client.close().catch(() => {});
}
