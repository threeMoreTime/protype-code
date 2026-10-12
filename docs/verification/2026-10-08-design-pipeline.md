# 2026-10-08 DesignSpec 管线实施与验证

本次目标是在已有受控桥接上补齐九项缺口，形成从界面采集到原生 Figma 交付的可复用流程。基线为 `dev` 的 `fc9fac4fd6d5ade828aeb7e9cb9ba96af0487c3c`；实施前 fetch 后与远端默认分支差异为 0。下述新增代码仍为本地工作区改动，尚未提交或发布。

## 已实现的入口

- G0：setup、doctor、绝对路径 MCP 配置生成、持久会话、配对与本地作用域授权。
- G1：只读 DOM 采集、旧 ArchiveLens JSON/HTML/图像适配、稳定键、DesignSpec 校验与采集清单。
- G2：有界原生 Frame、文字、形状、矢量、图片、组件与实例生成，贯通 MCP、relay、插件。
- G3：字体发现与显式替换、文字几何、滚动/固定子节点、图层顺序、阴影、边框及控件显示值恢复。
- G4：组件/实例及有限覆盖、文字样式、颜色变量与绑定；可选从重复样式和叶矢量提取设计资源。
- G5：点击、计时、顶层导航和 flow 起点，配套两尺寸可滚动示例。
- G6：持久映射、分批创建与后处理、不可变规格签名、用户改动检测、结果不明时的保守恢复。
- G7：只读语义审计、分页一致性组装、PNG 导出与像素比较、Present 证据检查。
- G8：原生导出/回导操作指南、容器检查、独立文件语义比较、SHA256 与可重新验收的交付包。

以上是源码能力清单，不能据此认定九项端到端验收全部通过。Figma 客户端原生保存、回导与实际播放仍需真实操作及其证据。

## 已运行的验证

自动 flow 兼容修复及示例白色背景修改后，2026-10-09 完整 `npm test` 为 **145/145 PASS**，无失败、取消或跳过；本地 `.local/reports/2026-10-09-tests-summary.json` 记录了实际工具输出摘要及退出码 0，并非原始测试日志。此前 `.local/reports/resume-full-tests.txt` 的 145/145 PASS 和 `.local/reports/final-tests.txt` 的 137/137 PASS 保留为历史检查记录。`scripts/setup.ps1 -SkipInstall`、插件构建、doctor 和配置文件生成已有 PASS 记录。持久 CLI 重启后拒绝盲重试的测试 PASS。

运行时测试使用明确的 Figma API 替身，覆盖原生节点、组件、实例覆盖、样式、变量、交互、故障中断、用户改动和全部宿主 ID 重写后的语义回导。交付测试用合成容器和观察记录验证逻辑，不能当作实际 `.fig` 可导入证明。

规模测量发现完整只读审计超过 WebSocket 8 MiB 上限，因此新增分页：每页最多 2,000 节点、默认 1,000，使用完整快照签名阻止跨页混合版本。CLI 只有连续页面全部收齐且签名一致才输出完整审计。`.local/reports/final-measurement.txt` 记录的是 **API 替身**对旧转换规格的测量：13,193 节点、831 反应、106 次生成调用、14 个审计分页；完整审计 9,420,425 字节，最大分页 1,038,064 字节。该测量早于下述 739 条交互映射修正，不代表真实 Figma 的性能或验收结果。

## 本地 ArchiveLens 输入回放

基于 2026-09-30 已采集的 55 场景转换，没有把当前应用重新运行到 55 个状态。读取的产品资料保持原样。修正交互映射后的输出位于忽略的 `.local/archivelens-native-mapping/`；规格 SHA256 为 `1b45c5b49d0e7ffb59ddd865cf76f304daf4ccbe1245501df3ca207619ef5e05`。

此次转换包含 13,193 规格节点、4,170 文字节点、33 组件、713 实例、50 文字样式、99 颜色变量、3 个去重图像资源、739 条反应及两个起点。367 处阴影已转换为原生 effects；40 个旧下拉框缺值与 43 处图像引用从明确提供的归档资料恢复。数量是转换结果，不是已在真实 Figma 中确认的数量。

原始 831 条映射中，92 条是归档预设保持在当前场景的记录。这些记录及省略理由完整保留在采集清单中，不再转成原生自跳转；其辅助操作结果仍无证据。其余 739 条生成反应为 738 条点击和 1 条计时，数量已从实际规格独立复查。这只证明转换映射一致，不能代替交互播放验收；现代采集明确声明的自导航仍保留。

输入有 214 条仍需核对的表现警告：126 条 fixed/sticky 被保留为静态位置、75 条变换仅保留外框、13 条虚线边框使用近似 dashPattern。它们会影响对原始界面的保真判断。采集清单的 schema 为 PASS，visual 和 figmaRuntime 均为 NOT RUN。

重复资源提取策略与原人工组件库不同，不将旧交付的 165 组件、959 实例等数字硬编码到通用生成器。若验收要求保留原组件库语义，应按其来源映射补充组件定义并再次核验。

## 实机状态

已在独立测试文件完成插件导入、配对和受控实机生成。`demo-v3-20261008` 在 2026-10-08 的只读审计确认 20 节点、9 文字、1 组件、2 实例、4 反应、1 文字样式及 1 变量。该次生成返回 **PARTIAL_FAILURE**，审计为 **FAIL**，剩余错误仅为 `FLOW_MISMATCH` 和 `DESIGN_NOT_COMPLETE`；不能记作完整生成 PASS。

实机暴露的沙箱缺少 TextEncoder、滚动方向枚举不兼容和文字字体赋值导致样式绑定脱落已修复。v3 的剩余失败点是宿主设置反应时自动添加 `Flow 1`，与期望起点及严格变更检测冲突。兼容修复仅接纳成功写入前后实际记录的宿主变化；不放宽旧 v3 的 guard，也不盲目重试该 run。原始 apply 和只读审计证据保存在 `.local/live/demo-v3-evidence/`，页面失败状态保留。

修复后在新的 Page 4 范围运行 `demo-v4-20261008`，生成返回 **COMPLETE**；只读审计为 **PASS**，错误为 0，确认 20 节点、9 文字、1 组件、2 实例、4 反应、2 个期望 flow、1 文字样式和 1 变量。default、compact 的原始 PNG 已从真实 Figma 导出；这证明导出完成，不等于 PNG 视觉验收通过。证据保存在 `.local/live/demo-v4-evidence/`。

Figma 客户端 Save local copy 已实际导出 `protype-code-two-size-v4.fig`，大小 81,518 字节，SHA256 为 `b22b01158467c3e51f551099d09ad6032b94d0f4e98f1721d18c95d9b7e11911`；导出记录和界面证据与文件同目录。该文件已导入独立文件，20 节点的语义比较为 **PASS**；默认与紧凑首页的回导前后 PNG 像素比较均为 **PASS**，`changedPixels` 和 `largestDelta` 均为 0。证据为 `.local/reports/demo-v4-semantic-roundtrip.json` 和 `.local/reports/demo-v4-pixel-roundtrip.json`。这些结果证明回导一致，不能证明画面本身或交互正确。

v4 实际 Present 验证为 **FAIL**：默认按钮已观察到进入处理页，但数秒后仍未自动完成；同次运行的 API `timeout` 为 2000，Figma 126.9.13 的交互编辑器显示 `2000000ms`。这是该版本、该次运行观察到的计时单位差异，不据此推广为所有宿主行为。根 Frame 透明还导致黑色文字在黑色 Present 背景上不可见，视觉可读性为 **FAIL**。两尺寸滚动均已看到底部标记，为 **PASS**；紧凑模式导航为 **NOT RUN**。观察记录和截图保存在 `.local/live/demo-v4-import-evidence/playback-observations.json` 及同目录的 `actual-delay-2000000ms.png` 等文件。

针对上述问题，新 `demo-v5-20261008` 使用白色根 Frame 背景，并在新会话中显式设置 `timerUnit: "seconds"`；未修改旧 run 或默认计时单位。Page 5 中的生成为 **COMPLETE**，只读审计 **PASS**，确认 20 节点、4 反应、2 个 flow、错误为 0。默认与紧凑 PNG 导出均为 **PASS**，证据保存在 `.local/live/demo-v5-evidence/`。

2026-10-09 已在 v5 原文档实际播放两尺寸流程：点击后进入处理中，再无额外输入自动进入完成页，均为 **PASS**；白底文字可读性为 **PASS**。记录为同目录 `playback-observations.json`，并保留两尺寸各自的处理中、完成页截图。该记录未精确测量是否恰为 2 秒；原文档播放结果不能替代回导文件验收。

v5 已通过 Save local copy 导出 `protype-code-two-size-v5.fig`，大小 82,112 字节，SHA256 为 `30dc0820128399fdc65127f1d97ce92950e8b53618d106e623b54a50269acae2`，并实际导入独立 Drafts 文件。界面证据为 `.local/live/demo-v5-evidence/native-roundtrip-ui.json`。回导文件的只读审计为 **PASS**，确认 20 节点、9 文字、1 组件、2 实例、4 反应、2 个 flow、1 文字样式和 1 变量；语义比较为 **PASS**、差异为空，两尺寸首页 PNG 像素比较均为 **PASS**，`changedPixels` 和 `largestDelta` 均为 0。比较报告为 `.local/reports/demo-v5-semantic-roundtrip.json` 和 `.local/reports/demo-v5-pixel-roundtrip.json`。

回导文件的实际 Present 已完成四个代表用例：两尺寸点击后均进入处理中并自动完成，两尺寸滚动均显示底部标记，全部为 **PASS**；白底文字可读性为 **PASS**。证据为 `.local/live/demo-v5-import-evidence/playback-observations.json` 及同目录截图。计时精度仍为 **NOT MEASURED**，未验证恰为 2 秒；像素一致性仅覆盖两尺寸首页，不能推广为所有画面或原始 ArchiveLens 界面的完整保真验收。

两尺寸示例的交付门禁为 **PASS**：原生容器、原文档及回导审计、语义比较、原生导出/导入、两幅首页像素比较与四个 Present 用例均通过。`.local/live/demo-v5-delivery/delivery.zip` 含 29 个条目，SHA256 为 `8abd01e48298f3c609de79ae81312339855309e650bd7b8f918e07643dba19be`；解压后的独立重验也为 **PASS**。记录为 `.local/reports/demo-v5-delivery-final.json`、`demo-v5-delivery-replay.json` 和 `demo-v5-package-summary.json`。该结论仅覆盖两尺寸示例，九项能力的整体端到端验收仍为 **IN PROGRESS**。

55 场景已在新的 Page 6 范围启动实机生成，run 为 `archivelens-full55-20261009`，返回 **PARTIAL FAILURE**：完成 143/13,193 个节点、后处理 0 个，在图标 `extracted/icon/6c46eebfb3db7cfb98ca/shape` 写入矢量路径时失败，错误为 `in set_vectorPaths: Failed to convert path. Invalid command at A`。pending 节点仍有实际宿主 ID；失败 run 保留，未盲目重试，必须先只读核验并协调状态。证据为 `.local/live/full55-evidence/archivelens-full55-20261009.apply.op-95aec532-1d89-4863-bf4f-820276b818d8.json`。该快照时弧线命令兼容修复正在进行；55 场景的完整结构、视觉、交互与回导验收均为 **NOT RUN**。

历史 ArchiveLens 原生 `.fig` 的容器检查 PASS 只作为格式测试参考，未将其计入新生成验收。历史交付文件未纳入本次生成范围。

## 2026-10-09 增量修复与验证

圆弧路径现在转换成宿主支持的三次曲线，并按全部路径的解析边界统一缩放到节点显示尺寸；实际路径回读使用数值比较，原始宿主快照仍用于检测用户编辑。无描边的 SVG 和下拉箭头显式写入空描边。安全的嵌套 sticky 提升到最近滚动祖先并补偿位置；这仍是采样固定效果。新增有界只读 `read-node` 诊断和严格的原生线性渐变契约；CSS 转换仅支持有完整背景上下文证明的同 RGB 双色标透明度渐变。

该快照完整 `npm test` 为 **169/169 PASS**，失败、取消、跳过均为 0，原始日志为 `.local/reports/2026-10-09-gradient-stroke-tests.txt`；doctor 为 **PASS**。此前 145 项和 162 项结果保留为历史快照。运行时替身测试不能代替真实生成、播放或回导验收。

实机小例 `arc-probe-v2-20261009` 的 3 节点生成完成、只读审计零错误、PNG 导出通过。随后独立 Page 8 的 `arc-gradient-probe-v3-20261009` 确认 4 节点 **COMPLETE**、审计 **PASS** 且零错误，PNG 导出 **PASS**；已直接核对图标无默认黑色描边及原生渐变显示。证据位于 `.local/live/arc-gradient-probe-v3-evidence/`。这些小例尚未执行原生 `.fig` 回导，不代表 55 场景或 sticky 滚动验收通过。

原 55 场景失败 run 与不可变规格均保留。新规格位于 `.local/archivelens-derived-v2-complete/converted/`，SHA256 为 `1bf7ec2f34981aed719406c9fd4b0a0427d5434631edf6a54aff5bda1b788fbd`：55 场景、13,193 节点、4,170 文字、33 组件、713 实例、739 反应、两个起点及 3 个图像资源；图像资源与旧规格逐字节一致。8 个 footer 的滚动父级、位置和原生渐变字段核对 **PASS**。仍保留 214 条表现提示，其中 8 条改为采样固定 sticky，118 条 fixed 保持静态；其余为 75 条外框变换和 13 条虚线近似。

8 个 footer 背景字段来自归档 CSS 声明与初值的静态证明，明确标为 `STATIC_CSS_DERIVED`，并非浏览器重新采集。派生清单保存原 JSON/HTML 摘要、图像资源来源和逐字段依据；原采集保持不变。首次新转换曾漏供 43 处图像引用对应的两个资源，未用于 Figma 写入，该候选保留在 `.local/archivelens-derived-v2/`；补全资源后另建上述完整候选。原生宿主计划仍报告六种字体样式替换为 Noto Sans SC Regular，包含粗体、等宽和仿宋差异，视觉验收必须考虑这些差异。

新 run `archivelens-full55-v2-20261009` 在独立 Page 9 生成至 155/13,193 节点时返回 **PARTIAL FAILURE**，后处理为 0。失败处为 `extracted/icon/31f558c82f953c7be3ae/shape` 的路径回读：宿主在第三子路径 `Z` 前补入严格回到该子路径起点的 `L`。独立分析确认只差该闭合边，其他命令相同，最大坐标误差小于 `4.7e-7`。失败 run、pending 节点和审计 **FAIL** 均保留，未重试。

比较器仅对上述显式闭合边与隐式闭合做等价处理，仍保留 `Z`、填充规则、其他边及原始快照编辑保护。修复后完整测试 **171/171 PASS**，原始日志为 `.local/reports/2026-10-09-vector-closure-tests.txt`。新 Page 10 的 `all-vectors-probe-v4-20261009` 集中复验当前规格全部 34 个矢量：共 35 节点 **COMPLETE**，只读审计 **PASS**、0 errors，PNG 导出 **PASS**。这只证明矢量生成与回读，不替代整套验收。

第三次独立生成使用 `.local/live/full55-v3-exact-spec.json`，仅更换 spec ID，内容与完整派生规格严格一致；SHA256 为 `352d9acfd33e54f586ad5269cde21c10ba2e2224b4ca5ede32b2d579f52b926c`。run 为 `archivelens-full55-v3-20261009`。整套实机结构、代表画面及交互、原生保存与独立回导仍需单独验收；九项能力的整体端到端验收仍为 **IN PROGRESS**。

## 文档同步

第三次独立 run 实际返回 **PARTIAL FAILURE**：apply checkpoint 为 361/13,193、后处理 0，pending 为 `tasks-delete/portal-tasks-delete-2`、宿主 `19:869`。失败审计只纳入 360 个已记账节点，不包含正在创建的 pending 节点，结果为 **FAIL**。新增有界填充诊断并重新加载插件后，只读回读确认该节点黑色 SOLID 填充的实际 `opacity` 为 1，仍绑定颜色变量；规格要求 0.4，绑定变量的颜色 alpha 为 1。因此这是真实填充差异，不能通过放宽比较器通过审计。证据为 `.local/live/full55-v3-evidence/archivelens-full55-v3-20261009.read-node.19%3A869.1791512258990.json`。该快照时变量绑定与 paint 透明度组合的修复尚未完成；失败 run 保留，未盲目重试。后续修复证据见下文 RGBA 提取修复实证。

上述 171 项测试是添加填充诊断之前的完整快照；诊断加入后的完整测试结果需单独记录，不能沿用旧 PASS。

docs-sync 已先记录带代码证据的修改范围，用户本轮“补全文档体系”的授权覆盖文档编辑。新增根 README、文档索引、四份使用指南、契约、架构和开发说明。旧研究与日期验收报告保留，当前入口明确其历史范围；docs-editor 检查命令、路径、术语与状态声明。实际文件身份、配对信息、完整采集与 UI 证据保存在本地忽略目录。

填充诊断加入后的完整测试为 **173/173 PASS**，无失败、取消或跳过，退出码 0；原始日志 `.local/reports/2026-10-09-paint-readback-tests.txt`。新增两项诊断回归覆盖完整 paint 回读及超预算明确不返回字段，不改变宿主数据。该 PASS 不包含遮罩透明度修复。

## RGBA 提取修复实证

2026-10-09 原生对照确认绑定 helper 返回 opacity0.4，宿主赋值后按变量a1解析成1；变量a0.4搭配paint0.4实际保持0.4000000059604645，不是乘法0.16。修复精确颜色提取，改按RGBA分组，覆盖填充、描边与未绑定实例填充覆盖，保留节点与paint透明度；显式绑定不默改。完整测试 **180/180 PASS**，原始日志 `.local/reports/2026-10-09-rgba-extraction-tests.txt`。独立Page13的9节点用例生成 **COMPLETE**、审计 **PASS** 0errors、PNG **PASS**且已直接核对，原生fig回导 **NOT RUN**。证据 `.local/live/paint-alpha-corrected-v2-evidence/`。

新的55场景输入 `.local/archivelens-derived-v4-rgba/converted/design-spec.json` SHA256 `c16c06c3702f457b4173d34741273bbe034ee53a513c2f4db0d8312da17f6adf`；保持13193节点、739反应、3图像，变量为102个，无paint与绑定变量alpha冲突。资源、反应与flow与旧完整派生输入一致；静态CSS来源标记保留。全量实机与交付仍待验收。

## 55 场景规模与超时核对

v4 已收到 6,000/13,193 节点、后处理 0 的成功批次回复。下一批操作 `op-f06fdab4-3665-413c-85d8-95df73f54953` 在 40,000ms 超时，约 41 秒时观察到晚到回复；CLI 保留 `OUTCOME_UNKNOWN`。只读审计尝试因插件连接断开而失败，不能视为已核对该批次，也未直接重试写入。源码与日志确认全量现有节点检查随规模增长；桥接固定 35 秒 idle watchdog 与执行线程阻塞时无法发送的心跳另有冲突。正在保持全部作用域、所有权、编辑、pending 和幂等保护的前提下验证修复；该快照不宣称全量恢复、审计、视觉或回导通过。

修复后完整测试为 **189/189 PASS**，无失败、取消或跳过，退出码 0；最新日志 `.local/reports/2026-10-09-large-design-final-tests.txt`，含可选 CLI `auditLimit` 的边界验证；先前日志 `.local/reports/2026-10-09-large-design-tests.txt` 保留。doctor **PASS**。同一次同步检查共享新鲜原始属性，资源反向索引每次操作重建；原始矢量摘要、异步准备后的所有权及用户编辑检查保持。默认 Design 预算仍为 40 秒，可显式选择 40–180 秒；已认证、就绪、同连接身份的有效 Design 请求只在其原始期限内暂缓 35 秒 idle 关闭，不刷新心跳时间或请求期限。未知结果与重放保护保持。上述测试使用 API 替身或协议测试，实机恢复需要独立回读。

上述输入的文件原始字节 SHA256 为 `c16c06c3702f457b4173d34741273bbe034ee53a513c2f4db0d8312da17f6adf`；CLI 状态对解析后 `JSON.stringify(spec)` 计算的请求摘要为 `aafdc27714724cf06eaa61f73271547e65534e3d82263b25b6799462895e3579`。两者计算依据不同，不应直接比较；原生审计另有规范化规格签名。

## v4 图片冲突检查点

有界心跳与超时修复后，完整只读审计实际收齐 6,250 节点，writes0、pendingnull；结果为 **FAIL**，错误均对应缺失节点、未连接交互、未完成排序与flow，不含所有权或属性摘要冲突。显式 reconcile 后成功到 6,500，再顺序生成到 8,500。随后操作 `op-482f4ead-0c5d-4ebe-910c-2d6fc7915864` 在写入前返回 `DESIGN_USER_EDIT_CONFLICT:search/d129`，生成停止。2026-10-09 后续只读核对宿主节点 `20:10060` 的 fills为空，而不可变输入要求 asset-2 的 IMAGE 填充；该差异已观察到，成因尚未验证，不能直接归因于用户编辑或宿主自动处理。证据 `.local/live/full55-v4-rgba-evidence/archivelens-full55-v4-rgba-20261009.read-node.20%3A10060.1791524397344.json`。未绕过检查、改账本或盲目重试；当前完整生成、视觉、Present 与原生回导仍未通过。

## 图片账本诊断与专用探针

新增 `scope_read_node.imageResources` 只读取目标 Design 命名空间、其祖先 Page 中的图片账本及同步 `getImageByHash` 查询。它不下载 bytes、不创建图片、不修改账本或节点；`status: PASS` 仅表示这些元数据与查询收齐，`imageValidity` 仍为 **NOT VERIFIED**，不是图片内容、渲染或持久性验收。缺少必要数据或超预算时明确失败关闭，诊断范围见[生成指南](../guide/generation.md#开发验证)。

`2026-10-09T07:02:33.612Z` 的旧节点回读仍为 fills=[]：三个同命名空间资源中，第一项 handleExists=true，第二、第三项为 false。证据为 `.local/live/full55-v4-rgba-evidence/archivelens-full55-v4-rgba-20261009.read-node.20%3A10060.1791529353612.json`。这证明当时两个 hash 查不到 handle，不能据此证明垃圾回收或断言是谁改动了填充。

独立 Page 15/root `21:10112` 的 `image-lifecycle-probe-v1-20261009` 使用相同三份 bytes 并立即建立引用。4 节点生成 **COMPLETE**、只读审计 **PASS** 且 0 errors，640×400 PNG 导出 **PASS**；已直接观察三幅图片可见。apply、audit、export 证据在 `.local/live/image-lifecycle-probe-v1-evidence/`，对应操作分别为 `op-253b25ec-3b43-4be0-a19d-2a651535b3e3`、`op-3dd51160-64e2-470f-9656-5660a6c0a166`、`op-1951ff56-76bd-4ef2-8054-0addb142e0ce`。该探针尚未执行原生 `.fig` 回导，不能替代 55 场景验收。

新资源建立后，`2026-10-09T07:06:00.401Z` 回读确认旧命名空间三个 hash 都能查到 handle，但旧节点 fills 仍为空；证据为 `.local/live/image-lifecycle-probe-v1-evidence/image-lifecycle-probe-v1-20261009.read-node.20%3A10060.1791529560401.json`。没有重写旧填充、清除编辑保护或继续旧 run。上述对照支持“过早创建、长期未引用的图片 handle 可能失效”的推断，具体宿主机制仍为 **NOT VERIFIED**。新节点 IMAGE 赋值前的生存检查正在实现，此快照不记为已完成修复。

诊断加入后的完整测试为 **194/194 PASS**，0 fail/cancelled/skipped，日志 `.local/reports/2026-10-09-image-ledger-final-tests.txt`；doctor **PASS**。此前 189/180/173/171/169 等日志各自保留为对应实现阶段的历史证据。v4 仍为 **HALTED CONFLICT**，最后确认 8,500/13,193、后处理 0；整体九项端到端验收仍 **IN PROGRESS**。交付输入草稿的未来导出、回导、视觉和 Present 项继续 **NOT RUN**。

用户报告五小时额度剩余 97% 后继续，仍保留剩余 3% 时暂停的阈值；当时可用工具不能读取实时百分比，此处是用户报告，不能描述为实时监测。后续实时工具核对与恢复记录见下文。

## 新节点 IMAGE 生存检查与 v5 开始

新节点 IMAGE 赋值前的检查已实现，并在新实例填充覆盖与文字样式异步等待后的 setter 边界执行。只在该新节点 pending 写步骤内，核对不可变资源 signature、原账本 hash 与当前映射，再同步检查 handle；缺失时从相同 bytes 重建，要求相同 hash 及存在的 handle。旧账本 hash、旧节点和编辑保护保持原样，plan/audit/read 不创建图片；该实现快照的批节点上限为 250，IMAGE 描边仍被契约拒绝。异常保留 pending，不通过无限重试或修复旧 fills 掩盖冲突。详细行为见[生成指南](../guide/generation.md#可编辑内容与保真边界)。

完整 `npm test` 为 **201/201 PASS**，0 fail/cancelled/skipped，日志 `.local/reports/2026-10-09-image-lifecycle-final-tests.txt`；doctor **PASS**。新增七项 API double 用例覆盖同 hash 重建、异步字体等待后的检查、实例覆盖、只读及已有空填充不被修复、错误保留 pending 和已记账恢复不重复创建。该实现状态为 **IMPLEMENTED CONTRACT TESTED**；没有将替身执行重建等同为真实宿主重建分支已观察到，实机全量仍 **NOT VERIFIED**。

v5 来源 `.local/archivelens-derived-v5-image-live/` 仅将 spec ID 改为 `archivelens-native-v5-image-live-20261009`，全部节点、资源、反应和 flow 与 v4 一致；原始文件 SHA256 为 `0f560dd21dd4ffc64c259ba32741b60b2501d4d5d5698cffc398de76afc36fcd`。旧 v4 的 8,500 节点冲突及失败证据完整保留，没有重新填充旧节点或解除其 guard。

独立 Page 16/root `21:10117` 的 v5 plan `op-1c0db5b0-ee8e-454b-ac91-14e18c39ad6a` 实际返回 **PLANNED**、writes0，原生规格 signature 为 `6d0c2c4f4b0c719d00f3ea90e465e5af02cd466a3ccbd72424a767d0a5bff893`；六项字体替代仍实际为 Noto Sans SC Regular。真实 CLI startedAt 为 `2026-10-09T07:14:43.490Z`。`2026-10-09T07:15:13.072Z` 已确认 apply `op-7836dabb-1f22-421d-a58e-c655f1718ab6` 为 **IN PROGRESS**，500/13,193、后处理 0、pending null。证据位于 `.local/live/full55-v5-image-live-evidence/`；这只是当时已确认检查点，后续进行中的状态可能变化，不是完成结果。

v5 会话显式使用 180,000 ms 等待预算、250 节点批次、2000 审计分页和 timerUnit seconds，均在既有边界内；它们不保证完整生成或允许盲目重放。交付草稿仅补真实运行起点和规格签名确认，未来导出、独立回导、视觉与 Present 保持 **NOT RUN**。九项整体端到端验收仍 **IN PROGRESS**。

## 批节点上限 500 的契约验证

输入归一化、MCP schema 与插件运行时的 `batchSize` 上限已统一为 500，必须为 1–500 的整数，默认仍为 100；501、1000、非整数或字符串等输入继续拒绝。创建与后处理共享本批工作预算，作用域、规格签名、所有权、编辑冲突、pending、回读和幂等保护保持，请求期限仍最多 180,000 ms。

对应完整 `npm test` 为 **205/205 PASS**，0 fail/cancelled/skipped，日志 `.local/reports/2026-10-09-batch-500-final-tests.txt`；包含批边界、创建与后处理共享预算以及分批恢复用例。201/194 等结果保留各自历史实现范围。500 批节点契约为 **IMPLEMENTED CONTRACT TESTED**，这次快照的 v5 实际插件和会话仍按 250 执行；实机 500 批的性能及完成情况尚 **NOT RUN**，不能把契约通过写成全量生成或完整验收通过。

## v5 未知结果核对与 500 节点恢复

205 项测试构建后，`2026-10-09T07:20:42Z` 两批之间观察到短暂断开重连，最后确认 4,250 节点；下一操作的本地结果为 **OUTCOME UNKNOWN**。主代理未在原生 request 日志找到该请求，operation 查询实际返回 `AUDIT_FILE_MISMATCH`；不能据此写成 `NOT_FOUND`、已取消或成功。生成物变化与重连的关联仅为 **INFERRED**，未证明自动热重载的具体因果或普遍 Figma 行为。此后构建及重载应放在停止发写命令的已确认安全检查点。

同一 spec/run/Page 16 的只读恢复审计 `op-eb35be4a-ef28-43e3-bd0b-d765148cd6a7` 实际收齐三页、4,250 节点，`pagination.complete=true`、writes0、pendingnull；合并证据位于 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.audit.op-eb35be4a-ef28-43e3-bd0b-d765148cd6a7.json`。结果为 **FAIL**，仅有 MISSING_NODE 8943、REACTION_MISMATCH 512、LAYER_ORDER_MISMATCH 994、FLOW_MISMATCH 1、DESIGN_NOT_COMPLETE 1；没有其他 guard 错误。这是未完成文档的完整只读核对，不是最终审计通过。

更新同范围 grant，并用 `.local/live/session-full55-v5-image-live-500.json` 重启 CLI 后，显式 reconcile `op-d8965e73-1aae-4991-af2e-50491d940a45` 在 `2026-10-09T07:32:18.598Z` 返回 **IN PROGRESS**、4,750/13,193、后处理 0、pendingnull；CLI intent 也恢复 **IN PROGRESS**。本次真实配置为 500 节点批次、180,000 ms 预算、2000 审计分页及 timerUnit seconds。实际新增 500 节点，延迟 39,787 ms，单批原生执行 **PASS**；一个批次不保证后续性能或完整生成。reconcile 及 state 证据在同一目录，没有更换规格、页面、根或解除保护。

最终完整生成、正式最终审计、原生 `.fig` 导出与独立回导、12 个视觉样本和 5 个 Present 用例仍未验收；未来交付字段保持 **NOT RUN**，九项整体仍 **IN PROGRESS**。205 测试仅是当前契约验证，不把本次恢复扩大为全量交付完成。

## 额度冲突下的保守暂停检查点

用户此前报告五小时额度剩余97%，并要求剩余3%时暂停。随后工具返回的截图显示0%，但截图为 Codex 用量页面，文字状态仍为 Figma；两个表面不一致，实际实时额度为 **NOT VERIFIED**。因此保守暂停，不能把0%写成独立核实结果。2026-10-09T07:44:24Z 保存记录时，全部生成 CLI 已退出，无待确认原生写入；全量 state 保留 **IN PROGRESS**、4,750/13,193、后处理0、pendingnull，最后原生确认时间仍为07:32:18.598Z。详见本地记录 `.local/reports/2026-10-09-quota-pause-checkpoint.md`。

暂停前独立 Page17/root `21:15374` 的 `nested-timer-probe-v1-20261009` 已完成5节点生成；只读审计 `op-5046269f-7aa7-46b7-b212-a68919a0f44e` 于07:39:27.65Z 返回 **PASS**、0 errors、writes0。证据位于 `.local/live/nested-timer-probe-v1-evidence/`。该探针的 Present、实际计时和原生回导仍 **NOT RUN**；结构通过不能证明嵌套节点计时反应能播放。

该暂停检查点的恢复条件为确认当前实际额度、重新绑定 Figma 窗口并核对同文件、同页和授权有效期。先完成嵌套计时探针的 Present 核对，再继续同规格 v5 分批创建与后处理；停止原生写入后才构建或重载插件。该快照仍剩8,443节点创建及13,193节点后处理，随后执行完整审计、视觉和交互、真实 `.fig` 导出与独立回导、交付门禁。任务未完成，没有暂存、提交、push或发布。

## 实时额度核对与恢复执行

2026-10-09 18:02（Asia/Shanghai），实时用量工具返回五小时窗口 `windowDurationMins=300`、`usedPercent=1`，即该时间点剩余99%；任务恢复为 **IN PROGRESS RESUMED**。用户要求的剩余3%暂停阈值继续有效，后续判断需重新读取实时工具，不把这个时间点的99%当作持续监测。此前97%用户报告与0%表面不一致截图的保守暂停记录保留，0%仍不是独立核实结果。恢复观察记录为 `.local/reports/2026-10-09-resume-quota-timer.md`。

本机 Figma 126.9.13 的 Page17 嵌套计时探针实际 Present 为 **PASS**，范围仅限自动到达行为：从顶层 A `21:15375` 开始，未手动导航时观察到绿色 B `21:15376` 及“B：已自动到达”文字，重启后再次观察到 B。该规格唯一反应位于 A 的直接子 Frame，5节点原生审计仍为 **PASS**；播放证据来自主代理实际 UI 观察，不是结构审计推断。未逐帧测量跳转时间，精确1秒为 **NOT MEASURED**，该探针原生 `.fig` 独立回导为 **NOT RUN**；未另存播放截图，不能替代55场景验收。

回到同文件 Page16/root `21:10117`，核对连接身份与同规格授权后，只读 plan `op-ef5c4522-56e5-4bb5-be17-47454a0fac79` 在 `2026-10-09T10:07:15.687Z` 返回 **PLANNED**、writes0、4,750节点检查点，规格 signature 保持 `6d0c2c4f4b0c719d00f3ea90e465e5af02cd466a3ccbd72424a767d0a5bff893`。随后500节点批次继续执行；当时完整 apply `op-dc437453-7758-4592-8912-5edf1680b137` 在 `2026-10-09T10:13:15.414Z` 确认 **IN PROGRESS**、7,750/13,193、后处理0、pendingnull。证据为 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.apply.op-dc437453-7758-4592-8912-5edf1680b137.json`；确认数量取自完整原生回复，不把进行中的 CLI intent 作为成功结果。此处保留恢复阶段的历史快照，当前结果见下文全部节点创建后的流程冲突。

该快照尚需5,443节点创建及13,193节点后处理。完整55场景最终审计、12幅视觉样本、实际完整流程与滚动、真实 `.fig` 导出及独立回导、交付门禁仍为 **NOT RUN**，九项整体验收仍为 **IN PROGRESS**。该恢复快照尚未重新运行测试，205项为此前实现的完整运行结果；后续异步保护修复的208项测试见下文。规格、字体替代、旧失败页面及禁止绕过保护的边界保持；未暂存、提交、push或发布。

## 异步 guard 验证的安全停点

主代理在7,750节点的已确认安全检查点停止发写命令；生成 CLI35730 的 quit 返回退出码0，`2026-10-09T10:13:41Z` shutdown。当时 execution 为 **IN PROGRESS SAFE CHECKPOINT ASYNC GUARD VALIDATION**：任务转入异步保护风险验证，原生生成尚未完成，此次不是额度阈值暂停。

只读审查发现待验证风险：后处理在 `setReactionsAsync` 等待后，下一个 Frame 的 `orderChildren` 缺少新鲜检查，可能覆写用户对 `numberOfFixedChildren` 的修改。该审查快照不证明本轮已实际覆写用户数据；当时确定性复现、最小修复及其验证正在进行，尚不记为修复 PASS。主代理仅在原生写入已停止的检查点安排构建或重载；对应同步范围及来源记录在 `.local/reports/2026-10-09-resume-docs-sync.md`。

## 异步修改边界的保护修复与契约验证

上述风险已用三项确定性 API double 回归复现。修复前 `.local/reports/2026-10-09-full55-guard-red.txt` 记录63项测试、60 pass、3 fail：reaction await 期间修改后续 Frame 的固定子节点数、同节点 reaction await 期间改几何、text style await 期间将新节点移到另一 Page。旧实现分别覆盖了编辑、接纳了变更或继续向范围外节点赋填充；这是替身执行中的失败，不证明实机已发生用户数据覆写。

最小修复位于 `.research/local-figma-bridge-poc/plugin/design-runtime.mjs`：`orderChildren` 在入口重新执行新鲜 `checkNode` 与 `checkReadback`；`setReactionsAsync` 返回后对同节点再次核对；`setTextStyleIdAsync` 返回后核对节点 scope、ownership、原父节点恒等以及父节点 scope/ownership。失败不自动清除既有 pending，旧输入、账本及失败页面保持，不通过放宽保护掩盖冲突。修复后 `.local/reports/2026-10-09-full55-guard-green.txt` 为 **63/63 PASS**、0 fail/cancelled/skipped；上述三条失败路径均被拒绝且保留编辑或空填充。具体事件及原始摘要保护见 `.local/reports/2026-10-09-full55-guard-readonly-review.md`；写入前发现后续 Frame 编辑时 pending 仍为 null，同反应源或新文字节点已开始的写步骤则保留其 pending。

主代理在原生 CLI 已退出的安全检查点执行完整 `npm test`，包含 pretest 插件构建；`.local/reports/2026-10-09-async-guard-final-tests.txt` 为 **208/208 PASS**、0 fail/cancelled/skipped，实际退出码0。generated `--check` 与 doctor 的主代理执行结果均为 **PASS**。205项及其日志保留为批节点上限变更的历史范围。异步保护状态为 **IMPLEMENTED CONTRACT TESTED**；真实宿主错误分支仍为 **NOT VERIFIED**，不把 API double 回归当作真实用户编辑事件或生产可用证明。原生全量生成仍需在同规格、同 run、同 Page 的检查点继续；最终审计、视觉与 Present、真实 `.fig` 导出及独立回导仍为 **NOT RUN**。

## 全部节点创建后的原生流程冲突

同规格、同 run、同 Page16 的原生续建已从7,750推进到全部13,193节点创建，并完成584节点后处理。最新 apply `op-0547021d-642d-4512-b640-ae5b4eb45d50` 在 `2026-10-09T10:45:17.643Z` 返回 **PARTIAL FAILURE**，错误为 `DESIGN_NATIVE_FLOW_CHANGE_CONFLICT`，`finalized=false`，下一动作为audit。证据为 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.apply.op-0547021d-642d-4512-b640-ae5b4eb45d50.json`；本地state亦保留同operation ID的 **PARTIAL FAILURE**。全部创建不等于完整生成或验收通过。

失败pending为reactions，节点键 `extra-compact-review-menu/portal-extra-compact-review-menu-4`，开始于 `2026-10-09T10:45:17.506Z`；其记录的flowBefore只有 `Flow 1`，对应 `extra-compact-update-disabled/scene`、宿主 `21:10324`。主代理在Page16 UI实际观察到 `Flow 1` 与 `Flow 2`；该观察为 **OBSERVED**，成因为 **NOT CONFIRMED**，独立小探针准备中。没有据此归因于用户编辑、宿主自动行为或代码，也不清空pending、放宽Flow保护或盲目重放。

该流程冲突快照中，主代理五小时实时额度工具读取剩余48%，继续保留剩余3%暂停要求；精确读取时间未单独提供，此处按主代理实际工具读取来源记录，不能当作持续实时百分比。18:02的99%及此前额度冲突暂停仅为历史记录。208/208契约测试在该快照仍为 **PASS**，正常原生续建已观察到；新增异步保护的真实错误分支仍为 **NOT VERIFIED**，本次流程冲突不替代这些分支验收。后续诊断套件与25%读数见下文。

当前尚需12,609节点后处理，并先核对pending与流程变化。完整55场景最终审计、PNG视觉验收、实际完整Present流程与滚动、真实 `.fig` 导出与独立回导及交付门禁全部为 **NOT RUN**。九项任务尚未全部完成；没有暂存、提交、push或发布。

## 原生流程只读诊断与独立探针对照

新增有界只读 `prototypeState` 回读Page流程与同Design命名空间的持久状态，并在未来反应pending中记录 `flowAfter` 与 `reactionReadback`。该改动不采用旧pending。当时完整 `npm test` 快照为 **214/214 PASS**、0 fail/cancelled/skipped、退出码0，pretest包含插件构建，日志 `.local/reports/2026-10-09-native-flow-diagnostic-full-tests.txt`；208/205保留各自历史范围。该快照中后续v2尚未验证，不能沿用214项结果；后来的223项范围见下文。

主运行节点 `21:10855` 的只读回读于 `2026-10-09T11:02:07.935Z` 确认：Flow 1仍在顶层 `21:10324`，Flow 2在pending源的顶层 `21:10319`；节点已有ON_CLICK导航到 `21:10303`，主代理核对其与精确输入一致。证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.read-node.21%3A10855.1791543727935.json` 中，prototypeState为 **PASS**、writes0，只证明只读元数据完整；cursor13193、finalizeCursor584不变。旧pending的flowAfter和reactionReadback均 **NOT RECORDED**，sourceReactionRecord为 **MISSING**，所以现有反应与流程外观不能替代持久成功证据或授权采用旧pending。

独立Page18/root `22:24192` 的断开链6节点探针实际复现追加Flow 2：apply `op-85c3e5e2-df98-4b39-afa0-7e0c203037a3` 于 `2026-10-09T11:06:46.217Z` 返回 **PARTIAL FAILURE**、6/6创建、后处理5、pending `C/c`、同错误 `DESIGN_NATIVE_FLOW_CHANGE_CONFLICT`。`11:06:46.230Z` 的只读证据 `.local/probes/native-flow-disconnected-probe-v1-evidence/native-flow-disconnected-probe-v1-20261009.read-node.22%3A24198.1791544006230.json` 记录before只有Flow 1(A)，after保持Flow 1(A)并新增Flow 2(C)，新pending的flowAfter与reactionReadback均 **RECORDED**。该原生复现证明本宿主这条断开链会追加流程，不证明旧full55变化必由宿主造成。

对照的独立Page19/root `22:24201` 连续链6节点探针生成 **COMPLETE**、后处理6、pendingnull；只读审计 `op-2a2704b3-d6c9-4d96-b665-4da10e0c21c3` 于 `2026-10-09T11:10:04.695Z` 为 **PASS**、0errors、writes0，确认6nodes、2reactions、1flow。证据 `.local/probes/native-flow-connected-probe-v1-evidence/native-flow-connected-probe-v1-20261009.audit.op-2a2704b3-d6c9-4d96-b665-4da10e0c21c3.json`。这仅是结构与生成对照，实际播放仍未验证，不代表完整55场景审计或回导通过。

主运行仍 **PARTIAL FAILURE**、13,193创建/584后处理，未采用旧pending。主代理确认所有CLI已关闭、无原生写入进行中；最近一次五小时工具读取剩余25%，3%暂停阈值继续有效，精确读取时间未单独提供。完整55场景的最终审计、视觉、Present、真实 `.fig` 导出及独立回导、交付门禁仍全部 **NOT RUN**，没有全部完成声明或Git写入。

## 局部失败状态的原生备份

主代理已从Figma保存局部失败状态的真实`.fig`，报告为 `.local/reports/2026-10-09-partial-fig-backup.json`。对应 `.local/live/full55-v5-image-live-evidence/ArchiveLens-Full55-PARTIAL-before-flow-adoption-20261009.fig` 实际大小4,032,224字节，独立文件SHA256核对为 `d45c328d3c91d1aee58c60c42b8bfc952278f738a248406b8ddb88dd717a3a6d`，与报告一致，创建时间 `2026-10-09T11:19:10.022Z`。状态仅为 **PARTIAL BACKUP ONLY**；未执行该文件的完整55场景独立回导或最终验收，不将备份计为交付通过。该备份快照时v2尚待验证、最近完整套件为214项；随后工具读取剩余6%，3%暂停阈值继续有效。此处保留历史报告，后续223项验证及额度恢复见下文。

## v2流程契约验证、额度暂停与新轮恢复

上轮完整 `npm test` 包含pretest构建，`.local/reports/2026-10-09-native-flow-v2-final-tests.txt` 确认 **223/223 PASS**、0 fail/cancelled/skipped，主代理核对实际退出码0与generated `--check` **PASS**；其中包含runtime71及main25的目标范围。v2登记严格单个末尾追加流程并验证成功receipt，保留外来起点，流程更名/删改或摘要变化拒绝，v1首个Flow 1记录仍兼容。运行时精确采用要求旧pending operation ID和当前流程/反应摘要完全一致；记录标记 `CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED`，保留legacyPending，不追补原setter成功记录。该实现为 **IMPLEMENTED CONTRACT TESTED**；该历史快照中的原生v2及显式采用仍 **NOT RUN**，公共归一化、MCP/CLI入口尚待补齐。223只覆盖上述实现快照，后续入口及独立原生v2结果见下文，不能追溯改写本次验证范围。

主代理在 `2026-10-09T11:25:55Z`（19:25:55，Asia/Shanghai）五小时额度剩余3%时实际暂停，原生状态仍为13,193创建/584后处理、PARTIAL_FAILURE，旧pending未变；没有在阈值后继续原生写入。本轮 `2026-10-09T12:20:50Z`（20:20:50，Asia/Shanghai）实时工具读取重置后的剩余99%，恢复入口与文档工作，3%暂停要求仍生效。当前无新原生完成证据，完整55场景最终门禁仍 **NOT RUN**；223项通过不等于主运行已恢复。

## 公共采用入口与原生v2小例验证

公共归一化 `design/commands.mjs`、MCP `mcp/server.mjs` 及持久CLI `scripts/workflow.mjs` 已落地 `adoptNativeFlow` 的严格三个字段，状态为 **IMPLEMENTED CONTRACT TESTED**。仅 `scope_design_apply` 且显式 `reconcile=true` 可携带该对象；CLI仅从当前 `reconcile` 请求透传，不从配置读取、不默认生成，新请求ID与原pending ID分开。输入缺项、多项、无效摘要、错误命令或非显式reconcile均拒绝，未知结果与作用域保护保持。完整 `npm test` 日志 `.local/reports/2026-10-09-flow-api-resume-full-tests.txt` 包含pretest构建，**226/226 PASS**、0 fail/cancelled/skipped，主代理核对实际退出码0；223/214/208/205保留各自历史快照。使用顺序与摘要来源见[显式采用指南](../guide/generation.md#显式采用旧反应中断状态)，不能以参数齐全代替写授权或盲目重试。

Page20/root `24:24210` 的独立v2断开链A→B、C→D探针，apply `op-dd4db2ae-8ee8-474e-9d92-8b0fde5a7a42` 在 `2026-10-09T12:31:25.115Z` 返回 **COMPLETE**，6/6创建及后处理、pendingnull。证据 `.local/probes/native-flow-disconnected-probe-v2-evidence/native-flow-disconnected-probe-v2-20261009.apply.op-dd4db2ae-8ee8-474e-9d92-8b0fde5a7a42.json`。audit `op-c3535bf4-e33a-4acd-a489-f1609af3f35d` 在 `12:31:31.509Z` 返回 **PASS**、writes0、0errors，计数6nodes、2reactions、2flows，正式起点为Probe A/C；证据为同目录的 `.audit.op-c3535bf4-e33a-4acd-a489-f1609af3f35d.json` 文件。

`12:31:53.838Z` 的源C/c `25:24216` 只读证据 `.local/probes/native-flow-disconnected-probe-v2-evidence/native-flow-disconnected-probe-v2-20261009.read-node.25%3A24216.1791549113838.json` 确认第二项v2观察具有 `NATIVE_SETTER_READBACK`、与完成记录一致的reactionDigest、原setter的reactionReadback及operation ID，完整链为Flow 1(A)后追加Flow 2(C)。元数据自己的 `chainVerification` 仍为 **NOT VERIFIED METADATA ONLY**，链验证来自另行执行的完整审计PASS。真实普通v2路径为 **VERIFIED**，范围仅此6节点隔离小例；Present、显式采用、主55最终验收均未由这组证据验证。

主55最后确认仍为 **PARTIAL FAILURE**、13,193创建/584后处理，原pending未采用；显式采用实机为 **NOT RUN**。完整55最终审计、视觉、Present、真实`.fig`导出/独立回导与交付门禁仍 **NOT RUN**；小例和226项入口契约通过不能计为主运行恢复完成。

## 主运行完整未完成态审计与采用确认停点

主运行只读audit `op-ca802f1a-40f8-49f5-9ac8-e457fbe20834` 已合并七页，pagination.complete=true、totalNodes13193；证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.audit.op-ca802f1a-40f8-49f5-9ac8-e457fbe20834.json` 为18,441,572字节，collectedAt `2026-10-09T12:36:59.581Z`、capturedAt `12:45:28.135Z`。完整快照签名为 `d5bd31ccf303acf4b110ea2c09ace6deb23472427a99e115ea2592a0080e3368`；状态 **FAIL**、writes0。这是未完成态的完整审计收集，最终完整生成后的审计仍 **NOT RUN**。

该快照确认13,193nodes、4,170texts、33components、713instances、50textStyles、102variables、8reactions、2flows。734项错误只包含REACTION_MISMATCH731、FLOW_MISMATCH1、UNRESOLVED_PENDING_OPERATION1、DESIGN_NOT_COMPLETE1；没有属性、所有权或层级错误报告。当前checkpoint仍13,193创建/584后处理、finalizedfalse，原reaction pending和旧operation ID保持；数量和错误列表不能证明视觉保真、反应来源或实际播放通过，不能通过重试/放宽保护消除该FAIL。

节点数组长度及唯一stable key均为13,193，主代理另行核对key集合与不可变spec完全相等。审计文件独立SHA256为 `cdd4d561dc10d5081f64428a69db234f2df2ea82623a6f7194f5a11281965603`；这些完整性检查不改变未完成态FAIL或旧setter来源未验证的边界。

fresh proposal `.local/reports/2026-10-09-full55-flow-adoption-proposal-fresh.json` 依据 `2026-10-09T12:34:14.699Z` source21:10855的新只读证据，createdAt `12:34:33.839Z`；证据SHA256已核对，与提案一致。两个语义摘要与旧提案相同，旧pending.flowAfter/reactionReadback仍 **NOT RECORDED**、sourceReactionRecord仍 **MISSING**，原setter来源为 **NOT VERIFIED FOR LEGACY FAILURE**。提案仅针对该精确当前状态；不重放原setter、不补造原成功记录，相同摘要不自动获得采用授权。

此前主代理请求用户对fresh proposal明确确认，12:47停点尚无回复，execution为 **WAITING EXPLICIT ADOPTION APPROVAL**，原生采用 **NOT RUN**。完整审计后CLI73982正常quit、exit0，插件关闭、Page16身份保留；`2026-10-09T12:47:06Z`核对无原生写请求进行中，五小时工具读数剩余57%。这不是剩余3%额度暂停；99%与57%保留为当时快照。安全停点见 `.local/reports/2026-10-09-flow-api-native-v2-resume.md`，此处保留历史等待状态，后续用户授权见下文。未完成态完整FAIL、原pending和局部备份继续保持；完整55视觉、Present、真实`.fig`导出/独立回导和交付仍 **NOT RUN**，未暂存、提交、push或发布。

## 明确授权后的未执行采用状态

用户明确回复允许采用已核实状态并继续，主代理转述该实际回复，本实例等待确认解除。当时execution为 **USER APPROVED NOT EXECUTED**：实际提交前不记为原生恢复PASS或已完成。旧proposal及handoff的待确认文字仅是历史快照，不要求重复确认；其语义摘要用于精确状态核对，不能证明旧setter来源。

主代理 `2026-10-09T13:10:43Z` 的五小时实时工具读数剩余51%，3%暂停阈值继续有效；该百分比只代表时间点快照。实际采用前核对同文件/Page16、原检查点、当前反应/流程摘要及有效grant，提交后以真实完整回复和只读核对确认。该提交前快照为13,193创建/584后处理、原pending不变、原生采用 **NOT RUN**；后续实际采用见下文，不追溯把获得授权记为已执行。

## 精确当前状态采用的实机确认

用户授权记录 `.local/reports/2026-10-09-full55-flow-adoption-human-approval.json` 保留实际提交前的USER_APPROVED_NOT_EXECUTED。执行前比对 `.local/reports/2026-10-09-full55-flow-adoption-execution-readback.json` 为 **APPROVED SNAPSHOT MATCH**，依据 `2026-10-09T13:12:58.907Z` 的精确源节点只读证据，createdAt `13:13:31.695Z`；三个采用字段与批准提案一致，身份、规格、run和Page16保持。

原生reconcile `op-78451ea8-171c-46f0-9a82-b1c15d05985d` 在 `2026-10-09T13:15:32.960Z` 返回 **IN PROGRESS**、13,193/13,193创建、1,084后处理、pendingnull、finalizedfalse且无错误。完整证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.reconcile.op-78451ea8-171c-46f0-9a82-b1c15d05985d.json`；主代理实际工具延迟120,169ms。该请求确认采用后继续同批500后处理，尚需12,109节点后处理，不能记为COMPLETE。

独立源 `21:10855` 回读在 `13:16:13.641Z` 确认同检查点与pendingnull，证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.read-node.21%3A10855.1791551773641.json`。nativeFlowObservation为v2、含3项；目标源观察为 `EXPLICIT_READBACK_ADOPTION`、reactionReadbacknull，recovery的新operation ID与reconcile一致、observedAt `13:14:27.459Z`、verification `CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED`。legacyPending保留旧operation ID/key/startedAt，explicitPayload恰为批准的3字段；sourceReactionRecord为PRESENT/version2，digest与批准反应摘要完全相同。

该采用状态为 **VERIFIED ONLY EXACT CURRENT STATE NOT ORIGIN**：接受并持久记录已批准的当前状态，没有重放原setter或补造原成功凭证。原失败回执、采用前完整只读审计FAIL和恢复前`.fig`备份保持；它们不因采用而改写为PASS。主代理继续顺序生成，本文只记录完整确认的1,084后处理快照，不把后续intent推定为完成。最终审计、12幅视觉、实际Present、完整真实`.fig`导出及独立回导、交付仍 **NOT RUN**；226项契约结果和历史额度快照不变。

## 只读节点预取与后续确认检查点

后续完整apply `op-c157efcc-7546-4c6f-bc12-3785bf2be45f` 在 `2026-10-09T13:24:30.008Z` 返回 **IN PROGRESS**、13,193创建/2,584后处理、pendingnull、finalizedfalse、无错误；证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.apply.op-c157efcc-7546-4c6f-bc12-3785bf2be45f.json`。仍需10,609后处理，旧明确采用与独立回读保持；该检查点早于下述优化的实际宿主测量。

运行时context新增最多16路只读 `getNodeByIdAsync` 预取，排空一窗全部读取后仍按原拓扑顺序处理结果、失败及原guard/fallback/母版检查。预取节点引用，属性快照不提前缓存，所有setter与新鲜回读顺序保持。新增三项API double回归覆盖并发上限、读取拒绝排空和下一调用安全，以及读取后范围/removed变化写前拒绝；完整 `.local/reports/2026-10-09-node-read-prefetch-full-tests.txt` 为 **229/229 PASS**、0 fail/cancelled/skipped、主代理实际exit0，包含pretest构建。runtime目标74/74、generated `--check`、doctor及diff检查PASS来自主代理实际结果；226/223等历史验证范围保持。

主代理在 `2026-10-09T14:02:37Z` 重载并配对同Page16。实际测量报告 `.local/reports/2026-10-09-node-read-prefetch-native-verification.json` 确认只读plan **PLANNED**、writes0、53,916ms；首个优化后apply `op-4599e276-2ec4-418a-826e-f1b8981269ed` 为126,612ms，完整回执于 `14:06:54.104Z` 返回 **IN PROGRESS**、13,193创建/3,084后处理、pendingnull、finalizedfalse。证据 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.apply.op-4599e276-2ec4-418a-826e-f1b8981269ed.json`；仍需10,109后处理，下一批进行中不预先计数。

此前三批约127–153秒，首个优化后批次约126.6秒仍接近该范围，结论 **NO CLEAR APPLY SPEEDUP**，真实提速 **NOT VERIFIED**；没有对等受控数据计算收益，不扩大并发或放宽guard。Figma connection issue为主代理实际UI **OBSERVED**，云同步 **NOT VERIFIED**；本地回执与契约测试不证明远程同步或持久化。五小时工具先读剩余17%、结束前最新10%，精确读取时间未单独提供，3%暂停阈值继续有效，不把重载时间当作额度时间。当前最终审计、视觉、Present、完整原生导出/独立回导与交付仍 **NOT RUN**；本次文档委派未构建、测试、操作native或Git，快照截止3,084后处理，完成最小文档检查后立即停写，不扩大审计或猜测在途批次。

## 九项能力当前剩余验收

- G0启动入口：本地启动、配对及作用域链已有验证；生产插件资格与Codex桌面MCP集成仍未验证，不能扩大本地PoC结论。
- G1采集：历史55场景转换及schema已核对；它来自2026-09-30资料，未重新运行当前应用采集，不是当前版本55状态实测。
- G2原生生成：旧v5于2026-10-10T01:46:57.122Z的完整apply确认COMPLETE、13,193节点创建/13,193后处理、pendingnull、finalizedtrue，节点阶段剩余0；随后最终原文件全量只读结构审计PASS。完整交付仍有独立门禁待验收。
- G3布局与保真：旧v5的12/12代表原生PNG已对照历史画面复核，整体FAIL；11帧含P1，紧凑更新场景有P2，具体分布见下文。文字边界及同父定位排序已有显式转换选项，字体probe只证明独立小例可读，v6五场景探针部分改善但5/5视觉FAIL；v7行内合并候选已准备，完整55修复后的原生复验NOT_RUN。字体替代批准不豁免截断/重叠，214条表现警告及两尺寸滚动门禁保留。
- G4设计资源：最终原文件完整审计PASS，确认33组件、713实例、50文字样式及102变量，errors[]。这是本次规格的资源验收，没有证明等价于历史人工165组件、959实例的语义组织。
- G5交互：最终原文件全量审计PASS，739反应和2个起点符合本次规格；采用前完整未完成态的8反应、731项反应不匹配和1项起点不匹配保留为历史。两尺寸导航、计时及滚动的完整Present验收仍NOT_RUN，结构通过与独立小例均不能替代实际播放验收。
- G6持久恢复：保护与公共MCP/CLI契约已验证，普通v2有独立6节点原生验收；主运行获明确授权后精确采用已独立回读确认，范围仅当前状态，旧setter来源未证明。2026-10-10 fresh只读确认及后续完整apply已确认当前节点阶段COMPLETE，最终原文件结构审计PASS；已DISPATCH后断连的旧op-8b来源仍OUTCOME_UNKNOWN，不能追认其成功。独立回导恢复核对尚未完成。
- G7验收证据：采用前未完成态完整审计FAIL保留；节点全部完成后的七页最终原文件只读审计PASS、writes0、errors[]。12个代表PNG导出及hash核对PASS，完整代表集视觉FAIL，不能以结构PASS替代可读性复核；完整实际Present仍NOT_RUN。
- G8交付：20节点两尺寸示例已有独立交付验证。主55已通过客户端保存完整结构 `.fig` 备份，本地真实容器检查PASS；该文件包含历史/探针页，Page16视觉仍FAIL。独立回导、语义/像素核验、回导播放和完整交付包重验仍NOT_RUN，备份不等于验收交付。

上述剩余项按当前证据划分，不删除历史失败或把小例推广为完整交付。文档检查与代码测试分开记录；本轮文档委派没有构建、原生操作、暂存、提交或发布。

2026-10-09 后续续跑快照：最新原生回执14:40:39.662Z确认13,193创建／9,584收尾、pendingnull，尚余3,609收尾。14:41:15.066Z连接随后断开，新本地intent为OUTCOME_UNKNOWN；检查日志未观察到该操作的dispatch，实际原生状态仍需恢复连接后只读核实。窗口最小化且恢复被输入保护拦截，后台停止而未盲重试，CLI正常退出。最近额度4%，尚未到3%暂停阈值；最终完整审计、视觉／Present、导出回导及交付均NOT_RUN。精确证据见状态清单的connectionInterruption及`.local/reports/2026-10-09-full55-connection-interruption.json`。

2026-10-09T14:51:25.862Z 实时五小时额度剩余3%，已按用户要求暂停，CLI已quit并exit0，不启动新批。最后确认13,193创建／9,584收尾；连接恢复与其后原生状态回读仍待进行。

## 2026-10-10 全部节点完成与最终原文件审计

原生同file `figma-file:OzCxJpHmpEUTMflnnpL5VW`、Page16/root `21:10117` 恢复连接后，fresh plan `op-f6a2e1a5-8ed8-45ac-9a13-a4f1256e7534` 于01:37:05.797Z只读确认13,193创建/10,584后处理、pendingnull、writes0；run/spec/signature及seconds计时契约不变。恢复记录为 `.local/reports/2026-10-10-complete-nodes-resume.json`，该记录的旧lastAcknowledgedFinalized字段是恢复快照，最新结果取completion字段及完整apply回执。

最终节点批次 `op-16f81855-91b3-426f-ae62-1fd9d1669d58` 的保存回执 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.apply.op-16f81855-91b3-426f-ae62-1fd9d1669d58.json` 已直接核实：capturedAt `2026-10-10T01:46:57.122Z`、COMPLETE、13,193创建/13,193后处理、pendingnull、finalizedtrue、无错误，nextAction audit。节点阶段剩余0。

随后七页最终原文件只读审计已完成，保存结果 `.local/live/full55-v5-image-live-evidence/archivelens-full55-v5-image-live-20261009.audit.op-dc1fbb91-bbb6-4ba2-b904-bc594d86b9d8.json` 已直接核实：collectedAt `2026-10-10T01:49:36.833Z`、capturedAt `2026-10-10T01:57:41.613Z`、PASS、writes0、errors[]、pagination complete true/totalNodes13,193。最终计数为13,193节点、4,170文字、33组件、713实例、739反应、2起点、50文字样式及102变量；checkpoint保持全部后处理完成和pendingnull。实际大小18,522,833B，SHA256 `b4bacca02d74427ced1a19dca7611b847b41121e22ac504a40743b51ab67ce5e` 已核对，主代理按本次manifest独立validateAudit也PASS。采用前全量未完成态FAIL仍是历史证据；此审计完成时视觉与导出门禁尚未收齐。后续12图视觉FAIL及完整结构备份见下文，独立回导、完整Present和交付仍NOT_RUN。

旧 `op-8b3c0906-9ed2-4ef8-a46e-cc8445f9aa9c` 已DISPATCH后断连，其来源仍为 `STILL_OUTCOME_UNKNOWN_CURRENT_STATE_VERIFIED_ONLY`。当前fresh回读及新的COMPLETE回执确认当前状态，不能据此追认旧op-8b成功；它也不能与昨天未观察到dispatch的op-508混同。旧精确采用、原setter来源未证明、9584中断及3%暂停记录均保留。

主代理最新实时五小时额度99%，读数精确时间未单独提供；用户要求的剩余3%暂停阈值继续有效。当前节点阶段完成不等于最终交付通过。本次仅同步保存证据与文档，未重新运行构建/测试，229/229既有测试证据仍按原时间及范围保留；本次docs-sync证据报告为 `.local/reports/2026-10-10-resume-docs-sync.md`。

## 2026-10-10 部分视觉复核失败

以下为02:01至后续10/12导出时的历史快照；当前12/12结果见[完整复核记录](#2026-10-10-12-图视觉复核与完整结构备份)。

`.local/reports/2026-10-10-full55-native-visual-review.json` 记录design_delivery_qa于02:01:26.014Z直接对照原生及历史tasks-delete PNG：visualStatus FAIL、覆盖1/12，视觉门禁为PARTIAL_REVIEW_FAIL。3个OBSERVED P1分别为摘要与系统说明重叠、任务标题/副标题截断或裁切、原始文件保留警告挤入后续警告；另有P2日期额外换行。其余11幅未复核，Present和回导像素比较NOT_RUN；原图1266×779与历史1583×974尺寸不同，本次直接复核不等于零像素比较。

`.local/reports/2026-10-10-full55-text-fidelity-diagnosis.md` 的02:07:40.611Z只读诊断指出adapter将DOM Range紧字形边界变成固定NONE文字盒，在替代字体重新排版后增加换行，而固定父块/兄弟没有跟随调整；未独立测量每字advance。字体替代批准不包含中文截断或内容重叠批准，audit结构恒等也没有证明实际行数/溢出正确。紧边界风险统计不能推广为全部文字已目视失败。

主代理本次导出进度快照为10/12代表PNG，导出继续进行；这与1/12实际视觉复核覆盖分开记录。默认兼容的opt-in文字边界修复正在开发，尚无完成或native验证结果；不提前发布未验证的新契约。当前原v5的spec/run/native未改，13,193节点COMPLETE及全量结构PASS保留，原文件可读性缺陷尚未修复；完整Present、最终`.fig`、独立回导及完整交付仍NOT_RUN。

## 2026-10-10 12 图视觉复核与完整结构备份

`.local/reports/2026-10-10-full55-original-export-progress.json` 包含12项原生PNG导出，最后一项于02:10:36.734Z保存；本轮文档同步逐份核对目标文件大小、SHA256及PNG宽高，全部一致。该导出进度报告的VISUAL_REVIEW_PENDING是导出结束时快照，后续视觉结论以独立评审为准。

`.local/reports/2026-10-10-full55-native-visual-review.json` 于02:15:05.107Z记录全部12幅对照复核完成，覆盖12/12、剩余0，整体FAIL。11帧含P1，紧凑更新场景的背景文字有P2；共22项P1、6项P2是跨帧观察次数，不是22个独立根因。问题包括文字换行/裁切/重叠、6帧图像遮挡工具栏、3帧行内文字片段断行、2帧检索进度条缺失及抽屉错误显示折叠内容。历史PNG约为采集布局1.25倍、原生PNG为1倍，此次为直接视觉复核，不宣称历史与原生零像素一致。字体替代、8处STATIC_CSS_DERIVED footer、自动提取组件语义和214项采集警告的限制继续保留。

原生客户端于02:13:15.764Z实际保存 `.local/live/full55-v5-image-live-delivery-input/expected/ArchiveLens-Full55-v5-COMPLETE-structure-PASS-visual-FAIL-20261010.fig`，4,335,023字节，SHA256为 `1c136975fa47cff353139921b2f62015c787e8fafd256acfe44a4498347d5bd1`。`.local/reports/2026-10-10-complete-fig-backup.json` 的容器检查PASS覆盖CRC、canvas魔数、元数据、缩略图及图片条目；本轮再核对本地大小/hash一致。文件级导出包含历史和探针页，结构PASS只适用于Page16/root21:10117，原v5视觉FAIL仍未修复。独立回导、完整Present、回导像素和最终交付均NOT_RUN；没有将保存备份计为验收通过。

## 2026-10-10 转换修复与字体探针的范围

capture已提供默认兼容的 `--text-bounds single-block-content`、`--paint-order positioned-siblings`，边界见[生成指南](../guide/generation.md#转换时的文字边界与同父图层顺序)。主代理实际执行快照报告定向52/52 PASS、raw55转换扩宽844处及排序0处；这些结果未单独保存日志，按主代理执行报告记录，不制造日志或视作最新完整测试。排序0与旧capture缺少positioner zIndex有关；16个overlay的静态来源补充不能替代未知兄弟的值，也不证明原生工具栏已经恢复。诊断及来源验证见 `.local/reports/2026-10-10-toolbar-order-source-verification.json`、`2026-10-10-full55-positioner-zindex-evidence.md`。

`design/enrich.mjs` 精确VECTOR提取为INSTANCE时现保留原节点显式visible（包括false），省略值不新增，避免提取阶段丢失上游隐藏状态。定向回归日志 `.local/reports/2026-10-10-enrich-visibility-red.txt` 为6/7、绿色日志 `2026-10-10-enrich-visibility-green.txt` 为7/7，无跳过；源码及日志已核对。这不等于已完成原生details的关闭效果验收。

独立字体探针 `.local/reports/2026-10-10-native-font-probe.json` 于02:30:36.727Z记录Page/root42:715八节点COMPLETE、auditPASS。原生加载并回读Noto Sans SC Regular400、Medium500和Bold700；字面请求SemiBold被记录为回退Regular400。主代理实际PNG观察中七段探针文字可读，Medium/Bold粗细可见；该小例宽度充足，原问题文字及全55 fit仍NOT_RUN。不能据此无条件切换全场景字重或宣称文字可读性修复完成。

原生源码文字边界对照 `.local/reports/2026-10-10-native-source-bounds-probe.json` 于02:39:28.883Z记录Page/root42:724共16节点COMPLETE、auditPASS、PNG导出PASS。主代理实际观察精确源portal-8/-15/-17扩宽后额外换行消失，portal16仍保持两行，三段inline未扩宽对照一致。该flattened探针未包含原父裁剪、完整场景和其他文字，不能推广为全55修复；`Semi Bold`另一拼写也回退Regular。

`--native-controls sampled` 的来源补充、采样表示及CLI已实现，默认仍为captured。来源记录 `.local/reports/2026-10-10-native-control-source-support.json` 确认55归档有4个progress完成值及18个closed details，原输入及几何/顺序不改；adapter保留全部逻辑keys并隐藏关闭内容，按有证据的比例/色生成fill，轨道和summary marker仍UNKNOWN。定向日志 `.local/reports/2026-10-10-native-controls-target-green-v2.txt` 为94/94 PASS；来源闭合负例由 `2026-10-10-accent-source-closure-red.txt` 保留，green日志为29/29 PASS。这些源码结果尚无修正后全55原生控件视觉与播放证据。

主代理最终执行 `npm test`，`.local/reports/2026-10-10-source-fidelity-full-test.txt` 直接核对290/290 PASS、0失败/取消/跳过，含pretest实际build:plugin。源码/生成物一致性及doctor六项PASS为主代理执行报告；本轮文档委派只读日志，没有重复运行构建或产品测试。此前229完整和52定向记录仍属各自历史范围。原v5的13,193节点COMPLETE、结构PASS与12幅视觉FAIL都不因新源码测试而改变；修正后全55原生验收、完整Present、独立回导和最终交付仍NOT_RUN。

最新安全停点由主代理报告CLI69066退出0、插件关闭、没有活动原生请求；该时点不代替之后的进程核查。用户要求周额度达到100%时暂停，同时保留原五小时剩余≤3%时暂停规则，额度读取需取工具实测而非文档时间。待生成的新候选尚未提供验收结果，不提前写为旧v5已修复。

## 2026-10-10 v6 修正候选已准备

派生记录 `.local/archivelens-derived-v6-fidelity-20261010/derivation-verification.json` 于06:52:29.785Z确认 `PREPARED_NATIVE_NOT_RUN`。新规格位于同目录 `converted/design-spec.json`，SHA256为 `9ab11fc40e2f62817cb876195f65d6311a86808547bef383344d13fccdfe8514`；本次文档同步直接核对该文件hash与八类计数一致。它仍来自2026-09-30的55份历史归档，source、asset、reaction和flow parity均PASS，未重新采集当前应用。

v6含13,197节点（新增4个progress-fill）、4,170文字、33组件、713实例、739反应、2起点、48文字样式及102变量；转换记录844处文本扩宽、14处同父图层排序、18个关闭details及307个隐藏节点、3,974处批准的字体替代。14个positioner的auto值来自这批固定归档的静态证明派生，不是通用CSS解析支持或新采集computed style；此前raw55排序0的记录保留为那个输入阶段的历史。

v6原生生成、审计、视觉、Present、独立回导与最终交付均NOT_RUN。轨道/动画/summary marker未知、字体家族及粗细差异仍存在，不能把转换计数或parity PASS解释为实际画面已经修复。旧v5保持13,193节点COMPLETE、结构PASS、12/12代表视觉FAIL以及完整结构备份；候选准备不覆盖任何旧证据。

## 2026-10-10 行内文字合并与 v7 准备状态

用户本轮grilling确认沿用2026-09-30历史55场景两尺寸，批准同一行同字体片段的uniform-run合并，以可读性和可操作性验收，并继续完整修复、原生验证、真实fig独立回导与文档同步。合并的编辑规则是首个TEXT承载整行，其余原片段保留隐藏且不自动同步；不同样式、未知边界及交互源不会强行合并，契约见[生成指南](../guide/generation.md#同样式行内文字合并)。

五场景v6探针 `.local/reports/2026-10-10-native-fidelity-scene-probe.json` 于07:04:26.041Z记录Page/root43:741的1,462节点COMPLETE、结构auditPASS，5张原生PNG导出及hash/尺寸PASS，5/5视觉仍FAIL。已观察删除确认正文更可读、review工具栏恢复到图像上方、关闭details不再泄出内容，以及两种尺寸检索progress-fill可见；仍有多片段计数/页码/缩放断行、标题和备注裁切、检索工具栏被图像覆盖等问题。本次文档同步独立复核5PNG文件的大小/hash/尺寸，不把读报告写成新目视复核。探针刻意移除跨出五场景的reaction/flow，计数为0，不能证明完整739反应、计时或滚动通过。

新增 `--inline-text captured|uniform-run` 默认兼容，源实现为 `capture/inline-text.mjs`。直接核对 `.local/reports/2026-10-10-inline-text-target-green.txt` 为54/54 PASS，`2026-10-10-inline-text-full-test.txt` 为305/305 PASS，均0失败/取消/跳过，完整日志包含实际pretest build:plugin；本委派没有重复测试。此前290/229保留各自历史范围，源码测试不替代原生画面验收。

v7派生核验 `.local/archivelens-derived-v7-inline-20261010/derivation-verification.json` 于07:13:40.354Z记录 `PREPARED_NATIVE_NOT_RUN`；规格SHA256为 `6a5d710f402842f0e003819055cb6fcda6d5a37a02ef759677049df8fddd8005`，本轮直接核对一致。保留13,197节点、4,170文字、33组件、713实例、739反应、2flows、48文字样式及102变量；238个run合并、417个后续片段隐藏，source/asset/reaction/flow parity均PASS。原18个details/307隐藏是控件转换阶段计数，417是行内合并阶段计数，不能不检查集合就相加当作最终隐藏节点数。v7原生生成、审计、视觉、Present和独立回导仍NOT_RUN；旧v5原文件不变，v6只验证上述五场景失败小例。

`.local/reports/2026-10-10-weekly-quota-pause.json` 保存07:14:35.1770116Z周额度used100实际停点；CLI63636和80684退出0、插件关闭、无pending native请求。随后用户明确继续，主代理新工具读数周余94%恢复执行；精确恢复读取时间未单独提供。周额度达到100%暂停、五小时余≤3%暂停规则均保留，不用旧停点推断现在仍暂停，也不以额度恢复代替连接或原生结果核查。

## 2026-10-11 文字与层叠修复及测量边界

本轮定向同步以本地dev工作区及已保存证据为基准，报告为 `.local/reports/2026-10-11-text-layout-docs-sync.md`。未比较最新远端默认分支，`BASELINE_FRESHNESS_UNVERIFIED`；以下是本地实现、探针及准备状态，不是发布或最终交付声明。

`capture/inline-text.mjs` 现允许祖先的严格有限二维纯平移computed matrix，保留父级及直接TEXT的transform none边界，不重复应用已在捕获矩形中的平移；普通空格跨片段折叠仍保留。`capture/adapter.mjs` 为已完整证明安全的两分支flex输入增加普通流先于正z-index absolute覆盖层的排序，原几何、层级及反应不改。`plugin/code.js` 的只读TEXT诊断返回真实字号、字体、行高、字距、自动尺寸、缺字和对齐，混合或不可读值显式标记，不伪造默认值。这些支持均有负例保护，不能推广为通用CSS或自动排版。

独立 `design/text-fit.mjs` API只为来源证明的完整单行、原内容盒可容纳的文字，接受两次稳定的实际原生自然尺寸测量，并按有界比例仅缩字号。请求与原生字号及数值行高可按float32表示匹配，双读原始值仍须完全一致；共享样式、多行、已经裁切的来源、非零字距、缺字或不匹配证据均保留。几何、字符、行高、资源和交互不改，默认转换与CLI不自动启用，视觉和垂直适配仍须另验，详见[边界](../guide/generation.md#显式原生测量的单行字号适配)。

完整日志 `.local/reports/2026-10-11-text-layout-full-test.txt` 直接核对360/360 PASS。随后float32字号与行高修订完成，最新完整 `npm test` 日志 `.local/reports/2026-10-11-text-layout-float32-full-test.txt` 直接核对372/372 PASS、0失败/取消/跳过，含pretest构建；此时适配文件有45项测试。此前38项定向绿色日志仍为对应修订阶段的历史，不与最新45项混算。本轮文档委派只读源码和日志，没有重复运行源码测试或构建；契约PASS不代替原生渲染。

v7五场景探针 `.local/reports/2026-10-10-native-inline-fidelity-probe.json` 于11:29:55.087Z记录Page/root44:88的1,462节点COMPLETE、pendingnull，结构审计PASS、writes0；465文字、33组件、86实例、48文字样式和102变量。5张PNG导出及hash/尺寸PASS，但5/5视觉仍FAIL。缩放61%和49%可读是已观察改善；页码、置信度、页头与备注裁切及检索覆盖层仍待解决。此探针没有反应和flow，不能代表完整739反应验收。上文v7全55候选NOT_RUN是准备时的全量范围，未被五场景探针替代。

来源复核 `.local/reports/2026-10-11-textfit-source-diagnosis.json` 对照33个原HTML/CSS/recttext节点及5张原生、5张历史PNG。紧凑检索默认作用域换行和结果底部裁切在历史画面也存在；原HTML/规格文件名与PNG基准不同，不能把额外“样本”字样缺失全归因于字体。备注和添加备注使用Arial，不能统一称作Noto替代回归。捕获保存textContent及Range几何，未保存ellipsis绘制后的可见前缀；完整源范围已经超出内容盒时不允许把整串缩小当作保真修复。

v8全55候选 `.local/archivelens-derived-v8-layout-20261011/derivation-verification.json` 于2026-10-10T19:08:13.387Z（本地10月11日）记录 `PREPARED_NATIVE_NOT_RUN`。规格SHA256 `749747f5f5f41ccb7b2756ae093bf44b5ac27ddeba0590bdd024b74f3c8f471d` 已直接核对，55场景、13,197节点、4,170文字、33组件、713实例、739反应、2起点、48文字样式、102变量；286组合并、597个后续片段隐藏、844处文字扩宽、16个排序父级（含2个检索flex分支）。源、素材、反应和flow parity PASS只证明派生一致；14个positioner与8个检索普通流静态补充来自这批固定来源，不代表新采集或通用解析。行内597与details隐藏307属不同阶段计数，未经集合核对不能直接相加。

真实自然文字测量的旧Page47:88先完成500/703节点创建，后续遇到 `DESIGN_USER_EDIT_CONFLICT:metric/ddea9c67b9746f8aac09fcb8`。保留冲突及未知结果记录，没有重放、采用或放宽guard；原生AUTO尺寸变化不能自动解释为用户未修改。该页499个TEXT的真实属性已只读回读。剩余独立Page50:589/root50:590由 `.local/live/native-text-metrics-evidence-remaining-20261011/archivelens-native-text-metrics-remaining-20261011.apply.op-81f24867-6ce4-40f1-938d-8d000e9fd05b.json` 直接确认204/204 create/finalize COMPLETE、pendingnull，含203个TEXT。后续聚合 `.local/reports/2026-10-11-native-text-metrics-readback.json` 直接核对SHA256 `242a8cec3df1e702a9d39cb4d43292c0743b28d85fd1d490347066fc0e4eb021`、`VERIFIED_STABLE_LOCAL_MEASUREMENTS`、702/702原始双读稳定、0缺失及0错误；请求值和两份原生值分别保留。测量报告明确designAudit为未运行或不完整，nativeVisual/nativeFit NOT_RUN，不能以稳定尺寸提升为设计审计或视觉通过。

v9派生记录 `.local/archivelens-derived-v9-textfit-20261011/derivation-verification.json` 于19:17:28.333Z记录 `PREPARED_NATIVE_NOT_RUN`，规格SHA256 `11c4384ed6e6c13d2743673b3dcb65f66cf55bad293c94b0b26726cb829241e8`。在v8适配前规格中证明2,204个单行候选，702组稳定原生测量支持382处字号缩小、1,771处原宽已适合，另51候选保持；其他1,966个TEXT因隐藏、多行、未知行高、混合内容或其他不支持边界保留。来源normal/AUTO行高不估算，超出内容盒的边缘只接受严格float32表示等价证明。v9保留55场景、13,197节点、4,170文字、33组件、713实例、739反应、2起点和102变量；字号变化后精确设计系统提取产生104文字样式，非沿用v8的48。source/asset/reaction/flow parity均PASS；宽度适配报告中的nativeVisual及verticalFit仍NOT_RUN。

v9五场景Page50:794后续已完成1,462节点create/finalize，`.local/live/textfit-fidelity-probe-evidence-20261011/archivelens-textfit-fidelity-probe-20261011.apply.op-d8565f3c-cf65-4040-a4c2-142c838b0a90.json` 直接确认COMPLETE、pendingnull；同目录audit `op-ec32a8f7-c893-4539-877a-fa45b0ab03bb` 直接核对PASS、writes0、errors[]，465文字、33组件、86实例、104文字样式、102变量、0反应及0flow。五项PNG收据与实际文件SHA256/宽高逐项一致，导出核验PASS。

`.local/reports/2026-10-11-native-textfit-fidelity-probe.json` 保存主代理直接查看五图的结果：tasks-delete分页、review当前页码/置信度/页头计数、检索工具栏绘制及紧凑检索描述改善；整体视觉仍FAIL，review及紧凑抽屉页头任务标题裁切、抽屉备注断行/添加备注少字、默认检索描述末三字换行遮挡tabs。文档委派只独立核验结构及PNG文件，没有把读主代理观察写成新的目视复核。这是局部探针，不是修正版全55生成；v10更窄内容盒和normal行高备注的来源证明仅处于SOURCE_PLAN/PREPARED阶段，无原生结果，不提前记为修复完成。

旧v5的13,193节点COMPLETE、全量结构PASS及12/12代表视觉FAIL保留。v8/v9尚未完成全55原生生成与审计；字号适配后的完整场景复验、739反应与2起点的Present、修正版真实 `.fig` 保存、独立回导及最终交付均NOT_RUN。当前整体视觉仍FAIL，未将候选准备、测量完成或源码测试写成全部修复完成。

## 2026-10-11 v10 五场景修复验收

v10规格 `.local/archivelens-derived-v10-sourceproof-20261011/converted/design-spec.json` 的SHA256为 `08711ce1c1eedf7303f2d3681c8ecea10729e01719c053d07fc02abf3874602e`。全55候选保留13,197节点、4,170文字、33组件、713实例、739反应、2起点、109文字样式及102变量；418处实测字号适配，28处固定来源文字宽度修正。14个任务标题扩至102px借用原有间隙；7个备注扩至27px，明确借用8px网格间隙而非全部位于直接父容器内；7个添加备注扩至54px且位于原父容器内。normal数值行高仍未知，未编造行高。坐标、高度、字符、父容器、交互区域及资源保持，详见局部宽度来源证明和派生断言。

Page51:2550五场景1462节点生成及收尾COMPLETE、pendingnull；结构审计PASS、writes0、errors[]。5张实际PNG的SHA256及宽高逐项核验PASS。主代理逐张直接观察确认，本批已报告的页码、置信度、缩放数字、审核计数、任务标题、备注、检索描述裁切/断行和工具栏遮挡均修复，限定五场景视觉缺陷验收PASS。证据 `.local/reports/2026-10-11-native-sourceproof-fidelity-probe.json`；接受已批准字体差异及有界字号变化，不声称像素一致。

此探针无反应和flow。紧凑默认作用域换行及结果底部裁切属于历史基准已有行为；其余50场景、全量739反应/2起点、Present及滚动、修正版真实.fig导出与独立回导、最终交付仍NOT_RUN。v9及更早失败记录保留，不以五场景通过宣称全量完成。

## 2026-10-11 v10全55场景生成完成（审计进行中）

本轮Page/root55:88使用runId `archivelens-full55-v10-sourceproof-20261011` 及上述v10规格；规格SHA256再次核对一致。[最后一批生成收据](../../.local/live/full55-v10-sourceproof-evidence-20261011/archivelens-full55-v10-sourceproof-20261011.apply.op-4d63f8e0-2b92-41a0-a331-231d8d5c7d6e.json) 于2026-10-11T09:16:51.375Z确认COMPLETE：applied、total及finalizedNodes均13,197，pending为null、finalized为true，nextAction为audit。收据SHA256为 `edb41826a7dc9d6c0b0d815ac5b119ced275dc16c34b00529c9cd2b744a9eb12`；这证明全量生成与收尾已获原生回执。

全量只读审计正在分七页采集，状态IN_PROGRESS，尚无完整结果或verifiedCounts。55场景、4,170文字、33组件、713实例、739反应、2起点、109文字样式和102变量仍是规格期望数量；不得写为本轮原生审计已确认。生成收据没有审计errors字段，也不替代结构、资源或交互审计PASS。

五场景已报告缺陷PASS、旧v5/v7/v9记录及既有372/372测试PASS均保留，本次只读日志且未重跑源码测试或构建。修正版全55视觉与Present/滚动、真实 `.fig` 导出、独立回导及最终交付仍NOT_RUN；上节五场景记录不因全量生成完成而扩大验收范围。定向同步依据见[局部docs-sync报告](../../.local/reports/2026-10-11-full55-v10-docs-sync-generation.md)，交付顺序继续遵循[原生文件交付与验收](../guide/delivery.md)。

## 2026-10-11 v10 全量审计与原生文件导出

七页稳定快照已完成拼接：[原生审计](../../.local/live/full55-v10-sourceproof-delivery-input-20261011/expected/original-audit.json) PASS、writes0、errors[]、13,197节点全部收尾；独立核对4,170文字、33组件、713实例、739反应、2流程、109文字样式及102变量。SHA256 `ca526ae2da6f4d21eb11ec50c6a9dd82fb793b0237fb9ef3b537a0875d2bb8bd`。这是上节IN_PROGRESS后的已完成结果，旧记录保留。

实际Figma桌面端选择88个顶层节点、PNG1x导出。55张场景图片按精确审计名称收集，文件来源、时间、尺寸、解码和哈希检查PASS；33个组件PNG保留但不混入场景映射。原生桌面证据为JPEG，保留原字节，并验证编码转换后的PNG与JPEG解码像素完全相同。exportSettings不在现有语义审计契约中，未声称该属性回导已验证。

通过Figma Save local copy保存真正的[修正版.fig](../../.local/live/full55-v10-sourceproof-delivery-input-20261011/expected/ArchiveLens-Full55-v10-sourceproof-20261011.fig)，SHA256 `b125a3d95cae6953d156cafd6d5826490f5e9d35cfa270a45b41e35ebba3d15a`。容器、CRC、原生canvas、元数据和缩略图检查PASS；整文件含保留的历史与探针页，当前验收范围为v10 page55:88。独立回导、55场景历史视觉复验、Present/滚动及最终交付仍NOT_RUN。事实与边界见[docs-sync报告](../../.local/reports/2026-10-11-full55-v10-docs-sync-audit-export.md)和[检查点](../../.local/reports/2026-10-11-full55-v10-native-audit-export-checkpoint.json)。

当前全量页中此前五个缺陷场景也已独立直接目视复验，限定已报告裁切、断行和工具栏遮挡范围PASS；主代理核对五份实际图片的hash/解码/尺寸/身份，并直接查看紧凑抽屉的任务标题、备注、添加备注和底部控件。见[全量页五场景视觉报告](../../.local/reports/2026-10-11-full55-v10-five-scene-visual-review.json)。剩余50场景未在这次复核中验证，不能扩大为全55视觉通过。

## 2026-10-12 五批本地提交与作用域修复

用户要求先提交当前快照，再继续修正。五批已依次提交：`86e76d8` 界面采集和规格转换、`a2684e9` 交付验证工具、`0d74127` 可恢复原生生成和审计、`27246ec` 本地启动和持久工作流、`330a030` 文档与交接。各批累积隔离测试分别为 251、262、363、372 项 PASS；文档批 105 个本地路径检查 PASS。最后一次提交为 `330a03087ee42d57d6821df63c645300b6be54d7`，没有推送、创建 PR 或发布；本机配置与仅行尾差异的第三方许可证文件未纳入提交。详见[实际提交台账](../../.local/reports/2026-10-12-commit-execution-ledger.json)。生成指南的过期概述按用户指定顺序在提交后修正，不以快照提交代表最终交付完成。

提交后发现授权 Frame root 在原生异步等待期间移到其他 Page 时，旧作用域检查可能接受 root 本身并继续写入。修复重新核对 root 当前 Page，并在空映射核验与持久日志保存处补齐检查，保留旧 pending 和失败记录。独立工作树以 `330a030` 为基线先仅应用新增测试，旧实现实际 104/107 PASS、3 FAIL；再应用修复，全量 377/377 PASS、0 fail/cancelled/skipped，doctor 六项与生成区 `--check` PASS。正常 Page/Frame、字体等待、页面切换及文字样式等待均有行为断言。见[修复验证记录](../../.local/reports/2026-10-12-scope-fix-verification.json)。这是 API double/VM 证据，真实 Figma 异步移动场景 NOT_RUN，未扩大为生产集成证明。修复及本节同步仍在工作树，未纳入上述五批提交。

## 2026-10-12 其余 50 场景视觉复核

两位委派复核者分别直接查看 25 组保存的 v10 原生 PNG 与历史 PNG，合计 50 场景、100 张图。主代理重新计算两份报告及每场景原生图、历史图、采集 JSON、HTML 共 200 个源文件哈希，验证覆盖无遗漏或重复，且与先前五场景合并精确覆盖规格 55 个 scene key。主代理另直接查看 `scan-empty/scene`、`compact-tasks/scene` 两组图片，独立确认计数断行、任务标题裁切和完成状态叠压耗时。结果为 24 PASS、26 FAIL、0 NOT_VERIFIED，见[聚合报告](../../.local/reports/2026-10-12-remaining50-visual-review.json)。PASS 仅覆盖报告列出的可读性、主要布局及遮挡标准，仍记录字体、滚动条装饰、分隔线等差异；不证明像素一致。

全量历史视觉现为 FAIL。此前五场景已报告缺陷范围的 PASS 和全量结构审计、PNG 来源、原生 .fig 容器 PASS 均保留；它们不能抵消此次新缺陷。问题包括右对齐计数断行、任务卡标签或标题裁切、混合多行文字叠印，以及 radio、颜色块、滑杆或折叠三角缺失。只读[根因记录](../../.local/reports/2026-10-12-visual-root-causes.json)分别保留源范围、规格几何和既有双读字体测量，不把多行 Range union 当作可安全重排的单行。HTML checked 属性只证明默认/序列化状态，不能通用替代真实 live checked 值。

用户手动登录后，已直接读回 Figma 原文件 `OzCxJpHmpEUTMflnnpL5VW` 和既有 v10 页面名称；没有修改已完成页或重新生成，也未导入新文件。此轮新修正版原生生成、Present、独立回导及最终交付均 NOT_RUN。下一步应从固定来源修复并使用新的 specId、run 和明确作用域，保留 v10 失败画面，不能以回导像素相同证明视觉缺陷已修复。

## 2026-10-12 右对齐计数器修复与原生探针

RIGHT 片段曾被 `uniform-run` 对齐守卫排除，原 `/32` 因此留在狭窄独立文字框中。现有守卫增加受限 `right`：相同字体样式、LTR、水平排版、同一行连续范围与已知内容边界，仍拒绝 `end`、RTL、多行、交互及重叠。新增回归在旧实现实际 40 PASS、2 FAIL，修复后 42/42 PASS，相关采集检查 74/74 PASS；主代理独立运行 42 项 PASS。

新 Page `57:715` 的 run `archivelens-right-counter-probe-20261012` 完成 13/13 节点，pending 为 null；结构审计 PASS，960×880 原生 PNG 来源及哈希 PASS。主代理直接观察四个源计数器 `0/32`、`2/32` 完整单行且无裁切，见[原生探针报告](../../.local/reports/2026-10-12-right-counter-native-probe.json)。这是独立测试框内的计数器验收，完整场景及全量修正版 NOT_RUN；旧 v10 未改动，Present、回导和云端同步未验证。
