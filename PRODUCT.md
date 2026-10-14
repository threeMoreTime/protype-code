# Product

## Platform

本地 Node.js CLI，离线 HTML 评审；可连接已有 Figma 桥接生成可编辑设计节点。

## Users

需要从需求或现有界面快速建立原型的产品、设计与前端人员。后台管理、移动业务、内容展示是独立验收样例，均不是硬编码的目标业务。

## Product Purpose

把 PRD 或项目证据转为可追溯的 PrototypeSpec，再输出可编辑原型。支持检查需求覆盖、页面状态、关键路径和生成缺口；迭代时保留人工修改并显式处理冲突。

## Capabilities and Constraints

- PRD 支持 Markdown、文本、HTML、DOCX 和人工编辑的 PrototypeSpec JSON。首版为确定性提取器，不声称完整理解任意自然语言。
- 项目理解首版限定 React/React Router 静态结构；不执行目标仓库、不读取隐藏文件或跟随源码符号链接。
- 运行采集针对用户已启动的本机应用，使用独立浏览器上下文；默认排除输入值和私密内容。
- Figma 延续已有授权与用户编辑保护；HTML 只模拟声明的交互，不提供真实后端业务。
- 增量合并适用于通用模型及按页语义文件。Figma 内修改自动回灌、原生增量合并、PDF/OCR 与更多框架尚未实现。
- 源码/模型校验、API 替身、真实浏览器、真实 Figma 必须分别记录，不能互相代替。

## Operating Context

所有新项目资料通过输入适配器进入通用模型。ArchiveLens 归档兼容规则隔离为专用模块。输出写入新目录，冲突未处理或引用失效时不生成可交付原型。

## Evidence on Hand

公开样例与测试位于 examples/prototypes 和 tests/prototype，验收入口位于 docs/prototype。旧玩家反馈、ArchiveLens 和日期化桥接报告仅说明历史任务的范围，不再定义产品面向的唯一业务。

## Product Principles

- 未知信息和假设必须可见。
- 原生文本、字段、页面和连线应可编辑。
- 修改需求不能静默覆盖人工修正。
- 跨领域验收优先于单项目效果。
