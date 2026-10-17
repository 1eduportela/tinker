// Cuadrícula tipo Pinterest con scroll infinito, y la tarjeta de cada publicación.
import { h } from '../../core/dom.js';
import { onLeave } from '../../core/state.js';
import { preload } from '../../media/images.js';
import { icon } from '../../ui/icons.js';
import { openPost } from './post-viewer.js';

export function masonry(loader, emptyMsg) {
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
  onLeave(() => { alive = false; io.disconnect(); removeEventListener('resize', onResize); removeEventListener('scroll', onScroll); });
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
