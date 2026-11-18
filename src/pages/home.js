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
  initTicker($('[data-ticker]'));
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
  const stage = $('[data-hero-stage]');
  const inner = $('[data-hero-inner]');
  const media = $('[data-hero-media]');
  const mobile = matchMedia('(max-width: 899px)');
  const lerp = (a, b, t) => a + (b - a) * t;
  let pan = [0, 0];
  // Карточка с кадром: на компьютере — правая половина, на телефоне — низ экрана; e — насколько раскрыта (0…1)
  // На телефоне карточка начинается сразу под текстом: меряем, где кончаются кнопки (не выше 40 % экрана)
  let textBottom = 0;
  const measure = () => {
    const main = $('.hero-main', inner);
    textBottom = main.offsetTop + main.offsetHeight + 18;
  };
  const frame = (e) => {
    const W = stage.clientWidth, H = stage.clientHeight;
    const [t0, r0, b0, l0, rad0] = mobile.matches ? [Math.max(H * .4, textBottom), 16, 16, 16, 22] : [92, 24, 24, W * .5, 28];
    const [t, r, b, l, rad] = [lerp(t0, 0, e), lerp(r0, 0, e), lerp(b0, 0, e), lerp(l0, 0, e), lerp(rad0, 0, e)];
    media.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;
    // Центр видимой карточки — туда же сдвигаем центр кадра в WebGL, чтобы танкер был в карточке, а не за её краем
    pan = [((l + (W - r)) / 2) / W - .5, ((t + (H - b)) / 2) / H - .5];
  };
  measure();
  frame(0);
  addEventListener('resize', () => { measure(); frame(clamp01(p / .65)); });
  document.fonts.ready.then(() => { measure(); frame(clamp01(p / .65)); });
  const words = splitWords($('[data-hero-title]'));
  let p = 0;

  if (!reduced) {
    // Один оркестрованный вход: слова заголовка поднимаются из маски (видны с первого кадра), за ними лид, кнопки, цифры
    gsap.timeline({ delay: .1 })
      .from('.hero-poster', { scale: 1.1, duration: 2.4, ease: 'expo.out' }, 0)
      .from(words, { yPercent: 45, duration: 1.2, stagger: .06, ease: 'expo.out' }, 0)
      .from($$('[data-hero-item]'), { y: 22, duration: 1.1, stagger: .08, ease: 'power3.out' }, .25);
    $$('[data-hero-count]').forEach((el) => {
      const end = +el.dataset.heroCount;
      const year = end > 1900 && end < 2100;
      const n = { v: year ? end - 18 : 0 };
      gsap.to(n, { v: end, duration: 1.8, delay: .6, ease: 'expo.out', onUpdate: () => { el.textContent = year ? Math.round(n.v) : fmt.format(Math.round(n.v)); } });
    });
  }

  // Прокрутка раскрывает карточку с кадром на весь экран; назад — возвращает. Камера тем временем подлетает к танкеру.
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom',
    onUpdate(self) {
      p = self.progress;
      if (reduced) return;
      const e = clamp01(p / .65);
      frame(e);
      // Текст уходит раньше, чем карточка дорастёт до него, — они никогда не перекрываются
      gsap.set(inner, mobile.matches ? { y: -e * 70, opacity: 1 - clamp01(e / .45) } : { x: -e * 90, opacity: 1 - clamp01(e / .5) });
    },
  });

  if (reduced) return;
  // Живой кадр на WebGL; без WebGL остаётся картинка с медленным наездом (CSS)
  const startGL = () => initHeroGL($('[data-hero-gl]'), $('[data-hero-img]'), () => p, () => pan).then((ok) => {
    if (!ok) stage.classList.add('is-static');
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
