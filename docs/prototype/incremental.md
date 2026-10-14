# HTML、文档输入与增量更新

输入支持 Markdown、UTF-8 文本、HTML、DOCX、PrototypeSpec JSON。HTML/DOCX 先提取文本再执行同一 PRD 规则，来源哈希仍取原文件。DOCX 支持常规 Heading1–6 样式；自定义样式、表格结构、图片、批注、修订和扫描 PDF 不会被自动理解。HTML 不执行脚本、外部资源或嵌入对象。DOCX ZIP 先检查路径、数量、解压大小、CRC，禁止 DTD/外部实体。拒绝未知格式，不把提取失败当作空需求完成。

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

增量边界：此版本对通用定义和按页语义文件实施三方合并、影响分析与稳定摘要；单条页面需求变化不会改变其他页面分片的字节。HTML 和完整 DesignSpec 是聚合文件，会重新打包。运行采集需显式重新传入 --captures，不能把旧采集误认为新证据。

不会自动把新 DesignSpec 打补丁到已有人工作品的 Figma 文件：现有引擎要求改变内容时使用新 spec ID，继续执行用户编辑保护。Figma 内的手工修改不能自动回灌为 PrototypeSpec，原生增量合并、更多前端框架、任意自然语言推理、PDF/OCR 仍属后续能力。这些边界在交付中保持 NOT_APPLIED / NOT_RUN，不伪报已完成。
