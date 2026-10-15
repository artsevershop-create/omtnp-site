// Флот: карточки типов, диаграмма, таблица с фильтром, масштабная линейка.
import { $, scrollToTarget } from '../lib/core.js';
import { renderBars, renderTable, renderScale, renderTypes } from '../lib/fleet-ui.js';

export default function fleet() {
  renderBars($('[data-bars]'));
  const apply = renderTable($('[data-chips]'), $('[data-fleet]'));
  renderScale($('[data-scale-rows]'));
  renderTypes($('[data-types]'), (group) => apply(group));
  // Ссылки вида /flot/#oil сразу открывают нужную группу в таблице
  const g = location.hash.slice(1);
  if (['oil', 'dry', 'tug'].includes(g)) {
    apply(g);
    setTimeout(() => scrollToTarget($('#table')), 500);
  }
}
