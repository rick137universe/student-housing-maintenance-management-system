import type { Metadata } from 'next';
import { LoginPage } from '@/views/auth/LoginPage';

export const metadata: Metadata = { title: '登录 · Dorma', description: '登录学生公寓住宿与报修管理系统', robots: { index: false, follow: false } };

export default function Page() { return <LoginPage />; }
