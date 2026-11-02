/* Datos de la guía: nodos y umbrales, reglas de tema oscuro, paleta, íconos, mapa de la plantilla y listas de control. */
(() => {
  "use strict";
  const { enClase, bump } = SmartCampus.util;

  /* ------------------------------------------------------------ variables y nodos */
  const BASE = {
    temp: { id: "temp", nombre: "Temperatura", sensor: "DHT22", unidad: "°C", icon: "temp", color: "var(--c-temp)", hex: "#fb923c", min: 10, max: 36, dec: 1, tipo: "rango", u: { n: [18, 26], a: [16, 30] },
      serie: (h, r) => 20 + 4 * Math.sin((h - 10) * Math.PI / 12) + (enClase(h) ? 1.2 : 0) + (r() - .5) * .6 },
    hum: { id: "hum", nombre: "Humedad", sensor: "DHT22", unidad: "%", icon: "hum", color: "var(--c-hum)", hex: "#38bdf8", min: 0, max: 100, dec: 0, tipo: "rango", u: { n: [40, 60], a: [30, 70] },
      serie: (h, r) => 54 - 9 * Math.sin((h - 10) * Math.PI / 12) + (r() - .5) * 3 }
  };

  const NODOS = {
    aire: { nombre: "Calidad de aire", corto: "Aire (CO)", sensor: "MQ-7", lugar: "Aula Taller", sector: "aula-taller", variable: "Monóxido de carbono", clave: "co_ppm",
      unidad: "ppm", icon: "aire", color: "var(--c-aire)", hex: "#a3e635", min: 0, max: 50, dec: 0, tipo: "max", u: { a: 9, b: 35 }, grafico: "area",
      nota: "El MQ-7 necesita precalentamiento y calibración: los valores son orientativos. Mostrá siempre la unidad ppm y el umbral.",
      serie: (h, r) => 3 + (enClase(h) ? 5 : 0) + 30 * bump(h, 10.5, .9) + 9 * bump(h, 14.5, 1) + r() * 2 },
    luz: { nombre: "Luminosidad", corto: "Luz", sensor: "BH1750", lugar: "Aula 1", sector: "aula-1", variable: "Iluminancia", clave: "lux",
      unidad: "lx", icon: "luz", color: "var(--c-luz)", hex: "#fde68a", min: 0, max: 1000, dec: 0, tipo: "rango", u: { n: [300, 750], a: [150, 900] }, grafico: "area",
      nota: "Un aula de clase necesita alrededor de 300 a 500 lx en el plano de trabajo. Luz encendida fuera de horario es un buen caso de alerta.",
      serie: (h, r) => Math.max(0, 140 * Math.sin((h - 6) * Math.PI / 13)) + (enClase(h) ? 330 : 0) + (h === 19 || h === 20 ? 320 : 0) + r() * 25 },
    ruido: { nombre: "Nivel sonoro", corto: "Ruido (dB)", sensor: "KY-037", lugar: "Hall central", sector: "hall-central", variable: "Nivel sonoro", clave: "db",
      unidad: "dB", icon: "ruido", color: "var(--c-ruido)", hex: "#c084fc", min: 30, max: 90, dec: 0, tipo: "max", u: { a: 55, b: 70 }, grafico: "area",
      nota: "El KY-037 estima el nivel: calibrenlo contra un decibelímetro (puede ser una app). Los recreos marcan picos claros.",
      serie: (h, r) => 36 + (enClase(h) ? 14 : 0) + 22 * bump(h, 10, .35) + 20 * bump(h, 12.5, .4) + 18 * bump(h, 15, .35) + r() * 4 },
    presencia: { nombre: "Presencia", corto: "Presencia (PIR)", sensor: "PIR HC-SR501", lugar: "Lab. de Informática 3", sector: "lab-info-3", variable: "Detecciones por hora", clave: "mov",
      unidad: "det/h", icon: "presencia", color: "var(--c-presencia)", hex: "#f472b6", min: 0, max: 60, dec: 0, tipo: "presencia", grafico: "barras",
      nota: "El PIR no identifica personas: solo detecta movimiento. Mostrá Ocupada o Libre en palabras y alertá si hay movimiento fuera de horario.",
      serie: (h, r) => enClase(h) ? 22 + r() * 22 : (h === 21 ? 4 : 0) },
    consumo: { nombre: "Consumo eléctrico", corto: "Consumo", sensor: "SCT-013 (pinza)", lugar: "Lab. de Informática 3", sector: "lab-info-3", variable: "Potencia", clave: "w",
      unidad: "W", icon: "consumo", color: "var(--c-consumo)", hex: "#818cf8", min: 0, max: 3000, dec: 0, tipo: "max", u: { a: 1500, b: 2500 }, grafico: "area",
      nota: "Usen pinza no invasiva y nunca intervengan la instalación de 220 V. Además de la potencia, muestren la energía del día en kWh.",
      serie: (h, r) => 160 + (enClase(h) ? 1100 + r() * 300 : r() * 40) + 1250 * bump(h, 14, .5) },
    suelo: { nombre: "Humedad de suelo", corto: "Suelo", sensor: "Capacitivo v1.2", lugar: "Patio / huerta", sector: "huerta", variable: "Humedad de suelo", clave: "suelo_pct",
      unidad: "%", icon: "suelo", color: "var(--c-suelo)", hex: "#d4a373", min: 0, max: 100, dec: 0, tipo: "rango", u: { n: [40, 70], a: [25, 85] }, grafico: "area",
      nota: "La humedad del suelo cambia lento: un gráfico de 24 h muestra bien el riego. La alerta útil es \"regar\" cuando baja del umbral.",
      serie: (h, r) => (h < 9 ? 46 - h * 1.6 : 78 - (h - 9) * 2.1) + (r() - .5) * 1.5 },
    red: { nombre: "Estado de red", corto: "Red (latencia)", sensor: "ESP32 (ping + RSSI)", lugar: "Sala de servidores", sector: "servidores", variable: "Latencia al servidor", clave: "lat_ms",
      unidad: "ms", icon: "red", color: "var(--c-red)", hex: "#2dd4bf", min: 0, max: 250, dec: 0, tipo: "max", u: { a: 50, b: 150 }, grafico: "area",
      nota: "No usa sensor extra. Muestren latencia y señal (RSSI en dBm) y distingan \"red lenta\" de \"nodo caído\".",
      serie: (h, r) => 14 + r() * 10 + (enClase(h) ? 12 : 0) + 95 * bump(h, 11, .4) + 170 * bump(h, 15, .3) }
  };
  const ORDEN = ["aire", "luz", "ruido", "presencia", "consumo", "suelo", "red"];

  const NIVEL = [
    { k: "ok", txt: "Normal", icon: "ok" },
    { k: "warn", txt: "Atención", icon: "warn" },
    { k: "bad", txt: "Alerta", icon: "bad" }
  ];

  /* ------------------------------------------------------------ reglas, paleta, íconos */
  const RULES = [
    ["layers", "Fondo gris azulado, no negro puro", "Usen un fondo cerca de #0A0E15 y superficies que se aclaran por capas. El negro puro con texto blanco cansa la vista y hace que los bordes \"vibren\"."],
    ["type", "Texto blanco roto", "El texto principal en #E5EAF2 y el secundario en #9BA7BB. Reserven el blanco puro para nada."],
    ["contrast", "Contraste mínimo 4,5:1", "Es el criterio AA de WCAG para texto normal (W3C, 2023). Los números grandes pueden bajar a 3:1, las etiquetas chicas no."],
    ["palette", "Un color por variable, siempre el mismo", "Si la temperatura es naranja, es naranja en la tarjeta, en el gráfico y en la leyenda. El color del sensor no se usa para estados."],
    ["ok", "Semáforo con palabra e ícono", "Verde, amarillo y rojo solo para estados. Siempre acompañados de \"Normal\", \"Atención\" o \"Alerta\", para quien no distingue colores."],
    ["tag", "Toda cifra con su unidad", "°C, %, ppm, dB, lx, W, ms. Un 23 suelto no dice nada. Usen números tabulares para que no salten al actualizarse."],
    ["clock", "Mostrar cuándo llegó el dato", "\"Hace 4 s\" o la hora exacta. Es la heurística de visibilidad del estado del sistema (Nielsen, 2024)."],
    ["wifiOff", "Diseñar el \"sin datos\"", "Prevean nodo desconectado, sensor que devuelve error y primera carga vacía. Probalo con el botón \"Simular desconexión\"."]
  ];

  const SW = [
    ["--bg", "#0a0e15", "Fondo"], ["--surface", "#111824", "Tarjeta"], ["--surface-2", "#172131", "Tarjeta elevada"], ["--border", "#233047", "Bordes"],
    ["--text", "#e5eaf2", "Texto"], ["--text-2", "#9ba7bb", "Texto secundario"], ["--ok", "#4ade80", "Normal"], ["--warn", "#fbbf24", "Atención"], ["--bad", "#f87171", "Alerta"],
    ["--c-temp", "#fb923c", "Temperatura"], ["--c-hum", "#38bdf8", "Humedad"], ["--c-aire", "#a3e635", "Calidad de aire"], ["--c-luz", "#fde68a", "Luminosidad"],
    ["--c-ruido", "#c084fc", "Ruido"], ["--c-presencia", "#f472b6", "Presencia"], ["--c-consumo", "#818cf8", "Consumo"], ["--c-suelo", "#d4a373", "Suelo"], ["--c-red", "#2dd4bf", "Red"]
  ];

  const ICON_LIST = [
    ["temp", "Temperatura", "°C", "var(--c-temp)"], ["hum", "Humedad", "%", "var(--c-hum)"], ["aire", "Calidad de aire", "ppm", "var(--c-aire)"],
    ["luz", "Luminosidad", "lx", "var(--c-luz)"], ["ruido", "Ruido", "dB", "var(--c-ruido)"], ["presencia", "Presencia", "det/h", "var(--c-presencia)"],
    ["consumo", "Consumo eléctrico", "W · kWh", "var(--c-consumo)"], ["suelo", "Humedad de suelo", "%", "var(--c-suelo)"], ["red", "Señal / red", "ms · dBm", "var(--c-red)"],
    ["bell", "Alertas", "", "var(--text-2)"], ["cpu", "Nodo ESP32", "", "var(--text-2)"], ["wifiOff", "Desconectado", "", "var(--bad)"]
  ];

  /* ------------------------------------------------------------ mapa de la plantilla */
  const MAPA = [
    ["1 · Presentación", [
      [1, "Control de cambios", "Una fila por cada cambio aprobado: versión, fecha real, responsable y detalle.", "Historial del repositorio, actas o mensajes con el Product Owner.", "datos.js → cambios"],
      [2, "Objetivo y visión general", "Qué hace su nodo dentro del sistema, en dos o tres oraciones.", "Anteproyecto.", "index.html"],
      [3, "Problema a resolver", "En qué sector se instala, qué se observa hoy y qué decisión va a poder tomar la escuela.", "Anteproyecto, relevamiento del sector.", "index.html"],
      [4, "Alcances", "Qué del Nivel 1 cumplen y qué del Nivel 2 encaran.", "Propuesta y acuerdos con el auditor.", "index.html"],
      [5, "Equipo e integrantes", "Nombres, roles y fotos cuadradas de 400 × 400 px.", "Lista del equipo.", "datos.js → integrantes, docentes"],
      [6, "Asignaturas involucradas", "Qué produjo el equipo en cada materia.", "Consignas y entregas de cada asignatura.", "index.html"]
    ]],
    ["2 · Planificación", [
      [7, "Planificación y Scrum", "Duración de los sprints, backlog y quién es Scrum Master.", "Tablero de tareas (Trello, GitHub Projects).", "datos.js → semanasPorSprint"],
      [8, "Carta Gantt", "La Gantt del equipo publicada desde Google Sheets.", "Planilla de la Gantt.", "datos.js → ganttSheetUrl, gantt"],
      [9, "Entregables e hitos", "Qué se entregó, cuándo y en qué estado.", "Gantt y cronograma de la materia.", "index.html"]
    ]],
    ["3 · Diseño técnico", [
      [10, "Arquitectura del sistema", "Recorrido del dato y servicios del servidor que usan.", "Diagrama del servidor (Sistemas Operativos).", "index.html"],
      [11, "Plano de diseño", "Esquema del nodo, tabla de conexiones y ubicación en la escuela.", "Fritzing o Tinkercad, fotos del protoboard.", "index.html"],
      [12, "Componentes", "Sensores reales con fotos propias de 1200 × 800 px.", "Datasheets y BOM.", "assets/img/componentes/"],
      [13, "Diseño de la aplicación", "Wireframe, capturas escritorio y móvil, paleta, logo y umbrales justificados.", "El dashboard de la Ruta A.", "index.html + previewUrl"]
    ]],
    ["4 · Seguimiento", [
      [14, "Presupuesto y BOM", "Cantidades y precios en pesos argentinos con la fecha del presupuesto.", "Presupuestos de proveedores.", "datos.js → bom"],
      [15, "Bitácora de pruebas", "Prueba, resultado esperado, resultado obtenido y estado.", "Cuaderno de laboratorio, capturas del monitor serie.", "datos.js → pruebas"],
      [16, "Resultados y mejoras", "Qué funcionó, qué no y qué harían en una segunda etapa.", "Conclusiones y devoluciones de los docentes.", "index.html"],
      [17, "Guía de uso", "Ya viene escrita. Revisen que los enlaces funcionen.", "La plantilla.", "index.html"]
    ]]
  ];

  /* ------------------------------------------------------------ listas de control */
  const CHECKS = {
    dash: [
      "Se ve bien en 360 px, 768 px y 1440 px, sin scroll horizontal.",
      "Cada valor tiene su unidad (°C, %, ppm, dB, lx, W, ms).",
      "El color del semáforo siempre va con palabra e ícono.",
      "El texto tiene contraste de 4,5:1 o más sobre el fondo.",
      "El fondo es gris azulado oscuro, no negro puro.",
      "Se ve la hora o la antigüedad del último dato.",
      "Si el nodo no publica por 5 min, aparece \"Desconectado\".",
      "Hay mensajes para \"sin alertas\" y \"sin datos todavía\".",
      "Probaron valores extremos: 0, el máximo del sensor y un JSON roto.",
      "Los umbrales coinciden con la tabla de la documentación.",
      "Se puede recorrer con el teclado y el foco se ve.",
      "Los gráficos tienen ejes con unidad y escala correcta."
    ],
    doc: [
      "Ningún dato es inventado; lo que falta dice \"A completar\".",
      "nodoAsignado en datos.js coincide con el nodo del equipo.",
      "Integrantes en formato \"Apellido, Nombre\" y con rol.",
      "El control de cambios tiene fechas reales.",
      "La Gantt de Google Sheets está publicada y se ve.",
      "Las fotos de componentes son propias.",
      "Los umbrales están justificados con fuentes en APA 7.",
      "previewUrl y repoUrl están cargados y abren.",
      "Está publicada en GitHub Pages y se ve bien en el celular.",
      "Cada integrante leyó la documentación y puede explicar su parte."
    ]
  };

  SmartCampus.guia = { BASE, NODOS, ORDEN, NIVEL, RULES, SW, ICON_LIST, MAPA, CHECKS };
})();
