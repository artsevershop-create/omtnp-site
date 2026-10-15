// Страница судна: чертёж прочерчивается линиями, размеры появляются следом, вода у ватерлинии бежит.
import { $, $$, gsap, reduced } from '../lib/core.js';

export default function vessel() {
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
