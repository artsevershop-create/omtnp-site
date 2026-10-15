// Флот: диаграмма грузоподъёмности, таблица с фильтром, масштабная линейка, карточки типов, лента судов на главной.
import { $, $$, gsap, ScrollTrigger, reduced, fmt, esc } from './core.js';
import { FLEET, TYPES, GROUPS } from '../data.js';
import { vesselSvg } from './vessel-svg.js';

const groupOf = (v) => TYPES[v.type].group;

export function renderBars(host) {
  const tankers = FLEET.filter((v) => v.type === 'bargeTanker').sort((a, b) => b.cargo - a.cargo);
  const max = tankers[0].cargo;
  host.innerHTML = tankers.map((v) => `
    <li class="bar" style="--w:${((v.cargo / max) * 82).toFixed(2)}%">
      <a class="bar-name" href="/flot/${v.slug}/">${esc(v.project)}</a>
      <span class="bar-track"><span class="bar-fill"></span><span class="bar-val" data-num="${v.cargo}">${fmt.format(v.cargo)}</span></span>
    </li>`).join('');
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

export function renderTable(chipsHost, body) {
  const counts = Object.fromEntries(GROUPS.map((g) => [g.id, g.id === 'all' ? FLEET.length : FLEET.filter((v) => groupOf(v) === g.id).length]));
  chipsHost.innerHTML = GROUPS.map((g, i) => `<button class="chip" type="button" data-group="${g.id}" aria-pressed="${i === 0}">${g.label}<small>${counts[g.id]}</small></button>`).join('');
  const cell = (v) => v.type === 'crane'
    ? `<span class="muted">${esc(v.power)} л. с.</span>`
    : v.cargo ? `<b>${fmt.format(v.cargo)}</b>${v.cargoNote ? ` <span class="muted">(${esc(v.cargoNote)})</span>` : ''}` : `<span class="muted">${esc(v.power)} л. с.</span>`;
  body.innerHTML = FLEET.map((v) => `
    <tr data-group="${groupOf(v)}" data-cursor="Открыть">
      <th scope="row"><a href="/flot/${v.slug}/">${esc(v.project)}</a></th>
      <td><span class="type-dot ${groupOf(v)}"></span>${TYPES[v.type].label}</td>
      <td class="num">${cell(v)}</td>
      <td class="num">${fmt.format(v.length)} × ${fmt.format(v.width)}</td>
      <td class="num">${v.draft}</td>
      <td>${esc(v.cls)}</td>
    </tr>`).join('');
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

export function renderScale(host) {
  const list = [...FLEET].sort((a, b) => b.length - a.length);
  const max = list[0].length;
  host.innerHTML = list.map((v) => `
    <a class="hull ${groupOf(v)}" href="/flot/${v.slug}/" style="--w:${((v.length / max) * 100).toFixed(2)}%">
      <span>${esc(v.project)} <span class="hull-len">${fmt.format(v.length)} м</span></span>
      <span class="hull-shape">${vesselSvg(v).svg}</span>
    </a>`).join('');
  if (!reduced) gsap.from($$('.hull-shape', host), { scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'expo.out', stagger: .03, scrollTrigger: { trigger: host, start: 'top 85%' } });
}

export function renderTypes(host, onPick) {
  const order = ['bargeTanker', 'selfTanker', 'pusher', 'tug', 'bargeDry', 'selfDry', 'crane'];
  host.innerHTML = order.map((type) => {
    const list = FLEET.filter((v) => v.type === type);
    const biggest = [...list].sort((a, b) => b.length - a.length)[0];
    return `<li data-reveal>
      <a class="type-card ${TYPES[type].group}" href="#table" data-pick="${TYPES[type].group}" data-cursor="Смотреть">
        <span class="type-count">${list.length}</span>
        <span class="type-name">${TYPES[type].plural}</span>
        <span class="type-shape">${vesselSvg(biggest).svg}</span>
      </a></li>`;
  }).join('');
  host.addEventListener('click', (e) => { const a = e.target.closest('[data-pick]'); if (a) onPick(a.dataset.pick); });
}

/** Лента всех судов в одном масштабе: на компьютере едет вбок при прокрутке, на телефоне листается пальцем. */
export function renderStrip(section) {
  const track = $('[data-strip-track]', section);
  const list = [...FLEET].sort((a, b) => b.length - a.length);
  track.innerHTML = list.map((v) => `
    <a class="strip-item ${groupOf(v)}" href="/flot/${v.slug}/" style="--len:${v.length}" data-cursor="Открыть">
      <span class="strip-shape">${vesselSvg(v).svg}</span>
      <span class="strip-name">${esc(v.project)}</span>
      <span class="strip-meta">${TYPES[v.type].label}, ${fmt.format(v.length)} м</span>
    </a>`).join('');
  const meter = $('[data-strip-meter]', section);
  const mm = matchMedia('(min-width: 900px)');
  if (reduced || !mm.matches) return;
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
