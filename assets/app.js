/* ─────────────────────────────────────────────────────────────────────────────
   Lo que hace la pagina: dibuja la lluvia, arranca el ojo, pinta los repos y
   hace que el ojo de la barra tome su color de la temperatura real de la CPU.

   La pagina no pide nada a nadie. Todo sale de data/system.js y data/github.js,
   que escriben dos scripts en la maquina (scripts/collect-system-stats.sh y
   scripts/collect-github.py). Cero llamadas por visita, funciona sin conexion y
   se puede abrir con doble clic desde file://.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var PROYECTOS = window.RHYTHM_PROJECTS || [];
  var S = window.RHYTHM_SYSTEM || null;
  var G = window.RHYTHM_GITHUB || null;
  var ojo = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function hace(fecha) {
    if (!fecha) return "sin datos";
    var t = new Date(String(fecha).replace(" ", "T"));
    if (isNaN(t)) return esc(fecha);
    var min = Math.floor((Date.now() - t.getTime()) / 60000);
    if (min < 1) return "ahora mismo";
    if (min < 60) return "hace " + min + " min";
    var h = Math.floor(min / 60);
    return h < 24 ? "hace " + h + " h" : "hace " + Math.floor(h / 24) + " d";
  }

  // Color estable por nombre: el mismo repo es siempre el mismo punto.
  function colorDe(nombre) {
    var h = 0;
    for (var i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 360;
    return "hsl(" + h + " 34% 52%)";
  }

  // ── La barra: el punto toma su color de la temperatura real ────────────────
  var FRASES = [
    "fresca", "templada", "caliente", "hirviendo",
    "sigo aqui", "mira", "has llegado"
  ];

  function ojoBarra(temp) {
    var el = $("#ojo-mini");
    if (!el) return;
    var nucleo, iris, halo, txt;
    if (temp === null || temp === undefined) {
      nucleo = "#6b828c"; iris = "#304f79"; halo = "rgba(107,130,140,0.3)";
      txt = "sin datos de temperatura";
    } else if (temp >= 80) {
      nucleo = "#e97454"; iris = "#ba5f44"; halo = "rgba(233,116,84,0.85)";
      txt = "cpu a " + temp.toFixed(0) + "° · hirviendo";
    } else if (temp >= 70) {
      nucleo = "#d8845a"; iris = "#ba5f44"; halo = "rgba(216,132,90,0.6)";
      txt = "cpu a " + temp.toFixed(0) + "° · caliente";
    } else if (temp >= 55) {
      nucleo = "#cea878"; iris = "#96603c"; halo = "rgba(206,168,120,0.4)";
      txt = "cpu a " + temp.toFixed(0) + "° · templada";
    } else {
      nucleo = "#99bac9"; iris = "#3a6080"; halo = "rgba(153,186,201,0.35)";
      txt = "cpu a " + temp.toFixed(0) + "° · fresca";
    }
    el.style.setProperty("--o", nucleo);
    el.style.setProperty("--i", iris);
    el.style.setProperty("--halo", halo);
    el.title = txt;
  }

  // ── El campo ───────────────────────────────────────────────────────────────

  function susurro(temp) {
    var el = $("#susurro");
    if (!el) return;
    var dentro = false;
    if (ojo && ojo.raton && ojo.raton.dentro) {
      var mx = (ojo.raton.x - ojo.w / 2) / (ojo.w / 2);
      var my = (ojo.raton.y - ojo.h / 2) / (ojo.h / 2);
      dentro = Math.sqrt(mx * mx + my * my) < 0.55;
    }
    if (!dentro) { el.innerHTML = "&nbsp;"; el.style.color = "var(--gris)"; return; }
    var i = Math.floor(Math.random() * FRASES.length);
    el.textContent = FRASES[i];
    el.style.color = "var(--hielo)";
  }

  // La lluvia. Se inclina a la izquierda como la del wallpaper.
  function lluvia() {
    var c = $("#lluvia");
    if (!c) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var ctx = c.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var gotas = [];
    var raton = { x: -999, y: -999, on: false };
    var INCL = 0.28;                     // el angulo de las rayas de tu fondo

    function medir() {
      c.width = Math.floor(innerWidth * dpr);
      c.height = Math.floor(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function nueva(inicial) {
      var t = Math.random();
      return {
        x: Math.random() * innerWidth,
        y: inicial ? Math.random() * innerHeight : -30,
        largo: t < 0.7 ? 14 + Math.random() * 20 : 6 + Math.random() * 8,
        vel: t < 0.7 ? 620 + Math.random() * 520 : 250 + Math.random() * 200,
        a: t < 0.7 ? 0.14 + Math.random() * 0.14 : 0.05 + Math.random() * 0.06,
        w: t < 0.7 ? 1 : 1.3
      };
    }
    function sembrar() {
      gotas = [];
      var n = Math.max(60, Math.min(320, Math.round((innerWidth * innerHeight) / 5200)));
      for (var i = 0; i < n; i++) gotas.push(nueva(true));
    }
    var ult = 0;
    function paso(t) {
      var dt = Math.min(0.05, (t - ult) / 1000 || 0.016);
      ult = t;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var W = innerWidth, H = innerHeight;
      for (var i = 0; i < gotas.length; i++) {
        var g = gotas[i];
        var vy = g.vel;
        var vx = vy * INCL;
        if (raton.on) {
          var dx = g.x - raton.x, dy = g.y - raton.y, d2 = dx * dx + dy * dy;
          if (d2 < 26000) {
            var d = Math.sqrt(d2) || 1, f = (1 - d2 / 26000) * 200;
            vx += (dx / d) * f; vy += (dy / d) * f * 0.6;
          }
        }
        g.x += vx * dt; g.y += vy * dt;
        ctx.strokeStyle = "rgba(153,186,201," + g.a.toFixed(3) + ")";
        ctx.lineWidth = g.w;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x - vx * 0.03, g.y - vy * 0.03);
        ctx.stroke();
        if (g.y > H + 40 || g.x < -80 || g.x > W + 80) gotas[i] = nueva(false);
      }
      requestAnimationFrame(paso);
    }
    medir(); sembrar(); requestAnimationFrame(paso);
    addEventListener("resize", function () { medir(); sembrar(); });
    addEventListener("mousemove", function (e) { raton.x = e.clientX; raton.y = e.clientY; raton.on = true; });
    addEventListener("mouseleave", function () { raton.on = false; });
  }

  // ── Los proyectos ──────────────────────────────────────────────────────────

  var abierto = null;

  function datoDe(repo) { return (G && G.repos && G.repos[repo]) || null; }

  // La ficha abierta se inserta justo detras de la capsula que se ha
  // pinchado, no al final de la rejilla. Al final parecia que se habia abierto
  // otra cosa: la isla tiene que.desplegarse donde la tocaste.
  function pintarProyectos() {
    var caja = $("#rejilla-p");
    var partes = [];
    PROYECTOS.forEach(function (p) {
      var d = datoDe(p.repo);
      var estrellas = d && typeof d.stars === "number" ? d.stars : (p.stars || 0);
      partes.push('<button class="cap" type="button" data-nombre="' + esc(p.name) + '"' +
        ' aria-expanded="' + (abierto === p.name) + '"' +
        ' style="--color:' + colorDe(p.name) + '">' +
        '<span class="gota"></span>' +
        '<span class="nom">' + esc(p.name) + "</span>" +
        '<span class="der">' + (estrellas > 0 ? "★ " + estrellas : "") +
        (d && d.lenguaje ? " &nbsp;" + esc(d.lenguaje) : "") + "</span></button>");
      if (abierto === p.name) partes.push(detalle(p));
    });
    caja.innerHTML = partes.join("");
  }

  function detalle(p) {
    var d = datoDe(p.repo);
    var estrellas = d && typeof d.stars === "number" ? d.stars : (p.stars || 0);
    var h = '<div class="abierta">';
    h += '<div class="cabeza"><h3>' + esc(p.name) + "</h3>" +
      '<span class="meta">★ ' + estrellas +
      (d && d.lenguaje ? "  ·  " + esc(d.lenguaje) : "") +
      (d && d.push ? "  ·  " + esc(hace(d.push)) : "") + "</span></div>";
    if (p.tagline) h += "<p>" + esc(p.tagline) + "</p>";
    if (p.blurb) h += "<p>" + esc(p.blurb) + "</p>";
    h += '<div class="pildoras">' + (p.tags || []).map(function (t) {
      return "<span>" + esc(t) + "</span>";
    }).join("") + "</div>";
    h += '<div class="filas">' +
      '<a class="b" href="https://github.com/' + esc(p.repo) +
      '" target="_blank" rel="noopener">github ↗</a>' +
      '<button class="b f" type="button" data-cerrar="1">cerrar · esc</button></div>';
    return h + "</div>";
  }

  // ── Arranque ───────────────────────────────────────────────────────────────

  function tic() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    var r = $("#reloj");
    if (r) r.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function inicio() {
    var temp = S && S.temps ? S.temps.cpu : null;
    ojoBarra(temp);
    $("#cuenta").textContent = PROYECTOS.length;

    if (window.RHYTHM_OJO) ojo = window.RHYTHM_OJO.montar($("#ojo"), temp);
    lluvia();
    setInterval(tic, 1000);
    tic();

    // El susurro cambia solo cuando miras al ojo, asi que no hace falta un
    // temporizador por fuera; se refresca con el mismo bucle de dibujado.
    setInterval(function () { susurro(temp); }, 1400);

    $("#rejilla-p").addEventListener("click", function (ev) {
      if (ev.target.closest("[data-cerrar]")) { abierto = null; pintarProyectos(); return; }
      var c = ev.target.closest(".cap");
      if (c) {
        var n = c.getAttribute("data-nombre");
        abierto = abierto === n ? null : n;
        pintarProyectos();
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { if (abierto) { abierto = null; pintarProyectos(); } }
      else if (ev.key === "j") {
        var p0 = PROYECTOS[0];
        if (p0) { abierto = abierto === p0.name ? null : p0.name; pintarProyectos(); }
      }
    });

    // El sello del pie dice de cuando son los datos, no "en vivo": es una foto.
    var sello = $("#sello");
    if (sello) {
      sello.textContent = S && G
        ? "foto " + hace(S.generado) + " · repos " + hace(G.recogido)
        : S ? "foto " + hace(S.generado) : "sin datos";
    }

    pintarProyectos();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicio);
  else inicio();
})();