# Prototype 1.1 有界交互

动作仅消费已验证的 `actions` / `flows`，不从按钮名称推断业务目标。生成交付新增 `interaction-capabilities.json`，逐条区分 HTML、Figma 的 SUPPORTED、UNSUPPORTED、UNRESOLVED 与 SIMULATED。SUPPORTED 表示本地编译能力；浏览器或真实 Figma 的执行状态单独保留 NOT_RUN，不能据此宣布源稿已验收。1.0 契约保持原样。

## 声明与执行

1.1 动作继续使用明确的 source.sceneId / nodeId、trigger、effect 与可选 component-state guard。HTML 执行 navigate、change-state、clipboard；unresolved 只记录未决结果。没有明确 scene 的学习入口、筛选结果、搜索匹配和分页数据继续为 UNRESOLVED，不能补造 URL、scroll-to 或后端数据。

`hover` 是临时局部状态，鼠标离开或键盘失焦时复位；HTML 对 hover 加导航或剪贴板这类不可按局部状态复位的组合返回 UNSUPPORTED。`mouse-enter` / `mouse-leave` 是单向事件，不与 hover 互译。timeout 使用 `delayMs`，在场景激活或目标状态进入后计时；离开场景、销毁执行器或 guard 失效会取消。重复状态切换不重新开启无限循环；执行器设有总触发预算。场景导航更新 hash/history，返回时恢复初始局部状态，场景切换不产生额外隐式业务跳转。

组件内文字或形状来源的 timeout 同样按状态进入计时，即使未声明 guard，返回该状态后也会重新安排一次；嵌套组件被外层状态重建时按新的 DOM occurrence 处理。无状态变化的重复绑定不会重复安排，累计触发预算继续生效。

同一次指针悬停或焦点停留中，状态切换产生的 DOM 边界事件不会重新触发 hover；实际离开或失焦后可再次触发。被替换子节点的焦点以当前 activeElement 为准，不依赖旧子节点一定发出 blur。

HTML 提供 `window.__presentationInteractions.getResults()`，读取有界执行记录；`destroy()` 解绑监听、清理计时器和临时提示。剪贴板只有 `navigator.clipboard.writeText` 实际成功才记录 SUCCESS；权限拒绝或离线宿主不支持时显示可选择的文本和手动复制操作。同一动作执行中重复点击会记录 IGNORED_PENDING；离场后的异步回执丢弃，不能覆盖新场景状态。

## 明确绑定的展示行为

`presentation.behaviors` 是可选字段，不为旧输入补默认值。只接受本任务需要的两类展示绑定，evidenceIds 至少一个且必须在证据集合内：

```json
[
  {"id":"category-full-text","type":"truncate-tooltip","source":{"sceneId":"pc","nodeId":"category-name"},"maxCharacters":12,"evidenceIds":["320:19403"]},
  {"id":"h5-copy-bar","type":"sticky-copy","source":{"sceneId":"h5","nodeId":"original-copy-region"},"targetNodeId":"fixed-copy-bar","evidenceIds":["249:15398"]}
]
```

这里的 nodeId 是模型 ID，须经 sourceNodeId 显式绑定原稿，不能直接假定等同原生 ID。分类名称按 Unicode code point 计数；11/12 字不省略，13 字起展示前 12 字加省略号，完整信息通过可聚焦的 hover/focus 提示显示。提示挂到 body，避免滚动容器裁切，可用 Escape 隐藏，失焦后再次聚焦恢复。原完整文字和富文本模型保留；此规则不能套用卡片标题的 25 字建议或描述的 135 字建议。

sticky-copy 的 source 是原复制区域；target 必须是同场景根节点的直接固定子节点。HTML 根据原区 `bottom <= viewport.top` 判断：原区在视口下方时不提前出现，向上滚过顶部才显示，回滚后隐藏。Figma 输出可编辑固定条、前后状态画板和滚动展示；没有原生阈值自动切换的真实证据，能力固定为 SIMULATED。

## 最小原生扩展与保护

DesignSpec 1.1 为实际使用的组件 family 声明版本化 componentSets，并保留完整成员及依赖闭包。先创建成员和后代，再 combineAsVariants，随后创建依赖实例；分组映射、成员顺序、snapshot、audit 与恢复使用同一持久化检查点。用户修改分组、成员或 reaction 时停止，不覆盖编辑。写入结果不明时先 reconcile，不重复 combine。

SWAP_STATE 经明确同组映射编译为 NODE / CHANGE_TO。来源必须属于同一局部组件，外部兄弟控件切另一个实例、未证实的状态 guard、focus/blur/submit 和浏览器 clipboard 不伪造为原生导航。原生 hover 结束复位与 mouse-enter/leave 单向行为遵循[官方 Trigger 契约](https://developers.figma.com/docs/plugins/api/Trigger/)。新 timeoutMs / delayMs 始终是毫秒；旧 delaySeconds 与 seconds/milliseconds adapter 保留兼容。transitionDuration 是动画时长，不能充当缺失的触发延时。

只为选中的实际 family 建立分组，不为全产品生成 variant 系统。ON_PRESS 源依赖可以保留成员与边并标记 UNSUPPORTED；缺 timeout 值保留 UNRESOLVED。不新增 overlay、URL、scroll-to、relay 或授权模型。真实原生写入仍须另行获得具体目标的授权，本地测试不写 Figma。

## 验证

```powershell
npm run test:prototype
npm test
npm run test:browser
npm --prefix .research/local-figma-bridge-poc run build:plugin
npm run check:bundle
```

这些命令运行当前 checkout 中已有的检查，不隐含未入库的定向用例。此次仅允许既有 `design-batch-schema.test.mjs` 契约测试随功能更新，其余新增或修改的交互测试与夹具留在本地；额外用例及其结果写入本地验证报告，不能把叠加本地测试的通过结果称为干净候选验证。`npm test` 和插件构建会生成插件文件，候选验证应在隔离目录运行。浏览器命令通过也只证明实际运行的用例，不自动证明新动作或源稿场景已覆盖。

浏览器 fixture、桥接模拟宿主、源稿视觉对照、真实 Figma Present 是不同证据等级。学练平台源场景仍受上一阶段的字体、mask、跨范围 master 和完整视觉输入缺口约束；本阶段机制测试通过不会解除这些 gate。
