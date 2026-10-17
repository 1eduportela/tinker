// Botón Seguir / Siguiendo.  extra=' ctx-btn' para usarlo en el menú lateral.
import { useState } from 'react';
import { api } from '../../core/api.js';
import { toast } from '../../ui/toast.jsx';

export function FollowButton({ user, onChange, extra = '' }) {
  const [following, setFollowing] = useState(!!user.following);
  const cls = (following ? 'btn ghost' : 'btn') + (extra ? extra + (following ? '' : ' primary') : '');
  const toggle = async e => {
    e.preventDefault(); e.stopPropagation();
    try {
      const f = (await api('POST', `/api/users/${user.username}/follow`)).following;
      user.following = f;   // la lista de Personas filtra por este dato
      setFollowing(f); onChange && onChange(f);
    } catch (err) { toast(err.message); }
  };
  return <button className={cls} onClick={toggle}>{following ? 'Siguiendo' : 'Seguir'}</button>;
}
