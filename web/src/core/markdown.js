// Markdown sencillo y seguro (se escapa todo el HTML)
export function markdown(src) {
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = t => {
    const codes = [];
    t = esc(t).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    t = t.replace(/!\[([^\]]*)\]\((\/uploads\/[^)\s]+|\/api\/files\/\d+[^)\s]*)\)/g, '<img alt="$1" src="$2">')
      // Imágenes de otras webs: la CSP (img-src 'self') no las deja cargar, y cargarlas le daría a esa web
      // la IP de quien lee. Se muestran como enlace.
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (_, alt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${alt || url}</a>`)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  };
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let out = '', para = [], list = null;
  const flushPara = () => { if (para.length) { out += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
  const flushList = () => { if (list) { out += `<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`; list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^```/.test(line)) {
      flushPara(); flushList();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      out += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
    } else if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushPara(); flushList(); out += '<hr>';
    } else if ((m = /^\s*[-*+]\s+(.*)$/.exec(line)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      flushPara();
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara(); flushList(); out += `<blockquote>${inline(m[1])}</blockquote>`;
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList(); para.push(line);
    }
  }
  flushPara(); flushList();
  return out;
}
