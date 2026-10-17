// Desplegable de secciones (debajo del banner del perfil y de la cabecera del proyecto).
// sections: [{ key, label, ic }]; onPick(key) se llama al elegir otra.
import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

export function SectionDropdown({ current, sections, onPick }) {
  const [open, setOpen] = useState(false);
  const cur = sections.find(s => s.key === current);
  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  return (
    <div className="dd">
      <button className="dd-btn" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <Icon name={cur.ic} /><span>{cur.label}</span><span className="chev"><Icon name="chevron" /></span>
      </button>
      <div className="dd-menu" hidden={!open}>
        {sections.map(s => (
          <button key={s.key} className={'dd-item' + (s.key === current ? ' active' : '')}
            onClick={() => { setOpen(false); if (s.key !== current) onPick(s.key); }}>
            <Icon name={s.ic} />{s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
