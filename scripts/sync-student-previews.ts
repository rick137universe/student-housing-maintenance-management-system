import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import previews from '../src/data/student-previews.json';
import {studentPages} from '../src/data/student-pages';

export async function syncStudentPreviews(){
 const root='public/assets/student/assets/html/';
 const original=await readFile(root+'documentation-demos.html','utf8');
 let demos=await readFile(root+'student-demos.html','utf8');
 for(const config of previews){
  const entry=studentPages.find(page=>page.url===config.url)!;
  const expression=(id:string)=>new RegExp(`<article[^>]*data-id="${id}"[\\s\\S]*?</article>`);
  const source=original.match(expression(config.source))?.[0];
  if(!source||!demos.match(expression(entry.id)))throw new Error('Missing preview: '+config.url);
  let preview=source.replaceAll(config.source,entry.id)
   .replace(/data-color="[^"]+"/,`data-color="${entry.color}"`)
   .replace(/(<h2 class="text-ui">)[\s\S]*?<\/h2>/,`$1${entry.label}</h2>`);
  if(config.kind==='splittext'&&config.lines){
   preview=preview.replaceAll('All-in-one text splitter',config.lines[0])
    .replaceAll('テキストスプリッター',config.lines[1]);
  }else if(['username','phone','password'].includes(config.kind??'')){
   preview=preview.replaceAll('npm·install·animejs',config.kind==='password'?'password':'—');
   preview=preview.replace(/(window\.demos[\s\S]*?\}\) \{)[\s\S]*?(\n\}\s*<\/script>)/,
    `$1\nreturn window.dormaStudentPreviews.installation(ctx, {animate, waapi, createScope, utils, splitText, stagger, steps, irregular}, '${config.kind}');$2`);
  }else if(config.kind){
   const labels=config.kind==='latest'?['最新待缴的水电费','最新待缴的住宿费']:config.kind==='paid'?['累计缴费的水电费','累计缴费的住宿费']:['待缴费账单数量'];
   preview=preview.replaceAll('current time',labels[0]).replaceAll('callback fired',labels[1]??'');
   preview=preview.replace(/(window\.demos[\s\S]*?\}\) \{)[\s\S]*?(\n\}\s*<\/script>)/,
    `$1\nreturn window.dormaStudentPreviews.finance(ctx, {animate, createTimer, utils}, '${config.kind}');$2`);
  }
  demos=demos.replace(expression(entry.id),()=>preview);
 }
 await writeFile(root+'student-demos.html',demos);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await syncStudentPreviews();
