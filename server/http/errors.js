'use strict';
// Error con código HTTP. Cualquier ruta puede lanzarlo (throw new HttpError(404, '...')) y
// el servidor lo convierte en una respuesta JSON { error } con ese código.

class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

module.exports = { HttpError };
