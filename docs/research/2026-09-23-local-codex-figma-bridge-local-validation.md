# Local Codex ↔ Local Figma Bridge 本机验证补充报告

验证日期：2026-09-24。环境：Windows 10 Pro、PowerShell 7.6.5、Codex CLI 0.155.0-alpha.16.3、Figma Desktop 126.9.10。本报告补充[原可行性研究](2026-09-23-local-codex-figma-bridge-feasibility.md)，不修改原报告。`VERIFIED` 只用于实际执行成功的具体能力；`OBSERVED` 为直接观察但不足以证明目标能力；`INFERRED` 为基于源码或实验的判断；`NOT VERIFIED` 为未完成验证；`BLOCKED` 为本轮边界阻止执行。

## Executive Summary

**总体结论：BLOCKED，不能写 FEASIBLE 或 CORE_FEASIBLE_WITH_PROTOTYPE_GAP。** 当前 Windows 机器实际跑通了 **Codex CLI → stdio MCP → 127.0.0.1 WebSocket → Figma Desktop Development Plugin UI → postMessage → Plugin main → Figma Plugin API 的只读链路**。`figma_status` 和 `figma_read_document` 返回真实文档、当前页与选择信息；同一连接的连续调用和 MCP/WS 子进程短断后的插件重连也通过。原始 Codex 工具事件见 live-codex-read.jsonl（本地运行记录未纳入公开包）、live-codex-reconnect.jsonl（本地运行记录未纳入公开包），请求/响应和 WS requestId/延迟见 live-read-mcp.jsonl（本地运行记录未纳入公开包）、live-read-websocket.log（本地运行记录未纳入公开包）。

插件实际连接到 `专用测试文件`，当前页 `02 交互原型 · 八状态验收`，ID `1:900001`。该页与 [CURRENT_WORKFLOW_AUDIT.md](../../CURRENT_WORKFLOW_AUDIT.md) 记录的正式 H5 设计页一致。用户禁止修改正式 H5 内容，也只允许人工导入、启动插件。因此 **没有发送任何 Figma 写入、导出或删除指令**。Test 03–09 因文件目标边界为 `BLOCKED`；没有 Frame ID、Text read-back、reaction、PNG 或删除回查。当前 Codex Desktop 任务的工具目录未暴露此 POC MCP；**Codex CLI 调用为 VERIFIED，Desktop 当前任务内调用为 NOT VERIFIED**。

本轮 Computer Use = 0，核心路径 REST API = 0、Remote MCP = 0、ChatGPT Web = 0。`npm test` 的 14/14 输出（本地运行记录未纳入公开包）为本地模拟与局部测试；不计作 Figma 写入通过证据。

## 1. Source Research vs Local Verification

- **官方文档证据**：Figma manifest、Plugin UI 消息、`figma.*`、`setReactionsAsync` 和 `exportAsync` 的 API 能力是实现依据；文档存在不表示本机 reaction/export 成功。[Manifest](https://developers.figma.com/docs/plugins/manifest/)、[Plugin API](https://developers.figma.com/docs/plugins/api/figma/)。
- **本地源码证据**：原报告检查六个 clone；本轮沿用其固定 commit 和源码结论，未把候选项目的功能写成本机运行结果。[原报告第 4–6 节](2026-09-23-local-codex-figma-bridge-feasibility.md)。
- **本机证据**：Codex CLI 工具调用、Figma Plugin API 只读返回、loopback 地址、长连接和重连为 `VERIFIED`；写入、Prototype、导出、删除为 `BLOCKED`。本地 14 项测试只证明代码中的协议和防护分支。

旧 H5 UI 工作流未重跑，也未把既往 Computer Use 验收计入本次 POC。

## 2. Windows Environment

`Get-CimInstance Win32_OperatingSystem`：Windows 10 Pro `10.0.19045`。`$PSVersionTable`：PowerShell Core `7.6.5`。工作目录 `local-absolute-path-omitted`。PATH 上 node、npm、pnpm、npx、codex、git、rg 均存在。`node --version` → `v22.22.2`；`npm --version` → `10.9.7`；`pnpm --version` → `10.33.0`；`npx --version` → `10.9.7`。逐项命令摘要见 environment.md（本地运行记录未纳入公开包）。

## 3. Codex MCP Environment

`codex --version` → `codex-cli 0.155.0-alpha.16.3`；Desktop 独立版本未可靠读取。项目现有 `.codex/config.toml` 已配置 `local-figma-bridge-poc`，命令为 Windows 绝对 Node 路径、stdio 和 POC `mcp/server.mjs`，启动/工具超时 30/45 秒。本轮仅只读检查配置，未覆盖、备份、修改用户级 MCP 或正式 server。单独的 `codex exec --ephemeral --sandbox read-only --json` 子会话两次调用 `figma_status` / `figma_read_document` 均完成；原始 `mcp_tool_call` 事件证实 Codex CLI 启动并使用该 stdio MCP 子进程。它也证明该 read-only CLI 沙箱没有阻止子进程访问 localhost WS。本任务 Desktop 的工具目录没有暴露该 POC tool，故原任务内直接调用 `NOT VERIFIED`。读写沙箱下的完整写链没有实测。

## 4. Figma Desktop Environment

`Get-Process Figma` 与 exe VersionInfo：运行中的 `local-absolute-path-omitted`，ProductVersion `126.9.10`。用户报告首次导入错误：`Manifest error: Invalid value for devAllowedDomains. 'ws://127.0.0.1:41731' must be a valid URL.` 修正后的 POC manifest 改用 `ws://localhost:41731`；用户随后报告已导入并启动，真实插件握手和 Plugin API 读取进一步证明修正版运行。原附件 `local-absolute-path-omitted` 未修改。导入记录（本地运行记录未纳入公开包）。没有通过 Computer Use、浏览器或截图检查 Figma。

## 5. POC Architecture

`Codex CLI → stdio MCP Node 进程 → 同进程 WS server (127.0.0.1:41731) → Figma Plugin UI (ws://localhost:41731) → parent.postMessage → Plugin main → figma.*`。响应经 `figma.ui.postMessage`、UI WebSocket、Node MCP 工具返回。对应源码：[MCP](../../.research/local-figma-bridge-poc/mcp/server.mjs)、[WS](../../.research/local-figma-bridge-poc/relay/bridge-server.mjs)、[UI](../../.research/local-figma-bridge-poc/plugin/ui.html)、[main](../../.research/local-figma-bridge-poc/plugin/code.js)、[manifest](../../.research/local-figma-bridge-poc/plugin/manifest.json)。`relay/` 是同进程模块，并非另一个 Relay 服务。Plugin 的网络开发域使用 localhost 是 Figma manifest 校验所需；**实际 TCP listener 和插件连接均为 IPv4 127.0.0.1**。

POC 仅有固定 command allowlist、独立 POC 页、ownership 标记和写入时的 expectedFileIdentity 校验。当前正式 H5 文件不符合本轮允许的写入目标，因此未调用写工具。代码在本轮 live read 后把 ownership 值修正为 `local-codex-figma-bridge-poc`，并修正 Text 更新字样与加载字体顺序；这些后续源码改动只有本地测试，**当前已运行插件的写入行为未因源码改动而得到现场验证**。

## 6. MCP ↔ WebSocket ↔ Plugin Connection

`Get-NetTCPConnection -LocalPort 41731 -State Listen` 显示 `127.0.0.1:41731`，无 `0.0.0.0`。实际插件握手日志的 `remoteAddress` 也是 `127.0.0.1`。Codex CLI 的 `figma_status` 输入为空对象，经 WS requestId 关联到 Plugin main 的 `currentStatus()`，返回 `sessionId=session-sanitized-1`、document `专用测试文件`、page ID `1:900001`、selectionCount 1 和 connectionId。详细原始输出见上述两份 Codex JSONL 与 MCP/WS 日志。`figma_read_document` 通过同一链路返回两个页（`1:900002`、`1:900001`）及当前选择的 `GROUP 1:900003`；`ownedPocNodes=[]`。这证明 Plugin API 读取，不证明任何设计写入。

## 7. Test Results

机器可读状态见 test-results.json（本地运行记录未纳入公开包）。下述 `BLOCKED` 是遵守用户给定的正式文件边界，不是 Figma API 返回的失败。

### Test 01 Connection

`VERIFIED`。Codex CLI `figma_status({})` 经 MCP/WS/Plugin 返回实际 session、connectionId、document 和 page；Figma 插件 TCP peer 是 `127.0.0.1`。MCP 只有在收到 Plugin 成功响应后才加入 `connected: true`，不是从静态配置臆造。后续真实 MCP 返回中可见 `connected: true`、document `专用测试文件`、page ID `1:900001`，见 第二次只读取证（本地运行记录未纳入公开包）。最初一次调用在重连前返回 disconnected，约 2 秒后的调用成功；失败尝试也保留在 首次只读取证（本地运行记录未纳入公开包）。没有将第一次失败改写为通过。

### Test 02 Read

`VERIFIED`。Codex CLI `figma_read_document({})` 返回 documentName、currentPageId/name、两页列表、selection `1:900003 GROUP`。请求与 Plugin API 返回见 live-read-mcp.jsonl（本地运行记录未纳入公开包）；WS requestId `runtime-id-omitted`，response `ok=true`、`latencyMs=4`。无 REST、截图或 Computer Use。

### Test 03 Create Frame

`BLOCKED`。当前是正式 H5 文件，没有发送 `figma_create_poc`。源码计划在 owned POC 页用 `figma.createFrame()` 建 375×812 `C2C Bridge POC`；没有本机创建结果或 node ID。

### Test 04 Create Text

`BLOCKED`。没有发送 `figma_create_text`；`figma.loadFontAsync`、`figma.createText`、parent/characters/font read-back 均未在当前插件 session 中执行。

### Test 05 Auto Layout

`BLOCKED`。没有发送 `figma_set_layout`；VERTICAL、四边 24、itemSpacing 16 均没有 Plugin API read-back。

### Test 06 Update

`BLOCKED`。没有发送 `figma_update_poc`；目标 text `Local Codex ↔ Local Figma VERIFIED`、padding 32、itemSpacing 20 仅为源码预期，不能将字面上的 “VERIFIED” 当作测试结果。

### Test 07 Prototype

`BLOCKED`。没有发送 `figma_create_prototype_sample`；`setReactionsAsync` 的 resolve、ON_CLICK → NAVIGATE → Frame B read-back 未获本机证据。也没有手工补连线或播放。源码有 API 调用结构；当前状态不是 API 失败。

### Test 08 Export

`BLOCKED`。没有发送 `figma_export_poc`，无 `exportAsync(PNG)` bytes，也无 `artifacts/c2c-bridge-poc.png`；因此文件签名、size、图片解析均未验证。UI 截图没有被替代使用。

### Test 09 Delete

`BLOCKED`。没有发送 `figma_delete_poc_owned`，也没有调用 `getNodeByIdAsync` 删除回查。没有删除正式或任何非 POC 节点。源码在删除前检查全子树 owner 标记，修正后的 owner 值是 `local-codex-figma-bridge-poc`；真实 Figma 行为仍未验证。

## 8. Long-lived Connection

**只读长连接及重连：VERIFIED。** 同一 MCP 子进程 local process、同一 plugin sessionId 和 connectionId `runtime-id-omitted`，在 11 秒间隔前后成功运行 status/read/status。WS 记录三个对应 requestId，返回延迟 2/4/2 ms，均 `ok=true`。关闭该 MCP client/Node 子进程后，WS 记录 disconnect；2 秒后新子进程 local process 启动，第一次 status 返回 disconnected，约 1 秒后插件以相同 sessionId、新 connectionId `runtime-id-omitted` 握手并成功 status。未重启 Figma，也未要求用户操作。证据：MCP 日志（本地运行记录未纳入公开包）、WS 日志（本地运行记录未纳入公开包）。写入期间断线、超时与 stale response 在真实 Figma 下为 `NOT VERIFIED`；本地模拟测试覆盖相应代码分支。

## 9. Relay vs Direct

架构 A 增加独立 Relay 进程；架构 B 由 MCP 进程自身监听 WS，Plugin UI 做 client。本机实测 **B 可用作单 Codex CLI / 单 Figma plugin 的只读连接及自动重连**，端口由 MCP 子进程拥有；关闭子进程即释放，重启后插件自动重连。B 减少一个 Windows 常驻进程和端口所有者。独立 Relay 对单文件场景的必要性未得到本机证据，当前不引入。多 client、多 document、MCP 进程重启期间排队请求及复杂 debug 的优势是架构推断，未做 A/B 运行对照；POC 只接受一个 active plugin connection，不能声称多文件支持。

## 10. Security Findings

- `0.0.0.0 binding`：实际监听与插件 remoteAddress 都是 `127.0.0.1`，`VERIFIED`。
- `unauthenticated WS`：Origin 仅允许 Figma/null iframe，且 hello 校验 workspaceId/taskId/sessionId/fileIdentity；本机同用户进程可能伪造 Origin/hello，缺少强配对密钥，风险 `OBSERVED`。正式版应加一次性配对 token/进程边界，不能仅信 Origin。
- `channel collision`：无公共 channel 广播，单活动连接和 requestId/sessionId/connectionId 关联；当前真实只读响应关联 `VERIFIED`，并发隔离仅本地测试。
- `arbitrary eval/delete/path traversal`：固定工具集合，无 eval、任意 node ID 删除或用户指定导出路径，源码 `OBSERVED`；真实 destructive 拒绝分支未在正式文件中冒险执行。
- `missing file identity / wrong document mutation`：真实返回 `fileIdentityQuality=session-only`；对照检测出正式文件并停止写入。写工具要求 expectedFileIdentity、MCP 和 Plugin main 两侧校验，源码与模拟测试通过，但不能凭调用者传入当前 identity 就判断该文件可写。正式版须加入独立目标文件授权/配对，默认 fail closed。
- `ownership`：POC pluginData owner 现为 `local-codex-figma-bridge-poc`，page/node/subtree 限定并拒绝 foreign tree；代码/本地测试 `VERIFIED`，Figma 写删 `BLOCKED`。
- `timeout/stale/disconnect/requestId collision`：pending map、12 秒默认超时、断线拒绝、requestId 校验；本地测试 `VERIFIED`。真实断线恢复 `VERIFIED`，真实在途请求断线结果 `NOT VERIFIED`。
- `stdout JSON-RPC pollution`：调试写 stderr；Codex CLI 工具调用实际完成，stdout 协议未被污染，`VERIFIED`。

## 11. File Identity and Ownership

首次 live identity 为 `session-only identity（具体标识已省略） protected business document`，质量 `session-only`，来自 plugin session、`figma.root.id`、document name。后续测试的 sessionId 变为 `session-id-omitted`，说明该 identity 不能跨插件会话当作稳定键。没有假造传统 file key。普通 Development Plugin 对 `figma.fileKey` 的可用性受 Figma API context 限制；当前实际没有返回 stable file key。[Figma Plugin API](https://developers.figma.com/docs/plugins/api/figma/)。

**actualFileIdentity** 可由 status 读取；**expectedFileIdentity** 必须由调用方显式提交，MCP 对照 WS 当前连接，Plugin main 再对照当前文档。当前实际文件是正式 H5，故即使两者相等也不得写。本轮没有建立一个允许写入的、独立测试文件身份。正式架构至少绑定 workspaceId、taskId、预授权文件标识/文件目标、sessionId、requestId 和 ownership。当前仅 `session-only` 不能提供跨会话强文件保护。

## 12. DesignSpec Direction

[DesignSpec 草案](../../.research/local-figma-bridge-poc/docs/design-spec-draft.json) 描述 `schemaVersion=1.0`、scope、375×812 viewport、stable key、node type、children、layout、typography、fills、componentReference、reactions、metadata、ownership、expectedFileIdentity、operationId、baseRevision。它是草案，`apply_design_spec` 引擎 **NOT VERIFIED / 未实现**。原报告对 `evidence-codes/figma-design-bridge` 的 typed ScreenSpec/stable key 分析是参考来源。

正式 apply 应先读 owned subtree/revision，按 stable key diff 决定 create 或 patch，绑定 `operationId + spec hash` 实现幂等；写前校验文件和 ownership，逐步写入并 read-back。失败时保留 mutation log，尽力补偿并标记 partial failure。不能把多节点操作称为 Figma ACID transaction，也不能把补偿说成已验证 rollback。POC 未实现上述引擎。

## 13. Source Project Reassessment

六个本地 clone commit 与原报告一致：mhue `b5ba2bd`、grab `ddd90f3`、southleft `3e99cb0`、gethopp `e8db933`、evidence-codes `914a7d5`、GLips `c083d65`。以下为源码/报告用途判断，不是候选项目本机运行结果。详见[原报告的源码表和证据路径](2026-09-23-local-codex-figma-bridge-feasibility.md)。

- **基础骨架：mhue26/figma-mcp**。Node stdio MCP、pending request、timeout/reconnect 值得借鉴；其 WS host 未显式 pin 且删除工具过宽。POC 的实测读链说明这些桥接机制可以在本机以受限实现运行，不证明 mhue 原项目运行。
- **功能库：grab/cursor-talk-to-figma-mcp**。Plugin UI/main、Text/Layout/组件批量工具可参考；Bun、channel/CORS、遥测和任意删除不带入。
- **DesignSpec：evidence-codes/figma-design-bridge**。typed ScreenSpec、stable key、单屏渲染最贴近未来 apply；其 wildcard manifest 权限不带入。其 `127.0.0.1` 绑定思路与本机 POC loopback 实测一致。
- **安全及多文件参考：gethopp/figma-mcp-bridge**。file routing、pending cleanup 和 delete confirm；confirm 不等于 ownership，listen host 未显式 pin。当前 POC 的 session-only identity 暴露了更强文件授权的需求。
- **高级能力参考：southleft/figma-console-mcp**。变量、组件、样式等；不带入 arbitrary eval、REST/PAT 混合入口。
- **只读上下文参考：GLips/Figma-Context-MCP**。REST/API key 路线，不适合本地 Plugin API 核心写链。

## 14. Blockers

唯一决定性阻断是 **当前运行插件的文档是正式 H5 文件**。用户禁止修改正式 Figma 内容，且不允许再要求人工切换文件、创建节点或操作 Canvas。本轮不能在该文件执行 Test 03–09，也不能在其中创建“隔离 POC 页”来绕过边界。Figma 文件切换无法在所允许的 MCP/Plugin API 读取链下自动替代用户操作；不得用 Computer Use、Playwright 或浏览器绕行。另有当前 Desktop 任务 MCP tool 未暴露的问题；Codex CLI 子会话已证明 local CLI read path，不等于 Desktop 当前任务直接调用。Prototype API 和 PNG export 没有本机结果，属于尚未执行，而非已证实不支持。

## 15. Final Decision

- **Q1**：Windows 上 Codex **CLI** → MCP → localhost → Figma Development Plugin → Plugin API → Local Figma 的**只读链 VERIFIED**；包含真实写入的完整目标链 `BLOCKED`。当前 Codex Desktop 任务直接使用 POC MCP `NOT VERIFIED`。
- **Q2**：本轮 `Computer Use=0` 且真实 read `VERIFIED`；在零 Computer Use 下完成 create/update/delete/Auto Layout/export 的合取要求 `BLOCKED`，无相关真实输出。
- **Q3**：本机 `ON_CLICK → NAVIGATE` `BLOCKED`；没有执行 `setReactionsAsync` 或 reaction read-back。
- **Q4**：已通过的核心只读链实际未用 Figma REST API、PAT、Remote MCP、Cloudflare、ChatGPT Web。POC 写链源码亦无这些依赖；但完整写链未执行，对写链“本机已证实不需要”的说法为 `NOT VERIFIED`。
- **Q5**：六项目分别适合作为 mhue 基础骨架、grab 功能库、evidence-codes DesignSpec、gethopp 安全/多文件、southleft 高级能力、GLips 可选只读上下文。依据是[原报告](2026-09-23-local-codex-figma-bridge-feasibility.md)与本地源码；本机 POC 只支持桥接骨架的只读可运行性，不支持其余功能已可运行的推断。
- **Q6**：倾向自行开发受限的 `protype-figma-bridge`，提取上述项目的局部实现，不直接原样采用或 fork。理由是上游 host、删除、任意执行、wildcard 权限、REST/token 或生命周期设计与用户边界冲突；本 POC 已证实最小 Node/MCP/WS/Plugin 读链与重连可以独立运行。**此正式实现选择为 INFERRED，生产可行性和写链仍 BLOCKED**。

## 16. Recommended Next Step

保持现有证据和 POC，不在正式 H5 文件写入。若以后获得符合本任务边界的**独立测试 Design 文件**，须先重新运行 Development Plugin 并通过 status 核对 document identity，然后再从 Test 03 开始逐项执行、保存原始请求、Plugin 响应和 read-back；这需要新的、明确允许的测试文件启动条件。当前不要求用户进行禁止范围内的 Figma 操作。若 Codex Desktop 当前任务需要直接调用该工具，应在新任务会话重新加载项目 MCP 并单独验证，不能借 Codex CLI 的结果代替。
