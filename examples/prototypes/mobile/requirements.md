# 场地预约
平台：mobile

## 页面：选择场地 {#venues} /venues
- 内容：intro | 选择场地后填写预约信息。
- 列表：spaces | 可预约场地 | 社区会议室;青年活动室
- 按钮：book | 预约场地 -> booking/default
- 状态：loading | 正在加载场地
- 状态：empty | 暂无可用场地
- 交互：book@loading -> booking/default

## 页面：填写预约 {#booking} /booking
- 字段：contact | 联系人 | text | required
- 字段：date | 预约日期 | date | required
- 字段：notes | 备注 | textarea
- 提交：submit | 确认预约 -> confirmation/success
- 按钮：back | 返回场地 -> venues/default
- 状态：error | 预约失败，请检查信息
- 交互：submit@error -> confirmation/success
- 交互：back@error -> venues/default

## 页面：预约结果 {#confirmation} /confirmation
- 内容：notice | 这是原型演示，不产生真实预约。
- 状态：success | 预约成功
- 按钮：home | 返回首页 -> venues/default
- 交互：home@success -> venues/default

## 流程
- 流程：完成预约 | venues/default | book,submit,home
