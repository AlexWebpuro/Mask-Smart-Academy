// ==UserScript==
// @name         Smart – UI mejorada
// @namespace    alexmonroy.smart
// @version      0.15.0
// @description  Salta directo a Programación, filtra clases pendientes y moderniza el estilo
// @match        https://schoolpack.smart.edu.co/*
// @updateURL    https://raw.githubusercontent.com/AlexWebpuro/Mask-Smart-Academy/main/smart-mejorado.user.js
// @downloadURL  https://raw.githubusercontent.com/AlexWebpuro/Mask-Smart-Academy/main/smart-mejorado.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ================= Detección de páginas ================= */
  const gen = document.querySelector('meta[name="generator"]');
  if (!gen || !/genexus/i.test(gen.content)) return;

  const textoPagina = (document.body && document.body.textContent) || '';
  const esSmart = !!document.querySelector('img[src*="Encabezado.jpg"], img[src*="bt_logoBajadaInteriores"]');
  // La ventana "Programar clases" es una página aparte (va dentro de un marco)
  const esPopupProgramar = /Estado de las clases/i.test(textoPagina);
  // La ventana "Selección de clases" (sede, día y hora) — wv0614a
  const esPopupSeleccion = !!document.getElementById('vREGCONREG') && !!document.querySelector('select#vDIA');
  if (!esSmart && !esPopupProgramar && !esPopupSeleccion) return;

  /* ================= Interruptor: UI mejorada ON / OFF ================= */
  // Se guarda en localStorage, así aplica a todas las páginas y ventanas de Smart.
  const UI_OFF = (() => { try { return localStorage.getItem('smxUiOff') === '1'; } catch (e) { return false; } })();

  if (window.top === window) {
    const pintarInterruptor = () => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = UI_OFF ? '⏸ UI original · activar mejorada' : '✨ UI mejorada · ver original';
      Object.assign(b.style, {
        position: 'fixed', bottom: '12px', left: '12px', zIndex: 100000,
        background: UI_OFF ? '#6b7280' : '#1f2937', color: '#fff', border: 'none',
        padding: '8px 14px', borderRadius: '999px', cursor: 'pointer',
        font: '600 12px system-ui, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,.25)'
      });
      b.addEventListener('click', () => {
        try {
          if (UI_OFF) localStorage.removeItem('smxUiOff');
          else localStorage.setItem('smxUiOff', '1');
        } catch (e) {}
        location.reload();
      });
      document.body.appendChild(b);
    };
    if (document.body) pintarInterruptor();
    else document.addEventListener('DOMContentLoaded', pintarInterruptor);
  }

  if (UI_OFF) { console.log('[Smart UI] desactivada (modo original)'); return; }

  const esMenu = !!document.getElementById('IMAGE18') && /men/i.test(document.title);
  const tituloProg = document.getElementById('TEXTBLOCK17');
  const esProgramacion = !!tituloProg && /programaci/i.test(tituloProg.textContent);

  const ROJO = '#c8161d';
  const FUENTE = `'Poppins', system-ui, "Segoe UI", Roboto, sans-serif`;

  console.log('[Smart UI] activo', location.href, { esMenu, esProgramacion, esPopupProgramar, esPopupSeleccion });

  /* ================= Utilidades ================= */
  function cuandoEsteListo(fn, intentos = 0) {
    const listo = window.gx && document.body &&
      getComputedStyle(document.body).opacity !== '0';
    if (listo || intentos > 100) return fn();
    setTimeout(() => cuandoEsteListo(fn, intentos + 1), 100);
  }

  function insertarCSS(css) {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function marcaActiva(texto) {
    const b = document.createElement('div');
    b.textContent = texto;
    Object.assign(b.style, {
      position: 'fixed', bottom: '12px', right: '12px', zIndex: 99999,
      background: '#1f2937', color: '#fff', padding: '6px 12px',
      borderRadius: '999px', font: '600 12px system-ui, sans-serif',
      opacity: '.9', pointerEvents: 'none'
    });
    document.body.appendChild(b);
  }

  const FUENTE_CSS = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`;

  /* ================= Clase programada: cómo llegar + calendario ================= */
  // La ventana "Selección de clases" guarda la reserva en localStorage ('smxReserva').
  // Si salió bien, la ventana principal muestra este panel.
  if (window.top === window) {
    const pad = n => String(n).padStart(2, '0');
    // Bogotá es UTC-5 todo el año (sin horario de verano)
    const aUTC = (fecha, hhmm) => {
      const [y, m, d] = fecha.split('-').map(Number), [H, M] = hhmm.split(':').map(Number);
      const t = new Date(Date.UTC(y, m - 1, d, H + 5, M));
      return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
    };
    const h12 = h => { const [H, M] = h.split(':').map(Number); return `${((H + 11) % 12) + 1}:${pad(M)} ${H >= 12 ? 'p. m.' : 'a. m.'}`; };
    const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const DIA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

    window.smxMostrarReserva = function () {
      let r; try { r = JSON.parse(localStorage.getItem('smxReserva') || 'null'); } catch (e) {}
      if (!r || r.estado !== 'ok' || r.mostrada || Date.now() - r.ts > 15 * 60000) return;
      r.mostrada = true; try { localStorage.setItem('smxReserva', JSON.stringify(r)); } catch (e) {}
      if (document.getElementById('smxReservaPanel')) return;

      const titulo = `Inglés · ${r.clase || 'Clase'} (Smart)`;
      const destino = r.dir || `Smart Academia de Idiomas ${r.sede}`;
      const enc = encodeURIComponent;
      const [y, m, d] = r.fecha.split('-').map(Number);
      const f = new Date(y, m - 1, d);
      const fechaTxt = `${DIA[f.getDay()]} ${d} de ${MES[m - 1]}`;
      const ini = aUTC(r.fecha, r.ini), fin = aUTC(r.fecha, r.fin);
      const detalle = `Clase en Smart ${r.sede}. ${fechaTxt}, ${h12(r.ini)} a ${h12(r.fin)}.`;

      const gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        `&text=${enc(titulo)}&dates=${ini}/${fin}&details=${enc(detalle)}&location=${enc(r.online ? 'En línea' : destino)}`;
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Smart UI//ES', 'BEGIN:VEVENT',
        `UID:smx-${r.ts}@smart-ui`, `DTSTAMP:${aUTC(new Date().toISOString().slice(0, 10), '00:00')}`,
        `DTSTART:${ini}`, `DTEND:${fin}`, `SUMMARY:${titulo}`, `DESCRIPTION:${detalle}`,
        `LOCATION:${r.online ? 'En línea' : destino.replace(/,/g, '\\,')}`,
        'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Clase de inglés en 1 hora', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${enc(destino)}`;
      const waze = `https://waze.com/ul?q=${enc(destino)}&navigate=yes`;

      insertarCSS(`
        #smxReservaPanel { position: fixed; inset: 0; z-index: 100001; background: rgba(17,24,39,.45);
          display: flex; align-items: center; justify-content: center; padding: 16px; font-family: ${FUENTE} !important; }
        #smxReservaPanel * { font-family: ${FUENTE} !important; box-sizing: border-box; }
        .smx-rp { background: #fff; border-radius: 20px; padding: 24px; width: min(440px, 100%); box-shadow: 0 20px 50px rgba(0,0,0,.25); }
        .smx-rp-ok { width: 48px; height: 48px; border-radius: 50%; background: #e7f4ec; color: #2f7d5b;
          display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 10px; }
        .smx-rp h3 { margin: 0 0 4px; font-size: 20px; color: #1f2937; }
        .smx-rp p { margin: 0 0 16px; color: #4b5563; font-size: 14px; line-height: 1.5; }
        .smx-rp-sec { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin: 14px 0 8px; }
        .smx-rp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .smx-rp a, .smx-rp button { display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none;
          border-radius: 12px; padding: 11px 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid #e5e7eb;
          background: #fff; color: #1f2937; }
        .smx-rp a:hover, .smx-rp button:hover { border-color: ${ROJO}; }
        .smx-rp .full { grid-column: 1 / -1; }
        .smx-rp .prim { background: ${ROJO}; color: #fff; border-color: ${ROJO}; }
        .smx-rp .cerrar { margin-top: 16px; width: 100%; background: #f3f4f6; border: none; color: #374151; }
      `);
      const p = document.createElement('div');
      p.id = 'smxReservaPanel';
      p.innerHTML = `
        <div class="smx-rp" role="dialog" aria-label="Clase programada">
          <div class="smx-rp-ok">✓</div>
          <h3>¡Clase programada!</h3>
          <p><b>${r.clase || 'Tu clase'}</b><br>${fechaTxt[0].toUpperCase() + fechaTxt.slice(1)} · ${h12(r.ini)} – ${h12(r.fin)}<br>Sede ${r.sede}</p>
          <div class="smx-rp-sec">Agregar a tu calendario</div>
          <div class="smx-rp-row">
            <a class="prim" href="${gcal}" target="_blank" rel="noopener">📅 Google Calendar</a>
            <a href="${icsUrl}" download="clase-smart.ics">🗓️ Otro calendario</a>
          </div>
          ${r.online ? '' : `
          <div class="smx-rp-sec">Cómo llegar</div>
          <div class="smx-rp-row">
            <a href="${gmaps}" target="_blank" rel="noopener">🗺️ Google Maps</a>
            <a href="${waze}" target="_blank" rel="noopener">🚗 Waze</a>
            <button type="button" class="full" id="smxCopiarDir">📋 Copiar destino (para Didi o taxi)</button>
          </div>`}
          <button type="button" class="cerrar" id="smxCerrarPanel">Listo</button>
        </div>`;
      document.body.appendChild(p);
      p.querySelector('#smxCerrarPanel').addEventListener('click', () => p.remove());
      p.addEventListener('click', e => { if (e.target === p) p.remove(); });
      const cp = p.querySelector('#smxCopiarDir');
      if (cp) cp.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(destino); cp.textContent = '✓ Copiado: pégalo en Didi'; }
        catch (e) { prompt('Copia el destino:', destino); }
      });
    };
    // Por si la reserva terminó con un cambio de página completo
    cuandoEsteListo(() => window.smxMostrarReserva());
  }

  /* ================= MENÚ PRINCIPAL ================= */
  if (esMenu) {
    cuandoEsteListo(() => {
      marcaActiva('✨ Smart UI · menú');
      const prog = document.getElementById('IMAGE18');

      const salir = document.getElementById('SALIR');
      if (salir) salir.addEventListener('click', () => sessionStorage.removeItem('smartAutoProg'));

      if (sessionStorage.getItem('smartAutoProg') !== '1') {
        let intentos = 0;
        const timer = setInterval(() => {
          if (++intentos > 10) return clearInterval(timer);
          prog.click();
        }, 500);
        window.addEventListener('pagehide', () => {
          clearInterval(timer);
          sessionStorage.setItem('smartAutoProg', '1');
        });
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '📅  Ir a Programación de clases';
      Object.assign(btn.style, {
        position: 'fixed', top: '16px', right: '16px', zIndex: 99999,
        background: ROJO, color: '#fff', border: 'none', borderRadius: '12px',
        padding: '12px 20px', font: '600 15px system-ui, sans-serif',
        cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.2)'
      });
      btn.addEventListener('click', () => prog.click());
      document.body.appendChild(btn);
    });
    return;
  }

  /* ================= VENTANA "SELECCIÓN DE CLASES" (wv0614a) ================= */
  if (esPopupSeleccion) {
    // Datos de sedes. "dir" queda listo para cuando tengamos las direcciones
    // (idea futura: sugerir la sede más cercana con la ubicación del usuario).
    const SEDES_INFO = {
      // '7': { dir: 'Centro Comercial Fiesta Suba, Bogotá', lat: 0, lng: 0 },
    };
    // Opciones que no son sedes físicas: van al final de la lista
    const esEspecial = n => /^\d|ONLINE|PERSONALIZADO|FLEX|MULTIDRIVE/i.test(n);

    insertarCSS(`
      ${FUENTE_CSS}
      body, body * { font-family: ${FUENTE} !important; }
      body.Form { background: #f5f2ee !important; }
      /* Lo original queda escondido (el sistema lo sigue usando) */
      #TEXTBLOCK3, #TABLE3, #BUTTON1, #BUTTON3 { display: none !important; }
      #Grid1ContainerDiv {
        position: absolute !important; left: -10000px !important; top: 0 !important;
        width: 600px !important; height: 1px !important; overflow: hidden !important;
      }
      #TABLE1, #TABLE2 { width: 100% !important; height: auto !important; }
      .gx_ev:not(:empty) {
        display: block; background: #fdecec; color: #8f1016 !important; border-radius: 12px;
        padding: 10px 14px; font-size: 13px !important; margin: 0 0 10px;
      }

      .smx-wrap { padding: 12px 14px 4px; max-width: 760px; }
      .smx-card { background: #fff; border: 1px solid #ece7e1; border-radius: 18px; padding: 20px 22px; margin-bottom: 14px; }
      .smx-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
      .smx-num { width: 30px; height: 30px; border-radius: 50%; background: ${ROJO}; color: #fff;
        display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
      .smx-title { font-size: 17px; font-weight: 600; color: #1f2937; }
      .smx-tag { background: #eef5d9; color: #4d6b12; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; }
      .smx-tag[hidden] { display: none; }
      .smx-label { display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin: 4px 0 8px; }

      /* Sede con buscador */
      .smx-sede { position: relative; }
      .smx-sede-box { display: flex; align-items: center; gap: 10px; border: 1px solid #e5e7eb;
        border-radius: 12px; padding: 0 14px; background: #fff; }
      .smx-sede-box:focus-within { border-color: ${ROJO}; box-shadow: 0 0 0 3px rgba(200,22,29,.12); }
      .smx-sede-box svg { width: 18px; height: 18px; color: #6b7280; flex: none; }
      .smx-sede-input { flex: 1; border: none !important; outline: none; font-size: 15px !important;
        padding: 13px 0 !important; background: transparent; color: #1f2937; }
      .smx-x { border: none; background: none; color: #9ca3af; font-size: 18px; cursor: pointer; padding: 4px; }
      .smx-list { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 50; background: #fff;
        border: 1px solid #e5e7eb; border-radius: 12px; max-height: 260px; overflow: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,.12); display: none; }
      .smx-list.open { display: block; }
      .smx-opt { padding: 10px 14px; font-size: 14px; cursor: pointer; color: #1f2937; }
      .smx-opt small { display: block; color: #9ca3af; font-size: 12px; }
      .smx-opt:hover, .smx-opt.act { background: #fdf2f2; }
      .smx-opt.sel { font-weight: 600; color: ${ROJO}; }
      .smx-sep { padding: 8px 14px 4px; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; }
      .smx-hint { margin-top: 8px; font-size: 13px; color: #4d6b12; }

      /* Días */
      .smx-days { display: flex; gap: 10px; flex-wrap: wrap; }
      .smx-day { width: 96px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; cursor: pointer;
        padding: 10px 6px; text-align: center; transition: all .15s; }
      .smx-day:hover { border-color: ${ROJO}; }
      .smx-day .d1 { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
      .smx-day .d2 { font-size: 26px; font-weight: 700; color: #1f2937; line-height: 1.2; }
      .smx-day .d3 { font-size: 11px; color: #6b7280; }
      .smx-day.sel { background: ${ROJO}; border-color: ${ROJO}; box-shadow: 0 6px 16px rgba(200,22,29,.25); }
      .smx-day.sel .d1, .smx-day.sel .d2, .smx-day.sel .d3 { color: #fff; }

      /* Horas */
      .smx-hours { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      .smx-hour { border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; cursor: pointer;
        padding: 12px 14px; text-align: left; transition: all .15s; }
      .smx-hour:hover { border-color: ${ROJO}; }
      .smx-hour b { display: block; font-size: 15px; font-weight: 600; color: #1f2937; }
      .smx-hour small { font-size: 12px; color: #6b7280; }
      .smx-hour .hab { display: inline-block; background: #a3c23a; color: #fff; font-size: 10px; font-weight: 700;
        padding: 1px 8px; border-radius: 999px; margin: 3px 0; }
      .smx-hour.sel { background: #fdecec; border: 2px solid ${ROJO}; padding: 11px 13px; }
      .smx-hour.sel b { color: ${ROJO}; }
      .smx-empty { color: #6b7280; font-size: 14px; }
      .smx-foot { font-size: 12px; color: #9ca3af; margin-top: 12px; }

      /* Resumen y confirmar */
      .smx-sum { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 14px; }
      .smx-sum span { display: block; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
      .smx-sum b { font-size: 15px; color: #1f2937; }
      .smx-confirm { width: 100%; background: #a8141b; color: #fff; border: none; border-radius: 14px;
        padding: 15px; font-size: 16px; font-weight: 600; cursor: pointer; }
      .smx-confirm:hover { background: #8f1016; }
      .smx-confirm:disabled { opacity: .5; cursor: not-allowed; }
      .smx-back { display: block; margin: 10px auto 0; background: none; border: none; color: #6b7280;
        font-size: 14px; cursor: pointer; text-decoration: underline; }
    `);

    const selSede = document.getElementById('vREGCONREG');
    const selDia = document.querySelector('select#vDIA');
    const gridDiv = document.getElementById('Grid1ContainerDiv');
    const btnConfirmar = document.getElementById('BUTTON1');
    const btnRegresar = document.getElementById('BUTTON3');

    const clicReal = el => ['mousedown', 'mouseup', 'click'].forEach(tipo =>
      el.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window, button: 0 })));
    const cambiar = (sel, v) => { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); };
    const MENORES = ['de', 'del', 'la', 'las', 'los', 'el', 'al', 'y'];
    const titulo = s => s.toLowerCase().split(' ')
      .map((w, i) => i > 0 && MENORES.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const ls = {
      get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    // "Viernes 20/11/26" → Date
    const fechaDe = txt => { const m = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null;
      const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1]); };
    const hora12 = h => { const [H, M] = h.split(':').map(Number); const p = H >= 12 ? 'p. m.' : 'a. m.';
      return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${p}`; };

    /* ---------- Estructura ---------- */
    const root = document.createElement('div');
    root.className = 'smx-wrap';
    root.innerHTML = `
      <div class="smx-card">
        <div class="smx-head"><span class="smx-num">2</span><span class="smx-title">Sede y día</span>
          <span class="smx-tag" id="smxTagSede" hidden>🪄 Tu sede habitual</span></div>
        <label class="smx-label">Sede</label>
        <div class="smx-sede">
          <div class="smx-sede-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
            <input class="smx-sede-input" id="smxSedeInput" autocomplete="off" placeholder="Escribe para buscar una sede">
            <button type="button" class="smx-x" id="smxSedeX" title="Borrar">×</button>
          </div>
          <div class="smx-list" id="smxSedeList"></div>
        </div>
        <div class="smx-hint" id="smxSedeHint"></div>
        <label class="smx-label" style="margin-top:16px">Día</label>
        <div class="smx-days" id="smxDays"></div>
      </div>
      <div class="smx-card">
        <div class="smx-head"><span class="smx-num">3</span><span class="smx-title" id="smxHoraTitulo">Hora</span>
          <span class="smx-tag" id="smxTagHora" hidden>🪄 Tu hora habitual</span></div>
        <div class="smx-hours" id="smxHours"></div>
        <div class="smx-foot">Cada clase dura 1 h 30 min.</div>
      </div>
      <div class="smx-card">
        <div class="smx-sum">
          <div><span>Sede</span><b id="smxSumSede">—</b></div>
          <div><span>Día</span><b id="smxSumDia">—</b></div>
          <div><span>Hora</span><b id="smxSumHora">—</b></div>
        </div>
        <button type="button" class="smx-confirm" id="smxConfirm" disabled>Confirmar clase</button>
        <button type="button" class="smx-back" id="smxBack">Regresar</button>
      </div>`;
    const tabla1 = document.getElementById('TABLE1');
    tabla1.parentNode.insertBefore(root, tabla1);
    const $ = id => root.querySelector('#' + id);

    /* ---------- Sede con buscador ---------- */
    const sedes = [...selSede.options].map(o => ({ v: o.value, n: titulo(o.text.trim()), raw: o.text.trim() }));
    const normal = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const input = $('smxSedeInput'), lista = $('smxSedeList');
    const nombreSede = v => (sedes.find(s => s.v === v) || {}).n || '';

    function pintarLista(filtro) {
      const f = normal(filtro || '');
      const ok = sedes.filter(s => !f || normal(s.raw).includes(f));
      const fis = ok.filter(s => !esEspecial(s.raw)).sort((a, b) => a.n.localeCompare(b.n));
      const esp = ok.filter(s => esEspecial(s.raw));
      const item = s => `<div class="smx-opt${s.v === selSede.value ? ' sel' : ''}" data-v="${s.v}">${s.n}` +
        (SEDES_INFO[s.v]?.dir ? `<small>${SEDES_INFO[s.v].dir}</small>` : '') + `</div>`;
      lista.innerHTML = (fis.map(item).join('') || '') +
        (esp.length ? `<div class="smx-sep">Otras opciones</div>` + esp.map(item).join('') : '') ||
        `<div class="smx-sep">Sin resultados</div>`;
    }
    const abrir = () => { pintarLista(input.value === nombreSede(selSede.value) ? '' : input.value); lista.classList.add('open'); };
    const cerrar = () => { lista.classList.remove('open'); input.value = nombreSede(selSede.value); };
    input.addEventListener('focus', () => { input.select(); abrir(); });
    input.addEventListener('input', () => { pintarLista(input.value); lista.classList.add('open'); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.blur(); cerrar(); }
      if (e.key === 'Enter') { e.preventDefault(); const p = lista.querySelector('.smx-opt'); if (p) elegirSede(p.dataset.v); }
    });
    $('smxSedeX').addEventListener('click', () => { input.value = ''; input.focus(); pintarLista(''); lista.classList.add('open'); });
    lista.addEventListener('mousedown', e => {
      const o = e.target.closest('.smx-opt'); if (!o) return;
      e.preventDefault(); elegirSede(o.dataset.v);
    });
    document.addEventListener('mousedown', e => { if (!e.target.closest('.smx-sede')) cerrar(); });

    function elegirSede(v) {
      lista.classList.remove('open'); input.blur();
      if (v !== selSede.value) {
        console.log('[Smart UI] cambiar sede a', nombreSede(v));
        $('smxHours').innerHTML = '<div class="smx-empty">Cargando horarios…</div>';
        cambiar(selSede, v); // el sistema recarga días y horas
      }
      input.value = nombreSede(v);
      pintarTodo();
    }

    /* ---------- Días ---------- */
    function pintarDias() {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      $('smxDays').innerHTML = [...selDia.options].map(o => {
        const f = fechaDe(o.text);
        const dif = f ? Math.round((f - hoy) / 86400000) : null;
        const rel = dif === 0 ? 'Hoy' : dif === 1 ? 'Mañana' : (f ? `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)}` : '');
        return `<button type="button" class="smx-day${o.value === selDia.value ? ' sel' : ''}" data-v="${o.value}">
          <div class="d1">${f ? DIAS[f.getDay()] : ''}</div><div class="d2">${f ? f.getDate() : o.text}</div><div class="d3">${rel}</div></button>`;
      }).join('') || '<div class="smx-empty">No hay días disponibles en esta sede.</div>';
    }
    $('smxDays').addEventListener('click', e => {
      const b = e.target.closest('.smx-day'); if (!b || b.dataset.v === selDia.value) return;
      $('smxHours').innerHTML = '<div class="smx-empty">Cargando horarios…</div>';
      cambiar(selDia, b.dataset.v);
      pintarTodo();
    });

    /* ---------- Horas (filas de la tabla escondida) ---------- */
    const filas = () => [...document.querySelectorAll('#Grid1ContainerTbl tbody tr[data-gxrow]')];
    const txt = (tr, i) => (tr.querySelector(`td[data-colindex="${i}"]`)?.textContent || '').trim();
    const filaSel = () => filas().find(tr => tr.classList.contains('gx-row-selected'));
    let horaElegida = null;   // gxrow que eligió el usuario (o la habitual)

    function pintarHoras() {
      const habitual = ls.get('smxHora');
      const rows = filas();
      const opt = selDia.options[selDia.selectedIndex];
      const f = opt && fechaDe(opt.text);
      $('smxHoraTitulo').textContent = f
        ? `Hora · ${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`
        : 'Hora';
      if (!rows.length) {
        $('smxHours').innerHTML = '<div class="smx-empty">No hay horarios disponibles para este día.</div>';
        horaElegida = null; $('smxTagHora').hidden = true; return;
      }
      // Si nada elegido todavía, proponer la hora habitual
      if (!horaElegida || !rows.some(r => r.dataset.gxrow === horaElegida)) {
        const hab = habitual && rows.find(r => txt(r, 2) === habitual);
        horaElegida = hab ? hab.dataset.gxrow : null;
        if (hab) seleccionarFila(hab);
      }
      $('smxHours').innerHTML = rows.map(r => {
        const ini = txt(r, 2), fin = txt(r, 3), id = r.dataset.gxrow;
        return `<button type="button" class="smx-hour${id === horaElegida ? ' sel' : ''}" data-v="${id}">
          <b>${hora12(ini)}</b>${ini === habitual ? '<span class="hab">Habitual</span><br>' : ''}<small>hasta ${hora12(fin)}</small></button>`;
      }).join('');
      const hr = rows.find(r => r.dataset.gxrow === horaElegida);
      $('smxTagHora').hidden = !(hr && txt(hr, 2) === habitual);
    }
    function seleccionarFila(tr) {
      if (!tr.classList.contains('gx-row-selected')) clicReal(tr.querySelector('td[data-colindex="1"]') || tr);
    }
    $('smxHours').addEventListener('click', e => {
      const b = e.target.closest('.smx-hour'); if (!b) return;
      horaElegida = b.dataset.v;
      const tr = filas().find(r => r.dataset.gxrow === horaElegida);
      if (tr) seleccionarFila(tr);
      pintarHoras(); pintarResumen();
    });

    /* ---------- Resumen y confirmar ---------- */
    function pintarResumen() {
      $('smxSumSede').textContent = nombreSede(selSede.value) || '—';
      const o = selDia.options[selDia.selectedIndex];
      const f = o && fechaDe(o.text);
      $('smxSumDia').textContent = f ? `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}` : '—';
      const tr = filas().find(r => r.dataset.gxrow === horaElegida);
      $('smxSumHora').textContent = tr ? `${hora12(txt(tr, 2))} – ${hora12(txt(tr, 3))}` : '—';
      $('smxConfirm').disabled = !tr;
      const hab = ls.get('smxSede');
      $('smxTagSede').hidden = !(hab && hab === selSede.value);
      $('smxSedeHint').textContent = hab && hab === selSede.value ? 'Tu sede habitual · escribe para buscar otra' : 'Escribe para buscar otra sede';
    }

    $('smxConfirm').addEventListener('click', () => {
      const tr = filas().find(r => r.dataset.gxrow === horaElegida);
      if (!tr) return;
      const btn = $('smxConfirm');
      btn.disabled = true;
      seleccionarFila(tr);
      let n = 0;
      const t = setInterval(() => {
        if (tr.classList.contains('gx-row-selected')) {
          clearInterval(t);
          // Recordar sede y hora para la próxima vez
          ls.set('smxSede', selSede.value);
          ls.set('smxHora', txt(tr, 2));
          console.log('[Smart UI] confirmar', nombreSede(selSede.value), selDia.value, txt(tr, 2));
          registrarReserva(tr);
          clicReal(btnConfirmar);
          setTimeout(() => { btn.disabled = false; }, 2000);
        } else if (++n > 20) {
          clearInterval(t); btn.disabled = false;
          alert('No pude seleccionar esa hora. Desactiva la UI mejorada (botón abajo a la izquierda) y hazlo en la tabla.');
        }
      }, 100);
    });
    $('smxBack').addEventListener('click', () => btnRegresar && clicReal(btnRegresar));

    // Guarda la reserva y decide si salió bien:
    //  - si aparece un mensaje de error de Smart → no se muestra nada
    //  - si aparece un mensaje de éxito o la ventana se cierra → panel de "¡Clase programada!"
    function registrarReserva(tr) {
      const o = selDia.options[selDia.selectedIndex];
      const f = o && fechaDe(o.text);
      if (!f) return;
      const nombre = nombreSede(selSede.value);
      const r = {
        clase: ls.get('smxClaseElegida') || '',
        sede: nombre, sedeV: selSede.value,
        dir: SEDES_INFO[selSede.value]?.dir || '',
        online: esEspecial(selSede.options[selSede.selectedIndex].text),
        fecha: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`,
        ini: txt(tr, 2), fin: txt(tr, 3), estado: 'pendiente', ts: Date.now()
      };
      const guardar = () => ls.set('smxReserva', JSON.stringify(r));
      guardar();
      const exito = () => {
        if (r.estado !== 'pendiente') return;
        r.estado = 'ok'; guardar();
        console.log('[Smart UI] reserva OK', r);
        try { window.top.smxMostrarReserva && window.top.smxMostrarReserva(); } catch (e) {}
      };
      const ev = document.querySelector('.gx_ev');
      const antes = (ev?.textContent || '').trim();
      let n = 0;
      const t = setInterval(() => {
        const msg = (ev?.textContent || '').trim();
        if (msg && msg !== antes) {
          clearInterval(t);
          if (/éxito|exito|exitosa|programad|asignad|registrad|reservad/i.test(msg)) exito();
          else { r.estado = 'error'; guardar(); console.warn('[Smart UI] Smart respondió:', msg); }
        } else if (++n > 100) clearInterval(t); // 10 s
      }, 100);
      window.addEventListener('pagehide', () => { clearInterval(t); exito(); }, { once: true });
    }

    function pintarTodo() {
      if (document.activeElement !== input) input.value = nombreSede(selSede.value);
      pintarDias(); pintarHoras(); pintarResumen();
    }

    cuandoEsteListo(() => {
      // Sede habitual: si la recordamos y no es la que trae el sistema, la ponemos (una vez)
      const hab = ls.get('smxSede');
      const ultimo = +sessionStorage.getItem('smxSedeAplicada') || 0;
      if (hab && hab !== selSede.value && sedes.some(s => s.v === hab) && Date.now() - ultimo > 5000) {
        sessionStorage.setItem('smxSedeAplicada', String(Date.now())); // evita bucles
        cambiar(selSede, hab);
      }
      pintarTodo();
      // El sistema redibuja días/horas al cambiar sede o día: repintamos
      let p = false;
      new MutationObserver(muts => {
        if (muts.every(m => root.contains(m.target))) return; // cambios nuestros
        if (p) return; p = true;
        setTimeout(() => { p = false; pintarTodo(); }, 120);
      }).observe(document.body, { childList: true, subtree: true });
      // Si el usuario cambia algo en el select original (por ejemplo, el sistema), también
      selSede.addEventListener('change', () => setTimeout(pintarTodo, 300));
      selDia.addEventListener('change', () => setTimeout(pintarTodo, 300));
      marcaActiva('✨ Smart UI · selección');
    });
    return;
  }

  /* ================= VENTANA "PROGRAMAR CLASES" (wv0613) ================= */
  if (esPopupProgramar) {
    const T = '#Grid1ContainerTbl';
    insertarCSS(`
      ${FUENTE_CSS}
      body, body * { font-family: ${FUENTE} !important; }
      body { background: #f5f2ee !important; color: #1f2937; }
      #TABLE2 { width: 100% !important; }
      #TABLE3 td { vertical-align: middle; }

      /* Botones */
      #BUTTON1, #BUTTON2, #BUTTON3 {
        border: none !important; border-radius: 10px !important;
        padding: 10px 20px !important; margin-right: 8px !important;
        width: auto !important; height: auto !important;
        font-size: 14px !important; font-weight: 600 !important;
        background-image: none !important; cursor: pointer; transition: filter .15s;
      }
      #BUTTON1:hover, #BUTTON2:hover, #BUTTON3:hover { filter: brightness(.95); }
      #BUTTON1 { background: ${ROJO} !important; color: #fff !important; }
      #BUTTON2 { background: #fff !important; color: #374151 !important; box-shadow: inset 0 0 0 1px #e5e7eb !important; }
      #BUTTON3 { background: #eef5d9 !important; color: #4d6b12 !important; }

      /* Filtro de estado: el select original se esconde y se reemplaza por chips */
      #TEXTBLOCK3, #vTPEAPROBO { display: none !important; }
      .smx-chips { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 6px; margin-top: 12px;
        scrollbar-width: none; max-width: 720px; }
      .smx-chips::-webkit-scrollbar { display: none; }
      .smx-chip { flex: none; border: none; border-radius: 10px; padding: 8px 14px; cursor: pointer;
        background: #ebe6e0; color: #1f2937; font-size: 14px; font-weight: 600; transition: background .15s; }
      .smx-chip:hover { background: #ddd6ce; }
      .smx-chip.sel { background: #1f2937; color: #fff; }
      .smx-chip:disabled { opacity: .6; cursor: wait; }

      /* La tabla sigue existiendo (el sistema la necesita), pero no se ve */
      #Grid1ContainerDiv {
        position: absolute !important; left: -10000px !important; top: 0 !important;
        width: 900px !important; height: 1px !important; overflow: hidden !important;
      }

      /* Tarjeta nueva */
      .smx-card {
        background: #fff; border: 1px solid #ece7e1; border-radius: 18px;
        padding: 22px 24px; margin: 14px 0; max-width: 720px;
      }
      .smx-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
      .smx-num {
        width: 32px; height: 32px; border-radius: 50%; background: ${ROJO}; color: #fff;
        display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;
      }
      .smx-title { font-size: 18px; font-weight: 600; color: #1f2937; }
      .smx-tag {
        background: #eef5d9; color: #4d6b12; font-size: 13px; font-weight: 600;
        padding: 4px 12px; border-radius: 999px;
      }
      .smx-tag[hidden] { display: none; }
      .smx-label { display: block; font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 8px; }
      .smx-select {
        width: 100%; font-size: 16px !important; color: #1f2937; background: #fff;
        border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; cursor: pointer;
      }
      .smx-select:focus { outline: none; border-color: ${ROJO}; box-shadow: 0 0 0 3px rgba(200,22,29,.12); }
      .smx-hint { margin-top: 10px; font-size: 13px; color: #6b7280; }
    `);

    const sel = document.getElementById('vTPEAPROBO');
    const gridDiv = document.getElementById('Grid1ContainerDiv');

    function filtrarPendientes() {
      if (!sel || sel.value === '2') return;
      const ultimo = +sessionStorage.getItem('smxFiltro') || 0;
      if (Date.now() - ultimo < 4000) return;
      sessionStorage.setItem('smxFiltro', String(Date.now()));
      sel.value = '2';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // "SMART ZONE - A2" → "Smart Zone – A2"; "2. CLASE 36" → "Clase 36"
    function bonito(txt) {
      return txt.trim()
        .replace(/^\d+\.\s*/, '')
        .replace(/\*/g, '·')
        .replace(/\s+-\s+/g, ' – ')
        .split(' ')
        .map(w => /^[A-Z]\d$/i.test(w) ? w.toUpperCase()
                : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    const celda = (tr, i) => tr.querySelector(`td[data-colindex="${i}"]`);
    const texto = (tr, i) => (celda(tr, i)?.textContent || '').trim();

    // Construye la tarjeta con el select
    const card = document.createElement('div');
    card.className = 'smx-card';
    card.innerHTML = `
      <div class="smx-head">
        <span class="smx-num">1</span>
        <span class="smx-title">¿Qué clase vas a tomar?</span>
        <span class="smx-tag" hidden>🪄 Siguiente en tu plan</span>
      </div>
      <label class="smx-label" for="smxClase">Clase</label>
      <select id="smxClase" class="smx-select"></select>
      <div class="smx-hint">Elige la clase y luego presiona <b>Asignar</b>.</div>`;
    gridDiv.parentNode.insertBefore(card, gridDiv);

    // Chips de filtro, estilo YouTube (reemplazan "Estado de las clases")
    const ETIQUETAS = { '2': 'Pendientes', '3': 'Programadas', '1': 'Tomadas', '0': 'Todas' };
    const ORDEN = ['2', '3', '1', '0'];
    const chips = document.createElement('div');
    chips.className = 'smx-chips';
    card.parentNode.insertBefore(chips, card);
    function pintarChips() {
      if (!sel) return;
      const vals = [...sel.options].map(o => o.value);
      const orden = ORDEN.filter(v => vals.includes(v)).concat(vals.filter(v => !ORDEN.includes(v)));
      chips.innerHTML = orden.map(v => {
        const o = [...sel.options].find(x => x.value === v);
        return `<button type="button" class="smx-chip${v === sel.value ? ' sel' : ''}" data-v="${v}">${ETIQUETAS[v] || o.text}</button>`;
      }).join('');
    }
    chips.addEventListener('click', e => {
      const b = e.target.closest('.smx-chip');
      if (!b || !sel || b.dataset.v === sel.value) return;
      sel.value = b.dataset.v;
      sel.dispatchEvent(new Event('change', { bubbles: true })); // el sistema recarga la lista
      pintarChips();
      const T2 = { '2': '¿Qué clase vas a tomar?', '3': 'Tus clases programadas', '1': 'Clases que ya tomaste', '0': 'Todas tus clases' };
      card.querySelector('.smx-title').textContent = T2[sel.value] || T2['0'];
      card.querySelector('.smx-tag').hidden = true;
      miSelect.innerHTML = '<option>Cargando…</option>';
    });
    pintarChips();
    const miSelect = card.querySelector('#smxClase');
    const tag = card.querySelector('.smx-tag');

    let primeraPendiente = null;

    // Clic "de verdad" (mousedown + mouseup + click), igual que en la página principal
    const clicReal = el => ['mousedown', 'mouseup', 'click'].forEach(tipo =>
      el.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window, button: 0 })));

    const fila = gxrow => document.querySelector(`${T} tbody tr[data-gxrow="${gxrow}"]`);
    const estaSeleccionada = gxrow => { const tr = fila(gxrow); return !!tr && tr.classList.contains('gx-row-selected'); };

    function seleccionarFila(gxrow) {
      const tr = fila(gxrow);
      if (!tr || tr.classList.contains('gx-row-selected')) return;
      // Un clic en la fila es lo que el sistema entiende como "seleccionar"
      clicReal(celda(tr, 5) || tr);
      console.log('[Smart UI] seleccionar fila', gxrow, '→', estaSeleccionada(gxrow) ? 'ok' : 'pendiente');
    }

    // Seguro: antes de "Asignar", verifica que la fila marcada sea la del select.
    // Si no lo es, la selecciona primero y luego presiona Asignar.
    const asignar = document.getElementById('BUTTON1');
    let reintentando = false;
    if (asignar) asignar.addEventListener('click', ev => {
      const v = miSelect.value;
      // Recordar qué clase se está programando (para el calendario)
      try {
        const o = miSelect.options[miSelect.selectedIndex];
        if (o) localStorage.setItem('smxClaseElegida', o.text.replace(/^\d+\s*·\s*/, ''));
      } catch (e) {}
      if (reintentando || !v || estaSeleccionada(v)) return; // todo en orden
      ev.preventDefault();
      ev.stopImmediatePropagation();
      console.warn('[Smart UI] la fila elegida no estaba seleccionada; corrigiendo antes de Asignar');
      seleccionarFila(v);
      let n = 0;
      const t = setInterval(() => {
        if (estaSeleccionada(v)) {
          clearInterval(t);
          reintentando = true;
          clicReal(asignar);
          setTimeout(() => { reintentando = false; }, 500);
        } else if (++n > 20) {
          clearInterval(t);
          alert('No pude seleccionar esa clase. Desactiva la UI mejorada (botón abajo a la izquierda) y selecciónala en la tabla.');
        }
      }, 100);
    }, true); // fase de captura: corre antes que el sistema

    function construir() {
      const MAX = 5;            // cuántas clases mostrar en el select
      const SOLO_CLASES = true; // true = solo "Clase N" (oculta Smart Zone y Quiz)
      const filas = [...document.querySelectorAll(`${T} tbody tr[data-gxrow]`)]
        .filter(tr => !SOLO_CLASES || /\bCLASE\s+\d+/i.test(texto(tr, 5)))
        .slice(0, MAX);
      const soloPend = sel && sel.value === '2';

      miSelect.innerHTML = '';

      primeraPendiente = null;
      let seleccionada = null;
      filas.forEach(tr => {
        const nro = parseInt(texto(tr, 4), 10);
        const desc = bonito(texto(tr, 5));
        const estado = texto(tr, 10);
        if (!primeraPendiente && estado === 'Pendiente') primeraPendiente = tr.dataset.gxrow;
        const etiqueta = `${nro} · ${desc}` + (soloPend ? '' : ` — ${estado}`);
        miSelect.add(new Option(etiqueta, tr.dataset.gxrow));
        if (tr.classList.contains('gx-row-selected')) seleccionada = tr.dataset.gxrow;
      });


      if (!filas.length) {
        miSelect.add(new Option('No hay clases para mostrar', ''));
        miSelect.disabled = true;
      } else {
        miSelect.disabled = false;
      }

      const elegir = seleccionada || primeraPendiente || (filas[0] && filas[0].dataset.gxrow);
      if (elegir) {
        miSelect.value = elegir;
        seleccionarFila(elegir);
      }
      tag.hidden = !(soloPend && elegir && elegir === primeraPendiente);
      // Título según el filtro
      const TITULOS = { '2': '¿Qué clase vas a tomar?', '3': 'Tus clases programadas', '1': 'Clases que ya tomaste', '0': 'Todas tus clases' };
      card.querySelector('.smx-title').textContent = TITULOS[sel && sel.value] || TITULOS['0'];
      pintarChips();
    }

    miSelect.addEventListener('change', () => {
      const v = miSelect.value;
      seleccionarFila(v);
      tag.hidden = v !== primeraPendiente;
    });

    cuandoEsteListo(() => {
      filtrarPendientes();
      construir();
      // Cuando el sistema redibuja la tabla (filtro, páginas), reconstruimos el select
      let pendiente = false;
      new MutationObserver(() => {
        if (pendiente) return;
        pendiente = true;
        setTimeout(() => { pendiente = false; construir(); }, 80);
      }).observe(gridDiv, { childList: true, subtree: true });
      marcaActiva('✨ Smart UI · programar');
    });
    return;
  }

  /* ================= PROGRAMACIÓN DE CLASES ================= */
  if (esProgramacion) {
    insertarCSS(`
      ${FUENTE_CSS}
      body.Form { background: #f5f2ee !important; }
      body, body * { font-family: ${FUENTE} !important; }
      #TABLE1 {
        width: min(1100px, 96vw) !important;
        margin-top: 16px !important;
        background: #fff;
        border-radius: 16px;
        border-collapse: separate !important;
        overflow: hidden;
        box-shadow: 0 2px 14px rgba(0,0,0,.06);
      }
      #IMAGE1 { max-height: 80px; width: auto; }
      #IMAGE2 { display: none !important; }
      #TABLE5 { width: 100% !important; }
      #TABLE5 td { background: ${ROJO} !important; padding: 10px 16px !important; }
      #TEXTBLOCK17 { font-size: 18px !important; }
      .SpecialButtons {
        background: ${ROJO} !important; color: #fff !important;
        border: none !important; border-radius: 10px !important;
        padding: 10px 18px !important; margin: 4px 8px 4px 0 !important;
        width: auto !important; height: auto !important;
        font-size: 14px !important; font-weight: 600 !important;
        cursor: pointer; transition: background .15s;
      }
      .SpecialButtons:hover { background: #a81218 !important; }
      #W0030TABLE1, #W0030TABLE2 { width: 100% !important; }
      #W0030Grid1ContainerDiv table { border-collapse: collapse !important; }
      #W0030Grid1ContainerDiv td {
        padding: 10px 12px !important;
        border-bottom: 1px solid #eee !important;
      }
    `);
    // Botón "Programar clase": selecciona el plan e Inicia, en un solo clic
    insertarCSS(`
      #W0030BUTTON1 { display: none !important; }           /* Iniciar original */
      #W0030Grid1ContainerDiv {                               /* tabla del plan, escondida */
        position: absolute !important; left: -10000px !important; top: 0 !important;
        width: 900px !important; height: 1px !important; overflow: hidden !important;
      }
      .smx-prog-btn {
        display: inline-flex; align-items: center; gap: 12px;
        background: #a8141b; color: #fff; border: none; border-radius: 16px;
        padding: 16px 28px; margin: 8px 0 16px; cursor: pointer;
        font-size: 17px; font-weight: 600; letter-spacing: .1px;
        transition: background .15s, transform .1s;
      }
      .smx-prog-btn:hover { background: #8f1016; }
      .smx-prog-btn:active { transform: scale(.98); }
      .smx-prog-btn:disabled { opacity: .7; cursor: wait; }
      .smx-prog-btn svg { width: 20px; height: 20px; flex: none; }
    `);

    cuandoEsteListo(() => {
      marcaActiva('✨ Smart UI · programación');
      const iniciar = document.getElementById('W0030BUTTON1');
      if (!iniciar) return;

      const filaPlan = () => document.querySelector('#W0030Grid1ContainerDiv tbody tr[data-gxrow]');
      const celdaVisible = tr => [...tr.querySelectorAll('td')]
        .find(td => getComputedStyle(td).display !== 'none') || tr;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'smx-prog-btn';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>Programar clase</span>';
      iniciar.parentNode.insertBefore(btn, iniciar);


      // Clic "de verdad": algunos sistemas escuchan mousedown/mouseup, no solo click
      const clicReal = el => {
        ['mousedown', 'mouseup', 'click'].forEach(tipo =>
          el.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window, button: 0 })));
      };

      btn.addEventListener('click', () => {
        const tr = filaPlan();
        console.log('[Smart UI] fila del plan:', tr);
        if (!tr) { console.warn('[Smart UI] no encontré la fila del plan; presiono Iniciar igual'); iniciar.click(); return; }
        btn.disabled = true;

        // 1) seleccionar el plan (como hacer clic en "INGA2C1 ...")
        const celdaObjetivo = celdaVisible(tr);
        console.log('[Smart UI] clic en celda:', celdaObjetivo);
        clicReal(celdaObjetivo);

        // 2) cuando quede seleccionado, presionar "Iniciar"
        let intentos = 0;
        const t = setInterval(() => {
          intentos++;
          const actual = filaPlan(); // por si el sistema redibujó la fila
          const ok = actual && actual.classList.contains('gx-row-selected');
          if (ok || intentos > 20) {
            clearInterval(t);
            console.log('[Smart UI] fila seleccionada:', ok, '→ presiono Iniciar');
            clicReal(iniciar);
            setTimeout(() => { btn.disabled = false; }, 1500);
          }
        }, 100);
      });
    });
    return;
  }

  // Otra página de Smart (p. ej. el login): reinicia el salto automático
  sessionStorage.removeItem('smartAutoProg');
  cuandoEsteListo(() => marcaActiva('✨ Smart UI · otra página'));
})();
