// Ventana "Invitar a alguien": crear, ver y anular invitaciones de un solo uso.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { icon } from '../../ui/icons.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { if (input) { input.select(); document.execCommand && document.execCommand('copy'); toast('Selecciónalo y cópialo con Ctrl+C'); } }
}
export async function openInvites() {
  const box = h('div', {}, h('div', { class: 'muted' }, 'Cargando…'));
  const created = h('div');
  const m = modal(h('div', {},
    h('h2', {}, 'Invitar a alguien'),
    h('p', { class: 'muted' }, `Cada invitación sirve para una sola persona y caduca en 7 días. Así, si un código se filtra, no puede usarlo nadie más. Puedes tener hasta 5 sin usar.`),
    created, box));
  async function paint() {
    let data; try { data = await api('GET', '/api/invites'); } catch (e) { return box.replaceChildren(h('div', { class: 'error' }, e.message)); }
    const btn = h('button', { class: 'btn' }, icon('plus'), ' Crear invitación');
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const r = await api('POST', '/api/invites');
        const inp = h('input', { type: 'text', value: r.code, readonly: true, class: 'invite-code', onfocus: e => e.target.select() });
        created.replaceChildren(h('div', { class: 'invite-new' },
          h('div', { class: 'muted', style: 'font-size:13px' }, 'Pásale este código. Solo se muestra ahora:'),
          h('div', { class: 'row', style: 'margin-top:6px' }, inp, h('button', { class: 'btn ghost', onclick: () => copyText(r.code, inp) }, icon('copy'), ' Copiar')),
          h('small', { class: 'muted' }, `Caduca el ${new Date(r.expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`)));
        paint();
      } catch (e) { toast(e.message); btn.disabled = false; }
    };
    const label = { pending: 'Pendiente', used: 'Usada', expired: 'Caducada' };
    box.replaceChildren(
      h('div', { class: 'row', style: 'margin:6px 0 14px' }, h('div', { class: 'spacer' }), btn),
      data.invites.length ? h('div', { class: 'sessions' }, ...data.invites.map(x => h('div', { class: 'session' },
        h('span', { class: 'ficon' }, icon('mail')),
        h('div', { class: 'session-txt' },
          h('b', {}, `TNK-····-··${x.hint}`, h('span', { class: 'tag ' + x.status }, label[x.status])),
          h('small', { class: 'muted' }, x.status === 'used' ? `La usó @${x.usedBy || 'cuenta borrada'}` :
            x.status === 'pending' ? `Caduca el ${new Date(x.expiresAt).toLocaleDateString('es-ES')}` : `Caducó el ${new Date(x.expiresAt).toLocaleDateString('es-ES')}`)),
        x.status === 'pending' && h('button', { class: 'btn ghost small', onclick: async () => {
          try { await api('DELETE', `/api/invites/${x.id}`); toast('Invitación anulada'); paint(); } catch (e) { toast(e.message); }
        } }, 'Anular'))))
        : h('div', { class: 'muted' }, 'Aún no has creado ninguna invitación.'));
  }
  paint();
}
