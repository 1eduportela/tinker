// Ventana "Nuevo proyecto".
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function openNewProject(onCreate) {
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Brazo robótico, Media maratón 2026…' });
  const desc = h('textarea', { rows: 3, maxlength: 300, placeholder: 'De qué va, en una o dos frases (opcional)' });
  const btn = h('button', { class: 'btn' }, 'Crear proyecto');
  btn.onclick = async () => {
    if (!name.value.trim()) return toast('Ponle un nombre al proyecto');
    btn.disabled = true;
    try {
      const { project } = await api('POST', '/api/projects', { name: name.value, description: desc.value });
      m.close(); toast('Proyecto creado'); onCreate && onCreate(project);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Nuevo proyecto'),
    h('div', { class: 'muted' }, 'Cada proyecto es una carpeta donde irás guardando todo lo que hagas en él.'),
    h('label', {}, 'Nombre'), name, h('label', {}, 'Descripción'), desc,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), btn)));
  setTimeout(() => name.focus(), 50);
}
