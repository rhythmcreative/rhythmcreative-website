/* ─────────────────────────────────────────────────────────────────────────────
   Lo que hace la pagina: arranca el campo con sus capas, pinta el punto de la
   barra y los repos, y pone en hora el reloj.

   No pide nada a nadie. Todo sale de data/system.js y data/github.js, que
   escriben dos scripts en la maquina (scripts/collect-system-stats.sh y
   scripts/collect-github.py). Cero llamadas por visita, funciona sin conexion y
   se puede abrir con doble clic desde file://.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var PROYECTOS = window.RHYTHM_PROJECTS || [];
  var S = window.RHYTHM_SYSTEM || null;
  var G = window.RHYTHM_GITHUB || null;

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

  // ── El punto de la barra: la temperatura real, no un temporizador ──────────
  function punto(temp) {
    var el = $("#punto");
    if (!el) return;
    var pal = window.RHYTHM_CAPA.paleta(temp);
    el.style.setProperty("--o", pal.nucleo);
    el.style.setProperty("--i", pal.iris);
    el.style.setProperty("--halo", pal.halo);
    el.title = pal.txt;
  }

  // ── Los proyectos ──────────────────────────────────────────────────────────

  var abierto = null;

  function datoDe(repo) { return (G && G.repos && G.repos[repo]) || null; }

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
    punto(temp);
    $("#cuenta").textContent = PROYECTOS.length;

    if (window.RHYTHM_CAPA) window.RHYTHM_CAPA.montar($("#escena"), temp);

    tic();
    setInterval(tic, 1000);

    $("#bajar").addEventListener("click", function () {
      $("#proyectos").scrollIntoView({ behavior: "smooth", block: "start" });
    });

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
      if (ev.key === "Escape" && abierto) { abierto = null; pintarProyectos(); }
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