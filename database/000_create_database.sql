-- 使用具备 CREATEDB 权限的账号连接 postgres 数据库后运行。
-- 此命令不能放入事务；数据库已存在时停止，避免覆盖既有数据。
CREATE DATABASE student_housing_maintenance
    WITH ENCODING = 'UTF8' TEMPLATE = template0;
COMMENT ON DATABASE student_housing_maintenance IS '学生公寓住宿与报修管理系统';
