'use strict';
// =============== Utilidades ===============
const root = document.getElementById('root');
let me = null;
let cleanup = [];

const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  layers: '<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><polygon points="22 8 16 12 22 16 22 8"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
};
function icon(name) {
  const s = document.createElement('span');
  s.className = 'ic';
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return s;
}
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && me) { me = null; render(); }
  if (r.status === 404 && data.error === 'Ruta no encontrada') {
    throw new Error('El servidor está en una versión antigua. Cierra todas las ventanas negras de Tinker y vuelve a abrir el .bat.');
  }
  if (!r.ok) throw new Error(data.error || 'Algo ha fallado');
  return data;
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
function colorFor(name) {
  let n = 0; for (const c of name) n = (n * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${n} 55% 48%)`;
}
function avatar(u, size = '') {
  if (u.avatar) return h('img', { class: `avatar ${size}`, src: u.avatar, alt: '' });
  return h('div', { class: `avatar ${size}`, style: `background:${colorFor(u.username)}` },
    (u.displayName || u.username)[0].toUpperCase());
}
function resizeImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = URL.createObjectURL(file);
  });
}
function pickImage(cb, max) {
  const inp = h('input', { type: 'file', accept: 'image/*' });
  inp.onchange = async () => { if (inp.files[0]) try { cb(await resizeImage(inp.files[0], max)); } catch (e) { toast(e.message); } };
  inp.click();
}
function preload(post) {
  if (!post.image || post._w) return Promise.resolve();
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { post._w = img.naturalWidth; post._h = img.naturalHeight; res(); };
    img.onerror = () => res();
    img.src = post.image;
  });
}

// =============== Fotos y vídeos ===============
const MAX_MEDIA = 10;
const MAX_VIDEO_MB = 300;
function imageToBlob(file, max = 2000) {
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => resolve({ blob: file, width: img.naturalWidth, height: img.naturalHeight, preview: url });
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = url;
    });
  }
  return new Promise((resolve, reject) => {
    const img = new Image(); const src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob(b => b ? resolve({ blob: b, width: c.width, height: c.height, preview: URL.createObjectURL(b) })
        : reject(new Error('No se pudo preparar la imagen')), 'image/jpeg', 0.88);
    };
    img.onerror = () => reject(new Error(`No se pudo leer "${file.name}"`));
    img.src = src;
  });
}
// Lee tamaño del vídeo y saca una miniatura para usarla de portada
function videoInfo(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    let done = false;
    const finish = (poster) => {
      if (done) return; done = true;
      resolve({ width: v.videoWidth || null, height: v.videoHeight || null, duration: v.duration || 0, poster, preview: url });
    };
    const timer = setTimeout(() => finish(null), 8000);
    v.onerror = () => { clearTimeout(timer); finish(null); };
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 3); } catch { finish(null); } };
    v.onseeked = () => {
      try {
        const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(b => { clearTimeout(timer); finish(b ? { blob: b, url: URL.createObjectURL(b) } : null); }, 'image/jpeg', 0.85);
      } catch { clearTimeout(timer); finish(null); }
    };
  });
}
function uploadMedia(blob, kind, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/media?kind=${kind}`);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let d = {}; try { d = JSON.parse(xhr.responseText); } catch {}
      xhr.status < 300 ? resolve(d.url) : reject(new Error(d.error || 'No se pudo subir'));
    };
    xhr.onerror = () => reject(new Error('Se cortó la conexión'));
    xhr.send(blob);
  });
}
function fmtDuration(sec) {
  if (!sec || !isFinite(sec)) return '';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Carrusel de la publicación abierta
function carousel(media) {
  let i = 0;
  const many = media.length > 1;
  const stage = h('div', { class: 'car-stage' + (many ? ' fixed' : '') });
  const counter = h('div', { class: 'car-count' });
  const dots = h('div', { class: 'car-dots' });
  const prev = h('button', { class: 'car-nav prev', title: 'Anterior', onclick: e => { e.stopPropagation(); go(i - 1); } }, icon('left'));
  const next = h('button', { class: 'car-nav next', title: 'Siguiente', onclick: e => { e.stopPropagation(); go(i + 1); } }, icon('right'));
  function paint() {
    const m = media[i];
    stage.querySelectorAll('video').forEach(v => v.pause());
    stage.replaceChildren(m.kind === 'video'
      ? h('video', { src: m.url, poster: m.poster || null, controls: true, playsinline: true, preload: 'metadata' })
      : h('img', { src: m.url, alt: '' }));
    if (!many) return;
    counter.textContent = `${i + 1} / ${media.length}`;
    prev.hidden = i === 0; next.hidden = i === media.length - 1;
    dots.replaceChildren(...media.map((_, k) => h('button', { class: 'car-dot' + (k === i ? ' on' : ''), title: `${k + 1}`, onclick: () => go(k) })));
  }
  function go(n) { if (n < 0 || n >= media.length || n === i) return; i = n; paint(); }
  const el = h('div', { class: 'pm-media car' }, stage, many && prev, many && next, many && counter, many && dots);
  if (many) {
    const onKey = e => {
      if (!el.isConnected) return document.removeEventListener('keydown', onKey);
      if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'ArrowRight') go(i + 1);
    };
    document.addEventListener('keydown', onKey);
    let x0 = null;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    });
  }
  paint();
  return el;
}

// =============== Ventanas (modales) ===============
function modal(content, cls = '', onClose) {
  const box = h('div', { class: `modal ${cls}` }, h('button', { class: 'icon-btn modal-x', title: 'Cerrar', onclick: () => close() }, icon('x')), content);
  const ov = h('div', { class: 'overlay' }, box);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  document.body.append(ov);
  document.body.classList.add('noscroll');
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    ov.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    if (!document.querySelector('.overlay')) document.body.classList.remove('noscroll');
    onClose && onClose();
  }
  return { close };
}

function openPost(post, onDelete) {
  const media = post.media && post.media.length
    ? carousel(post.media)
    : h('div', { class: 'pm-media text' }, post.text);
  const m = modal(h('div', { class: 'pm' }, media,
    h('div', { class: 'pm-side' },
      h('div', { class: 'row pm-head' },
        h('a', { href: `#/u/${post.author.username}` }, avatar(post.author)),
        h('div', { style: 'min-width:0' },
          h('a', { href: `#/u/${post.author.username}`, class: 'name' }, post.author.displayName),
          h('div', { class: 'muted', style: 'font-size:13px' }, `@${post.author.username} · `,
            h('time', { title: new Date(post.createdAt).toLocaleString('es-ES') },
              new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })))),
        h('div', { class: 'spacer' }),
        (post.mine || post.canDelete) && h('button', { class: 'icon-btn', title: post.mine ? 'Borrar publicación' : 'Borrar publicación (moderación)', onclick: async () => {
          if (!confirm(post.mine ? '¿Borrar esta publicación?' : `Vas a borrar una publicación de @${post.author.username} como administrador. ¿Seguro?`)) return;
          try { await api('DELETE', `/api/posts/${post.id}`); m.close(); onDelete(); toast('Publicación borrada'); }
          catch (e) { toast(e.message); }
        } }, icon('trash'))),
      h('div', { class: 'pm-body' },
        post.title && h('h2', { class: 'pm-title' }, post.title),
        post.image && post.text && h('p', { class: 'pm-text' }, post.text),
        post.project && h('a', { href: `#/p/${post.project.id}/multimedia`, class: 'proj-btn' },
          icon('folder'), h('span', {}, post.project.name), h('span', { class: 'arrow' }, '→'))))), 'wide');
}

async function openComposer(onPost, presetProjectId) {
  let projects;
  try { projects = (await api('GET', `/api/users/${encodeURIComponent(me.username)}/projects`)).projects; }
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

function openEditProfile() {
  let newAvatar = null, newBanner = null, removeBanner = false;
  const name = h('input', { type: 'text', value: me.displayName, maxlength: 40 });
  const bio = h('input', { type: 'text', value: me.bio, maxlength: 200, placeholder: 'Ingeniero mecánico, ciclista, maker…' });
  const about = h('textarea', { rows: 6, maxlength: 3000,
    placeholder: 'Preséntate: quién eres, a qué te dedicas, qué te gusta cacharrear…' }, me.about);
  const bannerBox = h('div', { class: 'banner-pick' });
  const paintBanner = () => {
    const src = newBanner || (!removeBanner && me.banner);
    bannerBox.style.backgroundImage = src ? `url("${src}")` : '';
    bannerBox.replaceChildren(
      h('button', { class: 'btn ghost', type: 'button', onclick: () => pickImage(d => { newBanner = d; removeBanner = false; paintBanner(); }, 2400) },
        src ? 'Cambiar banner' : 'Añadir banner'),
      src && h('button', { class: 'btn ghost', type: 'button', onclick: () => { newBanner = null; removeBanner = true; paintBanner(); } }, 'Quitar'));
  };
  paintBanner();
  const av = h('div', {}, avatar(me, 'big'));
  const save = h('button', { class: 'btn' }, 'Guardar');
  save.onclick = async () => {
    save.disabled = true;
    try {
      me = (await api('PUT', '/api/me', { displayName: name.value, bio: bio.value, about: about.value,
        avatar: newAvatar, banner: newBanner, removeBanner })).user;
      m.close(); toast('Perfil guardado'); render();
    } catch (e) { toast(e.message); }
    save.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Editar perfil'),
    h('label', {}, 'Banner'), bannerBox,
    h('label', {}, 'Foto de perfil'),
    h('div', { class: 'avatar-edit' }, av, h('button', { class: 'btn ghost', onclick: () => pickImage(d => {
      newAvatar = d; av.replaceChildren(h('img', { class: 'avatar big', src: d }));
    }) }, 'Cambiar foto')),
    h('label', {}, 'Nombre visible'), name,
    h('label', {}, 'Frase corta (sale en el banner)'), bio,
    h('label', {}, 'Bienvenida'), about,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), save)));
}

function openNewProject(onCreate) {
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Brazo robótico, Media maratón 2026…' });
  const desc = h('textarea', { rows: 3, maxlength: 300, placeholder: 'De qué va, en una o dos frases (opcional)' });
  const btn = h('button', { class: 'btn' }, 'Crear proyecto');
  btn.onclick = async () => {
    if (!name.value.trim()) return toast('Ponle un nombre al proyecto');
    btn.disabled = true;
    try {
      const { project } = await api('POST', '/api/projects', { name: name.value, description: desc.value });
      m.close(); toast('Proyecto creado'); onCreate && onCreate(project);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Nuevo proyecto'),
    h('div', { class: 'muted' }, 'Cada proyecto es una carpeta donde irás guardando todo lo que hagas en él.'),
    h('label', {}, 'Nombre'), name, h('label', {}, 'Descripción'), desc,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), btn)));
  setTimeout(() => name.focus(), 50);
}

// =============== Cuadricula tipo Pinterest con scroll infinito ===============
function masonry(loader, emptyMsg) {
  const grid = h('div', { class: 'masonry' });
  const status = h('div', { class: 'status' });
  const sentinel = h('div');
  let cols = [], tiles = [], last = null, loading = false, done = false, alive = true;
  const ctl = {
    el: h('div', {}, grid, status, sentinel),
    remove(t) { tiles = tiles.filter(x => x !== t); t.remove(); relayout(true); if (!tiles.length && done) status.replaceChildren(emptyMsg); },
    async prepend(p) { await preload(p); tiles.unshift(tile(p, ctl)); status.replaceChildren(); relayout(true); },
  };
  const count = () => Math.max(1, Math.floor((grid.clientWidth + 16) / 250));
  function place(t) {
    let best = cols[0];
    for (const c of cols) if (c.offsetHeight < best.offsetHeight) best = c;
    best.append(t);
  }
  function relayout(force) {
    const n = count();
    if (!force && n === cols.length) return;
    cols = Array.from({ length: n }, () => h('div', { class: 'mcol' }));
    grid.replaceChildren(...cols);
    tiles.forEach(place);
  }
  async function load() {
    if (loading || done || !alive) return;
    loading = true; status.textContent = 'Cargando…';
    try {
      const posts = await loader(last);
      await Promise.all(posts.map(preload));
      if (!alive) return;
      relayout();
      for (const p of posts) { const t = tile(p, ctl); tiles.push(t); place(t); }
      if (posts.length) last = posts[posts.length - 1].id;
      if (posts.length < 20) done = true;
      status.replaceChildren(done && !tiles.length ? emptyMsg : '');
    } catch (e) { status.textContent = e.message; done = true; }
    loading = false;
    if (!done && sentinel.getBoundingClientRect().top < innerHeight + 800) load();
  }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) load(); }, { rootMargin: '800px' });
  io.observe(sentinel);
  // No dependemos solo del observador: arrancamos la primera carga en cuanto la cuadrícula está en pantalla
  // y comprobamos también al hacer scroll.
  const nearEnd = () => sentinel.isConnected && sentinel.getBoundingClientRect().top < innerHeight + 800;
  const kick = () => { if (!alive) return; if (!ctl.el.isConnected) return setTimeout(kick, 30); if (!tiles.length || nearEnd()) load(); };
  setTimeout(kick, 0);
  const onScroll = () => { if (nearEnd()) load(); };
  addEventListener('scroll', onScroll, { passive: true });
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => relayout(), 120); };
  addEventListener('resize', onResize);
  cleanup.push(() => { alive = false; io.disconnect(); removeEventListener('resize', onResize); removeEventListener('scroll', onScroll); });
  return ctl;
}

function tile(post, ctl) {
  const media = post.media || [];
  const hasVideo = media.some(x => x.kind === 'video');
  const cover = post.image
    ? h('img', { src: post.image, alt: '', width: post._w, height: post._h })
    : media.length ? h('div', { class: 'tile-video-ph' }, icon('play'))
      : h('div', { class: 'tile-text' }, post.text);
  const badges = (media.length > 1 || hasVideo) && h('div', { class: 'tile-badges' },
    hasVideo && h('span', { title: 'Tiene vídeo' }, icon('play')),
    media.length > 1 && h('span', { title: `${media.length} fotos o vídeos` }, icon('layers'), media.length));
  const t = h('article', { class: 'tile' },
    h('div', { class: 'tile-cover' }, cover, badges),
    (post.image || (post.media || []).length) && (post.title || post.text) && h('p', { class: 'tile-caption' }, post.title || post.text));
  t.onclick = () => openPost(post, () => ctl.remove(t));
  return t;
}

// =============== Estructura: menu lateral fijo + contenido ===============
const shell = {};
function buildShell() {
  shell.nav = {};
  const navItem = (key, href, ic, label) =>
    (shell.nav[key] = h('a', { href, class: 'nav-item', title: label }, icon(ic), h('span', { class: 'lbl' }, label)));
  shell.context = h('div', { class: 'context' });
  shell.content = h('main', { class: 'content' });
  shell.mebox = h('div', { class: 'mebox' });
  shell.badge = h('span', { class: 'badge nav-badge', hidden: true });
  root.replaceChildren(
    h('aside', { class: 'sidebar' },
      h('a', { href: '#/', class: 'logo' }, h('span', { class: 'logo-mark' }, icon('wrench')),
        h('span', { class: 'lbl' }, 'Tinker', h('span', { class: 'logo-sub' }, 'cacharrando'))),
      h('nav', { class: 'mainnav' },
        navItem('feed', '#/', 'home', 'Inicio'),
        navItem('personas', '#/personas', 'users', 'Personas'),
        navItem('perfil', '#/', 'user', 'Mi perfil')),
      shell.context,
      h('div', { class: 'spacer-v' }),
      shell.mebox),
    shell.content);
}
async function refreshUnread() {
  try {
    const { unread } = await api('GET', '/api/me');
    if (!shell.badge) return;
    shell.badge.textContent = unread;
    shell.badge.hidden = !unread;
    shell.badge.title = `${unread} mensaje${unread === 1 ? '' : 's'} sin leer`;
  } catch {}
}
setInterval(() => { if (me && shell.badge && !document.hidden) refreshUnread(); }, 15000);
function paintMe() {
  if (!shell.nav.perfil.contains(shell.badge)) shell.nav.perfil.append(shell.badge);
  shell.nav.perfil.href = `#/u/${me.username}`;
  refreshUnread();
  shell.mebox.replaceChildren(
    h('a', { href: `#/u/${me.username}`, class: 'me-link', title: me.displayName }, avatar(me, 'small'),
      h('span', { class: 'lbl' }, h('b', {}, me.displayName), h('small', { class: 'muted' }, '@' + me.username))),
    h('button', { class: 'icon-btn', title: 'Cerrar sesión', onclick: async () => {
      await api('POST', '/api/logout').catch(() => {}); me = null; location.hash = '#/'; render();
    } }, icon('logout')));
}
const ctxSection = (title, desc) => [h('div', { class: 'ctx-title' }, title), desc && h('p', { class: 'ctx-desc' }, desc)];
const ctxButton = (ic, label, onclick, primary) =>
  h('button', { class: 'ctx-btn' + (primary ? ' primary' : ''), title: label, onclick }, icon(ic), h('span', { class: 'lbl' }, label));
const pageTitle = (t) => h('h1', { class: 'page-title' }, t);

// =============== Paginas ===============
function feedPage() {
  const grid = masonry(
    async before => (await api('GET', `/api/feed?mode=following${before ? `&before=${before}` : ''}`)).posts,
    h('div', {}, 'Aún no hay nada por aquí. ', h('a', { href: '#/personas', class: 'accent' }, 'Sigue a gente'),
      ' o sube tu primer proyecto.'));
  shell.context.replaceChildren(
    ...ctxSection('Inicio', 'Tus proyectos y los de la gente que sigues.'),
    ctxButton('plus', 'Nueva publicación', () => openComposer(p => grid.prepend(p)), true));
  shell.content.replaceChildren(pageTitle('Inicio'), grid.el);
}

function followButton(user, onChange) {
  const b = h('button');
  const paint = () => { b.className = (user.following ? 'btn ghost' : 'btn') + (b.dataset.extra ? b.dataset.extra + (user.following ? '' : ' primary') : ''); b.textContent = user.following ? 'Siguiendo' : 'Seguir'; };
  paint();
  b.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { user.following = (await api('POST', `/api/users/${user.username}/follow`)).following; paint(); onChange && onChange(user.following); }
    catch (err) { toast(err.message); }
  };
  b.repaint = paint;
  return b;
}

async function peoplePage() {
  const { users } = await api('GET', '/api/users');
  let q = '', filter = 'all';
  const list = h('div', { class: 'people' });
  const paint = () => {
    const f = users.filter(u => (filter === 'all' || u.following) &&
      (u.displayName + ' ' + u.username).toLowerCase().includes(q));
    list.replaceChildren(...(f.length ? f.map(u => h('a', { href: `#/u/${u.username}`, class: 'person' },
      avatar(u), h('b', {}, u.displayName), h('span', { class: 'muted' }, '@' + u.username),
      h('p', {}, u.bio || ''),
      u.suspended ? h('span', { class: 'tag expired' }, 'Suspendida') : u.isMe ? h('span', { class: 'btn ghost' }, 'Tú') : followButton(u))) :
      [h('div', { class: 'empty', style: 'grid-column:1/-1' }, filter === 'following' && !q ? 'Todavía no sigues a nadie.' : 'No hay nadie con ese nombre.')]));
  };
  const search = h('input', { type: 'text', placeholder: 'Buscar personas…', oninput: e => { q = e.target.value.toLowerCase().trim(); paint(); } });
  const seg = h('div', { class: 'seg' });
  const paintSeg = () => seg.replaceChildren(
    h('button', { class: filter === 'all' ? 'active' : '', onclick: () => { filter = 'all'; paintSeg(); paint(); } }, 'Todos'),
    h('button', { class: filter === 'following' ? 'active' : '', onclick: () => { filter = 'following'; paintSeg(); paint(); } }, 'Que sigo'));
  paintSeg(); paint();
  shell.context.replaceChildren(
    ...ctxSection('Personas', 'Sigue a gente para ver sus proyectos en tu inicio.'),
    ctxButton('mail', 'Invitar a alguien', openInvites, true),
    h('div', { class: 'ctx-search' }, icon('search'), search), seg);
  shell.content.replaceChildren(pageTitle('Personas'), list);
}

// =============== Cuenta y seguridad ===============
function passwordHint(pw, username) {
  if (!pw) return '';
  if (pw.length < 8) return 'Mínimo 8 caracteres';
  if (username && username.length >= 3 && pw.toLowerCase().includes(username.toLowerCase())) return 'No puede contener tu usuario';
  let score = 0;
  if (pw.length >= 12) score++; if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++; if (/\d/.test(pw)) score++; if (/[^A-Za-z0-9]/.test(pw)) score++;
  return ['Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte', 'Muy fuerte'][score];
}
async function openSecurity() {
  const body = h('div', { class: 'sec' }, h('div', { class: 'muted' }, 'Cargando…'));
  const m = modal(h('div', {}, h('h2', {}, 'Cuenta y seguridad'), body));
  async function paint() {
    let data;
    try { data = await api('GET', '/api/me/security'); } catch (e) { return body.replaceChildren(h('div', { class: 'error' }, e.message)); }
    // --- contraseña
    const cur = h('input', { type: 'password', autocomplete: 'current-password' });
    const next = h('input', { type: 'password', autocomplete: 'new-password' });
    const rep2 = h('input', { type: 'password', autocomplete: 'new-password' });
    const hint = h('small', { class: 'pw-hint muted' });
    next.oninput = () => { hint.textContent = passwordHint(next.value, me.username); };
    const pwBtn = h('button', { class: 'btn' }, 'Cambiar contraseña');
    pwBtn.onclick = async () => {
      if (next.value !== rep2.value) return toast('Las contraseñas nuevas no coinciden');
      pwBtn.disabled = true;
      try { await api('POST', '/api/me/password', { current: cur.value, next: next.value }); toast('Contraseña cambiada. Se han cerrado tus otras sesiones.'); paint(); }
      catch (e) { toast(e.message); }
      pwBtn.disabled = false;
    };
    // --- sesiones
    const others = data.sessions.filter(x => !x.current).length;
    const sessions = h('div', { class: 'sessions' }, ...data.sessions.map(x => h('div', { class: 'session' },
      h('span', { class: 'ficon' }, icon('monitor')),
      h('div', { class: 'session-txt' },
        h('b', {}, x.device, x.current && h('span', { class: 'tag' }, 'Este dispositivo')),
        h('small', { class: 'muted' }, `${x.ip || 'IP desconocida'} · último uso ${timeAgo(x.lastUsed)} · desde ${new Date(x.createdAt).toLocaleDateString('es-ES')}`)),
      !x.current && h('button', { class: 'btn ghost small', onclick: async () => {
        try { await api('DELETE', `/api/me/sessions/${x.id}`); toast('Sesión cerrada'); paint(); } catch (e) { toast(e.message); }
      } }, 'Cerrar'))));
    const closeAll = others && h('button', { class: 'btn ghost', onclick: async () => {
      try { const r = await api('POST', '/api/me/sessions/close-others'); toast(`${r.closed} sesión${r.closed === 1 ? '' : 'es'} cerrada${r.closed === 1 ? '' : 's'}`); paint(); }
      catch (e) { toast(e.message); }
    } }, 'Cerrar todas las demás');
    // --- borrar cuenta
    const delBtn = h('button', { class: 'btn danger' }, 'Borrar mi cuenta para siempre');
    delBtn.onclick = () => {
      const conf = h('input', { type: 'text', placeholder: me.username });
      const pw = h('input', { type: 'password', autocomplete: 'current-password' });
      const go = h('button', { class: 'btn danger' }, 'Sí, borrar todo');
      go.onclick = async () => {
        go.disabled = true;
        try { await api('DELETE', '/api/me', { confirm: conf.value, password: pw.value }); md.close(); m.close(); me = null; toast('Cuenta borrada'); location.hash = '#/'; render(); }
        catch (e) { toast(e.message); go.disabled = false; }
      };
      const md = modal(h('div', {}, h('h2', {}, '¿Borrar tu cuenta?'),
        h('p', {}, 'Se borrarán para siempre tu perfil, tus proyectos con sus archivos, tus publicaciones y tus mensajes. No se puede deshacer.'),
        h('label', {}, `Escribe tu usuario (${me.username}) para confirmar`), conf,
        h('label', {}, 'Tu contraseña'), pw,
        h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), h('button', { class: 'btn ghost', onclick: () => md.close() }, 'Cancelar'), go)));
    };
    body.replaceChildren(
      h('section', { class: 'sec-block' }, h('h3', {}, icon('key'), 'Cambiar contraseña'),
        h('label', {}, 'Contraseña actual'), cur,
        h('label', {}, 'Nueva contraseña'), next, hint,
        h('label', {}, 'Repite la nueva contraseña'), rep2,
        h('p', { class: 'muted small-note' }, 'Mínimo 8 caracteres, que no sea una contraseña típica ni contenga tu usuario. Al cambiarla se cierran tus otras sesiones.'),
        h('div', { class: 'row' }, h('div', { class: 'spacer' }), pwBtn)),
      h('section', { class: 'sec-block' }, h('h3', {}, icon('monitor'), `Sesiones abiertas (${data.sessions.length})`),
        h('p', { class: 'muted small-note' }, 'Si ves un dispositivo que no reconoces, ciérralo y cambia tu contraseña.'),
        sessions, closeAll && h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { class: 'spacer' }), closeAll)),
      h('section', { class: 'sec-block' }, h('h3', {}, icon('folder'), 'Tu espacio'),
        h('div', { class: 'quota' }, h('div', { class: 'quota-fill', style: `width:${Math.min(100, data.storage.used / data.storage.quota * 100).toFixed(1)}%` })),
        h('p', { class: 'muted small-note' }, `Usas ${fmtSize(data.storage.used)} de ${fmtSize(data.storage.quota)}. Hoy has subido ${fmtSize(data.storage.today)} de ${fmtSize(data.storage.dailyQuota)} permitidos al día.`)),
      h('section', { class: 'sec-block danger-zone' }, h('h3', {}, icon('trash'), 'Zona peligrosa'),
        h('p', { class: 'muted small-note' }, 'Borra tu cuenta y todo tu contenido de Tinker.'), delBtn));
  }
  paint();
}

// =============== Invitaciones ===============
async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { if (input) { input.select(); document.execCommand && document.execCommand('copy'); toast('Selecciónalo y cópialo con Ctrl+C'); } }
}
async function openInvites() {
  const box = h('div', {}, h('div', { class: 'muted' }, 'Cargando…'));
  const created = h('div');
  const m = modal(h('div', {},
    h('h2', {}, 'Invitar a alguien'),
    h('p', { class: 'muted' }, `Cada invitación sirve para una sola persona y caduca en 7 días. Así, si un código se filtra, no puede usarlo nadie más. Puedes tener hasta 5 sin usar.`),
    created, box));
  async function paint() {
    let data; try { data = await api('GET', '/api/invites'); } catch (e) { return box.replaceChildren(h('div', { class: 'error' }, e.message)); }
    const btn = h('button', { class: 'btn' }, icon('plus'), ' Crear invitación');
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const r = await api('POST', '/api/invites');
        const inp = h('input', { type: 'text', value: r.code, readonly: true, class: 'invite-code', onfocus: e => e.target.select() });
        created.replaceChildren(h('div', { class: 'invite-new' },
          h('div', { class: 'muted', style: 'font-size:13px' }, 'Pásale este código. Solo se muestra ahora:'),
          h('div', { class: 'row', style: 'margin-top:6px' }, inp, h('button', { class: 'btn ghost', onclick: () => copyText(r.code, inp) }, icon('copy'), ' Copiar')),
          h('small', { class: 'muted' }, `Caduca el ${new Date(r.expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`)));
        paint();
      } catch (e) { toast(e.message); btn.disabled = false; }
    };
    const label = { pending: 'Pendiente', used: 'Usada', expired: 'Caducada' };
    box.replaceChildren(
      h('div', { class: 'row', style: 'margin:6px 0 14px' }, h('div', { class: 'spacer' }), btn),
      data.invites.length ? h('div', { class: 'sessions' }, ...data.invites.map(x => h('div', { class: 'session' },
        h('span', { class: 'ficon' }, icon('mail')),
        h('div', { class: 'session-txt' },
          h('b', {}, `TNK-····-··${x.hint}`, h('span', { class: 'tag ' + x.status }, label[x.status])),
          h('small', { class: 'muted' }, x.status === 'used' ? `La usó @${x.usedBy || 'cuenta borrada'}` :
            x.status === 'pending' ? `Caduca el ${new Date(x.expiresAt).toLocaleDateString('es-ES')}` : `Caducó el ${new Date(x.expiresAt).toLocaleDateString('es-ES')}`)),
        x.status === 'pending' && h('button', { class: 'btn ghost small', onclick: async () => {
          try { await api('DELETE', `/api/invites/${x.id}`); toast('Invitación anulada'); paint(); } catch (e) { toast(e.message); }
        } }, 'Anular'))))
        : h('div', { class: 'muted' }, 'Aún no has creado ninguna invitación.'));
  }
  paint();
}

// =============== Perfil ===============
const SECTIONS = [
  { key: 'bienvenida', label: 'Bienvenida', ic: 'user' },
  { key: 'proyectos', label: 'Proyectos', ic: 'folder' },
  { key: 'contacto', label: 'Contacto', ic: 'message' },
];

function sectionDropdown(current, onPick, sections = SECTIONS) {
  const cur = sections.find(s => s.key === current);
  const menu = h('div', { class: 'dd-menu', hidden: true },
    ...sections.map(s => h('button', { class: 'dd-item' + (s.key === current ? ' active' : ''),
      onclick: () => { menu.hidden = true; if (s.key !== current) onPick(s.key); } }, icon(s.ic), s.label)));
  const btn = h('button', { class: 'dd-btn', onclick: e => { e.stopPropagation(); menu.hidden = !menu.hidden; } },
    icon(cur.ic), h('span', {}, cur.label), h('span', { class: 'chev' }, icon('chevron')));
  const close = () => (menu.hidden = true);
  document.addEventListener('click', close);
  cleanup.push(() => document.removeEventListener('click', close));
  return h('div', { class: 'dd' }, btn, menu);
}

async function profilePage(username, section) {
  if (!SECTIONS.some(s => s.key === section)) section = 'bienvenida';
  const { user, posts } = await api('GET', `/api/users/${encodeURIComponent(username)}`);
  const base = `#/u/${user.username}`;
  const followersEl = h('b', {}, user.followers);
  let grid = null;

  const banner = h('header', { class: 'banner' + (user.banner ? '' : ' no-img'),
    style: user.banner ? `background-image:url("${user.banner}")` : null },
    user.isMe && h('button', { class: 'banner-edit', onclick: openEditProfile }, icon('image'),
      h('span', {}, user.banner ? 'Cambiar banner' : 'Añadir banner')),
    h('div', { class: 'banner-info' }, avatar(user, 'big'),
      h('div', { style: 'min-width:0' },
        h('h1', {}, user.displayName),
        h('div', { class: 'handle' }, '@' + user.username),
        user.bio && h('div', { class: 'banner-bio' }, user.bio),
        user.invitedBy && h('div', { class: 'banner-inv' }, 'Invitado por ', h('a', { href: `#/u/${user.invitedBy}` }, '@' + user.invitedBy)),
        user.suspended && h('div', { class: 'banner-flag' }, 'Cuenta suspendida'),
        user.blockedByMe && h('div', { class: 'banner-flag' }, 'Has bloqueado a esta persona'),
        h('div', { class: 'banner-stats' },
          h('span', {}, h('b', {}, user.postCount), ' publicaciones'),
          h('span', {}, followersEl, ' seguidores'),
          h('span', {}, h('b', {}, user.followingCount), ' siguiendo')))));

  const body = h('div', { class: 'section-body' });
  shell.content.replaceChildren(banner,
    h('div', { class: 'toolbar' }, sectionDropdown(section, k => { location.hash = `${base}/${k}`; })),
    body);

  if (user.isMe) {
    shell.context.replaceChildren(
      ...ctxSection('Mi perfil', 'Así te ven los demás.'),
      ctxButton('plus', 'Nueva publicación', () => openComposer(p => {
        if (grid) grid.prepend(p); else location.hash = `${base}/bienvenida`;
      }), true),
      ctxButton('folder', 'Nuevo proyecto', () => openNewProject(() => {
        if (section === 'proyectos') render(); else location.hash = `${base}/proyectos`;
      })),
      ctxButton('edit', 'Editar perfil', openEditProfile),
      ctxButton('shield', 'Cuenta y seguridad', openSecurity));
  } else {
    const fb = followButton(user, f => { followersEl.textContent = Number(followersEl.textContent) + (f ? 1 : -1); });
    fb.dataset.extra = ' ctx-btn'; fb.repaint();
    const blockBtn = ctxButton('ban', user.blockedByMe ? 'Desbloquear' : 'Bloquear', async () => {
      if (!user.blockedByMe && !confirm(`¿Bloquear a @${user.username}? No podrá escribirte, no verá tu perfil ni tus publicaciones, y dejaréis de seguiros.`)) return;
      try { const r = await api('POST', `/api/users/${user.username}/block`); toast(r.blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado'); render(); }
      catch (e) { toast(e.message); }
    });
    const modBtn = user.canModerate && ctxButton('flag', user.suspended ? 'Reactivar cuenta' : 'Suspender cuenta', async () => {
      if (!confirm(user.suspended ? `¿Reactivar la cuenta de @${user.username}?` : `¿Suspender la cuenta de @${user.username}? Se cerrarán sus sesiones, no podrá entrar y su contenido dejará de verse.`)) return;
      try { const r = await api('POST', `/api/admin/users/${user.username}/suspend`); toast(r.suspended ? 'Cuenta suspendida' : 'Cuenta reactivada'); render(); }
      catch (e) { toast(e.message); }
    });
    shell.context.replaceChildren(
      ...ctxSection('Perfil', `El espacio de ${user.displayName}.`),
      ...(user.blockedByMe || user.suspended ? [] : [fb]),
      ...(section !== 'contacto' && !user.blockedByMe && !user.suspended ? [ctxButton('message', 'Enviar mensaje', () => { location.hash = `${base}/contacto`; })] : []),
      blockBtn,
      ...(modBtn ? [h('div', { class: 'ctx-title', style: 'margin-top:6px' }, 'Administración'), modBtn] : []));
  }

  if (section === 'bienvenida') {
    const editLink = h('a', { href: '#', class: 'accent', onclick: e => { e.preventDefault(); openEditProfile(); } }, 'Escríbela ahora');
    body.append(h('section', { class: 'about' },
      h('h3', {}, 'Bienvenida'),
      user.about ? h('div', { class: 'about-text' }, user.about)
        : h('div', { class: 'muted' }, user.isMe ? ['Todavía no has escrito tu bienvenida. ', editLink]
          : `${user.displayName} todavía no ha escrito su bienvenida.`)));
    let first = posts;
    grid = masonry(async before => {
      if (!before && first) { const p = first; first = null; return p; }
      return (await api('GET', `/api/users/${encodeURIComponent(username)}?before=${before}`)).posts;
    }, user.isMe ? 'Todavía no has publicado nada. ¡Sube tu primer proyecto!' : 'Todavía no ha publicado nada.');
    body.append(h('h3', { class: 'sec-title' }, 'Publicaciones'), grid.el);
  } else if (section === 'proyectos') {
    body.append(await projectsView(user));
  } else {
    body.append(user.isMe ? await inboxView()
      : user.blockedByMe ? h('div', { class: 'about' }, h('h3', {}, 'Contacto'), h('div', { class: 'muted' }, 'Has bloqueado a esta persona. Desbloquéala para poder escribirle.'))
      : user.suspended ? h('div', { class: 'about' }, h('h3', {}, 'Contacto'), h('div', { class: 'muted' }, 'Esta cuenta está suspendida.'))
      : chatView(user));
  }
}

async function projectsView(user) {
  const { projects } = await api('GET', `/api/users/${encodeURIComponent(user.username)}/projects`);
  const wrap = h('div', { class: 'folders' });
  const paint = () => wrap.replaceChildren(...[
    ...projects.map(p => h('a', { class: 'folder', title: p.name, href: `#/p/${p.id}` },
      p.cover ? h('span', { class: 'f-cover', style: `background-image:url("${p.cover}")` })
        : h('span', { class: 'f-icon' }, icon('folder')),
      h('b', { class: 'f-name' }, p.name),
      p.description && h('p', { class: 'f-desc' }, p.description),
      h('small', { class: 'f-date' }, `${p.postCount} publicaci${p.postCount === 1 ? 'ón' : 'ones'} · ${timeAgo(p.createdAt)}`),
      p.mine && h('button', { class: 'icon-btn f-del', title: 'Borrar proyecto', onclick: async e => {
        e.stopPropagation(); e.preventDefault();
        if (!confirm(`¿Borrar el proyecto "${p.name}"? Se borrarán también sus ${p.postCount} publicaciones.`)) return;
        try { await api('DELETE', `/api/projects/${p.id}`); projects.splice(projects.indexOf(p), 1); paint(); toast('Proyecto borrado'); }
        catch (err) { toast(err.message); }
      } }, icon('trash')))),
    user.isMe && h('div', { class: 'folder new', onclick: () => openNewProject(p => { projects.unshift(p); paint(); }) },
      h('span', { class: 'f-icon' }, icon('plus')), h('b', { class: 'f-name' }, 'Nuevo proyecto'),
      h('small', { class: 'f-date' }, 'Crea una carpeta para un proyecto')),
    !user.isMe && !projects.length &&
      h('div', { class: 'empty', style: 'grid-column:1/-1' }, `${user.displayName} todavía no tiene proyectos.`)
  ].filter(Boolean));
  paint();
  return wrap;
}

// =============== Proyecto ===============
const PROJECT_SECTIONS = [
  { key: 'archivos', label: 'Archivos', ic: 'file' },
  { key: 'readme', label: 'README', ic: 'book' },
  { key: 'multimedia', label: 'Multimedia', ic: 'image' },
];

// Markdown sencillo y seguro (se escapa todo el HTML)
function markdown(src) {
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = t => {
    const codes = [];
    t = esc(t).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    t = t.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/uploads\/[^)\s]+|\/api\/files\/\d+[^)\s]*)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  };
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let out = '', para = [], list = null;
  const flushPara = () => { if (para.length) { out += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
  const flushList = () => { if (list) { out += `<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`; list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^```/.test(line)) {
      flushPara(); flushList();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      out += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
    } else if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushPara(); flushList(); out += '<hr>';
    } else if ((m = /^\s*[-*+]\s+(.*)$/.exec(line)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      flushPara();
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara(); flushList(); out += `<blockquote>${inline(m[1])}</blockquote>`;
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList(); para.push(line);
    }
  }
  flushPara(); flushList();
  return out;
}

// =============== Archivos del proyecto (estilo GitHub) ===============
const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log',
  'c', 'h', 'cpp', 'hpp', 'cc', 'ino', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'java', 'kt', 'cs', 'go', 'rs',
  'rb', 'php', 'sh', 'bat', 'ps1', 'sql', 'm', 'r', 'lua', 'v', 'vhd', 'vhdl', 'gcode', 'nc', 'scad', 'tex', 'svg']);
const IMG_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Recorre carpetas soltadas con arrastrar y soltar
async function filesFromDrop(dt) {
  const out = [];
  const items = [...(dt.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...dt.files].map(f => ({ file: f, path: f.name }));
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      out.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const e of batch) await walk(e, prefix + entry.name + '/');
      } while (batch.length);
    }
  };
  for (const e of items) await walk(e, '');
  return out;
}

function uploadOne(projectId, path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
      xhr.status < 300 ? resolve(data.file) : reject(new Error(data.error || 'No se pudo subir'));
    };
    xhr.onerror = () => reject(new Error('Se cortó la conexión'));
    xhr.send(file);
  });
}

function openFileViewer(f) {
  const name = f.path.split('/').pop();
  const ext = extOf(name);
  const body = h('div', { class: 'viewer-body' });
  const dl = h('a', { class: 'btn', href: `/api/files/${f.id}?as=download` }, icon('download'), ' Descargar');
  modal(h('div', { class: 'viewer' },
    h('div', { class: 'viewer-head' }, icon('file'), h('b', {}, f.path), h('span', { class: 'muted' }, fmtSize(f.size))),
    body, h('div', { class: 'row', style: 'margin-top:14px' }, h('span', { class: 'spacer' }), dl)), 'viewer-modal');
  if (IMG_EXT.has(ext)) body.append(h('img', { src: `/api/files/${f.id}`, alt: name }));
  else if (TEXT_EXT.has(ext) && f.size <= 1024 * 1024) {
    body.append(h('div', { class: 'muted' }, 'Cargando…'));
    fetch(`/api/files/${f.id}?as=text`).then(r => r.text()).then(t => {
      if (ext === 'md' || ext === 'markdown') { const md = h('div', { class: 'md' }); md.innerHTML = markdown(t); body.replaceChildren(md); }
      else {
        const lines = t.split('\n');
        body.replaceChildren(h('pre', { class: 'code' }, h('code', {}, ...lines.map((l, i) =>
          h('span', { class: 'ln' }, h('i', {}, i + 1), l + (i < lines.length - 1 ? '\n' : ''))))));
      }
    }).catch(() => body.replaceChildren(h('div', { class: 'muted' }, 'No se pudo abrir el archivo.')));
  } else if (ext === 'pdf') {
    body.append(h('iframe', { class: 'pdf', src: `/api/files/${f.id}`, title: name }));
  } else if (['mp4', 'webm'].includes(ext)) {
    body.append(h('video', { src: `/api/files/${f.id}`, controls: true }));
  } else {
    body.append(h('div', { class: 'viewer-none' }, icon('file'),
      h('p', {}, 'Este tipo de archivo no se puede ver aquí.'), h('p', { class: 'muted' }, 'Descárgalo para abrirlo con tu programa.')));
  }
}

async function filesView(project, autoUpload, onCount) {
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
        const f = await uploadOne(project.id, target, x.file, paintBar);
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

function readmeView(project) {
  const box = h('section', { class: 'readme' });
  const view = () => {
    const bodyEl = h('div', { class: 'md' });
    if (project.readme.trim()) bodyEl.innerHTML = markdown(project.readme);
    else bodyEl.append(h('p', { class: 'muted' }, project.mine
      ? 'Este proyecto todavía no tiene README. Cuenta de qué va, cómo está hecho y qué te falta.'
      : 'Este proyecto todavía no tiene README.'));
    box.replaceChildren(
      h('div', { class: 'readme-head' }, icon('book'), h('b', {}, 'README.md'), h('span', { class: 'spacer' }),
        project.mine && h('button', { class: 'icon-btn', title: 'Editar README', onclick: edit }, icon('edit'))),
      bodyEl);
  };
  const edit = () => {
    let mode = 'write';
    const ta = h('textarea', { class: 'readme-ta', rows: 18, spellcheck: true }, project.readme);
    const preview = h('div', { class: 'md readme-preview' });
    const seg = h('div', { class: 'seg', style: 'width:240px' });
    const area = h('div');
    const paint = () => {
      seg.replaceChildren(
        h('button', { class: mode === 'write' ? 'active' : '', onclick: () => { mode = 'write'; paint(); } }, 'Escribir'),
        h('button', { class: mode === 'preview' ? 'active' : '', onclick: () => { mode = 'preview'; paint(); } }, 'Vista previa'));
      if (mode === 'preview') preview.innerHTML = markdown(ta.value) || '<p class="muted">Nada que mostrar todavía.</p>';
      area.replaceChildren(mode === 'write' ? ta : preview);
      if (mode === 'write') ta.focus();
    };
    const save = h('button', { class: 'btn' }, 'Guardar README');
    save.onclick = async () => {
      save.disabled = true;
      try { project.readme = (await api('PUT', `/api/projects/${project.id}`, { readme: ta.value })).project.readme; toast('README guardado'); view(); }
      catch (e) { toast(e.message); save.disabled = false; }
    };
    box.replaceChildren(
      h('div', { class: 'readme-head' }, icon('book'), h('b', {}, 'Editando README.md'), h('span', { class: 'spacer' }), seg),
      h('div', { class: 'readme-edit' }, area,
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('span', { class: 'muted', style: 'font-size:13px' }, 'Admite Markdown: # Títulos, **negrita**, *cursiva*, listas con -, `código` y [enlaces](https://…)'),
          h('span', { class: 'spacer' }), h('button', { class: 'btn ghost', onclick: view }, 'Cancelar'), save)));
    paint();
  };
  view();
  box.edit = edit;
  return box;
}

function openEditProject(project, onSave) {
  const name = h('input', { type: 'text', maxlength: 60, value: project.name });
  const desc = h('textarea', { rows: 3, maxlength: 300 }, project.description);
  const btn = h('button', { class: 'btn' }, 'Guardar');
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const r = await api('PUT', `/api/projects/${project.id}`, { name: name.value, description: desc.value });
      m.close(); toast('Proyecto guardado'); onSave && onSave(r.project);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Editar proyecto'),
    h('label', {}, 'Nombre'), name, h('label', {}, 'Descripción corta'), desc,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), btn)));
}

async function projectPage(id, section) {
  const rawSection = section || '';
  const wantEdit = /\?editar$/.test(rawSection);
  section = (section || '').replace(/\?.*$/, '');
  const { project } = await api('GET', `/api/projects/${encodeURIComponent(id)}`);
  if (!PROJECT_SECTIONS.some(s => s.key === section)) section = PROJECT_SECTIONS[0].key;
  const base = `#/p/${project.id}`;
  const owner = project.owner;
  const fileCountEl = h('span', {});
  const paintCount = n => fileCountEl.replaceChildren(icon('file'), `${n} archivo${n === 1 ? '' : 's'}`);
  paintCount(project.fileCount);

  const head = h('header', { class: 'proj-head' },
    h('span', { class: 'proj-icon' }, icon('folder')),
    h('div', { style: 'min-width:0' },
      h('div', { class: 'proj-path' },
        h('a', { href: `#/u/${owner.username}/proyectos`, class: 'proj-owner' }, avatar(owner, 'xs'), owner.displayName),
        h('span', { class: 'slash' }, '/'),
        h('b', {}, project.name)),
      project.description && h('p', { class: 'proj-desc' }, project.description),
      h('div', { class: 'proj-stats' },
        fileCountEl,
        h('span', {}, icon('image'), `${project.postCount} publicaci${project.postCount === 1 ? 'ón' : 'ones'}`),
        h('span', {}, 'Creado ' + timeAgo(project.createdAt)))));
  const body = h('div', { class: 'section-body' });
  shell.content.replaceChildren(head,
    h('div', { class: 'toolbar' }, sectionDropdown(section, k => { location.hash = `${base}/${k}`; }, PROJECT_SECTIONS)),
    body);

  let grid = null, readmeBox = null, filesBox = null;
  if (project.mine) {
    shell.context.replaceChildren(
      ...ctxSection('Proyecto', 'Tu proyecto. Todo lo que publiques aquí sale en Multimedia.'),
      ctxButton('plus', 'Nueva publicación', () => openComposer(p => {
        if (p.project && p.project.id === project.id && grid) grid.prepend(p); else if (p.project) location.hash = `#/p/${p.project.id}/multimedia`;
      }, project.id), true),
      ctxButton('upload', 'Subir archivos', () => {
        if (section === 'archivos' && filesBox) filesBox.pick(); else location.hash = `${base}/archivos?subir`;
      }),
      ctxButton('book', 'Editar README', () => {
        if (section === 'readme' && readmeBox) readmeBox.edit(); else location.hash = `${base}/readme?editar`;
      }),
      ctxButton('edit', 'Editar proyecto', () => openEditProject(project, () => render())),
      ctxButton('trash', 'Borrar proyecto', async () => {
        if (!confirm(`¿Borrar el proyecto "${project.name}"? Se borrarán también sus publicaciones.`)) return;
        try { await api('DELETE', `/api/projects/${project.id}`); toast('Proyecto borrado'); location.hash = `#/u/${me.username}/proyectos`; }
        catch (e) { toast(e.message); }
      }));
  } else {
    shell.context.replaceChildren(
      ...ctxSection('Proyecto', `Un proyecto de ${owner.displayName}.`),
      ctxButton('user', `Perfil de ${owner.displayName}`, () => { location.hash = `#/u/${owner.username}`; }),
      ctxButton('message', 'Enviar mensaje', () => { location.hash = `#/u/${owner.username}/contacto`; }),
      ...(project.canDelete ? [h('div', { class: 'ctx-title', style: 'margin-top:6px' }, 'Administración'),
        ctxButton('trash', 'Borrar proyecto', async () => {
          if (!confirm(`Vas a borrar el proyecto "${project.name}" de @${owner.username} como administrador, con todas sus publicaciones y archivos. ¿Seguro?`)) return;
          try { await api('DELETE', `/api/projects/${project.id}`); toast('Proyecto borrado'); location.hash = `#/u/${owner.username}/proyectos`; }
          catch (e) { toast(e.message); }
        })] : []));
  }

  if (section === 'archivos') {
    filesBox = await filesView(project, /\?subir$/.test(rawSection), paintCount);
    body.append(filesBox);
  } else if (section === 'readme') {
    readmeBox = readmeView(project);
    body.append(readmeBox);
    if (wantEdit && project.mine) readmeBox.edit();
  } else if (section === 'multimedia') {
    grid = masonry(async before =>
      (await api('GET', `/api/projects/${project.id}/posts${before ? `?before=${before}` : ''}`)).posts,
      project.mine ? 'Aún no hay publicaciones en este proyecto. ¡Sube la primera foto!' : 'Aún no hay publicaciones en este proyecto.');
    body.append(grid.el);
  }
  return project;
}

// =============== Chat ===============
function chatView(other) {
  const list = h('div', { class: 'chat-msgs' }, h('div', { class: 'chat-empty' }, 'Cargando…'));
  const input = h('textarea', { rows: 1, maxlength: 2000, placeholder: `Escribe a ${other.displayName}…` });
  let last = 0, loaded = false, alive = true, timer = null, pending = null, stick = true;
  const bubble = m => h('div', { class: 'msg' + (m.mine ? ' mine' : '') }, h('div', {}, m.text),
    h('small', {}, new Date(m.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
  const fetchNew = () => pending ||= (async () => {
    try {
      const { messages } = await api('GET', `/api/messages/${encodeURIComponent(other.username)}?after=${last}`);
      if (!alive) return;
      if (!loaded) {
        loaded = true;
        list.replaceChildren(messages.length ? '' : h('div', { class: 'chat-empty' }, `Aún no habéis hablado. ¡Saluda a ${other.displayName}!`));
      }
      if (messages.length) {
        list.querySelector('.chat-empty')?.remove();
        const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
        messages.forEach(m => list.append(bubble(m)));
        last = messages[messages.length - 1].id;
        if (nearBottom || stick) list.scrollTop = list.scrollHeight;
        stick = false;
        if (messages.some(m => !m.mine)) refreshUnread();
      }
    } catch {}
  })().finally(() => { pending = null; });
  const loop = async () => { await fetchNew(); if (alive) timer = setTimeout(loop, 3000); };
  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; autosize();
    try {
      await api('POST', `/api/messages/${encodeURIComponent(other.username)}`, { text });
      stick = true;
      await pending; await fetchNew();
    } catch (e) { toast(e.message); input.value = text; }
  }
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const stop = () => { alive = false; clearTimeout(timer); };
  cleanup.push(stop);
  loop();
  const el = h('div', { class: 'chat' },
    h('div', { class: 'chat-head' },
      h('a', { href: `#/u/${other.username}` }, avatar(other, 'small')),
      h('div', { style: 'min-width:0' }, h('a', { href: `#/u/${other.username}` }, h('b', {}, other.displayName)),
        h('div', { class: 'muted', style: 'font-size:13px' }, '@' + other.username))),
    list,
    h('form', { class: 'chat-form', onsubmit: e => { e.preventDefault(); send(); } },
      input, h('button', { class: 'btn', title: 'Enviar' }, icon('send'))));
  el.stop = stop;
  return el;
}

async function inboxView() {
  const { conversations } = await api('GET', '/api/conversations');
  if (!conversations.length) {
    return h('div', { class: 'about' }, h('h3', {}, 'Contacto'),
      h('div', { class: 'muted' }, 'Aquí verás tus conversaciones. Entra en el perfil de alguien, abre "Contacto" y escríbele.'));
  }
  let current = null, chatEl = null;
  const side = h('div', { class: 'convs' });
  const pane = h('div', { class: 'inbox-pane' });
  const paintSide = () => side.replaceChildren(...conversations.map(c =>
    h('button', { class: 'conv' + (current === c.user.username ? ' active' : ''), onclick: () => open(c) },
      avatar(c.user, 'small'),
      h('div', { class: 'conv-txt' }, h('b', {}, c.user.displayName),
        h('div', { class: 'last' }, (c.last.mine ? 'Tú: ' : '') + c.last.text)),
      c.unread ? h('span', { class: 'badge' }, c.unread) : null)));
  function open(c) {
    current = c.user.username; c.unread = 0;
    chatEl?.stop();
    chatEl = chatView(c.user);
    pane.replaceChildren(chatEl);
    paintSide();
  }
  open(conversations.find(c => c.unread) || conversations[0]);
  return h('div', { class: 'inbox' }, side, pane);
}

// =============== Acceso ===============
function authView() {
  let mode = 'login';
  const err = h('div', { class: 'error' });
  const fields = {
    username: h('input', { type: 'text', autocomplete: 'username', maxlength: 20 }),
    displayName: h('input', { type: 'text', maxlength: 40 }),
    password: h('input', { type: 'password', autocomplete: 'current-password', maxlength: 200 }),
    invite: h('input', { type: 'text', placeholder: 'TNK-XXXX-XXXX', autocomplete: 'off', spellcheck: false }),
  };
  const extra = h('div', {}, h('label', {}, 'Nombre visible'), fields.displayName,
    h('label', {}, 'Código de invitación'), fields.invite);
  const submit = h('button', { class: 'btn', style: 'width:100%;margin-top:16px' });
  const seg = h('div', { class: 'seg' });
  const paint = () => {
    seg.replaceChildren(
      h('button', { type: 'button', class: mode === 'login' ? 'active' : '', onclick: () => { mode = 'login'; paint(); } }, 'Entrar'),
      h('button', { type: 'button', class: mode === 'register' ? 'active' : '', onclick: () => { mode = 'register'; paint(); } }, 'Crear cuenta'));
    extra.hidden = mode === 'login';
    submit.textContent = mode === 'login' ? 'Entrar' : 'Crear cuenta';
    err.textContent = '';
  };
  paint();
  const form = h('form', { onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = ''; submit.disabled = true;
    const body = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.value]));
    try { me = (await api('POST', mode === 'login' ? '/api/login' : '/api/register', body)).user; location.hash = '#/'; render(); }
    catch (e) { err.textContent = e.message; }
    submit.disabled = false;
  } }, seg, h('label', {}, 'Usuario'), fields.username, h('label', {}, 'Contraseña'), fields.password, extra, submit, err);
  return h('div', { class: 'auth' },
    h('div', { class: 'auth-logo' }, h('span', { class: 'logo-mark' }, icon('wrench')), 'Tinker'),
    h('p', { class: 'lead' }, 'Cacharrando: proyectos de ingeniería, deporte y lo que se te ocurra.'), form);
}

// =============== Navegacion ===============
async function render() {
  cleanup.forEach(f => f()); cleanup = [];
  if (!me) { shell.content = null; root.replaceChildren(authView()); return; }
  if (!shell.content || !shell.content.isConnected) buildShell();
  paintMe();
  const hash = location.hash || '#/';
  let key = 'feed';
  try {
    if (hash.startsWith('#/u/')) {
      const [u, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      key = u.toLowerCase() === me.username.toLowerCase() ? 'perfil' : '';
      await profilePage(u, sec);
    } else if (hash.startsWith('#/p/')) {
      const [id, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      const project = await projectPage(id, sec);
      key = project.mine ? 'perfil' : '';
    } else if (hash === '#/personas') { key = 'personas'; await peoplePage(); }
    else feedPage();
  } catch (e) {
    shell.context.replaceChildren();
    shell.content.replaceChildren(h('div', { class: 'empty' }, e.message));
  }
  for (const [k, a] of Object.entries(shell.nav)) a.classList.toggle('active', k === key);
  scrollTo(0, 0);
}
window.addEventListener('hashchange', render);
(async () => { try { me = (await api('GET', '/api/me')).user; } catch {} render(); })();
