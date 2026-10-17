'use strict';
// Fotos y vídeos subidos: comprobar qué son de verdad, guardarlos y borrarlos.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { UPLOADS } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');

// Avatar o banner que llega como data URL desde el editor de perfil
function saveImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Imagen no valida');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) throw new HttpError(413, 'Imagen demasiado grande');
  const name = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return '/uploads/' + name;
}

// Dirección válida de un archivo subido
const MEDIA_RE = /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp|gif|mp4|webm|mov)$/;

// Mira los primeros bytes del archivo (no el nombre ni lo que diga el navegador) para saber qué es
function sniffMedia(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: 'image', ext: 'png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { kind: 'image', ext: 'webp' };
  if (buf.slice(0, 3).toString() === 'GIF') return { kind: 'image', ext: 'gif' };
  if (buf.slice(4, 8).toString() === 'ftyp') return { kind: 'video', ext: buf.slice(8, 10).toString() === 'qt' ? 'mov' : 'mp4' };
  if (buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { kind: 'video', ext: 'webm' };
  return null;
}

// ¿Es un archivo que subió esta persona, del tipo correcto y sin usar todavía?
function ownUpload(u, me, kind) {
  if (typeof u !== 'string' || !MEDIA_RE.test(u)) return false;
  const r = db.prepare('SELECT user_id, kind FROM media_uploads WHERE url = ?').get(u);
  if (!r || r.user_id !== me.id || r.kind !== kind) return false;
  // Cada archivo subido solo puede usarse una vez (al borrar una publicacion se borran sus archivos)
  return !db.prepare('SELECT 1 FROM post_media WHERE url = ? OR poster = ?').get(u, u);
}

// Borra fotos/vídeos del disco y de la lista de subidas
function removeUploads(list) {
  for (const u of list) {
    fs.rm(path.join(UPLOADS, path.basename(u)), () => {});
    db.prepare('DELETE FROM media_uploads WHERE url = ?').run(u);
  }
}

module.exports = { ownUpload, removeUploads, saveImage, sniffMedia };
