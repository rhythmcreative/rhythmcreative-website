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
    if (!fecha) return "no data";
    var t = new Date(String(fecha).replace(" ", "T"));
    if (isNaN(t)) return esc(fecha);
    var min = Math.floor((Date.now() - t.getTime()) / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + " min ago";
    var h = Math.floor(min / 60);
    return h < 24 ? h + " h ago" : Math.floor(h / 24) + " d ago";
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
           : "no github data") + "</span>");
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
      if (p.tipo) dentro += vivo(p);
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

// ── Los cuatro bloques de datos vivos ───────────────────────────────────
    //
    // Todos leen de data/system.js, que escribe el recolector en la maquina
    // del sitio. `tipo` en assets/hyprland.js elige cual se pinta.
    //
    // Si el dato no esta, sale una linea de aviso. Nunca un numero inventado:
    // una pagina que se inventa un dato es peor que una que no lo tiene.
    function vivo(p) {
      if (p.tipo === "paleta") return paleta();
      if (p.tipo === "terminal") return terminal();
      if (p.tipo === "comando") return comando(p);
      if (p.tipo === "pantallas") return pantallas();
      return "";
    }

    // La paleta que pywal ha generado ahora mismo. Es la del sistema de quien
    // publica, no una fija: si cambia el wallpaper, esto cambia con el.
    function paleta() {
      var w = (S && S.pywal) || null;
      if (!w || !w.c0) return '<p class="sin-datos">No pywal palette collected.</p>';
      var claves = [["c0", "background"], ["c1", "one"], ["c2", "two"],
                    ["c3", "three"], ["c4", "four"], ["c5", "five"],
                    ["fg", "foreground"]];
      var muestras = claves.filter(function (k) { return w[k[0]]; }).map(function (k) {
        return '<div class="muestra"><span class="chip" style="background:' +
               esc(w[k[0]]) + '"></span><span class="hex">' + esc(w[k[0]]) +
               '<i>' + esc(k[1]) + "</i></span></div>";
      }).join("");
      return '<div class="muestras">' + muestras + "</div>" +
        '<p class="nota-dato">Read from <code>~/.cache/wal/colors.json</code>' +
        (S && S.generado ? " " + esc(hace(S.generado)) : "") +
        ". Change the wallpaper and these change with it.</p>";
    }

    // La salida REAL de rhythm-doctor, sin el color. Including whatever failed:
    // un doctor que solo dice ok no demuestra nada.
    function terminal() {
      var d = (S && S.doctor) || null;
      if (!d || !d.lineas) return '<p class="sin-datos">rhythm-doctor has not been run.</p>';
      var cuerpo = d.lineas.map(function (l) {
        var clase = "";
        if (/^\s*FAIL/.test(l)) clase = " mal";
        else if (/^\s*warn/.test(l)) clase = " aviso";
        else if (/^\s*ok/.test(l)) clase = " ok";
        else if (/^[A-Za-z]/.test(l)) clase = " titulo";
        return '<span class="l' + clase + '">' + esc(l) + "</span>";
      }).join("");
      var pie = d.fallos
        ? '<span class="l mal">' + d.fallos + " item" + (d.fallos > 1 ? "s" : "") +
          " failing right now</span>"
        : '<span class="l ok">nothing failing</span>';
      var html = '<div class="terminal" tabindex="0" role="group" ' +
                 'aria-label="rhythm-doctor output"><pre>' + cuerpo + "</pre>" +
                 '<p class="terminal-pie">' + pie + (d.truncado ? " (truncated)" : "") +
                 "</p></div>";
      // El bloque tiene altura maxima, asi que con 20 lineas de salida siempre
      // hay algo abajo. Se marca con una clase para poder poner un degradado
      // que avise de que se puede bajar, en vez de cortar la linea del tiempo
      // y que parezca un fallo de la pagina.
      requestAnimationFrame(function () {
        var pre = document.querySelector(".terminal pre");
        if (!pre) return;
        var caja = pre.parentNode;
        if (pre.scrollHeight > pre.clientHeight + 2) caja.classList.add("desplaza");
      });
      return html;
    }

    // El comando de instalacion, para copiarlo de un clic.
    function comando(p) {
      if (!p.comando) return "";
      return '<div class="comando"><code>' + esc(p.comando) + "</code>" +
        '<button class="copiar" type="button" data-copiar="' + esc(p.comando) +
        '">copy</button></div>';
    }

    // Las pantallas, leidas de Hyprland.
    function pantallas() {
      var ms = (S && S.monitors) || [];
      if (!ms.length) return '<p class="sin-datos">No displays collected.</p>';
      var filas = ms.map(function (m) {
        var extra = "";
        if (m.primary) extra += "  ·  primary";
        if (/^(eDP|LVDS|DSI)/.test(m.name || "")) extra += "  ·  built in";
        return '<div class="fila-pantalla"><span class="nom">' + esc(m.name) + "</span>" +
          '<span class="res">' + esc(String(m.width)) + "×" + esc(String(m.height)) +
          "</span>" + '<span class="det">scale ' + esc(String(m.scale)) + extra +
          "</span></div>";
      }).join("");
      return '<div class="pantallas">' + filas + "</div>";
    }

    // El boton de copiar. Va por delegacion, asi que sirve para todos los
    // comandos que se anadan despues sin tocar nada mas.
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".copiar");
      if (!b) return;
      var txt = b.getAttribute("data-copiar") || "";
      var listo = function () {
        var antes = b.textContent;
        b.textContent = "copied";
        b.classList.add("hecho");
        setTimeout(function () {
          b.textContent = antes;
          b.classList.remove("hecho");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(listo, function () { copiavieja(txt, listo); });
      } else {
        copiavieja(txt, listo);
      }
    });

    // file:// no siempre tiene clipboard.writeText, y ahi es justo donde se mira
    // la pagina. El truco viejo de textarea sigue funcionando.
    function copiavieja(txt, listo) {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); listo(); } catch (e) { /* nada */ }
      document.body.removeChild(ta);
    }
  // ── El interruptor de color y blanco y negro ────────────────────────────
  //
  // Se guarda en localStorage, que funciona tambien desde file://, y si no hay
  // nada guardado se respeta lo que diga prefers-color-scheme. Lo aplica una
  // clase en <html>, de la que cuelgan tanto las capas como los colores, para
  // que cambien las dos cosas a la vez.
  var CLAVE = "rhythm-crea-tema";

  // Dos temas: negro y blanco. No se pregunta al sistema, porque la pagina es
  // oscura de por si y un tema claro del sistema no dice nada util aqui.
  // Sin eleccion guardada se empieza en negro.
  function aplicarClaro(activo) {
    document.documentElement.classList.toggle("claro", activo);
    var b = $("#interruptor");
    if (b) {
      b.setAttribute("aria-pressed", String(activo));
      b.title = activo ? "Switch to the dark theme" : "Switch to the light theme";
    }
    // theme-color es lo que pinta la barra del navegador en los moviles. Estaba
    // fija en el negro del tema oscuro, asi que con la pagina en blanco la barra
    // del navegador seguia siendo negra: la unica parte de la pagina que no
    // cambie con el tema. Se toma el --suelo de verdad, no un color inventado
    // aqui, para que si un dia se toca la paleta no haya que tocar dos sitios.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var suelo = getComputedStyle(document.documentElement)
        .getPropertyValue("--suelo").trim();
      if (suelo) meta.setAttribute("content", suelo);
    }
    // El halo del angel cae en otro punto en cada tema, asi que hay que recolocarlo.
    if (window.__capa && window.__capa.avisarCambio) window.__capa.avisarCambio();
  }

  function interruptor() {
    var b = $("#interruptor");
    if (!b) return;
    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE); } catch (e) { guardado = null; }
    aplicarClaro(guardado === "claro");

    b.addEventListener("click", function () {
      var activo = document.documentElement.classList.contains("claro");
      aplicarClaro(!activo);
      try { localStorage.setItem(CLAVE, activo ? "negro" : "claro"); } catch (e) { /* sin storage */ }
    });
  }

  // De cuando son los datos. Va en el menu y no en la barra, que ya va bastante
  // cargada. Sin esto, el pie decia "sin datos" aunque los hubiera.
  function sellos() {
    var a1 = $("#sello-datos"), a2 = $("#sello-repos");
    if (a1) a1.textContent = S ? "this machine, " + hace(S.generado) : "no data from this machine";
    if (a2) a2.textContent = G ? "the repos, " + hace(G.recogido) : "no github data";
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
