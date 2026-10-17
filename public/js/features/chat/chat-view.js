// Chat con una persona. Busca mensajes nuevos cada 3 segundos mientras está abierto.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { onLeave } from '../../core/state.js';
import { refreshUnread } from '../../layout/shell.js';
import { avatar } from '../../ui/avatar.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';

export function chatView(other) {
  const list = h('div', { class: 'chat-msgs' }, h('div', { class: 'chat-empty' }, 'Cargando…'));
  const input = h('textarea', { rows: 1, maxlength: 2000, placeholder: `Escribe a ${other.displayName}…` });
  let last = 0, loaded = false, alive = true, timer = null, pending = null, stick = true;
  const bubble = m => h('div', { class: 'msg' + (m.mine ? ' mine' : '') }, h('div', {}, m.text),
    h('small', {}, new Date(m.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
  const fetchNew = () => pending ||= (async () => {
    try {
      const { messages } = await api('GET', `/api/messages/${encodeURIComponent(other.username)}?after=${last}`);
      if (!alive) return;
      if (!loaded) {
        loaded = true;
        list.replaceChildren(messages.length ? '' : h('div', { class: 'chat-empty' }, `Aún no habéis hablado. ¡Saluda a ${other.displayName}!`));
      }
      if (messages.length) {
        list.querySelector('.chat-empty')?.remove();
        const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
        messages.forEach(m => list.append(bubble(m)));
        last = messages[messages.length - 1].id;
        if (nearBottom || stick) list.scrollTop = list.scrollHeight;
        stick = false;
        if (messages.some(m => !m.mine)) refreshUnread();
      }
    } catch {}
  })().finally(() => { pending = null; });
  const loop = async () => { await fetchNew(); if (alive) timer = setTimeout(loop, 3000); };
  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; autosize();
    try {
      await api('POST', `/api/messages/${encodeURIComponent(other.username)}`, { text });
      stick = true;
      await pending; await fetchNew();
    } catch (e) { toast(e.message); input.value = text; }
  }
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const stop = () => { alive = false; clearTimeout(timer); };
  onLeave(stop);
  loop();
  const el = h('div', { class: 'chat' },
    h('div', { class: 'chat-head' },
      h('a', { href: `#/u/${other.username}` }, avatar(other, 'small')),
      h('div', { style: 'min-width:0' }, h('a', { href: `#/u/${other.username}` }, h('b', {}, other.displayName)),
        h('div', { class: 'muted', style: 'font-size:13px' }, '@' + other.username))),
    list,
    h('form', { class: 'chat-form', onsubmit: e => { e.preventDefault(); send(); } },
      input, h('button', { class: 'btn', title: 'Enviar' }, icon('send'))));
  el.stop = stop;
  return el;
}
