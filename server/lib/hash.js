'use strict';
// Huellas SHA-256: lo que se guarda en la base de datos en lugar de las claves de sesión y los códigos de invitación.

const crypto = require('node:crypto');

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

module.exports = { sha256 };
