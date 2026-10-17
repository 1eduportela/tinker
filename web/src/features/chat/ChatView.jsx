// Chat con una persona. Busca mensajes nuevos cada 3 segundos mientras está abierto.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { refreshUnread } from '../../layout/unread.js';
import { Avatar } from '../../ui/Avatar.jsx';
import { Icon } from '../../ui/Icon.jsx';
import { toast } from '../../ui/toast.jsx';

const when = ts => new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ChatView({ other }) {
  const [messages, setMessages] = useState(null);   // null = cargando
  const list = useRef(), input = useRef();
  const st = useRef({ last: 0, pending: null, stick: true, scroll: false });

  // Pide los mensajes nuevos (nunca dos peticiones a la vez)
  const fetchNew = () => st.current.pending ||= (async () => {
    try {
      const { messages: got } = await api('GET', `/api/messages/${encodeURIComponent(other.username)}?after=${st.current.last}`);
      if (got.length) {
        const el = list.current;
        const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 120 : true;
        st.current.scroll = nearBottom || st.current.stick;
        st.current.stick = false;
        st.current.last = got.at(-1).id;
        if (got.some(m => !m.mine)) refreshUnread();
      }
      setMessages(ms => got.length || !ms ? [...(ms || []), ...got] : ms);
    } catch {}
  })().finally(() => { st.current.pending = null; });

  useEffect(() => {
    let alive = true, timer;
    const loop = async () => { await fetchNew(); if (alive) timer = setTimeout(loop, 3000); };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [other.username]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al llegar mensajes, baja hasta el final si ya estabas abajo (o acabas de escribir)
  useLayoutEffect(() => {
    if (st.current.scroll && list.current) { list.current.scrollTop = list.current.scrollHeight; st.current.scroll = false; }
  }, [messages]);

  const autosize = () => { const el = input.current; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; };
  async function send() {
    const text = input.current.value.trim();
    if (!text) return;
    input.current.value = ''; autosize();
    try {
      await api('POST', `/api/messages/${encodeURIComponent(other.username)}`, { text });
      st.current.stick = true;
      await st.current.pending; await fetchNew();
    } catch (e) { toast(e.message); input.current.value = text; }
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <a href={`#/u/${other.username}`}><Avatar user={other} size="small" /></a>
        <div style={{ minWidth: 0 }}>
          <a href={`#/u/${other.username}`}><b>{other.displayName}</b></a>
          <div className="muted" style={{ fontSize: 13 }}>{'@' + other.username}</div>
        </div>
      </div>
      <div className="chat-msgs" ref={list}>
        {messages === null ? <div className="chat-empty">Cargando…</div>
          : !messages.length ? <div className="chat-empty">{`Aún no habéis hablado. ¡Saluda a ${other.displayName}!`}</div>
          : messages.map(m => (
            <div key={m.id} className={'msg' + (m.mine ? ' mine' : '')}><div>{m.text}</div><small>{when(m.createdAt)}</small></div>
          ))}
      </div>
      <form className="chat-form" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea ref={input} rows={1} maxLength={2000} placeholder={`Escribe a ${other.displayName}…`} onInput={autosize}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn" title="Enviar"><Icon name="send" /></button>
      </form>
    </div>
  );
}
