// Сцена «Как проходит рейс»: налив → ход по реке → слив на берег. Идёт за прокруткой.
import { $, $$, gsap, reduced } from '../lib/core.js';

export function initVoyage(section) {
  const steps = $$('[data-step]', section);
  const setStep = (i) => steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
  setStep(0);
  if (reduced) { setStep(-1); steps.forEach((s) => s.classList.add('is-on')); return; }

  const convoy = $('[data-convoy]', section), hull = $('[data-hull]', section);
  const hose = $('[data-hose]', section), flow = $('[data-flow]', section);
  const load = $('[data-load]', section), loadFlow = $('[data-load-flow]', section);
  const scene = $('[data-scene]', section);
  const hoseLen = hose.getTotalLength();
  gsap.set(hose, { strokeDasharray: hoseLen, strokeDashoffset: hoseLen });
  gsap.set(convoy, { x: -620 });
  gsap.set(hull, { y: -12 });
  gsap.set($$('[data-tank]', section), { scaleY: 0, transformOrigin: '50% 100%' });

  // На узком экране сцена шире окна: «камера» едет за составом
  const pan = () => Math.max(0, scene.getBoundingClientRect().width - innerWidth);
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: '+=260%', pin: $('.voyage-pin', section), scrub: 1, invalidateOnRefresh: true,
      onUpdate: (self) => setStep(self.progress < .3 ? 0 : self.progress < .68 ? 1 : 2),
    },
  })
    .to(hull, { y: 0, duration: 1 })
    .to([load, loadFlow], { opacity: 0, duration: .2 })
    .to(scene, { x: () => -pan(), duration: 2.6, ease: 'power1.inOut' }, '<')
    .to(convoy, { x: 0, duration: 2, ease: 'power1.inOut' }, '<')
    .to($('[data-waves]', section), { x: -120, duration: 2 }, '<')
    .to(hose, { strokeDashoffset: 0, duration: .5 })
    .to(flow, { opacity: 1, duration: .1 })
    .to($$('[data-tank]', section), { scaleY: .82, duration: 1.4, stagger: .2 })
    .to(hull, { y: -12, duration: 1.4 }, '<');
  gsap.to([flow, loadFlow], { strokeDashoffset: -40, duration: .6, repeat: -1, ease: 'none' });
}
