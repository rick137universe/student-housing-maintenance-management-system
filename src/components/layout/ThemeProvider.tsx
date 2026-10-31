'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';
const ThemeContext = createContext({ mode: 'system' as ThemeMode, resolved: 'dark' as 'light' | 'dark', setMode: (mode: ThemeMode) => { void mode; } });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, updateMode] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const readMode = () => {
      let value: string | null = null;
      try { value = localStorage.getItem('dorma-theme'); } catch {}
      updateMode(value === 'light' || value === 'dark' ? value : 'system');
      setSystemDark(media.matches);
    };
    const frame = requestAnimationFrame(readMode);
    const syncSystem = () => setSystemDark(media.matches);
    media.addEventListener('change', syncSystem);
    window.addEventListener('storage', readMode);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', syncSystem); window.removeEventListener('storage', readMode); };
  }, []);
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  useEffect(() => { document.documentElement.dataset.theme = resolved; document.documentElement.style.colorScheme = resolved; }, [resolved]);
  function setMode(value: ThemeMode) {
    updateMode(value);
    try { localStorage.setItem('dorma-theme', value); } catch {}
  }
  return <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
export function ThemeSelect() {
  const { mode, setMode } = useTheme();
  return <div className="theme-options" role="group" aria-label="主题选择">{(['system', 'light', 'dark'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'system' ? '跟随系统' : value === 'light' ? '浅色' : '深色'}</button>)}</div>;
}
