# 设计转换架构与边界

## 数据流与模块

应用 DOM 或已有场景 JSON → `capture/` 适配器 → `design/spec.mjs` 校验 → `design/commands.mjs` 请求收敛 → `mcp/server.mjs` → `relay/bridge-server.mjs` → 插件 UI → `plugin/design-runtime.mjs` → Figma 原生节点。

验收使用另一条只读链：Figma 结构审计与 PNG、客户端导出 `.fig`、回导后审计与 Present 观察 → `delivery/verify.mjs` → 带哈希的交付包。

采集适配器负责将 DOM/CSS 转成有界领域输入，不让 DOM 对象、事件处理函数和任意脚本进入桥接协议。DesignSpec 的稳定 key 表示逻辑节点；Figma node ID 只在当前文件内使用。应用源代码、真实业务执行与 Figma 预设状态分属不同系统。

## 授权与归属

桥接依次检查稳定文件身份、deny/allow 白名单、配对认证、服务端本地授权、页面/根节点作用域和任务所有权。新增 design 命令继承这些边界。客户端传来的任务标签不能替代服务端注入的 `trustedOwnership`。

普通 status/document 读取沿用原有读取接口。DesignSpec 的 plan/audit/export 因为读取任务私有映射，需要精确授权和 operationId。`design` 允许在授权范围内执行生成；文字样式和变量是文件级资源，还要求 `metadata_write` 且 payload 显式设置 `allowGlobalResources`。资源使用独立命名与归属标记，不复用不明所有权的全局资源。

带 flow 的规格要求页面根作用域。创建 flow 时保留其他起点。普通节点更新、删除和原有测试夹具继续使用各自动作权限。

## 分批、并发与未知结果

`operationId` 表示一个调用的逻辑操作，`requestId` 表示一次传输，`runId` 关联本次运行证据，`spec.id` 与内容签名标识不可变的设计版本。改变规格内容需新 spec.id；在同一 scope 继续同一版本时复用 stable key。

插件拒绝并发 DesignSpec 执行，按批次记录创建与后处理进度。节点归属、输入签名、结果指纹和根节点日志支持后续只读核验；已有人为编辑的节点不能直接覆盖。

传输超时并不代表 Figma 未写入。服务端审计阻止重复 operationId，CLI 在发送前保存 `OUTCOME_UNKNOWN`。恢复只接受有持久记录且读回一致的已完成步骤。中断在创建与记录之间时可能留下局部节点，需要人工核查或新建独立作用域；这不是通用事务回滚。

## 原生文件边界

Plugin API 用于节点与资源操作。原生 `.fig` 由 Figma 客户端保存并回导；仓库不通过拼装 ZIP 假冒可导入的 Figma 文件。容器魔数、CRC 和哈希通过仅证明文件容器完整，实际可编辑性、交互播放及视觉一致性需要本次运行的独立证据。

回导可能重写 node/style/variable ID，因此审计比较采用逻辑 key 和语义属性，并要求源文件与回导文件身份不同。原有 ArchiveLens 交付是对照材料，不能作为本实现新增运行的实机证据。

## 兼容性决策

保留原 `.research` 路径与 legacy 工具的拒绝行为，避免破坏历史验证。生成器支持有限、明确的原生属性，未支持 CSS 应由采集清单记录，不能悄悄将整页截图当成可编辑界面。文档中每项能力分别标注本地实现、自动测试与真实 Figma 结果。
