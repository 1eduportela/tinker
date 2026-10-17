'use strict';
// Rutas del chat: leer y enviar mensajes, y la lista de conversaciones.

const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { readBody } = require('../http/request');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { str } = require('../http/validate');
const { DAY, MIN } = require('../lib/units');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { VISIBLE_AUTHOR, blockState, publicUser, visibleUserByName } = require('../services/users');

// Mensajes con una persona (los nuevos con ?after=) y los marca como leídos
route('GET', '/api/messages/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = visibleUserByName(username, me);
  const after = Number(url.searchParams.get('after')) || 0;
  const rows = db.prepare(`SELECT id, from_id, text, created_at FROM messages
    WHERE id > ? AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
    ORDER BY id DESC LIMIT 300`).all(after, me.id, u.id, u.id, me.id).reverse();
  if (rows.some(r => r.from_id === u.id)) {
    db.prepare('UPDATE messages SET read_at = ? WHERE to_id = ? AND from_id = ? AND read_at IS NULL').run(Date.now(), me.id, u.id);
  }
  send(res, 200, { messages: rows.map(r => ({ id: r.id, text: r.text, createdAt: r.created_at, mine: r.from_id === me.id })) });
});

// Enviar un mensaje
route('POST', '/api/messages/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = visibleUserByName(username, me);
  if (u.id === me.id) throw new HttpError(400, 'No puedes escribirte a ti mismo');
  if (u.suspended_at) throw new HttpError(403, 'Esta cuenta esta suspendida');
  const bs = blockState(me.id, u.id);
  if (bs.iBlocked) throw new HttpError(403, 'Has bloqueado a esta persona: desbloqueala para escribirle');
  if (bs.blockedMe) throw new HttpError(403, 'No puedes escribir a esta persona');
  limit('msg:' + me.id, 30, MIN, 'Estas enviando mensajes demasiado rapido');
  limit('msgday:' + me.id, 1000, DAY, 'Has llegado al limite de mensajes de hoy');
  const b = await readBody(req);
  const text = str(b.text, 2000, 'El mensaje');
  if (!text) throw new HttpError(400, 'El mensaje esta vacio');
  db.prepare('INSERT INTO messages (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)').run(me.id, u.id, text, Date.now());
  send(res, 200, { ok: true });
});

// Mis conversaciones, la más reciente primero
route('GET', '/api/conversations', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare(`
    SELECT u.*, m.text AS last_text, m.created_at AS last_at, m.from_id AS last_from,
      (SELECT COUNT(*) FROM messages x WHERE x.from_id = u.id AND x.to_id = ? AND x.read_at IS NULL) AS unread
    FROM users u
    JOIN messages m ON m.id = (SELECT MAX(id) FROM messages
      WHERE (from_id = u.id AND to_id = ?) OR (from_id = ? AND to_id = u.id))
    WHERE u.id != ? AND ${VISIBLE_AUTHOR}
    ORDER BY m.id DESC`).all(me.id, me.id, me.id, me.id, me.id, me.id);
  send(res, 200, { conversations: rows.map(r => ({ user: publicUser(r), unread: r.unread,
    last: { text: r.last_text, createdAt: r.last_at, mine: r.last_from === me.id } })) });
});
