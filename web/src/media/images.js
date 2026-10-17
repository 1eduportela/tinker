// Fotos: reducirlas antes de subirlas (menos espera y menos espacio) y saber su tamaño.
import { toast } from '../ui/toast.jsx';

// Foto reducida a data URL (para avatar y banner, que se envían dentro del JSON del perfil)
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

// Abre el selector de archivos y devuelve la foto elegida ya reducida
export function pickImage(cb, max) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { if (inp.files[0]) try { cb(await resizeImage(inp.files[0], max)); } catch (e) { toast(e.message); } };
  inp.click();
}

// Carga la portada de una publicación para saber su tamaño antes de colocarla en la cuadrícula
export function preload(post) {
  if (!post.image || post._w) return Promise.resolve();
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { post._w = img.naturalWidth; post._h = img.naturalHeight; res(); };
    img.onerror = () => res();
    img.src = post.image;
  });
}

// Foto reducida a JPEG (máx. 2000 px) lista para subir, con su tamaño y una vista previa.
// Los GIF se suben tal cual para no perder la animación.
export function imageToBlob(file, max = 2000) {
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
