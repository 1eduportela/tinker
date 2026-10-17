// Sección README del proyecto: se ve en Markdown y se edita con vista previa.
//   <ReadmeView project editing onEditingChange />  (el proyecto decide si se está editando)
import { useEffect, useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { markdown } from '../../core/markdown.js';
import { Icon } from '../../ui/Icon.jsx';
import { toast } from '../../ui/toast.jsx';

export function ReadmeView({ project, editing, setEditing }) {
  const [readme, setReadme] = useState(project.readme);
  if (!editing) {
    return (
      <section className="readme">
        <div className="readme-head"><Icon name="book" /><b>README.md</b><span className="spacer" />
          {project.mine && <button className="icon-btn" title="Editar README" onClick={() => setEditing(true)}><Icon name="edit" /></button>}
        </div>
        {readme.trim()
          ? <div className="md" dangerouslySetInnerHTML={{ __html: markdown(readme) }} />
          : <div className="md"><p className="muted">{project.mine
            ? 'Este proyecto todavía no tiene README. Cuenta de qué va, cómo está hecho y qué te falta.'
            : 'Este proyecto todavía no tiene README.'}</p></div>}
      </section>
    );
  }
  return <ReadmeEditor project={project} readme={readme} onDone={r => { if (r != null) { setReadme(r); project.readme = r; } setEditing(false); }} />;
}

function ReadmeEditor({ project, readme, onDone }) {
  const [mode, setMode] = useState('write');
  const [draft, setDraft] = useState(readme);
  const [busy, setBusy] = useState(false);
  const ta = useRef();
  useEffect(() => { if (mode === 'write') ta.current.focus(); }, [mode]);
  const save = async () => {
    setBusy(true);
    try { const r = (await api('PUT', `/api/projects/${project.id}`, { readme: draft })).project.readme; toast('README guardado'); onDone(r); }
    catch (e) { toast(e.message); setBusy(false); }
  };
  return (
    <section className="readme">
      <div className="readme-head"><Icon name="book" /><b>Editando README.md</b><span className="spacer" />
        <div className="seg" style={{ width: 240 }}>
          <button className={mode === 'write' ? 'active' : ''} onClick={() => setMode('write')}>Escribir</button>
          <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>Vista previa</button>
        </div>
      </div>
      <div className="readme-edit">
        <div>{mode === 'write'
          ? <textarea ref={ta} className="readme-ta" rows={18} spellCheck value={draft} onChange={e => setDraft(e.target.value)} />
          : <div className="md readme-preview" dangerouslySetInnerHTML={{ __html: markdown(draft) || '<p class="muted">Nada que mostrar todavía.</p>' }} />}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>Admite Markdown: # Títulos, **negrita**, *cursiva*, listas con -, `código` y [enlaces](https://…)</span>
          <span className="spacer" /><button className="btn ghost" onClick={() => onDone(null)}>Cancelar</button>
          <button className="btn" disabled={busy} onClick={save}>Guardar README</button>
        </div>
      </div>
    </section>
  );
}
