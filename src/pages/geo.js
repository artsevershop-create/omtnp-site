// География: 3D-пролёт по маршруту; без WebGL или при «уменьшить движение» — плоская схема.
import { $, reduced } from '../lib/core.js';
import { initMap } from './home.js';

export default async function geo() {
  const section = $('[data-geo3d]');
  let ok = false;
  if (!reduced) {
    const { initGeo3d } = await import('../scenes/geo3d.js');
    ok = initGeo3d(section);
  }
  if (!ok) {
    section.classList.add('is-flat');
    $('[data-geo-fallback]', section).hidden = false;
    initMap($('.map', section));
  }
}
