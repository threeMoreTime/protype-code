# Local Figma Bridge — Increment 8.0-C Task Authorization

Date: 2026-09-28<br>
Phase: 8.0 — Bridge Hardening<br>
Increment: 8.0-C<br>
Overall: **VERIFIED for this increment; Phase 8.0 Gate NOT VERIFIED**

## INCREMENT PLAN

Keep the existing persistent file identity and HMAC pairing. Add a trusted server-side task authorization record and require its reference plus a caller-provided `operationId` on every non-read MCP tool. Reject invalid requests before WebSocket dispatch. Verify one real authorized Figma write and representative real negative writes in the dedicated test file. Leave Scope Guard, operation journal, and formal H5 integration for later increments.

## 1. Baseline and boundaries

The historical [Phase 8.0 report](2026-09-24-local-figma-bridge-phase-8-0-hardening.md) records 8.0-A and 8.0-B as VERIFIED. This increment used the previously paired `专用测试文件` document (`dedicated-test-file`). The alternate `dedicated-test-file` belongs to the other dedicated test file observed in 8.0-A. The formal `专用测试文件` denylist stayed in both relay and Plugin main. No formal H5 or business repository mutation occurred.

The working tree began as an unborn `dev` branch with user-owned untracked content. No reset, clean, stage, commit, or push was performed.

## 2. Implementation and trust boundary

`relay/task-authorization-store.mjs` holds server-side records with `authorizationId`, `workspaceId`, `taskId`, `clientId`, `fileIdentity`, `allowedActions`, `revision`, `issuedAt`, and `expiresAt`. Timestamp strings are UTC ISO 8601 with milliseconds. The development store is loaded from ignored `state/task-authorizations.json` at process start. Its local control method is **not** registered as an MCP tool. `scripts/issue-test-authorization.mjs` is a development-only OS-local control path; normal mutation requests may present an ID but cannot create a trusted record or replace its permissions. This file-based local administrator boundary is not a production approval service.

Every mutation enters `relay/bridge-server.mjs` through a fixed command-to-action mapping: `create_poc/create_text → create`, `set_layout/update_poc → update`, `create_prototype_sample → prototype`, `delete_poc_owned → delete`, `export_poc → export`. The allowed action vocabulary also reserves `metadata_write`. Unknown commands remain rejected by the existing command allowlist. The relay requires an authenticated Pairing, the formal-H5 denylist, matching stable `expectedFileIdentity`, a well-formed `operationId`, matching workspace/task, a server record bound to the paired plugin `clientId` and current file, unexpired authorization, allowed action, and exact revision. A rejection returns a stable code before WebSocket dispatch.

The MCP tool schema exposes `authorizationId`, `workspaceId`, `taskId`, `revision`, and `operationId` for each non-read tool. `authorizationId` and `operationId` remain optional at schema parsing so their absence reaches the relay and returns `AUTH_REQUIRED` or `OPERATION_ID_REQUIRED`. Permission claims supplied by the caller are not placed into the Plugin request. The Plugin UI forwards `operationId` through `postMessage`; Plugin main echoes it; the UI returns it through WebSocket; the relay correlates it to the pending `requestId` and includes both in the MCP response. `requestId` is one transport request; `operationId` is the caller's identifier for one logical mutation. The server does not generate a replacement operation ID.

## 3. RED → GREEN and regression

- Store unit tests initially failed because the module was absent. After implementation they covered valid binding, missing/unknown IDs, task/workspace/client/file/action/revision mismatches, UTC expiry, and operation ID syntax.
- Protocol tests initially failed because authenticated writes without authorization were forwarded and the operation ID was absent. After the relay change, rejected requests produced no WS mutation request; a valid request carried a distinct `requestId` and the same `operationId` into the result.
- Plugin main response test initially failed because `operationId` was absent. The minimal response change passed. The UI message test subsequently verified forwarding through `postMessage` and back to WS.
- The existing MCP simulated round-trip test now loads a trusted fixture and gives each logical mutation a distinct `operationId`; historical assertions remain in place.
- Final `npm test`: **38/38 PASS**, `node --check` on changed JavaScript: PASS. Evidence: `本地运行记录（未纳入公开包）`.

## 4. Real Figma validation

The real test runner started a fresh stdio MCP/Node server on `127.0.0.1:41731`, then required `connected=true`, `bridgeAuth.authenticated=true`, the exact dedicated document name, stable file identity, and paired client ID before any mutation. Session: `session-id-omitted`; connection for the write chain: `runtime-id-omitted`. It issued short-lived server-side fixtures before process launch and later removed the fixture file. Evidence: `本地运行记录（未纳入公开包）`.

### Positive C01 and C11

`figma_create_poc` used authorization `auth-sanitized-1`, logical operation `op-sanitized-1`, and transport request `runtime-id-omitted`. The MCP result arrived in 119 ms with that same operation ID. Plugin API read-back returned owned `FRAME` `1:900010`, `C2C Bridge POC`, parent page `1:900013`, `375×812`. **VERIFIED** real Figma mutation and read-back. The Plugin main/UI and relay operation ID propagation is additionally covered by direct tests and the relay response trace preserved in the live failure record.

### Negative C02–C10 and C12

For every row, the real runner read the Figma document immediately before and after the denied MCP call and compared pages and owned nodes. All calls returned the listed code; all design snapshots matched, with **mutation count 0**. Protocol tests independently asserted that denied commands were not sent over WS.

| Test | Input difference | Real MCP result |
|---|---|---|
| C02 | Missing `authorizationId` | `AUTH_REQUIRED` |
| C03 | Unknown ID | `AUTH_NOT_FOUND` |
| C04 | Wrong task | `AUTH_TASK_MISMATCH` |
| C05 | Wrong workspace | `AUTH_TASK_MISMATCH` |
| C06 | Record bound to the other dedicated file | `AUTH_FILE_MISMATCH` |
| C07 | Expired UTC record | `AUTH_EXPIRED` |
| C08 | Create-only record attempts delete and claims `allowedActions=["delete"]` | `ACTION_NOT_ALLOWED` |
| C09 | Unknown ID with self-declared workspace/task/file/actions | `AUTH_NOT_FOUND` |
| C10 | Revision `2` against record revision `1` | `AUTH_REVISION_MISMATCH` |
| C12 | Missing `operationId` | `OPERATION_ID_REQUIRED` |

C06 used the previously observed identity of the other dedicated file as the authorization's file binding; the plugin stayed on test file 2. The formal H5 file was not opened or used as a negative target.

### Cleanup error and read-only reconciliation

The authorized cleanup command carried `operationId=op-sanitized-1` and transport request `runtime-id-omitted`. It returned `Unable to establish connection to Figma after 10 seconds. Please check your internet connection.` **OBSERVED failure**, not a successful delete response. The runner stopped without retrying. A fresh read-only MCP process initially observed plugin reconnect lag, then reauthenticated and read `ownedPocNodes: []` at `2026-09-28T02:1:900016.408Z`. This verifies the final absence of the test node; the precise timing and internal stage of the deletion remain **NOT VERIFIED**. Evidence: `本地运行记录（未纳入公开包）`. The live runner was subsequently updated so a future delete error triggers read-only reconciliation rather than a blind retry; it was not rerun to create another node.

## 5. Lifecycle, security, and remaining limits

After validation, the temporary test authorization file was removed, the POC MCP/Node server was restarted, and the same plugin reauthenticated without a pairing code. The listener remained `127.0.0.1:41731`. Pairing regression passed in the full 38-test suite and the real reconnect. No active task grant was left in the POC store.

The development authorization store persists records in a local ignored JSON file until expiry or operator removal, but loads them only at server startup. It trusts the local OS user who runs the control script; it does not provide a separate production approval authority or protect against a compromised same-user process. Authorization IDs appear in the local test evidence and relay diagnostics; the fixtures were revoked before packaging, but a production audit path must redact capability references. Real wrong-pair and cross-process MCP-client impersonation were not retested in this increment. The existing formal H5 denylist takes priority over any ordinary authorization record.

The 8.0-B observation `MCP timeout → later Figma mutation` remains open. This increment adds a stable caller-generated `operationId` but **does not** deduplicate repeated operations, journal outcomes, prove a timeout means no mutation, or implement retry reconciliation. Those controls remain **NOT VERIFIED**, targeted at 8.0-F/G. Page/root scope guard and unified ownership guard belong to 8.0-D/E.

## 6. INCREMENT RESULT and Gate

| Item | Status |
|---|---|
| Server-side trusted authorization, ID, workspace/task/client/file binding, action, expiry, revision | **VERIFIED** by source, tests, and real positive/negative path |
| Self-authorization prevention | **VERIFIED** at the MCP boundary in the real test file |
| `operationId` required and propagated MCP → WS → Plugin → response | **VERIFIED** by direct protocol/UI/main tests and real create response |
| Authorized real Figma write/read-back | **VERIFIED** |
| Denied real Figma mutation count | **VERIFIED: 0** for C02–C10/C12 |
| Authorized cleanup API response | **OBSERVED: error**; final node absence separately VERIFIED |
| Timeout reconciliation / operation journal / deduplication | **NOT VERIFIED** |
| Full Phase 8.0 Gate | **NOT VERIFIED** |

Formal H5 mutation **0**; business repository mutation **0**; Computer Use, Playwright Figma control, browser Figma automation, REST write, PAT, Remote MCP, Cloudflare, and public tunnel usage **0**. No Git commit or push.

**Increment 8.0-C: VERIFIED.** The next increment is **8.0-D — Scope Guard**. Do not treat this result as authorization to modify the formal H5 document.
