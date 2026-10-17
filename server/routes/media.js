'use strict';
// Ruta de subida de fotos y vídeos. Se suben primero y luego la publicación los usa por su dirección.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MAX_IMAGE, MAX_VIDEO, UPLOADS } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { HOUR } = require('../lib/units');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { sniffMedia } = require('../services/media');
const { uploadAllowance } = require('../services/storage');

// Sube una foto o un vídeo (el archivo va tal cual en el cuerpo). Devuelve su dirección para usarla en una publicación.

route('POST', '/api/media', async (req, res, url) => {
  const me = requireUser(req);
  limit('media:' + me.id, 120, HOUR, 'Has subido demasiados archivos seguidos');
  const want = url.searchParams.get('kind') === 'video' ? 'video' : 'image';
  const allowance = uploadAllowance(req, me.id);
  const maxSize = Math.min(want === 'video' ? MAX_VIDEO : MAX_IMAGE, allowance);
  const tmp = path.join(UPLOADS, 'tmp-' + crypto.randomBytes(8).toString('hex'));
  await new Promise((resolve, reject) => {
    let size = 0, failed = false;
    const out = fs.createWriteStream(tmp);
    req.on('data', c => {
      size += c.length;
      if (size > maxSize && !failed) {
        failed = true; req.unpipe(out); out.destroy(); fs.rm(tmp, () => {}); req.resume();
        reject(new HttpError(413, maxSize < (want === 'video' ? MAX_VIDEO : MAX_IMAGE) ? 'No te queda espacio suficiente para este archivo'
          : want === 'video' ? 'El video pasa de 300 MB' : 'La foto pasa de 15 MB'));
      }
    });
    req.pipe(out);
    out.on('finish', () => { if (!failed) resolve(); });
    out.on('error', e => { if (!failed) { failed = true; reject(e); } });
  });
  const fd = fs.openSync(tmp, 'r'); const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0); fs.closeSync(fd);
  const type = sniffMedia(head);
  if (!type || type.kind !== want) {
    fs.rm(tmp, () => {});
    throw new HttpError(400, want === 'video' ? 'Formato de video no valido (usa MP4, MOV o WebM)' : 'Formato de imagen no valido');
  }
  const name = crypto.randomBytes(12).toString('hex') + '.' + type.ext;
  fs.renameSync(tmp, path.join(UPLOADS, name));
  const mediaUrl = '/uploads/' + name;
  const finalSize = fs.statSync(path.join(UPLOADS, name)).size;
  db.prepare('INSERT INTO media_uploads (url, user_id, kind, created_at, size) VALUES (?, ?, ?, ?, ?)').run(mediaUrl, me.id, type.kind, Date.now(), finalSize);
  send(res, 200, { url: mediaUrl, kind: type.kind });
});
