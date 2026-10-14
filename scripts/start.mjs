import { cp, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
await mkdir('.next/standalone/.next',{recursive:true});
await cp('public','.next/standalone/public',{recursive:true});
await cp('.next/static','.next/standalone/.next/static',{recursive:true});
const child=spawn(process.execPath,['.next/standalone/server.js'],{stdio:'inherit',env:{...process.env,PORT:process.env.PORT??'3100',HOSTNAME:process.env.HOSTNAME??'localhost'},windowsHide:true});
child.on('exit',code=>process.exit(code??1));
