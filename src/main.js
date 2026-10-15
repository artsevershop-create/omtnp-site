import './styles.css';
import './pages.css';
import 'lenis/dist/lenis.css';
import { initCore, initMotion, ScrollTrigger } from './lib/core.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  services: () => import('./pages/services.js'),
  fleet: () => import('./pages/fleet.js'),
  vessel: () => import('./pages/vessel.js'),
  geo: () => import('./pages/geo.js'),
};

initCore();

document.fonts.ready.then(async () => {
  const load = PAGES[document.body.dataset.page];
  if (load) await (await load()).default();
  initMotion();
  ScrollTrigger.refresh();
});
