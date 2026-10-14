import { handle } from '@/server/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = {params:Promise<{path:string[]}>};
async function handler(request:Request,context:Context){return handle(request,(await context.params).path);}
export {handler as GET,handler as POST,handler as PATCH,handler as DELETE};
