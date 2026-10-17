// Carga datos al mostrar un componente: const { data, error, setData } = useLoad(() => api(...), [deps])
// Si el componente desaparece antes de que lleguen, la respuesta se ignora.
import { useEffect, useState } from 'react';

export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null, loading: true });
    loader().then(data => alive && setState({ data, error: null, loading: false }),
      error => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const setData = fn => setState(s => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn }));
  return { ...state, setData };
}
