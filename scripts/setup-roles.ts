import './env';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const admin=new Pool({connectionString:process.env.DATABASE_ADMIN_URL});
try{
 for(const [name,createdb,key] of [['dorma_app',false,'DATABASE_URL'],['dorma_ops',true,'DATABASE_OPERATIONS_URL']] as const){
  const url=new URL(process.env[key]??process.env.DATABASE_ADMIN_URL!);
  let password=url.username===name?decodeURIComponent(url.password):randomBytes(32).toString('hex');
  if(password.length<16)password=randomBytes(32).toString('hex');
  const existing=(await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[name])).rowCount;
  const quoted=password.replaceAll("'","''");
  await admin.query(`${existing?'ALTER':'CREATE'} ROLE ${name} LOGIN PASSWORD '${quoted}' ${createdb?'CREATEDB':'NOCREATEDB'} NOSUPERUSER NOCREATEROLE`);
  await admin.query(`GRANT CONNECT ON DATABASE "${url.pathname.slice(1)}" TO ${name}`);
  await admin.query(`GRANT USAGE ON SCHEMA housing TO ${name}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA housing TO ${name}; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA housing TO ${name};
    REVOKE UPDATE,DELETE ON housing.audit_events,housing.payment_records FROM ${name}; GRANT SELECT ON housing.schema_migrations TO ${name}; REVOKE INSERT,UPDATE,DELETE ON housing.schema_migrations FROM ${name}`);
  url.username=name;url.password=password;
  const content=await readFile('.env.local','utf8');const line=`${key}=${url.href}`;
  await writeFile('.env.local',content.match(new RegExp(`^${key}=.*$`,'m'))?content.replace(new RegExp(`^${key}=.*$`,'m'),line):content+'\n'+line+'\n');
 }
 console.log('已配置最小权限应用账号与隔离恢复维护账号，凭据仅保存在 .env.local');
}finally{await admin.end();}
