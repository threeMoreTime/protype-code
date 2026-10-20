# React 项目与运行采集

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
