# 应用界面采集与 DesignSpec 转换

采集模块把应用当前可见状态转换成可编辑的 Figma 原生节点输入。它保留场景、文本、几何位置、资源和显式交互映射，输出 DesignSpec 1.0 与采集清单。它不执行真实 OCR、动态检索，也不推断尚未采集的业务状态。

实现位于 [capture](../../.research/local-figma-bridge-poc/capture/)，输入契约由 [design/spec.mjs](../../.research/local-figma-bridge-poc/design/spec.mjs) 校验。可运行的原生节点示例见 [two-size-prototype.json](../../.research/local-figma-bridge-poc/examples/two-size-prototype.json)。

## 采集浏览器中的当前状态

在已授权访问的浏览器或 Electron 页面中，使用既有自动化会话调用 `captureDOM`。以下代码假设调用方已有 `page`，不负责启动或登录应用：

```js
import { captureDOM } from './capture/dom-capture.mjs';
const capture = await page.evaluate(captureDOM, {
  id: 'home',
  name: '首页 · 默认窗口',
  revision: 'source-commit-or-version',
  includeInputValues: false,
  redactions: [{ from: '需要脱敏的字面文本', to: '匿名示例' }],
});
```

每个业务状态、窗口尺寸分别采集，并使用稳定且唯一的 `id`。采集函数只读取 DOM 和已加载图像，不请求远程图像、不执行归档 HTML、不改变页面 DOM。密码、隐藏输入以及带 `data-capture-private` 的元素会被排除；普通输入值默认不采集，下拉框会采集当前显示的选项文字。采集其他可见文字前仍应使用匿名测试数据，并核对输出是否含路径、文件名或个人信息。

跨域限制导致图像读取失败时，会产生 `IMAGE_UNREADABLE`。canvas、iframe、video 只保留占位几何并报告 `UNSUPPORTED_SURFACE`，不使用整页截图替代原生节点。

## 转换已有 JSON

支持 `captureDOM` 的结构，也支持 ArchiveLens 旧采集格式：`{ id, name, viewport, root }`。树节点使用 `kind`、`rect`、`style`、`children`；文字、SVG 和图像分别使用 `text`、`svg`、`dataUrl`。

在仓库根目录执行 PowerShell：

```powershell
Set-Location .research/local-figma-bridge-poc
node capture/cli.mjs --input ../../.local/captures --output ../../.local/generated-design --id sample-prototype --name "示例原型" --revision source-revision
```

`--input` 可以是一个 JSON 文件或只含场景 JSON 的目录。`--index` 接受包含 `id` 的 JSON 数组，用于限定场景和固定顺序。输出目录必须不存在；工具拒绝覆盖之前的结果。

旧采集没有时间戳时，`source.capturedAt` 保持缺省，不把转换时间冒充采集时间。已知准确时间可通过 `--captured-at` 传入 ISO 时间戳；转换时间另记为清单的 `convertedAt`。

需要恢复旧采集遗漏的下拉框选项和图像时，可提供：

```powershell
node capture/cli.mjs --input ../../.local/captures --index ../../.local/scene-index.json --links ../../.local/prototype-links.json --html-directory ../../.local/captures --assets-directory ../../.local/page-images --output ../../.local/generated-with-resources --flow-starts home,compact-home
```

`--html-directory` 要求每个场景有同名 `.html` 文件。转换器只解析带 `data-design-id` 的 select/option/img，不运行脚本，也不从归档 HTML 推断 CSS 层叠或背景渐变。图像仅从内嵌 data URL，或明确指定的 `--assets-directory` 读取；后者只匹配 URL 中的精确文件名，不跟随网络地址或任意本地路径。PNG、JPEG、WebP 可嵌入资源；无法恢复的资源保留明确警告。

## 可选的设计系统提取

增加不带值的 `--design-system` 开关，可以把同一份采集中的重复值提取成可编辑资源：

```powershell
node capture/cli.mjs --input ../../.local/captures --output ../../.local/generated-design-system --design-system
```

[design/enrich.mjs](../../.research/local-figma-bridge-poc/design/enrich.mjs) 采用以下确定性规则：

- 完全相同、至少出现两次的字体、字号、行距和字距组合成为文字样式。
- 至少出现两次的相同 RGBA 值成为颜色变量，其中 alpha 使用 Paint 的 `opacity`，缺省为 1；相同 RGB、不同 alpha 分别提取。范围包括节点 fills、strokes 和实例 override fills，已有 `variableKey` 的 Paint 不参与提取。
- 尺寸、路径和显示属性完全相同的叶 Vector 成为组件母版和实例；位置、源节点 key、点击目标与场景关系保留。

工具不会用近似匹配合并图标，也不会把任意按钮自动推断成同一种业务组件。生成的资源名包含内容摘要，不代表人工命名的语义设计系统。提取结果记录在清单的 `designSystem`，包含资源数、绑定数和 `visual: NOT_RUN`。已有的文字样式和变量保持原定义。

Figma 的 COLOR 变量绑定会把变量 alpha 解析到实际 Paint opacity；提取时用原 Paint alpha 定义变量，同时保留原 Paint 的显式字段，不将两者重复相乘。节点 `props.opacity` 是独立的整层透明度，保持原值，不能用来代替 fills 或 strokes 的透明度。旧规格中已有的显式绑定不会自动重写；发现变量 alpha 与期望 Paint opacity 不一致时，应保留旧证据并从源采集重新转换到新的规格 ID。

手工 DesignSpec 可以通过 `INSTANCE.props.overrides` 覆盖母版后代的文字、可见性和填充；`sourceKey` 必须指向该母版的后代，文字覆盖只能作用于 Text。相应的可运行示例已经包含紧凑窗口按钮文字覆盖、两种尺寸的真实垂直溢出、点击导航及 2 秒计时导航。

## 交互与依赖

`--links` 接受数组，或 `{ "links": [...] }`，单项格式为：

```json
{
  "sceneId": "home",
  "sourceId": "d14",
  "targetSceneId": "complete",
  "navigation": "NAVIGATE",
  "trigger": "ON_CLICK"
}
```

计时触发用 `"trigger": "AFTER_TIMEOUT"` 与 `"timeoutMs": 1000`，转换后为 DesignSpec 的 `delaySeconds: 1`。`--flow-starts` 为逗号分隔的场景 ID；没有指定时只使用首场景。

跨场景导航需要源节点和目标场景都在同一份 DesignSpec 内。未解析、重复和不支持的映射会进入清单警告，不会伪装为已连接。转换器不会自动拆分成丢失跨场景边的独立文件。DesignSpec 的父节点、组件实例及组件全部后代按依赖排序，拒绝环和悬空引用；运行时可据此分批创建。

旧 ArchiveLens 格式没有 `captureVersion`。其点击映射中，`sceneId === targetSceneId` 表示保留采集时的预设状态，不能证明辅助操作产生了新结果。转换器不为这些映射创建原生导航；清单的 `unchangedPresetMappings` 保留每条原始 `mapping`、源/目标 key 和省略原因，`unchangedPresetCount` 单独计数。源节点不存在的映射仍报告 `UNRESOLVED_INTERACTION`。这一兼容规则只作用于旧采集中的点击自映射；`captureDOM` 1.0 输入及手工 DesignSpec 的显式自导航保持原语义，仍须核验实际 Figma 支持情况。

## 输出与检查

- `design-spec.json`：紧凑 JSON，包括原生节点、嵌入资产、交互和起点；转换器使用绝对定位，不自动推导 Auto Layout。设计系统提取需要显式开启 `--design-system`。
- `capture-manifest.json`：场景清单、源节点映射、原生反应数量、保留预设状态的映射及原因、警告、Spec SHA-256 和字节数。
- `verification.schema` 为 `PASS` 只表示契约校验通过；视觉与 Figma 运行结果初始为 `NOT_RUN`，必须另行执行真实导入、回读和播放核验。

输出 Spec 上限为 7 MiB，避免超过桥接传输预算；超限时在写出前失败。节点、资产、字符串和总输入还有独立上限。若必须减少场景，应先选择一个闭合的交互子集，并核对清单中的 `UNRESOLVED_INTERACTION`。

本地采集、用户资源和输出应保存在仓库忽略的 `.local/`，不要提交实际文档图像。

## 支持边界

支持文本、矩形、椭圆、Frame、简单 SVG path、内嵌图像、背景和边框颜色、圆角、字体字号、行距、滚动裁切、下拉框显示文字与矢量箭头。RGB、十六进制、sRGB 和 OKLCH 颜色可转换。CSS 内外阴影会保留颜色、偏移、模糊、扩张半径与顺序；普通边框使用原生内侧描边。CSS `dashed` 使用原生 `dashPattern`，虚线段与间隔长度均为边框宽度的 3 倍；浏览器可能重新分配端点及拐角间距，因此仍需视觉核验。

CSS 元素背景仅支持单层 `linear-gradient` 的受限透明度渐变：两个 RGB 值完全相同的 rgb/rgba 或十六进制色标，可保留各自 alpha；色标位置必须同时省略，或分别显式为 `0%`、`100%`。方向仅接受 `0deg/90deg/180deg/270deg`、对应的 `to top/right/bottom/left`，或省略方向的默认 `180deg`。输出为原生 `GRADIENT_LINEAR`，不支持任意角度、不同 RGB 色彩插值、更多色标、多层背景、径向或重复渐变。

该转换还需计算样式证明背景透明、四边边框宽度为零，并明确提供 `backgroundSize: auto`（或 `auto auto`）、`backgroundRepeat: repeat`（或 `repeat repeat`）、`backgroundPosition: 0% 0%`、`backgroundOrigin: padding-box`、`backgroundClip: border-box`、`backgroundAttachment: scroll` 和 `backgroundBlendMode: normal`。`captureDOM` 会采集这些字段；旧输入缺少字段时不假定默认值，仍保留警告。应重新采集，或用逐元素实际计算样式证据补充新副本，不能仅从 HTML 字面样式猜测合成结果。

简单 SVG 保留外层 Frame 和每个 path 的独立颜色、透明度、填充规则。转换器解析 viewBox、对齐方式及 M/L/H/V/C/S/Q/T/A/Z 路径，计算 Bézier 曲线和椭圆弧的极值边界，把图标留白保留在外层 Frame 内。`transform`、群组、滤镜、蒙版、渐变、描边和非 path 几何会走带警告的降级路径，需要单独核验。每个源 SVG 的原 key 保留在外层 Frame，已有热点不会因增加 path 子节点而丢失。

无描边 SVG path 和下拉箭头显式输出 `strokes: []`，保留源图形默认无描边的语义，避免原生 Vector 的默认描边混入。源 SVG 描边仍属不支持的样式，并保留降级警告。运行时将源路径规范化并按节点显示尺寸统一缩放，具体单位和圆弧近似边界见[生成指南](generation.md#可编辑内容与保真边界)。

安全的嵌套 `position: sticky` 元素会提升为最近滚动祖先的固定子层，并用采集时元素与该祖先的矩形差值补偿坐标；原 key、后代和交互映射保留。只有祖先路径没有变换、不支持的裁剪或合成，且不会丢失中间层裁剪、透明度或固定/粘滞定位语义时才执行提升。它只固定采样状态，不复刻 CSS sticky 的起止阈值和包含块边界。普通 `position: fixed` 仍只支持滚动容器的直接子层，不能据此提升任意浮层。

字体按 `fontName.style` 选择；找不到时由明确的 fallback 策略处理，字体替代需要单独核验字形和换行。

以下情形必须检查警告及实际画面：

- `SHADOW_UNSUPPORTED`：该阴影表达式超出解析范围，例如不支持的颜色或长度单位。
- `CSS_BACKGROUND_IMAGE_UNSUPPORTED`：背景超出上述线性透明度渐变子集，或缺少证明绘制上下文的计算样式；背景图、复杂渐变及旧输入缺失仍需另行处理。
- `SVG_GEOMETRY_FALLBACK`、`SVG_MULTIPLE_FILLS_APPROXIMATED`、`SVG_COMPLEX_GEOMETRY_PARTIAL`：复杂 SVG 的样式、变换及非 path 几何不能保证保真。根和 path 重复声明相同颜色不会触发多色近似警告。
- `TRANSFORM_BOUNDING_BOX_ONLY`：CSS 变换仅保留测得外框。
- `DASH_PATTERN_APPROXIMATED`：虚线已表达为原生图层属性，但其端点和拐角间距可能与浏览器不同。
- `BORDER_STYLE_APPROXIMATED`：除 `dashed` 外的非实线边框按实线处理，例如 `dotted`。
- `STICKY_POSITION_SAMPLED_FIXED`：安全嵌套 sticky 已按最近滚动祖先的采样坐标转为固定子层，完整 CSS sticky 动态仍需另行实现与核验。
- `FIXED_POSITION_CAPTURED_STATIC`：固定元素不是滚动容器直接子层，或 sticky 的祖先路径无法安全提升；保留采集时位置，sticky 降级时附带不支持的原因。
- `NONZERO_SCROLL_SNAPSHOT`：保留采集时坐标，不能据此证明播放时初始滚动位置相同。
- `SELECT_VALUE_NOT_CAPTURED`、`IMAGE_RESOURCE_MISSING`：原输入缺少值或资源，需重新采集或提供归档补充。

上述限制意味着：完成批量转换不等于达到既有人工修复后的 ArchiveLens 交付质量。必须在 Figma 中复核文字、图标、滚动、浮层层级及交互目标。

## 55 场景本地转换记录

2026-10-08 使用 2026-09-30 的 ArchiveLens 匿名归档及显式图像目录执行转换，来源版本为 `a7206b18dba108b55fd27488ba533f55036d9f45`。该记录证明适配器处理旧输入的能力，不代表重新采集了当前应用。

输出包含 55 场景、13,193 个显式节点、4,170 个 Text、33 个 Component、713 个 Instance、50 个文字样式、99 个颜色变量、3 个去重图像资源、831 条反应和 2 个起点。4167 个文字节点绑定样式，8142 个原 Paint 绑定颜色变量。全部 367 处阴影已表达为原生 effects；674 个 SVG 已按独立 path 和 viewBox 转换，没有 SVG 降级警告。数量由内容提取决定，不追求复刻先前手工整理时的组件数量。

后续交互核对确认，上述历史输出错误地把 92 条保留预设状态的自映射也计入了原生反应。原交付实际只有 739 条原生反应；下方的新输出修复此差异，历史文件保留用于追溯。

该批旧输出的 214 条警告保留在清单中：126 条固定或粘滞元素被保留为静态位置，75 条 CSS 变换保留测得外框，13 条非实线边框按实线表达。固定位置警告中，110 条是低透明度的焦点辅助元素，16 条是可见的固定或粘滞元素；仍需在播放时检查后者。75 条变换均为平移或单位矩阵，坐标已包含采集时的位移，但没有复刻连续动画。随后增加的 `dashPattern` 支持须重新转换为新输出才能生效，不会改写这份历史清单。

本地输出为 5,927,884 bytes，SHA-256 为 `5fcd4dc09ef2fc190f408de7f73093e634f006ec90d889b80251d199db31345c`；清单 `schema: PASS`，该批输出的视觉和 Figma 运行核验均为 `NOT_RUN`。后续若重新生成或做实机核验，应保存新的清单与证据，不覆盖此记录。

同日加入虚线支持后，新输出保存在 `.local/archivelens-design-system-dashed/`，使用新规格 ID `archivelens-baseline-dashed`。13 个边框均已写入原生 `dashPattern`；节点、资源及交互数量与上批一致。214 条警告中对应的 13 条现为 `DASH_PATTERN_APPROXIMATED`，其余警告保持。该规格为 5,928,612 bytes，SHA-256 为 `c982ecef261e73501cc994a8ef5fb0708f3d6de01184a5ba3e3d90569bd369b6`，`schema: PASS`，视觉和 Figma 运行核验仍为 `NOT_RUN`。

完成归档自映射修复后，再生成 `.local/archivelens-native-mapping/`，规格 ID 为 `archivelens-baseline-native-mapping`。该输出有 739 条原生反应（738 次点击、1 次计时），清单另保留 92 条原始自映射及省略原因，两者合计覆盖输入的 831 条映射。节点、资产、样式、变量、起点和虚线属性与上一批逐字段比较一致。规格为 5,918,432 bytes，SHA-256 为 `1b45c5b49d0e7ffb59ddd865cf76f304daf4ccbe1245501df3ca207619ef5e05`；本地映射核验记录在 `.local/reports/archived-interaction-mapping-check.json`，状态为 `PASS`，视觉和 Figma 运行核验仍为 `NOT_RUN`。

## 回归检查

```powershell
Set-Location .research/local-figma-bridge-poc
node --test tests/design-spec.test.mjs tests/capture.test.mjs tests/enrich.test.mjs
```

测试覆盖非法字段、类型边界、组件覆盖、依赖环、缺失引用、Unicode、计时单位、归档自映射证据保留、现代采集显式自导航、颜色与阴影转换、SVG 极值和 viewBox、下拉框与图像恢复、精确资源提取、写出哈希和禁止覆盖。测试通过不能代替真实浏览器采集、Figma 导入和视觉验收。
