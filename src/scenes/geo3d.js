// 3D-схема водных путей. Рельеф низкополигональный; реки, губы и море — «прорезаны» ниже уровня воды,
// поэтому вода сама проступает в долинах. Маршрут Омск → Обская губа прочерчивается, камера летит за прокруткой.
// Геометрия — та же схема, что на 2D-карте (520×640), без масштаба.
import * as THREE from 'three';
import { $, $$, gsap, ScrollTrigger, clamp01 } from '../lib/core.js';

const MAP_W = 520, MAP_H = 640, K = .1;
const toX = (px) => (px - MAP_W / 2) * K;
const toZ = (py) => (py - MAP_H / 2) * K;

const P = {
  sea: 'M0 0h520v120c-40 10-70 30-110 26s-60-30-100-26-60 34-100 30S140 110 100 118 30 140 0 130z',
  bays: ['M228 132c-6 40-4 80 4 118 4 20 2 40-6 58 14-8 22-30 24-56 2-40-4-82-8-120z', 'M262 150c10 22 30 40 58 52 20 8 30 22 34 40-14-6-28-18-44-24-28-12-44-40-48-68z'],
  rivers: [
    ['M226 304c-10 34-30 58-56 78-30 24-44 56-48 92-4 34-20 60-44 82', 13],
    ['M170 382c34 12 66 34 84 70 16 32 38 58 70 78', 9],
    ['M430 140c-6 50 0 100-14 150-12 46-8 96 6 146 12 42 10 90-6 134', 13],
    ['M226 304c4-30 6-60 6-90', 14],
  ],
  route: 'M78 556c22-26 38-52 42-84 4-38 20-68 50-90 26-20 46-44 56-78 8-26 8-54 4-86-4-36-2-62 2-86',
  taz: 'M232 214c30 4 56-2 86-6',
};

const POINTS = [
  { name: 'Омск', x: 78, y: 556, home: true },
  { name: 'Иртыш', x: 122, y: 474 },
  { name: 'Обь', x: 226, y: 304 },
  { name: 'Обская губа', x: 232, y: 214 },
  { name: 'Тазовская губа', x: 318, y: 208 },
  { name: 'Енисей', x: 424, y: 380 },
  { name: 'Карское море', x: 300, y: 60, sea: true },
];

/** Точки вдоль SVG-пути — через настоящий SVGPathElement браузера. */
function sample(d, step = 3) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  const len = path.getTotalLength();
  const pts = [];
  for (let s = 0; s <= len; s += step) { const p = path.getPointAtLength(s); pts.push([p.x, p.y]); }
  return pts;
}

/** Карта «где вода»: рисуем реки, губы и море на холсте, размываем — получаем плавные берега. */
function waterMask() {
  const c = document.createElement('canvas');
  c.width = MAP_W; c.height = MAP_H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fill(new Path2D(P.sea));
  P.bays.forEach((b) => { const p = new Path2D(b); ctx.fill(p); ctx.lineWidth = 6; ctx.stroke(p); });
  P.rivers.forEach(([d, w]) => { ctx.lineWidth = w; ctx.stroke(new Path2D(d)); });
  const data = ctx.getImageData(0, 0, MAP_W, MAP_H).data;
  return (px, py) => {
    const x = Math.min(MAP_W - 1, Math.max(0, Math.round(px))), y = Math.min(MAP_H - 1, Math.max(0, Math.round(py)));
    return data[(y * MAP_W + x) * 4] / 255;
  };
}

// Простой шум для рельефа
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.1, y * 2.1) * .28 + noise(x * 4.3, y * 4.3) * .17;

export function initGeo3d(section) {
  const canvas = $('[data-geo-canvas]', section);
  const labelsHost = $('[data-geo-labels]', section);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch { return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const BG = new THREE.Color('#0f1b30');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 26, 78);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 200);

  scene.add(new THREE.HemisphereLight('#b9c7da', '#0f1b30', 1.1));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(-20, 30, 10);
  scene.add(sun);

  // Рельеф
  const water = waterMask();
  const geo = new THREE.PlaneGeometry(90, 100, 240, 270);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  // Западно-Сибирская равнина: низкий рельеф, тайга и тундра; к югу (Омск) — чуть выше и суше
  const cLow = new THREE.Color('#1c2d4a'), cMid = new THREE.Color('#2b4166'), cHigh = new THREE.Color('#4a6189'), cBank = new THREE.Color('#3a5072');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const px = x / K + MAP_W / 2, py = z / K + MAP_H / 2;
    const inside = px >= 0 && px <= MAP_W && py >= 0 && py <= MAP_H;
    const w = inside ? water(px, py) : (py < 0 ? 1 : 0);
    const land = .22 + fbm(x * .12, z * .12) * .55 + clamp01((z + 10) / 40) * .25;
    const h = land * (1 - w) - w * .45;
    pos.setY(i, h);
    const t = clamp01((h - .2) / .8);
    const col = w > .3 ? cBank : t < .5 ? cLow.clone().lerp(cMid, t / .5) : cMid.clone().lerp(cHigh, (t - .5) / .5);
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95, metalness: 0 }));
  terrain.position.z = -2;
  scene.add(terrain);
  // Сдвиг рельефа учитываем в координатах карты
  const Z0 = -2;

  // Вода
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#4f8ad0', emissive: '#16355f', roughness: .55, metalness: 0 }));
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = .06;
  scene.add(waterMesh);

  // Маршрут
  const toV = ([px, py], y = .22) => new THREE.Vector3(toX(px), y, toZ(py) + Z0);
  const routeCurve = new THREE.CatmullRomCurve3(sample(P.route, 6).map((p) => toV(p)));
  const tazCurve = new THREE.CatmullRomCurve3(sample(P.taz, 6).map((p) => toV(p)));
  const routeMat = new THREE.MeshBasicMaterial({ color: '#e04a3c' });
  const route = new THREE.Mesh(new THREE.TubeGeometry(routeCurve, 400, .13, 8), routeMat);
  const taz = new THREE.Mesh(new THREE.TubeGeometry(tazCurve, 60, .09, 6), new THREE.MeshBasicMaterial({ color: '#e04a3c', transparent: true, opacity: .7 }));
  route.geometry.setDrawRange(0, 0);
  taz.geometry.setDrawRange(0, 0);
  scene.add(route, taz);
  const routeIdx = route.geometry.index.count, tazIdx = taz.geometry.index.count;

  // «Состав» — светящаяся точка идёт по маршруту
  const convoy = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  scene.add(convoy);

  // Точки и подписи
  const marks = POINTS.map((pt) => {
    const v = toV([pt.x, pt.y], pt.sea ? .3 : .25);
    if (!pt.sea) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(pt.home ? .32 : .2, pt.home ? .32 : .2, pt.home ? 1.6 : 1, 16), new THREE.MeshBasicMaterial({ color: pt.home ? '#e04a3c' : '#e8edf3' }));
      m.position.copy(v).setY(v.y + (pt.home ? .8 : .5));
      scene.add(m);
    }
    const el = document.createElement('span');
    el.className = 'geo3d-label' + (pt.home ? ' is-home' : '') + (pt.sea ? ' is-sea' : '');
    el.textContent = pt.name;
    labelsHost.append(el);
    return { v: v.clone().setY(v.y + (pt.home ? 1.9 : 1.3)), el };
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 40), new THREE.MeshBasicMaterial({ color: '#e04a3c', transparent: true, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(toV([78, 556], .3));
  scene.add(ring);

  // Камера: от Омска вдоль маршрута к губе, затем — общий план с Енисеем
  const omsk = toV([78, 556], 0), bay = toV([232, 214], 0), mid = routeCurve.getPoint(.5).setY(0);
  // На широком экране точка взгляда смещена влево — маршрут справа от текста.
  // На вертикальном экране камера по центру и выше, текст сверху.
  const KEYS = [];
  const buildKeys = (portrait) => {
    const s = portrait ? 0 : 1, up = portrait ? 1.7 : 1;
    scene.fog.near = 26 * up;
    scene.fog.far = 78 * up * (portrait ? 1.3 : 1);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    KEYS.length = 0;
    KEYS.push(
      { pos: omsk.clone().add(V(-10 * s, 13 * up, 16 * up)), look: omsk.clone().add(V(-5 * s, 0, -6)) },
      { pos: mid.clone().add(V(-14 * s, 15 * up, 15 * up)), look: mid.clone().add(V(-6 * s, 0, -6)) },
      { pos: bay.clone().add(V(-12 * s, 17 * up, 18 * up)), look: bay.clone().add(V(-4 * s, 0, -2)) },
      { pos: V(-4 * s + 4, 46 * up, 36 * up), look: V(-6 * s + 3, 0, -4) },
    );
  };
  buildKeys(canvas.clientWidth < canvas.clientHeight);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const curPos = KEYS[0].pos.clone(), curLook = KEYS[0].look.clone();
  const keyAt = (p) => {
    const f = clamp01(p) * (KEYS.length - 1);
    const i = Math.min(KEYS.length - 2, Math.floor(f));
    const t = f - i, s = t * t * (3 - 2 * t);
    camPos.lerpVectors(KEYS[i].pos, KEYS[i + 1].pos, s);
    camLook.lerpVectors(KEYS[i].look, KEYS[i + 1].look, s);
  };

  const legs = $$('[data-leg]', section);
  let progress = 0;
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=320%', pin: $('.geo3d-pin', section), scrub: true,
    onUpdate: (self) => {
      progress = self.progress;
      const leg = progress < .25 ? 0 : progress < .55 ? 1 : progress < .8 ? 2 : 3;
      legs.forEach((l, i) => l.classList.toggle('is-on', i === leg));
    },
  });
  legs[0]?.classList.add('is-on');

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 60 : 42;
    camera.updateProjectionMatrix();
    buildKeys(w < h);
  };
  resize();
  addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
  const tmp = new THREE.Vector3();
  let pointerX = 0, pointerY = 0;
  addEventListener('pointermove', (e) => { pointerX = e.clientX / innerWidth - .5; pointerY = e.clientY / innerHeight - .5; });

  gsap.ticker.add((time, dt) => {
    if (!visible) return;
    const k = 1 - Math.exp(-(dt / 1000) * 4);
    keyAt(progress);
    camPos.x += pointerX * 1.2; camPos.y -= pointerY * .8;
    curPos.lerp(camPos, k); curLook.lerp(camLook, k);
    camera.position.copy(curPos);
    camera.lookAt(curLook);

    const draw = clamp01(progress / .7);
    route.geometry.setDrawRange(0, Math.floor(routeIdx * draw / 3) * 3);
    taz.geometry.setDrawRange(0, Math.floor(tazIdx * clamp01((progress - .6) / .2) / 3) * 3);
    convoy.position.copy(routeCurve.getPoint(Math.max(.001, draw * ((time * .08) % 1)))).setY(.45);
    convoy.visible = draw > .05;
    const pulse = (time * .8) % 1;
    ring.scale.setScalar(1 + pulse * 2.4);
    ring.material.opacity = 1 - pulse;

    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    marks.forEach(({ v, el }) => {
      tmp.copy(v).project(camera);
      const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      el.style.opacity = on ? 1 : 0;
      el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  });
  return true;
}
