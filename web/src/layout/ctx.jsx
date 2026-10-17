// Piezas para las opciones del menú lateral de cada página, y el título de página.
import { Icon } from '../ui/Icon.jsx';

export function CtxSection({ title, desc }) {
  return <>
    <div className="ctx-title">{title}</div>
    {desc && <p className="ctx-desc">{desc}</p>}
  </>;
}

export function CtxButton({ ic, label, onClick, primary }) {
  return <button className={'ctx-btn' + (primary ? ' primary' : '')} title={label} onClick={onClick}>
    <Icon name={ic} /><span className="lbl">{label}</span>
  </button>;
}

export const PageTitle = ({ children }) => <h1 className="page-title">{children}</h1>;
