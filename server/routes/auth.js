'use strict';
// Rutas de acceso: crear cuenta (con invitación), iniciar y cerrar sesión, y saber quién soy.

const crypto = require('node:crypto');
const { config } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { clientIp, parseCookies, readBody } = require('../http/request');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { str } = require('../http/validate');
const { sha256 } = require('../lib/hash');
const { HOUR } = require('../lib/units');
const { securityLog } = require('../security/audit-log');
const { IP_MAX_FAILS, LOGIN_LOCK, LOGIN_MAX_FAILS, accountKey, assertNotLocked, ipKey } = require('../security/login-guard');
const { PASS_PARAMS, hashPassword, hashPasswordAsync, passwordProblem, verifyPassword } = require('../security/passwords');
const { clearKey, hit, limit, peek } = require('../security/rate-limit');
const { currentUser, sessionCookie, startSession } = require('../security/sessions');
const { normCode, rotateMasterCode } = require('../services/invites');
const { unreadCount } = require('../services/messages');
const { publicUser } = require('../services/users');

// Crear cuenta: hace falta un código de invitación válido (personal o el maestro)
route('POST', '/api/register', async (req, res) => {
  const ip = clientIp(req);
  limit('register:' + ip, Number(process.env.TINKER_REGISTER_PER_HOUR) || 10, HOUR, 'Demasiados intentos de registro');
  const b = await readBody(req);
  const username = str(b.username, 20, 'El usuario');
  const displayName = str(b.displayName, 40, 'El nombre') || username;
  const password = typeof b.password === 'string' ? b.password : '';
  const code = normCode(str(b.invite, 50, 'El codigo'));
  const isMaster = code.length >= 8 && code === normCode(config.inviteCode);
  const invite = !isMaster && code ? db.prepare('SELECT * FROM invites WHERE code_hash = ?').get(sha256(code)) : null;
  if (!isMaster && (!invite || invite.used_by || invite.used_at || invite.expires_at < Date.now())) {
    securityLog('invitacion_incorrecta', req, username);
    limit('badinvite:' + ip, 5, HOUR, 'Demasiados codigos de invitacion incorrectos');
    throw new HttpError(403, invite ? (invite.used_at ? 'Esa invitacion ya se ha usado' : 'Esa invitacion ha caducado') : 'Codigo de invitacion incorrecto');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'El usuario debe tener 3-20 letras, numeros o _');
  const weak = passwordProblem(password, username);
  if (weak) throw new HttpError(400, weak);
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Ese usuario ya existe');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPasswordAsync(password, salt);
  // Desde aquí hasta el COMMIT no hay ningún await: Node no atiende otra petición entre medias,
  // así que comprobar y gastar el código es una sola operación.
  db.exec('BEGIN');
  let info;
  try {
    // El código maestro se vuelve a comprobar: mientras se cifraba la contraseña (await de arriba)
    // otro registro pudo gastarlo
    if (isMaster && normCode(config.inviteCode) !== code) throw new HttpError(403, 'Ese codigo ya se ha usado');
    // La invitacion se marca como usada en la misma operacion: nunca puede usarse dos veces
    if (invite) {
      const u2 = db.prepare('UPDATE invites SET used_at = ? WHERE id = ? AND used_at IS NULL').run(Date.now(), invite.id);
      if (!u2.changes) throw new HttpError(403, 'Esa invitacion ya se ha usado');
    }
    // Solo el código maestro (el que ve el dueño en su consola) crea un administrador, y solo si no hay ninguno.
    // En una instalación nueva la primera cuenta usa el código maestro, así que es la administradora.
    const makeAdmin = isMaster && !db.prepare('SELECT 1 FROM users WHERE is_admin = 1').get();
    info = db.prepare('INSERT INTO users (username, display_name, pass_hash, salt, pass_params, invited_by, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(username, displayName, hash, salt, PASS_PARAMS, invite ? invite.created_by : null, makeAdmin ? 1 : 0, Date.now());
    if (invite) db.prepare('UPDATE invites SET used_by = ? WHERE id = ?').run(Number(info.lastInsertRowid), invite.id);
    if (isMaster) rotateMasterCode();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    // Dos registros con el mismo usuario a la vez: los dos pasaron la comprobación de arriba antes del await
    if (/UNIQUE constraint failed: users\.username/.test(e.message)) throw new HttpError(409, 'Ese usuario ya existe');
    throw e;
  }
  securityLog('registro', req, `${username} (${isMaster ? 'codigo maestro' : 'invitacion ' + invite.hint})`);
  return startSession(req, res, Number(info.lastInsertRowid));
});

// Hash falso para tardar lo mismo aunque el usuario no exista (no se puede saber si existe midiendo tiempos)
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_USER = { salt: DUMMY_SALT, pass_params: PASS_PARAMS, pass_hash: hashPassword(crypto.randomBytes(16).toString('hex'), DUMMY_SALT) };

route('POST', '/api/login', async (req, res) => {
  const ip = clientIp(req);
  const b = await readBody(req);
  const name = str(b.username, 40, 'El usuario').toLowerCase();
  const userKey = accountKey(name), ipFails = ipKey(ip);
  // Bloqueo: 5 fallos seguidos en una cuenta o 20 desde la misma IP -> 15 minutos sin poder probar
  assertNotLocked(userKey, LOGIN_MAX_FAILS);
  assertNotLocked(ipFails, IP_MAX_FAILS);
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(name);
  const ok = u ? await verifyPassword(String(b.password || ''), u) : (await verifyPassword('x', DUMMY_USER), false);
  if (!ok) {
    const r1 = hit(userKey, LOGIN_MAX_FAILS, LOGIN_LOCK); hit(ipFails, IP_MAX_FAILS, LOGIN_LOCK);
    securityLog('login_fallido', req, name);
    if (!r1.ok || peek(userKey) >= LOGIN_MAX_FAILS) securityLog('cuenta_bloqueada_15min', req, name);
    const left = Math.max(0, LOGIN_MAX_FAILS - peek(userKey));
    throw new HttpError(401, left > 0 && left <= 2 ? `Usuario o contrasena incorrectos (te quedan ${left} intento${left === 1 ? '' : 's'})` : 'Usuario o contrasena incorrectos');
  }
  clearKey(userKey);
  if (u.suspended_at) { securityLog('login_cuenta_suspendida', req, u.username); throw new HttpError(403, 'Esta cuenta esta suspendida. Habla con el administrador.'); }
  securityLog('login', req, u.username);
  startSession(req, res, u.id);
});

route('POST', '/api/logout', async (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(String(sid)));
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
});

// Quién soy (o null si no hay sesión) y cuántos mensajes tengo sin leer
route('GET', '/api/me', async (req, res) => {
  const u = currentUser(req);
  send(res, 200, { user: u ? publicUser(u) : null, unread: u ? unreadCount(u.id) : 0 });
});
