// Estructura fija de la web: menú lateral (siempre igual) y contenido a la derecha.
import { api } from '../core/api.js';
import { h } from '../core/dom.js';
import { rerender, session } from '../core/state.js';
import { avatar } from '../ui/avatar.js';
import { icon } from '../ui/icons.js';
import { openAccountMenu } from './account-menu.js';

export const root = document.getElementById('root');

// Partes de la estructura que las páginas rellenan: shell.context (opciones del menú lateral)
// y shell.content (la parte derecha). Las páginas no tocan nada más.
export const shell = {};

// Menú lateral fijo + contenido. Se construye una vez al iniciar sesión.
export function buildShell() {
  shell.nav = {};
  const navItem = (key, href, ic, label) =>
    (shell.nav[key] = h('a', { href, class: 'nav-item', title: label }, icon(ic), h('span', { class: 'lbl' }, label)));
  shell.context = h('div', { class: 'context' });
  shell.content = h('main', { class: 'content' });
  shell.mebox = h('div', { class: 'mebox' });
  shell.badge = h('span', { class: 'badge nav-badge', hidden: true });
  root.replaceChildren(
    h('aside', { class: 'sidebar' },
      h('a', { href: '#/', class: 'logo' }, h('span', { class: 'logo-mark' }, icon('wrench')),
        h('span', { class: 'lbl' }, 'Tinker', h('span', { class: 'logo-sub' }, 'cacharrando'))),
      h('nav', { class: 'mainnav' },
        navItem('feed', '#/', 'home', 'Inicio'),
        navItem('personas', '#/personas', 'users', 'Personas'),
        navItem('perfil', '#/', 'user', 'Mi perfil')),
      shell.context,
      h('div', { class: 'spacer-v' }),
      shell.mebox),
    shell.content);
}

// Número de mensajes sin leer junto a "Mi perfil"
export async function refreshUnread() {
  try {
    const { unread } = await api('GET', '/api/me');
    if (!shell.badge) return;
    shell.badge.textContent = unread;
    shell.badge.hidden = !unread;
    shell.badge.title = `${unread} mensaje${unread === 1 ? '' : 's'} sin leer`;
  } catch {}
}
export function startUnreadPolling() {
  setInterval(() => { if (session.me && shell.badge && !document.hidden) refreshUnread(); }, 15000);
}

// Botón de la cuenta (abajo a la izquierda) con su menú, y cerrar sesión
export function paintMe() {
  if (!shell.nav.perfil.contains(shell.badge)) shell.nav.perfil.append(shell.badge);
  shell.nav.perfil.href = `#/u/${session.me.username}`;
  refreshUnread();
  const logout = async () => { await api('POST', '/api/logout').catch(() => {}); session.me = null; location.hash = '#/'; rerender(); };
  const btn = h('button', { class: 'me-link', title: 'Tu cuenta', 'aria-haspopup': 'menu',
    onclick: e => { e.stopPropagation(); openAccountMenu(btn, logout); } },
    avatar(session.me, 'small'),
    h('span', { class: 'lbl' }, h('b', {}, session.me.displayName), h('small', { class: 'muted' }, '@' + session.me.username)),
    h('span', { class: 'lbl me-chev' }, icon('chevron')));
  shell.mebox.replaceChildren(btn,
    h('button', { class: 'icon-btn', title: 'Cerrar sesión', onclick: logout }, icon('logout')));
}

// Piezas para las opciones del menú lateral de cada página
export const ctxSection = (title, desc) => [h('div', { class: 'ctx-title' }, title), desc && h('p', { class: 'ctx-desc' }, desc)];
export const ctxButton = (ic, label, onclick, primary) =>
  h('button', { class: 'ctx-btn' + (primary ? ' primary' : ''), title: label, onclick }, icon(ic), h('span', { class: 'lbl' }, label));
export const pageTitle = (t) => h('h1', { class: 'page-title' }, t);
