# Local Codex ↔ Local Figma Bridge 可行性专项调研

审计日期：2026-09-23<br>
工作区：local-absolute-path-omitted<br>
结论口径：源码能力与本机运行证据分开；本报告不把“API 文档支持”或“模拟 peer 返回成功”写成真实 Figma 已通过。

## 1. Executive Summary

**结论：INFERRED — 本机架构可实现；BLOCKED — 本机真实 Figma POC 尚未完成，当前不能标为 FEASIBLE。**

已经具备的证据：

- VERIFIED：Codex CLI 识别了项目级 stdio MCP 配置；POC MCP server 可与测试 MCP client 完成 stdio 往返。
- VERIFIED：本机 Codex CLI 子会话已加载并调用 POC MCP：只读 `figma_status` 与获准的 `figma_create_poc` 均到达 MCP server，均返回 `Figma Development Plugin is not connected`。因此 Codex → MCP 已验证，MCP → Figma 仍未验证。
- VERIFIED：实际启动 POC 入口时，WebSocket 只监听 127.0.0.1:41731，之后进程已关闭。
- VERIFIED：模拟 Figma peer 测试通过 3/3，覆盖 stdio↔WebSocket往返、loopback 与 Origin 检查、request correlation、迟到响应、超时、command allowlist 及 PNG 输入校验。
- VERIFIED：本轮未调用 Computer Use、浏览器 Figma、Figma REST API、Remote MCP 或云隧道；没有对 Figma 文档执行读写。
- VERIFIED：POC 插件源码包含原生 Frame/Text/Auto Layout、setReactionsAsync 与 exportAsync 的实现路径，并把删除限制为带 POC ownership 标记的节点。

尚未获得的关键证据：

- BLOCKED：没有观察到 Figma Development Plugin 连接；manifest 是否已导入、插件是否已启动，当前均未通过 Figma UI 独立确认。插件 Origin / CSP / WebSocket 握手和 Test 01–09 的 Figma 部分尚未通过。
- VERIFIED：本机 `codex exec` 子会话已加载并发出 `figma_status`，MCP server 返回“Figma Development Plugin is not connected”。NOT VERIFIED：当前 Codex Desktop 原对话是否装载该 server。
- NOT VERIFIED：真实插件生命周期内连续 read/create/update/read/export/delete 是否稳定。
- NOT VERIFIED：setReactionsAsync 是否在本机实际建立可播放的原型交互；Prototype 播放本身没有测试。

因此：

| 验收项 | 当前状态 |
|---|---|
| 技术架构可行性 | INFERRED；官方接口与本机运行时形态相容 |
| MCP + loopback server | VERIFIED（通过模拟 peer 与本机启动检查） |
| Figma Development Plugin connected | BLOCKED |
| 真实文档 read/write/export/delete | BLOCKED |
| Computer Use = 0 | VERIFIED（本轮无 Computer Use 调用） |
| 完整成功标准 | **BLOCKED；不得宣称 FEASIBLE** |

现在需要的唯一人工动作是首次导入本地 Development Plugin。动作说明在报告末尾；导入后先暂停，不要立即运行插件。

## 2. 范围、现状基线与方法

旧 H5 流程不在本报告中重新推断；以既有审计为基线：[CURRENT_WORKFLOW_AUDIT.md](../../CURRENT_WORKFLOW_AUDIT.md)。该审计记录的旧流程为 Codex 只读读取 客服客户端业务仓库 → evidence → ChatGPT Web → 本地回复归档 → Computer Use → Figma Web / Prototype。它不是本轮 Local Figma Bridge 的运行证据。

本轮实际范围：

- 只读审查六个克隆仓库的 README、package.json、manifest 和相关 MCP / WebSocket / 插件源文件。
- 在独立目录创建本地 POC 与项目级测试 MCP entry。
- 安装了 POC 自身依赖；没有在六个候选仓库中安装、构建或启动程序。
- 没有修改 客服客户端业务仓库、正式 H5 设计页或用户级 Codex 配置。
- 没有执行 Figma GUI 操作。Figma 菜单存在 Import plugin / Hot reload 等项是任务输入中用户此前确认的事实；本轮没有重看 UI。
- GitHub Issues 没有做系统性审查；候选判断以以下固定 commit 的源代码为主，不代表对 issue backlog 或全部上游分支的完整尽调。

证据标签：

- VERIFIED：本轮命令输出、源码或测试直接证明。
- OBSERVED：环境或用户先前提供的现象；未必在本轮重复操作。
- INFERRED：由官方接口和实现结构推导，仍需真实 Figma 运行确认。
- NOT VERIFIED：目前证据不足。
- BLOCKED：按用户规定，需要先完成人工导入/启动，或本轮不允许执行。

## 3. 本机环境

| 项目 | 结果 |
|---|---|
| OS / Shell | OBSERVED：Windows；当前工具以 PowerShell 执行 |
| Node.js / npm / pnpm | VERIFIED：Node v22.22.2、npm 10.9.7、pnpm 10.33.0 |
| Codex CLI | VERIFIED：codex-cli 0.155.0-alpha.16 |
| Figma Desktop | VERIFIED：进程路径 local-absolute-path-omitted 126.9.10 |
| Figma Import / Hot reload 菜单 | OBSERVED：按用户提供的本机事实；本轮没有使用 Computer Use 检查菜单 |
| 当前 MCP 清单 | VERIFIED：codex mcp list 显示全局 codex_app（disabled）、cua_repl、node_repl，以及项目 local-figma-bridge-poc（enabled） |
| 项目 MCP 详情 | VERIFIED：codex mcp get 显示 stdio、绝对 Node 命令、POC server.mjs、POC cwd、30 秒启动超时、45 秒工具超时 |
| 项目信任 | VERIFIED：用户级配置将 protype-code 标为 trusted；官方规定项目 `.codex/config.toml` 仅对 trusted project 生效 |
| MCP approval policy | VERIFIED：项目 entry 默认 `writes`，仅固定 9 个 POC tools 暴露；`figma_status` / `figma_read_document` 声明 readOnlyHint，明确范围内的 POC create/update/prototype/export/delete tools 仅在项目配置中逐工具 `approve`。全局配置未修改。status 与 create_poc 两次 CLI 调用均到达本地 server |
| 用户级 MCP 配置 | VERIFIED：本轮没有写入或覆盖 local-absolute-path-omitted |
| 固定 loopback 端口 | VERIFIED：经 POC MCP 入口启动后，地址为 127.0.0.1:41731；检查后已关闭，没有遗留常驻 server |
| Bun | NOT VERIFIED：没有将 Bun 作为 POC 运行时；cursor-talk-to-figma-mcp 的 Bun 路径未在这台机器启动 |
| POC 依赖 | VERIFIED：@modelcontextprotocol/sdk 1.29.0、ws 8.18.0、zod 3.25.76；npm install 已在 POC 目录完成 |
| npx / tsx | POC 不需要：Codex 直接启动绝对路径 node.exe + server.mjs；MCP entry 没有 npx / tsx |
| Codex sandbox | VERIFIED：当前执行环境提供的 sandbox profile 为 danger-full-access；stdio 子进程和 loopback 在本轮测试中均可用。当前 Codex Desktop 是否用相同 sandbox 约束其 MCP 子进程，NOT VERIFIED |
| 网络/端口限制 | VERIFIED：POC MCP 进程可在 127.0.0.1:41731 监听；未观察到本机 Node loopback 拦截。Figma iframe 的 CSP 与当前 Codex Desktop 到该子进程的实际调用仍 NOT VERIFIED |

Figma 已安装版本可以通过进程路径确认；Import plugin、首次 Run、Show/Hide console、Hot reload 本轮均未执行。菜单是否可见属于用户先前提供的 OBSERVED 事实，不能作为插件运行通过证明。

公开项目配置采用保守共享默认：使用 PATH 上的 Node、仓库内相对路径、`enabled = false` 和 `default_tools_approval_mode = "writes"`。本机历史运行配置含机器专属路径，不纳入公开报告。这些静态设置不证明 clean clone 中的 Codex 配置发现、相对 `cwd` 解析或 MCP 实际启动已验证。

官方 Codex 文档说明本地 MCP 可用 stdio 的 command/args/cwd 配置；项目级 `.codex/config.toml` 仅对 trusted project 生效；MCP server 支持 `default_tools_approval_mode` 与 per-tool approval mode。[Codex MCP 文档](https://developers.openai.com/codex/mcp)、[Codex 配置基础](https://developers.openai.com/zh-Hans/docs/config-file/config-basic)、[配置参考](https://developers.openai.com/codex/config-reference)。当前官方 Codex 源码中 `AppToolApproval::Approve` 会令 MCP approval prompt 自动获准（[Codex MCP approval implementation](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/mcp/mod.rs)）；本 POC 只对任务已授权的固定设计工具作项目级覆盖。用户级全局审批策略与配置未修改。本机 Codex CLI 的 status/create_poc 已到达 server；当前 Codex Desktop 原对话是否装载该 server 仍 NOT VERIFIED。

## 4. 官方能力边界

### 4.1 进程与网络模型

Figma 插件主线程运行在受限 sandbox：可以访问 Figma scene / Plugin API，但没有 DOM、fetch、WebSocket 等浏览器 API；figma.showUI() 建立的 UI iframe 有浏览器 API。主线程与 iframe 通过 message passing 交换消息。因此本地 WebSocket 必须由 UI iframe 持有，UI 收到 MCP 指令后 postMessage 给主线程，再由主线程调用 figma.*。[How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/)、[Creating UI](https://developers.figma.com/docs/plugins/creating-ui/)、[figma.ui.postMessage](https://developers.figma.com/docs/plugins/api/properties/figma-ui-postmessage/)。

插件 manifest 的 networkAccess 支持 http / https / ws / wss scheme，并有 devAllowedDomains 用于本地开发服务器；官方示例使用 localhost。官方文档没有专门给出“ws://127.0.0.1:<port> 在所有 Figma Desktop 版本都通过 CSP”的运行承诺，因此 POC manifest 的精确数字 loopback 域名必须在本机插件里实测。[Plugin Manifest](https://developers.figma.com/docs/plugins/manifest/)。

### 4.2 原生节点、字体、布局、导出

- Figma Plugin API 提供 createFrame、createText、createRectangle 等原生节点操作，节点仍可在 Figma 中编辑；不是把截图当作设计。[Plugin API 概览](https://developers.figma.com/docs/plugins/)、
[createFrame](https://developers.figma.com/docs/plugins/api/properties/figma-createframe/)、
[createText](https://developers.figma.com/docs/plugins/api/properties/figma-createtext/)。
- 修改文本内容/样式前要 await figma.loadFontAsync(fontName)。[loadFontAsync](https://developers.figma.com/docs/plugins/api/properties/figma-loadfontasync/)。
- Auto Layout 由 frame 的 layoutMode、padding、itemSpacing 等节点属性设置；需要运行时验证，不由 MCP 层自动赋予。
- Node.exportAsync({format:"PNG"}) 返回 Uint8Array，可作为 Figma 原生渲染导出，不需要 UI 截图或 REST API。[exportAsync](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/)。

### 4.3 Prototype 与 file identity

- 在 documentAccess=dynamic-page 时，node.reactions 为只读属性，应通过 node.setReactionsAsync(...) 写入；官方共享 Node Properties 列出该方法。[Shared Node Properties / reactions](https://developers.figma.com/docs/plugins/api/node-properties/)。
- Figma 只有向 private plugin / Figma-owned resource 开启 enablePrivatePluginApi 时才提供 figma.fileKey；POC 没有请求该权限。因此 POC 在普通开发插件场景中采用 session-only identity，而不是伪称永久稳定的文件 key。[figma global API](https://developers.figma.com/docs/plugins/api/figma/)。
- Figma 官方说明插件由用户启动，不能构建在后台自动运行的插件。主线程/iframe 在插件运行期间可保持长连接；关闭插件 UI 会销毁 iframe，插件关闭或 Figma 会话结束也会断连。Development Plugin 需要 Figma Desktop 测试，支持 Hot reload；Dev Mode 插件只读，因此 POC manifest 指定 editorType=["figma"]。[Plugin introduction](https://developers.figma.com/docs/plugins/)、[Quickstart](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)、[Dev Mode](https://developers.figma.com/docs/plugins/working-in-dev-mode/)。
- Figma 文档介绍 Desktop app 与 Windows；本机确有 Windows Figma 126.9.10 进程，但本机插件 manifest import / CSP / WebSocket 兼容尚未跑通。没有发现需额外启用 Windows 特殊插件权限的官方要求；本机行为仍是 NOT VERIFIED。

## 5. 六个开源项目源码比较

固定审查版本：

| 项目 | commit | commit date | 本地路径 |
|---|---|---|---|
| mhue26/figma-mcp | b5ba2bd | 2026-06-18 | .research/figma-bridge/mhue26-figma-mcp |
| grab/cursor-talk-to-figma-mcp | ddd90f3 | 2026-07-26 | .research/figma-bridge/cursor-talk-to-figma-mcp |
| southleft/figma-console-mcp | 3e99cb0 | 2026-09-21 | .research/figma-bridge/figma-console-mcp |
| gethopp/figma-mcp-bridge | e8db933 | 2026-09-21 | .research/figma-bridge/figma-mcp-bridge |
| evidence-codes/figma-design-bridge | 914a7d5 | 2026-07-27 | .research/figma-bridge/figma-design-bridge |
| GLips/Figma-Context-MCP | c083d65 | 2026-06-24 | .research/figma-bridge/Figma-Context-MCP |

矩阵符号：✓ = 源码中找到相应实现；R = 读取；W = 写入；— = 没找到相应实现；Conn = Figma 可见连接线，不等于 Prototype reaction；「源码能力」不表示在本机验证过。

| 项目 | Node / Bun | MCP | WS 架构 | Local only | REST 核心 | Token | Read / Write | Auto Layout | Components | Variables | Prototype | Export | Windows | 源码风险 / 二开复杂度 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mhue26 | Node >=18；tsx | stdio | 单独 socket.ts 服务 + MCP server + 插件，默认 channel | 设计为本地，但 WS 未显式绑定 127.0.0.1 | 否；REST-only 评论工具为 stub | 否 | R/W | ✓ | 创建 instance | 未发现 | R reactions + 创建 Conn；没有 setReactionsAsync | Plugin API exportAsync | Node 方向无已知 Win 专属阻碍；未运行 | MCP UUID/timeout/reconnect 较完整；任意 node delete、server host 未 pin；中等改造 |
| grab/cursor-talk-to-figma-mcp | Bun | stdio | Bun.serve relay + channel join + Plugin UI WebSocket | 无公开云端核心要求，但服务未显式 loopback pin | 否 | 否 | R/W | ✓ | 创建 instance | 未发现 | R reactions + Conn；未找到 setReactionsAsync | Plugin API exportAsync | 需 Bun；当前机 Bun 路径 NOT VERIFIED | CORS 为 *、channel 模式、任意删除；插件含 Google Analytics 用法（源码说明发送命令名/成功失败等，复用前需评估/禁用）；高安全改造 |
| southleft/figma-console-mcp | Node；插件 | stdio / 可选云模式 | Desktop Bridge WSS，含 fileKey 路由；默认 host="localhost" | 混合模式；本地插件路径与 REST / remote 功能并存 | 可选且若干工具依赖 REST | 部分工具需要 | R/W | ✓ | ✓ | ✓ | figma_execute 任意 JS 可编程写 reaction，但无受约束 Prototype 专用工具 | Plugin API exportAsync | Node 兼容性推断；未在本机运行 | 能力最丰富；有任意执行、宽泛权限 / REST / token 入口；高级参考，不宜整体采用 |
| gethopp | MCP server Node >=20；插件 Bun/Vite 工具链 | stdio | MCP 进程内 leader/follower HTTP RPC + WS，支持多文件 fileKey | 设计为本地；leader server.listen 未显式指定 loopback host | 否 | 否 | R/W | ✓ | 组件树 / instance 读写能力，视工具而定 | R | 未找到 setReactionsAsync | Plugin API exportAsync | Figma Desktop 支持 Windows（README）；Bun 插件构建在本机未验证 | 多文件、timeout/heartbeat、delete_nodes 要求 confirm=true；host 未 pin，fileKey 可能退化；中高复杂度 |
| evidence-codes | Node >=18 | stdio | MCP server 自己起 WSS，显式绑定 127.0.0.1 | server loopback，但 manifest 用 allowedDomains=["*"] | 否 | 否 | R/W | ✓，typed ScreenSpec | 未发现 | W，颜色变量 | 未发现 | 未发现 exportAsync | Node/Figma Desktop；本机未验证 | 优秀单屏 Spec/upsert 参考；宽泛插件网络域权限与安全目标冲突；低至中等二开 |
| GLips/Figma-Context-MCP | Node >=20.20；pnpm | stdio + Streamable HTTP | 无插件 WS | 否 | 是，核心通过 Figma REST / fileKey | 是，PAT/OAuth 配置 | R / 无写 | R 的上下文抽取 | R 元数据 | R/上下文提取受 REST 响应限制 | R 数据 / 无写 | REST 下载或渲染资源，不是本地 Plugin API export | Node 路径跨平台推断；未运行 | 适合作为只读上下文工具，不适合本地 Figma 写入主链 |

### 5.1 候选源码判断

**mhue26/figma-mcp — 最小 Node 桥接骨架参考，不建议原样接入。** package scripts 明确拆出 socket、MCP start；socket.ts 的 WebSocketServer 仅指定 port，没传 host；server.ts 使用 StdioServerTransport、pending request map、timeout 与断连清理。code.js 有 create/read/update、loadFontAsync、exportAsync、delete_node；get_reactions 读取原型，但 create_connections 创建 Figma ConnectorNode 可见连线，并非写入 Button 的 Prototype reaction。证据路径：package.json、src/socket.ts、src/server.ts、src/code.js、src/manifest.json。

**grab/cursor-talk-to-figma-mcp — 操作能力库参考，安全边界不适合直接带入。** UI WebSocket、channel、批量 node/text/layout/component-instance/export 能力丰富；需要 Bun，relay 的 Bun.serve 未显式锁定 loopback，返回 CORS wildcard。MCP 暴露 delete_node / delete_multiple_nodes。Prototype 流程是读 reactions 后构造 connector lines。UI 中还存在对 Google Analytics Measurement Protocol 的上报逻辑；报告不复制其中任何标识符或凭据值。证据路径：package.json、src/socket.ts、src/talk_to_figma_mcp/server.ts、src/cursor_mcp_plugin/ui.html、code.js、manifest.json。

**southleft/figma-console-mcp — 高级能力参考，不是本地最小链路。** Desktop Bridge 支持变量、组件、样式、选择、截图导出和多文件路由；核心 MCP 工具中存在 figma_execute / executeCodeViaUI，通过 UI 执行 arbitrary code（插件 main 使用 eval），且一些高级读取走 REST 与 FIGMA_ACCESS_TOKEN。WSS 默认绑定 host="localhost"，不满足“源码明确 127.0.0.1”的硬要求。证据路径：src/core/websocket-server.ts、figma-desktop-bridge/code.js、manifest.json、src/core/figma-tools.ts。

**gethopp/figma-mcp-bridge — 多文件与破坏性操作防护参考。** server/bridge.ts 按 fileKey 建连接、关联 request id、处理 disconnect/timeout；tools.ts / Plugin main 对 delete_nodes 要求 confirm=true，且禁止删除 Page/Document。leader.ts 的 server.listen(port) 没显式传 host，无法通过源码证明只绑定 loopback；Plugin main 尝试使用 figma.fileKey，缺失时有 fallback。未找到 setReactionsAsync。证据路径：server/src/leader.ts、bridge.ts、tools.ts、plugin/src/main/code.ts、plugin/manifest.json。

**evidence-codes/figma-design-bridge — typed DesignSpec / 单屏渲染最佳参考。** Zod ScreenSpec 有 stable key，MCP 一个 render_screen 交给插件构建 native Frame/Text/Rectangle/Auto Layout，并有 keyed delete / variables。server.js 严格监听 127.0.0.1；但是 manifest 将 allowedDomains 设置为 *，其 reasoning 声明“实际上只走本地”，这不是网络访问限制本身。没有找到 Prototype reaction setter 或 exportAsync。证据路径：src/schema.js、src/server.js、plugin/code.js、plugin/manifest.json。

**GLips/Figma-Context-MCP — 只读上下文，不是写入桥。** MCP 工具以 fileKey 请求 https://api.figma.com/v1 下的文件、节点、图片等资源，server 支持 stdio / Streamable HTTP；API auth 配置需要 Figma API key/OAuth。源码未实现 Figma Development Plugin 主写入链。证据路径：src/services/figma.ts、src/mcp/index.ts、src/server.ts、src/mcp/tools/get-figma-data-tool.ts。

所有候选以上结论来自 pinned commit 的静态源码；没有安装或运行候选项目，不能据此作运行通过声明。

## 6. 方案 A / B：是否需要独立 Relay

### A：额外独立 Relay 进程

Codex MCP → 独立 Relay → Figma Plugin UI。Relay 负责 WSS、多个 MCP client、多文件路由、观察连接和重启恢复。

好处是服务生命周期独立、多 client 可共享、多文件路由可集中管理；代价是多一个进程、端口/发现配置、生命周期与日志、认证和跨进程故障面。对单用户单 Codex 单 Figma 的当前目标，未证明需要这些能力。

### B：MCP server 自带 WebSocket listener

Codex MCP stdio child 同时在 127.0.0.1:41731 监听 WebSocket；Figma Plugin UI 是客户端；MCP child 生命周期结束时关闭 listener。

**POC 选择 B。** WebSocket 仍然需要一个 server endpoint，“不需要 Relay”指不再额外运行一个独立 relay 服务；不是把 MCP stdio 字节流直接插到插件 iframe。Figma UI iframe 只能做客户端一侧；server 与 MCP 生命周期同进程简化连接、调试与 Windows 启停。

目前 POC 单 MCP server 只接受一个活动插件会话；多 Codex client / 多 Figma 文件会需要明确的 file identity、每文件 connection map 与并发控制，再决定是否拆 Relay。不能把当前 POC 的 single connection 冒充多文件实现。

## 7. POC 结构与真实调用状态机

源码目录：.research/local-figma-bridge-poc/。

~~~text
Codex stdio
  → mcp/server.mjs（固定命令工具；stderr 日志）
  → relay/bridge-server.mjs（WebSocketServer host=127.0.0.1）
  → plugin/ui.html（WebSocket client；重连和 heartbeat）
  → postMessage
  → plugin/code.js（校验命令 / session / file identity）
  → Figma Plugin API（目标 Figma 文档）
~~~

已实现的逻辑状态机（源码状态；真实插件链路尚未启动）：

~~~mermaid
stateDiagram-v2
    [*] --> MCP_CHILD_START
    MCP_CHILD_START --> LOOPBACK_LISTENING
    LOOPBACK_LISTENING --> WAITING_PLUGIN
    WAITING_PLUGIN --> WS_CONNECTED: UI WebSocket open
    WS_CONNECTED --> HELLO_VALIDATED: workspace/task/session/file identity
    HELLO_VALIDATED --> READY: plugin-ready / ready handshake
    READY --> COMMAND_PENDING: allowlisted MCP command + requestId
    COMMAND_PENDING --> PLUGIN_API_EXEC: postMessage to main thread
    PLUGIN_API_EXEC --> RESPONSE_CORRELATED: result matches active identity
    RESPONSE_CORRELATED --> READY
    COMMAND_PENDING --> REQUEST_REJECTED: timeout / disconnect / stale response
    WS_CONNECTED --> RECONNECTING: close/error
    RECONNECTING --> WAITING_PLUGIN: retry fixed URL
    MCP_CHILD_START --> STOPPED: stdio end / SIGINT / SIGTERM
    STOPPED --> [*]
~~~

POC 实际 envelopes 包含 workspaceId、taskId、fileIdentity、sessionId、requestId；服务端分配 connectionId。请求 response correlation 是 UUID + 同一连接/session/file identity 校验；一个已超时请求的迟到响应被忽略。插件关闭后连接断开，pending command 会 reject；iframe 暂时失去连接时 UI 每 1.5 秒重试固定 URL。

## 8. Test 01–09 和长连接结果

详细状态见 [tests/figma-session-results.md](../../.research/local-figma-bridge-poc/tests/figma-session-results.md)。

| 测试 | POC 源码覆盖 | 本机真实 Figma 结果 |
|---|---|---|
| 01 connection / figma_status | status handler + handshake | BLOCKED；Codex CLI 已到达 MCP server，返回 `Figma Development Plugin is not connected`；是否已导入 manifest 未确认 |
| 02 document/page/selection read | read_document handler | BLOCKED |
| 03 Frame 375×812 create + read-back | createPocFrame | BLOCKED；Codex 已调用 `figma_create_poc` 并到达 MCP，server 因插件未连接返回错误；未创建 Frame |
| 04 Inter loadFontAsync + Text create/read | createPocText | BLOCKED |
| 05 Auto Layout | setPocLayout | BLOCKED |
| 06 text / padding / spacing update/read-back | updatePoc | BLOCKED |
| 07 ON_CLICK → NAVIGATE | setReactionsAsync + reaction read-back | BLOCKED；API 调用仅存在于源码，未在本机执行 |
| 08 exportAsync PNG | exportPoc + base64/signature/size validation | BLOCKED；exports 目录当前没有 PNG |
| 09 delete POC-owned subtree | pluginData ownership check + safe page removal | BLOCKED；真实 Figma delete 未调用 |
| 连续 read/create/update/read/export/delete 不重启插件 | 测试脚本未针对真实 Figma 编排 | BLOCKED |
| 真实 disconnect/reconnect / hot reload | UI retry 代码存在 | NOT VERIFIED |
| Prototype 播放器点击 | 不在本轮允许的验证方式内 | BLOCKED；没有 Computer Use / Playwright |

本机模拟与静态验证：

- VERIFIED：npm test 3/3 通过，用模拟 plugin peer，不是 Figma。
- VERIFIED：MCP SDK stdio Client 能连接独立 MCP child、list tools、调用多项命令并收到 fake peer response。
- VERIFIED：startBridge 动态测试时的地址为 127.0.0.1；恶意 Origin 连接被拒绝，超时与过期响应处理符合测试断言。
- VERIFIED：真实 POC MCP entry 启动/关闭时监听 127.0.0.1:41731。
- VERIFIED：`codex exec --json --ephemeral --sandbox read-only` 从 trusted project 调用 `figma_status`；工具调用到达本地 MCP server，原样返回 `Figma Development Plugin is not connected`。这不是 Figma connection pass。
- VERIFIED：经项目级固定 tool allowlist/per-tool approval，Codex 又调用 `figma_create_poc` 一次并到达 MCP server；由于 Figma plugin 仍断连，操作在 `bridge.callPlugin` 前失败，没有 Figma side effect。这证明的是 approval/config 与 Codex→MCP 路径，不是 Frame 创建。
- VERIFIED：node --check 检查 MCP server、relay、插件 main 脚本通过；从 plugin/ui.html 抽取 inline JS 后 vm.Script 编译通过。
- NOT VERIFIED：MCP server 在当前 Codex Desktop 原对话中可调用；本次有效调用来自单独的本地 Codex CLI 子会话。

## 9. Prototype、Export 的能力边界

### Prototype

POC 的 createPrototypeSample 源码顺序：在 POC page 创建 Frame A / Frame B / Button → 对 Button 调用 setReactionsAsync，reaction 为 ON_CLICK → NODE destinationId=Frame B，navigation=NAVIGATE → 从 button.reactions 读回并比对 destinationId。

**源码层：已实现；官方 Plugin API 文档支持此类写入；本机结果 BLOCKED。** 尚无真实 read-back 证明，也无 Prototype player 播放、实际点击跳转证据。成功运行插件后，仍需区分“reaction 属性读回成功”和“Prototype 播放真实完成”。

### Export

POC 源码仅对 POC-owned frame 调用 frame.exportAsync(PNG)。Plugin main 将 Uint8Array 返回给 UI；MCP child 校验 base64、PNG signature、最大 5 MiB，并固定写入 .research/local-figma-bridge-poc/exports/c2c-bridge-poc.png。

本机真实导出**尚未发生**，exports 目录为空。因此无 PNG 可供 Codex 视觉审查；不能宣称已经完成 Figma→PNG 的视觉审核链。

## 10. 安全审计

### 候选项目风险观察

| 风险面 | 源码发现 |
|---|---|
| Bind 0.0.0.0 / 未 pin loopback | mhue 的 WSS 只传 port；grab 的 Bun.serve 没有 hostname；Hopp leader 的 server.listen 没传 host；Console 默认 host 为 localhost 而非源码固定 127；evidence 严格绑定 127 |
| 无认证 WebSocket | 候选 local WS 均不能仅凭 loopback 证明调用方身份；allow-Origin 不是强认证 |
| channel / file identity | mhue / grab 使用 channel（默认/手工 join 可能碰撞）；Hopp / Console 多文件 fileKey 路由较强，但 Figma fileKey 并非普通插件默认可用；evidence 未形成长期文件身份 |
| 任意 JS | Console 暴露 figma_execute / executeCodeViaUI，Desktop plugin main eval 字符串；能力很强但越权面大 |
| 任意 delete | mhue、grab 暴露 node id 删除；Hopp 要求 confirm=true，但这不是节点 ownership boundary；evidence 仅 keyed screen delete |
| Manifest 权限宽 | evidence 使用 allowedDomains=["*"]；Console manifest 权限/域清单较宽并含 private API / teamlibrary |
| 外部发送 | grab plugin 有 Google Analytics Measurement Protocol 上报路径；复用前应审查并关闭不需要的遥测 |
| Token / REST | Console 部分能力依赖 FIGMA_ACCESS_TOKEN；Context MCP 核心为 Figma API key/OAuth；其余桥接候选核心本地链路不需要 Figma Token |
| Prototype 真写入 | 其余候选没有发现受约束的 setReactionsAsync 用法；connector line 不等于真正可点击 Prototype |

### POC 当前防护和残余风险

| 控制 | 状态 / 限制 |
|---|---|
| WebSocket bind | VERIFIED 源码固定 127.0.0.1，非 0.0.0.0；本机启动输出匹配 |
| Manifest 网络 | allowedDomains=["none"]，开发域仅 ws://127.0.0.1:41731；精确 Figma CSP 是否允许 NOT VERIFIED |
| Origin allowlist | 服务端仅接受 https://www.figma.com；Origin 可由本机进程伪造，不能当认证 |
| 身份 envelopes | workspaceId/taskId/fileIdentity/sessionId/requestId + connectionId；均不是密码 |
| File identity | figma.fileKey unavailable 时用 session-only fallback；关闭插件重开后不能跨 session 证明同一文件 |
| Command surface | 9 个固定命令，无 eval、任意 node id mutation、任意 path、generic delete |
| Ownership | 新 page/frame/text 标记 pluginData owner/task/role；只改/删完全由 POC 标记的子树；保留外部节点；不删除最后一个 page |
| Timeouts / disconnect | MCP 默认 command 12s；Prototype 20s；export 30s；握手 8s；heartbeat 10s，服务端 idle 35s；断连 reject pending |
| Export | 固定文件名/目录、PNG magic/base64/5MiB 校验，避免用户提供路径导致 traversal |
| stdout | MCP server 的诊断日志写 stderr，stdout 留给 stdio 协议 |
| 本机同用户恶意进程 | 仍可连接本机端口并伪装 Figma Origin；本 POC 未实现秘密配对 / 强进程认证，不能作为生产安全边界 |

## 11. DesignSpec 草案

目标是受约束的一次 apply_design_spec，不是把任意 JavaScript 传入插件。以下是设计草案，尚未实现：

~~~json
{
  "schemaVersion": "1.0",
  "specId": "h5-player/my-feedback",
  "scope": "h5-player/my-feedback",
  "operationId": "stable-task-iteration-id",
  "baseRevision": "sha256:owned-subtree-revision",
  "viewport": { "width": 375, "height": 812 },
  "nodes": [
    {
      "key": "screen.root",
      "type": "FRAME",
      "name": "我的评价",
      "size": { "width": 375, "height": 812 },
      "layout": {
        "mode": "VERTICAL",
        "padding": { "top": 24, "right": 20, "bottom": 24, "left": 20 },
        "gap": 16
      },
      "children": [
        {
          "key": "header.title",
          "type": "TEXT",
          "name": "标题",
          "text": "提交评价",
          "font": { "family": "Inter", "style": "Regular", "size": 20 }
        }
      ]
    }
  ],
  "interactions": [
    {
      "source": "button.submit",
      "trigger": { "type": "ON_CLICK" },
      "action": { "type": "NAVIGATE", "destination": "screen.success" }
    }
  ]
}
~~~

推荐约束：

- schema：versioned discriminated union，插件端与 MCP 端都校验；白名单节点与属性、层级/节点数/文本长度/总 payload 上限。
- key：scope 内稳定唯一的 semantic key；Plugin Data 保存 owner、scope、key、spec hash。绝不以显示名称作为唯一 id。
- idempotency：operationId + fileIdentity + scope + canonical spec hash；重复调用返回已知结果，不重复生成同名页。
- patch：先读取 owned subtree 得到 baseRevision，再比较目标 hash；版本不匹配时拒绝 apply 并提供 diff，不静默覆盖。
- ownership：所有 create/update/delete 都限制在插件标记的 scope/page 下；未标记的节点永不级联删除。
- rollback：Plugin API 没提供跨多节点原子事务保证；实现补偿式 mutation log（记录创建、旧属性值、删除清单），失败时尽力反向应用并回读。必须把补偿失败标成 partial，不宣称 ACID。
- read-back：apply 后重新序列化 scope，核对 node keys/types/geometry/layout/reactions 与规范化 Spec；差异返回给 Codex。Export PNG 单独作为视觉工件，不代替节点结构校验。
- 写权限：apply_design_spec 是唯一高层写工具；任意 eval、任意 node id、任意文件路径均不对模型公开。

## 12. 三个正式候选

### Candidate A — 直接采用 mhue26/figma-mcp

保留小型 Node MCP / WS / 插件命令框架和 timeout/correlation；无需 REST/token 即可做常规操作。缺点是要独立管理 relay + MCP + plugin 三个生命周期；当前 relay 没显式 loopback bind，存在 unrestricted delete；Prototype 是 reaction 读取/connector，而不是可靠 native reaction 写入；没有 ownership boundary。若选择必须较多安全改造，所以不建议原样直接采用。

### Candidate B — Fork gethopp/figma-mcp-bridge

保留多文件 routing、pending request 清理、heartbeat、read/export/基础写工具、delete confirm；移除或收窄其多进程 / leader HTTP RPC 面，所有监听硬绑定 127.0.0.1；不要依赖不稳定 fileKey，增加 session/file binding 与 POC ownership；移除 generic delete；从 evidence 项目借鉴 typed ScreenSpec，并补 setReactionsAsync。优点是成熟的多文件结构；代价是 Bun 插件构建、现有架构较复杂，还需要改写 Prototype 与安全边界。

### Candidate C — 自研 protype-figma-bridge（推荐）

以本次 POC 为安全与生命周期基线，自研 schema-first bridge：

- mhue：MCP 结构、command dispatch、request correlation、timeouts（不复制默认 bind/channel/delete）。
- grab：只借鉴批处理操作清单与插件 UI/main 消息经验；不复制 Bun/CORS/analytics/宽删。
- Console：仅参考变量、组件、样式等高级 Plugin API 能力；不引入 figma_execute/eval、REST/token 混合捷径。
- Hopp：借鉴 file routing、disconnect cleanup 和 destructive action confirmation。
- evidence：借鉴 ScreenSpec 的 typed key/idempotent render 思路；把 wildcard manifest 权限改成精确开发域。
- Context MCP：可作为未来可选只读 REST context adapter，不能作为写入依赖，也不能进入本地核心链。

当前 POC 的 MCP / relay / plugin / tests 合计约 1,361 行（含 UI 与测试），这是当前 prototype 的实测 LOC。推断：支持 versioned DesignSpec、patch、reactions 与补偿回滚的可维护第一版约 2,000–4,000 行 TypeScript / 测试，复杂度中高；需要自有维护责任，长期成本高于直接采用单个上游包，但可收窄权限并满足本地闭环。

## 13. 加权决策矩阵

评分方向：0–5，5 为对目标更有利；这是基于源码/本机配置形态的相对工程评分，不是 Live Figma 验收分。即使 0 Computer Use 得 5，也不等于该候选已由本机跑通。

| 维度 | 权重 | A 直接 mhue | B Fork Hopp | C 自研 POC |
|---|---:|---:|---:|---:|
| 本地纯桥接 | 20 | 5 | 5 | 5 |
| 0 Computer Use 的结构适配度 | 20 | 5 | 5 | 5 |
| Figma 写能力 | 15 | 5 | 4 | 4 |
| Prototype 原生交互 | 10 | 1 | 1 | 4 |
| Windows / Codex 兼容 | 10 | 4 | 3 | 4 |
| 安全边界 | 10 | 1 | 2 | 4 |
| 二开成本（低成本高分） | 5 | 4 | 3 | 2 |
| 稳定性（实现证据） | 5 | 3 | 4 | 2 |
| 社区成熟度 | 3 | 2 | 3 | 0 |
| 长期维护成本（低成本高分） | 2 | 3 | 3 | 2 |
| **加权总分 /100** | **100** | **76.4** | **74.0** | **80.8** |

计分公式：每项权重 × 评分 ÷ 5。源码层稳定性按是否有 request id、timeout、disconnect cleanup、heartbeat / test 实现打分；没有任何候选项目在本轮本机 Figma 环境完成 Live 测试。自研候选分数领先源于需求贴合与权限最小化，不代表生产成熟度高于上游项目。

## 14. 关键问题 Q1–Q6

### Q1. 本机是否可以实现 Local Codex → MCP → localhost → Plugin → Plugin API → Figma？

**INFERRED：可以实现；当前链路未真实跑通。** 本地 Codex CLI 已识别项目级 stdio MCP；Node MCP/WSS 实际绑定到 127.0.0.1；Figma 官方 API 支持 Plugin API 读写和 iframe network/message passing。缺少唯一关键证据是 Development Plugin 导入/启动、真实 WebSocket handshake 和 Figma API 操作。

### Q2. Computer Use = 0 能否完成 read/create/update/delete/Auto Layout/export？

**架构上可以，当前 POC 真实测试都 BLOCKED。** 唯一计划的人工作用是 Import manifest 和每次 session 首次运行 Development Plugin。其余必须通过 MCP → localhost → plugin → Plugin API；若某项失败，本报告和结果文件继续标记 BLOCKED，不能用 Computer Use 补做。

### Q3. ON_CLICK → NAVIGATE 是否实际跑通？

**没有。** POC 已写入 setReactionsAsync 并计划 read-back，但代码尚未在本机 Figma 执行；Prototype 播放/点击也未验证。状态为 BLOCKED，不是 API blocker，也不能据此声称 Figma API 运行失败。

### Q4. 核心链是否需要 REST / Token / Remote MCP / Cloudflare / ChatGPT Web？

**不需要。** 本地 stdio MCP + 本地 WebSocket + Development Plugin + Figma Plugin API 足够构成核心读写链。当前 POC 未配置 REST、PAT、Remote MCP、Cloudflare 或 ChatGPT Web。后续若额外需要评论/团队库等不属于当前 POC 的能力，须单独评估。

### Q5. 六个项目分别适合什么？

| 用途 | 最合适的源码参考 | 限制 |
|---|---|---|
| Node 最小桥接骨架 | mhue26/figma-mcp | host、delete、Prototype 需要改造 |
| 操作能力库 | grab/cursor-talk-to-figma-mcp | Bun、CORS/channel/telemetry/危险工具需审查 |
| DesignSpec / typed IR | evidence-codes/figma-design-bridge | manifest wildcard 不应照搬；缺 Prototype/export |
| 安全与破坏性操作参考 | gethopp/figma-mcp-bridge + 本次 POC | Hopp confirm 不是 ownership；其监听非显式 loopback |
| 高级 variables/components/styles 参考 | southleft/figma-console-mcp | 不引入任意 eval / token / Remote 依赖 |
| 只读 Figma context | GLips/Figma-Context-MCP | REST+token 方向，不适合本地写链 |

### Q6. 正式实现建议直接用、fork 还是自研？

**推荐自研 protype-figma-bridge（Candidate C），先把本地 POC live smoke tests 跑通，再决定是否产品化。** 以 evidence 的高层 Spec 思想、Hopp 的 request/disconnect/file-routing 经验和 mhue 的精简 stdio 骨架为参考；严格收窄工具面，自己实现 ownership、idempotency、baseRevision、补偿回滚和真实反应写入。当前这一结论是架构建议，不是批准开始 H5 全量设计或生产部署。

## 15. 性能、阻塞点与下一阶段顺序

本轮没有 GPT 推理、Browser 导航、Computer Use 点击、Figma 节点操作或 Prototype 播放耗时数据。模拟 npm test 最新实测约 0.86 秒；Codex CLI status/create_poc 两个子会话约 20.5/30.4 秒结束，此耗时包含 Codex 模型运行、server startup 和工具编排，不能外推为 MCP 或 Figma API 时延。

源码/配置中的超时（它们是保护阈值，不是已测平均耗时）：

- MCP 项目配置 startup_timeout_sec = 30，tool_timeout_sec = 45。
- POC 默认 command 超时 12 秒；Prototype 20 秒；export 30 秒。
- WebSocket handshake 8 秒；UI heartbeat 每 10 秒；server idle timeout 35 秒；UI reconnect 间隔 1.5 秒。

阻塞顺序：

1. BLOCKED：等待用户首次 Import Development Plugin manifest。没有这一步，不能证实 Figma UI CSP / Origin / WebSocket 连接。
2. import 确认后，再单独请求一次首次 Run Development Plugin；保持当前插件窗口开启。
3. 通过 MCP 先执行 status / document read，并核实所连文件和页面；不符合隔离 POC 预期时立即停止写操作。
4. 依次执行 create frame、text/font、Auto Layout、update/read-back、setReactionsAsync/read-back、Plugin API export、owned-only delete；按 Test 01–09 记录原始响应与结果文件。
5. 测试 WebSocket 断开/重连和连续工具调用；不重新导入、不切换到 UI 点击修复；所有写入完成后只通过 Figma Plugin API 状态验证。
6. 如果 Prototype 属性写入/read-back 成功，另行判断是否需要用户确认一种非 Computer Use 的播放器验证方式；在没有允许的自动化入口时将“播放验证”保持 BLOCKED。

下一阶段没有获得新的授权前，不启动 H5 全量重设计、不访问 客服客户端业务仓库、不写正式 H5 Figma 页面、不安装额外项目、不使用 Computer Use、不使用 REST/Remote MCP 来掩盖失败。

## 16. 证据索引

### 本地项目与 POC

- 既有真实流程：CURRENT_WORKFLOW_AUDIT.md。
- Codex test MCP entry：.codex/config.toml。
- POC readme：.research/local-figma-bridge-poc/README.md。
- MCP tools、fixed export path、stdio lifecycle：.research/local-figma-bridge-poc/mcp/server.mjs。
- loopback bind、Origin filter、single connection、handshake/heartbeat/request correlation/timeout：.research/local-figma-bridge-poc/relay/bridge-server.mjs。
- IDs、command allowlist：.research/local-figma-bridge-poc/relay/protocol.mjs。
- local-only network manifest：.research/local-figma-bridge-poc/plugin/manifest.json。
- native Figma APIs、ownership、Prototype setter、export/delete：.research/local-figma-bridge-poc/plugin/code.js。
- Plugin UI WebSocket、postMessage、reconnect、heartbeat：.research/local-figma-bridge-poc/plugin/ui.html。
- simulated MCP/WS assertions：.research/local-figma-bridge-poc/tests/protocol.test.mjs。
- 当前 Figma live test 状态：.research/local-figma-bridge-poc/tests/figma-session-results.md。
- POC dependency lock / manifest：.research/local-figma-bridge-poc/package-lock.json、package.json。
- 固定输出目录：.research/local-figma-bridge-poc/exports/，当前为空。

### 六个候选源码入口

- mhue26：.research/figma-bridge/mhue26-figma-mcp/src/server.ts、src/socket.ts、src/code.js、src/manifest.json、package.json。
- grab：.research/figma-bridge/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts、src/socket.ts、src/cursor_mcp_plugin/code.js、ui.html、manifest.json、package.json。
- Console：.research/figma-bridge/figma-console-mcp/src/core/websocket-server.ts、figma-desktop-bridge/code.js、manifest.json、src/core/figma-tools.ts。
- Hopp：.research/figma-bridge/figma-mcp-bridge/server/src/leader.ts、bridge.ts、tools.ts、plugin/src/main/code.ts、plugin/manifest.json。
- Design Bridge：.research/figma-bridge/figma-design-bridge/src/server.js、src/schema.js、plugin/code.js、plugin/manifest.json。
- Context MCP：.research/figma-bridge/Figma-Context-MCP/src/server.ts、src/services/figma.ts、src/mcp/index.ts、src/mcp/tools/get-figma-data-tool.ts。

### 官方文档

- [Figma Plugin introduction](https://developers.figma.com/docs/plugins/)
- [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/)
- [Plugin Manifest / networkAccess](https://developers.figma.com/docs/plugins/manifest/)
- [Plugin Quickstart](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
- [Creating UI / postMessage](https://developers.figma.com/docs/plugins/creating-ui/)
- [figma.ui.postMessage API](https://developers.figma.com/docs/plugins/api/properties/figma-ui-postmessage/)
- [createFrame API](https://developers.figma.com/docs/plugins/api/properties/figma-createframe/)
- [createText API](https://developers.figma.com/docs/plugins/api/properties/figma-createtext/)
- [loadFontAsync API](https://developers.figma.com/docs/plugins/api/properties/figma-loadfontasync/)
- [Shared Node Properties / reactions](https://developers.figma.com/docs/plugins/api/node-properties/)
- [exportAsync API](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/)
- [Figma figma object / fileKey](https://developers.figma.com/docs/plugins/api/figma/)
- [Working in Dev Mode](https://developers.figma.com/docs/plugins/working-in-dev-mode/)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [Codex configuration basics](https://developers.openai.com/zh-Hans/docs/config-file/config-basic)
- [Codex configuration reference](https://developers.openai.com/codex/config-reference)

## 17. 下一步唯一人工动作

在 Figma Desktop 中选择 **Plugins → Development → Import plugin from manifest…**，然后选择这个具体文件：

~~~text
local-absolute-path-omitted
~~~

完成后只回复：**已导入**。此时不要运行插件；收到确认后再单独请求下一步，遵守一次只要求一个人工动作。
