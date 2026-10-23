# 管理员端中间栏

十个模块主页及 `src/data/admin-previews.json` 中十四个二级页面保持 getting-started 点阵，包括新增的“报修流程”。个人中心沿用账号、手机号、小写 password 打字动画，消息通知沿用未读数量 duration 动画。

其余 34 个子页面的预览映射沿用其他三端图形动画，并补充指定的 Stagger 样式，排除 getting-started 点阵、双语 splitText 及所有 timer 数字框。分配结果固定在 `src/data/admin-random-previews.json`；刷新和重新生成不再随机抽取。新增的“配置报修流程”沿用 `animation/tween-parameters/to`。

`scripts/sync-admin-shell.ts` 优先应用专属样式，再读取固定分配。仅替换预览来源和对应标题、主题色、页面标识，保留母版布局、尺寸与重新播放功能，业务内容和路由保持原样。

| 页面 | 路径 | 母版动画 |
| --- | --- | --- |
| 统计可视化 | `/workspace/admin/reports/visualization` | `animation-keyframes-tween-values-keyframes` |
| 配置报修流程 | `/workspace/admin/process/repair/edit` | `animation-tween-parameters-to` |
| 新增数据 | `/workspace/admin/base-data/manage/submit` | `animation-tween-parameters-from` |
| 数据记录 | `/workspace/admin/base-data/manage/records` | `web-animation-api-improvements-to-the-web-animation-api-function-based-values` |
| 批量导入 | `/workspace/admin/base-data/import` | `utilities-stagger-stagger-parameters-stagger-grid` |
| 数据导出 | `/workspace/admin/base-data/export` | `utilities-stagger-stagger-parameters-stagger-from` |
| 配置分床规则 | `/workspace/admin/process/bed-assignment/edit` | `utilities-stagger-values-staggering` |
| 配置住宿流程 | `/workspace/admin/process/accommodation/edit` | `utilities-stagger-stagger-parameters-stagger-modifier` |
| 配置缴费流程 | `/workspace/admin/process/payment/edit` | `web-animation-api-api-differences-with-native-waapi-iterations` |
| 待派工 | `/workspace/admin/dispatch/pending` | `web-animation-api-improvements-to-the-web-animation-api-individual-property-parameters` |
| 智能派工 | `/workspace/admin/dispatch/automatic` | `utilities-stagger` |
| 进度监控 | `/workspace/admin/dispatch/progress` | `web-animation-api-improvements-to-the-web-animation-api-spring-and-custom-easings` |
| 筛选运营统计 | `/workspace/admin/reports/operations/filter` | `animation-targets-dom-elements` |
| 筛选维修统计 | `/workspace/admin/reports/maintenance/filter` | `utilities-stagger-stagger-parameters-stagger-grid-axis` |
| 导出报表 | `/workspace/admin/reports/export` | `utilities-stagger` |
| 新增员工账号 | `/workspace/admin/permissions/accounts/submit` | `web-animation-api-api-differences-with-native-waapi-iterations` |
| 账号记录 | `/workspace/admin/permissions/accounts/records` | `web-animation-api-improvements-to-the-web-animation-api-individual-property-parameters` |
| 配置角色权限 | `/workspace/admin/permissions/roles/submit` | `animation-targets-dom-elements` |
| 权限记录 | `/workspace/admin/permissions/roles/records` | `web-animation-api-improvements-to-the-web-animation-api-spring-and-custom-easings` |
| 楼栋授权 | `/workspace/admin/permissions/roles/authorize` | `utilities-stagger-values-staggering` |
| 授权记录 | `/workspace/admin/permissions/roles/authorizations` | `utilities-stagger-stagger-parameters-stagger-grid-axis` |
| 权限审计 | `/workspace/admin/permissions/audit` | `animation-tween-parameters-from` |
| 新增备份策略 | `/workspace/admin/backup/policies/submit` | `web-animation-api-improvements-to-the-web-animation-api-function-based-values` |
| 策略记录 | `/workspace/admin/backup/policies/records` | `utilities-stagger-stagger-parameters-stagger-from` |
| 创建备份 | `/workspace/admin/backup/tasks/submit` | `animation-tween-value-types-numerical-value` |
| 备份记录 | `/workspace/admin/backup/tasks/records` | `animation-tween-value-types-function-based` |
| 数据恢复 | `/workspace/admin/backup/restore` | `utilities-stagger-stagger-parameters-stagger-grid` |
| 生成月账单 | `/workspace/admin/billing/generate/submit` | `utilities-stagger-stagger-parameters-stagger-jitter` |
| 账单记录 | `/workspace/admin/billing/generate/records` | `animation-tween-parameters-to` |
| 新增账单 | `/workspace/admin/billing/manage/submit` | `animation-keyframes-tween-values-keyframes` |
| 账单记录 | `/workspace/admin/billing/manage/records` | `utilities-stagger-stagger-parameters-stagger-ease` |
| 缴费流水 | `/workspace/admin/billing/payments` | `utilities-stagger-stagger-value-types-range-value` |
| 发布公告 | `/workspace/admin/announcements/publish/submit` | `animation-tween-value-types-function-based` |
| 公告记录 | `/workspace/admin/announcements/publish/records` | `animation-tween-value-types-numerical-value` |

统计可视化入口使用独立的 easing-editor 三栏页面，不显示 Docs 中间栏；其入口占位预览仅用于母版导航兼容。参见 [统计可视化](statistics-visualization.md)。

本轮仅随机替换 11 个未指定专属样式的子页，使用 values-staggering、range-value、from、ease、grid、grid-axis、modifier 和 jitter 八种 Stagger 预览；原有其他分配保留。映射中的样式种类从 12 增至 19，同一种样式最多从 4 次降至 2 次。模块主页、指定点阵、个人中心与消息通知、统计可视化页面及配置报修流程均保持原样。
