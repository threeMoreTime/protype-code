# 通用原型流水线

输入适配器（PRD、React、版本化 DOM capture）只负责读取证据；`prototype/core/model.mjs` 定义与行业、框架、输出工具无关的 PrototypeSpec 1.0。渲染器将页面、状态、控件和交互编译为现有 DesignSpec 1.0 或独立 HTML。桥接层继续负责授权、原生节点创建、审计和交付。

PrototypeSpec 的 ID 与内容版本分离。页面、控件、状态、动作、需求均有稳定 ID；动作引用必须存在，主流程必须连续。需求引用用于追溯，不等于需求已经正确实现。未知信息进入 diagnostics；未映射需求、无动作按钮会阻止 READY_FOR_REVIEW。真实 Figma 和人工修正量在实际验证前保持 NOT_RUN / NOT_MEASURED。

ArchiveLens 的归档 CSS 和原生控件补充规则隔离在 `capture/adapters/archivelens/`。旧 `capture/archive-html.mjs` 保留兼容导出；新入口 `capture/generic.mjs` 仅接受 captureVersion 1.0，并拒绝归档证据。兼容适配器的旧输入仍保留旧行为。

模块边界：

| 模块 | 负责 | 不负责 |
| --- | --- | --- |
| inputs | 有限读取、解析、来源标注、缺失诊断 | 执行目标项目代码、决定写入 Figma |
| core | 校验、稳定身份、需求覆盖、三方合并 | 业务项目特例、工具权限 |
| renderers | 可编辑节点、HTML 模拟交互 | 后端功能、真实账号和数据 |
| existing bridge | 现有 DesignSpec 和授权流程 | 推断需求、绕过文件和节点范围 |

输入：inputs/prd.mjs、inputs/documents.mjs、inputs/react.mjs；输出：renderers/figma.mjs、renderers/html.mjs；增量：core/merge.mjs；交付：pipeline.mjs。

Node 22.18+；根目录安装产品解析器，桥接目录保留独立依赖和测试。仓库不保存输入项目的秘密文件或真实运行截图。

## PrototypeSpec 1.1：视图、动作与资产契约

1.1 是显式版本，不迁移或改写 1.0。`PrototypeSchema` 保留 1.0 定义；新增 `PrototypeV1_1Schema`，`validatePrototype()` 根据 `schemaVersion` 分派并返回原版本。PRD、React 和旧 capture 默认仍生成 1.0。1.0 的默认值、规范化字段顺序、HTML、DesignSpec、manifest 和 ZIP 字节由冻结的合成基线回归验证。

现有 `loadDocument()` 可加载显式 1.1 JSON。独立的离线证据导入 API 可通过 `prototypeFromFigmaEvidence(evidence, options)` 转换受控证据；它不由 CLI 自动调用，输入边界见[受控 Figma 证据输入](project-input.md)。转换选项必须明确提供项目 ID 和场景：`sourceNodeId/pageId/title/path/sceneId/device/viewport`，以及可选 `stateId/variantId/role`。路径和业务页分组是调用方的原型设置，不是从画板名称猜出的真实业务路由。源节点、完整组件 master 和同组成员形成依赖闭包；场景内稳定 ID 以场景和源记录生成，跨场景共享 master 仍有独立记录。

### 数据所有权与依赖方向

- `catalog` 继续保存文件组织、源 ID、独立画板及稿件分类，不等同业务路由。场景来源必须是独立画板，场景根来源与画板一致；同一场景不能用两个视图 ID 冒充同一个源节点。
- `pages` 只保存有限业务页及状态，1.1 不再复制 `elements` 文案。文字归属 `presentation.nodes[].text`，需求仍通过引用追溯。
- `presentation.scenes` 保存稳定 ID、page/state、可选 variant、desktop/mobile、viewport、rootNodeId、sourceBoardId 和 screen/reference 角色。参考场景不会成为业务导航目标。
- `presentation.nodes` 保存局部 geometry（含可选 rotation/transform）、有限 layout/style、TEXT 范围、原生 vector paths、资产、组件及实例覆盖引用。父子关系必须同场景且无环；实例必须引用同场景 component。只有通过实例或实际使用的组件族可达的库定义才允许留在场景闭包中。
- `componentFamilies` 保存成员和变体轴；同族状态是局部视图状态，不新增业务 page/state。依赖按工作队列求闭包，不依赖数组顺序。实例覆盖只能指向所属 master 的后代。
- `tokens` 是显式 color/number/text 值，样式以 tokenIds 引用；不根据重复颜色猜测业务命名。
- `assets` 只保存 ID、SHA-256、MIME、编码尺寸、字节数、相对路径、来源和实际使用 sceneIds。领域模型没有 base64、远程资源懒加载或 Buffer。
- `evidenceIds` 是来源记录及源节点的引用集合。节点、动作和诊断引用必须在已声明集合内；集合和哈希不能单独证明源内容真实或云端未变。

`model.mjs` 编排校验；`presentation.mjs`、`interactions.mjs` 和 `assets.mjs` 不反向导入 model，避免循环依赖。输入适配器负责来源选择和表示转换，渲染器以后消费同一份编译结果，桥接权限不进入领域模型。

### 共享编译与动作图

```js
const model = await loadDocument('explicit-1.1.json');
const presentation = compilePresentation(model, {
  availableFonts: [{ family: 'Inter', style: 'Regular' }],
});
const graph = validateInteractionGraph(model);
const resolved = await resolveAssets(model, controlledAssetRoot);
```

`compilePresentation()` 是纯函数，返回共享场景树、视图节点、组件族、tokens、资产引用及声明/展开节点预算。它不产生 DOM selector 或 Figma 目标节点 ID，不执行输入脚本。父子/实例依赖环、孤立节点、跨场景引用、悬空资产/token、无序渐变、越界尺寸和不连续富文本范围均拒绝；UTF-16 范围不能拆分代理对。声明节点与实例展开成本分别受 25,000 上限约束，不能用空语义 elements 绕过预算。

源诊断和缺失 geometry、layout、text ranges、vector paths、mask type 等继续保留。未传字体清单时记 FONT_NOT_VERIFIED；显式清单缺字款记 MISSING_FONT。调用方负责独立确认字体可用性，编译器不自动查询、安装或回退字体。诊断最多返回 3,000 条，超额用汇总项和 `diagnosticCounts` 保留精确计数，状态仍为 NEEDS_REVIEW。VALID 仅表示该契约校验通过，不表示像素、字体或真实双端已验收。

1.1 `actions` 具有 source scene/node、typed trigger、typed effect、可选 component-state guard 和 evidenceIds。支持 click、submit、hover、mouse-enter/leave、timeout、focus/blur；timeout 必须给毫秒延时，其他 trigger 不接受延时。effect 只支持 navigate、change-state、clipboard 和 unresolved，不包含任意脚本或 URL 执行语言。按源节点和触发检测冲突，仅互斥的同组件状态 guard 可共存。局部 change-state 只能指向同族成员，不改变业务场景。

`flows` 具有 entrySceneId 和有序 actionIds。入口必须存在且非 reference；导航后下一动作源场景必须连续，局部状态变化和剪贴板不伪装成导航。静态可达性沿最多 100 条、每条 2,000 步的显式流程检查，不展开无穷状态组合。未决 effect 或无法证明的 guard 保持 NEEDS_REVIEW；图校验本身不执行动作，也不声明 Figma/HTML EXACT 能力。生成后的 HTML 由有界运行时执行支持的动作，实际执行结果与静态能力声明分开记录。

证据转换器只映射已知的原生 click、hover、mouse-enter/leave、timeout 和可解析目标。ON_PRESS 不改写成 click，缺失 timeout 不拿动画时长填补。注释、推断、删除记录和 partial override 不生成可执行动作；导航指向未选场景或 reference 时保留 unresolved。实例视觉覆盖、paint、native vector、富文本范围和布局若只有摘要或原始未解析记录，仍保留不完整诊断，不套用 master 外观冒充已还原实例。

### 只读资源边界

`resolveAssets()` 只读取已选场景视图实际引用的 node.assetId、IMAGE fills/strokes、富文本范围及实例覆盖内的图片，不扫描整个资源目录。引用必须与资产 sceneIds 一致；未使用资源保留元数据并且不读取。路径必须是安全的相对路径，拒绝绝对路径、UNC、盘符、ADS、反斜杠、点目录、Windows 保留名称、尾空格/点及符号链接。读取前后复核真实路径及句柄身份，单文件最多 20 MiB，按实际使用 SHA-256 去重后总文件字节最多 80 MiB。

验证包括字节数、哈希、MIME 签名、有限容器结构与编码尺寸；PNG 检查 CRC、chunk 原始类型和结束记录，JPEG/WebP 不宣称完整像素解码，动画 WebP 明确不支持。返回资源 Buffer 位于解析结果，不写回模型，不压缩或改写源文件。`byId` 将多个逻辑资源映射到同一内容，预算分别记录引用资源数、唯一内容数及文件字节数。

### 阶段保护

第三阶段新增 `core/presentation-render.mjs` 作为两个 renderer 的共同入口。它校验完整 1.1 模型、生成规范化摘要、编译场景和组件闭包、校验实际图片字节，再物化 HTML 实例树。核心模型、编译结果和物化树只读；复用上下文时仍重新验证图片内容，调用方传入的裸 compiled 对象不能代替校验。局部实例继承 master 的布局与样式；场景根的画布平移归零，viewport 与显式 overflow 保留。

`renderHTML()` 和 `renderFigma()` 按显式版本分派。1.0 继续旧模板；1.1 编译为来源 DOM/SVG 与 DesignSpec 1.1 原生节点。完整视觉字段或图片缺失时停止，不套用模板、整页截图或宿主默认文字颜色。无法可靠映射的复杂 mask、角向/菱形 HTML 渐变等返回具名 UNSUPPORTED。契约支持某个字段不等于每个输出端都已支持，具体边界见 [视觉预览与资源传输](presentation-preview.md)。

1.1 的 `buildArtifacts()` 返回 Promise，调用方必须 `await`；1.0 保持同步返回。CLI 已兼容两者。1.1 交付含独立 `catalog.html`、纯来源 UI 的 `index.html`、同源 revision/sceneId、实际场景摘要、节点映射及二进制资源清单，继续受单包展开文件和 ZIP 各 32 MiB 的预算限制。1.1 coverage 始终 NEEDS_REVIEW；视觉对照与原生审计为 NOT_RUN。成功生成的动作运行时记 AVAILABLE_NOT_RUN，离线增量记 SUPPORTED_OFFLINE，不代表浏览器或原生宿主已执行通过。旧 runtime capture 适配器仍拒绝 1.1。

`mergePrototype()` 已支持同版本 1.1 的稳定 ID 三方合并；`sceneProjection()` 和 `changedScenes()` 使用场景实际依赖闭包生成分片与变更清单。1.0 的 `pageProjection()`、`changedPages()` 保持原有按页边界，不用于 1.1；1.0/1.1 混用 base/generated/edited/previous 仍拒绝。CLI 可用 `--plan-only` 仅生成目录与预算计划，或用 `--packages` 按不切断相连流程的闭包分包；BLOCKED 包不会被当作已交付结果。具体合并、lineage、暂存预算及原生窄修订限制见[增量流程](incremental.md)，离线增量不会自动写回 Figma。

DesignSpec 1.1 的 staged 资源只有 key、MIME、SHA-256 和 decodedBytes，不包含图片 base64。有限的 plan/stage/commit 命令沿用现有桥接的认证、短期授权、scope、ownership 和 operation 审计。1 MiB 分段不放大 7 MiB 请求、6.5 MiB 逻辑 spec、20/80 MiB 图片和 32 MiB 交付四类预算。原生 createImage 前先记录 PENDING；未知结果先 plan/readback，重启丢失临时片段后不盲目重建图片。

第二阶段测试证明契约、兼容性和受控本地读取；第三阶段合成测试证明本地双输出及受控资源机制。两者均不能证明源文件所有视觉字段、真实字体、源稿像素一致性或真实 Figma 已验收。
