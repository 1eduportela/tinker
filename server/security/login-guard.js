'use strict';
// Bloqueo por contraseñas incorrectas: 5 fallos seguidos en una cuenta (o 20 desde la misma IP)
// y no se puede volver a probar en 15 minutos. Se usa al iniciar sesión y al confirmar la contraseña
// dentro de la cuenta (cambiarla, borrar la cuenta).

const { HttpError } = require('../http/errors');
const { MIN } = require('../lib/units');
const { securityLog } = require('./audit-log');
const { verifyPassword } = require('./passwords');
const { clearKey, hit, peek, secondsLeft, tooMany } = require('./rate-limit');

const LOGIN_MAX_FAILS = 5;
const IP_MAX_FAILS = 20;
const LOGIN_LOCK = 15 * MIN;

const accountKey = username => 'loginfail:u:' + String(username).toLowerCase();
const ipKey = ip => 'loginfail:ip:' + ip;

// Lanza 429 si esa clave ya ha llegado al máximo de fallos
function assertNotLocked(key, max) {
  if (peek(key) >= max) throw tooMany(secondsLeft(key), 'Demasiados intentos fallidos');
}

// Pide la contraseña actual dentro de la cuenta, contando los fallos igual que en el inicio de sesión
async function confirmPassword(req, me, pw) {
  const key = accountKey(me.username);
  assertNotLocked(key, LOGIN_MAX_FAILS);
  if (!(await verifyPassword(String(pw || ''), me))) {
    hit(key, LOGIN_MAX_FAILS, LOGIN_LOCK);
    securityLog('contrasena_actual_incorrecta', req, me.username);
    throw new HttpError(403, 'La contrasena actual no es correcta');
  }
  clearKey(key);
}

module.exports = { LOGIN_MAX_FAILS, IP_MAX_FAILS, LOGIN_LOCK, accountKey, ipKey, assertNotLocked, confirmPassword };
