// Estructura fija de la web: menú lateral (siempre igual) y contenido a la derecha.
// Cada página la usa así:  <Layout active="perfil" context={<>…opciones…</>}>…contenido…</Layout>
// En el móvil cambia de sitio: los tres botones principales van en una barra abajo, las opciones
// de la página en una fila encima del contenido y el botón de la cuenta arriba a la derecha.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api } from '../core/api.js';
import { go } from '../core/router.js';
import { setMe, useMe } from '../core/session.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Icon } from '../ui/Icon.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { refreshUnread, useUnread } from './unread.js';

// Ancho por debajo del cual se usa el diseño de móvil (el mismo que en styles/layout.css)
const phone = matchMedia('(max-width: 640px)');
const onPhoneChange = l => { phone.addEventListener('change', l); return () => phone.removeEventListener('change', l); };
const usePhone = () => useSyncExternalStore(onPhoneChange, () => phone.matches);

const Logo = () => (
  <a href="#/" className="logo">
    <span className="logo-mark"><Icon name="wrench" /></span>
    <span className="lbl">Tinker<span className="logo-sub">cacharrando</span></span>
  </a>
);

export function Layout({ active, context, children }) {
  const me = useMe();
  const unread = useUnread();
  const isPhone = usePhone();
  const [menu, setMenu] = useState(null);   // posición del botón de la cuenta cuando el menú está abierto
  const closeMenu = useCallback(() => setMenu(null), []);
  useEffect(() => { refreshUnread(); }, []);

  const logout = async () => { await api('POST', '/api/logout').catch(() => {}); setMe(null); go('#/'); };
  const navItem = (key, href, ic, label, extra) => (
    <a href={href} className={'nav-item' + (key === active ? ' active' : '')} title={label}>
      <Icon name={ic} /><span className="lbl">{label}</span>{extra}
    </a>
  );
  const badge = <span className="badge nav-badge" hidden={!unread}
    title={unread == null ? undefined : `${unread} mensaje${unread === 1 ? '' : 's'} sin leer`}>{unread ? unread : null}</span>;

  const contextBox = <div className="context">{context}</div>;
  const mebox = (
    <div className="mebox">
      <button className="me-link" title="Tu cuenta" aria-haspopup="menu"
        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu(m => m ? null : r); }}>
        <Avatar user={me} size="small" />
        <span className="lbl"><b>{me.displayName}</b><small className="muted">{'@' + me.username}</small></span>
        <span className="lbl me-chev"><Icon name="chevron" /></span>
      </button>
      <button className="icon-btn" title="Cerrar sesión" onClick={logout}><Icon name="logout" /></button>
    </div>
  );

  return <>
    <aside className="sidebar">
      <Logo />
      <nav className="mainnav">
        {navItem('feed', '#/', 'home', 'Inicio')}
        {navItem('personas', '#/personas', 'users', 'Personas')}
        {navItem('perfil', `#/u/${me.username}`, 'user', 'Mi perfil', badge)}
      </nav>
      {!isPhone && contextBox}
      <div className="spacer-v" />
      {!isPhone && mebox}
    </aside>
    <header className="topbar"><Logo />{isPhone && mebox}</header>
    <div className="ctx-slot">{isPhone && contextBox}</div>
    <main className="content">{children}</main>
    {menu && <AccountMenu me={me} anchor={menu} onClose={closeMenu} onLogout={logout} />}
  </>;
}
