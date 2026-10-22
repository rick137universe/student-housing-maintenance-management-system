# 维修人员端中间栏

`scripts/sync-maintenance-shell.ts` 从只读的母版预览复制 HTML，保留数字框、间距和响应式布局。六个模块主页统一使用 getting-started 点阵。

个人统计的三个预览使用当前登录账号的 `/api/v1/statistics`，复用现有维修人员数据范围，不传入账号 ID：

| 页面 | 母版 | 数值 |
| --- | --- | --- |
| 工作量统计 | timer | 左：`repairs.total_repairs`；右：`repairs.completed_repairs` |
| 完成率 | timer/timer-playback-settings/duration | `completed_repairs / total_repairs × 100`，保留两位小数和 `%` |
| 服务评价 | timer | 左：`repairs.average_rating`，保留两位小数；右：`repairs.rating_count` |

`public/assets/maintenance/preview-data.js` 在预览激活时读取数据，从 0 增长到统计值后停止。切换页面、重新播放和离开预览时由母版 scope 清理请求及计时器；重新播放和窗口恢复焦点会重新读取，不缓存其他账号的数据。

未激活的数字框保持 0；零数据为 0、0.00 或 0.00%。请求失败显示 `—` 并提供悬停说明，重新播放可重试。长数字仅缩小数字字体以适应母版框宽，不改变容器尺寸。

个人中心与个人消息继续复用学生端的账号/手机号/PASSWORD 打字动画及 Messages 双语动画。

工单接收、维修处理、维修记录的七个业务子页从学生端和宿管端已选的图形动画中随机分配，每页使用不同样式。结果固定保存在 `src/data/maintenance-previews.json`，刷新及重新生成不会重新抽取。候选为数值补间、关键帧、Stagger 和 WAAPI 动画，排除 getting-started 点阵、双语 splitText、timer 双数字框和 duration 单数字框。模块主页、个人统计及个人中心/消息的专属样式保持原分配。
