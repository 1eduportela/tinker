// Página de un proyecto: cabecera, desplegable (Archivos, README, Multimedia) y su contenido.
// La dirección puede pedir abrir directamente el editor (#/p/3/readme?editar) o el selector (#/p/3/archivos?subir).
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { timeAgo } from '../../core/format.js';
import { go, refreshPage } from '../../core/router.js';
import { useMe } from '../../core/session.js';
import { useLoad } from '../../core/useLoad.js';
import { CtxButton, CtxSection } from '../../layout/ctx.jsx';
import { Layout } from '../../layout/Layout.jsx';
import { Avatar } from '../../ui/Avatar.jsx';
import { Icon } from '../../ui/Icon.jsx';
import { SectionDropdown } from '../../ui/SectionDropdown.jsx';
import { toast } from '../../ui/toast.jsx';
import { ErrorPage } from '../ErrorPage.jsx';
import { openComposer } from '../posts/Composer.jsx';
import { Masonry } from '../posts/Masonry.jsx';
import { openEditProject } from './EditProject.jsx';
import { FilesView } from './FilesView.jsx';
import { ReadmeView } from './ReadmeView.jsx';

const SECTIONS = [
  { key: 'archivos', label: 'Archivos', ic: 'file' },
  { key: 'readme', label: 'README', ic: 'book' },
  { key: 'multimedia', label: 'Multimedia', ic: 'image' },
];

export function ProjectPage({ id, section: raw = '' }) {
  const me = useMe();
  const { data, error } = useLoad(() => api('GET', `/api/projects/${encodeURIComponent(id)}`), [id]);
  let section = raw.replace(/\?.*$/, '');
  if (!SECTIONS.some(s => s.key === section)) section = SECTIONS[0].key;
  const [fileCount, setFileCount] = useState(null);
  const [editing, setEditing] = useState(/\?editar$/.test(raw));
  const grid = useRef(null), filesBox = useRef(null);
  if (error) return <ErrorPage active="feed" message={error.message} />;
  if (!data) return <Layout active="" context={null} />;

  const { project } = data;
  const base = `#/p/${project.id}`;
  const owner = project.owner;
  const files = fileCount ?? project.fileCount;
  const remove = async (question, after) => {
    if (!confirm(question)) return;
    try { await api('DELETE', `/api/projects/${project.id}`); toast('Proyecto borrado'); go(after); }
    catch (e) { toast(e.message); }
  };

  const context = project.mine ? <>
    <CtxSection title="Proyecto" desc="Tu proyecto. Todo lo que publiques aquí sale en Multimedia." />
    <CtxButton ic="plus" label="Nueva publicación" primary onClick={() => openComposer(p => {
      if (p.project && p.project.id === project.id && grid.current) grid.current.prepend(p);
      else if (p.project) go(`#/p/${p.project.id}/multimedia`);
    }, project.id)} />
    <CtxButton ic="upload" label="Subir archivos" onClick={() => {
      if (section === 'archivos' && filesBox.current) filesBox.current.pick(); else go(`${base}/archivos?subir`);
    }} />
    <CtxButton ic="book" label="Editar README" onClick={() => {
      if (section === 'readme') setEditing(true); else go(`${base}/readme?editar`);
    }} />
    <CtxButton ic="edit" label="Editar proyecto" onClick={() => openEditProject(project, () => refreshPage())} />
    <CtxButton ic="trash" label="Borrar proyecto" onClick={() => remove(`¿Borrar el proyecto "${project.name}"? Se borrarán también sus publicaciones.`, `#/u/${me.username}/proyectos`)} />
  </> : <>
    <CtxSection title="Proyecto" desc={`Un proyecto de ${owner.displayName}.`} />
    <CtxButton ic="user" label={`Perfil de ${owner.displayName}`} onClick={() => go(`#/u/${owner.username}`)} />
    <CtxButton ic="message" label="Enviar mensaje" onClick={() => go(`#/u/${owner.username}/contacto`)} />
    {project.canDelete && <>
      <div className="ctx-title" style={{ marginTop: 6 }}>Administración</div>
      <CtxButton ic="trash" label="Borrar proyecto" onClick={() => remove(`Vas a borrar el proyecto "${project.name}" de @${owner.username} como administrador, con todas sus publicaciones y archivos. ¿Seguro?`, `#/u/${owner.username}/proyectos`)} />
    </>}
  </>;

  return (
    <Layout active={project.mine ? 'perfil' : ''} context={context}>
      <header className="proj-head">
        <span className="proj-icon"><Icon name="folder" /></span>
        <div style={{ minWidth: 0 }}>
          <div className="proj-path">
            <a href={`#/u/${owner.username}/proyectos`} className="proj-owner"><Avatar user={owner} size="xs" />{owner.displayName}</a>
            <span className="slash">/</span>
            <b>{project.name}</b>
          </div>
          {project.description && <p className="proj-desc">{project.description}</p>}
          <div className="proj-stats">
            <span><Icon name="file" />{`${files} archivo${files === 1 ? '' : 's'}`}</span>
            <span><Icon name="image" />{`${project.postCount} publicaci${project.postCount === 1 ? 'ón' : 'ones'}`}</span>
            <span>{'Creado ' + timeAgo(project.createdAt)}</span>
          </div>
        </div>
      </header>
      <div className="toolbar"><SectionDropdown current={section} sections={SECTIONS} onPick={k => go(`${base}/${k}`)} /></div>
      <div className="section-body">
        {section === 'archivos' && <FilesView ref={filesBox} project={project} autoUpload={/\?subir$/.test(raw)} onCount={setFileCount} />}
        {section === 'readme' && <ReadmeView project={project} editing={editing && project.mine} setEditing={setEditing} />}
        {section === 'multimedia' && <Masonry ref={grid}
          loader={async before => (await api('GET', `/api/projects/${project.id}/posts${before ? `?before=${before}` : ''}`)).posts}
          emptyMsg={project.mine ? 'Aún no hay publicaciones en este proyecto. ¡Sube la primera foto!' : 'Aún no hay publicaciones en este proyecto.'} />}
      </div>
    </Layout>
  );
}
