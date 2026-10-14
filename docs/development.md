# 测试与文档维护

## 构建事实源

桥接工作目录为 `.research/local-figma-bridge-poc`，使用 npm 与现有 `package-lock.json`。

```powershell
npm ci --ignore-scripts
npm run build:plugin
npm test
npm run doctor
```

`npm test` 的 pretest 会重建插件。`plugin/design-runtime.mjs` 和 `design/spec.mjs` 是运行时源文件，`scripts/build-plugin-code.mjs` 将它们打包到 `plugin/code.js` 的标记区；文件其余部分仍为原桥接入口。`scripts/build-plugin-ui.mjs` 更新 UI 的 HMAC 标记区与第三方许可。不要只编辑生成区。

## 验证层次

自动测试覆盖输入校验、采集转换、模拟 Figma API、配对、作用域、归属、审计、重启/超时保护和交付包验证。模拟宿主测试可证明契约与故障行为，不能证明真实字体渲染、SVG 几何、Present 延时或原生文件回导。

行为变更优先运行相关 `node --test tests/<name>.test.mjs`，整合完成后运行 `npm test`。没有 lint/typecheck 脚本；不要在报告中将不存在的检查列为通过。

实机结果须记录 source revision、runId、specId、文件身份、时间、结构审计、视觉证据和观察步骤。一次运行的 PASS 只覆盖其列出的案例。缺失证据使用 NOT_RUN，失败为 FAIL，不能用旧交付或合成夹具补齐实机结果。

## 文档体系维护

面向使用者的步骤放在 `guide/`；字段、错误边界放在 `reference/`；模块依赖与不明显决策放在 `architecture/`；一次性测试结果放在 `verification/`。当前入口为 [index.md](index.md)。

代码、配置或命令改变时，先列出受影响文档与代码证据，再在授权范围内同步更新。检查示例字段、命令目录、相对路径、链接、状态词和已知限制。历史研究和验收报告保留原时间范围，不把旧证据改写为新实现的通过记录。

本次文档依据 docs-sync 完成变更映射，并用 docs-editor 做命令、路径和术语核对。删除、归档或合并历史文档属于另一个治理动作，需单独判断其保留价值。

配对凭据、授权记录、用户截图及完整场景放在忽略目录。交付包只包含 manifest 显式列入的证据；发布或分享前仍需检查其内容。


## 通用产品层

根目录 `npm run setup` 安装产品与桥接依赖。`npm test` 运行产品、历史交接及桥接测试；`npm run acceptance` 执行三个行业样例并生成结构摘要。`npm run test:browser` 单独验收真实浏览器交互（先安装 Chromium）。新增渲染器的三个样例也经过 Figma API 替身 apply/audit；真实 Figma 仍需独立验收。详见 [当前验收](prototype/acceptance.md)。
