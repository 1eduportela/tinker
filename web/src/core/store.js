// Pequeño "almacén" de un valor compartido: cualquier parte del código lo lee o lo cambia,
// y los componentes que lo usan con useStore() se vuelven a pintar solos cuando cambia.
import { useSyncExternalStore } from 'react';

export function createStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) { value = typeof next === 'function' ? next(value) : next; listeners.forEach(l => l()); },
    subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get);
}
