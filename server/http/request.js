'use strict';
// Lectura de peticiones: cuerpo JSON o binario con límite de tamaño, cookies, IP y si es HTTPS.

const { MAX_FILE, config } = require('../config');
const { HttpError } = require('./errors');

// Cuerpo JSON (máx. 8 MB por defecto)
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
// Cuerpo binario tal cual (subida de archivos de proyecto)
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, limit < MAX_FILE ? 'No te queda espacio suficiente para este archivo' : 'Archivo demasiado grande (max. 50 MB)')); req.resume(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch {} }
  });
  return out;
}

// IP real de quien hace la petición (solo se fía de las cabeceras del intermediario si trustProxy está activado)
function clientIp(req) {
  if (config.trustProxy) {
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return String(cf).trim();
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function isHttps(req) {
  if (req.socket.encrypted) return true;
  return !!config.trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

module.exports = { clientIp, isHttps, parseCookies, readBody, readRaw };
