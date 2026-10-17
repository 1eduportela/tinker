// Botón Seguir / Siguiendo.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { toast } from '../../ui/toast.js';

export function followButton(user, onChange) {
  const b = h('button');
  const paint = () => { b.className = (user.following ? 'btn ghost' : 'btn') + (b.dataset.extra ? b.dataset.extra + (user.following ? '' : ' primary') : ''); b.textContent = user.following ? 'Siguiendo' : 'Seguir'; };
  paint();
  b.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { user.following = (await api('POST', `/api/users/${user.username}/follow`)).following; paint(); onChange && onChange(user.following); }
    catch (err) { toast(err.message); }
  };
  b.repaint = paint;
  return b;
}
