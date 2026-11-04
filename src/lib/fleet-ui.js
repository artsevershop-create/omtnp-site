// Флот: поведение и анимация блоков. Сама разметка приходит из HTML (см. templates.js).
import { $, $$, gsap, ScrollTrigger, reduced, fmt } from './core.js';

export function animateBars(host) {
  if (reduced) return;
  $$('.bar', host).forEach((bar, i) => {
    const val = $('.bar-val', bar);
    const n = { v: 0 };
    gsap.timeline({ scrollTrigger: { trigger: bar, start: 'top 92%' } })
      .from($('.bar-fill', bar), { scaleX: 0, duration: 1.3, ease: 'expo.out', delay: i * .05 })
      .to(n, { v: +val.dataset.num, duration: 1.3, ease: 'expo.out', onUpdate: () => { val.textContent = fmt.format(Math.round(n.v)); }, onComplete: () => { val.textContent = fmt.format(+val.dataset.num); } }, '<')
      .from(val, { opacity: 0, duration: .4 }, '<');
  });
}

/** Фильтр таблицы по группе судов; возвращает функцию выбора группы. */
export function initTable(chipsHost, body) {
  // Вся строка — ссылка на страницу судна
  body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (tr && !e.target.closest('a')) $('a', tr).click();
  });
  const apply = (g) => {
    $$('.chip', chipsHost).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.group === g)));
    const rows = $$('tr', body);
    rows.forEach((r) => { r.hidden = g !== 'all' && r.dataset.group !== g; });
    if (!reduced) gsap.fromTo(rows.filter((r) => !r.hidden), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: .4, stagger: .025, ease: 'power2.out' });
    ScrollTrigger.refresh();
  };
  chipsHost.addEventListener('click', (e) => { const c = e.target.closest('[data-group]'); if (c) apply(c.dataset.group); });
  return apply;
}

export function animateScale(host) {
  if (!reduced) gsap.from($$('.hull-shape', host), { scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'expo.out', stagger: .03, scrollTrigger: { trigger: host, start: 'top 85%' } });
}

export function initTypes(host, onPick) {
  host.addEventListener('click', (e) => { const a = e.target.closest('[data-pick]'); if (a) onPick(a.dataset.pick); });
}

/** Лента всех судов в одном масштабе: на компьютере едет вбок при прокрутке, на телефоне листается пальцем. */
export function initStrip(section) {
  const track = $('[data-strip-track]', section);
  const meter = $('[data-strip-meter]', section);
  if (reduced || !matchMedia('(min-width: 900px)').matches) return;
  const distance = () => track.scrollWidth - innerWidth + 64;
  gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: {
      trigger: section, start: 'top top', end: () => '+=' + distance(), pin: '.strip-pin', scrub: 1, invalidateOnRefresh: true,
      onUpdate: (s) => gsap.set(meter, { scaleX: s.progress }),
    },
  });
  gsap.from($$('.strip-shape', track), { y: 30, opacity: 0, duration: 1, stagger: .04, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 70%' } });
}
