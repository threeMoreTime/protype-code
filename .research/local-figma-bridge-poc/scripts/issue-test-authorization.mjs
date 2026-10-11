// Development-only local control path. Deliberately not registered as an MCP tool.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

const FILE_IDENTITY_PREFIX = "figma-file:";
const ALLOWLIST_ENV = "LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES";

function configuredTestFileIdentities(env = process.env) {
  const raw = env[ALLOWLIST_ENV];
  if (typeof raw !== "string") return new Set();
  const identities = new Set();
  for (const candidate of raw.split(/[,\r\n]/)) {
    const identity = candidate.trim();
    if (!identity) continue;
    if (!/^figma-file:[A-Za-z0-9_-]+$/.test(identity)) return new Set();
    identities.add(identity);
  }
  return identities;
}

export function isAllowedTestFileIdentity(fileIdentity, env = process.env) {
  return typeof fileIdentity === "string" && configuredTestFileIdentities(env).has(fileIdentity);
}

export function requireLocalTestValue(name, env = process.env) {
  const value = env[name];
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new Error(`Required local test setting is missing: ${name}`);
  }
  return value;
}

export function requireLocalTestFileIdentity(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  if (!/^figma-file:[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Required local test setting must be a stable file identity: ${name}`);
  }
  return value;
}

export function requireLocalTestClientId(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  if (!/^client-[a-z0-9-]{8,100}$/.test(value)) {
    throw new Error(`Required local test setting must be a client identity: ${name}`);
  }
  return value;
}
export function requireLocalTestNodeId(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  if (!/^\d+:\d+$/.test(value)) {
    throw new Error(`Required local test setting must be a Figma node ID: ${name}`);
  }
  return value;
}

export function requireLocalTestNodeIds(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  const nodeIds = value.split(",").map((item) => item.trim());
  if (nodeIds.some((nodeId) => !/^\d+:\d+$/.test(nodeId))) {
    throw new Error(`Required local test setting must be a comma-separated list of Figma node IDs: ${name}`);
  }
  return nodeIds;
}
export function requireLocalTestOperationId(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  if (!/^op-[A-Za-z0-9_-]{8,100}$/.test(value)) {
    throw new Error(`Required local test setting must be an operation ID: ${name}`);
  }
  return value;
}

export function requireLocalTestAuthorizationId(name, env = process.env) {
  const value = requireLocalTestValue(name, env);
  if (!/^auth-[A-Za-z0-9_-]{8,100}$/.test(value)) {
    throw new Error(`Required local test setting must be an authorization ID: ${name}`);
  }
  return value;
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [fileIdentity, clientId, pageId, rootNodeId, actions = "create,delete", durationMinutes = "10"] = process.argv.slice(2);
  const minutes = Number(durationMinutes);
  if (!isAllowedTestFileIdentity(fileIdentity) || !/^client-[a-z0-9-]{8,100}$/.test(clientId || "") ||
      !/^[0-9]+:[0-9]+$/.test(pageId || "") || !/^[0-9]+:[0-9]+$/.test(rootNodeId || "") ||
      !Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    process.stderr.write("Test authorization requires an exact stable file identity allowlisted by LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES.\n");
    process.stderr.write("Usage: node scripts/issue-test-authorization.mjs <figma-file:identity> <clientId> <pageId> <rootNodeId> [actions] [ttlMinutes 1..60]\n");
    process.exitCode = 1;
  } else {
    const store = new TaskAuthorizationStore({ filePath: process.env.LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH || path.join(ROOT, "state", "task-authorizations.json") });
    await store.initialize();
    const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
      fileIdentity, clientId, scope: { fileIdentity, pageId, rootNodeId },
      allowedActions: actions.split(","), revision: "1",
      expiresAt: new Date(Date.now() + minutes * 60_000).toISOString() });
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }
}
