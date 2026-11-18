// Строит карту логистики partials/logimap.html из открытых данных Natural Earth (1:10 млн):
// контуры регионов (ne_10m_admin_1_states_provinces) и осевые линии рек (ne_10m_rivers_lake_centerlines).
// Запуск (один раз, результат лежит в репозитории): node scripts/build-map.mjs D:/cache/geo
// Проекция — равноугольная коническая Ламберта (стандартные параллели 58° и 70°), центр 75° в. д.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || 'D:/cache/geo';
const admin = JSON.parse(readFileSync(`${SRC}/ne_10m_admin_1_states_provinces.geojson`, 'utf8'));
const rivers = JSON.parse(readFileSync(`${SRC}/ne_10m_rivers_lake_centerlines.geojson`, 'utf8'));

/* ---------- проекция ---------- */
const rad = Math.PI / 180;
const [phi1, phi2, phi0, lam0] = [58 * rad, 70 * rad, 64 * rad, 75 * rad];
const n = Math.log(Math.cos(phi1) / Math.cos(phi2)) / Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
const F = (Math.cos(phi1) * Math.tan(Math.PI / 4 + phi1 / 2) ** n) / n;
const rho = (phi) => F / Math.tan(Math.PI / 4 + phi / 2) ** n;
const rho0 = rho(phi0);
const lcc = ([lon, lat]) => {
  const r = rho(lat * rad), t = n * (lon * rad - lam0);
  return [r * Math.sin(t), rho0 - r * Math.cos(t)];
};
// Окно карты: от Омска до Карского моря, от Урала до Енисея
const W = 1000, H = 1180;
const corners = [[60, 53.2], [93, 53.2], [60, 73.6], [93, 73.6], [76, 53.2], [76, 73.6]].map(lcc);
const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const s = Math.min(W / (maxX - minX), H / (maxY - minY));
const P = (ll) => { const [x, y] = lcc(ll); return [(x - minX) * s, H - (y - minY) * s]; };
const r1 = (v) => Math.round(v * 10) / 10;

/* ---------- упрощение (Дуглас — Пекер) ---------- */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Замкнутый контур начинается и кончается в одной точке — упрощать его целиком нельзя (схлопнется в точку):
// делим по самой дальней от начала точке и упрощаем две половины
function simplifyRing(pts, tol) {
  let far = 0, max = -1;
  pts.forEach(([x, y], i) => { const d = Math.hypot(x - pts[0][0], y - pts[0][1]); if (d > max) { max = d; far = i; } });
  return simplify(pts.slice(0, far + 1), tol).concat(simplify(pts.slice(far), tol).slice(1));
}
// Контуры за окном карты не нужны; мелкие острова (меньше 3 px) тоже; допуск упрощения — 1,2 px
const PAD = 40;
const outside = (pts) => pts.every(([x]) => x < -PAD) || pts.every(([x]) => x > W + PAD) || pts.every(([, y]) => y < -PAD) || pts.every(([, y]) => y > H + PAD);
const tiny = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return Math.max(...xs) - Math.min(...xs) < 3 && Math.max(...ys) - Math.min(...ys) < 3; };
const pathOf = (rings, closed, tol = 1.2) => rings.map((ring) => {
  const pr = ring.map(P);
  if (outside(pr) || (closed && tiny(pr))) return '';
  const p = closed ? simplifyRing(pr, tol) : simplify(pr, tol);
  if (closed && p.length < 4) return '';
  if (p.length < 2) return '';
  return 'M' + p.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L') + (closed ? 'Z' : '');
}).join('');

/* ---------- регионы ---------- */
const REGIONS = [
  ['omsk', 'Omsk', 'Омская область'],
  ['tyumen', "Tyumen'", 'Тюменская область'],
  ['khmao', 'Khanty-Mansiy', 'Ханты-Мансийский АО — Югра'],
  ['yanao', 'Yamal-Nenets', 'Ямало-Ненецкий АО'],
  ['tomsk', 'Tomsk', 'Томская область'],
  ['krsk', 'Krasnoyarsk', 'Красноярский край'],
  ['nsk', 'Novosibirsk', 'Новосибирская область'],
  ['kurgan', 'Kurgan', 'Курганская область'],
  ['sverdl', 'Sverdlovsk', 'Свердловская область'],
  ['komi', 'Komi', 'Республика Коми'],
  ['nenets', 'Nenets', 'Ненецкий АО'],
  ['arkh', "Arkhangel'sk", 'Архангельская область'],
];
const ru = admin.features.filter((f) => f.properties.iso_a2 === 'RU');
const polysOf = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const regionGeo = {};
const regionSvg = REGIONS.map(([id, en, title]) => {
  const f = ru.find((x) => x.properties.name === en);
  if (!f) throw new Error('нет региона ' + en);
  regionGeo[id] = polysOf(f);
  const d = polysOf(f).map((poly) => pathOf(poly, true)).join('');
  return `<path class="reg" data-region="${id}" d="${d}"><title>${title}</title></path>`;
}).join('\n    ');
// Соседние страны/регионы для фона — весь остальной RU и Казахстан одним слоем
// Фон — только то, что попадает в окно, с более грубым упрощением
const backdrop = admin.features.filter((f) => (f.properties.iso_a2 === 'RU' && !REGIONS.some(([, en]) => en === f.properties.name)) || f.properties.iso_a2 === 'KZ')
  .flatMap(polysOf).map((poly) => pathOf(poly, true, 2)).join('');

/* ---------- реки: склеиваем куски в длинные русла ---------- */
function chain(segs) {
  const out = [];
  const left = segs.map((s) => s.slice());
  while (left.length) {
    let line = left.shift();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const sg = left[i], e = line[line.length - 1], b = line[0];
        const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < .02;
        if (near(e, sg[0])) line = line.concat(sg.slice(1));
        else if (near(e, sg[sg.length - 1])) line = line.concat(sg.slice().reverse().slice(1));
        else if (near(b, sg[sg.length - 1])) line = sg.concat(line.slice(1));
        else if (near(b, sg[0])) line = sg.slice().reverse().concat(line.slice(1));
        else continue;
        left.splice(i, 1); grew = true; break;
      }
    }
    out.push(line);
  }
  return out.sort((a, b) => b.length - a.length);
}
const riverLines = (name) => chain(rivers.features.filter((f) => f.properties.name === name)
  .flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates)));
const MINOR = ['Tobol', 'Ishim', 'Tom’', 'Pur', 'Nadym', 'Malaya Ob', 'Taz'];
const minorSvg = MINOR.map((nm) => `<path class="riv riv-minor" d="${pathOf(riverLines(nm), false)}"/>`).join('\n    ');

const irtysh = riverLines('Irtysh')[0];
const ob = riverLines('Ob')[0];
const yenisey = riverLines('Yenisey')[0];
const closest = (line, ll) => line.reduce((best, p, i) => { const d = Math.hypot(p[0] - ll[0], p[1] - ll[1]); return d < best.d ? { d, i } : best; }, { d: 1e9, i: 0 }).i;
const orientNorth = (line) => (line[0][1] < line[line.length - 1][1] ? line : line.slice().reverse());

const OMSK = [73.37, 54.98];
const irtyshN = orientNorth(irtysh);
const irtyshRoute = irtyshN.slice(closest(irtyshN, OMSK));
const obN = orientNorth(ob);
const confluence = irtyshRoute[irtyshRoute.length - 1];
const obRoute = obN.slice(closest(obN, confluence));
const KRSK = [92.87, 56.01];
const yenN = orientNorth(yenisey);
const yenRoute = yenN.slice(closest(yenN, KRSK));

/* ---------- путь по губам: середина водной глади по широтам (снято из тех же данных), каждая точка проверяется — не на суше ---------- */
const inRing = ([x, y], ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const onLand = (ll) => Object.values(regionGeo).some((polys) => polys.some((poly) => inRing(ll, poly[0]) && !poly.slice(1).some((h) => inRing(ll, h))));
const obMouth = obRoute[obRoute.length - 1];
const BAY = [[72.3, 66.7], [72.9, 67.0], [73.0, 67.3], [73.57, 67.6], [74.05, 67.9], [73.92, 68.2], [74.07, 68.5], [73.85, 68.8], [73.22, 69.1], [73.22, 69.4], [73.07, 69.7], [73.15, 70.0], [73.25, 70.3], [73.52, 70.6], [73.4, 70.9], [73.05, 71.2]];
const TAZ = [[73.5, 69.15], [74.4, 69.1], [75.87, 69.1], [77.17, 68.8], [77.67, 68.5], [77.52, 68.2], [78.4, 67.6]];
for (const pt of [...BAY, ...TAZ]) if (onLand(pt)) console.warn('⚠ точка на суше:', pt);

const linePath = (ll) => 'M' + simplify(ll.map(P), .5).map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L');
const routeSvg = [
  ['irtysh', irtyshRoute], ['ob', obRoute], ['bay', [obMouth, ...BAY]], ['taz', TAZ], ['yenisei', yenRoute],
].map(([id, ll]) => `<path class="route" data-route="${id}" d="${linePath(ll)}"/>`).join('\n    ');
const mainSvg = [['Irtysh', irtyshN], ['Ob', obN], ['Yenisey', yenN]].map(([nm, ll]) => `<path class="riv riv-main" data-river="${nm}" d="${linePath(ll)}"/>`).join('\n    ');

/* ---------- точки и подписи ---------- */
const PLACES = [
  ['Омск', OMSK, 'home'], ['Тобольск', [68.25, 58.2]], ['Ханты-Мансийск', [69.02, 61.0]], ['Сургут', [73.4, 61.25]],
  ['Салехард', [66.6, 66.53]], ['Красноярск', KRSK, 'left'],
];
const placeSvg = PLACES.map(([name, ll, kind]) => {
  const [x, y] = P(ll);
  const left = kind === 'left';
  return `<g class="place${kind && !left ? ' place-' + kind : ''}" transform="translate(${r1(x)} ${r1(y)})"><circle r="${kind === 'home' ? 7 : 4}"/><text x="${left ? -12 : 12}" y="5"${left ? ' text-anchor="end"' : ''}>${name}</text></g>`;
}).join('\n    ');
const LABELS = [
  ['omsk', 'Омская обл.', [73.6, 56.4]], ['tyumen', 'Тюменская обл.', [68.0, 57.4]], ['khmao', 'ХМАО — Югра', [70.5, 62.4]],
  ['yanao', 'ЯНАО', [72.5, 65.2]], ['tomsk', 'Томская обл.', [81.5, 58.6]], ['krsk', 'Красноярский край', [89.0, 64.5]],
  ['', 'Обская губа', [72.0, 69.7], 'water'], ['', 'Тазовская губа', [77.4, 68.4], 'water'], ['', 'Карское море', [69.5, 72.9], 'water'],
  ['', 'Иртыш', [71.6, 57.4], 'river'], ['', 'Обь', [76.8, 61.0], 'river'], ['', 'Енисей', [86.4, 62.5], 'river'],
];
const labelSvg = LABELS.map(([id, t, ll, kind]) => { const [x, y] = P(ll); return `<text class="lbl${kind ? ' lbl-' + kind : ''}"${id ? ` data-label="${id}"` : ''} x="${r1(x)}" y="${r1(y)}">${t}</text>`; }).join('\n    ');

const svg = `<svg class="logimap" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="logimap-title" data-logimap>
    <title id="logimap-title">Карта перевозок: Иртыш от Омска, Обь до Обской и Тазовской губ, Енисей — отдельное направление</title>
    <defs>
      <pattern id="ripple" width="46" height="18" patternUnits="userSpaceOnUse"><path class="ripple-line" d="M0 9c6-5 11-5 17 0s11 5 17 0 8-4 12-2"/></pattern>
      <clipPath id="map-clip"><rect width="${W}" height="${H}" rx="28"/></clipPath>
    </defs>
    <g clip-path="url(#map-clip)">
    <rect class="sea" width="${W}" height="${H}"/>
    <rect class="sea-ripple" width="${W}" height="${H}" fill="url(#ripple)" data-ripple/>
    <path class="land-far" d="${backdrop}"/>
    ${regionSvg}
    ${minorSvg}
    ${mainSvg}
    <g class="flows" data-flows>${[['Irtysh', irtyshN], ['Ob', obN], ['Yenisey', yenN]].map(([, ll]) => `<path class="flow-line" d="${linePath(ll)}"/>`).join('')}</g>
    ${routeSvg}
    ${labelSvg}
    ${placeSvg}
    <g class="convoys" data-convoys></g>
    </g>
  </svg>`;
writeFileSync(resolve(root, 'partials/logimap.html'), svg + '\n');
console.log('Карта:', Math.round(svg.length / 1024), 'КБ; Иртыш', irtyshRoute.length, 'точек, Обь', obRoute.length, ', Енисей', yenRoute.length);
