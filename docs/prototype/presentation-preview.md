# Prototype 1.1 视觉预览与分段资源

本流程用于已经取得完整原生视觉证据的 1.1 输入。metadata-only 转换仍保留未核实诊断，不能直接当作可还原的源稿。它不会自动写入 Figma；已声明动作的执行见[有界交互](presentation-interactions.md)，离线场景合并与分包见[增量流程](incremental.md)。

## 本地生成

使用仓库现有 Node.js 和 npm，无新增依赖或服务：

```powershell
npm run prototype -- --input <受控目录中的1.1.json> --out <新的输出目录>
```

图片路径相对输入 JSON 所在目录，仅读取被场景实际引用的文件。输出目录必须不存在，避免覆盖人工修改。调用 JS API 时，使用 `await buildArtifacts(model, { inputRoot })`。未使用图片的纯模型不需要 inputRoot；直接调用 renderer 时，先 `await resolveAssets(model, inputRoot)`，再将结果通过 resolvedAssets 选项传入。

`catalog.html` 提供稳定 sceneId 入口，`index.html#scene=<编码后的sceneId>` 只显示来源 UI。场景切换是评审入口，不代表业务动作已经实现。`design-spec.json` 的 source.modelRevision、manifest.modelRevision、场景投影和 HTML 使用相同的规范化模型摘要。

自动布局父节点 `align=stretch` 时，未声明交叉轴 sizing 的流内子节点在 HTML 与 Figma 中均填满交叉轴可用空间；显式 fixed、hug、fill sizing 优先，absolute 子节点不参与这项默认拉伸。

交付包含 `prototype.json`、`generated.json`、`design-spec.json`、`coverage.json`、`node-map.json`、`design-assets.json`、`scenes/`、实际使用的 `assets/` 与 ZIP。assets 按内容去重；HTML 中同一图片只内嵌一次。manifest 的文件 SHA-256 与字节数可独立重算；scenes 保存实际物化树，不能用旧 1.0 pageProjection 代替。

## 原生读取

使用现有 `scripts/workflow.mjs session <read-session.json>`。读取配置只需 fileIdentity 和本地 outDir，不需要 design grant。插件连接后先 status，确认文件名、稳定 fileIdentity、认证和当前页面。

`read-node` 可携带显式 evidence.fields 与 readScope，以及受限 children/text 分页参数。root 必须属于声明页面，不能读入未授权的其他文件/页面或自动跟随跨范围 master。原生 ID 与离线源 ID 不一致时，必须先明确映射。字段、完整源快照和整包哈希应独立重算；分页未收齐或原生字段不可读时不能称完整输入。

固定子层不读取逐节点 `isFixed`：真实 PluginAPI 使用父容器 `numberOfFixedChildren`。只读 helper 在明确 scope 内读取父 children 顺序和固定数量，派生逻辑 isFixed 并附 layout.derivations 证明；父范围不足、API 缺失或计数无效时停止。导入器独立核对父身份、完整 children 顺序、末尾固定层数与布尔值。PAGE/SECTION 等无此固定子层能力的父类型有明确原因，不能将任意未知父节点当作 false。[官方 API 说明](https://developers.figma.com/docs/plugins/api/properties/nodes-numberoffixedchildren/)

局部 readback SHA 只证明所保存字节未变，不证明这些字段足以还原整个场景。原生 layout、text ranges、vectorPaths、mask 和 paint 值必须经输入适配器收敛到 1.1 白名单；摘要、字段名、名称推断和未解析 blob 不能代替值。

`applyFigmaNativeEvidence(metadataModel, options)` 是独立的离线导入边界，位于 `prototype/inputs/figma-native.mjs`。options 显式包含 fileIdentity、逐视图节点的 source/native ID 与 readScope 对应、完整 readback capsules 及 imageBindings。它重新校验包与字段 SHA、分页快照、属性状态、父子和 master 身份；返回 model 与独立 nativeEvidence 证明清单。字段未收齐、圆角/effects 未读取、图片未绑定、原生样式无法表达等情况明确停止。完整白名单证据只可替换其实际覆盖的 metadata-only 视觉诊断；其他未知诊断保留。原生图片 hash 的显式元数据对应仍须由 resolveAssets 核验本地字节。

当前跨范围或跨页面 master 会由只读 helper 返回 NOT_VERIFIED_MASTER_SCOPE_REQUIRED，不能伪造成完整 component 读回。导入器保留这项停止边界；涉及此模式的源场景需要先补受控原生证据和明确对应关系。1.1 场景中显式声明 instance 子节点也停止，避免 HTML 忽略这些节点而原生端尝试创建；可支持的实例内容通过 master 和显式 overrides 表达。

## 分段传输

staged DesignSpec 资产的字段为 key、mimeType、sha256、decodedBytes。完整图片保留在本地受控目录，不进入逻辑 spec。显式命令依次为：

1. `assets-plan`：只读查询每个资产的 NOT_STAGED / INCOMPLETE / STAGED / COMMITTED / OUTCOME_UNKNOWN。
2. `asset-stage`：传 assetKey、offset、最多 1 MiB 的 dataBase64 及 chunkSha256。乱序允许；完全相同片段幂等，冲突和重叠拒绝。
3. `asset-commit`：片段完整且总 SHA、MIME 一致后，写入 PENDING、创建原生图片、独立回读图片字节，再保存 COMMITTED。

stage/commit 沿用 design 授权，绑定 spec 签名、runId、file/page/root、workspace/task/revision。未获针对实际目标的写授权时，不执行 stage/commit/apply。plan 也核对同一 scope 与任务所有权。资源完成前节点 apply 停止。

片段仅存在插件内存，重启后为 NOT_STAGED；已完成资产依靠有界 ledger 与原生字节回读恢复。PENDING 或 createImage 返回未知结果时先 plan，不换 operationId 盲目重放；重启丢失候选 imageHash 后停止为 OUTCOME_UNKNOWN，需独立调查。不能把网络超时当成零写入。

单片段 1 MiB、整请求 7 MiB、逻辑 spec 6.5 MiB、单图片 20 MiB、唯一图片合计 80 MiB、资产数量 2,000、总片段检查点 10,000、本地交付 32 MiB 均保留。分段解决传输大小，不能绕过交付预算。80 MiB 图片清单不表示能在单个 32 MiB 包内交付全部内容。

## 验证等级与已知边界

合成测试覆盖本地 PC/H5 viewport、实例覆盖、DOM 富文本、SVG 原生矢量、线性/径向渐变、VECTOR mask、图片采样矩阵、显式滚动、离线 CSP 与 LF/CRLF。测试用图片和页面不能代表源稿；截图亦须标明 synthetic。

HTML 暂不支持角向/菱形渐变、复杂 mask、ALPHA/LUMINANCE mask、文本 stroke、未知字款名、嵌套 fixed 等，会明确报 UNSUPPORTED。原生补证导入当前不支持原生 GROUP 类型，不能因旧 metadata 将其归为 frame 就宣称已等价。原生编译保留四种渐变及支持字段，实际宿主 API/字体仍需回读审计。没有真实字款不能以自动回退算高保真 PASS；不会自动下载或安装字体。

完整源场景仍须核对文字、图片裁切、层级、布局、尺寸、颜色、组件覆盖与可编辑结构，并保存源稿对照截图和可接受偏差。真实 Figma 不在本地测试期间被修改。coverage 保留 NEEDS_REVIEW，visualComparison / figmaNative 为 NOT_RUN；成功生成的交付将 interactionRuntime 标记 AVAILABLE_NOT_RUN，incremental 标记 SUPPORTED_OFFLINE。该标记只说明离线三方合并、场景影响分析和重新交付能力，不表示原生同稿更新、浏览器执行或源稿视觉已验收。
