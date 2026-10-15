// Главная: кинематографичный первый экран, фарватер, рейс, лента флота, карта.
import { $, $$, gsap, ScrollTrigger, reduced, clamp01, splitChars, splitLines } from '../lib/core.js';
import { initVoyage } from '../scenes/voyage.js';
import { renderStrip } from '../lib/fleet-ui.js';

export default function home() {
  initHero();
  initFairway();
  initVoyage($('[data-voyage]'));
  renderStrip($('[data-strip]'));
  initMap($('.map'));
}

/* ---------- Первый экран: видео идёт за прокруткой, заголовки собираются по буквам ---------- */
function initHero() {
  const hero = $('[data-hero]');
  const stage = $('[data-hero-stage]');
  const video = $('[data-hero-video]');
  const states = $$('[data-state]');
  const meter = $('[data-hero-meter]');
  const chars = states.map((s) => splitChars($('.hero-title', s)));
  let p = 0, shown = 0;

  if (!reduced) {
    gsap.timeline({ delay: .7 })
      .from(chars[0], { yPercent: 110, duration: 1.2, stagger: .018, ease: 'expo.out' })
      .from([$('.hero-lead', states[0]), '.hero-meter'], { y: 24, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out' }, .5)
      .from('.hero-poster', { scale: 1.12, duration: 2.4, ease: 'expo.out' }, 0);
  }

  const show = (i) => {
    if (i === shown) return;
    const prev = states[shown], next = states[i];
    const back = i < shown;
    shown = i;
    states.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    if (reduced) { prev.classList.remove('is-on'); next.classList.add('is-on'); return; }
    gsap.killTweensOf([...chars[i], ...chars[states.indexOf(prev)], prev, next, ...next.children]);
    gsap.to(chars[states.indexOf(prev)], { yPercent: back ? 110 : -110, duration: .45, stagger: .006, ease: 'power3.in' });
    gsap.to([...prev.children].slice(1), { opacity: 0, y: -20, duration: .3, onComplete: () => prev.classList.remove('is-on') });
    next.classList.add('is-on');
    gsap.fromTo(chars[i], { yPercent: back ? -110 : 110 }, { yPercent: 0, duration: 1, stagger: .014, delay: .25, ease: 'expo.out' });
    gsap.fromTo([...next.children].slice(1), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .9, stagger: .08, delay: .5, ease: 'expo.out' });
  };

  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom',
    onUpdate(self) {
      p = self.progress;
      gsap.set(meter, { scaleX: p });
      show(p < .3 ? 0 : p < .6 ? 1 : 2);
      // Финал: кадр сжимается в «карточку» и уступает место следующему разделу
      if (!reduced) {
        const k = clamp01((p - .84) / .16);
        stage.style.clipPath = `inset(${k * 7}% ${k * 5}% ${k * 7}% ${k * 5}% round ${k * 32}px)`;
        gsap.set('.hero-copy, .hero-meter', { opacity: 1 - k * 1.4 });
      }
    },
  });

  if (reduced) return;
  // Танкер идёт сам: ролик играет по кругу. Два плеера по очереди — перед концом одного
  // второй стартует с начала и плавно проявляется, поэтому склейки не видно.
  const FADE = .8;
  const twin = video.cloneNode();
  twin.removeAttribute('data-hero-video');
  video.after(twin);
  const players = [video, twin];
  let active = 0;
  const handoff = () => {
    const cur = players[active], next = players[1 - active];
    next.currentTime = 0;
    next.play().catch(() => {});
    gsap.set(next, { zIndex: 1 });
    gsap.set(cur, { zIndex: 0 });
    gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: FADE, ease: 'none', onComplete: () => cur.pause() });
    active = 1 - active;
  };
  players.forEach((v) => {
    v.addEventListener('timeupdate', () => {
      if (v === players[active] && v.duration && v.currentTime > v.duration - FADE - .15 && !v.dataset.handed) {
        v.dataset.handed = '1';
        handoff();
        setTimeout(() => { delete v.dataset.handed; }, FADE * 1000 + 300);
      }
    });
  });
  const start = () => {
    const src = innerWidth < 760 ? video.dataset.srcSmall : video.dataset.src;
    players.forEach((v) => { v.src = src; v.preload = 'auto'; v.loop = false; v.style.transition = 'none'; });
    gsap.set(twin, { opacity: 0 });
    video.addEventListener('loadeddata', () => { video.classList.add('is-ready'); twin.classList.add('is-ready'); video.play().catch(() => {}); }, { once: true });
  };
  // Ролик грузим после остальной страницы; если страница уже загружена — сразу
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  // Экран ушёл из вида — ролик на паузе, чтобы не грузить телефон
  new IntersectionObserver(([e]) => {
    const v = players[active];
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }).observe(hero);
}

/* ---------- Фарватер слева ---------- */
function initFairway() {
  const fairway = $('[data-fairway]');
  const fill = $('[data-fairway-fill]');
  const buoys = $$('[data-buoy]', fairway);
  const darks = $$('.section-dark, .hero');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      gsap.set(fill, { scaleY: self.progress });
      const mid = innerHeight / 2;
      fairway.classList.toggle('on-dark', darks.some((s) => { const r = s.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }));
      let here = 0;
      buoys.forEach((b, i) => { const s = document.getElementById(b.dataset.buoy); if (s && s.getBoundingClientRect().top < mid) here = i; });
      buoys.forEach((b, i) => { b.classList.toggle('is-passed', i <= here); b.classList.toggle('is-here', i === here); });
    },
  });
}

/* ---------- Карта: маршрут прочерчивается ---------- */
export function initMap(map) {
  if (!map || reduced) return;
  $$('[data-route]', map).forEach((path) => {
    const len = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: map, start: 'top 75%', end: 'bottom 60%', scrub: 1 } });
  });
  gsap.from($$('.map-pts > *', map), { opacity: 0, scale: .6, transformOrigin: 'center', duration: .6, stagger: .06, ease: 'back.out(2)', scrollTrigger: { trigger: map, start: 'top 70%' } });
}

export { splitLines };
