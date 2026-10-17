// Perfil: banner, desplegable de secciones (Bienvenida, Proyectos, Contacto) y su contenido.
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { go, refreshPage } from '../../core/router.js';
import { useMe } from '../../core/session.js';
import { useLoad } from '../../core/useLoad.js';
import { CtxButton, CtxSection } from '../../layout/ctx.jsx';
import { Layout } from '../../layout/Layout.jsx';
import { Avatar } from '../../ui/Avatar.jsx';
import { Icon } from '../../ui/Icon.jsx';
import { SectionDropdown } from '../../ui/SectionDropdown.jsx';
import { toast } from '../../ui/toast.jsx';
import { ChatView } from '../chat/ChatView.jsx';
import { InboxView } from '../chat/InboxView.jsx';
import { ErrorPage } from '../ErrorPage.jsx';
import { FollowButton } from '../people/FollowButton.jsx';
import { openComposer } from '../posts/Composer.jsx';
import { Masonry } from '../posts/Masonry.jsx';
import { openNewProject } from '../projects/NewProject.jsx';
import { ProjectList } from '../projects/ProjectList.jsx';
import { openEditProfile } from './EditProfile.jsx';

const SECTIONS = [
  { key: 'bienvenida', label: 'Bienvenida', ic: 'user' },
  { key: 'proyectos', label: 'Proyectos', ic: 'folder' },
  { key: 'contacto', label: 'Contacto', ic: 'message' },
];

export function ProfilePage({ username, section }) {
  if (!SECTIONS.some(s => s.key === section)) section = 'bienvenida';
  const me = useMe();
  const active = username.toLowerCase() === me.username.toLowerCase() ? 'perfil' : '';
  const { data, error } = useLoad(() => api('GET', `/api/users/${encodeURIComponent(username)}`), [username]);
  const [followers, setFollowers] = useState(null);
  const grid = useRef(null);
  const firstPosts = useRef(null);
  if (error) return <ErrorPage active={active} message={error.message} />;
  if (!data) return <Layout active={active} context={null} />;

  const { user } = data;
  if (firstPosts.current === null) firstPosts.current = data.posts;
  const base = `#/u/${user.username}`;
  const followerCount = followers ?? user.followers;

  let context;
  if (user.isMe) {
    context = <>
      <CtxSection title="Mi perfil" desc="Así te ven los demás." />
      <CtxButton ic="plus" label="Nueva publicación" primary onClick={() => openComposer(p => {
        if (grid.current) grid.current.prepend(p); else go(`${base}/bienvenida`);
      })} />
      <CtxButton ic="folder" label="Nuevo proyecto" onClick={() => openNewProject(() => {
        if (section === 'proyectos') refreshPage(); else go(`${base}/proyectos`);
      })} />
    </>;
  } else {
    const block = async () => {
      if (!user.blockedByMe && !confirm(`¿Bloquear a @${user.username}? No podrá escribirte, no verá tu perfil ni tus publicaciones, y dejaréis de seguiros.`)) return;
      try { const r = await api('POST', `/api/users/${user.username}/block`); toast(r.blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado'); refreshPage(); }
      catch (e) { toast(e.message); }
    };
    const suspend = async () => {
      if (!confirm(user.suspended ? `¿Reactivar la cuenta de @${user.username}?` : `¿Suspender la cuenta de @${user.username}? Se cerrarán sus sesiones, no podrá entrar y su contenido dejará de verse.`)) return;
      try { const r = await api('POST', `/api/admin/users/${user.username}/suspend`); toast(r.suspended ? 'Cuenta suspendida' : 'Cuenta reactivada'); refreshPage(); }
      catch (e) { toast(e.message); }
    };
    const hidden = user.blockedByMe || user.suspended;
    context = <>
      <CtxSection title="Perfil" desc={`El espacio de ${user.displayName}.`} />
      {!hidden && <FollowButton user={user} extra=" ctx-btn" onChange={f => setFollowers((followers ?? user.followers) + (f ? 1 : -1))} />}
      {section !== 'contacto' && !hidden && <CtxButton ic="message" label="Enviar mensaje" onClick={() => go(`${base}/contacto`)} />}
      <CtxButton ic="ban" label={user.blockedByMe ? 'Desbloquear' : 'Bloquear'} onClick={block} />
      {user.canModerate && <>
        <div className="ctx-title" style={{ marginTop: 6 }}>Administración</div>
        <CtxButton ic="flag" label={user.suspended ? 'Reactivar cuenta' : 'Suspender cuenta'} onClick={suspend} />
      </>}
    </>;
  }

  let body;
  if (section === 'bienvenida') {
    const loader = async before => {
      if (!before && firstPosts.current) { const p = firstPosts.current; firstPosts.current = false; return p; }
      return (await api('GET', `/api/users/${encodeURIComponent(username)}?before=${before}`)).posts;
    };
    body = <>
      <section className="about">
        <h3>Bienvenida</h3>
        {user.about ? <div className="about-text">{user.about}</div>
          : <div className="muted">{user.isMe
            ? <>Todavía no has escrito tu bienvenida. <a href="#" className="accent" onClick={e => { e.preventDefault(); openEditProfile(); }}>Escríbela ahora</a></>
            : `${user.displayName} todavía no ha escrito su bienvenida.`}</div>}
      </section>
      <h3 className="sec-title">Publicaciones</h3>
      <Masonry ref={grid} loader={loader} emptyMsg={user.isMe ? 'Todavía no has publicado nada. ¡Sube tu primer proyecto!' : 'Todavía no ha publicado nada.'} />
    </>;
  } else if (section === 'proyectos') {
    body = <ProjectList user={user} />;
  } else {
    body = user.isMe ? <InboxView />
      : user.blockedByMe ? <div className="about"><h3>Contacto</h3><div className="muted">Has bloqueado a esta persona. Desbloquéala para poder escribirle.</div></div>
      : user.suspended ? <div className="about"><h3>Contacto</h3><div className="muted">Esta cuenta está suspendida.</div></div>
      : <ChatView other={user} />;
  }

  return (
    <Layout active={active} context={context}>
      <header className={'banner' + (user.banner ? '' : ' no-img')} style={user.banner ? { backgroundImage: `url("${user.banner}")` } : undefined}>
        {user.isMe && <button className="banner-edit" onClick={openEditProfile}><Icon name="image" /><span>{user.banner ? 'Cambiar banner' : 'Añadir banner'}</span></button>}
        <div className="banner-info">
          <Avatar user={user} size="big" />
          <div style={{ minWidth: 0 }}>
            <h1>{user.displayName}</h1>
            <div className="handle">{'@' + user.username}</div>
            {user.bio && <div className="banner-bio">{user.bio}</div>}
            {user.invitedBy && <div className="banner-inv">Invitado por <a href={`#/u/${user.invitedBy}`}>{'@' + user.invitedBy}</a></div>}
            {user.suspended && <div className="banner-flag">Cuenta suspendida</div>}
            {user.blockedByMe && <div className="banner-flag">Has bloqueado a esta persona</div>}
            <div className="banner-stats">
              <span><b>{user.postCount}</b> publicaciones</span>
              <span><b>{followerCount}</b> seguidores</span>
              <span><b>{user.followingCount}</b> siguiendo</span>
            </div>
          </div>
        </div>
      </header>
      <div className="toolbar"><SectionDropdown current={section} sections={SECTIONS} onPick={k => go(`${base}/${k}`)} /></div>
      <div className="section-body">{body}</div>
    </Layout>
  );
}
