// Ventana "Editar proyecto": nombre y descripción.
import { api } from '../../core/api.js';
import { h } from '../../core/dom.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function openEditProject(project, onSave) {
  const name = h('input', { type: 'text', maxlength: 60, value: project.name });
  const desc = h('textarea', { rows: 3, maxlength: 300 }, project.description);
  const btn = h('button', { class: 'btn' }, 'Guardar');
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const r = await api('PUT', `/api/projects/${project.id}`, { name: name.value, description: desc.value });
      m.close(); toast('Proyecto guardado'); onSave && onSave(r.project);
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  };
  const m = modal(h('div', {},
    h('h2', {}, 'Editar proyecto'),
    h('label', {}, 'Nombre'), name, h('label', {}, 'Descripción corta'), desc,
    h('div', { class: 'row', style: 'margin-top:16px' }, h('div', { class: 'spacer' }), btn)));
}
