// Lo que se ve cuando una página no se puede cargar (no existe, no tienes acceso...).
import { Layout } from '../layout/Layout.jsx';

export function ErrorPage({ active, message }) {
  return <Layout active={active} context={null}><div className="empty">{message}</div></Layout>;
}
