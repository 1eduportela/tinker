// Página Personas: buscar gente, seguirla e invitar a alguien nuevo.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { ctxButton, ctxSection, pageTitle, shell } from '../../layout/shell.js';
import { avatar } from '../../ui/avatar.js';
import { icon } from '../../ui/icons.js';
import { openInvites } from '../account/invites-dialog.js';
import { followButton } from './follow-button.js';

export async function peoplePage() {
  const { users } = await api('GET', '/api/users');
  let q = '', filter = 'all';
  const list = h('div', { class: 'people' });
  const paint = () => {
    const f = users.filter(u => (filter === 'all' || u.following) &&
      (u.displayName + ' ' + u.username).toLowerCase().includes(q));
    list.replaceChildren(...(f.length ? f.map(u => h('a', { href: `#/u/${u.username}`, class: 'person' },
      avatar(u), h('b', {}, u.displayName), h('span', { class: 'muted' }, '@' + u.username),
      h('p', {}, u.bio || ''),
      u.suspended ? h('span', { class: 'tag expired' }, 'Suspendida') : u.isMe ? h('span', { class: 'btn ghost' }, 'Tú') : followButton(u))) :
      [h('div', { class: 'empty', style: 'grid-column:1/-1' }, filter === 'following' && !q ? 'Todavía no sigues a nadie.' : 'No hay nadie con ese nombre.')]));
  };
  const search = h('input', { type: 'text', placeholder: 'Buscar personas…', oninput: e => { q = e.target.value.toLowerCase().trim(); paint(); } });
  const seg = h('div', { class: 'seg' });
  const paintSeg = () => seg.replaceChildren(
    h('button', { class: filter === 'all' ? 'active' : '', onclick: () => { filter = 'all'; paintSeg(); paint(); } }, 'Todos'),
    h('button', { class: filter === 'following' ? 'active' : '', onclick: () => { filter = 'following'; paintSeg(); paint(); } }, 'Que sigo'));
  paintSeg(); paint();
  shell.context.replaceChildren(
    ...ctxSection('Personas', 'Sigue a gente para ver sus proyectos en tu inicio.'),
    ctxButton('mail', 'Invitar a alguien', openInvites, true),
    h('div', { class: 'ctx-search' }, icon('search'), search), seg);
  shell.content.replaceChildren(pageTitle('Personas'), list);
}
