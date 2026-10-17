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
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
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
function pickImage(cb) {
  const inp = h('input', { type: 'file', accept: 'image/*' });
  inp.onchange = async () => { if (inp.files[0]) try { cb(await resizeImage(inp.files[0])); } catch (e) { toast(e.message); } };
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

function openPost(post, onChange, onDelete) {
  const likeBtn = h('button', { class: 'icon-btn', title: 'Me gusta' });
  const paintLike = () => {
    likeBtn.className = 'icon-btn' + (post.liked ? ' liked' : '');
    likeBtn.replaceChildren(icon('heart'), h('span', {}, `${post.likes} me gusta`));
  };
  paintLike();
  likeBtn.onclick = async () => {
    try { Object.assign(post, (await api('POST', `/api/posts/${post.id}/like`)).post); paintLike(); onChange(); }
    catch (e) { toast(e.message); }
  };
  const list = h('div', { class: 'pm-comments' }, h('div', { class: 'muted' }, 'Cargando…'));
  const input = h('input', { type: 'text', placeholder: 'Añade un comentario…', maxlength: 500 });
  const form = h('form', { class: 'comment-form', onsubmit: async (ev) => {
    ev.preventDefault();
    if (!input.value.trim()) return;
    try {
      await api('POST', `/api/posts/${post.id}/comments`, { text: input.value });
      input.value = ''; post.comments++; onChange();
      await loadComments(); list.scrollTop = list.scrollHeight;
    } catch (e) { toast(e.message); }
  } }, input, h('button', { class: 'btn' }, 'Enviar'));
  async function loadComments() {
    const { comments } = await api('GET', `/api/posts/${post.id}/comments`);
    list.replaceChildren(...(comments.length ? comments.map(c => h('div', { class: 'comment' },
      h('a', { href: `#/u/${c.author.username}` }, avatar(c.author, 'small')),
      h('div', { class: 'bubble' },
        h('div', { class: 'row' }, h('a', { href: `#/u/${c.author.username}` }, h('b', {}, c.author.displayName)),
          h('small', { class: 'muted' }, timeAgo(c.createdAt))),
        h('div', {}, c.text)))) : [h('div', { class: 'muted' }, 'Sin comentarios todavía. ¡Sé el primero!')]));
  }
  const media = post.image
    ? h('div', { class: 'pm-media' }, h('img', { src: post.image, alt: '' }))
    : h('div', { class: 'pm-media text', style: `--c:${colorFor(post.author.username)}` }, post.text);
  const m = modal(h('div', { class: 'pm' }, media,
    h('div', { class: 'pm-side' },
      h('div', { class: 'row pm-head' },
        h('a', { href: `#/u/${post.author.username}` }, avatar(post.author)),
        h('div', { style: 'min-width:0' },
          h('a', { href: `#/u/${post.author.username}`, class: 'name' }, post.author.displayName),
          h('div', { class: 'muted', style: 'font-size:13px' }, `@${post.author.username} · ${timeAgo(post.createdAt)}`)),
        h('div', { class: 'spacer' }),
        post.mine && h('button', { class: 'icon-btn', title: 'Borrar publicación', onclick: async () => {
          if (!confirm('¿Borrar esta publicación?')) return;
          try { await api('DELETE', `/api/posts/${post.id}`); m.close(); onDelete(); toast('Publicación borrada'); }
          catch (e) { toast(e.message); }
        } }, icon('trash'))),
      post.image && post.text && h('p', { class: 'pm-text' }, post.text),
      list,
      h('div', { class: 'row pm-actions' }, likeBtn),
      form)), 'wide');
  loadComments().catch(e => list.replaceChildren(h('div', { class: 'muted' }, e.message)));
}

function openComposer(onPost) {
  let image = null;
  const text = h('textarea', { rows: 4, maxlength: 1000, placeholder: 'Cuenta tu proyecto: qué es, cómo lo hiciste, qué aprendiste…' });
  const drop = h('div', { class: 'drop' });
  const paint = () => drop.replaceChildren(image
    ? h('div', { class: 'drop-preview' }, h('img', { src: image }),
        h('button', { class: 'icon-btn', title: 'Quitar foto', onclick: e => { e.stopPropagation(); image = null; paint(); } }, icon('x')))
    : h('div', { class: 'drop-empty' }, icon('image'), h('div', {}, 'Haz clic o arrastra aquí una foto')));
  paint();
  drop.onclick = () => { if (!image) pickImage(d => { image = d; paint(); }); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = async e => {
    e.preventDefault(); drop.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) try { image = await resizeImage(f); paint(); } catch (err) { toast(err.message); }
  };
  const btn = h('button', { class: 'btn' }, 'Publicar');
  btn.onclick = async () => {
    if (!text.value.trim() && !image) return toast('Añade una foto o escribe algo');
    btn.disabled = true;
    try {
      const { post } = await api('POST', '/api/posts', { text: text.value, image });
      m.close(); toast('¡Publicado!'); onPost && onPost(post);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  const m = modal(h('div', { class: 'composer' },
    h('h2', {}, 'Nueva publicación'), h('div', { class: 'muted' }, 'Lo más visual posible: una buena foto vale más que mil palabras.'),
    drop, text, h('div', { class: 'row' }, h('div', { class: 'spacer' }), btn)));
}

function openEditProfile() {
  let newAvatar = null;
  const name = h('input', { type: 'text', value: me.displayName, maxlength: 40 });
  const bio = h('textarea', { rows: 3, maxlength: 200, placeholder: 'Ingeniero mecánico, ciclista, maker…' }, me.bio);
  const av = h('div', {}, avatar(me, 'big'));
  const save = h('button', { class: 'btn' }, 'Guardar');
  save.onclick = async () => {
    save.disabled = true;
    try {
      me = (await api('PUT', '/api/me', { displayName: name.value, bio: bio.value, avatar: newAvatar })).user;
      m.close(); toast('Perfil guardado'); render();
    } catch (e) { toast(e.message); }
    save.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Editar perfil'),
    h('div', { class: 'avatar-edit' }, av, h('button', { class: 'btn ghost', onclick: () => pickImage(d => {
      newAvatar = d; av.replaceChildren(h('img', { class: 'avatar big', src: d }));
    }) }, 'Cambiar foto')),
    h('label', {}, 'Nombre visible'), name,
    h('label', {}, 'Biografía'), bio,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), save)));
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
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => relayout(), 120); };
  addEventListener('resize', onResize);
  cleanup.push(() => { alive = false; io.disconnect(); removeEventListener('resize', onResize); });
  return ctl;
}

function tile(post, ctl) {
  const meta = h('div', { class: 'tile-meta' });
  const paintMeta = () => meta.replaceChildren(
    h('a', { href: `#/u/${post.author.username}`, class: 'tile-author', onclick: e => e.stopPropagation() },
      avatar(post.author, 'xs'), h('span', {}, post.author.displayName)),
    h('span', { class: 'spacer' }),
    h('span', { class: 'stat' + (post.liked ? ' liked' : '') }, icon('heart'), post.likes),
    h('span', { class: 'stat' }, icon('message'), post.comments));
  paintMeta();
  const t = h('article', { class: 'tile' },
    post.image
      ? h('img', { src: post.image, alt: '', width: post._w, height: post._h })
      : h('div', { class: 'tile-text', style: `--c:${colorFor(post.author.username)}` }, post.text),
    post.image && post.text && h('p', { class: 'tile-caption' }, post.text),
    meta);
  t.onclick = () => openPost(post, paintMeta, () => ctl.remove(t));
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
function paintMe() {
  shell.nav.perfil.href = `#/u/${me.username}`;
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
  const paint = () => { b.className = (user.following ? 'btn ghost' : 'btn') + (b.dataset.extra || ''); b.textContent = user.following ? 'Siguiendo' : 'Seguir'; };
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
      u.isMe ? h('span', { class: 'btn ghost' }, 'Tú') : followButton(u))) :
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
    h('div', { class: 'ctx-search' }, icon('search'), search), seg);
  shell.content.replaceChildren(pageTitle('Personas'), list);
}

async function profilePage(username) {
  const { user, posts } = await api('GET', `/api/users/${encodeURIComponent(username)}`);
  let first = posts;
  const grid = masonry(async before => {
    if (!before && first) { const p = first; first = null; return p; }
    return (await api('GET', `/api/users/${encodeURIComponent(username)}?before=${before}`)).posts;
  }, user.isMe ? 'Todavía no has publicado nada. ¡Sube tu primer proyecto!' : 'Todavía no ha publicado nada.');
  const followersEl = h('b', {}, user.followers);
  shell.content.replaceChildren(
    h('div', { class: 'profile-head' }, avatar(user, 'big'),
      h('div', {},
        h('h1', {}, user.displayName), h('div', { class: 'muted' }, '@' + user.username),
        user.bio && h('p', {}, user.bio),
        h('div', { class: 'stats' },
          h('span', {}, h('b', {}, user.postCount), ' publicaciones'),
          h('span', {}, followersEl, ' seguidores'),
          h('span', {}, h('b', {}, user.followingCount), ' siguiendo')))),
    grid.el);
  if (user.isMe) {
    shell.context.replaceChildren(
      ...ctxSection('Mi perfil', 'Así te ven los demás.'),
      ctxButton('plus', 'Nueva publicación', () => openComposer(p => grid.prepend(p)), true),
      ctxButton('edit', 'Editar perfil', openEditProfile));
  } else {
    const fb = followButton(user, f => { followersEl.textContent = Number(followersEl.textContent) + (f ? 1 : -1); });
    fb.dataset.extra = ' ctx-btn'; fb.repaint();
    shell.context.replaceChildren(...ctxSection('Perfil', `Proyectos de ${user.displayName}.`), fb);
  }
}

// =============== Acceso ===============
function authView() {
  let mode = 'login';
  const err = h('div', { class: 'error' });
  const fields = {
    username: h('input', { type: 'text', autocomplete: 'username', maxlength: 20 }),
    displayName: h('input', { type: 'text', maxlength: 40 }),
    password: h('input', { type: 'password', autocomplete: 'current-password' }),
    invite: h('input', { type: 'text' }),
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
      const u = decodeURIComponent(hash.slice(4));
      key = u.toLowerCase() === me.username.toLowerCase() ? 'perfil' : '';
      await profilePage(u);
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
