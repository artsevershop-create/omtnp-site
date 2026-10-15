import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

const official = 'https://www.omtnp.ru';
const vesselTypes = [
  { id: 'pusher', label: 'Буксир-толкач' },
  { id: 'tug', label: 'Буксир' },
  { id: 'self-tanker', label: 'Самоходное нефтеналивное' },
  { id: 'self-dry', label: 'Самоходное сухогрузное' },
  { id: 'crane', label: 'Плавкран' },
  { id: 'barge-tanker', label: 'Несамоходное нефтеналивное' },
  { id: 'barge-dry', label: 'Несамоходное сухогрузное' },
];

const vessels = [
  ['Р 96', 'pusher', '/флот/буксир-толкач/р-96'],
  ['911', 'pusher', '/флот/буксир-толкач/911'],
  ['1741 А', 'pusher', '/флот/буксир-толкач/1741-а'],
  ['758 АМ', 'pusher', '/флот/буксир-толкач/758-ам'],
  ['Р162А', 'pusher', '/флот/буксир-толкач/р162а'],
  ['У1А4', 'tug', '/флот/буксир/у1а4'],
  ['375/12.05/375М/133.05/375', 'self-tanker', '/флот/самоходное-нефтеналивное/375'],
  ['2.559/5.89.05/2.559', 'self-dry', '/флот/самоходное-сухогрузное/2.559'],
  ['Д–9012', 'crane', '/флот/плавкран/д-9012'],
  ['М 16802', 'barge-tanker', '/флот/несамоходное-нефтеналивное/м-16802'],
  ['432/ТСК 128-03', 'barge-tanker', '/флот/несамоходное-нефтеналивное/432'],
  ['81371', 'barge-tanker', '/флот/несамоходное-нефтеналивное/81371'],
  ['В. 016', 'barge-tanker', '/флот/несамоходное-нефтеналивное/в.016'],
  ['1390 / фин. 1000', 'barge-tanker', '/флот/несамоходное-нефтеналивное/1390'],
  ['262', 'barge-tanker', '/флот/несамоходное-нефтеналивное/262'],
  ['81216 Р', 'barge-tanker', '/флот/несамоходное-нефтеналивное/81216-р'],
  ['81463', 'barge-tanker', '/флот/несамоходное-нефтеналивное/81463'],
  ['К-1908-3', 'barge-tanker', '/флот/несамоходное-нефтеналивное/к-1908-3'],
  ['942 А', 'barge-dry', '/флот/несамоходное-сухогрузное/942-а'],
  ['943', 'barge-dry', '/флот/несамоходное-сухогрузное/943'],
];

const routes = [
  { number: '01', title: 'Обь-Иртышский бассейн', text: 'Основная речная система перевозок компании.', href: '/география/обь-иртышский-бассейн', tag: 'РЕЧНОЙ БАССЕЙН' },
  { number: '02', title: 'Обская губа', text: 'Северное направление Обь-Иртышского бассейна.', href: '/география/обская-губа', tag: 'СЕВЕРНЫЕ ВОДНЫЕ ПУТИ' },
  { number: '03', title: 'Тазовская губа', text: 'Включена в географию перевозок компании.', href: '/география/тазовская-губа', tag: 'СЕВЕРНЫЕ ВОДНЫЕ ПУТИ' },
  { number: '04', title: 'Енисейский бассейн', text: 'Отдельное направление внутренних водных перевозок.', href: '/география/енисейский-бассейн', tag: 'РЕЧНОЙ БАССЕЙН' },
  { number: '05', title: 'Карское море', text: 'Морской участок на официальной схеме географии.', href: '/география/карское-море', tag: 'СЕВЕРНОЕ НАПРАВЛЕНИЕ' },
  { number: '06', title: 'Схема водных путей', text: 'Официальная схема Обь-Иртышского бассейна.', href: '/география/схема-водных-путей-обь-иртышского', tag: 'КАРТА МАРШРУТОВ' },
];

const typeCounts = vesselTypes.map((type) => ({ ...type, count: vessels.filter((vessel) => vessel[1] === type.id).length }));
const filterHost = document.querySelector('.fleet-filters');
const fleetGrid = document.querySelector('#fleet-grid');

if (filterHost && fleetGrid) {
  filterHost.innerHTML = [
    `<button class="filter-chip is-active" type="button" data-filter="all">Все суда <small>${vessels.length}</small></button>`,
    ...typeCounts.map((type) => `<button class="filter-chip" type="button" data-filter="${type.id}">${type.label} <small>${type.count}</small></button>`),
  ].join('');

  fleetGrid.innerHTML = vessels.map(([project, typeId, href], index) => {
    const type = vesselTypes.find((item) => item.id === typeId);
    return `<tr class="vessel-card" data-type="${typeId}"><td>${String(index + 1).padStart(2, '0')}</td><th scope="row">${project}</th><td>${type.label}</td><td><a href="${official}${href}" target="_blank" rel="noreferrer" aria-label="Характеристики проекта ${project}">Подробнее ↗</a></td></tr>`;
  }).join('');

  filterHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filterHost.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip === button));
    const filter = button.dataset.filter;
    fleetGrid.querySelectorAll('.vessel-card').forEach((card, index) => {
      const show = filter === 'all' || card.dataset.type === filter;
      card.hidden = !show;
      if (show && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(card, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .42, delay: Math.min(index % 7, 5) * .035, ease: 'power2.out' });
      }
    });
    ScrollTrigger.refresh();
  });
}

const routeHost = document.querySelector('#routes');
if (routeHost) {
  routeHost.innerHTML = routes.map((route) => `<a class="route-card reveal" href="${official}${route.href}" target="_blank" rel="noreferrer"><span class="route-card-top"><small>${route.tag}</small><b>${route.number}</b></span><strong>${route.title}</strong><p>${route.text}</p><span class="route-card-arrow">Открыть направление <i>↗</i></span></a>`).join('');
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) document.documentElement.classList.add('has-motion');
let lenis;
let lenisTicker;

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
document.fonts?.ready?.then(() => ScrollTrigger.refresh());

if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.92, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  lenisTicker = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(lenisTicker);
  gsap.ticker.lagSmoothing(0);

  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  intro.from('.hero-eyebrow', { y: 12, duration: .55 })
    .from('.hero h1', { y: 28, duration: .8 }, '-=.28')
    .from('.hero-lower > *', { y: 14, duration: .55, stagger: .12 }, '-=.35')
    .from('.water-coordinate,.water-route,.water-bottom,.scroll-cue', { autoAlpha: 0, duration: .6, stagger: .08 }, '-=.3');

  document.querySelectorAll('.display-title').forEach((heading) => {
    if (heading.closest('.hero')) return;
    gsap.fromTo(heading, { y: 22, clipPath: 'inset(0 0 100% 0)' }, {
      y: 0,
      clipPath: 'inset(0 0 0% 0)',
      duration: .92,
      ease: 'power4.out',
      scrollTrigger: { trigger: heading, start: 'top 84%', once: true },
    });
  });

  document.querySelectorAll('.offer-grid,.detail-grid,.route-cards,.contact-grid').forEach((group) => {
    const animateItems = () => gsap.fromTo(group.children, { y: 22, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: .72,
      stagger: .075,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 86%', once: true },
    });
    animateItems();
  });

  gsap.to('.hero-image', { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.1 } });
  gsap.to('.hero-copy-wrap', { y: 24, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.1 } });
  gsap.to('.scroll-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: .25 } });
  gsap.to('.closing-lines', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.closing-section', start: 'top bottom', end: 'bottom top', scrub: 1.1 } });

  const motionMedia = gsap.matchMedia();
  motionMedia.add('(min-width: 761px)', () => {
    const steps = [...document.querySelectorAll('.voyage-steps article')];
    gsap.set('.tanker-travel', { x: -290 });
    gsap.set('.tank-fill', { scaleY: .05, svgOrigin: '1190 318' });
    gsap.set('.transfer-pipe,.transfer-flow', { autoAlpha: 0 });
    const voyage = gsap.timeline({ scrollTrigger: { trigger: '.voyage', start: 'top top', end: 'bottom bottom', scrub: 1, onUpdate: s => { steps.forEach((step,i) => step.classList.toggle('is-active', i === (s.progress < .48 ? 0 : s.progress < .7 ? 1 : 2))); } } });
    voyage.to('.tanker-travel', { x: 560, duration: 5, ease: 'power1.inOut' })
      .to('.wake', { opacity: 0, duration: .6 }, '-=.6')
      .to('.transfer-pipe,.transfer-flow', { autoAlpha: 1, duration: .7 })
      .to('.tank-fill', { scaleY: .87, duration: 2.4, ease: 'none' });
    voyage.to('.voyage-progress i', { scaleX: 1, duration: voyage.duration(), ease: 'none' }, 0);
    gsap.to('.water-motion', { x: -150, duration: 5, repeat: -1, ease: 'none' });
    gsap.to('.transfer-flow', { strokeDashoffset: -80, duration: 2, repeat: -1, ease: 'none' });
    return () => steps.forEach(step => step.classList.remove('is-active'));
  });
  motionMedia.add('(max-width: 760px)', () => {
    gsap.set('.tanker-travel', { x: 560 });
    gsap.fromTo('.tank-fill', { scaleY: .05, svgOrigin: '1190 318' }, { scaleY: .87, scrollTrigger: { trigger: '.voyage-stage', start: 'top 85%', end: 'bottom 25%', scrub: 1 } });
  });
  gsap.from('.brand-emblem img', { rotate: -12, scale: .85, duration: 1.3, scrollTrigger: {trigger: '.brand-signature', start: 'top 80%'} });

  const fleetReel = document.querySelector('.fleet-reel');
  const fleetTrack = fleetReel?.querySelector('.fleet-reel__track');
  if (fleetReel && fleetTrack && window.innerWidth > 760) {
    gsap.to(fleetTrack, {
      x: () => -Math.max(0, fleetTrack.scrollWidth - fleetReel.clientWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: fleetReel,
        start: 'top top+=110',
        end: () => `+=${Math.max(fleetTrack.scrollWidth - window.innerWidth, window.innerHeight * 0.85)}`,
        scrub: 0.9,
        pin: fleetReel,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  }

  const routePath = document.querySelector('.route-dash');
  if (routePath) {
    const length = routePath.getTotalLength();
    gsap.set(routePath, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(routePath, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.geo-map', start: 'top 78%', end: 'bottom 32%', scrub: 0.8 } });
  }

  document.querySelectorAll('.detail-card-art').forEach((art) => {
    gsap.fromTo(art, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power4.out', scrollTrigger: { trigger: art, start: 'top 82%', once: true } });
  });

  if (!window.matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power3.out' });
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        rx(((event.clientY - rect.top) / rect.height - .5) * -3.5);
        ry(((event.clientX - rect.left) / rect.width - .5) * 3.5);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  const refreshMotion = () => ScrollTrigger.refresh();
  document.querySelectorAll('img').forEach((image) => {
    if (image.complete) return;
    image.addEventListener('load', refreshMotion, { once: true });
    image.addEventListener('error', refreshMotion, { once: true });
  });

  if (!window.matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach((element) => {
      const xTo = gsap.quickTo(element, 'x', { duration: .45, ease: 'power3.out' });
      const yTo = gsap.quickTo(element, 'y', { duration: .45, ease: 'power3.out' });
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        xTo((event.clientX - rect.left - rect.width / 2) * .08);
        yTo((event.clientY - rect.top - rect.height / 2) * .1);
      });
      element.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }
}

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
const closeMenu = () => {
  menuToggle?.classList.remove('active');
  navigation?.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Открыть меню');
};

menuToggle?.addEventListener('click', () => {
  const open = !navigation.classList.contains('is-open');
  navigation.classList.toggle('is-open', open);
  menuToggle.classList.toggle('active', open);
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    const toast = document.querySelector('.toast');
    toast.textContent = 'Скопировано';
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 1500);
  } catch {
    button.setAttribute('aria-label', 'Скопируйте значение вручную: ' + button.dataset.copy);
  }
}));

const sections = [...document.querySelectorAll('main section[id]')];
if (!reducedMotion && 'IntersectionObserver' in window) {
  const navAnchors = [...document.querySelectorAll('.nav-main')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach((anchor) => anchor.classList.toggle('is-current', anchor.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((section) => sectionObserver.observe(section));
}

window.addEventListener('pagehide', () => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (lenisTicker) gsap.ticker.remove(lenisTicker);
  lenis?.destroy();
}, { once: true });

import './presentation.css';
