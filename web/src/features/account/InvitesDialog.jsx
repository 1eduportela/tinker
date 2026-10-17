// Ventana "Invitar a alguien": crear, ver y anular invitaciones de un solo uso.
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { useLoad } from '../../core/useLoad.js';
import { Icon } from '../../ui/Icon.jsx';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openInvites() {
  openModal(() => <Invites />);
}

async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { if (input) { input.select(); document.execCommand && document.execCommand('copy'); toast('Selecciónalo y cópialo con Ctrl+C'); } }
}

const LABEL = { pending: 'Pendiente', used: 'Usada', expired: 'Caducada' };
const day = (ts, opts) => new Date(ts).toLocaleDateString('es-ES', opts);

function Invites() {
  const [version, setVersion] = useState(0);
  const { data, error } = useLoad(() => api('GET', '/api/invites'), [version]);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const codeInput = useRef();

  const create = async () => {
    setBusy(true);
    try { setCreated(await api('POST', '/api/invites')); setVersion(v => v + 1); } catch (e) { toast(e.message); }
    setBusy(false);
  };
  const cancel = async id => {
    try { await api('DELETE', `/api/invites/${id}`); toast('Invitación anulada'); setVersion(v => v + 1); } catch (e) { toast(e.message); }
  };

  let box;
  if (error) box = <div className="error">{error.message}</div>;
  else if (!data) box = <div className="muted">Cargando…</div>;
  else box = <>
    <div className="row" style={{ margin: '6px 0 14px' }}><div className="spacer" />
      <button className="btn" disabled={busy} onClick={create}><Icon name="plus" /> Crear invitación</button></div>
    {data.invites.length ? <div className="sessions">
      {data.invites.map(x => (
        <div key={x.id} className="session">
          <span className="ficon"><Icon name="mail" /></span>
          <div className="session-txt">
            <b>{`TNK-····-··${x.hint}`}<span className={'tag ' + x.status}>{LABEL[x.status]}</span></b>
            <small className="muted">{x.status === 'used' ? `La usó @${x.usedBy || 'cuenta borrada'}`
              : x.status === 'pending' ? `Caduca el ${day(x.expiresAt)}` : `Caducó el ${day(x.expiresAt)}`}</small>
          </div>
          {x.status === 'pending' && <button className="btn ghost small" onClick={() => cancel(x.id)}>Anular</button>}
        </div>
      ))}
    </div> : <div className="muted">Aún no has creado ninguna invitación.</div>}
  </>;

  return (
    <div>
      <h2>Invitar a alguien</h2>
      <p className="muted">Cada invitación sirve para una sola persona y caduca en 7 días. Así, si un código se filtra, no puede usarlo nadie más. Puedes tener hasta 5 sin usar.</p>
      <div>{created && <div className="invite-new">
        <div className="muted" style={{ fontSize: 13 }}>Pásale este código. Solo se muestra ahora:</div>
        <div className="row" style={{ marginTop: 6 }}>
          <input ref={codeInput} type="text" value={created.code} readOnly className="invite-code" onFocus={e => e.target.select()} />
          <button className="btn ghost" onClick={() => copyText(created.code, codeInput.current)}><Icon name="copy" /> Copiar</button>
        </div>
        <small className="muted">{`Caduca el ${day(created.expiresAt, { day: 'numeric', month: 'long' })}`}</small>
      </div>}</div>
      <div>{box}</div>
    </div>
  );
}
