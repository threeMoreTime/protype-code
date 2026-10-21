# HTML、文档输入与增量更新

输入支持 Markdown、UTF-8 文本、HTML、DOCX、PrototypeSpec JSON。HTML/DOCX 先提取文本再执行同一 PRD 规则，来源哈希仍取原文件。DOCX 支持常规 Heading1–6 样式；自定义样式、表格结构、图片、批注、修订和扫描 PDF 不会被自动理解。HTML 不执行脚本、外部资源或嵌入对象。DOCX ZIP 先检查路径、数量、解压大小、CRC，禁止 DTD/外部实体。拒绝未知格式，不把提取失败当作空需求完成。

HTML 按正文顺序保留普通文本、`div`/`section` 等容器、内联文字和 `br` 换行，嵌套内容只提取一次；标题保留层级，表格行按单元格以 `|` 分隔。无法识别为 PRD 指令的正文仍进入未解决需求，不会因为缺少 `p` 标签而被忽略。脚本、隐藏内容、隐私标记和文档头不进入需求正文。

交付目录：

| 文件 | 用途 |
| --- | --- |
| index.html | 单文件、离线交互；页面导航、状态检查、表单必填/格式校验、模拟提交、计时动作 |
| prototype.json | 已合并人工编辑的可编辑通用定义 |
| generated.json | 本轮输入生成的原始基线；下一轮用于三方比较 |
| design-spec.json | 现有 Figma 引擎输入；页面/状态/控件为原生可编辑节点 |
| pages/*.json | 按稳定页面 ID 的语义分片；忽略行号变化后计算内容摘要 |
| changes.json | 新增、删除、变更、不变页面，以及保留的人工编辑和已解决冲突 |
| coverage.json | 需求映射、未解决问题、未连线状态、验证级别 |
| captures.json | 可选的运行界面证据和控件映射 |
| manifest.json | 内容版本、页面摘要、文件哈希；不对自身和 ZIP 作循环哈希 |
| prototype.zip | 除自身以外的完整目录，确定性打包 |

HTML 只使用本地脚本和系统字体，CSP 禁止外部网络请求。中文环境需要可用的中文字体（例如 Noto Sans SC、微软雅黑、苹方）。输入文字通过 textContent 显示，嵌入 JSON 转义脚本结束符。不会向后台提交表单或保存密码。Figma 中的表单是设计表示，不能像 HTML 一样输入和执行校验。

PrototypeSpec JSON 可以不声明流程（`flows: []`）。此时 HTML 默认打开第一页面的 `default` 状态；未知页面链接同样回退到该入口，已有页面动作仍可执行。

首次生成：

```sh
npm run prototype -- --input requirements.md --id my-project --out prototype-output/v1
```

复制 `v1/prototype.json` 为 `edited.json` 并修改控件文案、主题、状态等。需求更新后：

```sh
npm run prototype -- --input requirements-v2.md --id my-project --base prototype-output/v1/generated.json --edited edited.json --out prototype-output/v2
```

必须使用相同项目 ID。对象数组按 ID 合并，原始行号变化不改变身份。生成器与人工修改不同属性时自动合并；相同属性、删除/编辑、同 ID 新增、竞争排序发生冲突。冲突交付只包含 conflicts.json、merge-candidate.json 和 generated.json，退出码为 2；不会生成 HTML 或 Figma spec。现有目录永不覆盖。

例如 conflicts.json 给出 `/pages/@home/elements/@save/label`，创建 choices.json：

```json
{"/pages/@home/elements/@save/label":"edited"}
```

使用同一命令补上 `--resolutions choices.json` 并换新输出目录。选择 `edited` 保留人工版本，`generated` 接受新需求。未知/过期选择被拒绝。若冲突选择造成引用失效，先修正 edited.json 的动作/页面引用再重试；未通过模型校验不能发布交付。

后续更新继续以最近一次 generated.json 为基线，以最近一次 prototype.json 加人工修改为编辑版本。保留过的修改会继续得到保护。

1.0 增量边界：对通用定义和按页语义文件实施三方合并、影响分析与稳定摘要；单条页面需求变化不会改变其他页面分片的字节。HTML 和完整 DesignSpec 是聚合文件，会重新打包。运行采集需显式重新传入 --captures，不能把旧采集误认为新证据。

不会自动把新 DesignSpec 打补丁到已有人工作品的 Figma 文件：现有引擎要求改变内容时使用新 spec ID，继续执行用户编辑保护。Figma 内的手工修改不能自动回灌为 PrototypeSpec，原生增量合并、更多前端框架、任意自然语言推理、PDF/OCR 仍属后续能力。这些边界在交付中保持 NOT_APPLIED / NOT_RUN，不伪报已完成。

## 1.0 生成阶段的位置恢复

位置恢复通过既有 plan/apply 的可选 positionRecovery 参数执行，不新增工具或改变 DesignSpec 1.0。传输层和原生入口均仅接受 schemaVersion 为 1.0 的位置恢复；即使共享校验器支持 1.1，带 positionRecovery 的 1.1 请求仍以 DESIGN_POSITION_RECOVERY_VERSION_UNSUPPORTED 拒绝，不进入恢复写入。仅适用于 PAGE 根范围内、已生成但尚未开始 finalize 的连续前缀；完整 finalized 作品不进入此通道。每次选择 1–20 个已生成 FRAME，只恢复到同一 spec 记录的父级和 x/y，保留节点 ID、原始 intent/digest 与生成进度。

候选及其祖先不能是 COMPONENT/INSTANCE，选中的 FRAME 不能互为祖先；相关节点须保持单位平移、无旋转/斜切和自动布局。其他内容、样式、资源、图层顺序、reaction、flow、作用域或用户编辑存在变化时停止，不通过覆盖原始摘要放行。

使用现有 workflow session，先发送只读请求：

```json
{"command":"plan","positionRecovery":{"nodeKeys":["frame-key"]}}
```

核对返回的节点、当前/目标位置及 planSignature，再显式提交同一 nodeKeys 的 reconcile：

```json
{"command":"reconcile","positionRecovery":{"nodeKeys":["frame-key"],"planSignature":"<已核对的64位SHA-256>"}}
```

workflow 要求同一 run 的已保存只读计划，记录实际文件身份、完整 spec 签名及匹配的恢复内容；计划最多保留五分钟。恢复请求不得组合多批次、全局资源创建或 adoptNativeFlow。每次请求最多推进一个检查点阶段；IN_PROGRESS / nextAction=plan 时必须重新只读 plan，核对新签名后再显式 reconcile，不循环自动推进。阶段记录和整个恢复 ledger 均有界。

未知结果先读取当前计划与持久检查点，不能更换 operationId 盲目重放。恢复完成返回 apply-next-batch 后，才可继续原生成流程；位置恢复不会自行增加生成节点或执行 finalize。此通道不更改 spec 内容，不实现文字修订、任意 Figma 回灌或 1.1 原生视觉。真实宿主操作仍须取得实际文件、页面和根节点范围的授权；本地替身验证不代替真实 Figma 验收。

## 1.1 场景增量与全量目录

1.1 复用同一 `--base`、`--edited`、`--resolutions` 流程，视图、组件 family、token、资产、动作和场景按稳定 ID 三方合并。成员引用及 override 按其稳定标识合并；`flow.actionIds` 保留执行顺序，不能用集合并集改写。删除/编辑、同字段修改、竞争排序或合并后引用成环都会保留 conflicts/candidate；尚未解决时不生成 HTML 或 DesignSpec。

`sceneProjection(model, sceneId)` 和 `changedScenes(before, after)` 使用同一个依赖投影。包含完整实例/master/family 闭包、实际 paint/富文本/override 图片、显式 token 引用、局部动作与相关 flow 片段；单纯声明 asset.sceneIds 不等于实际使用。改动共享资产时更新所有真实引用它的场景；未引用场景保持原来的分片字节和 contentHash。每场景分片不包含全局 modelRevision，该值保存在根 manifest / DesignSpec，避免无关文案修改刷新全部场景摘要。

新增 scenario-manifest、asset-manifest、capability-manifest、catalog-manifest 与 dual-validation。全量目录中的每项均登记来源 ID、场景/包对应或未决原因；EXCLUDED 需要明确 reason 和已有 evidenceIds。RESOURCE 必须符合原稿 role/manuscript 字段；没有 manuscript 的条目不会按名称补造“正式/草稿”。没有业务目标的草稿、标签、搜索、分页和学习入口继续 UNRESOLVED，不新增 URL 或业务 flow。

## 分包与预算

先用纯函数 `planOutputPackages(model)` 查看闭包与预算下界，或使用 CLI 只规划：

```powershell
npm run prototype -- --input model-1.1.json --plan-only --out prototype-output/plan-v1
npm run prototype -- --input model-1.1.json --packages --out prototype-output/packages-v1
```

仅规划模式产出模型、目录、场景未决状态和预算 ZIP，不产 HTML / DesignSpec。PLANNED 和 MODEL_ONLY 不代表通过视觉、真实资产、传输或 ZIP 预算。常规单包生成仍严格拒绝未收齐的视觉证据。`--packages` 则逐包生成，缺视觉或超预算的完整包保持 BLOCKED，其他可生成包保留独立结果；CLI 有 BLOCKED 包时退出码为 2。

导航边按连通闭包分组，显式 flow 涉及的所有场景与动作归入同一包。分段资源不能使超限流程变小：单个闭包仍超节点、reaction 或 logical spec 预算时，停止该包并记录 minimumConnectedClosure。不会拆开流程后把跨包入口当作完整流程交付。

每个独立 `packages/<稳定packageId>/prototype.zip` 都自含对应模型、HTML、DesignSpec、场景、资产与 manifest。集合根保存全项目 prototype/generated/changes、目录和各包 ZIP 哈希，不制作绕过限制的大型聚合 ZIP。分包是在上游合并后的第二阶段：叶包 generated.json 明示 PARTITION_INPUT，lineage 记录集合的原始 generatedRevision / modelRevision；下一轮全项目三方增量使用集合根 generated/prototype，不能把叶包输入误作原始需求基线。人工增加导航而改变连通分组时，仍保留根基线并重新分组。

预算沿用现有限额：单包展开文件和最终 ZIP 分别不超过 32 MiB；compact logical spec 不超过 6.5 MiB；预留固定 512 KiB envelope 后不超过 7 MiB；单图 20 MiB、唯一图片合计 80 MiB、资产 2000、原生节点 25000、reaction 30000。资源按真实字节/哈希去重并验证引用，不能通过多个文件名重复嵌入同一图片。请求值是有界静态估算，未发送真实请求。

内存中的集合暂存还有 128 MiB 上限，包含所有叶包展开文件和 ZIP，并为最终索引预留空间，避免合法小输入被大量场景放大至多 GiB。达到界限的包保留完整闭包和原因，可通过 `selectOutputPackage(model, packageId)` 在独立运行生成完整包。限制只能向下收紧，不能用选项放宽上限。输出目录已存在时一律拒绝覆盖；路径还校验 Windows 保留名、大小写碰撞及文件/目录祖先冲突。

128 MiB 统计暂存文件的序列化字节，不是进程 RSS 或峰值内存保证；模型、临时渲染和独立 ZIP 校验仍会占用额外内存。

## 原生文字修订边界

原生文字窄通道要求相同 spec ID，除 source.revision 外所有非文字字段相同，节点顺序/key/type 相同，1–100 个独立 TEXT 仅 name/characters 变化，且不能有 COMPONENT/INSTANCE 祖先；还须完整 finalized ledger、相同 scope/baseSignature、原生 audit、资源/字体/用户编辑保护，并检查 base+target 整请求 7 MiB。

DesignSpec 1.1 修改正文还要求原生基线非空、只有一个覆盖全文且与节点样式一致的分段、`textAutoResize=NONE`、尺寸不依赖 HUG/FILL。检查点同时预测顶层文字、分段文字和 UTF-16 起止边界；目标文字可等长、变长或清空。复杂分段或自动尺寸无法安全预测时，plan/apply 在写入 journal 和修改节点前明确拒绝；仅修改名称不受这项正文限制。1.0 的既有窄通道与恢复协议保持兼容。

含 staged 资产的原生文字修订暂不放行：资产回执绑定原生成 runId 和 specSignature，文字修订的新 run 或目标 spec 签名会导致 DESIGN_ASSET_LEDGER_CONFLICT。不得通过复用生成 runId 绕过；即使文字修改返回 COMPLETE，重载后的目标 audit 仍可能失败。后续须保存并核验原始资产来源及恢复边界；旧账本只有 bindingHash 时不能反推来源，不自动重绑回执或迁移。

本地原型增量只生成离线交付与新 revision，`figmaLiveUpdate` 始终 NOT_APPLIED。当前 1.1 renderer 的 spec ID 和 source.modelRevision 都随模型变化，因此只改文案通常也不满足原生窄通道；changes.json 明示 NEW_REVISION 和阻止原因，不伪造 metadata 强行原位更新。不开发任意 Figma 回灌，也不会自动运行 text_plan/text_apply。完全相同模型可记录 NO_CHANGES；仅全局来源元数据变化仍是新 revision，但不会污染未变场景的摘要。
