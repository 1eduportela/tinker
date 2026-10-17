'use strict';
// Usuarios: lo que se enseña de cada uno, búsqueda por nombre y quién puede ver a quién (bloqueos y suspensiones).

const { db } = require('../db');
const { HttpError } = require('../http/errors');

// Datos de un usuario que se pueden enviar al navegador (nunca la contraseña ni datos internos)
function publicUser(u) {
  return { username: u.username, displayName: u.display_name, bio: u.bio, avatar: u.avatar,
    banner: u.banner || null, about: u.about || '', isAdmin: !!u.is_admin };
}

function userByName(username) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u) throw new HttpError(404, 'Ese usuario no existe');
  return u;
}

// Un usuario esta "oculto" para mi si esta suspendido o si alguno de los dos ha bloqueado al otro
const VISIBLE_AUTHOR = `u.suspended_at IS NULL AND NOT EXISTS (SELECT 1 FROM blocks bl
  WHERE (bl.blocker_id = ? AND bl.blocked_id = u.id) OR (bl.blocker_id = u.id AND bl.blocked_id = ?))`;

function blockState(meId, otherId) {
  const iBlocked = !!db.prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(meId, otherId);
  const blockedMe = !!db.prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(otherId, meId);
  return { iBlocked, blockedMe };
}

// Usuario por nombre comprobando que lo puedo ver
function visibleUserByName(username, me) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u) throw new HttpError(404, 'Ese usuario no existe');
  if (u.id !== me.id) {
    if (u.suspended_at && !me.is_admin) throw new HttpError(404, 'Ese usuario no existe');
    if (blockState(me.id, u.id).blockedMe && !me.is_admin) throw new HttpError(404, 'Ese usuario no existe');
  }
  return u;
}

module.exports = { VISIBLE_AUTHOR, blockState, publicUser, userByName, visibleUserByName };
