/* ─────────────────────────────────────────────────────────────────────────────
   Rhythm — todo el comportamiento de la pagina.

   Tres cosas la hacen dinamica, y las tres degradan bien:

     1. Los proyectos se pintan desde assets/projects.js, que es el unico
        fichero que hay que tocar para anadir uno.
     2. Las estrellas, el ultimo commit y el lenguaje de cada repo se consultan
        a la API de GitHub al cargar. Si falla, se queda el valor de respaldo y
        la tarjeta lo dice, en vez de quedarse muda.
     3. El estado real del escritorio sale de data/system.js, que genera
        scripts/collect-system-stats.sh en la maquina. Si no existe, la seccion
        lo explica en vez de mostrar ceros inventados.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  };

  var PROYECTOS = window.RHYTHM_PROJECTS || [];
  var CATEGORIAS = window.RHYTHM_CATEGORIES || [{ id: "all", label: "Todo" }];
  var SISTEMA = window.RHYTHM_SYSTEM || null;

  // ── Temas ────────────────────────────────────────────────────────────────
  //
  // "pywal" no es un tema escrito a mano: se construye con los colores que
  // pywal esta generando ahora mismo en la maquina, que es la misma idea que
  // hace Ryoku con el marco y la barra. Si no hay colores, el tema no existe.

  var TEMAS = [
    { id: "oscuro", etiqueta: "Tinta", swatch: "#ba5f44" },
    { id: "papel", etiqueta: "Papel", swatch: "#a4432a" },
    { id: "catppuccin", etiqueta: "Catppuccin", swatch: "#fab387" },
    { id: "tokyo", etiqueta: "Tokyo Night", swatch: "#7aa2f7" },
    { id: "nord", etiqueta: "Nord", swatch: "#88c0d0" },
    { id: "gruvbox", etiqueta: "Gruvbox", swatch: "#fabd2f" },
    { id: "vacio", etiqueta: "Blanco", swatch: "#ffffff" }
  ];

  function temaPywal() {
    if (!SISTEMA || !SISTEMA.pywal) return null;
    var p = SISTEMA.pywal;
    if (!p.bg || !p.fg) return null;
    return {
      id: "pywal",
      etiqueta: "Pywal",
      swatch: p.c3 || p.c4,
      css: {
        "--bg": p.bg, "--bg-2": p.c0, "--bg-3": p.c0,
        "--fg": p.fg,
        "--fg-dim": p.c2 || p.fg,
        "--fg-faint": p.c1 || p.fg,
        "--line": p.c1 || p.bg,
        "--line-2": p.c2 || p.fg,
        "--accent": p.c3 || p.fg,
        "--accent-2": p.c4 || p.fg,
        "--accent-ink": p.bg
      }
    };
  }

  function aplicarTema(tema, anunciar) {
    var raiz = document.documentElement;
    // Las variables del tema pywal se quitan antes de cambiar: si no, siguen
    // como estilos en linea y ganan a la hoja de estilos, asi que el cambio de
    // tema no se veria.
    if (tema && tema.css) {
      Object.keys(tema.css).forEach(function (k) { raiz.style.setProperty(k, tema.css[k]); });
    } else {
      raiz.removeAttribute("style");
    }
    raiz.setAttribute("data-theme", tema ? tema.id : "oscuro");

    try { localStorage.setItem("ritmo-tema", tema ? tema.id : "oscuro"); } catch (e) {}

    var btn = $("[data-tema-btn]");
    if (btn) {
      var punto = $(".swatch", btn);
      if (punto && tema && tema.swatch) punto.style.background = tema.swatch;
      var txt = $("[data-tema-nombre]", btn);
      if (txt) txt.textContent = tema ? tema.etiqueta : "Tema";
    }
    if (anunciar) brindis("Tema: " + (tema ? tema.etiqueta : "—"));
  }

  function todosLosTemas() {
    var lista = TEMAS.slice();
    var py = temaPywal();
    if (py) lista.splice(1, 0, py);
    return lista;
  }

  function cambiarTema(delta) {
    var lista = todosLosTemas();
    var actual = document.documentElement.getAttribute("data-theme");
    var i = -1;
    for (var k = 0; k < lista.length; k++) if (lista[k].id === actual) i = k;
    if (i < 0) i = 0;
    var siguiente = lista[(i + delta + lista.length) % lista.length];
    aplicarTema(siguiente, true);
  }

  // ── Aviso flotante ────────────────────────────────────────────────────────
  var brindisTemporizador = null;
  function brindis(texto) {
    var el = $(".brindis");
    if (!el) return;
    el.textContent = texto;
    el.classList.add("visible");
    clearTimeout(brindisTemporizador);
    brindisTemporizador = setTimeout(function () { el.classList.remove("visible"); }, 1400);
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  //
  // Sin token la API da 60 peticiones por hora por IP. Con 19 repos no hay
  // problema, pero en cuanto nos corten no se reintenta: reintentar 19 veces
  // solo gasta mas cuota. Ademas van en tandas de 6, porque disparar 19
  // peticiones de golpe es justo lo queprovoca el corte.
  var SIN_CUOTA = false;

  function pedirGithub(repo) {
    if (!repo || SIN_CUOTA) return Promise.resolve(null);
    return fetch("https://api.github.com/repos/" + repo, {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (r) {
        if (r.status === 403 || r.status === 429) { SIN_CUOTA = true; return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .catch(function () { return null; });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  function escapar(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function haceDias(fecha) {
    if (!fecha) return null;
    var d = (Date.now() - new Date(fecha).getTime()) / 86400000;
    return d < 0 ? 0 : d;
  }

  function textoFecha(fecha) {
    var d = haceDias(fecha);
    if (d === null) return "";
    if (d < 1) return "hoy";
    if (d < 2) return "ayer";
    if (d < 30) return "hace " + Math.floor(d) + " d";
    if (d < 365) return "hace " + Math.floor(d / 30) + " meses";
    return "hace " + Math.floor(d / 365) + " años";
  }

  // ── Proyectos ────────────────────────────────────────────────────────────

  var filtroActual = "all";
  var textoActual = "";
  var vivos = {};   // repo -> datos de la API, para no consultarlo dos veces

  function coincide(p) {
    if (filtroActual !== "all" && p.category !== filtroActual) return false;
    if (!textoActual) return true;
    var h = textoActual.toLowerCase();
    var todo = (p.name + " " + (p.tagline || "") + " " + (p.blurb || "") + " " +
                (p.tags || []).join(" ") + " " + (p.category || "")).toLowerCase();
    return h.split(/\s+/).every(function (t) { return todo.indexOf(t) !== -1; });
  }

  function estrella(p) {
    var vivo = vivos[p.repo];
    var n = vivo && typeof vivo.stargazers_count === "number"
      ? vivo.stargazers_count
      : (p.stars || 0);
    if (vivo) {
      return '<span class="estrella viva">★ ' + n +
        ' <span class="nuevo" title="Leido de la API de GitHub al cargar esta pagina">en vivo</span></span>';
    }
    return '<span class="estrella">★ ' + n + "</span>";
  }

  function tarjeta(p) {
    var vivo = vivos[p.repo];
    var lang = (vivo && vivo.language) || p.lang || "";
    var url = p.url || (p.repo ? "https://github.com/" + p.repo : "#");

    var pie = "";
    if (lang) pie += '<span class="lenguaje">' + escapar(lang) + "</span>";
    if (vivo && vivo.pushed_at) {
      pie += '<span class="lenguaje">' + escapar(textoFecha(vivo.pushed_at)) + "</span>";
    }
    pie += estrella(p);

    return (
      '<article class="tarjeta' + (p.featured ? " destacada" : "") + '">' +
        "<h3>" + escapar(p.name) + "</h3>" +
        '<span class="categoria">' + escapar(p.category || "") + "</span>" +
        '<p class="lema">' + escapar(p.tagline || "") + "</p>" +
        '<p class="detalle">' + escapar(p.blurb || "") + "</p>" +
        '<div class="tags">' + (p.tags || []).map(function (t) {
          return '<span class="tag">' + escapar(t) + "</span>";
        }).join("") + "</div>" +
        '<div class="pie">' + pie + "</div>" +
        '<a class="tendido" href="' + escapar(url) + '" target="_blank" rel="noopener" ' +
          'aria-label="Abrir ' + escapar(p.name) + '"></a>' +
      "</article>"
    );
  }

  function pintar() {
    var rejilla = $("#rejilla");
    if (!rejilla) return;
    var lista = PROYECTOS.filter(coincide);
    if (!lista.length) {
      rejilla.innerHTML =
        '<p class="vacio-estado">Nada con eso. ' +
        '<button class="chip" data-limpiar>Quitar el filtro</button></p>';
      return;
    }
    lista.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    rejilla.innerHTML = lista.map(tarjeta).join("");
  }

  // ── Escritorio en vivo ────────────────────────────────────────────────────

  function barra(nombre, valor, pct, color) {
    return '<div class="barra-fila"><span class="nombre">' + escapar(nombre) + "</span>" +
      '<span class="barra-pista"><span class="barra-relleno" style="width:' +
      pct.toFixed(0) + "%;background:" + (color || "") + '"></span></span>' +
      '<span class="cifra">' + escapar(valor) + "</span></div>";
  }

  function pintarSistema() {
    var raiz = $("#sistema");
    if (!raiz) return;

    if (!SISTEMA) {
      raiz.innerHTML =
        '<div class="panel"><h3>Sin datos</h3><p class="centinela">' +
        "Este estado se lee de <code>data/system.js</code>, que genera " +
        "<code>scripts/collect-system-stats.sh</code> en la maquina. Aqui no hay, " +
        "y antes de inventar ceros se dice que no hay." +
        "</p></div>";
      return;
    }

    var s = SISTEMA;
    var mons = s.monitors || [];
    var binds = s.binds || [];
    var temps = s.temps || {};
    var serv = s.servicios || {};
    var carga = String(s.loadavg || "0,0,0").split(",").map(parseFloat);

    // Tira de la portada
    var tira = $(".tira");
    if (tira) {
      var porLua = binds.filter(function (b) { return b.lua; }).length;
      var celdas = [
        ["Monitores", mons.length,
          mons.map(function (m) { return m.name + " " + m.width + "×" + m.height; }).join(" · ")],
        ["Atajos", binds.length, porLua + " escritos en Lua"],
        ["Encendido", s.uptime || "—", s.kernel || ""],
        ["Paquetes", s.paquetes != null ? s.paquetes : "—",
          s.disco_libre ? s.disco_libre + " libres" : ""]
      ];
      tira.innerHTML = celdas.map(function (c) {
        return "<div><dt>" + c[0] + "</dt><dd>" + escapar(String(c[1])) +
               "</dd><small>" + escapar(c[2] || "") + "</small></div>";
      }).join("");
    }

    var paneles = [];

    // Pantallas
    paneles.push(
      '<div class="panel"><h3>Pantallas</h3>' +
      (mons.length
        ? mons.map(function (m) {
            var interna = /^(eDP|LVDS|DSI)/.test(m.name || "");
            return '<div class="monitor"><div class="forma' + (interna ? " interna" : "") + '"></div>' +
              '<div class="info"><b>' + escapar(m.name) + "</b><span>" +
              m.width + "×" + m.height + " · escala " + m.scale +
              (m.refresh ? " · " + m.refresh + " Hz" : "") +
              (interna ? " · panel interno" : "") + "</span></div></div>";
          }).join("")
        : '<p class="centinela">No se han detectado pantallas.</p>') +
      "</div>"
    );

    // Temperaturas. A partir de 80 grados se pinta con el acento, que es donde
    // un portatil empieza a bajar el rendimiento por calor.
    if (temps.all && temps.all.length) {
      paneles.push(
        '<div class="panel"><h3>Temperaturas</h3><div class="barras">' +
        temps.all.slice(0, 7).map(function (t) {
          var color = t.c >= 80 ? "var(--accent)" : t.c >= 70 ? "var(--accent-2)" : "";
          return barra(String(t.chip).slice(0, 9), t.c.toFixed(0) + "°C",
                       Math.min(100, (t.c / 100) * 100), color);
        }).join("") +
        "</div></div>"
      );
    }

    // Carga
    var lineaEstado = serv.fallidos
      ? '<p class="centinela" style="color:var(--accent)">' + serv.fallidos + " servicio(s) caido(s)</p>"
      : '<p class="centinela">' + (serv.activos || 0) + " servicios de usuario activos</p>";
    paneles.push(
      '<div class="panel"><h3>Carga</h3><div class="barras">' +
      ["1 min", "5 min", "15 min"].map(function (et, i) {
        var v = carga[i] || 0;
        return barra(et, v.toFixed(2), Math.min(100, (v / 8) * 100));
      }).join("") +
      "</div>" + lineaEstado + "</div>"
    );

    // Atajos: los de nombre mas corto, porque 78 en fila no dicen nada.
    var cortos = binds.slice().sort(function (a, b) {
      return String(a.key).length - String(b.key).length;
    }).slice(0, 44);
    paneles.push(
      '<div class="panel"><h3>Atajos (' + binds.length + ")</h3>" +
      '<div class="lista-atajos">' +
      cortos.map(function (b) {
        return '<span class="atajo">' + (b.mod ? "<b>SUPER+</b>" : "") +
               escapar(b.key) + "</span>";
      }).join("") +
      "</div>" +
      (binds.length > cortos.length
        ? '<p class="centinela">y ' + (binds.length - cortos.length) + " mas</p>"
        : "") +
      "</div>"
    );

    raiz.innerHTML = paneles.join("");

    // Las barras se animan despues de insertarlas: si el ancho ya esta puesto
    // al insertar, no hay transicion que ver.
    requestAnimationFrame(function () {
      $$(".barra-relleno", raiz).forEach(function (el) {
        var w = el.style.width;
        el.style.width = "0";
        requestAnimationFrame(function () { el.style.width = w; });
      });
    });
  }

  // ── Aparicion al hacer scroll ─────────────────────────────────────────────

  function observar() {
    var elementos = $$(".aparece");
    var sinMovimiento = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || sinMovimiento) {
      elementos.forEach(function (e) { e.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    elementos.forEach(function (e) { io.observe(e); });
  }

  // ── Teclado ──────────────────────────────────────────────────────────────

  function irA(sel) {
    var el = $(sel);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function alternarCapa() {
    var c = $("#capa");
    if (c) c.classList.toggle("abierta");
  }

  function teclado(e) {
    var enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "Escape") {
      var c = $("#capa");
      if (c) c.classList.remove("abierta");
      if (enCampo) document.activeElement.blur();
      return;
    }
    if (enCampo || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.shiftKey && (e.key === "T" || e.key === "t")) { e.preventDefault(); cambiarTema(-1); }
    else if (e.key === "t" || e.key === "T") { e.preventDefault(); cambiarTema(1); }
    else if (e.key === "/") {
      e.preventDefault();
      var b = $("#q");
      if (b) { b.focus(); b.select(); }
    } else if (e.key === "?") { e.preventDefault(); alternarCapa(); }
    else if (e.key === "g") { e.preventDefault(); irA("#proyectos"); }
    else if (e.key === "e") { e.preventDefault(); irA("#escritorio"); }
  }

  // ── Arranque ──────────────────────────────────────────────────────────────

  function iniciar() {
    var guardado = null;
    try { guardado = localStorage.getItem("ritmo-tema"); } catch (e) {}
    var lista = todosLosTemas();
    var tema = null;
    for (var k = 0; k < lista.length; k++) if (lista[k].id === guardado) tema = lista[k];
    aplicarTema(tema || lista[0], false);

    var barraFiltros = $("#filtros");
    if (barraFiltros) {
      barraFiltros.innerHTML = CATEGORIAS.map(function (c) {
        return '<button class="chip" data-cat="' + c.id + '" aria-pressed="' +
          (c.id === filtroActual) + '">' + escapar(c.label) + "</button>";
      }).join("") +
      '<div class="buscador"><input id="q" type="search" placeholder="Buscar…" ' +
      'aria-label="Buscar proyectos" autocomplete="off" spellcheck="false"></div>';

      barraFiltros.addEventListener("click", function (ev) {
        var chip = ev.target.closest(".chip");
        if (!chip) return;
        if (chip.hasAttribute("data-limpiar")) {
          filtroActual = "all";
          textoActual = "";
          var q0 = $("#q");
          if (q0) q0.value = "";
        } else {
          filtroActual = chip.getAttribute("data-cat");
        }
        $$(".chip[data-cat]", barraFiltros).forEach(function (c) {
          c.setAttribute("aria-pressed",
            String(c.getAttribute("data-cat") === filtroActual));
        });
        pintar();
      });

      var entrada = $("#q");
      if (entrada) {
        var t = null;
        entrada.addEventListener("input", function () {
          clearTimeout(t);
          t = setTimeout(function () {
            textoActual = entrada.value.trim();
            pintar();
          }, 120);
        });
      }
    }

    pintar();
    pintarSistema();
    observar();

    document.addEventListener("keydown", teclado);
    document.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-tema-btn]")) cambiarTema(1);
      if (ev.target.closest("[data-ayuda]")) alternarCapa();
      if (ev.target.closest(".capa") && !ev.target.closest(".capa > div")) alternarCapa();
    });

    var cab = $(".cabecera");
    if (cab) {
      var alPagar = function () { cab.classList.toggle("pegada", window.scrollY > 8); };
      window.addEventListener("scroll", alPagar, { passive: true });
      alPagar();
    }

    // Datos de GitHub despues de pintar, para que la pagina se vea al instante
    // y los numeros lleguen cuando lleguen.
    var cola = PROYECTOS.filter(function (p) { return p.repo; });
    var i = 0;
    (function bombear() {
      if (i >= cola.length || SIN_CUOTA) return;
      var lote = cola.slice(i, i + 6);
      i += 6;
      Promise.all(lote.map(function (p) {
        return pedirGithub(p.repo).then(function (d) {
          if (d) { vivos[p.repo] = d; p.lang = d.language; }
        });
      })).then(function () {
        pintar();
        bombear();
      });
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
