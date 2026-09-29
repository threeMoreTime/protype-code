# Increment 8.0-D — Scope Guard local validation

Date: 2026-09-28 (Asia/Shanghai). Phase 8.0 — Bridge Hardening.

## Increment result

The implementation binds `scope = {fileIdentity,pageId,rootNodeId}` to a trusted, server-side task authorization. The MCP request references an `authorizationId`; client-sanitized-1 scope is not an authorization source. The relay forwards the trusted scope over the authenticated loopback WebSocket. Plugin main resolves IDs with the Figma Plugin API, verifies root-to-page ancestry and each target's ancestry before executing a mutation. Existing implicit POC write commands fail closed because they cannot establish a scoped effective target. All real writes in this increment targeted `专用测试文件` (`dedicated-test-file`). Formal H5 was not modified.

**Increment 8.0-D: VERIFIED for the dedicated local Figma test files.** Phase 8.0 Gate remains NOT VERIFIED and formal H5 write authorization remains false.

## Scope model and implementation

- File: the authorization's `fileIdentity` and scope's `fileIdentity` must match the active persistent `figma-file:<fileKey>` identity. For scoped commands a cross-file grant returns `SCOPE_FILE_MISMATCH` before WS dispatch.
- Page: `pageId` resolves to a real `PageNode`; root ancestry must end at that page. An inactive PageNode may be identified from `figma.root.children` by ID without loading its children.
- Root/subtree: root ID and actual `.parent` chain define the allowed region. Names, current selection, and visual position do not grant access.
- CREATE checks its explicit `parentId`; UPDATE/DELETE check `targetNodeId`; prototype checks both `sourceNodeId` and `destinationNodeId`. Unknown or unresolved nodes fail closed. The existing owner check remains on update/delete/prototype but full Ownership Guard is deferred to 8.0-E.
- `operationId` remains distinct from transport `requestId` and is preserved through MCP, WS, Plugin and response. No journal or retry engine was added.
- Authorization issue remains a local development control path, never an MCP tool. Existing persisted 8.0-C records without scope can load, but cannot authorize scoped writes.

## Real validation chronology

The first live runner authenticated the existing paired Plugin in the pinned dedicated file and read the document. It created owned Frames `1:900017` (Authorized Root), `1:900018` (Foreign Root), and `1:900019` (Foreign Child) on POC Page `1:900013`, each with Plugin API read-back. A subsequent setup command tried to switch to inactive Page `1:900002` to create a test root; Figma returned `Unable to establish connection to Figma after 10 seconds`. The runner stopped and did **not** retry that mutation. A new read-only MCP session confirmed the three nodes remained. The inactive Page's children could not be read at that point. Later, Figma's current Page had changed to `1:900002`, a delayed Page-switch side effect after the error. At that point a fresh Plugin API read returned `childIds=[]` for Page `1:900002`, confirming that the failed setup left no node there. Evidence: `本地运行记录（未纳入公开包）`.

The resume runner first matched all three prior node IDs/names/parents against live read-back. It then used a narrower trusted grant rooted at `1:900017`. It created a child inside the root (D01), renamed it (D02), and later deleted it (D03), with Plugin API read-back. D04 in this session used a grant bound to the other known dedicated file and received `SCOPE_FILE_MISMATCH` before WS dispatch. D06–D13 and D15 returned the specified scope errors; each compared live node snapshots before and after and found no design change. Prototype cross-scope source and destination denials each left the source reaction list unchanged. Setup nodes `1:900019`, `1:900018`, and `1:900017` were deleted through the scoped owned-node command, each with absence read-back. The resume session is marked **PARTIAL** because D05/D14 were postponed.

A narrow correction used the already available `PageNode` in `figma.root.children` for Page identity resolution. It did not claim access to an inactive Page's children. A separate real runner created a temporary root on Page `1:900013`; D05 rejected `parentId=1:900002` with `SCOPE_PAGE_MISMATCH`, and D14 rejected an authorization whose root was Page `1:900002` while its page was `1:900013` with `SCOPE_ROOT_PAGE_MISMATCH`. In both cases before/after Page/Root snapshots and Plugin-side `scopedMutationAttemptCount` matched. The temporary root was deleted and its absence read back.

## Results by test

| Test | Result | Real evidence |
| --- | --- | --- |
| D01 inside create | VERIFIED | New owned Frame under authorized root, read-back parent and owner |
| D02 inside update | VERIFIED | Frame name read-back changed |
| D03 inside delete | VERIFIED | Plugin response plus `getNodeByIdAsync` absence |
| D04 wrong file | VERIFIED | Grant for dedicated file A was refused with `SCOPE_FILE_MISMATCH` while the Plugin was actually connected to dedicated file B; before/after document read matched, mutation 0 |
| D05 wrong Page | VERIFIED | `SCOPE_PAGE_MISMATCH`, before/after snapshots and attempt counter unchanged |
| D06 wrong root | VERIFIED | `SCOPE_VIOLATION`, foreign root unchanged |
| D07 sibling subtree | VERIFIED | `SCOPE_VIOLATION`, sibling child unchanged |
| D08 outside create | VERIFIED | `CREATE_PARENT_SCOPE_VIOLATION`, parent children unchanged |
| D09 outside update | VERIFIED | `SCOPE_VIOLATION`, target unchanged |
| D10 outside delete | VERIFIED | `SCOPE_VIOLATION`, target still present |
| D11 prototype target outside | VERIFIED | `PROTOTYPE_TARGET_SCOPE_VIOLATION`, reaction unchanged |
| D12 prototype source outside | VERIFIED | `PROTOTYPE_SOURCE_SCOPE_VIOLATION`, reaction unchanged |
| D13 nonexistent root | VERIFIED | `SCOPE_ROOT_NOT_FOUND`, authorized root unchanged |
| D14 root/Page mismatch | VERIFIED | `SCOPE_ROOT_PAGE_MISMATCH`, snapshots/counter unchanged |
| D15 client scope expansion | VERIFIED | Client supplied foreign root; server grant remained authoritative; target unchanged |

## Regression and safety

- `npm test`: **43/43 PASS** in `本地运行记录（未纳入公开包）`. This includes existing Pairing and Task Authorization tests plus new scope tests. Unit/protocol success alone is not treated as real Figma verification.
- Pairing reconnect: authenticated status was observed after each controlled MCP/Node restart. No new pairing code was needed.
- Figma listener remained bound to `127.0.0.1:41731` when active. Manifest uses `ws://localhost:41731` for Figma's Development Plugin validation.
- Formal H5 mutation: **0**. Business repository mutation: **0**. Computer Use, Playwright Figma control, REST/PAT writes, Remote MCP, Cloudflare/public tunnel, and ChatGPT Web: **0**.
- Timeout reconciliation: **NOT VERIFIED**. Earlier delayed mutation risk remains. This increment does not implement operation journal, outcome-unknown state, deduplication, or idempotent retry; these remain for 8.0-F/G. The inactive Page setup failure was not retried.
- The `PageNode` fallback establishes Page identity only; it does not claim inactive-page child contents. A later direct read after Figma switched to Page `1:900002` returned an empty child list. This is concrete reconciliation of the failed setup node, while the delayed Page switch itself reinforces the broader timeout/outcome risk.
- A separate real Plugin-side rejection used a trusted scope rooted at Page `1:900002` and attempted to create under another Page in the dedicated test file. The Plugin returned `SCOPE_PAGE_MISMATCH`; before/after document reads matched. MCP, WS request, Plugin response and MCP error shared one `operationId`, distinct from `requestId`. Two earlier extra-test attempts failed safely: one connected to the other dedicated file before any mutation; one missing-node lookup returned Figma's 10-second connection error. Neither was retried as a mutation. Evidence: `本地运行记录（未纳入公开包）`.
- Persisted development grants are local files and do not constitute production task approval. Old implicit write tools intentionally fail closed in Plugin main under 8.0-D. Do not use this bridge on formal H5.

## Evidence

- Plan: `本地运行记录（未纳入公开包）`
- Source summary: `本地运行记录（未纳入公开包）`
- Initial live attempt and preserved error: `本地运行记录（未纳入公开包）`
- Read-only outcome: `本地运行记录（未纳入公开包）`
- Resumed positive/negative live run: `本地运行记录（未纳入公开包）`
- Cross-page live run: `本地运行记录（未纳入公开包）`
- Delayed Page-switch read-back: `本地运行记录（未纳入公开包）`
- Actual second-file D04 run: `本地运行记录（未纳入公开包）`
- Operation ID real rejection trace: `本地运行记录（未纳入公开包）`
- Final regression: `本地运行记录（未纳入公开包）`

## Gate and next increment

**8.0-D Gate: PASS / VERIFIED.** All required file, Page, root, ancestor, parent, target, and prototype endpoint checks have real positive/negative Figma evidence, including actual file B with a file A grant. Every representative denial recorded an error plus unchanged read-back or a zero Plugin mutation-attempt count. Pairing and Task Authorization automated regressions passed (43/43), and real reconnection authenticated without a new code. The client-sanitized-2 scope did not override the trusted server record.

**Phase 8.0 Gate: NOT VERIFIED.** `formalH5WriteAuthorized=false`. 8.0-E Ownership Guard is the next increment; it was not implemented here. Full timeout outcome reconciliation, operation journal and idempotent retry remain NOT VERIFIED for 8.0-F/G.
