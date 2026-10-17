// Carrusel de fotos y vídeos: flechas, puntos, teclado y deslizar con el dedo.
import { h } from '../core/dom.js';
import { icon } from './icons.js';

export function carousel(media) {
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
