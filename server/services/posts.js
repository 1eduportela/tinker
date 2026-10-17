'use strict';
// Publicaciones: consulta común, conversión al formato que recibe el navegador y archivos de cada una.

const { db } = require('../db');
const { HttpError } = require('../http/errors');

const POST_SELECT = `
  SELECT p.id, p.user_id, p.title, p.text, p.image, p.created_at, p.project_id, pr.name AS project_name,
         u.username, u.display_name, u.avatar
  FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN projects pr ON pr.id = p.project_id`;

// Filas de la base de datos -> publicaciones con sus fotos y vídeos (una sola consulta para todas)
function mapPosts(rows, me) {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const media = db.prepare(`SELECT * FROM post_media WHERE post_id IN (${ids.map(() => '?').join(',')}) ORDER BY position`).all(...ids);
  const byPost = new Map();
  for (const m of media) {
    if (!byPost.has(m.post_id)) byPost.set(m.post_id, []);
    byPost.get(m.post_id).push({ kind: m.kind, url: m.url, poster: m.poster, width: m.width, height: m.height });
  }
  return rows.map(r => mapPost(r, me, byPost.get(r.id)));
}

function mapPost(r, me, media) {
  if (!media || !media.length) media = r.image ? [{ kind: 'image', url: r.image, poster: null, width: null, height: null }] : [];
  return {
    id: r.id, title: r.title, text: r.text, image: r.image, media, createdAt: r.created_at,
    project: r.project_id ? { id: r.project_id, name: r.project_name } : null,
    author: { username: r.username, displayName: r.display_name, avatar: r.avatar },
    mine: r.user_id === me.id, canDelete: r.user_id === me.id || !!me.is_admin,
  };
}

function getPost(id, me) {
  const r = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(id);
  if (!r) throw new HttpError(404, 'Publicacion no encontrada');
  return mapPosts([r], me)[0];
}

// Todas las fotos y vídeos de las publicaciones que cumplen la condición (para borrarlos del disco)
function postFiles(where, ...args) {
  const files = new Set();
  for (const r of db.prepare(`SELECT p.image FROM posts p WHERE ${where} AND p.image IS NOT NULL`).all(...args)) files.add(r.image);
  for (const r of db.prepare(`SELECT m.url, m.poster FROM post_media m JOIN posts p ON p.id = m.post_id WHERE ${where}`).all(...args)) {
    files.add(r.url); if (r.poster) files.add(r.poster);
  }
  return [...files];
}

module.exports = { POST_SELECT, getPost, mapPosts, postFiles };
