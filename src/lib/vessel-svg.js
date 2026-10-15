// Боковой вид судна по реальным размерам: длина и высота борта из данных, надстройки — по типу судна.
// Масштаб: 10 единиц = 1 м по длине; по высоте корпус растянут в 1,6 раза, иначе 86-метровая баржа читается как линия.
import { TYPES } from '../data.js';

const S = 10;
const VZ = 1.6;
const num = (s) => parseFloat(String(s).replace(',', '.').split(/[–/ ]/)[0]);
const r = (n) => Math.round(n * 10) / 10;

/** Возвращает { svg, width, height }. dims — выносные размерные линии для чертежа. */
export function vesselSvg(v, { dims = false, cls = '' } = {}) {
  const shape = TYPES[v.type].shape;
  const oil = TYPES[v.type].group === 'oil';
  const W = v.length * S;
  const D = (num(v.height.split('/')[1] || 2.5) || 2.5) * S * VZ;
  const T = Math.min(num(v.draft) * S * VZ, D * .92);
  const top = shape === 'barge' ? 26 : shape === 'crane' ? 210 : 120; // место под надстройку
  const y0 = top;               // палуба
  const yk = y0 + D;            // днище
  const yw = yk - T;            // ватерлиния
  const parts = [];
  const hull = [];

  if (shape === 'barge') {
    hull.push(`M0 ${y0}H${W}L${W - 2.6 * S} ${yk}H${2.6 * S}Z`);
    if (oil) {
      parts.push(`<rect class="bp-part" x="${r(W * .06)}" y="${y0 - 7}" width="${r(W * .88)}" height="7"/>`);
      for (let i = 0; i < 6; i++) parts.push(`<rect class="bp-part" x="${r(W * (.12 + i * .14))}" y="${y0 - 15}" width="${r(W * .05)}" height="8" rx="2"/>`);
      parts.push(`<path class="bp-line" d="M${r(W * .04)} ${y0 - 18}H${r(W * .96)}"/>`);
    } else {
      for (let i = 0; i < 4; i++) parts.push(`<rect class="bp-part" x="${r(W * (.07 + i * .22))}" y="${y0 - 12}" width="${r(W * .19)}" height="12"/>`);
    }
  }

  if (shape === 'ship') {
    hull.push(`M0 ${y0 + 4}L${W * .9} ${y0}L${W} ${y0 - 10}L${W - 3.2 * S} ${yk}H${1.8 * S}L0 ${y0 + 12}Z`);
    const sx = W * .02, sw = W * .15;
    parts.push(`<path class="bp-part" d="M${r(sx)} ${y0}V${y0 - 26}H${r(sx + sw)}V${y0}M${r(sx + sw * .1)} ${y0 - 26}V${y0 - 50}H${r(sx + sw * .9)}V${y0 - 26}M${r(sx + sw * .05)} ${y0 - 50}V${y0 - 72}H${r(sx + sw)}V${y0 - 50}"/>`);
    parts.push(`<path class="bp-line" d="M${r(sx + sw * .5)} ${y0 - 72}V${y0 - 110}M${r(sx + sw * .3)} ${y0 - 96}H${r(sx + sw * .7)}"/>`);
    if (oil) {
      parts.push(`<path class="bp-line" d="M${r(W * .2)} ${y0 - 8}H${r(W * .94)}"/>`);
      for (let i = 0; i < 7; i++) parts.push(`<rect class="bp-part" x="${r(W * (.22 + i * .1))}" y="${y0 - 6}" width="${r(W * .04)}" height="6"/>`);
    } else {
      for (let i = 0; i < 4; i++) parts.push(`<rect class="bp-part" x="${r(W * (.21 + i * .18))}" y="${y0 - 12}" width="${r(W * .16)}" height="12"/>`);
    }
    parts.push(`<path class="bp-line" d="M${r(W * .97)} ${y0 - 10}V${y0 - 46}"/>`);
  }

  if (shape === 'tug') {
    const pusher = v.type === 'pusher';
    hull.push(pusher
      ? `M0 ${y0 + 6}L${W * .2} ${y0}H${W}V${yk - 4}L${W - S} ${yk}H${2 * S}L0 ${y0 + D * .55}Z`
      : `M0 ${y0 + 6}L${W * .2} ${y0}H${W * .85}L${W} ${y0 - 8}L${W - 3 * S} ${yk}H${2.4 * S}L0 ${y0 + D * .6}Z`);
    const a = W * .28, b = W * .72;
    parts.push(`<path class="bp-part" d="M${r(a)} ${y0}V${y0 - 24}H${r(b)}V${y0}"/>`);
    parts.push(`<path class="bp-part" d="M${r(a + (b - a) * .3)} ${y0 - 24}V${y0 - 50}H${r(b - (b - a) * .05)}V${y0 - 24}"/>`);
    parts.push(`<path class="bp-line" d="M${r(a + (b - a) * .32)} ${y0 - 44}H${r(b - (b - a) * .08)}"/>`);
    parts.push(`<path class="bp-line" d="M${r(a + (b - a) * .6)} ${y0 - 50}V${y0 - 100}M${r(a + (b - a) * .45)} ${y0 - 84}H${r(a + (b - a) * .75)}"/>`);
    parts.push(`<path class="bp-part" d="M${r(a + (b - a) * .12)} ${y0 - 24}V${y0 - 44}H${r(a + (b - a) * .24)}V${y0 - 24}"/>`);
    if (pusher) parts.push(`<path class="bp-line" d="M${W} ${y0}V${y0 - 18}M${W - 6} ${y0 - 18}H${W + 4}"/>`);
  }

  if (shape === 'crane') {
    hull.push(`M0 ${y0}H${W}L${W - 1.2 * S} ${yk}H${1.2 * S}Z`);
    const cx = W * .62;
    parts.push(`<path class="bp-part" d="M${r(cx - 30)} ${y0}V${y0 - 30}H${r(cx + 40)}V${y0}"/>`);
    parts.push(`<path class="bp-part" d="M${r(cx - 20)} ${y0 - 30}V${y0 - 62}H${r(cx + 34)}V${y0 - 30}"/>`);
    parts.push(`<path class="bp-line bp-boom" d="M${r(cx - 10)} ${y0 - 50}L${r(cx - W * .62)} ${y0 - 200}M${r(cx + 20)} ${y0 - 62}L${r(cx - W * .62)} ${y0 - 200}"/>`);
    parts.push(`<path class="bp-line" d="M${r(cx - W * .62)} ${y0 - 200}V${y0 - 70}M${r(cx - W * .62 - 6)} ${y0 - 70}h12"/>`);
  }

  const pad = dims ? 70 : 6;
  const vbH = yk + (dims ? 70 : 6);
  const dim = dims ? `
    <g class="bp-dims">
      <path class="bp-dim" d="M0 ${yk + 14}V${yk + 44}M${W} ${yk + 14}V${yk + 44}M0 ${yk + 34}H${W}"/>
      <path class="bp-dim" d="M8 ${yk + 29}L0 ${yk + 34}L8 ${yk + 39}M${W - 8} ${yk + 29}L${W} ${yk + 34}L${W - 8} ${yk + 39}"/>
      <text class="bp-label" x="${W / 2}" y="${yk + 62}" text-anchor="middle">L = ${String(v.length).replace('.', ',')} м</text>
      <path class="bp-dim" d="M${W + 18} ${yw}V${yk}M${W + 12} ${yw}H${W + 24}M${W + 12} ${yk}H${W + 24}"/>
      <text class="bp-label" x="${W + 30}" y="${(yw + yk) / 2 + 6}">T = ${v.draft} м</text>
    </g>` : '';

  const svg = `<svg class="vessel ${cls}" viewBox="${-pad / 2} 0 ${r(W + pad * (dims ? 2.4 : 1))} ${r(vbH)}" role="img" aria-label="${TYPES[v.type].label}, проект ${v.project}, длина ${String(v.length).replace('.', ',')} м">
    ${dims ? `<path class="bp-water" d="M${-pad / 2} ${yw}H${W + pad * 2}"/>` : ''}
    ${parts.join('')}
    <path class="bp-hull" d="${hull.join('')}"/>
    ${dim}
  </svg>`;
  return { svg, width: W, height: vbH };
}
