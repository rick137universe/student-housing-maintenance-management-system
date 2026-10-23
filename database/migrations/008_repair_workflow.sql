SET LOCAL search_path = housing, pg_catalog;

INSERT INTO system_settings(setting_key,setting_value,description)
VALUES ('repair','{"autoReview":false}'::jsonb,'报修流程：自动通过报修初审，默认关闭')
ON CONFLICT (setting_key) DO NOTHING;

-- Automatic events have no human operator. Preserve existing human attributions.
ALTER TABLE maintenance_updates ALTER COLUMN actor_account_id DROP NOT NULL;
COMMENT ON COLUMN maintenance_updates.actor_account_id IS '操作账号；系统自动处理事件为空，不冒用宿管身份';
