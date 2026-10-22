# 后端接口与业务说明

接口前缀 `/api/v1`。Next.js Node.js Route Handler 负责传输，业务代码位于 `src/server/`，所有查询使用参数化 SQL。浏览器不能直接连接 PostgreSQL。

## 认证与响应

学生用户名以 `stu` 开头，维修人员用户名以 `mt` 开头。迁移 `006_account_usernames` 将已有学生用户名加上 `stu`，将维修人员的 `wx` 前缀替换为 `mt`；新增账号和角色变更也由数据库触发器规范前缀，避免重复添加。学号、账号 ID、密码和业务关联保持不变，登录使用迁移后的用户名。

`POST auth/login` 接收 `{username,password}`，返回账号和 CSRF 令牌，同时设置 HttpOnly 会话 Cookie。`GET auth/me` 读取当前账号，`POST auth/logout` 退出。会话保存8小时；密码、角色或账号状态改变会撤销相关会话。密码使用随机盐 scrypt（N=131072，r=8，p=1）。

所有写请求必须来自 `APP_ORIGIN`，登录后的写请求额外带 `X-CSRF-Token`。Cookie 在 HTTPS 下启用 Secure，使用 SameSite=Lax。开发直连默认不信任代理头；只有受控反向代理配置正确时才设置 `TRUST_PROXY=true`。登录失败按账号和来源在15分钟窗口限流。原密码预校验及最终改密共享本人账号的失败次数，15分钟内累计10次失败后拒绝继续校验；请求沿用身份、同源和 CSRF 检查，最终改密仍重新验证原密码。

成功响应 `{data,meta?}`；列表 meta 为 `{page,limit,total}`，默认20条、最大100条。错误为 `{error:{code,message,fieldErrors?}}`。HTTP 400表示输入错误，401表示登录失效，403表示权限或来源校验失败，404表示记录不存在或不可访问，409表示业务冲突，413表示请求超过5MB，429表示登录或密码校验限流。

bigint ID 使用字符串，金额使用十进制字符串，时间使用 ISO 8601，日历日期使用 YYYY-MM-DD。应用角色为 student、dormManager、maintenance、admin；数据库中的 dorm_manager 在响应中映射为 dormManager。

## 接口清单

导航提醒使用 `GET /api/v1/navigation`，按当前身份的权限和业务范围返回各页面的提醒状态。`POST /api/v1/navigation/read` 接收 `{resource,id,version}`，在详情显示后确认对应版本；同样校验会话、来源、CSRF 及记录访问权限。预加载不确认阅读，待办状态不因打开页面消除。学生进展关联通知只确认该详情版本已包含的通知编号，后续新增通知保持未读。

迁移 `007_navigation_reads` 增加个人阅读记录表，用于公告、维修评价和备份结果；记录按账号隔离，内容版本变化后重新提醒。四端导航规则集中于 `src/data/navigation-signals.ts`。

| 路径 | 方法 | 行为 |
| --- | --- | --- |
| `health` | GET | 应用、数据库及任务进程心跳状态 |
| `auth/login`、`auth/me`、`auth/logout` | POST、GET、POST | 登录、获取身份、退出 |
| `profile`、`profile/password` | GET/PATCH、POST | 个人资料、修改密码 |
| `profile/password/verify` | POST | 接收 `{currentPassword}`，验证当前登录账号的原密码，成功返回 `{verified:true}`，不改密或撤销会话 |
| `students`、`buildings`、`rooms`、`beds` | GET/POST | 查询、新增资源 |
| 上述资源的 `/{id}` | GET/PATCH/DELETE | 详情、修改、删除未引用资源；学生通过停用处理 |
| `occupancies` | GET | 当前与历史入住记录 |
| `applications`、`changes` | GET/POST | 入住申请、调宿/退宿申请 |
| `applications/{id}/review`、`changes/{id}/review` | POST | 审核与办理，`decision=approve/reject`，可指定 bedId |
| `bills`、`bills/{id}` | GET/POST、GET/PATCH | 查询、新增和调整未发生缴费的账单 |
| `bills/generate` | POST | 按 `{period:"YYYY-MM"}` 生成月账单，同批次重试不重复生成 |
| `bills/{id}/pay` | POST | 测试支付，接收 amount、idempotencyKey、result |
| `bills/{id}/check`、`bills/{id}/remind` | POST | 宿管核对、发送站内催缴 |
| `payments`、`reminders` | GET | 缴费流水、催缴通知记录 |
| `repairs` | GET/POST | 报修查询、学生提交报修 |
| `repairs/{id}/history` | GET | 真实工单处理时间线 |
| `repairs/{id}/review` | POST | 宿管初审，通过进入待派工，驳回必须填写 note |
| `repairs/{id}/dispatch` | POST | 管理员派工；不指定 technicianId 时按未完成任务数推荐 |
| `repairs/{id}/accept`、`start` | POST | 获派维修人员接单、开始维修 |
| `repairs/{id}/progress`、`record` | POST | 更新维修进展/说明及预计完成时间 |
| `repairs/{id}/complete` | POST | 填写 note、hours、materials，确认完工 |
| `repairs/{id}/evaluate` | POST | 本人已完成工单的一次1～5星评价 |
| `maintenance`、`statistics` | GET | 本人维修记录、按权限范围的实时统计 |
| `announcements`、`announcements/{id}` | GET/POST、GET/PATCH | 查询、发布、编辑及停用公告 |
| `notifications`、`notifications/{id}/read` | GET、POST | 本人消息、标记已读 |
| `accounts`、`accounts/{id}` | GET/POST、GET/PATCH | 账号维护、停用、角色修改和密码重置 |
| `permissions`、`authorizations` | GET/POST、GET/POST/DELETE | 角色权限开关和宿管楼栋范围 |
| `settings`、`settings/{key}` | GET、PATCH | 分床、住宿办理期限和固定月费配置 |
| `audit`、`anomalies` | GET | 审计记录、资源状态异常检查 |
| `backup-policies`、`backup-policies/{id}` | GET/POST、GET/PATCH | 每日备份策略与保留天数 |
| `backups`、`backups/restore` | GET/POST、POST | 查询任务、排队备份、恢复到独立数据库 |
| `export/{resource}`、`export/{resource}/template` | GET | 真实数据 CSV 导出、资源导入模板 |
| `import/{resource}` | POST text/csv | 四类资源的新增式原子导入，返回错误行号 |
| `statistics/export` | GET | 将实际汇总数据导出为分类、对象、指标、值四列 |

列表支持 q、page、limit；业务列表另支持 status（逗号分隔）、type、period、unpaid、unread、buildingId。统计和审计等有时间字段的列表支持 from/to 日历日期，结束日期包含当日。资源和操作范围由服务端查询与权限检查共同限制，不接受客户端指定操作者。

## 页面与接口对应

`src/data/workspace-actions.ts` 是全部74个页面入口的对应清单，`src/data/role-features.ts` 保存现有URL及菜单。原57个入口继续使用，新增管理员账单/公告、员工个人资料/密码及各角色通知入口。`LiveWorkspace` 按清单读取真实数据，表单调用上表中的业务动作，成功后重新查询。

| 页面分组 | 主要接口 |
| --- | --- |
| 个人信息、个人消息 | profile、profile/password、notifications |
| 学生住宿、宿管住宿事务 | applications、changes、occupancies、resources、review |
| 学生缴费、宿管账单核对、管理员账单管理 | bills、pay、payments、check、remind、generate |
| 学生报修、宿管初审、管理员派工、维修处理 | repairs、history、review、dispatch、accept、start、progress、complete、evaluate |
| 基础数据、床位状态、批量导入导出 | students/buildings/rooms/beds、anomalies、import/export |
| 统计、规则、权限、公告、备份 | statistics、settings、accounts、permissions、authorizations、audit、announcements、backups |

## 业务规则

入住申请必须指定意向楼栋。分床按意向、宿管授权、楼栋性别及可用状态筛选，按楼栋、楼层、房间和床位号排序。办理时使用实际当天作为入住日期；申请的期望日期作为办理参考。审核、结束旧入住、新增入住、通知和成功审计在同一事务内完成。退宿释放床位，历史不删除。自动分床开关关闭时需手工选择床位；办理时限控制列表详情中的 processing_due_at，不强制自动审批。

固定月费从 billing 配置读取，按生成时有效入住学生生成账单；批次和学生组合防重复。同一学生同一账期允许额外人工账单。有付款的账单不能改金额，付款只能追加。每次测试付款必须使用稳定幂等键，失败或取消也记录请求结果；同键不同内容拒绝，重试不会重复入账。测试支付不产生真实扣款，不提供退款、冲正和商户回调。

报修流程为待初审→驳回或待派工→已派工→已接单→处理中↔等待配件→已完成→已评价。只允许当前住宿房间报修，初审驳回必须填写原因，接单/完工/评价不能重复。已接单后不提供改派。管理员代初审时不伪装成宿管，操作者由时间线和审计记录。

角色权限可在各角色业务边界内启停，不能把学生提升为全局账号。末个有效管理员不能停用或降权，管理员账号与权限恢复能力不可移除。数据库触发器保护入住与账单一致性，业务服务额外使用行锁/事务和权限校验。

## 后台任务与恢复

单独运行 `npm run jobs`，每15秒检查队列并更新心跳。业务时间采用 Asia/Shanghai：每月1日00:10生成账单，启动时补查当月；默认每天02:00备份。每日计划仅支持“分钟 小时 * * *”，任务通过锁、唯一调度键和可续期租约避免重复领取。

备份通过 pg_dump 自定义格式写入 BACKUP_DIR，记录 SHA-256 校验值。恢复只接受已登记、成功且未过期的备份，校验文件后调用 pg_restore，创建独立的 dorma_restore_* 数据库，验证迁移版本、结构、外键、床位状态和账单余额。失败保留任务原因，网页不会替换当前业务库。

`npm run restore:check -- <恢复库名>` 可重新验证登记格式的隔离副本。要使用副本，应停止应用与任务进程、先额外备份当前库，再由维护人员把本机连接配置指向已验证副本；本轮没有自动切换或覆盖数据库的命令。
