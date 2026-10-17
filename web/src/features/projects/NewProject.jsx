// Ventana "Nuevo proyecto".
import { useEffect, useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openNewProject(onCreate) {
  openModal(close => <NewProject close={close} onCreate={onCreate} />);
}

function NewProject({ close, onCreate }) {
  const name = useRef(), desc = useRef();
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setTimeout(() => name.current && name.current.focus(), 50); return () => clearTimeout(t); }, []);
  const create = async () => {
    if (!name.current.value.trim()) return toast('Ponle un nombre al proyecto');
    setBusy(true);
    try {
      const { project } = await api('POST', '/api/projects', { name: name.current.value, description: desc.current.value });
      close(); toast('Proyecto creado'); onCreate && onCreate(project);
      return;
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div>
      <h2>Nuevo proyecto</h2>
      <div className="muted">Cada proyecto es una carpeta donde irás guardando todo lo que hagas en él.</div>
      <label>Nombre</label>
      <input ref={name} type="text" maxLength={60} placeholder="Brazo robótico, Media maratón 2026…" />
      <label>Descripción</label>
      <textarea ref={desc} rows={3} maxLength={300} placeholder="De qué va, en una o dos frases (opcional)" />
      <div className="row" style={{ marginTop: 16 }}><div className="spacer" />
        <button className="btn" disabled={busy} onClick={create}>Crear proyecto</button>
      </div>
    </div>
  );
}
