# 启动与配对

## 1. 安装与构建

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
Set-Location .research/local-figma-bridge-poc
npm test
npm run doctor
```

已有按 lockfile 安装的依赖时，可给 setup 脚本传入 `-SkipInstall`。不安装全局包。`npm start` 是供 MCP 客户端使用的 stdio 服务，不是交互终端命令行。

在 Figma 桌面端打开一个独立测试文件，通过 Plugins → Development → Import plugin from manifest 选择 `plugin/manifest.json`。菜单文字可能随 Figma 版本变化；必须确认导入的路径对应本次构建。运行该开发插件并保持其窗口打开。

插件连接固定 `ws://localhost:41731`，服务绑定 `127.0.0.1`。同一端口只运行一个桥接进程。若端口占用，关闭自己启动的旧会话，再重启；不要终止未确认归属的进程。`LOCAL_FIGMA_BRIDGE_PORT` 的其他值用于隔离协议测试，默认插件不会自动跟随端口更改。

## 2. 选择入口

可用内置持久会话直接测试，也可接入 MCP 客户端，两者选一个。仓库 `.codex/config.toml` 默认保持关闭，避免打开仓库就创建未配置服务。

要生成使用绝对路径的客户端配置片段，在桥接目录运行：

```powershell
node scripts/workflow.mjs configure
```

输出到根目录 `.local/codex-mcp.toml`，已有文件时拒绝覆盖。将其中 `LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES` 填为独立测试文件的 `figma-file:<fileKey>`，再合并到客户端的项目配置。该命令只生成文件，不修改用户全局配置。客户端自己的项目信任与工具批准仍由客户端管理。

Design 请求默认等待 40,000 ms；需要为大型规格延长等待时，在 MCP 服务环境设置 `LOCAL_FIGMA_BRIDGE_DESIGN_TIMEOUT_MS`，值须为纯十进制数字字符串（如 `120000`），数值范围为 40,000–180,000。生成的客户端片段仍使用 `tool_timeout_sec = 45`；提高服务预算时，也要将外部客户端工具超时至少调整为 `ceil((预算毫秒 + 5000) / 1000)` 秒。例如服务预算 120,000 ms 对应至少 125 秒。该配置只延长等待，不自动重试或保证宿主操作完成。

## 3. 建立本地持久会话

在仓库根 `.local/` 新建 `session.json`。以下值是需替换的占位符；相对路径按此文件所在目录解析：

```json
{
  "fileIdentity": "figma-file:REPLACE_WITH_TEST_FILE_KEY",
  "specPath": "../.research/local-figma-bridge-poc/examples/two-size-prototype.json",
  "grantPath": "grant.json",
  "runId": "demo-001",
  "outDir": "evidence/demo-001",
  "batchSize": 100,
  "timerUnit": "milliseconds",
  "allowGlobalResources": true,
  "designTimeoutMs": 40000,
  "auditLimit": 1000
}
```

文件 key 可从独立测试文件 URL `/design/<fileKey>/...` 获取。连接后 `status` 的稳定身份必须与它一致。示例包含全局文字样式、颜色变量，因此 `allowGlobalResources` 为 true，并且授权必须包含 `metadata_write`。

`designTimeoutMs` 可省略，默认 40,000；有效值为 40,000–180,000 的整数。CLI 以会话配置为准，不继承调用环境中已有的 Design 预算；它将此值传给 MCP 子进程，并为 Design 工具调用额外留出 5,000 ms，其他工具仍为 45,000 ms。会话启动后不重新读取配置文件，修改此值需先用 `quit` 关闭原会话，再从文件重新启动。增大预算后发生超时或断开，仍须按[恢复指南](generation.md#中断与冲突)检查未知结果。

`auditLimit` 可省略，默认每页 1000 个节点；可设为 1–2000 的整数，只影响 `audit` 的返回分页大小，非法值报 `SESSION_AUDIT_LIMIT_INVALID`。调整它也需关闭原会话、重新从文件启动。更大的分页可减少往返次数，不减少实际检查的节点，也不放宽快照签名和完整组装要求，详见[结构审计](generation.md#生成步骤)。

从桥接目录启动：

```powershell
node scripts/workflow.mjs session ../../.local/session.json
```

每行输入一个 JSON 命令。先 `{"command":"status"}`；等插件连上后再 `{"command":"pair"}`。将返回的一次性配对码输入插件窗口，随后再次 `status` 确認 authenticated 为 true。配对码和 pairing secret 不应写入日志或提交。

## 4. 签发精确作用域授权

先用 `{"command":"document"}` 读取页面 ID。含 flow 起点的设计需使用独立页面作为根作用域，`pageId` 与 `rootNodeId` 相同。普通子树设计可选择由当前任务创建并拥有的 Frame。文件名和节点名不能代替 ID。

在另一个 PowerShell 终端，进入桥接目录，替换下列占位符再执行：

```powershell
$env:LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES = 'figma-file:REPLACE_WITH_TEST_FILE_KEY'
node scripts/issue-test-authorization.mjs 'figma-file:REPLACE_WITH_TEST_FILE_KEY' 'client-REPLACE_WITH_STATUS_CLIENT_ID' '0:1' '0:1' 'design,read,export,metadata_write' 60 |
  Set-Content -LiteralPath ../../.local/grant.json -Encoding utf8
```

`clientId` 必须原样使用 `status.bridgeAuth.clientId`，不要额外添加 `client-` 前缀。上例页面 ID 仅是格式示例。授权最长 60 分钟，精确绑定工作区、任务、文件、客户端、页面、根节点和允许动作。它由本地工具签发，MCP 不提供签发接口。

服务启动时加载授权存储。新签发后，在会话输入 `{"command":"restart"}`，等待插件重新连接，再 `status`。配对凭证保留；重新配对无需每次执行。自定义 `LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH` 时，签发与服务必须使用相同环境配置。

## 5. 生成并留证

依次输入：

```json
{"command":"plan"}
{"command":"apply"}
{"command":"audit"}
```

重复 `apply` 直到 `status` 为 `COMPLETE`。即使 `checkpoint.applied` 已等于总节点数，仍可能需要完成分批图层排序、交互与 flow 连接。出现 `PARTIAL_FAILURE` 或 `NEEDS_RECONCILIATION` 时转入[恢复指南](generation.md)，不要无条件重试。

可用 `{"command":"apply","batches":100}` 顺序执行最多 100 批，每批独立保存意图和结果；参数上限 500。只有上一批返回 `IN_PROGRESS` 才会继续，完成、失败、结果不明或连接异常都会停止。达到批数上限仍可能未完成，以最后返回状态为准。

`{"command":"export","nodeKey":"default","scale":1}` 会保存该节点 PNG 与元数据。每次调用结果保存在 `outDir`；`{"command":"quit"}` 退出并关闭本会话启动的 MCP 子进程。

会话在每次写入前保存操作意图。超时、断开或进程中断保留 `OUTCOME_UNKNOWN`，下次 `apply` 会拒绝继续。先 `audit` 检查实际文档，再显式 `reconcile`；不能证明已完成的局部操作仍会拒绝恢复。

完成本地结构核验后，继续[交付验收](delivery.md)。原生 `.fig` 必须来自 Figma 的保存本地副本操作。
