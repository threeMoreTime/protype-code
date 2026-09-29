# Phase 8.0-G2 — Cross-process Node/MCP restart, same-operation guard (2026-09-28)

## Increment result

**VERIFIED for this bounded Gate item:** Two real Windows Node subprocesses, each running the POC stdio MCP server and loopback WebSocket listener, used distinct OS PIDs (`27720` and `56872`). Process A issued an authorized scoped Frame create with a forced 1 ms transport timeout. The Figma Plugin API nevertheless created exactly one native owned Frame (`1:900011`). Process A exited. Process B loaded the persisted Pairing, task authorization, and mutation audit stores, then the same Plugin session reauthenticated through a new connection. Reusing the original logical `operationId` returned `OPERATION_OUTCOME_UNKNOWN` before another Plugin mutation attempt. The Plugin mutation count remained `13→13`; Page child IDs were unchanged; read-only reconciliation found exactly the one owned Frame with the original operation ID.

**NOT VERIFIED:** This result does not prove safe retries or general outcome reconciliation for update, delete, or prototype mutations. It does not cover Plugin reload/Figma restart or the remaining wrong-client and security-negative Gate matrix. Phase 8.0 Gate remains **NOT VERIFIED**; formal H5 writing remains unauthorized.

## Method and source changes

- A RED test was added to `tests/protocol.test.mjs`: the 1 ms create fixture must be exposed only when `LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES=1`, and the ordinary MCP tool list must exclude it. After the test failed as expected, `mcp/server.mjs` gained one conditional registration mapping the fixture to the existing authorized `scope_create_frame` command. No normal write command or Plugin mutation behavior changed.
- `tests/hardening-process-restart-live.mjs` starts actual stdio MCP/WS child process A, records its PID, performs the timeout test, closes A, verifies A exited, starts process B with the same persisted stores, and checks the same-operation rejection plus Figma read-back. It hard-pins the dedicated document name, persistent file identity, Page ID, and paired client ID before writing. The test authorization is issued through the local trusted store with a short expiry and remains under ignored `state/`.
- The Figma target was the dedicated `专用测试文件` file, identity `dedicated-test-file`, Page `1:900013`. The Page was empty before create. Neither formal H5 nor business code was modified.
- To free the single local port for this isolated restart test, the exact POC MCP child owned by the current Codex Desktop task was stopped after verifying its command line and `127.0.0.1:41731` listener. No global MCP configuration was changed. The Desktop task's direct MCP tool transport did **not** auto-reattach afterward: subsequent direct calls returned `Transport closed`. The standalone Bridge server later re-established Plugin connectivity, but **Codex Desktop direct MCP recovery is NOT VERIFIED**.

## Real chronology and evidence

1. Process A, PID `27720`, received authenticated status for the dedicated file with Plugin session `session-id-omitted` and connection `runtime-id-omitted`. The Page read-back was empty. A 1 ms create call timed out; audit recorded `OUTCOME_UNKNOWN / TRANSPORT_TIMEOUT` for `op-sanitized-1`. A following read found native Frame `1:900011`, owner `local-codex-figma-bridge-poc`, task `hardening-cross-process`, and that same creation operation.
2. A exited. Process B started as PID `56872` and reloaded the same authorization and audit paths. The Plugin reconnected under connection `runtime-id-omitted` and authenticated with the same session ID. B read the persisted `OUTCOME_UNKNOWN` record.
3. B sent the ordinary `figma_scope_create_frame` tool with the **same** `operationId`. The server returned `OPERATION_OUTCOME_UNKNOWN: reconcile before retry`; scoped mutation attempts remained `13→13`, and before/after Page child IDs were both `["1:900011"]`. Read-only `figma_reconcile_create_operation` returned `VERIFIED` with exactly Frame `1:900011`. The duplicate create was not sent to Plugin main.
4. B issued a distinct, authorized owned-node delete for cleanup. The MCP delete response was a Figma connection error after 10.874 seconds; **the delete API response is NOT VERIFIED as successful**. An immediate Page read-back was empty. No blind delete retry was sent. In a separate Bridge session, Page `1:900013` was read twice, two seconds apart; both child lists remained empty and that recovery session sent **zero mutations**. This verifies absence from the authorized Page, while the earlier delete response remains ambiguous.

Original request/response, PIDs, session/connection IDs, operation IDs, audit states, mutation counts, and Page read-back are in `本地运行记录（未纳入公开包）` and `本地运行记录（未纳入公开包）`. Separate process stderr is in `本地运行记录（未纳入公开包）` and `本地运行记录（未纳入公开包）`. Independent cleanup read-back is in `本地运行记录（未纳入公开包）`. The temporary authorization file under `state/` is excluded from the evidence package.

## Automated verification

- Full `npm test`, including the Plugin UI build: **62/62 PASS**, saved in `本地运行记录（未纳入公开包）`.
- `node --check` for `mcp/server.mjs`, the G2 runner, and the recovery runner: **PASS**.
- The live WebSocket server bound only `127.0.0.1:41731`; Plugin handshake logged `remoteAddress=127.0.0.1`. The manifest continues to use `ws://localhost:41731` due to Figma's development-domain validation.
- The delivered G2 logs were checked for fields named pairing secret, raw proof, one-time code, and token; no such fields were found. Pairing and authorization stores are excluded from the ZIP.

## Gate and security

- **VERIFIED:** same logical mutation is blocked after a real Node/MCP OS process restart with persisted audit, Pairing, and task authorization; Plugin reauthentication and read-only reconciliation work in this isolated runner.
- **OBSERVED:** timeout can precede a real Figma mutation; cleanup can return a connection error even when later Page reads show the node absent; stopping the Codex Desktop-owned MCP child closes the current task's direct tool transport without auto-reattachment.
- **NOT VERIFIED:** Desktop direct MCP recovery in this task; complete Phase 8.0 wrong-client/pairing/task/file/scope/foreign-node Gate suite; generic update/delete/prototype `OUTCOME_UNKNOWN` reconciliation and idempotent retry.
- Formal H5 mutation **0**; business repository mutation **0**; Figma Computer Use/Playwright/browser automation, REST/PAT write, Remote MCP, Cloudflare/public tunnel fallback **0**. The Edge GPT review of the prior ZIP is external report review, outside the Figma design path.

**Status:** `nodeProcessRestartSameOperationGuard=VERIFIED` for the isolated two-PID runner; `currentPhase=8.0`, `currentIncrement=8.0-G Hardening Gate Suite`, `phase8_0Gate=NOT VERIFIED`, `formalH5WriteAuthorized=false`, `codexDesktopMcp=NOT VERIFIED`.
