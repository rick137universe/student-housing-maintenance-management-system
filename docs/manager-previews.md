# 宿管端中间栏

七个模块首页使用 Getting started 点阵；个人中心三个子页共用学生端的 Installation 打字预览，读取当前宿管资料；消息通知共用 Messages／消息通知双语 splitText 预览。

其余十五个业务子页的动画分配保存在 `src/data/manager-previews.json`。这些结果从学生端已选用的十二种图形动画中随机分配，涵盖数值补间、关键帧、Stagger 和 WAAPI。分配时排除点阵、双语 splitText，以及需要学生个人资料或缴费数据的预览。每轮不重复使用动画，分配结果固定保存，刷新或重新生成页面时保持一致。

`scripts/sync-manager-shell.ts` 使用该配置同步母版预览，并保留宿管页面的名称、主题色和地址。
