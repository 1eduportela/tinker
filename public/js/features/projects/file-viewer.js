// Visor de un archivo del proyecto: imagen, código con números de línea, Markdown, PDF o vídeo.
import { h } from '../../core/dom.js';
import { fmtSize } from '../../core/format.js';
import { markdown } from '../../core/markdown.js';
import { icon } from '../../ui/icons.js';
import { modal } from '../../ui/modal.js';
import { IMG_EXT, TEXT_EXT, extOf } from './file-types.js';

export function openFileViewer(f) {
  const name = f.path.split('/').pop();
  const ext = extOf(name);
  const body = h('div', { class: 'viewer-body' });
  const dl = h('a', { class: 'btn', href: `/api/files/${f.id}?as=download` }, icon('download'), ' Descargar');
  modal(h('div', { class: 'viewer' },
    h('div', { class: 'viewer-head' }, icon('file'), h('b', {}, f.path), h('span', { class: 'muted' }, fmtSize(f.size))),
    body, h('div', { class: 'row', style: 'margin-top:14px' }, h('span', { class: 'spacer' }), dl)), 'viewer-modal');
  if (IMG_EXT.has(ext)) body.append(h('img', { src: `/api/files/${f.id}`, alt: name }));
  else if (TEXT_EXT.has(ext) && f.size <= 1024 * 1024) {
    body.append(h('div', { class: 'muted' }, 'Cargando…'));
    fetch(`/api/files/${f.id}?as=text`).then(r => r.text()).then(t => {
      if (ext === 'md' || ext === 'markdown') { const md = h('div', { class: 'md' }); md.innerHTML = markdown(t); body.replaceChildren(md); }
      else {
        const lines = t.split('\n');
        body.replaceChildren(h('pre', { class: 'code' }, h('code', {}, ...lines.map((l, i) =>
          h('span', { class: 'ln' }, h('i', {}, i + 1), l + (i < lines.length - 1 ? '\n' : ''))))));
      }
    }).catch(() => body.replaceChildren(h('div', { class: 'muted' }, 'No se pudo abrir el archivo.')));
  } else if (ext === 'pdf') {
    body.append(h('iframe', { class: 'pdf', src: `/api/files/${f.id}`, title: name }));
  } else if (['mp4', 'webm'].includes(ext)) {
    body.append(h('video', { src: `/api/files/${f.id}`, controls: true }));
  } else {
    body.append(h('div', { class: 'viewer-none' }, icon('file'),
      h('p', {}, 'Este tipo de archivo no se puede ver aquí.'), h('p', { class: 'muted' }, 'Descárgalo para abrirlo con tu programa.')));
  }
}
