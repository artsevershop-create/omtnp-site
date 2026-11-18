// Карта логистики: карта закреплена, этапы справа прокручиваются (механика sticky-media-scroll из 21st.dev).
// Активный этап подсвечивает регионы, прочерчивает участки маршрута и пускает по ним составы.
// Вода: течение по руслам и рябь в губах и море — CSS-анимации, на паузе вне экрана.
import { $, $$, gsap, ScrollTrigger, reduced } from '../lib/core.js';

const CONVOY = `<g class="convoy"><path class="convoy-wake" d="M-34 0h-26"/><path class="convoy-barge" d="M-30 -4h22l4 4-4 4h-22z"/><path class="convoy-tug" d="M-4 -3.5h9l3 3.5-3 3.5h-9z"/></g>`;

export function initLogimap(section) {
  if (!section) return;
  const svg = $('[data-logimap]', section);
  const steps = $$('.logi-step', section);
  const routes = Object.fromEntries($$('[data-route]', svg).map((p) => [p.dataset.route, p]));
  const lengths = Object.fromEntries(Object.entries(routes).map(([k, p]) => [k, p.getTotalLength()]));
  const layer = $('[data-convoys]', svg);

  // Вода живёт только когда карта на экране
  new IntersectionObserver(([e]) => svg.classList.toggle('is-live', e.isIntersecting && !reduced), { rootMargin: '100px' }).observe(svg);

  Object.entries(routes).forEach(([k, p]) => gsap.set(p, { strokeDasharray: lengths[k], strokeDashoffset: lengths[k] }));

  let convoyTweens = [];
  const launch = (names) => {
    convoyTweens.forEach((t) => t.kill());
    convoyTweens = [];
    layer.innerHTML = '';
    if (reduced) return;
    names.filter((n) => routes[n]).forEach((name, i) => {
      const path = routes[name], len = lengths[name];
      // Два состава на участке, со сдвигом — чтобы река не была пустой
      [0, .5].forEach((offset) => {
        layer.insertAdjacentHTML('beforeend', CONVOY);
        const g = layer.lastElementChild;
        const st = { t: offset };
        convoyTweens.push(gsap.to(st, {
          t: offset + 1, duration: Math.max(9, len / 34), ease: 'none', repeat: -1, delay: i * .6,
          onUpdate: () => {
            const d = (st.t % 1) * len;
            const a = path.getPointAtLength(d), b = path.getPointAtLength(Math.min(len, d + 2));
            const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            g.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
            g.style.opacity = Math.min(1, (st.t % 1) * 8, (1 - (st.t % 1)) * 8);
          },
        }));
      });
    });
  };

  let current = -1;
  const activate = (i) => {
    if (i === current) return;
    current = i;
    const step = steps[i];
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    const regions = step.dataset.regions.split(' ').filter(Boolean);
    const on = step.dataset.routes.split(' ').filter(Boolean);
    $$('.reg', svg).forEach((r) => r.classList.toggle('is-on', regions.includes(r.dataset.region)));
    $$('[data-label]', svg).forEach((l) => l.classList.toggle('is-on', regions.includes(l.dataset.label)));
    Object.entries(routes).forEach(([k, p]) => {
      gsap.to(p, { strokeDashoffset: on.includes(k) ? 0 : lengths[k], duration: reduced ? 0 : on.includes(k) ? 1.6 : .6, ease: 'power2.inOut', overwrite: true });
    });
    svg.classList.toggle('is-home', i === 0);
    launch(step.dataset.convoy.split(' ').filter(Boolean));
  };

  steps.forEach((step, i) => {
    const line = matchMedia('(max-width: 959px)').matches ? '72%' : '60%';
    ScrollTrigger.create({ trigger: step, start: `top ${line}`, end: `bottom ${line}`, onToggle: (self) => { if (self.isActive) activate(i); } });
  });
  activate(0);
}
