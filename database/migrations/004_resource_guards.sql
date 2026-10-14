SET LOCAL search_path=housing,pg_catalog;
CREATE FUNCTION protect_building_gender() RETURNS trigger LANGUAGE plpgsql SET search_path=housing,pg_catalog AS $$
BEGIN
 IF NEW.gender_restriction<>'any' AND EXISTS(SELECT 1 FROM rooms r JOIN beds b USING(room_id)
 JOIN occupancy_records o USING(bed_id) JOIN students s USING(student_number)
 WHERE r.building_id=OLD.building_id AND o.check_out_date IS NULL AND s.gender<>NEW.gender_restriction)
 THEN RAISE EXCEPTION '楼栋新性别限制与当前入住学生不匹配'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_building_gender BEFORE UPDATE OF gender_restriction ON apartment_buildings FOR EACH ROW EXECUTE FUNCTION protect_building_gender();
CREATE FUNCTION protect_student_gender() RETURNS trigger LANGUAGE plpgsql SET search_path=housing,pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id)
 JOIN apartment_buildings a USING(building_id) WHERE o.student_number=OLD.student_number AND o.check_out_date IS NULL
 AND a.gender_restriction<>'any' AND a.gender_restriction<>NEW.gender)
 THEN RAISE EXCEPTION '性别修改与当前入住楼栋不匹配'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_student_gender BEFORE UPDATE OF gender ON students FOR EACH ROW EXECUTE FUNCTION protect_student_gender();
