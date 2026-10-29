# 反馈列表的源码复用原型

本入口使用客服后台实际的 `src/pages/workOrder/workOrderList` 及其直接依赖，生成本地可运行的 HTML。它对应「工单管理 → 反馈列表」，路由为 `#/workOrder/workOrderList`。原页面的表格、查询表单、详情、聊天记录、指派、批量回复和动态表单通过真实组件执行；页面外壳单独实现，避免启动原应用的路由发现、登录和网络初始化。

本次扫描后用户已明确选择「仅 PC 端，按原系统还原」。原系统支持范围与本次选择须分别记录；这里的 `--device desktop` 只记录调用选择，不代替用户确认。本入口拒绝移动端及双端参数，不生成移动适配。其他目标项目必须重新扫描并询问端型，不能直接沿用本项目的选择。

## 使用命令

在仓库根目录使用 Node.js 22.18+ 和已安装的仓库依赖。原后台源码目录及其所需依赖也必须已经可用；该命令不安装依赖、不启动原系统、不扫描其他项目。

```powershell
node prototype/feedback-fidelity.mjs --help
node prototype/feedback-fidelity.mjs --source 'C:\path\to\cs_admin-client' --device desktop --out prototype-output/feedback-source-pc-new
```

将示例的 `--source` 换为实际源码根目录。输出父目录须已存在，输出目录本身必须不存在；需要时先在本仓库内创建 `prototype-output`。成功后用浏览器打开新目录内的 `index.html`。命令只输出两个文件：

- `index.html`：包含脚本、样式及需要的内嵌资源，不依赖原站接口。
- `build-report.json`：构建模式、来源模块、文件哈希及未执行的验收项。

不会生成 ZIP、截图、DesignSpec 或 Figma 文件，也不会覆盖既有输出。需要更新时指定另一个新目录。此入口不改变旧的 `feedback-reference` 命令或其历史产物。

全部参数先校验，再加载构建器和读取源码。常见错误为固定代码，不回显输入值：

- `FIDELITY_DEVICE_CONFIRMATION_REQUIRED`：缺少显式端型选择。
- `FIDELITY_DESKTOP_ONLY`：端型不是 `desktop`，或缺少 `--device` 的值。
- `FIDELITY_SOURCE_REQUIRED` / `FIDELITY_OUTPUT_REQUIRED`：缺少源码或输出目录参数。
- `FIDELITY_ARGUMENTS_INVALID`：未知、重复、位置参数或其他非法参数。
- `FIDELITY_SOURCE_UNAVAILABLE`：源码路径或构建入口无法访问；检查 `--source` 是否为完整后台源码根目录。
- `FIDELITY_OUTPUT_EXISTS`：输出已存在，保持原文件并停止。
- `FIDELITY_OUTPUT_OUTSIDE_WORKSPACE`：输出超出本仓库。
- `FIDELITY_STYLE_TOOLCHAIN_UNAVAILABLE` / `FIDELITY_IMPORT_UNRESOLVED`：当前源码依赖缺失或结构与适配目标不同。

## 当前源码与依赖边界

此适配器针对本次实际 `cs_admin-client` 页面闭包，不是任意 React 项目的通用转换器。已编译核对的源码依赖包括 React 18.2、Ant Design 5.7.3、Pro Components 2.8.10、Ant Design Icons 5.6.1，以及详情使用的 `antd-mobile` 组件。后者是原 PC 详情的内部依赖，不代表生成了移动端。

构建复用原源码已安装的依赖，使用本仓库现有 esbuild。原 `App.less` 通过已安装的 Less 编译器处理；Tailwind 3.4.14 仅扫描本次实际组件闭包及独立入口。源码 Tailwind 配置只提取支持的静态数据，不执行配置文件。依赖升级、缺失或页面结构变化可能需要重新适配，不应仅凭本次构建记录推断未来版本可用。

构建器不导入原 `App`、应用入口、Rsbuild 配置、动态路由注册或环境文件，不注入原应用环境变量。未知或禁止的导入、运行时环境访问及直接网络调用会拒绝构建。诊断只报告固定错误；出现拒绝时应审查必要依赖，不能通过放开整个原应用初始化来绕过边界。

## Mock 与隐私

原服务适配与数据标准化继续复用，`@monorepo/network` 和 `@monorepo/utils` 在模块边界替换为本地实现。所有业务响应来自新建的合成 fixture；认领、指派、回复、客服状态等只修改当前页面内存，刷新重置。未知 endpoint 明确拒绝，不回退到真实接口。

详情中的敏感图片审核入口连接原图片审核页面组件，以本地 MemoryRouter 保留反馈列表状态并展示审核标签页。该页面原服务涉及鉴权和环境信息，因此在读取之前按精确路径替换为本地 service；图片、任务、日志、审核结果均为合成数据。审核、删除和补录 mock 仅作用于内存，源 UI 没有可见入口的动作不会补造按钮。

## 编译副本中的局部修复

真实交互测试发现四类原源码缺陷。`source-repairs.mjs` 只在内存编译副本中修复，原客服源码不写入：

- 批量回复拒绝纯空格，保留原必填错误文案；捕获表单校验的预期 rejection。
- 回复 API 失败显示错误提示，保留草稿、弹窗和勾选，可重试。
- 从详情前往图片审核时关闭来源抽屉，防止旧 portal 在审核结束后遮挡列表。
- 详情沟通记录在请求前即时占用页码，阻止 React 提交间隙重复请求旧页、重复在途请求和末页之后的请求；成功后同步推进游标，失败不推进，允许重试同一页。关闭、切换工单或刷新首屏后，版本隔离继续阻止旧响应回写当前历史记录。

修复具有精确文件与代码形状边界，支持原文件 CRLF；形状变化会以 `FIDELITY_SOURCE_REPAIR_SHAPE_CHANGED` 停止构建。`build-report.json.localUIRepairs` 记录实际使用的修复。不能据此声称原系统本身已经修好。认领请求失败时，原页面 catch 没有错误提示；本地适配仍沿用这一行为，不修改记录、不显示成功提示，并允许重试。

本入口不读取登录浏览器、Cookie、storage、真实接口响应或真实业务记录。它也不是通用脱敏器：若接入的源码自身含有业务样本或敏感常量，须在接入前审查；不能把真实数据放进 fixture，再把「使用了 mock」当作已经脱敏。

输出使用禁止连接的 CSP、精确脚本哈希和样式 nonce；需要的本地静态图片和字体资源会内嵌，合成图片直接使用 data URL。本次页面主要依赖 Windows 系统字体 Segoe UI 与 Microsoft YaHei，没有把系统字体文件打包；其他操作系统的字体回退效果须重新验证。原 AntD 静态提示会建立独立上下文，构建器为可信运行时代码创建的 `style` 元素补同一 nonce。该兼容不会开放 `unsafe-inline` 或真实网络传输。CSP 与运行时拦截属于导出物防护，不能替代输入源码审查。

## 验证与 Figma

下列测试脚本按本次提交范围保留在本地，未纳入版本控制；仅在本机已有这些脚本时执行，干净检出不能直接复现同一组验证。后文的原生 Figma 专项测试命令也遵循此边界。

```powershell
node --test tests/prototype/feedback-fidelity-cli.test.mjs tests/prototype/feedback-fidelity-build.test.mjs tests/prototype/feedback-fidelity-mocks.test.mjs
node --test --test-concurrency=1 tests/prototype/browser/feedback-fidelity.test.mjs tests/prototype/browser/feedback-fidelity-interactions.test.mjs
```

CLI 测试验证端型门槛、参数歧义、帮助、源码不可用和既有输出保护，不反复构建真实源码。构建测试验证离线包、来源边界、样式资源和 nonce；这些通过不能代替实际浏览器流程或真实站点的逐像素对比。

每次构建报告只把构建标记为 `PASS`；浏览器交互、参考页面像素对比及真实 Figma 保留 `NOT RUN`，除非另有对应产物的独立执行证据。源码复用能减少重写组件带来的差异，但不自动证明外壳、字体、数据状态及全部交互已经一比一。

Figma 转换与写入需在这个 HTML 上另行采集、转换和验收，并核实已授权文件、页面及根节点范围。本 CLI 尚不执行这些步骤。旧参考原型的 Figma 页面不能作为本次源码复用结果的验收证据；可编辑图层、组件、变量、Auto Layout、全部原型连线与 Present 行为仍须分别核对，不能宣称全部要求已通过。
