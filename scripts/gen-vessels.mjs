// Генерирует страницы судов flot/<slug>/index.html из src/data.js. Запускается перед dev и build.
import { mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLEET, TYPES, TYPE_DESC, OFFICIAL } from '../src/data.js';
import { vesselSvg } from '../src/lib/vessel-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const nb = (s) => esc(s).replace(/ /g, '&nbsp;');

// Убираем старые сгенерированные страницы (папки с index.html внутри flot/)
const flotDir = resolve(root, 'flot');
for (const name of readdirSync(flotDir)) {
  const p = resolve(flotDir, name);
  if (statSync(p).isDirectory()) rmSync(p, { recursive: true });
}

function cargoFact(v) {
  if (v.type === 'crane') return { value: fmt.format(v.cargo), unit: 'т', label: 'грузоподъёмность крана' };
  if (v.cargo) return { value: fmt.format(v.cargo), unit: 'т', label: 'грузоподъёмность' };
  return { value: v.power, unit: 'л. с.', label: 'мощность двигателей' };
}

FLEET.forEach((v, i) => {
  const t = TYPES[v.type];
  const prev = FLEET[(i - 1 + FLEET.length) % FLEET.length];
  const next = FLEET[(i + 1) % FLEET.length];
  const { svg } = vesselSvg(v, { dims: true, cls: 'blueprint' });
  const main = cargoFact(v);
  const specs = [
    v.cargo && v.type !== 'crane' && ['Грузоподъёмность', `${fmt.format(v.cargo)} т${v.cargoNote ? ` (${v.cargoNote})` : ''}`],
    v.type === 'crane' && ['Грузоподъёмность крана', `${fmt.format(v.cargo)} т`],
    v.power && ['Мощность главных двигателей', `${v.power} л. с.`],
    ['Класс Российского Речного Регистра', v.cls],
    ['Длина × ширина', `${fmt.format(v.length)} × ${fmt.format(v.width)} м`],
    ['Высота габаритная / борта', `${v.height} м`],
    ['Осадка порожнём / в грузу', `${v.draftEmpty} / ${v.draft} м`],
    ['Валовая вместимость / водоизмещение', v.gt],
    ['Доковый вес', `${fmt.format(v.dock)} т`],
  ].filter(Boolean);

  const card = (x, dir) => `
        <a class="vnav-card" href="/flot/${x.slug}/" data-cursor="${dir}">
          <span class="vnav-dir">${dir}</span>
          <span class="vnav-name">${esc(x.project)}</span>
          <span class="vnav-type">${TYPES[x.type].label}</span>
          ${vesselSvg(x).svg}
        </a>`;

  const html = `<!doctype html>
<html lang="ru">
<head>
  <!-- @head -->
  <title>Проект ${esc(v.project)} — ${t.label.toLowerCase()} | АО «Омтранснефтепродукт»</title>
  <meta name="description" content="${esc(t.label)}, проект ${esc(v.project)}: ${main.label} ${esc(main.value)} ${main.unit}, длина ${fmt.format(v.length)} м, осадка в грузу ${esc(v.draft)} м, класс ${esc(v.cls)}." />
</head>
<body data-page="vessel" data-nav="flot">
  <!-- @header -->
  <main id="main">
    <section class="page-hero page-hero-vessel">
      <div class="wrap">
        <nav class="crumbs" aria-label="Навигация по разделу"><a href="/flot/">Флот</a><span aria-hidden="true">/</span><a href="/flot/#${t.group}">${t.plural}</a></nav>
        <h1 class="display page-title" data-split>Проект ${nb(v.project)}</h1>
        <p class="page-lead">${v.desc ? `${esc(t.label)}. ${esc(v.desc)}` : esc(TYPE_DESC[v.type])}</p>
      </div>
    </section>

    <section class="blueprint-wrap section-dark" aria-label="Чертёж судна">
      <div class="wrap">
        <div class="blueprint-frame" data-blueprint>
          ${svg}
        </div>
        <p class="blueprint-note">Схема по основным размерам. Высота корпуса показана с увеличением для наглядности.</p>
      </div>
    </section>

    <section class="section vessel-specs">
      <div class="wrap">
        <dl class="kpis">
          <div><dt>${main.label}</dt><dd><span class="kpi-v">${esc(main.value)}</span> ${main.unit}</dd></div>
          <div><dt>длина</dt><dd><span class="kpi-v">${fmt.format(v.length)}</span> м</dd></div>
          <div><dt>осадка в грузу</dt><dd><span class="kpi-v">${esc(v.draft)}</span> м</dd></div>
          <div><dt>класс Речного регистра</dt><dd><span class="kpi-v kpi-cls">${esc(v.cls)}</span></dd></div>
        </dl>
        <div class="spec-grid">
          <h2 class="h3">Характеристики</h2>
          <dl class="spec-list">
            ${specs.map(([k, val]) => `<div data-reveal><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('\n            ')}
          </dl>
        </div>
        <p class="fine">Источник — <a class="link" href="${OFFICIAL}${encodeURI(v.path)}" target="_blank" rel="noopener">страница проекта на omtnp.ru</a>.</p>
      </div>
    </section>

    <section class="vnav section" aria-label="Другие суда">
      <div class="wrap vnav-grid">${card(prev, 'Предыдущее судно')}${card(next, 'Следующее судно')}
      </div>
    </section>
  </main>
  <!-- @footer -->
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;
  const dir = resolve(flotDir, v.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), html);
});

console.log(`Страницы судов: ${FLEET.length}`);
