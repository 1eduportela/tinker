// Ventanas: se abren desde cualquier sitio y se cierran con la X, con Escape, pulsando fuera
// o al cambiar de página.
//   const m = openModal(close => <MiVentana onDone={close} />, 'wide')   ->   m.close()
// <ModalHost /> (en App) las pinta encima de todo.
import { useEffect } from 'react';
import { createStore, useStore } from '../core/store.js';
import { Icon } from './Icon.jsx';

const stack = createStore([]);
let nextId = 1;

export function openModal(render, cls = '', onClose) {
  const id = nextId++;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stack.set(list => list.filter(m => m.id !== id));
    onClose && onClose();
  };
  stack.set(list => [...list, { id, render, cls, close }]);
  return { close };
}

const closeAll = () => stack.get().forEach(m => m.close());

export function ModalHost() {
  const list = useStore(stack);
  useEffect(() => {
    document.body.classList.toggle('noscroll', list.length > 0);
  }, [list.length]);
  useEffect(() => {
    if (!list.length) return;
    const onKey = e => { if (e.key === 'Escape') list.at(-1).close(); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', closeAll);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', closeAll); };
  }, [list]);
  return list.map(m => (
    <div key={m.id} className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) m.close(); }}>
      <div className={`modal ${m.cls}`}>
        <button className="icon-btn modal-x" title="Cerrar" onClick={() => m.close()}><Icon name="x" /></button>
        {m.render(m.close)}
      </div>
    </div>
  ));
}
