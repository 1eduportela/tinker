'use strict';
// Servidor HTTP de Tinker. Cada petición pasa por las protecciones comunes y luego va a su sitio:
//   /api/...      -> rutas de la API (server/routes/)
//   /uploads/...  -> fotos y vídeos subidos
//   todo lo demás -> la web (public/)

const http = require('node:http');
const os = require('node:os');
const { exec } = require('node:child_process');
const { PORT, PUBLIC, config } = require('./config');
const { HttpError } = require('./http/errors');
const { clientIp } = require('./http/request');
const { send } = require('./http/response');
const { dispatch } = require('./http/router');
const { sameOrigin, securityHeaders } = require('./http/security-headers');
const { serveFile, serveUpload } = require('./http/static');
const { HOUR, MIN } = require('./lib/units');
const { securityLog } = require('./security/audit-log');
const { limit, pruneRateLimits } = require('./security/rate-limit');
const { pruneSessions } = require('./security/sessions');
const { ensureMasterCode } = require('./services/invites');
const { cleanupOrphans } = require('./services/storage');
require('./routes');

async function handle(req, res) {
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
    // Lo que cambia algo tiene que venir de la propia web (protección CSRF)
    if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) {
      securityLog('csrf_bloqueado', req, `${req.method} ${p} origin=${req.headers.origin || '-'}`);
      throw new HttpError(403, 'Peticion bloqueada: no viene de Tinker');
    }
    if (p.startsWith('/api/')) {
      limit('api:' + clientIp(req), 900, MIN, 'Demasiadas peticiones');
      return await dispatch(req, res, url, p);
    }
    if (p.startsWith('/uploads/')) return serveUpload(req, res, p.slice('/uploads/'.length));
    return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Error interno' },
      e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {});
  }
}

function createServer() {
  const server = http.createServer(handle);
  // Tiempos maximos: evita que alguien deje conexiones abiertas a medias para saturar el servidor
  server.headersTimeout = 20 * 1000;
  server.requestTimeout = 30 * 60 * 1000;
  server.keepAliveTimeout = 5 * 1000;
  server.maxHeadersCount = 60;
  return server;
}

// Tareas de mantenimiento: limpieza de archivos sin usar, sesiones caducadas y contadores de límites
function startMaintenance() {
  const safely = (what, fn) => () => { try { fn(); } catch (e) { console.error(`Error en ${what}:`, e.message); } };
  const cleanup = safely('la limpieza', cleanupOrphans);
  cleanup();
  setInterval(cleanup, HOUR).unref();
  setInterval(safely('la limpieza de sesiones', pruneSessions), HOUR).unref();
  setInterval(pruneRateLimits, 10 * MIN).unref();
}

function start() {
  ensureMasterCode();
  startMaintenance();

  // Si algo falla sin control, se apunta pero el servidor sigue en pie
  process.on('uncaughtException', e => console.error('Error no controlado:', e));
  process.on('unhandledRejection', e => console.error('Promesa rechazada sin controlar:', e));

  const server = createServer();
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
    console.log(`\n  Codigo de invitacion maestro (un solo uso): ${config.inviteCode}`);
    console.log('  Para invitar a mas gente: en Tinker, Personas > "Invitar a alguien".');
    console.log('  (Cierra esta ventana para apagar Tinker)\n');
    if (process.platform === 'win32' && !process.env.NO_OPEN) exec(`start "" http://localhost:${PORT}`);
  });
  return server;
}

module.exports = { createServer, start };
