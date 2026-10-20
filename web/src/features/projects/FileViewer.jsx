// Visor de un archivo del proyecto: imagen, código con números de línea, Markdown, PDF o vídeo.
import { useEffect, useState } from 'react';
import { fmtSize } from '../../core/format.js';
import { markdown } from '../../core/markdown.js';
import { Icon } from '../../ui/Icon.jsx';
import { openModal } from '../../ui/modal.jsx';
import { IMG_EXT, TEXT_EXT, extOf } from './file-types.js';

export function openFileViewer(f) {
  openModal(() => <FileViewer f={f} />, 'viewer-modal');
}

function FileViewer({ f }) {
  const name = f.path.split('/').pop();
  const ext = extOf(name);
  return (
    <div className="viewer">
      <div className="viewer-head"><Icon name="file" /><b>{f.path}</b><span className="muted">{fmtSize(f.size)}</span></div>
      <div className="viewer-body"><Body f={f} name={name} ext={ext} /></div>
      <div className="row" style={{ marginTop: 14 }}><span className="spacer" />
        <a className="btn" href={`/api/files/${f.id}?as=download`}><Icon name="download" /> Descargar</a>
      </div>
    </div>
  );
}

function Body({ f, name, ext }) {
  const isText = TEXT_EXT.has(ext) && f.size <= 1024 * 1024;
  const [text, setText] = useState(null);   // null = cargando, false = error
  useEffect(() => {
    if (!isText) return;
    let alive = true;
    fetch(`/api/files/${f.id}?as=text`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(t => alive && setText(t), () => alive && setText(false));
    return () => { alive = false; };
  }, [f.id, isText]);

  if (IMG_EXT.has(ext)) return <img src={`/api/files/${f.id}`} alt={name} />;
  if (isText) {
    if (text === null) return <div className="muted">Cargando…</div>;
    if (text === false) return <div className="muted">No se pudo abrir el archivo.</div>;
    // El Markdown se convierte con nuestra función segura (escapa todo el HTML)
    if (ext === 'md' || ext === 'markdown') return <div className="md" dangerouslySetInnerHTML={{ __html: markdown(text) }} />;
    const lines = text.split('\n');
    return <pre className="code"><code>{lines.map((l, i) => (
      <span key={i} className="ln"><i>{i + 1}</i>{l + (i < lines.length - 1 ? '\n' : '')}</span>
    ))}</code></pre>;
  }
  if (ext === 'pdf') return <iframe className="pdf" src={`/api/files/${f.id}`} title={name} />;
  if (['mp4', 'webm'].includes(ext)) return <video src={`/api/files/${f.id}`} controls />;
  return <div className="viewer-none"><Icon name="file" />
    <p>Este tipo de archivo no se puede ver aquí.</p><p className="muted">Descárgalo para abrirlo con tu programa.</p></div>;
}
