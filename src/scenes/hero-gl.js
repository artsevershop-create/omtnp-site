// Первый экран: «живой» кадр с танкером на WebGL. Вода на реке рябит и бликует, камера медленно
// наезжает на танкер, курсор даёт лёгкий параллакс, прокрутка приближает. Сам танкер и берега не искажаются.
import { gsap } from '../lib/core.js';

// Танкер с буксиром на исходном кадре 1376×768: от кормы баржи до носа буксира
const IMG_W = 1376, IMG_H = 768;
// width — полоса, которую не трогает рябь; hull — полуширина корпуса, от неё начинается пена
const TANKER = { from: [405, 552], to: [935, 372], width: 92, hull: 34 };
const FOCUS = [(405 + 935) / 2 / IMG_W, (552 + 372) / 2 / IMG_H];

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uImg, uMask;
uniform vec2 uRes, uFocus, uShift, uA, uB;
uniform float uImgAspect, uZoom, uTime, uHull;

void main() {
  vec2 s = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  // «cover»: кадр заполняет экран без искажений
  float ca = uRes.x / uRes.y;
  vec2 hs = ca > uImgAspect ? vec2(0.5, 0.5 * uImgAspect / ca) : vec2(0.5 * ca / uImgAspect, 0.5);
  hs /= uZoom;
  // Центр кадра тянется к танкеру тем сильнее, чем ближе камера и уже экран
  vec2 c = mix(vec2(0.5), uFocus, clamp((uZoom - 1.0) * 3.0 + (1.0 - hs.x * 2.0), 0.0, 1.0));
  c = clamp(c + uShift, hs, 1.0 - hs);
  vec2 p = c + (s - 0.5) * hs * 2.0;

  float m = texture2D(uMask, p).r;
  float t = uTime;

  // Координаты относительно танкера: along — от кормы к носу, across — поперёк корпуса
  vec2 asp = vec2(uImgAspect, 1.0);
  vec2 ab = (uB - uA) * asp;
  float L = length(ab);
  vec2 dir = ab / L;
  vec2 q = (p - uA) * asp;
  float along = dot(q, dir);
  float across = dot(q, vec2(-dir.y, dir.x));
  float side = abs(across) - uHull;
  // Близость к судну: вода вокруг корпуса и за кормой «бежит» назад — судно идёт вперёд
  float near = exp(-max(side, 0.0) * 9.0) * smoothstep(-0.55, 0.0, along) * (1.0 - smoothstep(L, L + 0.08, along));

  // Рябь: общая по реке + поток вдоль корпуса
  vec2 d = vec2(
    sin(p.y * 150.0 + t * 1.7 + sin(p.x * 55.0 + t * 0.9) * 1.4),
    cos(p.x * 130.0 - t * 1.3 + p.y * 45.0)
  ) * 0.0022 * m;
  d += (dir / asp) * sin(along * 140.0 + t * 7.0 + across * 30.0) * 0.0035 * near * m;
  vec3 col = texture2D(uImg, p + d).rgb;

  // Блики на воде
  float g = sin(p.x * 230.0 + p.y * 95.0 - t * 2.1) * sin(p.y * 180.0 - t * 1.5 + p.x * 30.0);
  col += m * pow(max(g, 0.0), 10.0) * 0.18;

  // Пена: буруны у носа, полосы вдоль бортов, след за кормой — всё бежит от носа к корме
  float wake = 0.0;
  float flow = along * 95.0 + t * 6.5;
  if (side > 0.0) {
    float spread = 0.012 + max(L - along, 0.0) * 0.06;
    wake += pow(0.5 + 0.5 * sin(flow + side * 60.0), 14.0) * exp(-side / spread * 2.2) * step(0.0, along) * step(along, L + 0.01);
  }
  float stern = smoothstep(-0.45, 0.0, along) * (1.0 - step(0.0, along));
  wake += stern * exp(-abs(across) * 28.0) * pow(0.5 + 0.5 * sin(flow * 0.8 + abs(across) * 90.0), 8.0) * 0.9;
  float bow = exp(-length(q - ab) * 38.0) * (0.6 + 0.4 * sin(t * 9.0 + across * 200.0));
  wake += bow * step(0.0, side + uHull * 0.6);
  col = mix(col, vec3(0.93, 0.95, 0.97), clamp(wake * m * 0.55, 0.0, 0.6));
  // Мягкая виньетка
  vec2 v = s - 0.5;
  col *= 1.0 - dot(v, v) * 0.35;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Маска воды: тёмные холодные пиксели без насыщенного цвета; полоса танкера вычищена. */
function waterMask(img) {
  const k = .25, w = Math.round(IMG_W * k), h = Math.round(IMG_H * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), lum = (r + g + b) / 3;
    const water = b >= r - .015 && max - min < .16 && lum > .1 && lum < .52 ? 1 : 0;
    px[i] = px[i + 1] = px[i + 2] = water * 255;
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  // Танкер и буксир не трогаем
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineWidth = TANKER.width * k;
  ctx.beginPath();
  ctx.moveTo(TANKER.from[0] * k, TANKER.from[1] * k);
  ctx.lineTo(TANKER.to[0] * k, TANKER.to[1] * k);
  ctx.stroke();
  // Сглаживаем границы
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const o = out.getContext('2d');
  o.filter = 'blur(1.5px)';
  o.drawImage(c, 0, 0);
  return out;
}

function texture(gl, source, unit) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** getProgress — прогресс прокрутки первого экрана (0…1). Возвращает false, если WebGL недоступен. */
export async function initHeroGL(canvas, img, getProgress) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return false;
  // Ждём картинку опросом: событие load могло пройти раньше, чем сюда дошёл код
  await new Promise((r) => { const check = () => (img.complete && img.naturalWidth ? r() : setTimeout(check, 50)); check(); });

  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(sh)); return false; }
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  texture(gl, img, 0);
  texture(gl, waterMask(img), 1);
  const u = (n) => gl.getUniformLocation(prog, n);
  gl.uniform1i(u('uImg'), 0);
  gl.uniform1i(u('uMask'), 1);
  gl.uniform1f(u('uImgAspect'), IMG_W / IMG_H);
  gl.uniform2f(u('uFocus'), FOCUS[0], FOCUS[1]);
  gl.uniform2f(u('uA'), TANKER.from[0] / IMG_W, TANKER.from[1] / IMG_H);
  gl.uniform2f(u('uB'), TANKER.to[0] / IMG_W, TANKER.to[1] / IMG_H);
  gl.uniform1f(u('uHull'), TANKER.hull / IMG_H);
  const uRes = u('uRes'), uZoom = u('uZoom'), uTime = u('uTime'), uShift = u('uShift');

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    // На вертикальном экране весь танкер не помещается — держим в кадре буксир и нос
    const portrait = canvas.height > canvas.width;
    gl.uniform2f(u('uFocus'), portrait ? 820 / IMG_W : FOCUS[0], portrait ? 430 / IMG_H : FOCUS[1]);
  };
  resize();
  addEventListener('resize', resize);

  let mx = 0, my = 0, sx = 0, sy = 0, zoom = 1.04;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  gsap.ticker.add((time, dt) => {
    if (!visible) return;
    const k = 1 - Math.exp(-(dt / 1000) * 3);
    // Медленный «дыхательный» наезд + приближение при прокрутке
    const target = 1.05 + (1 - Math.cos(time * .12)) * .04 + getProgress() * .35;
    zoom += (target - zoom) * k;
    sx += (mx * .012 - sx) * k;
    sy += (my * .008 - sy) * k;
    gl.uniform1f(uZoom, zoom);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uShift, sx, sy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  canvas.classList.add('is-ready');
  return true;
}
