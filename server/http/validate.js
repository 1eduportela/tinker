'use strict';
// Validación de lo que llega del navegador: textos con longitud máxima y rutas de archivo seguras.

const { HttpError } = require('./errors');

// Ruta de archivo dentro de un proyecto: sin "..", sin barras invertidas ni caracteres de control
function cleanPath(p) {
  const parts = String(p || '').replace(/\\/g, '/').split('/').map(s => s.trim())
    .filter(s => s && s !== '.' && s !== '..');
  const out = parts.join('/');
  if (!out) throw new HttpError(400, 'Nombre de archivo no valido');
  if (out.length > 300) throw new HttpError(400, 'La ruta del archivo es demasiado larga');
  if (/[\x00-\x1f]/.test(out)) throw new HttpError(400, 'Nombre de archivo no valido');
  return out;
}

// Texto recortado; error si pasa de max caracteres (field es el nombre que se ve en el mensaje)
function str(v, max, field) {
  const s = (typeof v === 'string' ? v : '').trim();
  if (s.length > max) throw new HttpError(400, `${field} es demasiado largo (max. ${max})`);
  return s;
}

module.exports = { cleanPath, str };
