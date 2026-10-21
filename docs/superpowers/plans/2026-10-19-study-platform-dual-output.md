# 学练平台可编辑 Figma 与可操作 HTML 双输出 Implementation Plan

> **历史快照说明（2026-10-21）：** 本文保留 2026-10-19 的方案、当时源码观察、预算取证和授权范围。“当前”“尚未建立”及任务复选框均按原日期阅读，不作为本轮执行指令或最新实现状态。模型、双输出、交互、分包和离线导入 API 的当前边界分别见[架构](../../prototype/architecture.md)、[视觉预览](../../prototype/presentation-preview.md)、[有界交互](../../prototype/presentation-interactions.md)、[离线增量](../../prototype/incremental.md)与[输入说明](../../prototype/project-input.md)。真实源稿验收仍以[注明日期的原生验收记录](../../prototype/native-acceptance.md)为准；本文未因代码落地而补勾历史验收或宣称全量源稿已通过。

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本文是改造方案，当前仅授权清单核查和文档工作；任务勾选不构成代码、Figma 写入或 Git 操作授权。

**Goal:** 以《学练平台高保真原型图》的全部用户页面、方案与草稿为证据，扩展现有通用原型流水线，使同一版本输入能够生成可编辑的 Figma 原生图层和可操作的离线 HTML，并逐项报告两端能力及验收差异。

**Architecture:** 保留 `PrototypeSpec 1.0` 及现有 PRD/React/增量流程，增加显式版本的 1.1 视觉与交互契约。文件组织清单、通用视图树、资产和交互图是共享输入；Figma DesignSpec 与 HTML/DOM 是两个独立输出适配器，桥接继续负责授权、归属、执行和审计。已有业务套件保持独立，不把工单、客服或推测的学练业务模型带入本任务。

**Tech Stack:** Node.js 22.18+、npm、原生 ESM `.mjs`、现有 zod、node:test / node:assert/strict、现有 Playwright 与 Figma 本地桥接。默认不增加依赖、服务、环境变量或全局工具。

## Global Constraints

- 当前任务：先完整清单，再改造方案，先不改产品代码。
- 本文核查基线为 `dev@affa695`，初始工作区有 40 项 staged/unstaged/untracked 状态记录；实施前重新盘点实际状态，禁止覆盖其他人的修改。
- 原始 `.fig`、账号身份、授权与私有采集数据留在已忽略的 `.local/`；不将设计原始内容发送到外部服务。
- 原导入文件保持只读。真实生成使用另行明确授权的隔离文件或 Page/根节点；保留归属、用户编辑和审计保护。
- 所有页面、方案和草稿都进入清单；过程稿不自动变成业务路由，资源组件不自动变成独立业务页面。
- 文字、布局、组件和向量应保留可编辑性；原始位图装饰可以作为图片填充，整页截图不作为高保真实现。
- 不凭文件名或行业常识增加账号、后端、题库、练习、课程详情等未获设计证据支持的功能。
- `PASS`、`FAIL`、`NOT RUN` 与证据级别必须分别记录。映射、测试、静态截图、API double、原生审计和实际 Present 不互相替代。
- 不执行 commit、push、PR、发布或部署；新增或修改的测试文件不自动暂存、提交。

## 清单输入与方案状态

本地清单来源为 `.local/reports/study-platform-full-inventory-20261019/` 下的 `inventory-machine.json`、`inventory-catalog.json`、`text-evidence.json`、`component-state-inventory.json`、`asset-layout-inventory.json`、`board-classification.json`、`interaction-catalog.json`、`visual-review.json`、`instance-resolution-facts.json` 与 `slice-resource-budget.json`。全部板级分类和原59项残余视觉语义已经归属，本文据此形成具体改造方案。源码实施、真实生成和行为规则补充仍须在后续明确授权范围内执行；本轮没有启动实施。

原始设计来源SHA-256为 `b88ab058830c211d2a461a0b9a2b614dcb17ff0dc3618e4fe0f49895c9895a69`，由text-evidence的sourceSHA256直接回读。约82.83MiB的inventory-machine是保留raw证据的分析产物，不直接送入当前10MiB文档入口；后续证据适配先按所选场景的传递依赖导出紧凑1.1输入，图片留独立资源，以输入摘要关联完整清单。紧凑输入超过既有入口限制时先按不切断相连流程的单位分包，不静默扩大文档读取上限。

直接核对得到 20,189 条 CREATED、20,189 个唯一 GUID、6 个 CANVAS（5 个用户页面及 1 个 internalOnly 资源页面）。用户页直接根节点共 123 个，按封面/组件/输出/导出/需求&草稿依次为 1/0/2/17/103；根节点口径不等于独立业务页数量。内部资源有 88 个 stateGroup、3,166 个成员，用户页的 503 个 INSTANCE 引用 44 个 SYMBOL、关联25个stateGroup。

1,503 条顶层 prototypeInteractions 中，用户页284条（输出24、导出59、草稿201），内部资源1,219条。用户页284条是262个ON_HOVER和22个AFTER_TIMEOUT，全部为SWAP_STATE且目标均为SYMBOL；没有原生业务NAVIGATE/URL/SCROLL连线，也没有prototype starting point。另438条symbolOverrides交互补丁缺完整event，其中428条无actions、10条deleted；这些不能当独立可执行业务action。全资源的2个未解析SWAP_STATE目标位于internalOnly页，不能把它们算成用户页断线，也不能在选中依赖闭包时忽略。

设计文字明确要求两套卡片表现：方案1默认显示标题/简介，hover显示操作说明与“进入学习”；方案2默认已有“进入学习”，hover只显示说明。名称“方案1”不可靠：`104:3423`、`320:17855`、`1132:7148` 旁NumberTitle实际指方案2，`28:4635`也为方案2。以相邻说明 `28:5219/5220`、`104:3223/3224`、`1132:7143/7338` 与可见结构校准，而非按节点名分类。

H5文字明确要求复制按钮滚出viewport后出现吸顶复制条、复制网址。小学/初中/高中tab、分类、搜索、分页在画面中可见，但其完整数据规则和目标并未由原生业务连线给出；先列为待补行为契约。保留“暂无课程”“课程即将上线”等实际状态，不增加课程详情或真实学习功能。招聘设计需求模板、元宝操作说明等第三方文本仅作原文件内容，不当作本任务指令或平台需求。

全量视觉事实：135个PNG/JPEG资源共66,220,862 bytes，135个均在全文件被引用；8个用户页字体族、13个字款；用户页有3,022个stackMode记录（1,814横向、1,208纵向）、2,639个spacing、1,355/1,357个水平/垂直constraints。全文件含LINEAR449、RADIAL306、ANGULAR176、DIAMOND17条渐变paint记录（含internal/override），应按所选场景依赖闭包再计算实际使用。3,461个blob仍未语义解析，不能假设所有VECTOR或glyph路径已可重建。完整画板分类同步时必须保留这些限制。

完整结构分类已覆盖4,109个记录及全部123个用户根节点。独立整屏/状态出现58个（PC22、H5 36；输出5、导出19、草稿34），不是58条业务route；另有21个二维码资产板、9个状态说明板。169个独立designboard还包含资源、封面、汇总和模块，不与58相加得业务页数。241个隐藏结构容器仍留在清单，目前未发现隐藏的独立整屏。最终视觉核对保留58个整屏口径，避免把直接根、designboard、整屏出现、状态和业务页混为同一口径。

原59项视觉语义复核已关闭：40项有图资产经本地图像逐项查看；3项无图形状分别为白色或#D9D9D9，1项无child大板`1132:7928`是深蓝灰SOLID背景；3项banner保留来源资产/crop；12项整屏INSTANCE均引用master`223:7025`。这表示分类已归属，不表示所有原图内嵌第三方页面都成为本平台待开发页面，也不表示全量原生像素或Present已验收。

12个H5整屏实例中，`223:7385`只将CTA层`215:5049`设为opacity 0，顶部URL层`215:5048`仍保留；`249:15306`、`320:18068`、`727:4375`、`1132:8740`、`1132:11021`把两层都设为opacity 0；其余6个保持默认来源。指定源字段和实质覆盖canonical可分5组，但derived cache记录不同，不能声称同组像素相同。云端直接目检master`223:7025`、`223:7385`、`249:15305`和`249:15306`印证三种显示状态，其余实例为源字段核对；完整online树比较与全量像素回放仍NOT RUN。生成器必须处理opacity/ancestor opacity与visible，不能把visible=true误作可见。

## 当前架构与确切复用点

```text
PRD / React / evidence JSON
        |
        v
prototype/inputs/*  -----> 来源与诊断
        |
        v
PrototypeSpec + catalog + presentation + assets + typed actions
        |                         |
        v                         v
renderers/figma.mjs         renderers/html.mjs
        |                         |
        v                         v
DesignSpec                离线 DOM/CSS + runtime
        |
        v
现有 bridge plan / apply / audit / export
```

`prototype/core/model.mjs` 当前只有 heading/text/field/button/list；action 仅挂 button，trigger 为 click/submit/timeout。模型最多 100 个 page，状态总数不超过 200，状态与元素展开乘积不超过 6,000。它表达语义和状态导航，不能表达原设计的完整嵌套布局、资产和局部状态。

`prototype/renderers/figma.mjs` 的 `renderFigma()` 当前按 page × state 创建根 FRAME，逐项纵向排列元素；`assets/textStyles/variables` 默认为空。`prototype/renderers/html.mjs` 的 `renderHTML()` 和内部 `startPrototype()` 使用固定 shell、字段、按钮和列表模板，已具备 hash 导航、表单原生校验和模拟跳转。

`prototype/inputs/captures.mjs` 的 `applyRuntimeCaptures()` 可以把已捕获的几何结构替换进 Figma spec，并要求交互控件的 elementMap。`prototype/pipeline.mjs` 明示此时 HTML 仍为 `SEMANTIC_TEMPLATE`；不能将现有采集补丁描述为已解决同源双输出。

真实字段补证优先复用已有本地桥接：`mcp/server.mjs` 的 `figma_scope_read_node`、`plugin/code.js` 非生成区的 `scope_read_node`/`summarizeNode()`/`vectorReadback()`/`textTypographyReadback()`。现有读取已经返回有限vectorPaths、paint和整段文字排版，vector/paint各有512KiB预算；混合文字样式只记MIXED，不具备完整range，mask/crop/完整布局白名单仍需补齐。这些是受限只读捕获能力，不是产品化.fig解析器，也不表示当前连接已就绪。

`.research/local-figma-bridge-poc/design/spec.mjs` 的 `validateDesignSpec()` 已支持 FRAME/TEXT/RECTANGLE/ELLIPSE/VECTOR/COMPONENT/INSTANCE、PNG/JPEG/WebP 图片填充、线性渐变、阴影、描边、裁切、滚动、固定子节点、组件覆盖、文字样式和颜色变量。`design/enrich.mjs` 的 `enrichDesignSystem()` 可按完全相同的重复值提取样式、颜色和重复向量图标；这不是自动识别产品设计系统，不应替代经确认的组件关系。

当前 DesignSpec reaction 仅支持 ON_CLICK/AFTER_TIMEOUT，目标必须为根 FRAME；`plugin/design-runtime.mjs` 的 `nativeReactions()` 固定生成 NODE/NAVIGATE。hover 等效果不能只修改 renderer，必须扩展整个校验、应用、快照、审计及恢复链。

`prototype/core/merge.mjs` 的 `mergePrototype()` 按稳定 ID 进行三方合并；`changedPages()` 和 `pageProjection()` 用于影响分析。保留同属性冲突、删除/编辑冲突、排序冲突和不覆盖已有输出目录的行为。

当前未提交桥接修改已包含 `scope_design_text_plan/apply`、`textRevision()` 和 `positionRecovery()`。文字修订要求 COMPLETE 基线、相同归属、资源和连线完整回读，只允许 1–100 个 TEXT 名称/characters 变更，拒绝结构、资源、交互变化及 component 后代；位置恢复是中断恢复机制。它们不是任意 Figma 原生增量合并，未来不得通过放松保护将其扩大。

`prototype/business/*`、`prototype/renderers/business-html.mjs` 及 `examples/business-suite/*` 是现有工单/客服专用分支。仅当确有稳定复用需求时抽取其通用能力，学练证据、场景和资产不写入该业务目录。

## 推荐范围与最小方案

最小可交付是依据完整清单建立受控输入，先选一个 PC 与一个 H5 场景，打通“同源视觉与动作 → 双输出 → 对照验收”，然后逐批覆盖全部方案及草稿。现有语义模板继续服务旧输入，不做框架迁移。

本方案涉及超过 8 个现有/候选文件，原因是新增共享表达、两个 renderer 及必要桥接契约必须共同覆盖；不新增常驻服务。仅截图化页面的方案无法满足文字/布局可编辑和可操作目标；仅复制原 Figma 文件不能证明现有工作区具备生成能力。

最脆弱的前提是“原稿给出足够的状态、目标与行为证据”。设计稿可能只描述静态画面或视觉状态，组件内置 hover 也不等于业务流程。为避免这一前提失败导致补造功能，交互清单保留 source/trigger/effect/target 的证据级别，未知目标保持 UNRESOLVED；视觉可生成不等于交互已验收。

首批视觉切片锁定输出PC `249:15093`（1920×1596）与空课程 `856:4954`（1920×1460）；H5内容master为草稿SYMBOL `223:7025`（750×3869），输出 `249:15305/15306` 是引用它的INSTANCE，不能只取其实体children。H5滚动viewport为 `249:15307`（750×1624），导出 `1132:11022` 同尺寸，旁说明为 `249:15398`。首切片输入必须解析这些实例覆盖、master、stateGroup及资源的传递依赖；不采用“画板直接后代就是完整页面”的截断方式。

交互实现范围以`interaction-catalog.json`的10组intent为索引：两套卡片说明/按钮显隐；超过十二字的省略及hover完整信息；H5上滑吸顶复制条；复制网址；学段/分类；搜索/分页；开始练习/进入学习/顶部导航；空课程/即将上线；原生组件状态（两套卡片分别成组，共10组）。两套卡片、长标题和吸顶有设计说明，复制有可见控件/网址，空态有画板，组件状态有原生记录；学段数据规则、搜索分页规则、学习入口目标和空态进入条件不完整。后续可先实现确认的视觉与交互，未给业务规则的项维持UNRESOLVED，不能用假后端、随机数据或任意跳转填充。

## 1.1 契约与模块边界

### 版本与兼容

- 保留当前 `PrototypeSchema` 对 1.0 的定义和导出。新增 `PrototypeV1_1Schema`，`validatePrototype(input)` 按 schemaVersion 分派并返回同版本规范化对象，不静默把旧交付改写为新版本。
- 1.0 输入继续走现有 renderer 路径；只有显式 1.1 输入使用 presentation/actions 新契约。PRD 与 React 解析器继续默认产生 1.0。
- 1.1的业务page/state仍保留有限预算，组件局部状态放在componentFamilies中，不为每个hover变体复制为业务根page/state。视图节点/实例依赖另受DesignSpec节点预算与可观测编译预算约束，不能用空elements绕过成本检查。
- 先支持 `.json` 1.1 入口，不新增 CLI flag 或自然语言推理入口。`loadDocument()` 和 `buildArtifacts()` 识别两个版本，复用现有 `--input/--out`。Task 5完成前显式拒绝1.1的`--base/--edited`增量模式，防止旧pageProjection漏算新视图/动作后仍报告未变化；1.0增量流程照常可用。
- 新模型任何未知字段、重复 ID、悬空引用、循环父子关系、越界尺寸、未知 action 类型必须被拒绝；缺证据是诊断，不以默认值伪装为已验证事实。

### 共享数据结构

- `catalog`：文件页、section/分区、sourceNodeId、稿件角色、方案关系、画板/资源分类、证据引用。数据组织与 HTML route 分开。
- `presentation.scenes`：每个场景有稳定 id、pageId/stateId/variantId、设备、viewport、rootNodeId 和来源画板 id。同一业务页的替代方案由 variantId 区分，不重复创造业务需求。
- `presentation.nodes`：稳定 id、sceneId、parentId、kind、局部 geometry、layout、style、text、assetId、componentId/instance overrides。树必须无环；组件引用另外检查依赖环。文字内容归属于单一视图节点，语义需求用引用关联，避免两份文字各自漂移。
- `presentation.componentFamilies`：仅收录被选中场景实际使用的stateGroup、成员、variant轴和值及继承覆盖；SWAP_STATE表达为局部组件状态变化，不改写成业务页面导航。保留状态复位和计时信息；源记录缺少timeout时，不能拿transitionDuration当delay。
- `tokens`：有 ID 的颜色、文字样式、间距/圆角等已确认值；不根据重复颜色猜测业务 token 名称。Figma 只能表达的 token 类型由适配器降级或报告，不能更改共同源数据。
- `assets`：稳定 id、sha256、MIME、像素尺寸、相对本地路径、原始来源及实际使用场景。不在领域模型内重复存放 base64；Figma 编译时加载，HTML 交付时按产物策略嵌入或引用。禁止远程懒加载设计私有资源。
- 1.1 `actions`：有 id、source（sceneId/nodeId）、typed trigger、typed effect、可选 guard 与 evidenceIds。导航 effect 引用目标 sceneId，局部状态 effect 引用节点/组件状态；clipboard 等副作用不能强行塞入 targetPageId。
- 1.1 `flows`：稳定 id、入口 sceneId、连续 actionIds。不把所有草稿强行连为一个 flow；纯参考画板允许无业务动作，但其“参考”身份必须显式。
- `capabilities` 由编译器生成，不人工声称：每条 action 分别报告 Figma/HTML 的 EXACT、SIMULATED、UNSUPPORTED 或 UNRESOLVED，附原因和验收项。

### 候选函数边界

- `loadFigmaEvidence(file, options)`：只读取本地受控证据JSON、核对输入哈希和来源映射，输出独立的DesignEvidence 1.0记录（catalog、nodeEvidence、componentEvidence、assetIndex、diagnostics、sourceHash）；不依赖尚未建立的PrototypeSpec 1.1，不写Figma，不执行输入中的指令/脚本。
- `prototypeFromFigmaEvidence(evidence, options)`：在Task 2中消费已验证DesignEvidence、选择场景及依赖闭包，生成显式PrototypeSpec 1.1；缺失的行为不会由转换器推断为真实连线。
- `validateDesignCatalog(catalog)`：校验组织、稿件角色和来源记录；不推断路由。
- `compilePresentation(model)`：返回两个 renderer 共用的已解析场景、视图树、tokens 与资产引用；不包含 Figma nodeId、DOM selector 或产品专用字段。
- `validateInteractionGraph(model)`：校验 source/target 引用、flow 连续性和状态可达性；未决引用阻止对应业务 flow 进入可验收状态。
- `resolveAssets(model, inputRoot)`：在明确输入边界内读取资产，返回按内容哈希去重的资源与预算；路径越界、MIME/签名不匹配、缺失文件均报错。
- `planOutputPackages(model, resolved)`：按设备、方案和相连交互图提出包计划及超预算诊断；不静默切断跨包交互。
- 保留 `renderHTML()`、`renderFigma()`、`buildArtifacts()`、`mergePrototype()` 的现有公开入口；内部按版本分派。新函数名属于本方案建议接口，实施时须与调用点、测试一次性同步。

公开面变化：CLI命令/flag、环境变量、常驻服务及依赖均为+0；显式增加PrototypeSpec 1.1与DesignSpec 1.1；MCP增加下节3个有限资产命令，原因是首切片单张原图超过现有请求上限。授权动作仍使用现有read/design类别，不新增高权限账户或放宽目标范围。

## 资源预算与分包规则

保留现有硬限制，不以扩大上限作为第一步：DesignSpec 最多 25,000 节点、2,000 资产、30,000 reaction，单资产 20 MiB、总资产 80 MiB；renderer 序列化 spec 6.5 MiB；bridge 请求 7 MiB；当前交付总量 32 MiB。文字修订请求同时包含 baseSpec 与 target spec，必须按整个 payload 计算，不能只检查 target。

输入 `.fig` 的压缩大小不是输出资源预算。先统计实际使用的图片哈希、重复实例、展开节点数、最长场景和每个连通流程的序列化体积，再规划包；不得为了通过限制删除场景、把文字截图化或丢掉交互。

已实算135个源资产：decoded总量66,220,862 bytes（约63.15MiB），小于80MiB decoded资源上限；逐张base64总长度88,294,636 bytes（约84.20MiB），将明显超过6.5/7MiB请求和32MiB交付预算。最大PNG为8,305,509 bytes（4096×1726），单张base64即11,074,012 bytes；其assetKey为`9a2f6ad4b2980f71fc614cf36087a56857a5ecf5`，在输出首切片内由`249:15102`引用，该节点祖先包含`249:15093`。因此首个PC切片已必然触发现有请求上限，不能等全量阶段才解决。0张源图超过20MiB单图上限。三层预算不能混用，也不能声称“仅删未用图片即可解决”，因为全文件135张已有引用。

`slice-resource-budget.json` 已对首切片做传递闭包实算：PC`249:15093`为288条顶层源记录、5张图、9,892,449 decoded bytes/13,189,940 base64 bytes；空课程`856:4954`为162条、3张、1,378,258/1,837,684 bytes；H5 master`223:7025`为185条、24张、17,070,177/22,760,268 bytes；滚动viewport`249:15307`为197条、25张、17,379,662/23,172,916 bytes。口径为后代+instance master+active native targets的传递闭包，含owner资产overrides，不包含full stateGroup扩展、virtual物化节点或最终ZIP大小。因此主PC与主H5在加入节点JSON之前就已超过6.5/7MiB串行化/请求上限；不能用“源记录数少”推断完整可传输或可编辑节点数。

第一层使用内容哈希去重、只加载所选场景实际引用的资产、按场景依赖确定组件库；第二层按无跨包跳转的相连流程分包，包间用报告目录浏览。现有 native reaction 不支持引用另一个 spec 的节点；若必须跨包连线则本轮分包方案不成立。

推荐在Task 3中加入“逻辑spec不变、资源分段传输”的最小协议扩展；这已是首切片需要的能力。可先测量PNG无损重编码体积，但不假设优化一定能降到上限，也不默认降分辨率或有损压缩。逻辑spec仅引用资源hash/字节数，图片以hash绑定到同一个spec/runId，分段写入有明确预算、校验和完成状态，只有完整资源经审计可用后才允许节点应用。超时先查询真实checkpoint，不用新operationId盲目重放。不得仅通过降低batchSize（1–500，默认100）声称解决传输上限。

建议版本化DesignSpec 1.1允许资产二选一：已有inline dataBase64，或staged引用（key、mimeType、sha256、decodedBytes）。保留1.0 validator和inline流程，旧插件不认识1.1时明确拒绝，不悄悄丢资源。新增最小命令候选为`scope_design_assets_plan`（只读清单/状态）、`scope_design_asset_stage`（有界片段）、`scope_design_asset_commit`（完整hash验证后创建并登记原生image），不新增网络服务。片段以asset hash/offset/content hash幂等识别，重复相同片段无新增效果，冲突片段拒绝；每条请求仍小于7MiB，单图/总图decoded上限不变。

片段缓存只在本地受控`.local/`与当前插件运行上下文中使用，不把大图塞入pluginData。插件重启后已完成image ledger可独立回读，未完成stage明确返回NOT_STAGED/INCOMPLETE并由同hash重新分段，不把缺失内存当作完成。image创建未知结果时先按内容hash和当前ledger核验，不能盲目重复commit。asset staging沿用实际文件身份、作用域和短期design授权，不以资源通道绕过拥有权或全局资源约束。

HTML默认保留真正离线交付；资源较小时继续单文件，超出当前32MiB交付预算时按包输出各自index.html与资源清单，每包维持限制并单独ZIP。报告目录描述各包关系和总量，不能把分包后跨页面跳转不存在描述为完整业务流程。Figma资源分段已由首切片测量证明必须纳入改造；最终HTML分包、ZIP体积及物化节点预算仍须对实际编译产物测量，不将base64体积当作ZIP压缩后大小。

## 阶段任务与验收停止条件

### Task 1：把完整设计清单变为受控证据输入

**Files:** 新增 `prototype/inputs/figma-evidence.mjs`、`prototype/core/design-catalog.mjs`；新增 `tests/prototype/figma-evidence.test.mjs`。为缺失原生字段扩展 `.research/local-figma-bridge-poc/plugin/code.js` 非生成区的既有只读helper、`mcp/server.mjs` 的 `figma_scope_read_node` 输入白名单及 `.research/local-figma-bridge-poc/tests/plugin-main-message.test.mjs`；如需独立调用编排，修改现有`scripts/workflow.mjs`只读分支，不新建.fig解析服务或变更写权限。原设计和完整资产在`.local/`；仓库测试使用最小合成样本，不提交私有设计资料。

**Interfaces:** 消费清单导出的本地 JSON、来源哈希与资产索引；产生 `loadFigmaEvidence()`、`validateDesignCatalog()` 及可追溯的规范化清单。此阶段可独立作为只读清单校验工具使用。

- [ ] 建立最小合成样本：两个用户页、一个 internalOnly 资源页、两个同名但不同源 ID 的方案画板、一个实例内 hover、一个业务导航、一个目标缺失的注释。
- [ ] 先运行新测试确认旧代码不能识别该契约；随后实现只读解析与校验，要求所有来源记录有唯一 ID，资源交互与业务交互不混计，未知目标保留诊断。
- [ ] 验证输入哈希变化、重复 ID、错误父级、路径越界、未知字段、文件字节上限和将输入文本当指令的对抗样本。
- [ ] 后续核验原设计文件身份、当前本地插件连接、实际读取范围及master依赖后，沿既有scope_read_node读取需要的sourceNodeId；只白名单提取vectorPaths、TEXT characters/排版range、fills/strokes及image crop/transform、isMask/maskType、opacity/visible、layout/constraints和实例关系。富文本通过实际TextNode.getStyledTextSegments()取得start/end/characters及所选样式字段，不能把MIXED复制为统一字体；vectorPaths使用原生getter而非猜测blob命令。每项附PluginAPI来源、文件/节点ID、读取版本、字段状态和hash。
- [ ] 测试只读helper的setter/pluginData写入计数始终为0；字段超512KiB预算、figma.mixed、getter失败、inactive页无法读、未知mask/paint、越出实际read scope、文件身份改变或连接丢失均返回有名的NOT_VERIFIED/拒绝状态，不截断后冒充完整输入。需要范围外master时停止该闭包并报告最小所需读范围，不自动遍历整套internal资源。
- [ ] 同步 `docs/prototype/project-input.md` 中证据入口及隐私边界。

**Run:** `node --test tests/prototype/figma-evidence.test.mjs`；`node --test --test-concurrency=1 .research/local-figma-bridge-poc/tests/plugin-main-message.test.mjs`，再运行 `node --test tests/prototype/prd.test.mjs tests/prototype/react.test.mjs tests/prototype/iteration.test.mjs`。

**Gate:** 新用例 PASS 且旧输入行为不变；若全量清单有未访问页、缺失画板或统计口径不能闭合，停止宣布“全部已覆盖”，继续只读补证据。

### Task 2：增加兼容 1.0 的 1.1 视图、动作与资产契约

**Files:** 修改 `prototype/core/model.mjs`、`prototype/inputs/documents.mjs`、`prototype/inputs/figma-evidence.mjs`、`prototype/core/merge.mjs`（1.1增量的阶段保护）；新增 `prototype/core/presentation.mjs`、`prototype/core/interactions.mjs`、`prototype/core/assets.mjs`；新增 `tests/prototype/presentation-model.test.mjs`、`tests/prototype/interaction-model.test.mjs`、`tests/prototype/assets.test.mjs`。

**Interfaces:** 消费Task 1独立验证的DesignEvidence；在 `prototype/inputs/figma-evidence.mjs` 增加 `prototypeFromFigmaEvidence()`，产生 `PrototypeV1_1Schema`、`compilePresentation()`、`validateInteractionGraph()`、`resolveAssets()`。1.0原入口和返回版本保留。

- [ ] 为“旧1.0字节与默认行为不变、1.1嵌套树可解析、动作可挂视觉节点、资产只读去重”建立先失败用例。
- [ ] 以有穷的 kind/layout/action 枚举实现清单实际出现的表达，不为未出现的行为添加泛化执行语言。
- [ ] 覆盖父子/组件环、跨场景引用、悬空目标、重复触发冲突、无入口 flow、缺失/超大图片、MIME/签名不匹配、字体缺失诊断、Windows 路径规范化与符号链接越界。
- [ ] 同步 `docs/prototype/architecture.md` 的 1.1 结构、所有权和依赖方向。

**Run:** `node --test tests/prototype/presentation-model.test.mjs tests/prototype/interaction-model.test.mjs tests/prototype/assets.test.mjs tests/prototype/foundation.test.mjs tests/prototype/iteration.test.mjs`。

**Gate:** 只接受1.0兼容且1.1有限表达已通过校验的结果。若新模型需要放松旧权限、允许脚本或跨边界读取，则收缩契约，不能进入 renderer。

### Task 3：贯通有界资源传输与 PC/H5 同源视觉双输出

**Files:** 修改 `prototype/renderers/figma.mjs`、`prototype/renderers/html.mjs`、`prototype/pipeline.mjs`、`prototype/core/coverage.mjs`（1.1预览证据等级）；按职责新增 `prototype/renderers/presentation-html.mjs` 与 `prototype/renderers/presentation-figma.mjs`；实际需要的视觉属性同步修改 `.research/local-figma-bridge-poc/design/spec.mjs` 与 `.research/local-figma-bridge-poc/plugin/design-runtime.mjs`。分段资源契约新增 `.research/local-figma-bridge-poc/design/asset-transfer.mjs` 并贯通现有 `design/commands.mjs`、`mcp/server.mjs`、`relay/protocol.mjs`、`relay/bridge-server.mjs`、`scripts/workflow.mjs` 的有限命令及同级权限检查；不新增服务。新增 `tests/prototype/presentation-renderers.test.mjs`、`tests/prototype/browser/presentation.test.mjs`、`.research/local-figma-bridge-poc/tests/presentation-visuals.test.mjs` 与 `.research/local-figma-bridge-poc/tests/design-asset-transfer.test.mjs`。输入为已锁定的PC `249:15093`/空课程`856:4954`与H5 `223:7025`/viewport`249:15307`的完整实例依赖闭包。

**Interfaces:** 两端消费同一 `compilePresentation()` 结果及 `resolveAssets()` 资源；产生带相同 source/revision/scene IDs 的 DesignSpec、HTML和节点映射。1.0入口仍委托原模板。

- [ ] 先验证同一个场景树的文字、图片、层级、尺寸、颜色和组件覆盖分别出现在两个输出，禁止任何整页图像替代根场景。
- [ ] 先用8,305,509-byte图片的合成等价体积样本证明旧7MiB单请求失败，再验证分段staged引用不会把base64放回逻辑spec；覆盖乱序/重复/冲突片段、总量越界、hash不符、缺失片段、授权到期、scope改变、插件重启与commit未知结果回读。大图链路失败时停在视觉预览之前，不能用占位图作为该切片PASS。
- [ ] 按切片真实数据实现绝对布局、嵌套裁切和实际需要的流式布局；原生编辑所需auto-layout按切片证据在本阶段贯通，不默认重构未涉及节点。
- [ ] Figma 复用既有文字样式、颜色变量、COMPONENT/INSTANCE、IMAGE/VECTOR；HTML 使用 DOM/CSS、明确的滚动容器、可访问名称与键盘焦点。
- [ ] 高保真作品本体只呈现源设计UI，不附加现有模板的调试侧栏、路由条或状态选择器；全部草稿/方案的评审入口放在独立`catalog.html`，链接带稳定sceneId回到`index.html`。报告/模型说明不混入平台用户流程。
- [ ] 本阶段可独立输出视觉预览，manifest记录完整model/revision及每scene实际视图摘要；动作未实现时coverage显式NEEDS_REVIEW，不使用旧flow/pageProjection结果伪报1.1交互或增量完成。Task 5前1.1增量请求明确拒绝，不能静默退回1.0逻辑。
- [ ] 自动布局是已观察到的高频能力，按闭包映射横/纵布局、spacing/padding、主轴/交叉轴对齐、hug/fill/fixed与constraints；不能仅用保存绝对坐标代替可编辑布局契约。将字段同步到DesignSpec、runtime设置及回读审计。
- [ ] 逐场景核对富文本range、渐变类型和矢量路径：消费Task 1通过只读PluginAPI取得的range/vectorPaths/mask/paint记录，并在共享模型保留来源字段，分别编译为HTML span/SVG/clip与Figma范围样式/原生路径/mask；校验UTF-16边界、重叠和缺失字款。径向/角向/菱形渐变不得默认线性化；图片裁切/变换按原始paint证据核对而非仅靠scaleMode。首切片的`249:15100`名为Mask group，应以实际mask字段/几何决定表示，不能从名字断言属性。未解析blob不自动进入规范化JSON；只读原生捕获不能取得或不能可靠映射时停止相应场景、记录UNSUPPORTED/NOT_VERIFIED，不能猜路径、mask或统一字体。若原始矢量导出被单独采用为补证，须保留来源及与原生节点的对应关系，不能把整页截图当矢量或文字替代。
- [ ] 检查实际字体、图片裁切、长文字、空内容、H5长页、窗口缩放、离线资源、CSP 与 LF/CRLF；用户页字体族为PingFang SC、Microsoft YaHei、Roboto、Nunito Sans、Inter、Alex Brush、HONOR Sans、Protest Strike，共13个字款，逐款检查可用性。字体回退不能直接算高保真视觉PASS，不自动下载/安装/打包未获许可字体。
- [ ] 生成对照截图和差异清单，先锁定可接受的可观测偏差，再扩展至其他方案；不得凭测试绿灯宣称像素一致。

**Run:** `node --test tests/prototype/presentation-renderers.test.mjs tests/prototype/figma-integration.test.mjs`；`node --test --test-concurrency=1 tests/prototype/browser/presentation.test.mjs tests/prototype/browser/html.test.mjs tests/prototype/browser/html-csp.test.mjs`；`node --test --test-concurrency=1 .research/local-figma-bridge-poc/tests/presentation-visuals.test.mjs .research/local-figma-bridge-poc/tests/design-asset-transfer.test.mjs`；修改插件源后运行现有生成器及`npm run check:bundle`。

**Gate:** 同源 revision、可编辑结构、离线页面和视觉对照通过；若任一端仍为独立手写页面或截图库，停止全量扩展。

### Task 4：实现清单证实的交互与桥接最小扩展

**Files:** 新增 `prototype/runtime/interactions.mjs`；修改 `prototype/renderers/presentation-html.mjs`、`prototype/renderers/presentation-figma.mjs`、`.research/local-figma-bridge-poc/design/spec.mjs`、`.research/local-figma-bridge-poc/plugin/design-runtime.mjs`。如确有新传输字段，再修改 `design/commands.mjs`、`mcp/server.mjs` 与 `scripts/workflow.mjs`；不预先改 relay/权限模型。生成区域只由 `scripts/build-plugin-code.mjs` 更新。

**Tests:** 新增 `tests/prototype/presentation-interactions.test.mjs`、`tests/prototype/browser/presentation-actions.test.mjs`、`.research/local-figma-bridge-poc/tests/presentation-reactions.test.mjs`；复用已有设计 runtime、用户编辑保护、超时/恢复测试。

**Interfaces:** 消费1.1动作图；产生双端能力清单、浏览器执行结果和原生 reaction 定义。每个 effect 都有明确有界行为；clipboard等浏览器效果不能伪装为Figma导航。

- [ ] 将最终清单10组intent和原生组件状态/hover/超时复位逐条映射为能力记录；不存在的业务NAVIGATE/URL/scroll-to不增加。可见tabs/分类/搜索/分页先补明确的输入数据和预期结果契约，未经确认的目标保留UNRESOLVED。
- [ ] 为超过十二字省略与hover完整信息实现具体源节点绑定，测试11/12/13字边界、混合中文/英文、键盘focus、提示隐藏/恢复及长信息不被滚动容器裁切；Figma提示状态保持可编辑，HTML不只依靠不可聚焦的鼠标效果。
- [ ] 为实际用到的组件family增加最小variant分组与局部切换契约，选中成员和依赖闭包不能只按可见状态切一半。Figma侧验证SWAP_STATE到CHANGE_TO及同set目标的约束；若需要原生ComponentSet，新增版本化DesignSpec组件分组字段与创建/组合阶段，并同步顺序、映射、snapshot、audit和恢复，不给全产品预造variant系统。
- [ ] H5的HTML按已标注阈值关系实现吸顶条：使用原复制区相对viewport的可观测状态，只有它向上越过可视顶部后才显示；原区域还在屏幕下方时不能提前吸顶，向上回滚恢复可见后隐藏。Figma使用可编辑fixed条、上下状态画板和滚动演示分别表达；没有实际原生证据与验证时，滚过阈值自动切换只记SIMULATED，不宣称两端完全等价。
- [ ] 先建立触发、目标、复位和历史行为的失败用例。hover 与 mouse-enter/leave 不混用；Figma timeout/delay 以毫秒为官方 API 单位，保留旧 seconds/milliseconds 适配兼容。
- [ ] 对需要扩展的行为同步 schema、native action 编译、snapshot/readback、audit、reconcile 和用户编辑冲突检查；旧 ON_CLICK/AFTER_TIMEOUT仍按原契约工作。
- [ ] HTML 处理事件解绑、计时器清理、离开场景取消、过时结果丢弃、重复点击与历史返回。剪贴板记录真实成功/失败；离线或权限不支持时给可操作回退，不虚报复制成功。
- [ ] 只为清单实际要求新增hover、局部CHANGE_TO及所需滚动展示；overlay、URL、scroll-to和完整产品variant系统不因官方支持就自动加入范围。
- [ ] 修改插件源后运行现有生成器，再执行 bundle 检查；不手改 `plugin/code.js` 的生成区域。

**Run:** `node --test tests/prototype/presentation-interactions.test.mjs`；`node --test --test-concurrency=1 tests/prototype/browser/presentation-actions.test.mjs`；`node --test --test-concurrency=1 .research/local-figma-bridge-poc/tests/presentation-reactions.test.mjs .research/local-figma-bridge-poc/tests/design-runtime.test.mjs`；`npm run check:bundle`。

**Gate:** 每条 flow 的两端能力与退化已明确，原生恢复及用户编辑保护未弱化。任一副作用结果未知时先读回真实状态，禁止无界重试；API支持不等于本仓库实现已通过。

### Task 5：完成全量方案、增量与预算交付

**Files:** 修改 `prototype/pipeline.mjs`、`prototype/core/coverage.mjs`、`prototype/core/merge.mjs`、`prototype/cli.mjs`、`scripts/verify-prototype.mjs`；新增 `prototype/core/output-packages.mjs`、`tests/prototype/presentation-delivery.test.mjs`、`tests/prototype/presentation-merge.test.mjs`。更新 `docs/prototype/incremental.md`、`docs/prototype/acceptance.md`。

**Interfaces:** 产生 `planOutputPackages()`、scenario/asset/capability manifest、每场景摘要与双端校验结果；复用既有 generated/prototype/changes/conflicts/ZIP角色。

- [ ] 分批纳入全部正式/方案/草稿，不为草稿构造未存在的流程；场景总表必须能回溯清单，每条排除项有原因及证据。
- [ ] 新增视图、组件、token、资产和动作的稳定 ID 合并；验证仅改一个文案/资产/局部状态时无关场景字节与摘要不变。
- [ ] 资产或 token 改变时通过实际引用依赖标记受影响场景；不把全量都判为已更新，也不漏掉共享实例。
- [ ] 校验32MiB交付、6.5/7MiB传输、80MiB图片等预算，完整检查manifest/ZIP路径、哈希及重复资源；不覆盖已有输出目录。
- [ ] 当前文字修订仅在符合既有严格边界时走窄更新通道；其他结构变化输出新revision并保留用户编辑冲突，不开发任意Figma回灌。
- [ ] 需求覆盖分别记录清单完整性、视觉生成、双端交互能力、自动测试、真实Figma与人工差异；有映射不自动变成READY。

**Run:** `node --test tests/prototype/presentation-delivery.test.mjs tests/prototype/presentation-merge.test.mjs tests/prototype/iteration.test.mjs`；`npm run test:prototype`；`npm run acceptance`；`npm run test:browser`；在明确生成文件归属后运行 `npm test`。

**Gate:** 全量清单逐项有产物或明确未决状态，ZIP哈希完整，无未解释超预算或跨包断线。若相连流程在资源分段后仍因节点/反应或逻辑spec体积超限，停止该包并报告最小连通闭包，不将分包替代完整流程。

### Task 6：真实 Figma 与离线浏览器验收

**Files:** 更新 `docs/prototype/native-acceptance.md` 和 `docs/prototype/acceptance.md`；本地截图、审计、Present记录和隔离回导证据写入 `.local/`。本阶段不默认修改代码；失败回到负责阶段形成单一修复。

- [ ] 执行前检查实际文件身份、Page/根范围、已拥有节点、插件版本与连接、授权有效期、运行checkpoint和用户现有修改。
- [ ] 在隔离目标 plan → apply分批 → audit分页完整；字体/图片/组件实例/文字节点独立回读，检查归属和人工编辑保护。
- [ ] 逐条运行Present，包含主要导航、组件状态进入/离开、草稿各自入口、长页滚动/固定元素以及异常目标；未运行的flow标NOT RUN。
- [ ] 导出实际画板PNG，与原稿相同viewport逐项对照；检查文字、空状态、图片裁切、遮挡、滚动和H5长页，不用结构审计替代视觉。
- [ ] 实际修改一个文字和一个实例覆盖确认可编辑；验证生成器不会覆盖该人工修改，再恢复仅本次验收改动或保留隔离副本。
- [ ] 保存原生.fig并独立回导，复查节点、资产、字体与至少一个已通过流程；下载成功不等于独立回导通过。
- [ ] 离线HTML在file协议及本地静态访问下检查可操作路径、无外部网络、剪贴板受限回退、返回历史和窗口尺寸；两种运行环境分别记录。
- [ ] 报告逐项区分SOURCE、MODEL、LOCAL TEST、BROWSER、FIGMA AUDIT、FIGMA PRESENT和ROUND-TRIP；本地摘要ZIP排除会话、授权、账号及秘密数据，核验白名单和哈希。

**Gate:** 只有实际执行并核验的项可PASS。缺少可操作桌面、插件连接、字体、授权或人工检查时保留NOT RUN；不把源文件已由用户导入确认当作生成器验收。

## 外部接口依据与操作条件

Figma官方当前接口已确认：[Trigger](https://developers.figma.com/docs/plugins/api/Trigger/) 包含 ON_HOVER、ON_PRESS、MOUSE_ENTER/LEAVE 等；hover/press结束会恢复，enter/leave属于单向触发。[Action](https://developers.figma.com/docs/plugins/api/Action/) 包含 URL/BACK/CLOSE/NODE；NODE navigation 包含 NAVIGATE/SWAP/OVERLAY/SCROLL_TO/CHANGE_TO。[reactions](https://developers.figma.com/docs/plugins/api/properties/nodes-reactions/) 使用 `setReactionsAsync()`。这些只是平台可用能力，实际仓库目前仍是上述有限契约；只扩展清单确需部分。

只读富文本补证采用官方[TextNode](https://developers.figma.com/docs/plugins/api/TextNode/)的`getStyledTextSegments()`及范围getter，矢量采用[VectorNode](https://developers.figma.com/docs/plugins/api/VectorNode/)的原生字段；它们允许直接读取实际文档属性，但本轮未运行该字段补证，不能据此将未解析blob、富文本和mask标记为已还原。

本方案不新增API key或第三方账户。真实Figma阶段依赖用户现有桌面应用、本地开发插件和短期授权；本轮未重连/配对，也未验证通道当前可用。不得在没有连接与实际目标的情况下预先宣称外部实施已就绪。

## 失败处理与回退

1. 1.1修改都在显式版本入口；失败时保留1.0旧路径，已有输出目录不覆盖。
2. 未完成1.1输出不发布READY：保留诊断、冲突候选和预算报告，退出或标记NEEDS_REVIEW。
3. 新Figma生成限定隔离目标和工具拥有节点；中断优先检查checkpoint和审计，不清理原设计或人工节点。
4. 文字修订继续使用已存在的有界journal、基线签名和恢复检查；资源/结构差异不得走文字窄通道。
5. 出现无关文件变化或同一目标文件并行变更时重新读取；不能安全合并则停止该文件并报告，不stash/reset/clean他人工作。

## 本轮证据与授权状态

- 源码能力、接口与预算：OBSERVED，已直接读取当前工作区。
- 官方Figma API能力：VERIFIED于官方文档；本仓库新增适配尚不存在。
- 全量结构与源ID：已同步机器/板级/交互清单；59项原残余视觉语义已逐项归属，remainingInventorySemanticRecords为0。完整online树比较、全量像素回放和生成器Present仍NOT RUN。
- 新功能测试、生成、浏览器、Figma apply/Present/回导：NOT RUN。
- 本轮只新增本方案文档；产品代码、package/lock、Figma、stage/commit/push均未操作。

## 交接前自检

- [x] 正式清单的页、画板、资源、状态和交互口径已同步，源ID与引用可查；2个internalOnly哨兵目标与缺失timeout单独保留。
- [x] 垂直切片使用真实清单中的具体sourceNodeId，没有根据文件名补造流程。
- [x] 每条实际要求都有负责阶段、文件落点、验证方法和停止条件；未给出的业务规则不能计为已实现。
- [x] 1.0兼容、原生文字窄修订、用户编辑/归属和资源预算未被弱化。
- [x] 双端差异可见，未知行为有状态，报告没有以API支持代替本仓库实现。
- [x] 本文完成的是方案交接；用户本轮没有授权开始修改产品代码。
