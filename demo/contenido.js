'use strict';
// Contenido de los perfiles de prueba de Tinker.
// Cada publicación tiene `imgs`: una imagen o varias (carrusel). `p` es el índice del proyecto y `d` hace cuántos días se publicó.

module.exports = [
  // ------------------------------------------------------------------ Lucía
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
          'firmware/betaflight_cli.txt': '# Betaflight 4.5 · Cuadricoptero 5"\nset gyro_lpf1_static_hz = 250\nset dterm_lpf1_static_hz = 90\nset p_pitch = 52\nset i_pitch = 88\nset d_pitch = 42\nset p_roll = 48\nset i_roll = 84\nset d_roll = 38\nset motor_pwm_protocol = DSHOT600\nsave\n',
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
      {
        name: 'Ala volante FPV de 1,2 m', description: 'Ala volante de espuma EPP para vuelos largos en FPV, con perfil propio y autopiloto INAV.',
        readme: `# Ala volante FPV de 1,2 m

Ala volante de **1.200 mm de envergadura** en espuma EPP reforzada con carbono, pensada para vuelos largos y tranquilos.

## Diseño
- Perfil MH45 modificado (12 % de espesor), estable sin cola
- Flecha de 28° y torsión de -2° en las puntas
- Elevones de 18 % de la cuerda

## Electrónica
- Controladora con INAV y GPS para volver a casa
- Motor 2814 de 900 KV con hélice 9×6 empujadora
- Li-ion 4S2P de 6.000 mAh → **más de 50 minutos** de vuelo

## Resultados del primer vuelo largo
Velocidad media de **68 km/h** y 10 minutos sin tocar el trimado.`,
        files: {
          'cad/ala_planta.dxf': '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\nCONTORNO\n0\nENDSEC\n0\nEOF\n',
          'perfil/mh45_mod.dat': 'MH45 modificado\n1.00000 0.00000\n0.75000 0.03100\n0.50000 0.05600\n0.25000 0.06900\n0.00000 0.00000\n0.25000 -0.03800\n0.50000 -0.03100\n1.00000 0.00000\n',
          'inav/config.txt': '# INAV 7 · ala volante\nset platform_type = FLYING_WING\nset nav_rth_altitude = 6000\nset fw_p_pitch = 18\nset fw_p_roll = 24\nsave\n',
        },
      },
    ],
    posts: [
      { p: 0, d: 58, imgs: ['lucia_quad_plano.jpg', 'lucia_quad_render.jpg'], title: 'Bastidor en X: del plano al CAD', text: 'Bastidor de 226 mm entre ejes con brazos de 5 mm en carbono. En la segunda foto, el conjunto montado en el CAD: 386 g calculados con batería.' },
      { p: 0, d: 49, imgs: ['lucia_fc_pcb.jpg'], title: 'Mi propia controladora de vuelo F7', text: 'Diseñada en KiCad: STM32F722, IMU ICM42688 y barómetro BMP280. La primera revisión tenía un error en el regulador de 3,3 V, ya corregido en la rev B.' },
      { p: 0, d: 43, imgs: ['lucia_quad_kit.jpg'], title: 'Todo listo para montar', text: 'Motores 2207, ESC 4 en 1, dos LiPo 4S y las hélices. Este fin de semana toca soldar.' },
      { p: 1, d: 37, imgs: ['lucia_banco_plano.jpg', 'lucia_hx711.jpg'], title: 'Diseño del banco de empuje', text: 'El motor empuja una palanca que apoya en una célula de carga de 5 kg. El HX711 la lee y el ESP32 lo manda todo por WiFi a un panel web.' },
      { p: 1, d: 30, imgs: ['lucia_empuje.jpg', 'lucia_eficiencia.jpg'], title: 'Resultados: tres hélices comparadas', text: 'La 5×4,3×3 gana claramente con 1.452 g de empuje. Y su máxima eficiencia está en torno al 25 % de acelerador, justo donde vuela en crucero.' },
      { p: 0, d: 24, imgs: ['lucia_telemetria.jpg'], title: 'Vuelo de prueba #7: 4 minutos', text: 'Con la hélice elegida en el banco ya paso de los 4 minutos de vuelo tranquilo. La tensión baja de forma muy lineal.' },
      { p: 2, d: 18, imgs: ['lucia_ala_plano.jpg', 'lucia_ala_perfil.jpg'], title: 'Nuevo proyecto: un ala volante', text: 'Después del cuadricóptero quería volar más tiempo. Ala de 1,2 m con perfil MH45 modificado: estable sin cola y con muy buen planeo.' },
      { p: 2, d: 12, imgs: ['lucia_ala_render.jpg'], title: 'El ala en el CAD', text: 'Espuma EPP con larguero de carbono de 8 mm. Los elevones en amarillo y el motor empujador detrás para que la cámara vea limpio.' },
      { p: 0, d: 7, imgs: ['lucia_quad_render2.jpg'], title: 'Versión 2 con soporte para cámara HD', text: 'Soporte inclinado a 30° para una cámara digital. Lo imprimo en TPU esta semana.' },
      { p: 2, d: 2, imgs: ['lucia_ala_vuelo.jpg'], title: 'Primer vuelo largo del ala', text: '10 minutos sin tocar el trimado y 68 km/h de media. Con la batería Li-ion debería superar los 50 minutos.' },
    ],
  },
  // ------------------------------------------------------------------ Marc
  {
    username: 'marcsoler', displayName: 'Marc Soler', avatar: 'marc_avatar.jpg', banner: 'marc_banner.jpg',
    bio: 'Ingeniero mecánico · triatleta · Valencia',
    about: `Soy Marc, ingeniero mecánico en el sector de la automoción y triatleta popular desde hace seis años.

Me gusta aplicar la ingeniería al deporte: medir, analizar y, si hace falta, fabricarme yo mismo el material. Este año he preparado mi primer Ironman 70.3, un maratón y me he construido un rodillo inteligente para entrenar en casa.

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
          'planificacion/zonas_ftp.md': '# Zonas de potencia (FTP 265 W)\n\n- Z2: 150-200 W\n- Z3: 200-240 W\n- Z4: 240-280 W\n',
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
Comparado con un potenciómetro comercial: **±1,8 %** de error medio en series.`,
        files: {
          'firmware/potencia/main.c': '#include "ble_cps.h"\n#include "hx711.h"\n\n#define RADIO_BIELA_M 0.1725f\n\nint main(void) {\n  ble_cps_init();\n  hx711_init();\n  for (;;) {\n    float par = hx711_read_nm();\n    float cadencia = leer_cadencia_rpm();\n    float potencia = par * cadencia * 2.0f * 3.14159f / 60.0f;\n    ble_cps_send((uint16_t)potencia);\n  }\n}\n',
          'cad/volante_4kg.step': "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Volante de inercia 4,2 kg'),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n",
          'BOM.csv': 'pieza,cantidad,precio_eur\nVolante acero 4.2kg,1,38.00\nImanes N52 20x10,12,21.60\nServo MG996R,1,7.90\nnRF52840,1,24.00\nPerfil 2020,6,18.00\n',
        },
      },
      {
        name: 'Maratón de Valencia 2026', description: 'Plan de 18 semanas para bajar de 3 horas en el maratón de Valencia.',
        readme: `# Maratón de Valencia 2026

Después del 70.3 quise probar el maratón. Objetivo: **bajar de 3 horas**.

## Plan
- 18 semanas, de 45 a 105 km por semana
- Tiradas largas progresivas hasta 32 km
- Series en pista los martes y ritmo de maratón los jueves

## Resultado
**2:58:41**, con la segunda mitad casi igual que la primera (1:28:50 / 1:29:51).`,
        files: {
          'plan_18_semanas.csv': 'semana,km,tirada_larga_km,sesion_clave\n1,48,16,6x1000 a 3:50\n2,52,18,ritmo maraton 10 km\n3,56,20,8x1000 a 3:48\n4,40,14,descarga\n',
          'ritmos.md': '# Ritmos objetivo\n\n- Maraton: 4:12-4:15 /km\n- Umbral: 3:55 /km\n- Rodaje: 4:50-5:10 /km\n',
        },
      },
    ],
    posts: [
      { p: 0, d: 60, imgs: ['marc_entreno.jpg'], title: 'El plan: 16 semanas de preparación', text: 'Bloques de 3 semanas de carga y 1 de descarga. La línea amarilla es la carga media, que tiene que subir poco a poco sin dientes de sierra.' },
      { p: 1, d: 52, imgs: ['marc_rodillo_plano.jpg', 'marc_rodillo_render.jpg'], title: 'Rodillo inteligente: plano y modelo 3D', text: 'Transmisión directa con un volante de 240 mm y freno por corrientes de Foucault. Los imanes se acercan o alejan con un servo para cambiar la resistencia.' },
      { p: 1, d: 46, imgs: ['marc_rodillo_kit.jpg'], title: 'Las piezas del rodillo', text: 'El volante lo he torneado en el taller de un amigo. Lo más caro han sido los imanes N52.' },
      { p: 1, d: 39, imgs: ['marc_potencia_pcb.jpg', 'marc_potencia.jpg'], title: 'Medidor de potencia: placa y validación', text: 'nRF52840 con Bluetooth y ANT+. Comparado con un potenciómetro comercial en series de 3×4 min: ±1,8 % de error medio.' },
      { p: 0, d: 30, imgs: ['marc_ruta_carrera.jpg', 'marc_ritmo.jpg'], title: 'Tirada larga por la Albufera', text: '21 km a ritmo objetivo. El ritmo aguanta hasta el km 17 y luego cae un poco con el pulso subiendo: toca trabajar la nutrición.' },
      { p: 0, d: 22, imgs: ['marc_ruta_bici.jpg'], title: 'Reconociendo el circuito de bici', text: '90 km y apenas 600 m de desnivel. Circuito rápido: el truco va a ser ir acoplado todo el rato.' },
      { p: 0, d: 16, imgs: ['marc_resultado.jpg'], title: '¡Terminado! 4:41:18 en mi primer 70.3', text: 'Objetivo cumplido: por debajo de 4:45. Gracias a todos los que me habéis aguantado hablando de vatios durante cuatro meses.' },
      { p: 2, d: 11, imgs: ['marc_maraton_plan.jpg'], title: 'Siguiente reto: maratón por debajo de 3 h', text: '18 semanas de plan. Las barras son los km de cada semana y la línea la tirada larga, que llega hasta los 32 km.' },
      { p: 2, d: 5, imgs: ['marc_maraton_ruta.jpg'], title: 'El recorrido del maratón de Valencia', text: 'Llano como una mesa: solo 38 m de desnivel positivo. Si no hace viento, es de los más rápidos de Europa.' },
      { p: 2, d: 1, imgs: ['marc_maraton_resultado.jpg', 'marc_maraton_ruta.jpg'], title: 'Sub 3 conseguido: 2:58:41', text: 'Segunda mitad casi clavada a la primera. El plan funcionó y las piernas también.' },
    ],
  },
  // ------------------------------------------------------------------ Irene
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
Repetibilidad medida: **±0,15 mm** en 100 ciclos.`,
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
El ESP32-C3 duerme entre lecturas: **38 µA** de media. Con la batería LiFePO4 aguanta más de 10 días sin sol.`,
        files: {
          'firmware/main.py': 'import machine, time\nfrom bme280 import BME280\nfrom lora import LoRa\n\nsensor = BME280(machine.I2C(0))\nradio = LoRa()\n\nt, h, p = sensor.read()\nradio.send(f"T={t:.1f};H={h:.0f};P={p:.0f}")\nmachine.deepsleep(30 * 60 * 1000)\n',
          'cad/caja_ip65.step': "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Caja IP65 estacion meteo'),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n",
          'datos/azotea_72h.csv': 'hora,temperatura_c,humedad_pct,presion_hpa\n00:00,14.2,81,1016\n06:00,12.8,86,1015\n12:00,21.9,55,1014\n18:00,19.4,62,1013\n',
        },
      },
      {
        name: 'Velocista seguidor de línea', description: 'Robot de competición que sigue una línea negra a toda velocidad, con control por curvatura.',
        readme: `# Velocista seguidor de línea

Robot para competiciones de **velocistas** (tipo OSHWDem). Sigue una línea negra de 19 mm lo más rápido posible.

## Hardware
- STM32G4 a 170 MHz
- Regleta de 8 sensores IR QTR-8A
- Motores N20 de 3.000 rpm con driver DRV8833
- 98 g en total

## Control
De un PID clásico a un control que **anticipa las curvas** con la curvatura estimada. Resultado: **−46 %** de tiempo por vuelta desde la primera versión.`,
        files: {
          'firmware/control.c': '#include "control.h"\n\n// Control por curvatura: anticipa la curva antes de llegar\nfloat control(float error, float curvatura) {\n  static float error_prev = 0;\n  float d = error - error_prev; error_prev = error;\n  return KP * error + KD * d + KC * curvatura;\n}\n',
          'pcb/velocista_rev_c.kicad_pcb': '(kicad_pcb (version 20240108) (generator pcbnew)\n  (general (thickness 1.6))\n)\n',
          'tiempos.csv': 'version,controlador,tiempo_vuelta_s\nv1,PID,21.4\nv2,PID ajustado,18.9\nv3,PID+filtro,16.2\nv4,PID+anticipacion,14.8\nv5,curvatura,13.1\nv6,curvatura+perfil,12.4\nv7,curvatura+perfil v2,11.6\n',
        },
      },
    ],
    posts: [
      { p: 0, d: 57, imgs: ['irene_scara_plano.jpg', 'irene_scara_render.jpg'], title: 'Empezamos: plano y render del SCARA', text: 'Brazos de 150 y 125 mm. SCARA porque es rápido en el plano y muy rígido en vertical, ideal para pick & place.' },
      { p: 0, d: 50, imgs: ['irene_workspace.jpg'], title: 'Su espacio de trabajo', text: 'Simulé 5.000 posiciones con la cinemática directa. El hueco del centro es la zona que no alcanza por los límites de giro del codo.' },
      { p: 0, d: 44, imgs: ['irene_drivers.jpg', 'irene_scara_kit.jpg'], title: 'Electrónica y material del brazo', text: 'Tres TMC2209 por UART desde un ESP32-S3: silenciosísimos y detectan el final de carrera sin interruptores. Todo el material por menos de 90 €.' },
      { p: 1, d: 36, imgs: ['irene_meteo_pcb.jpg'], title: 'Nueva placa para la estación meteo', text: 'ESP32-C3, BME280, cargador solar CN3791 y módulo LoRa. Toda la placa duerme a 38 µA.' },
      { p: 1, d: 31, imgs: ['irene_caja_plano.jpg', 'irene_caja_render.jpg'], title: 'Caja estanca IP65', text: 'Impresa en ASA para que aguante el sol, con junta tórica en la tapa. En la segunda foto, cómo quedará en la azotea.' },
      { p: 1, d: 25, imgs: ['irene_meteo.jpg', 'irene_solar.jpg'], title: 'Primeros datos y balance energético', text: 'Funciona desde el primer día. Y con un panel de solo 1 W la batería se recarga entera cada día: ¡autónoma!' },
      { p: 2, d: 18, imgs: ['irene_linebot_plano.jpg'], title: 'Nuevo proyecto: un velocista', text: 'Robot seguidor de línea para competición. 120 mm de ancho, regleta de 8 sensores IR delante y dos motores N20.' },
      { p: 2, d: 13, imgs: ['irene_linebot_pcb.jpg'], title: 'Placa del velocista', text: 'STM32G4, driver DRV8833 y regulador MP1584. La regleta QTR-8A va en una placa aparte unida con dos varillas.' },
      { p: 0, d: 8, imgs: ['irene_scara_render.jpg'], title: 'Repetibilidad del SCARA: ±0,15 mm', text: '100 ciclos de pick & place midiendo con un comparador. Mucho mejor de lo que esperaba para un brazo impreso.' },
      { p: 2, d: 3, imgs: ['irene_linebot_tiempos.jpg'], title: 'De 21,4 s a 11,6 s por vuelta', text: 'Siete versiones del controlador. El salto grande fue pasar a anticipar las curvas usando la curvatura estimada.' },
    ],
  },
  // ------------------------------------------------------------------ Pablo
  {
    username: 'pabloortega', displayName: 'Pablo Ortega', avatar: 'pablo_avatar.jpg', banner: 'pablo_banner.jpg',
    bio: 'Ingeniero industrial · fabricación digital · Bilbao',
    about: `Soy Pablo, ingeniero industrial. Trabajo como responsable de procesos en una empresa de mecanizado de Bilbao.

En mi taller construyo las máquinas con las que luego fabrico: una fresadora CNC, una impresora 3D CoreXY… y con ellas, cosas como un cuadro de bicicleta de bambú.

Me obsesionan la precisión y los procesos bien documentados. Todo lo que publico tiene sus planos y sus medidas.`,
    projects: [
      {
        name: 'Fresadora CNC de sobremesa', description: 'Fresadora de 300 × 400 mm con guías lineales, husillos de bolas y control GRBL.',
        readme: `# Fresadora CNC de sobremesa

Fresadora CNC de **300 × 400 mm** de área útil para mecanizar aluminio, madera y plásticos técnicos.

## Estructura
- Pórtico de aluminio 6082 de 15 mm atornillado
- Guías lineales HGR15 y husillos de bolas SFU1605
- Husillo refrigerado por aire de 800 W

## Electrónica
- 3 motores NEMA 23 con drivers DM542 a 48 V
- Control GRBL 1.1 con pantalla táctil

## Precisión
Error máximo medido en toda la mesa: **±0,04 mm**.`,
        files: {
          'cad/porticos_laterales.dxf': '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\nCORTE\n0\nENDSEC\n0\nEOF\n',
          'grbl/configuracion.txt': '$100=400.000 (X pasos/mm)\n$101=400.000 (Y pasos/mm)\n$102=400.000 (Z pasos/mm)\n$110=3000.000 (X vel max mm/min)\n$111=3000.000 (Y vel max mm/min)\n$112=1200.000 (Z vel max mm/min)\n',
          'mediciones/precision_mesa.csv': 'x_mm,y_mm,error_um\n0,0,21\n150,0,28\n300,0,22\n0,200,30\n150,200,49\n300,200,31\n0,400,20\n150,400,27\n300,400,23\n',
          'BOM.csv': 'pieza,cantidad,precio_eur\nNEMA 23 3Nm,3,96.00\nDM542,3,63.00\nGuias HGR15 (par),3,165.00\nSFU1605,3,84.00\nHusillo 800W,1,119.00\nFuente 48V,1,39.00\n',
        },
      },
      {
        name: 'Bicicleta de bambú', description: 'Cuadro de bicicleta de gravel en bambú con uniones de fibra de lino, diseñado y ensayado en casa.',
        readme: `# Bicicleta de bambú

Cuadro de **gravel** hecho con tubos de bambú Tonkin y uniones de **fibra de lino + epoxi**.

## Geometría
- Ángulo de sillín 73,5° y de dirección 71°
- Distancia entre ejes de 1.045 mm
- Peso del cuadro: **2,1 kg**

## Ensayos
Lo cargué lateralmente en el pedalier y lo comparé con un cuadro de acero y otro de aluminio. Resultado: **igual de rígido** que el de acero y mucho más cómodo.

## Primera salida
64,8 km por Urdaibai sin un solo crujido.`,
        files: {
          'geometria.csv': 'cota,valor\nangulo_sillin_deg,73.5\nangulo_direccion_deg,71.0\ndistancia_ejes_mm,1045\nlongitud_vainas_mm,430\ncaida_pedalier_mm,70\n',
          'ensayo_rigidez.csv': 'carga_n,bambu_mm,acero_mm,aluminio_mm\n200,0.22,0.27,0.32\n600,0.67,0.81,0.95\n1000,1.11,1.36,1.59\n1200,1.33,1.63,1.90\n',
          'proceso_uniones.md': '# Proceso de las uniones\n\n1. Lijar el bambu en la zona de la union.\n2. Rellenar con masilla epoxi para redondear.\n3. Enrollar fibra de lino impregnada en 8 capas.\n4. Envolver con cinta de compresion y curar 24 h.\n',
        },
      },
      {
        name: 'Impresora 3D CoreXY', description: 'Impresora CoreXY cerrada de 235 mm con Klipper, input shaping y placa de control propia.',
        readme: `# Impresora 3D CoreXY

Impresora **CoreXY** cerrada de 235 × 235 × 250 mm para imprimir piezas técnicas en ABS, ASA y nylon.

## Características
- Marco de perfil 2020 con escuadras mecanizadas en mi CNC
- Klipper con **input shaping** medido con acelerómetro
- Placa de control propia con STM32H723 y drivers TMC5160 / TMC2240

## Resultados
Resonancias en 48 Hz (X) y 61 Hz (Y). Con el input shaping imprime a **250 mm/s** sin ghosting.`,
        files: {
          'klipper/printer.cfg': '[printer]\nkinematics: corexy\nmax_velocity: 400\nmax_accel: 12000\n\n[input_shaper]\nshaper_freq_x: 48.2\nshaper_freq_y: 61.4\nshaper_type: mzv\n',
          'cad/escuadra_superior.stl': 'solid escuadra\nendsolid escuadra\n',
          'pcb/control_h723_rev_a.kicad_pcb': '(kicad_pcb (version 20240108) (generator pcbnew)\n  (general (thickness 1.6))\n)\n',
        },
      },
    ],
    posts: [
      { p: 0, d: 64, imgs: ['pablo_cnc_plano.jpg', 'pablo_cnc_render.jpg'], title: 'Fresadora CNC: plano y modelo 3D', text: 'Pórtico de aluminio de 15 mm, guías HGR15 y husillos de bolas en los tres ejes. 300 × 400 mm de área útil.' },
      { p: 0, d: 57, imgs: ['pablo_cnc_kit.jpg', 'pablo_cnc_esquema.jpg'], title: 'Material y electrónica de la fresadora', text: 'Tres NEMA 23 con drivers DM542 a 48 V y control GRBL. Lo más caro fueron las guías, pero no hay que escatimar ahí.' },
      { p: 0, d: 48, imgs: ['pablo_cnc_precision.jpg'], title: 'Mapa de precisión: ±0,04 mm', text: 'Medí 221 puntos con un comparador centesimal. El error crece un poco en el centro por la flexión del pórtico.' },
      { p: 1, d: 41, imgs: ['pablo_bici_plano.jpg'], title: 'Geometría del cuadro de bambú', text: 'Geometría de gravel: 73,5° de sillín, 71° de dirección y 1.045 mm entre ejes. Las uniones van con fibra de lino.' },
      { p: 1, d: 35, imgs: ['pablo_bici_kit.jpg', 'pablo_bici_ensayo.jpg'], title: 'Materiales y ensayo de rigidez', text: 'Bambú Tonkin, fibra de lino y epoxi. En el ensayo lateral sale igual de rígido que un cuadro de acero Cr-Mo.' },
      { p: 2, d: 28, imgs: ['pablo_corexy_plano.jpg'], title: 'Nueva impresora: cinemática CoreXY', text: 'Las dos correas trabajan juntas para mover X e Y: menos masa en movimiento y mucha más velocidad.' },
      { p: 1, d: 21, imgs: ['pablo_bici_ruta.jpg'], title: 'Primera salida con la bici de bambú', text: '64,8 km por Urdaibai y 890 m de desnivel sin un solo crujido. Absorbe las vibraciones mejor que mi bici de carbono.' },
      { p: 2, d: 14, imgs: ['pablo_corexy_render.jpg', 'pablo_corexy_pcb.jpg'], title: 'Estructura y placa de control', text: 'Marco de perfil 2020 con escuadras que mecanicé en la CNC. La placa la diseñé yo: STM32H723 con drivers TMC5160.' },
      { p: 2, d: 6, imgs: ['pablo_corexy_calibracion.jpg'], title: 'Input shaping: resonancias medidas', text: 'Con un ADXL345 en el cabezal: 48 Hz en X y 61 Hz en Y. Ahora imprime a 250 mm/s sin ghosting.' },
      { p: 0, d: 2, imgs: ['pablo_cnc_render.jpg', 'pablo_cnc_plano.jpg', 'pablo_cnc_precision.jpg'], title: 'La fresadora, un año después', text: 'Más de 300 horas de mecanizado y la precisión sigue igual. Resumen del proyecto en tres imágenes.' },
    ],
  },
  // ------------------------------------------------------------------ Sara
  {
    username: 'saradominguez', displayName: 'Sara Domínguez', avatar: 'sara_avatar.jpg', banner: 'sara_banner.jpg',
    bio: 'Ingeniera de telecomunicación · escaladora · Granada',
    about: `Soy Sara, ingeniera de telecomunicación. Trabajo en radiofrecuencia para satélites en una empresa del sector espacial en Granada.

Fuera del trabajo escalo y hago montaña siempre que puedo. Me gusta juntar las dos cosas: sensores para entrenar mejor, antenas para escuchar satélites desde la terraza y GPS en todas mis rutas.

Aquí comparto mis proyectos con todo el detalle técnico.`,
    projects: [
      {
        name: 'Fingerboard inteligente', description: 'Tabla de entrenamiento de escalada con 4 células de carga que mide la fuerza de cada mano por Bluetooth.',
        readme: `# Fingerboard inteligente

Tabla de entrenamiento para escalada con **4 células de carga de 100 kg** que miden la fuerza de cada mano en tiempo real.

## Hardware
- ESP32-S3 con Bluetooth de bajo consumo
- 4 amplificadores HX711, uno por célula
- Batería Li-ion con cargador BQ24074

## App
Una web en el móvil muestra la fuerza en directo y guarda cada sesión.

## Resultados
**+19 %** de fuerza máxima en 12 semanas de entrenamiento con datos.`,
        files: {
          'firmware/fingerboard.ino': '#include "HX711.h"\n#include <BLEDevice.h>\n\nHX711 celulas[4];\nconst int DT[4] = {4, 5, 6, 7};\n\nvoid loop() {\n  float izquierda = celulas[0].get_units() + celulas[1].get_units();\n  float derecha = celulas[2].get_units() + celulas[3].get_units();\n  enviarBLE(izquierda, derecha);\n}\n',
          'sesiones/2026-09.csv': 'fecha,ejercicio,izquierda_kg,derecha_kg\n2026-09-02,7s regleta 20mm,29.5,32.1\n2026-09-09,7s regleta 20mm,30.2,33.0\n2026-09-16,7s regleta 20mm,31.0,34.0\n',
          'cad/tabla_600mm.dxf': '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\nFRESADO\n0\nENDSEC\n0\nEOF\n',
        },
      },
      {
        name: 'Receptor de satélites NOAA', description: 'Antena Yagi casera y SDR para recibir imágenes de los satélites meteorológicos NOAA en 137 MHz.',
        readme: `# Receptor de satélites NOAA

Recibo las imágenes que emiten los satélites meteorológicos **NOAA** en **137 MHz** con una antena Yagi casera y un SDR de 30 €.

## Antena
- Yagi de 6 elementos en varilla de aluminio
- Ganancia calculada: 9,8 dBi
- Boom de 1.250 mm

## Recepción
- RTL-SDR v4 + SatDump para decodificar la señal APT
- Cada pase dura unos 14 minutos

## Resultado
Imágenes de la península en infrarrojo desde la terraza de casa.`,
        files: {
          'antena/yagi_137mhz.csv': 'elemento,longitud_mm,posicion_mm\nreflector,998,0\ndipolo,874,230\ndirector1,811,480\ndirector2,770,760\ndirector3,738,1000\ndirector4,718,1250\n',
          'satdump/config.json': '{\n  "receptor": "rtlsdr",\n  "frecuencia_mhz": 137.1,\n  "ganancia_db": 38.6,\n  "pipeline": "noaa_apt"\n}\n',
          'pases_proximos.txt': 'NOAA-19  14:02 - 14:16  elevacion max 75\nNOAA-18  19:41 - 19:55  elevacion max 42\nNOAA-15  21:10 - 21:23  elevacion max 28\n',
        },
      },
      {
        name: 'Aneto por el glaciar', description: 'Ascensión al techo de los Pirineos (3.404 m): preparación, material y datos de la ruta.',
        readme: `# Aneto por el glaciar

Ascensión al **Aneto (3.404 m)**, el pico más alto de los Pirineos, por la ruta normal desde La Besurta.

## Ruta
- La Besurta → Refugio de la Renclusa → Portillón Superior → glaciar → cima
- 16,4 km y **1.560 m** de desnivel positivo
- 9 h 12 min en total

## Material
Piolet, crampones, casco, arnés y cuerda para el glaciar. GPS con la traza cargada y baliza.

## Aviso
El Paso de Mahoma es corto pero muy expuesto: mejor con casco y sin prisas.`,
        files: {
          'aneto_ruta.gpx': '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Tinker">\n  <trk><name>Aneto por el glaciar</name>\n    <trkseg>\n      <trkpt lat="42.6431" lon="0.6567"><ele>1940</ele></trkpt>\n      <trkpt lat="42.6302" lon="0.6508"><ele>2140</ele></trkpt>\n      <trkpt lat="42.6312" lon="0.6567"><ele>3404</ele></trkpt>\n    </trkseg>\n  </trk>\n</gpx>\n',
          'material.md': '# Material\n\n- Piolet clasico de 60 cm\n- Crampones de 12 puntas\n- Casco y arnes\n- Cuerda de 30 m para el glaciar\n- GPS con la traza y baliza personal\n',
        },
      },
    ],
    posts: [
      { p: 0, d: 62, imgs: ['sara_finger_plano.jpg'], title: 'Diseñando una fingerboard con sensores', text: 'Tabla de 600 mm con regletas de 20, 15 y 10 mm. Debajo, cuatro células de carga de 100 kg para medir cada mano por separado.' },
      { p: 0, d: 55, imgs: ['sara_finger_pcb.jpg', 'sara_finger_esquema.jpg'], title: 'Placa y esquema de la fingerboard', text: 'ESP32-S3 con cuatro HX711, uno por célula. Todo funciona con una batería Li-ion y manda los datos al móvil por Bluetooth.' },
      { p: 0, d: 47, imgs: ['sara_finger_fuerza.jpg'], title: 'Primera medición: 65 kg en regleta de 20 mm', text: 'Suspensión de 7 segundos. Se ve claramente que tiro un 10 % más con la mano derecha: toca compensar.' },
      { p: 1, d: 40, imgs: ['sara_yagi_plano.jpg'], title: 'Antena Yagi para 137 MHz', text: 'Seis elementos en varilla de aluminio sobre un boom de 1.250 mm. Ganancia calculada de 9,8 dBi.' },
      { p: 1, d: 33, imgs: ['sara_noaa_pase.jpg', 'sara_noaa_espectro.jpg'], title: 'Siguiendo el pase del NOAA-19', text: 'Pase de 14 minutos con 75° de elevación máxima. En la segunda imagen, la señal: se ve el efecto Doppler cuando el satélite se aleja.' },
      { p: 1, d: 27, imgs: ['sara_noaa_imagen.jpg'], title: '¡Primera imagen recibida desde la terraza!', text: 'Canal infrarrojo del NOAA-19 decodificado con SatDump. Nubes sobre la península en tiempo real, con una antena casera.' },
      { p: 2, d: 20, imgs: ['sara_aneto_kit.jpg'], title: 'Material para el Aneto', text: 'Piolet, crampones, casco, arnés y cuerda de 30 m para el glaciar. Y la traza cargada en el GPS.' },
      { p: 2, d: 14, imgs: ['sara_aneto_ruta.jpg', 'sara_aneto_perfil.jpg', 'sara_aneto_resumen.jpg'], title: 'Cima del Aneto: 3.404 m', text: '16,4 km y 1.560 m de desnivel por el glaciar. En la cima, −8 °C y unas vistas increíbles de todo el Pirineo.' },
      { p: 0, d: 7, imgs: ['sara_finger_progreso.jpg'], title: '+19 % de fuerza en 12 semanas', text: 'Entrenar con datos funciona: cada semana sabía exactamente cuánto cargar. De 54 a 64 kg de fuerza máxima.' },
      { p: 1, d: 2, imgs: ['sara_noaa_imagen.jpg', 'sara_noaa_espectro.jpg'], title: 'Recibiendo ya cada día', text: 'He automatizado la recepción con una Raspberry Pi: graba todos los pases y decodifica las imágenes sola.' },
    ],
  },
];
