# protype-code

将应用界面采集转换为受校验的 DesignSpec，经本机 MCP / WebSocket 桥接在 Figma 中生成可编辑节点、组件、样式、变量和原生交互，再通过证据包核验交付结果。

实现主体位于 [.research/local-figma-bridge-poc](.research/local-figma-bridge-poc/)。目录名称保留历史兼容性。当前新增能力的本地测试和实际 Figma 验证须分别判断；请先看[当前状态](docs/verification/2026-10-08-design-pipeline.md)。

## 快速开始

需要 Node.js 20 或更高版本、npm、Figma 桌面端。Windows PowerShell 在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
Set-Location .research/local-figma-bridge-poc
npm test
```

安装脚本使用 `npm ci --ignore-scripts`，再显式构建插件和运行 doctor。doctor 检查本地依赖与构建文件；连接、字体、Present 和原生 `.fig` 回导另行验收。

接下来按[启动与配对](docs/guide/getting-started.md)配置独立测试文件。在 Figma 导入 `.research/local-figma-bridge-poc/plugin/manifest.json` 开发插件，然后完成配对和限定文件、页面、根节点的授权。

## 文档

- [文档索引](docs/index.md)：使用指南、契约、架构和历史证据。
- [采集界面](docs/guide/capture.md)：DOM、ArchiveLens 场景及转换警告。
- [生成和恢复](docs/guide/generation.md)：字体、组件、交互、分批与冲突处理。
- [交付验收](docs/guide/delivery.md)：像素比较、Present、原生 `.fig` 导出与回导。
- [DesignSpec 契约](docs/reference/design-spec.md)：可执行输入及容量边界。

本机配对记录、授权、截图、用户界面采集与交付产物放在忽略的 `state/`、`logs/` 或仓库根 `.local/`。提交源码前检查差异；安装或生成不会自动提交、推送或发布。
