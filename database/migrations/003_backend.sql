SET LOCAL search_path = housing, pg_catalog;
ALTER TABLE students ADD COLUMN email varchar(254);
ALTER TABLE user_accounts ADD COLUMN email varchar(254);
ALTER TABLE apartment_buildings ADD COLUMN gender_restriction varchar(10) NOT NULL DEFAULT 'any'
 CHECK (gender_restriction IN ('male','female','any'));
ALTER TABLE accommodation_changes ADD COLUMN preferred_building_id varchar(32) REFERENCES apartment_buildings;
ALTER TABLE accommodation_changes ADD COLUMN expected_date date;
ALTER TABLE repair_requests ADD COLUMN contact_phone varchar(32);
ALTER TABLE repair_requests DROP CONSTRAINT repair_requests_repair_status_check;
ALTER TABLE repair_requests ADD CONSTRAINT repair_status_values CHECK (repair_status IN
 ('pending_review','rejected','pending_dispatch','dispatched','accepted','in_progress','waiting_parts','completed','evaluated'));
ALTER TABLE maintenance_records ADD COLUMN expected_completion_at timestamptz;
ALTER TABLE maintenance_records ADD COLUMN materials text;
ALTER TABLE maintenance_records ADD COLUMN hours numeric(8,2) CHECK (hours > 0);
ALTER TABLE maintenance_records ADD CONSTRAINT rating_range CHECK (service_rating IS NULL OR
 (service_rating BETWEEN 1 AND 5 AND service_rating = trunc(service_rating)));
ALTER TABLE accommodation_bills ADD COLUMN due_date date;
ALTER TABLE accommodation_bills ADD COLUMN checked_by bigint REFERENCES user_accounts;
ALTER TABLE accommodation_bills ADD COLUMN checked_at timestamptz;
ALTER TABLE announcements ADD COLUMN enabled boolean NOT NULL DEFAULT true;

CREATE TABLE auth_sessions (
 token_hash char(64) PRIMARY KEY, account_id bigint NOT NULL REFERENCES user_accounts,
 csrf_token varchar(64) NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_account ON auth_sessions(account_id);
CREATE TABLE login_attempts (
 attempt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username varchar(64) NOT NULL, source varchar(128) NOT NULL,
 attempted_at timestamptz NOT NULL DEFAULT now(), succeeded boolean NOT NULL
);
CREATE INDEX login_throttle ON login_attempts(username, source, attempted_at);
CREATE TABLE billing_batches (
 batch_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 billing_period varchar(7) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 created_by bigint REFERENCES user_accounts, configuration jsonb NOT NULL
);
ALTER TABLE accommodation_bills ADD COLUMN batch_id bigint REFERENCES billing_batches;
CREATE UNIQUE INDEX generated_bill_once ON accommodation_bills(batch_id,student_number) WHERE batch_id IS NOT NULL;
CREATE TABLE payment_attempts (
 idempotency_key varchar(128) PRIMARY KEY, account_id bigint NOT NULL REFERENCES user_accounts,
 bill_id bigint NOT NULL REFERENCES accommodation_bills, amount numeric(14,2) NOT NULL CHECK(amount > 0),
 result varchar(20) NOT NULL CHECK(result IN ('succeeded','failed','cancelled')),
 payment_id bigint REFERENCES payment_records, message text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE maintenance_updates (
 update_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 repair_id bigint NOT NULL REFERENCES repair_requests,
 maintenance_id bigint REFERENCES maintenance_records,
 actor_account_id bigint NOT NULL REFERENCES user_accounts,
 status varchar(30) NOT NULL, description text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX repair_history ON maintenance_updates(repair_id,created_at,update_id);
CREATE TABLE worker_heartbeats (
 worker_id varchar(100) PRIMARY KEY, heartbeat_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE backup_runs DROP CONSTRAINT backup_runs_run_status_check;
ALTER TABLE backup_runs ADD CONSTRAINT backup_run_status_values CHECK(run_status IN ('queued','running','succeeded','failed'));
ALTER TABLE backup_runs ADD COLUMN source_backup_id bigint REFERENCES backup_runs;
ALTER TABLE backup_runs ADD COLUMN restored_database varchar(63);
ALTER TABLE backup_runs ADD COLUMN validation_result jsonb;
ALTER TABLE backup_runs ADD COLUMN scheduled_key varchar(100) UNIQUE;
ALTER TABLE backup_runs ADD COLUMN lease_expires_at timestamptz;
ALTER TABLE backup_runs ADD COLUMN worker_id varchar(100);
ALTER TABLE backup_runs ADD COLUMN file_deleted_at timestamptz;

-- 金额修改和并发缴费在数据库层也受到保护。
CREATE OR REPLACE FUNCTION lock_payment_bill() RETURNS trigger LANGUAGE plpgsql SET search_path=housing,pg_catalog AS $$
DECLARE remaining numeric;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION '缴费流水不可修改或删除'; END IF;
 PERFORM 1 FROM accommodation_bills WHERE bill_id=NEW.bill_id FOR UPDATE;
 SELECT b.total_amount-COALESCE((SELECT sum(amount) FROM payment_records p WHERE p.bill_id=b.bill_id),0)
 INTO remaining FROM accommodation_bills b WHERE b.bill_id=NEW.bill_id;
 IF NEW.amount>remaining THEN RAISE EXCEPTION '缴费金额超过剩余应缴金额'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION protect_paid_bill() RETURNS trigger LANGUAGE plpgsql SET search_path=housing,pg_catalog AS $$
BEGIN
 IF (NEW.accommodation_fee<>OLD.accommodation_fee OR NEW.utility_fee<>OLD.utility_fee
 OR NEW.student_number<>OLD.student_number) AND EXISTS(SELECT 1 FROM payment_records WHERE bill_id=OLD.bill_id)
 THEN RAISE EXCEPTION '已发生缴费的账单不能修改费用或归属'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_bill BEFORE UPDATE ON accommodation_bills FOR EACH ROW EXECUTE FUNCTION protect_paid_bill();

CREATE OR REPLACE FUNCTION validate_occupancy() RETURNS trigger LANGUAGE plpgsql SET search_path=housing,pg_catalog AS $$
DECLARE bed_state varchar; room_state varchar; target_room varchar; gender_rule varchar; student_gender varchar;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.student_number<>OLD.student_number OR NEW.bed_id<>OLD.bed_id)
 THEN RAISE EXCEPTION '入住历史不可换人或换床'; END IF;
 SELECT room_id INTO target_room FROM beds WHERE bed_id=NEW.bed_id;
 SELECT r.room_status,a.gender_restriction INTO room_state,gender_rule FROM rooms r
 JOIN apartment_buildings a USING(building_id) WHERE r.room_id=target_room FOR UPDATE OF r;
 SELECT bed_status INTO bed_state FROM beds WHERE bed_id=NEW.bed_id FOR UPDATE;
 IF NEW.check_out_date IS NULL AND (TG_OP='INSERT' OR OLD.check_out_date IS NOT NULL) THEN
  IF bed_state<>'available' OR room_state<>'available' THEN RAISE EXCEPTION '床位或房间不可用'; END IF;
  SELECT gender INTO student_gender FROM students WHERE student_number=NEW.student_number FOR UPDATE;
  IF gender_rule<>'any' AND gender_rule<>student_gender THEN RAISE EXCEPTION '楼栋入住性别不匹配'; END IF;
 END IF;
 IF NEW.application_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accommodation_applications
 WHERE application_id=NEW.application_id AND student_number=NEW.student_number AND review_status IN ('approved','completed'))
 THEN RAISE EXCEPTION '入住申请归属或审核状态不正确'; END IF;
 RETURN NEW;
END $$;

-- 审计不允许应用账号改写历史；授权在部署命令中完成。
COMMENT ON TABLE auth_sessions IS '会话只保存随机令牌 SHA-256 摘要';
COMMENT ON TABLE payment_attempts IS '测试支付请求和可重放结果，包含失败和取消';
COMMENT ON TABLE maintenance_updates IS '报修状态及维修进展时间线';
