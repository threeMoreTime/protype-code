# Repository Guidelines

## 项目结构与模块职责

- `prototype/` 为产品流水线：`inputs/` 解析 PRD、React 项目和采集结果；`core/` 负责校验、稳定 ID、需求映射和合并；`renderers/` 输出 HTML 与 Figma DesignSpec。
- `.research/local-figma-bridge-poc/` 为独立 npm 包，包含 Figma 桥接、插件、采集适配器及历史测试。修改时须保持授权和节点归属边界。
- `tests/prototype/` 存放产品测试及测试数据，其下的 `browser/` 存放 Playwright 用例。`examples/prototypes/` 提供示例输入，`design/` 存放设计资源，`docs/` 记录架构和操作流程。

## 转换前的端型确认

- 每个目标项目先扫描并汇报原系统实际支持的端型及证据；无法确认时标为未知。框架名称、默认模板尺寸、viewport 标签或单独存在的媒体查询都不能证明移动端已受支持。
- 扫描后必须询问用户：「本次项目要做 PC 端、移动端，还是两端都要？」将原系统支持范围与本次用户选择分别记录，不把其他项目或前期调研的选择自动沿用。
- 未获得当前项目的明确选择前，只继续必要的只读分析，不生成端型专属 HTML、设计规格或 Figma 页面，也不默认两端。当前项目已明确确认的选择直接复用，无须重复询问。
- 原系统不支持的端型属于新增适配；须说明差异并取得用户明确要求，再设计和生成，不得当作原系统还原结果。
- HTML 生成、采集视口、DesignSpec、Figma 写入和验收必须使用同一本次确认范围。CLI 端型参数只记录调用选择，不代替用户确认。
- 本次客服后台「工单管理 → 反馈列表」原系统仅支持 PC；用户在扫描后已明确选择「仅 PC 端，按原系统还原」。本次不生成或写入移动适配，无须重复询问这一已确认选择。

## 构建、测试与开发命令

使用 Node.js 22.18+ 和 npm。除特别说明外，均在仓库根目录执行。

- `npm run setup`：按锁文件安装两个包的依赖并构建插件。
- `npm run prototype -- --input examples/prototypes/admin/requirements.md --id admin-demo --out prototype-output/admin-v1`：生成评审产物，在本地打开输出目录的 `index.html`。
- `npm test`：运行产品、交接工具和桥接测试。
- `npm run check:bundle`：检查插件运行时代码的生成结果是否过期。
- `npm run acceptance`：校验示例结构、引用、需求映射及 ZIP 哈希。
- 先运行 `npx playwright install chromium`，再运行 `npm run test:browser`：执行浏览器交互测试。
- `npm --prefix .research/local-figma-bridge-poc run build:plugin`：修改插件源文件后重新生成打包产物。

## 编码风格与命名约定

运行时代码使用原生 ESM 和 `.mjs` 文件，导入路径显式携带扩展名。遵循相邻代码风格：两个空格缩进、单引号、分号，函数和变量使用 camelCase，文件名使用小写字母并以连字符分隔。当前未配置 lint、格式化或类型检查脚本。插件应修改源文件，再重新生成打包区域。保持输入解析、模型逻辑、渲染和桥接权限的职责分离。

## 测试规范

测试使用 `node:test` 和 `node:assert/strict`，文件命名为 `*.test.mjs`，用例名称应说明验证行为。先用 `node --test tests/prototype/prd.test.mjs` 等命令验证相关用例，再执行适用的 CI 检查。浏览器测试串行运行。当前未设置代码覆盖率数值门槛，`coverage.json` 用于需求追踪。自动测试通过不能代替真实 Figma 验收。

## 提交与 Pull Request 规范

提交统一遵守 [提交规范](docs/commit-conventions.md)，在 `dev` 上使用 `<type>(<scope>): 中文说明`，标题不超过 72 个字符，每个提交表达一个完整意图。正文说明原因、行为和兼容性，验证结果单独记录，不写入提交消息。生成源与对应产物保持一致，按精确文件或修改块保护已有工作。

未经用户明确授权，不执行暂存、提交、分支或推送；不得绕过已配置的检查。本仓库目前未配置提交信息自动校验，须按规范人工复核，不将 ArchiveLens 的工具配置当作已经启用。PR 标题、中文描述、截图及压缩合并要求见同一规范。

## 安全与配置

凭据、授权记录和私有采集数据放在已忽略的 `.local/`。不得提交 `prototype-output/` 或 `test-results/`。写入 Figma 前须获得明确授权，并遵守文件、页面和根节点的作用域限制。保护已有工作，仅在明确请求后执行提交、推送或发布。
