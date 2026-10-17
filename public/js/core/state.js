// Estado compartido de la web.
//  - session.me: quién ha iniciado sesión (null si nadie). Es un objeto para que cualquier módulo pueda cambiarlo.
//  - onLeave(fn): algo que hay que apagar al salir de la página actual (temporizadores, escuchas...).
//  - rerender(): vuelve a pintar la página actual. La conecta el enrutador al arrancar, así ninguna
//    página necesita importar el enrutador (y no hay dependencias en círculo).

export const session = { me: null };

let leaveHandlers = [];
export function onLeave(fn) { leaveHandlers.push(fn); }
export function runLeaveHandlers() {
  const list = leaveHandlers;
  leaveHandlers = [];
  list.forEach(f => f());
}

let renderer = () => {};
export function setRenderer(fn) { renderer = fn; }
export function rerender() { return renderer(); }
