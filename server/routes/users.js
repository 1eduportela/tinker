'use strict';
// Rutas de personas: lista, perfil, seguir y bloquear.

const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { HOUR } = require('../lib/units');
const { securityLog } = require('../security/audit-log');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { POST_SELECT, mapPosts } = require('../services/posts');
const { blockState, publicUser, userByName, visibleUserByName } = require('../services/users');

// Lista de personas (sin las que me han bloqueado)
route('GET', '/api/users', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare(`SELECT u.*, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS following
    FROM users u WHERE u.id = ? OR NOT EXISTS (SELECT 1 FROM blocks bl WHERE bl.blocker_id = u.id AND bl.blocked_id = ?)
    ORDER BY u.display_name COLLATE NOCASE`).all(me.id, me.id, me.id)
    .filter(u => !u.suspended_at || me.is_admin);
  send(res, 200, { users: rows.map(u => ({ ...publicUser(u), following: !!u.following, isMe: u.id === me.id, suspended: !!u.suspended_at })) });
});

// Perfil de una persona con sus primeras publicaciones
route('GET', '/api/users/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = visibleUserByName(username, me);
  const bs = blockState(me.id, u.id);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const posts = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.user_id = ? ORDER BY p.id DESC LIMIT 20').all(before, u.id);
  const c = (sql) => db.prepare(sql).get(u.id).n;
  send(res, 200, {
    user: { ...publicUser(u), createdAt: u.created_at, isMe: u.id === me.id,
      blockedByMe: bs.iBlocked, suspended: !!u.suspended_at, isAdmin: !!u.is_admin,
      canModerate: !!me.is_admin && u.id !== me.id && !u.is_admin,
      invitedBy: u.invited_by ? (db.prepare('SELECT username FROM users WHERE id = ?').get(u.invited_by) || {}).username || null : null,
      following: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(me.id, u.id),
      followers: c('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?'),
      followingCount: c('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?'),
      postCount: c('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?') },
    posts: mapPosts(posts, me),
  });
});

// Seguir / dejar de seguir
route('POST', '/api/users/([A-Za-z0-9_]+)/follow', async (req, res, url, [username]) => {
  const me = requireUser(req);
  limit('follow:' + me.id, 120, HOUR, 'Demasiados cambios de seguimiento');
  const u = visibleUserByName(username, me);
  if (u.id === me.id) throw new HttpError(400, 'No puedes seguirte a ti mismo');
  if (blockState(me.id, u.id).iBlocked) throw new HttpError(400, 'Has bloqueado a esta persona: desbloqueala primero');
  const del = db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(me.id, u.id);
  if (del.changes === 0) db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(me.id, u.id);
  send(res, 200, { following: del.changes === 0 });
});

// Bloquear / desbloquear (también deja de seguiros mutuamente)
route('POST', '/api/users/([A-Za-z0-9_]+)/block', async (req, res, url, [username]) => {
  const me = requireUser(req);
  limit('block:' + me.id, 60, HOUR, 'Demasiados cambios seguidos');
  const u = userByName(username);
  if (u.id === me.id) throw new HttpError(400, 'No puedes bloquearte a ti mismo');
  const del = db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(me.id, u.id);
  if (del.changes === 0) {
    db.prepare('INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').run(me.id, u.id, Date.now());
    db.prepare('DELETE FROM follows WHERE (follower_id = ? AND followee_id = ?) OR (follower_id = ? AND followee_id = ?)').run(me.id, u.id, u.id, me.id);
    securityLog('usuario_bloqueado', req, `${me.username} -> ${u.username}`);
  }
  send(res, 200, { blocked: del.changes === 0 });
});
