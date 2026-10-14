# PRD → 通用定义 → 可编辑 Figma 原型

安装：`npm run setup`。Node 22.18+。

```sh
npm run prototype -- --input examples/prototypes/admin/requirements.md --id admin-demo --out prototype-output/admin-v1
```

交付包含 prototype.json（可人工编辑）、design-spec.json（现有 Figma 引擎输入）、coverage.json（逐条需求追溯/诊断）、manifest.json（内容摘要）。Figma 原生流程见 [generation](../guide/generation.md)。打开新的授权任务，依次 plan、apply、audit；不得用新内容复用旧 spec ID，也不能绕过人工编辑保护。

首版是确定性解析器，没有调用外部 LLM。支持 `.md`、`.txt` 和完整 PrototypeSpec `.json`。清晰的页面/字段/状态/跳转可以自动建模；自由散文中的权限、计算、后台规则保留为未解析需求，不能声称已经实现。普通二级标题会作为推断页面并提示复核，三级标题不会另建页面。

最小例子：

```md
# 反馈提交
平台：mobile
## 页面：反馈 {#feedback} /feedback
- 字段：message | 反馈内容 | textarea | required
- 状态：success | 感谢反馈
- 提交：send | 提交 -> feedback/success
- 按钮：again | 再次填写 -> feedback/default
- 交互：again@success -> feedback/default
## 流程
- 流程：提交反馈 | feedback/default | send,again
```

`{#页面ID}`、`控件ID | 文案` 是可选但推荐的稳定标识：标题和文案修改后仍可识别同一个对象。不提供时使用标题摘要，重命名会被视为删除/新增。ID 使用不超过 40 位的英文字母、数字、点、下划线或连字符。

| 语句 | 行为 |
| --- | --- |
| `页面：标题 {#id} /path` | 新建页面；默认状态总是存在 |
| `内容：id | 文案` | 原生可编辑文本 |
| `列表：id | 标题 | 条目1;条目2` | 仅使用已声明条目，无条目显示待补充 |
| `字段：id | 标签 | email | required` | text/email/number/date/select/checkbox/textarea/password |
| `字段：id | 标签 | select | options=A;B` | 静态选项 |
| `状态：error | 失败` | loading/empty/error/success 或自定义稳定 ID |
| `按钮：id | 标签 -> page/state` | 点击跳转；省略状态表示 default |
| `提交：id | 标签 -> page/state` | HTML 校验后模拟提交；Figma 为点击导航 |
| `交互：id@error -> page/state` | 同一按钮在其他状态的行为 |
| `流程：名称 | page/default | button1,button2` | 按当前页面连续解析按钮序列 |

中文“默认、加载中、空状态、失败、成功”可作状态缩写。未定义目标不生成猜测连线；所有输入行保留来源位置。代码块不执行并给出提示。布局使用通用固定尺寸模板；Figma 输出由 FRAME/TEXT 等原生节点组成，输入框是可编辑的设计表示。没有真实表单、后台、支付或真实数据写入。

READY_FOR_REVIEW 表示提取结构可进入评审，并非业务已验收。查看 unreachableStates：未在业务流程连接的空/失败状态可直接在画布检视，需要产品人员确认如何触发。
