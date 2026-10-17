'use strict';
// Rutas de proyectos: listar, crear, ver, editar (nombre, descripción, README) y borrar.

const fs = require('node:fs');
const path = require('node:path');
const { FILES } = require('../config');
const { db } = require('../db');
const { HttpError } = require('../http/errors');
const { readBody } = require('../http/request');
const { send } = require('../http/response');
const { route } = require('../http/router');
const { str } = require('../http/validate');
const { HOUR } = require('../lib/units');
const { securityLog } = require('../security/audit-log');
const { limit } = require('../security/rate-limit');
const { requireUser } = require('../security/sessions');
const { removeUploads } = require('../services/media');
const { POST_SELECT, mapPosts, postFiles } = require('../services/posts');
const { PROJECT_SELECT, mapProject, ownProject, projectById } = require('../services/projects');
const { visibleUserByName } = require('../services/users');

// Proyectos de una persona
route('GET', '/api/users/([A-Za-z0-9_]+)/projects', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = visibleUserByName(username, me);
  const rows = db.prepare(PROJECT_SELECT + ' WHERE pr.user_id = ? ORDER BY pr.id DESC').all(u.id);
  send(res, 200, { projects: rows.map(r => mapProject(r, me)) });
});

// Crear proyecto (con un README inicial)
route('POST', '/api/projects', async (req, res) => {
  const me = requireUser(req);
  limit('project:' + me.id, 20, HOUR, 'Has creado demasiados proyectos seguidos');
  const b = await readBody(req);
  const name = str(b.name, 60, 'El nombre');
  const description = str(b.description, 300, 'La descripcion');
  if (!name) throw new HttpError(400, 'Ponle un nombre al proyecto');
  const readme = `# ${name}\n\n${description || 'Cuenta aquí de qué va tu proyecto.'}\n`;
  const info = db.prepare('INSERT INTO projects (user_id, name, description, readme, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(me.id, name, description, readme, Date.now());
  send(res, 200, { project: mapProject(projectById(Number(info.lastInsertRowid)), me, true) });
});

// Ver un proyecto
route('GET', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  send(res, 200, { project: mapProject(projectById(id, me), me, true) });
});

// Editar nombre, descripción o README
route('PUT', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  limit('projectedit:' + me.id, 120, HOUR, 'Demasiados cambios seguidos');
  const p = ownProject(id, me);
  const b = await readBody(req);
  const name = b.name === undefined ? p.name : str(b.name, 60, 'El nombre');
  if (!name) throw new HttpError(400, 'Ponle un nombre al proyecto');
  const description = b.description === undefined ? p.description : str(b.description, 300, 'La descripcion');
  const readme = b.readme === undefined ? p.readme : str(b.readme, 50000, 'El README');
  db.prepare('UPDATE projects SET name = ?, description = ?, readme = ? WHERE id = ?').run(name, description, readme, p.id);
  send(res, 200, { project: mapProject(projectById(p.id), me, true) });
});

// Publicaciones del proyecto (sección Multimedia)
route('GET', '/api/projects/(\\d+)/posts', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = projectById(id, me);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const rows = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.project_id = ? ORDER BY p.id DESC LIMIT 20').all(before, p.id);
  send(res, 200, { posts: mapPosts(rows, me) });
});

// Borrar proyecto con sus publicaciones y archivos (su autor o un administrador)
route('DELETE', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = me.is_admin ? projectById(id) : ownProject(id, me);
  if (p.user_id !== me.id) securityLog('moderacion_proyecto_borrado', req, `${me.username} borro el proyecto ${id} de ${p.username}`);
  const images = postFiles('p.project_id = ?', p.id);
  const stored = db.prepare('SELECT stored FROM project_files WHERE project_id = ?').all(p.id).map(r => r.stored);
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  removeUploads(images);
  for (const f of stored) fs.rm(path.join(FILES, f), () => {});
  send(res, 200, { ok: true });
});
