// Quién ha iniciado sesión (null si nadie). undefined = todavía no lo sabemos (al arrancar).
import { createStore, useStore } from './store.js';

export const session = createStore(undefined);
export const getMe = () => session.get();
export const setMe = user => session.set(user);
export const useMe = () => useStore(session);
