# Phase 8.0-G3 — Consolidated security-negative Gate (2026-09-28)

## Increment result

**VERIFIED for the bounded G3 matrix:** On the real Windows/Figma Desktop Plugin connected to the dedicated `专用测试文件` file, one valid trusted grant created native owned Frame `1:900012` and Plugin API read-back confirmed its original `operationId`. Nine distinct denied mutations produced machine-readable errors and `REJECTED` audit records. For every deny, the before/after Figma read-back matched and the Plugin scoped mutation-attempt counter did not increase. An unowned, POC-marked fixture `1:900027` was used only for ownership negatives. Both test nodes were deleted through the authorized Bridge and read-back confirmed their absence. The target Page `1:900013` ended empty.

**NOT VERIFIED:** This is a security-negative integration matrix, not a general retry or outcome-reconciliation solution. A different real WebSocket client claiming another `clientId` was not attached to the live Figma session; the wrong-client case tested a server-side grant bound to another client while the actual paired Plugin remained connected. Existing protocol tests cover rejection of another/unpaired WebSocket client. Full Phase 8.0 Gate remains **NOT VERIFIED** because remaining update/delete/prototype unknown-outcome handling and lifecycle cases are open.

## Method and trust boundary

- Added only `tests/hardening-security-gate-live.mjs`; Bridge, Plugin, business code, and global MCP configuration were not changed in G3. The runner used real stdio MCP child processes and the existing WebSocket/Plugin API path.
- Pinned identity: `dedicated-test-file`, document `专用测试文件`, authorized Page/root `1:900013`, paired client `client-sanitized-3`. The other file identity in the wrong-file grant was the previously verified independent test file B, `dedicated-test-file`; the live Plugin stayed in test file A. Formal H5 was never used as a negative-test target.
- Task grants came from the local trusted authorization store under ignored `state/`, before the MCP child started. The request carried only grant IDs and task/action fields; it could not issue or enlarge a grant.
- The unpaired case used a new isolated, empty server Pairing store while the real Plugin retained its saved pairing. The invalid-pairing case used another isolated copy of the server store with a rotated secret. Neither the normal persisted server secret nor the Plugin's saved pairing was changed. The server logged `auth_rejected` for the real Plugin proof. After both stages, the normal store was loaded again and the Plugin reauthenticated over `127.0.0.1:41731`.
- Separate audit and stderr logs were created for the run. No secret, raw HMAC proof, or one-time pairing code was included in the report ZIP; `state/` was excluded.

## Real results

| Case | Real response | Figma state and audit |
| --- | --- | --- |
| Valid authorized control | `figma_scope_create_frame` created `1:900012` | Native `FRAME`, owner/task/operation read-back **VERIFIED** |
| Missing authorization | `AUTH_REQUIRED` | `REJECTED`; node/Page unchanged; mutation delta `0` |
| Grant bound to another client | `AUTH_INVALID` | `REJECTED`; node/Page unchanged; mutation delta `0` |
| Wrong task | `AUTH_TASK_MISMATCH` | `REJECTED`; node/Page unchanged; mutation delta `0` |
| Grant for independent test file B, actual file A | `SCOPE_FILE_MISMATCH` | `REJECTED`; node/Page unchanged; mutation delta `0` |
| Root from other Page | `SCOPE_ROOT_PAGE_MISMATCH` | `REJECTED`; node/Page unchanged; mutation delta `0` |
| Unowned fixture update | `OWNERSHIP_REQUIRED` | `REJECTED`; fixture/Page unchanged; mutation delta `0` |
| Unowned fixture delete | `OWNERSHIP_REQUIRED` | `REJECTED`; fixture/Page unchanged; mutation delta `0` |
| Real Plugin connected to unpaired server store | `PAIRING_REQUIRED` | `REJECTED`; `read_document` unchanged; mutation delta `0` |
| Real Plugin HMAC against rotated server secret | `PAIRING_REQUIRED`, server `auth_rejected` | `REJECTED`; `read_document` unchanged; mutation delta `0` |

The audit JSONL had **46 valid lines**, including **nine `REJECTED` terminal records** and **zero `OUTCOME_UNKNOWN`** records. Each negative case's input, `requestId`/`operationId`, response, before/after read-back, Plugin mutation counter, and audit record are in `本地运行记录（未纳入公开包）` and `本地运行记录（未纳入公开包）`. `本地运行记录（未纳入公开包）` has real handshake/authentication and `auth_rejected` events. Error-code fields named `code` in the evidence are the nine allowlisted machine error codes, not pairing codes.

## Preserved attempts and repair

1. The first runner attempt found the same dedicated test file but current Page `1:900002` rather than `1:900013`; its hard-pinned preflight failed **before any write**. Log: `本地运行记录（未纳入公开包）`.
2. The next attempt allowed the current Page to be either of the two known test Pages. Its first scoped create switched to Page `1:900013` through the existing Plugin API. The paired positive/negative matrix completed, and both owned and foreign fixtures were removed with successful responses and read-back. The unpaired stage then called `scope_read_node`, which the Plugin UI intentionally does not forward before authentication; it timed out after 12 seconds. **No unpaired mutation was sent.** Log: `本地运行记录（未纳入公开包）`.
3. The runner was corrected to use the Plugin's explicitly allowed unauthenticated `read_document` before/after snapshots. The final run completed all nine negatives and both cleanup operations; exit code `0`. Log: `本地运行记录（未纳入公开包）`.

## Verification and limits

- Full `npm test` with Plugin UI build: **62/62 PASS**, `本地运行记录（未纳入公开包）`. `node --check` for the G3 runner: **PASS**.
- The active listener after restoring normal state was observed at **`127.0.0.1:41731`**. The normal Plugin authentication completed after the rotated-secret test. Current Codex Desktop task direct MCP remains **NOT VERIFIED** because its earlier managed stdio transport closed in G2; the standalone Bridge is separate.
- Audit and stderr logs contain no secret/proof/token fields. The live test JSONL contains fields named `code` whose values are machine rejection codes; the packaging scan allowlists those error-code values and rejects other `code` values.
- Security: formal H5 mutation **0**, business repository mutation **0**, Figma Computer Use/Playwright/browser UI automation **0**, REST/PAT write **0**, Remote MCP **0**, public tunnel **0**. The user-authorized Edge GPT report handoff is separate from the Figma design chain.
- General update/delete/prototype `OUTCOME_UNKNOWN` reconciliation, safe retry, Plugin reload/Figma restart Gate cases, and current Codex Desktop task MCP recovery remain **NOT VERIFIED**.

**Status:** `securityNegativeMatrix=VERIFIED` for the nine listed live cases; `phase8_0Gate=NOT VERIFIED`, `currentPhase=8.0`, `currentIncrement=8.0-G Hardening Gate Suite`, `formalH5WriteAuthorized=false`.
