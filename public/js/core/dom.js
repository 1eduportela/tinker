// h(): crea elementos de la página.  h('a', { href, class, onclick }, ...hijos)
// El texto siempre se mete como texto (nunca como HTML), así nadie puede colar código en un título o un mensaje.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
