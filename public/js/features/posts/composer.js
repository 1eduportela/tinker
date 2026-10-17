// Ventana "Nueva publicación": fotos y vídeos (carrusel), título, descripción y proyecto.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { fmtDuration } from '../../core/format.js';
import { session } from '../../core/state.js';
import { imageToBlob } from '../../media/images.js';
import { uploadMedia } from '../../media/upload.js';
import { videoInfo } from '../../media/video.js';
import { icon } from '../../ui/icons.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { openNewProject } from '../projects/new-project.js';

const MAX_MEDIA = 10;
const MAX_VIDEO_MB = 300;

export async function openComposer(onPost, presetProjectId) {
  let projects;
  try { projects = (await api('GET', `/api/users/${encodeURIComponent(session.me.username)}/projects`)).projects; }
  catch (e) { return toast(e.message); }
  if (!projects.length) {
    const m = modal(h('div', {},
      h('h2', {}, 'Primero, un proyecto'),
      h('p', { class: 'muted' }, 'En Tinker cada publicación pertenece a un proyecto. Crea uno y luego sube tus fotos o vídeos.'),
      h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }),
        h('button', { class: 'btn', onclick: () => { m.close(); openNewProject(p => openComposer(onPost, p.id)); } }, 'Crear proyecto'))));
    return;
  }
  const items = [];   // { kind, source, blob, preview, width, height, duration, poster }
  let busy = false;
  const select = h('select', { class: 'select' },
    ...projects.map(p => h('option', { value: p.id, selected: String(p.id) === String(presetProjectId) }, p.name)));
  const title = h('input', { type: 'text', maxlength: 100, placeholder: 'Ej.: Primer prototipo del brazo funcionando' });
  const text = h('textarea', { rows: 4, maxlength: 2000, placeholder: 'Cuéntalo: qué se ve, cómo lo hiciste, qué aprendiste…' });
  const picker = h('input', { type: 'file', accept: 'image/*,video/mp4,video/webm,video/quicktime', multiple: true, hidden: true });
  const area = h('div', { class: 'media-area' });
  const progress = h('div', { class: 'upload-bar', hidden: true });

  async function add(files) {
    files = [...files].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return toast('Elige fotos o vídeos');
    const room = MAX_MEDIA - items.length;
    if (files.length > room) toast(`Máximo ${MAX_MEDIA} por publicación: se añaden ${Math.max(room, 0)}`);
    for (const f of files.slice(0, Math.max(room, 0))) {
      try {
        if (f.type.startsWith('video/')) {
          if (f.size > MAX_VIDEO_MB * 1024 * 1024) { toast(`"${f.name}" pasa de ${MAX_VIDEO_MB} MB`); continue; }
          const info = await videoInfo(f);
          items.push({ kind: 'video', blob: f, preview: info.poster ? info.poster.url : null, video: info.preview,
            width: info.width, height: info.height, duration: info.duration, poster: info.poster && info.poster.blob });
        } else {
          const r = await imageToBlob(f);
          items.push({ kind: 'image', blob: r.blob, preview: r.preview, width: r.width, height: r.height });
        }
      } catch (e) { toast(e.message); }
      paint();
    }
  }
  function move(k, d) { const j = k + d; if (j < 0 || j >= items.length) return; [items[k], items[j]] = [items[j], items[k]]; paint(); }
  function paint() {
    if (!items.length) {
      area.replaceChildren(h('div', { class: 'drop', onclick: () => picker.click() },
        h('div', { class: 'drop-empty' }, icon('image'),
          h('div', {}, 'Haz clic o arrastra aquí fotos y vídeos'),
          h('small', { class: 'muted' }, `Hasta ${MAX_MEDIA}. La primera será la portada. Vídeos MP4, MOV o WebM de hasta ${MAX_VIDEO_MB} MB.`))));
      return;
    }
    area.replaceChildren(h('div', { class: 'thumbs' },
      ...items.map((it, k) => h('div', { class: 'thumb' + (k === 0 ? ' cover' : '') },
        it.preview ? h('img', { src: it.preview, alt: '' }) : h('div', { class: 'thumb-ph' }, icon('video')),
        it.kind === 'video' && h('span', { class: 'thumb-badge' }, icon('play'), fmtDuration(it.duration)),
        k === 0 && h('span', { class: 'thumb-cover' }, 'Portada'),
        h('div', { class: 'thumb-tools' },
          h('button', { title: 'Mover a la izquierda', disabled: k === 0, onclick: () => move(k, -1) }, icon('left')),
          h('button', { title: 'Quitar', onclick: () => { items.splice(k, 1); paint(); } }, icon('x')),
          h('button', { title: 'Mover a la derecha', disabled: k === items.length - 1, onclick: () => move(k, 1) }, icon('right'))))),
      items.length < MAX_MEDIA && h('button', { class: 'thumb add', onclick: () => picker.click(), title: 'Añadir más' },
        icon('plus'), h('span', {}, `${items.length}/${MAX_MEDIA}`))));
  }
  picker.onchange = () => { add(picker.files); picker.value = ''; };
  area.ondragover = e => { e.preventDefault(); area.classList.add('over'); };
  area.ondragleave = () => area.classList.remove('over');
  area.ondrop = e => { e.preventDefault(); area.classList.remove('over'); add(e.dataTransfer.files); };
  paint();

  const btn = h('button', { class: 'btn' }, 'Publicar');
  btn.onclick = async () => {
    if (busy) return;
    if (!items.length) return toast('Añade al menos una foto o un vídeo');
    if (!title.value.trim()) return toast('Ponle un título');
    busy = true; btn.disabled = true; progress.hidden = false;
    const total = items.reduce((n, it) => n + it.blob.size + (it.poster ? it.poster.size : 0), 0) || 1;
    let sent = 0;
    const bar = (label, frac, size) => progress.replaceChildren(
      h('div', { class: 'upload-txt' }, label),
      h('div', { class: 'upload-track' }, h('div', { class: 'upload-fill', style: `width:${Math.round(((sent + frac * size) / total) * 100)}%` })));
    try {
      const media = [];
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const label = `Subiendo ${k + 1} de ${items.length}${it.kind === 'video' ? ' (vídeo)' : ''}…`;
        const url = await uploadMedia(it.blob, it.kind, f => bar(label, f, it.blob.size));
        sent += it.blob.size;
        let poster = null;
        if (it.poster) { poster = await uploadMedia(it.poster, 'image', f => bar(label, f, it.poster.size)); sent += it.poster.size; }
        media.push({ kind: it.kind, url, poster, width: it.width || undefined, height: it.height || undefined });
      }
      bar('Publicando…', 0, 0);
      const { post } = await api('POST', '/api/posts', { projectId: Number(select.value), title: title.value, text: text.value, media });
      m.close(); toast('¡Publicado!'); onPost && onPost(post);
    } catch (e) { toast(e.message); }
    busy = false; btn.disabled = false; progress.hidden = true;
  };
  const m = modal(h('div', { class: 'composer' },
    h('h2', {}, 'Nueva publicación'), h('div', { class: 'muted' }, 'Fotos y vídeos de tu proyecto, con su título y descripción.'),
    area, picker, progress,
    h('label', {}, 'Proyecto'), select,
    h('label', {}, 'Título'), title,
    h('label', {}, 'Descripción'), text,
    h('div', { class: 'row', style: 'margin-top:14px' }, h('div', { class: 'spacer' }), btn)));
}
