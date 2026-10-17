// Ventanas: se cierran con la X, con Escape, pulsando fuera o al cambiar de página.
import { h } from '../core/dom.js';
import { icon } from './icons.js';

export function modal(content, cls = '', onClose) {
  const box = h('div', { class: `modal ${cls}` }, h('button', { class: 'icon-btn modal-x', title: 'Cerrar', onclick: () => close() }, icon('x')), content);
  const ov = h('div', { class: 'overlay' }, box);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  document.body.append(ov);
  document.body.classList.add('noscroll');
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    ov.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    if (!document.querySelector('.overlay')) document.body.classList.remove('noscroll');
    onClose && onClose();
  }
  return { close };
}
