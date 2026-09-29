# Phase 8.0-G1 — Bridge restart and same-operation guard (2026-09-28)

## Increment result

**VERIFIED for this bounded Gate item:** An authenticated Development Plugin in the dedicated `专用测试文件` file performed one native scoped Frame create after a deliberately forced 1 ms transport timeout. The Bridge listener was closed and recreated with the persisted Pairing, task grant, and audit files. The Plugin reconnected and authenticated with the same session ID and a new connection ID. Resending the **same** logical `operationId` returned `OPERATION_OUTCOME_UNKNOWN` before another Plugin mutation attempt. Read-only reconciliation found exactly one owned Frame with the matching creation operation; Page read-back contained exactly that one child. The final Page read-back after owned cleanup was empty.

**NOT VERIFIED:** This runner restarted the Bridge listener inside the **same Node PID**, not an OS-level Node/MCP subprocess. It does not complete the Plugin reload, Node/MCP process restart, Figma restart, wrong-client/security-negative matrix, or update/delete/prototype outcome reconciliation portions of 8.0-G. Phase 8.0 Gate remains **NOT VERIFIED**. Formal H5 writing remains unauthorized.

## Files and method

- Added the persisted timeout/restart protocol case to `.research/local-figma-bridge-poc/tests/task-authorization-protocol.test.mjs`. It reloads Pairing, authorization, and audit stores from disk, reauthenticates a simulated Plugin, and asserts that zero duplicate mutation requests cross WebSocket after restart.
- Added `.research/local-figma-bridge-poc/tests/hardening-restart-timeout-live.mjs` for the real Figma test. It hard-pins document name, persistent file identity, Page ID, and paired client ID, and requires the dedicated Page to be empty before writing. The grant is server-side and short lived.
- Added `.research/local-figma-bridge-poc/tests/hardening-recover-owned-node.mjs` for read-back after an ambiguous cleanup response. It checks the Page twice before any possible new delete and requires exact owner/workspace/task/creation operation on a remaining leaf before a new cleanup action. The observed recovery path sent **no new mutation**.
- No Bridge, Plugin, business repository, global MCP configuration, or formal H5 source was changed. No commit or push was made.

## Real evidence and chronology

1. The first real attempt stopped during read-only preflight because the runner incorrectly expected the MCP-added `bridgeAuth` field in the raw Plugin status. This was a test assertion bug; **zero mutations** were sent. Original log: `本地运行记录（未纳入公开包）`.
2. The next run observed a real timeout and created owned Frame `1:900025`. After listener restart, same-operation resend returned `OPERATION_OUTCOME_UNKNOWN`; Plugin scoped mutation count remained `9→9`, and read-only reconciliation found one matching Frame. Cleanup then received a 10-second Figma connection error. Its audit state was `OUTCOME_UNKNOWN`, so the runner did not blindly retry. Original logs: `本地运行记录（未纳入公开包）` and `本地运行记录（未纳入公开包）`.
3. A first read-only recovery attempt could not resolve the exact deleted node ID because Figma returned the same 10-second connection error. It sent **zero mutations**. Log: `本地运行记录（未纳入公开包）`.
4. The recovery runner then read Page `1:900013` twice, two seconds apart. Both `childIds` arrays were empty. It sent **zero new mutations** and recorded `VERIFIED_ABSENT_FROM_PAGE_NO_NEW_MUTATION`. This establishes absence from the authorized Page; exact deleted-ID lookup remained unavailable in that recovery attempt. Log: `本地运行记录（未纳入公开包）`.
5. The final rerun used a new operation `op-sanitized-1`. The forced timeout was audited as `OUTCOME_UNKNOWN/TRANSPORT_TIMEOUT`. After Bridge listener restart, the Plugin retained session `session-id-omitted` while connection changed from `runtime-id-omitted` to `runtime-id-omitted`. The same-operation resend returned `OPERATION_OUTCOME_UNKNOWN`; Plugin mutation count remained `11→11`; before/after Page child IDs matched. Read-only reconciliation found exactly Frame `1:900026`, with the original operation ID and trusted owner/workspace/task metadata. Owned delete returned normally, and Page read-back was empty. Logs: `本地运行记录（未纳入公开包）` and `本地运行记录（未纳入公开包）`.

The 1 ms call timeout did **not** mean the Figma write failed. The recovered audit and Plugin read-back, rather than the transport error alone, establish the actual outcome. The runner did not resend create during reconciliation.

## Automated verification

- Targeted persisted restart protocol test: **1/1 PASS**.
- Full `npm test` with plugin UI build: **61/61 PASS**, `本地运行记录（未纳入公开包）`.
- `node --check` for both live runners: **PASS**.
- The real WebSocket handshake recorded `remoteAddress=127.0.0.1`. The manifest continues to use `ws://localhost:41731` only because Figma rejects the IPv4 literal in its development domain field.

## Security and unresolved Gate work

- Formal H5 mutation: **0**; business repository mutation: **0**; Figma Computer Use, Figma browser automation, Playwright, REST/PAT write, Remote MCP, tunnel, Cloudflare: **0**.
- Pairing store and short-lived authorization grants remain under ignored `state/` and are excluded from the evidence ZIP. Audit JSONL is field-allowlisted; the delivered logs were scanned for pairing secret, proof, and one-time-code fields.
- This increment confirms a **same-operation fail-closed guard** across an in-process Bridge listener restart. It does **not** prove a safe retry or general reconciliation for update/delete/prototype. The observed delete API connection error remains evidence that response ambiguity needs a broader 8.0-G decision.
- Next Gate item: repeat the persisted operation test across **separate Node/MCP PIDs**, then complete the real wrong-client, wrong-pairing, wrong-task/file/scope/foreign-node matrix with read-back and zero-mutation evidence. Do not advance to Phase 8.1 until the full Gate passes.

**Status:** `currentPhase=8.0`, `currentIncrement=8.0-G Hardening Gate Suite`, `phase8_0Gate=NOT VERIFIED`, `formalH5WriteAuthorized=false`.
