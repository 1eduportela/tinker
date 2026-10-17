// Perfil: banner, desplegable de secciones (Bienvenida, Proyectos, Contacto) y su contenido.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { rerender } from '../../core/state.js';
import { ctxButton, ctxSection, shell } from '../../layout/shell.js';
import { avatar } from '../../ui/avatar.js';
import { sectionDropdown } from '../../ui/dropdown.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { chatView } from '../chat/chat-view.js';
import { inboxView } from '../chat/inbox-view.js';
import { followButton } from '../people/follow-button.js';
import { openComposer } from '../posts/composer.js';
import { masonry } from '../posts/masonry.js';
import { openNewProject } from '../projects/new-project.js';
import { projectsView } from '../projects/project-list.js';
import { openEditProfile } from './edit-profile.js';

const SECTIONS = [
  { key: 'bienvenida', label: 'Bienvenida', ic: 'user' },
  { key: 'proyectos', label: 'Proyectos', ic: 'folder' },
  { key: 'contacto', label: 'Contacto', ic: 'message' },
];

export async function profilePage(username, section) {
  if (!SECTIONS.some(s => s.key === section)) section = 'bienvenida';
  const { user, posts } = await api('GET', `/api/users/${encodeURIComponent(username)}`);
  const base = `#/u/${user.username}`;
  const followersEl = h('b', {}, user.followers);
  let grid = null;

  const banner = h('header', { class: 'banner' + (user.banner ? '' : ' no-img'),
    style: user.banner ? `background-image:url("${user.banner}")` : null },
    user.isMe && h('button', { class: 'banner-edit', onclick: openEditProfile }, icon('image'),
      h('span', {}, user.banner ? 'Cambiar banner' : 'Añadir banner')),
    h('div', { class: 'banner-info' }, avatar(user, 'big'),
      h('div', { style: 'min-width:0' },
        h('h1', {}, user.displayName),
        h('div', { class: 'handle' }, '@' + user.username),
        user.bio && h('div', { class: 'banner-bio' }, user.bio),
        user.invitedBy && h('div', { class: 'banner-inv' }, 'Invitado por ', h('a', { href: `#/u/${user.invitedBy}` }, '@' + user.invitedBy)),
        user.suspended && h('div', { class: 'banner-flag' }, 'Cuenta suspendida'),
        user.blockedByMe && h('div', { class: 'banner-flag' }, 'Has bloqueado a esta persona'),
        h('div', { class: 'banner-stats' },
          h('span', {}, h('b', {}, user.postCount), ' publicaciones'),
          h('span', {}, followersEl, ' seguidores'),
          h('span', {}, h('b', {}, user.followingCount), ' siguiendo')))));

  const body = h('div', { class: 'section-body' });
  shell.content.replaceChildren(banner,
    h('div', { class: 'toolbar' }, sectionDropdown(section, k => { location.hash = `${base}/${k}`; }, SECTIONS)),
    body);

  if (user.isMe) {
    shell.context.replaceChildren(
      ...ctxSection('Mi perfil', 'Así te ven los demás.'),
      ctxButton('plus', 'Nueva publicación', () => openComposer(p => {
        if (grid) grid.prepend(p); else location.hash = `${base}/bienvenida`;
      }), true),
      ctxButton('folder', 'Nuevo proyecto', () => openNewProject(() => {
        if (section === 'proyectos') rerender(); else location.hash = `${base}/proyectos`;
      })));
  } else {
    const fb = followButton(user, f => { followersEl.textContent = Number(followersEl.textContent) + (f ? 1 : -1); });
    fb.dataset.extra = ' ctx-btn'; fb.repaint();
    const blockBtn = ctxButton('ban', user.blockedByMe ? 'Desbloquear' : 'Bloquear', async () => {
      if (!user.blockedByMe && !confirm(`¿Bloquear a @${user.username}? No podrá escribirte, no verá tu perfil ni tus publicaciones, y dejaréis de seguiros.`)) return;
      try { const r = await api('POST', `/api/users/${user.username}/block`); toast(r.blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado'); rerender(); }
      catch (e) { toast(e.message); }
    });
    const modBtn = user.canModerate && ctxButton('flag', user.suspended ? 'Reactivar cuenta' : 'Suspender cuenta', async () => {
      if (!confirm(user.suspended ? `¿Reactivar la cuenta de @${user.username}?` : `¿Suspender la cuenta de @${user.username}? Se cerrarán sus sesiones, no podrá entrar y su contenido dejará de verse.`)) return;
      try { const r = await api('POST', `/api/admin/users/${user.username}/suspend`); toast(r.suspended ? 'Cuenta suspendida' : 'Cuenta reactivada'); rerender(); }
      catch (e) { toast(e.message); }
    });
    shell.context.replaceChildren(
      ...ctxSection('Perfil', `El espacio de ${user.displayName}.`),
      ...(user.blockedByMe || user.suspended ? [] : [fb]),
      ...(section !== 'contacto' && !user.blockedByMe && !user.suspended ? [ctxButton('message', 'Enviar mensaje', () => { location.hash = `${base}/contacto`; })] : []),
      blockBtn,
      ...(modBtn ? [h('div', { class: 'ctx-title', style: 'margin-top:6px' }, 'Administración'), modBtn] : []));
  }

  if (section === 'bienvenida') {
    const editLink = h('a', { href: '#', class: 'accent', onclick: e => { e.preventDefault(); openEditProfile(); } }, 'Escríbela ahora');
    body.append(h('section', { class: 'about' },
      h('h3', {}, 'Bienvenida'),
      user.about ? h('div', { class: 'about-text' }, user.about)
        : h('div', { class: 'muted' }, user.isMe ? ['Todavía no has escrito tu bienvenida. ', editLink]
          : `${user.displayName} todavía no ha escrito su bienvenida.`)));
    let first = posts;
    grid = masonry(async before => {
      if (!before && first) { const p = first; first = null; return p; }
      return (await api('GET', `/api/users/${encodeURIComponent(username)}?before=${before}`)).posts;
    }, user.isMe ? 'Todavía no has publicado nada. ¡Sube tu primer proyecto!' : 'Todavía no ha publicado nada.');
    body.append(h('h3', { class: 'sec-title' }, 'Publicaciones'), grid.el);
  } else if (section === 'proyectos') {
    body.append(await projectsView(user));
  } else {
    body.append(user.isMe ? await inboxView()
      : user.blockedByMe ? h('div', { class: 'about' }, h('h3', {}, 'Contacto'), h('div', { class: 'muted' }, 'Has bloqueado a esta persona. Desbloquéala para poder escribirle.'))
      : user.suspended ? h('div', { class: 'about' }, h('h3', {}, 'Contacto'), h('div', { class: 'muted' }, 'Esta cuenta está suspendida.'))
      : chatView(user));
  }
}
