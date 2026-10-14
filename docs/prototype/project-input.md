# React 项目与运行采集

```sh
npm run prototype -- --project examples/prototypes/content --id content-demo --out prototype-output/content-v1
```

首版支持 React JSX/TSX、React Router 的静态 `<Route path element>` 和 `createBrowserRouter/createHashRouter` 对象数组。提取本地导入组件、标题、文本、静态列表、字段、Link/NavLink 以及单一路径的 `navigate('/path')` 点击处理。优先扫描 src，否则扫描项目根；不安装、不导入、不执行目标代码。跳过隐藏目录、依赖、构建目录、测试和符号链接；设置文件、字节和 AST 上限。

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
