'use strict';
// Rutas de tu cuenta: editar el perfil, ver sesiones abiertas y espacio usado,
// cambiar la contraseña y borrar la cuenta.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { FILES, UPLOADS } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { readBody } = require('../http/request');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { str } = require('../http/validate');
const { HOUR } = require('../lib/units');
const { securityLog } = require('../security/audit-log');
const { confirmPassword } = require('../security/login-guard');
const { PASS_PARAMS, hashPasswordAsync, passwordProblem } = require('../security/passwords');
const { limit } = require('../security/rate-limit');
const { requireUser, sessionCookie, startSession } = require('../security/sessions');
const { saveImage } = require('../services/media');
const { postFiles } = require('../services/posts');
const { storageOf } = require('../services/storage');
const { publicUser } = require('../services/users');

// Editar perfil: nombre, frase, bienvenida, avatar y banner
route('PUT', '/api/me', async (req, res) => {
  const me = requireUser(req);
  limit('profile:' + me.id, 30, HOUR, 'Has cambiado el perfil demasiadas veces');
  const b = await readBody(req, 16 * 1024 * 1024);
  const displayName = str(b.displayName, 40, 'El nombre') || me.username;
  const bio = str(b.bio, 200, 'La frase corta');
  const about = typeof b.about === 'string' ? str(b.about, 3000, 'La bienvenida') : me.about;
  let avatar = me.avatar;
  if (b.avatar) avatar = saveImage(b.avatar);
  let banner = me.banner;
  if (b.banner) banner = saveImage(b.banner);
  else if (b.removeBanner) banner = null;
  db.prepare('UPDATE users SET display_name = ?, bio = ?, about = ?, avatar = ?, banner = ? WHERE id = ?')
    .run(displayName, bio, about, avatar, banner, me.id);
  send(res, 200, { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(me.id)) });
});

// ---------- Cuenta y seguridad ----------
// "Chrome en Windows" a partir del user-agent del navegador
function describeAgent(ua) {
  ua = String(ua || '');
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const osName = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad'
    : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'otro sistema';
  return `${browser} en ${osName}`;
}

route('GET', '/api/me/security', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY last_used DESC').all(me.id);
  send(res, 200, {
    sessions: rows.map(r => ({ id: r.id.slice(0, 16), current: r.id === me.session_id, createdAt: r.created_at,
      lastUsed: r.last_used, ip: r.ip, device: describeAgent(r.agent) })),
    storage: storageOf(me.id),
  });
});

route('POST', '/api/me/password', async (req, res) => {
  const me = requireUser(req);
  limit('pwchange:' + me.id, 10, HOUR, 'Demasiados cambios de contrasena');
  const b = await readBody(req);
  await confirmPassword(req, me, b.current);
  const weak = passwordProblem(b.next, me.username);
  if (weak) throw new HttpError(400, weak);
  if (b.next === b.current) throw new HttpError(400, 'La nueva contrasena tiene que ser distinta');
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE users SET pass_hash = ?, salt = ?, pass_params = ? WHERE id = ?')
    .run(await hashPasswordAsync(b.next, salt), salt, PASS_PARAMS, me.id);
  // Se cierran todas las demas sesiones y esta se renueva
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(me.id);
  securityLog('contrasena_cambiada', req, me.username);
  startSession(req, res, me.id);
});

route('POST', '/api/me/sessions/close-others', async (req, res) => {
  const me = requireUser(req);
  const r = db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(me.id, me.session_id);
  securityLog('sesiones_cerradas', req, `${me.username} (${r.changes})`);
  send(res, 200, { closed: r.changes });
});

route('DELETE', '/api/me/sessions/([a-f0-9]{16})', async (req, res, url, [prefix]) => {
  const me = requireUser(req);
  const r = db.prepare("DELETE FROM sessions WHERE user_id = ? AND substr(id, 1, 16) = ? AND id != ?").run(me.id, prefix, me.session_id);
  send(res, 200, { closed: r.changes });
});

route('DELETE', '/api/me', async (req, res) => {
  const me = requireUser(req);
  limit('delaccount:' + me.id, 5, HOUR, 'Demasiados intentos');
  const b = await readBody(req);
  if (String(b.confirm || '').toLowerCase() !== me.username.toLowerCase()) throw new HttpError(400, 'Escribe tu nombre de usuario para confirmar');
  await confirmPassword(req, me, b.password);
  // Borra todos sus archivos del disco y luego la cuenta (la base de datos borra en cascada todo lo demas)
  const uploads = new Set([me.avatar, me.banner].filter(Boolean));
  for (const f of postFiles('p.user_id = ?', me.id)) uploads.add(f);
  for (const r of db.prepare('SELECT url FROM media_uploads WHERE user_id = ?').all(me.id)) uploads.add(r.url);
  const stored = db.prepare('SELECT f.stored FROM project_files f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ?').all(me.id).map(r => r.stored);
  db.prepare('DELETE FROM users WHERE id = ?').run(me.id);
  for (const u of uploads) fs.rm(path.join(UPLOADS, path.basename(u)), () => {});
  for (const f of stored) fs.rm(path.join(FILES, f), () => {});
  securityLog('cuenta_borrada', req, me.username);
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
});
