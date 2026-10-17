// Ventana "Cuenta y seguridad": cambiar contraseña, sesiones abiertas, espacio usado y borrar la cuenta.
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { fmtSize, timeAgo } from '../../core/format.js';
import { go } from '../../core/router.js';
import { getMe, setMe } from '../../core/session.js';
import { useLoad } from '../../core/useLoad.js';
import { Icon } from '../../ui/Icon.jsx';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openSecurity() {
  openModal(close => <div><h2>Cuenta y seguridad</h2><Security me={getMe()} closeAll={close} /></div>);
}

// Lo fuerte que parece una contraseña nueva (solo orientativo; las reglas de verdad están en el servidor)
function passwordHint(pw, username) {
  if (!pw) return '';
  if (pw.length < 8) return 'Mínimo 8 caracteres';
  if (username && username.length >= 3 && pw.toLowerCase().includes(username.toLowerCase())) return 'No puede contener tu usuario';
  let score = 0;
  if (pw.length >= 12) score++; if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++; if (/\d/.test(pw)) score++; if (/[^A-Za-z0-9]/.test(pw)) score++;
  return ['Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte', 'Muy fuerte'][score];
}

function Security({ me, closeAll }) {
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(v => v + 1);
  const { data, error } = useLoad(() => api('GET', '/api/me/security'), [version]);
  const cur = useRef(), next = useRef(), rep = useRef();
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <div className="sec"><div className="error">{error.message}</div></div>;
  if (!data) return <div className="sec"><div className="muted">Cargando…</div></div>;

  const changePassword = async () => {
    if (next.current.value !== rep.current.value) return toast('Las contraseñas nuevas no coinciden');
    setBusy(true);
    try {
      await api('POST', '/api/me/password', { current: cur.current.value, next: next.current.value });
      toast('Contraseña cambiada. Se han cerrado tus otras sesiones.');
      cur.current.value = next.current.value = rep.current.value = ''; setHint(''); reload();
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  const closeOne = async id => {
    try { await api('DELETE', `/api/me/sessions/${id}`); toast('Sesión cerrada'); reload(); } catch (e) { toast(e.message); }
  };
  const closeOthers = async () => {
    try {
      const r = await api('POST', '/api/me/sessions/close-others');
      toast(`${r.closed} sesión${r.closed === 1 ? '' : 'es'} cerrada${r.closed === 1 ? '' : 's'}`); reload();
    } catch (e) { toast(e.message); }
  };
  const others = data.sessions.filter(x => !x.current).length;
  const s = data.storage;

  return (
    <div className="sec">
      <section className="sec-block">
        <h3><Icon name="key" />Cambiar contraseña</h3>
        <label>Contraseña actual</label>
        <input ref={cur} type="password" autoComplete="current-password" />
        <label>Nueva contraseña</label>
        <input ref={next} type="password" autoComplete="new-password" onInput={e => setHint(passwordHint(e.target.value, me.username))} />
        <small className="pw-hint muted">{hint}</small>
        <label>Repite la nueva contraseña</label>
        <input ref={rep} type="password" autoComplete="new-password" />
        <p className="muted small-note">Mínimo 8 caracteres, que no sea una contraseña típica ni contenga tu usuario. Al cambiarla se cierran tus otras sesiones.</p>
        <div className="row"><div className="spacer" /><button className="btn" disabled={busy} onClick={changePassword}>Cambiar contraseña</button></div>
      </section>
      <section className="sec-block">
        <h3><Icon name="monitor" />{`Sesiones abiertas (${data.sessions.length})`}</h3>
        <p className="muted small-note">Si ves un dispositivo que no reconoces, ciérralo y cambia tu contraseña.</p>
        <div className="sessions">
          {data.sessions.map(x => (
            <div key={x.id} className="session">
              <span className="ficon"><Icon name="monitor" /></span>
              <div className="session-txt">
                <b>{x.device}{x.current && <span className="tag">Este dispositivo</span>}</b>
                <small className="muted">{`${x.ip || 'IP desconocida'} · último uso ${timeAgo(x.lastUsed)} · desde ${new Date(x.createdAt).toLocaleDateString('es-ES')}`}</small>
              </div>
              {!x.current && <button className="btn ghost small" onClick={() => closeOne(x.id)}>Cerrar</button>}
            </div>
          ))}
        </div>
        {others > 0 && <div className="row" style={{ marginTop: 10 }}><div className="spacer" />
          <button className="btn ghost" onClick={closeOthers}>Cerrar todas las demás</button></div>}
      </section>
      <section className="sec-block">
        <h3><Icon name="folder" />Tu espacio</h3>
        <div className="quota"><div className="quota-fill" style={{ width: `${Math.min(100, s.used / s.quota * 100).toFixed(1)}%` }} /></div>
        <p className="muted small-note">{`Usas ${fmtSize(s.used)} de ${fmtSize(s.quota)}. Hoy has subido ${fmtSize(s.today)} de ${fmtSize(s.dailyQuota)} permitidos al día.`}</p>
      </section>
      <section className="sec-block danger-zone">
        <h3><Icon name="trash" />Zona peligrosa</h3>
        <p className="muted small-note">Borra tu cuenta y todo tu contenido de Tinker.</p>
        <button className="btn danger" onClick={() => openModal(close => <DeleteAccount me={me} close={close} closeAll={closeAll} />)}>Borrar mi cuenta para siempre</button>
      </section>
    </div>
  );
}

function DeleteAccount({ me, close, closeAll }) {
  const conf = useRef(), pw = useRef();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await api('DELETE', '/api/me', { confirm: conf.current.value, password: pw.current.value });
      close(); closeAll(); toast('Cuenta borrada'); go('#/'); setMe(null);
    } catch (e) { toast(e.message); setBusy(false); }
  };
  return (
    <div>
      <h2>¿Borrar tu cuenta?</h2>
      <p>Se borrarán para siempre tu perfil, tus proyectos con sus archivos, tus publicaciones y tus mensajes. No se puede deshacer.</p>
      <label>{`Escribe tu usuario (${me.username}) para confirmar`}</label>
      <input ref={conf} type="text" placeholder={me.username} />
      <label>Tu contraseña</label>
      <input ref={pw} type="password" autoComplete="current-password" />
      <div className="row" style={{ marginTop: 16 }}><div className="spacer" />
        <button className="btn ghost" onClick={close}>Cancelar</button>
        <button className="btn danger" disabled={busy} onClick={remove}>Sí, borrar todo</button>
      </div>
    </div>
  );
}
