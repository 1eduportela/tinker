'use strict';
// Crea (o borra) los perfiles de prueba en Tinker para ver cómo queda la red con contenido.
//   node demo/crear-perfiles-demo.js          -> crea los perfiles (si ya existían, los rehace)
//   node demo/crear-perfiles-demo.js --borrar -> los borra con todo su contenido
// Funciona aunque Tinker esté abierto.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch {
  console.error('\n  Tu version de Node.js es demasiado antigua. Instala la LTS desde https://nodejs.org\n'); process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const FILES = path.join(DATA, 'files');
const IMG = path.join(__dirname, 'img');
const DB_FILE = path.join(DATA, 'red.db');
const DAY = 86400000;
const now = Date.now();

if (!fs.existsSync(DB_FILE)) {
  console.error('\n  No encuentro la base de datos. Abre Tinker una vez ("Iniciar red social.bat") y vuelve a intentarlo.\n');
  process.exit(1);
}
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(FILES, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name);
const cols = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
if (!tables.includes('project_files') || !cols.includes('project_id')) {
  console.error('\n  La base de datos es de una version antigua. Abre la version nueva de Tinker una vez, cierrala y vuelve a intentarlo.\n');
  process.exit(1);
}

// ------------------------------------------------------------------ contenido
const PROFILES = require('./contenido');

// ------------------------------------------------------------------ utilidades
const DEMO = [...PROFILES.map(p => p.username)];
const hasMedia = tables.includes('post_media') && tables.includes('media_uploads');
if (!hasMedia) {
  console.error('\n  La base de datos es de una version antigua. Abre la version nueva de Tinker una vez, cierrala y vuelve a intentarlo.\n');
  process.exit(1);
}
const hashPassword = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function copyImage(file) {
  const name = crypto.randomBytes(12).toString('hex') + '.jpg';
  fs.copyFileSync(path.join(IMG, file), path.join(UPLOADS, name));
  return '/uploads/' + name;
}
const rm = p => { try { fs.rmSync(p); } catch {} };

function removeDemo() {
  const users = db.prepare(`SELECT id, avatar, banner FROM users WHERE username IN (${DEMO.map(() => '?').join(',')})`).all(...DEMO);
  for (const u of users) {
    for (const r of db.prepare('SELECT image FROM posts WHERE user_id = ? AND image IS NOT NULL').all(u.id)) rm(path.join(UPLOADS, path.basename(r.image)));
    if (hasMedia) for (const r of db.prepare('SELECT m.url FROM post_media m JOIN posts p ON p.id = m.post_id WHERE p.user_id = ?').all(u.id)) rm(path.join(UPLOADS, path.basename(r.url)));
    for (const r of db.prepare('SELECT f.stored FROM project_files f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ?').all(u.id)) rm(path.join(FILES, r.stored));
    for (const img of [u.avatar, u.banner]) if (img) rm(path.join(UPLOADS, path.basename(img)));
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  }
  return users.length;
}

// ------------------------------------------------------------------ main
if (process.argv.includes('--borrar')) {
  const n = removeDemo();
  console.log(n ? `\n  Borrados ${n} perfiles de prueba con todo su contenido.\n` : '\n  No habia perfiles de prueba.\n');
  process.exit(0);
}

db.exec('BEGIN');
try {
  removeDemo();
  const ids = {};
  const projectIds = {};
  for (const p of PROFILES) {
    const salt = crypto.randomBytes(16).toString('hex');
    const info = db.prepare(`INSERT INTO users (username, display_name, bio, about, avatar, banner, pass_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.username, p.displayName, p.bio, p.about, copyImage(p.avatar), copyImage(p.banner),
      hashPassword(crypto.randomBytes(16).toString('hex'), salt), salt, now - 70 * DAY);
    ids[p.username] = Number(info.lastInsertRowid);
    projectIds[p.username] = p.projects.map((pr, i) => {
      const first = Math.max(...p.posts.filter(x => x.p === i).map(x => x.d)) + 2;
      const r = db.prepare('INSERT INTO projects (user_id, name, description, readme, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(ids[p.username], pr.name, pr.description, pr.readme, now - first * DAY);
      const pid = Number(r.lastInsertRowid);
      for (const [fp, content] of Object.entries(pr.files)) {
        const stored = crypto.randomBytes(16).toString('hex');
        const buf = Buffer.from(content, 'utf8');
        fs.writeFileSync(path.join(FILES, stored), buf);
        db.prepare('INSERT INTO project_files (project_id, path, size, stored, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(pid, fp, buf.length, stored, now - (first - 1) * DAY);
      }
      return pid;
    });
  }
  // Publicaciones en orden cronológico
  const all = PROFILES.flatMap(p => p.posts.map((x, i) => ({ ...x, user: p.username, idx: i,
    at: now - x.d * DAY - Math.floor(Math.random() * 10 * 3600000) })));
  all.sort((a, b) => a.at - b.at);
  for (const x of all) {
    const urls = x.imgs.map(copyImage);
    const r = db.prepare('INSERT INTO posts (user_id, project_id, title, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ids[x.user], projectIds[x.user][x.p], x.title, x.text, urls[0], x.at);
    const postId = Number(r.lastInsertRowid);
    urls.forEach((u, k) => {
      db.prepare('INSERT INTO media_uploads (url, user_id, kind, created_at) VALUES (?, ?, ?, ?)').run(u, ids[x.user], 'image', x.at);
      db.prepare('INSERT INTO post_media (post_id, position, kind, url, poster, width, height) VALUES (?, ?, ?, ?, NULL, NULL, NULL)').run(postId, k, 'image', u);
    });
  }
  // Seguirse entre ellos y que los usuarios reales los sigan
  const real = db.prepare(`SELECT id FROM users WHERE username NOT IN (${DEMO.map(() => '?').join(',')})`).all(...DEMO).map(r => r.id);
  const follow = db.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)');
  for (const a of Object.values(ids)) for (const b of Object.values(ids)) if (a !== b) follow.run(a, b);
  for (const r of real) for (const d of Object.values(ids)) follow.run(r, d);
  // Un mensaje de bienvenida para cada usuario real
  for (const r of real) {
    db.prepare('INSERT INTO messages (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)')
      .run(ids.luciafdz, r, '¡Hola! Soy Lucía 👋 Acabo de subir los datos del banco de empuje. Si haces drones, échale un ojo y dime qué te parece.', now - 3600000);
  }
  db.exec('COMMIT');
  console.log(`
  Perfiles de prueba creados:
    - Lucia Fernandez (@luciafdz): drones y aeromodelismo
    - Marc Soler (@marcsoler): triatlon, maraton y rodillo inteligente
    - Irene Navarro (@irenenav): robotica y estacion meteo
    - Pablo Ortega (@pabloortega): fresadora CNC, bici de bambu e impresora 3D
    - Sara Dominguez (@saradominguez): escalada, satelites y montana
  50 publicaciones (algunas con carrusel), 15 proyectos con README y archivos, y un mensaje para ti.
  Los usuarios que ya tenias siguen a estos perfiles, asi que los veras en Inicio.

  Para quitarlos: "Borrar perfiles de prueba.bat"
`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error('\n  No se pudieron crear los perfiles:', e.message, '\n');
  process.exit(1);
}
