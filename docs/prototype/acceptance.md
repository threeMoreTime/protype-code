# 通用原型生成首版验收（2026-10-14）

目标：从不同业务的 PRD 或 React 项目得到同一通用定义，生成可编辑 Figma 节点输入和离线交互 HTML；更新时保护人工修改。基于 dev 的 `05f508a4ac03651ee366f6d41c4048206e691334` 开发。

## 跨项目结果

| 场景 | 输入 | 映射需求 | 页面/状态 | 交互 | 原生可编辑节点 |
| --- | --- | --- | --- | --- | --- |
| 团队成员管理 | 仅 Markdown PRD | 18/18 | 2/5 | 7 | 61 |
| 移动场地预约 | 仅 Markdown PRD | 22/22 | 3/7 | 8 | 74 |
| 社区内容展示 | React TSX 项目 | 12/12 | 3/3 | 4 | 27 |

`npm run acceptance` 可重复验证模型引用、映射、节点类型和 ZIP 哈希，[acceptance.json](acceptance.json) 保存机器结果。React 的 12 条“需求”是从代码提取的界面证据，不能替代项目原始 PRD 的覆盖评审。

READY_FOR_REVIEW 表示结构可进入人工评审。空、失败、加载等未在主路径触发的状态列在 unreachableStates，可通过 HTML 状态检查器或 Figma 画布直接检查；未把它们伪装成真实异步业务流程。人工修正量没有开展用户研究，记录为 NOT_MEASURED。

## 验证记录

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

## 增量与输入回归

单条文案需求变化只改变关联页面分片和对应节点，其他页面字节、摘要和节点定义保持一致。自动合并保留人工修改的不同属性；同属性、删除/编辑和竞争排序先报告冲突。CLI 冲突退出 2，不生成 index.html/design-spec.json；选择 edited/generated 后可完成交付。最新生成基线与合并后的人工版本分别保留。

新增审计修复使用合法约 4 MiB PNG 检验 Base64 双路径，验证 SVG 私密后代和选中私密根的处理。React 回归覆盖目标代码不执行、文件和 src 目录符号链接不越界、动态路由不猜测、真正的 useNavigate 导航与同名普通函数区分、用户控件 ID 与内部节点不相撞。DOCX/HTML 测试覆盖中文文本、原文件摘要、脚本剔除、非法 ZIP 和 DTD 拒绝。

## 已知边界

- 确定性 PRD 提取规则需要明确页面和动作；任意自由散文、PDF/OCR、完整表格语义、更多技术栈尚未实现。
- React 静态展开不复现数据请求、权限、复杂条件和组件 props；需运行证据或人工补充。
- HTML 是语义模板与模拟表单，运行采集主要补充 Figma 几何；两者都不提供后台。
- 按页增量和三方合并针对 PrototypeSpec。聚合 HTML/DesignSpec 重新打包；不会自动回灌或覆盖 Figma 人工作品，FigmaLiveUpdate 为 NOT_APPLIED。
- 字体、视觉忠实度和真实宿主中的交互仍须最终人工验收。未将历史单项目的 PASS 移用到本版。
