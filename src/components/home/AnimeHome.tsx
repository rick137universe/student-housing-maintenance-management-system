"use client";

import { useLayoutEffect } from "react";

const runtimeSrc =
  "/assets/js/home.js";

type AnimeHomeProps = {
  markup: string;
};

export function AnimeHome({ markup }: AnimeHomeProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousScope = root.getAttribute('data-anime-home-active');
    const previousTemplate = document.body.dataset.template;

    // A stable page marker avoids :has() style recalculation during animation.
    root.setAttribute('data-anime-home-active', '');
    document.body.dataset.template = 'home';

    // The source page defines this map in an inline head script. Its runtime
    // reads it when sponsor custom elements connect.
    Object.assign(window, {
      paths: {
        demos: "https://animejs.com/documentation-demos",
        easings: "https://animejs.com/assets/json/easings.json",
        "github-sponsors": "/assets/github-sponsors.html",
        "platinum-sponsors": "/assets/platinum-sponsors.html",
        "gold-sponsors": "/assets/gold-sponsors.html",
        "silver-sponsors": "/assets/silver-sponsors.html",
      },
    });

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
      form?.removeEventListener("submit", showDemoFeedback, true);
      if (previousScope === null) root.removeAttribute('data-anime-home-active');
      else root.setAttribute('data-anime-home-active', previousScope);
      if (previousTemplate === undefined) delete document.body.dataset.template;
      else document.body.dataset.template = previousTemplate;
    };
  }, []);

  return <div data-anime-home><div className="page" dangerouslySetInnerHTML={{ __html: markup }} /></div>;
}
