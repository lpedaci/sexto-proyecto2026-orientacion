/* Datos de la maqueta: nodos (mismos que la plantilla y la guía), posición en el plano y equipos. */
(() => {
  "use strict";
  const { enClase, bump } = SmartCampus.util;

  const NODOS = {
    aire:      { equipo: 1, nombre: "Calidad de aire", sector: "Aula Taller", corto: "Aula Taller", slug: "aula-taller", piso: 0, sensor: "MQ-7", variable: "CO", unidad: "ppm", icon: "aire", color: "var(--c-aire)", hex: "#a3e635", min: 0, max: 50, dec: 0, tipo: "max", u: { a: 9, b: 35 }, x: 559, y: 92, tOff: 2.2,
      serie: (h, r) => 3 + (enClase(h) ? 5 : 0) + 30 * bump(h, 10.5, .9) + 9 * bump(h, 14.5, 1) + r() * 2 },
    luz:       { equipo: 2, nombre: "Luminosidad", sector: "Aula 1", corto: "Aula 1", slug: "aula-1", sensor: "BH1750", variable: "Luz", unidad: "lx", icon: "luz", color: "var(--c-luz)", hex: "#fde68a", min: 0, max: 1000, dec: 0, tipo: "rango", u: { n: [300, 750], a: [150, 900] }, x: 270, y: 362, piso: 0, tOff: 0,
      serie: (h, r) => Math.max(0, 140 * Math.sin((h - 6) * Math.PI / 13)) + (enClase(h) ? 330 : 0) + r() * 25 },
    presencia: { equipo: 3, nombre: "Presencia", sector: "Lab. de Informática 3", corto: "Info 3 · presencia", slug: "lab-info-3", sensor: "PIR HC-SR501", variable: "Detecciones", unidad: "det/h", icon: "presencia", color: "var(--c-presencia)", hex: "#f472b6", min: 0, max: 60, dec: 0, tipo: "presencia", x: 500, y: 92, piso: 1, tOff: .6,
      serie: (h, r) => enClase(h) ? 22 + r() * 22 : (h === 21 ? 4 : 0) },
    luz3:      { equipo: 3, base: "luz", nombre: "Luminosidad", sector: "Lab. de Informática 3", corto: "Info 3 · luz", slug: "lab-info-3", sensor: "BH1750", variable: "Luz", unidad: "lx", icon: "luz", color: "var(--c-luz)", hex: "#fde68a", min: 0, max: 1000, dec: 0, tipo: "rango", u: { n: [300, 750], a: [150, 900] }, x: 600, y: 92, piso: 1, tOff: .6,
      serie: (h, r) => (enClase(h) ? 420 + r() * 60 : 0) + Math.max(0, 60 * Math.sin((h - 6) * Math.PI / 13)) + (h === 21 ? 380 : 0) },
    consumo:   { equipo: 4, nombre: "Consumo eléctrico", sector: "Lab. de Informática 3", corto: "Info 3 · consumo", slug: "lab-info-3", piso: 1, sensor: "SCT-013 · 18 PC, proyector y 4 luces", variable: "Potencia", unidad: "W", icon: "consumo", color: "var(--c-consumo)", hex: "#818cf8", min: 0, max: 4500, dec: 0, tipo: "max", u: { a: 3000, b: 3600 }, x: 700, y: 92, tOff: 3.4,
      // 18 PC (~110 W c/u en uso, ~5 W en reposo) + proyector (~250 W) + 4 luces LED de techo (~40 W c/u)
      serie: (h, r) => enClase(h) ? 18 * (95 + r() * 30) + 160 + (h >= 10 && h < 16 ? 250 : 0) + 900 * bump(h, 14, .45) : 18 * 5 + 30 + (h === 21 ? 160 : 0) + r() * 15 },
    ruido:     { equipo: 5, nombre: "Nivel sonoro", sector: "Hall central", corto: "Hall central", slug: "hall-central", sensor: "KY-037", variable: "Ruido", unidad: "dB", icon: "ruido", color: "var(--c-ruido)", hex: "#c084fc", min: 30, max: 90, dec: 0, tipo: "max", u: { a: 55, b: 70 }, x: 395, y: 212, piso: 0, tOff: -.8,
      serie: (h, r) => 36 + (enClase(h) ? 14 : 0) + 22 * bump(h, 10, .35) + 20 * bump(h, 12.5, .4) + 18 * bump(h, 15, .35) + r() * 4 },
    suelo:     { equipo: 6, nombre: "Humedad de suelo", sector: "Patio / huerta", corto: "Huerta", slug: "huerta", sensor: "Capacitivo v1.2", variable: "Suelo", unidad: "%", icon: "suelo", color: "var(--c-suelo)", hex: "#d4a373", min: 0, max: 100, dec: 0, tipo: "rango", u: { n: [40, 70], a: [25, 85] }, x: 865, y: 222, piso: 0, tOff: -3.5, exterior: true,
      serie: (h, r) => (h < 9 ? 46 - h * 1.6 : 78 - (h - 9) * 2.1) + (r() - .5) * 1.5 },
    red:       { equipo: 7, nombre: "Estado de red", sector: "Sala de servidores", corto: "Servidores", slug: "servidores", sensor: "ESP32 (ping + RSSI)", variable: "Latencia", unidad: "ms", icon: "red", color: "var(--c-red)", hex: "#2dd4bf", min: 0, max: 250, dec: 0, tipo: "max", u: { a: 50, b: 150 }, x: 72, y: 92, piso: 1, tOff: 1.2,
      serie: (h, r) => 14 + r() * 10 + (enClase(h) ? 12 : 0) + 95 * bump(h, 11, .4) + 170 * bump(h, 15, .3) }
  };
  const ORDEN = ["aire", "luz", "presencia", "luz3", "consumo", "ruido", "suelo", "red"];
  const NIVEL = [{ k: "ok", t: "Normal", i: "ok" }, { k: "warn", t: "Atención", i: "warn" }, { k: "bad", t: "Alerta", i: "bad" }];

  SmartCampus.tablero = { NODOS, ORDEN, NIVEL };
})();
