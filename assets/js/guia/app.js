/* Lógica de la guía: demo en vivo, selector de nodo, prompts, listas de control y navegación. */
(() => {
  "use strict";
  const { $, $$, esc, store, reduceMotion, fmt, rng } = SmartCampus.util;
  const { svg: svgIcon, raw: rawSvg } = SmartCampus.iconos;
  const { BASE, NODOS, ORDEN, NIVEL, RULES, SW, ICON_LIST, MAPA, CHECKS, codigo, prompts } = SmartCampus.guia;

  $("#featA").innerHTML = svgIcon("grid", "ic");
  $("#featB").innerHTML = svgIcon("doc", "ic");
  $("#featC").innerHTML = svgIcon("ok", "ic");



  function estado(cfg, v, h) {
    if (cfg.tipo === "max") return v < cfg.u.a ? 0 : v < cfg.u.b ? 1 : 2;
    if (cfg.tipo === "rango") {
      if (v >= cfg.u.n[0] && v <= cfg.u.n[1]) return 0;
      if (v >= cfg.u.a[0] && v <= cfg.u.a[1]) return 1;
      return 2;
    }
    if (cfg.tipo === "presencia") return (v > 0 && !(h >= 7 && h < 18)) ? 2 : 0;
    return 0;
  }
  function etiqueta(cfg, nivel, v, h) {
    if (cfg.tipo === "presencia") {
      if (nivel === 2) return "Movimiento fuera de horario";
      return v > 0 ? "Ocupada" : "Libre";
    }
    if (cfg.id === "suelo" && v < cfg.u.n[0]) return nivel === 2 ? "Regar ya" : "Regar pronto";
    if (cfg.id === "aire" && nivel > 0) return nivel === 2 ? "Alerta: ventilar" : "Atención: ventilar";
    return NIVEL[nivel].txt;
  }
  function pill(nivel, texto) {
    const n = NIVEL[nivel];
    return `<span class="pill ${n.k}">${svgIcon(n.icon, "ic-sm")}${esc(texto || n.txt)}</span>`;
  }

  /* ------------------------------------------------------------ datos simulados */
  const nowH = new Date().getHours();
  const horas = Array.from({ length: 24 }, (_, i) => (nowH - 23 + i + 24) % 24);
  function serie(cfg, seed) {
    const r = rng(seed);
    return horas.map(h => Math.min(cfg.max, Math.max(cfg.min, cfg.serie(h, r))));
  }

  let actual = store.get("orient-nodo", "aire");
  if (!NODOS[actual]) actual = "aire";
  let datos = {};
  let offline = false;
  let ultimo = 0;

  function cargarDatos() {
    const seed = ORDEN.indexOf(actual) * 97 + 13;
    datos = { temp: serie(BASE.temp, seed + 1), hum: serie(BASE.hum, seed + 2), main: serie(NODOS[actual], seed + 3) };
  }

  /* ------------------------------------------------------------ dibujos */
  function sparkline(vals, color) {
    const w = 110, h = 34, p = 3;
    const mn = Math.min(...vals), mx = Math.max(...vals), rg = (mx - mn) || 1;
    const pts = vals.map((v, i) => [p + i * (w - 2 * p) / (vals.length - 1), h - p - (v - mn) / rg * (h - 2 * p)]);
    const d = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d} L${last[0].toFixed(1)} ${h} L${p} ${h} Z" fill="${color}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
  }

  function niceTicks(min, max, n = 5) {
    const span = max - min, step0 = span / (n - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }

  function bandas(cfg) {
    const B = [];
    if (cfg.tipo === "max") {
      B.push([cfg.u.a, cfg.u.b, "warn"], [cfg.u.b, cfg.max, "bad"]);
    } else if (cfg.tipo === "rango") {
      B.push([cfg.min, cfg.u.a[0], "bad"], [cfg.u.a[0], cfg.u.n[0], "warn"], [cfg.u.n[1], cfg.u.a[1], "warn"], [cfg.u.a[1], cfg.max, "bad"]);
    }
    return B.map(([a, b, k]) => [Math.max(cfg.min, a), Math.min(cfg.max, b), k]).filter(([a, b]) => b > a);
  }

  function chart(cfg, vals) {
    const W = 640, H = 240, L = 46, R = 14, T = 12, Bm = 28;
    const iw = W - L - R, ih = H - T - Bm;
    const x = cfg.grafico === "barras" ? i => L + (i + .5) * iw / vals.length : i => L + i * iw / (vals.length - 1);
    const y = v => T + ih - (v - cfg.min) / (cfg.max - cfg.min) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.variable)} en las últimas 24 horas, en ${esc(cfg.unidad)}">`;
    bandas(cfg).forEach(([a, b, k]) => {
      s += `<rect x="${L}" y="${y(b).toFixed(1)}" width="${iw}" height="${(y(a) - y(b)).toFixed(1)}" fill="var(--${k})" fill-opacity=".07"/>`;
    });
    niceTicks(cfg.min, cfg.max).forEach(t => {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
      s += `<text x="${L - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--text-3)" font-family="Geist Mono, monospace">${fmt(t, 0)}</text>`;
    });
    horas.forEach((h, i) => {
      if (i % 4 === 3 || i === 0) {
        const lab = i === vals.length - 1 ? "ahora" : String(h).padStart(2, "0") + " h";
        s += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === vals.length - 1 ? "end" : "middle"}" font-size="11" fill="var(--text-3)" font-family="Geist Mono, monospace">${lab}</text>`;
      }
    });
    const col = cfg.hex;
    if (cfg.grafico === "barras") {
      const bw = iw / vals.length * .62;
      vals.forEach((v, i) => {
        const nv = estado(cfg, v, horas[i]);
        const fill = nv === 2 ? "var(--bad)" : col;
        s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, y(cfg.min) - y(v)).toFixed(1)}" rx="2" fill="${fill}" fill-opacity="${i === vals.length - 1 ? 1 : .7}"/>`;
      });
    } else {
      const pts = vals.map((v, i) => [x(i), y(v)]);
      let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
        d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      const gid = "g" + cfg.clave;
      s += `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".32"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`;
      s += `<path d="${d} L${x(vals.length - 1).toFixed(1)} ${y(cfg.min).toFixed(1)} L${L} ${y(cfg.min).toFixed(1)} Z" fill="url(#${gid})"/>`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`;
      const lp = pts[pts.length - 1];
      s += `<line x1="${lp[0].toFixed(1)}" x2="${lp[0].toFixed(1)}" y1="${T}" y2="${y(cfg.min).toFixed(1)}" stroke="${col}" stroke-opacity=".35" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="6" fill="var(--bg)" stroke="${col}" stroke-width="2.4"/>`;
    }
    return s + "</svg>";
  }

  function gauge(cfg, v, h) {
    const W = 240, cx = 120, cy = 118, r = 92, sw = 14;
    const ang = t => Math.PI * (1 - t);
    const pt = (t, rr = r) => [cx + rr * Math.cos(ang(t)), cy - rr * Math.sin(ang(t))];
    const arc = (t0, t1, color) => {
      const [x0, y0] = pt(t0), [x1, y1] = pt(t1);
      return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
    };
    const N = 60, cols = ["var(--ok)", "var(--warn)", "var(--bad)"];
    let s = `<svg viewBox="0 0 ${W} 136" aria-hidden="true">`;
    s += arc(0, 1, "var(--surface-3)");
    let start = 0, prev = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N, val = cfg.min + t * (cfg.max - cfg.min);
      const nv = estado(cfg, val, h);
      if (prev === null) prev = nv;
      if (nv !== prev || i === N) { s += `<g opacity=".85">${arc(start, t, cols[prev])}</g>`; start = t; prev = nv; }
    }
    const tv = Math.min(1, Math.max(0, (v - cfg.min) / (cfg.max - cfg.min)));
    const [mx, my] = pt(tv);
    s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9" fill="var(--bg)" stroke="var(--text)" stroke-width="3"/>`;
    s += `<text x="${pt(0)[0]}" y="${cy + 16}" text-anchor="middle" font-size="10.5" fill="var(--text-3)" font-family="Geist Mono, monospace">${fmt(cfg.min, 0)}</text>`;
    s += `<text x="${pt(1)[0]}" y="${cy + 16}" text-anchor="middle" font-size="10.5" fill="var(--text-3)" font-family="Geist Mono, monospace">${fmt(cfg.max, 0)}</text>`;
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ render */
  const mainCfg = () => Object.assign({ id: actual }, NODOS[actual]);

  function render() {
    const cfg = mainCfg();
    const dash = $("#dash");
    dash.style.setProperty("--c", cfg.color);
    dash.classList.toggle("is-off", offline);
    $("#demoUrl").textContent = `equipo.github.io/dashboard-${actual}`;
    $("#dashSide").innerHTML = `<span class="logo">${svgIcon("red", "ic-sm")}</span><span class="on">${svgIcon("grid")}</span><span>${svgIcon("chart")}</span><span>${svgIcon("bell")}</span><span>${svgIcon("cpu")}</span>`;
    $("#dIco").innerHTML = svgIcon(cfg.icon, "ic-lg");
    $("#dTitle").textContent = "Nodo " + cfg.nombre.toLowerCase();
    $("#dSub").textContent = `${cfg.lugar} · ${cfg.sensor} + DHT22`;

    const h = nowH;
    const mv = datos.main[23];
    const meta = offline
      ? `<span class="pill bad">${svgIcon("wifiOff", "ic-sm")}Desconectado</span><span class="pill mute">${svgIcon("clock", "ic-sm")}hace 6 min</span>`
      : `<span class="pill ok"><span class="live-dot"></span>En línea</span><span class="pill mute" id="agoPill">${svgIcon("clock", "ic-sm")}hace ${ultimo} s</span>`;
    $("#dMeta").innerHTML = meta;
    $("#offBanner").hidden = !offline;

    // KPIs
    const kp = [Object.assign({ main: false, vals: datos.temp }, BASE.temp), Object.assign({ main: false, vals: datos.hum }, BASE.hum), Object.assign({ main: true, vals: datos.main }, cfg)];
    const anatKpi = '<span class="anat">2</span>';
    $("#kpis").innerHTML = anatKpi + kp.map(k => {
      const v = k.vals[23], prevV = k.vals[22];
      const nv = estado(k, v, h);
      const diff = v - prevV;
      const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
      let valHtml = `${fmt(v, k.dec)}<small>${esc(k.unidad)}</small>`;
      if (k.tipo === "presencia") valHtml = `${v > 0 ? "Ocupada" : "Libre"}<small>${fmt(v, 0)} det/h</small>`;
      const pillTxt = offline ? null : etiqueta(k, nv, v, h);
      return `<div class="kpi${k.main ? " main" : ""}" style="--c:${k.color}">
        <div class="kpi-top"><span class="kpi-ico">${svgIcon(k.icon)}</span><span class="kpi-name">${esc(k.main ? k.variable : k.nombre)}<small>${esc(k.sensor)}</small></span>${offline ? '<span class="pill mute">Sin datos</span>' : pill(nv, pillTxt)}</div>
        <div class="kpi-row"><div><div class="kpi-val">${valHtml}</div><div class="kpi-delta">${sign}${fmt(Math.abs(diff), k.dec)} ${esc(k.unidad)} vs. hace 1 h</div></div>${sparkline(k.vals.slice(-12), k.hex)}</div>
      </div>`;
    }).join("");

    // Gráfico
    $("#chartTitle").textContent = `${cfg.variable} · últimas 24 h`;
    $("#chartSub").textContent = `${cfg.unidad} · una lectura por hora`;
    $("#chart").innerHTML = chart(cfg, datos.main);
    const leg = [`<span><i style="background:${cfg.hex}"></i>${esc(cfg.variable)}</span>`];
    if (cfg.tipo !== "presencia") leg.push(`<span><i class="zona-warn"></i>Zona de atención</span>`, `<span><i class="zona-bad"></i>Zona de alerta</span>`);
    else leg.push(`<span><i class="fuera"></i>Fuera de horario</span>`);
    $("#chartLegend").innerHTML = leg.join("");

    // Semáforo
    const nv = estado(cfg, mv, h);
    $("#gaugeSub").textContent = cfg.sensor;
    $("#gauge").innerHTML = gauge(cfg, mv, h) +
      `<div class="gauge-val">${cfg.tipo === "presencia" ? (mv > 0 ? "Ocupada" : "Libre") : fmt(mv, cfg.dec)}</div>
       <div class="gauge-unit">${cfg.tipo === "presencia" ? fmt(mv, 0) + " detecciones en la última hora" : esc(cfg.variable) + " en " + esc(cfg.unidad)}</div>
       ${offline ? '<span class="pill mute">Último valor recibido</span>' : pill(nv, etiqueta(cfg, nv, mv, h))}`;

    // Alertas
    const al = [];
    let prev = 0;
    datos.main.forEach((v, i) => {
      const e = estado(cfg, v, horas[i]);
      if (e > 0 && e !== prev) al.push({ h: horas[i], e, v });
      prev = e;
    });
    datos.temp.forEach((v, i) => { if (estado(BASE.temp, v, horas[i]) === 2 && (i === 0 || estado(BASE.temp, datos.temp[i - 1], horas[i - 1]) < 2)) al.push({ h: horas[i], e: 2, v, base: "temp" }); });
    let items = al.slice(-4).reverse().map(a => {
      const k = a.base ? BASE[a.base] : cfg;
      const txt = a.base ? `Temperatura ${fmt(a.v, 1)} °C` : (cfg.tipo === "presencia" ? "Movimiento fuera de horario" : `${cfg.variable} ${fmt(a.v, cfg.dec)} ${cfg.unidad}`);
      return `<li class="${NIVEL[a.e].k}">${svgIcon(NIVEL[a.e].icon, "ic-sm")}<span>${esc(txt)}<br><span class="kpi-delta">${NIVEL[a.e].txt}</span></span><span class="t">${String(a.h).padStart(2, "0")}:${String((a.h * 7) % 60).padStart(2, "0")}</span></li>`;
    });
    if (offline) items.unshift(`<li class="bad">${svgIcon("wifiOff", "ic-sm")}<span>Nodo sin datos hace más de 5 min<br><span class="kpi-delta">Alerta</span></span><span class="t">ahora</span></li>`);
    $("#alerts").innerHTML = items.length ? items.join("") : `<li class="empty">${svgIcon("ok", "ic-sm")}<span>Sin alertas en las últimas 24 h.</span></li>`;

    // Salud
    $("#healthSub").textContent = "firmware v1.2.0";
    $("#health").innerHTML = [
      ["Señal WiFi", offline ? "sin señal" : "−58 dBm · buena"],
      ["Encendido", offline ? "desconocido" : "3 d 4 h"],
      ["Mensajes", offline ? "0 / min" : "12 / min"],
      ["Tópico", `campus/${cfg.sector}/${actual}/telemetria`]
    ].map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("");

    renderSecundario();
  }

  /* ------------------------------------------------------------ selector */
  function renderPicker() {
    $("#picker").innerHTML = ORDEN.map(k => {
      const n = NODOS[k];
      return `<button class="chip" type="button" data-nodo="${k}" aria-pressed="${k === actual}" style="--c:${n.color}"><span class="dot">${svgIcon(n.icon, "ic-sm")}</span>${esc(n.corto)}</button>`;
    }).join("");
    $("#pickerNote").innerHTML = `${svgIcon("tag", "ic-sm")}<span><b>${esc(NODOS[actual].sensor)}</b> · ${esc(NODOS[actual].nota)}</span>`;
    $("#pickerNote").style.display = "flex"; $("#pickerNote").style.gap = "8px"; $("#pickerNote").style.alignItems = "baseline";
  }
  $("#picker").addEventListener("click", e => {
    const b = e.target.closest("[data-nodo]"); if (!b) return;
    elegir(b.dataset.nodo);
  });
  function elegir(k) {
    actual = k; store.set("orient-nodo", k);
    cargarDatos(); renderPicker(); render();
    if (typeof renderRail === "function") { heroK = k; renderHero(); renderRail(); }
    const sel = $("#fNodo"); if (sel && sel.value !== k) { sel.value = k; }
    renderPromptDoc();
  }

  $("#btnAnat").addEventListener("click", e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on);
    $("#dash").classList.toggle("show-anat", on);
  });
  $("#btnOff").addEventListener("click", e => {
    offline = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", offline);
    e.currentTarget.textContent = offline ? "Reconectar nodo" : "Simular desconexión";
    render();
  });

  /* ------------------------------------------------------------ "en vivo" */
  setInterval(() => {
    if (offline) return;
    ultimo += 1;
    if (ultimo >= 5) {
      ultimo = 0;
      const cfg = mainCfg(), r = Math.random;
      const jit = (arr, k, amp) => { const v = arr[23] + (r() - .5) * amp; arr[23] = Math.min(k.max, Math.max(k.min, v)); };
      jit(datos.temp, BASE.temp, .3); jit(datos.hum, BASE.hum, 1.2);
      if (cfg.tipo === "presencia") datos.main[23] = Math.max(0, Math.round(datos.main[23] + (r() - .5) * 4));
      else jit(datos.main, cfg, (cfg.max - cfg.min) * .02);
      render();
    } else {
      const p = $("#agoPill"); if (p) p.innerHTML = svgIcon("clock", "ic-sm") + `hace ${ultimo} s`;
    }
  }, 1000);

  /* ------------------------------------------------------------ secciones que dependen del nodo */
  function rangoTxt(cfg) {
    const u = cfg.unidad;
    if (cfg.tipo === "max") return [`menos de ${fmt(cfg.u.a, 0)} ${u}`, `${fmt(cfg.u.a, 0)} a ${fmt(cfg.u.b, 0)} ${u}`, `más de ${fmt(cfg.u.b, 0)} ${u}`];
    if (cfg.tipo === "rango") return [`${fmt(cfg.u.n[0], 0)} a ${fmt(cfg.u.n[1], 0)} ${u}`, `${fmt(cfg.u.a[0], 0)} a ${fmt(cfg.u.n[0], 0)} o ${fmt(cfg.u.n[1], 0)} a ${fmt(cfg.u.a[1], 0)} ${u}`, `menos de ${fmt(cfg.u.a[0], 0)} o más de ${fmt(cfg.u.a[1], 0)} ${u}`];
    return ["Ocupada o libre en horario escolar", "No aplica", "Movimiento fuera de horario (antes de 7 h o después de 18 h)"];
  }
  function renderSecundario() {
    const cfg = mainCfg();
    const filas = [Object.assign({ id: "temp" }, BASE.temp, { variable: "Temperatura interior" }), Object.assign({ id: "hum" }, BASE.hum, { variable: "Humedad relativa" }), cfg];
    filas.push({ variable: "Estado del nodo", sensor: "Firmware", icon: "red", color: "var(--text-2)", unidad: "", tipo: "custom", txt: ["Datos hace menos de 2 min", "2 a 5 min sin datos", "Desconectado: más de 5 min"] });
    $("#tablaUmbrales").innerHTML = `<thead><tr><th>Variable</th><th>Sensor</th><th><span class="pill ok">${svgIcon("ok", "ic-sm")}Normal</span></th><th><span class="pill warn">${svgIcon("warn", "ic-sm")}Atención</span></th><th><span class="pill bad">${svgIcon("bad", "ic-sm")}Alerta</span></th></tr></thead><tbody>` +
      filas.map(f => {
        const t = f.txt || rangoTxt(f);
        return `<tr><td><span class="var-cell" style="color:${f.color}">${svgIcon(f.icon, "ic-sm")}<span class="nombre">${esc(f.variable)}</span></span></td><td>${esc(f.sensor)}</td><td class="num">${esc(t[0])}</td><td class="num">${esc(t[1])}</td><td class="num">${esc(t[2])}</td></tr>`;
      }).join("") + "</tbody>";

    // código
    const ts = "2026-11-02T10:42:05-03:00";
    const mainVal = cfg.tipo === "presencia" ? 32 : +(datos.main[23]).toFixed(cfg.dec);
    const topic = `campus/${cfg.sector}/${actual}/telemetria`;
    $("#topicLabel").textContent = "tópico: " + topic;
    const ctxCodigo = { cfg, actual, topic, ts, mainVal, datos };
    $("#codeJson").innerHTML = codigo.json(ctxCodigo);
    $("#codeEsp").innerHTML = codigo.arduino(ctxCodigo);
    $("#codeWeb").innerHTML = codigo.web(ctxCodigo);
    $("#codeMos").innerHTML = codigo.mosquitto(ctxCodigo);

    renderPromptDash();
  }

  /* ------------------------------------------------------------ reglas, paleta, íconos */
  $("#rules").innerHTML = RULES.map(([i, t, d]) => `<div class="rule"><span class="ico">${svgIcon(i)}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></div>`).join("");

  $("#swatches").innerHTML = SW.map(([t, h, n]) => `<div class="sw"><i style="background:${h}"></i><div><span>${n}</span><code>${t}: ${h}</code></div></div>`).join("");
  $("#tokensCode").textContent = ":root {\n" + SW.map(([t, h, n]) => `  ${t}: ${h};`.padEnd(26) + `/* ${n} */`).join("\n") + "\n}";

  $("#icons").innerHTML = ICON_LIST.map(([k, n, u, c]) => `<div class="icon-card" style="--c:${c}"><span class="ico">${svgIcon(k, "ic-lg")}</span><div><strong>${n}</strong><br><span>${u || "interfaz"}</span></div><button class="btn sm" type="button" data-svg="${k}">Copiar SVG</button></div>`).join("");

  /* ------------------------------------------------------------ copiar */
  function copiar(text, btn, toastEl) {
    const done = ok => {
      const old = btn.textContent;
      btn.textContent = ok ? "Copiado" : "Seleccioná y copiá";
      if (toastEl) toastEl.textContent = ok ? "Listo para pegar en Claude" : "";
      setTimeout(() => { btn.textContent = old; if (toastEl) toastEl.textContent = ""; }, 1800);
    };
    try {
      navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    } catch (e) { done(false); }
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-copy]");
    if (b) { const el = $(b.dataset.copy); copiar(el.textContent, b); selectText(el); return; }
    const s = e.target.closest("[data-svg]");
    if (s) copiar(rawSvg(s.dataset.svg), s);
  });
  function selectText(el) { try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }

  /* ------------------------------------------------------------ pestañas */
  $$(".tab").forEach(t => t.addEventListener("click", () => {
    $$(".tab").forEach(o => { o.setAttribute("aria-selected", o === t); $("#" + o.getAttribute("aria-controls")).hidden = o !== t; });
  }));

  /* ------------------------------------------------------------ prompts */
  function renderPromptDash() {
    const cfg = mainCfg(), t = rangoTxt(cfg), topic = `campus/${cfg.sector}/${actual}/telemetria`;
    $("#promptDash").value = prompts.dashboard({ cfg, actual, t, topic, datos });
  }

  // selector del prompt de documentación
  $("#fNodo").innerHTML = ORDEN.map(k => `<option value="${k}">${esc(NODOS[k].nombre)} (${k})</option>`).join("");
  const saved = store.get("orient-doc", null);
  if (saved) { if (saved.equipo) $("#fEquipo").value = saved.equipo; if (saved.curso) $("#fCurso").value = saved.curso; }
  $("#fNodo").value = actual;

  function renderPromptDoc() {
    const eq = $("#fEquipo").value.trim() || "Equipo", cu = $("#fCurso").value.trim() || "6to año", nk = $("#fNodo").value, n = NODOS[nk];
    store.set("orient-doc", { equipo: eq, curso: cu });
    $("#promptDoc").value = prompts.documentacion({ eq, cu, nk, n });
  }
  ["#fEquipo", "#fCurso"].forEach(s => $(s).addEventListener("input", renderPromptDoc));
  $("#fNodo").addEventListener("change", e => { elegir(e.target.value); });
  $("#copyDoc").addEventListener("click", e => { copiar($("#promptDoc").value, e.currentTarget, $("#toastDoc")); $("#promptDoc").select(); });
  $("#copyDash").addEventListener("click", e => { copiar($("#promptDash").value, e.currentTarget, $("#toastDash")); $("#promptDash").select(); });

  /* ------------------------------------------------------------ bifurcación */
  $$(".fork button").forEach(b => b.addEventListener("click", () => {
    $$(".fork button").forEach(o => o.setAttribute("aria-pressed", o === b));
    $("#camino-claude").hidden = b.dataset.path !== "claude";
    $("#camino-manual").hidden = b.dataset.path !== "manual";
  }));

  /* ------------------------------------------------------------ mapa de la plantilla */
  $("#map").innerHTML = MAPA.map(([g, items]) => `<div class="map-col"><h3>${esc(g)}<span>${items.length} apartados</span></h3>${items.map(([n, t, q, f, a]) =>
    `<details><summary><span class="n">${String(n).padStart(2, "0")}</span><span>${esc(t)}</span></summary><div class="body"><span><b>Qué va:</b> ${esc(q)}</span><span><b>Fuente:</b> ${esc(f)}</span><span><b>Se edita en:</b> <code>${esc(a)}</code></span></div></details>`).join("")}</div>`).join("");

  /* ------------------------------------------------------------ checklists */
  $$(".checklist").forEach(box => {
    const key = box.dataset.list, list = CHECKS[key], sk = "orient-check-" + key;
    let marcados = store.get(sk, []);
    const ul = $("ul", box);
    ul.innerHTML = list.map((t, i) => `<li><label for="chk-${key}-${i}"><input type="checkbox" id="chk-${key}-${i}" data-i="${i}"${marcados.includes(i) ? " checked" : ""}><span>${esc(t)}</span></label></li>`).join("");
    const upd = () => {
      const n = marcados.length;
      $(".count", box).textContent = `${n} de ${list.length}`;
      $(".bar i", box).style.width = (n / list.length * 100) + "%";
    };
    ul.addEventListener("change", e => {
      const i = +e.target.dataset.i;
      marcados = e.target.checked ? [...new Set([...marcados, i])] : marcados.filter(x => x !== i);
      store.set(sk, marcados); upd();
    });
    $("[data-reset]", box).addEventListener("click", () => { marcados = []; store.set(sk, []); $$("input", ul).forEach(c => c.checked = false); upd(); });
    upd();
  });

  /* ------------------------------------------------------------ hero: nodo de ejemplo + galería */
  const ultimoValor = k => serie(NODOS[k], ORDEN.indexOf(k) * 97 + 13 + 3)[23];
  const valorTxt = (k, v) => NODOS[k].tipo === "presencia" ? fmt(v, 0) : fmt(v, NODOS[k].dec);
  let heroK = actual, heroFijo = false, heroPausa = false;
  function renderHero() {
    const n = NODOS[heroK], v = heroK === actual && datos.main ? datos.main[23] : ultimoValor(heroK);
    $("#stage").style.setProperty("--c", n.color);
    $("#dvIco").innerHTML = svgIcon(n.icon);
    $("#dvPlace").textContent = n.lugar;
    $("#dvVal").innerHTML = `${valorTxt(heroK, v)}<sup>${esc(n.unidad)}</sup>`;
    $("#dvVar").textContent = n.variable;
    $("#dvCap").textContent = `Nodo ESP32 · ${n.sensor} + DHT22`;
    $("#dvDots").innerHTML = ORDEN.map(k => `<button type="button" data-hk="${k}" aria-label="${esc(NODOS[k].nombre)}" aria-pressed="${k === heroK}"></button>`).join("");
    const pos = val => (1 - (val - n.min) / (n.max - n.min)) * 100;
    const mid = (n.min + n.max) / 2;
    $("#dvScale").innerHTML = [n.max, mid, n.min].map(t => `<span class="tk" style="top:${pos(t)}%">${fmt(t, 0)}</span>`).join("") +
      `<span class="mk" style="top:${Math.min(100, Math.max(0, pos(v)))}%">${valorTxt(heroK, v)}<i></i></span>`;
  }
  $("#dvDots").addEventListener("click", e => {
    const b = e.target.closest("[data-hk]"); if (!b) return;
    heroFijo = true; heroK = b.dataset.hk; elegir(heroK);
  });
  $("#stage").addEventListener("mouseenter", () => { heroPausa = true; });
  $("#stage").addEventListener("mouseleave", () => { heroPausa = false; });
  if (!reduceMotion) setInterval(() => {
    if (heroFijo || heroPausa || document.hidden) return;
    heroK = ORDEN[(ORDEN.indexOf(heroK) + 1) % ORDEN.length]; renderHero();
  }, 3800);

  function renderRail() {
    $("#rail").innerHTML = ORDEN.map(k => {
      const n = NODOS[k], v = ultimoValor(k);
      return `<button type="button" class="ncard" data-rk="${k}" aria-pressed="${k === actual}" style="--c:${n.color}">
        <span class="mini"><span class="mini-dev">${svgIcon(n.icon)}<b>${valorTxt(k, v)}</b><small>${esc(n.unidad)}</small></span></span>
        <h3>${esc(n.nombre)}</h3>
        <p>${esc(n.sensor)} · ${esc(n.lugar)}</p>
        <span class="more">Ver su tablero ${svgIcon("chart", "ic-sm")}</span>
      </button>`;
    }).join("");
  }
  $("#rail").addEventListener("click", e => {
    const b = e.target.closest("[data-rk]"); if (!b) return;
    elegir(b.dataset.rk);
    $("#dashboard").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  const railStep = () => Math.max(240, $("#rail").clientWidth * .8);
  $("#railPrev").addEventListener("click", () => $("#rail").scrollBy({ left: -railStep(), behavior: reduceMotion ? "auto" : "smooth" }));
  $("#railNext").addEventListener("click", () => $("#rail").scrollBy({ left: railStep(), behavior: reduceMotion ? "auto" : "smooth" }));


  /* arrastre con el mouse: botón izquierdo o rueda (clic sostenido) */
  (() => {
    const rail = $("#rail"); let down = null, moved = false;
    rail.addEventListener("mousedown", e => {
      if (e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault(); // evita el autoscroll nativo y usa el arrastre
      down = { x: e.clientX, left: rail.scrollLeft }; moved = false;
    });
    window.addEventListener("mousemove", e => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 4) { moved = true; rail.classList.add("drag"); }
      if (moved) { rail.scrollLeft = down.left - dx; e.preventDefault(); }
    });
    window.addEventListener("mouseup", () => {
      if (!down) return;
      down = null;
      if (moved) { rail.classList.remove("drag"); const c = rail.querySelector(".ncard"); if (c) { const step = c.offsetWidth + 14; rail.scrollTo({ left: Math.round(rail.scrollLeft / step) * step }); } }
    });
    rail.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    rail.addEventListener("auxclick", e => { if (e.button === 1) e.preventDefault(); });
    // inclinación lateral de la rueda (deltaX) y Shift + rueda funcionan de forma nativa
    const upd = () => { $("#railPrev").disabled = rail.scrollLeft < 4; $("#railNext").disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4; };
    rail.addEventListener("scroll", upd, { passive: true }); window.addEventListener("resize", upd); setTimeout(upd, 50);
  })();
  /* ------------------------------------------------------------ menú activo */
  if ("IntersectionObserver" in window) {
    const links = $$(".top nav a");
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    ["nodos", "dashboard", "documentacion", "control"].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ------------------------------------------------------------ índice lateral */
  (() => {
    const nav = $("#sidenav"), fab = $("#snFab");
    const links = $$("#sidenav a[href^='#']");
    const ids = [...new Set(links.map(a => a.getAttribute("href").slice(1)))];
    const targets = ids.map(id => document.getElementById(id)).filter(Boolean);
    const hero = $(".hero");
    const setOpen = o => { nav.classList.toggle("open", o); fab.setAttribute("aria-expanded", o); };
    fab.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
    links.forEach(a => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", e => { if (nav.classList.contains("open") && !nav.contains(e.target) && !fab.contains(e.target)) setOpen(false); });
    function update() {
      const pastHero = hero.getBoundingClientRect().bottom < 120;
      nav.classList.toggle("on", pastHero); fab.classList.toggle("on", pastHero);
      if (!pastHero) setOpen(false);
      // sección activa: la última cuyo inicio pasó el 35 % de la pantalla
      const line = window.innerHeight * .35;
      let cur = null;
      targets.forEach(t => { if (t.getBoundingClientRect().top <= line) cur = t; });
      // subsecciones anidadas: preferir la más específica
      const curId = cur ? cur.id : null;
      links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + curId && a.classList.contains("sn-s")));
      $$("#sidenav .sn-g").forEach(h => {
        const g = h.closest(".sn-group"), heads = g.querySelectorAll(".sn-g");
        const on = heads.length > 1 ? h.getAttribute("href") === "#" + curId : !!(curId && g.querySelector(`a[href="#${curId}"]`));
        h.classList.toggle("on", on);
      });
      const act = $("#sidenav .sn-g.on .tag");
      $("#snFabSec").textContent = act ? act.textContent : "0";
      const doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
      $("#snProg").style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + "%";
    }
    let raf = 0;
    window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ------------------------------------------------------------ inicio */
  cargarDatos(); renderPicker(); render(); renderPromptDoc(); renderHero(); renderRail();
})();
