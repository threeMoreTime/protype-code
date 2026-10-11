# 生成、续跑与结构审计

生成器把已校验的 DesignSpec 写入授权页面或任务拥有的根 Frame。先完成[启动与配对](getting-started.md)，再准备[采集结果](capture.md)。代码入口是 [design-runtime.mjs](../../.research/local-figma-bridge-poc/plugin/design-runtime.mjs)，插件内的运行时由 `npm run build:plugin-code` 构建，不能直接修改生成代码块。

## 生成步骤

持久会话支持以下命令，每行一个 JSON：

```json
{"command":"plan"}
{"command":"apply"}
{"command":"audit"}
```

`plan` 校验规格、字体、已存在节点和资源，报告待处理数量及字体替代；不会创建节点。`apply` 每次处理 `batchSize` 个节点工作项，必须为 1–500 的整数，省略时默认 100。创建与后处理共享本批工作预算；创建完成后还需要分批确认图层顺序并连接交互，只有返回 `COMPLETE` 才表示全部阶段完成。资源准备包括图片、文字样式与颜色变量；此阶段不计入节点批次。

`audit` 从实际节点和资源回读结构，返回 `status`、`writes: 0`、`errors`、节点、资源、交互及 flow 起点。结构通过不代表画面、计时跳转或滚动已经实际播放；这些检查按[交付验收](delivery.md)单独留证。

MCP 审计默认每页返回 1000 个节点，`auditLimit` 可设为 1–2000，`auditOffset` 从 0 开始。`counts`、交互、flow 与资源始终是全局汇总；`page.nextOffset` 为下一页偏移量，末页为 null。每页的 `snapshotSignature` 覆盖完整审计状态；合并时必须确认所有页签名相同，防止翻页过程中用户修改画面。单条响应限制为小于 7 MiB；节点详情过大时可降低分页大小，资源或交互自身过大则需拆分规格，不能突破传输限制。只有收齐所有节点的完整审计才可用于交付验收。

持久 CLI 可在 `session.json` 设置可选整数 `auditLimit`，范围同为 1–2000，省略时仍使用默认 1000；它只透传给 `audit`。会话修改后需关闭并从配置文件重新启动。增大每页返回量只减少分页往返，不跳过全量检查、节点或汇总字段，也不改变签名一致性、连续偏移与最终节点数校验；一页返回成功或部分页面签名一致仍不能当作完整审计 PASS。

持久会话另有只读单节点诊断命令。例如，当前 `apply` 或 `audit` 返回的节点 ID 为 `18:9` 时：

```json
{"command":"read-node","targetNodeId":"18:9"}
```

`targetNodeId` 必须是最长 200 字符的字面节点 ID，格式为可选 `I` 前缀、数字冒号对，以及可选的分号分隔数字冒号对；不接受表达式或代码。结果自动保存到会话 `outDir` 下的 `<runId-or-session>.read-node.<encoded-node-id>.<timestamp>.json`，响应包含 `evidencePath`。VECTOR 在序列化路径长度不超过 512 × 1024 字符时返回完整 `vectorPaths` 和 `vectorPathsReadback: "PASS"`；超预算则只报告 `NOT_VERIFIED_BUDGET_EXCEEDED`，不会截断路径冒充完整证据。该命令不写 Figma，也不能代替完整结构审计或视觉验收。

TEXT 返回实际 `fontName`、`fontSize`、`lineHeight`、`letterSpacing`、`textAutoResize`、`hasMissingFont` 和 `textAlignHorizontal`，并在 `typographyFieldReadback` 中逐项标注 `PASS`、`MIXED`、`NOT_VERIFIED_UNSUPPORTED`、`NOT_VERIFIED_INVALID` 或 `NOT_VERIFIED_READ_ERROR`；不可确认的值携带同名状态，不伪造默认字体或字号。全部字段通过时 `typographyReadback` 才为 `PASS`。回读本身不加载字体、不创建测量节点、不修复文字；两次稳定回读也不等于完整设计审计或视觉通过。

含文字样式或颜色变量的规格需在会话设置 `allowGlobalResources: true`，并在精确作用域授权中包含 `metadata_write`。这些资源属于文件级对象，因此需要独立授权。生成器按任务及规格的命名空间创建并查找资源，不按用户可见名称覆盖已有任意资源。

## 可编辑内容与保真边界

支持原生 Frame、Text、Rectangle、Ellipse、Vector、Component 和 Instance，以及图片填充、线性渐变填充、文字样式、颜色变量绑定、阴影、描边位置、裁剪、滚动和固定子层。几何来自采集时的坐标与尺寸；两个窗口尺寸应有各自的场景 Frame，不会自动推导所有中间宽度的响应式布局。

VECTOR 的 `props.vectorPaths` 保存源 SVG 路径单位，节点 `width/height` 表示最终显示尺寸。[vector-paths.mjs](../../.research/local-figma-bridge-poc/plugin/vector-paths.mjs) 解析 M/L/H/V/C/S/Q/T/A/Z 的绝对或相对形式、隐式重复及反射控制点，再转换为绝对 M/L/C/Z。运行时对所有路径联合计算边界，包括三次 Bézier 导数的解析极值；统一平移至局部原点并分别按宽、高缩放到节点尺寸，保留路径间距、孔洞和填充规则。源规格保持原值，回读路径属于显示坐标；图标留白由外层 Frame 保留。

椭圆弧按每段不超过 45° 转为三次 Bézier。单位圆径向近似偏差小于 `4.3e-6`；椭圆在源路径单位下的几何偏差上界为该值乘以修正后的最大半径，显示缩放还会按最大轴向缩放倍数放大此界限。它是有界近似，仍须视觉核验。非法语法、非有限数值、不可表示的缩放，以及没有可绘制内容或联合边界宽/高为零的几何均以 `DESIGN_VECTOR_PATH_INVALID` 失败，不静默丢弃路径。

路径回读按相同规范化结果比较命令、填充规则及数值坐标，坐标容差为 `0.001`。Figma 可能在 `Z` 前显式补入回到该子路径起点的 `L`；比较时仅移除终点严格等于该起点的末尾 `L`，保留 `Z` 及其他边。这一语义比较不放宽用户编辑保护：所有权与编辑冲突摘要仍覆盖未经规范化的实际宿主快照，后续仅改变路径文本格式或显式闭合边也会触发冲突。

原生 `GRADIENT_LINEAR` 填充保留变换矩阵及 RGBA 色标，并纳入回读、编辑冲突和回导语义审计；实例填充覆盖使用同一契约。CSS 转换仅支持[采集指南](capture.md#支持边界)列出的透明度渐变子集，不能把原生 Paint 支持解释为任意 CSS 渐变保真。

绑定 COLOR 变量的 SOLID Paint 使用变量的 RGBA 值；实际宿主会将变量 alpha 解析为 Paint opacity。手写规格应使变量 alpha 与期望 Paint opacity 一致（缺省 opacity 为 1）。节点 `props.opacity` 仍独立控制整层合成，不能用它修补填充或描边的透明度。设计系统提取按[精确 RGBA](capture.md#可选的设计系统提取)建立绑定；已有显式绑定保持原样，生成器会检查实际节点回读，不仅检查绑定 helper 的返回值。

新节点赋值 IMAGE 填充前，以及新实例赋值 IMAGE 填充覆盖前，会在本节点的 pending 写步骤中同步检查图片 handle；文字样式的异步等待完成后再检查。资源原始 signature、账本 hash 与当前映射必须一致。handle 缺失时只从不可变内嵌 bytes 重建，要求得到相同原 hash 并再次确认 handle 存在；不替换旧账本 hash、不补写旧节点，也不放宽用户编辑保护。API 不可用、源签名冲突、hash 改变或重建后 handle 仍不存在时失败并保留 pending，不能无限重试。此检查不增加 IMAGE 描边支持；描边契约仍仅接受 SOLID。

plan、audit、只读 `read-node` 及通用 Paint 比较不创建或修复图片；新节点检查在每批工作预算内执行。handle 检查和同 hash 重建的契约测试通过，不等于实机已执行重建分支、图片长期保持有效或完整 55 场景验收通过。批上限 500 的契约测试也不证明宿主性能；增大批次不会放宽请求期限、所有权、编辑保护、pending 或回读检查。

实例保留主组件关系。`props.overrides` 可用主组件后代的 `sourceKey` 设置 `characters`、`visible` 和 `fills`；文字覆盖仅允许 Text，且不会改写母版。覆盖源必须属于指定母版子树。生成器记录整个实例后代子树，用户后续修改会阻止续跑覆盖。

阴影支持 `DROP_SHADOW`、`INNER_SHADOW`，采用正常混合模式；`strokeAlign` 支持 `INSIDE`、`CENTER`、`OUTSIDE`。`dashPattern` 支持 1–16 个有限数值，每项为 0–10000，依次表示虚线与间隔长度；省略时沿用原生默认实线。生成器写入、回读并审计该数组，后续修改虚线间隔会触发用户编辑冲突。固定子层按规格移至滚动容器的最上层。采集器不能表示的 CSS、SVG 或业务状态必须在采集报告中说明，并通过代表画面核对。

字体先查可用字体，再加载实际使用字体。缺失字体默认失败；只有规格明确设置 `fontPolicy.allowFallback: true` 及替代字体时才可替代。计划和审计均列出替代记录。字体替代可能改变字宽和换行，因此不能省略视觉核验。

### 转换时的文字边界与同父图层顺序

以下选项属于 capture 转换，不是 DesignSpec 顶层字段或原生 `apply` 参数；默认值保持旧转换行为。CLI 位于 [capture/cli.mjs](../../.research/local-figma-bridge-poc/capture/cli.mjs)，API 为 `adaptCaptures(captures, options)`。

- `--text-bounds tight-range|single-block-content` 对应 `options.textBounds`，默认 `tight-range`。显式 `single-block-content` 只把符合边界检查的单文字块扩到父内容区右边界：父级须为 block、唯一子节点为该文字、左对齐水平文本、normal/pre-wrap，并有明确的像素边框与内边距。transform、滚动条、未知边界或邻近兄弟/后代占用扩展空间时保持原宽。它不修改字符、字体、高度和兄弟位置，也不恢复 nowrap、居中按钮或多段行内排版。`manifest.textBounds` 记录扩宽明细、保留原因及 `nativeFit: NOT_RUN`。
- `--paint-order captured|positioned-siblings` 对应 `options.paintOrder`，默认 `captured`。显式 `positioned-siblings` 在受支持的 block 父级内，对同父定位元素的完整分支按明确 z-index 稳定排序；支持显式 auto 或非负整数字符串。另支持一个受限 flex 情形：恰有两个元素分支，一个为 absolute 且 z-index 是显式正安全整数，另一个为 static，后者完整子树须逐项具有显式 z-index auto、安全定位、transform none及opacity 1，且没有竞争的合成属性。此时普通流分支先于覆盖层绘制，记录 `POSITIVE_OVERLAY_AFTER_STATIC_FLEX_FLOW`。缺失、负值、其他混合文档流、复杂后代或跨父级提升均保持原序；静态补充须携带匹配来源，不把缺失值当作 auto。排序保留坐标、层级、逻辑key和反应；`manifest.paintOrder` 记录父级、来源和保留原因，`nativeVerification` 仍为 `NOT_RUN`。

两个选项都不是通用 CSS 布局或层叠实现。未知输入应保留警告或原因；转换成功及计数变化不能替代新规格的实际原生截图、滚动和交互复验。输出须使用新目录，修改规格还须使用新的 specId、runId 及明确授权范围。

### 同样式行内文字合并

`--inline-text captured|uniform-run` 对应 `options.inlineText`，默认 `captured` 保留原片段。显式 `uniform-run` 仅处理同父的2–16个直接TEXT子节点：源测量须在同一行、相邻边界连续，字体、字号、字重、行高、字距、颜色等样式一致，可见性与透明度一致。父级须为block、水平从左到右、left/start/center对齐和normal/nowrap；内容边界须有明确像素值，父级及直接片段transform须为none，不能有滚动、嵌套元素或重叠兄弟子树。祖先只接受none或已计算的有限二维纯平移 `matrix(1,0,0,1,e,f)`；平移已包含在捕获坐标中，不重复施加。未计算的translate、缩放、旋转、倾斜、透视或未知矩阵保持原状。测量连续性容差为0.02，超出支持边界就保留原片段并记录原因；相邻片段末尾和开头同时有普通空格时，也保留为 `WHITESPACE_COLLAPSE_UNSUPPORTED`，不猜测浏览器空格折叠。

合并后第一个原TEXT承载按源顺序拼接的完整字符串，宽度使用已证明的父内容区；左对齐保留原左边界，居中使用完整内容区。其余片段保留原key和文字，但显式隐藏。修改可见整行应编辑第一个节点；隐藏片段与整行没有自动同步关系，编辑隐藏文字不会自动更新可见整行，重新显示它们也可能与整行重叠。

任何待合并片段若是已声明reaction或保留的原场景自映射的sourceKey，整组不合并；不隐藏交互源来换取排版改善。该规则不合并不同字重/颜色的富文本，不自动恢复段落换行，也不代表原应用动态绑定。`manifest.inlineText` 保存changedCount、hiddenFragmentCount、runs中的sourceIds/hiddenKeys/previous和保留原因，`nativeFit: NOT_RUN`；后续实际原生复核单独留证。

### 显式原生测量的单行字号适配

[text-fit.mjs](../../.research/local-figma-bridge-poc/design/text-fit.mjs) 导出 `fitMeasuredSingleLineText(spec, {candidates, measurements, minimumScale})`，返回克隆后的 `spec` 和逐项 `report`。它是独立JS API，须在设计系统 `enrich` 前显式调用；不属于默认转换、CLI选项、DesignSpec新字段或原生apply参数，也不自行创建字体测量。

候选须由来源证明完整字符原本只有一行，源范围宽度不超过内容宽度，且固定TEXT的字符、字号、高度和内容边界与来源一致。`sourceEllipsis` 必须显式提供；CSS声明ellipsis并不证明已裁切，完整源范围已经超出内容盒的文字一律保留。隐藏、多行、未知边界、非零字距、共享 `textStyleKey` 或不匹配候选不会适配。

每个字体/字号/行高/字距/字符串组合须有唯一测量，包含非空来源及两次实际原生 `WIDTH_AND_HEIGHT` 读回，字体不能缺失。两次原始字体属性、字符、尺寸及自动尺寸须完全相等，汇总宽高须与读回一致；请求与原生字号、数值行高只允许float32表示等价，报告同时保留请求值和实际值，不将此等价用于放宽双读稳定性。实际Arial文字须用Arial测量，不能借用Noto宽度。

自然宽度已适合时保持原值；超出时仅缩小该节点字号：内容宽度向下取整、原生自然宽度向上取整，按两者比例计算字号并向下保留六位小数。`minimumScale` 默认0.8，只允许0.8–1；低于此比例或最小字号0.1时保留。不会扩宽、移动、修改字符、行高、兄弟、资源或交互。报告中的 `nativeVisual`、`verticalFit` 仍为 `NOT_RUN`，须在新规格的完整场景中实际核验；适配证据不能绕过用户编辑冲突。

### 原生控件的采样表示

`--native-controls captured|sampled` 对应 `options.nativeControls`，默认 `captured`，保留旧转换行为。显式 `sampled` 才启用 progress/details 表示；配合 `--html-directory` 时也显式开启归档来源补充。来源类型为 `CAPTURED`、`HTML_ATTRIBUTE_DERIVED`、`STATIC_CSS_DERIVED` 或 `UNKNOWN`；派生证据须与节点、属性和值匹配，缺失或冲突不得当作捕获值。

progress 仅在确定状态、有限且合法的 value/max 和可信 accentColor 都满足时按比例生成填充矩形。要求 value≥0、max>0、value≤max，不猜默认值或夹取比例；0比例不创建填充，正宽小于0.01时保留警告。浏览器轨道、圆角及动画没有被捕获，始终为 UNKNOWN；这是采样比例表示，不是平台控件外观复刻，也不增加计时行为。

details 只有明确的布尔 open 状态才生效。关闭时保留首个直接 summary，其余子树显式 `visible:false`，保留生成节点的 key、几何和反应；展开或未知状态不会擅自隐藏内容。summary 默认文字、原生标记及展开/关闭交互不自动补造。精确设计系统提取将VECTOR改为INSTANCE时保留原节点显式visible，避免关闭状态在该阶段丢失。

`manifest.nativeControls` 保存 progress/details 逐项状态、来源、隐藏根键和计数，`nativeVisual` 为 `NOT_RUN`。归档补充需唯一的 data-design-id/tag 匹配，已捕获字段（包括false/0）不覆盖。静态accent补充仅接受已支持的封闭作者样式来源；外链、脚本、条件或冲突声明等不能证明时保持UNKNOWN。HTML属性与静态CSS来源不等于重新采集的computed style，所有警告及最终原生视觉/播放门禁继续保留。

## 交互与计时单位

支持 `ON_CLICK` 和 `AFTER_TIMEOUT` 导航到根 Frame，并支持多个 flow 起点。包含 flow 的规格需使用页面根作用域；页面中其他起点会保留。该原型展示采集好的状态，不执行源应用的 OCR、检索、导出等后台业务。

写入任何非空导航反应都必须使用 PAGE 根作用域，即使规格未显式声明 flow、页面已有起点；否则返回 `DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE`。Figma 可能为源节点的顶层 Frame 添加 `Flow 1`，断开的反应链也可能追加后续流程。运行时登记成功 `setReactionsAsync` 调用前后的原生回读，只接受原流程列表完整保持、末尾恰好追加一个按数量命名的 `Flow n`，且新增起点为当前反应源的任务所有顶层 Frame。每条v2观察保留完整before/after和反应成功receipt，链连续核对，v1首个Flow 1记录仍兼容。其他起点保留；更名、删除、改顺序、追加多项或反应/摘要变化均拒绝，不凭可见名称判断来源。独立6节点原生v2小例已生成及审计通过，范围见[实机记录](../verification/2026-10-08-design-pipeline.md#公共采用入口与原生v2小例验证)；旧run缺少原始记录时不会自动补齐，小例不能替代全量验收。

DesignSpec 的 `delaySeconds` 始终使用秒。运行时 `timerUnit` 默认为 `milliseconds`，按 [Figma Trigger 文档](https://developers.figma.com/docs/plugins/api/Trigger/) 转换为毫秒后写入 `timeout`。实际宿主的单位仍需用 Prototype 面板及 Present 核实；API 回读值相同不能证明播放时长正确。

本机 Figma 桌面端 126.9.13 的回导验证观察到：`delaySeconds: 2` 配合 `timerUnit: "milliseconds"` 写入的 `timeout: 2000`，在 Prototype 的 `After delay timeout` 中显示为 `2000000ms`。这表明该宿主把 API 数值按秒解释。对此宿主，应在新的运行中显式设置 `timerUnit: "seconds"`，再确认面板显示 `2000ms`，并在 Present 中实测约 2 秒后跳转；未完成播放测量前不能宣称计时验收通过。该兼容设置不改变全局默认值，也不代表所有 Figma 版本都采用秒。

运行开始后单位写入检查点，不能中途更改。已使用另一单位的旧 run 应保留其证据，重新选择规格 ID、运行编号及授权范围后验证兼容配置；不得修改旧账本绕过 `DESIGN_TIMER_UNIT_CONFLICT`。

## 中断与冲突

本地会话在每次写调用前保存意图；插件在每个资源、节点和交互写入前保存 pending 状态，回读成功后才清除。`runId` 标识本轮证据，`specId` 与规格签名标识生成内容。

Design 请求默认传输等待预算为 40,000 ms，可按[启动指南](getting-started.md#3-建立本地持久会话)显式增至最多 180,000 ms。该设置只延长等待，不取消或重试宿主操作，也不改变授权、签名、所有权和回读检查。超时后宿主可能仍完成写入并返回晚到结果；保存原操作 ID 与本地意图，先重新连接并只读 `audit`，再显式 `reconcile`。仅增加超时、重连成功或收到晚到响应，都不足以解除 `OUTCOME_UNKNOWN` 并重放 `apply`。

Design 操作期间心跳可能被同步计算延迟。桥接仅在已认证、ready、仍打开的同一连接上存在未到原始截止时间的受支持 Design 请求时，暂缓通常的 35 秒空闲关闭；连接引用、connectionId、sessionId、fileIdentity 必须全部匹配，请求期限最长 180,000 ms。它不刷新 `lastSeen` 或延长请求 timer。请求结束、超时或从 pending 移除后，恢复每 5 秒检查的普通空闲规则；普通工具、换连接或未就绪连接不享有此保活。该协调不是无限心跳豁免，断开与未知结果仍按下列流程处理。

- `IN_PROGRESS`：可以顺序执行下一批，不能并发写同一作用域。
- `COMPLETE`：生成及连接完成；再次执行只读核对后返回幂等结果。
- `PARTIAL_FAILURE`：已有部分内容可能写入。检查错误和 pending 状态，先运行 `audit`。
- `NEEDS_RECONCILIATION` 或本地 `OUTCOME_UNKNOWN`：不得盲目重放。读取实际文档后，显式执行 `{"command":"reconcile"}`。
- `DESIGN_USER_EDIT_CONFLICT` 等冲突：保留用户修改，停止续跑；不要删改账本或取消校验强行继续。

节点 fills 或 strokes 触发 `DESIGN_PROPERTY_READBACK_MISMATCH` 时，失败结果可携带 `readbackMismatch`，包含 `nodeKey`、`field`、`expected` 和 `actual`。序列化后不超过 8192 字符才返回完整诊断；超预算时只报告 `status: "NOT_VERIFIED_BUDGET_EXCEEDED"` 与 `budgetCharacters: 8192`，不截断 Paint 冒充完整回读。先保存结果、检查 pending 并执行只读审计；可用 `read-node` 补充实际节点证据，不能据此盲目重放失败写入。

普通 `reconcile` 只接受已存在耐久回读记录且能够重新证明完成的步骤。若节点只创建了一半、资源设置没有完成记录或实际结果有歧义，仍会失败。应保留现有证据，检查受影响的专用测试作用域，再决定新的规格及运行范围。

### 显式采用旧反应中断状态

旧reaction pending缺少原setter成功记录时，实际节点已有正确导航也不足以自动恢复，不能事后补造原调用的receipt。公共归一化、MCP与持久CLI已有精确显式采用入口，并通过226项完整契约测试；主运行已在明确授权下执行精确当前状态采用及独立回读，范围见[采用实机记录](../verification/2026-10-08-design-pipeline.md#精确当前状态采用的实机确认)。该入口不是通用pending清除器：只接受无反应完成记录的reaction pending，仍要求已有可核对的流程观察、精确输入和全部保护成立。

1. 保存失败回复、原pending和不可变规格，先只读 `audit`、`read-node` 核对当前完整流程及源反应。记录旧 `pending.operationId`，不得把新请求的operation ID当作采用目标。
2. 按运行时 `fullFlowSnapshot`、`semanticReactions` 与 `designSignature` 规则生成当前两个摘要：任务所有流程使用稳定nodeKey，外来流程保留nodeId；导航目的ID换为稳定destinationKey，保留规范化trigger/actions。摘要是规范化语义内容的SHA256，不是原始read-node JSON、输入规格或证据文件的SHA。摘要不完整或映射不明确时停止，不猜测参数。
3. 在精确文件、页面、规格和run的有效写授权下，仅对当前核对状态显式提交 `reconcile`。以下是请求形态；尖括号内容必须替换为核实值，原样发送会被参数校验拒绝：

```json
{
  "command": "reconcile",
  "adoptNativeFlow": {
    "pendingOperationId": "<原pending.operationId>",
    "flowSnapshotSignature": "<当前完整流程快照的64位小写十六进制摘要>",
    "reactionSnapshotSignature": "<当前源反应的64位小写十六进制摘要>"
  }
}
```

CLI只从这次 `reconcile` 请求透传三个字段，不从会话配置读取，也不隐式补齐；其他命令携带该字段会报 `SESSION_NATIVE_FLOW_ADOPTION_REQUIRES_RECONCILE`。MCP对应 `figma_scope_design_apply`，必须同时显式传入 `reconcile: true` 及完整授权/规格字段。`pendingOperationId` 必须符合 `^op-[A-Za-z0-9._-]{8,100}$`；对象缺项、多项、摘要格式错误或命令不符会被公共边界拒绝。CLI为本次写请求生成新的operation ID，三个字段中的旧ID仍精确指向原pending。

采用在写入前重新核对作用域、所有权、属性、反应与规格一致，以及原流程完整保持和单追加；签名变化报 `DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT`。成功记录 `CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED` 与 `EXPLICIT_READBACK_ADOPTION`，保留legacyPending副本，原setter的reactionReadback保持null；它不证明历史变化来自宿主，也不重放原setter。随后会继续本次 `batchSize` 预算内的普通生成/后处理，因此reconcile是写操作。保存完整回复后再次只读审计；任何失败、未知结果或新冲突都保留证据并停止盲目重试。proposal仅是待核对材料，不等于执行授权。

旧v5主55场景的完整 apply 已确认13,193创建及后处理全部完成，七页最终原文件只读审计PASS、writes0、errors[]，739反应和2个起点与规格一致。12幅代表原生PNG均已导出、核对hash并完成对照复核，视觉结果FAIL：11帧含P1，紧凑更新场景有P2；字体替代批准不包含可读性缺陷。完整结构的真实 `.fig` 已保存，容器检查PASS，但包含历史及探针页，仍是视觉失败的备份；完整Present、独立回导和交付验收NOT_RUN。转换选项及独立字体探针不代表旧v5画面已经修复，详见[完整视觉与备份记录](../verification/2026-10-08-design-pipeline.md#2026-10-10-12-图视觉复核与完整结构备份)。原精确采用仍仅证明当前状态，原setter receipt未补造；旧op-8b来源仍OUTCOME_UNKNOWN，不能用当前完成追认未知操作成功。见[采用实机记录](../verification/2026-10-08-design-pipeline.md#精确当前状态采用的实机确认)及[全部节点与最终审计记录](../verification/2026-10-08-design-pipeline.md#2026-10-10-全部节点完成与最终原文件审计)。

当前v10候选基于同一历史55场景两尺寸，包含13,197节点、418项实测字号适配及28项有固定来源证明的文字宽度修正。五场景1462节点已完成生成与收尾，结构审计、五张PNG导出及本批已报告的裁切、断行和工具栏遮挡修复验收PASS；该范围接受已批准的字体差异，不代表像素一致或全场景验收。v9失败记录保留。详见[修复验收范围](../verification/2026-10-08-design-pipeline.md#2026-10-11-v10-五场景修复验收)。全55候选仍为 `PREPARED_NATIVE_NOT_RUN`；全量原生生成、交互和独立回导待执行。文字宽度修正是固定来源的本地派生步骤，没有放宽通用字号适配API的几何保护。

同一 `specId` 的内容变化会触发签名冲突。修订规格需新 `specId`，并选择新的明确作用域和运行编号；生成器不把规格修订解释为批量替换用户已有内容。文件名、节点名和可见标签不用于身份授权。

## 回导后的只读核对

原生 `.fig` 回导可能改变文件、页面、节点、样式、变量集合、模式和变量 ID。重新授权新文件后，运行时通过节点稳定键、资源命名空间及原有账本找到回导对象；图层、导航与 flow 使用稳定键比较。查到多个候选、资源归属变化或用户编辑时会失败，不通过重新生成伪造回导成功。

实例文字、颜色、阴影、几何、父子顺序、主组件关系与交互均需保持语义一致。审计不会修复回导对象，也不会更新旧 ID 账本。原文件和回导文件必须分别保存实际审计结果，由交付校验器比较。

`scope_design_export_png` 仅导出 PNG。真正的 `.fig` 由 Figma 客户端保存本地副本；本地 ZIP 检查不能代替真实导入及编辑验证。

## 开发验证

运行时context按拓扑顺序每窗最多16个节点ID只读预取，排空已启动读取后按原顺序核对guard、fallback及母版关系。仅预取节点引用，不提前冻结属性快照；全部写setter和新鲜回读仍顺序执行，未增加公共配置键或并发写入。此增量已纳入229项完整契约测试；实际只读plan约53.9秒、首个优化后批次约126.6秒，与此前约127–153秒接近，尚无明确apply提速证据。Figma connection issue已观察到，云同步未验证，本地回执不能当作云端持久化证明。证据范围见[后续检查点](../verification/2026-10-08-design-pipeline.md#只读节点预取与后续确认检查点)。

持久会话的 `read-node` 可只读核对单个宿主节点的填充、描边与矢量路径。填充及描边序列化数据合计不超过 512×1024 字符时返回完整字段及 `paintsReadback: PASS`；超过预算时不返回这些字段，并标记 `NOT_VERIFIED_BUDGET_EXCEEDED`。该诊断不写入对象，不能代替完整设计审计。

`read-node` 还可返回 `imageResources`：读取目标节点的 Design 命名空间及祖先 Page 中同命名空间的图片账本，同步查询 `getImageByHash`，报告账本 key、hash、signature、`handleExists` 和 `referencedByTargetFill`。它不下载图片 bytes、不创建资源、不修改填充或账本。`status: PASS` 仅说明元数据及查询收齐，`imageValidity` 始终为 `NOT_VERIFIED`；handle 存在不能证明图片 bytes、尺寸、显示或长期持久性正确。

图片诊断最多 2000 条账本记录，每条最多 4096 字符，资源序列化合计最多 512×1024 字符。缺少命名空间、祖先 Page、所需 API、完整填充或合法账本时返回明确的 `NOT_VERIFIED_*`；预算不足不截断为成功证据。对已发生的空填充或用户编辑冲突，资源重新出现也不代表旧节点已修复；仍须保留失败证据并检查实际节点，不能绕过 guard 续跑。

`read-node` 的 `prototypeState` 只读返回当前祖先Page的flowStartingPoints，以及目标节点同Design命名空间的cursor、finalizeCursor、pending、nativeFlowObservation和sourceReactionRecord。Page本身只返回原生流程；其他节点仅读取已知命名空间记录，不枚举外来账本。缺失flowAfter或reactionReadback明确标为`NOT_RECORDED`，缺失反应完成记录为`MISSING`，不能从当前导航外观推断原调用成功。

该诊断的`status: PASS`只表示有界元数据收齐，`writes: 0`；v1/v2流程观察均可回读，但v2的`chainVerification: NOT_VERIFIED_METADATA_ONLY`不证明观察链或来源因果。预算或schema不满足时明确失败，不截断为成功证据。诊断不写对象、不采用pending、不替代完整审计或Present；未来pending的flowAfter/reactionReadback记录也不能追补旧调用的成功receipt。

从 `.research/local-figma-bridge-poc` 运行：

```powershell
node --test tests/design-runtime.test.mjs
npm run build:plugin-code
node scripts/build-plugin-code.mjs --check
```

本地构建或重载插件前，先在已确认的两批检查点停止发送写命令，并保存当前意图及回读证据。生成物变动后曾观察到插件短暂断开重连，热重载关联仍只是推断，见[实机恢复记录](../verification/2026-10-08-design-pipeline.md#v5-未知结果核对与-500-节点恢复)。重连不证明原操作未执行；operation 查询失败或文件不匹配也不能当作 `NOT_FOUND`。按未知结果流程只读核对后再显式恢复，不能直接重放。

运行时测试使用显式 Figma API double，覆盖生成、覆盖、冲突、恢复、全 ID 重映射和交付审计协议。它们不代表真实 Figma 的渲染、播放或原生文件回导已经通过。真实宿主验证及限制必须写入本轮证据。
