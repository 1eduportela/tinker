// Desplegable de secciones (debajo del banner del perfil y de la cabecera del proyecto).
// sections: [{ key, label, ic }]; onPick(key) se llama al elegir otra.
import { h } from '../core/dom.js';
import { onLeave } from '../core/state.js';
import { icon } from './icons.js';

export function sectionDropdown(current, onPick, sections) {
  const cur = sections.find(s => s.key === current);
  const menu = h('div', { class: 'dd-menu', hidden: true },
    ...sections.map(s => h('button', { class: 'dd-item' + (s.key === current ? ' active' : ''),
      onclick: () => { menu.hidden = true; if (s.key !== current) onPick(s.key); } }, icon(s.ic), s.label)));
  const btn = h('button', { class: 'dd-btn', onclick: e => { e.stopPropagation(); menu.hidden = !menu.hidden; } },
    icon(cur.ic), h('span', {}, cur.label), h('span', { class: 'chev' }, icon('chevron')));
  const close = () => (menu.hidden = true);
  document.addEventListener('click', close);
  onLeave(() => document.removeEventListener('click', close));
  return h('div', { class: 'dd' }, btn, menu);
}
