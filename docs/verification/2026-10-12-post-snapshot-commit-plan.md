# 2026-10-12 后续修复提交计划

本计划只覆盖此前五批提交之后的修复及文档改动。此前计划已执行，最后提交为 `330a03087ee42d57d6821df63c645300b6be54d7`；[原提交计划](2026-10-12-commit-plan.md)保留为历史记录。本轮没有暂存、提交、推送、切换分支或执行 Figma 操作。当前交付状态与恢复入口见[交接文档](2026-10-12-handoff.md)。

## 基线与提交边界

- 分支 `dev`，基线 HEAD 为上述 `330a030`，暂存区为空；没有 fetch，不声明与最新远端一致。
- 既有任务改动 17 个文件：11 个源码/测试，6 个文档；本计划新增后共 18 个拟提交文件。
- 排除 `.codex/config.toml` 的用户配置修改，以及 `plugin/THIRD_PARTY_LICENSES.txt` 的既有行尾差异。两者保持原状。
- `.local/`、插件 `state/`、配对 secret、授权记录、归档 capture、PNG、`.fig` 与测量产物不进入提交。
- [本机文件与分组快照](../../.local/reports/2026-10-12-post-snapshot-commit-plan-inventory.json)记录精确路径、文件 SHA-256、验证证据和范围；该快照被 Git 忽略，不随 clone 分发。

## 五批提交

下列路径以 `.research/local-figma-bridge-poc/` 为前缀，文档批除外。全部按整文件提交，没有跨批拆分修改块。Node/npm 验证命令均在该桥接目录执行。

### 1. `fix: 强化原生生成根节点的页面作用域校验`

四个文件：

```text
plugin/design-runtime.mjs
plugin/code.js
tests/design-runtime.test.mjs
tests/plugin-main-message.test.mjs
```

原生异步等待后重新检查 root 所在 Page，覆盖空映射、现有节点核验及日志保存。保留 pending 和失败记录，不自动采用或重放。`plugin/code.js` 同时包含手写守卫和生成 runtime，必须与生成源同批；不能只提交压缩区或手工修改生成区。

提交前在该批独立内容中运行：

```powershell
node scripts/build-plugin-code.mjs --check
node --test tests/design-runtime.test.mjs tests/plugin-main-message.test.mjs
```

真实 Figma 异步移动 root 的负面场景仍 NOT_RUN，提交描述须保留此边界。

### 2. `fix: 支持同字体单行文字的右对齐合并`

两个文件：

```text
capture/inline-text.mjs
tests/inline-text.test.mjs
```

RIGHT 复用父级实测内容宽度；只处理受守卫的单行、同字体、直接连续片段，保留并隐藏被合并节点。四个计数器在独立原生测试框中已通过视觉验证，完整场景尚未重新生成。

提交前独立验证：

```powershell
node --test tests/inline-text.test.mjs tests/capture.test.mjs
```

### 3. `fix: 补齐原生控件采样转换及输入校验`

三个文件：

```text
capture/archive-html.mjs
capture/adapter.mjs
tests/archive-controls.test.mjs
```

区分实际采集状态、HTML 默认值和显式视觉样本；补齐 radio、checkbox、color、range 与 details marker 的可编辑形状，修复重复属性 ID 歧义、非法状态和数值跨度溢出。样本是调用方声明的近似结果，不能宣称自动采样、自动核验哈希或已完成原生视觉验收。

提交前独立验证：

```powershell
node --test tests/archive-controls.test.mjs tests/archive-native-controls.test.mjs tests/archive-paint-order.test.mjs tests/native-controls.test.mjs tests/capture.test.mjs tests/enrich.test.mjs
```

2,125 节点控件试验页的生成和结构审计 PASS；PNG 导出未完成，视觉验收仍 NOT_RUN，不以结构通过代替视觉通过。

### 4. `feat: 增加受归档证明约束的多行文字转换 API`

两个新增文件：

```text
capture/archive-inline-lines.mjs
tests/archive-inline-lines.test.mjs
```

新增 `applyArchiveInlineLineProof` 纯函数，默认不执行，要求明确名单和严格归档几何证明，保护 CODE、交互节点、资源、父级身份与 Unicode 标量。该 API 尚未接入 CLI 或默认流水线，不将其写成已完成的端到端修复。

提交前独立验证：

```powershell
node --test tests/archive-inline-lines.test.mjs tests/design-spec.test.mjs tests/capture.test.mjs
```

八个目标的内存转换得到 16 个新文字行；原生自然尺寸探针只准备了规格，没有派发 apply。字体/尺寸、完整布局和视觉验收仍 NOT_RUN。归档测量工具及证据位于忽略目录，新 clone 不具备自动复现这批历史测量的全部输入。

### 5. `docs: 同步修复能力边界与提交交接记录`

七个文件：

```text
docs/architecture/design-pipeline.md
docs/guide/capture.md
docs/guide/generation.md
docs/roadmap/local-figma-bridge-status.json
docs/verification/2026-10-08-design-pipeline.md
docs/verification/2026-10-12-handoff.md
docs/verification/2026-10-12-post-snapshot-commit-plan.md
```

保留历史失败、暂停和既有提交记录；用后续更新说明当前代码及验收边界。文档提交前核对代码批最终内容，检查 JSON 和本地链接；`.local` 链接只供现有工作目录复核，必须保留其不随 clone 分发的说明。

本轮只规划，以下两份文档的修正尚未执行，须在第 5 批暂存前完成：

- `docs/guide/capture.md:47` 仍称归档转换只解析 select/option/img。按 `capture/archive-html.mjs` 的实际实现补齐 input 声明元数据范围，保留“不运行脚本、不推断 CSS 层叠”的限制。
- `docs/roadmap/local-figma-bridge-status.json:104` 仍将 372 项称为 Latest，且旧 `captureFidelityOptions` 未登记此次修复。保留 dated 历史，新增当前修复汇总或明确更新当前入口，指向 439 项组合记录、RIGHT 局部探针、2,125 节点控件结构记录及多行证明 API。顶层既有 `scopeGuard: VERIFIED` 须注明旧 8.0-D 证据范围；新增异步移页负面实机、控件视觉和 16 行原生测量继续 NOT_RUN。不能把所有旧历史 NOT_RUN 批量改为 PASS。

## 顺序、验证与执行要求

前四批都基于 `330a030` 中已存在的模块；当前没有新增依赖、lockfile、schema、package scripts 或 CLI 参数的提交需求。推荐依次提交 1→2→3→4→5，以便跟踪原生安全、视觉转换及文档；第 5 批依赖前四批的最终内容。

2026-10-12 暂停前的隔离组合测试记录为 439/439 PASS，0 fail/cancelled/skipped；本轮重新核对 11 个源码/测试 SHA-256，须与[组合验证记录](../../.local/reports/2026-10-12-post-guard-inline-isolated-verification.json)完全相等才能引用该历史结果。本轮重新运行生成 runtime `--check`、doctor 六项及文本 diff 检查；不是新的全量测试或五批独立验证。

**各批独立验证当前 NOT_RUN。** 执行提交时从冻结基线建立隔离验证目录，只应用本批和前序已提交批次，不依赖当前完整工作树供应后续文件。按上列命令验证每批，再在前四批组合后的隔离目录执行 `npm test`、生成代码 `--check` 和 `npm run doctor`。`npm test` 会触发 `pretest` 构建插件，因此不要为验证而在主工作树重写用户已有的生成物或许可证。

暂存前重新核对 HEAD、工作树、运行进程和精确范围，检查拟提交内容是否含凭据或本地数据。使用明确文件列表，不使用 `git add .`。本计划覆盖的文件发生额外变化、SHA 不符、HEAD 前移或发现新文件时，先重新审查范围，不能直接套用旧清单。暂存后审查 staged diff、生成源与镜像一致性、每批依赖和验证记录；提交后再次核对 HEAD、状态及实际文件列表。推送、PR 和发布不属于本计划执行授权。

## 可提交代码与整体交付的区别

本计划用于保存已经实现的修复，不以最终 Figma 验收完成作为全部代码提交的前提。未完成事项须在提交说明中明确保留：控件截图视觉复验、16 行原生测量、其他文字与布局修复、修正版 55 场景全量生成与视觉复验、Present、修正版 `.fig` 保存、独立回导及最终交付验证。旧 v10 剩余 50 场景仍为 24 PASS/26 FAIL，云端同步 NOT VERIFIED。不得将本地代码提交写成原型交付完成。

## 后续执行：文档修正与隔离验证

用户随后明确要求修正两份文档、完成各批隔离验证后提交。上文“本轮只规划”、两份文档待修和独立验证 NOT_RUN 均为规划时状态，不代表这次执行结果。两份文档已修正；旧 372/439 项验证和原生失败证据保留。

提交前复核另发现：不支持的属性 token 出现在 `data-design-id` 前，可能使后续重复 ID 标签被误认为唯一来源。两个独立复现确认来源声明错误；最小修正仅在无法完整解析起始标签时停止该 HTML 的原生控件声明恢复，普通 select/img 和原采集值保留。新增回归在旧实现中实际失败，修正后通过；引号内伪 ID 不作身份。该改动仍位于第 3 批原有文件范围，没有新增依赖、CLI 或文件分组。

级联复核又确认：多行 API 原先把派生行追加到规格末尾，可能跨过原文字的重叠兄弟，改变遮挡关系。第 4 批改为在原文字节点之后相邻插入；新增测试实际 RED/GREEN，独立运行时 double 读回及两目标、倒序名单、分批与重入探针确认层序保持。真实 Figma 视觉未在本次任务中执行。

从 `330a030` 的新隔离目录逐批累积应用，前四批最终分别 107、74、102、76 项 PASS，0 fail/cancelled/skipped。组合 `npm test` 为 441/441 PASS，生成 runtime `--check`、doctor 六项 PASS，11 个源码/测试文件与主工作树 SHA-256 一致。旧 439 项和中间 440 项记录只证明各自修正前的内容；440 记录已另行保留。文档批另核对 JSON、隔离目录中的仓库链接和既有工作目录中的忽略证据链接；具体检查与阶段状态见[本轮隔离验证](../../.local/reports/2026-10-12-postfix-isolated-batches.json)。

获授权的实际提交范围、父提交、每批文件及最终 SHA 另记录在[本轮执行台账](../../.local/reports/2026-10-12-postfix-commit-execution-ledger.json)。该台账只包含本地提交，尚未发生的操作不追认为成功；推送、PR、发布不在本轮范围。原生视觉及最终交付的未完成项保持上节边界。
