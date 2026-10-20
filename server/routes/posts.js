'use strict';
// Rutas de publicaciones: el inicio (feed), publicar y borrar.

const { MAX_MEDIA_PER_POST } = require('../config');
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
const { ownUpload, removeUploads } = require('../services/media');
const { POST_SELECT, getPost, mapPosts, postFiles } = require('../services/posts');
const { VISIBLE_AUTHOR } = require('../services/users');

// Inicio: mis publicaciones y las de quien sigo (de 20 en 20, hacia atrás con ?before=)
route('GET', '/api/feed', async (req, res, url) => {
  const me = requireUser(req);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const mode = url.searchParams.get('mode');
  let rows;
  if (mode === 'following') {
    rows = db.prepare(POST_SELECT + ` WHERE p.id < ? AND (p.user_id = ? OR p.user_id IN
      (SELECT followee_id FROM follows WHERE follower_id = ?)) AND ${VISIBLE_AUTHOR} ORDER BY p.id DESC LIMIT 20`).all(before, me.id, me.id, me.id, me.id);
  } else {
    rows = db.prepare(POST_SELECT + ` WHERE p.id < ? AND ${VISIBLE_AUTHOR} ORDER BY p.id DESC LIMIT 20`).all(before, me.id, me.id);
  }
  send(res, 200, { posts: mapPosts(rows, me) });
});

// Publicar: título, descripción, proyecto y las fotos/vídeos ya subidos
route('POST', '/api/posts', async (req, res) => {
  const me = requireUser(req);
  limit('post:' + me.id, 30, HOUR, 'Has publicado demasiado en poco tiempo');
  const b = await readBody(req);
  const title = str(b.title, 100, 'El titulo');
  const text = str(b.text, 2000, 'La descripcion');
  if (!title) throw new HttpError(400, 'Ponle un titulo a la publicacion');
  const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(Number(b.projectId));
  if (!project) throw new HttpError(400, 'Elige el proyecto de esta publicacion');
  if (project.user_id !== me.id) throw new HttpError(403, 'Solo puedes publicar en tus proyectos');
  const media = Array.isArray(b.media) ? b.media : [];
  if (!media.length) throw new HttpError(400, 'Anade al menos una foto o un video');
  if (media.length > MAX_MEDIA_PER_POST) throw new HttpError(400, `Maximo ${MAX_MEDIA_PER_POST} fotos o videos por publicacion`);
  const clean = media.map(m => {
    const kind = m && m.kind === 'video' ? 'video' : 'image';
    if (!ownUpload(m && m.url, me, kind)) throw new HttpError(400, 'Algun archivo no se ha subido bien. Vuelve a intentarlo.');
    const poster = kind === 'video' && m.poster && ownUpload(m.poster, me, 'image') ? m.poster : null;
    const dim = v => (Number.isInteger(v) && v > 0 && v < 20000 ? v : null);
    return { kind, url: m.url, poster, width: dim(m.width), height: dim(m.height) };
  });
  const urls = clean.flatMap(m => [m.url, m.poster]).filter(Boolean);
  if (new Set(urls).size !== urls.length) throw new HttpError(400, 'Hay archivos repetidos en la publicacion');
  const cover = clean[0].kind === 'image' ? clean[0].url : clean[0].poster;
  let postId;
  db.exec('BEGIN');
  try {
    const info = db.prepare('INSERT INTO posts (user_id, project_id, title, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(me.id, project.id, title, text, cover, Date.now());
    postId = Number(info.lastInsertRowid);
    clean.forEach((m, i) => db.prepare('INSERT INTO post_media (post_id, position, kind, url, poster, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(postId, i, m.kind, m.url, m.poster, m.width, m.height));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  // Fuera del try: si esto fallara tras el COMMIT, el ROLLBACK lanzaría otro error y taparía el de verdad
  send(res, 200, { post: getPost(postId, me) });
});

// Borrar una publicación (su autor o un administrador)
route('DELETE', '/api/posts/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = db.prepare('SELECT user_id, image FROM posts WHERE id = ?').get(Number(id));
  if (!p) throw new HttpError(404, 'Publicacion no encontrada');
  if (p.user_id !== me.id && !me.is_admin) throw new HttpError(403, 'Solo puedes borrar tus publicaciones');
  const files = postFiles('p.id = ?', Number(id));
  db.prepare('DELETE FROM posts WHERE id = ?').run(Number(id));
  if (p.user_id !== me.id) securityLog('moderacion_publicacion_borrada', req, `${me.username} borro la publicacion ${id}`);
  removeUploads(files);
  send(res, 200, { ok: true });
});
