/* Prompts para Claude que arma la guía con los datos del nodo y del equipo. */
(() => {
  "use strict";

  const dashboard = ({ cfg, actual, t, topic, datos }) => `Actuá como diseñador UX/UI y desarrollador frontend. Necesito el dashboard web del nodo "${cfg.nombre}" de nuestro proyecto escolar Smart Campus IoT (6to año).

CONTEXTO
- Nodo ESP32 instalado en: ${cfg.lugar}.
- Sensores: DHT22 (temperatura en °C y humedad en %) y ${cfg.sensor} (${cfg.variable.toLowerCase()} en ${cfg.unidad}).
- Los datos llegan por MQTT desde Mosquitto, por WebSockets (ws://IP-DEL-SERVIDOR:9001), en el tópico ${topic}.
- Ejemplo de mensaje: {"nodo":"${actual}-01","ts":"2026-11-02T10:42:05-03:00","temp":23.4,"hum":48,"${cfg.clave}":${cfg.tipo === "presencia" ? 32 : Math.round(datos.main[23])},"rssi":-58}

QUÉ TIENE QUE MOSTRAR (en este orden)
1. Encabezado: nombre del nodo, sector, estado "En línea / Desconectado" y hora del último dato.
2. Tres tarjetas: temperatura, humedad y ${cfg.variable.toLowerCase()} (destacada). Cada una con ícono SVG, valor grande, unidad, mini gráfico de tendencia y diferencia con hace 1 hora.
3. Semáforo de ${cfg.variable.toLowerCase()}: Normal ${t[0]}; Atención ${t[1]}; Alerta ${t[2]}.
   Temperatura: Normal 18 a 26 °C; Atención 16 a 18 o 26 a 30 °C; Alerta fuera de eso.
   Humedad: Normal 40 a 60 %; Atención 30 a 40 o 60 a 70 %; Alerta fuera de eso.
4. Gráfico histórico de las últimas 24 h con las franjas de umbral de fondo.
5. Lista de alertas con hora, nivel y motivo, y un mensaje cuando no hay alertas.
6. Salud del nodo: señal WiFi (RSSI), mensajes por minuto, tópico.

DISEÑO
- Tema oscuro: fondo #0A0E15, tarjetas #111824, bordes #233047, texto #E5EAF2 y #9BA7BB.
- Color de la variable principal: ${cfg.hex}. Temperatura #FB923C, humedad #38BDF8. Estados: #4ADE80, #FBBF24, #F87171.
- El color del semáforo siempre va con la palabra (Normal, Atención, Alerta) y un ícono.
- Contraste mínimo 4,5:1 (WCAG 2.2 AA), foco de teclado visible, números tabulares.
- Responsive: que funcione en 360 px, 768 px y 1440 px sin scroll horizontal.

TÉCNICO
- HTML, CSS y JavaScript sin frameworks, en archivos separados (index.html, styles.css, app.js), listo para GitHub Pages.
- MQTT.js desde CDN. Si no hay conexión, que arranque en "modo demo" con datos simulados y lo indique en pantalla.
- Si pasan más de 5 minutos sin datos, mostrar "Nodo desconectado" y marcar los valores como viejos.
- Validar el JSON recibido: ignorar valores vacíos o fuera del rango del sensor.
- Comentá el código en español para que podamos explicarlo en la defensa.

Al final, explicame en una lista corta qué hace cada archivo y qué tengo que cambiar para conectarlo a nuestro servidor.`;

  const documentacion = ({ eq, cu, nk, n }) => `Hola, Claude. Somos el ${eq} de ${cu}. Te adjunto los documentos que ya tenemos de nuestro proyecto institucional Smart Campus IoT. Nuestro nodo es "${n.nombre}" (nodoAsignado: "${nk}", sensor ${n.sensor}, instalado en ${n.lugar}).

QUÉ NECESITO
A partir de los documentos que ya tenemos del proyecto, creá la web de documentación usando la plantilla de documentación que compartió la profe:
- Web de la plantilla: https://lpedaci.github.io/sexto-proyecto2026/
- Código de la plantilla: https://github.com/lpedaci/sexto-proyecto2026
(Si no podés abrir los enlaces, usá los archivos index.html y datos.js que te adjunto.)

REGLAS
1. Respetá la estructura de la plantilla: 17 apartados en 4 partes (Presentación, Planificación, Diseño técnico, Seguimiento) más la Guía de uso. No cambies el diseño ni los nombres de los apartados.
2. Usá SOLO información que esté en nuestros documentos. No inventes nombres, fechas, precios, mediciones ni resultados.
3. Donde falte información, dejá el recuadro "A completar por el equipo" y decí qué dato falta.
4. Los datos estructurados van en assets/js/datos.js: nombre, bajada, equipo, curso, institucion, nodoAsignado, previewUrl, repoUrl, ganttSheetUrl, integrantes ("Apellido, Nombre" y rol: pm, desarrollo, aplicaciones o infraestructura), docentes, auditor, cambios, gantt, bom y pruebas.
5. Los textos largos (problema, objetivo del nodo, alcances, resultados) van en index.html, dentro del apartado que corresponde.
6. Escribí en español rioplatense, claro y en tercera persona del equipo. Sin rayas largas.
7. Si citás fuentes (datasheets, normas, umbrales), usá formato APA 7.ª edición, con cita en el texto y lista de referencias.
8. Agregá una fila en "cambios" con la fecha de hoy que diga que la documentación se armó a partir de los documentos del equipo.

QUÉ ME TENÉS QUE DEVOLVER
a) El archivo assets/js/datos.js completo.
b) Los fragmentos de index.html que cambiaste, indicando en qué apartado va cada uno (o el index.html completo).
c) Una tabla con: apartado, qué completaste, de qué documento nuestro salió, y qué falta todavía.
d) Los pasos para publicarlo en GitHub Pages.`;

  SmartCampus.guia.prompts = { dashboard, documentacion };
})();
