// Proyectos de una persona como carpetas (sección Proyectos del perfil).
import { api } from '../../core/api.js';
import { timeAgo } from '../../core/format.js';
import { useLoad } from '../../core/useLoad.js';
import { Icon } from '../../ui/Icon.jsx';
import { toast } from '../../ui/toast.jsx';
import { openNewProject } from './NewProject.jsx';

export function ProjectList({ user }) {
  const { data, error, setData } = useLoad(() => api('GET', `/api/users/${encodeURIComponent(user.username)}/projects`), [user.username]);
  if (error) return <div className="empty">{error.message}</div>;
  if (!data) return null;
  const projects = data.projects;
  const setProjects = fn => setData(d => ({ ...d, projects: fn(d.projects) }));

  const remove = async (e, p) => {
    e.stopPropagation(); e.preventDefault();
    if (!confirm(`¿Borrar el proyecto "${p.name}"? Se borrarán también sus ${p.postCount} publicaciones.`)) return;
    try { await api('DELETE', `/api/projects/${p.id}`); setProjects(list => list.filter(x => x !== p)); toast('Proyecto borrado'); }
    catch (err) { toast(err.message); }
  };

  return (
    <div className="folders">
      {projects.map(p => (
        <a key={p.id} className="folder" title={p.name} href={`#/p/${p.id}`}>
          {p.cover ? <span className="f-cover" style={{ backgroundImage: `url("${p.cover}")` }} />
            : <span className="f-icon"><Icon name="folder" /></span>}
          <b className="f-name">{p.name}</b>
          {p.description && <p className="f-desc">{p.description}</p>}
          <small className="f-date">{`${p.postCount} publicaci${p.postCount === 1 ? 'ón' : 'ones'} · ${timeAgo(p.createdAt)}`}</small>
          {p.mine && <button className="icon-btn f-del" title="Borrar proyecto" onClick={e => remove(e, p)}><Icon name="trash" /></button>}
        </a>
      ))}
      {user.isMe && <div className="folder new" onClick={() => openNewProject(p => setProjects(list => [p, ...list]))}>
        <span className="f-icon"><Icon name="plus" /></span><b className="f-name">Nuevo proyecto</b>
        <small className="f-date">Crea una carpeta para un proyecto</small>
      </div>}
      {!user.isMe && !projects.length && <div className="empty" style={{ gridColumn: '1/-1' }}>{`${user.displayName} todavía no tiene proyectos.`}</div>}
    </div>
  );
}
