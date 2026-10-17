// Bandeja de mensajes (Contacto en tu propio perfil): conversaciones a la izquierda y chat a la derecha.
import { useState } from 'react';
import { api } from '../../core/api.js';
import { useLoad } from '../../core/useLoad.js';
import { Avatar } from '../../ui/Avatar.jsx';
import { ChatView } from './ChatView.jsx';

export function InboxView() {
  const { data, error } = useLoad(() => api('GET', '/api/conversations'), []);
  const [current, setCurrent] = useState(null);
  const [read, setRead] = useState(() => new Set());   // conversaciones abiertas: ya no cuentan como sin leer
  if (error) return <div className="empty">{error.message}</div>;
  if (!data) return null;
  const conversations = data.conversations;
  if (!conversations.length) {
    return <div className="about"><h3>Contacto</h3>
      <div className="muted">Aquí verás tus conversaciones. Entra en el perfil de alguien, abre "Contacto" y escríbele.</div></div>;
  }
  const open = current || (conversations.find(c => c.unread) || conversations[0]).user.username;
  const chosen = conversations.find(c => c.user.username === open);
  const pick = name => { setRead(r => new Set(r).add(open).add(name)); setCurrent(name); };

  return (
    <div className="inbox">
      <div className="convs">
        {conversations.map(c => {
          const unread = read.has(c.user.username) || c.user.username === open ? 0 : c.unread;
          return (
            <button key={c.user.username} className={'conv' + (open === c.user.username ? ' active' : '')} onClick={() => pick(c.user.username)}>
              <Avatar user={c.user} size="small" />
              <div className="conv-txt"><b>{c.user.displayName}</b>
                <div className="last">{(c.last.mine ? 'Tú: ' : '') + c.last.text}</div></div>
              {unread ? <span className="badge">{unread}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="inbox-pane"><ChatView key={open} other={chosen.user} /></div>
    </div>
  );
}
