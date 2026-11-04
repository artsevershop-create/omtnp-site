// Флот: карточки типов, диаграмма, таблица с фильтром, масштабная линейка.
import { $, scrollToTarget } from '../lib/core.js';
import { animateBars, initTable, animateScale, initTypes } from '../lib/fleet-ui.js';

export default function fleet() {
  animateBars($('[data-bars]'));
  const apply = initTable($('[data-chips]'), $('[data-fleet]'));
  animateScale($('[data-scale-rows]'));
  initTypes($('[data-types]'), (group) => apply(group));
  // Ссылки вида /flot/#oil сразу открывают нужную группу в таблице
  const g = location.hash.slice(1);
  if (['oil', 'dry', 'tug'].includes(g)) {
    apply(g);
    setTimeout(() => scrollToTarget($('#table')), 500);
  }
}
