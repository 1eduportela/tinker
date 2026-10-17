// Página de inicio: tus publicaciones y las de la gente que sigues.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { ctxButton, ctxSection, pageTitle, shell } from '../../layout/shell.js';
import { openComposer } from '../posts/composer.js';
import { masonry } from '../posts/masonry.js';

export function feedPage() {
  const grid = masonry(
    async before => (await api('GET', `/api/feed?mode=following${before ? `&before=${before}` : ''}`)).posts,
    h('div', {}, 'Aún no hay nada por aquí. ', h('a', { href: '#/personas', class: 'accent' }, 'Sigue a gente'),
      ' o sube tu primer proyecto.'));
  shell.context.replaceChildren(
    ...ctxSection('Inicio', 'Tus proyectos y los de la gente que sigues.'),
    ctxButton('plus', 'Nueva publicación', () => openComposer(p => grid.prepend(p)), true));
  shell.content.replaceChildren(pageTitle('Inicio'), grid.el);
}
