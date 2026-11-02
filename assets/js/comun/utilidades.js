/* Espacio de nombres del sitio y utilidades compartidas. Se usan scripts clásicos (no módulos)
   para que las páginas también funcionen abiertas directamente desde el disco. */
window.SmartCampus = {};

(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v, d) => Number(v).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

  /* curvas de las series simuladas */
  const enClase = h => h >= 8 && h < 17;
  const bump = (h, c, w) => Math.exp(-((h - c) ** 2) / (2 * w * w));
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  SmartCampus.util = { $, $$, esc, store, reduceMotion, fmt, enClase, bump, rng };
})();
