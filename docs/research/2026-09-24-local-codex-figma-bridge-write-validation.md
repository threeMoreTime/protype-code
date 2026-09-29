# Local Codex ↔ Local Figma Bridge：独立测试文件写链验证

验证日期：2026-09-24。状态词仅使用 `VERIFIED`、`OBSERVED`、`INFERRED`、`NOT VERIFIED`、`BLOCKED`。本报告补充[上一轮本机只读报告](2026-09-23-local-codex-figma-bridge-local-validation.md)，保留其当时的 `BLOCKED` 结论和原始证据。

## Executive Summary

**独立测试文件中的技术结论：FEASIBLE。** Windows 实机通过了 Codex CLI → stdio MCP → `127.0.0.1:41731` WebSocket → Figma Desktop Development Plugin UI → `postMessage` → Plugin main → Figma Plugin API。Codex CLI 真实调用过 `figma_create_poc`；同一 MCP server 的 SDK 客户端在 Figma 实机连续完成 Text、Auto Layout、update、Prototype、PNG export、ownership-checked delete，并分别通过 Plugin API read-back。两类客户端的证据分开保存，不能把 SDK 调用写成 Codex CLI 直接调用。

ON_CLICK → NAVIGATE 到 Frame B 的 `setReactionsAsync()` 写入和 reaction read-back 均为 **VERIFIED on this Windows/Figma machine**。Computer Use、Playwright、浏览器 Figma、Figma REST API、PAT、Remote MCP、Cloudflare 和 ChatGPT Web 在核心写链中的使用次数均为 0。**FEASIBLE 仅限用户授权的独立测试文件，不授权正式 H5 写入。** 当前 `session-only` identity、无鉴权本机 WS 等问题仍阻止正式接入。

## 1. Previous Verified Baseline

上一轮在正式 `专用测试文件` 只执行 status/read；Test 03–09 因用户禁止修改正式文件而 `BLOCKED`，并非 API 失败。既有 Codex CLI、stdio MCP、loopback WS、Plugin 连接、document read、只读长连接和断线恢复结论维持 `VERIFIED`。详见[上一轮报告](2026-09-23-local-codex-figma-bridge-local-validation.md)及其日志。没有覆盖旧日志；机器可读状态（本地运行记录未纳入公开包）保留了 `previousValidation`。

## 2. Dedicated Test File Authorization

用户明确回复 `TEST_FILE_READY` 和 `PLUGIN_RUNNING`，授权一个新的独立空白 Design 文件。真实 `figma_status` 返回文件名 `Untitled`、`Page 1`、selectionCount 0；它不是正式 H5 文件。名称没有改为建议名称，因此**不能靠文件名证明跨会话唯一性**。每次写入前，runner 都读取 status，拒绝正式 H5 名称，固定当次 `fileIdentity`/`sessionId`，每个写工具传 `expectedFileIdentity`。最终完整运行的 identity 为 `session-only identity（具体标识已省略）`，quality 为 `session-only`，connectionId 为 `runtime-id-omitted`。最终摘要（本地运行记录未纳入公开包）。这是一轮人工授权加会话 pin，不是持久 file key。

## 3. Sanity Check

`figma_status` 与 `figma_read_document` 返回 `connected=true`、`Untitled`、当前页、空白原始选择和当次连接信息；Plugin 握手来自 `127.0.0.1`。MCP 原始请求/响应（本地运行记录未纳入公开包）、WS requestId/响应/延迟（本地运行记录未纳入公开包）。短暂的首次 status 失败也保留在日志，随后插件自动连接；没有将失败删掉。

## 4. Test 03 Create Frame

`VERIFIED`。首次 Codex CLI `figma_create_poc({expectedFileIdentity})` 在 12 秒 MCP 超时后，独立 `figma_read_document` 已发现 native `FRAME` ID `1:900004`，名称 `C2C Bridge POC`、375×812、parent 为 owned 页 `1:900005`，owner 为 `local-codex-figma-bridge-poc`；原始首次尝试（本地运行记录未纳入公开包）明确记录超时。随后把**该命令**超时改为 30 秒，Codex CLI 重试返回相同 ID，read-back 确认没有重复 Frame：重试证据（本地运行记录未纳入公开包）。本轮只将“成功重试 + 独立回读”计为 VERIFIED；首次超时不算成功响应。

## 5. Test 04 Create Text

`VERIFIED`。`figma_create_text` 在 Plugin main 执行 `figma.loadFontAsync({family:"Inter",style:"Regular"})` 后创建 native TEXT，read-back：ID `1:900006`、parent `1:900004`、初始 `Local Codex → Local Figma`、font `Inter Regular`、POC owner。真实请求、response 和后续独立读取见首次写链日志（本地运行记录未纳入公开包）。

## 6. Test 05 Auto Layout

`VERIFIED`。`figma_set_layout` 后独立读取 `layoutMode=VERTICAL`、四边 padding 均为 24、itemSpacing=16。首次运行发现设置 Auto Layout 后 Frame 被 Figma 调整为 375×48，后续 update 为 375×64；原始日志保留。最小修复是在 `setPocLayout()` 与 `updatePoc()` 末尾重新 `frame.resize(375,812)`，最终实机回读均为 375×812。[修复源码](../../.research/local-figma-bridge-poc/plugin/code.js)。没有通过 Canvas 手工修尺寸。

## 7. Test 06 Update

`VERIFIED`，依据首次写链的旧值 → 写入 → 新值回读：Text 从 `Local Codex → Local Figma` 变为 `Local Codex ↔ Local Figma VERIFIED`，padding 从 24 变为 32，itemSpacing 从 16 变为 20。首次运行摘要（本地运行记录未纳入公开包）与原始 MCP/WS 日志记录该变化。更新 Text 前再次 `loadFontAsync`。最终完整重跑是幂等复核，Text 原本已是新值，因此该**次**摘要如实标为 `OBSERVED`；综合首次真实值变化及最终回读，本项为 `VERIFIED`。

## 8. Test 07 Prototype

`VERIFIED`。Plugin main 对 owned Button 调用 `setReactionsAsync()` 并返回成功。独立 `figma_read_document` 从 Plugin API 读回 Button `1:900007` 的 `trigger.type=ON_CLICK`、`actions[0].type=NODE`、`navigation=NAVIGATE`、`destinationId=1:900008`，且 `1:900008` 正是 owned Frame B。最终记录见摘要（本地运行记录未纳入公开包）和原始 MCP 请求/响应（本地运行记录未纳入公开包）。实际播放跳转没有测试，状态为 `NOT VERIFIED`；这不影响 reaction 写入与 read-back 的 VERIFIED。

## 9. Test 08 Export

`VERIFIED`。`figma_export_poc` 经 Plugin `frame.exportAsync({format:"PNG",constraint:{type:"SCALE",value:1}})` 返回 bytes，MCP 保存[PNG 产物](../../.research/local-figma-bridge-poc/artifacts/c2c-bridge-poc.png)。文件 6363 bytes、PNG signature 正确、IHDR 375×812，Codex 本地图片读取器成功解码。首次导出的 375×64 PNG 原样另存于 `artifacts/c2c-bridge-poc-before-2026-09-24T06-32-21-447Z.png`，没有覆盖旧证据。额外视觉检查发现长文字在 Frame 右侧被裁切；这是 POC 排版缺陷，**不影响** `exportAsync` 路径的技术验证，不应视为可交付视觉设计。不是 Figma UI 截图。

## 10. Test 09 Delete

`VERIFIED`。删除前 `figma_read_document` 确认待删树的每个节点 owner 均为 `local-codex-figma-bridge-poc`。`figma_delete_poc_owned` 只删除 6 个 owned 节点，返回各 ID 的 `exists=false`；调用后再次独立读取 `ownedPocNodes=[]`。POC 页未删除，日志报告 `pageDeleted=false`。删除代码没有任意 nodeId 参数，且递归 ownership 检查为 fail closed。最终摘要（本地运行记录未纳入公开包）、[源码](../../.research/local-figma-bridge-poc/plugin/code.js)。

## 11. Write-chain Long Connection

最终一轮 status → create → text → layout → update → read → prototype → export → delete → wrong-identity read-back 在同一 `sessionId=session-sanitized-1`、同一 `connectionId=runtime-id-omitted` 完成，`reconnections=[]`。每一步的 requestId、command、response 与 latency 在WS 日志（本地运行记录未纳入公开包），MCP 输入和 Plugin 返回在MCP 日志（本地运行记录未纳入公开包）。先前多轮 runner 正常结束时 MCP stdio 子进程关闭，Plugin UI 显示 `Disconnected — retrying…`；下一次本机 MCP listener 启动后，插件自动重连，不需要 Figma 重启或再次导入。最终另起常驻 stdio 进程时，Windows `Get-NetTCPConnection` 实测 `127.0.0.1:41731` 为 Listen，和 `127.0.0.1` 对端为 Established。常驻生命周期只在进程存活时有效，不是后台服务保证。

## 12. Negative Safety Tests

- 错误 `expectedFileIdentity`：`VERIFIED` 拒绝。故意传入 `intentionally-wrong-file-identity`，MCP 返回错误，前后 document/pages/owned nodes 读回一致。该次在 Node bridge guard 即被拒绝，Plugin main 的同类 guard 有源码及本地模拟测试，但**未单独在活 Plugin 触发**。
- 正式 H5 denylist：Node bridge 和 Plugin main 均存在精确 document-name 拒写 guard，本地模拟测试通过。按照禁令**没有**回到正式 H5 实测写工具；正式文件上的 live rejection 为 `NOT VERIFIED`。
- foreign ownership delete rejection：源码对整棵树递归检查，模拟测试通过。没有为负测试创建非 owned Figma 节点；活文件反例为 `NOT VERIFIED`。
- Node listener 仅监听 `127.0.0.1`；Figma manifest 保持 `ws://localhost:41731`，因为先前版本拒绝 `ws://127.0.0.1:41731` 作为 `devAllowedDomains`。实际 TCP 和插件 peer 均为 127.0.0.1。

## 13. Codex Desktop MCP Status

Codex CLI 真实直接 MCP status/read/create 为 `VERIFIED`。当前 Desktop 任务工具目录没有暴露 `local-figma-bridge-poc`，因此 Desktop **直接工具调用为 NOT VERIFIED**。Test 04–09 由本机 Node MCP SDK 客户端调用相同 stdio MCP 进程；这是实际 MCP/WS/Plugin API 链路，不是 mock，但不能记成 Desktop 直接调用。

## 14. Remaining Security Gaps

`fileIdentityQuality=session-only`，插件重启后 sessionId 会变化；`Untitled` 也不能唯一定位长期 Design 文件。正式 H5 仍需持久 document identity、显式 pairing/授权、写入 scope 与 ownership 策略、客户端鉴权、防本机其他进程连接 WS、可审计任务 ID、幂等写入与 rollback/compensation。当前 POC 无任意 eval、任意路径导出或任意 node delete；但本机 WS peer 尚无强认证，session pin 不等于正式文件授权。导出文字裁切亦说明技术桥接成功不等于设计质量验收。

## 15. Final Verdict / 六个问题

1. **Q1：是，独立测试文件上 VERIFIED。** Codex CLI 直接创建 owned Frame，MCP SDK 客户端通过同一真实 stdio server 完成余下写链；当前 Desktop 任务的直接 MCP 仍 `NOT VERIFIED`。
2. **Q2：是。** read/create/text/Auto Layout/update/read-back/export/delete 真实完成，Computer Use = 0；无人工 Canvas 操作。
3. **Q3：是。** `setReactionsAsync` resolve 且 Plugin API 读回 ON_CLICK → NAVIGATE → Frame B；实际播放为 `NOT VERIFIED`。
4. **Q4：核心写链 REST API = 0、PAT = 0、Remote MCP = 0、Cloudflare = 0、ChatGPT Web = 0。**
5. **Q5：不够。** session-only identity 加人工授权仅覆盖本次独立 POC；正式 H5 需要稳定身份、pairing 与单次明确授权。
6. **Q6：顺序为 A → B → C → D。** 先 harden file identity/auth，再实现 `apply_design_spec v0.1` 的稳定 key、diff、幂等和回滚；Variables/Components 按实际设计需求扩展；正式 H5 接入最后单独授权。原研究对六项目的定位仍适用：mhue26 作骨架参考、grab 作操作参考、evidence-codes 作 DesignSpec 参考、gethopp 作安全/文件路由参考、southleft 作高级 API 参考，GLips 的 REST 提取不进入写核心。实机 POC 支持继续自研 `protype-figma-bridge`，不直接原样部署任一上游项目。

## 16. Next Phase and Reproduction Notes

先关闭当前授权测试文件的写权限假设，再为正式化实现持久文件身份与授权握手。此 POC 的[代码和操作说明](../../.research/local-figma-bridge-poc/README.md)、机器状态（本地运行记录未纳入公开包）、原始 MCP/WS JSONL 及 PNG 一同保留。`npm test` 的本地模拟测试 16/16 通过，证据级别与上述真实 Figma 结果分开。未修改 `客服客户端业务仓库`、正式 H5 设计节点或用户级 MCP 配置；未提交、推送或发布。
