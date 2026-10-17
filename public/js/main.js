// Tinker - arranque de la web. Pregunta al servidor si hay sesión abierta y pinta la página.
// Mapa del código (public/js/):
//   core/      piezas básicas sin interfaz: crear elementos, hablar con la API, estado, formatos, Markdown
//   ui/        componentes reutilizables: iconos, avisos, ventanas, carrusel, desplegable, avatar
//   media/     fotos y vídeos: redimensionar, sacar portada de un vídeo, subir archivos
//   layout/    la estructura fija: menú lateral y menú de la cuenta
//   features/  cada parte de la red: acceso, inicio, publicaciones, personas, perfil, proyectos, chat, cuenta
//   router.js  qué página se pinta según la dirección
import { api } from './core/api.js';
import { session, setRenderer } from './core/state.js';
import { startUnreadPolling } from './layout/shell.js';
import { render } from './router.js';

setRenderer(render);
window.addEventListener('hashchange', render);
startUnreadPolling();
(async () => { try { session.me = (await api('GET', '/api/me')).user; } catch {} render(); })();
