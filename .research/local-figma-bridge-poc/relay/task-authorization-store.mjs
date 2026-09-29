import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const AUTH_ACTIONS = new Set(["create", "update", "delete", "prototype", "metadata_write", "export", "test_fixture"]);
const IDENTIFIER = /^[A-Za-z0-9._:-]{1,160}$/;
const OPERATION_ID = /^op-[A-Za-z0-9_-]{8,100}$/;
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const NODE_ID = /^[0-9]+:[0-9]+$/;

function validScope(scope, fileIdentity) {
  return Boolean(scope && scope.fileIdentity === fileIdentity &&
    NODE_ID.test(scope.pageId) && NODE_ID.test(scope.rootNodeId));
}

function validRecord(record, allowLegacy = false) {
  return Boolean(record && IDENTIFIER.test(record.authorizationId) &&
    IDENTIFIER.test(record.workspaceId) && IDENTIFIER.test(record.taskId) &&
    typeof record.fileIdentity === "string" && record.fileIdentity.startsWith("figma-file:") &&
    ((allowLegacy && record.scope === undefined) || validScope(record.scope, record.fileIdentity)) &&
    IDENTIFIER.test(record.clientId) && IDENTIFIER.test(record.revision) &&
    Array.isArray(record.allowedActions) && record.allowedActions.length > 0 &&
    record.allowedActions.every((action) => AUTH_ACTIONS.has(action)) &&
    UTC_INSTANT.test(record.issuedAt) && Number.isFinite(Date.parse(record.issuedAt)) &&
    UTC_INSTANT.test(record.expiresAt) && Number.isFinite(Date.parse(record.expiresAt)));
}

export class TaskAuthorizationStore {
  #filePath;
  #now;
  #records = null;

  constructor({ filePath = null, now = Date.now } = {}) {
    this.#filePath = filePath ? path.resolve(filePath) : null;
    this.#now = now;
  }

  static validOperationId(value) {
    return typeof value === "string" && OPERATION_ID.test(value);
  }

  async initialize() {
    if (this.#records) return;
    this.#records = new Map();
    if (!this.#filePath) return;
    try {
      const parsed = JSON.parse(await readFile(this.#filePath, "utf8"));
      if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.records)) throw new Error("AUTH_STORE_INVALID");
      for (const record of parsed.records) {
        if (!validRecord(record, true) || this.#records.has(record.authorizationId)) throw new Error("AUTH_STORE_INVALID");
        this.#records.set(record.authorizationId, Object.freeze({ ...record,
          ...(record.scope ? { scope: Object.freeze({ ...record.scope }) } : {}),
          allowedActions: Object.freeze([...record.allowedActions]) }));
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  // Called only by the local control script or a test fixture; never exposed as an MCP tool.
  async issueForLocalControl(fields) {
    if (!this.#records) throw new Error("AUTH_STORE_NOT_INITIALIZED");
    const record = {
      authorizationId: `auth-${randomUUID()}`,
      workspaceId: fields.workspaceId,
      taskId: fields.taskId,
      fileIdentity: fields.fileIdentity,
      scope: fields.scope,
      clientId: fields.clientId,
      allowedActions: [...fields.allowedActions],
      revision: fields.revision,
      issuedAt: new Date(this.#now()).toISOString(),
      expiresAt: fields.expiresAt,
    };
    if (!validRecord(record)) throw new Error("AUTH_INVALID");
    this.#records.set(record.authorizationId, Object.freeze({ ...record, scope: Object.freeze({ ...record.scope }), allowedActions: Object.freeze([...record.allowedActions]) }));
    if (this.#filePath) {
      await mkdir(path.dirname(this.#filePath), { recursive: true });
      const temporary = `${this.#filePath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify({ schemaVersion: 1, records: [...this.#records.values()] }, null, 2), { encoding: "utf8", mode: 0o600 });
      await rename(temporary, this.#filePath);
    }
    return record;
  }

  validate({ authorizationId, workspaceId, taskId, fileIdentity, clientId, action, revision }) {
    if (!authorizationId) throw new Error("AUTH_REQUIRED");
    if (!IDENTIFIER.test(authorizationId)) throw new Error("AUTH_INVALID");
    const record = this.#records?.get(authorizationId);
    if (!record) throw new Error("AUTH_NOT_FOUND");
    if (record.workspaceId !== workspaceId || record.taskId !== taskId) throw new Error("AUTH_TASK_MISMATCH");
    if (record.clientId !== clientId) throw new Error("AUTH_INVALID");
    if (record.fileIdentity !== fileIdentity) throw new Error("AUTH_FILE_MISMATCH");
    if (this.#now() >= Date.parse(record.expiresAt)) throw new Error("AUTH_EXPIRED");
    if (!AUTH_ACTIONS.has(action) || !record.allowedActions.includes(action)) throw new Error("ACTION_NOT_ALLOWED");
    if (record.revision !== revision) throw new Error("AUTH_REVISION_MISMATCH");
    return record;
  }
}
