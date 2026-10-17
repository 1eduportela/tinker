// Enrutador: la dirección (#/...) decide qué página se pinta en la parte derecha.
//   #/                 Inicio
//   #/personas         Personas
//   #/u/<usuario>/<sección>    Perfil (bienvenida, proyectos, contacto)
//   #/p/<id>/<sección>         Proyecto (archivos, readme, multimedia)
import { h } from './core/dom.js';
import { runLeaveHandlers, session } from './core/state.js';
import { authView } from './features/auth/auth-page.js';
import { feedPage } from './features/feed/feed-page.js';
import { peoplePage } from './features/people/people-page.js';
import { profilePage } from './features/profile/profile-page.js';
import { projectPage } from './features/projects/project-page.js';
import { buildShell, paintMe, root, shell } from './layout/shell.js';

export async function render() {
  runLeaveHandlers();
  if (!session.me) { shell.content = null; root.replaceChildren(authView()); return; }
  if (!shell.content || !shell.content.isConnected) buildShell();
  paintMe();
  const hash = location.hash || '#/';
  let key = 'feed';   // qué botón del menú principal se marca
  try {
    if (hash.startsWith('#/u/')) {
      const [u, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      key = u.toLowerCase() === session.me.username.toLowerCase() ? 'perfil' : '';
      await profilePage(u, sec);
    } else if (hash.startsWith('#/p/')) {
      const [id, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      const project = await projectPage(id, sec);
      key = project.mine ? 'perfil' : '';
    } else if (hash === '#/personas') { key = 'personas'; await peoplePage(); }
    else feedPage();
  } catch (e) {
    if (!session.me) return;   // la sesión caducó mientras cargaba: ya se está viendo la pantalla de acceso
    shell.context.replaceChildren();
    shell.content.replaceChildren(h('div', { class: 'empty' }, e.message));
  }
  for (const [k, a] of Object.entries(shell.nav)) a.classList.toggle('active', k === key);
  scrollTo(0, 0);
}
