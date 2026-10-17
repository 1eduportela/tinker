// La aplicación: pregunta al servidor si hay sesión, y según la dirección (#/...) pinta una página.
//   #/                         Inicio
//   #/personas                 Personas
//   #/u/<usuario>/<sección>    Perfil (bienvenida, proyectos, contacto)
//   #/p/<id>/<sección>         Proyecto (archivos, readme, multimedia)
import { useEffect } from 'react';
import { api } from './core/api.js';
import { useHash, useRefreshKey } from './core/router.js';
import { setMe, useMe } from './core/session.js';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { ErrorPage } from './features/ErrorPage.jsx';
import { FeedPage } from './features/feed/FeedPage.jsx';
import { PeoplePage } from './features/people/PeoplePage.jsx';
import { ProfilePage } from './features/profile/ProfilePage.jsx';
import { ProjectPage } from './features/projects/ProjectPage.jsx';
import { startUnreadPolling } from './layout/unread.js';
import { ModalHost } from './ui/modal.jsx';
import { Toast } from './ui/toast.jsx';

function Page({ hash }) {
  try {
    if (hash.startsWith('#/u/')) {
      const [u, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      return <ProfilePage username={u} section={sec} />;
    }
    if (hash.startsWith('#/p/')) {
      const [id, sec] = hash.slice(4).split('/').map(decodeURIComponent);
      return <ProjectPage id={id} section={sec} />;
    }
  } catch (e) {
    return <ErrorPage active="feed" message={e.message} />;
  }
  if (hash === '#/personas') return <PeoplePage />;
  return <FeedPage />;
}

export function App() {
  const me = useMe();
  const hash = useHash();
  const reloadKey = useRefreshKey();
  useEffect(() => {
    api('GET', '/api/me').then(d => setMe(d.user), () => setMe(null));
    startUnreadPolling();
  }, []);
  useEffect(() => { scrollTo(0, 0); }, [hash, reloadKey]);

  return <>
    {me === undefined ? null : me ? <Page key={`${hash}|${reloadKey}`} hash={hash} /> : <AuthPage />}
    <ModalHost />
    <Toast />
  </>;
}
