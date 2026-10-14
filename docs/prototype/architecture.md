# 通用原型流水线

输入适配器（PRD、React、版本化 DOM capture）只负责读取证据；`prototype/core/model.mjs` 定义与行业、框架、输出工具无关的 PrototypeSpec 1.0。渲染器将页面、状态、控件和交互编译为现有 DesignSpec 1.0 或独立 HTML。桥接层继续负责授权、原生节点创建、审计和交付。

PrototypeSpec 的 ID 与内容版本分离。页面、控件、状态、动作、需求均有稳定 ID；动作引用必须存在，主流程必须连续。需求引用用于追溯，不等于需求已经正确实现。未知信息进入 diagnostics；未映射需求、无动作按钮会阻止 READY_FOR_REVIEW。真实 Figma 和人工修正量在实际验证前保持 NOT_RUN / NOT_MEASURED。

ArchiveLens 的归档 CSS 和原生控件补充规则隔离在 `capture/adapters/archivelens/`。旧 `capture/archive-html.mjs` 保留兼容导出；新入口 `capture/generic.mjs` 仅接受 captureVersion 1.0，并拒绝归档证据。兼容适配器的旧输入仍保留旧行为。

模块边界：

| 模块 | 负责 | 不负责 |
| --- | --- | --- |
| inputs | 有限读取、解析、来源标注、缺失诊断 | 执行目标项目代码、决定写入 Figma |
| core | 校验、稳定身份、需求覆盖、三方合并 | 业务项目特例、工具权限 |
| renderers | 可编辑节点、HTML 模拟交互 | 后端功能、真实账号和数据 |
| existing bridge | 现有 DesignSpec 和授权流程 | 推断需求、绕过文件和节点范围 |

Node 22.18+；根目录安装产品解析器，桥接目录保留独立依赖和测试。仓库不保存输入项目的秘密文件或真实运行截图。
