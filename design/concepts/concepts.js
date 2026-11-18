// Страница сравнения концепций первого экрана. Данные — те же, что на сайте (src/data.js, снято с omtnp.ru).
import '@fontsource/fira-sans-extra-condensed/cyrillic-500.css';
import '@fontsource/fira-sans-extra-condensed/cyrillic-600.css';
import '@fontsource/fira-sans-extra-condensed/cyrillic-700.css';
import '@fontsource/fira-sans-extra-condensed/latin-600.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/latin-500.css';
import './concepts.css';
import mapSvg from '../../partials/logimap.html?raw';
import { FLEET, TYPES } from '../../src/data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => { const [i, f] = String(Math.round(n * 10) / 10).split('.'); const g = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i; return f ? `${g},${f}` : g; };

/* ---------- Рамки: ПК 1440×810 / телефон 390×844, масштаб под ширину колонки ---------- */
const SIZES = { pc: [1440, 810], phone: [390, 844] };
$$('[data-stage]').forEach((stage) => {
  const frame = $('[data-frame]', stage);
  const bar = document.createElement('div');
  bar.className = 'cx-switch';
  bar.innerHTML = '<button type="button" data-size="pc" aria-pressed="true">ПК 1440</button><button type="button" data-size="phone" aria-pressed="false">Телефон 390</button><button type="button" data-replay>Повторить вход</button>';
  const view = document.createElement('div');
  view.className = 'cx-view';
  stage.before(view);
  view.append(bar, stage);
  let size = 'pc';
  const fit = () => {
    const [w, h] = SIZES[size];
    const max = stage.clientWidth;
    const s = size === 'pc' ? max / w : Math.min(1, Math.min(max, 420) / w);
    frame.style.width = `${w}px`; frame.style.height = `${h}px`;
    frame.style.transform = `scale(${s})`;
    stage.style.height = `${h * s}px`;
    stage.dataset.size = size;
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.size) {
      size = b.dataset.size;
      $$('[data-size]', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fit();
    }
    replay(frame);
  });
  new ResizeObserver(fit).observe(stage);
  fit();
});

// Вход заново: снимаем и ставим класс .is-in
function replay(frame) {
  const hx = $('.hx', frame);
  hx.classList.remove('is-in'); void hx.offsetWidth; hx.classList.add('is-in');
  hx.dispatchEvent(new CustomEvent('replay'));
}
const io = new IntersectionObserver((list) => list.forEach((e) => {
  if (e.isIntersecting && !e.target.classList.contains('is-in')) { e.target.classList.add('is-in'); e.target.dispatchEvent(new CustomEvent('replay')); }
}), { threshold: .35 });
$$('.hx').forEach((hx) => io.observe(hx));

/* ---------- A. Лоция: карта с прорисовкой маршрута ---------- */
{
  const host = $('[data-map]');
  host.innerHTML = mapSvg;
  const svg = $('svg', host);
  const routes = $$('.route', svg);
  const hx = host.closest('.hx');
  const convoy = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  convoy.innerHTML = '<circle r="14" class="cv-halo"/><rect x="-11" y="-5" width="22" height="10" rx="3" class="cv-body"/>';
  svg.querySelector('g').appendChild(convoy);
  let raf;
  const run = () => {
    cancelAnimationFrame(raf);
    routes.forEach((r, i) => {
      const L = r.getTotalLength();
      r.style.strokeDasharray = L; r.style.strokeDashoffset = L;
      r.style.transition = 'none'; void r.getBoundingClientRect();
      r.style.transition = `stroke-dashoffset ${reduced ? 0 : 2.4}s cubic-bezier(.4,0,.2,1) ${reduced ? 0 : .6 + i * .5}s`;
      r.style.strokeDashoffset = 0;
    });
    // Состав идёт по первому маршруту (Иртыш) и дальше по Оби, затем по кругу
    const path = [routes[0], routes[1]].filter(Boolean);
    const lens = path.map((p) => p.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0);
    const t0 = performance.now() + (reduced ? 0 : 2600);
    const tick = (now) => {
      const k = Math.max(0, ((now - t0) / 22000) % 1);
      let d = k * total, i = 0;
      while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
      const p = path[i].getPointAtLength(d), q = path[i].getPointAtLength(Math.min(lens[i], d + 2));
      const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      convoy.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang})`);
      convoy.style.opacity = now < t0 ? 0 : 1;
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  hx.addEventListener('replay', run);
}

/* ---------- B. Табло: строки флота перелистываются ---------- */
{
  const board = $('[data-board]');
  const ROWS = 6;
  const W = [14, 16, 13, 16]; // ширина колонок в знаках
  const row = (v) => {
    const t = TYPES[v.type];
    const short = { pusher: 'ТОЛКАЧ', tug: 'БУКСИР', selfTanker: 'ТАНКЕР', selfDry: 'СУХОГРУЗ', crane: 'ПЛАВКРАН', bargeTanker: 'НАЛИВН. БАРЖА', bargeDry: 'СУХОГР. БАРЖА' }[v.type] || t.label;
    const load = v.type === 'crane' ? `${fmt(v.cargo)} Т КРАН` : v.cargo ? `${fmt(v.cargo)} Т` : `${v.power} Л.С.`;
    return [v.project.split(' / ')[0], short, load, v.cls.split(' / ')[0]].map((s, i) => String(s).toUpperCase().slice(0, W[i]).padEnd(W[i], ' '));
  };
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    const line = document.createElement('div');
    line.className = 'hx-line';
    line.innerHTML = W.map((w) => `<span class="hx-col">${'<i class="fl"> </i>'.repeat(w)}</span>`).join('');
    board.appendChild(line);
    lines.push($$('.fl', line));
  }
  const CH = ' АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ0123456789.,/-×';
  const setCell = (cell, c, delay) => {
    if (cell.textContent === c) return;
    if (reduced) { cell.textContent = c; return; }
    let n = 3 + Math.floor(Math.random() * 4);
    setTimeout(function flip() {
      cell.classList.remove('is-flip'); void cell.offsetWidth; cell.classList.add('is-flip');
      cell.textContent = n-- > 0 ? CH[Math.floor(Math.random() * CH.length)] : c;
      if (n >= 0) setTimeout(flip, 55);
    }, delay);
  };
  let start = 0, timer;
  const show = () => {
    for (let r = 0; r < ROWS; r++) {
      const chars = row(FLEET[(start + r) % FLEET.length]).join('');
      lines[r].forEach((cell, i) => setCell(cell, chars[i] === ' ' ? ' ' : chars[i], r * 90 + i * 12));
    }
    start = (start + 1) % FLEET.length;
  };
  const hx = board.closest('.hx');
  hx.addEventListener('replay', () => { clearInterval(timer); show(); if (!reduced) timer = setInterval(show, 3200); });
  const clock = $('[data-clock]');
  const tickClock = () => { clock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Omsk' }) + ' ОМСК'; };
  tickClock(); setInterval(tickClock, 30000);
}

/* ---------- D. Марки осадки: налив до 15 000 т ---------- */
{
  const hull = $('[data-hull]');
  const marks = $('[data-marks]', hull);
  // Шкала 0–3,0 м через 0,2 м (как марки углубления на борту); подписаны целые дециметры чётные
  for (let d = 30; d >= 0; d -= 2) {
    const m = document.createElement('span');
    m.className = 'hx-mark' + (d % 10 === 0 ? ' is-major' : '');
    m.style.setProperty('--y', `${(1 - d / 30) * 100}%`);
    m.innerHTML = `<i></i><b>${d % 10 === 0 ? `${d / 10}М` : d % 10}</b>`;
    marks.appendChild(m);
  }
  const tons = $('[data-tons]', hull);
  const water = $('[data-water]', hull);
  let raf;
  const run = () => {
    cancelAnimationFrame(raf);
    const T = reduced ? 1 : 3200, t0 = performance.now() + (reduced ? 0 : 700);
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (now) => {
      const k = ease(Math.min(1, Math.max(0, (now - t0) / T)));
      tons.textContent = fmt(Math.round(k * 15000 / 10) * 10);
      // вода от осадки порожнём (~0,7 м) до осадки в грузу 2,95 м по шкале 0–3 м
      const draft = 0.7 + k * (2.95 - 0.7);
      water.style.height = `${hull.offsetHeight - marks.offsetTop - marks.offsetHeight + marks.offsetHeight * (draft / 3)}px`;
      hull.classList.toggle('is-full', k >= 1);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  hull.closest('.hx').addEventListener('replay', run);
}
