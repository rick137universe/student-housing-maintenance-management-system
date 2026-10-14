import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AnimeHomePage } from '@/views/home/AnimeHomePage';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
export const metadata: Metadata = { title: 'student-housing-maintenance-management-system · Dorma', description: '学生公寓住宿与报修服务 · 前端交互原型' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN" data-scroll-behavior="smooth"><body><ThemeProvider><AuthProvider><AnimeHomePage />{children}</AuthProvider></ThemeProvider></body></html>; }
