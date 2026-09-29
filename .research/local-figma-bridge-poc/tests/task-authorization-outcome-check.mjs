// Read-only reconciliation after an uncertain real Figma mutation result.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(ROOT, "logs", `phase8-0c-outcome-check-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
await mkdir(path.dirname(logPath), { recursive: true });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT, stderr: "pipe" });
const client = new Client({ name: "phase8-0c-read-only-outcome-check", version: "0.0.1" });
try {
  await client.connect(transport);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const name of ["figma_status", "figma_read_document"]) {
      const result = await client.callTool({ name, arguments: {} });
      const text = result.content?.find((item) => item.type === "text")?.text || "";
      let value;
      try { value = JSON.parse(text); } catch { value = text; }
      await appendFile(logPath, `${JSON.stringify({ time: new Date().toISOString(), name,
        isError: result.isError === true, value })}\n`, "utf8");
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  process.stdout.write(`READ_ONLY_EVIDENCE=${logPath}\n`);
} finally {
  await client.close().catch(() => {});
}
