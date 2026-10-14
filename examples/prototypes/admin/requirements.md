# 团队成员管理
平台：desktop

## 页面：成员列表 {#members} /members
- 内容：intro | 管理团队中的成员及联系信息。
- 列表：people | 演示成员 | 王小明 — 产品;陈小雨 — 研发
- 按钮：add | 新增成员 -> editor/default
- 状态：empty | 暂无成员
- 状态：success | 成员已保存
- 交互：add@empty -> editor/default
- 交互：add@success -> editor/default

## 页面：编辑成员 {#editor} /members/new
- 字段：name | 姓名 | text | required
- 字段：email | 邮箱 | email | required
- 字段：role | 职能 | select | required | options=产品;研发;运营
- 提交：save | 保存成员 -> members/success
- 按钮：cancel | 取消 -> members/default
- 状态：error | 保存失败，请重试
- 交互：save@error -> members/success
- 交互：cancel@error -> members/default

## 流程
- 流程：新增成员 | members/default | add,save
