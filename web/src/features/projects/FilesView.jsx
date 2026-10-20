// Sección Archivos del proyecto (estilo GitHub): carpetas, subir arrastrando y borrar.
//   <FilesView project autoUpload onCount ref />   ref.current.pick() abre el selector de archivos
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { fmtSize, timeAgo } from '../../core/format.js';
import { useLoad } from '../../core/useLoad.js';
import { uploadProjectFile } from '../../media/upload.js';
import { Icon } from '../../ui/Icon.jsx';
import { toast } from '../../ui/toast.jsx';
import { filesFromDrop } from './file-drop.js';
import { openFileViewer } from './FileViewer.jsx';

const MAX = 50 * 1024 * 1024;

export function FilesView({ project, autoUpload, onCount, ref }) {
  const { data, error, setData } = useLoad(() => api('GET', `/api/projects/${project.id}/files`), [project.id]);
  const [cwd, setCwd] = useState('');
  const [progress, setProgress] = useState(null);   // { label, pct }
  const [over, setOver] = useState(false);
  const pickFiles = useRef(), pickFolder = useRef(), box = useRef();
  const files = data ? data.files : null;
  const setFiles = fn => setData(d => ({ ...d, files: fn(d.files) }));

  useImperativeHandle(ref, () => ({ pick: () => pickFiles.current && pickFiles.current.click() }), []);
  useEffect(() => { if (files) onCount && onCount(files.length); }, [files]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoUpload || !project.mine || !files) return;
    const t = setTimeout(() => pickFiles.current.click(), 100);
    return () => clearTimeout(t);
  }, [!!files]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="empty">{error.message}</div>;
  if (!files) return null;

  // Si la carpeta actual se ha quedado vacía, se vuelve a la raíz
  const dir = cwd && !files.some(f => f.path.startsWith(cwd)) ? '' : cwd;

  async function upload(list) {
    const big = list.filter(x => x.file.size > MAX);
    if (big.length) toast(`${big.length} archivo(s) pasan de 50 MB y no se subirán`);
    list = list.filter(x => x.file.size <= MAX);
    if (!list.length) return;
    let done = 0, failed = 0;
    for (const x of list) {
      const target = dir + x.path;
      const bar = frac => setProgress({ label: `Subiendo ${done + 1} de ${list.length}: ${target}`, pct: Math.round(((done + frac) / list.length) * 100) });
      bar(0);
      try {
        const f = await uploadProjectFile(project.id, target, x.file, bar);
        setFiles(fs => fs.filter(o => o.path !== f.path).concat(f).sort((a, b) => a.path.localeCompare(b.path)));
      } catch (e) { failed++; toast(`${x.path}: ${e.message}`); }
      done++;
    }
    setProgress(null);
    if (!failed) toast(list.length === 1 ? 'Archivo subido' : `${list.length} archivos subidos`);
  }

  async function remove(entry) {
    const label = entry.dir ? `la carpeta "${entry.name}" y todo lo que contiene` : `"${entry.name}"`;
    if (!confirm(`¿Borrar ${label}?`)) return;
    const q = entry.dir ? `folder=${encodeURIComponent(dir + entry.name)}` : `path=${encodeURIComponent(entry.path)}`;
    try {
      await api('DELETE', `/api/projects/${project.id}/files?${q}`);
      setFiles(fs => entry.dir ? fs.filter(f => !f.path.startsWith(dir + entry.name + '/')) : fs.filter(f => f.path !== entry.path));
      toast('Borrado');
    } catch (e) { toast(e.message); }
  }

  // Lo que hay en la carpeta actual: primero subcarpetas, luego archivos
  const dirs = new Map(), list = [];
  for (const f of files) {
    if (!f.path.startsWith(dir)) continue;
    const rest = f.path.slice(dir.length);
    const slash = rest.indexOf('/');
    if (slash >= 0) {
      const name = rest.slice(0, slash);
      const d = dirs.get(name) || { dir: true, name, size: 0, count: 0, createdAt: 0 };
      d.size += f.size; d.count++; d.createdAt = Math.max(d.createdAt, f.createdAt);
      dirs.set(name, d);
    } else list.push({ ...f, name: rest });
  }
  const byName = (a, b) => a.name.localeCompare(b.name, 'es', { numeric: true });
  const entries = [...[...dirs.values()].sort(byName), ...list.sort(byName)];
  const parts = dir ? dir.slice(0, -1).split('/') : [];
  const total = files.reduce((n, f) => n + f.size, 0);

  const dropHandlers = project.mine ? {
    onDragOver: e => { e.preventDefault(); setOver(true); },
    onDragLeave: e => { if (!box.current.contains(e.relatedTarget)) setOver(false); },
    onDrop: async e => {
      e.preventDefault(); setOver(false);
      try { upload(await filesFromDrop(e.dataTransfer)); } catch { toast('No se pudieron leer los archivos'); }
    },
  } : {};

  return (
    <section className={'files' + (over ? ' over' : '')} ref={box} {...dropHandlers}>
      <div className="files-head">
        <div className="crumbs">
          <button className="crumb" onClick={() => setCwd('')}>{project.name}</button>
          {parts.map((part, i) => [
            <span key={'s' + i} className="slash">/</span>,
            <button key={'c' + i} className="crumb" onClick={() => setCwd(parts.slice(0, i + 1).join('/') + '/')}>{part}</button>,
          ])}
        </div>
        <span className="spacer" />
        <span className="muted files-count">{`${files.length} archivo${files.length === 1 ? '' : 's'} · ${fmtSize(total)}`}</span>
        {project.mine && <button className="btn ghost small" onClick={() => pickFolder.current.click()}><Icon name="folder" />Subir carpeta</button>}
        {project.mine && <button className="btn small" onClick={() => pickFiles.current.click()}><Icon name="upload" />Subir archivos</button>}
      </div>
      <div className="upload-bar" hidden={!progress}>
        {progress && <>
          <div className="upload-txt">{progress.label}</div>
          <div className="upload-track"><div className="upload-fill" style={{ width: `${progress.pct}%` }} /></div>
        </>}
      </div>
      {!files.length
        ? <div className={'files-empty' + (project.mine ? ' can-drop' : '')} onClick={() => project.mine && pickFiles.current.click()}>
            <Icon name={project.mine ? 'upload' : 'file'} />
            <b>{project.mine ? 'Arrastra aquí los archivos de tu proyecto' : 'Este proyecto todavía no tiene archivos'}</b>
            {project.mine && <span className="muted">Código, planos, STL, PDF, hojas de cálculo… También carpetas enteras. Máx. 50 MB por archivo.</span>}
          </div>
        : <div className="files-list">
            {dir && <button className="frow up" onClick={() => setCwd(parts.slice(0, -1).join('/') + (parts.length > 1 ? '/' : ''))}>
              <span className="fname"><span className="ficon"><Icon name="folder" /></span>..</span>
            </button>}
            {entries.map(e => (
              <div key={(e.dir ? 'd:' : 'f:') + e.name} className={'frow' + (e.dir ? ' dir' : '')} role="button" tabIndex={0}
                onClick={() => { if (e.dir) setCwd(dir + e.name + '/'); else openFileViewer(e); }}
                onKeyDown={ev => { if (ev.key === 'Enter') ev.currentTarget.click(); }}>
                <span className="fname"><span className="ficon"><Icon name={e.dir ? 'folder' : 'file'} /></span><span className="ftxt">{e.name}</span></span>
                <span className="fmeta muted">{e.dir ? `${e.count} archivo${e.count === 1 ? '' : 's'}` : fmtSize(e.size)}</span>
                <span className="fdate muted">{timeAgo(e.createdAt)}</span>
                <span className="factions">
                  {!e.dir && <a className="icon-btn" title="Descargar" href={`/api/files/${e.id}?as=download`} onClick={ev => ev.stopPropagation()}><Icon name="download" /></a>}
                  {project.mine && <button className="icon-btn" title="Borrar" onClick={ev => { ev.stopPropagation(); remove(e); }}><Icon name="trash" /></button>}
                </span>
              </div>
            ))}
          </div>}
      <input ref={pickFiles} type="file" multiple hidden
        onChange={e => { upload([...e.target.files].map(f => ({ file: f, path: f.name }))); e.target.value = ''; }} />
      <input ref={pickFolder} type="file" multiple webkitdirectory="" hidden
        onChange={e => { upload([...e.target.files].map(f => ({ file: f, path: f.webkitRelativePath || f.name }))); e.target.value = ''; }} />
    </section>
  );
}
