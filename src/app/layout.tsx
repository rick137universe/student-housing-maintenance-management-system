import type { Metadata } from 'next';
import '../../public/assets/fonts/source-han-sans-sc.css';
import '@/styles/globals.css';
import { AnimeHomePage } from '@/views/home/AnimeHomePage';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { initialAccount } from '@/server/initial-account';
export const metadata: Metadata = { title: '学生公寓住宿与报修管理系统 | FLight', description: '学生公寓住宿与报修服务 · 前端交互原型', icons: {icon: {url:'/assets/images/favicon.svg',type:'image/svg+xml',sizes:'any'}} };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account=await initialAccount();
  return <html lang="zh-CN" data-scroll-behavior="smooth"><head>{['Regular','Bold','Heavy'].map(weight=><link key={weight} rel="preload" href={`/assets/fonts/SourceHanSansSC-UI-${weight}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous"/>)}</head><body><ThemeProvider><AuthProvider initialAccount={account}><AnimeHomePage />{children}</AuthProvider></ThemeProvider></body></html>;
}
