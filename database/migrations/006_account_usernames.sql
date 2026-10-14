-- 只规范登录用户名；保留账号 ID、学号、密码以及所有业务关联。
LOCK TABLE housing.user_accounts IN ACCESS EXCLUSIVE MODE;

CREATE FUNCTION housing.normalize_account_username(value text, account_role text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE
    WHEN account_role = 'student' AND left(value, 3) <> 'stu' THEN 'stu' || value
    WHEN account_role = 'maintenance' AND left(value, 2) = 'wx' THEN 'mt' || substring(value FROM 3)
    WHEN account_role = 'maintenance' AND left(value, 2) <> 'mt' THEN 'mt' || value
    ELSE value
  END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM housing.user_accounts
    GROUP BY housing.normalize_account_username(username, role)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '规范用户名后存在重名，迁移已停止，请先处理冲突账号';
  END IF;
END
$$;

UPDATE housing.user_accounts
SET username = housing.normalize_account_username(username, role)
WHERE username <> housing.normalize_account_username(username, role);

-- 覆盖初始化、学生档案新增/CSV 导入和管理员账号维护入口。
CREATE FUNCTION housing.enforce_account_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.username := housing.normalize_account_username(NEW.username, NEW.role);
  RETURN NEW;
END
$$;

CREATE TRIGGER account_username_prefix
BEFORE INSERT OR UPDATE OF username, role ON housing.user_accounts
FOR EACH ROW EXECUTE FUNCTION housing.enforce_account_username();

COMMENT ON COLUMN housing.user_accounts.username IS '登录用户名：学生以 stu 开头，维修人员以 mt 开头；与学号独立';
