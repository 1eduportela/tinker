'use strict';
// Límites de uso: cuántas veces se puede hacer algo en una ventana de tiempo (por persona o por IP).
// Se guardan en memoria: { clave -> { n, reset } }. Al reiniciar el servidor se empieza de cero.

const { HttpError } = require('../http/errors');

const buckets = new Map();
// Cuenta un intento y dice si sigue dentro del límite
function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  return { ok: b.n <= max, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
// Intentos contados ahora mismo para esa clave
function peek(key) { const b = buckets.get(key); return b && b.reset > Date.now() ? b.n : 0; }
// Segundos que faltan para que esa clave vuelva a cero
function secondsLeft(key) { const b = buckets.get(key); return b ? Math.max(0, Math.ceil((b.reset - Date.now()) / 1000)) : 0; }
function clearKey(key) { buckets.delete(key); }
// Olvida las ventanas ya caducadas (se llama periódicamente desde app.js)
function pruneRateLimits() { const now = Date.now(); for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k); }

// Error 429 con un mensaje que dice cuánto hay que esperar
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

module.exports = { hit, peek, secondsLeft, clearKey, limit, tooMany, pruneRateLimits };
