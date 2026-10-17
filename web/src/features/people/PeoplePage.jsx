// Página Personas: buscar gente, seguirla e invitar a alguien nuevo.
import { useState } from 'react';
import { api } from '../../core/api.js';
import { useLoad } from '../../core/useLoad.js';
import { CtxButton, CtxSection, PageTitle } from '../../layout/ctx.jsx';
import { Layout } from '../../layout/Layout.jsx';
import { Avatar } from '../../ui/Avatar.jsx';
import { Icon } from '../../ui/Icon.jsx';
import { openInvites } from '../account/InvitesDialog.jsx';
import { ErrorPage } from '../ErrorPage.jsx';
import { FollowButton } from './FollowButton.jsx';

export function PeoplePage() {
  const { data, error } = useLoad(() => api('GET', '/api/users'), []);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [, repaint] = useState(0);
  if (error) return <ErrorPage active="personas" message={error.message} />;
  if (!data) return <Layout active="personas" context={null} />;

  const shown = data.users.filter(u => (filter === 'all' || u.following) && (u.displayName + ' ' + u.username).toLowerCase().includes(q));
  const context = <>
    <CtxSection title="Personas" desc="Sigue a gente para ver sus proyectos en tu inicio." />
    <CtxButton ic="mail" label="Invitar a alguien" onClick={openInvites} primary />
    <div className="ctx-search"><Icon name="search" />
      <input type="text" placeholder="Buscar personas…" onInput={e => setQ(e.target.value.toLowerCase().trim())} />
    </div>
    <div className="seg">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
      <button className={filter === 'following' ? 'active' : ''} onClick={() => setFilter('following')}>Que sigo</button>
    </div>
  </>;
  return (
    <Layout active="personas" context={context}>
      <PageTitle>Personas</PageTitle>
      <div className="people">
        {shown.length ? shown.map(u => (
          <a key={u.username} href={`#/u/${u.username}`} className="person">
            <Avatar user={u} /><b>{u.displayName}</b><span className="muted">{'@' + u.username}</span>
            <p>{u.bio || ''}</p>
            {u.suspended ? <span className="tag expired">Suspendida</span>
              : u.isMe ? <span className="btn ghost">Tú</span>
              : <FollowButton user={u} onChange={() => repaint(n => n + 1)} />}
          </a>
        )) : <div className="empty" style={{ gridColumn: '1/-1' }}>{filter === 'following' && !q ? 'Todavía no sigues a nadie.' : 'No hay nadie con ese nombre.'}</div>}
      </div>
    </Layout>
  );
}
