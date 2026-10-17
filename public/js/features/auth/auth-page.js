// Pantalla de acceso: entrar o crear cuenta (con código de invitación).
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { rerender, session } from '../../core/state.js';
import { icon } from '../../ui/icons.js';

export function authView() {
  let mode = 'login';
  const err = h('div', { class: 'error' });
  const fields = {
    username: h('input', { type: 'text', autocomplete: 'username', maxlength: 20 }),
    displayName: h('input', { type: 'text', maxlength: 40 }),
    password: h('input', { type: 'password', autocomplete: 'current-password', maxlength: 200 }),
    invite: h('input', { type: 'text', placeholder: 'TNK-XXXX-XXXX', autocomplete: 'off', spellcheck: false }),
  };
  const extra = h('div', {}, h('label', {}, 'Nombre visible'), fields.displayName,
    h('label', {}, 'Código de invitación'), fields.invite);
  const submit = h('button', { class: 'btn', style: 'width:100%;margin-top:16px' });
  const seg = h('div', { class: 'seg' });
  const paint = () => {
    seg.replaceChildren(
      h('button', { type: 'button', class: mode === 'login' ? 'active' : '', onclick: () => { mode = 'login'; paint(); } }, 'Entrar'),
      h('button', { type: 'button', class: mode === 'register' ? 'active' : '', onclick: () => { mode = 'register'; paint(); } }, 'Crear cuenta'));
    extra.hidden = mode === 'login';
    submit.textContent = mode === 'login' ? 'Entrar' : 'Crear cuenta';
    err.textContent = '';
  };
  paint();
  const form = h('form', { onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = ''; submit.disabled = true;
    const body = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.value]));
    try { session.me = (await api('POST', mode === 'login' ? '/api/login' : '/api/register', body)).user; location.hash = '#/'; rerender(); }
    catch (e) { err.textContent = e.message; }
    submit.disabled = false;
  } }, seg, h('label', {}, 'Usuario'), fields.username, h('label', {}, 'Contraseña'), fields.password, extra, submit, err);
  return h('div', { class: 'auth' },
    h('div', { class: 'auth-logo' }, h('span', { class: 'logo-mark' }, icon('wrench')), 'Tinker'),
    h('p', { class: 'lead' }, 'Cacharrando: proyectos de ingeniería, deporte y lo que se te ocurra.'), form);
}
