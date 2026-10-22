# 管理员端中间栏

十个模块主页及 `src/data/admin-previews.json` 中十三个已指定的二级页面保持 getting-started 点阵。个人中心沿用账号、手机号、小写 password 打字动画，消息通知沿用未读数量 duration 动画。

其余 32 个子页面从学生端、宿管端和维修人员端已选图形动画中随机分配，排除 getting-started 点阵、双语 splitText 及所有 timer 数字框。分配结果固定在 `src/data/admin-random-previews.json`；刷新和重新生成不再随机抽取。

`scripts/sync-admin-shell.ts` 优先应用专属样式，再读取固定分配。仅替换预览来源和对应标题、主题色、页面标识，保留母版布局、尺寸与重新播放功能，业务内容和路由保持原样。

| 页面 | 路径 | 母版动画 |
| --- | --- | --- |
| 新增数据 | `/workspace/admin/base-data/manage/submit` | `animation-tween-parameters-from` |
| 数据记录 | `/workspace/admin/base-data/manage/records` | `web-animation-api-improvements-to-the-web-animation-api-function-based-values` |
| 批量导入 | `/workspace/admin/base-data/import` | `animation-keyframes-tween-values-keyframes` |
| 数据导出 | `/workspace/admin/base-data/export` | `animation-tween-value-types-function-based` |
| 配置分床规则 | `/workspace/admin/process/bed-assignment/edit` | `utilities-stagger-values-staggering` |
| 配置住宿流程 | `/workspace/admin/process/accommodation/edit` | `animation-tween-parameters-to` |
| 配置缴费流程 | `/workspace/admin/process/payment/edit` | `web-animation-api-api-differences-with-native-waapi-iterations` |
| 待派工 | `/workspace/admin/dispatch/pending` | `web-animation-api-improvements-to-the-web-animation-api-individual-property-parameters` |
| 智能派工 | `/workspace/admin/dispatch/automatic` | `utilities-stagger` |
| 进度监控 | `/workspace/admin/dispatch/progress` | `web-animation-api-improvements-to-the-web-animation-api-spring-and-custom-easings` |
| 筛选运营统计 | `/workspace/admin/reports/operations/filter` | `animation-targets-dom-elements` |
| 筛选维修统计 | `/workspace/admin/reports/maintenance/filter` | `animation-tween-value-types-numerical-value` |
| 导出报表 | `/workspace/admin/reports/export` | `utilities-stagger` |
| 新增员工账号 | `/workspace/admin/permissions/accounts/submit` | `web-animation-api-api-differences-with-native-waapi-iterations` |
| 账号记录 | `/workspace/admin/permissions/accounts/records` | `web-animation-api-improvements-to-the-web-animation-api-individual-property-parameters` |
| 配置角色权限 | `/workspace/admin/permissions/roles/submit` | `animation-targets-dom-elements` |
| 权限记录 | `/workspace/admin/permissions/roles/records` | `web-animation-api-improvements-to-the-web-animation-api-spring-and-custom-easings` |
| 楼栋授权 | `/workspace/admin/permissions/roles/authorize` | `animation-tween-parameters-to` |
| 授权记录 | `/workspace/admin/permissions/roles/authorizations` | `animation-keyframes-tween-values-keyframes` |
| 权限审计 | `/workspace/admin/permissions/audit` | `animation-tween-parameters-from` |
| 新增备份策略 | `/workspace/admin/backup/policies/submit` | `web-animation-api-improvements-to-the-web-animation-api-function-based-values` |
| 策略记录 | `/workspace/admin/backup/policies/records` | `utilities-stagger-values-staggering` |
| 创建备份 | `/workspace/admin/backup/tasks/submit` | `animation-tween-value-types-numerical-value` |
| 备份记录 | `/workspace/admin/backup/tasks/records` | `animation-tween-value-types-function-based` |
| 数据恢复 | `/workspace/admin/backup/restore` | `web-animation-api-api-differences-with-native-waapi-iterations` |
| 生成月账单 | `/workspace/admin/billing/generate/submit` | `animation-tween-parameters-from` |
| 账单记录 | `/workspace/admin/billing/generate/records` | `animation-tween-parameters-to` |
| 新增账单 | `/workspace/admin/billing/manage/submit` | `animation-keyframes-tween-values-keyframes` |
| 账单记录 | `/workspace/admin/billing/manage/records` | `utilities-stagger-values-staggering` |
| 缴费流水 | `/workspace/admin/billing/payments` | `web-animation-api-improvements-to-the-web-animation-api-individual-property-parameters` |
| 发布公告 | `/workspace/admin/announcements/publish/submit` | `animation-tween-value-types-function-based` |
| 公告记录 | `/workspace/admin/announcements/publish/records` | `animation-tween-value-types-numerical-value` |
