'use strict';
// Proyectos: consulta común, formato para el navegador y comprobaciones de acceso.

const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { blockState } = require('./users');

const PROJECT_SELECT = `
  SELECT pr.*, u.username, u.display_name, u.avatar,
    (SELECT COUNT(*) FROM posts p WHERE p.project_id = pr.id) AS post_count,
    (SELECT COUNT(*) FROM project_files f WHERE f.project_id = pr.id) AS file_count,
    (SELECT image FROM posts p WHERE p.project_id = pr.id AND p.image IS NOT NULL ORDER BY p.id DESC LIMIT 1) AS cover
  FROM projects pr JOIN users u ON u.id = pr.user_id`;
const mapProject = (r, me, full) => ({
  id: r.id, name: r.name, description: r.description, createdAt: r.created_at, mine: r.user_id === me.id,
  postCount: r.post_count || 0, fileCount: r.file_count || 0, cover: r.cover || null,
  owner: { username: r.username, displayName: r.display_name, avatar: r.avatar },
  canDelete: r.user_id === me.id || !!me.is_admin,
  ...(full ? { readme: r.readme } : {}),
});

// Proyecto por id. Si se pasa "me", se comprueba que esa persona puede verlo.
function projectById(id, me) {
  const r = db.prepare(PROJECT_SELECT + ' WHERE pr.id = ?').get(Number(id));
  if (!r) throw new HttpError(404, 'Ese proyecto no existe');
  if (me && r.user_id !== me.id && !me.is_admin) {
    const owner = db.prepare('SELECT suspended_at FROM users WHERE id = ?').get(r.user_id);
    if (owner.suspended_at || blockState(me.id, r.user_id).blockedMe) throw new HttpError(404, 'Ese proyecto no existe');
  }
  return r;
}

// Proyecto que tiene que ser de "me" (para modificarlo)
function ownProject(id, me) {
  const r = projectById(id);
  if (r.user_id !== me.id) throw new HttpError(403, 'Este proyecto no es tuyo');
  return r;
}


const mapFile = r => ({ id: r.id, path: r.path, size: r.size, createdAt: r.created_at });

module.exports = { PROJECT_SELECT, mapFile, mapProject, ownProject, projectById };
