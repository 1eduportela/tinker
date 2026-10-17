# Tinker

*Cacharrando.* Una red social privada para compartir proyectos de ingeniería, deporte y lo que se te ocurra: mitad Instagram, mitad GitHub.

## Arrancar
1. Instala [Node.js](https://nodejs.org) (versión LTS).
2. Doble clic en `Iniciar red social.bat` (o `node server.js`).
3. Abre http://localhost:3000. El código de invitación aparece en la consola.

Sin dependencias: solo Node.js (usa el SQLite integrado).

## Estructura
- `server.js`: servidor y API.
- `public/`: la web (HTML, CSS y JS).
- `data/`: base de datos, fotos, archivos de los proyectos y configuración. **No se sube al repositorio.**

## Cómo funciona
- **Proyectos** (como en GitHub): archivos, README y Multimedia.
- **Publicaciones** (como en Instagram): foto, título y descripción. Siempre pertenecen a un proyecto y aparecen en su Multimedia.
- **Perfil**: banner, Bienvenida, Proyectos y Contacto (chat).
