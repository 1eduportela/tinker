// Publicación abierta: carrusel arriba y toda la información debajo.
import { api } from '../../core/api.js';
import { Avatar } from '../../ui/Avatar.jsx';
import { Carousel } from '../../ui/Carousel.jsx';
import { Icon } from '../../ui/Icon.jsx';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openPost(post, onDelete) {
  openModal(close => <PostViewer post={post} close={close} onDelete={onDelete} />, 'wide');
}

function PostViewer({ post, close, onDelete }) {
  const date = new Date(post.createdAt);
  const remove = async () => {
    if (!confirm(post.mine ? '¿Borrar esta publicación?' : `Vas a borrar una publicación de @${post.author.username} como administrador. ¿Seguro?`)) return;
    try { await api('DELETE', `/api/posts/${post.id}`); close(); onDelete(); toast('Publicación borrada'); }
    catch (e) { toast(e.message); }
  };
  return (
    <div className="pm">
      {post.media && post.media.length ? <Carousel media={post.media} /> : <div className="pm-media text">{post.text}</div>}
      <div className="pm-side">
        <div className="row pm-head">
          <a href={`#/u/${post.author.username}`}><Avatar user={post.author} /></a>
          <div style={{ minWidth: 0 }}>
            <a href={`#/u/${post.author.username}`} className="name">{post.author.displayName}</a>
            <div className="muted" style={{ fontSize: 13 }}>
              {`@${post.author.username} · `}
              <time title={date.toLocaleString('es-ES')}>{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            </div>
          </div>
          <div className="spacer" />
          {(post.mine || post.canDelete) && <button className="icon-btn" title={post.mine ? 'Borrar publicación' : 'Borrar publicación (moderación)'} onClick={remove}><Icon name="trash" /></button>}
        </div>
        <div className="pm-body">
          {post.title && <h2 className="pm-title">{post.title}</h2>}
          {/* Si no hay fotos ni vídeos, el texto ya se ve en grande arriba (publicaciones antiguas) */}
          {post.media && post.media.length > 0 && post.text && <p className="pm-text">{post.text}</p>}
          {post.project && <a href={`#/p/${post.project.id}/multimedia`} className="proj-btn">
            <Icon name="folder" /><span>{post.project.name}</span><span className="arrow">→</span>
          </a>}
        </div>
      </div>
    </div>
  );
}
