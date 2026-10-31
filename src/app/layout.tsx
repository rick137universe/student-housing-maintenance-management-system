import type { Metadata } from 'next';
import '../../public/assets/shared/css/fonts/source-han-sans-sc.css';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { initialAccount } from '@/features/auth/server/initial-account';
export const metadata: Metadata = { title: '学生公寓住宿与报修管理系统 | FLight', description: '学生公寓住宿与报修服务 · 前端交互原型', icons: {icon: {url:'/assets/shared/images/favicon.svg',type:'image/svg+xml',sizes:'any'}} };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account=await initialAccount();
  return <html lang="zh-CN" data-scroll-behavior="smooth"><head>{['Regular','Bold','Heavy'].map(weight=><link key={weight} rel="preload" href={`/assets/shared/fonts/SourceHanSansSC-UI-${weight}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous"/>)}</head><body><ThemeProvider><AuthProvider initialAccount={account}><AppShell />{children}</AuthProvider></ThemeProvider></body></html>;
}
