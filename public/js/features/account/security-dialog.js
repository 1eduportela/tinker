// Ventana "Cuenta y seguridad": cambiar contraseña, sesiones abiertas, espacio usado y borrar la cuenta.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { fmtSize, timeAgo } from '../../core/format.js';
import { rerender, session } from '../../core/state.js';
import { icon } from '../../ui/icons.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

function passwordHint(pw, username) {
  if (!pw) return '';
  if (pw.length < 8) return 'Mínimo 8 caracteres';
  if (username && username.length >= 3 && pw.toLowerCase().includes(username.toLowerCase())) return 'No puede contener tu usuario';
  let score = 0;
  if (pw.length >= 12) score++; if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++; if (/\d/.test(pw)) score++; if (/[^A-Za-z0-9]/.test(pw)) score++;
  return ['Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte', 'Muy fuerte'][score];
}
export async function openSecurity() {
  const body = h('div', { class: 'sec' }, h('div', { class: 'muted' }, 'Cargando…'));
  const m = modal(h('div', {}, h('h2', {}, 'Cuenta y seguridad'), body));
  async function paint() {
    let data;
    try { data = await api('GET', '/api/me/security'); } catch (e) { return body.replaceChildren(h('div', { class: 'error' }, e.message)); }
    // --- contraseña
    const cur = h('input', { type: 'password', autocomplete: 'current-password' });
    const next = h('input', { type: 'password', autocomplete: 'new-password' });
    const rep2 = h('input', { type: 'password', autocomplete: 'new-password' });
    const hint = h('small', { class: 'pw-hint muted' });
    next.oninput = () => { hint.textContent = passwordHint(next.value, session.me.username); };
    const pwBtn = h('button', { class: 'btn' }, 'Cambiar contraseña');
    pwBtn.onclick = async () => {
      if (next.value !== rep2.value) return toast('Las contraseñas nuevas no coinciden');
      pwBtn.disabled = true;
      try { await api('POST', '/api/me/password', { current: cur.value, next: next.value }); toast('Contraseña cambiada. Se han cerrado tus otras sesiones.'); paint(); }
      catch (e) { toast(e.message); }
      pwBtn.disabled = false;
    };
    // --- sesiones
    const others = data.sessions.filter(x => !x.current).length;
    const sessions = h('div', { class: 'sessions' }, ...data.sessions.map(x => h('div', { class: 'session' },
      h('span', { class: 'ficon' }, icon('monitor')),
      h('div', { class: 'session-txt' },
        h('b', {}, x.device, x.current && h('span', { class: 'tag' }, 'Este dispositivo')),
        h('small', { class: 'muted' }, `${x.ip || 'IP desconocida'} · último uso ${timeAgo(x.lastUsed)} · desde ${new Date(x.createdAt).toLocaleDateString('es-ES')}`)),
      !x.current && h('button', { class: 'btn ghost small', onclick: async () => {
        try { await api('DELETE', `/api/me/sessions/${x.id}`); toast('Sesión cerrada'); paint(); } catch (e) { toast(e.message); }
      } }, 'Cerrar'))));
    const closeAll = others && h('button', { class: 'btn ghost', onclick: async () => {
      try { const r = await api('POST', '/api/me/sessions/close-others'); toast(`${r.closed} sesión${r.closed === 1 ? '' : 'es'} cerrada${r.closed === 1 ? '' : 's'}`); paint(); }
      catch (e) { toast(e.message); }
    } }, 'Cerrar todas las demás');
    // --- borrar cuenta
    const delBtn = h('button', { class: 'btn danger' }, 'Borrar mi cuenta para siempre');
    delBtn.onclick = () => {
      const conf = h('input', { type: 'text', placeholder: session.me.username });
      const pw = h('input', { type: 'password', autocomplete: 'current-password' });
      const go = h('button', { class: 'btn danger' }, 'Sí, borrar todo');
      go.onclick = async () => {
        go.disabled = true;
        try { await api('DELETE', '/api/me', { confirm: conf.value, password: pw.value }); md.close(); m.close(); session.me = null; toast('Cuenta borrada'); location.hash = '#/'; rerender(); }
        catch (e) { toast(e.message); go.disabled = false; }
      };
      const md = modal(h('div', {}, h('h2', {}, '¿Borrar tu cuenta?'),
        h('p', {}, 'Se borrarán para siempre tu perfil, tus proyectos con sus archivos, tus publicaciones y tus mensajes. No se puede deshacer.'),
        h('label', {}, `Escribe tu usuario (${session.me.username}) para confirmar`), conf,
        h('label', {}, 'Tu contraseña'), pw,
        h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), h('button', { class: 'btn ghost', onclick: () => md.close() }, 'Cancelar'), go)));
    };
    body.replaceChildren(
      h('section', { class: 'sec-block' }, h('h3', {}, icon('key'), 'Cambiar contraseña'),
        h('label', {}, 'Contraseña actual'), cur,
        h('label', {}, 'Nueva contraseña'), next, hint,
        h('label', {}, 'Repite la nueva contraseña'), rep2,
        h('p', { class: 'muted small-note' }, 'Mínimo 8 caracteres, que no sea una contraseña típica ni contenga tu usuario. Al cambiarla se cierran tus otras sesiones.'),
        h('div', { class: 'row' }, h('div', { class: 'spacer' }), pwBtn)),
      h('section', { class: 'sec-block' }, h('h3', {}, icon('monitor'), `Sesiones abiertas (${data.sessions.length})`),
        h('p', { class: 'muted small-note' }, 'Si ves un dispositivo que no reconoces, ciérralo y cambia tu contraseña.'),
        sessions, closeAll && h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { class: 'spacer' }), closeAll)),
      h('section', { class: 'sec-block' }, h('h3', {}, icon('folder'), 'Tu espacio'),
        h('div', { class: 'quota' }, h('div', { class: 'quota-fill', style: `width:${Math.min(100, data.storage.used / data.storage.quota * 100).toFixed(1)}%` })),
        h('p', { class: 'muted small-note' }, `Usas ${fmtSize(data.storage.used)} de ${fmtSize(data.storage.quota)}. Hoy has subido ${fmtSize(data.storage.today)} de ${fmtSize(data.storage.dailyQuota)} permitidos al día.`)),
      h('section', { class: 'sec-block danger-zone' }, h('h3', {}, icon('trash'), 'Zona peligrosa'),
        h('p', { class: 'muted small-note' }, 'Borra tu cuenta y todo tu contenido de Tinker.'), delBtn));
  }
  paint();
}
