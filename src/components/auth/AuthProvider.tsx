'use client';
import { createContext,useCallback,useContext,useLayoutEffect,useRef,useState,type ReactNode } from 'react';
import type { Account } from '@/types/auth';
import { api,readAuthSession,saveAuthSession } from '@/utils/auth-session';
const AuthContext=createContext<{account:Account|null|undefined;refresh:()=>Promise<void>}>({account:undefined,refresh:async()=>{}});
export function AuthProvider({children,initialAccount}:{children:ReactNode;initialAccount:Account|null|undefined}){
 const [account,setAccount]=useState<Account|null|undefined>(initialAccount);
 const seed=useRef(initialAccount);
 const refresh=useCallback(async()=>{try{const result=await api<Account>('auth/me');saveAuthSession(result.data);}catch{saveAuthSession(null);}setAccount(readAuthSession());},[]);
 useLayoutEffect(()=>{
  const update=()=>setAccount(readAuthSession());
  window.addEventListener('dorma-auth-changed',update);
  if(seed.current!==undefined)saveAuthSession(seed.current);
  const timer=seed.current===undefined?setTimeout(()=>void refresh(),0):undefined;
  const focus=()=>{void refresh();};window.addEventListener('focus',focus);
  return()=>{clearTimeout(timer);window.removeEventListener('dorma-auth-changed',update);window.removeEventListener('focus',focus);};
 },[refresh]);
 return <AuthContext.Provider value={{account,refresh}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
