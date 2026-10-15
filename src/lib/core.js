// Общее для всех страниц: логотип, плавная прокрутка, шапка, меню, переходы между страницами,
// курсор, «магнитные» кнопки, появление текста, счётчики, заявка, реквизиты.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import logoSvg from '../brand/logo.svg?raw';
import { CONTACTS, REQUISITES, ROLES } from '../data.js';

gsap.registerPlugin(ScrollTrigger);

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const clamp01 = (n) => Math.min(1, Math.max(0, n));
export { gsap, ScrollTrigger };

export let lenis = null;

/* ---------- Логотип ---------- */
export function injectLogos() {
  $$('[data-logo-slot]').forEach((slot) => { slot.innerHTML = logoSvg; });
}

/** Сборка логотипа: диск поднимается, как солнце из-за горизонта, вышка вырастает, судно входит слева. */
export function logoIntro(root, opts = {}) {
  const disc = $('.logo-disc', root), tower = $('.logo-tower', root), ship = $('.logo-ship', root);
  if (!disc || reduced) return gsap.timeline();
  return gsap.timeline(opts)
    .from(disc, { scale: 0, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out' })
    .from(tower, { scaleY: 0, transformOrigin: '50% 100%', duration: .9, ease: 'power3.out' }, '-=.75')
    .from(ship, { xPercent: -18, opacity: 0, duration: 1, ease: 'power3.out' }, '-=.7');
}

/* ---------- Разбивка текста ---------- */
/** На строки: каждая строка в маске, внутренний span поднимается. Неразрывные пробелы остаются внутри слов. */
export function splitLines(el) {
  const label = el.textContent;
  el.innerHTML = label.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  const lines = [];
  let lastTop = null;
  $$('.w', el).forEach((w) => {
    if (lastTop === null || Math.abs(w.offsetTop - lastTop) > 4) { lines.push([]); lastTop = w.offsetTop; }
    lines[lines.length - 1].push(w.textContent);
  });
  el.innerHTML = lines.map((l) => `<span class="line"><span>${esc(l.join(' '))}</span></span>`).join('');
  el.setAttribute('aria-label', label);
  return $$('.line > span', el);
}

/** На буквы: слово — маска, буквы поднимаются по очереди. */
export function splitChars(el) {
  const label = el.textContent;
  el.innerHTML = label.split(' ').map((w) => `<span class="cw" aria-hidden="true">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ');
  el.setAttribute('aria-label', label);
  return $$('.ch', el);
}

/* ---------- Плавная прокрутка ---------- */
function initLenis() {
  if (reduced) return;
  lenis = new Lenis({ lerp: .1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
  else target.scrollIntoView();
}

/* ---------- Шапка ---------- */
function initHeader() {
  const top = $('[data-top]');
  const darks = () => $$('.section-dark, .hero, .careers-hero');
  const update = () => {
    const hero = $('[data-hero]');
    top.classList.toggle('is-solid', scrollY > (hero ? hero.offsetHeight - 80 : 40));
    top.classList.toggle('on-dark', darks().some((s) => { const r = s.getBoundingClientRect(); return r.top < 40 && r.bottom > 40; }));
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: update });
  update();
}

/* ---------- Меню ---------- */
function initMenu() {
  const burger = $('[data-burger]'), drawer = $('[data-drawer]');
  const set = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    drawer.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (open) {
      lenis?.stop();
      if (!reduced) gsap.from($$('nav a', drawer), { y: 40, opacity: 0, stagger: .05, duration: .6, ease: 'expo.out' });
    } else lenis?.start();
  };
  burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { set(false); burger.focus(); } });
  return set;
}

/* ---------- Переходы между страницами: шторка с логотипом ---------- */
function initTransitions(closeMenu) {
  const curtain = $('[data-curtain]');
  const reveal = () => {
    if (reduced) { curtain.classList.add('is-off'); return; }
    gsap.timeline()
      .to('.curtain-logo', { opacity: 0, y: -20, duration: .35, ease: 'power2.in' })
      .to(curtain, { yPercent: -100, duration: .9, ease: 'expo.inOut', onComplete: () => curtain.classList.add('is-off') }, '-=.1');
  };
  reveal();
  addEventListener('pageshow', (e) => { if (e.persisted) { gsap.set(curtain, { yPercent: -100 }); curtain.classList.add('is-off'); } });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^(mailto|tel):/.test(a.href)) return;

    // Якорь на этой же странице — плавно прокручиваем
    if (url.pathname === location.pathname && url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) { e.preventDefault(); closeMenu(false); scrollToTarget(target); history.replaceState(null, '', url.hash); }
      return;
    }
    if (url.pathname === location.pathname && !url.hash) { e.preventDefault(); closeMenu(false); lenis ? lenis.scrollTo(0) : scrollTo(0, 0); return; }

    if (reduced) return;
    e.preventDefault();
    curtain.classList.remove('is-off');
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: .7, ease: 'expo.inOut' })
      .fromTo('.curtain-logo', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .3 }, '-=.25');
  });
}

/* ---------- Курсор и магнитные кнопки ---------- */
function initCursor() {
  const cursor = $('[data-cursor]');
  if (!finePointer || reduced) { cursor.remove(); return; }
  const label = $('[data-cursor-label]');
  const x = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3' });
  const y = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3' });
  addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); cursor.classList.add('is-on'); });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, [data-cursor], input, textarea, summary, .chip');
    const text = t?.closest('[data-cursor]')?.dataset.cursor || '';
    cursor.classList.toggle('is-link', !!t && !t.matches('input, textarea'));
    cursor.classList.toggle('is-text', !!t && t.matches('input, textarea'));
    cursor.classList.toggle('has-label', !!text);
    label.textContent = text;
  });
}

function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * .3);
      yTo((e.clientY - r.top - r.height / 2) * .4);
    });
    el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }); });
  });
}

/* ---------- Появление при прокрутке ---------- */
function initReveals() {
  if (reduced) return;
  $$('[data-split]').forEach((el) => {
    const lines = splitLines(el);
    gsap.from(lines, { yPercent: 110, rotate: 2, duration: 1.15, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('.section-lead, .page-lead').forEach((el) => {
    gsap.from(el, { y: 28, opacity: 0, duration: 1, delay: .15, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const year = end > 1900 && end < 2100;
    const n = { v: year ? end - 18 : 0 };
    gsap.to(n, {
      v: end, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' },
      onUpdate: () => { el.textContent = year ? Math.round(n.v) : fmt.format(Math.round(n.v)); },
    });
  });
  $$('[data-parallax]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -10 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const word = $('[data-foot-word]');
  if (word) gsap.fromTo(word, { xPercent: 10 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.company-logo').forEach((el) => logoIntro(el, { scrollTrigger: { trigger: el, start: 'top 85%' } }));
  const foot = $('.foot-logo');
  if (foot) logoIntro(foot, { scrollTrigger: { trigger: foot, start: 'top 95%' } });
}

/* ---------- Вода в блоке «Обсудим перевозку»: бегущие изолинии ---------- */
function initWater() {
  const canvas = $('[data-water]');
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0, running = false;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const LINES = 22;
  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < LINES; i++) {
      const k = i / (LINES - 1);
      const base = h * (.18 + k * .9);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const y = base + Math.sin(x * .006 + t * .0006 + i * .7) * (10 + k * 18) + Math.sin(x * .0021 - t * .0004 + i) * 14;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(159, 176, 198, ${.05 + k * .14})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    raf = requestAnimationFrame(draw);
  };
  resize();
  addEventListener('resize', resize);
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(draw); }
    if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }).observe(canvas);
}

/* ---------- Данные в общих блоках ---------- */
const toastEl = () => $('[data-toast]');
let toastTimer;
export function toast(text) {
  const el = toastEl();
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

function initData() {
  const tel = (p) => 'tel:' + p.replace(/[^\d+]/g, '');
  $$('[data-contacts]').forEach((ul) => {
    ul.innerHTML = CONTACTS.map((c) => `
      <li data-reveal><span class="ph-title">${c.title}</span>
        ${c.phones.map((p) => `<a href="${tel(p)}">${p}</a>`).join('')}
        ${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : ''}
        ${c.note ? `<span class="ph-note">${c.note}</span>` : ''}
      </li>`).join('');
  });
  $$('[data-requisites]').forEach((dl) => { dl.innerHTML = REQUISITES.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join(''); });
  $$('[data-roles]').forEach((ul) => { ul.innerHTML = ROLES.map((r, i) => `<li data-reveal><span class="role-n">${String(i + 1).padStart(2, '0')}</span>${esc(r)}</li>`).join(''); });
  $$('[data-copy-req]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(REQUISITES.map(([k, v]) => `${k}: ${v}`).join('\n')); toast('Реквизиты скопированы'); }
    catch { toast('Не удалось скопировать — выделите реквизиты вручную'); }
  }));
}

function initRequest() {
  const form = $('[data-request]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const err = $('[data-form-error]');
    const missing = ['name', 'contact'].filter((k) => !String(d[k] || '').trim());
    $$('input', form).forEach((i) => i.removeAttribute('aria-invalid'));
    if (missing.length) {
      missing.forEach((k) => form.elements[k].setAttribute('aria-invalid', 'true'));
      err.textContent = 'Укажите компанию и телефон или e-mail — без них мы не сможем ответить.';
      err.hidden = false;
      form.elements[missing[0]].focus();
      return;
    }
    err.hidden = true;
    const lines = [
      `Груз: ${d.cargo}`, d.from && `Откуда: ${d.from}`, d.to && `Куда: ${d.to}`, d.volume && `Объём: ${d.volume} т`,
      d.dates && `Сроки: ${d.dates}`, `Компания и контактное лицо: ${d.name}`, `Связь: ${d.contact}`, d.note && `\n${d.note}`,
    ].filter(Boolean);
    const subject = `Заявка на перевозку: ${d.cargo}${d.to ? ' → ' + d.to : ''}`;
    location.href = `mailto:omtnp@omtnp.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    toast('Письмо с заявкой открыто в почтовой программе');
  });
}

/* ---------- Запуск ---------- */
export function initCore() {
  injectLogos();
  initData();
  initLenis();
  initHeader();
  const closeMenu = initMenu();
  initTransitions(closeMenu);
  initCursor();
  initMagnetic();
  initRequest();
  initWater();
  // Переход по ссылке с якорем с другой страницы
  if (location.hash) {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) setTimeout(() => scrollToTarget(t), 500);
  }
}

/** Вызывается после шрифтов и разметки страницы — тогда строки разбиваются правильно. */
export function initMotion() {
  initReveals();
  if (!reduced) {
    const brand = $('.brand-mark');
    gsap.timeline({ delay: .5 })
      .add(logoIntro(brand), 0)
      .from('.brand-name, .nav a, .top-cta, .top-phone, .burger', { y: -16, opacity: 0, duration: .8, stagger: .04, ease: 'expo.out' }, .15);
  }
}
