// Avisos cortos abajo en el centro ("Publicado", errores...).  toast('Hecho')  desde cualquier sitio.
import { createStore, useStore } from '../core/store.js';

export const toastStore = createStore(null);
let timer;
export function toast(msg) {
  toastStore.set(msg);
  clearTimeout(timer);
  timer = setTimeout(() => toastStore.set(null), 2600);
}

export function Toast() {
  const msg = useStore(toastStore);
  return <div id="toast" hidden={!msg}>{msg}</div>;
}
