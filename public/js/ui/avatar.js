// Foto de perfil, o la inicial sobre un color fijo para cada persona si no tiene.
import { h } from '../core/dom.js';

function colorFor(name) {
  let n = 0; for (const c of name) n = (n * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${n} 55% 48%)`;
}
export function avatar(u, size = '') {
  if (u.avatar) return h('img', { class: `avatar ${size}`, src: u.avatar, alt: '' });
  return h('div', { class: `avatar ${size}`, style: `background:${colorFor(u.username)}` },
    (u.displayName || u.username)[0].toUpperCase());
}
