// Tinker - arranque de la web.
// Mapa del código (web/src/):
//   App.jsx    qué página se pinta según la dirección
//   core/      piezas sin interfaz: hablar con la API, sesión, dirección, formatos, Markdown
//   ui/        componentes reutilizables: iconos, avisos, ventanas, carrusel, desplegable, avatar
//   media/     fotos y vídeos: reducir, sacar la portada de un vídeo, subir con progreso
//   layout/    la estructura fija: menú lateral y menú de la cuenta
//   features/  cada parte de la red: acceso, inicio, publicaciones, personas, perfil, proyectos, chat, cuenta
//   styles/    los estilos, por tema (el orden de los import importa: los últimos mandan)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/posts.css';
import './styles/profile.css';
import './styles/projects.css';
import './styles/people.css';
import './styles/chat.css';
import './styles/account.css';
import './styles/auth.css';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
