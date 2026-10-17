// Número de mensajes sin leer (el que sale junto a "Mi perfil"). Se pregunta al servidor
// al cambiar de página, cada 15 segundos y cuando llega un mensaje al chat abierto.
import { api } from '../core/api.js';
import { getMe } from '../core/session.js';
import { createStore, useStore } from '../core/store.js';

const unread = createStore(null);   // null = aún no se ha preguntado
export const useUnread = () => useStore(unread);

export async function refreshUnread() {
  try { unread.set((await api('GET', '/api/me')).unread); } catch {}
}

export function startUnreadPolling() {
  setInterval(() => { if (getMe() && !document.hidden) refreshUnread(); }, 15000);
}
