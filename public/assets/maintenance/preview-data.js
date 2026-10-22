import {liveData} from '/assets/student/assets/js/student-preview-data.js';

export const maintenancePreviews = {
  statistics(ctx, {createTimer, utils}, kind) {
    const values = utils.$('.value');
    const refreshEvent = 'dorma-maintenance-statistics-refresh';
    let timer;
    const clear = () => { timer?.revert(); timer = undefined; };
    const stop = liveData(ctx, 'statistics', refreshEvent, data => {
      const stats = data.repairs;
      const number = key => {
        const value = Number(stats?.[key]);
        if (!Number.isFinite(value) || value < 0) throw new Error('Invalid statistics');
        return value;
      };
      const total = number('total_repairs'), completed = number('completed_repairs');
      const targets = kind === 'workload' ? [total, completed]
        : kind === 'completion' ? [total ? 100 * completed / total : 0]
        : [number('average_rating'), number('rating_count')];
      const format = (value, index) => kind === 'completion' ? value.toFixed(2) + '%'
        : kind === 'ratings' && index === 0 ? value.toFixed(2) : String(Math.round(value));
      clear();
      values.forEach((element, index) => {
        element.removeAttribute('title');
        // Preserve the mother LCD boxes; fit long numbers inside their existing width.
        element.style.removeProperty('font-size');
        element.textContent = format(targets[index], index);
        const font = parseFloat(getComputedStyle(element).fontSize), width = element.clientWidth;
        if (element.scrollWidth > width && width > 0) element.style.fontSize = (font * width / element.scrollWidth) + 'px';
        element.textContent = format(0, index);
      });
      const render = progress => values.forEach((element, index) => { element.textContent = format(targets[index] * progress, index); });
      if (targets.some(value => value > 0)) timer = createTimer({duration: 2000,
        onUpdate: self => render(Math.min(1, Math.max(0, self.currentTime / 2000))),
        onComplete: () => render(1)});
    }, () => {
      clear();
      values.forEach(element => { element.textContent = '—'; element.title = '统计暂时无法加载，请重新播放或刷新重试。'; });
    });
    const refresh = () => document.dispatchEvent(new Event(refreshEvent));
    window.addEventListener('focus', refresh);
    return () => { stop(); clear(); window.removeEventListener('focus', refresh); };
  },
};
