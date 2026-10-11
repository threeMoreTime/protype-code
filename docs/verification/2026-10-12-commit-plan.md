# 2026-10-12 本地改动提交计划

本计划覆盖 `F:/stores/protype-code` 当前未提交改动。建议按五批依次提交；本轮仅制定计划并编写交接文档，没有暂存、提交、推送、切换分支或发布。接手状态与恢复步骤见[交接文档](2026-10-12-handoff.md)。

## 基线与范围

- 分支：`dev`；HEAD：`fc9fac4fd6d5ade828aeb7e9cb9ba96af0487c3c`。
- 编写前冻结清单：67 个文件，15 个已跟踪修改、52 个未跟踪文件；暂存区为空。
- 本轮新增两份文档后共 69 个状态项；现有 `docs/index.md` 只增加入口链接。
- `HEAD...@{upstream}` 对本机缓存引用为 0/0；本轮未 fetch，不能据此声明已与最新远端一致。
- 改动清单及 SHA256 保存在本机 [.local 清单](../../.local/reports/2026-10-12-commit-plan-inventory.json)，分组映射保存在[分组清单](../../.local/reports/2026-10-12-commit-plan-groups.json)。它们不进入 Git，供当前工作目录复核使用。
- 下列路径均相对仓库根目录。`package.json` 是唯一需要跨两批拆分修改块的文件；其他整文件不重叠。

## 提交顺序

1. `feat: 增加界面采集与可编辑设计规格转换`
2. `feat: 增加原生设计交付包验证工具`
3. `feat: 接入可恢复的原生设计生成与审计`
4. `feat: 增加本地启动诊断与持久工作流入口`
5. `docs: 补齐设计流水线文档与交接记录`

第 1、2 批提供第 3 批的依赖，第 3 批提供第 4 批的入口依赖，第 5 批描述集成后的行为。不要在缺少后续文件的中间提交中提前宣称全部实现和验收完成。

## 第 1 批：feat: 增加界面采集与可编辑设计规格转换

采集 CLI、归档适配器、资源提取和文字适配依赖同批 DesignSpec；规格测试还读取两尺寸示例，因此一起纳入。该批不连接真实 Figma。

21 个整文件：

```text
.research/local-figma-bridge-poc/capture/adapter.mjs
.research/local-figma-bridge-poc/capture/archive-html.mjs
.research/local-figma-bridge-poc/capture/cli.mjs
.research/local-figma-bridge-poc/capture/dom-capture.mjs
.research/local-figma-bridge-poc/capture/inline-text.mjs
.research/local-figma-bridge-poc/capture/linear-gradient.mjs
.research/local-figma-bridge-poc/capture/svg.mjs
.research/local-figma-bridge-poc/design/spec.mjs
.research/local-figma-bridge-poc/design/enrich.mjs
.research/local-figma-bridge-poc/design/text-fit.mjs
.research/local-figma-bridge-poc/examples/two-size-prototype.json
.research/local-figma-bridge-poc/tests/archive-native-controls.test.mjs
.research/local-figma-bridge-poc/tests/archive-paint-order.test.mjs
.research/local-figma-bridge-poc/tests/capture.test.mjs
.research/local-figma-bridge-poc/tests/design-spec.test.mjs
.research/local-figma-bridge-poc/tests/enrich.test.mjs
.research/local-figma-bridge-poc/tests/gradient.test.mjs
.research/local-figma-bridge-poc/tests/inline-text.test.mjs
.research/local-figma-bridge-poc/tests/native-controls.test.mjs
.research/local-figma-bridge-poc/tests/paint-order.test.mjs
.research/local-figma-bridge-poc/tests/text-fit.test.mjs
```

验证要求：在桥接目录直接运行本批列出的 10 个 tests/*.test.mjs；不需要启动 Figma。另检查示例能通过 DesignSpec 校验。

## 第 2 批：feat: 增加原生设计交付包验证工具

PNG/ZIP 处理、证据校验器、调用脚本和测试同批纳入。MCP 后续会导入 PNG 模块，因此本批必须先于第 3 批。当前可直接调用脚本，npm 命令入口在第 4 批加入。

6 个整文件：

```text
.research/local-figma-bridge-poc/delivery/manifest.example.json
.research/local-figma-bridge-poc/delivery/png.mjs
.research/local-figma-bridge-poc/delivery/verify.mjs
.research/local-figma-bridge-poc/delivery/zip.mjs
.research/local-figma-bridge-poc/scripts/verify-delivery.mjs
.research/local-figma-bridge-poc/tests/delivery.test.mjs
```

验证要求：在桥接目录运行 node --test tests/delivery.test.mjs。测试夹具通过不等于真实 .fig 回导通过。

## 第 3 批：feat: 接入可恢复的原生设计生成与审计

依赖第 1、2 批。MCP 导入 commands、timeout 和 PNG 模块；原生运行时依赖 DesignSpec。生成源、打包器、插件入口、协议和授权动作一起纳入，不能只提交生成结果。

19 个整文件，另有 package.json 的部分修改：

```text
.research/local-figma-bridge-poc/design/audit.mjs
.research/local-figma-bridge-poc/design/commands.mjs
.research/local-figma-bridge-poc/design/request-timeout.mjs
.research/local-figma-bridge-poc/mcp/server.mjs
.research/local-figma-bridge-poc/plugin/design-runtime.mjs
.research/local-figma-bridge-poc/plugin/vector-paths.mjs
.research/local-figma-bridge-poc/plugin/code.js
.research/local-figma-bridge-poc/plugin/ui.html
.research/local-figma-bridge-poc/relay/bridge-server.mjs
.research/local-figma-bridge-poc/relay/protocol.mjs
.research/local-figma-bridge-poc/relay/task-authorization-store.mjs
.research/local-figma-bridge-poc/scripts/build-plugin-code.mjs
.research/local-figma-bridge-poc/tests/audit-pages.test.mjs
.research/local-figma-bridge-poc/tests/design-batch-schema.test.mjs
.research/local-figma-bridge-poc/tests/design-idle.test.mjs
.research/local-figma-bridge-poc/tests/design-runtime.test.mjs
.research/local-figma-bridge-poc/tests/plugin-main-message.test.mjs
.research/local-figma-bridge-poc/tests/protocol.test.mjs
.research/local-figma-bridge-poc/tests/task-authorization-protocol.test.mjs
```

本批仅纳入 `.research/local-figma-bridge-poc/package.json` 的三个构建项，保留已有 `build:plugin-ui`：

```json
"build:plugin-code": "node scripts/build-plugin-code.mjs",
"build:plugin": "npm run build:plugin-ui && node scripts/build-plugin-code.mjs",
"pretest": "npm run build:plugin"
```

这是 scripts 内的修改片段，不是独立 JSON 文件。当前 Git diff 将 scripts 变更放在同一修改块，执行提交时需要编辑选中的修改块，不能直接将完整 package.json 暂存。

`plugin/code.js` 包含生成区和桥接入口；不要拆开压缩后的生成区。由 `scripts/build-plugin-code.mjs` 更新生成区。UI 的 HMAC 区和许可证由已存在且未修改的 `scripts/build-plugin-ui.mjs` 生成；本次 `ui.html` 的实质变化是命令白名单，不需要制造生成器变更。

验证要求：运行 node scripts/build-plugin-code.mjs --check；在隔离树运行本批测试及既有协议/授权测试，检查生成物和入口依赖闭合。

## 第 4 批：feat: 增加本地启动诊断与持久工作流入口

依赖第 3 批。持久会话依赖 commands、audit、timeout 和 MCP。design-commands.test.mjs、request-timeout.test.mjs 实际导入 workflow，必须留到本批。setup 调用 build:plugin 和 doctor。

6 个整文件，另有 package.json 的部分修改：

```text
scripts/setup.ps1
.research/local-figma-bridge-poc/scripts/workflow.mjs
.research/local-figma-bridge-poc/scripts/issue-test-authorization.mjs
.research/local-figma-bridge-poc/tests/design-commands.test.mjs
.research/local-figma-bridge-poc/tests/request-timeout.test.mjs
.research/local-figma-bridge-poc/tests/workflow-session.test.mjs
```

本批再纳入 package.json 的剩余三个新增入口：

```json
"doctor": "node scripts/workflow.mjs doctor",
"workflow": "node scripts/workflow.mjs",
"verify:delivery": "node scripts/verify-delivery.mjs"
```

如果不拆 package.json 修改块，可将该文件整体留到本批。此时第 3 批使用直接 node 命令验证生成物，其 npm pretest 仍是原 UI 构建入口；必须明确这是过渡状态。推荐按上述修改块拆分。

验证要求：运行 node scripts/workflow.mjs doctor，再运行 workflow、commands 和 timeout 测试；前四批集成后运行完整 npm test。

## 第 5 批：docs: 补齐设计流水线文档与交接记录

依赖前四批。使用指南、参考、架构、入口 README、机器状态和本次交接一起纳入。历史失败与暂停记录保留原语义；文档不能把完整交付写为 PASS。

14 个整文件：

```text
README.md
.research/local-figma-bridge-poc/README.md
docs/architecture/design-pipeline.md
docs/development.md
docs/guide/capture.md
docs/guide/delivery.md
docs/guide/generation.md
docs/guide/getting-started.md
docs/index.md
docs/reference/design-spec.md
docs/verification/2026-10-08-design-pipeline.md
docs/roadmap/local-figma-bridge-status.json
docs/verification/2026-10-12-commit-plan.md
docs/verification/2026-10-12-handoff.md
```

提交前须修正一处已确认的当前状态漂移：`docs/guide/generation.md:151` 仍称全 55 候选 `PREPARED_NATIVE_NOT_RUN`；[最新验收记录](2026-10-08-design-pipeline.md#2026-10-11-v10-全量审计与原生文件导出)已确认全量生成、原文件审计、原生保存完成。应只更新这一当前概述，同时保留 50 场景视觉、Present、独立回导及最终交付未完成的边界。本轮没有修改该段，后续提交前应完成定向同步。

本组的机器状态 JSON 和历史报告还需检查 `.local` 证据链接及敏感数据范围；本机文件存在不等于新 clone 会包含这些附件。

验证要求：检查新旧文档链接、命令和状态边界；解析机器状态 JSON。实际 55 场景实机验收仍作为独立门禁，不能由文档检查替代。

## 排除与保护

- `.codex/config.toml`：用户既有本机配置，明确排除，不恢复、不覆盖、不暂存。
- `.research/local-figma-bridge-poc/plugin/THIRD_PARTY_LICENSES.txt`：Git 状态为 M，但当前文本 diff 为空。按无实质差异处理，不单独提交、不为清除状态而改行尾；若后续重建产生真实许可内容变化，再随第 3 批审核。
- `.local/`、桥接 `state/`、`node_modules/`、配对码、凭据、授权记录和本机 session 不进入 Git。
- 实际 ArchiveLens 截图、完整采集、原生 `.fig` 和运行证据留在忽略目录；对外分享或打包须另行确定附件范围，并排除凭据。
- `package-lock.json` 没有修改；沿用 npm 与现有锁定依赖，不新增依赖或手工改锁文件。

## 本轮验证与提交前门禁

本轮执行了只读检查，结果如下：

- 直接 Node 完整测试：372/372 PASS，0 失败、取消、跳过，退出码 0。
- `node scripts/build-plugin-code.mjs --check`：PASS，只检查当前生成区，不写产物。
- `node scripts/workflow.mjs doctor`：六项 PASS；`liveFigma: NOT_RUN`。
- `git diff --check`：已跟踪文本改动 PASS。
- 初始未跟踪文件的常见凭据格式扫描：未发现匹配。此扫描不是完整安全审计，也不覆盖已跟踪配置内容。

以上是当前组合工作树的验证，尚未运行每一批独立提交状态的检查。本轮未运行会重写生成物的 npm pretest，也未进行完整源码安全评审，不能据此直接批准合并或发布。过程摘要见[定向文档报告](../../.local/reports/2026-10-12-commit-handoff-docs-sync.json)。

得到实际提交授权后，每批执行前应：

1. 重读 Git 状态、HEAD 与本批 diff；与本计划不一致时重新规划，不吞入新的并行改动。
2. 按本批精确清单暂存；package.json 按指定修改块处理，不使用 `git add .`。
3. 在独立临时工作树按基线和累计前置批次验证，不让当前完整 WIP 提供缺失依赖。临时工作树应放在忽略目录，不复制凭据或真实用户资料。
4. 检查暂存文件、生成源与产物一致性、命令入口、敏感内容和文档事实；当前未通过的实机门禁保持 NOT_RUN。
5. 再核对 HEAD 后才提交；每批完成后记录实际 SHA 和状态。推送、PR、合并和发布不由本计划自动授权。

## 完成条件

本轮完成条件是五批文件清单覆盖当前全部改动，并给接手者留下准确的状态与恢复步骤。执行五批提交、修正文档概述、各批隔离验证和 55 场景最终验收均属于后续工作；本计划没有把它们标为完成。
