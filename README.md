# Tinker

*Cacharrando.* Una red social privada para compartir proyectos de ingeniería, deporte y lo que se te ocurra: mitad Instagram, mitad GitHub.

## Arrancar
1. Instala [Node.js](https://nodejs.org) (versión LTS).
2. Doble clic en `Iniciar red social.bat` (o `node server.js`).
3. Abre http://localhost:3000. El código de invitación aparece en la consola.

Sin dependencias: solo Node.js (usa el SQLite integrado).

## Estructura
```
server.js            arranque (llama a server/app.js)
server/              el servidor
  app.js             servidor HTTP: protecciones comunes y reparto de cada petición
  config.js          carpetas, límites, cuotas y data/config.json
  db.js              tablas de SQLite y migraciones
  http/              piezas HTTP: enrutador, leer peticiones, validar, archivos estáticos, cabeceras de seguridad
  security/          contraseñas, sesiones, límites de uso, bloqueo por fallos y registro de seguridad
  services/          lógica de cada tema, compartida entre rutas: usuarios, publicaciones, proyectos, fotos, espacio...
  routes/            la API, un archivo por tema (auth, account, posts, projects, files, messages...)
  lib/               utilidades sueltas (unidades, huellas SHA-256)
public/              la web
  index.html         página vacía que carga los estilos y js/main.js
  css/               estilos por tema (base, componentes, estructura, publicaciones, perfil, proyectos...)
  js/main.js         arranque de la web
  js/router.js       qué página se pinta según la dirección (#/u/..., #/p/...)
  js/core/           sin interfaz: crear elementos, API, estado compartido, formatos, Markdown
  js/ui/             componentes: iconos, ventanas, carrusel, desplegable, avisos, avatar
  js/media/          fotos y vídeos: reducir, portada de vídeo, subidas con progreso
  js/layout/         menú lateral fijo y menú de la cuenta
  js/features/       cada parte de la red: auth, feed, posts, people, profile, projects, chat, account
data/                base de datos, fotos, archivos de proyectos y configuración (no se sube al repositorio)
demo/                perfiles de prueba
tests/               pruebas de seguridad
```
Las dependencias van siempre en un sentido: rutas → servicios → base de datos, y páginas → componentes → núcleo.
Ningún módulo depende de otro que a su vez dependa de él.

## Cómo funciona
- **Proyectos** (como en GitHub): archivos, README y Multimedia.
- **Publicaciones** (como en Instagram): carrusel de hasta 10 fotos y vídeos (MP4, MOV o WebM, máx. 300 MB), título y descripción. Siempre pertenecen a un proyecto y aparecen en su Multimedia.
- **Perfil**: banner, Bienvenida, Proyectos y Contacto (chat).
- **Sin me gusta ni comentarios**, a propósito: así no hay interés en meter bots ni en perseguir números.

## Perfiles de prueba
`Crear perfiles de prueba.bat` añade cinco perfiles de ejemplo (Lucía, Marc, Irene, Pablo y Sara) con
3 proyectos y 10 publicaciones cada uno (varias en carrusel), README, archivos y un mensaje.
El contenido está en `demo/contenido.js`. `Borrar perfiles de prueba.bat` los quita.
Las imágenes se generan con `python3 demo/generar_imagenes.py`.

## Seguridad
- **Contraseñas**: scrypt con sal (32 MB por cálculo); mínimo 8 caracteres, sin contraseñas típicas.
  Las antiguas se re-cifran solas al iniciar sesión.
- **Inicio de sesión**: 5 fallos bloquean la cuenta 15 minutos; mismo tiempo de respuesta exista o no el usuario.
- **Sesiones**: clave aleatoria de 256 bits en cookie `HttpOnly` + `SameSite`; en la base de datos solo su huella.
  Caducan a los 30 días sin uso (180 como máximo). Se pueden ver y cerrar en *Cuenta y seguridad*.
- **Invitaciones**: códigos de un solo uso que caducan en 7 días; el código maestro también es de un solo uso.
- **Protección de la web**: CSP estricta, anti-clickjacking, CSRF (Origin + solo JSON), nosniff, sin Referer.
- **Archivos**: se comprueba el formato real de cada foto/vídeo; los archivos de proyecto nunca se ejecutan en
  el navegador; cuotas de 3 GB por persona y 1,5 GB al día; limpieza automática de archivos huérfanos.
- **Límites de uso** en registros, mensajes, publicaciones, subidas y peticiones en general.
- **Moderación**: bloquear usuarios; la primera cuenta es administradora y puede suspender cuentas y borrar contenido.
- **Registro**: `data/seguridad.log` apunta inicios de sesión, fallos, bloqueos y acciones de moderación.
- **Pruebas**: `node --test tests/seguridad.test.js` (o `Probar seguridad.bat`) ataca una copia temporal.

### Para publicarla en internet
Pon delante un intermediario con HTTPS (Cloudflare Tunnel, Caddy...) y cambia `"trustProxy": true` en
`data/config.json` para que Tinker use la IP real de cada visitante. Las cookies pasan a ser `Secure` solas.

### Variables de entorno opcionales
`PORT`, `TINKER_DATA` (carpeta de datos), `TINKER_QUOTA_MB`, `TINKER_DAILY_MB`, `TINKER_MIN_FREE_MB`,
`TINKER_REGISTER_PER_HOUR`.
