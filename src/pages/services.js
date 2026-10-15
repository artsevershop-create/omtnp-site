// Перевозки: анимированные иллюстрации трёх услуг и сцена рейса.
import { $, $$, gsap, reduced } from '../lib/core.js';
import { initVoyage } from '../scenes/voyage.js';

export default function services() {
  initVoyage($('[data-voyage]'));
  if (reduced) return;
  $$('[data-art]').forEach((art) => {
    const tl = ART[art.dataset.art]?.(art);
    if (!tl) return;
    tl.pause();
    // Иллюстрация «оживает», только когда видна
    new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: .2 }).observe(art);
    gsap.from(art, { scale: .92, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: art, start: 'top 85%' } });
  });
}

const waves = (art) => gsap.to($$('[data-wave]', art), { x: -40, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });

const ART = {
  // Баржа покачивается, капля падает, отсеки по очереди наполняются
  oil(art) {
    waves(art);
    gsap.to($('[data-float]', art), { y: 4, rotation: .6, transformOrigin: '50% 100%', duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    const fills = $$('[data-fill] rect', art);
    gsap.set(fills, { scaleY: 0, transformOrigin: '50% 100%' });
    return gsap.timeline({ repeat: -1, repeatDelay: .6 })
      .fromTo($('[data-drop]', art), { y: -30, opacity: 0 }, { y: 70, opacity: 1, duration: .8, ease: 'power2.in' })
      .to($('[data-drop]', art), { opacity: 0, duration: .15 })
      .to(fills, { scaleY: 1, duration: 1.1, stagger: .35, ease: 'power2.inOut' }, '-=.1')
      .to(fills, { scaleY: 0, duration: .8, stagger: .1, ease: 'power2.in' }, '+=1.2');
  },
  // Стрела крана поворачивается, гак опускается к барже
  dry(art) {
    waves(art);
    const hook = $('[data-hook]', art), rope = $('[data-rope]', art);
    const pos = { y: 100 };
    const draw = () => { rope.setAttribute('d', `M300 70V${pos.y}`); hook.setAttribute('y', pos.y); };
    draw();
    return gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: .4 })
      .to($('[data-boom]', art), { rotation: 7, svgOrigin: '92 170', duration: 2.2, ease: 'sine.inOut' })
      .to(pos, { y: 150, duration: 1.4, ease: 'power2.inOut', onUpdate: draw }, '-=.6');
  },
  // Цистерна подходит, по трубе идёт продукт, баржа принимает груз
  rail(art) {
    waves(art);
    const pipe = $('[data-pipe]', art), flow = $('[data-pipe-flow]', art);
    const len = pipe.getTotalLength();
    gsap.set(pipe, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(flow, { strokeDashoffset: -40, duration: .6, repeat: -1, ease: 'none' });
    return gsap.timeline({ repeat: -1, repeatDelay: 1 })
      .fromTo($('[data-train]', art), { x: -200 }, { x: 0, duration: 2, ease: 'power3.out' })
      .to(pipe, { strokeDashoffset: 0, duration: .8, ease: 'power2.inOut' })
      .fromTo(flow, { opacity: 0 }, { opacity: 1, duration: .2 })
      .to({}, { duration: 2.4 })
      .to(flow, { opacity: 0, duration: .2 })
      .to(pipe, { strokeDashoffset: len, duration: .6 })
      .to($('[data-train]', art), { x: -220, duration: 1.4, ease: 'power3.in' });
  },
};
