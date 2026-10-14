'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { Account } from '@/types/auth';
import { api,readAuthSession,saveAuthSession } from '@/utils/auth-session';
const AuthContext=createContext<{account:Account|null|undefined;refresh:()=>Promise<void>}>({account:undefined,refresh:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<Account|null|undefined>(undefined);
 async function refresh(){try{const result=await api<Account>('auth/me');saveAuthSession(result.data);}catch{saveAuthSession(null);}setAccount(readAuthSession());}
 useEffect(()=>{const update=()=>setAccount(readAuthSession());window.addEventListener('dorma-auth-changed',update);const timer=setTimeout(()=>void refresh(),0);return()=>{clearTimeout(timer);window.removeEventListener('dorma-auth-changed',update);};},[]);
 return <AuthContext.Provider value={{account,refresh}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
