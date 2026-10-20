'use strict';
// Rutas de archivos de proyecto (estilo GitHub): listar, subir, borrar y descargar o ver.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { FILES, MAX_FILE } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { receiveToFile } = require('../http/request');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { sendFile } = require('../http/static');
const { cleanPath } = require('../http/validate');
const { HOUR } = require('../lib/units');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { mapFile, ownProject, projectById } = require('../services/projects');
const { uploadAllowance } = require('../services/storage');

// Lista de archivos del proyecto
route('GET', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = projectById(id, me);
  const rows = db.prepare('SELECT * FROM project_files WHERE project_id = ? ORDER BY path').all(p.id);
  send(res, 200, { files: rows.map(mapFile) });
});

// Sube un archivo: el cuerpo es el archivo tal cual y la ruta va en ?path=
route('POST', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  const me = requireUser(req);
  limit('files:' + me.id, 600, HOUR, 'Has subido demasiados archivos seguidos');
  const p = ownProject(id, me);
  const filePath = cleanPath(url.searchParams.get('path'));
  const allowance = uploadAllowance(req, me.id);
  if (db.prepare('SELECT COUNT(*) AS n FROM project_files WHERE project_id = ?').get(p.id).n >= 2000) throw new HttpError(400, 'Este proyecto ya tiene 2.000 archivos, que es el maximo');
  // Directo a disco (antes se juntaba entero en memoria: hasta 50 MB por subida)
  const max = Math.min(MAX_FILE, allowance);
  const stored = crypto.randomBytes(16).toString('hex');
  const size = await receiveToFile(req, path.join(FILES, stored), max, () => new HttpError(413,
    max < MAX_FILE ? 'No te queda espacio suficiente para este archivo' : 'Archivo demasiado grande (max. 50 MB)'));
  const old = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND path = ?').get(p.id, filePath);
  if (old) {
    db.prepare('UPDATE project_files SET size = ?, stored = ?, created_at = ? WHERE id = ?').run(size, stored, Date.now(), old.id);
    fs.rm(path.join(FILES, old.stored), () => {});
  } else {
    db.prepare('INSERT INTO project_files (project_id, path, size, stored, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(p.id, filePath, size, stored, Date.now());
  }
  send(res, 200, { file: mapFile(db.prepare('SELECT * FROM project_files WHERE project_id = ? AND path = ?').get(p.id, filePath)) });
});

// Borra un archivo (?path=) o una carpeta entera (?folder=)
route('DELETE', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = ownProject(id, me);
  let rows;
  if (url.searchParams.has('folder')) {
    const prefix = cleanPath(url.searchParams.get('folder')) + '/';
    rows = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND substr(path, 1, ?) = ?').all(p.id, prefix.length, prefix);
  } else {
    rows = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND path = ?').all(p.id, cleanPath(url.searchParams.get('path')));
  }
  for (const r of rows) {
    db.prepare('DELETE FROM project_files WHERE id = ?').run(r.id);
    fs.rm(path.join(FILES, r.stored), () => {});
  }
  send(res, 200, { deleted: rows.length });
});

const INLINE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };
// Descargar o ver un archivo. Solo se muestran dentro de la web los tipos seguros
// (imágenes, PDF, vídeo, audio); todo lo demás se descarga, para que nunca se ejecute un HTML subido.
route('GET', '/api/files/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const f = db.prepare('SELECT * FROM project_files WHERE id = ?').get(Number(id));
  if (!f) throw new HttpError(404, 'Archivo no encontrado');
  projectById(f.project_id, me);
  const name = f.path.split('/').pop();
  const ext = path.extname(name).toLowerCase();
  const mode = url.searchParams.get('as');
  const headers = { 'X-Content-Type-Options': 'nosniff' };
  if (mode === 'text') {
    headers['Content-Type'] = 'text/plain; charset=utf-8';
    headers['Content-Security-Policy'] = 'sandbox';
  } else if (mode !== 'download' && INLINE_TYPES[ext]) {
    headers['Content-Type'] = INLINE_TYPES[ext];
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
  } else {
    headers['Content-Type'] = 'application/octet-stream';
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  }
  sendFile(req, res, path.join(FILES, f.stored), f.size, headers);
});
