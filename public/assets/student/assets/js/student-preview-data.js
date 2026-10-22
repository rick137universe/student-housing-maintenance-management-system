// Live values belong to the active native demo scope, never to a global account cache.
export function liveData(ctx, url, event, render, unavailable) {
  let alive = true, controller;
  const load = async () => {
    controller?.abort();
    const request = controller = new AbortController();
    try {
      const response = await fetch('/api/v1/' + url, {credentials: 'same-origin', cache: 'no-store', signal: request.signal});
      if (!response.ok) throw new Error('预览数据暂时无法加载，请刷新重试。');
      const result = await response.json();
      if (alive && controller === request) ctx.execute(() => render(result.data, result.meta));
    } catch (error) {
      if (alive && controller === request && error.name !== 'AbortError') unavailable();
    }
  };
  document.addEventListener(event, load);
  void load();
  return () => { alive = false; controller?.abort(); document.removeEventListener(event, load); };
}

export const studentPreviews = {
  installation(ctx, api, kind) {
    const {animate, waapi, createScope, utils, splitText, stagger, steps, irregular} = api;
    const [code] = utils.$('code'), [caret] = utils.$('.caret');
    let typing;
    const render = value => {
      typing?.revert();
      code.textContent = value;
      code.removeAttribute('title');
      typing = createScope({root: code.parentElement}).add(() => {
        const split = splitText(code, {chars: true});
        const blinking = waapi.animate(caret, {opacity: [1, 0], loop: true, alternate: true, ease: 'in(2)', duration: 600, autoplay: false});
        const chars = animate(split.chars, {opacity: [0, 1], duration: 0, delay: stagger(60), autoplay: false});
        const cursor = animate(caret, {x: ['1ch', split.chars.length], ease: steps(Math.max(1, split.chars.length - 1)), duration: chars.duration, autoplay: false});
        animate([chars, cursor], {progress: 1, duration: split.chars.length * 125, ease: irregular(Math.max(1, split.chars.length - 1), 1.2), onComplete: () => blinking.play()});
        code.style.opacity = 1;
      });
    };
    if (kind === 'password') { render('password'); return () => typing?.revert(); }
    const stop = liveData(ctx, 'profile', 'dorma-profile-saved', profile => render(String(profile[kind] || (kind === 'phone' ? '未填写' : '—'))), () => {
      typing?.revert(); code.textContent = '—'; code.style.opacity = 1;
      code.title = '预览数据暂时无法加载，请刷新重试。';
    });
    return () => { stop(); typing?.revert(); };
  },

  finance(ctx, {animate, createTimer, utils}, kind) {
    const values = utils.$('.value');
    let animations = [];
    const clear = () => { animations.forEach(animation => animation.revert()); animations = []; };
    const unread = kind === 'unread';
    const stop = liveData(ctx, unread ? 'notifications?unread=true&limit=1' : 'statistics/student-finance', unread ? 'dorma-notifications-saved' : 'dorma-finance-saved', (data, meta) => {
      clear();
      const targets = unread ? [meta?.total ?? data.length] : kind === 'unpaid' ? [data.unpaidCount] : kind === 'latest' ? [data.latestUtility, data.latestAccommodation] : [data.paidUtility, data.paidAccommodation];
      values.forEach((element, index) => {
        element.removeAttribute('title');
        const count = kind === 'unpaid' || unread, target = Math.round(Number(targets[index]) * (count ? 1 : 100));
        const format = value => count ? String(Math.round(value)) : (Math.round(value) / 100).toFixed(2);
        // Keep the native LCD boxes; scale only long numbers that would overflow.
        element.style.removeProperty('font-size');
        element.textContent = format(target);
        const font = parseFloat(getComputedStyle(element).fontSize), width = element.clientWidth;
        if (element.scrollWidth > width && width > 0) element.style.fontSize = (font * width / element.scrollWidth) + 'px';
        element.textContent = format(0);
        if (!target) return;
        if (count) {
          animations.push(createTimer({duration: 2000,
            onUpdate: self => { element.textContent = format(target * Math.min(1, Math.max(0, self.currentTime / 2000))); },
            onComplete: () => { element.textContent = format(target); }}));
        } else {
          const state = {value: 0};
          animations.push(animate(state, {value: target, duration: 1600, ease: 'out(3)',
            onUpdate: () => { element.textContent = format(state.value); },
            onComplete: () => { element.textContent = format(target); }}));
        }
      });
    }, () => {
      clear(); values.forEach(element => { element.textContent = '—'; element.title = '预览数据暂时无法加载，请刷新重试。'; });
    });
    return () => { stop(); clear(); };
  },
};
