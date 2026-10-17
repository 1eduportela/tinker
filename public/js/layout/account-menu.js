// Menú de la cuenta (botón de abajo a la izquierda): perfil, editar, seguridad y cerrar sesión.
import { h } from '../core/dom.js';
import { session } from '../core/state.js';
import { openSecurity } from '../features/account/security-dialog.js';
import { openEditProfile } from '../features/profile/edit-profile.js';
import { avatar } from '../ui/avatar.js';
import { icon } from '../ui/icons.js';

export function openAccountMenu(anchor, logout) {
  if (document.querySelector('.acct-menu')) return document.querySelector('.acct-menu').remove();
  const close = () => { menu.remove(); document.removeEventListener('click', close); window.removeEventListener('hashchange', close); };
  const item = (ic, label, fn, cls = '') => h('button', { class: 'acct-item ' + cls, role: 'menuitem',
    onclick: () => { close(); fn(); } }, icon(ic), h('span', {}, label));
  const menu = h('div', { class: 'acct-menu', role: 'menu' },
    h('div', { class: 'acct-head' }, avatar(session.me, 'small'), h('div', {}, h('b', {}, session.me.displayName), h('small', { class: 'muted' }, '@' + session.me.username + (session.me.isAdmin ? ' · administrador' : '')))),
    item('user', 'Ver mi perfil', () => { location.hash = `#/u/${session.me.username}`; }),
    item('edit', 'Editar perfil', openEditProfile),
    item('shield', 'Cuenta y seguridad', openSecurity),
    h('div', { class: 'acct-sep' }),
    item('logout', 'Cerrar sesión', logout, 'danger'));
  const r = anchor.getBoundingClientRect();
  menu.style.left = `${Math.max(8, r.left)}px`;
  menu.style.bottom = `${innerHeight - r.top + 6}px`;
  document.body.append(menu);
  setTimeout(() => { document.addEventListener('click', close); window.addEventListener('hashchange', close); });
  menu.addEventListener('click', e => e.stopPropagation());
}
