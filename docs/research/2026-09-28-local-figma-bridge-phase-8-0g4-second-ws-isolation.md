# Phase 8.0-G4 — Real second WebSocket connection isolation (2026-09-28)

## Increment result

**VERIFIED, bounded claim:** With the real paired Figma Development Plugin authenticated in the dedicated `专用测试文件` file, a separate local Node process opened a second WebSocket with the accepted Figma Origin and no pairing material. The Bridge closed that second connection with code `1013` and recorded `connection_rejected`. The original Plugin `connectionId`, `sessionId`, authentication, Page read-back, document summary, and scoped mutation-attempt count remained unchanged. A subsequent authorized owned Frame create/read-back/delete/read-back succeeded through the original Plugin connection.

This does **not** verify every rogue-client scenario. The second process did not send a forged `hello` or mutation because admission closed the socket first. A rogue connection arriving before the real Plugin, spoofed client identity, and generalized retry/outcome reconciliation remain **NOT VERIFIED**. `phase8_0Gate=NOT VERIFIED`; `formalH5WriteAuthorized=false`.

## Architecture and change

- The existing WebSocket server still listens only on `127.0.0.1:41731`. Figma's manifest continues to use `ws://localhost:41731` for its Development Plugin allowlist.
- In `relay/bridge-server.mjs`, the existing `activeConnection` guard still closes the second socket with `1013`. G4 added one connection-level `connection_rejected` record before closure, with reason, original connection ID, and loopback remote address. No pairing secret, proof, token, or second client's self-declared identity is logged.
- `tests/pairing-protocol.test.mjs` now asserts that the rejection record corresponds to the still-active connection. Its first focused run failed at the new assertion before the log was implemented; the focused rerun passed 5/5.
- `tests/rogue-ws-client.mjs` is the separate process that opens a real TCP/WS connection. `tests/hardening-second-ws-live.mjs` controls real stdio MCP, Figma read-back, and a restricted positive write. `tests/hardening-g4-recover-owned.mjs` is an exact-node recovery used only after an assertion error in an earlier run.

## Real Figma evidence

The final successful run is `本地运行记录（未纳入公开包）`; its shell exit code was captured as `0` in `本地运行记录（未纳入公开包）`.

1. Preflight confirmed file identity `dedicated-test-file`, document `专用测试文件`, Page/root `1:900013`, paired client `client-sanitized-3`, authenticated Plugin, and active connection `runtime-id-omitted`. Page children were empty and scoped mutation-attempt count was `24`.
2. A distinct Node child PID opened the second WebSocket using accepted `https://www.figma.com` Origin. It observed `open` followed by close code `1013`, reason `A POC plugin session is already connected`, and exited `0`. The server stderr recorded one `connection_rejected` with the original active connection ID and remote address `127.0.0.1`. The second socket sent no pairing material or design command.
3. After the rejection, real `figma_status`, `figma_scope_read_node(1:900013)`, and `figma_read_document` returned through the original Plugin. `connectionId` and `sessionId` were unchanged; authentication remained true; mutation counter stayed `24`; Page and document summary matched the preflight.
4. A server-issued short-lived grant for task `hardening-second-ws` created owned native Frame `1:900028` under Page `1:900013`. Plugin read-back confirmed `FRAME`, parent, owner, task, and the original create `operationId`. An authorized delete received a successful response, read-back returned `exists:false`, and Page children returned to empty. The two positive mutations were separate from the zero-side-effect rogue connection check.
5. After the runner, the ordinary standalone Bridge was restarted. PowerShell `Get-NetTCPConnection` observed actual listener `127.0.0.1:41731`, PID `8188`; the real Plugin completed a new authenticated handshake. This is **OBSERVED** process recovery, not a Codex Desktop direct MCP recovery claim.

The final G4 audit contains the positive create/delete operation lifecycle. There is no mutation audit record for the second socket because it was rejected before the mutation protocol. The separate connection-level log is the appropriate evidence for that boundary.

## Preserved failed attempts and recovery

- First run at `09:15:09Z`: the runner asserted that its first `figma_status` must already be connected. The Plugin was still reconnecting, so it stopped before any mutation. The original log and shell exit code `1` are retained.
- Second run at `09:15:33Z`: the second socket was correctly rejected and the original Plugin remained healthy. The positive control created Frame `1:900014` and read it back, but the runner incorrectly required an `exists:true` property on an existing-node read response. Existing nodes return their node fields; only a missing node returns `exists:false`. The runner stopped with exit code `1` after this assertion. No create retry was sent.
- The exact-node recovery script verified `1:900014` against file identity, Page, owner, task, and its original `createdOperationId`, then sent **one** authorized delete. It received a successful response and read back `exists:false`; recovery shell exit code `0` is retained. The runner assertion was changed to check node ID and type, then the final run passed. The failed logs and recovery transcript are in the evidence package.

## Verification, status, and limits

- `node --check` on both new G4 runner files: **PASS**.
- Focused pairing protocol test: RED at new missing-log assertion, then **5/5 PASS** after the minimal log change.
- Full `npm test` after the Bridge/test change: **62/62 PASS**, `本地运行记录（未纳入公开包）`. No old regression failed.
- Formal H5 design mutation **0**; business repository mutation **0**; Figma Computer Use/Playwright/browser Figma automation **0**; REST/PAT write **0**; Remote MCP **0**; public tunnel **0**.
- G4 changes did not alter pairing, task authorization, file/scope/ownership checks, or the Plugin code. Codex Desktop direct MCP remains **NOT VERIFIED**. General update/delete/prototype `OUTCOME_UNKNOWN` reconciliation and safe retry remain **NOT VERIFIED**.

**Machine state:** `realSecondWsClientRejectedWhilePluginConnected=VERIFIED`, `currentPhase=8.0`, `currentIncrement=8.0-G Hardening Gate Suite`, `phase8_0Gate=NOT VERIFIED`, `formalH5WriteAuthorized=false`.
