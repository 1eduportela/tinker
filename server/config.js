'use strict';
// Configuración: carpetas, límites y data/config.json (código de invitación maestro y opciones).
// Todo lo que se puede ajustar con variables de entorno está aquí.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MB } = require('./lib/units');

// ---------- Carpetas ----------
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA = process.env.TINKER_DATA ? path.resolve(process.env.TINKER_DATA) : path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');   // fotos y vídeos de publicaciones, avatares y banners
const FILES = path.join(DATA, 'files');       // archivos de los proyectos
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(FILES, { recursive: true });

const PORT = Number(process.env.PORT) || 3000;

// ---------- Tamaños máximos ----------
const MAX_FILE = 50 * MB;
const MAX_IMAGE = 15 * MB;
const MAX_VIDEO = 300 * MB;
const MAX_MEDIA_PER_POST = 10;

// ---------- Cuotas por persona ----------
const USER_QUOTA = (Number(process.env.TINKER_QUOTA_MB) || 3000) * MB;      // espacio total
const DAILY_QUOTA = (Number(process.env.TINKER_DAILY_MB) || 1500) * MB;     // subida en 24 h
const MIN_FREE_DISK = (Number(process.env.TINKER_MIN_FREE_MB) || 1024) * MB; // se para si el disco baja de esto

// ---------- data/config.json ----------
const CONFIG_FILE = path.join(DATA, 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); }
if (!config.inviteCode) config.inviteCode = crypto.randomBytes(4).toString('hex');
// trustProxy: ponlo a true SOLO si Tinker esta detras de un intermediario (Cloudflare, Caddy...)
if (config.trustProxy === undefined) config.trustProxy = false;
saveConfig();

module.exports = {
  ROOT, PUBLIC, DATA, UPLOADS, FILES, PORT,
  MAX_FILE, MAX_IMAGE, MAX_VIDEO, MAX_MEDIA_PER_POST,
  USER_QUOTA, DAILY_QUOTA, MIN_FREE_DISK,
  config, saveConfig,
};
