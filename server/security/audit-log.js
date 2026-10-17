'use strict';
// Registro de seguridad en data/seguridad.log: inicios de sesión, fallos, bloqueos, moderación...
// Una línea por suceso: fecha, suceso, IP y detalle. Se rota al pasar de 5 MB.

const fs = require('node:fs');
const path = require('node:path');
const { DATA } = require('../config');
const { clientIp } = require('../http/request');

const SECURITY_LOG = path.join(DATA, 'seguridad.log');
function securityLog(event, req, detail = '') {
  const line = `${new Date().toISOString()}\t${event}\t${req ? clientIp(req) : '-'}\t${detail}\n`;
  try {
    const st = fs.existsSync(SECURITY_LOG) && fs.statSync(SECURITY_LOG);
    if (st && st.size > 5 * 1024 * 1024) fs.renameSync(SECURITY_LOG, SECURITY_LOG + '.1');
    fs.appendFileSync(SECURITY_LOG, line);
  } catch {}
}

module.exports = { securityLog };
