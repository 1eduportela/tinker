'use strict';
// Códigos de invitación: de un solo uso, tipo TNK-ABCD-EF23 (40 bits aleatorios).
// En la base de datos solo se guarda su huella. El código maestro (el de la ventana negra)
// también es de un solo uso: tras usarse se genera otro.

const crypto = require('node:crypto');
const { config, saveConfig } = require('../config');

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_DAYS = 7;
const MAX_PENDING_INVITES = 5;

function newInviteCode() {
  const bytes = crypto.randomBytes(8);
  let c = ''; for (let i = 0; i < 8; i++) c += INVITE_ALPHABET[bytes[i] % 32];
  return `TNK-${c.slice(0, 4)}-${c.slice(4)}`;
}

// Normaliza lo que escribe la persona: mayúsculas, sin guiones ni el prefijo TNK
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^TNK/, '');

// Las instalaciones antiguas tenían un código maestro de otro formato: se cambia por uno TNK-
function ensureMasterCode() {
  if (!/^TNK-/.test(config.inviteCode)) { config.inviteCode = newInviteCode(); saveConfig(); }
}

function rotateMasterCode() {
  config.inviteCode = newInviteCode(); saveConfig();
  console.log(`\n  Se ha usado el codigo de invitacion maestro. El nuevo es: ${config.inviteCode}\n`);
}

module.exports = { INVITE_DAYS, MAX_PENDING_INVITES, newInviteCode, normCode, ensureMasterCode, rotateMasterCode };
