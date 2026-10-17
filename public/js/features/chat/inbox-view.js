// Bandeja de mensajes (Contacto en tu propio perfil): conversaciones a la izquierda y chat a la derecha.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { avatar } from '../../ui/avatar.js';
import { chatView } from './chat-view.js';

export async function inboxView() {
  const { conversations } = await api('GET', '/api/conversations');
  if (!conversations.length) {
    return h('div', { class: 'about' }, h('h3', {}, 'Contacto'),
      h('div', { class: 'muted' }, 'Aquí verás tus conversaciones. Entra en el perfil de alguien, abre "Contacto" y escríbele.'));
  }
  let current = null, chatEl = null;
  const side = h('div', { class: 'convs' });
  const pane = h('div', { class: 'inbox-pane' });
  const paintSide = () => side.replaceChildren(...conversations.map(c =>
    h('button', { class: 'conv' + (current === c.user.username ? ' active' : ''), onclick: () => open(c) },
      avatar(c.user, 'small'),
      h('div', { class: 'conv-txt' }, h('b', {}, c.user.displayName),
        h('div', { class: 'last' }, (c.last.mine ? 'Tú: ' : '') + c.last.text)),
      c.unread ? h('span', { class: 'badge' }, c.unread) : null)));
  function open(c) {
    current = c.user.username; c.unread = 0;
    chatEl?.stop();
    chatEl = chatView(c.user);
    pane.replaceChildren(chatEl);
    paintSide();
  }
  open(conversations.find(c => c.unread) || conversations[0]);
  return h('div', { class: 'inbox' }, side, pane);
}
