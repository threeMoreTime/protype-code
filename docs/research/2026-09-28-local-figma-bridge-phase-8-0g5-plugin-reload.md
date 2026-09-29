# Phase 8.0-G5 — Plugin runtime reload recovery (2026-09-28)

## Increment result

**VERIFIED, bounded claim:** In the dedicated `专用测试文件` Design file, one stdio MCP/WS Node process (PID `49584`) remained alive while the Development Plugin runtime was manually rerun. The Plugin `sessionId` changed from `session-id-omitted` to `session-id-omitted`; `connectionId` changed from `runtime-id-omitted` to `runtime-id-omitted`. Persistent file identity, client ID, and pairing ID remained the same, and the new session authenticated without a new pairing code.

This proves recovery for one real Plugin runtime reload while Node/MCP stayed up. It does not prove a Figma Desktop process restart, simultaneous reload with an in-flight mutation, Codex Desktop direct MCP attachment, or general unknown-outcome reconciliation. `phase8_0Gate=NOT VERIFIED` and `formalH5WriteAuthorized=false` remain unchanged.

## Implementation and boundaries

- Added `tests/hardening-plugin-reload-live.mjs`, an isolated real MCP/Plugin runner. It issued a short-lived server-side task authorization into a test-specific state file; that file is excluded from the evidence ZIP. The runner used existing scoped create/update/delete/read tools. No Bridge production path or Plugin source changed.
- The runner first pinned document name `专用测试文件`, file identity `dedicated-test-file`, Page/root `1:900013`, and the expected paired client. Formal H5 was never connected for a mutation.
- The only manual Figma action was rerunning `Plugins → Development → Local Codex Figma Bridge POC` in the dedicated file. No Canvas action or Figma UI automation was used.
- The actual TCP listener was observed at `127.0.0.1:41731`, owned by PID `49584` while the runner was waiting for reload. The manifest remains `ws://localhost:41731` as required by Figma's Development Plugin URL validation.

## Real sequence and evidence

The final run is `本地运行记录（未纳入公开包）`, with WS stderr `本地运行记录（未纳入公开包）`, mutation audit `本地运行记录（未纳入公开包）`, and captured process exit code `0`.

1. Before reload, the grant bound workspace `protype-code-local`, task `hardening-plugin-reload`, client, stable file identity, Page/root `1:900013`, and actions `create/update/delete`. `figma_scope_create_frame` created native owned Frame `1:900029` under `1:900013`. Plugin API read-back confirmed owner, workspace, task, revision, parent, and `createdOperationId`; audit state was `APPLIED`.
2. The runner remained alive at the reload boundary (PID `49584`). The real Plugin returned the new `sessionId` and `connectionId` above with the same persistent file identity, client ID, pairing ID, and authenticated status. The exact Frame read-back before and after reload matched.
3. In the new Plugin session, `figma_scope_update_frame` without `authorizationId` returned `AUTH_REQUIRED`. Audit recorded `REJECTED`, request ID `runtime-id-omitted`, and the same `operationId` as the request. Node and Page read-backs before/after were equal; the new session's Plugin mutation-attempt counter delta was `0`.
4. The still-valid original grant then updated Frame `1:900029` to `Hardening G5 Reload Updated`. Plugin API read-back matched, ownership metadata remained intact, and audit state was `APPLIED`. A separate authorized delete returned success; read-back returned `exists:false`, audit state was `APPLIED`, and Page `1:900013` returned to its original empty child list.
5. The same MCP PID was checked before reload, after reload, after denial, and at the end. No mutation was blindly retried.

## Preserved failed attempt

At `09:33:44Z`, the first runner exited `1` before sending any mutation. Its test harness incorrectly assumed pairing IDs start with `pair-`; the existing real ID is a UUID. The assertion was corrected to require a nonempty string. The failed log and the final successful log are both retained. This was a runner assertion error, not a Pairing or Plugin API failure.

## Verification and remaining gaps

- `node --check tests/hardening-plugin-reload-live.mjs`: **PASS**.
- Full `npm test`: **62/62 PASS** (`本地运行记录（未纳入公开包）`). G5 changed no production Bridge code and introduced no new mock assertions.
- Real Figma Plugin runtime reload, persistent Pairing, same-process task authorization, owned metadata read-back, denied write with state unchanged, authorized update, and owned cleanup: **VERIFIED** for this dedicated file and sequence.
- Formal H5 mutation `0`; business repository mutation `0`; Computer Use/Playwright/browser Figma automation `0`; REST/PAT write `0`; Remote MCP `0`; tunnel `0`.
- General update/delete/prototype `OUTCOME_UNKNOWN` reconciliation, safe retry, in-flight reload behavior, Figma Desktop process restart under the full G Gate, and Codex Desktop direct MCP remain **NOT VERIFIED**. Phase 8.0 remains open.

**Next smallest 8.0-G item:** choose one remaining lifecycle or unknown-outcome gate case using the current evidence; do not advance to Phase 8.1 or write formal H5.
