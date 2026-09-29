# Local Figma Bridge Phase 8.0 Hardening Plan

**Goal:** Complete Phase 8.0-B through 8.0-G with real local evidence, then stop after advancing the machine state to Phase 8.1 only if every hard gate passes.

**Architecture:** Keep the current stdio MCP server and its co-located loopback WebSocket listener. The Figma Development Plugin UI remains the WebSocket client, while the Plugin Main thread owns `figma.*` and persistent plugin client storage. Add authentication and authorization as ordered fail-closed gates before mutation, without involving the formal H5 file.

**Tech Stack:** Existing Node.js ESM, `@modelcontextprotocol/sdk`, `ws`, Figma Plugin API, Node `node:test`, Windows PowerShell.

## Global Constraints

- Current phase remains `8.0` until 8.0-G passes.
- `figma-file:<fileKey>` is identity only, never authorization.
- Formal H5 write remains denied; business repositories remain read-only.
- WebSocket binds only to `127.0.0.1`; no REST, PAT, Remote MCP, CUA/Playwright, Cloudflare, or public tunnel.
- Secrets and one-time codes must not enter ordinary logs or evidence packages.
- No commit, push, stage, reset, clean, or overwrite of existing untracked files.
- Every Increment uses tests first, preserves failed evidence, and reports one of the agreed evidence states.

---

## Repository and Evidence Baseline

Current authoritative inputs:

- `docs/roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md`
- `docs/roadmap/local-figma-bridge-status.json`
- `docs/research/2026-09-24-local-figma-bridge-phase-8-0-hardening.md`
- `.research/local-figma-bridge-poc/mcp/`
- `.research/local-figma-bridge-poc/relay/`
- `.research/local-figma-bridge-poc/plugin/`
- `.research/local-figma-bridge-poc/tests/`
- `.research/local-figma-bridge-poc/logs/`

The repository is an unborn `dev` branch with pre-existing untracked project contents. Work only in the isolated Bridge POC and designated Phase documentation.

## Increment 8.0-B — Pairing

**Files:**

- Create `.research/local-figma-bridge-poc/relay/pairing-store.mjs` for persistent `serverId` and pairing records.
- Modify `.research/local-figma-bridge-poc/relay/bridge-server.mjs` for handshake challenge, proof verification, read-only unpaired state, and mutation denial.
- Modify `.research/local-figma-bridge-poc/mcp/server.mjs` for a one-time pairing bootstrap tool.
- Modify `.research/local-figma-bridge-poc/plugin/code.js` and `plugin/ui.html` for Figma `clientStorage`, visible pairing entry, and proof generation.
- Create `.research/local-figma-bridge-poc/tests/pairing-store.test.mjs` and `.research/local-figma-bridge-poc/tests/pairing-protocol.test.mjs`.
- Save timestamped logs and update the Phase 8.0 report and `status.json`.

**Steps:**

1. Write tests proving IDs and pairing records persist without emitting secrets, one-time codes expire and cannot be reused, valid HMAC proof authenticates, invalid/stale proof fails closed, and unauthenticated writes never reach the plugin.
2. Run focused tests and record the expected RED failure before implementation.
3. Implement a one-time code with bounded expiry; store only its digest in process memory, consume once, and do not log its value.
4. Persist `serverId` and pairing verification secret in ignored local state; persist `clientId`, `pairingId`, and secret in Figma `clientStorage`. Document that this is private local storage, not a secure vault.
5. Bind proof to fresh nonce, `serverId`, `clientId`, `pairingId`, and protocol version using HMAC-SHA-256. Consume nonce after one attempt; compare proofs safely.
6. Keep status/read available while unpaired; deny every existing mutation command before it reaches Plugin Main.
7. Run focused and full `npm test`, then real local MCP and Figma tests in the dedicated test file. The real test must show unpaired write denied with unchanged document, user-approved pairing, a valid paired write/read-back, and restart/reconnect behavior.
8. If the plugin source reload requires a user action, request only `Run Development Plugin` in the current dedicated test file. If one-time pairing requires user input, request only that single pairing action after the bootstrap code is issued.

**Commands:** from `.research/local-figma-bridge-poc`, run `node --test tests/pairing-store.test.mjs tests/pairing-protocol.test.mjs`, then `npm test`.

**Exit:** valid paired connection verified; absent/wrong/replayed credentials cannot produce mutation; secret absent from normal logs; restart persistence verified or accurately marked NOT VERIFIED.

## Increment 8.0-C — Task Authorization

**Files:** Create `relay/task-authorization.mjs` and `tests/task-authorization.test.mjs`; modify MCP registration, bridge dispatch, plugin command envelope, report, and status only as required by tests.

**Steps:** Define a server-side authorization record with `workspaceId`, `taskId`, `fileIdentity`, `scope`, `allowedActions`, `revision`, and `expiresAt`. Request data may reference authorization but may not self-authorize. Write RED tests for missing, unknown, expired, wrong workspace/file/task, disallowed action, self-authorization, and revision mismatch. Implement the smallest validator; run focused and full tests; prove every denial has zero Plugin requests. Perform a real paired read and an intentionally un-authorized mutation attempt in the dedicated test file.

**Exit:** pairing identity and task permission are independently checked; no mutation occurs for invalid authorization.

## Increment 8.0-D — Scope Guard

**Files:** Create `relay/scope-guard.mjs` and `tests/scope-guard.test.mjs`; modify dispatch paths for create parent, update/delete target, and both prototype endpoints.

**Steps:** Model file/page/root/subtree scope; test correct ancestry, wrong file/page/root, sibling/outside subtree, create parent outside scope, and prototype target outside scope. Implement ancestry validation against actual Plugin API read-back data and fail closed when ancestry cannot be loaded. Run the real negative tests on the dedicated test document and verify its before/after node snapshots are identical.

**Exit:** all out-of-scope mutations are rejected before mutation and confirmed unchanged.

## Increment 8.0-E — Ownership Guard

**Files:** Create `relay/ownership.mjs` and `tests/ownership.test.mjs`; modify managed-node creation/update/delete paths and the Figma metadata envelope.

**Steps:** Define managed metadata `owner`, `workspaceId`, `taskId`, `operationId`, `revision`, and `specNodeKey`. Add RED cases for owned update/delete, foreign delete, forged ownership in request, same-name unowned node, and wrong-task ownership. Implement ownership reads from node pluginData in Plugin Main, not names or request claims. Execute real owned update/delete and foreign-node rejection in a dedicated test file; verify zero foreign mutation.

**Exit:** an owned node can be changed/deleted within scope, while foreign or forged ownership is rejected.

## Increment 8.0-F — Mutation Audit

**Files:** Create `relay/audit-log.mjs` and `tests/audit-log.test.mjs`; write append-only JSONL under `.research/local-figma-bridge-poc/logs/` with timestamped filenames.

**Steps:** Test valid JSONL for success and denial records, request correlation, bounded before/after summaries, and secret redaction. Implement records containing protocol/server/client/pairing/session/connection/request/workspace/task/auth/file/page/root/operation/target/result/error/latency fields while excluding secret, code, proof, and credential values. Confirm file append does not touch MCP stdout. Exercise a real paired mutation and a real denied mutation; verify both records and absence of secrets.

**Exit:** all mutation outcomes are parseable and correlated; no secret material appears in ordinary audit logs.

## Increment 8.0-G — Full Hardening Gate

**Files:** Create `tests/hardening-gate.mjs` and timestamped Gate evidence under `logs/`; update Phase report, `status.json`, and baseline only after all hard conditions pass.

**Steps:** Run the exact identity/pairing/auth/action/scope/ownership negative matrix from the user-provided specification. For each denial verify no Plugin request or an identical before/after Figma state. Run the valid paired+authorized create/read-back/update/read-back/owned-delete/read-back sequence. Verify plugin restart, combined MCP/Node restart, and Figma restart plus plugin rerun recovery. Confirm loopback binding, secret scan, formal H5 mutations = 0, business repository mutations = 0, and forbidden fallback count = 0. Package reports, relevant code/tests/evidence, and SHA-256 source manifest while excluding local pairing state and secrets.

**Exit:** only if every Phase 8.0 Gate is VERIFIED, update `phase8_0Gate=VERIFIED`, `overallStatus=BRIDGE_HARDENED`, and current phase to 8.1; otherwise preserve phase 8.0 and report exact blockers. Stop immediately after a successful transition; do not start Phase 8.1.
