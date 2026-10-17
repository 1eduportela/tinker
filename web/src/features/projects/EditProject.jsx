// Ventana "Editar proyecto": nombre y descripción.
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openEditProject(project, onSave) {
  openModal(close => <EditProject project={project} close={close} onSave={onSave} />);
}

function EditProject({ project, close, onSave }) {
  const name = useRef(), desc = useRef();
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api('PUT', `/api/projects/${project.id}`, { name: name.current.value, description: desc.current.value });
      close(); toast('Proyecto guardado'); onSave && onSave(r.project);
      return;
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div>
      <h2>Editar proyecto</h2>
      <label>Nombre</label>
      <input ref={name} type="text" maxLength={60} defaultValue={project.name} />
      <label>Descripción corta</label>
      <textarea ref={desc} rows={3} maxLength={300} defaultValue={project.description} />
      <div className="row" style={{ marginTop: 16 }}><div className="spacer" />
        <button className="btn" disabled={busy} onClick={save}>Guardar</button>
      </div>
    </div>
  );
}
