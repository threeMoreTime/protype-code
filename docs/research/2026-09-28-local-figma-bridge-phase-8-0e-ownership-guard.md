# Local Figma Bridge — Increment 8.0-E Ownership Guard

Date: 2026-09-28. Phase: 8.0 Bridge Hardening. Target: dedicated Figma Design file `专用测试文件` (`dedicated-test-file`), Page `1:900002`. The formal H5 file remained denylisted.

## Result

**Ownership Guard: VERIFIED for the scoped local POC command path.** Real Figma Plugin API requests created, updated, and deleted task-owned Frames. Real negative requests for an unowned same-name node, another task's node, mixed-ownership subtree, spoofed client ownership, and an unowned prototype source returned stable errors; each was followed by unchanged Plugin API read-back and an unchanged mutation-attempt counter. The test Page was empty after cleanup and was independently read again in a new MCP/WS session.

The real test wrote its `final_verified` event, then the runner emitted an unsettled top-level await warning at `client.close()` and the outer command returned a nonzero exit status. The exact Node process exit code was not independently captured. This is a **test harness lifecycle failure**, not a failed Figma read-back. The runner now bounds the close wait, but that finalizer change has only passed syntax validation, not another real run. The generated development authorization file was left on disk; its grants expire at `2026-09-28T08:08:29Z`. A targeted local deletion was rejected by automatic execution review without a stated reason. No active MCP/WS listener remained after the runner exited. This state file is excluded from the evidence ZIP and must not be treated as a production authorization store.

**Phase 8.0 Gate: NOT VERIFIED. Formal H5 write authorization: false.** Timeout outcome reconciliation, structured audit, and the full 8.0-G matrix remain open.

## Increment plan and boundaries

The increment added trusted task metadata to newly created scoped nodes, checked owner/workspace/task before update, delete, and prototype-source mutation, and checked every descendant before deleting a subtree. The server derives task metadata from its own authorization record and passes it to the Plugin; client-sanitized-2 metadata is not an authorization source. A development-only fixture command created marked unowned nodes for negative tests. It is absent from the normal MCP tool surface unless `LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES=1`, and it still requires a separate server-issued `test_fixture` grant.

The implementation did not add DesignSpec, production H5 access, operation journaling, or timeout retry. The WebSocket listener remained bound to `127.0.0.1`; no REST/PAT/remote MCP/tunnel fallback was used for Figma.

## Source changes

- `plugin/code.js`: `markTaskOwned`, `assertTaskOwned`, recursive `assertTaskOwnedSubtree`, read-back metadata, and guarded fixture operations.
- `relay/bridge-server.mjs`: forwards `trustedOwnership` derived from the server authorization record; rejects fixture commands unless development mode is enabled.
- `relay/protocol.mjs`, `relay/task-authorization-store.mjs`, `mcp/server.mjs`: explicit fixture command/action mapping and gated MCP registration.
- `plugin/ui.html`: forwards trusted ownership/test flags and explicitly allowlists the two fixture commands. A missing UI allowlist entry caused the first fixture request to time out before reaching Plugin main; a failing UI test reproduced this and then passed after the one-line allowlist fix.
- `tests/ownership-guard.test.mjs`, `tests/task-authorization-protocol.test.mjs`, `tests/plugin-ui-disconnect.test.mjs`, `tests/scope-guard.test.mjs`: ownership, protocol, UI forwarding, and prior scope regression.
- `tests/ownership-guard-live.mjs`, `tests/ownership-guard-outcome-check.mjs`: real MCP/Figma matrix and read-only timeout reconciliation.

## Real Figma evidence

The first live run connected to dedicated file A and stopped before mutation because the runner was pinned to file B. The next run connected to file A and received `OWNERSHIP_CONTEXT_INVALID` before creating a node; the UI had omitted `trustedOwnership`. After a test-first fix, file B created owned Frame `1:900020` for task A and Frame `1:900021` for task B, both with server-derived owner/workspace/task/revision/operation metadata. A fixture request then timed out because the Plugin UI command allowlist omitted that command. Read-only reconciliation found exactly the same two Frames, no fixture, and mutation-attempt count `2`; no blind retry occurred. See the chronological `本地运行记录（未纳入公开包）*` and `本地运行记录（未纳入公开包）`.

The resumed run pinned file B, re-read Frames `1:900020` and `1:900021`, and then completed the matrix in one authenticated Plugin session. The following statuses are backed by `本地运行记录（未纳入公开包）`:

| Test | Real result | Evidence condition |
| --- | --- | --- |
| E01 trusted create | VERIFIED | Frame `1:900020` created; Plugin API read-back showed owner, workspace, task A, revision, spec key, and the same `operationId` as the MCP request. |
| E02 same-task update | VERIFIED | Task A changed Frame `1:900020` name; read-back matched. |
| E03 same-task delete | VERIFIED | Task A deleted Frame `1:900020`; read-back reported absent. |
| E04 foreign update | VERIFIED | Unowned same-name fixture rejected `OWNERSHIP_REQUIRED`; before/after node and Page were equal; mutation count delta `0`. |
| E05 foreign delete | VERIFIED | Same fixture rejected `OWNERSHIP_REQUIRED`; still present on read-back; mutation count delta `0`. |
| E06 wrong task | VERIFIED | Task B update and delete attempts on task A node rejected `OWNERSHIP_TASK_MISMATCH`; unchanged read-back; mutation count delta `0`. |
| E07 client spoof | VERIFIED | client-sanitized-2 owner claim did not override trusted metadata; rejected `OWNERSHIP_REQUIRED`, no mutation. |
| E08 mixed subtree delete | VERIFIED | Owned parent with unowned marked child rejected `OWNERSHIP_SUBTREE_VIOLATION`; both nodes remained and mutation count delta was `0`. |
| E09 prototype source | VERIFIED | Unowned source to owned destination rejected `OWNERSHIP_REQUIRED`; reaction and node state were unchanged; mutation count delta `0`. |

Every positive response carried `requestId` and the same logical `operationId` sent by MCP. Negative logs contain input, response, before/after read-back, and `mutationCount:0`. Marked fixtures, task B node, mixed parent, and task A node were deleted through the Plugin API; each deletion returned `exists:false` and was separately read back as absent. The final Page `1:900002` had `childIds=[]`. A new read-only MCP/WS session later confirmed the same empty Page and authenticated pairing in `本地运行记录（未纳入公开包）`.

## Regression and limits

`npm test`: **PASS 51/51**, including prior Pairing, Task Authorization, and Scope Guard coverage. Full output: `本地运行记录（未纳入公开包）`. The UI allowlist test was observed RED before the fix and GREEN afterward. `node --check tests/ownership-guard-live.mjs`: PASS after the close-wait change.

Ownership checks cover the new scoped mutation commands. Legacy implicit mutation commands already fail closed in Plugin main from 8.0-D. The development fixture mode and local JSON grants are test infrastructure, not a production authorization mechanism. The `client.close()` finalizer fix has not been rerun against Figma; the real mutation and read-back sequence itself was complete before that finalizer hung. The expired-grant lifecycle and finalizer should be revisited as part of 8.0-F/G hardening. General `timeout → delayed mutation` reconciliation remains **NOT VERIFIED**.

Formal H5 mutation: **0**. Business repository mutation: **0**. Figma Computer Use/UI automation: **0**. Figma REST/PAT/Remote MCP/Cloudflare/public tunnel fallback: **0**. Browser Computer Use was used separately for the user-authorized report handoff to Edge GPT; it was not part of the Figma design path.

## Gate impact and next increment

The 8.0-E ownership behavior and real positive/negative gate are **VERIFIED**. `currentPhase` remains `8.0`; `phase8_0Gate` remains `NOT VERIFIED`; `formalH5WriteAuthorized` remains `false`. Next increment: **8.0-F — Mutation Audit**, including the unresolved timeout/outcome and grant lifecycle concerns. Do not begin 8.0-F or write formal H5 as part of this increment.
