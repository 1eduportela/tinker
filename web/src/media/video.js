// Vídeos: leer su tamaño y duración y sacar una miniatura para la portada.
// Lee tamaño del vídeo y saca una miniatura para usarla de portada
export function videoInfo(file) {
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
