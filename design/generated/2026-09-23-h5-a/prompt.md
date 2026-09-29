# A：连续回看清单 / 视觉预览 v1


## 修正提示词与结果

首次生成存在明显背景/文字渲染异常，不作为确认稿。第二次修复渲染后出现无依据的管理员联系文案，第三次仅修正该事实错误；未继续风格打磨。

### 渲染修复（第二次调用）

```text
Repair this mobile UI mockup rendering. Keep its exact layout, all Chinese text and data, the 3 continuous list records, all four tabs, and the single submit button unchanged. Replace ALL black/transparent/corrupted areas with a completely opaque flat light neutral #F7F8FA page background. Redraw text as clean solid dark #1F2329 Chinese sans-serif, smaller metadata #6B7280, with NO outlines, noise, edge halos, glitches or embossed effects. Use solid teal #147D73 only for active tab, first status, new reply and button. The button is flat solid teal with crisp white text. Thin separators #E5E7EB. The entire rectangular canvas must be fully opaque, bright and clean like a real native screenshot, with no transparency anywhere. No new elements or changes to composition. This is only a rendering correction, not a new visual direction.
```

### 文案修正（第三次调用）

```text
Text correction only. In the small gray footer beneath the teal 提交反馈 button, replace the incorrect sentence 如有紧急问题请联系管理员 with EXACTLY these nine characters including the centered dot: 视觉候选 · 模拟数据 . This is the only edit. Keep absolutely everything else identical: all three records, every other Chinese label, IDs, dates, colors, whitespace, portrait dimensions, layout and button. Do not add any instructions or invent claims. Keep the fully opaque light background.
```

## 验证与边界

- 已保存：my-feedback-a-v1.png，853×1844；SHA-256：CA92259A3EBC3611214A495E8AEFCB4A055DCC6930D0729BF5679162C44DD86C。
- OBSERVED：最终图三条模拟记录、四筛选、状态、新回复与主按钮文案完整；无卡片容器、插画、重提入口或问题已解决承诺。
- 已关闭使用灰色；生成器将待处理呈现为橙色，未锁定为正式设计 token；对比度尚未验收。
- 原始 MyTickets 文件哈希与 PRODUCT.md 记录一致，目标仓库仍为既有 7 项修改与 2 项未跟踪文件；本轮未向目标仓库写入。
- NOT VERIFIED：真实 CSS 尺寸、触控、对比度、320 宽响应式和交互；该图为位图，不是可编辑 Figma 或可点击页面。
- 用户已确认 A 的结构方向，尚未确认此视觉图。生成当时未执行独立素材、Figma 更新与业务实现；后续静态 Figma 评审画板及其限制见 `docs/verification/2026-09-23-h5-a-review-page.md`。

用户确认 A 方向后生成。用途：单页视觉评审；不是素材交付、可编辑 Figma 或真实业务集成。

设计来源：前序 ChatGPT 网页端“极高”对话的 A 方案，见 `design/proposals/my-feedback-directions-v2.md`。本次不宣称新增网页分析轮次。

生成方式：内置 image_gen。仅发送脱敏字段与合成数据，不发送完整源码或真实玩家数据。Impeccable 仅应用文档原则，未执行其引擎/决策服务器流程。

## 最终生成提示词

```text
Use case: ui-mockup
Asset type: One high-fidelity Chinese mobile H5 screen, visual review only.
Primary request: Render the approved A direction "连续回看清单" for the player-facing "我的反馈" page. This is a functional support history screen, not a marketing page. Crisp, carefully typeset, calm, editorial precision and excellent scanability.
Composition: One flat, edge-to-edge portrait app screen at approximately 390:844 aspect ratio. No phone hardware, perspective, outer presentation board or multiple screens. Generous but practical 20px side margins at 390px scale. Top navigation with a simple left chevron and centered title "我的反馈" (20px semibold). Under it four evenly spaced tabs "全部", "待处理", "处理中", "已关闭"; 全部 selected with short teal underline, other tabs plain. Continuous pale neutral canvas, no individual record cards, no shadows. Hairline separators divide exactly three records. Main issue description is the strongest text within each record; metadata is smaller but clearly legible. Right-hand statuses align consistently.
Palette: page #F7F8FA, primary text #1F2329, secondary text #6B7280, separator #E5E7EB, accent #147D73. One Chinese system sans font, description ~16px medium, metadata ~13px. Colored states must remain restrained; closed status is neutral gray, never a green success mark.
Exact content, in order:
Record 1: top line left "DEMO-001", right "处理中"; main description "更新后页面内容未显示"; metadata "09-23 10:30 · 问题反馈"; beneath it a small teal dot and "新回复", attached to this record only.
Record 2: top line left "DEMO-002", right "待处理"; main description "如何查看最近的反馈记录"; metadata "09-22 16:20 · 使用咨询".
Record 3: top line left "DEMO-003", right "已关闭"; main description "页面按钮点击后没有响应"; metadata "09-20 14:18 · 问题反馈".
Use a slim right chevron beside each description to signal detail access, consistently aligned and subordinate. Do not truncate the supplied descriptions. Record 1 slightly taller due to its new-reply label. No giant blank padding inside records. After the third divider leave comfortable quiet space until the bottom action area.
Bottom: a single full-width teal button with white text "提交反馈", 48px logical height, 8px corners, 20px side margins. A tiny neutral annotation below the button says "视觉候选 · 模拟数据". Keep safe spacing from bottom edge.
Constraints: Exact simplified Chinese copy, clean raster UI with sharp text. All data synthetic. No avatars, replies, illustrations, 3D objects, game characters, banners, gradients, glows, rounded cards, search, sort, metrics, bottom tab navigation, invented functions, progress timelines, SLA or resolved claim. No resubmit button. No device status bar. This is a new visual direction, not a recolor of the rejected large-card design.
```
