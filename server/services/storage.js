'use strict';
// Espacio en disco: cuotas por persona (total y por día) y limpieza de archivos que nadie usa.

const fs = require('node:fs');
const path = require('node:path');
const { DAILY_QUOTA, DATA, FILES, MIN_FREE_DISK, UPLOADS, USER_QUOTA } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { DAY, HOUR, MB } = require('../lib/units');

// ---------- Cuotas ----------
function storageOf(userId) {
  const since = Date.now() - DAY;
  const media = db.prepare('SELECT COALESCE(SUM(size), 0) AS total, COALESCE(SUM(CASE WHEN created_at > ? THEN size ELSE 0 END), 0) AS day FROM media_uploads WHERE user_id = ?').get(since, userId);
  const files = db.prepare(`SELECT COALESCE(SUM(f.size), 0) AS total, COALESCE(SUM(CASE WHEN f.created_at > ? THEN f.size ELSE 0 END), 0) AS day
    FROM project_files f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ?`).get(since, userId);
  return { used: media.total + files.total, today: media.day + files.day, quota: USER_QUOTA, dailyQuota: DAILY_QUOTA };
}
const fmtMB = n => n >= 1024 * MB ? `${(n / 1024 / MB).toFixed(1)} GB` : n >= MB ? `${Math.round(n / MB)} MB` : `${Math.max(0, Math.round(n / 1024))} KB`;
// Cuantos bytes puede subir ahora esta persona (o error si no le queda nada)
function uploadAllowance(req, userId) {
  try {
    const st = fs.statfsSync(DATA);
    if (st.bavail * st.bsize < MIN_FREE_DISK) throw new HttpError(507, 'El servidor se esta quedando sin espacio. Avisa al administrador.');
  } catch (e) { if (e instanceof HttpError) throw e; }
  const s = storageOf(userId);
  const left = Math.min(s.quota - s.used, s.dailyQuota - s.today);
  if (s.quota - s.used <= 0) throw new HttpError(413, `Te has quedado sin espacio: usas ${fmtMB(s.used)} de ${fmtMB(s.quota)}. Borra algo para seguir subiendo.`);
  if (s.dailyQuota - s.today <= 0) throw new HttpError(413, `Has llegado al limite de subida de hoy (${fmtMB(s.dailyQuota)}). Prueba manana.`);
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > left) throw new HttpError(413, s.quota - s.used < s.dailyQuota - s.today
    ? `No te queda espacio para este archivo: te quedan ${fmtMB(s.quota - s.used)}.`
    : `Este archivo supera lo que puedes subir hoy (te quedan ${fmtMB(s.dailyQuota - s.today)}).`);
  return left;
}

// ---------- Limpieza de archivos huerfanos (al arrancar y cada hora, desde app.js) ----------
function cleanupOrphans() {
  const now = Date.now();
  let removed = 0;
  const referenced = new Set();
  for (const r of db.prepare('SELECT url, poster FROM post_media').all()) { referenced.add(r.url); if (r.poster) referenced.add(r.poster); }
  for (const r of db.prepare('SELECT image FROM posts WHERE image IS NOT NULL').all()) referenced.add(r.image);
  for (const r of db.prepare('SELECT avatar, banner FROM users').all()) { if (r.avatar) referenced.add(r.avatar); if (r.banner) referenced.add(r.banner); }
  // Fotos y videos subidos que nunca llegaron a publicarse (6 h de margen)
  for (const r of db.prepare('SELECT url FROM media_uploads WHERE created_at < ?').all(now - 6 * HOUR)) {
    if (!referenced.has(r.url)) { fs.rm(path.join(UPLOADS, path.basename(r.url)), () => {}); db.prepare('DELETE FROM media_uploads WHERE url = ?').run(r.url); removed++; }
  }
  const known = new Set(db.prepare('SELECT url FROM media_uploads').all().map(r => path.basename(r.url)));
  for (const u of referenced) known.add(path.basename(u));
  for (const name of fs.readdirSync(UPLOADS)) {
    let st; try { st = fs.statSync(path.join(UPLOADS, name)); } catch { continue; }
    const age = now - st.mtimeMs;
    if ((name.startsWith('tmp-') && age > HOUR) || (!name.startsWith('tmp-') && !known.has(name) && age > DAY)) {
      fs.rm(path.join(UPLOADS, name), () => {}); removed++;
    }
  }
  const stored = new Set(db.prepare('SELECT stored FROM project_files').all().map(r => r.stored));
  for (const name of fs.readdirSync(FILES)) {
    let st; try { st = fs.statSync(path.join(FILES, name)); } catch { continue; }
    if (!stored.has(name) && now - st.mtimeMs > HOUR) { fs.rm(path.join(FILES, name), () => {}); removed++; }
  }
  if (removed) console.log(`  Limpieza: ${removed} archivo(s) sin usar borrados`);
}

module.exports = { cleanupOrphans, storageOf, uploadAllowance };
