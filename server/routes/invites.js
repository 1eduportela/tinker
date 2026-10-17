'use strict';
// Rutas de invitaciones: cada persona puede crear códigos personales de un solo uso para invitar a otra.

const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { sha256 } = require('../lib/hash');
const { DAY } = require('../lib/units');
const { securityLog } = require('../security/audit-log');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { INVITE_DAYS, MAX_PENDING_INVITES, newInviteCode, normCode } = require('../services/invites');

// Mis invitaciones y su estado
route('GET', '/api/invites', async (req, res) => {
  const me = requireUser(req);
  const now = Date.now();
  const rows = db.prepare(`SELECT i.*, u.username AS used_name FROM invites i LEFT JOIN users u ON u.id = i.used_by
    WHERE i.created_by = ? ORDER BY i.id DESC LIMIT 50`).all(me.id);
  send(res, 200, { invites: rows.map(r => ({ id: r.id, hint: r.hint, createdAt: r.created_at, expiresAt: r.expires_at,
    status: r.used_at ? 'used' : r.expires_at < now ? 'expired' : 'pending', usedBy: r.used_name || null })) });
});

// Crear una invitación (el código solo se ve en esta respuesta)
route('POST', '/api/invites', async (req, res) => {
  const me = requireUser(req);
  limit('invite:' + me.id, 10, DAY, 'Has creado demasiadas invitaciones hoy');
  const now = Date.now();
  const pending = db.prepare('SELECT COUNT(*) AS n FROM invites WHERE created_by = ? AND used_at IS NULL AND expires_at > ?').get(me.id, now).n;
  if (pending >= MAX_PENDING_INVITES) throw new HttpError(400, `Ya tienes ${MAX_PENDING_INVITES} invitaciones sin usar. Espera a que se usen o anula alguna.`);
  const code = newInviteCode();
  const expiresAt = now + INVITE_DAYS * DAY;
  db.prepare('INSERT INTO invites (code_hash, hint, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(sha256(normCode(code)), code.slice(-2), me.id, now, expiresAt);
  securityLog('invitacion_creada', req, me.username);
  send(res, 200, { code, expiresAt });
});

// Anular una invitación sin usar
route('DELETE', '/api/invites/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const r = db.prepare('DELETE FROM invites WHERE id = ? AND created_by = ? AND used_at IS NULL').run(Number(id), me.id);
  if (!r.changes) throw new HttpError(404, 'Invitacion no encontrada');
  send(res, 200, { ok: true });
});
