# 人工材料交接操作指南

当前模式：普通 ChatGPT 对话中的 6 Pro + 原版 C2C 本地 session/record。不是 MCP 替代协议，也不是自动浏览器桥接。不会绕过 Developer mode 或组织策略；若组织禁止普通对话共享，也必须停止。

## 外发与操作授权

人工操作是默认方式。每次外发、浏览器发送或读取都需要针对当前材料和动作的明确授权；授权不自动扩展到其他材料、源仓库写入、Figma 创建或无人值守操作。`approve` 和 `sent` 的 Agent 标签只记录授权与实际观察，不验证账户权限或网页模型身份。遇到登录、模型变化或发送结果不确定时必须停止。最终采纳仍由用户决定。

## 快速开始

在 protype-code 根目录运行：

```powershell
node --test scripts/c2c-handoff.test.mjs
node scripts/c2c-handoff.mjs smoke
node scripts/c2c-handoff.mjs status c2c-smoke
```

生成的合成草稿保存在 Git 忽略的本地运行目录中。它不含业务代码，也未自动发送。重复 smoke 不覆盖已有输入、材料或任务状态。

1. 人工打开并阅读完整 packet.md，确认只含合成信息。扫描通过不是分享授权。
2. 在 Edge 中打开被组织允许的普通 ChatGPT 对话，确认模型菜单实际显示 **6 Pro**。不可用就停止，不替换模型。
3. 人工确认后记录审核。以下代码只读取摘要，不从 GPT 文本读取任何 shell 参数：

```powershell
$handoff = node scripts/c2c-handoff.mjs status c2c-smoke | ConvertFrom-Json
node scripts/c2c-handoff.mjs approve c2c-smoke $handoff.digest I_REVIEWED_THIS_PACKET
```

4. 手动复制 packet.md 全文发送给 6 Pro。仅在发送成功且确认模型后，记录实际观察：

```powershell
node scripts/c2c-handoff.mjs sent c2c-smoke $handoff.digest '6 Pro' I_OBSERVED_MODEL_AND_SENT
node scripts/c2c-handoff.mjs sync c2c-smoke
```

以上确认参数是操作者声明，不是身份鉴权、网页截图验证或模型认证。Agent 不得因测试通过或用户泛泛同意流程就代填。若发送结果不明，先检查对话，不要盲目再发。

5. GPT 应返回完整 JSON（task、iteration、digest、complete、text）。将原文保存为 UTF-8 本地回复文件；也可以把原文发回当前任务，由 Codex 存档。不要自行把 `complete: false` 改成 true，不重新拼装缺失内容冒充完整回复。

```powershell
node scripts/c2c-handoff.mjs import c2c-smoke smoke-reply.json
node scripts/c2c-handoff.mjs sync c2c-smoke
```

6. 人工检查正文是否引用合成标记、列明两种状态、承认转换/权限/接口/运行证据缺失。仅结构校验通过不代表分析正确。确认采纳或要求修改后再记录：

```powershell
node scripts/c2c-handoff.mjs decision c2c-smoke $handoff.digest accepted I_REVIEWED_THIS_REPLY
node scripts/c2c-handoff.mjs sync c2c-smoke
```

`accepted` 可改为 `revise`。两者都只记录决策，绝不执行 GPT 文本，也不代表全部项目完成。代码实施需要具体已批准设计；后续 review 阶段再次走同样人审与发送流程。

## 文件与版本契约

- 唯一材料输入目录：仓库根目录下 Git 忽略的本地运行目录，只收人工挑选并脱敏的 md/txt/json 文件。适配器不扫描业务仓库、不调用业务接口。
- `build request.json` 的参数只能是输入目录内相对路径。JSON 字段固定为 task、iteration、sourceVersion、phase、goal、constraints、gaps、acceptance、files。参照生成的 smoke-request.json。
- phase 只能是 plan/review；files 是非空明确清单，不能用目录或通配符。每个文件不超过 32 KiB，完整包不超过 200000 字节，最多 12 个文件。gaps 不能留空，应如实列出缺口。
- sourceVersion 是人工核实的证据基线，脚本不替你验证 Git HEAD。业务仓库有 WIP 时同时记录来源文件摘要和取证时间，不能只写 HEAD 就宣称工作区内容一致。
- 每轮以 task、iteration、SHA-256 内容摘要共同绑定。摘要包含清单、约束、证据内容及其哈希；状态另存最终 Markdown 哈希。
- DRAFT → APPROVED → SENT → RECEIVED_NEEDS_USER → DECIDED。不能提前接收回复、重复导入、跨任务或跨轮接收；GPT 的补充材料请求只存为建议。
- 修改草稿或待发送材料必须将输入清单 iteration 加一后重建，不能改生成的 packet.md。DRAFT/APPROVED 可被下一轮替代；SENT 必须先取回回复并人审，不能直接跳过。旧材料和历史保留。
- 本地运行目录保存状态、材料及回复；原版 C2C 的独立镜像也只保存在本机。相关目录被 Git 忽略，不自动备份或同步。
- `sync` 只镜像**当前事件**的简短元信息，不复制材料正文、GPT 正文或真实日志。每次重要状态转移后手动 sync；本地完整历史以 state.json 为准。重复已成功事件不会追加记录。
- C2C 状态保守标记 BLOCKED，执行测试为 `NOT RUN: workflow metadata only`。这些表示交接信息，不伪装成业务代码已经执行或测试通过。

## 安全与限制

拒绝目录穿越、绝对文件参数、Windows ADS/保留名、软链接/junction、硬链接和输入/输出链接重定向。允许的文本还会扫描常见凭据、邮件、URL、机器绝对路径等；**这不是完整 DLP**，无法自动识别所有客户资料、内部术语或变形秘密。不要放真实环境文件、Cookie、私有 registry、整份锁文件或工单/聊天原文。人工最小化与审核始终必须执行。

本工具信任本机操作者，不是隔离恶意本机进程的安全沙箱；不能防止同权限进程在检查后替换文件，也不能阻止用户手动复制未经审核的草稿。确认参数和本地 JSON 可被本机用户修改，不作不可抵赖审计。

浏览器、登录、组织权限及 6 Pro 可用性由人工检查。本版本没有自动上传/剪贴板/截图读取、隐藏 API、自动补充材料 RPC、shell 执行、Figma 写入、自动重试或模型降级。

## 中断与恢复

正常重启：运行 status，从当前状态继续。完整且相同的孤立 packet/reply 可在状态写入失败后重试；不同内容拒绝覆盖。内容先写同目录临时文件再发布，部分写入不会成为最终材料；残留 `.tmp` 不能作为材料发送。

进程强制中断可能留下本地锁。先核对锁内 PID 对应进程、命令和启动时间，确认无活动写入者，检查状态与材料完整性后，仅清理该明确失效锁；不要清空整个目录。未实现自动抢锁或断电级事务保证。

C2C 同步在调用前标记 STARTED，成功后为 DONE。STARTED 表示可能已部分完成；禁止自动重放 record。先检查本地 executions 记录中的事件 ID 和 sessions 状态，备份原状态并确认实际结果后人工修复对应事件；不确定时保持阻塞。此时本地材料仍保留，但不能报告镜像完成。不要重新启动桥接或使用会改全局配置的 `c2c setup` 恢复此流程。

## 真实业务开始条件

合成网页端往返验收通过后，再对目标业务仓库只读取证。只允许把审查过的必要摘要/片段放进 input，不扩大源仓库权限。没有真实接口、设备、宿主测试的部分保留 NOT VERIFIED；GPT 审查只覆盖收到的材料，不宣称全仓库独立审查。