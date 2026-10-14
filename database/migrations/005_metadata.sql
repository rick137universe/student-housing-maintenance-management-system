COMMENT ON SCHEMA housing IS '学生公寓住宿与报修系统：20张原业务表、6张后端支撑表及迁移记录';
COMMENT ON COLUMN housing.maintenance_records.service_rating IS '已确认业务细则：每次处理仅评价一次，整数1～5星';
COMMENT ON COLUMN housing.apartment_buildings.gender_restriction IS '入住性别限制：male/female/any，分床与资料变更校验';
COMMENT ON TABLE housing.payment_attempts IS '课程测试支付请求：幂等返回、成功/失败/取消；不产生真实扣款';
