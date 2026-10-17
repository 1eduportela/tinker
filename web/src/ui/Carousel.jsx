// Carrusel de fotos y vídeos: flechas, puntos, teclado y deslizar con el dedo.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

export function Carousel({ media }) {
  const [i, setI] = useState(0);
  const many = media.length > 1;
  const x0 = useRef(null);
  const go = n => { if (n >= 0 && n < media.length) setI(n); };

  useEffect(() => {
    if (!many) return;
    const onKey = e => {
      if (e.key === 'ArrowLeft') setI(k => Math.max(0, k - 1));
      else if (e.key === 'ArrowRight') setI(k => Math.min(media.length - 1, k + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [many, media.length]);

  const m = media[i];
  return (
    <div className="pm-media car"
      onTouchStart={many ? e => { x0.current = e.touches[0].clientX; } : undefined}
      onTouchEnd={many ? e => {
        if (x0.current === null) return;
        const dx = e.changedTouches[0].clientX - x0.current; x0.current = null;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      } : undefined}>
      <div className={'car-stage' + (many ? ' fixed' : '')}>
        {m.kind === 'video'
          ? <video key={i} src={m.url} poster={m.poster || undefined} controls playsInline preload="metadata" />
          : <img key={i} src={m.url} alt="" />}
      </div>
      {many && <button className="car-nav prev" title="Anterior" hidden={i === 0} onClick={e => { e.stopPropagation(); go(i - 1); }}><Icon name="left" /></button>}
      {many && <button className="car-nav next" title="Siguiente" hidden={i === media.length - 1} onClick={e => { e.stopPropagation(); go(i + 1); }}><Icon name="right" /></button>}
      {many && <div className="car-count">{`${i + 1} / ${media.length}`}</div>}
      {many && <div className="car-dots">
        {media.map((_, k) => <button key={k} className={'car-dot' + (k === i ? ' on' : '')} title={`${k + 1}`} onClick={() => go(k)} />)}
      </div>}
    </div>
  );
}
