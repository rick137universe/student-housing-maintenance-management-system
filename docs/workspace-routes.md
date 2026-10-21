# 工作台页面地址规范

页面使用小写英文和连字符，按角色、业务模块、具体页面组织。下级提交、记录、编辑和筛选页面保留其业务层级。详情编号、分页与筛选条件使用查询参数。

原有编号地址通过 308 永久重定向兼容，子路径和查询参数保持不变。四个角色的工作台首页地址保持不变。

## 学生端

| 模块 | 页面 | 地址 |
| --- | --- | --- |
| 学生工作台 | 学生工作台 | `/workspace/student` |
| 个人信息 | 个人信息 | `/workspace/student/personal` |
| 个人信息 | 查看个人信息 | `/workspace/student/personal/profile` |
| 个人信息 | 修改个人信息 | `/workspace/student/personal/edit-profile` |
| 个人信息 | 修改登录密码 | `/workspace/student/personal/change-password` |
| 住宿业务 | 住宿业务 | `/workspace/student/accommodation` |
| 住宿业务 | 入住申请 | `/workspace/student/accommodation/check-in` |
| 住宿业务 | 提交入住申请 | `/workspace/student/accommodation/check-in/submit` |
| 住宿业务 | 入住申请记录 | `/workspace/student/accommodation/check-in/records` |
| 住宿业务 | 调宿申请 | `/workspace/student/accommodation/room-change` |
| 住宿业务 | 提交调宿申请 | `/workspace/student/accommodation/room-change/submit` |
| 住宿业务 | 调宿申请记录 | `/workspace/student/accommodation/room-change/records` |
| 住宿业务 | 退宿申请 | `/workspace/student/accommodation/check-out` |
| 住宿业务 | 提交退宿申请 | `/workspace/student/accommodation/check-out/submit` |
| 住宿业务 | 退宿申请记录 | `/workspace/student/accommodation/check-out/records` |
| 缴费管理 | 缴费管理 | `/workspace/student/payment` |
| 缴费管理 | 查看账单 | `/workspace/student/payment/bills` |
| 缴费管理 | 在线缴费 | `/workspace/student/payment/online-payment` |
| 缴费管理 | 缴费记录 | `/workspace/student/payment/payment-history` |
| 报修服务 | 报修服务 | `/workspace/student/repair` |
| 报修服务 | 提交报修 | `/workspace/student/repair/requests` |
| 报修服务 | 提交报修申请 | `/workspace/student/repair/requests/submit` |
| 报修服务 | 提交报修记录 | `/workspace/student/repair/requests/records` |
| 报修服务 | 查看进度 | `/workspace/student/repair/progress` |
| 报修服务 | 当前报修进度 | `/workspace/student/repair/progress/current` |
| 报修服务 | 报修进度记录 | `/workspace/student/repair/progress/records` |
| 报修服务 | 服务评价 | `/workspace/student/repair/reviews` |
| 报修服务 | 提交服务评价 | `/workspace/student/repair/reviews/submit` |
| 报修服务 | 服务评价记录 | `/workspace/student/repair/reviews/records` |
| 公告查看 | 公告查看 | `/workspace/student/announcements` |
| 公告查看 | 公寓通知 | `/workspace/student/announcements/notices` |
| 公告查看 | 缴费提醒 | `/workspace/student/announcements/payment-reminders` |
| 个人消息 | 个人消息 | `/workspace/student/notifications` |
| 个人消息 | 消息通知 | `/workspace/student/notifications/messages` |

## 宿管端

| 模块 | 页面 | 地址 |
| --- | --- | --- |
| 宿管工作台 | 宿管工作台 | `/workspace/dormManager` |
| 基础信息 | 基础信息 | `/workspace/dormManager/base-data` |
| 基础信息 | 学生信息 | `/workspace/dormManager/base-data/students` |
| 基础信息 | 房间信息 | `/workspace/dormManager/base-data/rooms` |
| 基础信息 | 床位信息 | `/workspace/dormManager/base-data/beds` |
| 住宿事务 | 住宿事务 | `/workspace/dormManager/accommodation` |
| 住宿事务 | 入住登记与分配 | `/workspace/dormManager/accommodation/check-in` |
| 住宿事务 | 调宿审核 | `/workspace/dormManager/accommodation/room-change` |
| 住宿事务 | 退宿登记 | `/workspace/dormManager/accommodation/check-out` |
| 床位状态 | 床位状态 | `/workspace/dormManager/beds` |
| 床位状态 | 床位总览 | `/workspace/dormManager/beds/inventory` |
| 床位状态 | 状态更新 | `/workspace/dormManager/beds/update-status` |
| 床位状态 | 异常校验 | `/workspace/dormManager/beds/anomalies` |
| 报修初审 | 报修初审 | `/workspace/dormManager/repair-review` |
| 报修初审 | 待初审工单 | `/workspace/dormManager/repair-review/pending` |
| 报修初审 | 上报维修 | `/workspace/dormManager/repair-review/reported` |
| 报修初审 | 驳回报修 | `/workspace/dormManager/repair-review/rejected` |
| 账单核对 | 账单核对 | `/workspace/dormManager/billing` |
| 账单核对 | 账单核对 | `/workspace/dormManager/billing/verification` |
| 账单核对 | 欠费名单 | `/workspace/dormManager/billing/arrears` |
| 账单核对 | 催缴记录 | `/workspace/dormManager/billing/reminders` |
| 个人中心 | 个人中心 | `/workspace/dormManager/personal` |
| 个人中心 | 查看个人信息 | `/workspace/dormManager/personal/profile` |
| 个人中心 | 修改个人信息 | `/workspace/dormManager/personal/edit-profile` |
| 个人中心 | 修改登录密码 | `/workspace/dormManager/personal/change-password` |
| 个人消息 | 个人消息 | `/workspace/dormManager/notifications` |
| 个人消息 | 消息通知 | `/workspace/dormManager/notifications/messages` |

## 维修人员端

| 模块 | 页面 | 地址 |
| --- | --- | --- |
| 维修工作台 | 维修工作台 | `/workspace/maintenance` |
| 工单接收 | 工单接收 | `/workspace/maintenance/orders` |
| 工单接收 | 查看工单 | `/workspace/maintenance/orders/assigned` |
| 工单接收 | 确认接单 | `/workspace/maintenance/orders/accept` |
| 维修处理 | 维修处理 | `/workspace/maintenance/repair` |
| 维修处理 | 开始维修 | `/workspace/maintenance/repair/start` |
| 维修处理 | 更新状态 | `/workspace/maintenance/repair/update-status` |
| 维修处理 | 完成工单 | `/workspace/maintenance/repair/complete` |
| 维修记录 | 维修记录 | `/workspace/maintenance/records` |
| 维修记录 | 填写记录 | `/workspace/maintenance/records/write` |
| 维修记录 | 维修归档 | `/workspace/maintenance/records/archive` |
| 个人统计 | 个人统计 | `/workspace/maintenance/analytics` |
| 个人统计 | 工作量统计 | `/workspace/maintenance/analytics/workload` |
| 个人统计 | 完成率 | `/workspace/maintenance/analytics/completion-rate` |
| 个人统计 | 服务评价 | `/workspace/maintenance/analytics/reviews` |
| 个人中心 | 个人中心 | `/workspace/maintenance/personal` |
| 个人中心 | 查看个人信息 | `/workspace/maintenance/personal/profile` |
| 个人中心 | 修改个人信息 | `/workspace/maintenance/personal/edit-profile` |
| 个人中心 | 修改登录密码 | `/workspace/maintenance/personal/change-password` |
| 个人消息 | 个人消息 | `/workspace/maintenance/notifications` |
| 个人消息 | 消息通知 | `/workspace/maintenance/notifications/messages` |

## 管理员端

| 模块 | 页面 | 地址 |
| --- | --- | --- |
| 管理员工作台 | 管理员工作台 | `/workspace/admin` |
| 基础数据 | 基础数据 | `/workspace/admin/base-data` |
| 基础数据 | 数据维护 | `/workspace/admin/base-data/manage` |
| 基础数据 | 新增数据 | `/workspace/admin/base-data/manage/submit` |
| 基础数据 | 数据记录 | `/workspace/admin/base-data/manage/records` |
| 基础数据 | 批量导入 | `/workspace/admin/base-data/import` |
| 基础数据 | 数据导出 | `/workspace/admin/base-data/export` |
| 流程管控 | 流程管控 | `/workspace/admin/process` |
| 流程管控 | 分床规则 | `/workspace/admin/process/bed-assignment` |
| 流程管控 | 配置分床规则 | `/workspace/admin/process/bed-assignment/edit` |
| 流程管控 | 住宿流程 | `/workspace/admin/process/accommodation` |
| 流程管控 | 配置住宿流程 | `/workspace/admin/process/accommodation/edit` |
| 流程管控 | 缴费流程 | `/workspace/admin/process/payment` |
| 流程管控 | 配置缴费流程 | `/workspace/admin/process/payment/edit` |
| 报修派工 | 报修派工 | `/workspace/admin/dispatch` |
| 报修派工 | 待派工 | `/workspace/admin/dispatch/pending` |
| 报修派工 | 智能派工 | `/workspace/admin/dispatch/automatic` |
| 报修派工 | 进度监控 | `/workspace/admin/dispatch/progress` |
| 统计报表 | 统计报表 | `/workspace/admin/reports` |
| 统计报表 | 运营统计 | `/workspace/admin/reports/operations` |
| 统计报表 | 筛选运营统计 | `/workspace/admin/reports/operations/filter` |
| 统计报表 | 维修统计 | `/workspace/admin/reports/maintenance` |
| 统计报表 | 筛选维修统计 | `/workspace/admin/reports/maintenance/filter` |
| 统计报表 | 导出报表 | `/workspace/admin/reports/export` |
| 权限管理 | 权限管理 | `/workspace/admin/permissions` |
| 权限管理 | 用户账号 | `/workspace/admin/permissions/accounts` |
| 权限管理 | 新增员工账号 | `/workspace/admin/permissions/accounts/submit` |
| 权限管理 | 账号记录 | `/workspace/admin/permissions/accounts/records` |
| 权限管理 | 角色权限 | `/workspace/admin/permissions/roles` |
| 权限管理 | 配置角色权限 | `/workspace/admin/permissions/roles/submit` |
| 权限管理 | 权限记录 | `/workspace/admin/permissions/roles/records` |
| 权限管理 | 楼栋授权 | `/workspace/admin/permissions/roles/authorize` |
| 权限管理 | 授权记录 | `/workspace/admin/permissions/roles/authorizations` |
| 权限管理 | 权限审计 | `/workspace/admin/permissions/audit` |
| 备份恢复 | 备份恢复 | `/workspace/admin/backup` |
| 备份恢复 | 备份策略 | `/workspace/admin/backup/policies` |
| 备份恢复 | 新增备份策略 | `/workspace/admin/backup/policies/submit` |
| 备份恢复 | 策略记录 | `/workspace/admin/backup/policies/records` |
| 备份恢复 | 立即备份 | `/workspace/admin/backup/tasks` |
| 备份恢复 | 创建备份 | `/workspace/admin/backup/tasks/submit` |
| 备份恢复 | 备份记录 | `/workspace/admin/backup/tasks/records` |
| 备份恢复 | 数据恢复 | `/workspace/admin/backup/restore` |
| 账单管理 | 账单管理 | `/workspace/admin/billing` |
| 账单管理 | 账单生成 | `/workspace/admin/billing/generate` |
| 账单管理 | 生成月账单 | `/workspace/admin/billing/generate/submit` |
| 账单管理 | 账单记录 | `/workspace/admin/billing/generate/records` |
| 账单管理 | 账单维护 | `/workspace/admin/billing/manage` |
| 账单管理 | 新增账单 | `/workspace/admin/billing/manage/submit` |
| 账单管理 | 账单记录 | `/workspace/admin/billing/manage/records` |
| 账单管理 | 缴费流水 | `/workspace/admin/billing/payments` |
| 公告管理 | 公告管理 | `/workspace/admin/announcements` |
| 公告管理 | 公告发布 | `/workspace/admin/announcements/publish` |
| 公告管理 | 发布公告 | `/workspace/admin/announcements/publish/submit` |
| 公告管理 | 公告记录 | `/workspace/admin/announcements/publish/records` |
| 个人中心 | 个人中心 | `/workspace/admin/personal` |
| 个人中心 | 查看个人信息 | `/workspace/admin/personal/profile` |
| 个人中心 | 修改个人信息 | `/workspace/admin/personal/edit-profile` |
| 个人中心 | 修改登录密码 | `/workspace/admin/personal/change-password` |
| 个人消息 | 个人消息 | `/workspace/admin/notifications` |
| 个人消息 | 消息通知 | `/workspace/admin/notifications/messages` |

