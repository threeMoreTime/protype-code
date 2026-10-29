# React 项目与运行采集

## 扫描后确认本次端型

Agent 先扫描当前目标项目，汇报原系统支持 PC、移动端或两端的实际证据；证据不足时明确写「未知」。当前静态 React 解析器提取路由和页面语义，并不自动检测端型支持，不能根据框架、模板尺寸或存在媒体查询就宣称支持移动端。

在生成 HTML、设计规格或向 Figma 写入前，必须询问用户：「本次项目要做 PC 端、移动端，还是两端都要？」分别记录 `sourceSupportedPlatforms`（原系统证据）与 `requestedPlatforms`（本项目用户选择），后续采集视口、两个输出和验收均沿用该选择。用户已经针对当前项目明确选择时直接复用，不重复询问；不得把其他项目或前期工具调研中的双端目标套用到本项目。

原系统没有的端型属于新增适配，应先说明并获得用户明确要求。未回答时继续只读扫描，暂停端型专属产物生成及 Figma 写入。此询问由 Agent 执行，现有通用 CLI 不会弹出确认题，命令参数也不能证明用户授权。

当前源码复用入口仅接受显式 `--device desktop`，会拒绝 `mobile` 和 `all`；应在用户确认后传入端型参数。当前客服后台原系统仅支持 PC，用户在扫描后已明确选择「仅 PC 端，按原系统还原」，不得自动增加移动适配。

## 静态项目解析

```sh
npm run prototype -- --project examples/prototypes/content --id content-demo --out prototype-output/content-v1
```

首版支持 React JSX/TSX、React Router 的静态 `<Route path element>` 和 `createBrowserRouter/createHashRouter` 对象数组。提取本地导入组件、标题、文本、静态列表、字段、Link/NavLink 以及单一路径的 `navigate('/path')` 点击处理。优先扫描 src，否则扫描项目根；不安装、不导入、不执行目标代码。跳过隐藏目录、依赖、构建目录、测试和符号链接；设置文件、字节和 AST 上限。

字段必填支持裸写 `required` 和布尔字面量 `required={true}` / `required={false}`。其他表达式不会被执行或猜成确定的非必填规则，会记录 `DYNAMIC_REQUIRED` 并要求人工确认。

正文同时提取普通 JSX 文字和字符串字面量表达式，例如 `<p>{'服务条款'}</p>`；混合文字按原顺序拼接，嵌套容器各自提取且不重复。变量、函数调用等动态正文仍进入 `DYNAMIC_UI`，不会执行目标代码。

不能确认的动态路由、条件视图、远程数据、组件 props、第三方组件、提交回调和权限进入 diagnostics。提取出的字段/内容需求来自代码证据，不是原 PRD 的完整性证明。入口、嵌套路由布局和动态状态需要人工核对。项目名称、选择器和领域不会影响解析逻辑。

先由用户正常启动可信应用，再运行隔离 Chromium 采集：

```sh
npx playwright install chromium
npm run capture -- --url http://127.0.0.1:3000/ --page page-id --out prototype-output/capture.json
npm run prototype -- --project path/to/project --captures prototype-output/capture.json --out prototype-output/project-v2
```

`--page` 对应 prototype.json 的页面 ID；`--state` 默认 default，视口可设 `--width 390 --height 844`。采集器创建全新浏览器上下文，只访问给定本机 origin 的 GET/HEAD，阻断外部请求、写请求、WebSocket 和 service worker。不会复用登录态。页面依赖被阻断资源时可能不完整，应查看采集 warning。页面自身的读取请求仍需要开发环境而非生产环境。

采集索引：

```json
{"snapshots":[{"pageId":"page-id","stateId":"default","capture":{"captureVersion":"1.0","id":"runtime","viewport":{},"root":{}},"elementMap":{"semantic-button-id":"captured-node-id"}}]}
```

以上 capture 对象只是结构说明，真实内容由 capture 命令产生。目标元素可使用 `data-prototype-id="semantic-button-id"` 自动建立 elementMap，也可根据采集树手工填写。绑定交互的控件缺少映射时拒绝拼接，避免按文案猜错按钮。每个页面状态最多附加一个捕获；可合并多个 snapshots。

Figma 使用捕获几何和可编辑图层替代该状态的模板画面，其余状态沿用语义模板。HTML 仍采用语义模板，不声称逐像素复刻项目。索引随交付保存；最终 spec 内容版本包含采集数据。密码/隐藏字段、data-capture-private 和用户输入值默认排除，SVG 后代同样脱敏。

普通下拉框保留公开的选中项标签，用于还原控件画面；选项或所属 optgroup 标有 `data-capture-private` 时，标签留空且 `valueCaptured` 为 false。显式开启输入值采集也不能越过隐私标记，采集过程不会修改源页面。

## 受控 Figma 证据输入（第一阶段）

`prototype/inputs/figma-evidence.mjs` 提供独立的 `loadFigmaEvidence(file, options)`，目录由 `prototype/core/design-catalog.mjs` 的 `validateDesignCatalog(catalog)` 校验。此入口不接入现有 `loadDocument()`、CLI 或 renderer，不把设计目录当作 `PrototypeSpec` 或业务路由。

输入是 UTF-8 JSON，`schemaVersion` 必须为 `DesignEvidence1.0`，总大小不超过 10 MiB。只读取调用方指定的这一个文件，拒绝文件或中间目录符号链接、越界路径、非普通文件及读取期间发生变化的文件。必须显式传入输入根目录和两个独立摘要：

```js
import { loadFigmaEvidence } from './prototype/inputs/figma-evidence.mjs';

export async function inspectDesignEvidence(file, trustedAnchors) {
  const { evidence, integrity } = await loadFigmaEvidence(file, {
    inputRoot: trustedAnchors.inputRoot,
    expectedEvidenceHash: trustedAnchors.expectedEvidenceHash,
    expectedSourceHash: trustedAnchors.expectedSourceHash,
  });
  return {
    integrity,
    pageCount: evidence.catalog.pages.length,
    catalogCount: evidence.catalog.entries.length,
    nodeCount: evidence.nodeEvidence.length,
    diagnostics: evidence.diagnostics,
  };
}
```

`expectedEvidenceHash` 校验实际 JSON 文件字节；`expectedSourceHash` 必须等于 JSON 的 `sourceHash`，用于绑定原设计快照。两个值应来自调用方已信任的记录，不能拿待验证文件自报的摘要代替独立锚点。摘要一致证明字节一致，不证明文件来源真实、设计语义正确或云端内容仍相同。

契约包含以下顶层字段，未知字段一律拒绝：

- `source`：`kind`（`figma-export`、`figma-plugin` 或 `manual`）、`fileKey`、`name`、`capturedAt`，以及可选 `revision`；`sourceHash` 单独保存原快照 SHA-256。
- `catalog.pages`：`id/sourceNodeId/name/internalOnly`；`catalog.entries`：`id/sourceNodeId/pageId/parentId/name/role/independentBoard/hidden`，以及可选 `boardKind/manuscript/variant/state/evidenceText`。父级为空或对应同页目录条目；组织页 ID 作为父级时规范化为空。`role` 为 screen、section、module、component、asset 或 annotation。同名异 ID 画板分别保留。
- `nodeEvidence`：节点身份、页面、父级、原生类型、名称，以及可选文字、几何、可见性、透明度。可选 `readback` 仅保存 PluginAPI 读取版本、文件身份、完整性标记和摘要，不把这个引用当作已经导入完整视觉字段。
- `componentEvidence`：`state-group` 的成员、`component` 的变体值和所属组、`instance` 的 master 引用。`RESOLVED` 引用必须存在；原本缺失的 master 用 `UNRESOLVED/rawTarget` 保留。验证包含关系及实例依赖环，不展开整个虚拟实例树。
- `interactionEvidence`：每次出现使用独立 `id`；`nativeInteractionId` 可重复，仅用于溯源。`kind` 区分 native、override、annotation、inferred，`scope` 区分 component、business、unresolved。保存可选 `event/effect/target/deleted/text/recordPath/delayMs`；不从文字或 partial override 补造动作。原生组件切换不能声明为业务导航，也不能指向任意文字或框架节点。
- `assetIndex`：资源 ID、来源 key、受控相对路径、SHA-256、MIME、字节数及像素尺寸。路径只使用 `/`，拒绝绝对路径、盘符、UNC、ADS、反斜杠、空片段及 `.`/`..`。本阶段只校验索引，**不读取图片**，不宣称文件存在、MIME 签名或内容摘要已验证。
- `diagnostics`：保留明确 code、severity、message、可选来源 evidenceId 及 NOT_VERIFIED/UNRESOLVED 状态。缺失目标、实例补丁、推断行为和缺失 timeout 均进入诊断；不拿动画时长充当触发延时。

上限为 1,000 个组织页、25,000 个目录条目、25,000 个节点、25,000 条组件证据、30,000 条交互出现、2,000 项资源及 10,000 条诊断。字段和引用校验通过，只能证明受控证据契约成立，不能证明双端生成或业务流程通过验收。源文案、脚本、命令或外链字符串全部作为数据保留，不执行、不打开、不上传。

## 单节点 PluginAPI 只读补证

原有 `figma_scope_read_node({ targetNodeId })` 保持可用。需要原生视觉字段时可显式增加 `evidence`：

```json
{
  "targetNodeId": "1:2",
  "evidence": {
    "fields": ["geometry", "text", "paints", "mask", "layout", "component", "children"],
    "readScope": { "fileIdentity": "trusted-file-identity", "pageId": "1:1", "rootNodeId": "1:2" },
    "childOffset": 0,
    "childLimit": 100,
    "segmentOffset": 0,
    "segmentLimit": 100
  }
}
```

以上是合成参数说明，真实身份及节点必须在连接后从已核准的范围取得。`fields` 只能选 geometry、vectorPaths、text、paints、mask、layout、component、children，不能重复。offset 为 0–25,000，limit 为 1–1,000。一次只读一个节点，不加载所有页面、不切换当前页、不递归读取 master、不下载图片或字体；范围外 master 只返回引用及最小所需读范围，留待另行核准。

读取前后均检查文件身份、连接和实际节点范围。非当前页返回 `NOT_VERIFIED_INACTIVE_PAGE`；mixed、getter 失败、未知 paint/mask/layout、超预算等保留有名的未验证状态，失败时不回传原始错误文本。不得将 `status: VERIFIED` 单独视为完整：同一字段还须 `complete: true`，所有 `propertyStatus/styleFieldStatus` 也须完整。

`text` 返回实际 `getStyledTextSegments()` 的 UTF-16 start/end/characters 和选定样式，mixed 整段字体不覆盖实际范围样式。children 和文字范围分页均有 total/offset/nextOffset；后续页使用相同 `snapshotHash` 才能合并。单页 `complete: false` 不等于整次读取失败，也不代表全部内容已取得。字段记录（包含摘要及元数据）限制 512 KiB，完整响应限制 7 MiB；超限拒绝，不截断后冒充完整。

响应的 `source/readVersion/fileIdentity/nodeId/readScope/fields/sha256` 用于溯源。字段 `sha256` 绑定当前 value，分页 `snapshotHash` 绑定完整源集合，顶层 `sha256` 绑定不含自身摘要的整个响应。这些证据必须在本地导出时附入受控清单或摘要引用，不能根据未解析的 `.fig` blob 猜造。此读取路径没有 setter、pluginData 写入或生成操作；本地 API double 通过仍不能替代真实插件补证。

仓库中的可复现检查入口：

```powershell
npm run test:prototype
npm test
npm run check:bundle
```

这些入口只运行当前 checkout 已包含的测试。此次提交仅允许既有 `design-batch-schema.test.mjs` 契约测试随功能更新，其余新增或修改的测试和夹具留在本地；因此上述命令本身不证明离线证据导入和原生补证的新增定向用例已执行。补充测试的精确文件、输入与结果记录在本地验证报告中，与干净候选结果分开。`npm test` 会触发桥接 `pretest` 并重新生成插件，提交候选应在隔离目录运行。真实 PluginAPI 字段、字体和完整源场景仍须另行验证。
