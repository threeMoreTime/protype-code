# 设计技能安装记录

## 范围与授权

用户确认采用 Impeccable 为主、UI UX Pro Max 为辅助的组合。安装仅位于本项目 `.agents/skills/`，不做用户级安装，不写入只读业务仓库 。

使用已有 skill-installer 的 `install-skill-from-github.py`，显式指定 `--ref`、`--dest` 和 `--method download`。没有使用上游 npx 安装器，没有注册 hooks、运行引擎或启动服务。

## 来源

- Impeccable：`https://github.com/pbakaus/impeccable`，提交 `e0881d2de397d5e9761d7b35ff5017d8f5ebf69b`，来源 `.agents/skills/impeccable`，技能版本 4.3.1。
- UI UX Pro Max：`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`，提交 `dcc40ff5133ef78276117db0cc34e7b83cc8aeba`，来源 `.claude/skills/ui-ux-pro-max`。保留完整 scripts/data/references，未修改上游文件。

## 验证

- PASS：Impeccable 共 57 文件，UI UX Pro Max 共 73 文件；逐文件按 Git blob SHA-1 与固定提交 tree 核对，全部匹配，无缺失及额外文件。此检查证明下载完整性，不代表安全审计。
- PASS：两者均有 SKILL.md、引用材料及脚本。项目 `.codex/hooks.json` 不存在。
- NOT RUN：Impeccable 引擎/启动器、UI UX Pro Max 搜索程序、自动技能发现。下一轮才验证实际调用。
- 未改业务代码、Figma、依赖清单或全局设置，未提交或推送。

## 使用边界与后续顺序

1. 业务源仓库始终只读，技能不得在那里运行初始化、持久化、构建、测试或修复；所有工作产物留在 protype-code。
2. 先用 Impeccable 的任务型界面（Operate）规则重新定义玩家反馈场景及视觉参考；上一轮被拒绝的蓝色卡片/软质 3D 插画不是已批准设计系统。
3. UI UX Pro Max 用于补充 H5 表单、触控、状态、排版等规则，不因“玩家”自动套游戏商城或电竞风。遵循实际技术栈，不升级或迁移依赖。
4. 产品/设计思考仍通过用户指定的 ChatGPT 网页端“6 极高”流程；只传最小脱敏事实，不发送整个源码仓库。
5. 先准备同一真实业务页面的不同视觉方向供用户选择，再执行 GPT Image 生成。图片不替代 Figma 原生可编辑和可交互结构。
6. 不自动下载或运行 Impeccable 引擎，不启用 hooks。如使用无需引擎的文档指导路径，必须如实说明未运行 context，不假称自动审查已通过。

安装完成不等于重新设计完成。本轮没有产生新的设计方向图，也没有替换此前素材。

回退范围：如用户要求卸载，仅移除这次新增的两个技能目录；本轮没有执行删除。本文为 UTF-8。
