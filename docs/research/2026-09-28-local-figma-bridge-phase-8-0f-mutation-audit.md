# Increment 8.0-F — Mutation Audit (2026-09-28)

## Result

**VERIFIED for this increment:** The local server persists structured mutation lifecycle records independently of MCP stdout. A real Figma create moved through `RECEIVED → VALIDATING → EXECUTING → APPLIED → VERIFIED` after Plugin API read-back. A separate real create deliberately timed out at the transport layer, was recorded as `OUTCOME_UNKNOWN`, and was confirmed by a read-only `operationId` reconciliation without reissuing create. Three real rejected writes were checked against Figma read-back and the Plugin mutation-attempt counter. The dedicated test page was empty after owned-node cleanup. `npm test`: **60/60 PASS**.

**NOT VERIFIED:** General outcome reconciliation for update, delete, prototype, and metadata writes; safe retry of a logically identical mutation; process-crash recovery in the middle of append/Plugin execution; tamper resistance of the local JSONL file. These remain explicit 8.0-G/production-hardening gaps. Phase 8.0 Gate remains **NOT VERIFIED** and formal H5 writing remains unauthorized.

## Scope and implementation

- `relay/mutation-audit.mjs` appends and `fsync`s one JSONL entry per lifecycle change, reloads the latest state by `operationId`, refuses malformed existing JSONL, and uses field allowlists instead of dumping request payloads or pairing material.
- `relay/bridge-server.mjs` records server-side authorization rejections, Plugin acknowledgments, disconnects, timeouts, stale responses, and server shutdown. Once a request may have reached the Plugin, timeout/disconnect/error uses `OUTCOME_UNKNOWN`; a same-`operationId` retry is blocked pending reconciliation. `requestId` remains one transport request; `operationId` remains one logical mutation.
- `mcp/server.mjs` exposes read-only `figma_operation_status` and `figma_reconcile_create_operation`. The latter scans only the trusted root, caps traversal at 200 nodes, and marks a create `VERIFIED` only when exactly one owned node matches the original operation, workspace, and task. It never resends create.
- `plugin/code.js` returns a compact pre-mutation node snapshot for scoped writes and reports `mutationAuditVersion=8.0-F`. It continues to perform native Figma Plugin API mutations; the audit is server-side.
- Default audit file: ignored `state/mutation-audit.jsonl`. The real runners used distinct timestamped `本地运行记录（未纳入公开包）*-audit-*.jsonl` files and dedicated, short-lived trusted grant stores. Those grant stores are excluded from delivery ZIPs.

Audit fields include `timestamp`, `workspaceId`, `taskId`, persistent `fileIdentity`, `sessionId`, `connectionId`, `requestId`, `operationId`, `authorizationId`, action/command, page/root scope, target, available before/after summaries, result, latency, and error code. Pre-validation entries cannot yet contain a validated page/root or Plugin before snapshot; their absence is explicit in the JSONL. Audit records are local filesystem evidence, not a production-grade tamper-proof journal.

## Real Figma validation

The only write target was `专用测试文件`, identity `dedicated-test-file`, current Page `1:900013` (`Codex Bridge POC`). The Plugin status showed `mutationAuditVersion=8.0-F`, authenticated Pairing, and the persistent file key. A preflight read confirmed an empty Page. No Figma UI automation or REST path was used.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Authorized create and read-back | **VERIFIED**. Frame `1:900022` was created under Page `1:900013`; its `createdOperationId`, owner, workspace, and task were read back. The audit moved to `APPLIED`, then read-only reconciliation to `VERIFIED`. | `本地运行记录（未纳入公开包）`, `本地运行记录（未纳入公开包）` |
| Missing authorization | **VERIFIED**. `AUTH_REQUIRED`; before/after node read-back matched and Plugin mutation count did not change. | Same MCP and audit logs. |
| Root from other test Page | **VERIFIED**. `SCOPE_ROOT_PAGE_MISMATCH`; before/after node read-back matched and Plugin mutation count did not change. | Same MCP and audit logs. |
| Foreign ownership | **VERIFIED**. `OWNERSHIP_REQUIRED`; foreign fixture was unchanged, then removed through its restricted test-fixture command. | Same MCP and audit logs. |
| Owned cleanup | **VERIFIED**. Delete response and Plugin API read-back showed the test node absent and Page child list empty. | Same MCP log. |
| Forced 1 ms transport timeout | **VERIFIED**. The real Plugin API created Frame `1:900023` after the caller received a timeout. Audit first showed `OUTCOME_UNKNOWN` with `TRANSPORT_TIMEOUT`; read-only reconciliation found one matching node and changed the state to `VERIFIED`. No create retry was sent. Frame `1:900023` was then deleted with read-back; Page child list was empty. | `本地运行记录（未纳入公开包）`, `本地运行记录（未纳入公开包）` |

Two interrupted preflight runs are preserved. The first connected to the correct file but found current Page `1:900013` instead of the script's old Page `1:900002`; it sent **zero mutations**. The second created Frame `1:900024`, then an invalid, nonexistent root triggered a Figma API connection timeout. That operation was recorded `OUTCOME_UNKNOWN`, **not** treated as a successful scope denial. Frame `1:900024` was independently read, checked by exact ID/owner/task/creation operation, and deleted with read-back by `tests/cleanup-phase8-0f-orphan.mjs`. The successful rerun used a real other-Page root and verified the scope rejection. Original failure logs were not overwritten.

## Automated and security checks

- RED→GREEN tests cover JSONL persistence/corruption handling, server rejection, Plugin acknowledgment, timeout, repeated-operation blocking, read-only reconciliation, authenticated audit access, disconnect, server shutdown, and stale response. Full regression: `本地运行记录（未纳入公开包）`, **60/60 PASS**.
- The real audit files were parsed as JSONL and scanned for pairing-secret/proof/code property names. No such fields were found. The local pairing store and short-lived authorization store are deliberately excluded from the ZIP.
- Listener remains `127.0.0.1:41731`; `ws://localhost:41731` remains only the Figma Development Plugin manifest endpoint.
- Formal H5 mutations: **0**. Business repository mutations: **0**. Figma Computer Use/Playwright/browser Figma/REST/PAT/Remote MCP/Cloudflare/public tunnel fallback: **0**.

## Gate and next increment

**Increment 8.0-F Mutation Audit: VERIFIED for the stated POC scope.** The observed timeout-to-late-create risk now has a real, read-only resolution for scoped create, while other mutation types remain **NOT VERIFIED**. **Phase 8.0 Gate: NOT VERIFIED.** `formalH5WriteAuthorized=false`.

**NEXT INCREMENT: 8.0-G — Hardening Gate Suite.** Run the full restart/wrong-client/wrong-file/wrong-task/wrong-scope/foreign-node matrix against the dedicated file, review unresolved mutation outcomes and audit completeness, and advance Phase only if every hard condition passes. Do not write formal H5.
