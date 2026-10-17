'use strict';
// Si al arrancar el puerto está ocupado por otro Tinker (por ejemplo uno que se quedó abierto sin ventana),
// se cierra ese Tinker antiguo para que arranque el nuevo. Antes se comprueba que de verdad es Tinker:
// nunca se cierra otro programa que esté usando el mismo puerto.

const { execFile } = require('node:child_process');

// ¿Lo que responde en ese puerto es Tinker? (su API devuelve { user, unread } con nuestra política de seguridad)
async function isTinker(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/me`, { signal: AbortSignal.timeout(2000) });
    const data = await r.json();
    return 'unread' in data && /default-src 'self'/.test(r.headers.get('content-security-policy') || '');
  } catch { return false; }
}

const run = (cmd, args) => new Promise(resolve =>
  execFile(cmd, args, { windowsHide: true, timeout: 5000 }, (err, out) => resolve(err ? '' : String(out))));

// Número del proceso de node que escucha en ese puerto (solo Windows, que es donde se usa Tinker)
async function pidOnPort(port) {
  if (process.platform !== 'win32') return null;
  const lines = (await run('netstat', ['-ano', '-p', 'TCP'])).split(/\r?\n/);
  for (const l of lines) {
    const m = /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i.exec(l);
    if (m && Number(m[1]) === port) {
      const pid = Number(m[2]);
      const info = await run('tasklist', ['/FI', `PID eq ${pid}`, '/NH']);
      return /node\.exe/i.test(info) && pid !== process.pid ? pid : null;
    }
  }
  return null;
}

// Cierra el Tinker antiguo si lo hay. Devuelve true si lo ha cerrado.
async function closeOldTinker(port) {
  if (!(await isTinker(port))) return false;
  const pid = await pidOnPort(port);
  if (!pid) return false;
  try { process.kill(pid); } catch { return false; }
  for (let i = 0; i < 20 && await isTinker(port); i++) await new Promise(r => setTimeout(r, 250));
  return true;
}

module.exports = { closeOldTinker };
