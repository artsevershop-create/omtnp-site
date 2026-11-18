// Главная: кинематографичный первый экран, фарватер, рейс, лента флота, карта.
import { $, $$, gsap, ScrollTrigger, reduced, clamp01, fmt, esc, splitLines } from '../lib/core.js';
import { initVoyage } from '../scenes/voyage.js';
import { initStrip } from '../lib/fleet-ui.js';
import { initHeroGL } from '../scenes/hero-gl.js';
import { initLogimap } from '../scenes/logimap.js';

export default function home() {
  initHero();
  initFairway();
  initVoyage($('[data-voyage]'));
  initStrip($('[data-strip]'));
  initLogimap($('[data-logi]'));
  $('[data-ticker]').forEach(initTicker);
}

/* ---------- Бегущая строка: базовый ход + ускорение и смена направления от прокрутки ---------- */
function initTicker(el) {
  if (!el || reduced) return;
  const track = $('[data-ticker-track]', el);
  track.innerHTML += track.innerHTML; // две копии — бесконечная лента
  let x = 0, dir = -1, boost = 0, visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(el);
  ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: (self) => {
    const v = self.getVelocity();
    if (Math.abs(v) > 20) dir = v > 0 ? -1 : 1;
    boost = Math.min(Math.abs(v) / 120, 14);
  } });
  gsap.ticker.add((_, dt) => {
    if (!visible) return;
    boost *= .94;
    x += dir * (0.6 + boost) * (dt / 16.7);
    const half = track.scrollWidth / 2;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  });
}

/* ---------- Первый экран: живой кадр с танкером, заголовки собираются по буквам ---------- */
function initHero() {
  const hero = $('[data-hero]');
  const film = $('[data-hero-media]');
  const inner = $('[data-hero-inner]');
  const mobile = matchMedia('(max-width: 899px)');
  const words = splitWords($('[data-hero-title]'));
  let p = 0;

  if (!reduced) {
    // Один оркестрованный вход: слова заголовка поднимаются из маски (видны с первого кадра), за ними лид и кнопки; кадр мягко наезжает
    gsap.timeline({ delay: .1 })
      .from(words, { yPercent: 45, duration: 1.2, stagger: .06, ease: 'expo.out' }, 0)
      .from($$('[data-hero-item]'), { y: 22, duration: 1.1, stagger: .1, ease: 'power3.out' }, .25)
      .from('.hero-poster', { scale: 1.12, duration: 2.6, ease: 'expo.out' }, 0)
      .from('.hero-route', { opacity: 0, duration: 1.2, ease: 'power2.out' }, .6);
  }

  // Прокрутка: кадр раздвигается до краёв экрана, камера в WebGL подлетает к танкеру.
  // Текст уходит вместе со страницей (лёгкий параллакс), а не исчезает.
  const frame = (e) => {
    const g = mobile.matches ? 16 : Math.min(48, Math.max(16, innerWidth * .04)); // = --gutter
    const rail = innerWidth >= 1100 ? 96 : 0; // = --rail (фарватер слева)
    const side = g * (1 - e), left = (g + rail) * (1 - e), rad = (mobile.matches ? 22 : 28) * (1 - e);
    film.style.clipPath = `inset(0 ${side}px 0 ${left}px round ${rad}px)`;
  };
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom top',
    onUpdate(self) {
      p = self.progress;
      if (reduced) return;
      frame(clamp01(p / .45));
      gsap.set(inner, { y: p * 60 });
    },
  });

  if (reduced) return;
  // Живой кадр на WebGL; без WebGL остаётся картинка с медленным наездом (CSS)
  const startGL = () => initHeroGL($('[data-hero-gl]'), $('[data-hero-img]'), () => p).then((ok) => {
    if (!ok) hero.classList.add('is-static');
  });
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
  const later = () => idle(startGL, { timeout: 2500 });
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}

/** Заголовок по словам: каждое слово в своей маске (механика SeraWordReveal из 21st.dev). */
function splitWords(el) {
  const label = el.textContent;
  el.innerHTML = label.split(' ').map((w) => `<span class="cw" aria-hidden="true"><span class="ch">${esc(w)}</span></span>`).join(' ');
  el.setAttribute('aria-label', label);
  return $$('.ch', el);
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
