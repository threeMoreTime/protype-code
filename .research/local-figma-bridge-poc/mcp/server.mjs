import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DEFAULT_PORT } from "../relay/protocol.mjs";
import { startBridge } from "../relay/bridge-server.mjs";
import { PairingStore } from "../relay/pairing-store.mjs";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { MutationAudit } from "../relay/mutation-audit.mjs";
import { DESIGN_ACTIONS, designPayload } from "../design/commands.mjs";
import { ASSET_TRANSFER_COMMANDS, ASSET_TRANSFER_LIMITS } from "../design/asset-transfer.mjs";
import { decodePng } from "../delivery/png.mjs";
import { isBase64 } from "../design/base64.mjs";
import { configuredDesignTimeout, designRequestTimeout } from "../design/request-timeout.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POC_ROOT = path.resolve(HERE, "..");
const EXPORT_DIR = path.join(POC_ROOT, "artifacts");
const EXPORT_PATH = path.join(EXPORT_DIR, "c2c-bridge-poc.png");
const DEFAULT_PAIRING_STATE_PATH = path.join(POC_ROOT, "state", "pairing-store.json");
const DEFAULT_AUTHORIZATION_STATE_PATH = path.join(POC_ROOT, "state", "task-authorizations.json");
const DEFAULT_AUDIT_PATH = path.join(POC_ROOT, "state", "mutation-audit.jsonl");
const MAX_EXPORT_BYTES = 5 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
const WRITE_INPUT_SCHEMA = {
  expectedFileIdentity: z.string().startsWith("figma-file:"),
  workspaceId: z.string().min(1), taskId: z.string().min(1),
  authorizationId: z.string().optional(), revision: z.string().optional(),
  operationId: z.string().optional(),
};
const SCOPED_INPUT_SCHEMA = {
  ...WRITE_INPUT_SCHEMA,
  parentId: z.string().optional(), targetNodeId: z.string().optional(),
  sourceNodeId: z.string().optional(), destinationNodeId: z.string().optional(),
  name: z.string().max(100).optional(),
};

function configuredPort() {
  const raw = process.env.LOCAL_FIGMA_BRIDGE_PORT;
  if (raw === undefined) return DEFAULT_PORT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("LOCAL_FIGMA_BRIDGE_PORT must be an integer between 0 and 65535");
  }
  return parsed;
}

export function decodePngBase64(base64) {
  if (typeof base64 !== "string" || base64.length === 0 || base64.length > Math.ceil(MAX_EXPORT_BYTES * 4 / 3) + 8) {
    throw new Error("PNG payload is missing or exceeds the POC export limit");
  }
  if (!isBase64(base64)) {
    throw new Error("PNG payload is not valid base64");
  }
  const bytes = Buffer.from(base64, "base64");
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 8 || bytes.length > MAX_EXPORT_BYTES || !bytes.subarray(0, 8).equals(pngSignature)) {
    throw new Error("Export payload is not a valid PNG within the POC size limit");
  }
  return bytes;
}

export function validateDesignPng(result) {
  const bytes = decodePngBase64(result?.bytesBase64);
  const pixels = decodePng(bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (result.sha256 !== sha256) throw new Error('DESIGN_PNG_HASH_MISMATCH');
  return { bytes, sha256, pixelWidth: pixels.width, pixelHeight: pixels.height };
}

function jsonToolResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorToolResult(error) {
  return {
    isError: true,
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
  };
}

function registerTool(server, bridge, name, description, command, { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, annotations, write = false, scoped = false } = {}) {
  const inputSchema = scoped ? SCOPED_INPUT_SCHEMA : write ? WRITE_INPUT_SCHEMA : {};
  server.registerTool(name, { description, inputSchema, ...(annotations ? { annotations } : {}) }, async (args) => {
    try {
      const result = await bridge.callPlugin(command, write ? args : {}, timeoutMs);
      if (command === "status") {
        const connection = bridge.connection;
        return jsonToolResult({
          ...result,
          connected: true,
          bridgeAuth: connection ? {
            authenticated: connection.authenticated,
            authState: connection.authState,
            clientId: connection.metadata.clientId,
            serverId: connection.metadata.serverId,
            pairingId: connection.metadata.pairingId,
          } : { authenticated: false, authState: "disconnected" },
        });
      }
      return jsonToolResult(result);
    } catch (error) {
      return errorToolResult(error);
    }
  });
}

export async function createMcpServer({ port = configuredPort(), stderr = process.stderr,
  designTimeoutMs = configuredDesignTimeout(process.env.LOCAL_FIGMA_BRIDGE_DESIGN_TIMEOUT_MS),
  pairingStatePath = process.env.LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH || DEFAULT_PAIRING_STATE_PATH,
  authorizationStatePath = process.env.LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH || DEFAULT_AUTHORIZATION_STATE_PATH,
  auditPath = process.env.LOCAL_FIGMA_BRIDGE_AUDIT_PATH || DEFAULT_AUDIT_PATH,
  enableTestFixtures = process.env.LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES === "1" } = {}) {
  designTimeoutMs = designRequestTimeout(designTimeoutMs);
  const pairingStore = new PairingStore({ filePath: path.resolve(pairingStatePath) });
  const authorizationStore = new TaskAuthorizationStore({ filePath: path.resolve(authorizationStatePath) });
  const auditJournal = new MutationAudit({ filePath: path.resolve(auditPath) });
  const bridge = await startBridge({ port, pairingStore, authorizationStore,
    allowTestFixtures: enableTestFixtures, auditJournal });
  stderr.write(`[local-figma-bridge-poc] WebSocket listening on ${bridge.host}:${bridge.port}\n`);

  const server = new McpServer(
    { name: "local-figma-bridge-poc", version: "0.0.1" },
    { instructions: "Operate only in the explicitly allowlisted dedicated Figma file and locally authorized page/root scope. Use data-only DesignSpec tools; inspect unknown outcomes before another batch. Never issue arbitrary plugin code or modify unrelated nodes." },
  );

  registerTool(server, bridge, "figma_status", "Read the live Figma Desktop plugin, document, page, and session status.", "status", { annotations: { readOnlyHint: true } });
  for (const command of Object.keys(DESIGN_ACTIONS)) {
    if (ASSET_TRANSFER_COMMANDS.has(command)) {
      server.registerTool(`figma_${command}`, {
        description: 'Bounded scoped DesignSpec 1.1 image transfer. Uses the existing pairing, file allowlist, local read/design authorization and operation audit. Inspect assets_plan after unknown outcomes before another mutation.',
        inputSchema: z.object({ ...WRITE_INPUT_SCHEMA, spec: z.record(z.unknown()), runId: z.string(),
          ...(command !== 'scope_design_assets_plan' ? { assetKey: z.string().min(1).max(160) } : {}),
          ...(command === 'scope_design_asset_stage' ? { offset: z.number().int().min(0).max(ASSET_TRANSFER_LIMITS.assetBytes),
            dataBase64: z.string().min(4).max(Math.ceil(ASSET_TRANSFER_LIMITS.chunkBytes / 3) * 4),
            chunkSha256: z.string().regex(/^[a-f0-9]{64}$/) } : {}),
        }).strict(),
        annotations: { readOnlyHint: command === 'scope_design_assets_plan', destructiveHint: false },
      }, async args => {
        try { designPayload(command, args); return jsonToolResult(await bridge.callPlugin(command, args, designTimeoutMs)); }
        catch (error) { return errorToolResult(error); }
      });
      continue;
    }
    const textRevision = command === 'scope_design_text_plan' || command === 'scope_design_text_apply';
    server.registerTool(`figma_${command}`, {
      description: `Scoped DesignSpec ${command.replace('scope_design_', '')}. Requires pairing, file allowlist, local authorization and a fresh operation ID. Never executes arbitrary JavaScript.`,
      inputSchema: z.object({
        ...WRITE_INPUT_SCHEMA, spec: z.record(z.unknown()), runId: z.string(),
        ...(textRevision ? { baseSpec: z.record(z.unknown()) } : {}),
        ...(['scope_design_plan', 'scope_design_apply'].includes(command) ? { positionRecovery: z.object({
          nodeKeys: z.array(z.string()).min(1).max(20),
          planSignature: z.string().regex(/^[a-f0-9]{64}$/).optional(),
        }).strict().optional() } : {}),
        batchSize: z.number().int().min(1).max(500).optional(),
        timerUnit: z.enum(['seconds', 'milliseconds']).optional(),
        allowGlobalResources: z.boolean().optional(), reconcile: z.boolean().optional(),
        ...(!textRevision ? { adoptNativeFlow: z.object({
          pendingOperationId: z.string().regex(/^op-[A-Za-z0-9._-]{8,100}$/),
          flowSnapshotSignature: z.string().regex(/^[a-f0-9]{64}$/),
          reactionSnapshotSignature: z.string().regex(/^[a-f0-9]{64}$/),
        }).strict().optional() } : {}),
        nodeKey: z.string().optional(), scale: z.number().min(1).max(4).optional(),
        auditOffset: z.number().int().min(0).max(25000).optional(),
        auditLimit: z.number().int().min(1).max(2000).optional(),
      }).strict(),
      annotations: { readOnlyHint: DESIGN_ACTIONS[command] !== 'design', destructiveHint: false },
    }, async (args) => {
      try {
        designPayload(command, args);
        const result = await bridge.callPlugin(command, args, designTimeoutMs);
        if (command === 'scope_design_export_png') {
          const { bytes, sha256, pixelWidth, pixelHeight } = validateDesignPng(result);
          const { bytesBase64, ...metadata } = result;
          return { content: [
            { type: 'text', text: JSON.stringify({ ...metadata, sha256, pixelWidth, pixelHeight }) },
            { type: 'image', data: bytes.toString('base64'), mimeType: 'image/png' },
          ] };
        }
        return jsonToolResult(result);
      } catch (error) { return errorToolResult(error); }
    });
  }
  registerTool(server, bridge, "figma_read_document", "Read document metadata, pages, current page, and selection summary without using REST or screenshots.", "read_document", { annotations: { readOnlyHint: true } });
  server.registerTool("figma_scope_read_node", { description: "Read one node by ID for scope validation and read-back.",
    inputSchema: z.object({ targetNodeId: z.string(), evidence: z.object({
      fields: z.array(z.enum(["geometry", "vectorPaths", "text", "paints", "mask", "layout", "component", "children"]))
        .min(1).max(8).refine(fields => new Set(fields).size === fields.length, "Evidence fields must be unique"),
      readScope: z.object({ fileIdentity: z.string().min(1).max(512),
        pageId: z.string().regex(/^[0-9]+:[0-9]+$/), rootNodeId: z.string().regex(/^[0-9]+:[0-9]+$/) }).strict(),
      childOffset: z.number().int().min(0).max(25000).optional(), childLimit: z.number().int().min(1).max(1000).optional(),
      segmentOffset: z.number().int().min(0).max(25000).optional(), segmentLimit: z.number().int().min(1).max(1000).optional(),
    }).strict().optional() }).strict(), annotations: { readOnlyHint: true } }, async (args) => {
    try { return jsonToolResult(await bridge.callPlugin("scope_read_node", args)); }
    catch (error) { return errorToolResult(error); }
  });
  server.registerTool("figma_operation_status", { description: "Read the local mutation audit state for one logical operation.",
    inputSchema: { operationId: z.string() }, annotations: { readOnlyHint: true } }, async ({ operationId }) => {
    try { return jsonToolResult(bridge.operationStatus(operationId)); }
    catch (error) { return errorToolResult(error); }
  });
  server.registerTool("figma_reconcile_create_operation", {
    description: "Read the connected test file to reconcile a previously sent scoped frame creation. Never retries the mutation.",
    inputSchema: { operationId: z.string() }, annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ operationId }) => {
    try { return jsonToolResult(await bridge.reconcileCreateOperation(operationId)); }
    catch (error) { return errorToolResult(error); }
  });
  registerTool(server, bridge, "figma_scope_create_frame", "Create an owned test frame under an explicitly scoped parent ID.", "scope_create_frame", { write: true, scoped: true });
  registerTool(server, bridge, "figma_scope_update_frame", "Rename an owned frame inside the authorized subtree.", "scope_update_frame", { write: true, scoped: true });
  registerTool(server, bridge, "figma_scope_delete_node", "Delete one owned frame inside the authorized subtree.", "scope_delete_node", { write: true, scoped: true });
  registerTool(server, bridge, "figma_scope_set_prototype", "Set ON_CLICK navigation between two frames inside the authorized subtree.", "scope_set_prototype", { write: true, scoped: true });
  if (enableTestFixtures) {
    registerTool(server, bridge, "figma_test_scope_create_frame_1ms_timeout",
      "Development test only: send one normally authorized scoped frame create with a 1 ms transport timeout.",
      "scope_create_frame", { write: true, scoped: true, timeoutMs: 1 });
    registerTool(server, bridge, "figma_scope_create_foreign_fixture", "Development test only: create one unowned marked frame inside the authorized scope.", "scope_create_foreign_fixture", { write: true, scoped: true });
    registerTool(server, bridge, "figma_scope_delete_foreign_fixture", "Development test only: remove one marked unowned fixture leaf inside the authorized scope.", "scope_delete_foreign_fixture", { write: true, scoped: true });
  }
  server.registerTool("figma_pairing_begin", {
    description: "Issue a short-lived one-time code for pairing the currently connected dedicated Figma test file with this local MCP server. The code is shown only in this response; enter it in the Development Plugin UI.",
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async () => {
    try {
      return jsonToolResult(bridge.beginPairing());
    } catch (error) {
      return errorToolResult(error);
    }
  });
  registerTool(server, bridge, "figma_create_poc", "Legacy implicit write; Scope Guard refuses this command. Use explicit scoped commands.", "create_poc", { timeoutMs: 30_000, write: true });
  registerTool(server, bridge, "figma_create_text", "Legacy implicit write; Scope Guard refuses this command.", "create_text", { write: true });
  registerTool(server, bridge, "figma_set_layout", "Legacy implicit write; Scope Guard refuses this command.", "set_layout", { write: true });
  registerTool(server, bridge, "figma_update_poc", "Legacy implicit write; Scope Guard refuses this command.", "update_poc", { write: true });
  registerTool(server, bridge, "figma_create_prototype_sample", "Legacy implicit write; Scope Guard refuses this command.", "create_prototype_sample", { timeoutMs: 20_000, write: true });
  server.tool("figma_export_poc", "Legacy implicit export; Scope Guard refuses this command.", WRITE_INPUT_SCHEMA, async (args) => {
    try {
      const result = await bridge.callPlugin("export_poc", args, 30_000);
      const bytes = decodePngBase64(result?.bytesBase64);
      await mkdir(EXPORT_DIR, { recursive: true });
      await writeFile(EXPORT_PATH, bytes, { flag: "w" });
      return {
        content: [
          { type: "text", text: JSON.stringify({ path: EXPORT_PATH, width: result.width, height: result.height,
            bytes: bytes.length, requestId: result.requestId, operationId: result.operationId }) },
          { type: "image", data: bytes.toString("base64"), mimeType: "image/png" },
        ],
      };
    } catch (error) {
      return errorToolResult(error);
    }
  });
  registerTool(server, bridge, "figma_delete_poc_owned", "Legacy implicit delete; Scope Guard refuses this command.", "delete_poc_owned", { timeoutMs: 20_000, write: true });

  return {
    server,
    bridge,
    async close() {
      await bridge.close();
      await server.close();
    },
  };
}

async function main() {
  const instance = await createMcpServer();
  const transport = new StdioServerTransport();
  let closing = false;
  const shutdown = async (reason) => {
    if (closing) return;
    closing = true;
    process.stderr.write(`[local-figma-bridge-poc] shutdown: ${reason}\n`);
    try {
      await transport.close();
    } catch {
      // The stdio stream may already be closed.
    }
    await instance.close();
  };
  process.stdin.once("end", () => void shutdown("stdin ended"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  await instance.server.connect(transport);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`[local-figma-bridge-poc] fatal: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
