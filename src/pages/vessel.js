// Страница судна: чертёж прочерчивается линиями, размеры появляются следом, вода у ватерлинии бежит.
import { $, $$, gsap, reduced } from '../lib/core.js';

const FLAP_CHARS = 'АБВГДКМОПРСТУ0123456789-.';

/** Табло (механика split-flap из 21st.dev, перенесена на чистый JS): буквы перебираются и встают на место. */
function initFlap(el) {
  if (!el) return;
  const target = [...el.dataset.flap.toUpperCase()];
  el.innerHTML = target.map((c) => `<span class="flap-cell${c === ' ' ? ' is-gap' : ''}"><b>${c === ' ' ? '&nbsp;' : c}</b></span>`).join('');
  if (reduced) return;
  $$('.flap-cell:not(.is-gap)', el).forEach((cell, i) => {
    const b = $('b', cell);
    const final = b.textContent;
    let n = 10 + i * 3;
    b.textContent = ' ';
    const step = () => {
      const last = --n <= 0;
      b.textContent = last ? final : FLAP_CHARS[(Math.random() * FLAP_CHARS.length) | 0];
      cell.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-70deg)', offset: .45 }, { transform: 'rotateX(0deg)' }], { duration: 120, easing: 'ease-out' });
      if (!last) setTimeout(step, 55);
    };
    setTimeout(step, 700 + i * 40);
  });
}

export default function vessel() {
  initFlap($('[data-flap]'));
  const frame = $('[data-blueprint]');
  if (!frame || reduced) return;
  const lines = $$('.bp-hull, .bp-part, .bp-line', frame);
  lines.forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 400;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
  });
  const dims = $$('.bp-dim', frame);
  dims.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
  gsap.timeline({ delay: .9 })
    .to(lines, { strokeDashoffset: 0, duration: 1.6, stagger: .04, ease: 'power2.inOut' })
    .to(lines, { fillOpacity: 1, duration: .8, ease: 'power1.out' }, '-=.4')
    .to(dims, { strokeDashoffset: 0, duration: .8, stagger: .1, ease: 'power2.out' }, '-=.6')
    .from($$('.bp-label', frame), { opacity: 0, y: 8, duration: .5, stagger: .1 }, '-=.3');
  const water = $('.bp-water', frame);
  if (water) gsap.to(water, { strokeDashoffset: -60, duration: 2, repeat: -1, ease: 'none' });
  // Судно слегка покачивается на воде
  gsap.to($$('.bp-hull, .bp-part, .bp-line', frame), { y: 2, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 3 });
}
