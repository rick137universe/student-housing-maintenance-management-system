import 'server-only';
import {headers} from 'next/headers';
import {currentAccount} from './security';
import {AppError} from './errors';

// Resolve the first render from the HttpOnly session, without a browser round trip.
// Keep this request-scoped; an account must never be cached across requests/users.
export async function initialAccount(){
  const incoming=await headers();
  if(!incoming.get('cookie')?.split(';').some(cookie=>cookie.trim().startsWith('dorma_session=')))return null;
  try{return await currentAccount(new Request('http://session.local/',{headers:incoming}));}
  catch(error){
    if(error instanceof AppError&&error.status===401)return null;
    // Public pages remain usable if the database is temporarily unavailable.
    // The client can retry without presenting an identity-loading screen.
    return undefined;
  }
}
