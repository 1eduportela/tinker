'use strict';
// Mensajes del chat: lo que se necesita fuera de sus rutas (el contador de no leídos).

const { db } = require('../db');
const { VISIBLE_AUTHOR } = require('./users');

// Mensajes sin leer, sin contar los de cuentas suspendidas o bloqueadas
function unreadCount(userId) {
  return db.prepare(`SELECT COUNT(*) AS n FROM messages m JOIN users u ON u.id = m.from_id
    WHERE m.to_id = ? AND m.read_at IS NULL AND ${VISIBLE_AUTHOR}`).get(userId, userId, userId).n;
}

module.exports = { unreadCount };
