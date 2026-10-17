// Página de inicio: tus publicaciones y las de la gente que sigues.
// Para publicar se va al perfil (Nueva publicación, junto a Nuevo proyecto).
import { api } from '../../core/api.js';
import { CtxSection, PageTitle } from '../../layout/ctx.jsx';
import { Layout } from '../../layout/Layout.jsx';
import { Masonry } from '../posts/Masonry.jsx';

const loadFeed = async before => (await api('GET', `/api/feed?mode=following${before ? `&before=${before}` : ''}`)).posts;

export function FeedPage() {
  return (
    <Layout active="feed" context={<CtxSection title="Inicio" desc="Tus proyectos y los de la gente que sigues." />}>
      <PageTitle>Inicio</PageTitle>
      <Masonry loader={loadFeed}
        emptyMsg={<div>Aún no hay nada por aquí. <a href="#/personas" className="accent">Sigue a gente</a> o sube tu primer proyecto desde tu perfil.</div>} />
    </Layout>
  );
}
