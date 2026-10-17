// Página de inicio: tus publicaciones y las de la gente que sigues.
// Para publicar se va al perfil (Nueva publicación, junto a Nuevo proyecto).
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { ctxSection, pageTitle, shell } from '../../layout/shell.js';
import { masonry } from '../posts/masonry.js';

export function feedPage() {
  const grid = masonry(
    async before => (await api('GET', `/api/feed?mode=following${before ? `&before=${before}` : ''}`)).posts,
    h('div', {}, 'Aún no hay nada por aquí. ', h('a', { href: '#/personas', class: 'accent' }, 'Sigue a gente'),
      ' o sube tu primer proyecto desde tu perfil.'));
  shell.context.replaceChildren(...ctxSection('Inicio', 'Tus proyectos y los de la gente que sigues.'));
  shell.content.replaceChildren(pageTitle('Inicio'), grid.el);
}
