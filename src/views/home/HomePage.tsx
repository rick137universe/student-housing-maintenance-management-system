'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowRight, LogOut, SunMoon } from 'lucide-react';
import { LensExperience } from '@/components/home/LensExperience';
import { LensBootIntro } from '@/components/home/LensBootIntro';
import { readAuthSession, saveAuthSession } from '@/utils/auth-session';
import { roleFeatures, type RoleFeature } from '@/data/role-features';
import {canonicalWorkspaceUrl} from '@/data/workspace-paths';
import type { DemoAccount } from '@/data/accounts';
import h from './HomePage.module.css';
import { useTheme } from '@/components/theme/ThemeProvider';

export function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<DemoAccount | null>(null);
  const [panelReady, setPanelReady] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [introRun] = useState(0);
  const [introProgress, setIntroProgress] = useState(1);
  const { mode: themeMode, resolved: resolvedTheme, setMode: changeTheme } = useTheme();
  const scrollTrack = useRef<HTMLElement>(null);
  const features = useMemo(() => session ? roleFeatures[session.role] : roleFeatures.student, [session]);
  // Each heading sits at the centre of its document section. Switch the lens when
  // the previous heading leaves the viewport and the next one becomes visible.
  const scrollSections = progress * features.length;
  const activeIndex = Math.min(features.length - 1, Math.max(0, Math.floor(scrollSections + .5)));
  const sectionStart = activeIndex === 0 ? 0 : activeIndex - .5;
  const sectionLength = activeIndex === 0 ? .5 : activeIndex === features.length - 1 ? 1.5 : 1;
  const localProgress = session ? Math.max(0, Math.min(1, (scrollSections - sectionStart) / sectionLength)) : 0;
  const active = features[activeIndex];
  const booting = Boolean(session) && introRun > 0 && introProgress < 1;
  const textReady = introRun === 0 || introProgress >= .96;
  const bootPhase = !booting ? 'full' : introProgress < (resolvedTheme === 'light' ? .48 : .51) ? 'dark' : introProgress < .7 ? 'reveal' : 'full';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSession(readAuthSession());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!session || introRun === 0) return;
    const started = performance.now();
    let frame = 0;
    const advance = (time: number) => {
      const next = Math.min(1, (time - started) / 4800);
      setIntroProgress(next);
      if (next < 1) frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [session, introRun]);

  useEffect(() => {
    if (!booting) return;
    // Keep the scrollbar gutter in place while preventing an early scroll.
    // Hiding overflow changes the viewport width and nudges both side panels.
    const blockWheel = (event: WheelEvent) => event.preventDefault();
    const blockTouch = (event: TouchEvent) => event.preventDefault();
    window.addEventListener('wheel', blockWheel, { passive: false });
    window.addEventListener('touchmove', blockTouch, { passive: false });
    return () => {
      window.removeEventListener('wheel', blockWheel);
      window.removeEventListener('touchmove', blockTouch);
    };
  }, [booting]);

  useEffect(() => {
    if (!session) return;
    let secondFrame = 0;
    let readyTimer = 0;
    const firstFrame = requestAnimationFrame(() => {
      setPanelReady(false);
      secondFrame = requestAnimationFrame(() => {
        const stored = window.sessionStorage.getItem('dorma-return-progress');
        if (stored !== null) {
          const target = Number(stored);
          const range = document.documentElement.scrollHeight - window.innerHeight;
          const value = Number.isFinite(target) ? Math.max(0, Math.min(1, target)) : 0;
          window.scrollTo({ top: value * range, behavior: 'instant' });
          setProgress(value);
          if (value > .005) setHasScrolled(true);
          window.sessionStorage.removeItem('dorma-return-progress');
        }
        // Mount the card once, only after restoration and the 440ms lens reveal.
        readyTimer = window.setTimeout(() => setPanelReady(true), 480);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(readyTimer);
    };
  }, [session]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.max(0, Math.min(1, window.scrollY / Math.max(1, range)));
      setProgress(next);
      if (session && next > .005) setHasScrolled(true);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [session]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          // Prepare the next downward reveal only after the copy is below the viewport.
          if (entry.target.hasAttribute('data-entered') && entry.boundingClientRect.top >= window.innerHeight) {
            entry.target.setAttribute('data-reveal-armed', 'true');
          }
          return;
        }
        entry.target.setAttribute('data-entered', 'true');
        entry.target.removeAttribute('data-reveal-armed');
      });
    }, { threshold: 0 });
    scrollTrack.current?.querySelectorAll('[data-scroll-copy]').forEach(copy => observer.observe(copy));
    return () => observer.disconnect();
  }, [session, features]);

  function openAction(actionId: string) {
    if (!session || transitioning) return;
    setTransitioning(true);
    window.sessionStorage.setItem('dorma-return-progress', String(progress));
    window.setTimeout(() => router.push(canonicalWorkspaceUrl('/workspace/' + session.role + '/' + active.id + '/' + actionId)), 840);
  }

  function logout() {
    saveAuthSession(null);
    setSession(null);
    setIntroProgress(1);
    setHasScrolled(false);
    setProgress(0);
    window.scrollTo({ top: 0 });
  }

  return <div className={h.page} data-authenticated={Boolean(session)} data-theme={resolvedTheme} data-booting={booting} data-text-ready={textReady}>
    <header className={h.header}>
      <button className={h.brand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>dorma<span>●</span><small>校园生活服务</small></button>
      {session && <nav className={h.chapterNames} aria-label="功能导航">
        {features.map((feature) => <Link key={feature.id}
          href={canonicalWorkspaceUrl('/workspace/' + session.role + '/' + feature.id + '/' + feature.actions[0].id)}
          onClick={() => window.sessionStorage.setItem('dorma-return-progress', String(progress))}>
          {feature.title}
        </Link>)}
      </nav>}
      <div className={h.identity}>
        <div className={h.themeSwitch} aria-label="主题选择"><SunMoon size={13} />{(['system', 'light', 'dark'] as const).map(item => <button key={item} data-active={themeMode === item} onClick={() => changeTheme(item)}>{item === 'system' ? '跟随系统' : item === 'light' ? '浅色' : '深色'}</button>)}</div>
        {session ? <><span>{session.displayName} / {session.roleName}</span><button onClick={logout}><LogOut size={14} />退出</button></> : <button onClick={() => router.push('/login')}>登录工作台 <ArrowRight size={14} /></button>}
      </div>
    </header>

    <main ref={scrollTrack} className={h.scrollTrack} aria-label="Dorma 角色功能镜头">
      {(session ? features : [features[0]]).map(feature => <section key={feature.id} aria-label={feature.title}>
        <div className={h.copy} data-scroll-copy="true">
          <h1>{session ? <AnimatedLabel text={feature.title} /> : <>一枚镜头，<br />看见你的日常。</>}</h1>
          <span>{session ? <AnimatedLabel text={feature.description} /> : '登录后，镜头只加载与你身份相关的业务。滚动、刻度与功能动画会沿同一条时间轴运行。'}</span>
          {!session && <button onClick={() => router.push('/login')}>选择身份并登录 <ArrowRight size={16} /></button>}
          {session && <span className={h.scrollHint}>滚动控制动画 <ArrowDown size={14} /></span>}
        </div>
      </section>)}
      {session && <div className={h.scrollTail} aria-hidden="true" />}
    </main>

    <div className={h.stickyStage} data-booting={booting} data-transitioning={transitioning} data-complete={Boolean(session) && activeIndex === features.length - 1 && localProgress >= .995}>
      <div className={h.lensWrap} data-boot-phase={bootPhase} data-boot-zoom={introRun > 0 && introProgress >= .7}>
        <LensExperience features={features} activeIndex={activeIndex} localProgress={localProgress} blurred={!session} transitioning={transitioning} theme={resolvedTheme} hasScrolled={hasScrolled} introProgress={introProgress} />
      </div>

      {session && introRun > 0 && introProgress < .7 && <LensBootIntro progress={introProgress} features={features} theme={resolvedTheme} />}

      {session && panelReady && textReady && <aside className={h.actionPanel}>
        {hasScrolled || activeIndex > 0 || introRun > 0 ? <FeatureCard key={active.id} feature={active} onAction={openAction} /> : <div className={h.cardSlot} aria-hidden="true" />}
        <div className={h.progressPanel}>
        <div className={h.microProgress}>
          <div className={h.progressScale} aria-hidden="true">
            {features.map(feature => <span key={feature.id}>{Array.from({ length: 11 }, (_, index) => <i key={index} />)}</span>)}
          </div>
          <input
            aria-label={'拖动全部功能进度，当前 ' + Math.round(progress * 100) + '%'}
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            disabled
          />
        </div>
        </div>
      </aside>}

    </div>

  </div>;
}

function FeatureCard({ feature, onAction }: { feature: RoleFeature; onAction: (id: string) => void }) {
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animation = card.current?.animate([
      { transform: 'translateY(120%)' },
      { transform: 'translateY(0)' },
    ], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
    return () => animation?.cancel();
  }, []);

  return <div className={h.cardSlot}><div ref={card} className={h.featureCard}>
    {feature.actions.map(action => <button key={action.id}
      onClick={() => onAction(action.id)}><ArrowRight size={14} /><AnimatedLabel text={action.label} /></button>)}
  </div></div>;
}


function AnimatedLabel({ text }: { text: string }) {
  return <span className={h.animatedLabel} aria-label={text}>{Array.from(text).map((letter, index) =>
    <span key={index} aria-hidden="true">{letter === ' ' ? '\u00a0' : letter}</span>)}</span>;
}
