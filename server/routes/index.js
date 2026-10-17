'use strict';
// Carga todos los archivos de rutas de la API. Cada uno registra las suyas en el enrutador
// (http/router.js) al cargarse. Para añadir una sección nueva: crea su archivo aquí y añádelo a la lista.

require('./auth');       // /api/register, /api/login, /api/logout, GET /api/me
require('./account');    // /api/me (editar, borrar), /api/me/security, /api/me/password, /api/me/sessions
require('./invites');    // /api/invites
require('./posts');      // /api/feed, /api/posts
require('./media');      // /api/media
require('./users');      // /api/users
require('./admin');      // /api/admin
require('./projects');   // /api/projects, /api/users/:u/projects
require('./files');      // /api/projects/:id/files, /api/files/:id
require('./messages');   // /api/messages, /api/conversations
