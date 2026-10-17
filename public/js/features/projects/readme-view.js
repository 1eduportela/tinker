// Sección README del proyecto: se ve en Markdown y se edita con vista previa.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { markdown } from '../../core/markdown.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';

export function readmeView(project) {
  const box = h('section', { class: 'readme' });
  const view = () => {
    const bodyEl = h('div', { class: 'md' });
    if (project.readme.trim()) bodyEl.innerHTML = markdown(project.readme);
    else bodyEl.append(h('p', { class: 'muted' }, project.mine
      ? 'Este proyecto todavía no tiene README. Cuenta de qué va, cómo está hecho y qué te falta.'
      : 'Este proyecto todavía no tiene README.'));
    box.replaceChildren(
      h('div', { class: 'readme-head' }, icon('book'), h('b', {}, 'README.md'), h('span', { class: 'spacer' }),
        project.mine && h('button', { class: 'icon-btn', title: 'Editar README', onclick: edit }, icon('edit'))),
      bodyEl);
  };
  const edit = () => {
    let mode = 'write';
    const ta = h('textarea', { class: 'readme-ta', rows: 18, spellcheck: true }, project.readme);
    const preview = h('div', { class: 'md readme-preview' });
    const seg = h('div', { class: 'seg', style: 'width:240px' });
    const area = h('div');
    const paint = () => {
      seg.replaceChildren(
        h('button', { class: mode === 'write' ? 'active' : '', onclick: () => { mode = 'write'; paint(); } }, 'Escribir'),
        h('button', { class: mode === 'preview' ? 'active' : '', onclick: () => { mode = 'preview'; paint(); } }, 'Vista previa'));
      if (mode === 'preview') preview.innerHTML = markdown(ta.value) || '<p class="muted">Nada que mostrar todavía.</p>';
      area.replaceChildren(mode === 'write' ? ta : preview);
      if (mode === 'write') ta.focus();
    };
    const save = h('button', { class: 'btn' }, 'Guardar README');
    save.onclick = async () => {
      save.disabled = true;
      try { project.readme = (await api('PUT', `/api/projects/${project.id}`, { readme: ta.value })).project.readme; toast('README guardado'); view(); }
      catch (e) { toast(e.message); save.disabled = false; }
    };
    box.replaceChildren(
      h('div', { class: 'readme-head' }, icon('book'), h('b', {}, 'Editando README.md'), h('span', { class: 'spacer' }), seg),
      h('div', { class: 'readme-edit' }, area,
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('span', { class: 'muted', style: 'font-size:13px' }, 'Admite Markdown: # Títulos, **negrita**, *cursiva*, listas con -, `código` y [enlaces](https://…)'),
          h('span', { class: 'spacer' }), h('button', { class: 'btn ghost', onclick: view }, 'Cancelar'), save)));
    paint();
  };
  view();
  box.edit = edit;
  return box;
}
