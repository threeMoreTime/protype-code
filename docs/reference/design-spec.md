# DesignSpec 1.0

可执行契约位于 [`design/spec.mjs`](../../.research/local-figma-bridge-poc/design/spec.mjs)，完整示例为 [`two-size-prototype.json`](../../.research/local-figma-bridge-poc/examples/two-size-prototype.json)。校验器在 Node 和插件端共用，拒绝未知字段、原型污染字段、重复 key、依赖环和失效引用。

## 顶层

`schemaVersion` 固定 `1.0`，`id` 为稳定版本标识，`name` 为显示名，`nodes` 不可为空。可选 `source`、`assets`、`textStyles`、`variables`、`reactions`、`flows`、`fontPolicy`。

`source` 可含 revision、capturedAt、adapter、url；URL 仅允许去除凭据、query 和 fragment 的 HTTP(S) 地址。此字段用于来源追踪，不会触发网络读取。

## 节点与资源

每个节点包含 `key`、`type`、`parentKey`、`x/y/width/height` 与可选 `name/props`。几何相对直接父节点；根节点 `parentKey: null`。类型支持 FRAME、TEXT、RECTANGLE、ELLIPSE、VECTOR、COMPONENT、INSTANCE。根节点为 FRAME 或 COMPONENT；普通父节点为 FRAME 或 COMPONENT。

TEXT 使用 `characters` 和 `fontName: {family, style}` 或 `textStyleKey`，可指定字号、行高、字距、水平对齐、自动尺寸。所有文字保持 Unicode；字体无法使用时按 fontPolicy 决策，不允许静默替换。

只读 `read-node` 另返回TEXT的实际字体、字号、行高、字距、自动尺寸、缺字和水平对齐，并逐字段区分PASS、MIXED与不可验证状态。这是诊断响应，不是新增DesignSpec字段；混合或不可读值不按默认值推断，也不自动修复文字，见[回读边界](../guide/generation.md#生成步骤)。

INSTANCE 通过 `componentKey` 引用规格内 COMPONENT。组件的子节点会先于实例创建。素材通过内嵌 base64 PNG/JPEG/WebP 进入 `assets`；IMAGE paint 只引用 assetKey，不接受远程 URL。VECTOR 使用纯 SVG path 数据，不接受活动 SVG、脚本或任意 HTML。

`VECTOR.props.vectorPaths` 最多 1000 项，每项为 `{windingRule, data}`；`windingRule` 取 `NONZERO` 或 `EVENODD`，`data` 最长 200,000 字符。路径使用源 SVG 单位，`width/height` 是最终显示尺寸。运行时把常用绝对或相对 M/L/H/V/C/S/Q/T/A/Z 规范为绝对 M/L/C/Z，再将全部路径的联合解析边界统一映射到显示尺寸；不会逐路径单独拉伸而改变相对间距。圆弧为每段不超过 45° 的三次 Bézier 近似，误差与回读规则见[生成指南](../guide/generation.md#可编辑内容与保真边界)。schema 校验通过不保证几何可生成；非法语法、非有限数值、不可表示的缩放或退化联合边界在运行时失败关闭。

SOLID paint 以 0–1 的 RGB 表示颜色，可通过 variableKey 绑定规格内 RGBA 颜色变量。textStyles 描述文字样式。修改字体、组件和变量的结构需保留引用一致性。

SOLID Paint 可指定 0–1 的 `opacity`，缺省为 1。绑定变量后，实际宿主将变量 alpha 解析为 Paint opacity；手写绑定应使两者一致，不将变量 alpha 当成额外的乘数。节点 `props.opacity` 独立控制整层透明度，不代替 Paint opacity。自动提取以完整 RGBA 精确分组，包括实例填充覆盖，并保留已有显式绑定；详见[设计系统提取](../guide/capture.md#可选的设计系统提取)。契约结构校验通过不能证明绑定效果一致，生成时仍须检查实际节点回读。

填充另支持 `GRADIENT_LINEAR`：`gradientStops` 为 2–16 个 `{position, color}`，position 在 0–1 范围内且按非递减顺序排列，color 为各通道 0–1 的 RGBA；`gradientTransform` 为有限的 2 × 3 矩阵，元素范围 −10,000–10,000，左侧 2 × 2 行列式绝对值必须大于 `1e-8`。可选 opacity 为 0–1；不能同时携带 SOLID/IMAGE 的 color、variableKey、assetKey 或 scaleMode。描边仍仅接受 SOLID。原生填充契约的范围大于 [CSS 采集子集](../guide/capture.md#支持边界)，两者不能混同。

## 实例覆盖与视觉属性

`INSTANCE.props.overrides` 最多包含 1000 项，每项为 `{sourceKey, characters?, visible?, fills?}`，至少指定一项覆盖值。同一实例内 `sourceKey` 不得重复，且必须指向 `componentKey` 所引用母版的后代；不能指向母版本身或其他组件的节点。`characters` 只允许覆盖 TEXT，支持空字符串，最长 100,000 字符；`visible` 为布尔值；`fills` 使用与普通节点相同的 SOLID/IMAGE/GRADIENT_LINEAR paint 契约。覆盖保留实例与母版关系，不修改母版。

节点 `props.strokeAlign` 可取 `INSIDE`、`OUTSIDE`、`CENTER`，`strokeWeight` 为 0–100,000。可选 `props.dashPattern` 为 1–16 项的数值数组，每项为 0–10,000，依次指定虚线段与间隔长度；缺省时保留原生默认实线。运行时回读数组并将其纳入编辑冲突与语义审计。`props.effects` 最多 16 项，每项仅接受：

```json
{
  "type": "DROP_SHADOW",
  "color": { "r": 0, "g": 0, "b": 0, "a": 0.2 },
  "offset": { "x": 0, "y": 4 },
  "radius": 8,
  "spread": 0,
  "visible": true
}
```

`type` 支持 `DROP_SHADOW` 或 `INNER_SHADOW`；RGBA 各通道为 0–1，偏移为 −100,000–100,000，radius 为 0–100,000。可选 spread 为 −100,000–100,000、默认 0；可选 visible 默认 true。运行时按数组顺序写入，并固定使用 `NORMAL` 混合模式；不接受额外的模糊、渐变或混合模式字段。

可选 `fontWeight` 取 100、200、300、400、500、600、700、800、900，且必须与显式或样式引用的 `fontName.style` 一致；真正控制 Figma 字重的是字体样式，单独写 fontWeight 不会选择另一种字体。

## 布局与交互

几何采用采集时的绝对布局；两个窗口尺寸应分别采集为两个 frame 系列。`overflowDirection` 为 NONE/HORIZONTAL/VERTICAL/BOTH；`clipsContent` 控制裁剪；`isFixed` 只用于滚动父容器的固定子节点。它不把截图式布局自动转换为响应式 Auto Layout。

采集适配器可把安全嵌套 sticky 提升为最近滚动祖先的 `isFixed` 子节点，用两个采样矩形的差值换算位置，并报告 `STICKY_POSITION_SAMPLED_FIXED`；不安全的祖先路径保留静态位置及警告。`isFixed` 不表示完整 CSS sticky 的阈值或包含块约束，详见[采集支持边界](../guide/capture.md#支持边界)。

capture 转换另有 `textBounds`（默认 `tight-range`，可选 `single-block-content`）和 `paintOrder`（默认 `captured`，可选 `positioned-siblings`），CLI 分别为 `--text-bounds`、`--paint-order`。它们只在转换阶段调整符合安全边界的单文字块宽度或同父分支顺序，不增加 DesignSpec 字段，也不能作为 `apply` 参数。排序包含受限的两分支flex例外：显式正z-index absolute覆盖层置于已完整证明安全的static普通流子树之后；其他混合或复杂层叠保留。缺失 z-index 不按 auto 推断；文字策略不覆盖多兄弟行内排版、nowrap 或未知边界。转换 manifest 记录改动及保留原因，原生复验仍须单独执行，见[选项边界](../guide/generation.md#转换时的文字边界与同父图层顺序)。

精确设计系统提取在 VECTOR 改为 INSTANCE 时保留原逻辑节点显式 `props.visible`（含 false），未定义时不新增；稳定 key 和层级归属保持。上游记录的隐藏状态不能在提取阶段丢失，但这本身不证明 HTML 原生控件状态已完整采集或实际视觉正确。

`inlineText` 也是转换选项（默认 `captured`，显式 `uniform-run`；CLI为 `--inline-text`），不是DesignSpec字段。受支持的同样式连续单行TEXT使用首个原节点显示完整行，其余原key/文字保留但 `visible:false`；隐藏片段编辑不自动同步到首节点。父级及片段transform仍须none，祖先仅允许none或严格有限二维纯平移computed matrix；捕获坐标中的平移不重复应用。普通空格跨片段折叠边界、反应或保留自映射的来源片段整组不合并；不同字体样式、嵌套元素、未知或不安全边界保持原状。详见[行内文字边界](../guide/generation.md#同样式行内文字合并)。

独立JS API `fitMeasuredSingleLineText` 在 `enrich` 前根据来源证明的完整单行和两次稳定原生自然尺寸，显式适配固定TEXT字号。它只改变本节点 `props.fontSize`，不改几何、字符、行高、共享样式或交互；请求与原生字号及数值行高允许float32表示等价，双读原值仍须完全一致。默认最小比例0.8，源已裁切、多行、缺字或不匹配证据均保留。它不是新DesignSpec字段、CLI或apply选项，实际视觉及垂直适配须另验，见[适配边界](../guide/generation.md#显式原生测量的单行字号适配)。

`nativeControls` 也是转换选项（默认 `captured`，显式 `sampled`；CLI为 `--native-controls`），不是DesignSpec字段。采样progress使用普通RECTANGLE表达有证据的比例填充；details通过普通 `props.visible` 表达捕获的关闭状态，保持原keys、几何和反应。来源不明时不猜测；平台轨道、summary marker及切换交互不自动生成，详见[控件边界](../guide/generation.md#原生控件的采样表示)。

每条 reaction 包含 sourceKey、destinationKey 和 trigger。支持 ON_CLICK 及 AFTER_TIMEOUT；后者 `delaySeconds` 为秒，范围 0.001–3600。同一来源与触发类型不能重复。生成请求的 timerUnit 默认 milliseconds，将秒转换为宿主毫秒；旧宿主如有实际兼容性证据可显式选择 seconds。两种设置都需通过 Present 实测核对。

`flows` 包含 `{nodeKey, name}`，nodeKey 必须是顶层画面。交互表达预设画面导航；任意文本输入、真实 OCR、搜索、导出或更新程序仍需应用运行时。

## 容量与请求边界

schema 上限：25,000 节点、30,000 反应、2,000 图像、每图像约 20 MiB、合计图像约 80 MiB。实际桥接还要求序列化请求不超过 **7 MiB**，更严格者生效。schema 可通过不等于一定满足传输预算。超过预算需重新划分规格并处理跨规格交互；当前不支持自动跨包引用。

每批创建与后处理共享预算为 1–500 的整数，默认 100。PNG 导出比例 1–4，MCP 接收 PNG 上限 5 MiB。所有尺寸与数值必须有限且在校验器范围内；未支持的表现应出现在采集警告或验证报告中。

context内部最多16路只读节点ID预取不改变上述请求/批预算；节点guard、fallback、母版核对及全部setter保持顺序，属性快照仍在核对时新鲜读取。该实现纳入229项契约验证并已执行一个实际500后处理批次；首批约126.6秒，暂无明确提速证据，云同步仍未验证。详见[实机边界](../verification/2026-10-08-design-pipeline.md#只读节点预取与后续确认检查点)。

请求字段由 [`design/commands.mjs`](../../.research/local-figma-bridge-poc/design/commands.mjs) 按命令校验。除 spec、runId 与授权字段外，普通设计请求还使用 batchSize、timerUnit、allowGlobalResources、reconcile、adoptNativeFlow；字段的允许范围和组合仍以对应命令校验为准，不能把所有字段发送给每个命令。专用字段包括：

- `scope_design_plan` / `scope_design_apply` 可携带 `positionRecovery`，仅适用于 DesignSpec 1.0；apply 还要求 `reconcile: true` 和已核对的 planSignature，详见[生成阶段的位置恢复](../prototype/incremental.md#10-生成阶段的位置恢复)。
- `scope_design_text_plan` / `scope_design_text_apply` 要求 `baseSpec`，详见[原生文字修订边界](../prototype/incremental.md#原生文字修订边界)。
- `scope_design_export_png` 使用 `nodeKey` / `scale`；`scope_design_audit` 使用 `auditOffset` / `auditLimit`。
- 资产分段命令使用独立字段集合：`scope_design_asset_stage` 携带 `assetKey`、`offset`、`dataBase64`、`chunkSha256`，`scope_design_asset_commit` 携带 `assetKey`，详见[分段传输](../prototype/presentation-preview.md#分段传输)。

没有 arbitrary-code、任意文件路径或远程资源执行入口。

公共归一化、MCP schema及CLI已支持精确采用，并纳入226项完整契约验证；普通v2路径在独立6节点小例通过，主运行的明确授权采用已执行并独立回读，但不证明旧setter来源或完整交付。普通reconcile要求持久成功回读；可选 `adoptNativeFlow` 仅供 `scope_design_apply` 且 `reconcile: true` 使用，是严格对象，恰含以下三个字段：

| 字段 | 校验及含义 |
| --- | --- |
| `pendingOperationId` | 匹配 `^op-[A-Za-z0-9._-]{8,100}$`，并精确等于旧reaction pending的operation ID；不是本次请求的新ID。 |
| `flowSnapshotSignature` | 当前完整流程语义快照经运行时规范化后的64位小写十六进制SHA256；自有节点使用稳定key，外来流程保留nodeId。 |
| `reactionSnapshotSignature` | 当前源反应语义快照的同格式摘要；导航目的地使用稳定destinationKey，不是raw宿主ID或原始JSON文件摘要。 |

缺项、多项、格式不符、非apply或非显式reconcile由公共归一化拒绝为 `DESIGN_NATIVE_FLOW_ADOPTION_INVALID`；运行时旧pending ID或状态不符仍拒绝，当前语义摘要变化为 `DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT`。采用只接受无成功反应记录的reaction pending，要求已存在流程观察，并重新核对实际反应与规格、scope/ownership/属性及完整单追加关系。它记录 `CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED`、保留legacyPending且不追补原setter receipt；成功后会继续本批正常后处理。

持久CLI仅接受当前 `reconcile` 请求显式携带三个字段，不读取会话配置、不自动生成；其他命令携带时为 `SESSION_NATIVE_FLOW_ADOPTION_REQUIRES_RECONCILE`。具体顺序及请求形态见[显式采用指南](../guide/generation.md#显式采用旧反应中断状态)。proposal与摘要不等于写入授权，未知结果保护及原作用域检查不变。

旧v5主55实例的精确采用仍为 `VERIFIED_ONLY_EXACT_CURRENT_STATE_NOT_ORIGIN`，legacyPending身份及原setter来源边界保留。节点阶段已COMPLETE，七页最终原文件只读审计PASS，确认13,193节点、739反应和2个起点。12/12代表PNG已完成视觉复核，结果FAIL，不能以结构恒等覆盖可读性问题；真实完整结构 `.fig` 已保存且容器检查PASS，但独立回导、完整Present及交付验收仍NOT_RUN。新转换选项和字体小例尚未证明全55画面修复；旧op-8b来源仍OUTCOME_UNKNOWN。详见[实机采用证据](../verification/2026-10-08-design-pipeline.md#精确当前状态采用的实机确认)、[全部节点与最终审计记录](../verification/2026-10-08-design-pipeline.md#2026-10-10-全部节点完成与最终原文件审计)及[完整视觉与备份记录](../verification/2026-10-08-design-pipeline.md#2026-10-10-12-图视觉复核与完整结构备份)。

2026-10-12 的 v10 历史记录覆盖55场景两尺寸、13,197节点、739反应及2起点，并包含418项实测字号适配及28项固定来源文字宽度修正。记录中的全量节点创建与收尾、原文件完整只读结构审计、场景PNG来源核验及真实 `.fig` 保存和容器检查为PASS；五场景已报告的裁切、断行和工具栏遮挡缺陷复验PASS，接受已批准的字体差异。其余场景复核发现缺陷，全量历史视觉为FAIL；实际Present/计时/滚动、独立回导和最终交付仍为NOT_RUN。详见[生成指南中的验收边界](../guide/generation.md)及[最新视觉复核记录](../verification/2026-10-08-design-pipeline.md#2026-10-12-其余-50-场景视觉复核)。v9及v10失败记录保留；本次文档同步未复验真实宿主或私有证据。固定来源宽度派生不改变通用字号适配API的几何保护。

## 审计分页

`scope_design_audit` 接受可选 `auditOffset`（整数 0–25,000，默认 0）与 `auditLimit`（整数 1–2000，默认 1000）。实际 offset 还不能超过审计节点总数。这两个字段不能用于其他命令。

每页返回局部 `nodes` 数组，以及 `page: {offset, limit, totalNodes, nextOffset, snapshotSignature}`。`nextOffset` 为下一页起点，最后一页为 null；`counts`、`reactions`、`flows`、`textStyles`、`variables`、错误与检查点仍为完整审计的汇总。`snapshotSignature` 是完整审计内容的签名，排除每次变化的 `collectedAt`。

持久会话的 `audit` 自动从第 0 页顺序收集。合并器要求签名、汇总字段一致、节点数量准确、key 和 ID 不重复、页偏移连续；中途状态变化会报 `AUDIT_SNAPSHOT_CHANGED`，不能拼接为成功证据。合并结果去掉 `page`，增加 `pagination: {complete: true, totalNodes, snapshotSignature}`。用于交付的审计必须完整收集所有节点；单页 PASS 不能代表证据已经收齐。

每页响应必须小于 7 MiB，超限报 `DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED`。可减少 auditLimit 降低节点详情大小；若全局交互或资源本身超限，需重新划分规格。分页不放宽输入规格、传输或作用域限制。
