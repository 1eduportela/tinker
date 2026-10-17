// Proyectos de una persona como carpetas (sección Proyectos del perfil).
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { timeAgo } from '../../core/format.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { openNewProject } from './new-project.js';

export async function projectsView(user) {
  const { projects } = await api('GET', `/api/users/${encodeURIComponent(user.username)}/projects`);
  const wrap = h('div', { class: 'folders' });
  const paint = () => wrap.replaceChildren(...[
    ...projects.map(p => h('a', { class: 'folder', title: p.name, href: `#/p/${p.id}` },
      p.cover ? h('span', { class: 'f-cover', style: `background-image:url("${p.cover}")` })
        : h('span', { class: 'f-icon' }, icon('folder')),
      h('b', { class: 'f-name' }, p.name),
      p.description && h('p', { class: 'f-desc' }, p.description),
      h('small', { class: 'f-date' }, `${p.postCount} publicaci${p.postCount === 1 ? 'ón' : 'ones'} · ${timeAgo(p.createdAt)}`),
      p.mine && h('button', { class: 'icon-btn f-del', title: 'Borrar proyecto', onclick: async e => {
        e.stopPropagation(); e.preventDefault();
        if (!confirm(`¿Borrar el proyecto "${p.name}"? Se borrarán también sus ${p.postCount} publicaciones.`)) return;
        try { await api('DELETE', `/api/projects/${p.id}`); projects.splice(projects.indexOf(p), 1); paint(); toast('Proyecto borrado'); }
        catch (err) { toast(err.message); }
      } }, icon('trash')))),
    user.isMe && h('div', { class: 'folder new', onclick: () => openNewProject(p => { projects.unshift(p); paint(); }) },
      h('span', { class: 'f-icon' }, icon('plus')), h('b', { class: 'f-name' }, 'Nuevo proyecto'),
      h('small', { class: 'f-date' }, 'Crea una carpeta para un proyecto')),
    !user.isMe && !projects.length &&
      h('div', { class: 'empty', style: 'grid-column:1/-1' }, `${user.displayName} todavía no tiene proyectos.`)
  ].filter(Boolean));
  paint();
  return wrap;
}
