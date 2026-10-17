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
const DATA = process.env.TINKER_DATA ? path.resolve(process.env.TINKER_DATA) : path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const FILES = path.join(DATA, 'files');
const MAX_FILE = 50 * 1024 * 1024;
const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 300 * 1024 * 1024;
const MAX_MEDIA_PER_POST = 10;
const PUBLIC = path.join(ROOT, 'public');
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(FILES, { recursive: true });

// ---------- Configuracion (codigo de invitacion) ----------
const CONFIG_FILE = path.join(DATA, 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); }
if (!config.inviteCode) config.inviteCode = crypto.randomBytes(4).toString('hex');
// trustProxy: ponlo a true SOLO si Tinker esta detras de un intermediario (Cloudflare, Caddy...)
if (config.trustProxy === undefined) config.trustProxy = false;
saveConfig();

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
// Tinker no tiene me gusta ni comentarios (para que no haya interes en meter bots): se borran si existian
db.exec('DROP TABLE IF EXISTS likes; DROP TABLE IF EXISTS comments;');
// Sesiones: de guardar la clave tal cual a guardar solo su huella (SHA-256)
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
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
// Columnas nuevas en bases de datos ya existentes
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('banner')) db.exec('ALTER TABLE users ADD COLUMN banner TEXT');
if (!userCols.includes('about')) db.exec("ALTER TABLE users ADD COLUMN about TEXT NOT NULL DEFAULT ''");
if (!userCols.includes('pass_params')) db.exec("ALTER TABLE users ADD COLUMN pass_params TEXT NOT NULL DEFAULT 'scrypt:16384:8:1'");
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

// ---------- Contraseñas ----------
// scrypt con parametros guardados por usuario: si se endurecen, las contraseñas antiguas
// se re-cifran solas la siguiente vez que esa persona inicia sesion.
const PASS_PARAMS = 'scrypt:32768:8:1';   // N=32768 -> 32 MB de memoria por calculo
function parseParams(p) {
  const [, N, r, pp] = String(p || 'scrypt:16384:8:1').split(':').map(Number);
  return { N: N || 16384, r: r || 8, p: pp || 1, maxmem: 128 * (N || 16384) * (r || 8) * 2 };
}
function hashPassword(pw, salt, params = PASS_PARAMS) {
  return crypto.scryptSync(String(pw), salt, 64, parseParams(params)).toString('hex');
}
function hashPasswordAsync(pw, salt, params = PASS_PARAMS) {
  return new Promise((resolve, reject) => crypto.scrypt(String(pw), salt, 64, parseParams(params),
    (err, key) => err ? reject(err) : resolve(key.toString('hex'))));
}
async function verifyPassword(pw, user) {
  const a = Buffer.from(await hashPasswordAsync(pw, user.salt, user.pass_params), 'hex');
  const b = Buffer.from(user.pass_hash, 'hex');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (ok && user.pass_params !== PASS_PARAMS && user.id) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET pass_hash = ?, salt = ?, pass_params = ? WHERE id = ?')
      .run(await hashPasswordAsync(pw, salt), salt, PASS_PARAMS, user.id);
  }
  return ok;
}
const COMMON_PASSWORDS = new Set(`123456 password 12345678 qwerty 123456789 12345 1234 111111 1234567 dragon 123123 baseball
abc123 football monkey letmein 696969 shadow master 666666 qwertyuiop 123321 mustang 1234567890 michael 654321 superman
1qaz2wsx 7777777 121212 000000 qazwsx 123qwe killer trustno1 jordan jennifer zxcvbnm asdfgh hunter buster soccer harley
batman andrew tigger sunshine iloveyou charlie robert thomas hockey ranger daniel starwars 112233 george computer
michelle jessica pepper 1111 zxcvbn 555555 11111111 131313 freedom 777777 pass maggie 159753 aaaaaa ginger princess
joshua cheese amanda summer love ashley nicole chelsea biteme matthew access yankees 987654321 dallas austin thunder
taylor matrix contraseña contrasena contraseña1 12341234 tinker tinker123 cacharrando password1 password123 qwerty123
admin admin123 administrador welcome holamundo hola1234 hola123 barcelona realmadrid españa espana madrid valencia sevilla
teamo tequiero 00000000 87654321 abcd1234 a1b2c3d4 qwer1234 asdf1234 1q2w3e4r 1q2w3e4r5t secreto secreto1 usuario
usuario1 iloveyou1 football1 princesa futbol futbol123 pokemon minecraft`.split(/\s+/));
function passwordProblem(pw, username) {
  if (typeof pw !== 'string' || pw.length < 8) return 'La contrasena debe tener al menos 8 caracteres';
  if (pw.length > 200) return 'La contrasena es demasiado larga (max. 200)';
  const low = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(low) || COMMON_PASSWORDS.has(low.replace(/[0-9!.]+$/, ''))) return 'Esa contrasena es demasiado comun: elige otra';
  if (/^(.)\1+$/.test(pw)) return 'La contrasena no puede ser un mismo caracter repetido';
  if (username && username.length >= 3 && low.includes(String(username).toLowerCase())) return 'La contrasena no puede contener tu nombre de usuario';
  return null;
}

// ---------- Utilidades ----------
function send(res, status, obj, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(obj));
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function readBody(req, limit = 8 * 1024 * 1024) {
  // Solo se acepta JSON: asi otra web no puede mandar formularios "disfrazados" en nombre del usuario
  const type = String(req.headers['content-type'] || '');
  if (Number(req.headers['content-length'] || 0) > 0 && !type.startsWith('application/json')) {
    req.resume();
    return Promise.reject(new HttpError(415, 'Formato de datos no valido'));
  }
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
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Archivo demasiado grande (max. 50 MB)')); req.resume(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function cleanPath(p) {
  const parts = String(p || '').replace(/\\/g, '/').split('/').map(s => s.trim())
    .filter(s => s && s !== '.' && s !== '..');
  const out = parts.join('/');
  if (!out) throw new HttpError(400, 'Nombre de archivo no valido');
  if (out.length > 300) throw new HttpError(400, 'La ruta del archivo es demasiado larga');
  if (/[\x00-\x1f]/.test(out)) throw new HttpError(400, 'Nombre de archivo no valido');
  return out;
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch {} }
  });
  return out;
}
// La cookie lleva una clave aleatoria de 256 bits; en la base de datos solo se guarda su huella,
// asi que aunque alguien copiara red.db no podria entrar con esas sesiones.
const SESSION_IDLE = 30 * 24 * 3600 * 1000;   // se cierra tras 30 dias sin usarla
const SESSION_MAX = 180 * 24 * 3600 * 1000;   // y como mucho dura 180 dias
const MAX_SESSIONS_PER_USER = 20;
function currentUser(req) {
  if (req._user !== undefined) return req._user;
  req._user = null;
  const sid = parseCookies(req).sid;
  if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
  const id = sha256(sid);
  const r = db.prepare(`SELECT s.id AS session_id, s.created_at AS session_created, s.last_used, u.*
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(id);
  if (!r) return null;
  const now = Date.now();
  if (now - r.last_used > SESSION_IDLE || now - r.session_created > SESSION_MAX) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  if (now - r.last_used > 5 * 60 * 1000) db.prepare('UPDATE sessions SET last_used = ?, ip = ? WHERE id = ?').run(now, clientIp(req), id);
  req._user = r;
  return r;
}
function sessionCookie(req, value, maxAgeSec) {
  return `sid=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`;
}
setInterval(() => {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE last_used < ? OR created_at < ?').run(now - SESSION_IDLE, now - SESSION_MAX);
}, 60 * 60 * 1000).unref();
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
         u.username, u.display_name, u.avatar
  FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN projects pr ON pr.id = p.project_id`;
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
    mine: r.user_id === me.id,
  };
}
function getPost(id, me) {
  const r = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(id);
  if (!r) throw new HttpError(404, 'Publicacion no encontrada');
  return mapPosts([r], me)[0];
}

// ---------- Limites de uso y registro de seguridad ----------
// Ventanas fijas en memoria: { clave -> { n, reset } }
const buckets = new Map();
function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  return { ok: b.n <= max, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
function peek(key) { const b = buckets.get(key); return b && b.reset > Date.now() ? b.n : 0; }
function clearKey(key) { buckets.delete(key); }
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k); }, 10 * 60 * 1000).unref();

function clientIp(req) {
  if (config.trustProxy) {
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return String(cf).trim();
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
function tooMany(retryAfter, what) {
  const min = Math.max(1, Math.ceil(retryAfter / 60));
  const e = new HttpError(429, `${what}. Espera ${min} minuto${min === 1 ? '' : 's'} y vuelve a intentarlo.`);
  e.retryAfter = retryAfter;
  return e;
}
// Comprueba un limite y lanza error 429 si se pasa
function limit(key, max, windowMs, what = 'Demasiadas peticiones') {
  const r = hit(key, max, windowMs);
  if (!r.ok) throw tooMany(r.retryAfter, what);
}
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// Registro de seguridad en data/seguridad.log (se rota al pasar de 5 MB)
const SECURITY_LOG = path.join(DATA, 'seguridad.log');
function securityLog(event, req, detail = '') {
  const line = `${new Date().toISOString()}\t${event}\t${req ? clientIp(req) : '-'}\t${detail}\n`;
  try {
    const st = fs.existsSync(SECURITY_LOG) && fs.statSync(SECURITY_LOG);
    if (st && st.size > 5 * 1024 * 1024) fs.renameSync(SECURITY_LOG, SECURITY_LOG + '.1');
    fs.appendFileSync(SECURITY_LOG, line);
  } catch {}
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern + '$'), fn });

route('POST', '/api/register', async (req, res) => {
  const ip = clientIp(req);
  limit('register:' + ip, 10, HOUR, 'Demasiados intentos de registro');
  const b = await readBody(req);
  const username = str(b.username, 20, 'El usuario');
  const displayName = str(b.displayName, 40, 'El nombre') || username;
  const password = typeof b.password === 'string' ? b.password : '';
  if (str(b.invite, 50, 'El codigo') !== config.inviteCode) {
    securityLog('invitacion_incorrecta', req, username);
    limit('badinvite:' + ip, 5, HOUR, 'Demasiados codigos de invitacion incorrectos');
    throw new HttpError(403, 'Codigo de invitacion incorrecto');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'El usuario debe tener 3-20 letras, numeros o _');
  const weak = passwordProblem(password, username);
  if (weak) throw new HttpError(400, weak);
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Ese usuario ya existe');
  const salt = crypto.randomBytes(16).toString('hex');
  const info = db.prepare('INSERT INTO users (username, display_name, pass_hash, salt, pass_params, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, displayName, await hashPasswordAsync(password, salt), salt, PASS_PARAMS, Date.now());
  securityLog('registro', req, username);
  return login(req, res, Number(info.lastInsertRowid));
});

function createSession(req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, last_used, ip, agent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sha256(token), userId, now, now, clientIp(req), String(req.headers['user-agent'] || '').slice(0, 200));
  // Como mucho 20 sesiones abiertas por persona: se cierran las mas antiguas
  db.prepare(`DELETE FROM sessions WHERE user_id = ? AND id NOT IN
    (SELECT id FROM sessions WHERE user_id = ? ORDER BY last_used DESC LIMIT ?)`).run(userId, userId, MAX_SESSIONS_PER_USER);
  return token;
}
function login(req, res, userId) {
  const token = createSession(req, userId);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  send(res, 200, { user: publicUser(u) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_MAX / 1000) });
}

// Hash falso para tardar lo mismo aunque el usuario no exista (no se puede saber si existe midiendo tiempos)
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_USER = { salt: DUMMY_SALT, pass_params: PASS_PARAMS, pass_hash: hashPassword(crypto.randomBytes(16).toString('hex'), DUMMY_SALT) };
const LOGIN_MAX_FAILS = 5, LOGIN_LOCK = 15 * MIN;
route('POST', '/api/login', async (req, res) => {
  const ip = clientIp(req);
  const b = await readBody(req);
  const name = str(b.username, 40, 'El usuario').toLowerCase();
  const userKey = 'loginfail:u:' + name, ipKey = 'loginfail:ip:' + ip;
  // Bloqueo: 5 fallos seguidos en una cuenta o 20 desde la misma IP -> 15 minutos sin poder probar
  for (const [k, max] of [[userKey, LOGIN_MAX_FAILS], [ipKey, 20]]) {
    if (peek(k) >= max) { const bk = buckets.get(k); throw tooMany(Math.ceil((bk.reset - Date.now()) / 1000), 'Demasiados intentos fallidos'); }
  }
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(name);
  const ok = u ? await verifyPassword(String(b.password || ''), u) : (await verifyPassword('x', DUMMY_USER), false);
  if (!ok) {
    const r1 = hit(userKey, LOGIN_MAX_FAILS, LOGIN_LOCK); hit(ipKey, 20, LOGIN_LOCK);
    securityLog('login_fallido', req, name);
    if (!r1.ok || peek(userKey) >= LOGIN_MAX_FAILS) securityLog('cuenta_bloqueada_15min', req, name);
    const left = Math.max(0, LOGIN_MAX_FAILS - peek(userKey));
    throw new HttpError(401, left > 0 && left <= 2 ? `Usuario o contrasena incorrectos (te quedan ${left} intento${left === 1 ? '' : 's'})` : 'Usuario o contrasena incorrectos');
  }
  clearKey(userKey);
  securityLog('login', req, u.username);
  login(req, res, u.id);
});

route('POST', '/api/logout', async (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(String(sid)));
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
});

route('GET', '/api/me', async (req, res) => {
  const u = currentUser(req);
  send(res, 200, { user: u ? publicUser(u) : null, unread: u ? unreadCount(u.id) : 0 });
});

route('PUT', '/api/me', async (req, res) => {
  const me = requireUser(req);
  limit('profile:' + me.id, 30, HOUR, 'Has cambiado el perfil demasiadas veces');
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

// ---------- Cuenta y seguridad ----------
function describeAgent(ua) {
  ua = String(ua || '');
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const osName = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad'
    : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'otro sistema';
  return `${browser} en ${osName}`;
}
// Verifica la contraseña actual contando los fallos igual que en el inicio de sesion
async function confirmPassword(req, me, pw) {
  const key = 'loginfail:u:' + me.username.toLowerCase();
  if (peek(key) >= LOGIN_MAX_FAILS) { const bk = buckets.get(key); throw tooMany(Math.ceil((bk.reset - Date.now()) / 1000), 'Demasiados intentos fallidos'); }
  if (!(await verifyPassword(String(pw || ''), me))) {
    hit(key, LOGIN_MAX_FAILS, LOGIN_LOCK);
    securityLog('contrasena_actual_incorrecta', req, me.username);
    throw new HttpError(403, 'La contrasena actual no es correcta');
  }
  clearKey(key);
}

route('GET', '/api/me/security', async (req, res) => {
  const me = requireUser(req);
  const rows = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY last_used DESC').all(me.id);
  send(res, 200, {
    sessions: rows.map(r => ({ id: r.id.slice(0, 16), current: r.id === me.session_id, createdAt: r.created_at,
      lastUsed: r.last_used, ip: r.ip, device: describeAgent(r.agent) })),
  });
});

route('POST', '/api/me/password', async (req, res) => {
  const me = requireUser(req);
  limit('pwchange:' + me.id, 10, HOUR, 'Demasiados cambios de contrasena');
  const b = await readBody(req);
  await confirmPassword(req, me, b.current);
  const weak = passwordProblem(b.next, me.username);
  if (weak) throw new HttpError(400, weak);
  if (b.next === b.current) throw new HttpError(400, 'La nueva contrasena tiene que ser distinta');
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE users SET pass_hash = ?, salt = ?, pass_params = ? WHERE id = ?')
    .run(await hashPasswordAsync(b.next, salt), salt, PASS_PARAMS, me.id);
  // Se cierran todas las demas sesiones y esta se renueva
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(me.id);
  securityLog('contrasena_cambiada', req, me.username);
  login(req, res, me.id);
});

route('POST', '/api/me/sessions/close-others', async (req, res) => {
  const me = requireUser(req);
  const r = db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(me.id, me.session_id);
  securityLog('sesiones_cerradas', req, `${me.username} (${r.changes})`);
  send(res, 200, { closed: r.changes });
});

route('DELETE', '/api/me/sessions/([a-f0-9]{16})', async (req, res, url, [prefix]) => {
  const me = requireUser(req);
  const r = db.prepare("DELETE FROM sessions WHERE user_id = ? AND substr(id, 1, 16) = ? AND id != ?").run(me.id, prefix, me.session_id);
  send(res, 200, { closed: r.changes });
});

route('DELETE', '/api/me', async (req, res) => {
  const me = requireUser(req);
  limit('delaccount:' + me.id, 5, HOUR, 'Demasiados intentos');
  const b = await readBody(req);
  if (String(b.confirm || '').toLowerCase() !== me.username.toLowerCase()) throw new HttpError(400, 'Escribe tu nombre de usuario para confirmar');
  await confirmPassword(req, me, b.password);
  // Borra todos sus archivos del disco y luego la cuenta (la base de datos borra en cascada todo lo demas)
  const uploads = new Set([me.avatar, me.banner].filter(Boolean));
  for (const f of postFiles('p.user_id = ?', me.id)) uploads.add(f);
  for (const r of db.prepare('SELECT url FROM media_uploads WHERE user_id = ?').all(me.id)) uploads.add(r.url);
  const stored = db.prepare('SELECT f.stored FROM project_files f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ?').all(me.id).map(r => r.stored);
  db.prepare('DELETE FROM users WHERE id = ?').run(me.id);
  for (const u of uploads) fs.rm(path.join(UPLOADS, path.basename(u)), () => {});
  for (const f of stored) fs.rm(path.join(FILES, f), () => {});
  securityLog('cuenta_borrada', req, me.username);
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
});

route('GET', '/api/feed', async (req, res, url) => {
  const me = requireUser(req);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const mode = url.searchParams.get('mode');
  let rows;
  if (mode === 'following') {
    rows = db.prepare(POST_SELECT + ` WHERE p.id < ? AND (p.user_id = ? OR p.user_id IN
      (SELECT followee_id FROM follows WHERE follower_id = ?)) ORDER BY p.id DESC LIMIT 20`).all(before, me.id, me.id);
  } else {
    rows = db.prepare(POST_SELECT + ' WHERE p.id < ? ORDER BY p.id DESC LIMIT 20').all(before);
  }
  send(res, 200, { posts: mapPosts(rows, me) });
});

// Sube una foto o un vídeo (el archivo va tal cual en el cuerpo). Devuelve su dirección para usarla en una publicación.
const MEDIA_RE = /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp|gif|mp4|webm|mov)$/;
function sniffMedia(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: 'image', ext: 'png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { kind: 'image', ext: 'webp' };
  if (buf.slice(0, 3).toString() === 'GIF') return { kind: 'image', ext: 'gif' };
  if (buf.slice(4, 8).toString() === 'ftyp') return { kind: 'video', ext: buf.slice(8, 10).toString() === 'qt' ? 'mov' : 'mp4' };
  if (buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { kind: 'video', ext: 'webm' };
  return null;
}
route('POST', '/api/media', async (req, res, url) => {
  const me = requireUser(req);
  limit('media:' + me.id, 120, HOUR, 'Has subido demasiados archivos seguidos');
  const want = url.searchParams.get('kind') === 'video' ? 'video' : 'image';
  const limit = want === 'video' ? MAX_VIDEO : MAX_IMAGE;
  const tmp = path.join(UPLOADS, 'tmp-' + crypto.randomBytes(8).toString('hex'));
  await new Promise((resolve, reject) => {
    let size = 0, failed = false;
    const out = fs.createWriteStream(tmp);
    req.on('data', c => {
      size += c.length;
      if (size > limit && !failed) {
        failed = true; req.unpipe(out); out.destroy(); fs.rm(tmp, () => {}); req.resume();
        reject(new HttpError(413, want === 'video' ? 'El video pasa de 300 MB' : 'La foto pasa de 15 MB'));
      }
    });
    req.pipe(out);
    out.on('finish', () => { if (!failed) resolve(); });
    out.on('error', e => { if (!failed) { failed = true; reject(e); } });
  });
  const fd = fs.openSync(tmp, 'r'); const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0); fs.closeSync(fd);
  const type = sniffMedia(head);
  if (!type || type.kind !== want) {
    fs.rm(tmp, () => {});
    throw new HttpError(400, want === 'video' ? 'Formato de video no valido (usa MP4, MOV o WebM)' : 'Formato de imagen no valido');
  }
  const name = crypto.randomBytes(12).toString('hex') + '.' + type.ext;
  fs.renameSync(tmp, path.join(UPLOADS, name));
  const mediaUrl = '/uploads/' + name;
  db.prepare('INSERT INTO media_uploads (url, user_id, kind, created_at) VALUES (?, ?, ?, ?)').run(mediaUrl, me.id, type.kind, Date.now());
  send(res, 200, { url: mediaUrl, kind: type.kind });
});

function ownUpload(u, me, kind) {
  if (typeof u !== 'string' || !MEDIA_RE.test(u)) return false;
  const r = db.prepare('SELECT user_id, kind FROM media_uploads WHERE url = ?').get(u);
  if (!r || r.user_id !== me.id || r.kind !== kind) return false;
  // Cada archivo subido solo puede usarse una vez (al borrar una publicacion se borran sus archivos)
  return !db.prepare('SELECT 1 FROM post_media WHERE url = ? OR poster = ?').get(u, u);
}

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
  db.exec('BEGIN');
  try {
    const info = db.prepare('INSERT INTO posts (user_id, project_id, title, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(me.id, project.id, title, text, cover, Date.now());
    const postId = Number(info.lastInsertRowid);
    clean.forEach((m, i) => db.prepare('INSERT INTO post_media (post_id, position, kind, url, poster, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(postId, i, m.kind, m.url, m.poster, m.width, m.height));
    db.exec('COMMIT');
    send(res, 200, { post: getPost(postId, me) });
  } catch (e) { db.exec('ROLLBACK'); throw e; }
});

function postFiles(where, ...args) {
  const files = new Set();
  for (const r of db.prepare(`SELECT p.image FROM posts p WHERE ${where} AND p.image IS NOT NULL`).all(...args)) files.add(r.image);
  for (const r of db.prepare(`SELECT m.url, m.poster FROM post_media m JOIN posts p ON p.id = m.post_id WHERE ${where}`).all(...args)) {
    files.add(r.url); if (r.poster) files.add(r.poster);
  }
  return [...files];
}
function removeUploads(list) {
  for (const u of list) {
    fs.rm(path.join(UPLOADS, path.basename(u)), () => {});
    db.prepare('DELETE FROM media_uploads WHERE url = ?').run(u);
  }
}

route('DELETE', '/api/posts/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = db.prepare('SELECT user_id, image FROM posts WHERE id = ?').get(Number(id));
  if (!p) throw new HttpError(404, 'Publicacion no encontrada');
  if (p.user_id !== me.id) throw new HttpError(403, 'Solo puedes borrar tus publicaciones');
  const files = postFiles('p.id = ?', Number(id));
  db.prepare('DELETE FROM posts WHERE id = ?').run(Number(id));
  removeUploads(files);
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
  const posts = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.user_id = ? ORDER BY p.id DESC LIMIT 20').all(before, u.id);
  const c = (sql) => db.prepare(sql).get(u.id).n;
  send(res, 200, {
    user: { ...publicUser(u), createdAt: u.created_at, isMe: u.id === me.id,
      following: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(me.id, u.id),
      followers: c('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?'),
      followingCount: c('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?'),
      postCount: c('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?') },
    posts: mapPosts(posts, me),
  });
});

route('POST', '/api/users/([A-Za-z0-9_]+)/follow', async (req, res, url, [username]) => {
  const me = requireUser(req);
  limit('follow:' + me.id, 120, HOUR, 'Demasiados cambios de seguimiento');
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
    (SELECT COUNT(*) FROM project_files f WHERE f.project_id = pr.id) AS file_count,
    (SELECT image FROM posts p WHERE p.project_id = pr.id AND p.image IS NOT NULL ORDER BY p.id DESC LIMIT 1) AS cover
  FROM projects pr JOIN users u ON u.id = pr.user_id`;
const mapProject = (r, me, full) => ({
  id: r.id, name: r.name, description: r.description, createdAt: r.created_at, mine: r.user_id === me.id,
  postCount: r.post_count || 0, fileCount: r.file_count || 0, cover: r.cover || null,
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

route('GET', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  send(res, 200, { project: mapProject(projectById(id), me, true) });
});

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

route('GET', '/api/projects/(\\d+)/posts', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = projectById(id);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const rows = db.prepare(POST_SELECT + ' WHERE p.id < ? AND p.project_id = ? ORDER BY p.id DESC LIMIT 20').all(before, p.id);
  send(res, 200, { posts: mapPosts(rows, me) });
});

route('DELETE', '/api/projects/(\\d+)', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = ownProject(id, me);
  const images = postFiles('p.project_id = ?', p.id);
  const stored = db.prepare('SELECT stored FROM project_files WHERE project_id = ?').all(p.id).map(r => r.stored);
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  removeUploads(images);
  for (const f of stored) fs.rm(path.join(FILES, f), () => {});
  send(res, 200, { ok: true });
});

// ---------- Archivos de proyecto ----------
const mapFile = r => ({ id: r.id, path: r.path, size: r.size, createdAt: r.created_at });

route('GET', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  requireUser(req);
  const p = projectById(id);
  const rows = db.prepare('SELECT * FROM project_files WHERE project_id = ? ORDER BY path').all(p.id);
  send(res, 200, { files: rows.map(mapFile) });
});

// Sube un archivo: el cuerpo es el archivo tal cual y la ruta va en ?path=
route('POST', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  const me = requireUser(req);
  limit('files:' + me.id, 600, HOUR, 'Has subido demasiados archivos seguidos');
  const p = ownProject(id, me);
  const filePath = cleanPath(url.searchParams.get('path'));
  const data = await readRaw(req, MAX_FILE);
  const stored = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(path.join(FILES, stored), data);
  const old = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND path = ?').get(p.id, filePath);
  if (old) {
    db.prepare('UPDATE project_files SET size = ?, stored = ?, created_at = ? WHERE id = ?').run(data.length, stored, Date.now(), old.id);
    fs.rm(path.join(FILES, old.stored), () => {});
  } else {
    db.prepare('INSERT INTO project_files (project_id, path, size, stored, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(p.id, filePath, data.length, stored, Date.now());
  }
  send(res, 200, { file: mapFile(db.prepare('SELECT * FROM project_files WHERE project_id = ? AND path = ?').get(p.id, filePath)) });
});

// Borra un archivo (?path=) o una carpeta entera (?folder=)
route('DELETE', '/api/projects/(\\d+)/files', async (req, res, url, [id]) => {
  const me = requireUser(req);
  const p = ownProject(id, me);
  let rows;
  if (url.searchParams.has('folder')) {
    const prefix = cleanPath(url.searchParams.get('folder')) + '/';
    rows = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND substr(path, 1, ?) = ?').all(p.id, prefix.length, prefix);
  } else {
    rows = db.prepare('SELECT id, stored FROM project_files WHERE project_id = ? AND path = ?').all(p.id, cleanPath(url.searchParams.get('path')));
  }
  for (const r of rows) {
    db.prepare('DELETE FROM project_files WHERE id = ?').run(r.id);
    fs.rm(path.join(FILES, r.stored), () => {});
  }
  send(res, 200, { deleted: rows.length });
});

const INLINE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };
route('GET', '/api/files/(\\d+)', async (req, res, url, [id]) => {
  requireUser(req);
  const f = db.prepare('SELECT * FROM project_files WHERE id = ?').get(Number(id));
  if (!f) throw new HttpError(404, 'Archivo no encontrado');
  const name = f.path.split('/').pop();
  const ext = path.extname(name).toLowerCase();
  const mode = url.searchParams.get('as');
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Content-Length': f.size };
  if (mode === 'text') {
    headers['Content-Type'] = 'text/plain; charset=utf-8';
    headers['Content-Security-Policy'] = 'sandbox';
  } else if (mode !== 'download' && INLINE_TYPES[ext]) {
    headers['Content-Type'] = INLINE_TYPES[ext];
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
  } else {
    headers['Content-Type'] = 'application/octet-stream';
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  }
  res.writeHead(200, headers);
  fs.createReadStream(path.join(FILES, f.stored)).on('error', () => res.end()).pipe(res);
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
  limit('msg:' + me.id, 30, MIN, 'Estas enviando mensajes demasiado rapido');
  limit('msgday:' + me.id, 1000, DAY, 'Has llegado al limite de mensajes de hoy');
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

const UPLOAD_TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
function serveUpload(req, res, rel) {
  const name = path.basename(rel);
  const type = UPLOAD_TYPES[path.extname(name).toLowerCase()];
  const file = path.join(UPLOADS, name);
  if (!type || name.startsWith('tmp-')) { res.writeHead(404); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : st.size - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : st.size - 1;
      if (start >= st.size || start < 0 || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- Cabeceras de seguridad ----------
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');
function securityHeaders(req, res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
function isHttps(req) {
  if (req.socket.encrypted) return true;
  return !!config.trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
// Peticiones que cambian algo: tienen que venir de la propia web (proteccion CSRF)
function sameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  securityHeaders(req, res);
  let url, p;
  try {
    url = new URL(req.url, 'http://x');
    p = decodeURIComponent(url.pathname);
    if (p.includes('\0')) throw new Error('nul');
  } catch {
    return send(res, 400, { error: 'Direccion no valida' });
  }
  try {
    if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) {
      securityLog('csrf_bloqueado', req, `${req.method} ${p} origin=${req.headers.origin || '-'}`);
      throw new HttpError(403, 'Peticion bloqueada: no viene de Tinker');
    }
    if (p.startsWith('/api/')) limit('api:' + clientIp(req), 900, MIN, 'Demasiadas peticiones');
    if (p.startsWith('/api/')) {
      for (const r of routes) {
        const m = r.method === req.method && r.re.exec(p);
        if (m) return await r.fn(req, res, url, m.slice(1));
      }
      throw new HttpError(404, 'Ruta no encontrada');
    }
    if (p.startsWith('/uploads/')) return serveUpload(req, res, p.slice('/uploads/'.length));
    return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Error interno' },
      e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {});
  }
});

// Tiempos maximos: evita que alguien deje conexiones abiertas a medias para saturar el servidor
server.headersTimeout = 20 * 1000;
server.requestTimeout = 30 * 60 * 1000;
server.keepAliveTimeout = 5 * 1000;
server.maxHeadersCount = 60;

// Si algo falla sin control, se apunta pero el servidor sigue en pie
process.on('uncaughtException', e => console.error('Error no controlado:', e));
process.on('unhandledRejection', e => console.error('Promesa rechazada sin controlar:', e));

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  ATENCION: Tinker ya esta abierto en otra ventana (el puerto ' + PORT + ' esta ocupado).');
    console.error('  Cierra TODAS las ventanas negras de Tinker y vuelve a abrir "Iniciar red social.bat".');
    console.error('  Si no encuentras la otra ventana: Administrador de tareas > Node.js > Finalizar tarea.\n');
  } else {
    console.error('\n  No se pudo arrancar Tinker:', err.message, '\n');
  }
  process.exit(1);
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
