# Local Figma Bridge — Phase 8.0-B Pairing 实机验证

日期：2026-09-28<br>
当前 Phase：8.0 — Bridge Hardening<br>
本轮 Increment：8.0-B — Pairing<br>
测试文件：`专用测试文件`<br>
正式 H5 写入授权：`false`

## Executive Summary

**VERIFIED：**在当前 Windows、Codex stdio MCP、`127.0.0.1` WebSocket、Figma Desktop Development Plugin 上，插件与本机服务器完成一次性配对及双向 HMAC 认证。普通 WebSocket 重连、插件代码重新加载，以及 Node/MCP 服务重启后，都在不重新输入配对码的情况下完成认证。认证后，Bridge 在独立测试文件创建 owned Frame，经 Plugin API 读回，再删除并读回不存在。

**OBSERVED：**初次写入在 MCP 30 秒超时后继续产生设计副作用。Figma API 的一次翻页还返回 `Unable to establish connection to Figma after 10 seconds`。本轮移除了 POC 创建和 owned 节点删除中的非必要 `setCurrentPageAsync()`；修复后的创建响应为 7 ms，删除响应为 261 ms。超时后仍可能产生副作用的通用风险没有被消除，后续授权、幂等与审计增量必须处理。

**Gate：**Increment 8.0-B 的配对闭环已通过。Phase 8.0 的 Task Authorization、Scope Guard、统一 Ownership Guard、Mutation Audit 和最终 Hardening Gate 仍为 **NOT VERIFIED**；`currentPhase` 保持 `8.0`，正式 H5 保持禁止写入。

## 1. 基线与测试边界

- 上轮 8.0-A 已在本机 **VERIFIED** `figma-file:<fileKey>` 对同一文件的重启稳定性及两个测试文件的区分；详见 [Phase 8.0 报告](2026-09-24-local-figma-bridge-phase-8-0-hardening.md)。
- 本轮所有 Figma 读写均指向 `dedicated-test-file`，文档名 `专用测试文件`。正式 `专用测试文件` 继续在 MCP 和 Plugin main 两层 denylist 中。
- 本轮没有 Computer Use、Playwright 控制 Figma、浏览器 Figma、REST 核心链路、PAT、Remote MCP、Cloudflare、ChatGPT Web 或公网 tunnel。用户只在 Development Plugin 面板输入一次配对码并点击 Pair；后续插件代码重新加载未请求人工 Canvas 操作。

## 2. 本机故障与最小修复

### 2.1 配对码因短暂重连失效

**OBSERVED：**用户在插件面板输入有效期内的配对码后收到 `PAIRING_CODE_INVALID`。此前实机 WS 日志显示同一 `clientId`、同一 `fileIdentity` 会约每两分钟重连，并分配新 `connectionId`。

**VERIFIED（源码与回归测试）：**原 `bridge-server.mjs` 将 bootstrap 绑定到原 `connectionId`，并在 socket 关闭时取消 pending code。新回归测试先失败，表现为重连回原文件后等不到 `pairing_issued`。修复后配对码在同一 Node 进程内绑定稳定 `clientId` 和 `fileIdentity`，不同文件仍返回 `PAIRING_CODE_INVALID`；`PairingStore` 原有的三分钟有效期、单次使用、尝试次数限制不变。回归测试通过。

### 2.2 Figma 插件 UI 无 Web Crypto HMAC

**OBSERVED：**新配对码通过服务端校验，日志出现 `pairing_issued` 和 `auth_challenge`，但插件显示 `Web Crypto HMAC is unavailable in the Figma plugin UI`。MCP `figma_status` 返回 `pairingState: paired`、`bridgeAuth.authenticated: false`。当前 Figma UI 中 `crypto.subtle` 不可用的具体平台原因没有独立测量；[Figma 官方文档](https://developers.figma.com/docs/plugins/creating-ui/)说明默认 UI 位于 null-origin iframe，并不等于在所有上下文都提供 Web Crypto。

**VERIFIED（实现与本机实测）：**在 POC 内固定 `@noble/hashes@2.4.0`，通过固定 `esbuild@0.28.2` 将 HMAC-SHA256 嵌入现有 `plugin/ui.html`；有 Web Crypto 时仍优先使用原路径。新增测试在无 `crypto.subtle` 环境先失败，再与 Node 服务端的 client/server 两种 HMAC 证明值比较并通过。包来源及许可见 [noble-hashes 主仓库](https://github.com/paulmillr/noble-hashes)和 POC `plugin/THIRD_PARTY_LICENSES.txt`。实机插件重新加载后，WS 记录 `authenticated`，MCP status 同时读回 `pairingState: paired`、`bridgeAuth.authenticated: true`。

### 2.3 认证后的首次创建超时并延迟写入

**OBSERVED：**第一次 `figma_create_poc` 的 MCP requestId `runtime-id-omitted` 在 30,011 ms 超时。随后的读回先发现 owned POC 页但无 Frame；再过一段时间发现 owned Frame `1:900015`。实际发生 mutation 的精确时刻未被捕获。一次 cleanup 请求在 10,125 ms 后返回 Figma API 网络错误。不能把这次请求记为成功。

**INFERRED：**`setCurrentPageAsync()` 是主要等待点。源码显示创建页并加载后立即翻页、删除前即使目标页为当前页也翻页；Figma API 明确返回了网络连接错误。[Figma 动态页面文档](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/)说明已 `loadAsync()` 的页可直接访问子节点。未对第一次超时命令做逐阶段内存 trace，因此具体阻塞位置仍为推断。

**VERIFIED（修复后）：**删除创建和 owned 节点清理中的非必要翻页；当前 owned 页为空时保留该页，不为删页触发翻页。两个针对 `setCurrentPageAsync` 失败的回归测试先失败后通过。实机下一次 `figma_create_poc` 在 7 ms 返回 Frame `1:900009`，Plugin API 读回 `FRAME`、`375×812`、parent `1:900013` 和正确 owner。`figma_delete_poc_owned` 在 261 ms 删除 `1:900009`，返回 `readBackAbsent: true`，随后 `figma_read_document` 确认 owned 节点为空。测试文件保留一个空的 owned POC 页 `1:900013`。

## 3. 配对标识和安全边界

| 字段 | 本机作用及证据 |
|---|---|
| `serverId` | 由 Node 本地状态生成并持久化；Node/MCP 重启后保持。 |
| `clientId` | 由 Figma `clientStorage` 保存；插件重新加载后保持。 |
| `pairingId` | 配对成功后持久化在服务端与插件端；本轮重启后仍为同一值。 |
| `sessionId` | 插件运行会话身份；插件重新加载后变化，普通 WS 重连和 Node 重启时可保持。 |
| `connectionId` | 每次 WS 连接变化；仅用于该连接上的请求关联和挑战，不再作为配对码有效性的唯一绑定。 |
| `fileIdentity` | 本次测试固定 `dedicated-test-file`；不匹配时不能完成该次 bootstrap，写请求仍需传入预期身份。 |

服务端和插件端分别验证 HMAC 证明；server/client 使用不同 `role` 文本，挑战包含新 nonce。未配对写请求在服务端被拒绝，Plugin main 也有认证 guard。实际 pairing secret 位于被 `.gitignore` 排除的 `state/` 和 Figma `clientStorage`；本机 `state/pairing-store.json` ACL 仅允许当前用户、Administrators、SYSTEM。新日志扫描没有发现持久化 secret；一次性配对码未写入证据文件。当前工作区中的 POC 状态文件及含密钥的本机用户数据不应进入 ZIP 或版本控制。

## 4. 分层验证结果

| 检查 | 状态 | 层级与实机证据 |
|---|---|---|
| 同一客户端、同一文件在 WS 重连后使用未过期配对码 | **VERIFIED** | 协议集成测试，先红后绿；不同文件拒绝。 |
| 错误或过期配对码拒绝 | **VERIFIED** | `PairingStore` 本地测试；本机 Figma 错误码注入 **NOT VERIFIED**。 |
| 未配对写入拒绝 | **VERIFIED** | 真实 Node WS 协议集成测试与 Plugin main 测试；本轮实机 Figma 负注入 **NOT VERIFIED**。 |
| 错误 HMAC 证明拒绝 | **VERIFIED** | 真实 Node WS 协议集成测试；本轮实机 Figma 负注入 **NOT VERIFIED**。 |
| 有效配对及双向 HMAC | **VERIFIED** | Figma UI + Plugin main + WS + MCP status；`authenticated: true`。 |
| 普通 WS 重连后重新认证 | **VERIFIED** | 多次实机 `auth_challenge` → `authenticated`；未重新输入配对码。 |
| 插件代码重新加载后重新认证 | **VERIFIED** | `sessionId` 变化，`clientId`、`pairingId`、`fileIdentity` 不变；新会话认证成功。 |
| Node/MCP 重启后重新认证 | **VERIFIED** | PID、`connectionId` 变化，新 listener 仍为 `127.0.0.1:41731`；`figma_status` 仍为 paired/authenticated。 |
| 认证后 owned Frame 写入、读回、删除 | **VERIFIED** | requestId `runtime-id-omitted` → Frame `1:900009`；read-back requestId `runtime-id-omitted`；删除 requestId `runtime-id-omitted`，节点不存在。 |
| 配对跨 Figma Desktop 完全退出重启 | **NOT VERIFIED** | 本轮只观察到插件 main 重新加载；没有再退出 Figma Desktop。 |
| 超时后无副作用 | **NOT VERIFIED** | 相反，本轮实际观察到超时后延迟创建；需要后续幂等、operationId 和对账设计。 |

## 5. 命令、测试与证据

- `node --test --test-name-pattern='pairing code survives reconnect' tests/pairing-protocol.test.mjs`：先失败、修复后通过。
- `node --test tests/plugin-ui-crypto.test.mjs`：先按实机 Web Crypto 错误失败、修复后通过。
- `node --test --test-name-pattern='does not depend on switching' tests/plugin-main-message.test.mjs`：两个用例先失败、修复后通过。
- `npm test`：最终 **31/31**，完整日志在 `本地运行记录（未纳入公开包）`。
- `Get-NetTCPConnection -LocalPort 41731 -State Listen`：重启前后 listener 均为 `127.0.0.1`；最终 PID `30996`。
- 实机时间线及 requestId：`本地运行记录（未纳入公开包）`。它是从本轮 PTY MCP/WS 输出逐项记录的脱敏证据；重启后 status/read 的终端原始转录另见 `phase8-0b-post-restart-2026-09-28-mcp.txt`。完整历史只读和写入验证证据保持原样。
- 未记录明文配对码及 secret；新 `phase8-0b*` 日志中未发现持久化 secret。

## 6. Increment Result 与 Gate

**8.0-B Pairing：VERIFIED。**有效配对、双向 HMAC、未配对/错误证明拒写的协议验证、插件重载、连接重连、Node/MCP 重启，以及配对后独立测试文件的 owned 写入和删除均已有对应层级证据。

**Phase 8.0 Gate：NOT VERIFIED。**任务级授权、文件/页面/根节点范围策略、统一 ownership metadata、结构化持久 mutation audit、超时副作用对账，以及 8.0-G 全套负测试尚未完成。即使 POC 可写，正式 H5 仍是 `READ ONLY / DENY WRITE`，本轮正式 H5 mutation 数为 `0`；业务仓库 mutation 数为 `0`。

**NEXT INCREMENT：8.0-C — Task Authorization。**第一步为 paired client 添加任务级 `workspaceId`、`taskId`、`fileIdentity`、`allowedActions`、`expiresAt` 的显式授权。把本轮发现的超时后副作用纳入后续 operationId、幂等和 mutation audit 设计。不要在此阶段进入 DesignSpec 或正式 H5。
