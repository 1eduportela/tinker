'use strict';
// Lectura de peticiones: cuerpo JSON o binario con límite de tamaño, cookies, IP y si es HTTPS.

const fs = require('node:fs');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { config } = require('../config');
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
// Cuerpo binario directo a un archivo, sin cargarlo en memoria (fotos, vídeos y archivos de proyecto).
// Si pasa de maxBytes o la conexión se corta a mitad, borra el archivo y lanza el error:
// pipeline() cierra todos los streams pase lo que pase, así que nunca queda nada abierto.
async function receiveToFile(req, file, maxBytes, tooBig) {
  if (Number(req.headers['content-length'] || 0) > maxBytes) { req.resume(); throw tooBig(); }
  let size = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) { size += chunk.length; cb(size > maxBytes ? tooBig() : null, chunk); },
  });
  try {
    await pipeline(req, limiter, fs.createWriteStream(file));
    return size;
  } catch (e) {
    fs.rm(file, { force: true }, () => {});
    if (e.code === 'ERR_STREAM_PREMATURE_CLOSE') throw new HttpError(400, 'La subida se ha cortado');
    throw e;
  }
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

module.exports = { clientIp, isHttps, parseCookies, readBody, receiveToFile };
