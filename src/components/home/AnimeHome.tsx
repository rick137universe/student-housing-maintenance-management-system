"use client";


import { memo, useLayoutEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { roleFeatures } from "@/data/role-features";
import { api, readAuthSession, saveAuthSession } from "@/utils/auth-session";

const runtimeSrc =
  "/assets/js/home.js";

type AnimeHomeProps = {
  markup: string;
  active?: boolean;
};

// React must not replace DOM nodes owned by the original animation runtime.
const CapturedPage = memo(function CapturedPage({ markup }: AnimeHomeProps) {
  return <div data-anime-home><div className="page" dangerouslySetInnerHTML={{ __html: markup }} /></div>;
});

export function AnimeHome({ markup, active = true }: AnimeHomeProps) {
  const router = useRouter();
  const [accountError, setAccountError] = useState('');

  useLayoutEffect(() => {
    const host = window as typeof window & { dormaHomeActive?: boolean; dormaHomeRuntime?: { setActive(active: boolean): void } };
    host.dormaHomeActive = active;
    host.dormaHomeRuntime?.setActive(active);
    const root = document.documentElement;
    const previousScope = root.getAttribute('data-anime-home-active');
    const previousTemplate = document.body.dataset.template;
    const previousBackground = document.body.style.backgroundColor;

    // A stable page marker avoids :has() style recalculation during animation.
    if (active) {
      root.setAttribute('data-anime-home-active', '');
      document.body.dataset.template = 'home';
    } else return;

    // The source page defines this map in an inline head script. Its runtime
    // reads it when sponsor custom elements connect.
    Object.assign(window, {
      dormaHomeModules: {
        waapi: "信息汇集", timeline: "处理进展", stagger: "维修跟进", svg: "问题记录",
        spring: "生活服务", animation: "住宿服务", timer: "服务提醒", easings: "服务反馈",
        draggable: "服务反馈", scroll: "公寓通知", scope: "个人工作台",
      },
      paths: {
        demos: "https://animejs.com/documentation-demos",
        easings: "https://animejs.com/assets/json/easings.json",
        "github-sponsors": "/assets/github-sponsors.html",
        "platinum-sponsors": "/assets/platinum-sponsors.html",
        "gold-sponsors": "/assets/gold-sponsors.html",
        "silver-sponsors": "/assets/silver-sponsors.html",
      },
    });

    const syncEntryLabels = () => {
      const account = readAuthSession();
      const labelText = account ? "进入工作台" : "登录";
      document.querySelectorAll<HTMLElement>("[data-dorma-entry-label]")
        .forEach(label => { label.textContent = labelText; });
      const button = document.querySelector<HTMLButtonElement>('[data-dorma-account]');
      const name = button?.querySelector('[data-dorma-account-name]');
      const action = button?.querySelector('[data-dorma-account-action]');
      if (name) name.textContent = account?.displayName ?? '未登录';
      if (action) action.textContent = account ? '退出登录' : '前往登录';
      button?.setAttribute('aria-label', account ? `${account.displayName}，退出登录` : '前往登录');
    };
    window.addEventListener("dorma-auth-changed", syncEntryLabels);
    const frame = window.requestAnimationFrame(() => { syncEntryLabels(); window.dispatchEvent(new Event("resize")); });
    let logoutPending = false;
    const activateAccount = async () => {
      if (logoutPending) return;
      setAccountError('');
      if (!readAuthSession()) { router.push('/login'); return; }
      const button = document.querySelector<HTMLButtonElement>('[data-dorma-account]');
      logoutPending = true;
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      try {
        await api('auth/logout', { method: 'POST' });
        saveAuthSession(null);
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : '退出失败，请重试');
      } finally {
        logoutPending = false;
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
      }
    };
    const activateEntry = (event: Event) => {
      const accountButton = event.target instanceof Element ? event.target.closest('[data-dorma-account]') : null;
      if (accountButton) {
        // Native buttons already translate Enter and Space into click events.
        if (event instanceof KeyboardEvent) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        void activateAccount();
        return;
      }
      const entry = event.target instanceof Element ? event.target.closest("[data-dorma-entry]") : null;
      if (!entry) return;
      if (event instanceof KeyboardEvent && (entry.tagName !== "PRE" || !["Enter", " "].includes(event.key))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const account = readAuthSession();
      if (account) {
        const first = roleFeatures[account.role][0];
        router.push(`/workspace/${account.role}/${first.id}/${first.actions[0].id}`);
      } else router.push('/login');
    };
    // Capture also prevents the original install-command copy action.
    document.addEventListener("click", activateEntry, true);
    document.addEventListener("keydown", activateEntry, true);

    const form = document.querySelector<HTMLFormElement>("email-signup form");

    const showDemoFeedback = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const fields = form?.querySelector<HTMLElement>("#form-fields");
      const message = form?.querySelector<HTMLElement>("#success-message");
      const messageText = message?.querySelector("p");

      fields?.classList.remove("is-active");
      if (messageText) {
        messageText.textContent = "Demo only — no email was sent.";
      }
      message?.classList.add("is-active");
    };

    // Capture before the source custom element's submit handler can contact Buttondown.
    form?.addEventListener("submit", showDemoFeedback, true);

    // The version switcher uses option values rather than links.
    document
      .querySelectorAll<HTMLOptionElement>("#docs-versions option")
      .forEach((option) => {
        if (option.value.startsWith("/")) {
          option.value = `https://animejs.com${option.value}`;
        }
      });

    // Native module loading preserves the original relative chunk imports and asset URLs.
    // The layout effect marks the captured DOM before its first client paint.
    if (!document.querySelector('script[data-anime-runtime="home"]')) {
      const runtime = document.createElement("script");
      runtime.type = "module";
      runtime.src = runtimeSrc;
      runtime.dataset.animeRuntime = "home";
      document.body.appendChild(runtime);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("dorma-auth-changed", syncEntryLabels);
      document.removeEventListener("click", activateEntry, true);
      document.removeEventListener("keydown", activateEntry, true);
      form?.removeEventListener("submit", showDemoFeedback, true);
      document.body.style.backgroundColor = previousBackground;
      document.body.classList.remove("is-light");
      if (previousScope === null) root.removeAttribute('data-anime-home-active');
      else root.setAttribute('data-anime-home-active', previousScope);
      if (previousTemplate === undefined) delete document.body.dataset.template;
      else document.body.dataset.template = previousTemplate;
    };
  }, [active, router]);

  return <div hidden={!active} inert={!active}>
    <CapturedPage markup={markup} />
    {accountError && <p className="dorma-account-error" role="alert">{accountError}</p>}
  </div>;
}
