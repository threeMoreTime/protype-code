# Phase 8.0 — Bridge Hardening

Date: 2026-09-24<br>
Machine: Windows 10 Pro 10.0.19045, Figma Desktop 126.9.10<br>
Current phase: **Phase 8.0 — Bridge Hardening**<br>
Increment result: **Persistent local Development Plugin file identity VERIFIED**<br>
Phase 8.0 gate: **NOT VERIFIED**<br>
Formal H5 write: **NOT AUTHORIZED**

## Executive Summary

This increment tested whether the Figma Development Plugin can expose a persistent document identity on this Windows machine. After adding `enablePrivatePluginApi: true` to the isolated POC manifest, the live plugin returned `figma.fileKey` as `figma-file:<fileKey>`. The observed key stayed the same after plugin restart, combined MCP/Node server restarts, and Figma Desktop restart followed by starting the plugin again. Two separate user-authorized test files returned different keys.

This verifies a local Development Plugin identity mechanism. It does not authenticate a Codex client, authorize a task or scope, or establish production plugin eligibility. The plugin did not auto-start after Figma Desktop restarted; a fresh `figma_status` timed out until the user ran the plugin. Pairing/Auth is therefore the next increment, but Phase 8.0 remains open.

No document mutation was performed in this identity spike. The formal H5 document was outside this historical test. The published Bridge later replaced the name-based block with a fail-closed stable-file-identity requirement; document names are not an authorization boundary.

## INCREMENT PLAN

**Current Phase:** Phase 8.0 — Bridge Hardening<br>
**Current Gate:** Persistent identity plus pairing, task authorization, scope/ownership guards, mutation audit, and hardening tests.<br>
**This Increment:** 8.0-A — determine a persistent file identity from local Figma Plugin API behavior.<br>
**Out of scope:** Pairing/Auth implementation, task authorization, scope enforcement, DesignSpec, layout quality, design system, formal H5 writes.<br>
**Exit condition:** live identity read-back across requested lifecycle changes and a distinct-file check, with limitations recorded.

## 1. Previous Verified Baseline

The earlier local validation established the Windows Codex CLI → stdio MCP → loopback WebSocket → Figma Development Plugin → Plugin API read path. The separate write-validation report records real Plugin API frame/text/layout/update/prototype/export/owned-delete tests in a dedicated test file. Those results remain historical evidence and were not rerun in this identity spike.

The earlier write-validation session used the session-only fallback. The current private-API manifest changes the identity returned by the plugin when `figma.fileKey` is available. The source retains the session-scoped fallback for environments where the key is unavailable.

## 2. Scope and Safety

- Both documents used for comparison were dedicated test files: `Untitled` and `专用测试文件`.
- At this historical increment, the Plugin main thread still contained a named-file block. The published Bridge later replaced it with the stable-file-identity requirement; names are not an authorization boundary.
- This increment called status/read only. It created, updated, exported, prototyped, and deleted no Figma nodes.
- WebSocket remains configured for `ws://localhost:41731` in the Figma development manifest and bound by the local Node process to `127.0.0.1`; no public listener was introduced.
- No REST API, PAT, Remote MCP, Cloudflare, public tunnel, browser Figma, or ChatGPT Web was used.
- Computer Use UI input actions: **0**. Two automatic UI-helper launch attempts failed before any input; the user ran the Development Plugin after the Figma restart.

## 3. Implementation Delta

### Changed files

- `.research/local-figma-bridge-poc/plugin/manifest.json`: enabled `enablePrivatePluginApi` for the local Development Plugin.
- `.research/local-figma-bridge-poc/tests/manifest-network.test.mjs`: added a manifest regression assertion for the flag.
- `.research/local-figma-bridge-poc/tests/file-identity-snapshot.mjs`: added a read-only live status runner that starts a fresh MCP/Node process per invocation and saves unique request, response, WebSocket, and summary logs.
- `.research/local-figma-bridge-poc/README.md`: updated the current identity mechanism and its production limitations.

The POC source already selected `figma-file:<figma.fileKey>` when available and used `session-only identity（具体标识已省略）` as fallback. No identity algorithm rewrite was needed.

### Root cause and behavior

Before the manifest flag, local plugin status reported the session-only fallback. The manifest did not request private Plugin API access. Adding the flag made `figma.fileKey` available in the local development session; live `figma_status` responses then reported `fileIdentityQuality: stable` and `figma-file:<key>`.

## 4. Official Source Evidence vs Local Verification

Figma's [Plugin Manifest documentation](https://developers.figma.com/docs/plugins/manifest/) describes `enablePrivatePluginApi` as enabling APIs specific to private plugins and states that local plugins can use them during development. The [Figma API reference](https://developers.figma.com/docs/plugins/api/figma/) marks `figma.fileKey` as available to private plugins and Figma-owned resources when that flag is enabled.

Those pages establish **official API/documentation support**, not this machine's runtime result. The actual `VERIFIED` result below comes from the local plugin's `figma_status` responses and lifecycle comparisons.

## 5. Local Environment and Configuration

- Figma Desktop: version 126.9.10 (from the already audited local environment).
- Manifest API: `1.0.0`.
- `enablePrivatePluginApi`: `true`.
- Development endpoint: `ws://localhost:41731`.
- Actual listener address: `127.0.0.1` (the established POC binding; identity runner logs also contain its local server diagnostics).
- Identity implementation: `plugin/code.js` checks `typeof figma.fileKey === "string" && figma.fileKey.length > 0`; otherwise it returns a session-scoped fallback.

The manifest URL remains `localhost`, because Figma previously rejected the IPv4 literal in `devAllowedDomains`. This is separate from the actual TCP bind address.

## 6. Lifecycle Results

| Check | Result | Evidence and interpretation |
|---|---|---|
| Private API access in local Development Plugin | **VERIFIED** | After import with the flag, `figma_status` returned `fileIdentityQuality=stable` and `dedicated-test-file`. |
| Same file after plugin restart | **VERIFIED** | `Untitled` retained the same file key. `sessionId` and `connectionId` changed. See `本地运行记录（未纳入公开包）` and post-restart MCP summary. |
| Same file after MCP/Node restarts | **VERIFIED** | Three independently launched snapshot runner processes returned the same key. MCP and WebSocket server share the Node process, so they were restarted together rather than isolated from each other. Session stayed the same while connection IDs and Node PIDs changed. |
| Same file after Figma Desktop restart | **VERIFIED** | `专用测试文件` returned the same key after Desktop restart and subsequent Development Plugin launch. Session and connection changed. |
| Different file isolation | **VERIFIED** | `Untitled` returned `dedicated-test-file`; `专用测试文件` returned `dedicated-test-file`. |
| Connection reconnect | **VERIFIED** | The same key was retained while connection IDs changed in repeated local runner sessions. |
| Plugin auto-launch after Figma Desktop restart | **NOT VERIFIED** | The plugin was not running after Desktop restart. The first post-restart `figma_status` waited 30 seconds without a plugin response. A manual plugin run restored the read path; this was a plugin lifecycle/startup issue, not an identity mismatch. |
| `DocumentNode.pluginData` fallback | **NOT VERIFIED** | Not exercised because the local private API exposed `figma.fileKey`. |
| Duplicate, copy, or Save As identity behavior | **NOT VERIFIED** | No duplicate/copy/Save As operation was performed. |

The first post-Figma-restart runner's timeout is preserved at `本地运行记录（未纳入公开包）`; do not erase it. The successful read after the user ran the plugin is preserved at `本地运行记录（未纳入公开包）`.

### Bridge process recovery after the Figma restart test

After the identity snapshot runner exited, port 41731 had no listener. The local MCP/Node Bridge was started again with the existing `npm start` command, without changing its configuration. It bound to `127.0.0.1:41731`, and the already-running Development Plugin reconnected with the same file identity and plugin session but a new connection ID. This confirms Node/Bridge recovery and plugin reconnect; the terminal server was not attached to a Codex MCP client during this standalone recovery check. Details are in `本地运行记录（未纳入公开包）`.

## 7. Q1–Q9 Answers

### Q1 — Can this machine obtain a stable `figma.fileKey`?

**VERIFIED** for the local Figma Desktop Development Plugin with `enablePrivatePluginApi: true`. Live responses returned non-empty keys and `fileIdentityQuality=stable`.

### Q2 — Does it survive plugin restart?

**VERIFIED.** The `Untitled` test file key remained `dedicated-test-file`; session and connection identifiers changed.

### Q3 — Does it survive Figma Desktop restart?

**VERIFIED after explicitly running the Development Plugin again.** The second test file retained `dedicated-test-file`. The plugin did not auto-start, so the first status attempt timed out until the user launched it.

### Q4 — Does it survive MCP / Node restart?

**VERIFIED across the combined MCP/Node server process restart.** The snapshot runner launched three different Node PIDs; file key and plugin session remained stable while the WebSocket `connectionId` changed. Because MCP and the WebSocket listener are in one process, their restarts could not be independently separated in this architecture.

### Q5 — Can different files be distinguished?

**VERIFIED for the two test files observed.** They returned distinct file keys. This does not prove global collision impossibility or duplicate/Save As semantics.

### Q6 — Is `DocumentNode.pluginData` fallback viable?

**NOT VERIFIED.** No fallback write/read experiment was needed or performed. Do not assume duplicate/copy behavior for pluginData.

### Q7 — Recommended `fileIdentity v2` format?

Use `figma-file:<fileKey>` when the plugin returns a non-empty private `figma.fileKey`. If unavailable, fail closed for writes rather than silently treating the existing session-scoped fallback as persistent. The fallback may remain useful for read-only diagnostics.

### Q8 — Copy, duplicate, and access risks?

Duplicate, copy, and Save As semantics are **NOT VERIFIED**. `fileKey` is an identifier, not proof of user/task authorization. Local Development Plugin access does not establish that an eventual published/private organization plugin can obtain this API; deployment eligibility and organization policy are **NOT VERIFIED**. Formal H5 remains denied independently of identity match.

### Q9 — Is it sufficient to enter Increment 8.0-B Pairing?

**Yes, as an identity foundation for the next isolated increment.** It is not enough to authorize production writes or pass Phase 8.0. Pairing must authenticate the client and bind the plugin/server to the identity without logging secrets. Task/action/scope authorization and the remaining Phase 8.0 negative tests are still outstanding.

## 8. Tests and Evidence

- Regression test was first run before the manifest flag and failed because `enablePrivatePluginApi` was undefined; after the change, the test passed.
- `npm test`: **PASS, 17/17** after the flag and assertion were added; full output is in `本地运行记录（未纳入公开包）`.
- Live identity snapshots: separate MCP JSONL, WebSocket log, and summary per invocation under `本地运行记录（未纳入公开包）*`.
- MCP/Node restart comparison: `本地运行记录（未纳入公开包）`.
- Plugin restart comparison: `本地运行记录（未纳入公开包）`.
- Figma restart comparison including the preserved timeout and successful post-run status: `本地运行记录（未纳入公开包）`.
- Different file comparison: `本地运行记录（未纳入公开包）`.
- No design mutation was executed during 8.0-A; write-chain evidence remains in the earlier [write-validation report](2026-09-24-local-codex-figma-bridge-write-validation.md).

## 9. Security and Production Readiness

- Formal H5 mutation: **0**; authorization remains false.
- Business repository mutation: **0**.
- Document mutation in this identity spike: **0**.
- Computer Use UI input: **0**; automatic helper attempts failed before any UI input.
- REST API core path / PAT / Remote MCP / Cloudflare / public tunnel / ChatGPT Web: **0**.
- Pairing/Auth, task authorization, scope guard, mutation audit, production private-plugin eligibility, pluginData fallback, duplicate identity behavior: **NOT VERIFIED**.

The stable file key helps answer “which Figma file?” It does not answer “which client/task is authorized to write where?”

## 10. Gate Impact and Next Increment

**Increment 8.0-A:** complete for local persistent identity selection.<br>
**Phase 8.0:** remains **NOT VERIFIED / PARTIAL** because pairing, task authorization, scope/ownership hardening, audit, and negative tests are incomplete. `currentPhase` remains `8.0`; no baseline phase transition was made.

**NEXT INCREMENT: 8.0-B — Pairing.** Keep it isolated: define server/client/pairing/session/connection IDs, make unpaired writes fail closed, avoid logging pairing secrets, and verify valid/wrong/missing pairing plus reconnect and restart. Do not combine it with Task Authorization or DesignSpec.

## 11. Increment 8.0-B — Pairing update (2026-09-28)

This section is appended after the historical 8.0-A result above; the previous 8.0-A evidence and its then-current next step remain unchanged.

- **VERIFIED (real Figma):** The Development Plugin paired with the local MCP/WS server in `专用测试文件`, completed mutual HMAC authentication, and automatically authenticated after WS reconnection, plugin code reload, and combined Node/MCP restart. Post-restart listener: `127.0.0.1:41731`.
- **VERIFIED (real Figma):** An authenticated, owned Frame `1:900009` was created in 7 ms, read back through the Plugin API, then deleted in 261 ms with `getNodeByIdAsync` confirming absence. The current owned POC page remains empty.
- **VERIFIED (protocol integration):** Missing pairing and invalid client HMAC refuse writes; a pairing code survives a WS reconnect only for its original client/file. Wrong and expired codes are covered at the PairingStore test level. These negative cases were not injected into the live Figma UI after successful pairing.
- **OBSERVED:** The initial create timed out after 30 seconds yet later produced an owned Frame. A cleanup attempt also encountered a Figma API network error during page switching. The POC no longer switches pages for routine owned create/delete. General late-mutation risk remains open for later authorization, idempotency, and audit work.
- **Security:** Formal H5 mutations `0`; business repository mutations `0`; Computer Use, REST core path, PAT, Remote MCP, and public tunnel usage `0`. New logs do not contain the persisted pairing secret, and `state/` is excluded from version control and report ZIPs.
- **Tests:** `npm test` 31/31; real request IDs, responses, read-back, failures, and restart chronology are in [the 8.0-B report](2026-09-28-local-figma-bridge-phase-8-0b-pairing.md) and `本地运行记录（未纳入公开包）*`.

**Increment 8.0-B: VERIFIED. Phase 8.0 Gate: NOT VERIFIED. NEXT INCREMENT: 8.0-C — Task Authorization.** The baseline Phase and formal H5 deny-write boundary remain unchanged.

## 12. Increment 8.0-C — Task Authorization update (2026-09-28)

The detailed [8.0-C report](2026-09-28-local-figma-bridge-phase-8-0c-task-authorization.md) and new `本地运行记录（未纳入公开包）*` evidence preserve the historical 8.0-A and 8.0-B results above.

- **VERIFIED (source, tests, and real Figma):** A trusted local, server-side authorization record is separate from Pairing. A record binds `authorizationId`, workspace, task, paired `clientId`, persistent file identity, action allowlist, revision, and UTC expiry. The ordinary MCP tool surface cannot issue a record.
- **VERIFIED (real Figma):** In `专用测试文件`, an authorized MCP mutation created owned Frame `1:900010` with `operationId=op-sanitized-1`; Plugin API read-back confirmed `FRAME`, owner, parent, and `375×812`. Missing, unknown, wrong task/workspace/file, expired, disallowed action, self-claimed permission, wrong revision, and absent operation ID were rejected. Each real negative test compared Figma state before and after; mutation count was `0`.
- **OBSERVED:** Authorized cleanup returned a Figma API connection error after 10 seconds. A subsequent new read-only MCP session confirmed the owned node list was empty. This is a reconciled final state, not a successful delete API response. No blind retry was sent.
- **VERIFIED (regression):** `npm test` passed `38/38`; after the test, the temporary authorization store file was removed, the Node/MCP process restarted, and the plugin reauthenticated without a new pairing code. No active task grant was left behind.
- **NOT VERIFIED:** General operation deduplication, timeout outcome journal/reconciliation, page/root scope guard, full ownership guard, structured mutation audit, and Phase 8.0 hardening gate. The 8.0-B delayed mutation risk remains open for 8.0-F/G.

**Increment 8.0-C: VERIFIED. Phase 8.0 Gate: NOT VERIFIED. NEXT INCREMENT: 8.0-D — Scope Guard.** Formal H5 mutation `0`; business repository mutation `0`; forbidden fallback usage `0`.

## 13. Increment 8.0-D — Scope Guard update (2026-09-28)

The detailed [8.0-D report](2026-09-28-local-figma-bridge-phase-8-0d-scope-guard.md) and new `本地运行记录（未纳入公开包）*` files preserve the 8.0-A/B/C history above.

- **VERIFIED (real Figma):** A trusted authorization scope binds persistent file identity, Page ID, and root node ID. Inside-root create/update/delete completed with Plugin API read-back in the dedicated `专用测试文件` file. Same-file wrong Page/root/sibling, outside create/update/delete, prototype source/target, nonexistent root, root/Page mismatch, and client scope expansion were rejected with unchanged before/after state. The cross-page rejects also left the Plugin mutation-attempt counter unchanged.
- **OBSERVED:** A setup command to switch to inactive Page `1:900002` returned a Figma 10-second connection error. No blind mutation retry was sent. A later read showed Figma had switched Pages, while Page `1:900002` had `childIds=[]`. This confirms a delayed Page-switch side effect and no test Frame left there. General timeout reconciliation remains **NOT VERIFIED**.
- **VERIFIED (regression):** `npm test` passed **43/43**, including existing Pairing/Task Authorization cases and new scope guards. Paired Plugin reconnection after controlled MCP restarts was observed.
- **VERIFIED (real Figma):** The final D04 case connected the Plugin to dedicated file B (`dedicated-test-file`) while the trusted grant bound file A (`dedicated-test-file`). The scoped create request returned `SCOPE_FILE_MISMATCH`; before/after document reads matched and mutation count was `0`. Evidence: `本地运行记录（未纳入公开包）`.
- **VERIFIED (real Figma):** A Plugin-side wrong-Page rejection returned `SCOPE_PAGE_MISMATCH` with unchanged document read-back; MCP/WS request and Plugin response logs carried the same `operationId`. Evidence: `本地运行记录（未纳入公开包）`.
- **Security:** Formal H5 mutation `0`; business repository mutation `0`; Computer Use, browser automation, REST/PAT write, Remote MCP, and public tunnel usage `0`. Existing implicit write tools now fail closed in Plugin main. 8.0-E Ownership Guard and 8.0-F Audit are untouched.

**Increment 8.0-D: VERIFIED. Phase 8.0 Gate: NOT VERIFIED. NEXT INCREMENT: 8.0-E — Ownership Guard.** `formalH5WriteAuthorized=false`; no 8.0-E implementation was started.

## 14. Increment 8.0-E — Ownership Guard update (2026-09-28)

The detailed [8.0-E report](2026-09-28-local-figma-bridge-phase-8-0e-ownership-guard.md) and new `本地运行记录（未纳入公开包）*` evidence preserve the 8.0-A/B/C/D historical results above.

- **VERIFIED (real Figma):** Scoped create stamped server-derived owner/workspace/task/revision/operation metadata; same-task update and delete returned Plugin API responses and read-back. An unowned same-name node, cross-task update/delete, client ownership spoof, mixed-ownership subtree delete, and unowned prototype source were rejected with unchanged Figma read-back and zero Plugin mutation attempts. Test Page `1:900002` was empty after cleanup and in a fresh read-only MCP/WS session.
- **VERIFIED (regression):** `npm test` passed **51/51**, including Pairing, Task Authorization, Scope Guard, and new ownership/UI forwarding cases.
- **OBSERVED:** Two early real runs revealed missing UI forwarding and then a missing UI command allowlist entry. Both were fixed after targeted RED tests. The latter request timed out before reaching Plugin main; read-only reconciliation showed no fixture had been created, so the resumed run did not duplicate it.
- **OBSERVED / limitation:** The final real test runner wrote `final_verified`, then emitted an unsettled top-level await warning at MCP client close; the outer command failed, while the exact Node exit code was not independently captured. The bounded-close finalizer was added and syntax checked, but not rerun against Figma. A generated development authorization JSON file remained after targeted local deletion was rejected by automatic execution review without a stated reason; its grants have UTC expiry `2026-09-28T08:08:29Z`, and the normal server does not load that test-specific path. It is excluded from evidence packages. General timeout outcome reconciliation remains **NOT VERIFIED**.
- **Security:** Formal H5 mutation `0`; business repository mutation `0`; Figma UI automation, REST/PAT write, Remote MCP, and public tunnel fallback `0`. User-authorized browser report handoff is separate from the Figma bridge path.

**Increment 8.0-E ownership gate: VERIFIED. Phase 8.0 Gate: NOT VERIFIED. NEXT INCREMENT: 8.0-F — Mutation Audit.** `formalH5WriteAuthorized=false`; 8.0-F implementation has not started.

## 15. Increment 8.0-F — Mutation Audit update (2026-09-28)

The detailed [8.0-F report](2026-09-28-local-figma-bridge-phase-8-0f-mutation-audit.md) and independent `本地运行记录（未纳入公开包）*` evidence preserve the 8.0-A/B/C/D/E historical results above.

- **VERIFIED (real Figma):** Structured, field-allowlisted mutation lifecycle entries persisted to JSONL outside MCP stdout. Authenticated scoped create, three distinct rejected writes, before/after read-back, and owned cleanup completed in the dedicated file. The final Page child list was empty.
- **VERIFIED (real timeout):** A deliberately short transport timeout yielded `OUTCOME_UNKNOWN`; the Plugin API later created exactly one node. Read-only `operationId` reconciliation found it and recorded `VERIFIED` without repeating create. The node was then deleted and read-back confirmed absence.
- **OBSERVED:** An earlier nonexistent-root request produced a Figma connection timeout instead of a scope error. It was not counted as a successful denial; its owned setup node was independently checked and cleaned. The successful negative test used an existing root from the other dedicated-test Page.
- **VERIFIED (regression):** `npm test` passed **60/60**. Additional RED→GREEN cases cover server shutdown and stale responses as `OUTCOME_UNKNOWN`.
- **NOT VERIFIED:** General outcome reconciliation for update/delete/prototype, safe logical mutation retry, crash consistency, tamper-proof audit storage, and full Phase 8.0 restart/security Gate. Formal H5 mutation `0`; business repository mutation `0`; forbidden Figma fallback `0`.

**Increment 8.0-F: VERIFIED for the POC audit and create-reconciliation scope. Phase 8.0 Gate: NOT VERIFIED. NEXT INCREMENT: 8.0-G — Hardening Gate Suite.** `formalH5WriteAuthorized=false`; 8.0-G has not started.

## 16. Increment 8.0-G1 — Bridge restart and same-operation guard (2026-09-28)

The detailed [8.0-G1 report](2026-09-28-local-figma-bridge-phase-8-0g1-restart-operation-guard.md) and independent `本地运行记录（未纳入公开包）*` evidence preserve the 8.0-A–F results above.

- **VERIFIED (real Figma, bounded item):** A 1 ms transport timeout preceded a native owned Frame create. The Bridge listener was restarted with persisted Pairing, task authorization, and audit records; the same Plugin session reauthenticated over a new connection. Resending the same `operationId` returned `OPERATION_OUTCOME_UNKNOWN`, Plugin mutation attempts remained `11→11`, and read-only reconciliation found exactly one matching Frame. Owned cleanup left the test Page empty.
- **OBSERVED:** An earlier cleanup returned a 10-second Figma connection error and was recorded `OUTCOME_UNKNOWN`. No blind delete retry followed. Two later Page read-backs showed an empty authorized Page. The first preflight run had a test-only status-field mismatch and sent no mutation; both failures remain preserved in their original logs.
- **VERIFIED (regression):** `npm test` passed **61/61**. The added protocol case reloads the persisted stores and confirms that a duplicate logical write sends zero Plugin requests after the Bridge restarts.
- **NOT VERIFIED:** The real runner restarted the listener within one Node PID. Separate Node/MCP subprocess restart, Plugin reload, full wrong-client/security matrix, and update/delete/prototype outcome reconciliation remain open. The full Phase 8.0 Gate is **NOT VERIFIED**; formal H5 mutation `0`, business repository mutation `0`, forbidden fallback `0`.

**NEXT 8.0-G item:** separate Node/MCP process restart and remaining security-negative matrix. Remain in Phase 8.0; `formalH5WriteAuthorized=false`.

## 17. Increment 8.0-G2 — Cross-process Node/MCP restart guard (2026-09-28)

The detailed [8.0-G2 report](2026-09-28-local-figma-bridge-phase-8-0g2-process-restart.md) and new `本地运行记录（未纳入公开包）*` evidence preserve the earlier A–G1 conclusions.

- **VERIFIED (real Figma, bounded item):** Two actual stdio MCP/WS Node processes with distinct PIDs `27720→56872` used persisted Pairing, authorization, and audit files. A timed-out create still produced one native owned Frame. After process A exited and B started, the Plugin reauthenticated on a new connection. Resending the same `operationId` returned `OPERATION_OUTCOME_UNKNOWN` before Plugin mutation; mutation attempts stayed `13→13`; Page state stayed `["1:900011"]`; read-only reconciliation found exactly that node.
- **OBSERVED:** Owned cleanup returned a 10-second Figma connection error. No blind retry followed. An immediate Page read and two later independent reads showed an empty authorized Page. The deletion response remains ambiguous. Stopping the Desktop-owned MCP subprocess closed this task's direct MCP transport; a standalone Bridge restored Plugin connectivity, but Desktop direct tool reattachment was **NOT VERIFIED**.
- **VERIFIED (regression):** `npm test` passed **62/62**. The forced 1 ms timeout tool is exposed only under the explicit development fixture flag; the ordinary MCP surface excludes it.
- **NOT VERIFIED:** Full 8.0-G security-negative matrix, Plugin/Figma restart Gate cases, and generic update/delete/prototype outcome reconciliation. Phase 8.0 Gate remains **NOT VERIFIED**; formal H5 mutation `0`, business repository mutation `0`, forbidden Figma fallback `0`.

**NEXT 8.0-G item:** the remaining security-negative and lifecycle Gate cases. Do not advance to Phase 8.1; `formalH5WriteAuthorized=false`.

## 18. Increment 8.0-G3 — Consolidated security-negative Gate (2026-09-28)

The detailed [8.0-G3 report](2026-09-28-local-figma-bridge-phase-8-0g3-security-negative-gate.md) and independent `本地运行记录（未纳入公开包）*` evidence preserve the earlier A–G2 results.

- **VERIFIED (real Figma, bounded matrix):** A valid server-issued grant created native owned Frame `1:900012` and Plugin API read-back confirmed it. Nine cases covering missing authorization, another-client grant, wrong task, wrong test-file grant, wrong Page/root, foreign update/delete, unpaired server, and rotated-secret HMAC rejection returned stable error codes and `REJECTED` audit records. Before/after real document or node reads matched and Plugin mutation-attempt count delta was `0` for every deny. Both POC test nodes were cleaned and Page `1:900013` ended empty.
- **OBSERVED:** Two preserved runner failures were test-harness preflight/read-method errors; the first sent zero writes, and the second completed/cleaned the paired matrix before its unpaired read timed out. The final runner used `read_document`, which the Plugin explicitly allows before pairing, and exited `0`. The normal Plugin reauthenticated after the isolated wrong-secret test.
- **VERIFIED (regression):** `npm test` passed **62/62**; G3 changed only the real test runner, not the production Bridge path. The active listener remained `127.0.0.1`.
- **NOT VERIFIED:** A distinct rogue live WS client with a different client ID was not connected to the real Plugin session; the wrong-client case was a server-side grant mismatch. General update/delete/prototype outcome reconciliation, Plugin/Figma restart Gate cases, Desktop direct MCP recovery, and full Phase 8.0 Gate remain open. Formal H5 mutation `0`; business repository mutation `0`; forbidden Figma fallback `0`.

**NEXT 8.0-G item:** remaining lifecycle and mutation-outcome Gate work. `phase8_0Gate=NOT VERIFIED`; `formalH5WriteAuthorized=false`.

## 19. Increment 8.0-G4 — Real second WebSocket connection isolation (2026-09-28)

The detailed [8.0-G4 report](2026-09-28-local-figma-bridge-phase-8-0g4-second-ws-isolation.md) and new `本地运行记录（未纳入公开包）*` evidence preserve the earlier A–G3 findings.

- **VERIFIED (real Figma, bounded item):** While the paired Plugin was authenticated in the dedicated test file, a different local Node process opened a second WS with an accepted Origin and no pairing credentials. It received close code `1013`. The Bridge emitted `connection_rejected` referencing the original active connection. Original `connectionId`, `sessionId`, authenticated status, Page read-back, document summary, and Plugin mutation count stayed unchanged. The authorized original connection then completed an owned Frame create/read-back/delete/read-back control, returning Page children to empty.
- **OBSERVED:** An initial runner failed in the Plugin reconnect window with zero writes. A second run proved rejection but created owned Frame `1:900014` before a test assertion incorrectly required `exists:true`; an exact-node recovery verified identity/ownership/operation metadata, deleted that node once, and read back its absence. The final run completed with captured shell exit code `0`. All attempts and recovery remain in separate evidence logs.
- **VERIFIED (regression):** Focused pairing protocol test was RED before the connection-level rejection log, then 5/5 PASS; full `npm test` passed **62/62**. The restored listener was measured at `127.0.0.1:41731` and the Plugin reauthenticated.
- **NOT VERIFIED:** This does not test a rogue connection that arrives first or spoofs the Plugin handshake. Update/delete/prototype unknown-outcome reconciliation, safe retry, complete lifecycle Gate, and Codex Desktop direct MCP remain open. Full Phase 8.0 Gate stays **NOT VERIFIED**; formal H5 mutation `0`, business repository mutation `0`, forbidden Figma fallback `0`.

**NEXT 8.0-G item:** close the next smallest remaining lifecycle or outcome-reconciliation gap. Do not advance to Phase 8.1; `formalH5WriteAuthorized=false`.

## 20. Increment 8.0-G5 — Plugin runtime reload recovery (2026-09-28)

The detailed [8.0-G5 report](2026-09-28-local-figma-bridge-phase-8-0g5-plugin-reload.md) and new `本地运行记录（未纳入公开包）*` evidence preserve the earlier A–G4 findings.

- **VERIFIED (real Figma, bounded item):** One stdio MCP/WS Node PID `49584` stayed alive through a real Development Plugin runtime rerun in the dedicated test file. Plugin `sessionId` and `connectionId` both changed; stable file identity, client ID, and pairing ID persisted, and the new session authenticated without new pairing. An owned Frame created before reload was read back unchanged afterward. A missing-authorization update returned `AUTH_REQUIRED`, `REJECTED` audit, unchanged node/Page, and zero Plugin mutation-attempt delta. The original valid grant then updated and deleted that Frame with Plugin API read-back; Page children returned to empty.
- **OBSERVED:** The first runner stopped before mutation because its test assertion incorrectly expected a `pair-` prefix on a UUID pairing ID. The test assertion was corrected and both logs were retained; final shell exit code was `0`.
- **VERIFIED (regression):** `node --check` passed and full `npm test` passed **62/62**. G5 added a real runner only; Bridge and Plugin production code were unchanged.
- **NOT VERIFIED:** In-flight mutation during Plugin reload, Figma Desktop process restart as part of full G Gate, general update/delete/prototype unknown-outcome reconciliation, safe retry, and Codex Desktop direct MCP. Phase 8.0 Gate remains **NOT VERIFIED**. Formal H5 mutation `0`, business repository mutation `0`, forbidden fallback `0`.

**NEXT 8.0-G item:** the next smallest remaining lifecycle or outcome-reconciliation gap. `formalH5WriteAuthorized=false`; do not advance to Phase 8.1.
