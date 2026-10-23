# PostgreSQL 数据库结构

> 报修流程更新：运行 `npm run db:migrate` 应用 `008_repair_workflow`，新增默认关闭的 `repair.autoReview` 设置。开启后新报修自动通过初审；现有工单不变。系统事件的 `maintenance_updates.actor_account_id` 允许为空，时间线显示“系统”，不冒用宿管身份；原有人工作业记录及外键保留。

> 导航提醒更新：运行 `npm run db:migrate` 应用 `007_navigation_reads`，新增按账号、资源和记录保存版本的阅读记录表 `navigation_reads`，当前结构共 28 张表。新增表用于公告、评价及任务结果的阅读确认，不修改已有业务记录。学生报修与住宿进展继续复用关联通知的 `read_at`。

> 后端接入更新（2026-10-14）：原20张业务表保留，增量迁移补充会话、登录限流、月账单批次、测试支付请求、维修进展、任务心跳及迁移记录，当前共27张表。使用 `npm run db:migrate` 升级，使用 `npm run db:seed` 显式初始化样例；不能在现有库重新执行初始建库或建表脚本。`002_verify.sql` 仅验证原始概念模型的边界，后端升级后使用 `npm run test:integration` / `npm run test:e2e` 验收。本轮按已确认业务规则增加1～5整数评分、禁止超额缴费、已缴账单金额保护及楼栋性别限制；同学生同账期仍允许额外人工账单。

迁移采用数据库锁、版本与 SHA-256 校验值。运行账号 dorma_app 只有业务 DML、序列和 schema 使用权限，不能创建数据库或改写审计/缴费历史；dorma_ops 用于后台任务和创建独立恢复库。所有维护凭据位于被忽略的本机环境配置。账户会话、权限、事务和备份运行方式参见 [后端说明](../docs/backend-api.md)。

本目录依据需求文档（2026-09-15）与数据库概念结构设计文档（2026-10-05）提供新数据库初始化脚本。数据库名称为 `student_housing_maintenance`，业务 schema 为 `housing`，使用 UTF-8。脚本在 PostgreSQL 18.6 的临时实例中验证。

2026-10-13 已在本机 `localhost:5432` 的 PostgreSQL 18.6 实例实际创建，所有者为 `postgres`。核验结果为 20 张业务表、2 个视图、39 个外键和 9 个业务触发器；`002_verify.sql` 在该实例通过，样例数据全部回滚，20 张业务表均为空。连接密码未写入仓库。IDEA 数据源选择该数据库，并勾选 `housing` schema 后刷新即可查看表结构。

## 文件与执行顺序

| 文件 | 用途 |
| --- | --- |
| `000_create_database.sql` | 连接维护数据库 `postgres` 后创建新数据库；已存在同名数据库时停止 |
| `001_schema.sql` | 在新数据库内创建 20 张表、索引、触发器和统计视图；整个过程使用一个事务 |
| `002_verify.sql` | 在空的新数据库中验证约束、状态同步与历史记录；样例数据最终回滚 |

在 PowerShell 中执行以下命令，按目标实例调整主机、端口与用户。`psql` 会交互式索取密码，脚本不包含数据库密码。

```powershell
$pgClient = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
& $pgClient -X -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/000_create_database.sql
& $pgClient -X -h localhost -p 5432 -U postgres -d student_housing_maintenance -v ON_ERROR_STOP=1 -f database/001_schema.sql
& $pgClient -X -h localhost -p 5432 -U postgres -d student_housing_maintenance -v ON_ERROR_STOP=1 -f database/002_verify.sql
```

脚本面向全新、空的数据库，不删除或覆盖既有数据库。不重复运行初始化；后续结构变更应增加迁移脚本。测试回滚不会恢复 identity 序列的已分配值，因此 ID 出现间隔属于正常行为。应用连接后使用 `housing` 限定表名，或者将本连接的 `search_path` 设为 `housing, pg_catalog`；数据库默认 schema 不作全局修改。

## 十张核心表

| 文档实体 | 表 | 主键 | 核心关联 |
| --- | --- | --- | --- |
| 学生 | `students` | `student_number` | 学号采用字符串，保留前导零；保存姓名、性别、学院、年级、电话、密码哈希与账号状态 |
| 公寓楼 | `apartment_buildings` | `building_id` | 负责宿管关联宿管账号；包含名称、层数、属性与位置 |
| 房间 | `rooms` | `room_id` | 关联楼栋，包含楼层、房型、床位总数、房间状态 |
| 床位 | `beds` | `bed_id` | 关联房间；房间与房间内床位号组合唯一 |
| 入住记录 | `occupancy_records` | `occupancy_id` | 关联学生、床位、操作人及可选入住申请；包含入住日期、退宿日期、分配方式 |
| 调宿和退宿记录 | `accommodation_changes` | `change_id` | 关联学生、原床位、新床位、审核人，记录申请、审核与完成时间 |
| 住宿费用账单 | `accommodation_bills` | `bill_id` | 关联学生，包含账期、住宿费、水电费、生成时间与账单状态 |
| 缴费记录 | `payment_records` | `payment_id` | 关联账单和学生，包含金额、缴费时间、方式及幂等键 |
| 报修信息 | `repair_requests` | `repair_id` | 关联学生、房间、宿管初审人，包含故障类型、描述、提交时间和状态 |
| 维修处理记录 | `maintenance_records` | `maintenance_id` | 关联报修单、维修人员、派工管理员，包含派工、接单、维修、完成时间与服务评价 |

概念文档全局图在学生右侧将入住记录误标成“床位”。本实现按实体表、局部住宿图和正文采用 `occupancy_records`，保留十实体、十三组核心联系。

## 十张配套表

| 表 | 用途 |
| --- | --- |
| `user_accounts` | 四类用户的统一账号标识、姓名、角色和唯一学生身份映射 |
| `role_permissions` | 角色、资源、操作、数据访问范围的权限定义 |
| `building_authorizations` | 宿管额外负责的楼栋范围；首要负责人仍在楼栋表 |
| `accommodation_applications` | 分床前独立存在的入住申请、意向楼栋及审核结果 |
| `announcements` | 全局或指定楼栋公告 |
| `notifications` | 账号通知、已读时间及对应业务引用 |
| `system_settings` | 自动分床规则和其他 JSON 业务参数 |
| `backup_policies` | 备份计划、保留天数和数据库外存储位置的说明 |
| `backup_runs` | 备份或恢复执行结果、外部文件引用与校验值 |
| `audit_events` | 操作者、时间、操作、对象与结果 |

学生密码哈希和状态按原数据字典保存在 `students`；学生 `user_accounts` 行只提供身份映射，密码和状态列必须为 NULL，认证时关联学生表。宿管、维修人员、管理员的密码哈希与状态保存在 `user_accounts`。这样每个账号只有一份凭据数据。密码加盐哈希的生成和校验应由认证服务实现；数据库不保存明文密码，也不创建默认账号或演示业务记录。

业务角色使用 `student`、`dorm_manager`、`maintenance`、`admin`；它们不是 PostgreSQL 数据库登录角色。角色权限和楼栋授权表提供数据结构，后续服务端必须校验实际调用者身份与访问范围，并由专用、最小权限的数据库登录角色访问业务数据；当前脚本未将前端演示身份接入数据库，也未配置行级安全策略。

## 完整性与事务

有效入住由 `check_out_date IS NULL` 表示；两个部分唯一索引分别限制有效记录中的学号和床位编号，历史记录可重复引用学生及床位。床位插入/更新锁定所属房间并校验容量，房间容量、楼层和楼栋总楼层数的修改也受到校验。有效入住只允许使用可用房间中的可用床位，触发器同步 occupied/available 状态；不允许将有有效入住的房间停用或手工破坏床位占用状态。

调宿应在同一事务内结束原入住、插入目标床位的新入住记录、更新变更记录；退宿在同一事务内结束入住并更新退宿变更记录。失败时整个事务回滚。脚本不提供面向前端的业务 API；变更审核与完成记录必须由服务端与实际入住变更一起提交。

缴费表通过 `(bill_id, student_number)` 复合外键保证与账单学生一致。每次缴费必须提供稳定、唯一的 `idempotency_key`，重试复用同一键；插入先锁定账单行，再新增流水和更新账单状态。`total_amount` 是住宿费与水电费之和的生成列，账单状态由付款合计计算，禁止手工写入不一致状态。缴费流水按追加模式保存，不能直接修改或删除；退款、冲正和作废需后续独立设计。

同学生同账期允许多张账单，累计缴费允许超过总额，评分不设 1～5 范围。这三条边界遵循概念文档明确列出的“待细化规则”。金额非负、缴费金额为正、人员角色、日期先后和业务状态取值是本次物理设计的具体选择。房间层数从 1 开始，住宿业务 ID 使用 bigint identity，金额使用 `numeric(14,2)`，业务时间使用 `timestamptz`；若实际有地下楼层或退款流程，应通过后续迁移调整。

报修状态覆盖待初审、驳回、待派工、已派工、已接单、处理中、已完成、已评价。一张报修单允许多条处理记录；维修执行者必须为维修角色，派工者必须为管理员，初审人必须为宿管。具体允许的状态转换、操作人与所辖楼栋匹配、学生对本人报修的评价等规则由后续服务端业务层校验，不能仅凭表上的枚举认为权限已经实现。

审计表需要服务端写入关键操作结果，禁止记录明文密码和完整密码哈希。备份策略与执行表只保存配置和元数据，实际定时备份、备份文件权限和恢复验证由外部任务执行。

`bill_balances` 汇总账单缴费及余额，`building_occupancy_statistics` 汇总楼栋床位占用。常用学号、楼栋、账期、状态和关联字段已有索引。跨行约束使用锁与触发器，核心关系使用外键和唯一约束，参见 [PostgreSQL 18 约束文档](https://www.postgresql.org/docs/18/ddl-constraints.html)。并发业务使用 READ COMMITTED；若使用其他隔离级别，调用方需要处理序列化失败或死锁并重试整个事务。

## 验证范围

`002_verify.sql` 覆盖床位编号唯一、容量限制、楼层检查、学生/床位有效入住冲突、床位状态同步、调宿与历史再入住、缴费学生归属、重复幂等键、账单金额与状态、多次维修处理、人员角色外键。样例数据全部回滚；这不等于业务 API、权限隔离、定时备份和真实支付已完成。
