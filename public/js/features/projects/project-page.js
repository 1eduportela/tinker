// Página de un proyecto: cabecera, desplegable (Archivos, README, Multimedia) y su contenido.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { timeAgo } from '../../core/format.js';
import { rerender, session } from '../../core/state.js';
import { ctxButton, ctxSection, shell } from '../../layout/shell.js';
import { avatar } from '../../ui/avatar.js';
import { sectionDropdown } from '../../ui/dropdown.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { openComposer } from '../posts/composer.js';
import { masonry } from '../posts/masonry.js';
import { openEditProject } from './edit-project.js';
import { filesView } from './files-view.js';
import { readmeView } from './readme-view.js';

const PROJECT_SECTIONS = [
  { key: 'archivos', label: 'Archivos', ic: 'file' },
  { key: 'readme', label: 'README', ic: 'book' },
  { key: 'multimedia', label: 'Multimedia', ic: 'image' },
];

export async function projectPage(id, section) {
  const rawSection = section || '';
  const wantEdit = /\?editar$/.test(rawSection);
  section = (section || '').replace(/\?.*$/, '');
  const { project } = await api('GET', `/api/projects/${encodeURIComponent(id)}`);
  if (!PROJECT_SECTIONS.some(s => s.key === section)) section = PROJECT_SECTIONS[0].key;
  const base = `#/p/${project.id}`;
  const owner = project.owner;
  const fileCountEl = h('span', {});
  const paintCount = n => fileCountEl.replaceChildren(icon('file'), `${n} archivo${n === 1 ? '' : 's'}`);
  paintCount(project.fileCount);

  const head = h('header', { class: 'proj-head' },
    h('span', { class: 'proj-icon' }, icon('folder')),
    h('div', { style: 'min-width:0' },
      h('div', { class: 'proj-path' },
        h('a', { href: `#/u/${owner.username}/proyectos`, class: 'proj-owner' }, avatar(owner, 'xs'), owner.displayName),
        h('span', { class: 'slash' }, '/'),
        h('b', {}, project.name)),
      project.description && h('p', { class: 'proj-desc' }, project.description),
      h('div', { class: 'proj-stats' },
        fileCountEl,
        h('span', {}, icon('image'), `${project.postCount} publicaci${project.postCount === 1 ? 'ón' : 'ones'}`),
        h('span', {}, 'Creado ' + timeAgo(project.createdAt)))));
  const body = h('div', { class: 'section-body' });
  shell.content.replaceChildren(head,
    h('div', { class: 'toolbar' }, sectionDropdown(section, k => { location.hash = `${base}/${k}`; }, PROJECT_SECTIONS)),
    body);

  let grid = null, readmeBox = null, filesBox = null;
  if (project.mine) {
    shell.context.replaceChildren(
      ...ctxSection('Proyecto', 'Tu proyecto. Todo lo que publiques aquí sale en Multimedia.'),
      ctxButton('plus', 'Nueva publicación', () => openComposer(p => {
        if (p.project && p.project.id === project.id && grid) grid.prepend(p); else if (p.project) location.hash = `#/p/${p.project.id}/multimedia`;
      }, project.id), true),
      ctxButton('upload', 'Subir archivos', () => {
        if (section === 'archivos' && filesBox) filesBox.pick(); else location.hash = `${base}/archivos?subir`;
      }),
      ctxButton('book', 'Editar README', () => {
        if (section === 'readme' && readmeBox) readmeBox.edit(); else location.hash = `${base}/readme?editar`;
      }),
      ctxButton('edit', 'Editar proyecto', () => openEditProject(project, () => rerender())),
      ctxButton('trash', 'Borrar proyecto', async () => {
        if (!confirm(`¿Borrar el proyecto "${project.name}"? Se borrarán también sus publicaciones.`)) return;
        try { await api('DELETE', `/api/projects/${project.id}`); toast('Proyecto borrado'); location.hash = `#/u/${session.me.username}/proyectos`; }
        catch (e) { toast(e.message); }
      }));
  } else {
    shell.context.replaceChildren(
      ...ctxSection('Proyecto', `Un proyecto de ${owner.displayName}.`),
      ctxButton('user', `Perfil de ${owner.displayName}`, () => { location.hash = `#/u/${owner.username}`; }),
      ctxButton('message', 'Enviar mensaje', () => { location.hash = `#/u/${owner.username}/contacto`; }),
      ...(project.canDelete ? [h('div', { class: 'ctx-title', style: 'margin-top:6px' }, 'Administración'),
        ctxButton('trash', 'Borrar proyecto', async () => {
          if (!confirm(`Vas a borrar el proyecto "${project.name}" de @${owner.username} como administrador, con todas sus publicaciones y archivos. ¿Seguro?`)) return;
          try { await api('DELETE', `/api/projects/${project.id}`); toast('Proyecto borrado'); location.hash = `#/u/${owner.username}/proyectos`; }
          catch (e) { toast(e.message); }
        })] : []));
  }

  if (section === 'archivos') {
    filesBox = await filesView(project, /\?subir$/.test(rawSection), paintCount);
    body.append(filesBox);
  } else if (section === 'readme') {
    readmeBox = readmeView(project);
    body.append(readmeBox);
    if (wantEdit && project.mine) readmeBox.edit();
  } else if (section === 'multimedia') {
    grid = masonry(async before =>
      (await api('GET', `/api/projects/${project.id}/posts${before ? `?before=${before}` : ''}`)).posts,
      project.mine ? 'Aún no hay publicaciones en este proyecto. ¡Sube la primera foto!' : 'Aún no hay publicaciones en este proyecto.');
    body.append(grid.el);
  }
  return project;
}
