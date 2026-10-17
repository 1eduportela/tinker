'use strict';
// Crea (o borra) tres perfiles de prueba en Tinker para ver cómo queda la red con contenido.
//   node demo/crear-perfiles-demo.js          -> crea los perfiles (si ya existían, los rehace)
//   node demo/crear-perfiles-demo.js --borrar -> los borra con todo su contenido
// Funciona aunque Tinker esté abierto.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch {
  console.error('\n  Tu version de Node.js es demasiado antigua. Instala la LTS desde https://nodejs.org\n'); process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const FILES = path.join(DATA, 'files');
const IMG = path.join(__dirname, 'img');
const DB_FILE = path.join(DATA, 'red.db');
const DAY = 86400000;
const now = Date.now();

if (!fs.existsSync(DB_FILE)) {
  console.error('\n  No encuentro la base de datos. Abre Tinker una vez ("Iniciar red social.bat") y vuelve a intentarlo.\n');
  process.exit(1);
}
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(FILES, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name);
const cols = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
if (!tables.includes('project_files') || !cols.includes('project_id')) {
  console.error('\n  La base de datos es de una version antigua. Abre la version nueva de Tinker una vez, cierrala y vuelve a intentarlo.\n');
  process.exit(1);
}

// ------------------------------------------------------------------ contenido
const PROFILES = [
  {
    username: 'luciafdz', displayName: 'Lucía Fernández', avatar: 'lucia_avatar.jpg', banner: 'lucia_banner.jpg',
    bio: 'Ingeniera aeroespacial · drones y sistemas embebidos',
    about: `¡Hola! Soy Lucía, ingeniera aeroespacial por la UPM y trabajo diseñando aviónica para UAV en Getafe.

En mi tiempo libre diseño y construyo drones desde cero: bastidor, electrónica y firmware. Me encanta medirlo todo y compartir los datos para que otros no tengan que empezar de cero.

Aquí vas a encontrar mis proyectos con planos, código y resultados de las pruebas. Si te sirve algo o tienes una idea, escríbeme por Contacto.`,
    projects: [
      {
        name: 'Cuadricóptero 5" de fibra de carbono', description: 'Dron FPV de 5 pulgadas diseñado desde cero: bastidor, controladora F7 y ajuste de PID.',
        readme: `# Cuadricóptero 5" de fibra de carbono

Dron FPV de **5 pulgadas** diseñado desde cero. El objetivo era bajar de **400 g** con batería y conseguir vuelos estables de más de 4 minutos.

## Especificaciones
- Bastidor en X de 226 mm, fibra de carbono de 5 mm en los brazos
- Controladora F7 propia (STM32F722 + ICM42688)
- Motores 2207 de 1950 KV y LiPo 4S de 1.500 mAh
- Peso al despegue: **386 g**

## Estado
1. Diseño del bastidor ✅
2. Controladora y firmware ✅
3. Ajuste de PID ✅
4. Cámara HD digital (en ello)

## Archivos
En \`cad/\` están los planos en DXF para cortar en CNC, y en \`firmware/\` la configuración de Betaflight que uso.

> Todo es libre: si lo construyes, ¡enséñamelo!`,
        files: {
          'cad/bastidor_x5_brazo.dxf': '0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nCORTE\n10\n0.0\n20\n0.0\n11\n113.0\n21\n0.0\n0\nENDSEC\n0\nEOF\n',
          'cad/placa_central.dxf': '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\nCORTE\n90\n4\n10\n0\n20\n0\n10\n70\n20\n0\n10\n70\n20\n90\n10\n0\n20\n90\n0\nENDSEC\n0\nEOF\n',
          'firmware/betaflight_cli.txt': '# Betaflight 4.5 · Cuadricóptero 5"\nset gyro_lpf1_static_hz = 250\nset dterm_lpf1_static_hz = 90\nset p_pitch = 52\nset i_pitch = 88\nset d_pitch = 42\nset p_roll = 48\nset i_roll = 84\nset d_roll = 38\nset motor_pwm_protocol = DSHOT600\nsave\n',
          'BOM.csv': 'pieza,modelo,cantidad,precio_eur\nMotor,2207 1950KV,4,72.00\nControladora,F7 propia,1,28.50\nESC,4en1 45A,1,49.90\nBateria,LiPo 4S 1500mAh,2,51.80\nHelices,5x4.3x3,8,6.40\nBastidor,Carbono 5mm,1,34.00\n',
          'pruebas/vuelo_07.csv': 't_s,altura_m,bateria_v\n0,0.0,16.80\n30,18.2,16.31\n60,27.5,15.92\n120,22.1,15.10\n180,29.4,14.32\n240,0.0,13.61\n',
        },
      },
      {
        name: 'Banco de empuje para motores brushless', description: 'Banco de pruebas con célula de carga para medir empuje, consumo y eficiencia de motor + hélice.',
        readme: `# Banco de empuje para motores brushless

Banco de pruebas para elegir la mejor combinación de **motor + hélice** con datos reales en vez de fiarme de las fichas técnicas.

## Qué mide
- Empuje con una célula de carga de 5 kg y un HX711
- Tensión y corriente con un INA226
- RPM con un sensor óptico

## Cómo se usa
1. Atornilla el motor al soporte
2. Conecta el ESP32 por USB y abre el panel web
3. Lanza la rampa automática de acelerador (0 → 100 % en 30 s)

Los resultados se exportan en CSV a la carpeta \`resultados/\`.`,
        files: {
          'firmware/banco_empuje.ino': '#include "HX711.h"\n#include <Wire.h>\n\nHX711 celula;\nconst float CALIBRACION = 412.7;\n\nvoid setup() {\n  Serial.begin(115200);\n  celula.begin(4, 5);\n  celula.set_scale(CALIBRACION);\n  celula.tare();\n}\n\nvoid loop() {\n  float empuje = celula.get_units(5);\n  Serial.printf("%.1f g\\n", empuje);\n  delay(50);\n}\n',
          'resultados/2207_5x43x3.csv': 'acelerador,empuje_g,corriente_a,eficiencia_gw\n10,42,0.6,4.2\n25,210,3.1,5.9\n50,610,11.8,3.2\n75,1050,24.5,2.6\n100,1452,38.9,2.3\n',
          'notas.md': '# Notas del banco\n\n- Calibrar la celula con una pesa de 1 kg antes de cada sesion.\n- Las vibraciones por encima del 80 % meten ruido: filtro de media movil de 5 muestras.\n',
        },
      },
    ],
    posts: [
      { p: 0, img: 'lucia_quad_plano.jpg', d: 52, title: 'Primer plano del bastidor en X', text: 'Bastidor de 226 mm entre ejes con brazos de 5 mm en carbono. He dejado sitio para una controladora de 30,5 × 30,5 y la batería arriba para bajar el centro de gravedad.' },
      { p: 0, img: 'lucia_quad_render.jpg', d: 46, title: 'Render del conjunto completo', text: 'Así queda montado en el CAD antes de mandar a cortar. 386 g calculados con batería; veremos cuánto pesa de verdad.' },
      { p: 0, img: 'lucia_fc_pcb.jpg', d: 40, title: 'Mi propia controladora de vuelo F7', text: 'Diseñada en KiCad: STM32F722, IMU ICM42688 y barómetro BMP280. Primera revisión con un error en el regulador de 3,3 V, ya corregido en la rev B.' },
      { p: 0, img: 'lucia_quad_kit.jpg', d: 33, title: 'Todo listo para montar', text: 'Motores 2207, ESC 4 en 1, dos LiPo 4S y las hélices. Este fin de semana toca soldar.' },
      { p: 1, img: 'lucia_banco_plano.jpg', d: 27, title: 'Diseño del banco de empuje', text: 'Para elegir hélice quería datos reales. El motor empuja una palanca que apoya en una célula de carga de 5 kg.' },
      { p: 1, img: 'lucia_hx711.jpg', d: 24, title: 'Esquema: célula de carga + HX711', text: 'El HX711 lee la célula y el ESP32 lo manda todo por WiFi a un panel web. Muy barato y sorprendentemente preciso tras calibrar.' },
      { p: 1, img: 'lucia_empuje.jpg', d: 18, title: 'Curvas de empuje de tres hélices', text: 'La 5×4,3×3 gana claramente: 1.452 g al 100 %. La de dos palas es más eficiente a bajas vueltas pero se queda corta arriba.' },
      { p: 1, img: 'lucia_eficiencia.jpg', d: 15, title: 'Dónde es más eficiente el motor', text: 'Máxima eficiencia en torno al 25 % de acelerador, que es justo donde vuela en crucero. Buena noticia para la autonomía.' },
      { p: 0, img: 'lucia_telemetria.jpg', d: 8, title: 'Vuelo de prueba #7: 4 minutos', text: 'Con la hélice elegida en el banco ya paso de los 4 minutos de vuelo tranquilo. La tensión baja de forma muy lineal.' },
      { p: 0, img: 'lucia_quad_render2.jpg', d: 3, title: 'Versión 2 con soporte para cámara HD', text: 'Siguiente paso: soporte inclinado a 30° para una cámara digital. Lo imprimo en TPU esta semana.' },
    ],
  },
  {
    username: 'marcsoler', displayName: 'Marc Soler', avatar: 'marc_avatar.jpg', banner: 'marc_banner.jpg',
    bio: 'Ingeniero mecánico · triatleta · Valencia',
    about: `Soy Marc, ingeniero mecánico en el sector de la automoción y triatleta popular desde hace seis años.

Me gusta aplicar la ingeniería al deporte: medir, analizar y, si hace falta, fabricarme yo mismo el material. Este año he preparado mi primer Ironman 70.3 y me he construido un rodillo inteligente para entrenar en casa.

Comparto planificación, datos y planos por si le sirven a alguien.`,
    projects: [
      {
        name: 'Ironman 70.3 Valencia 2026', description: 'Preparación de 16 semanas para mi primer medio Ironman: planificación, datos y resultado.',
        readme: `# Ironman 70.3 Valencia 2026

Mi primer **medio Ironman**: 1,9 km nadando, 90 km en bici y 21,1 km corriendo.

## Objetivo
Bajar de **4 h 45 min** sin reventar en la carrera a pie.

## Planificación
- 16 semanas en 4 bloques de 4 (3 de carga + 1 de descarga)
- Entre 8 y 13 horas semanales
- Test de FTP cada 4 semanas con el rodillo

## Resultado
**4:41:18** 🎉 · natación 31:05 · bici 2:31:40 · carrera 1:32:51

En \`planificacion/\` tienes el plan completo en CSV.`,
        files: {
          'planificacion/plan_16_semanas.csv': 'semana,bloque,natacion_km,bici_km,carrera_km,horas\n1,base,6,120,25,8.0\n2,base,7,140,28,9.0\n3,base,7,160,30,9.5\n4,descarga,5,90,18,6.0\n5,construccion,8,180,34,10.5\n',
          'planificacion/zonas_ftp.md': '# Zonas de potencia (FTP 265 W)\n\n| Zona | Rango |\n|---|---|\n| Z2 | 150-200 W |\n| Z3 | 200-240 W |\n| Z4 | 240-280 W |\n',
          'nutricion_carrera.txt': 'Bici: 1 gel cada 30 min + 750 ml de bebida isotonica por hora.\nCarrera: 1 gel en los km 5, 10 y 15. Agua en cada avituallamiento.\n',
        },
      },
      {
        name: 'Rodillo inteligente DIY', description: 'Rodillo de transmisión directa con freno magnético y medidor de potencia propio por Bluetooth.',
        readme: `# Rodillo inteligente DIY

Rodillo de **transmisión directa** con freno por corrientes de Foucault controlado por un servo, y un **medidor de potencia propio** que se conecta por Bluetooth a Zwift.

## Piezas principales
- Volante de inercia de 4,2 kg torneado en acero
- 12 imanes N52 en un soporte móvil
- nRF52840 + galgas extensiométricas en el eje

## Precisión
Comparado con un potenciómetro comercial: **±1,8 %** de error medio en series.

## Pendiente
- Simulación de pendientes por encima del 10 %
- Carcasa impresa en PETG`,
        files: {
          'firmware/potencia/main.c': '#include "ble_cps.h"\n#include "hx711.h"\n\n#define RADIO_BIELA_M 0.1725f\n\nint main(void) {\n  ble_cps_init();\n  hx711_init();\n  for (;;) {\n    float par = hx711_read_nm();\n    float cadencia = leer_cadencia_rpm();\n    float potencia = par * cadencia * 2.0f * 3.14159f / 60.0f;\n    ble_cps_send((uint16_t)potencia);\n  }\n}\n',
          'cad/volante_4kg.step': 'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((\'Volante de inercia 4,2 kg\'),\'2;1\');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n',
          'BOM.csv': 'pieza,cantidad,precio_eur\nVolante acero 4.2kg,1,38.00\nImanes N52 20x10,12,21.60\nServo MG996R,1,7.90\nnRF52840,1,24.00\nPerfil 2020,6,18.00\n',
        },
      },
    ],
    posts: [
      { p: 0, img: 'marc_entreno.jpg', d: 58, title: 'El plan: 16 semanas de preparación', text: 'Bloques de 3 semanas de carga y 1 de descarga. La línea amarilla es la carga media, que tiene que subir poco a poco sin dientes de sierra.' },
      { p: 1, img: 'marc_rodillo_plano.jpg', d: 50, title: 'Plano del rodillo inteligente', text: 'Transmisión directa con un volante de 240 mm y freno por corrientes de Foucault. Los imanes se acercan o alejan con un servo para cambiar la resistencia.' },
      { p: 1, img: 'marc_rodillo_kit.jpg', d: 44, title: 'Las piezas del rodillo', text: 'El volante lo he torneado en el taller de un amigo. Lo más caro han sido los imanes N52.' },
      { p: 1, img: 'marc_potencia_pcb.jpg', d: 37, title: 'Placa del medidor de potencia', text: 'nRF52840 con Bluetooth y ANT+, amplificador para las galgas y un regulador buck-boost para alimentarlo con una sola pila.' },
      { p: 1, img: 'marc_rodillo_render.jpg', d: 31, title: 'Rodillo montado en el CAD', text: 'La carcasa amarilla tapa el servo y la electrónica. Pesa 11 kg en total, más estable de lo que esperaba.' },
      { p: 1, img: 'marc_potencia.jpg', d: 23, title: 'Validando el medidor de potencia', text: 'Series de 3×4 min comparando con un potenciómetro comercial: ±1,8 % de error medio. Suficiente para entrenar con cabeza.' },
      { p: 0, img: 'marc_ruta_carrera.jpg', d: 16, title: 'Tirada larga por la Albufera', text: '21 km a ritmo objetivo. Llano total y con viento de cara a la vuelta, como en la carrera.' },
      { p: 0, img: 'marc_ritmo.jpg', d: 14, title: 'Análisis de la tirada larga', text: 'El ritmo se mantiene hasta el km 17 y luego cae un poco con el pulso subiendo. Toca trabajar la nutrición en los últimos kilómetros.' },
      { p: 0, img: 'marc_ruta_bici.jpg', d: 6, title: 'Reconociendo el circuito de bici', text: '90 km y apenas 600 m de desnivel. Circuito rápido: el truco va a ser ir acoplado todo el rato.' },
      { p: 0, img: 'marc_resultado.jpg', d: 1, title: '¡Terminado! 4:41:18 en mi primer 70.3', text: 'Objetivo cumplido: por debajo de 4:45. Gracias a todos los que me habéis aguantado hablando de vatios durante cuatro meses.' },
    ],
  },
  {
    username: 'irenenav', displayName: 'Irene Navarro', avatar: 'irene_avatar.jpg', banner: 'irene_banner.jpg',
    bio: 'Ingeniera electrónica · robótica e IoT',
    about: `Soy Irene, ingeniera electrónica y de automática. Trabajo en una empresa de automatización industrial en Zaragoza programando robots de verdad… y en casa los construyo a escala.

Me interesan la robótica, el control y el IoT de bajo consumo. Diseño mis propias placas y casi todo lo que hago es open source.

Si estás empezando con robótica o con KiCad, pregúntame lo que quieras.`,
    projects: [
      {
        name: 'Brazo robótico SCARA', description: 'Robot SCARA de sobremesa con tres ejes, motores paso a paso y control por cinemática inversa.',
        readme: `# Brazo robótico SCARA

Robot **SCARA** de sobremesa para pick & place de piezas pequeñas.

## Características
- Brazos de 150 + 125 mm → alcance de **275 mm**
- 3 motores NEMA 17 con drivers silenciosos TMC2209
- Eje Z con varilla roscada de 8 mm
- ESP32-S3 con cinemática inversa y control desde el navegador

## Precisión
Repetibilidad medida: **±0,15 mm** en 100 ciclos.

## Cómo empezar
\`\`\`
git clone https://github.com/irenenav/scara
cd scara/firmware && pio run -t upload
\`\`\``,
        files: {
          'firmware/src/cinematica.cpp': '#include <math.h>\n#include "cinematica.h"\n\nconst float L1 = 150.0f, L2 = 125.0f;\n\n// Cinematica inversa del SCARA (codo arriba)\nbool inversa(float x, float y, float &t1, float &t2) {\n  float d = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);\n  if (fabs(d) > 1) return false;\n  t2 = atan2(sqrt(1 - d * d), d);\n  t1 = atan2(y, x) - atan2(L2 * sin(t2), L1 + L2 * cos(t2));\n  return true;\n}\n',
          'firmware/platformio.ini': '[env:esp32s3]\nplatform = espressif32\nboard = esp32-s3-devkitc-1\nframework = arduino\nlib_deps = teemo/TMCStepper\n',
          'cad/brazo_1.stl': 'solid brazo_1\nendsolid brazo_1\n',
          'cad/brazo_2.stl': 'solid brazo_2\nendsolid brazo_2\n',
          'BOM.csv': 'pieza,cantidad,precio_eur\nNEMA 17 45Ncm,3,36.00\nTMC2209,3,15.00\nESP32-S3,1,9.50\nVarilla roscada 8mm,1,4.20\nPoleas GT2,4,6.00\nFuente 24V 5A,1,17.90\n',
        },
      },
      {
        name: 'Estación meteorológica solar', description: 'Estación autónoma con panel solar y LoRa que mide temperatura, humedad y presión cada 30 minutos.',
        readme: `# Estación meteorológica solar

Estación **autónoma** para la azotea: se alimenta con un panel de 1 W y envía los datos por **LoRa** a un receptor en casa.

## Sensores
- Temperatura, humedad y presión: BME280
- Tensión de batería y del panel

## Consumo
El ESP32-C3 duerme entre lecturas: **38 µA** de media. Con la batería LiFePO4 aguanta más de 10 días sin sol.

## Caja
Caja IP65 impresa en ASA con pantalla de radiación de 6 platos (\`cad/\`).`,
        files: {
          'firmware/main.py': 'import machine, time\nfrom bme280 import BME280\nfrom lora import LoRa\n\nsensor = BME280(machine.I2C(0))\nradio = LoRa()\n\nt, h, p = sensor.read()\nradio.send(f"T={t:.1f};H={h:.0f};P={p:.0f}")\nmachine.deepsleep(30 * 60 * 1000)\n',
          'cad/caja_ip65.step': 'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((\'Caja IP65 estacion meteo\'),\'2;1\');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n',
          'datos/azotea_72h.csv': 'hora,temperatura_c,humedad_pct,presion_hpa\n00:00,14.2,81,1016\n06:00,12.8,86,1015\n12:00,21.9,55,1014\n18:00,19.4,62,1013\n',
          'pcb/meteo_rev_b.kicad_pcb': '(kicad_pcb (version 20240108) (generator pcbnew)\n  (general (thickness 1.6))\n)\n',
        },
      },
    ],
    posts: [
      { p: 0, img: 'irene_scara_plano.jpg', d: 55, title: 'Empezamos: plano del SCARA', text: 'Brazos de 150 y 125 mm. He elegido SCARA porque es rápido en el plano y muy rígido en vertical, ideal para pick & place.' },
      { p: 0, img: 'irene_workspace.jpg', d: 49, title: 'Su espacio de trabajo', text: 'Simulé 5.000 posiciones con la cinemática directa. El hueco del centro es la zona que no alcanza por los límites de giro del codo.' },
      { p: 0, img: 'irene_scara_render.jpg', d: 42, title: 'Render del brazo', text: 'Columna en aluminio, brazos impresos en PETG con refuerzo de carbono. El amarillo es solo para que se vea bien en las fotos 😄' },
      { p: 0, img: 'irene_drivers.jpg', d: 36, title: 'Esquema de los drivers TMC2209', text: 'Tres TMC2209 controlados por UART desde el ESP32-S3. Son silenciosísimos y permiten detectar el final de carrera sin interruptores.' },
      { p: 0, img: 'irene_scara_kit.jpg', d: 30, title: 'Material para el montaje', text: 'NEMA 17, drivers, poleas GT2, una varilla de 8 mm y la fuente de 24 V. Menos de 90 € en total.' },
      { p: 1, img: 'irene_meteo_pcb.jpg', d: 22, title: 'Nueva placa para la estación meteo', text: 'ESP32-C3, BME280, cargador solar CN3791 y módulo LoRa. Toda la placa duerme a 38 µA.' },
      { p: 1, img: 'irene_caja_plano.jpg', d: 19, title: 'Caja estanca IP65', text: 'La caja va impresa en ASA para que aguante el sol. Junta tórica en la tapa y prensaestopas para el cable del sensor.' },
      { p: 1, img: 'irene_caja_render.jpg', d: 12, title: 'Así va a quedar en la azotea', text: 'Panel solar arriba y la pantalla de radiación al lado para que el sensor no marque de más al sol.' },
      { p: 1, img: 'irene_meteo.jpg', d: 7, title: 'Primeras 72 horas de datos', text: 'Funciona desde el primer día. Se ve perfectamente cómo sube la humedad de noche cuando baja la temperatura.' },
      { p: 1, img: 'irene_solar.jpg', d: 2, title: 'Balance energético: ¡autónoma!', text: 'Con un panel de solo 1 W la batería se recarga entera cada día. Prueba superada.' },
    ],
  },
];

// ------------------------------------------------------------------ utilidades
const DEMO = PROFILES.map(p => p.username);
const hashPassword = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function copyImage(file) {
  const name = crypto.randomBytes(12).toString('hex') + '.jpg';
  fs.copyFileSync(path.join(IMG, file), path.join(UPLOADS, name));
  return '/uploads/' + name;
}
const rm = p => { try { fs.rmSync(p); } catch {} };

function removeDemo() {
  const users = db.prepare(`SELECT id, avatar, banner FROM users WHERE username IN (${DEMO.map(() => '?').join(',')})`).all(...DEMO);
  for (const u of users) {
    for (const r of db.prepare('SELECT image FROM posts WHERE user_id = ? AND image IS NOT NULL').all(u.id)) rm(path.join(UPLOADS, path.basename(r.image)));
    for (const r of db.prepare('SELECT f.stored FROM project_files f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ?').all(u.id)) rm(path.join(FILES, r.stored));
    for (const img of [u.avatar, u.banner]) if (img) rm(path.join(UPLOADS, path.basename(img)));
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  }
  return users.length;
}

// ------------------------------------------------------------------ main
if (process.argv.includes('--borrar')) {
  const n = removeDemo();
  console.log(n ? `\n  Borrados ${n} perfiles de prueba con todo su contenido.\n` : '\n  No habia perfiles de prueba.\n');
  process.exit(0);
}

db.exec('BEGIN');
try {
  removeDemo();
  const ids = {};
  const projectIds = {};
  for (const p of PROFILES) {
    const salt = crypto.randomBytes(16).toString('hex');
    const info = db.prepare(`INSERT INTO users (username, display_name, bio, about, avatar, banner, pass_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.username, p.displayName, p.bio, p.about, copyImage(p.avatar), copyImage(p.banner),
      hashPassword(crypto.randomBytes(16).toString('hex'), salt), salt, now - 70 * DAY);
    ids[p.username] = Number(info.lastInsertRowid);
    projectIds[p.username] = p.projects.map((pr, i) => {
      const first = Math.max(...p.posts.filter(x => x.p === i).map(x => x.d)) + 2;
      const r = db.prepare('INSERT INTO projects (user_id, name, description, readme, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(ids[p.username], pr.name, pr.description, pr.readme, now - first * DAY);
      const pid = Number(r.lastInsertRowid);
      for (const [fp, content] of Object.entries(pr.files)) {
        const stored = crypto.randomBytes(16).toString('hex');
        const buf = Buffer.from(content, 'utf8');
        fs.writeFileSync(path.join(FILES, stored), buf);
        db.prepare('INSERT INTO project_files (project_id, path, size, stored, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(pid, fp, buf.length, stored, now - (first - 1) * DAY);
      }
      return pid;
    });
  }
  // Publicaciones en orden cronológico
  const all = PROFILES.flatMap(p => p.posts.map((x, i) => ({ ...x, user: p.username, idx: i,
    at: now - x.d * DAY - Math.floor(Math.random() * 10 * 3600000) })));
  all.sort((a, b) => a.at - b.at);
  for (const x of all) {
    db.prepare('INSERT INTO posts (user_id, project_id, title, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ids[x.user], projectIds[x.user][x.p], x.title, x.text, copyImage(x.img), x.at);
  }
  // Seguirse entre ellos y que los usuarios reales los sigan
  const real = db.prepare(`SELECT id FROM users WHERE username NOT IN (${DEMO.map(() => '?').join(',')})`).all(...DEMO).map(r => r.id);
  const follow = db.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)');
  for (const a of Object.values(ids)) for (const b of Object.values(ids)) if (a !== b) follow.run(a, b);
  for (const r of real) for (const d of Object.values(ids)) follow.run(r, d);
  // Un mensaje de bienvenida para cada usuario real
  for (const r of real) {
    db.prepare('INSERT INTO messages (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)')
      .run(ids.luciafdz, r, '¡Hola! Soy Lucía 👋 Acabo de subir los datos del banco de empuje. Si haces drones, échale un ojo y dime qué te parece.', now - 3600000);
  }
  db.exec('COMMIT');
  console.log(`
  Perfiles de prueba creados:
    - Lucia Fernandez (@luciafdz): drones
    - Marc Soler (@marcsoler): triatlon y rodillo inteligente
    - Irene Navarro (@irenenav): robotica y estacion meteo
  30 publicaciones, 6 proyectos con README y archivos, y un mensaje para ti.
  Los usuarios que ya tenias siguen a estos perfiles, asi que los veras en Inicio.

  Para quitarlos: "Borrar perfiles de prueba.bat"
`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error('\n  No se pudieron crear los perfiles:', e.message, '\n');
  process.exit(1);
}
