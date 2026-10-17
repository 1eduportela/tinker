// Ventana "Editar perfil": banner, foto, nombre, frase y bienvenida.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { rerender, session } from '../../core/state.js';
import { pickImage } from '../../media/images.js';
import { avatar } from '../../ui/avatar.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function openEditProfile() {
  let newAvatar = null, newBanner = null, removeBanner = false;
  const name = h('input', { type: 'text', value: session.me.displayName, maxlength: 40 });
  const bio = h('input', { type: 'text', value: session.me.bio, maxlength: 200, placeholder: 'Ingeniero mecánico, ciclista, maker…' });
  const about = h('textarea', { rows: 6, maxlength: 3000,
    placeholder: 'Preséntate: quién eres, a qué te dedicas, qué te gusta cacharrear…' }, session.me.about);
  const bannerBox = h('div', { class: 'banner-pick' });
  const paintBanner = () => {
    const src = newBanner || (!removeBanner && session.me.banner);
    bannerBox.style.backgroundImage = src ? `url("${src}")` : '';
    bannerBox.replaceChildren(
      h('button', { class: 'btn ghost', type: 'button', onclick: () => pickImage(d => { newBanner = d; removeBanner = false; paintBanner(); }, 2400) },
        src ? 'Cambiar banner' : 'Añadir banner'),
      src && h('button', { class: 'btn ghost', type: 'button', onclick: () => { newBanner = null; removeBanner = true; paintBanner(); } }, 'Quitar'));
  };
  paintBanner();
  const av = h('div', {}, avatar(session.me, 'big'));
  const save = h('button', { class: 'btn' }, 'Guardar');
  save.onclick = async () => {
    save.disabled = true;
    try {
      session.me = (await api('PUT', '/api/me', { displayName: name.value, bio: bio.value, about: about.value,
        avatar: newAvatar, banner: newBanner, removeBanner })).user;
      m.close(); toast('Perfil guardado'); rerender();
    } catch (e) { toast(e.message); }
    save.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Editar perfil'),
    h('label', {}, 'Banner'), bannerBox,
    h('label', {}, 'Foto de perfil'),
    h('div', { class: 'avatar-edit' }, av, h('button', { class: 'btn ghost', onclick: () => pickImage(d => {
      newAvatar = d; av.replaceChildren(h('img', { class: 'avatar big', src: d }));
    }) }, 'Cambiar foto')),
    h('label', {}, 'Nombre visible'), name,
    h('label', {}, 'Frase corta (sale en el banner)'), bio,
    h('label', {}, 'Bienvenida'), about,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), save)));
}
