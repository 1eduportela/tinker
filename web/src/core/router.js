// La dirección (#/...) decide qué página se ve. Aquí están las piezas para leerla y cambiarla.
//   useHash()      la dirección actual; el componente se repinta cuando cambia
//   go('#/...')    ir a otra página
//   refreshPage()  volver a cargar la página actual (tras bloquear a alguien, editar el perfil...)
import { useSyncExternalStore } from 'react';
import { createStore, useStore } from './store.js';

const onHash = l => { window.addEventListener('hashchange', l); return () => window.removeEventListener('hashchange', l); };
export const useHash = () => useSyncExternalStore(onHash, () => location.hash || '#/');
export const go = hash => { location.hash = hash; };

const reloads = createStore(0);
export const refreshPage = () => reloads.set(n => n + 1);
export const useRefreshKey = () => useStore(reloads);
