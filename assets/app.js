/* ─────────────────────────────────────────────────────────────────────────────
   Lo que hace la pagina: arranca el campo con sus capas, pinta el punto de la
   barra, centraliza el nombre, dibuja la seccion de Hyprland y pone en hora el
   reloj.

   No pide nada a nadie. Todo sale de data/system.js y data/github.js, que
   escriben dos scripts en la maquina (scripts/collect-system-stats.sh y
   scripts/collect-github.py). Cero llamadas por visita, funciona sin conexion y
   se puede abrir con doble clic desde file://.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var S = window.RHYTHM_SYSTEM || null;
  var G = window.RHYTHM_GITHUB || null;
  var H = window.RHYTHM_HYPRLAND || null;

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

  // ── La temperatura. Ya no hay punto en la barra: el termometro vive en el
  //    halo, y lo pinta capa.js. Esto se queda por si vuelve a hacer falta un
  //    readout, y no hace nada si el elemento no esta.
  function punto(temp) {
    var el = $("#punto");
    if (!el) return;
    var pal = window.RHYTHM_CAPA.paleta(temp);
    el.style.setProperty("--o", pal.nucleo);
    el.style.setProperty("--i", pal.iris);
    el.style.setProperty("--halo", pal.halo);
    el.title = pal.txt;
  }

  // La ultima letra del nombre, sin su hueco de letter-spacing. Sin esto el
  // nombre se va 0.21em a la izquierda al centrarlo, porque el espaciado entre
  // letras se aplica tambien despues de la ultima. Se hace aqui y no en el HTML
  // para no partir el nombre en dos trozos a mano.
  function centrarNombre() {
    var h = $(".nombre");
    if (!h || h.dataset.centrado) return;
    var t = h.textContent.trim();
    if (t.length < 2) return;
    h.dataset.centrado = "1";
    h.innerHTML = esc(t.slice(0, -1)) + '<span class="ultima">' + esc(t.slice(-1)) + "</span>";
  }

  // ── La seccion de Hyprland ─────────────────────────────────────────────────

  var abierto = null;

  function datoDelRepo() {
    return (G && G.repos && G.repos[H.repo]) || null;
  }

  // Lo que hay vivo en la sesion. Sin esto la seccion contaria cosas que
  // podrían no ser ciertas: datos del recolector, no opinion.
  function valorEnVivo(campo) {
    if (!S) return null;
    if (campo === "binds") return (S.binds || []).length || null;
    if (campo === "monitors") return (S.monitors || []).length || null;
    return S[campo] === undefined ? null : S[campo];
  }

  function pintarHyprland() {
    if (!H) return;
    var d = datoDelRepo();
    var izq = [];

    // ── La identidad: lo que dice que es esto ────────────────────────────
    izq.push('<div class="cabecera-seccion">');
    izq.push('<span class="punto-mini"></span>');
    izq.push("<h2>hyprland</h2>");
    izq.push('<span class="meta">' +
      (d ? "★ " + esc(d.stars) + (d.lenguaje ? "  ·  " + esc(d.lenguaje) : "") +
           (d.push ? "  ·  " + esc(hace(d.push)) : "")
           : "sin datos de github") + "</span>");
    izq.push("</div>");
    izq.push('<p class="lema">' + esc(H.lema) + "</p>");
    izq.push('<p class="intro">' + esc(H.intro) + "</p>");

    // ── Lo que hay vivo ahora mismo ──────────────────────────────────────
    var vivos = (H.enVivo || []).map(function (v) {
      var x = valorEnVivo(v.de);
      return '<div class="vivo"><b>' + (x === null ? "—" : esc(String(x))) +
             "</b><span>" + esc(v.etiqueta) + "</span></div>";
    }).join("");
    if (vivos) izq.push('<div class="vivos">' + vivos + "</div>");

    if ((H.base || []).length) {
      izq.push('<div class="etiquetas">' + H.base.map(function (b) {
        return "<span>" + esc(b) + "</span>";
      }).join("") + "</div>");
    }

    // Solo el repo. Los enlaces al resto ya estan en el menu del pie, y aqui
    // estaban las dos veces.
    izq.push('<div class="acciones-seccion">' +
      '<a class="b" href="https://github.com/' + esc(H.repo) +
      '" target="_blank" rel="noopener">el repo ↗</a></div>');

    // ── Las piezas, a la derecha ─────────────────────────────────────────
    var der = ['<div class="piezas">'];
    (H.piezas || []).forEach(function (p) { der.push(pieza(p)); });
    der.push("</div>");

    var caja = $("#hyprland-caja");
    if (caja) {
      caja.innerHTML = '<div class="rejilla-seccion">' +
        '<div class="identidad">' + izq.join("") + "</div>" +
        '<div class="columna">' + der.join("") + "</div></div>";
    }
  }

  function pieza(p) {
    var h = '<button class="pieza" type="button" data-id="' + esc(p.id) +
            '" aria-expanded="' + (abierto === p.id) + '">' +
            '<span class="filo"></span>' +
            '<span class="cuerpo"><b>' + esc(p.titulo) + "</b>" +
            "<i>" + esc(p.resumen) + "</i></span>" +
            // Ojo con los parentesis: el ternario se come lo que venga detras
            // mientras no esten entre parentesis. Sin ellos, la rama false se
            // comia el "+" del resto de la concatenacion, con lo que el boton,
            // su contenido y el </button> desaparecian de la fila y solo
            // quedaban los chips sueltos.
            ((p.chips || []).slice(0, 2).length
              ? '<span class="chips-fila">' +
                (p.chips || []).slice(0, 2).map(function (c) {
                  return '<span class="chip-mini">' + esc(c) + "</span>";
                }).join("") + "</span>"
              : "") +
            '<span class="mas" aria-hidden="true">' + (abierto === p.id ? "−" : "+") + "</span>" +
            "</button>";

    if (abierto !== p.id) return h;

    var dentro = '<div class="abierta">';
    (p.filas || []).forEach(function (f) {
      dentro += "<p>" + esc(f) + "</p>";
    });
    if ((p.banderas || []).length) {
      dentro += '<div class="banderas">' + p.banderas.map(function (b) {
        return "<div><code>" + esc(b[0]) + "</code><span>" + esc(b[1]) + "</span></div>";
      }).join("") + "</div>";
    }
    if ((p.chips || []).length > 2) {
      dentro += '<div class="etiquetas">' + p.chips.map(function (c) {
        return "<span>" + esc(c) + "</span>";
      }).join("") + "</div>";
    }
    dentro += "</div>";
    return h + dentro;
  }

  // ── El interruptor de color y blanco y negro ────────────────────────────
  //
  // Se guarda en localStorage, que funciona tambien desde file://, y si no hay
  // nada guardado se respeta lo que diga prefers-color-scheme. Lo aplica una
  // clase en <html>, de la que cuelgan tanto las capas como los colores, para
  // que cambien las dos cosas a la vez.
  var CLAVE = "rhythm-crea-bn";

  function leerBN() {
    try { return localStorage.getItem(CLAVE) === "1"; }
    catch (e) { return false; }
  }

  function aplicarBN(activo) {
    var raiz = document.documentElement;
    raiz.classList.toggle("bn", activo);
    var b = $("#interruptor");
    if (b) {
      b.setAttribute("aria-pressed", String(activo));
      b.title = activo ? "Volver al color" : "Pasar a blanco y negro";
    }
    var t = $("#interruptor-txt");
    if (t) t.textContent = activo ? "color" : "bn";
    // El halo esta en otro punto en cada version, asi que hay que recolocarlo.
    if (window.__capa && window.__capa.avisarCambio) window.__capa.avisarCambio();
  }

  function interruptor() {
    var b = $("#interruptor");
    if (!b) return;
    // Sin eleccion guardada se empieza en color. Seenea preguntar al sistema:
    // la pagina es oscura de por si, con lo que un tema claro del sistema no
    // dice nada util aqui, y ademas hacia que la primera captura de esta session
    // saliera en blanco y negro sin que nadie lo hubiera pedido.
    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE); } catch (e) { guardado = null; }
    aplicarBN(guardado === "1");

    b.addEventListener("click", function () {
      var activo = document.documentElement.classList.contains("bn");
      aplicarBN(!activo);
      try { localStorage.setItem(CLAVE, activo ? "0" : "1"); } catch (e) { /* sin storage */ }
    });
  }

  // De cuando son los datos. Va en el menu y no en la barra, que ya va bastante
  // cargada. Sin esto, el pie decia "sin datos" aunque los hubiera.
  function sellos() {
    var a1 = $("#sello-datos"), a2 = $("#sello-repos");
    if (a1) a1.textContent = S ? "la maquina, " + hace(S.generado) : "sin datos de la maquina";
    if (a2) a2.textContent = G ? "los repos, " + hace(G.recogido) : "sin datos de github";
  }

  // ── Arranque ───────────────────────────────────────────────────────────────

  function tic() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    var r = $("#reloj");
    if (r) r.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function inicio() {
    centrarNombre();
    var temp = S && S.temps ? S.temps.cpu : null;
    punto(temp);

    if (window.RHYTHM_CAPA) window.__capa = window.RHYTHM_CAPA.montar($("#escena"), temp);

    tic();
    setInterval(tic, 1000);

    var bajar = $("#bajar");
    if (bajar) {
      bajar.addEventListener("click", function () {
        $("#hyprland").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    var caja = $("#hyprland-caja");
    if (caja) {
      caja.addEventListener("click", function (ev) {
        var b = ev.target.closest(".pieza");
        if (!b) return;
        var id = b.getAttribute("data-id");
        abierto = abierto === id ? null : id;
        pintarHyprland();
      });
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && abierto) { abierto = null; pintarHyprland(); }
      else if (ev.key === "j" && H && H.piezas && H.piezas.length) {
        var p0 = H.piezas[0].id;
        abierto = abierto === p0 ? null : p0;
        pintarHyprland();
      }
    });

      interruptor();
      sellos();
      pintarHyprland();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicio);
  else inicio();

})();
