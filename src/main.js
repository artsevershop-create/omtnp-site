import './styles.css';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import logoSvg from './brand/logo.svg?raw';
import { FLEET, TYPES, GROUPS, CONTACTS, REQUISITES, ROLES, OFFICIAL } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- Логотип ---------- */
$$('[data-logo-slot]').forEach((slot) => { slot.innerHTML = logoSvg; });

/** Сборка логотипа: диск поднимается, как солнце из-за горизонта, вышка вырастает, судно входит слева. */
function logoIntro(root, opts = {}) {
  const disc = $('.logo-disc', root), tower = $('.logo-tower', root), ship = $('.logo-ship', root);
  if (!disc || reduced) return gsap.timeline();
  const tl = gsap.timeline(opts);
  tl.from(disc, { scale: 0, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out' })
    .from(tower, { scaleY: 0, transformOrigin: '50% 100%', duration: .9, ease: 'power3.out' }, '-=.75')
    .from(ship, { xPercent: -18, opacity: 0, duration: 1, ease: 'power3.out' }, '-=.7');
  return tl;
}

/* ---------- Данные ---------- */
const tankers = FLEET.filter((v) => v.type === 'bargeTanker' && v.cargo).sort((a, b) => b.cargo - a.cargo);
const maxCargo = tankers[0].cargo;
$('[data-bars]').innerHTML = tankers.map((v) => {
  const w = (v.cargo / maxCargo) * 82;
  return `<li class="bar" style="--w:${w.toFixed(2)}%"><span class="bar-name">${esc(v.project)}</span><span class="bar-track"><span class="bar-fill"></span><span class="bar-val" data-num="${v.cargo}">${fmt.format(v.cargo)}</span></span></li>`;
}).join('');

const groupOf = (v) => TYPES[v.type].group;
const counts = Object.fromEntries(GROUPS.map((g) => [g.id, g.id === 'all' ? FLEET.length : FLEET.filter((v) => groupOf(v) === g.id).length]));
$('[data-chips]').innerHTML = GROUPS.map((g, i) => `<button class="chip" type="button" data-group="${g.id}" aria-pressed="${i === 0}">${g.label}<small>${counts[g.id]}</small></button>`).join('');

const cell = (v) => v.cargo
  ? `<b>${fmt.format(v.cargo)}</b>${v.cargoNote ? ` <span class="muted">(${esc(v.cargoNote)})</span>` : ''}`
  : `<span class="muted">${esc(v.power)} л. с.</span>`;
$('[data-fleet]').innerHTML = FLEET.map((v) => `
  <tr data-group="${groupOf(v)}">
    <th scope="row"><a href="${OFFICIAL}${encodeURI(v.path)}" target="_blank" rel="noopener">${esc(v.project)}</a></th>
    <td><span class="type-dot ${groupOf(v)}"></span>${TYPES[v.type].label}</td>
    <td class="num">${cell(v)}</td>
    <td class="num">${fmt.format(v.length)} × ${fmt.format(v.width)}</td>
    <td class="num">${v.draft}</td>
    <td>${esc(v.cls)}</td>
  </tr>`).join('');

$('[data-chips]').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-group]');
  if (!chip) return;
  $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  const g = chip.dataset.group;
  const rows = $$('[data-fleet] tr');
  rows.forEach((r) => { r.hidden = g !== 'all' && r.dataset.group !== g; });
  if (!reduced) gsap.fromTo(rows.filter((r) => !r.hidden), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, stagger: .025, ease: 'power2.out' });
  ScrollTrigger.refresh();
});

// Длина судов в одном масштабе: силуэт корпуса, у буксиров — с рубкой
const byLength = [...FLEET].sort((a, b) => b.length - a.length);
const maxLen = byLength[0].length;
const hullPath = (v) => (TYPES[v.type].group === 'tug' || v.type.startsWith('self') || v.type === 'crane')
  ? 'M0 10h100l-5 12H5z M26 10V3h30v7z'
  : 'M0 8h100l-3 14H3z';
$('[data-scale-rows]').innerHTML = byLength.map((v) => `
  <div class="hull ${groupOf(v)}" style="--w:${((v.length / maxLen) * 100).toFixed(2)}%">
    <span>${esc(v.project)} <span class="hull-len">${fmt.format(v.length)} м</span></span>
    <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d="${hullPath(v)}"/></svg>
  </div>`).join('');

$('[data-roles]').innerHTML = ROLES.map((r) => `<li>${esc(r)}</li>`).join('');

const tel = (p) => 'tel:' + p.replace(/[^\d+]/g, '');
$('[data-contacts]').innerHTML = CONTACTS.map((c) => `
  <li><span class="ph-title">${c.title}</span>
    ${c.phones.map((p) => `<a href="${tel(p)}">${p}</a>`).join('')}
    ${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : ''}
    ${c.note ? `<span class="ph-note">${c.note}</span>` : ''}
  </li>`).join('');

$('[data-requisites]').innerHTML = REQUISITES.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');

/* ---------- Уведомление ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
}

$('[data-copy-req]').addEventListener('click', async () => {
  const text = REQUISITES.map(([k, v]) => `${k}: ${v}`).join('\n');
  try { await navigator.clipboard.writeText(text); toast('Реквизиты скопированы'); }
  catch { toast('Не удалось скопировать — выделите реквизиты вручную'); }
});

/* ---------- Заявка: собираем письмо ---------- */
const form = $('[data-request]');
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
    `Груз: ${d.cargo}`,
    d.from && `Откуда: ${d.from}`,
    d.to && `Куда: ${d.to}`,
    d.volume && `Объём: ${d.volume} т`,
    d.dates && `Сроки: ${d.dates}`,
    `Компания и контактное лицо: ${d.name}`,
    `Связь: ${d.contact}`,
    d.note && `\n${d.note}`,
  ].filter(Boolean);
  const subject = `Заявка на перевозку: ${d.cargo}${d.to ? ' → ' + d.to : ''}`;
  location.href = `mailto:omtnp@omtnp.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  toast('Письмо с заявкой открыто в почтовой программе');
});

/* ---------- Меню ---------- */
const burger = $('[data-burger]'), drawer = $('[data-drawer]');
function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  drawer.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  if (open) {
    lenis?.stop();
    if (!reduced) gsap.from($$('nav a', drawer), { y: 30, opacity: 0, stagger: .05, duration: .5, ease: 'power3.out' });
  } else lenis?.start();
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setMenu(false); burger.focus(); } });

/* ---------- Плавная прокрутка ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { offset: target.id === 'hero' ? 0 : -70, duration: 1.4 });
  else target.scrollIntoView();
  history.replaceState(null, '', a.getAttribute('href'));
});

/* ---------- Шапка, фарватер, активный раздел ---------- */
const top = $('[data-top]');
const hero = $('[data-hero]');
const fairway = $('[data-fairway]');
const fill = $('[data-fairway-fill]');
const buoys = $$('[data-buoy]', fairway);
const darkSections = $$('.section-dark, .hero');
const navLinks = $$('.nav a');

ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate(self) {
    top.classList.toggle('is-solid', scrollY > hero.offsetHeight - 80);
    top.classList.toggle('on-dark', darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top < 40 && r.bottom > 40; }));
    gsap.set(fill, { scaleY: self.progress });
    const mid = innerHeight / 2;
    fairway.classList.toggle('on-dark', darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }));
    let here = 0;
    buoys.forEach((b, i) => { const s = document.getElementById(b.dataset.buoy); if (s && s.getBoundingClientRect().top < mid) here = i; });
    buoys.forEach((b, i) => { b.classList.toggle('is-passed', i <= here); b.classList.toggle('is-here', i === here); });
    const current = $$('main > section').filter((s) => s.getBoundingClientRect().top < mid).pop();
    navLinks.forEach((a) => a.classList.toggle('is-here', current && a.getAttribute('href') === '#' + current.id));
  },
});

/* ---------- Hero: видео идёт за прокруткой ---------- */
const video = $('[data-hero-video]');
const states = $$('[data-state]');
const meter = $('[data-hero-meter]');
let heroP = 0, shown = 0;

function showState(i) {
  if (i === shown) return;
  const prev = states[shown], next = states[i];
  shown = i;
  states.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
  if (reduced) { prev.classList.remove('is-on'); next.classList.add('is-on'); return; }
  gsap.killTweensOf([prev, next, ...$$('*', prev), ...$$('*', next)]);
  gsap.to(prev, { autoAlpha: 0, y: -30, duration: .45, ease: 'power2.in', onComplete: () => prev.classList.remove('is-on') });
  next.classList.add('is-on');
  gsap.fromTo(next, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: .01, delay: .3 });
  gsap.fromTo(next.children, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .09, delay: .3, ease: 'expo.out' });
}

ScrollTrigger.create({
  trigger: hero, start: 'top top', end: 'bottom bottom',
  onUpdate(self) {
    heroP = self.progress;
    gsap.set(meter, { scaleX: heroP });
    showState(heroP < .34 ? 0 : heroP < .68 ? 1 : 2);
  },
});

if (!reduced) {
  // Ролик скачиваем целиком: перемотка по уже загруженному файлу идёт без рывков
  addEventListener('load', async () => {
    const src = innerWidth < 760 ? video.dataset.srcSmall : video.dataset.src;
    try {
      const blob = await (await fetch(src)).blob();
      video.src = URL.createObjectURL(blob);
    } catch { video.src = src; }
    video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
    video.preload = 'auto';
    video.load();
  });
  let cur = 0;
  gsap.ticker.add((_, dt) => {
    if (!video.duration) return;
    const target = heroP * (video.duration - .05);
    cur += (target - cur) * (1 - Math.exp(-(dt / 1000) * 8));
    if (Math.abs(target - cur) < .002) cur = target;
    if (!video.seeking && Math.abs(video.currentTime - cur) > .008) video.currentTime = cur;
  });
}

/* ---------- Разбивка заголовков на строки ---------- */
function splitLines(el) {
  const label = el.textContent;
  // Делим по обычным пробелам: неразрывные (&nbsp;) остаются внутри слова
  const parts = label.split(' ');
  el.innerHTML = parts.map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  const lines = [];
  let lastTop = null;
  $$('.w', el).forEach((w) => {
    const t = w.offsetTop;
    if (lastTop === null || Math.abs(t - lastTop) > 4) { lines.push([]); lastTop = t; }
    lines[lines.length - 1].push(w.textContent);
  });
  el.innerHTML = lines.map((l) => `<span class="line"><span>${esc(l.join(' '))}</span></span>`).join('');
  el.setAttribute('aria-label', label);
  return $$('.line > span', el);
}

/* ---------- Анимации ---------- */
document.fonts.ready.then(() => {
  if (reduced) return;

  // Первый экран: логотип в шапке собирается, заголовок поднимается по строкам
  const heroLines = splitLines($('.hero-state.is-on .hero-title'));
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.add(logoIntro($('.brand-mark')), 0)
    .from('.brand-name, .nav a, .top-cta, .top-phone, .burger', { y: -16, opacity: 0, duration: .8, stagger: .05 }, .2)
    .from(heroLines, { yPercent: 105, duration: 1.2, stagger: .1 }, .25)
    .from('.hero-state.is-on .hero-lead, .hero-meter', { y: 24, opacity: 0, duration: 1, stagger: .1 }, .7);

  // Заголовки разделов
  $$('[data-split]').forEach((el) => {
    const lines = splitLines(el);
    gsap.from(lines, { yPercent: 105, duration: 1.1, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.section-lead', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0, scrollTrigger: { trigger: '.services', start: 'top 80%' } });

  // Рейс: налив → ход по реке → слив на берег
  const convoy = $('[data-convoy]'), hull = $('[data-hull]'), hose = $('[data-hose]'), flow = $('[data-flow]');
  const load = $('[data-load]'), loadFlow = $('[data-load-flow]');
  const steps = $$('[data-step]');
  const hoseLen = hose.getTotalLength();
  gsap.set(hose, { strokeDasharray: hoseLen, strokeDashoffset: hoseLen });
  gsap.set(convoy, { x: -620 });
  gsap.set(hull, { y: -12 });
  gsap.set('[data-tank]', { scaleY: 0, transformOrigin: '50% 100%' });
  const setStep = (i) => steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
  setStep(0);
  const voyage = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '[data-voyage]', start: 'top top', end: '+=260%', pin: '.voyage-pin', scrub: 1, invalidateOnRefresh: true,
      onUpdate: (self) => setStep(self.progress < .3 ? 0 : self.progress < .68 ? 1 : 2),
    },
  });
  // Налив: баржа садится глубже. Ход: рукав убран, состав идёт к терминалу. Выгрузка: баржа всплывает, резервуары наполняются.
  // На узком экране сцена шире окна: «камера» едет за составом
  const scene = $('[data-scene]');
  const pan = () => Math.max(0, scene.getBoundingClientRect().width - innerWidth);
  voyage.to(hull, { y: 0, duration: 1 })
    .to([load, loadFlow], { opacity: 0, duration: .2 })
    .to(scene, { x: () => -pan(), duration: 2.6, ease: 'power1.inOut' }, '<')
    .to(convoy, { x: 0, duration: 2, ease: 'power1.inOut' }, '<')
    .to('[data-waves]', { x: -120, duration: 2 }, '<')
    .to(hose, { strokeDashoffset: 0, duration: .5 })
    .to(flow, { opacity: 1, duration: .1 })
    .to('[data-tank]', { scaleY: .82, duration: 1.4, stagger: .2 })
    .to(hull, { y: -12, duration: 1.4 }, '<');
  gsap.to([flow, loadFlow], { strokeDashoffset: -40, duration: .6, repeat: -1, ease: 'none' });

  // Диаграмма грузоподъёмности
  $$('.bar').forEach((bar, i) => {
    const val = $('.bar-val', bar);
    const n = { v: 0 };
    gsap.timeline({ scrollTrigger: { trigger: bar, start: 'top 92%' } })
      .from($('.bar-fill', bar), { scaleX: 0, duration: 1.2, ease: 'expo.out', delay: i * .05 })
      .to(n, { v: +val.dataset.num, duration: 1.2, ease: 'expo.out', onUpdate: () => { val.textContent = fmt.format(Math.round(n.v)); }, onComplete: () => { val.textContent = fmt.format(+val.dataset.num); } }, '<')
      .from(val, { opacity: 0, duration: .4 }, '<');
  });

  // Силуэты в масштабе
  gsap.from('.hull svg', { scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'expo.out', stagger: .03, scrollTrigger: { trigger: '[data-scale-rows]', start: 'top 85%' } });
  gsap.from('.fleet-table tbody tr', { opacity: 0, y: 12, duration: .5, stagger: .025, ease: 'power2.out', scrollTrigger: { trigger: '.fleet-table', start: 'top 85%' } });

  // Маршрут на карте прочерчивается
  $$('[data-route]').forEach((p) => {
    const len = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.map', start: 'top 75%', end: 'bottom 60%', scrub: 1 } });
  });
  gsap.from('.map-pts > *', { opacity: 0, scale: .6, transformOrigin: 'center', duration: .6, stagger: .06, ease: 'back.out(2)', scrollTrigger: { trigger: '.map', start: 'top 70%' } });

  // Логотип компании, цифры
  logoIntro($('.company-logo'), { scrollTrigger: { trigger: '.company-logo', start: 'top 80%' } });
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const from = end === 2008 ? 1990 : 0;
    const n = { v: from };
    gsap.to(n, { v: end, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => { el.textContent = end === 2008 ? Math.round(n.v) : fmt.format(Math.round(n.v)); } });
  });

  // Параллакс фото и надписи в подвале
  gsap.fromTo('[data-parallax]', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.careers', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('[data-foot-word]', { xPercent: 8 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  logoIntro($('.foot-logo'), { scrollTrigger: { trigger: '.foot', start: 'top 70%' } });

  ScrollTrigger.refresh();
});
