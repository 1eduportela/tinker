'use strict';
// Archivos que se sirven tal cual: la web (public/) y las fotos/vídeos subidos (data/uploads/),
// estos últimos con soporte de Range para poder avanzar en los vídeos.

const fs = require('node:fs');
const path = require('node:path');
const { UPLOADS } = require('../config');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveFile(res, baseDir, rel) {
  const file = path.normalize(path.join(baseDir, rel));
  if (!file.startsWith(baseDir + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}

const UPLOAD_TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
function serveUpload(req, res, rel) {
  const name = path.basename(rel);
  const type = UPLOAD_TYPES[path.extname(name).toLowerCase()];
  const file = path.join(UPLOADS, name);
  if (!type || name.startsWith('tmp-')) { res.writeHead(404); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    sendFile(req, res, file, st.size, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=86400' });
  });
}

// Envía un archivo del disco con soporte de Range (avanzar en vídeos; Safari/iPhone no los reproduce sin él).
// La usan las fotos/vídeos subidos y los archivos de proyecto.
function sendFile(req, res, file, size, headers) {
  headers = { ...headers, 'Accept-Ranges': 'bytes' };
  let start = 0, end = size - 1, status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), size - 1); }
    else start = Math.max(0, size - Number(m[2]));   // "bytes=-500": los últimos 500
    if (start >= size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  res.writeHead(status, { ...headers, 'Content-Length': Math.max(0, end - start + 1) });
  if (size === 0) return res.end();
  // Si el archivo desaparece a mitad (limpieza, borrado), se corta la respuesta en vez de dejar un error sin manejar
  fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
}

module.exports = { sendFile, serveFile, serveUpload };
