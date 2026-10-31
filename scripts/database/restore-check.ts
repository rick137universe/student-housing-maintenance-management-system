import '../lib/env';
import { validateRestore } from '../../src/services/server/jobs';
import { pool } from '../../src/lib/db';
const database=process.argv[2];
if(!database?.match(/^dorma_restore_\d+_\d+$/))throw new Error('请传入登记的隔离恢复库名称；此命令不会切换应用数据库');
try{console.log(await validateRestore(database));}finally{await pool.end();}
