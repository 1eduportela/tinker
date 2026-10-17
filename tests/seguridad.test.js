'use strict';
// Pruebas de seguridad de Tinker: arrancan un servidor de prueba en una carpeta temporal
// (no tocan tus datos) y lo atacan como lo haría alguien malintencionado.
//   Ejecutar:  node --test tests/      (o doble clic en "Probar seguridad.bat")
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z', 'base64');

// ------------------------------------------------------------------ servidor de prueba
async function startServer(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinker-test-'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'server.js')], {
    env: { ...process.env, PORT: String(port), TINKER_DATA: dir, NO_OPEN: '1', TINKER_REGISTER_PER_HOUR: '1000', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  proc.stdout.on('data', d => { out += d; }); proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !out.includes('en marcha'); i++) await new Promise(r => setTimeout(r, 100));
  if (!out.includes('en marcha')) throw new Error('El servidor no arranca:\n' + out);
  const base = `http://127.0.0.1:${port}`;
  const master = () => JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')).inviteCode;
  // Parar: esperar a que el proceso cierre la base de datos antes de borrar la carpeta
  // (en Windows no se puede borrar un archivo abierto). Si aun así no se puede, se deja: es una carpeta temporal.
  async function stop() {
    if (proc.exitCode === null && proc.signalCode === null) {
      const exited = new Promise(r => proc.once('exit', r));
      proc.kill();
      await Promise.race([exited, new Promise(r => setTimeout(r, 5000))]);
    }
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  }
  return { base, dir, proc, master, log: () => out, stop };
}

// Cliente con su propia cookie de sesión
function client(base) {
  let cookie = '';
  async function call(method, url, body, headers = {}) {
    const h = { ...headers };
    if (cookie) h.Cookie = cookie;
    let payload;
    if (Buffer.isBuffer(body) || typeof body === 'string') payload = body;
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
    const r = await fetch(base + url, { method, headers: h, body: payload, redirect: 'manual' });
    const set = r.headers.get('set-cookie');
    if (set && set.startsWith('sid=')) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  }
  return { call, get cookie() { return cookie; }, set cookie(v) { cookie = v; } };
}
const PW = 'Clave-de-prueba-2026';
async function register(srv, username, code, pw = PW) {
  const c = client(srv.base);
  const r = await c.call('POST', '/api/register', { username, password: pw, invite: code || srv.master() });
  assert.equal(r.status, 200, `registro de ${username}: ${r.text}`);
  return c;
}

let srv, admin, alice, bob;
test.before(async () => {
  srv = await startServer();
  admin = await register(srv, 'admin_t');     // la primera cuenta es la administradora
  alice = await register(srv, 'alice_t');
  bob = await register(srv, 'bob_t');
});
test.after(async () => { if (srv) await srv.stop(); });

// ------------------------------------------------------------------ pruebas
test('una dirección mal formada no tumba el servidor', async () => {
  const r = await fetch(srv.base + '/%E0%A4%A');
  assert.equal(r.status, 400);
  const ok = await fetch(srv.base + '/');
  assert.equal(ok.status, 200);
});

test('cabeceras de seguridad en todas las respuestas', async () => {
  for (const url of ['/', '/api/me', '/assets/tinker.js', '/assets/tinker.css']) {
    const r = await fetch(srv.base + url);
    assert.match(r.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  }
});

test('CSRF: se rechazan peticiones desde otra web y formularios disfrazados', async () => {
  const evil = await alice.call('POST', '/api/projects', { name: 'x' }, { Origin: 'https://malvada.example' });
  assert.equal(evil.status, 403);
  const cross = await alice.call('POST', '/api/projects', { name: 'x' }, { 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(cross.status, 403);
  const form = await alice.call('POST', '/api/projects', JSON.stringify({ name: 'x' }), { 'Content-Type': 'text/plain' });
  assert.equal(form.status, 415);
});

test('registro: sin invitación válida no se entra y el código maestro es de un solo uso', async () => {
  const c = client(srv.base);
  assert.equal((await c.call('POST', '/api/register', { username: 'intruso', password: PW, invite: 'TNK-AAAA-AAAA' })).status, 403);
  const before = srv.master();
  await register(srv, 'usa_maestro', before);
  assert.notEqual(srv.master(), before, 'el código maestro debe cambiar tras usarse');
  assert.equal((await c.call('POST', '/api/register', { username: 'otro_m', password: PW, invite: before })).status, 403);
});

test('registro: más de 10 por hora desde la misma conexión se bloquean', async () => {
  const q = await startServer({ TINKER_REGISTER_PER_HOUR: '' });
  try {
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await client(q.base).call('POST', '/api/register', { username: 'r' + i + '_t', password: PW, invite: q.master() })).status);
    assert.equal(codes[10], 429);
  } finally { await q.stop(); }
});

test('la primera cuenta de una instalación nueva es administradora', async () => {
  assert.equal((await admin.call('GET', '/api/me')).json.user.isAdmin, true);
  assert.equal((await alice.call('GET', '/api/me')).json.user.isAdmin, false);
});

test('registro: contraseñas débiles rechazadas', async () => {
  const c = client(srv.base);
  for (const pw of ['corta', 'password123', 'aaaaaaaaaa', 'debil_t_1234']) {
    const r = await c.call('POST', '/api/register', { username: 'debil_t', password: pw, invite: srv.master() });
    assert.equal(r.status, 400, `debería rechazar "${pw}"`);
  }
});

test('invitaciones personales: un solo uso y no se guardan en claro', async () => {
  const r = await alice.call('POST', '/api/invites');
  assert.equal(r.status, 200);
  const code = r.json.code;
  await register(srv, 'invitado_t', code);
  const again = await client(srv.base).call('POST', '/api/register', { username: 'invitado_2', password: PW, invite: code });
  assert.equal(again.status, 403);
  const db = new DatabaseSync(path.join(srv.dir, 'red.db'), { readOnly: true });
  const rows = db.prepare('SELECT code_hash FROM invites').all();
  assert.ok(!rows.some(x => x.code_hash.includes(code.replace(/-/g, '').slice(3))), 'el código no debe estar en claro');
  db.close();
});

test('inicio de sesión: bloqueo tras 5 fallos', async () => {
  await register(srv, 'victima_t');
  const c = client(srv.base);
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await c.call('POST', '/api/login', { username: 'victima_t', password: 'mala' + i })).status);
  assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
  assert.equal(codes[5], 429);
  assert.equal((await c.call('POST', '/api/login', { username: 'victima_t', password: PW })).status, 429, 'bloqueada aunque la contraseña sea buena');
});

test('sesiones: la clave no se guarda en claro, se puede cerrar y no se puede falsificar', async () => {
  const c = client(srv.base);
  await c.call('POST', '/api/login', { username: 'bob_t', password: PW });
  const token = c.cookie.split('=')[1];
  const db = new DatabaseSync(path.join(srv.dir, 'red.db'), { readOnly: true });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(token).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(crypto.createHash('sha256').update(token).digest('hex')).n, 1);
  db.close();
  const fake = client(srv.base); fake.cookie = 'sid=' + 'a'.repeat(64);
  assert.equal((await fake.call('GET', '/api/me')).json.user, null);
  await c.call('POST', '/api/logout');
  const reuse = client(srv.base); reuse.cookie = 'sid=' + token;
  assert.equal((await reuse.call('GET', '/api/me')).json.user, null, 'tras cerrar sesión la clave no vale');
});

test('permisos: nadie puede tocar lo de otro', async () => {
  const proj = (await alice.call('POST', '/api/projects', { name: 'Proyecto de Alice' })).json.project;
  const up = await alice.call('POST', '/api/media?kind=image', JPG);
  assert.equal(up.status, 200);
  const post = (await alice.call('POST', '/api/posts', { projectId: proj.id, title: 'Hola', media: [{ kind: 'image', url: up.json.url }] })).json.post;
  assert.equal((await bob.call('DELETE', `/api/posts/${post.id}`)).status, 403);
  assert.equal((await bob.call('DELETE', `/api/projects/${proj.id}`)).status, 403);
  assert.equal((await bob.call('PUT', `/api/projects/${proj.id}`, { readme: 'hackeado' })).status, 403);
  assert.equal((await bob.call('POST', `/api/projects/${proj.id}/files?path=x.txt`, 'hola')).status, 403);
  assert.equal((await bob.call('POST', '/api/posts', { projectId: proj.id, title: 'x', media: [{ kind: 'image', url: up.json.url }] })).status, 403);
  // usar la foto subida por otra persona
  const bobProj = (await bob.call('POST', '/api/projects', { name: 'Bob' })).json.project;
  assert.equal((await bob.call('POST', '/api/posts', { projectId: bobProj.id, title: 'x', media: [{ kind: 'image', url: up.json.url }] })).status, 400);
  assert.equal((await bob.call('POST', '/api/admin/users/alice_t/suspend')).status, 403, 'solo el admin modera');
  assert.equal((await admin.call('DELETE', `/api/posts/${post.id}`)).status, 200, 'el admin sí puede moderar');
});

test('subidas: no se puede colar un HTML como foto', async () => {
  const r = await alice.call('POST', '/api/media?kind=image', Buffer.from('<html><script>alert(1)</script></html>'));
  assert.equal(r.status, 400);
  const vid = await alice.call('POST', '/api/media?kind=video', JPG);
  assert.equal(vid.status, 400, 'una foto no puede pasar por vídeo');
});

test('archivos de proyecto: un HTML se descarga, nunca se ejecuta; rutas con ../ se limpian', async () => {
  const proj = (await alice.call('POST', '/api/projects', { name: 'Archivos' })).json.project;
  const f = await alice.call('POST', `/api/projects/${proj.id}/files?path=${encodeURIComponent('../../../etc/malo.html')}`, '<script>alert(1)</script>');
  assert.equal(f.status, 200);
  assert.equal(f.json.file.path, 'etc/malo.html');
  const r = await bob.call('GET', `/api/files/${f.json.file.id}`);
  assert.equal(r.headers.get('content-type'), 'application/octet-stream');
  assert.match(r.headers.get('content-disposition'), /^attachment/);
  const t = await bob.call('GET', `/api/files/${f.json.file.id}?as=text`);
  assert.match(t.headers.get('content-security-policy'), /sandbox/);
});

test('no se puede salir de las carpetas públicas', async () => {
  for (const url of ['/../server.js', '/..%2fserver.js', '/uploads/..%2f..%2fserver.js', '/uploads/../red.db', '/%2e%2e/data/red.db']) {
    const r = await fetch(srv.base + url);
    assert.ok(r.status === 403 || r.status === 404 || r.status === 400, `${url} -> ${r.status}`);
    assert.ok(!(await r.text()).includes('createServer'), `${url} no debe devolver código del servidor`);
  }
});

test('bloquear: la persona bloqueada no puede escribir ni ver el perfil', async () => {
  assert.equal((await alice.call('POST', '/api/users/bob_t/block')).json.blocked, true);
  assert.equal((await bob.call('POST', '/api/messages/alice_t', { text: 'hola' })).status, 404);
  assert.equal((await bob.call('GET', '/api/users/alice_t')).status, 404);
  assert.equal((await alice.call('POST', '/api/users/bob_t/block')).json.blocked, false);
  assert.equal((await bob.call('POST', '/api/messages/alice_t', { text: 'hola' })).status, 200);
});

test('suspender: la cuenta suspendida no puede entrar y sus sesiones se cierran', async () => {
  const c = await register(srv, 'suspendido_t');
  assert.equal((await admin.call('POST', '/api/admin/users/suspendido_t/suspend')).json.suspended, true);
  assert.equal((await c.call('GET', '/api/me')).json.user, null);
  assert.equal((await client(srv.base).call('POST', '/api/login', { username: 'suspendido_t', password: PW })).status, 403);
  assert.equal((await admin.call('POST', '/api/admin/users/admin_t/suspend')).status, 400, 'el admin no se puede suspender');
});

test('límite de mensajes: más de 30 por minuto se cortan', async () => {
  const s = await register(srv, 'spammer_t');
  const codes = [];
  for (let i = 0; i < 32; i++) codes.push((await s.call('POST', '/api/messages/alice_t', { text: 'spam ' + i })).status);
  assert.ok(codes.slice(0, 30).every(c => c === 200));
  assert.equal(codes[31], 429);
});

test('cambiar contraseña cierra las demás sesiones', async () => {
  const a = await register(srv, 'cambia_t');
  const other = client(srv.base);
  await other.call('POST', '/api/login', { username: 'cambia_t', password: PW });
  assert.equal((await a.call('POST', '/api/me/password', { current: 'mala', next: 'Nueva-Clave-2026' })).status, 403);
  assert.equal((await a.call('POST', '/api/me/password', { current: PW, next: 'Nueva-Clave-2026' })).status, 200);
  assert.equal((await other.call('GET', '/api/me')).json.user, null);
  assert.ok((await a.call('GET', '/api/me')).json.user, 'la sesión actual sigue abierta');
});

test('el Markdown del README no permite colar HTML ni enlaces javascript:', () => {
  // El módulo del Markdown no depende de nada: se ejecuta tal cual quitando la palabra "export"
  const code = fs.readFileSync(path.join(ROOT, 'web', 'src', 'core', 'markdown.js'), 'utf8').replace(/^export /gm, '');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code + '; this.markdown = markdown;', ctx);
  const html = ctx.markdown('# Hola\n<img src=x onerror=alert(1)>\n[a](javascript:alert(1))\n```\n<script>x</script>\n```');
  assert.ok(!/<img src=x/i.test(html) && !/<script>/i.test(html) && !/href="javascript:/i.test(html), html);
});

test('cuotas de espacio: no se puede llenar el disco', async () => {
  const q = await startServer({ TINKER_QUOTA_MB: '1', TINKER_DAILY_MB: '1' });
  try {
    const u = await register(q, 'lleno_t');
    const big = Buffer.concat([JPG, Buffer.alloc(400 * 1024)]);
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await u.call('POST', '/api/media?kind=image', big)).status);
    assert.deepEqual(codes.slice(0, 2), [200, 200]);
    assert.equal(codes[3], 413);
  } finally { await q.stop(); }
});
