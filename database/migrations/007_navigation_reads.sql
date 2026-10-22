CREATE TABLE housing.navigation_reads (
 account_id bigint NOT NULL REFERENCES housing.user_accounts(account_id) ON DELETE CASCADE,
 resource text NOT NULL CHECK(resource IN ('announcements','maintenance','backups')),
 record_id bigint NOT NULL,
 version text NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,resource,record_id)
);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dorma_app') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON housing.navigation_reads TO dorma_app;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dorma_ops') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON housing.navigation_reads TO dorma_ops;
 END IF;
END $$;
