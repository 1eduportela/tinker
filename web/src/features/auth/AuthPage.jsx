// Pantalla de acceso: entrar o crear cuenta (con código de invitación).
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { go } from '../../core/router.js';
import { setMe } from '../../core/session.js';
import { Icon } from '../../ui/Icon.jsx';

export function AuthPage() {
  const [mode, setMode] = useState('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fields = { username: useRef(), displayName: useRef(), password: useRef(), invite: useRef() };
  const pick = m => { setMode(m); setErr(''); };

  const submit = async ev => {
    ev.preventDefault(); setErr(''); setBusy(true);
    const body = Object.fromEntries(Object.entries(fields).map(([k, r]) => [k, r.current.value]));
    try {
      const { user } = await api('POST', mode === 'login' ? '/api/login' : '/api/register', body);
      go('#/'); setMe(user);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth-logo"><span className="logo-mark"><Icon name="wrench" /></span>Tinker</div>
      <p className="lead">Cacharrando: proyectos de ingeniería, deporte y lo que se te ocurra.</p>
      <form onSubmit={submit}>
        <div className="seg">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => pick('login')}>Entrar</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => pick('register')}>Crear cuenta</button>
        </div>
        <label>Usuario</label>
        <input ref={fields.username} type="text" autoComplete="username" maxLength={20} />
        <label>Contraseña</label>
        <input ref={fields.password} type="password" autoComplete="current-password" maxLength={200} />
        <div hidden={mode === 'login'}>
          <label>Nombre visible</label>
          <input ref={fields.displayName} type="text" maxLength={40} />
          <label>Código de invitación</label>
          <input ref={fields.invite} type="text" placeholder="TNK-XXXX-XXXX" autoComplete="off" />
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={busy}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        <div className="error">{err}</div>
      </form>
    </div>
  );
}
