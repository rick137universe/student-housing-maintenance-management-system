# 宿管端中间栏

七个模块首页使用 Getting started 点阵；个人中心三个子页共用学生端的 Installation 打字预览，读取当前宿管资料；消息通知共用“未读消息通知”的 duration 单数字框。

其余十五个业务子页的动画分配保存在 `src/data/manager-previews.json`。这些结果沿用已选图形动画并补充指定的 Stagger 动画，涵盖数值补间、关键帧和 WAAPI。分配时排除点阵、双语 splitText，以及需要学生个人资料或缴费数据的预览。每轮不重复使用动画，分配结果固定保存，刷新或重新生成页面时保持一致。

`scripts/sync-manager-shell.ts` 使用该配置同步母版预览，并保留宿管页面的名称、主题色和地址。

本轮仅替换 5 个图形预览，沿用管理员端新增的八种 Stagger 候选样式；保留点阵、双语文字、资料打字及数字统计等专属预览。其他业务预览保持原分配，结果固定保存，刷新时不重新随机。

| 页面 | 路径 | 本次母版动画 |
| --- | --- | --- |
| 账单核对 | `/workspace/dormManager/billing/verification` | `utilities-stagger-stagger-parameters-stagger-ease` |
| 催缴记录 | `/workspace/dormManager/billing/reminders` | `utilities-stagger-stagger-parameters-stagger-grid-axis` |
| 欠费名单 | `/workspace/dormManager/billing/arrears` | `utilities-stagger-stagger-parameters-stagger-from` |
| 调宿审核 | `/workspace/dormManager/accommodation/room-change` | `utilities-stagger-stagger-parameters-stagger-jitter` |
| 状态更新 | `/workspace/dormManager/beds/update-status` | `utilities-stagger-values-staggering` |
