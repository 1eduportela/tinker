// Ventana "Nueva publicación": fotos y vídeos (carrusel), título, descripción y proyecto.
//   openComposer(post => ..., idDelProyecto?)
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { fmtDuration } from '../../core/format.js';
import { getMe } from '../../core/session.js';
import { imageToBlob } from '../../media/images.js';
import { uploadMedia } from '../../media/upload.js';
import { videoInfo } from '../../media/video.js';
import { Icon } from '../../ui/Icon.jsx';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';
import { openNewProject } from '../projects/NewProject.jsx';

const MAX_MEDIA = 10;
const MAX_VIDEO_MB = 300;

export async function openComposer(onPost, presetProjectId) {
  let projects;
  try { projects = (await api('GET', `/api/users/${encodeURIComponent(getMe().username)}/projects`)).projects; }
  catch (e) { return toast(e.message); }
  if (!projects.length) {
    openModal(close => (
      <div>
        <h2>Primero, un proyecto</h2>
        <p className="muted">En Tinker cada publicación pertenece a un proyecto. Crea uno y luego sube tus fotos o vídeos.</p>
        <div className="row" style={{ marginTop: 16 }}><div className="spacer" />
          <button className="btn" onClick={() => { close(); openNewProject(p => openComposer(onPost, p.id)); }}>Crear proyecto</button>
        </div>
      </div>
    ));
    return;
  }
  openModal(close => <Composer projects={projects} presetProjectId={presetProjectId} close={close} onPost={onPost} />);
}

function Composer({ projects, presetProjectId, close, onPost }) {
  const [items, setItems] = useState([]);   // { kind, blob, preview, width, height, duration, poster }
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);   // { label, pct }
  const [over, setOver] = useState(false);
  const picker = useRef(), project = useRef(), title = useRef(), text = useRef();
  const count = useRef(0); count.current = items.length;

  async function add(files) {
    files = [...files].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return toast('Elige fotos o vídeos');
    const room = MAX_MEDIA - count.current;
    if (files.length > room) toast(`Máximo ${MAX_MEDIA} por publicación: se añaden ${Math.max(room, 0)}`);
    for (const f of files.slice(0, Math.max(room, 0))) {
      try {
        if (f.type.startsWith('video/')) {
          if (f.size > MAX_VIDEO_MB * 1024 * 1024) { toast(`"${f.name}" pasa de ${MAX_VIDEO_MB} MB`); continue; }
          const info = await videoInfo(f);
          setItems(it => [...it, { kind: 'video', blob: f, preview: info.poster ? info.poster.url : null, video: info.preview,
            width: info.width, height: info.height, duration: info.duration, poster: info.poster && info.poster.blob }]);
        } else {
          const r = await imageToBlob(f);
          setItems(it => [...it, { kind: 'image', blob: r.blob, preview: r.preview, width: r.width, height: r.height }]);
        }
      } catch (e) { toast(e.message); }
    }
  }
  const move = (k, d) => setItems(it => {
    const j = k + d; if (j < 0 || j >= it.length) return it;
    const c = [...it]; [c[k], c[j]] = [c[j], c[k]]; return c;
  });

  async function publish() {
    if (busy) return;
    if (!items.length) return toast('Añade al menos una foto o un vídeo');
    if (!title.current.value.trim()) return toast('Ponle un título');
    setBusy(true);
    const total = items.reduce((n, it) => n + it.blob.size + (it.poster ? it.poster.size : 0), 0) || 1;
    let sent = 0;
    const bar = (label, frac, size) => setProgress({ label, pct: Math.round(((sent + frac * size) / total) * 100) });
    try {
      const media = [];
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const label = `Subiendo ${k + 1} de ${items.length}${it.kind === 'video' ? ' (vídeo)' : ''}…`;
        bar(label, 0, it.blob.size);
        const url = await uploadMedia(it.blob, it.kind, f => bar(label, f, it.blob.size));
        sent += it.blob.size;
        let poster = null;
        if (it.poster) { poster = await uploadMedia(it.poster, 'image', f => bar(label, f, it.poster.size)); sent += it.poster.size; }
        media.push({ kind: it.kind, url, poster, width: it.width || undefined, height: it.height || undefined });
      }
      bar('Publicando…', 0, 0);
      const { post } = await api('POST', '/api/posts', { projectId: Number(project.current.value), title: title.current.value, text: text.current.value, media });
      close(); toast('¡Publicado!'); onPost && onPost(post);
      return;
    } catch (e) { toast(e.message); }
    setBusy(false); setProgress(null);
  }

  return (
    <div className="composer">
      <h2>Nueva publicación</h2>
      <div className="muted">Fotos y vídeos de tu proyecto, con su título y descripción.</div>
      <div className={'media-area' + (over ? ' over' : '')}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        {!items.length
          ? <div className="drop" onClick={() => picker.current.click()}>
              <div className="drop-empty"><Icon name="image" />
                <div>Haz clic o arrastra aquí fotos y vídeos</div>
                <small className="muted">{`Hasta ${MAX_MEDIA}. La primera será la portada. Vídeos MP4, MOV o WebM de hasta ${MAX_VIDEO_MB} MB.`}</small>
              </div>
            </div>
          : <div className="thumbs">
              {items.map((it, k) => (
                <div key={k} className={'thumb' + (k === 0 ? ' cover' : '')}>
                  {it.preview ? <img src={it.preview} alt="" /> : <div className="thumb-ph"><Icon name="video" /></div>}
                  {it.kind === 'video' && <span className="thumb-badge"><Icon name="play" />{fmtDuration(it.duration)}</span>}
                  {k === 0 && <span className="thumb-cover">Portada</span>}
                  <div className="thumb-tools">
                    <button title="Mover a la izquierda" disabled={k === 0} onClick={() => move(k, -1)}><Icon name="left" /></button>
                    <button title="Quitar" onClick={() => setItems(list => list.filter((_, j) => j !== k))}><Icon name="x" /></button>
                    <button title="Mover a la derecha" disabled={k === items.length - 1} onClick={() => move(k, 1)}><Icon name="right" /></button>
                  </div>
                </div>
              ))}
              {items.length < MAX_MEDIA && <button className="thumb add" title="Añadir más" onClick={() => picker.current.click()}>
                <Icon name="plus" /><span>{`${items.length}/${MAX_MEDIA}`}</span>
              </button>}
            </div>}
      </div>
      <input ref={picker} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden
        onChange={e => { add(e.target.files); e.target.value = ''; }} />
      <div className="upload-bar" hidden={!progress}>
        {progress && <>
          <div className="upload-txt">{progress.label}</div>
          <div className="upload-track"><div className="upload-fill" style={{ width: `${progress.pct}%` }} /></div>
        </>}
      </div>
      <label>Proyecto</label>
      <select ref={project} className="select" defaultValue={presetProjectId != null ? String(presetProjectId) : undefined}>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <label>Título</label>
      <input ref={title} type="text" maxLength={100} placeholder="Ej.: Primer prototipo del brazo funcionando" />
      <label>Descripción</label>
      <textarea ref={text} rows={4} maxLength={2000} placeholder="Cuéntalo: qué se ve, cómo lo hiciste, qué aprendiste…" />
      <div className="row" style={{ marginTop: 14 }}><div className="spacer" />
        <button className="btn" disabled={busy} onClick={publish}>Publicar</button>
      </div>
    </div>
  );
}
