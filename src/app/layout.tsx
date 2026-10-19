import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AnimeHomePage } from '@/views/home/AnimeHomePage';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { initialAccount } from '@/server/initial-account';
export const metadata: Metadata = { title: 'student-housing-maintenance-management-system · Dorma', description: '学生公寓住宿与报修服务 · 前端交互原型' };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account=await initialAccount();
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body><ThemeProvider><AuthProvider initialAccount={account}><AnimeHomePage />{children}</AuthProvider></ThemeProvider></body></html>;
}
