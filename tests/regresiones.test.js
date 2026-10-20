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
const vm = require('node:vm');

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
test('#4 una subida de video cancelada no deja el archivo temporal abierto', async () => {
  const alice = await register(srv, 'alice_t');
  await new Promise(done => {
    const req = http.request({ host: '127.0.0.1', port: srv.port, path: '/api/media?kind=video', method: 'POST',
      headers: { Cookie: alice.cookie, 'Content-Length': 10 * 1024 * 1024 } });
    req.on('error', () => {});
    req.write(Buffer.alloc(512 * 1024));
    setTimeout(() => { req.destroy(); done(); }, 200);   // el usuario cierra la pestana a mitad
  });
  let left = [];
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 100));
    left = fs.readdirSync(path.join(srv.dir, 'uploads')).filter(n => n.startsWith('tmp-'));
    if (!left.length) break;
  }
  assert.deepEqual(left, [], 'el temporal deberia borrarse (y cerrarse) al cortarse la conexion');
});
test('#5 los videos de los proyectos admiten Range (Safari/iPhone y la barra de avance lo necesitan)', async () => {
  const alice = await register(srv, 'alice_t');
  const proj = (await alice.call('POST', '/api/projects', { name: 'P' })).json.project;
  const f = (await alice.call('POST', `/api/projects/${proj.id}/files?path=demo.mp4`, Buffer.alloc(4096))).json.file;
  const r = await alice.call('GET', `/api/files/${f.id}`, undefined, { Range: 'bytes=0-99' });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 0-99/4096');
  assert.equal(r.text.length, 100);
});
test('#6 un cuerpo que no es JSON se rechaza tambien si llega sin Content-Length (chunked)', async () => {
  const alice = await register(srv, 'alice_t');
  const status = await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: srv.port, path: '/api/projects', method: 'POST',
      headers: { Cookie: alice.cookie, 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' } },
    res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
    req.end(JSON.stringify({ name: 'colado como text/plain' }));
  });
  assert.equal(status, 415);
});

test('#7 el avatar y el banner se comprueban por su contenido, no por lo que dice el navegador', async () => {
  const alice = await register(srv, 'alice_t');
  const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
  const r = await alice.call('PUT', '/api/me', { displayName: 'Alice', avatar: `data:image/png;base64,${html}` });
  assert.equal(r.status, 400, 'un HTML disfrazado de PNG no debe guardarse como avatar');
  const jpg = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z';
  const ok = await alice.call('PUT', '/api/me', { displayName: 'Alice', banner: `data:image/png;base64,${jpg}` });
  assert.equal(ok.status, 200, 'una foto de verdad sí se acepta');
  assert.match(ok.json.user.banner, /\.jpg$/, 'la extensión sale del contenido (es un JPEG aunque diga png)');
});

test('#8 Markdown: las imágenes de otras webs salen como enlace (la CSP no las deja cargar)', () => {
  const code = fs.readFileSync(path.join(ROOT, 'web', 'src', 'core', 'markdown.js'), 'utf8').replace(/^export /gm, '');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code + '; this.markdown = markdown;', ctx);
  const html = ctx.markdown('![plano](https://example.com/plano.png)\n\n![foto](/uploads/0123456789abcdef01234567.jpg)');
  assert.ok(!/<img[^>]+example\.com/.test(html), html);
  assert.match(html, /<a href="https:\/\/example\.com\/plano\.png"[^>]*>plano<\/a>/);
  assert.match(html, /<img alt="foto" src="\/uploads\/0123456789abcdef01234567\.jpg">/, 'las fotos de Tinker siguen saliendo como imagen');
});
