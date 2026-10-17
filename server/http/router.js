'use strict';
// Enrutador de la API: cada archivo de server/routes/ registra sus rutas con route(),
// y dispatch() busca la que encaja con la petición.
//   route('GET', '/api/projects/(\\d+)', async (req, res, url, [id]) => { ... })
// El patrón es una expresión regular; los grupos entre paréntesis llegan como último parámetro.

const { HttpError } = require('./errors');

const routes = [];

function route(method, pattern, handler) {
  routes.push({ method, re: new RegExp('^' + pattern + '$'), handler });
}

async function dispatch(req, res, url, pathname) {
  for (const r of routes) {
    const m = r.method === req.method && r.re.exec(pathname);
    if (m) return await r.handler(req, res, url, m.slice(1));
  }
  throw new HttpError(404, 'Ruta no encontrada');
}

module.exports = { route, dispatch };
