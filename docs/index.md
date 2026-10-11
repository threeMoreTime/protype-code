# 文档索引

## 使用指南

1. [启动与配对](guide/getting-started.md)：安装、doctor、插件导入、授权与持久会话。
2. [界面采集](guide/capture.md)：准备场景、转换数据、处理不支持的表现。
3. [生成与恢复](guide/generation.md)：分批创建、字体替换、组件与交互、只读审计。
4. [交付验收](guide/delivery.md)：截图、Present、原生文件和回导验证。

## 开发与参考

- [DesignSpec 1.0](reference/design-spec.md)：运行时数据契约；最终事实源为源码校验器。
- [架构与授权边界](architecture/design-pipeline.md)：模块依赖、数据归属、失败语义。
- [测试与维护](development.md)：构建源文件、检查命令、文档维护约定。
- [本次实现状态](verification/2026-10-08-design-pipeline.md)：九项能力、验证级别和剩余条件。
- [本地改动提交计划](verification/2026-10-12-commit-plan.md)：五批依赖顺序、精确文件范围与提交前门禁。
- [2026-10-12 交接文档](verification/2026-10-12-handoff.md)：原型检查点、已验证范围、剩余验收与恢复步骤。
- [机器可读状态](roadmap/local-figma-bridge-status.json)：历史桥接结果及当前增量。

## 历史背景

[Phase 8 基线](roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md)和 `research/`、`verification/` 下原有日期报告描述各自测试时的状态。阅读旧工具清单时，以本索引链接的当前指南和源码为准；旧报告中的 PASS 不会自动覆盖后续新增代码。

文档按主题建立入口，历史研究、设计计划和已有验收证据继续保留。新的行为、契约或环境配置改动应在同一任务内更新对应指南、参考和验证状态。
