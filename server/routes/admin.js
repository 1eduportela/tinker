'use strict';
// Rutas de administración: solo para la cuenta administradora (la primera que se creó).

const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { securityLog } = require('../security/audit-log');
const { requireAdmin } = require('../security/sessions');
const { userByName } = require('../services/users');

// Suspender o reactivar una cuenta: al suspender se cierran sus sesiones
route('POST', '/api/admin/users/([A-Za-z0-9_]+)/suspend', async (req, res, url, [username]) => {
  const me = requireAdmin(req);
  const u = userByName(username);
  if (u.id === me.id || u.is_admin) throw new HttpError(400, 'No se puede suspender a un administrador');
  const suspend = !u.suspended_at;
  db.prepare('UPDATE users SET suspended_at = ? WHERE id = ?').run(suspend ? Date.now() : null, u.id);
  if (suspend) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  securityLog(suspend ? 'moderacion_cuenta_suspendida' : 'moderacion_cuenta_reactivada', req, `${me.username} -> ${u.username}`);
  send(res, 200, { suspended: suspend });
});
