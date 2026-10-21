# 通用原型生成首版验收（2026-10-14）

以下首版记录属于历史快照。1.1 的执行方法与证据边界见本页 Task 5；原生验收记录按各自日期阅读。旧测试数量、环境版本和历史 Figma 状态不代表当前运行结果。

目标：从不同业务的 PRD 或 React 项目得到同一通用定义，生成可编辑 Figma 节点输入和离线交互 HTML；更新时保护人工修改。基于 dev 的 `05f508a4ac03651ee366f6d41c4048206e691334` 开发。

## 跨项目结果

| 场景 | 输入 | 映射需求 | 页面/状态 | 交互 | 原生可编辑节点 |
| --- | --- | --- | --- | --- | --- |
| 团队成员管理 | 仅 Markdown PRD | 18/18 | 2/5 | 7 | 61 |
| 移动场地预约 | 仅 Markdown PRD | 22/22 | 3/7 | 8 | 74 |
| 社区内容展示 | React TSX 项目 | 12/12 | 3/3 | 4 | 27 |

`npm run acceptance` 可重复验证模型引用、映射、节点类型和 ZIP 哈希，[acceptance.json](acceptance.json) 保存机器结果。React 的 12 条“需求”是从代码提取的界面证据，不能替代项目原始 PRD 的覆盖评审。

READY_FOR_REVIEW 表示结构可进入人工评审。空、失败、加载等未在主路径触发的状态列在 unreachableStates，可通过 HTML 状态检查器或 Figma 画布直接检查；未把它们伪装成真实异步业务流程。人工修正量没有开展用户研究，记录为 NOT_MEASURED。

## 首版验证记录

| 检查 | 本地结果 | 证明范围 |
| --- | --- | --- |
| 产品层自动化 | 25/25 | 模型、解析、输入边界、编译、三方合并、真实 CLI、打包、回归 |
| 历史交接脚本 | 18/18 | 既有人工交接流程保持兼容 |
| 现有桥接测试 | 441/441 | 授权、范围、原生 API 契约与恢复语义等旧功能回归 |
| Chromium 浏览器 | 5/5 | 实际采集、表单校验、移动预约、内容导航、恶意文本和计时器 |
| 三领域 Figma API 替身 | 3/3，计入产品层 | 每份新生成 spec 完成 plan/apply/audit，修改文字后写入被 USER_EDIT_CONFLICT 阻止 |
| 插件构建同步 | PASS | 已提交 bundle 与源码一致 |
| npm audit（产品/桥接） | 均 0 项漏洞 | 本次运行时 npm 公告结果，不作未来保证 |
| 真实 Figma 桌面端 | NOT_RUN | 字体、Present、原生 .fig 导出/回导尚未在真实宿主验证 |

执行环境 Node 24.19.0。Playwright 默认 Chromium 下载端点在本环境返回损坏压缩包；改用本地 Chromium 143.0.7499.0，通过 PROTOTYPE_CHROMIUM_EXECUTABLE 运行相同测试。初次截图发现测试环境没有中文字体；补装本地 Noto Sans SC 字体子集后重新检查桌面和移动截图，文字正常，无水平溢出。浏览器、字体和测试截图不进入源码提交。

完整命令：

```sh
npm run setup
npm run check:bundle
npm test
npm run acceptance
npx playwright install chromium
npm run test:browser
npm audit
npm --prefix .research/local-figma-bridge-poc audit
```

## Task 5：1.1 交付、增量与预算验收

执行本轮命令并读取当次结果，不沿用首版统计：

```powershell
npm run test:prototype
npm run acceptance
npm run test:browser
npm test
npm run check:bundle
```

上述入口只运行当前 checkout 中已入库的测试。此次仅允许既有 `design-batch-schema.test.mjs` 契约测试随功能更新，其余新增或修改的测试和夹具留在本地；新增 1.1 交付、场景合并、预算及浏览器定向用例须在本地验证报告中另列精确命令与结果，不能由上述入口通过推断已覆盖。`npm test` 的桥接 `pretest` 会生成插件，候选检查应在隔离目录执行，并复核生成物没有额外变化。

`npm run acceptance` 默认验证 admin、mobile、content 三份 1.0 示例。1.1 验收须显式提供输入，可用 `node scripts/verify-prototype.mjs --input <1.1.json> [--packages | --plan-only]` 检查单包、集合或计划的本地交付契约；生产验收脚本不加载测试夹具。`--out <新报告.json>` 使用排他写入；不覆盖已有报告。任何合成输入的本地检查通过都不能证明学练平台源稿已还原。

单包检查必须包括路径、大小写碰撞、manifest 文件精确覆盖、逐文件 bytes/SHA-256、ZIP CRC 和精确内容、资源引用/真实字节/去重、logical spec 与 envelope 预算。集合还须检查根文件清单、每个独立 ZIP 的哈希、完整最小连通闭包、没有跨包断线、分包 lineage 与暂存总量。BLOCKED 包必须有闭包和原因，不能残留被当作可交付的 HTML/spec/archive。相连流程在资源分段后仍超限时停止，不通过进一步切开流程制造 PASS。

1.1 生成包必须保留 DesignSpec；只有明确的 PLAN_ONLY、无生成文件且全部场景有未决原因时才允许省略。场景校验绑定模型投影、物化输入树、原生 viewport 根和实际资源；spec 的 PASS 表示 schema 校验。校验器不逐节点重编译比对 HTML/DesignSpec，不证明两端渲染或 reaction 完全等价。独立 DesignSpec 没有产品模型时，资产检查只记录 TRANSPORT_INTEGRITY_ONLY。

1.1 coverage 始终 NEEDS_REVIEW，分别记录 inventory、visualGeneration、dualInteractionCapability、automaticTests、realFigma 和 humanDifferences。完整条目映射不代表视觉生成；编译能力不代表浏览器执行；真实 Figma 未运行保留 NOT_RUN，人工差异未检查保留 NOT_MEASURED。自动测试结果在当次运行日志中记录，生成器不把自己的产物自动标为测试 PASS。

学练平台全量受控目录为 4109 项、169 个独立画板、58 个 screen（22 PC / 36 H5）。58 screen 可分别建立合法元数据闭包，累计声明 110011 节点，不能并作一个 ≤25000 节点模型。最终清单应逐项回溯源 ID 与分类证据，并登记未收齐视觉输入的 UNRESOLVED；不会把 4 场景样本扩展宣称为全量视觉产物。manuscript 缺失、未确认方案命名和缺失业务目标分别保留未决。

报告需区分 SOURCE / MODEL / LOCAL TEST / BROWSER / FIGMA AUDIT / FIGMA PRESENT / ROUND-TRIP。Task 3 的字体、mask、跨范围 master 与完整视觉输入门禁保持有效；Task 5 的结构/预算/增量测试不解除它。真实 Figma 写入、Present、导出和独立回导属于后续经具体目标授权的验收，不是本阶段自动步骤。

## 增量与输入回归

单条文案需求变化只改变关联页面分片和对应节点，其他页面字节、摘要和节点定义保持一致。自动合并保留人工修改的不同属性；同属性、删除/编辑和竞争排序先报告冲突。CLI 冲突退出 2，不生成 index.html/design-spec.json；选择 edited/generated 后可完成交付。最新生成基线与合并后的人工版本分别保留。

新增审计修复使用合法约 4 MiB PNG 检验 Base64 双路径，验证 SVG 私密后代和选中私密根的处理。React 回归覆盖目标代码不执行、文件和 src 目录符号链接不越界、动态路由不猜测、真正的 useNavigate 导航与同名普通函数区分、用户控件 ID 与内部节点不相撞。DOCX/HTML 测试覆盖中文文本、原文件摘要、脚本剔除、非法 ZIP 和 DTD 拒绝。

## 合并后审计修复验收（2026-10-14）

基于合并提交 `cbfd50aa04bdec0ef0802645d9336750862167d5` 修复五项问题：下拉选中项绕过隐私标记、空流程 HTML 白屏、HTML 容器正文遗漏、React 必填布尔值错误、React 字符串表达式正文遗漏。

- 产品层 30/30、历史交接 18/18、桥接 441/441，共 489 项自动化通过。
- Chromium 浏览器 9/9 通过；新增覆盖私密 option/optgroup 与输入值开关、空流程入口和未知链接恢复、React 字段原生校验、字符串正文实际可见。
- HTML 输入新增嵌套容器、内联文本、换行、表格去重及未识别正文保留测试；动态 required 和动态正文仍明确要求人工确认。
- 三领域验收结果与首版一致，插件构建同步检查通过；三方合并保留人工编辑及冲突保护的既有回归继续通过。

本轮浏览器使用 Chromium 143.0.7499.0，验证交互及文本内容；未新增中文字体视觉验收或真实 Figma 桌面验收。上述修复不扩大支持的框架范围。

## 已知边界

- 确定性 PRD 提取规则需要明确页面和动作；任意自由散文、PDF/OCR、完整表格语义、更多技术栈尚未实现。
- React 静态展开不复现数据请求、权限、复杂条件和组件 props；需运行证据或人工补充。
- HTML 是语义模板与模拟表单，运行采集主要补充 Figma 几何；两者都不提供后台。
- 按页增量和三方合并针对 PrototypeSpec。聚合 HTML/DesignSpec 重新打包；不会自动回灌或覆盖 Figma 人工作品，FigmaLiveUpdate 为 NOT_APPLIED。
- 字体、视觉忠实度和真实宿主中的交互仍须最终人工验收。未将历史单项目的 PASS 移用到本版。
