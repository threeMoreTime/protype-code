# 真实 Figma 验收与自动化入口

以下是按日期保留的历史验收记录。“本轮”“当前”、连接状态和本地路径检查只指所在小节的日期；它们不证明之后的插件版本、授权或源文件仍处于同一状态。本地提交与隔离验证不包含真实 Figma 写入、Present、导出或独立回导，未执行项继续保持 NOT RUN / NOT VERIFIED。当前产品能力见[架构](architecture.md)和[增量流程](incremental.md)。

## Task 6 当前轮（2026-10-20）

**状态：尚未通过真实源稿验收。** 本轮按已授权的隔离验收范围进行预检；没有写入原稿或其他 Figma 文件，也没有运行 plan/apply/audit、Present、原生导出或回导。源码保持不变，本轮只更新验收文档与 `.local/` 证据。

当前检查不能复用下方 2026-10-16 的 admin 样例结果：

- **SOURCE：未决。** 学练平台完整目录有 4109 项、169 个独立画板、58 个 screen；58 screen 均为 UNRESOLVED。现有源包为 PLAN_ONLY，只有 4 个已选元数据场景，没有源稿 HTML 或 DesignSpec。重新调用生成入口实际停在 `PRESENTATION_VISUAL_NOT_VERIFIED`，未用占位图或合成页面代替。用户最初 Downloads `.fig` 路径本轮精确检查为 NOT FOUND；只在已检查的 phase3/4/5 报告范围内未找到匹配源 viewport 的 PNG，不推断其他目录不存在。
- **MODEL：NEEDS_REVIEW。** 4 场景声明 8953 节点、773 动作、0 显式 flow；元数据与动作条目不能证明可播放业务流程。所需完整原生视觉字段、字体、mask/master 和覆盖仍由 Task 3 补齐。旧原生补证仅 13 capsules/10 节点，是历史证据，不是本轮回读。
- **LOCAL TEST：预检 PASS。** 本轮 doctor 与 `check:bundle` 通过；源视觉门禁按预期拒绝不完整模型。这里只证明本地检查和防止不完整生成，不证明原生插件已加载同一版本。
- **桌面与连接：未就绪。** Figma 进程存在，窗口标题可见；Computer Use 初始化及重置后初始化都报 `failed to write kernel assets: 系统找不到指定的路径。 (os error 3)`，没有截图或输入。41731/41730 没有监听，也没有匹配的桥接进程。本轮未启动桥接服务；真实文件身份、Page/root、已拥有节点、插件加载版本、配对、scope/有效期、原生 checkpoint 均 NOT VERIFIED。旧只读会话和本地空 journal 不能替代这些检查。
- **BROWSER：file 10/10、127.0.0.1 HTTP 10/10 PASS。** 本轮使用仓库既有 Playwright 做明确标注的 SYNTHETIC_FIXTURE 本地自动化检查；两种环境分别验证导航/历史、hover/focus、tooltip、长页/fixed 阈值与恢复、异常 hash、窗口和无外部应用网络请求。剪贴板通过隔离 Chromium 的真实权限拒绝观察到 `NotAllowedError`、可选中文本回退及无虚报成功，没有替换 clipboard API。共保存 16 张合成截图；它不是学练平台源稿验收，也没有操作已登录网站。结果和截图见本轮私有报告目录，源稿浏览器验收保持 NOT RUN。
- **FIGMA AUDIT / FIGMA PRESENT / ROUND-TRIP：全部 NOT RUN。** 字体/图片/实例/文字独立回读、归属与用户编辑冲突、实际手改文字/实例覆盖、同 viewport PNG 比较、保存 `.fig` 后独立回导均未执行；没有可以复用的本轮原生 PASS。

本轮证据目录：`.local/reports/study-platform-phase6-20261020/`。`source-input-summary.json` 区分当前本地文件复查与历史原生证据；`desktop-and-local-preflight.json` 记录实际桌面入口失败与门禁；`bridge-preflight-summary.json` 是已脱敏的本地连接检查。摘要 ZIP 只收白名单结果、合成截图与复验脚本，不收会话、授权、配对、账号或秘密数据。

`native-acceptance-matrix.json` 逐项登记 58 个源 screen 的原生操作、已选模型 773 条动作的 Present NOT RUN 和 `.fig` 保存/独立回导检查。源模型没有显式 flow，不把 773 条组件动作说成 773 条业务流程，也不为草稿补造入口。

### 恢复验收的先决条件与顺序

1. 回到 Task 3 补齐真实源场景的完整视觉闭包、实际图片及字体可用性，生成新的 HTML/DesignSpec；保留阻断原因，不扩大成全产品重构。
2. 恢复 Computer Use 和本地桥接通道。根据实时 `status` / `document` 核对实际文件身份与隔离 Page/root，再核对原生账本、已有节点、短期授权有效期及插件版本；任何未知副作用先回读，不盲重试。不能从窗口标题或历史会话恢复写权限。
3. 在该隔离范围运行 plan、单批 apply、完整分页 audit，独立回读字体、图片、实例和文字；人工修改仅限本次生成副本，并实际验证用户编辑保护。
4. 在真实 Present 逐条记录进入、离开、返回、异常目标、草稿入口与长页/fixed 行为；未执行的 flow 逐条 NOT RUN。导出同 viewport PNG 后逐项比较，不以结构审计代替视觉。
5. 保存原生 `.fig` 并独立回导，重新检查节点、资产、字体及至少一个已通过的实际流程；下载成功不代表回导通过。只恢复本次验收改动，或保留隔离副本，不清理原稿。

## 历史状态（2026-10-16，admin 样例）

本轮按[交付计划](../superpowers/plans/2026-10-15-prototype-delivery-roadmap.md)执行 P1。桌面开发插件的旧登记路径已由用户重新导入修正；桥接已实际连接并完成配对，稳定文件身份与目标一致。用户明确授权在当前 Page 1（`0:1`）生成后台成员管理样例，并读取审计及导出 PNG，授权有效期 60 分钟。

admin 已分两批生成至 `COMPLETE`，随后独立审计 `PASS`：61 个节点、43 个文字节点、7 条反应、1 个 flow，分页完整且无错误。五个状态画面的 1280×800 PNG 均已导出并逐张检查，中文正常，无字体回退，未见明显遮挡或裁切。以上只证明结构回读与静态画面；Present、其他窗口尺寸、原生 `.fig` 导出及独立回导仍为 `NOT RUN`，mobile/content 尚未实机生成，P1 尚未完成。

本地预检已运行产品、交接和桥接测试共 489 项。初次浏览器检查为 2 项通过、7 项失败：Windows CRLF 被 HTML 解析器转换为 LF，造成内联脚本的 CSP 哈希不匹配。渲染器现已在计算哈希前规范化换行，保留原有 CSP 限制；新增 LF/CRLF 回归测试先失败、修复后通过，浏览器 10/10、产品 30/30 通过。旧输出保留，修复后输出使用新目录。

## 避免重复手工设置

1. 开发插件按本机安装配置一次，导入 `.research/local-figma-bridge-poc/plugin/manifest.json`。源码更新后运行 `npm --prefix .research/local-figma-bridge-poc run build:plugin`，随后重启或热重载插件；不必为每次生成重新导入 manifest。
2. 后续复用指定验收文件，在其中使用独立 Page／根作用域；新文件仅用于新一轮隔离验收、独立回导或明确要求的业务交付。
3. 运行已导入的开发插件并保持窗口打开，再按[启动与配对](../guide/getting-started.md)启动本地会话。身份、配对和短期授权仍需按实际目标核对。
4. 代理通过现有桥接执行 `status`、`document`、`plan`、`apply`、`audit` 和 PNG 导出；关闭插件后需重新运行，不能视作后台常驻服务。

## 自动化通道与边界

- **网页界面：OBSERVED。** Chrome 已登录，创建草稿及重命名已成功；菜单可见 Present 和保存本地副本入口，但尚未验证播放、下载或回导。网页菜单未显示本地开发插件入口。[官方开发指南](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)要求使用桌面端开发、测试本地插件。
- **Windows 桌面：部分可用。** Computer Use 已读取插件窗口并填写配对码，用户点击 Pair 后桥接回读 `authenticated=true`。点击仍报 `coordinate input geometry is unavailable`；截图恢复检查遇到窗口最小化及用户输入中断，未完成可靠截图/点击验证。既往还出现过截图超时及 `GetCursorPos`（`0x80070005`）。未修改系统权限或安全设置，不能将窗口可读或桥接成功等同于 Present 已验收。
- **官方远程 MCP：候选方案。** 官方提供 `create_new_file` 和 `use_figma`，可直接新建文件、创建和修改原生图层；写入需要 Full seat，既有文件还需编辑权限。本会话工具清单没有暴露这些调用，插件显示已安装不代表通道已连接。[工具文档](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) · [写入条件](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/)

本轮优先用界面自动化减少准备操作，继续验收仓库自己的桥接生成器。若另行适配远程 MCP，须保留规格、归属、授权和审计约束，并单独验证；其他工具成功绘制不能代替当前桥接的验收结果。

## 证据与下一步

本轮本地证据位于忽略目录 `.local/native-acceptance/20261015/`，截图 `figma-web-created.jpg` 仅证明空白验收文件已创建。`logs/` 保存原始浏览器失败、CSP 诊断、RED/GREEN 和修复后检查记录。`bridge-live-01/evidence/admin/` 保存 2026-10-16 的真实生成、审计和 PNG；含实际文件身份的原始记录仅本地保留。报告包 `.local/reports/20261016-native-admin-first-run.zip` 仅按白名单收集摘要、公开样例规格和五张 PNG，不包含配对、授权、会话或账号数据。

下一步由可交互桌面完成 admin 的 Present：验证新增、保存和取消跳转，并单独从空列表、保存失败画面启动检查其跳转；再保存原生 `.fig` 并独立回导。mobile、content 需分别核对独立页面及授权后生成。只有实际执行并核验的环节才能记录 `PASS`。
