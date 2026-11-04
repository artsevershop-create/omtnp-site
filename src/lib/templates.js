// Разметка блоков с данными. Вставляется в HTML при сборке (<!-- @@имя --> в vite.config.js),
// поэтому таблица флота, контакты и реквизиты видны поисковикам и без JavaScript.
import { FLEET, TYPES, GROUPS, CONTACTS, REQUISITES, ROLES } from '../data.js';
import { vesselSvg } from './vessel-svg.js';

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const groupOf = (v) => TYPES[v.type].group;
const tel = (p) => 'tel:' + p.replace(/[^\d+]/g, '');
const byLength = () => [...FLEET].sort((a, b) => b.length - a.length);

export function bars() {
  const tankers = FLEET.filter((v) => v.type === 'bargeTanker').sort((a, b) => b.cargo - a.cargo);
  const max = tankers[0].cargo;
  return tankers.map((v) => `
    <li class="bar" style="--w:${((v.cargo / max) * 82).toFixed(2)}%">
      <a class="bar-name" href="/flot/${v.slug}/">${esc(v.project)}</a>
      <span class="bar-track"><span class="bar-fill"></span><span class="bar-val" data-num="${v.cargo}">${fmt.format(v.cargo)}</span></span>
    </li>`).join('');
}

export function chips() {
  const count = (id) => (id === 'all' ? FLEET.length : FLEET.filter((v) => groupOf(v) === id).length);
  return GROUPS.map((g, i) => `<button class="chip" type="button" data-group="${g.id}" aria-pressed="${i === 0}">${g.label}<small>${count(g.id)}</small></button>`).join('');
}

const cargoCell = (v) => (v.cargo && v.type !== 'crane'
  ? `<b>${fmt.format(v.cargo)}</b>${v.cargoNote ? ` <span class="muted">(${esc(v.cargoNote)})</span>` : ''}`
  : `<span class="muted">${esc(v.power)} л. с.</span>`);

export function fleetRows() {
  return FLEET.map((v) => `
    <tr data-group="${groupOf(v)}" data-cursor="Открыть">
      <th scope="row"><a href="/flot/${v.slug}/">${esc(v.project)}</a></th>
      <td><span class="type-dot ${groupOf(v)}"></span>${TYPES[v.type].label}</td>
      <td class="num">${cargoCell(v)}</td>
      <td class="num">${fmt.format(v.length)} × ${fmt.format(v.width)}</td>
      <td class="num">${v.draft}</td>
      <td>${esc(v.cls)}</td>
    </tr>`).join('');
}

export function scale() {
  const list = byLength();
  const max = list[0].length;
  return list.map((v) => `
    <a class="hull ${groupOf(v)}" href="/flot/${v.slug}/" style="--w:${((v.length / max) * 100).toFixed(2)}%">
      <span>${esc(v.project)} <span class="hull-len">${fmt.format(v.length)} м</span></span>
      <span class="hull-shape">${vesselSvg(v).svg}</span>
    </a>`).join('');
}

export function types() {
  const order = ['bargeTanker', 'selfTanker', 'pusher', 'tug', 'bargeDry', 'selfDry', 'crane'];
  return order.map((type) => {
    const list = FLEET.filter((v) => v.type === type);
    const biggest = [...list].sort((a, b) => b.length - a.length)[0];
    return `<li data-reveal>
      <a class="type-card ${TYPES[type].group}" href="#table" data-pick="${TYPES[type].group}" data-cursor="Смотреть">
        <span class="type-count">${list.length}</span>
        <span class="type-name">${TYPES[type].plural}</span>
        <span class="type-shape">${vesselSvg(biggest).svg}</span>
      </a></li>`;
  }).join('');
}

export function strip() {
  return byLength().map((v) => `
    <a class="strip-item ${groupOf(v)}" href="/flot/${v.slug}/" style="--len:${v.length}" data-cursor="Открыть">
      <span class="strip-shape">${vesselSvg(v).svg}</span>
      <span class="strip-name">${esc(v.project)}</span>
      <span class="strip-meta">${TYPES[v.type].label}, ${fmt.format(v.length)} м</span>
    </a>`).join('');
}

export function contacts() {
  return CONTACTS.map((c) => `
    <li data-reveal><span class="ph-title">${c.title}</span>
      ${c.phones.map((p) => `<a href="${tel(p)}">${p}</a>`).join('')}
      ${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : ''}
      ${c.note ? `<span class="ph-note">${c.note}</span>` : ''}
    </li>`).join('');
}

export function requisites() {
  return REQUISITES.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
}

export function roles() {
  return ROLES.map((r, i) => `<li data-reveal><span class="role-n">${String(i + 1).padStart(2, '0')}</span>${esc(r)}</li>`).join('');
}
