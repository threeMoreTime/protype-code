# 原生 Figma 文件交付与验收

本流程把本轮生成、原生导出、独立回导、结构比较、画面比较和实际播放证据整理为交付包。校验器检查提交的证据及其一致性；原生导出、导入和 Present 操作仍须在真实 Figma 中完成。

## 准备本轮证据

为本轮工作分配唯一 `runId`，记录 `startedAt`，固定 DesignSpec 的 `specId` 和 `specSignature`。签名使用运行时 `scope_design_plan` 返回的值。重新使用历史产物时必须标记为历史参考，不能改写其时间或运行编号充当新生成结果。

1. 按生成流程完成全部批次。对原文件运行 `scope_design_audit`，保存原始 JSON 为 `original-audit.json`。通过条件包括 `status: "PASS"`、`writes: 0`、`errors: []`，以及与规格一致的数量和结构。
2. 在 Figma 桌面端执行保存本地副本，得到 `.fig`。保存能确认文件身份和导出操作的截图或操作记录，计算 `.fig` 的 SHA256，写入 `export-record.json`。
3. 在 Drafts 导入该 `.fig`，打开新文件并保存新文件地址及导入记录。新文件的 `fileKey` 必须与原文件不同。将同一文件 SHA256 写入 `reimport-record.json`。
4. 按新文件重新建立受控作用域，对回导结果运行只读审计，保存为 `reimport-audit.json`。若桥接无法确认新作用域、资源或所有权，应报告实际错误；不能通过重新生成一套节点替代回导核验。
5. 从回导文件导出代表节点 PNG，与指定参考画面对比；在 Present 中执行两种窗口尺寸的代表操作，记录步骤、结果及截图。计时跳转和滚动必须实际播放验证。

审计包含 `fileIdentity`、`scope`、`specId`、`specSignature`、`runId`、`collectedAt`、`counts`、`nodes`、`reactions`、`flows`、`textStyles`、`variables`。回导比较采用节点稳定 `key`，允许节点 ID 和作用域 ID 改变；样式、变量、文字、几何、层级与交互差异仍会失败。

## 输入清单

复制 [manifest.example.json](../../.research/local-figma-bridge-poc/delivery/manifest.example.json) 到证据目录，并填写本轮实际值。所有输入路径相对于清单所在目录解析，也可使用明确的绝对路径；工具只读取所列文件。

- `expectedCounts`：来自本轮规格的预期数量。工具不会把某个项目的场景或交互数量写死为通用标准。
- `expectedVisualKeys`、`expectedPresentCases`：必须事先列出要检查的画面和代表用例，不能以空数组跳过验收。
- `artifact`、`originalAudit`、`reimportAudit`、`exportRecord`、`reimportRecord`、`present`：对应文件路径。
- `visual`：每个代表画面的文件身份、稳定节点 key、采集时间、参考图和实际图。
- `limitations`：记录字体替代、允许的视觉差异、预设状态交互等实际限制。

任何 `{ "path": "...", "sha256": "..." }` 引用都按内容核对哈希。导出、导入、Present 的观察文件和视觉比较图必须提供 SHA256。可以用 PowerShell 获取：

```powershell
(Get-FileHash -LiteralPath '.\prototype.fig' -Algorithm SHA256).Hash.ToLowerInvariant()
```

导出记录结构如下。占位符必须替换为实际观察，状态未通过时保留真实状态。

```json
{
  "runId": "本轮运行编号",
  "specId": "规格编号",
  "status": "PASS",
  "fileIdentity": { "fileKey": "原文件标识" },
  "exportedAt": "实际导出时间的 ISO 字符串",
  "method": "figma-save-local-copy",
  "sha256": "原生 fig 文件的 64 位小写 SHA256",
  "evidence": [{ "path": "export-observation.png", "sha256": "观察文件的 SHA256" }]
}
```

回导记录使用同样的 `runId`、`specId`、`status` 和 `evidence`，改用新文件的 `fileIdentity`，并提供 `importedAt`、`method: "figma-import"`、`sourceSha256`。时间顺序为原文件审计、导出、导入、回导审计；视觉采集和 Present 观察发生在回导审计之后，且均不早于本轮开始时间。

一个 `visual` 条目：

```json
{
  "key": "default-home",
  "nodeKey": "default/home",
  "runId": "本轮运行编号",
  "specId": "规格编号",
  "status": "PASS",
  "fileIdentity": { "fileKey": "回导文件标识" },
  "capturedAt": "实际采集时间的 ISO 字符串",
  "reference": { "path": "reference-home.png", "sha256": "参考图 SHA256" },
  "actual": { "path": "reimport-home.png", "sha256": "实际图 SHA256" },
  "maxChangedPixels": 0,
  "maxChannelDelta": 0
}
```

默认要求像素一致。若使用非零容差，必须加 `toleranceReason` 解释实际差异及可接受范围。比较器解码非交错 8 位 RGB/RGBA PNG，报告变化像素数、最大通道差和变化区域；JPEG、调色板 PNG、透明色键、动画或其他不支持的编码会明确失败，不会用文件字节比较冒充像素比较。

`present.json` 结构：

```json
{
  "runId": "本轮运行编号",
  "specId": "规格编号",
  "status": "PASS",
  "fileIdentity": { "fileKey": "回导文件标识" },
  "observedAt": "实际播放验证时间的 ISO 字符串",
  "method": "figma-present",
  "cases": [{
    "key": "default-navigation",
    "status": "PASS",
    "steps": ["实际点击的入口", "实际检查的后续状态"],
    "observed": "实际观察结果",
    "evidence": [{ "path": "present-case.png", "sha256": "截图 SHA256" }]
  }]
}
```

每个预期用例都必须有步骤、结果和至少一份观察文件。缺失用例为 `NOT_RUN`，未知结果或失败结果不能升级为 `PASS`。全量交互结构检查不等于逐条人工播放。

## 执行与输出

从仓库根目录运行，输出必须是新目录或空目录：

```powershell
node .research/local-figma-bridge-poc/scripts/verify-delivery.mjs .local/evidence/run/manifest.json --out .local/deliveries/run
```

退出码 `0` 表示提交的所有必需证据通过；`2` 表示存在缺失证据或未运行项；`1` 表示失败、未知结果、格式错误或参数错误。有可校验清单但证据不完整时，仍生成报告，明确列出 `NOT_RUN`，不宣称完成。

交付目录包含：

- `verification.json`：每一项状态、数量、语义摘要、像素差异和证据哈希。
- `README.md`：验收边界、结果与已知限制。
- `evidence/`：清单明确引用的原始文件，包括 `.fig` 和记录。
- `manifest.json` 与 `replay/`：仅在整体 PASS 时生成，提供包内相对路径清单及导出、导入、Present 记录副本；原始记录仍在 `evidence/` 原样保留。解压后可用此清单再次运行完整验收，无需访问生成者的原目录。
- `SHA256SUMS`：包内各文件的 SHA256 清单；清单自身不纳入自身哈希。
- `delivery.zip` 与 `delivery.zip.sha256`：完整交付包及其哈希。写入前会回读 ZIP 并逐项核对。

`.fig` 格式检查覆盖 ZIP32 容器、路径、CRC、解压大小上限、`canvas.fig` 的 `fig-kiwi` 文件头、`meta.json` 和 PNG 缩略图。它不能解析并证明完整 Figma 画布语义，因此仍需真实导入和后续审计。仅把旧 `.fig` 放进目录，只能得到容器格式结果；缺少本轮独立回导、视觉和播放证据时，整体不会通过。

校验器无法替代观察者判断截图内容是否证明操作，也不提供截图真实性证明。不得编造记录、回填虚假 `PASS`，或把单元测试中的 Figma API 替身报告当作真实宿主验收。

## 相关实现与验证

核心实现为 [verify.mjs](../../.research/local-figma-bridge-poc/delivery/verify.mjs)、[ZIP 处理](../../.research/local-figma-bridge-poc/delivery/zip.mjs) 和 [PNG 比较](../../.research/local-figma-bridge-poc/delivery/png.mjs)。运行针对性验证：

```powershell
node --test .research/local-figma-bridge-poc/tests/delivery.test.mjs
```

这些测试验证拒绝错误输入、语义对比、像素计算和打包行为。真实 Figma 导出、回导、字体渲染与 Present 验证结果应另行记录。
