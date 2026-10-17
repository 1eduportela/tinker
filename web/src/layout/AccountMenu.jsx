// Menú de la cuenta (botón de abajo a la izquierda; arriba a la derecha en el móvil):
// perfil, editar, seguridad y cerrar sesión.
import { useEffect } from 'react';
import { go } from '../core/router.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Icon } from '../ui/Icon.jsx';
import { openSecurity } from '../features/account/SecurityDialog.jsx';
import { openEditProfile } from '../features/profile/EditProfile.jsx';

export function AccountMenu({ me, anchor, onClose, onLogout }) {
  useEffect(() => {
    document.addEventListener('click', onClose);
    window.addEventListener('hashchange', onClose);
    return () => { document.removeEventListener('click', onClose); window.removeEventListener('hashchange', onClose); };
  }, [onClose]);

  // Se abre hacia arriba si el botón está abajo (ordenador) y hacia abajo si está arriba (móvil)
  const style = { left: `${Math.max(8, Math.min(anchor.left, innerWidth - 258))}px` };
  if (anchor.top > innerHeight / 2) style.bottom = `${innerHeight - anchor.top + 6}px`;
  else style.top = `${anchor.bottom + 6}px`;

  const item = (ic, label, fn, cls = '') => (
    <button className={'acct-item ' + cls} role="menuitem" onClick={() => { onClose(); fn(); }}>
      <Icon name={ic} /><span>{label}</span>
    </button>
  );
  return (
    <div className="acct-menu" role="menu" style={style} onClick={e => e.stopPropagation()}>
      <div className="acct-head">
        <Avatar user={me} size="small" />
        <div><b>{me.displayName}</b><small className="muted">{'@' + me.username + (me.isAdmin ? ' · administrador' : '')}</small></div>
      </div>
      {item('user', 'Ver mi perfil', () => go(`#/u/${me.username}`))}
      {item('edit', 'Editar perfil', openEditProfile)}
      {item('shield', 'Cuenta y seguridad', openSecurity)}
      <div className="acct-sep" />
      {item('logout', 'Cerrar sesión', onLogout, 'danger')}
    </div>
  );
}
