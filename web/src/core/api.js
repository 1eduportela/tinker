// Llamadas a la API del servidor (JSON). Si la sesión ha caducado, vuelve a la pantalla de acceso.
import { getMe, setMe } from './session.js';

export async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && getMe()) setMe(null);
  if (r.status === 404 && data.error === 'Ruta no encontrada') {
    throw new Error('El servidor está en una versión antigua. Cierra todas las ventanas negras de Tinker y vuelve a abrir el .bat.');
  }
  if (!r.ok) throw new Error(data.error || 'Algo ha fallado');
  return data;
}
