-- 学生公寓住宿与报修管理系统；PostgreSQL 18；仅用于空的新数据库。
-- psql -X -v ON_ERROR_STOP=1 -d student_housing_maintenance -f database/001_schema.sql
BEGIN;
CREATE SCHEMA housing;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SET LOCAL search_path = housing, pg_catalog;

CREATE TABLE students (
    student_number varchar(32) PRIMARY KEY,
    full_name varchar(100) NOT NULL,
    gender varchar(20) NOT NULL,
    college varchar(150) NOT NULL,
    grade varchar(40) NOT NULL,
    phone varchar(32),
    password_hash text NOT NULL CHECK (length(password_hash) > 0),
    account_status varchar(20) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'disabled', 'locked'))
);

-- 学生认证信息仍在 students；员工认证信息在此表，避免保存两份学生密码。
CREATE TABLE user_accounts (
    account_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(64) NOT NULL UNIQUE,
    full_name varchar(100) NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('student', 'dorm_manager', 'maintenance', 'admin')),
    student_number varchar(32) UNIQUE REFERENCES students(student_number),
    password_hash text,
    account_status varchar(20) CHECK (account_status IN ('active', 'disabled', 'locked')),
    phone varchar(32),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, role),
    CHECK ((role = 'student' AND student_number IS NOT NULL AND password_hash IS NULL AND account_status IS NULL)
        OR (role <> 'student' AND student_number IS NULL AND password_hash IS NOT NULL
            AND length(password_hash) > 0 AND account_status IS NOT NULL))
);

CREATE TABLE apartment_buildings (
    building_id varchar(32) PRIMARY KEY,
    building_name varchar(100) NOT NULL,
    total_floors integer NOT NULL CHECK (total_floors > 0),
    building_attribute varchar(80) NOT NULL,
    manager_account_id bigint NOT NULL,
    manager_role varchar(20) NOT NULL DEFAULT 'dorm_manager' CHECK (manager_role = 'dorm_manager'),
    location_description text,
    FOREIGN KEY (manager_account_id, manager_role) REFERENCES user_accounts(account_id, role)
);

CREATE TABLE building_authorizations (
    account_id bigint NOT NULL,
    account_role varchar(20) NOT NULL DEFAULT 'dorm_manager' CHECK (account_role = 'dorm_manager'),
    building_id varchar(32) NOT NULL REFERENCES apartment_buildings(building_id),
    PRIMARY KEY (account_id, building_id),
    FOREIGN KEY (account_id, account_role) REFERENCES user_accounts(account_id, role)
);

CREATE TABLE role_permissions (
    role varchar(20) NOT NULL CHECK (role IN ('student', 'dorm_manager', 'maintenance', 'admin')),
    resource varchar(80) NOT NULL,
    operation varchar(80) NOT NULL,
    data_scope varchar(30) NOT NULL CHECK (data_scope IN ('self', 'authorized_buildings', 'assigned_orders', 'public', 'all')),
    PRIMARY KEY (role, resource, operation)
);

CREATE TABLE rooms (
    room_id varchar(32) PRIMARY KEY,
    building_id varchar(32) NOT NULL REFERENCES apartment_buildings(building_id),
    floor_number integer NOT NULL CHECK (floor_number > 0),
    room_type varchar(80) NOT NULL,
    bed_capacity integer NOT NULL CHECK (bed_capacity > 0),
    room_status varchar(20) NOT NULL DEFAULT 'available' CHECK (room_status IN ('available', 'maintenance', 'closed'))
);

CREATE TABLE beds (
    bed_id varchar(32) PRIMARY KEY,
    room_id varchar(32) NOT NULL REFERENCES rooms(room_id),
    bed_number varchar(20) NOT NULL,
    bed_status varchar(20) NOT NULL DEFAULT 'available' CHECK (bed_status IN ('available', 'occupied', 'maintenance', 'closed')),
    UNIQUE (room_id, bed_number)
);

CREATE TABLE accommodation_applications (
    application_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    preferred_building_id varchar(32) REFERENCES apartment_buildings(building_id),
    expected_check_in_date date,
    application_note text,
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    reviewer_account_id bigint REFERENCES user_accounts(account_id),
    reviewed_at timestamptz,
    review_note text,
    CHECK ((reviewer_account_id IS NULL) = (reviewed_at IS NULL)),
    CHECK (reviewed_at IS NULL OR reviewed_at >= applied_at)
);

CREATE TABLE occupancy_records (
    occupancy_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    bed_id varchar(32) NOT NULL REFERENCES beds(bed_id),
    check_in_date date NOT NULL,
    check_out_date date,
    allocation_method varchar(20) NOT NULL CHECK (allocation_method IN ('automatic', 'manual')),
    operator_account_id bigint NOT NULL REFERENCES user_accounts(account_id),
    application_id bigint UNIQUE REFERENCES accommodation_applications(application_id),
    CHECK (check_out_date IS NULL OR check_out_date >= check_in_date)
);
CREATE UNIQUE INDEX uq_active_student ON occupancy_records(student_number) WHERE check_out_date IS NULL;
CREATE UNIQUE INDEX uq_active_bed ON occupancy_records(bed_id) WHERE check_out_date IS NULL;

CREATE TABLE accommodation_changes (
    change_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    business_type varchar(20) NOT NULL CHECK (business_type IN ('transfer', 'checkout')),
    original_bed_id varchar(32) NOT NULL REFERENCES beds(bed_id),
    new_bed_id varchar(32) REFERENCES beds(bed_id),
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    reviewer_account_id bigint REFERENCES user_accounts(account_id),
    reviewed_at timestamptz,
    completed_at timestamptz,
    application_note text,
    review_note text,
    CHECK (new_bed_id IS NULL OR new_bed_id <> original_bed_id),
    CHECK (business_type <> 'checkout' OR new_bed_id IS NULL),
    CHECK (business_type <> 'transfer' OR review_status <> 'completed' OR new_bed_id IS NOT NULL),
    CHECK ((review_status = 'completed') = (completed_at IS NOT NULL)),
    CHECK (completed_at IS NULL OR completed_at >= applied_at),
    CHECK ((reviewer_account_id IS NULL) = (reviewed_at IS NULL)),
    CHECK (reviewed_at IS NULL OR reviewed_at >= applied_at)
);

CREATE TABLE accommodation_bills (
    bill_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    billing_period varchar(40) NOT NULL,
    accommodation_fee numeric(14,2) NOT NULL CHECK (accommodation_fee >= 0),
    utility_fee numeric(14,2) NOT NULL CHECK (utility_fee >= 0),
    total_amount numeric(14,2) GENERATED ALWAYS AS (accommodation_fee + utility_fee) STORED,
    bill_status varchar(20) NOT NULL DEFAULT 'unpaid' CHECK (bill_status IN ('unpaid', 'partial', 'paid')),
    generated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bill_id, student_number)
);

CREATE TABLE payment_records (
    payment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id bigint NOT NULL,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    paid_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method varchar(80) NOT NULL,
    idempotency_key varchar(128) NOT NULL UNIQUE,
    operator_account_id bigint REFERENCES user_accounts(account_id),
    FOREIGN KEY (bill_id, student_number) REFERENCES accommodation_bills(bill_id, student_number)
);

CREATE TABLE repair_requests (
    repair_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number varchar(32) NOT NULL REFERENCES students(student_number),
    room_id varchar(32) NOT NULL REFERENCES rooms(room_id),
    fault_type varchar(80) NOT NULL,
    fault_description text NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    repair_status varchar(30) NOT NULL DEFAULT 'pending_review'
        CHECK (repair_status IN ('pending_review', 'rejected', 'pending_dispatch', 'dispatched', 'accepted', 'in_progress', 'completed', 'evaluated')),
    reviewer_account_id bigint,
    reviewer_role varchar(20) NOT NULL DEFAULT 'dorm_manager' CHECK (reviewer_role = 'dorm_manager'),
    reviewed_at timestamptz,
    review_note text,
    FOREIGN KEY (reviewer_account_id, reviewer_role) REFERENCES user_accounts(account_id, role),
    CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at)
);

CREATE TABLE maintenance_records (
    maintenance_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repair_id bigint NOT NULL REFERENCES repair_requests(repair_id),
    technician_account_id bigint NOT NULL,
    technician_role varchar(20) NOT NULL DEFAULT 'maintenance' CHECK (technician_role = 'maintenance'),
    dispatcher_account_id bigint NOT NULL,
    dispatcher_role varchar(20) NOT NULL DEFAULT 'admin' CHECK (dispatcher_role = 'admin'),
    dispatched_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamptz,
    maintenance_at timestamptz,
    processing_description text,
    completed_at timestamptz,
    service_rating numeric(6,2),
    evaluation_content text,
    evaluated_at timestamptz,
    FOREIGN KEY (technician_account_id, technician_role) REFERENCES user_accounts(account_id, role),
    FOREIGN KEY (dispatcher_account_id, dispatcher_role) REFERENCES user_accounts(account_id, role),
    CHECK (accepted_at IS NULL OR accepted_at >= dispatched_at),
    CHECK (maintenance_at IS NULL OR maintenance_at >= dispatched_at),
    CHECK (completed_at IS NULL OR (maintenance_at IS NOT NULL AND completed_at >= maintenance_at)),
    CHECK (evaluated_at IS NULL OR (completed_at IS NOT NULL AND evaluated_at >= completed_at)),
    CHECK ((service_rating IS NULL AND evaluation_content IS NULL) OR completed_at IS NOT NULL)
);

CREATE TABLE announcements (
    announcement_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title varchar(200) NOT NULL,
    content text NOT NULL,
    announcement_type varchar(40) NOT NULL,
    building_id varchar(32) REFERENCES apartment_buildings(building_id),
    publisher_account_id bigint NOT NULL,
    publisher_role varchar(20) NOT NULL DEFAULT 'admin' CHECK (publisher_role = 'admin'),
    published_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz,
    FOREIGN KEY (publisher_account_id, publisher_role) REFERENCES user_accounts(account_id, role),
    CHECK (expires_at IS NULL OR expires_at >= published_at)
);

CREATE TABLE notifications (
    notification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_account_id bigint NOT NULL REFERENCES user_accounts(account_id),
    title varchar(200) NOT NULL,
    content text NOT NULL,
    bill_id bigint REFERENCES accommodation_bills(bill_id),
    repair_id bigint REFERENCES repair_requests(repair_id),
    application_id bigint REFERENCES accommodation_applications(application_id),
    change_id bigint REFERENCES accommodation_changes(change_id),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at timestamptz,
    CHECK (num_nonnulls(bill_id, repair_id, application_id, change_id) <= 1),
    CHECK (read_at IS NULL OR read_at >= created_at)
);

CREATE TABLE system_settings (
    setting_key varchar(100) PRIMARY KEY,
    setting_value jsonb NOT NULL,
    description text NOT NULL,
    updated_by bigint REFERENCES user_accounts(account_id),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_policies (
    policy_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    policy_name varchar(100) NOT NULL,
    schedule_expression varchar(100) NOT NULL,
    destination_description text NOT NULL,
    retention_days integer NOT NULL CHECK (retention_days > 0),
    enabled boolean NOT NULL DEFAULT true,
    configured_by bigint NOT NULL REFERENCES user_accounts(account_id),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_runs (
    backup_run_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    policy_id bigint REFERENCES backup_policies(policy_id),
    operation_type varchar(20) NOT NULL CHECK (operation_type IN ('backup', 'restore')),
    started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamptz,
    run_status varchar(20) NOT NULL DEFAULT 'running' CHECK (run_status IN ('running', 'succeeded', 'failed')),
    external_file_reference text,
    checksum text,
    operator_account_id bigint REFERENCES user_accounts(account_id),
    result_description text,
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE audit_events (
    audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_account_id bigint REFERENCES user_accounts(account_id),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operation varchar(100) NOT NULL,
    entity_type varchar(100) NOT NULL,
    entity_id varchar(128),
    result varchar(40) NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 跨行约束使用父行锁，不能将跨表查询放入 CHECK。
CREATE FUNCTION check_room_capacity() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE capacity integer; total integer;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.room_id <> OLD.room_id THEN
        RAISE EXCEPTION '床位所属房间不可直接修改';
    END IF;
    SELECT bed_capacity INTO capacity FROM rooms WHERE room_id = NEW.room_id FOR UPDATE;
    SELECT count(*) INTO total FROM beds WHERE room_id = NEW.room_id AND bed_id <> NEW.bed_id;
    IF total + 1 > capacity THEN RAISE EXCEPTION '床位数超过房间容量'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER check_bed_capacity BEFORE INSERT OR UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION check_room_capacity();

CREATE FUNCTION check_room_definition() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE floors integer;
BEGIN
    SELECT total_floors INTO floors FROM apartment_buildings WHERE building_id = NEW.building_id FOR UPDATE;
    IF NEW.floor_number > floors THEN RAISE EXCEPTION '房间楼层超过楼栋总楼层数'; END IF;
    IF TG_OP = 'UPDATE' THEN
        IF (SELECT count(*) FROM beds WHERE room_id = OLD.room_id) > NEW.bed_capacity THEN
            RAISE EXCEPTION '房间容量小于现有床位数量';
        END IF;
        IF NEW.room_status <> 'available' AND EXISTS (
            SELECT 1 FROM occupancy_records o JOIN beds b USING (bed_id)
            WHERE b.room_id = OLD.room_id AND o.check_out_date IS NULL
        ) THEN RAISE EXCEPTION '有有效入住记录的房间不能停用'; END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_room BEFORE INSERT OR UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION check_room_definition();

CREATE FUNCTION check_building_floors() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM rooms WHERE building_id = OLD.building_id AND floor_number > NEW.total_floors) THEN
        RAISE EXCEPTION '楼栋层数小于现有房间所在楼层';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_building BEFORE UPDATE ON apartment_buildings FOR EACH ROW EXECUTE FUNCTION check_building_floors();

CREATE FUNCTION validate_occupancy() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE current_status varchar; room_state varchar; target_room varchar;
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.student_number <> OLD.student_number OR NEW.bed_id <> OLD.bed_id) THEN
        RAISE EXCEPTION '入住历史不可换人或换床；调宿应结束旧记录并新增记录';
    END IF;
    SELECT room_id INTO target_room FROM beds WHERE bed_id = NEW.bed_id;
    SELECT room_status INTO room_state FROM rooms WHERE room_id = target_room FOR UPDATE;
    SELECT bed_status INTO current_status FROM beds WHERE bed_id = NEW.bed_id FOR UPDATE;
    IF NEW.check_out_date IS NULL AND (TG_OP = 'INSERT' OR OLD.check_out_date IS NOT NULL) THEN
        IF current_status <> 'available' OR room_state <> 'available' THEN RAISE EXCEPTION '床位或房间不可用'; END IF;
    END IF;
    IF NEW.application_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM accommodation_applications WHERE application_id = NEW.application_id
            AND student_number = NEW.student_number AND review_status IN ('approved', 'completed')
    ) THEN RAISE EXCEPTION '入住申请归属或审核状态不正确'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_stay BEFORE INSERT OR UPDATE ON occupancy_records FOR EACH ROW EXECUTE FUNCTION validate_occupancy();

CREATE FUNCTION sync_bed_status() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE target_bed varchar;
BEGIN
    target_bed := CASE WHEN TG_OP = 'DELETE' THEN OLD.bed_id ELSE NEW.bed_id END;
    UPDATE beds SET bed_status = CASE
        WHEN EXISTS (SELECT 1 FROM occupancy_records WHERE bed_id = target_bed AND check_out_date IS NULL) THEN 'occupied'
        WHEN bed_status = 'occupied' THEN 'available'
        ELSE bed_status END
    WHERE bed_id = target_bed;
    RETURN NULL;
END $$;
CREATE TRIGGER sync_stay AFTER INSERT OR UPDATE OR DELETE ON occupancy_records FOR EACH ROW EXECUTE FUNCTION sync_bed_status();

CREATE FUNCTION validate_bed_status() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
BEGIN
    IF (NEW.bed_status = 'occupied') <> EXISTS (
        SELECT 1 FROM occupancy_records WHERE bed_id = NEW.bed_id AND check_out_date IS NULL
    ) THEN RAISE EXCEPTION '床位状态必须与有效入住记录一致'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_bed BEFORE INSERT OR UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION validate_bed_status();

CREATE FUNCTION lock_payment_bill() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION '缴费流水不可修改或删除；更正需另行制定冲正流程'; END IF;
    PERFORM 1 FROM accommodation_bills WHERE bill_id = NEW.bill_id FOR UPDATE;
    RETURN NEW;
END $$;
CREATE TRIGGER lock_payment BEFORE INSERT OR UPDATE OR DELETE ON payment_records FOR EACH ROW EXECUTE FUNCTION lock_payment_bill();

CREATE FUNCTION sync_bill_status() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE paid numeric;
BEGIN
    SELECT COALESCE(sum(amount), 0) INTO paid FROM payment_records WHERE bill_id = NEW.bill_id;
    UPDATE accommodation_bills SET bill_status = CASE WHEN paid >= total_amount THEN 'paid' WHEN paid > 0 THEN 'partial' ELSE 'unpaid' END
    WHERE bill_id = NEW.bill_id;
    RETURN NULL;
END $$;
CREATE TRIGGER sync_payment AFTER INSERT ON payment_records FOR EACH ROW EXECUTE FUNCTION sync_bill_status();

CREATE FUNCTION validate_bill_status() RETURNS trigger LANGUAGE plpgsql SET search_path = housing, pg_catalog AS $$
DECLARE paid numeric; expected varchar;
BEGIN
    SELECT COALESCE(sum(amount), 0) INTO paid FROM payment_records WHERE bill_id = NEW.bill_id;
    expected := CASE WHEN paid >= NEW.accommodation_fee + NEW.utility_fee THEN 'paid' WHEN paid > 0 THEN 'partial' ELSE 'unpaid' END;
    NEW.bill_status := expected;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_bill BEFORE INSERT OR UPDATE ON accommodation_bills FOR EACH ROW EXECUTE FUNCTION validate_bill_status();

CREATE INDEX ix_building_manager ON apartment_buildings(manager_account_id);
CREATE INDEX ix_authorization_building ON building_authorizations(building_id);
CREATE INDEX ix_rooms_building ON rooms(building_id, room_status);
CREATE INDEX ix_beds_room_status ON beds(room_id, bed_status);
CREATE INDEX ix_occupancy_student_history ON occupancy_records(student_number, check_in_date DESC);
CREATE INDEX ix_occupancy_bed_history ON occupancy_records(bed_id, check_in_date DESC);
CREATE INDEX ix_application_student ON accommodation_applications(student_number, applied_at DESC);
CREATE INDEX ix_application_status ON accommodation_applications(review_status, applied_at);
CREATE INDEX ix_change_student ON accommodation_changes(student_number, applied_at DESC);
CREATE INDEX ix_change_status ON accommodation_changes(review_status, applied_at);
CREATE INDEX ix_change_original_bed ON accommodation_changes(original_bed_id);
CREATE INDEX ix_change_new_bed ON accommodation_changes(new_bed_id);
CREATE INDEX ix_bill_student_period ON accommodation_bills(student_number, billing_period);
CREATE INDEX ix_bill_status_period ON accommodation_bills(bill_status, billing_period);
CREATE INDEX ix_payment_bill ON payment_records(bill_id, paid_at);
CREATE INDEX ix_payment_student ON payment_records(student_number, paid_at DESC);
CREATE INDEX ix_repair_student ON repair_requests(student_number, submitted_at DESC);
CREATE INDEX ix_repair_room_status ON repair_requests(room_id, repair_status);
CREATE INDEX ix_repair_queue ON repair_requests(repair_status, submitted_at);
CREATE INDEX ix_maintenance_repair ON maintenance_records(repair_id, dispatched_at);
CREATE INDEX ix_maintenance_technician ON maintenance_records(technician_account_id, completed_at);
CREATE INDEX ix_notification_recipient ON notifications(recipient_account_id, read_at, created_at DESC);
CREATE INDEX ix_audit_actor ON audit_events(actor_account_id, occurred_at DESC);

CREATE VIEW bill_balances AS
SELECT b.bill_id, b.student_number, b.billing_period, b.total_amount, b.bill_status,
    COALESCE(sum(p.amount), 0) AS paid_amount,
    b.total_amount - COALESCE(sum(p.amount), 0) AS outstanding_amount
FROM accommodation_bills b LEFT JOIN payment_records p USING (bill_id)
GROUP BY b.bill_id;

CREATE VIEW building_occupancy_statistics AS
SELECT a.building_id, a.building_name, count(b.bed_id) AS total_beds,
    count(b.bed_id) FILTER (WHERE b.bed_status = 'occupied') AS occupied_beds,
    count(b.bed_id) FILTER (WHERE b.bed_status = 'available') AS available_beds
FROM apartment_buildings a LEFT JOIN rooms r USING (building_id) LEFT JOIN beds b USING (room_id)
GROUP BY a.building_id;

COMMENT ON SCHEMA housing IS '学生公寓住宿与报修业务；10 张核心表及 10 张配套表';
COMMENT ON TABLE students IS '核心：学生基本信息；学生密码只保存加盐哈希';
COMMENT ON TABLE apartment_buildings IS '核心：公寓楼基本信息';
COMMENT ON TABLE rooms IS '核心：房间基本信息';
COMMENT ON TABLE beds IS '核心：床位基本信息；状态随有效入住同步';
COMMENT ON TABLE occupancy_records IS '核心：入住事实与历史；退宿日期为空表示有效入住';
COMMENT ON TABLE accommodation_changes IS '核心：调宿和退宿申请、审核、办理流水';
COMMENT ON TABLE accommodation_bills IS '核心：住宿费用账单；同学生同账期允许多张账单';
COMMENT ON TABLE payment_records IS '核心：缴费流水；幂等键防重复记账，复合外键保证账单与学生归属一致';
COMMENT ON TABLE repair_requests IS '核心：报修信息，含初审驳回分支';
COMMENT ON TABLE maintenance_records IS '核心：一张报修单可有多次维修处理记录';
COMMENT ON TABLE user_accounts IS '配套：统一账号身份；学生凭据在 students，其他角色凭据在本表';
COMMENT ON TABLE building_authorizations IS '配套：宿管额外楼栋授权；负责宿管由楼栋表表达';
COMMENT ON TABLE role_permissions IS '配套：业务角色权限定义；实际授权由服务端校验，不是 PostgreSQL 登录角色';
COMMENT ON TABLE accommodation_applications IS '配套：分床之前独立存在的入住申请';
COMMENT ON TABLE announcements IS '配套：管理员发布的公告';
COMMENT ON TABLE notifications IS '配套：个人消息与业务提醒';
COMMENT ON TABLE system_settings IS '配套：自动分床规则等业务参数';
COMMENT ON TABLE backup_policies IS '配套：备份策略；不代替外部调度程序';
COMMENT ON TABLE backup_runs IS '配套：备份恢复执行记录；备份文件存储在数据库之外';
COMMENT ON TABLE audit_events IS '配套：服务端写入操作审计，不得写入明文密码或完整密码哈希';
COMMENT ON COLUMN maintenance_records.service_rating IS '文档尚未规定评分范围，因此不添加 1~5 等范围约束';
COMMENT ON COLUMN payment_records.idempotency_key IS '应用/支付网关每次业务请求的稳定唯一标识，重试必须复用';
COMMIT;
