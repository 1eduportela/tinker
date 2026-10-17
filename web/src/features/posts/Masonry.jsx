// Cuadrícula tipo Pinterest con scroll infinito, y la tarjeta de cada publicación.
//   <Masonry loader={before => api(...)} emptyMsg="..." ref={grid} />    grid.current.prepend(post)
// Cada tarjeta va a la columna más corta en ese momento, en orden. Para saber qué columna es más corta
// hay que medir las tarjetas ya pintadas: se pintan, se miden y se colocan antes de que se vean.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { preload } from '../../media/images.js';
import { Icon } from '../../ui/Icon.jsx';
import { openPost } from './PostViewer.jsx';

const GAP = 16;        // separación entre tarjetas y columnas (la misma que en styles/posts.css)
const MIN_COL = 250;   // ancho mínimo aproximado de una columna

export function Masonry({ loader, emptyMsg, ref }) {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');   // 'loading' | 'idle' | { error }
  const [done, setDone] = useState(false);
  const [n, setN] = useState(0);                       // número de columnas
  const [cols, setCols] = useState([]);                // ids de publicación por columna
  const grid = useRef(null), sentinel = useRef(null), tiles = useRef(new Map());
  const st = useRef({ loading: false, done: false, last: null, alive: true });
  const loaderRef = useRef(loader); loaderRef.current = loader;

  const nearEnd = () => sentinel.current && sentinel.current.getBoundingClientRect().top < innerHeight + 800;

  const load = useCallback(async () => {
    const s = st.current;
    if (s.loading || s.done || !s.alive) return;
    s.loading = true; setStatus('loading');
    try {
      const got = await loaderRef.current(s.last);
      await Promise.all(got.map(preload));
      if (!s.alive) return;
      if (got.length) s.last = got.at(-1).id;
      if (got.length < 20) s.done = true;
      setPosts(ps => [...ps, ...got]);
      setStatus('idle');
    } catch (e) { s.done = true; setStatus({ error: e.message }); }
    setDone(s.done);
    s.loading = false;
  }, []);

  useImperativeHandle(ref, () => ({
    async prepend(p) { await preload(p); setPosts(ps => [p, ...ps]); setStatus('idle'); },
  }), []);

  // Primera carga, y más al acercarse al final (observador + scroll, por si el observador no salta)
  useEffect(() => {
    st.current.alive = true;
    load();
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) load(); }, { rootMargin: '800px' });
    io.observe(sentinel.current);
    const onScroll = () => { if (nearEnd()) load(); };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { st.current.alive = false; io.disconnect(); removeEventListener('scroll', onScroll); };
  }, [load]);
  // Tras pintar lo cargado: si el final sigue a la vista, se carga la siguiente tanda
  useEffect(() => { if (!st.current.done && status === 'idle' && nearEnd()) load(); }, [posts, status, load]);

  // Columnas según el ancho (al cambiar el tamaño de la ventana se recolocan)
  useLayoutEffect(() => {
    const count = () => Math.max(1, Math.floor((grid.current.clientWidth + GAP) / MIN_COL));
    setN(count());
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setN(count()), 120); };
    addEventListener('resize', onResize);
    return () => { clearTimeout(t); removeEventListener('resize', onResize); };
  }, []);

  // Colocar: medir cada tarjeta y meterla, en orden, en la columna más corta
  useLayoutEffect(() => {
    if (!n) return;
    const heights = Array(n).fill(0), counts = Array(n).fill(0);
    const next = Array.from({ length: n }, () => []);
    for (const p of posts) {
      const el = tiles.current.get(p.id);
      const hgt = el ? el.getBoundingClientRect().height : 0;
      let best = 0;
      for (let c = 1; c < n; c++) if (Math.round(heights[c]) < Math.round(heights[best])) best = c;
      heights[best] += (counts[best] ? GAP : 0) + hgt;
      counts[best]++;
      next[best].push(p.id);
    }
    if (JSON.stringify(next) !== JSON.stringify(cols)) setCols(next);
  }, [posts, n, cols]);

  // Mientras no están colocadas, las tarjetas nuevas van a la primera columna (solo para medirlas)
  const placed = new Set(cols.flat());
  const valid = cols.length === n;
  const view = valid ? cols.map(c => c.filter(id => posts.some(p => p.id === id))) : Array.from({ length: n }, () => []);
  const pending = posts.filter(p => !valid || !placed.has(p.id)).map(p => p.id);
  if (view.length) view[0] = [...view[0], ...pending];
  const byId = new Map(posts.map(p => [p.id, p]));
  const remove = id => setPosts(ps => ps.filter(p => p.id !== id));

  const statusContent = status === 'loading' ? 'Cargando…' : status.error ? status.error : done && !posts.length ? emptyMsg : null;
  return (
    <div>
      <div className="masonry" ref={grid}>
        {view.map((col, i) => (
          <div className="mcol" key={i}>
            {col.map(id => <Tile key={id} post={byId.get(id)} onDelete={() => remove(id)}
              elRef={el => { if (el) tiles.current.set(id, el); else tiles.current.delete(id); }} />)}
          </div>
        ))}
      </div>
      <div className="status">{statusContent}</div>
      <div ref={sentinel} />
    </div>
  );
}

function Tile({ post, onDelete, elRef }) {
  const media = post.media || [];
  const hasVideo = media.some(x => x.kind === 'video');
  const cover = post.image
    ? <img src={post.image} alt="" width={post._w} height={post._h} />
    : media.length ? <div className="tile-video-ph"><Icon name="play" /></div>
      : <div className="tile-text">{post.text}</div>;
  return (
    <article className="tile" ref={elRef} onClick={() => openPost(post, onDelete)}>
      <div className="tile-cover">
        {cover}
        {(media.length > 1 || hasVideo) && <div className="tile-badges">
          {hasVideo && <span title="Tiene vídeo"><Icon name="play" /></span>}
          {media.length > 1 && <span title={`${media.length} fotos o vídeos`}><Icon name="layers" />{media.length}</span>}
        </div>}
      </div>
      {!!(post.image || media.length) && (post.title || post.text) && <p className="tile-caption">{post.title || post.text}</p>}
    </article>
  );
}
