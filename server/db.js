'use strict';
// Base de datos SQLite (data/red.db): crea las tablas y aplica las migraciones al arrancar.
// Las migraciones adaptan las bases de datos de versiones anteriores sin perder nada.

const fs = require('node:fs');
const path = require('node:path');
const { DATA, UPLOADS } = require('./config');
const { sha256 } = require('./lib/hash');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('\nTu version de Node.js es demasiado antigua. Instala la version LTS desde https://nodejs.org\n');
  process.exit(1);
}

// ---------- Tablas ----------
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
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_used INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  agent TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  image TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (follower_id, followee_id)
);
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
CREATE TABLE IF NOT EXISTS media_uploads (
  url TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS post_media (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  poster TEXT,
  width INTEGER,
  height INTEGER
);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id, position);
CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  stored TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (project_id, path)
);
`);
// ---------- Migraciones ----------
// Tinker no tiene me gusta ni comentarios (para que no haya interes en meter bots): se borran si existian
db.exec('DROP TABLE IF EXISTS likes; DROP TABLE IF EXISTS comments;');
// Sesiones: de guardar la clave tal cual a guardar solo su huella (SHA-256)
if (db.prepare('PRAGMA table_info(sessions)').all().some(c => c.name === 'token')) {
  db.exec('BEGIN');
  db.exec(`CREATE TABLE sessions_new (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL, last_used INTEGER NOT NULL, ip TEXT NOT NULL DEFAULT '', agent TEXT NOT NULL DEFAULT '')`);
  for (const r of db.prepare('SELECT token, user_id, created_at FROM sessions').all()) {
    db.prepare('INSERT OR IGNORE INTO sessions_new (id, user_id, created_at, last_used) VALUES (?, ?, ?, ?)').run(sha256(r.token), r.user_id, r.created_at, Date.now());
  }
  db.exec('DROP TABLE sessions; ALTER TABLE sessions_new RENAME TO sessions; COMMIT');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
db.exec(`CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
)`);
db.exec(`CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,
  hint TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  used_at INTEGER
)`);
// Columnas nuevas en bases de datos ya existentes
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('banner')) db.exec('ALTER TABLE users ADD COLUMN banner TEXT');
if (!userCols.includes('about')) db.exec("ALTER TABLE users ADD COLUMN about TEXT NOT NULL DEFAULT ''");
if (!userCols.includes('invited_by')) db.exec('ALTER TABLE users ADD COLUMN invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
if (!userCols.includes('is_admin')) db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
if (!userCols.includes('suspended_at')) db.exec('ALTER TABLE users ADD COLUMN suspended_at INTEGER');
// La primera cuenta registrada es la de administrador
if (!db.prepare('SELECT 1 FROM users WHERE is_admin = 1').get()) db.exec('UPDATE users SET is_admin = 1 WHERE id = (SELECT MIN(id) FROM users)');
if (!userCols.includes('pass_params')) db.exec("ALTER TABLE users ADD COLUMN pass_params TEXT NOT NULL DEFAULT 'scrypt:16384:8:1'");
const mediaCols = db.prepare('PRAGMA table_info(media_uploads)').all().map(c => c.name);
if (!mediaCols.includes('size')) {
  db.exec('ALTER TABLE media_uploads ADD COLUMN size INTEGER NOT NULL DEFAULT 0');
  for (const r of db.prepare('SELECT url FROM media_uploads').all()) {
    try { db.prepare('UPDATE media_uploads SET size = ? WHERE url = ?').run(fs.statSync(path.join(UPLOADS, path.basename(r.url))).size, r.url); } catch {}
  }
}
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

module.exports = { db };
