import '@fontsource/fira-sans-extra-condensed/cyrillic-500.css';
import '@fontsource/fira-sans-extra-condensed/cyrillic-600.css';
import '@fontsource/fira-sans-extra-condensed/cyrillic-700.css';
import '@fontsource/fira-sans-extra-condensed/latin-600.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/latin-500.css';
import '@fontsource/golos-text/latin-600.css';
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
  // Сбой анимации страницы не должен мешать остальному сайту
  try { if (load) await (await load()).default(); } catch (e) { console.error(e); }
  initMotion();
  ScrollTrigger.refresh();
});
