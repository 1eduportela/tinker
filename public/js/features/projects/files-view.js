// Sección Archivos del proyecto (estilo GitHub): carpetas, subir arrastrando y borrar.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { fmtSize, timeAgo } from '../../core/format.js';
import { uploadProjectFile } from '../../media/upload.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { filesFromDrop } from './file-drop.js';
import { openFileViewer } from './file-viewer.js';

export async function filesView(project, autoUpload, onCount) {
  let files = (await api('GET', `/api/projects/${project.id}/files`)).files;
  let cwd = '';
  const box = h('section', { class: 'files' });
  const progress = h('div', { class: 'upload-bar', hidden: true });
  const pickFiles = h('input', { type: 'file', multiple: true, hidden: true });
  const pickFolder = h('input', { type: 'file', multiple: true, webkitdirectory: true, hidden: true });

  async function upload(list) {
    list = list.filter(x => x.file.size > 0 || x.file.type !== '');
    const big = list.filter(x => x.file.size > 50 * 1024 * 1024);
    if (big.length) toast(`${big.length} archivo(s) pasan de 50 MB y no se subirán`);
    list = list.filter(x => x.file.size <= 50 * 1024 * 1024);
    if (!list.length) return;
    progress.hidden = false;
    let done = 0, failed = 0;
    for (const x of list) {
      const target = cwd + x.path;
      const paintBar = frac => progress.replaceChildren(
        h('div', { class: 'upload-txt' }, `Subiendo ${done + 1} de ${list.length}: ${target}`),
        h('div', { class: 'upload-track' }, h('div', { class: 'upload-fill', style: `width:${Math.round(((done + frac) / list.length) * 100)}%` })));
      paintBar(0);
      try {
        const f = await uploadProjectFile(project.id, target, x.file, paintBar);
        files = files.filter(o => o.path !== f.path).concat(f);
      } catch (e) { failed++; toast(`${x.path}: ${e.message}`); }
      done++;
    }
    progress.hidden = true;
    files.sort((a, b) => a.path.localeCompare(b.path));
    paint();
    if (!failed) toast(list.length === 1 ? 'Archivo subido' : `${list.length} archivos subidos`);
  }
  pickFiles.onchange = () => { upload([...pickFiles.files].map(f => ({ file: f, path: f.name }))); pickFiles.value = ''; };
  pickFolder.onchange = () => { upload([...pickFolder.files].map(f => ({ file: f, path: f.webkitRelativePath || f.name }))); pickFolder.value = ''; };

  async function remove(entry) {
    const label = entry.dir ? `la carpeta "${entry.name}" y todo lo que contiene` : `"${entry.name}"`;
    if (!confirm(`¿Borrar ${label}?`)) return;
    const q = entry.dir ? `folder=${encodeURIComponent(cwd + entry.name)}` : `path=${encodeURIComponent(entry.path)}`;
    try {
      await api('DELETE', `/api/projects/${project.id}/files?${q}`);
      files = entry.dir ? files.filter(f => !f.path.startsWith(cwd + entry.name + '/')) : files.filter(f => f.path !== entry.path);
      paint(); toast('Borrado');
    } catch (e) { toast(e.message); }
  }

  function entries() {
    const dirs = new Map(), list = [];
    for (const f of files) {
      if (!f.path.startsWith(cwd)) continue;
      const rest = f.path.slice(cwd.length);
      const slash = rest.indexOf('/');
      if (slash >= 0) {
        const name = rest.slice(0, slash);
        const d = dirs.get(name) || { dir: true, name, size: 0, count: 0, createdAt: 0 };
        d.size += f.size; d.count++; d.createdAt = Math.max(d.createdAt, f.createdAt);
        dirs.set(name, d);
      } else list.push({ ...f, name: rest });
    }
    const byName = (a, b) => a.name.localeCompare(b.name, 'es', { numeric: true });
    return [...[...dirs.values()].sort(byName), ...list.sort(byName)];
  }

  function paint() {
    if (cwd && !files.some(f => f.path.startsWith(cwd))) cwd = '';
    const parts = cwd ? cwd.slice(0, -1).split('/') : [];
    const crumbs = h('div', { class: 'crumbs' },
      h('button', { class: 'crumb', onclick: () => { cwd = ''; paint(); } }, project.name),
      ...parts.flatMap((part, i) => [h('span', { class: 'slash' }, '/'),
        h('button', { class: 'crumb', onclick: () => { cwd = parts.slice(0, i + 1).join('/') + '/'; paint(); } }, part)]));
    const total = files.reduce((n, f) => n + f.size, 0);
    const head = h('div', { class: 'files-head' }, crumbs, h('span', { class: 'spacer' }),
      h('span', { class: 'muted files-count' }, `${files.length} archivo${files.length === 1 ? '' : 's'} · ${fmtSize(total)}`),
      project.mine && h('button', { class: 'btn ghost small', onclick: () => pickFolder.click() }, icon('folder'), 'Subir carpeta'),
      project.mine && h('button', { class: 'btn small', onclick: () => pickFiles.click() }, icon('upload'), 'Subir archivos'));
    const ents = entries();
    let list;
    if (!files.length) {
      list = h('div', { class: 'files-empty' + (project.mine ? ' can-drop' : ''), onclick: () => project.mine && pickFiles.click() },
        icon(project.mine ? 'upload' : 'file'),
        h('b', {}, project.mine ? 'Arrastra aquí los archivos de tu proyecto' : 'Este proyecto todavía no tiene archivos'),
        project.mine && h('span', { class: 'muted' }, 'Código, planos, STL, PDF, hojas de cálculo… También carpetas enteras. Máx. 50 MB por archivo.'));
    } else {
      list = h('div', { class: 'files-list' },
        cwd && h('button', { class: 'frow up', onclick: () => { cwd = parts.slice(0, -1).join('/') + (parts.length > 1 ? '/' : ''); paint(); } },
          h('span', { class: 'fname' }, h('span', { class: 'ficon' }, icon('folder')), '..')),
        ...ents.map(e => h('div', { class: 'frow' + (e.dir ? ' dir' : ''), role: 'button', tabindex: 0,
          onclick: () => { if (e.dir) { cwd += e.name + '/'; paint(); } else openFileViewer(e); },
          onkeydown: ev => { if (ev.key === 'Enter') ev.currentTarget.click(); } },
          h('span', { class: 'fname' }, h('span', { class: 'ficon' }, icon(e.dir ? 'folder' : 'file')), h('span', { class: 'ftxt' }, e.name)),
          h('span', { class: 'fmeta muted' }, e.dir ? `${e.count} archivo${e.count === 1 ? '' : 's'}` : fmtSize(e.size)),
          h('span', { class: 'fdate muted' }, timeAgo(e.createdAt)),
          h('span', { class: 'factions' },
            !e.dir && h('a', { class: 'icon-btn', title: 'Descargar', href: `/api/files/${e.id}?as=download`, onclick: ev => ev.stopPropagation() }, icon('download')),
            project.mine && h('button', { class: 'icon-btn', title: 'Borrar', onclick: ev => { ev.stopPropagation(); remove(e); } }, icon('trash'))))));
    }
    box.replaceChildren(head, progress, list, pickFiles, pickFolder);
    onCount && onCount(files.length);
  }

  if (project.mine) {
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('over'); });
    box.addEventListener('dragleave', e => { if (!box.contains(e.relatedTarget)) box.classList.remove('over'); });
    box.addEventListener('drop', async e => {
      e.preventDefault(); box.classList.remove('over');
      try { upload(await filesFromDrop(e.dataTransfer)); } catch { toast('No se pudieron leer los archivos'); }
    });
  }
  paint();
  box.pick = () => pickFiles.click();
  if (autoUpload && project.mine) setTimeout(() => pickFiles.click(), 100);
  return box;
}
