'use strict';
// Pruebas de regresión: cada una reproduce un fallo encontrado en la revisión de código
// (octubre de 2026). Se escribieron antes del arreglo (fallaban) y se quedan aquí para que
// el fallo no vuelva. Cada fallo nuevo que se arregle debería traer su prueba.
//   Ejecutar:  npm test   (o node --test tests/regresiones.test.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.join(__dirname, '..');
const PW = 'Clave-de-prueba-2026';

// ------------------------------------------------------------------ servidor de prueba
async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinker-regr-'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'server.js')], {
    env: { ...process.env, PORT: String(port), TINKER_DATA: dir, NO_OPEN: '1', TINKER_REGISTER_PER_HOUR: '1000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  proc.stdout.on('data', d => { out += d; }); proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !out.includes('en marcha'); i++) await new Promise(r => setTimeout(r, 100));
  if (!out.includes('en marcha')) throw new Error('El servidor no arranca:\n' + out);
  const master = () => JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')).inviteCode;
  async function stop() {
    if (proc.exitCode === null && proc.signalCode === null) {
      const exited = new Promise(r => proc.once('exit', r));
      proc.kill();
      await Promise.race([exited, new Promise(r => setTimeout(r, 5000))]);
    }
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  }
  return { base: `http://127.0.0.1:${port}`, port, dir, master, stop };
}

function client(base) {
  let cookie = '';
  async function call(method, url, body, headers = {}) {
    const h = { ...headers };
    if (cookie) h.Cookie = cookie;
    let payload = body;
    if (body !== undefined && !Buffer.isBuffer(body) && typeof body !== 'string') {
      payload = JSON.stringify(body); h['Content-Type'] = 'application/json';
    }
    const r = await fetch(base + url, { method, headers: h, body: payload });
    const set = r.headers.get('set-cookie');
    if (set && set.startsWith('sid=')) cookie = set.split(';')[0];
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  }
  return { call, get cookie() { return cookie; } };
}

async function register(srv, username, invite) {
  const c = client(srv.base);
  const r = await c.call('POST', '/api/register', { username, password: PW, invite: invite || srv.master() });
  assert.equal(r.status, 200, `registro de ${username}: ${r.text}`);
  return c;
}

let srv;
test.beforeEach(async () => { srv = await startServer(); });
test.afterEach(async () => { await srv.stop(); });

// ------------------------------------------------------------------ pruebas
test('#1 si el admin borra su cuenta, quien se registre despues NO pasa a ser admin', async () => {
  const admin = await register(srv, 'admin_t');
  const alice = await register(srv, 'alice_t');
  const code = (await alice.call('POST', '/api/invites')).json.code;
  assert.equal((await admin.call('DELETE', '/api/me', { confirm: 'admin_t', password: PW })).status, 200);
  const nuevo = await register(srv, 'recien_llegado', code);
  assert.equal((await nuevo.call('GET', '/api/me')).json.user.isAdmin, false,
    'un recien llegado con una invitacion normal no debe convertirse en administrador');
});
test('#2 el codigo maestro solo sirve una vez aunque lleguen registros a la vez', async () => {
  await register(srv, 'admin_t');
  const code = srv.master();
  const results = await Promise.all(['carrera_a', 'carrera_b', 'carrera_c'].map(u =>
    client(srv.base).call('POST', '/api/register', { username: u, password: PW, invite: code })));
  assert.equal(results.filter(r => r.status === 200).length, 1,
    `codigos: ${results.map(r => r.status).join(', ')}`);
});
test('#3 dos registros simultaneos con el mismo usuario: 200 y 409, nunca 500', async () => {
  const admin = await register(srv, 'admin_t');
  const c1 = (await admin.call('POST', '/api/invites')).json.code;
  const c2 = (await admin.call('POST', '/api/invites')).json.code;
  const results = await Promise.all([c1, c2].map(code =>
    client(srv.base).call('POST', '/api/register', { username: 'duplicado', password: PW, invite: code })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
