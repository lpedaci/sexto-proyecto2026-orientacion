/* Lógica de la maqueta del tablero central: mapa, tarjetas, mapa de calor, alertas y tiempo real simulado. */
(() => {
  "use strict";
  const { $, $$, esc, reduceMotion, fmt, enClase, rng } = SmartCampus.util;
  const { svg: icon, ICONS } = SmartCampus.iconos;
  const { NODOS, ORDEN, NIVEL } = SmartCampus.tablero;
  const pad = n => String(n).padStart(2, "0");



  function estado(n, v, h) {
    if (n.tipo === "max") return v < n.u.a ? 0 : v < n.u.b ? 1 : 2;
    if (n.tipo === "rango") return (v >= n.u.n[0] && v <= n.u.n[1]) ? 0 : (v >= n.u.a[0] && v <= n.u.a[1]) ? 1 : 2;
    if (n.tipo === "presencia") return (v > 0 && !(h >= 7 && h < 18)) ? 2 : 0;
    return 0;
  }
  function textoEstado(n, lvl, v) {
    if (n.tipo === "presencia") return lvl === 2 ? "Fuera de horario" : (v > 0 ? "Ocupada" : "Libre");
    if (n.slug === "huerta" && v < n.u.n[0]) return lvl === 2 ? "Regar ya" : "Regar pronto";
    if (n.icon === "aire" && lvl > 0) return "Ventilar";
    return NIVEL[lvl].t;
  }

  const nowH = new Date().getHours();
  const horas = Array.from({ length: 24 }, (_, i) => (nowH - 23 + i + 24) % 24);
  const S = {};
  ORDEN.forEach((k, idx) => {
    const n = NODOS[k], r = rng(idx * 97 + 16), r2 = rng(idx * 31 + 7);
    S[k] = {
      main: horas.map(h => Math.min(n.max, Math.max(n.min, n.serie(h, r)))),
      temp: horas.map(h => 20 + n.tOff + 4 * Math.sin((h - 10) * Math.PI / 12) + (enClase(h) && !n.exterior ? 1.4 : 0) + (r2() - .5) * .8),
      hum: horas.map(h => 52 - 9 * Math.sin((h - 10) * Math.PI / 12) + (n.exterior ? 8 : 0) + (r2() - .5) * 3),
      ago: n.offline ? 7 * 60 + 12 : Math.floor(r2() * 8)
    };
  });
  const val = k => S[k].main[23];
  const nivelDe = k => NODOS[k].offline ? -1 : estado(NODOS[k], val(k), nowH);
  const valTxt = k => fmt(val(k), NODOS[k].dec);
  const agoTxt = s => s < 60 ? `hace ${s} s` : `hace ${Math.floor(s / 60)} min`;
  const pill = (lvl, txt) => lvl < 0 ? `<span class="pill off">${icon("off", "ic-sm")}Sin datos</span>` : `<span class="pill ${NIVEL[lvl].k}">${icon(NIVEL[lvl].i, "ic-sm")}${esc(txt || NIVEL[lvl].t)}</span>`;
  const stateColor = lvl => lvl < 0 ? "var(--off)" : `var(--${NIVEL[lvl].k})`;

  /* ---------------- render ---------------- */
  function spark(vals, color) {
    const w = 120, h = 40, p = 3, mn = Math.min(...vals), mx = Math.max(...vals), rg = (mx - mn) || 1;
    const pts = vals.map((v, i) => [p + i * (w - 2 * p) / (vals.length - 1), h - p - (v - mn) / rg * (h - 2 * p)]);
    const d = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
    const l = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d} L${l[0].toFixed(1)} ${h} L${p} ${h} Z" fill="${color}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="2.8" fill="${color}"/></svg>`;
  }

  function renderKpis() {
    const online = ORDEN.filter(k => !NODOS[k].offline);
    const activas = ORDEN.filter(k => nivelDe(k) > 0).length + ORDEN.filter(k => NODOS[k].offline).length;
    const tProm = online.reduce((a, k) => a + S[k].temp[23], 0) / online.length;
    const hProm = online.reduce((a, k) => a + S[k].hum[23], 0) / online.length;
    const K = [
      ["nodes", "var(--ok)", "Nodos en línea", `${online.length}<small>/ ${ORDEN.length}</small>`, ORDEN.filter(k => NODOS[k].offline).map(k => NODOS[k].corto + " sin datos").join(", ") || "Todos reportando"],
      ["bell", activas ? "var(--bad)" : "var(--ok)", "Alertas activas", `${activas}`, activas ? "Ver el semáforo por sector" : "Sin alertas"],
      ["temp", "var(--c-temp)", "Temperatura promedio", `${fmt(tProm, 1)}<small>°C</small>`, "Interior, nodos en línea"],
      ["hum", "var(--c-hum)", "Humedad promedio", `${fmt(hProm, 0)}<small>%</small>`, "Relativa, nodos en línea"],
      ["msg", "var(--accent)", "Mensajes MQTT", `${online.length * 12}<small>/ min</small>`, "Un mensaje cada 5 s por nodo"]
    ];
    $("#kpis").innerHTML = '<span class="anat">1</span>' + K.map(([i, c, t, v, s]) => `<div class="kpi" style="--c:${c}"><div class="kpi-top"><span class="ib">${icon(i, "ic-sm")}</span>${t}</div><div class="kpi-val">${v}</div><div class="kpi-sub">${esc(s)}</div></div>`).join("");
  }

  function renderMap() {
    const T = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" ${o.mid ? 'text-anchor="middle"' : ""} font-size="${o.size || 12}" fill="${o.fill || "var(--text-3)"}" ${o.op ? `opacity="${o.op}"` : ""} font-family="Geist Mono, monospace">${txt}</text>`;
    const room = (x, y, w, h, label, opts = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${opts.fill || "var(--surface-2)"}" stroke="var(--border-strong)" ${opts.dash ? 'stroke-dasharray="6 5"' : ""}/>` + T(x + 12, y + 22, label) + (opts.note ? T(x + w / 2, y + h / 2 + 8, opts.note, { mid: true, size: 11, op: .7 }) : "");
    const server = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="6 5"/>` + T(x + 12, y + 22, "SALA DE SERVIDORES", { fill: "var(--accent)" });
    const riser = (x, y, txt) => `<g><rect x="${x - 14}" y="${y - 14}" width="28" height="28" rx="7" fill="var(--surface-3)" stroke="var(--border-strong)"/><path d="M${x} ${y + 7}V${y - 7}M${x - 5} ${y - 2}l5-5 5 5" fill="none" stroke="var(--text-2)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>${T(x + 22, y + 4, txt, { size: 10.5 })}</g>`;
    const link = (n, to) => `<line x1="${n.x}" y1="${n.y}" x2="${to.x}" y2="${to.y}" stroke="${n.offline ? "var(--off)" : "var(--border-strong)"}" stroke-dasharray="${n.offline ? "2 6" : "4 4"}" stroke-width="1.3"/>`;
    const nodo = k => {
      const n = NODOS[k], lvl = nivelDe(k), col = stateColor(lvl);
      const lab = n.offline ? "sin datos" : `${valTxt(k)} ${n.unidad}`;
      let g = `<g class="node-g" data-k="${k}" tabindex="0" role="button" aria-label="${esc(n.nombre)}, ${esc(n.sector)}: ${esc(lab)}">`;
      if (!n.offline && !reduceMotion) g += `<circle class="halo" cx="${n.x}" cy="${n.y}" r="18" fill="none" stroke="${col}" stroke-width="2"/>`;
      g += `<circle class="ring" cx="${n.x}" cy="${n.y}" r="19" fill="var(--bg)" stroke="${col}" stroke-width="2.4"/>`;
      g += `<g transform="translate(${n.x - 10} ${n.y - 10}) scale(.8333)" fill="none" stroke="${n.offline ? "var(--off)" : n.hex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n.icon]}</g>`;
      g += `<rect x="${n.x - 46}" y="${n.y + 25}" width="92" height="22" rx="11" fill="var(--bg)" stroke="var(--border)"/>` + T(n.x, n.y + 40, esc(lab), { mid: true, size: 11.5, fill: n.offline ? "var(--text-3)" : "var(--text)" });
      return g + `</g>`;
    };
    const del = p => ORDEN.filter(k => NODOS[k].piso === p);
    const piso = (titulo, svg) => `<div class="floor"><p class="floor-h"><b>${titulo}</b></p>${svg}</div>`;

    // ---------- Planta baja ----------
    const RB = { x: 60, y: 62 };
    let pb = `<svg viewBox="0 0 960 460" role="img" aria-label="Planta baja con el estado de cada nodo">`;
    pb += `<rect x="20" y="20" width="750" height="435" rx="16" fill="none" stroke="var(--border)" stroke-width="2"/>`;
    pb += room(322, 30, 146, 135, "MULTI", { fill: "var(--surface)", note: "sin nodo" }) + room(478, 30, 162, 135, "AULA TALLER");
    pb += room(30, 178, 730, 84, "HALL CENTRAL", { fill: "var(--surface)" });
    pb += `<line x1="760" y1="220" x2="790" y2="220" stroke="var(--border-strong)" stroke-width="2" stroke-dasharray="3 4"/>` + T(775, 212, "salida", { mid: true, size: 9.5 });
    pb += room(150, 275, 240, 170, "AULA 1") + room(400, 275, 240, 170, "AULA 2", { note: "sin nodo" });
    pb += `<rect x="790" y="20" width="150" height="435" rx="14" fill="rgba(212,163,115,.06)" stroke="var(--c-suelo)" stroke-opacity=".55" stroke-dasharray="6 5"/>` + T(802, 44, "PATIO / HUERTA") + T(802, 60, "exterior", { size: 10.5, op: .75 });
    del(0).forEach(k => { pb += link(NODOS[k], RB); });
    pb += riser(RB.x, RB.y, "al servidor · 1er piso");
    del(0).forEach(k => { pb += nodo(k); });
    pb += "</svg>";

    // ---------- Primer piso ----------
    const SRV = { x: 152, y: 100 }, R1 = { x: 60, y: 200 };
    let p1 = `<svg viewBox="0 0 960 250" role="img" aria-label="Primer piso con el estado de cada nodo">`;
    p1 += `<rect x="20" y="20" width="750" height="220" rx="16" fill="none" stroke="var(--border)" stroke-width="2"/>`;
    p1 += server(30, 30, 160, 135);
    p1 += room(200, 30, 110, 135, "LAB. INFO 1", { note: "sin nodo" }) + room(320, 30, 110, 135, "LAB. INFO 2", { note: "sin nodo" }) + room(440, 30, 320, 135, "LABORATORIO DE INFORMÁTICA 3");
    p1 += room(30, 178, 730, 52, "", { fill: "var(--surface)" }) + T(395, 209, "PASILLO", { mid: true });
    del(1).forEach(k => { p1 += link(NODOS[k], SRV); });
    p1 += `<line x1="${R1.x}" y1="${R1.y}" x2="${SRV.x}" y2="${SRV.y}" stroke="var(--border-strong)" stroke-dasharray="4 4" stroke-width="1.3"/>`;
    p1 += riser(R1.x, R1.y, "desde planta baja");
    p1 += `<g><rect x="${SRV.x - 26}" y="${SRV.y - 20}" width="52" height="40" rx="8" fill="var(--surface-3)" stroke="var(--accent)"/>` + T(SRV.x, SRV.y + 4, "MQTT", { mid: true, size: 10.5, fill: "var(--text)" }) + T(SRV.x, SRV.y + 36, "servidor", { mid: true, size: 10.5 }) + `</g>`;
    del(1).forEach(k => { p1 += nodo(k); });
    p1 += "</svg>";

    $("#map").innerHTML = piso("Primer piso", p1) + piso("Planta baja", pb);
  }

  function renderSectors() {
    const order = ORDEN.slice().sort((a, b) => {
      const la = nivelDe(a), lb = nivelDe(b), ra = la < 0 ? 1.5 : la, rb = lb < 0 ? 1.5 : lb;
      return rb - ra;
    });
    $("#sectors").innerHTML = order.map(k => {
      const n = NODOS[k], lvl = nivelDe(k);
      const v = n.offline ? `<span class="v nulo">--</span>` : `<span class="v">${valTxt(k)}<small>${esc(n.unidad)}</small></span>`;
      return `<li style="--c:${n.color}"><span class="stripe" style="background:${stateColor(lvl)}"></span><span class="ib">${icon(n.icon, "ic-sm")}</span><span class="txt"><strong>${esc(n.sector)}</strong><span class="meta">${esc(n.nombre)} · Equipo ${n.equipo} · ${agoTxt(S[k].ago)}</span></span><span class="right">${v}${pill(lvl, lvl >= 0 ? textoEstado(n, lvl, val(k)) : null)}</span></li>`;
    }).join("");
  }

  function renderNodes() {
    $("#nodes").innerHTML = '<span class="anat">4</span>' + ORDEN.map(k => {
      const n = NODOS[k], lvl = nivelDe(k), d = S[k];
      const valHtml = n.offline ? `--<small>${esc(n.unidad)}</small>` : (n.tipo === "presencia" ? `${val(k) > 0 ? "Ocupada" : "Libre"}<small>${valTxt(k)} det/h</small>` : `${valTxt(k)}<small>${esc(n.unidad)}</small>`);
      return `<article class="ncard${n.offline ? " is-off" : ""}" id="card-${k}" style="--c:${n.color}">
        <div class="nc-top"><span class="ib">${icon(n.icon)}</span><div><h3>${esc(n.nombre)}</h3><p>${esc(n.sector)} · ${esc(n.sensor)}</p></div><span class="team-tag">Equipo ${n.equipo}</span></div>
        <div class="nc-mid"><div class="nc-val${n.tipo === "presencia" && !n.offline ? " txt" : ""}">${valHtml}</div>${spark(d.main.slice(n.offline ? -16 : -12, n.offline ? -4 : undefined), n.offline ? "#6c7890" : n.hex)}</div>
        <div class="nc-env"><span><span class="t">${icon("temp", "ic-sm")}</span>${n.offline ? "--" : fmt(d.temp[23], 1)} °C</span><span><span class="h">${icon("hum", "ic-sm")}</span>${n.offline ? "--" : fmt(d.hum[23], 0)} %</span></div>
        <div class="nc-foot"><span>${pill(lvl, lvl >= 0 ? textoEstado(n, lvl, val(k)) : null)}<span class="ago" data-ago="${k}">${agoTxt(d.ago)}</span></span><a class="btn go" href="index.html#dashboard" data-open="${n.base || k}">Abrir dashboard ${icon("arrow", "ic-sm")}</a></div>
      </article>`;
    }).join("");
  }

  function heatColor(t) {
    const stops = [[14, [27, 42, 68]], [18, [43, 90, 122]], [21, [74, 154, 140]], [25, [217, 180, 90]], [28, [251, 146, 60]], [32, [248, 113, 113]]];
    t = Math.max(14, Math.min(32, t));
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (t - t0) / (t1 - t0);
        return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * f)).join(",")})`;
      }
    }
    return "rgb(248,113,113)";
  }
  function renderHeat() {
    let s = `<span></span>` + horas.map((h, i) => `<span class="hr${i === 23 ? " last" : ""}">${i === 23 ? "ya" : (i % 3 === 2 && i < 21 ? pad(h) + " h" : "")}</span>`).join("");
    ORDEN.forEach(k => {
      const n = NODOS[k];
      s += `<span class="lab" style="--c:${n.color}">${icon(n.icon, "ic-sm")}${esc(n.corto)}</span>`;
      S[k].temp.forEach((t, i) => {
        const na = n.offline && i >= 20;
        s += na ? `<span class="cell na" title="${esc(n.corto)} ${pad(horas[i])} h: sin datos"></span>` : `<span class="cell" style="background:${heatColor(t)}" title="${esc(n.corto)} ${pad(horas[i])} h: ${fmt(t, 1)} °C"></span>`;
      });
    });
    $("#heat").innerHTML = s;
  }

  const feed = [];
  function hhmm(d = new Date()) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function addAlert(lvlKey, k, title, detail, when) {
    feed.unshift({ lvlKey, k, title, detail, when: when || hhmm() });
    feed.length = Math.min(feed.length, 9);
  }
  function renderFeed() {
    $("#feed").innerHTML = feed.map(a => {
      const n = NODOS[a.k];
      const ic = a.lvlKey === "off" ? "off" : a.lvlKey === "ok" ? "ok" : a.lvlKey === "warn" ? "warn" : "bad";
      return `<li class="${a.lvlKey}">${icon(ic, "ic-sm")}<span>${esc(a.title)}<small>${esc(n.sector)} · ${esc(a.detail)}</small></span><span class="t">${a.when}</span></li>`;
    }).join("");
    const act = ORDEN.filter(k => nivelDe(k) > 0).length + ORDEN.filter(k => NODOS[k].offline).length;
    $("#alertCount").textContent = `${act} activas`;
  }
  // historial inicial
  (() => {
    const base = new Date();
    const at = m => { const d = new Date(base.getTime() - m * 60000); return hhmm(d); };
    addAlert("ok", "ruido", "Ruido normalizado", "volvió a menos de 55 dB", at(52));
    addAlert("warn", "red", "Latencia alta", "92 ms al servidor", at(38));
    addAlert("ok", "red", "Latencia normalizada", "21 ms al servidor", at(31));
    addAlert("off", "consumo", "Nodo desconectado", "sin datos hace más de 5 min", at(64));
    addAlert("ok", "consumo", "Nodo reconectado", "volvió a publicar", at(57));
    ORDEN.forEach(k => { const l = nivelDe(k); if (l > 0) addAlert(NIVEL[l].k, k, `${NODOS[k].variable} ${valTxt(k)} ${NODOS[k].unidad}`, textoEstado(NODOS[k], l, val(k)), at(1)); });
  })();

  function renderTeams() {
    const equipos = [...new Set(ORDEN.map(k => NODOS[k].equipo))].sort((x, y) => x - y);
    const peor = ks => ks.map(nivelDe).reduce((m, l) => (l < 0 ? 1.5 : l) > (m < 0 ? 1.5 : m) ? l : m, 0);
    $("#teams").innerHTML = `<thead><tr><th>Equipo</th><th>Nodo</th><th>Sector</th><th>Estado</th><th>Publicación</th><th>Accesos</th></tr></thead><tbody>` + equipos.map(eq => {
      const ks = ORDEN.filter(k => NODOS[k].equipo === eq), n = NODOS[ks[0]], lvl = peor(ks);
      const kp = ks[0];
      const pub = eq % 3 === 0 ? `<span class="pill warn">${icon("warn", "ic-sm")}En desarrollo</span>` : `<span class="pill ok">${icon("ok", "ic-sm")}Publicado</span>`;
      const ref = ks.find(k => nivelDe(k) === lvl) || kp;
      return `<tr style="--c:${n.color}">
        <td><div class="who"><span class="ib">${icon(n.icon, "ic-sm")}</span><div><b>Equipo ${eq}</b><span>4 integrantes · 6to Informática</span></div></div></td>
        <td>${ks.map(k => esc(NODOS[k].nombre)).join(" + ")}<br><span class="sensor-meta">${ks.map(k => esc(NODOS[k].sensor)).join(" + ")}</span></td>
        <td>${esc(n.sector)}</td>
        <td>${pill(lvl, lvl >= 0 ? textoEstado(NODOS[ref], lvl, val(ref)) : null)}</td>
        <td>${pub}</td>
        <td><div class="links"><a class="btn go" href="index.html#dashboard" data-open="${n.base || kp}">${icon("chart", "ic-sm")}Dashboard</a><a class="btn" href="https://lpedaci.github.io/sexto-proyecto2026/" target="_blank" rel="noopener">${icon("docSimple", "ic-sm")}Documentación</a><a class="btn" href="https://github.com/lpedaci/sexto-proyecto2026" target="_blank" rel="noopener">${icon("code", "ic-sm")}Código</a></div></td>
      </tr>`;
    }).join("") + "</tbody>";
  }

  function renderAll() { renderKpis(); renderMap(); renderSectors(); renderNodes(); renderFeed(); }

  /* ---------------- interacción ---------------- */
  // "Abrir dashboard": la guía lee el nodo elegido desde localStorage
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-open]");
    if (a) { try { localStorage.setItem("orient-nodo", JSON.stringify(a.dataset.open)); } catch (err) {} }
  });
  function focusCard(k) {
    const c = document.getElementById("card-" + k); if (!c) return;
    c.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    c.classList.add("hl"); setTimeout(() => c.classList.remove("hl"), 1600);
  }
  $("#map").addEventListener("click", e => { const g = e.target.closest(".node-g"); if (g) focusCard(g.dataset.k); });
  $("#map").addEventListener("keydown", e => { const g = e.target.closest(".node-g"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); focusCard(g.dataset.k); } });
  $("#btnNotes").addEventListener("click", e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on);
    e.currentTarget.textContent = on ? "Ocultar notas de diseño" : "Ver notas de diseño";
    $("#board").classList.toggle("show-notes", on);
  });

  /* ---------------- tiempo real (simulado) ---------------- */
  let sinceMsg = 0, tick = 0;
  function clock() { const d = new Date(); $("#clock").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
  clock();
  setInterval(() => {
    clock(); tick++; sinceMsg++;
    ORDEN.forEach(k => { S[k].ago++; });
    if (tick % 2 === 0) {
      // llega un mensaje de un nodo al azar
      const online = ORDEN.filter(k => !NODOS[k].offline);
      const k = online[Math.floor(Math.random() * online.length)], n = NODOS[k], d = S[k];
      const prevLvl = nivelDe(k);
      if (n.tipo === "presencia") d.main[23] = Math.max(0, Math.round(d.main[23] + (Math.random() - .5) * 4));
      else d.main[23] = Math.min(n.max, Math.max(n.min, d.main[23] + (Math.random() - .5) * (n.max - n.min) * .03));
      d.temp[23] += (Math.random() - .5) * .2; d.hum[23] += (Math.random() - .5) * .8;
      d.ago = 0; sinceMsg = 0;
      const lvl = nivelDe(k);
      if (lvl !== prevLvl) addAlert(lvl === 0 ? "ok" : NIVEL[lvl].k, k, lvl === 0 ? `${n.variable} normalizado` : `${n.variable} ${valTxt(k)} ${n.unidad}`, lvl === 0 ? "volvió al rango normal" : textoEstado(n, lvl, val(k)));
      renderAll();
      const card = document.getElementById("card-" + k);
      if (card && !reduceMotion) { card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 900); }
    } else {
      $$("[data-ago]").forEach(el => { el.textContent = agoTxt(S[el.dataset.ago].ago); });
    }
    $("#lastMsg").textContent = `último mensaje hace ${sinceMsg} s`;
  }, 1000);

  /* ---------------- menú activo ---------------- */
  if ("IntersectionObserver" in window) {
    const links = $$(".top nav a");
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); }), { rootMargin: "-40% 0px -55% 0px" });
    ["resumen", "mapa", "nodos", "alertas", "equipos"].forEach(id => io.observe(document.getElementById(id)));
  }

  renderAll(); renderHeat(); renderTeams();
})();
