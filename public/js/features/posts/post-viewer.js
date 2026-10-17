// Publicación abierta: carrusel arriba y toda la información debajo.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { avatar } from '../../ui/avatar.js';
import { carousel } from '../../ui/carousel.js';
import { icon } from '../../ui/icons.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function openPost(post, onDelete) {
  const media = post.media && post.media.length
    ? carousel(post.media)
    : h('div', { class: 'pm-media text' }, post.text);
  const m = modal(h('div', { class: 'pm' }, media,
    h('div', { class: 'pm-side' },
      h('div', { class: 'row pm-head' },
        h('a', { href: `#/u/${post.author.username}` }, avatar(post.author)),
        h('div', { style: 'min-width:0' },
          h('a', { href: `#/u/${post.author.username}`, class: 'name' }, post.author.displayName),
          h('div', { class: 'muted', style: 'font-size:13px' }, `@${post.author.username} · `,
            h('time', { title: new Date(post.createdAt).toLocaleString('es-ES') },
              new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })))),
        h('div', { class: 'spacer' }),
        (post.mine || post.canDelete) && h('button', { class: 'icon-btn', title: post.mine ? 'Borrar publicación' : 'Borrar publicación (moderación)', onclick: async () => {
          if (!confirm(post.mine ? '¿Borrar esta publicación?' : `Vas a borrar una publicación de @${post.author.username} como administrador. ¿Seguro?`)) return;
          try { await api('DELETE', `/api/posts/${post.id}`); m.close(); onDelete(); toast('Publicación borrada'); }
          catch (e) { toast(e.message); }
        } }, icon('trash'))),
      h('div', { class: 'pm-body' },
        post.title && h('h2', { class: 'pm-title' }, post.title),
        post.image && post.text && h('p', { class: 'pm-text' }, post.text),
        post.project && h('a', { href: `#/p/${post.project.id}/multimedia`, class: 'proj-btn' },
          icon('folder'), h('span', {}, post.project.name), h('span', { class: 'arrow' }, '→'))))), 'wide');
}
