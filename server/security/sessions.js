'use strict';
// Sesiones: quién hace cada petición (cookie "sid"), abrir y cerrar sesiones y exigir permisos.

const crypto = require('node:crypto');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { clientIp, isHttps, parseCookies } = require('../http/request');
const { send } = require('../http/response');
const { sha256 } = require('../lib/hash');
const { DAY, MIN } = require('../lib/units');
const { publicUser } = require('../services/users');

// La cookie lleva una clave aleatoria de 256 bits; en la base de datos solo se guarda su huella,
// asi que aunque alguien copiara red.db no podria entrar con esas sesiones.
const SESSION_IDLE = 30 * DAY;   // se cierra tras 30 dias sin usarla
const SESSION_MAX = 180 * DAY;   // y como mucho dura 180 dias
const MAX_SESSIONS_PER_USER = 20;

// Usuario de la petición (o null). Se calcula una vez por petición.
function currentUser(req) {
  if (req._user !== undefined) return req._user;
  req._user = null;
  const sid = parseCookies(req).sid;
  if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
  const id = sha256(sid);
  const r = db.prepare(`SELECT s.id AS session_id, s.created_at AS session_created, s.last_used, u.*
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(id);
  if (!r) return null;
  if (r.suspended_at) return null;
  const now = Date.now();
  if (now - r.last_used > SESSION_IDLE || now - r.session_created > SESSION_MAX) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  if (now - r.last_used > 5 * MIN) db.prepare('UPDATE sessions SET last_used = ?, ip = ? WHERE id = ?').run(now, clientIp(req), id);
  req._user = r;
  return r;
}

function sessionCookie(req, value, maxAgeSec) {
  return `sid=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`;
}

// Borra las sesiones caducadas (se llama periódicamente desde app.js)
function pruneSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE last_used < ? OR created_at < ?').run(now - SESSION_IDLE, now - SESSION_MAX);
}

// Para las rutas: lanzan 401/403 si no hay sesión o no hay permiso
function requireUser(req) {
  const u = currentUser(req);
  if (!u) throw new HttpError(401, 'Tienes que iniciar sesion');
  return u;
}

function requireAdmin(req) {
  const me = requireUser(req);
  if (!me.is_admin) throw new HttpError(403, 'Solo para administradores');
  return me;
}

// Crea una sesión nueva y devuelve la clave que irá en la cookie
function createSession(req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, last_used, ip, agent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sha256(token), userId, now, now, clientIp(req), String(req.headers['user-agent'] || '').slice(0, 200));
  // Como mucho 20 sesiones abiertas por persona: se cierran las mas antiguas
  db.prepare(`DELETE FROM sessions WHERE user_id = ? AND id NOT IN
    (SELECT id FROM sessions WHERE user_id = ? ORDER BY last_used DESC LIMIT ?)`).run(userId, userId, MAX_SESSIONS_PER_USER);
  return token;
}

// Abre sesión y responde con los datos del usuario y la cookie
function startSession(req, res, userId) {
  const token = createSession(req, userId);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  send(res, 200, { user: publicUser(u) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_MAX / 1000) });
}

module.exports = { SESSION_MAX, currentUser, requireUser, requireAdmin, sessionCookie, createSession, startSession, pruneSessions };
