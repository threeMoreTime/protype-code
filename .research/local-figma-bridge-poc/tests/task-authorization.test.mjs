import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedTestFileIdentity } from "../scripts/issue-test-authorization.mjs";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";

const BASE = {
  workspaceId: "protype-code-local", taskId: "local-figma-bridge-poc",
  fileIdentity: "figma-file:test-a", clientId: "client-test-12345678",
  scope: { fileIdentity: "figma-file:test-a", pageId: "1:1", rootNodeId: "1:2" },
  allowedActions: ["create"], revision: "1",
  expiresAt: "2026-09-28T02:00:00.000Z",
};
const REQUEST = {
  workspaceId: BASE.workspaceId, taskId: BASE.taskId,
  fileIdentity: BASE.fileIdentity, clientId: BASE.clientId,
  action: "create", revision: "1",
};

test("trusted server record authorizes only its bound client, task, file, action and revision", async () => {
  const store = new TaskAuthorizationStore({ now: () => Date.parse("2026-09-28T01:00:00.000Z") });
  await store.initialize();
  const record = await store.issueForLocalControl(BASE);
  assert.match(record.authorizationId, /^auth-/);
  assert.equal(store.validate({ ...REQUEST, authorizationId: record.authorizationId }).authorizationId, record.authorizationId);
  for (const [change, code] of [
    [{ authorizationId: undefined }, "AUTH_REQUIRED"],
    [{ authorizationId: "auth-unknown" }, "AUTH_NOT_FOUND"],
    [{ taskId: "task-b" }, "AUTH_TASK_MISMATCH"],
    [{ workspaceId: "workspace-b" }, "AUTH_TASK_MISMATCH"],
    [{ fileIdentity: "figma-file:test-b" }, "AUTH_FILE_MISMATCH"],
    [{ clientId: "client-other-12345" }, "AUTH_INVALID"],
    [{ action: "delete", allowedActions: ["delete"] }, "ACTION_NOT_ALLOWED"],
    [{ revision: "2" }, "AUTH_REVISION_MISMATCH"],
  ]) {
    assert.throws(() => store.validate({ ...REQUEST, authorizationId: record.authorizationId, ...change }),
      (error) => error.message === code, code);
  }
  assert.throws(() => store.validate({ ...REQUEST, authorizationId: record.authorizationId, action: "arbitrary" }),
    /ACTION_NOT_ALLOWED/);
});

test("expired authorization fails closed using UTC timestamps", async () => {
  const store = new TaskAuthorizationStore({ now: () => Date.parse("2026-09-28T03:00:00.000Z") });
  await store.initialize();
  const record = await store.issueForLocalControl(BASE);
  assert.throws(() => store.validate({ ...REQUEST, authorizationId: record.authorizationId }), /AUTH_EXPIRED/);
});

test("operation id is required and distinct from each transport request id", () => {
  assert.equal(TaskAuthorizationStore.validOperationId("op-12345678"), true);
  assert.equal(TaskAuthorizationStore.validOperationId(""), false);
  assert.equal(TaskAuthorizationStore.validOperationId("req-12345678"), false);
});

test("local write authorization only accepts the explicit stable test identity", () => {
  const allowed = "figma-file:synthetic-test-target";
  const env = { LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: allowed };
  assert.equal(isAllowedTestFileIdentity(allowed, env), true);
  assert.equal(isAllowedTestFileIdentity("figma-file:synthetic-other-target", env), false);
  assert.equal(isAllowedTestFileIdentity("session-file:synthetic-session", env), false);
  assert.equal(isAllowedTestFileIdentity(allowed, {}), false);
});

test("renaming a document cannot change its stable-identity authorization decision", () => {
  const allowed = "figma-file:synthetic-test-target";
  const env = { LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: allowed };
  const file = { fileIdentity: "figma-file:synthetic-protected-target", name: "Synthetic protected design" };
  assert.equal(isAllowedTestFileIdentity(file.fileIdentity, env), false);
  file.name = "Renamed synthetic design";
  assert.equal(isAllowedTestFileIdentity(file.fileIdentity, env), false);
  assert.equal(isAllowedTestFileIdentity(allowed, env), true);
});
