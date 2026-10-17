'use strict';
// Contraseñas: cifrado con scrypt y reglas para rechazar las débiles.

const crypto = require('node:crypto');
const { db } = require('../db');

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
// Las más usadas (y variantes en español): se rechazan aunque cumplan la longitud
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
// Devuelve el motivo por el que una contraseña no vale, o null si es aceptable
function passwordProblem(pw, username) {
  if (typeof pw !== 'string' || pw.length < 8) return 'La contrasena debe tener al menos 8 caracteres';
  if (pw.length > 200) return 'La contrasena es demasiado larga (max. 200)';
  const low = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(low) || COMMON_PASSWORDS.has(low.replace(/[0-9!.]+$/, ''))) return 'Esa contrasena es demasiado comun: elige otra';
  if (/^(.)\1+$/.test(pw)) return 'La contrasena no puede ser un mismo caracter repetido';
  if (username && username.length >= 3 && low.includes(String(username).toLowerCase())) return 'La contrasena no puede contener tu nombre de usuario';
  return null;
}

module.exports = { PASS_PARAMS, hashPassword, hashPasswordAsync, passwordProblem, verifyPassword };
