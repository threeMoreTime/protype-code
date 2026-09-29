# Local Codex ↔ Figma Bridge 后续开发总控基线

> Document Type: Development Baseline / Roadmap / Gate Specification
> Version: 1.0
> Date: 2026-09-24
> Current Phase: Phase 8.0 — Bridge Hardening
> Overall Status: POC_FEASIBLE / NOT_PRODUCTION_READY
> Production Figma Write: NOT AUTHORIZED
> Formal H5 Write: NOT AUTHORIZED

---

# 1. 文档目的

本文件是 `Local Codex ↔ Local Figma Bridge` 后续本地开发的总控基线。

从本文件建立之后，所有后续：

* 本地 Codex 开发
* Bridge 修改
* MCP 修改
* Figma Development Plugin 修改
* DesignSpec 设计
* Layout QA
* Components / Variables / Styles 接入
* H5 正式试点
* PRD → Figma → Prototype → Code 工作流集成

都必须以本文件作为阶段、范围、验收和安全边界依据。

不得在没有更新本文件或对应阶段报告的情况下，私自改变总体路线。

---

# 2. 文档优先级

发生信息冲突时，采用以下优先级：

1. 用户当前明确指令
2. 本文件最新版本
3. 当前 Phase 最新验证报告
4. 当前 Phase 实际运行证据
5. 历史验证报告
6. README / 设计草案 / 旧提示词
7. 第三方项目 README 或理论推断

任何历史结论如果与新的真实本机证据冲突：

必须保留历史记录，但以新的实机证据更新当前状态。

不得删除历史失败或 BLOCKED 记录来制造“全程成功”的假象。

---

# 3. 当前已经 VERIFIED 的技术基线

当前已经在独立测试 Figma Design 文件完成真实 Windows 实机验证。

完整链路：

```text
Local Codex / Local MCP Client
        ↓
stdio MCP Server
        ↓
localhost WebSocket
        ↓
Figma Desktop Development Plugin UI
        ↓
postMessage
        ↓
Plugin Main Thread
        ↓
Figma Plugin API
        ↓
当前打开的 Figma Design 文件
```

已经真实完成：

```text
Document Read
Frame Create
Text Create
Auto Layout
Node Update
Read-back
Prototype Reaction
PNG Export
Owned Node Delete
```

其中 Prototype 已真实验证：

```text
ON_CLICK
→ NAVIGATE
→ Frame B
```

并通过 Plugin API read-back。

当前结论：

```text
Independent Test File Write Chain = FEASIBLE
```

---

# 4. 当前仍未解决的问题

虽然 POC 已 FEASIBLE，但当前仍然：

```text
NOT_PRODUCTION_READY
```

主要缺口如下。

## 4.1 文件身份

当前主要使用：

```text
session-only fileIdentity
```

它不足以作为正式设计文件长期授权依据。

必须解决：

```text
Persistent File Identity
```

---

## 4.2 Client / Server 鉴权

当前 localhost Bridge 已证明技术可用。

但：

```text
localhost
≠
authenticated
```

必须增加：

```text
Pairing
Client Identity
Server Identity
Write Authorization
```

---

## 4.3 写入范围

当前需要从：

```text
这个文件可以写
```

升级到：

```text
这个任务
只能修改
这个文件
这个 Page / Root
这些 Owned Nodes
执行这些 Actions
```

---

## 4.4 Codex Desktop MCP

当前：

```text
Codex CLI direct MCP = VERIFIED
```

但：

```text
Current Codex Desktop direct MCP = NOT VERIFIED
```

不得用 Node MCP SDK runner 的成功替代 Desktop MCP 成功。

---

## 4.5 DesignSpec

当前 Bridge 主要仍是 imperative tools：

```text
create
update
set layout
prototype
export
delete
```

尚未升级为：

```text
声明式设计协议
```

---

## 4.6 Layout Quality

当前 PNG Export 技术路径已经 VERIFIED。

但存在：

```text
长文字右侧裁切
```

因此：

```text
Technical Correctness = PASS
```

并不等于：

```text
Design Quality = PASS
```

---

## 4.7 Design System

当前还没有形成完整：

```text
Component
Instance
Variable
Style
Token
```

映射闭环。

---

# 5. 总体目标

最终目标不是单纯：

> Codex 可以操作 Figma。

最终目标是：

```text
PRD / Existing Project
        ↓
Repository Intelligence
        ↓
Requirement / Product Model
        ↓
Visual Direction
        ↓
DesignSpec
        ↓
Figma Native Generator
        ↓
Editable Figma Design
        ↓
Prototype
        ↓
Layout / Visual QA
        ↓
Design-to-Code
        ↓
Real Frontend Components
```

其中 Figma 输出必须是：

```text
Native
Editable
Structured
Reusable
Diffable
Auditable
Maintainable
```

而不是：

```text
Screenshot
Flattened Image
Large SVG Dump
Unstructured Frame Collection
```

---

# 6. One-click Figma Generation 长期目标

系统最终需要支持一个高级能力：

```text
Generate Figma From Current Project
```

用户期望效果：

```text
当前项目证据
        ↓
一条生成指令
        ↓
DesignSpec
        ↓
自动创建 / 更新
完整 Figma 设计内容
        ↓
自动 Prototype
        ↓
自动 QA
```

长期入口可以抽象为：

```text
generate_figma_from_project
```

或者：

```text
apply_design_spec
```

“一键”不代表绕过安全验证。

正式执行前仍必须完成：

```text
identity
pairing
authorization
scope validation
dry-run
```

一键生成能力主要由：

```text
Phase 8.2
+
Phase 8.3
+
Phase 8.4
```

共同形成。

Phase 8.5 才允许把该能力用于受控真实 H5 Pilot。

---

# 7. 后续正式路线

| Phase                          | 目标                                      | 核心产物                                                         | Gate                                    |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Phase 8.0 — Bridge Hardening   | 持久文件身份 + Pairing/Auth + 写入授权            | fileIdentity v2、pairing、scope guard、audit log                | Figma/Plugin/Node 重启仍识别文件；错误文件/客户端/任务拒写 |
| Phase 8.1 — Codex Desktop MCP  | 消除 CLI VERIFIED / Desktop NOT VERIFIED  | Desktop 直接暴露 Bridge MCP                                      | Desktop 直接 status/read/write 测试文件       |
| Phase 8.2 — DesignSpec v0.1    | imperative → declarative                | validate / plan / dry-run / apply / read-back / rollback     | spec 幂等；修改产生最小 diff                     |
| Phase 8.3 — Layout Quality     | 能生成 → 生成正确                              | Text sizing、wrap、Auto Layout constraints、320/375 QA          | 文字无裁切；320/375 稳定                        |
| Phase 8.4 — Design System      | Components / Variables / Styles         | component registry、variable resolver、style resolver、fallback | 生成 Instance / Variable，而非全部裸节点          |
| Phase 8.5 — Formal H5 Pilot    | 首次受控写真实业务设计                             | authorization、scope、dry-run、rollback、audit                   | 只修改授权区域，0 越界 mutation                   |
| Phase 9 — Workflow Integration | PRD → Design → Figma → Prototype → Code | DesignSpec + repository evidence + bridge                    | 正式替换旧 Computer Use Figma 执行链            |

---

# 8. Phase 8.0 — Bridge Hardening

## 8.0.1 目标

把当前：

```text
POC 可写
```

升级成：

```text
可安全授权的本机 Bridge
```

本阶段只解决：

```text
Persistent Identity
Pairing/Auth
Task Authorization
Scope Guard
Ownership
Audit
```

不实现完整 DesignSpec。

不接入正式 H5。

---

## 8.0.2 File Identity v2

需要建立：

```text
Persistent File Identity
```

它必须独立于：

```text
sessionId
connectionId
pageName
documentName
```

候选实现必须通过本机实际验证后选择。

不得仅因为官方 API 或第三方项目声称可用就记为 VERIFIED。

最终：

```text
fileIdentity v2
```

必须在以下生命周期中保持正确：

```text
Plugin Restart
Figma Restart
Node Restart
MCP Restart
Connection Reconnect
```

---

## 8.0.3 Pairing

必须建立：

```text
Plugin
↔
MCP Server
```

明确 pairing。

最少需要能够区分：

```text
serverId
clientId
pairingId
sessionId
connectionId
```

未配对 Client：

```text
READ
```

是否允许，由实现安全模型决定。

但：

```text
WRITE
UPDATE
DELETE
APPLY
```

必须默认拒绝。

---

## 8.0.4 Task Authorization

每个写任务至少具有：

```json
{
  "workspaceId": "...",
  "taskId": "...",
  "fileIdentity": "...",
  "scope": {},
  "allowedActions": [],
  "revision": "...",
  "expiresAt": "..."
}
```

不得把：

```text
正确连接
```

等同于：

```text
拥有写权限
```

正确逻辑：

```text
Authenticated Client
+
Correct File
+
Authorized Task
+
Allowed Scope
+
Allowed Action
=
Mutation Allowed
```

---

## 8.0.5 Scope Guard

必须支持至少：

```text
file
page
rootNode
owned subtree
```

级别的写入范围。

任何 scope 外 mutation：

```text
REJECT
```

---

## 8.0.6 Ownership

Bridge 管理节点至少记录：

```text
owner
workspaceId
taskId
specNodeKey
revision
operationId
```

不得通过通用：

```text
delete(anyNodeId)
```

删除任意节点。

---

## 8.0.7 Audit

所有 mutation 必须记录：

```text
timestamp
workspaceId
taskId
fileIdentity
sessionId
connectionId
requestId
operation
target
before
after
result
latency
error
```

审计记录不能依赖 stdout 临时输出。

---

## 8.0.8 Phase 8.0 Gate

至少真实验证：

1. 同一文件 Plugin Restart 后 identity 不变。
2. Figma Restart 后 identity 不变。
3. MCP Restart 后 identity 不变。
4. Node Restart 后 identity 不变。
5. 不同 Figma 文件 identity 不同。
6. Wrong Client 拒写。
7. Wrong File 拒写。
8. Wrong Task 拒写。
9. Wrong Scope 拒写。
10. Foreign Node 删除拒绝。
11. 正确 authorization 正常写入。
12. 正式 H5 mutation 数仍为 0。

全部满足后才能记录：

```text
BRIDGE_HARDENED
```

并进入 Phase 8.1。

---

# 9. Phase 8.1 — Codex Desktop MCP

## 9.1 目标

解决当前：

```text
Codex CLI = VERIFIED
Codex Desktop = NOT VERIFIED
```

差异。

---

## 9.2 必须证明

必须由当前 Codex Desktop 环境真实直接暴露：

```text
local-figma-bridge
```

并直接完成：

```text
figma_status
figma_read_document
```

以及测试文件上的：

```text
safe create
read-back
delete owned
```

不得使用：

```text
Node SDK runner
```

替代 Desktop direct MCP 的结论。

---

## 9.3 Gate

只有真实证明：

```text
Codex Desktop
→ MCP
→ Bridge
→ Figma
```

才能：

```text
Codex Desktop direct MCP = VERIFIED
```

否则保持：

```text
NOT VERIFIED
```

---

# 10. Phase 8.2 — DesignSpec v0.1

## 10.1 目标

将：

```text
imperative MCP commands
```

升级为：

```text
declarative design protocol
```

---

## 10.2 基础流程

DesignSpec Engine 至少需要：

```text
validate
   ↓
plan
   ↓
dry-run
   ↓
apply
   ↓
read-back
   ↓
verify
```

失败时需要：

```text
rollback
```

或者明确：

```text
compensation
```

机制。

---

## 10.3 DesignSpec 核心字段

至少考虑：

```text
schemaVersion
operationId
workspaceId
taskId
scope
expectedFileIdentity
baseRevision
viewport
nodes
tokens
components
reactions
metadata
```

每个可管理节点必须存在稳定：

```text
specNodeKey
```

例如：

```text
screen.my-feedback.root

screen.my-feedback.title

component.feedback-card

screen.feedback-detail.submit
```

---

## 10.4 Idempotency

这是 Phase 8.2 的硬要求。

第一次：

```text
CREATE
```

第二次应用相同 spec：

```text
NOOP
```

修改一个文本后：

```text
UPDATE text
```

不得：

```text
重新创建整个 screen
```

---

## 10.5 Diff

必须至少区分：

```text
CREATE
UPDATE
DELETE
NOOP
```

未来可扩展：

```text
MOVE
REORDER
REBIND
REPLACE
```

---

## 10.6 Dry-run

正式 apply 前必须能够生成：

```text
Mutation Plan
```

例如：

```text
CREATE 3
UPDATE 4
DELETE 0
NOOP 18
```

用户或系统可以在 apply 前审查。

---

## 10.7 Phase 8.2 Gate

必须证明：

1. 同一 Spec 连续执行两次不产生重复节点。
2. 单字段修改只修改对应目标。
3. Wrong Revision 拒绝或触发 conflict。
4. Dry-run 与真实 apply 基本一致。
5. Apply 后 read-back 与 Spec 一致。
6. 失败可以 rollback / compensate。
7. scope 外节点保持不变。

通过后才能进入 Layout Quality。

---

# 11. Phase 8.3 — Layout Quality

## 11.1 目标

解决：

```text
API 写入成功
```

但：

```text
设计视觉错误
```

的问题。

---

## 11.2 当前已知问题

真实 POC 已发现：

```text
375 × 812 PNG
长文本右侧裁切
```

因此未来必须把：

```text
Structural Correctness
```

和：

```text
Visual/Layout Correctness
```

分开验收。

---

## 11.3 Text QA

至少检查：

```text
textAutoResize
width
height
parent width
wrapping
line height
font loading
layout sizing
overflow
```

任何明显 text overflow：

```text
QA ERROR
```

---

## 11.4 Auto Layout QA

默认优先：

```text
Auto Layout
```

必须检查：

```text
layoutMode
padding
itemSpacing
alignment
sizing
nested Auto Layout
```

绝对定位必须是显式设计决定。

---

## 11.5 Viewport

H5 至少真实验证：

```text
320
375
```

未来可增加：

```text
390
414
```

但不能用单一 viewport PASS 推导所有移动宽度可用。

---

## 11.6 Export QA

每次完整页面生成后：

```text
exportAsync
```

至少用于：

```text
decode check
dimension check
layout inspection
```

不能使用 Figma UI Screenshot 替代结构验证。

---

## 11.7 Gate

必须达到：

```text
320 PASS
375 PASS
Text Overflow = 0
Unexpected Clipping = 0
Critical Layout Warning = 0
```

才能进入 Phase 8.4。

---

# 12. Phase 8.4 — Design System

## 12.1 目标

从：

```text
大量裸 Frame / Text / Rectangle
```

升级为：

```text
Component
Instance
Variable
Style
```

驱动的设计资产。

---

## 12.2 Component Registry

继续使用：

```text
REUSE
EXTEND
MISSING
```

分类体系。

DesignSpec Resolver 必须优先：

```text
REUSE
```

其次：

```text
EXTEND
```

最后才允许：

```text
controlled fallback
```

---

## 12.3 Component Resolution

逻辑：

```text
Registry Match
      ↓
Existing Figma Component?
      ↓ YES
Create Instance
      ↓ NO
Allowed to Create Component?
      ↓ YES
Create Component → Instance
      ↓ NO
Fallback
```

fallback 必须记录 Warning。

---

## 12.4 Variables

目标：

```text
Code Token
↔
DesignSpec Token
↔
Figma Variable
```

至少考虑：

```text
Color
Spacing
Radius
Number
Semantic State
```

---

## 12.5 Styles

根据真实需求处理：

```text
Typography
Effects
Paint
Grid
```

Variables 和 Styles 不应重复承担同一职责而没有明确约定。

---

## 12.6 One-click Generator

Phase 8.4 完成后，测试文件中应能具备：

```text
generate_figma_from_project
```

级别能力。

逻辑：

```text
Repository Evidence
        ↓
DesignSpec
        ↓
Resolve Tokens
        ↓
Resolve Components
        ↓
Validate
        ↓
Dry-run
        ↓
Apply
        ↓
Read-back
        ↓
Layout QA
        ↓
Prototype QA
        ↓
Export
```

生成结果应是：

```text
native
editable
structured
componentized
tokenized
prototype-ready
```

---

## 12.7 Gate

至少满足：

```text
Reusable UI → Instance

Tokens → Variables

Typography / Effects → controlled styles

Unmapped Component → explicit warning

No silent fallback
```

并完成一套测试业务页面的完整一键生成。

---

# 13. Phase 8.5 — Formal H5 Pilot

## 13.1 原则

Phase 8.4 PASS：

```text
≠
自动授权写正式 H5
```

正式业务文件属于新的授权阶段。

---

## 13.2 Pilot 范围

第一次正式 Pilot 必须：

```text
Small
Explicit
Reversible
Auditable
```

不得第一次就全量重建正式 H5。

---

## 13.3 授权

至少明确：

```text
fileIdentity
page
rootNode
taskId
allowedActions
revision
```

没有明确授权：

```text
WRITE = DENY
```

---

## 13.4 Pilot 流程

```text
Read
↓
Snapshot / Baseline
↓
Build DesignSpec
↓
Validate
↓
Dry-run
↓
Authorization Check
↓
Apply
↓
Read-back
↓
Visual QA
↓
Prototype QA
↓
Audit
```

---

## 13.5 Rollback

必须在第一次业务 Pilot 前拥有可验证：

```text
rollback
```

或者：

```text
compensating mutation
```

能力。

---

## 13.6 Gate

只有证明：

```text
Authorized Scope Mutation = PASS
Unauthorized Scope Mutation = 0
Foreign Node Mutation = 0
Rollback = PASS
Audit Complete = PASS
```

才允许进入 Workflow Integration。

---

# 14. Phase 9 — Workflow Integration

目标是正式建立：

```text
PRD
↓
AI Requirement Analysis
↓
Project Evidence
↓
Visual Direction
↓
DesignSpec
↓
Figma Native Generation
↓
Prototype
↓
QA
↓
Frontend Mapping
↓
Code
```

正式替换原先依赖：

```text
Computer Use
→ Figma UI
```

进行设计创建和 Prototype 连线的流程。

---

# 15. Repository Intelligence 与 Figma 的连接

已有 Repository Intelligence 不应被重复扫描和浪费。

未来应转换成稳定输入：

```text
project-profile
architecture-map
route catalog
component catalog
API catalog
token catalog
component registry
```

然后：

```text
Repository Intelligence
        ↓
Design Context
        ↓
DesignSpec
```

DesignSpec 不应直接依赖“AI 临时读几个源码文件后的记忆”。

---

# 16. Figma Native Design Quality Profile

“一键生成 Figma”必须遵循统一质量模型。

至少包括：

## Native Nodes

优先：

```text
Frame
Text
Component
Instance
Section
Vector
Rectangle
```

不得把整个页面主要实现为：

```text
PNG
Flattened SVG
```

---

## Auto Layout First

正常内容布局默认 Auto Layout。

---

## Component First

重复设计元素优先 Component / Instance。

---

## Token First

设计值优先通过 Design Token / Variable 表达。

---

## Semantic Naming

禁止长期存在大量：

```text
Frame 123
Text 46
Rectangle 89
```

应使用：

```text
Screen/MyFeedback
Component/FeedbackCard
Status/Processing
Action/SubmitFeedback
```

---

## Metadata

AI 管理节点需要写入稳定元数据：

```text
owner
specNodeKey
workspaceId
taskId
revision
```

---

## Prototype Native

交互通过 DesignSpec：

```text
specNodeKey
→ target specNodeKey
```

解析为：

```text
nodeId
→ setReactions
```

不得再依赖人工拉线作为正式流程。

---

# 17. 状态标签

所有开发报告必须使用：

```text
VERIFIED
OBSERVED
INFERRED
NOT VERIFIED
BLOCKED
```

定义：

### VERIFIED

真实代码或真实实机测试确认。

### OBSERVED

日志、运行状态或文件中观察到。

### INFERRED

基于证据合理推断，但未直接验证。

### NOT VERIFIED

当前没有足够证据。

### BLOCKED

明确因为前置条件无法执行。

---

# 18. 禁止把理论支持写成 VERIFIED

以下都不能自动变成 VERIFIED：

```text
README says supported
Official API says supported
Mock test passes
Unit test passes
Source code contains method
Third-party project implements it
```

必须区分：

```text
API SUPPORT
```

与：

```text
THIS WINDOWS MACHINE VERIFIED
```

---

# 19. 安全边界

在 Phase 8.5 前默认：

```text
Formal H5 Write = DENY
```

禁止：

```text
Computer Use 操作 Figma 作为 Bridge fallback

Playwright 操作 Figma

Figma Remote MCP 替代当前路径

REST API 替代 Plugin API Core Path

PAT 替代本地 Plugin Write

Cloudflare / Public Tunnel 暴露 Bridge

0.0.0.0 WebSocket

任意 node delete

未经授权修改正式 H5
```

---

# 20. 业务仓库边界

业务源码仓库默认：

```text
READ ONLY
```

除非未来独立 Code Integration Phase 获得授权。

Bridge 研究和开发产物默认放置于：

```text
protype-code
.research
docs
tests
artifacts
logs
```

不得借 Figma Bridge 开发修改：

```text
客服客户端业务仓库
```

真实业务代码。

---

# 21. 每轮本地开发标准流程

从本文件建立后，每一轮本地 Codex 开发必须：

## Step 1

读取：

```text
docs/roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md
```

---

## Step 2

确认：

```text
currentPhase
```

不得跨 Phase 开发。

---

## Step 3

读取当前 Phase 最新：

```text
validation report
status
test results
```

---

## Step 4

检查：

```text
git status
```

不得覆盖用户原有修改。

---

## Step 5

生成本轮：

```text
PLAN
```

必须明确：

```text
目标
In Scope
Out of Scope
安全边界
验收条件
```

---

## Step 6

实施最小必要改动。

禁止为了未来需求提前大规模重构。

---

## Step 7

运行：

```text
Unit
Integration
Real Figma validation
```

根据当前 Phase 所需层级验证。

---

## Step 8

保存 evidence。

---

## Step 9

更新当前 Phase report。

---

## Step 10

只有 Gate 完整 PASS：

才能更新：

```text
currentPhase
```

进入下一阶段。

---

# 22. 每轮报告必须回答

至少回答：

```text
What changed?

What was actually executed?

What was VERIFIED?

What remains NOT VERIFIED?

What failed?

What was BLOCKED?

Were formal H5 files touched?

Were business repositories touched?

Did any forbidden fallback occur?

Can the Phase Gate now pass?
```

---

# 23. Phase Gate 原则

禁止因为：

```text
大部分功能完成
```

就进入下一阶段。

必须达到该 Phase 明确定义的：

```text
Exit Gate
```

如果关键项缺失：

保持当前 Phase。

可以标：

```text
PARTIAL
```

但：

```text
PARTIAL != PASS
```

---

# 24. 建议维护机器可读状态

除本 Markdown 外，建议维护：

```text
docs/roadmap/local-figma-bridge-status.json
```

结构至少包括：

```json
{
  "schemaVersion": "1.0",
  "overallStatus": "POC_FEASIBLE_NOT_PRODUCTION_READY",
  "currentPhase": "8.0",
  "currentPhaseName": "Bridge Hardening",
  "formalH5WriteAuthorized": false,
  "codexCliMcp": "VERIFIED",
  "codexDesktopMcp": "NOT VERIFIED",
  "independentFigmaWriteChain": "VERIFIED",
  "persistentFileIdentity": "NOT VERIFIED",
  "pairingAuth": "NOT VERIFIED",
  "designSpec": "NOT VERIFIED",
  "layoutQuality": "NOT VERIFIED",
  "designSystem": "NOT VERIFIED",
  "formalH5Pilot": "NOT VERIFIED"
}
```

后续 Phase 完成时同步修改。

---

# 25. 变更控制

本文件不得被普通开发任务随意改写。

只有以下情况才允许升级版本：

```text
Phase 完成

总体架构发生变化

安全边界变化

用户新增正式目标

新的实机证据推翻原路线
```

每次修改至少记录：

```text
version
date
reason
changed sections
evidence
```

---

# 26. 当前开发决策

当前状态：

```text
Current Phase:
Phase 8.0 — Bridge Hardening
```

当前唯一主要开发目标：

```text
Persistent File Identity
+
Pairing/Auth
+
Task Authorization
+
Scope Guard
+
Ownership
+
Audit
```

当前明确 NOT IN SCOPE：

```text
Full DesignSpec Engine

Layout Quality 重构

Components / Variables / Styles 全量接入

正式 H5 写入

完整 One-click Figma Generator

PRD → Code 全流程
```

这些功能属于后续 Phase。

---

# 27. Phase 8.0 完成后的顺序

严格按照：

```text
Phase 8.0
Bridge Hardening
        ↓
Phase 8.1
Codex Desktop MCP
        ↓
Phase 8.2
DesignSpec v0.1
        ↓
Phase 8.3
Layout Quality
        ↓
Phase 8.4
Design System
        ↓
Phase 8.5
Formal H5 Pilot
        ↓
Phase 9
Workflow Integration
```

不得因为某个后续功能“容易实现”而跳过前置 Gate。

---

# 28. 最终成功标准

最终成功不是：

```text
Codex 能在 Figma 里画一个页面
```

而是：

```text
项目事实可追溯

DesignSpec 可复现

Figma 文件安全授权

设计生成幂等

节点可编辑

组件可复用

Variables 可追踪

Auto Layout 正确

320 / 375 布局正确

Prototype 可验证

修改可以 diff

失败可以 rollback

所有 mutation 可审计

最终可以映射回真实前端组件
```

最终目标状态：

```text
Repository
    ↕
DesignSpec
    ↕
Figma
    ↕
Frontend
```

形成稳定、可验证、可维护的闭环。

---

# 29. 对所有后续 Codex 任务的强制指令

所有与本项目有关的本地开发任务，在执行前必须：

```text
READ FIRST:

docs/roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md
```

然后：

```text
1. 确认 Current Phase
2. 检查该 Phase Gate
3. 只执行当前 Phase 允许内容
4. 不跨阶段实现
5. 不修改正式 H5，除非 Phase 8.5 获得明确授权
6. 使用 VERIFIED / OBSERVED / INFERRED / NOT VERIFIED / BLOCKED
7. 保存真实 evidence
8. 完成后更新 Phase Report
9. Gate PASS 后才能推进阶段
```

任何与本文件冲突的历史提示词：

默认视为过期。

除非用户明确重新授权。

---

# 30. 当前下一步

立即进入：

```text
Phase 8.0 — Bridge Hardening
```

第一轮应聚焦：

```text
1. Persistent File Identity 候选实机验证

2. fileIdentity v2 设计

3. MCP ↔ Plugin Pairing

4. Authenticated Write

5. Task Authorization

6. Page / Root Scope Guard

7. Ownership Guard

8. Mutation Audit Log

9. Restart / Wrong Client / Wrong File /
   Wrong Task / Wrong Scope / Foreign Node
   负测试

10. Phase 8.0 Validation Report
```

在以上 Gate 完成之前：

```text
DO NOT START DESIGN SPEC IMPLEMENTATION.
```
