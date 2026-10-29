# 单菜单隐私与双输出验证

本入口复用快捷回复菜单，以本地 JSON 数据证据验证自动 mock、列表查询、详情、编辑校验、保存以及桌面/移动 DesignSpec。它是有界验证入口，不是任意网站抓取器，也不自动读取登录浏览器。

## 运行

在仓库根目录执行，输出目录必须是新目录：

```powershell
npm run prototype:menu -- --input examples/prototypes/menu-probe/source.json --out prototype-output/menu-probe-v1
```

用浏览器打开输出目录的 `index.html`。它通过现有 CSP 禁止联网，可直接以文件方式运行；切换端型即可检查桌面与移动布局。

输出包括：

- `index.html`：单个菜单的离线业务原型。
- `demo-data.json`：只含重新生成的 mock 数据及运行必要的合成关联记录。
- `privacy-report.json`：处理策略、计数和未验证范围，不含源值、原始 ID 映射或原始数据摘要。
- `figma/desktop.design-spec.json` 和 `figma/mobile.design-spec.json`：供现有桥接消费的原生设计规格，不是 `.fig` 文件。

不生成 ZIP，不自动安装依赖、启动外部服务、连接真实接口或写入 Figma。

## 输入边界

输入为 `groups` 和 `replies` 数组。例如：

```json
{
  "groups": [{ "id": "source-group-1", "name": "源分组名称" }],
  "replies": [{
    "id": "source-reply-1",
    "groupId": "source-group-1",
    "name": "源名称",
    "content": "源内容",
    "pinned": true
  }]
}
```

预处理仅利用原始 ID 在本地匹配关联，重新生成 mock ID、名称与内容，保留记录数量、分组关系和 `pinned` 状态。源文字、translations、图片、额外字段、凭据和源 ID 不传入渲染器或报告；输入对象保持不变。重复 ID、悬空关系、不支持的数据类型和超预算输入会拒绝，CLI 错误只输出固定代码。

这是针对已知菜单模型的白名单重新生成，不是任意文本或图片的敏感信息识别。对另一种网页/数据模型，需要先建立其独立输入适配器，不能把此入口套在未审查的原始 DOM 或 HAR 上宣称已脱敏。模型只能读取预处理后的产物，不应先把真实输入文件内容展示给模型再要求替换。

本次示例中的 `CANARY`、邮箱和凭据样式字段都是合成标记，用来检测是否有源信息越过边界。没有使用真实账号或客户数据。

## 两种输出的含义

HTML 使用现有有状态运行时，检查必填、更新记录并同步列表与详情。浏览器验收会在保存前后读回数据，验证非法提交不修改数据、合法保存增加版本，同时检查无外部 HTTP 请求和脚本错误。

Figma 的 `validationScenarios: true` 为有必填字段的表单新增独立的必填缺失与错误示意场景。其 flow 名称明确包含“必填校验示意”：缺失场景提交到错误画面，再返回修正后的正常表单，最后到成功画面。它展示声明路径，不执行文本输入、动态校验或数据更新。既有业务套件默认不启用这些新增场景。

两端沿用现有 business renderer；其页面属于演示布局，不据此宣称复刻任意源网站的像素、Auto Layout 或变量体系。高保真网页导入与 PrototypeSpec 1.1 接入仍需独立验证。

## 验证命令与证据边界

```powershell
node --test tests/prototype/mock-menu.test.mjs tests/prototype/menu-probe.test.mjs tests/prototype/business-figma.test.mjs
node --test --test-concurrency=1 tests/prototype/browser/menu-probe.test.mjs
npm run test:prototype
npm run test:browser
npm run check:bundle
```

测试明确区分纯数据/结构校验、真实 Chromium 行为和 Figma API double。生成器不会自动把测试状态标为 PASS；报告中的 browser、realFigma、visualComparison 保持 NOT RUN，实际测试结果由当次执行日志提供。

Figma 网页导入、字体与图片效果、Present、原生 `.fig` 保存/回导均需要明确目标文件与另一次真实验收，不由 API double 的成功代替。没有接入真实网站、登录会话、整站菜单发现或自动图片脱敏。

## 2026-10-26 本地验证记录

- PASS：定向测试 15/15；产品测试 45/45；完整 `npm test`（桥接测试 441/441）；浏览器测试 11/11。
- PASS：桌面 1440px、移动 390px 的查询、详情、必填阻止、保存后数据与版本读回；输出与采集结果未含合成隐私标记；未观察到外部 HTTP 请求、脚本错误或横向溢出。
- PASS：`npm run acceptance` 和 `npm run check:bundle`。后者初始因生成区域换行差异失败，现有 pretest 重建后通过；插件生成物在工作区显示换行变更，`git diff` 没有文本内容差异。
- PASS：独立只读代码审查；空输入、仅分组及数量上限补测；既有 Figma 默认输出的 18 组应用/端型/语言组合与 HEAD 一致。
- NOT RUN：真实 Figma 导入及 Present、原生文件保存/回导、源站像素比较、真实登录及菜单采集。

本次生成的五个文件位于已忽略的 `prototype-output/menu-probe-20261026/`；实际运行记录与生成器报告分开，生成器不会把本次测试结论套到今后的输入上。
