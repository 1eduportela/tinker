'use strict';
// Tinker - servidor sin dependencias (solo Node.js 22.13+ / 24)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { exec } = require('node:child_process');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('\nTu version de Node.js es demasiado antigua. Instala la version LTS desde https://nodejs.org\n');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const PUBLIC = path.join(ROOT, 'public');
fs.mkdirSync(UPLOADS, { recursive: true });

// ---------- Configuracion (codigo de invitacion) ----------
const CONFIG_FILE = path.join(DATA, 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
if (!config.inviteCode) {
  config.inviteCode = crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ---------- Base de datos ----------
const db = new DatabaseSync(path.join(DATA, 'red.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  image TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_id, to_id);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id, read_at);
`);
// Columnas nuevas en bases de datos ya existentes
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('banner')) db.exec('ALTER TABLE users ADD COLUMN banner TEXT');
if (!userCols.includes('about')) db.exec("ALTER TABLE users ADD COLUMN about TEXT NOT NULL DEFAULT ''");
const projectCols = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projectCols.includes('readme')) db.exec("ALTER TABLE projects ADD COLUMN readme TEXT NOT NULL DEFAULT ''");
const postCols = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
if (!postCols.includes('title')) db.exec("ALTER TABLE posts ADD COLUMN title TEXT NOT NULL DEFAULT ''");
if (!postCols.includes('project_id')) db.exec('ALTER TABLE posts ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE');
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_project ON posts(project_id)');

// Toda publicacion pertenece a un proyecto: las antiguas van a "Publicaciones sueltas"
for (const { user_id } of db.prepare('SELECT DISTINCT user_id FROM posts WHERE project_id IS NULL').all()) {
  const info = db.prepare('INSERT INTO projects (user_id, name, description, created_at) VALUES (?, ?, ?, ?)')
    .run(user_id, 'Publicaciones sueltas', 'Publicaciones de antes de que existieran los proyectos.', Date.now());
  db.prepare('UPDATE posts SET project_id = ? WHERE user_id = ? AND project_id IS NULL').run(Number(info.lastInsertRowid), user_id);
}
for (const r of db.prepare("SELECT id, text FROM posts WHERE title = '' AND text != ''").all()) {
  const first = r.text.split('\n')[0].trim();
  db.prepare('UPDATE posts SET title = ? WHERE id = ?').run(first.length > 80 ? first.slice(0, 77) + '...' : first, r.id);
}

// ---------- Utilidades ----------
function hashPassword(pw, salt) {
  return crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw, salt, hash) {
  const a = Buffer.from(hashPassword(pw, salt), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function send(res, status, obj, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(obj));
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Archivo demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Datos no validos')); }
    });
    req.on('error', reject);
  });
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  return db.prepare(`SELECT u.id, u.username, u.display_name, u.bio, u.avatar, u.banner, u.about
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(sid) || null;
}
function requireUser(req) {
  const u = currentUser(req);
  if (!u) throw new HttpError(401, 'Tienes que iniciar sesion');
  return u;
}
function str(v, max, field) {
  const s = (typeof v === 'string' ? v : '').trim();
  if (s.length > max) throw new HttpError(400, `${field} es demasiado largo (max. ${max})`);
  return s;
}
function saveImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Imagen no valida');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) throw new HttpError(413, 'Imagen demasiado grande');
  const name = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return '/uploads/' + name;
}
function publicUser(u) {
  return { username: u.username, displayName: u.display_name, bio: u.bio, avatar: u.avatar,
    banner: u.banner || null, about: u.about || '' };
}
function userByName(username) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u) throw new HttpError(404, 'Ese usuario no existe');
  return u;
}
function unreadCount(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM messages WHERE to_id = ? AND read_at IS NULL').get(userId).n;
}

const POST_SELECT = `
  SELECT p.id, p.user_id, p.title, p.text, p.image, p.created_at, p.project_id, pr.name AS project_name,
         u.username, u.display_name, u.avatar,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
         EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked
  FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN projects pr ON pr.id = p.project_id`;
function mapPost(r, me) {
  return {
    id: r.id, title: r.title, text: r.text, image: r.image, createdAt: r.created_at,
    project: r.project_id ? { id: r.project_id, name: r.project_name } : null,
    author: { username: r.username, displayName: r.display_name, avatar: r.avatar },
    likes: r.likes, comments: r.comments, liked: !!r.liked, mine: r.user_id === me.id,
  };
}
function getPost(id, me) {
  const r = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(me.id, id);
  if (!r) throw new HttpError(404, 'Publicacion no encontrada');
  return mapPost(r, me);
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern + '$'), fn });

route('POST', '/api/register', async (req, res) => {
  const b = await readBody(req);
  const username = str(b.username, 20, 'El usuario');
  const displayName = str(b.displayName, 40, 'El nombre') || username;
  const password = typeof b.password === 'string' ? b.password : '';
  if (str(b.invite, 50, 'El codigo') !== config.inviteCode) throw new HttpError(403, 'Codigo de invitacion incorrecto');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'El usuario debe tener 3-20 letras, numeros o _');
  if (password.length < 6) throw new HttpError(400, 'La contrasena debe tener al menos 6 caracteres');
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Ese usuario ya existe');
  const salt = crypto.randomBytes(16).toString('hex');
  const info = db.prepare('INSERT INTO users (username, display_name, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, displayName, hashPassword(password, salt), salt, Date.now());
  return login(res, Number(info.lastInsertRowid));
});

function login(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  send(res, 200, { user: publicUser(u) }, {
    'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax`,
  });
}

route('POST', '/api/login', async (req, res) => {
  const b = await readBody(req);
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(str(b.username, 20, 'El usuario'));
  if (!u || !checkPassword(String(b.password || ''), u.salt, u.pass_hash)) throw new HttpError(401, 'Usuario o contrasena incorrectos');
  login(res, u.id);
});

route('POST', '/api/logout', async (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) db.prepare('DELETE FROM sessions WHERE token = ?').run(sid);
  send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' });
});

route('GET', '/api/me', async (req, res) => {
  const u = currentUser(req);
  send(res, 200, { user: u ? publicUser(u) : null, unread: u ? unreadCount(u.id) : 0 });
});

route('PUT', '/api/me', async (req, res) => {
  const me = requireUser(req);
  const b = await readBody(req, 16 * 1024 * 1024);
  const displayName = str(b.displayName, 40, 'El nombre') || me.username;
  const bio = str(b.bio, 200, 'La frase corta');
  const about = typeof b.about === 'string' ? str(b.about, 3000, 'La bienvenida') : me.about;
  let avatar = me.avatar;
  if (b.avatar) avatar = saveImage(b.avatar);
  let banner = me.banner;
  if (b.banner) banner = saveImage(b.banner);
  else if (b.removeBanner) banner = null;
  db.prepare('UPDATE users SET display_name = ?, bio = ?, about = ?, avatar = ?, banner = ? WHERE id = ?')
    .run(displayName, bio, about, avatar, banner, me.id);
  send(res, 200, { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(me.id)) });
});

route('GET', '/api/feed', async (req, res, url) => {
  const me = requireUser(req);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const mode = url.searchParams.get('mode');
  let rows;
  if (mode === 'following') {
    rows = db.prepare(POST_SELECT + ` WHERE p.id < ? AND (p.user_id = ? OR p.user_id IN
      (SELECT followee_id FROM follows WHERE follower_id = ?)) ORDER BY p.id DESC LIMIT 20`).all(me.id, before, me.id, me.id);
  } else {
    rows = db.prepare(POST_SELECT + ' WHERE p.id < ? ORDER BY p.id DESC LIMIT 20').all(me.id, before);
  }
  send(res, 200, { posts: rows.map(r => mapPost(r, me)) });
});

route('POST', '/api/posts', async (req, res) => {
  const me = requireUser(req);
  const b = await readBody(req);
  const title = str(b.title, 100, 'El titulo');
  const text = str(b.text, 2000, 'La descripcion');
  if (!title) throw new HttpError(400, 'Ponle un titulo a la publicacion');
  if (!b.image) throw new HttpError(400, 'Anade una foto');
  const project = db.prepare('SELECT id, user_id FROM projects WHERE id = ?').get(Number(b.projectId));
  if (!project) throw new HttpError(400, 'Elige el proyecto de esta publicacion');
  if (project.user_id !== me.id) throw new HttpError(403, 'Solo puedes publicar en tus proyectos');
  const image = saveImage(b.image);
  const info = db.prepare('INSERT INTO posts (user_id, project_id, title, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(me.id, project.id, title, text, image, Date.now());
  send(res, 200, { post: getPost(Number(info.lastInsertRowid), me) });
});

route('DELETE', '/api/posts/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = db.prepare('SELECT user_id, image FROM posts WHERE id = ?').get(Number(id));
  if (!p) throw new HttpError(404, 'Publicacion no encontrada');
  if (p.user_id !== me.id) throw new HttpError(403, 'Solo puedes borrar tus publicaciones');
  db.prepare('DELETE FROM posts WHERE id = ?').run(Number(id));
  if (p.image) fs.rm(path.join(UPLOADS, path.basename(p.image)), () => {});
  send(res, 200, { ok: true });
});

route('POST', '/api/posts/(\\d+)/like', async (req, res, url, [id]) => {
  const me = requireUser(req);
  getPost(Number(id), me);
  const del = db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(me.id, Number(id));
  if (del.changes === 0) db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(me.id, Number(id));
  send(res, 200, { post: getPost(Number(id), me) });
});

route('GET', '/api/posts/(\\d+)/comments', async (req, res, url, [id]) => {
  requireUser(req);
  const rows = db.prepare(`SELECT c.id, c.text, c.created_at, u.username, u.display_name, u.avatar
    FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.id`).all(Number(id));
  send(res, 200, { comments: rows.map(r => ({ id: r.id, text: r.text, createdAt: r.created_at,
    author: { username: r.username, displayName: r.display_name, avatar: r.avatar } })) });
});

route('POST', '/api/posts/(\\d+)/comments', async (req, res, url, [id]) => {
  const me = requireUser(req);
  getPost(Number(id), me);
  const b = await readBody(req);
  const text = str(b.text, 500, 'El comentario');
  if (!text) throw new HttpError(400, 'El comentario esta vacio');
  db.prepare('INSERT INTO comments (post_id, user_id, text, created_at) VALUES (?, ?, ?, ?)').run(Number(id), me.id, text, Date.now());
  send(res, 200, { ok: true });
});

route('GET', '/api/users', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare(`SELECT u.*, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS following
    FROM users u ORDER BY u.display_name COLLATE NOCASE`).all(me.id);
  send(res, 200, { users: rows.map(u => ({ ...publicUser(u), following: !!u.following, isMe: u.id === me.id })) });
});

route('GET', '/api/users/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u) throw new HttpError(404, 'Ese usuario no existe');
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const posts = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.user_id = ? ORDER BY p.id DESC LIMIT 20').all(me.id, before, u.id);
  const c = (sql) => db.prepare(sql).get(u.id).n;
  send(res, 200, {
    user: { ...publicUser(u), createdAt: u.created_at, isMe: u.id === me.id,
      following: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(me.id, u.id),
      followers: c('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?'),
      followingCount: c('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?'),
      postCount: c('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?') },
    posts: posts.map(r => mapPost(r, me)),
  });
});

route('POST', '/api/users/([A-Za-z0-9_]+)/follow', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!u) throw new HttpError(404, 'Ese usuario no existe');
  if (u.id === me.id) throw new HttpError(400, 'No puedes seguirte a ti mismo');
  const del = db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(me.id, u.id);
  if (del.changes === 0) db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(me.id, u.id);
  send(res, 200, { following: del.changes === 0 });
});

// ---------- Proyectos ----------
const PROJECT_SELECT = `
  SELECT pr.*, u.username, u.display_name, u.avatar,
    (SELECT COUNT(*) FROM posts p WHERE p.project_id = pr.id) AS post_count,
    (SELECT image FROM posts p WHERE p.project_id = pr.id AND p.image IS NOT NULL ORDER BY p.id DESC LIMIT 1) AS cover
  FROM projects pr JOIN users u ON u.id = pr.user_id`;
const mapProject = (r, me, full) => ({
  id: r.id, name: r.name, description: r.description, createdAt: r.created_at, mine: r.user_id === me.id,
  postCount: r.post_count || 0, cover: r.cover || null,
  owner: { username: r.username, displayName: r.display_name, avatar: r.avatar },
  ...(full ? { readme: r.readme } : {}),
});
function projectById(id) {
  const r = db.prepare(PROJECT_SELECT + ' WHERE pr.id = ?').get(Number(id));
  if (!r) throw new HttpError(404, 'Ese proyecto no existe');
  return r;
}
function ownProject(id, me) {
  const r = projectById(id);
  if (r.user_id !== me.id) throw new HttpError(403, 'Este proyecto no es tuyo');
  return r;
}

route('GET', '/api/users/([A-Za-z0-9_]+)/projects', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = userByName(username);
  const rows = db.prepare(PROJECT_SELECT + ' WHERE pr.user_id = ? ORDER BY pr.id DESC').all(u.id);
  send(res, 200, { projects: rows.map(r => mapProject(r, me)) });
});

route('POST', '/api/projects', async (req, res) => {
  const me = requireUser(req);
  const b = await readBody(req);
  const name = str(b.name, 60, 'El nombre');
  const description = str(b.description, 300, 'La descripcion');
  if (!name) throw new HttpError(400, 'Ponle un nombre al proyecto');
  const readme = `# ${name}\n\n${description || 'Cuenta aquí de qué va tu proyecto.'}\n`;
  const info = db.prepare('INSERT INTO projects (user_id, name, description, readme, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(me.id, name, description, readme, Date.now());
  send(res, 200, { project: mapProject(projectById(Number(info.lastInsertRowid)), me, true) });
});

route('GET', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  send(res, 200, { project: mapProject(projectById(id), me, true) });
});

route('PUT', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = ownProject(id, me);
  const b = await readBody(req);
  const name = b.name === undefined ? p.name : str(b.name, 60, 'El nombre');
  if (!name) throw new HttpError(400, 'Ponle un nombre al proyecto');
  const description = b.description === undefined ? p.description : str(b.description, 300, 'La descripcion');
  const readme = b.readme === undefined ? p.readme : str(b.readme, 50000, 'El README');
  db.prepare('UPDATE projects SET name = ?, description = ?, readme = ? WHERE id = ?').run(name, description, readme, p.id);
  send(res, 200, { project: mapProject(projectById(p.id), me, true) });
});

route('GET', '/api/projects/(\\d+)/posts', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = projectById(id);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const rows = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.project_id = ? ORDER BY p.id DESC LIMIT 20').all(me.id, before, p.id);
  send(res, 200, { posts: rows.map(r => mapPost(r, me)) });
});

route('DELETE', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = ownProject(id, me);
  const images = db.prepare('SELECT image FROM posts WHERE project_id = ? AND image IS NOT NULL').all(p.id).map(r => r.image);
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  for (const img of images) fs.rm(path.join(UPLOADS, path.basename(img)), () => {});
  send(res, 200, { ok: true });
});

// ---------- Mensajes (chat) ----------
route('GET', '/api/messages/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = userByName(username);
  const after = Number(url.searchParams.get('after')) || 0;
  const rows = db.prepare(`SELECT id, from_id, text, created_at FROM messages
    WHERE id > ? AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
    ORDER BY id DESC LIMIT 300`).all(after, me.id, u.id, u.id, me.id).reverse();
  if (rows.some(r => r.from_id === u.id)) {
    db.prepare('UPDATE messages SET read_at = ? WHERE to_id = ? AND from_id = ? AND read_at IS NULL').run(Date.now(), me.id, u.id);
  }
  send(res, 200, { messages: rows.map(r => ({ id: r.id, text: r.text, createdAt: r.created_at, mine: r.from_id === me.id })) });
});

route('POST', '/api/messages/([A-Za-z0-9_]+)', async (req, res, url, [username]) => {
  const me = requireUser(req);
  const u = userByName(username);
  if (u.id === me.id) throw new HttpError(400, 'No puedes escribirte a ti mismo');
  const b = await readBody(req);
  const text = str(b.text, 2000, 'El mensaje');
  if (!text) throw new HttpError(400, 'El mensaje esta vacio');
  db.prepare('INSERT INTO messages (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)').run(me.id, u.id, text, Date.now());
  send(res, 200, { ok: true });
});

route('GET', '/api/conversations', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare(`
    SELECT u.*, m.text AS last_text, m.created_at AS last_at, m.from_id AS last_from,
      (SELECT COUNT(*) FROM messages x WHERE x.from_id = u.id AND x.to_id = ? AND x.read_at IS NULL) AS unread
    FROM users u
    JOIN messages m ON m.id = (SELECT MAX(id) FROM messages
      WHERE (from_id = u.id AND to_id = ?) OR (from_id = ? AND to_id = u.id))
    WHERE u.id != ?
    ORDER BY m.id DESC`).all(me.id, me.id, me.id, me.id);
  send(res, 200, { conversations: rows.map(r => ({ user: publicUser(r), unread: r.unread,
    last: { text: r.last_text, createdAt: r.last_at, mine: r.last_from === me.id } })) });
});

// ---------- Archivos estaticos ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveFile(res, baseDir, rel) {
  const file = path.normalize(path.join(baseDir, rel));
  if (!file.startsWith(baseDir + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/api/')) {
      for (const r of routes) {
        const m = r.method === req.method && r.re.exec(p);
        if (m) return await r.fn(req, res, url, m.slice(1));
      }
      throw new HttpError(404, 'Ruta no encontrada');
    }
    if (p.startsWith('/uploads/')) return serveFile(res, UPLOADS, p.slice('/uploads/'.length));
    return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Error interno' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n  Tinker esta en marcha');
  console.log(`  - En este PC:        http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  - Desde otra maquina: http://${ip}:${PORT}`));
  console.log(`\n  Codigo de invitacion para registrarse: ${config.inviteCode}`);
  console.log('  (Cierra esta ventana para apagar Tinker)\n');
  if (process.platform === 'win32' && !process.env.NO_OPEN) exec(`start "" http://localhost:${PORT}`);
});
