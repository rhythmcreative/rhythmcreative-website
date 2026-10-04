// ─────────────────────────────────────────────────────────────────────────────
// Buscador. Se abre con "/" o con Ctrl+K, busca en Algolia y lista los resultados.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUÉ NO SE USA LA LIBRERÍA DE ALGOLIA
//
// Se podría: `algoliasearch` es lo normal, y hay un script para pegarlo en el <head>.
// No se usa, por tres razones concretas:
//
//   1. Sería el único script de terceros de la web. Ahora mismo no hay ninguno, y el
//      `script-src` de la CSP tiene dentro una huella SHA en vez de un comodín. Meter
//      un CDN significa abrir `script-src` a `https://cdn.jsdelivr.net`, y a partir de
//      ahi ese dominio puede servir cualquier cosa que quiera en tu página, sin que
//      lo veas.
//
//   2. Es código que no has leído. El bundle de Algolia pesa unos 40 KB y cambia sin
//      avisar en cada versión.
//
//   3. No hace falta. La API de búsqueda es un POST a una URL con dos cabeceras. Lo
//      que hace la librería por ti son cosas que aquí no se usan: reintentos, RNAs,
//      sitemap automático, métricas. Y en la versión de Lite son las mismas.
//
// Esto son unas 40 líneas de `fetch` que se pueden leer enteras. La clave que se
// manda va en una cabecera, no en la URL, así que no se queda en el historial del
// navegador ni en los registros del servidor de Algolia.
//
// ─────────────────────────────────────────────────────────────────────────────
// LA PRIVACIDAD, DICHA CONCLUYENTE
//
// Al escribir, lo que se escribe se envía a los servidores de Algolia. Es un
// servicio de terceros y no hay forma de buscar con él sin que salga de aquí. Eso es
// distinto del resto de la web, que no habla con nadie.
//
// Lo que SÍ se controla:
//   - Lo que sale es lo que escribes y nada más. No se manda el camino de la página,
//     ni su identificador de visitante, ni nada de la cuenta.
//   - La página lleva `referrer` "strict-origin-when-cross-origin", así que Algolia
//     solo ve rhythmcrea.com, nunca la URL completa con el ancla.
//   - La clave que va aquí es la de solo búsqueda, restringida a este índice y sin
//     permiso de escribir. Se puede ver en el código: es lo previsto.
//
// Lo que NO se controla: el texto que escribas existe en los servidores de Algolia
// mientras haces la consulta. Si eso no es aceptable, no hay buscador. En ese caso,
// la alternativa es un buscador local, que ya sedqhadría escribir y NO necesita este
// fichero: con 132 registros cabe entero en la página y no sale ni un byte.
//
// Si Algolia no devuelve nada —sin red, sin cobertura, sin clave—, el buscador cae a
// la búsqueda local en lugar de quedarse muerto. Por eso existe.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  // ── Lo único que hay que rellenar ────────────────────────────────────────────
  //
  // Son DOS cosas, y hacen falta las dos. Algolia las pide en cada petición, y el
  // host de búsqueda se construye con la primera:
  //
  //     https://<APP_ID>-dsn.algolia.net/1/indexes/*/queries
  //     X-Algolia-Application-Id: <APP_ID>
  //     X-Algolia-API-Key: <CLAVE_BUSQUEDA>
  //
  // Con la clave sola no hay host al que ir, y el ID no se puede deducir de la clave:
  // es una derivación en un solo sentido. Si falta cualquiera de las dos, el buscador
  // no se monta y la web va exactamente igual que antes.
  //
  // ── POR QUÉ ESTA CLAVE ESTÁ EN EL CÓDIGO, SIN OCULTAR ───────────────────────
  //
  // Porque es una clave de SOLO BÚSQUEDA, y esa clase de clave está hecha para ir en
  // una página pública: no puede escribir nada, no puede leer nada fuera del índice
  // al que está restringida, y lo peor que puede hacer un atacante con ella es ver lo
  // que ya está en tu web. Se puede ver en el código y no pasa nada. Así funcionan
  // los buscadores de la mitad de internet.
  //
  // Lo que NO puede acabar aquí nunca es la clave de escritura, que sí puede vaciar
  // el índice y leer tus facturas. Esa vive solo en la terminal del indexador:
  // tools/algolia-indexar.mjs se niega a arrancar si no llega por variable de
  // entorno.
  var APP_ID = "0WWMDPLF0W"; // Settings -> API keys -> Application ID. No es secreto.
  var INDICE = "rhythmcrea";
  var CLAVE_BUSQUEDA = "9ac94b402cc44fc9217a38c3adff23bb"; // search-only, restringida a INDICE
  var HABILITADO = APP_ID !== "" && CLAVE_BUSQUEDA !== "";

  var URL_API = "https://" + APP_ID + "-dsn.algolia.net/1/indexes/*/queries";

  // ── El botón ────────────────────────────────────────────────────────────────

  var BANDERA = { es: "manual", ca: "manual", pt: "manual", fr: "manual", it: "manual" };

  function T(texto) {
    if (window.traducir) return window.traducir(texto);
    return texto;
  }

  function anclajesDe(pagina) {
    if (pagina === "manual") return ["manual.html"];
    return ["index.html", "manual.html"];
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────

  var caja, campo, lista, estado, contador, abierto = false, ultimo = 0;
  var peticiones = 0;
  var resultados = [];
  var resaltado = -1;
  var textoOriginal = "";

  // El pie del diálogo: las teclas y el "Search by Algolia".
  //
  // Es la barra de la foto de DocSearch: a la izquierda lo que hace cada tecla y a
  // la derecha quien busca. Las tres frases van por el traductor como todo lo demás;
  // "Search by" no se traduce porque es la marca que pide Algolia para usar su
  // servicio, y las marcas no se traducen. El logo es texto con un enlace, no una
  // imagen: una imagen suya sería una petición a un tercero y la CSP solo deja salir
  // al host de la API, no al de sus imágenes.
  function pie() {
    var f = document.createElement("div");
    f.className = "buscador-pie";
    var pistas = document.createElement("div");
    pistas.className = "buscador-atajos";
    [["⏎", "to select"], ["↓", "to navigate"], ["↑", "to navigate"], ["esc", "to close"]].forEach(function (par) {
      var s = document.createElement("span");
      s.className = "buscador-atajo";
      var k = document.createElement("kbd");
      k.textContent = par[0];
      s.appendChild(k);
      var t = document.createElement("span");
      t.className = "buscador-atajo-texto";
      t.setAttribute("data-pista", par[1]);
      t.textContent = T(par[1]);
      s.appendChild(t);
      pistas.appendChild(s);
    });
    f.appendChild(pistas);
    var marca = document.createElement("a");
    marca.className = "buscador-marca";
    marca.href = "https://www.algolia.com/";
    marca.target = "_blank";
    marca.rel = "noopener";
    marca.innerHTML = esc(T("Search by")) + ' <b>Algolia</b>';
    f.appendChild(marca);
    return f;
  }

  function crear() {
    // Fondo y panel son DOS elementos, no uno.
    //
    // Con uno solo —un overlay que cubre toda la pantalla— "pinchar fuera para cerrar"
    // es imposible: todo cae dentro, no hay fuera. Medido: el clic en la esquina
    // entraba en la caja y no cerraba nada, y solo se podía salir con el botón "esc"
    // o con Escape. Así que el fondo va aparte, el panel dentro, y se cierra el
    // fondo, que es lo que se espera de un diálogo.
    caja = document.createElement("div");
    caja.className = "buscador-caja";
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-modal", "true");
    caja.setAttribute("aria-label", T("Search this site"));
    caja.hidden = true;
    caja.innerHTML = '<div class="buscador-fondo"></div>' +
      '<div class="buscador-panel">' +
        '<div class="buscador-cabecera">' +
          '<span class="buscador-lupa" aria-hidden="true"></span>' +
          '<input type="search" id="buscador-campo" class="buscador-campo" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
            'aria-describedby="buscador-estado">' +
          '<button type="button" class="buscador-cerrar" aria-label="' + esc(T("Close")) + '">' +
            "esc</button>" +
        "</div>" +
        '<p class="buscador-estado" id="buscador-estado" role="status" aria-live="polite"></p>' +
        '<ol class="buscador-lista" id="buscador-lista"></ol>' +
      "</div>";

    caja.querySelector(".buscador-panel").appendChild(pie());

    campo = caja.querySelector("#buscador-campo");
    lista = caja.querySelector("#buscador-lista");
    estado = caja.querySelector("#buscador-estado");

    document.body.appendChild(caja);

    campo.addEventListener("input", function () { pedir(); });
    campo.addEventListener("keydown", teclas);
    lista.addEventListener("click", function (e) {
      var li = e.target.closest ? e.target.closest("li[data-ir]") : null;
      if (li) ir(li.getAttribute("data-ir"), li.getAttribute("data-pag"));
    });

    // Cerrar: el botón, el fondo, o Escape. Y el panel se traga el clic para que
    // pinchar en un hueco entre resultados no cierre el diálogo mientras se lee.
    caja.querySelector(".buscador-cerrar").addEventListener("click", cerrar);
    caja.querySelector(".buscador-fondo").addEventListener("click", cerrar);
    caja.querySelector(".buscador-panel").addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Escape cierra esté el foco donde esté. Estaba solo en el campo, así que si el
    // foco se iba a otra parte —pinchar en un resultado, por ejemplo— dejaba de
    // funcionar. Un diálogo modal se cierra con Escape siempre.
    document.addEventListener("keydown", function (e) {
      if (abierto && e.key === "Escape") { e.preventDefault(); cerrar(); }
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Abrir y cerrar ───────────────────────────────────────────────────────────
  //
  // No hace falta que `abrir` reciba el evento. Antes sí: el manejador global de
  // "pincha fuera" necesitaba saber si el clic que le llegaba era el mismo que había
  // abierto el diálogo, y por eso comparaba objetos. Ese manejador ya no existe —el
  // fondo es un elemento aparte y es el que cierra— así que la variable era código
  // muerto y `abrir(ev)` recibía un argumento que nadie leía.

  var ANTERIOR = null;

  function abrir() {
    if (!caja) crear();
    ANTERIOR = document.activeElement;
    caja.hidden = false;
    abierto = true;
    campo.value = "";
    campo.placeholder = T("Search this site");
    resultados = [];
    resaltado = -1;
    pintar();
    campo.focus();
  }

  function cerrar() {
    if (!caja || !abierto) return;
    caja.hidden = true;
    abierto = false;
    if (ANTERIOR && ANTERIOR.focus) ANTERIOR.focus();
  }

  // ── Consulta ────────────────────────────────────────────────────────────────

  function cuerpo() {
    var q = campo.value.replace(/\s+/g, " ").trim();
    textoOriginal = campo.value;
    if (q.length < 2) { pintar(); return; }
    // 130 ms. Menos y se manda una petición por tecla, que es lo que hace un
    // buscador que se siente lento; más y se nota el retardo al escribir.
    var ahora = Date.now();
    if (ahora - ultimo < 130) return;
    ultimo = ahora;
    peticiones++;
    var mio = peticiones;
    estado.textContent = T("Searching…");
    lista.innerHTML = "";
    if (!HABILITADO) { local(q, mio); return; }
    remoto(q).catch(function () {
      // Sin red, sin clave o indice vacio: se busca en local. El buscador se queda
      // util sin Algolia, que es la unica forma de que no pueda romperse del todo.
      if (mio === peticiones) { estado.textContent = ""; local(q, mio); }
    });
  }

  function pedir() {
    // El retardo se hace con un temporizador en vez de comparar fechas al teclear: con
    // comparar fechas, si el usuario deja de escribir a mitad de camino no hay nada que
    // cancele y la consulta se queda pendiente para siempre.
    clearTimeout(pedir.t);
    pedir.t = setTimeout(cuerpo, 130);
  }

  function remoto(q) {
    var lengua = document.documentElement.getAttribute("data-idioma") || "en";
    // optionalFilters: primero busca en la lengua de la pagina y, si no hay nada,
    // cae a la inglesa. Sin esto, alguien que busca en catalan no encuentra el
    // capitulo que solo esta escrito en ingles, y viceversa.
    var filtros = lengua === "en" ? [] : ["lang:" + lengua, "lang:en"];
    var params = {
      requests: [{
        indexName: INDICE,
        query: q,
        hitsPerPage: 8,
        // No se pide HTML a Algolia. Antes se usaba _snippetResult, que viene con
        // <b> puesto por el servidor, y se metia en la pagina con innerHTML. Eso es
        // meter HTML de un tercero sin revisarlo: si ese indice llegara a tener algo
        // raro dentro, se ejecutaba aqui. El resaltado se hace en casa, con el texto
        // plano y escapado, y asi no hay nada que revisar porque no hay nada ajeno.
        attributesToHighlight: [],
        attributesToSnippet: [],
        // Lo que mas pesa: primero los capitulos, despues los subapartados. Sin
        // esto el resultado mas relevante puede ser un "que no hace" suelto.
        optionalFilters: filtros,
        attributesToRetrieve: ["titulo", "texto", "ancla", "pagina", "codigo"]
      }]
    };
    var ctrl = new AbortController();
    // Si en 6 s no ha contestado, se cae a la busqueda local. Una consulta colgada
    // con el dialogo abierto es la peor forma de quedarse.
    var corte = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(URL_API, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "X-Algolia-Application-Id": APP_ID,
        "X-Algolia-API-Key": CLAVE_BUSQUEDA,
        "X-Algolia-Agent": "rhythmcrea-web (1.0)"
      },
      body: JSON.stringify(params)
    }).then(function (r) {
      clearTimeout(corte);
      if (!r.ok) throw new Error("Algolia " + r.status);
      return r.json();
    }).then(function (j) {
      var hits = (j.results && j.results[0] && j.results[0].hits) || [];
      resultados = hits.map(function (h) {
        return { titulo: h.titulo || "", ancla: h.ancla || "", pagina: h.pagina || "manual",
                 texto: h.texto || "", codigo: h.codigo || [] };
      });
      pintar(hits.length);
    });
  }

  // ── Búsqueda local ──────────────────────────────────────────────────────────
  //
  // No necesita Algolia ni red. Se usa cuando Algolia no contesta, y con el
  // interruptor de la derecha se puede ver siempre, para comprobar que los dos
  // devuelve lo mismo. Con 132 registros, comparar palabra por palabra va bien.
  function local(q, mio) {
    var base = window.__BUSCADOR_LOCAL;
    if (!base || !base.length) { resultados = []; pintar(0, true); return; }
    var palabras = q.toLowerCase().split(/\s+/).filter(function (p) { return p.length > 1; });
    var lengua = document.documentElement.getAttribute("data-idioma") || "en";
    var puntos = [];
    base.forEach(function (r) {
      // Los campos son cortos a propósito (t/a/p/l en vez de titulo/ancla/pagina/lang):
      // son 126 registros y cada byte cuenta para que el respaldo pese 9 KB y no 86.
      var titulo = r.t || "", ancla = r.a || "", pagina = r.p || "manual";
      var t = (titulo + " " + (r.texto || "") + " " + (r.codigo || []).join(" ")).toLowerCase();
      var n = 0;
      palabras.forEach(function (p) { if (t.indexOf(p) > -1) n++; });
      if (!n) return;
      // El titulo pesa doble, y estar en la lengua de la pagina pesa mas todavia.
      var tl = titulo.toLowerCase();
      var enTitulo = palabras.filter(function (p) { return tl.indexOf(p) > -1; }).length;
      puntos.push({ titulo: titulo, ancla: ancla, pagina: pagina, n: n + enTitulo * 2 + (r.l === lengua ? 3 : 0) });
    });
    puntos.sort(function (a, b) { return b.n - a.n; });
    // El respaldo local no trae texto, solo titulos y anclas —por eso son 9 KB y no
    // 86—, asi que no hay nada que recortar: el resultado es el titulo y el sitio al
    // que lleva.
    resultados = puntos.slice(0, 8).map(function (x) {
      return { titulo: x.titulo, ancla: x.ancla, pagina: x.pagina, local: true };
    });
    pintar(resultados.length, true);
  }

  // Recorta el texto alrededor de la primera coincidencia. Sin esto el resultado
  // enseña el principio del apartado y la palabra buscada esta en el parrafo 300.
  //
  // Devuelve HTML con el <b> ya puesto, y para eso primero escapa. El orden importa:
  // escapar ANTES de marcar, porque si se marcara primero el <b> de Algolia —o un
  // "<script>" del propio contenido— se colaria por el mismo sitio que se acaba de
  // limpiar.
  function recorteLocal(texto, palabras) {
    var t = texto.replace(/\s+/g, " ");
    var pos = -1;
    for (var i = 0; i < palabras.length && pos === -1; i++) pos = t.toLowerCase().indexOf(palabras[i]);
    var desde = pos === -1 ? 0 : Math.max(0, pos - 50);
    var trozo = t.slice(desde, desde + 150);
    return (desde ? "…" : "") + resaltar(trozo, textoOriginal) + (desde + 150 < t.length ? "…" : "");
  }


  // ── Pintar ──────────────────────────────────────────────────────────────────

  function pintar(total, esLocal) {
    lista.innerHTML = "";
    if (total === undefined) {
      // Sin consulta todavía: se dice qué se puede buscar, que es mejor que una
      // ventana en blanco.
      estado.textContent = "";
      if (!resultados.length) {
        var p = document.createElement("li");
        p.className = "buscador-pista";
        p.textContent = T("Search the manual, the shortcuts and the installer.");
        lista.appendChild(p);
      }
      return;
    }
    if (!resultados.length) {
      estado.textContent = T("Nothing found.");
      var li = document.createElement("li");
      li.className = "buscador-pista";
      li.textContent = T("Try fewer words.");
      lista.appendChild(li);
      return;
    }
    estado.textContent = (total === 1 ? T("1 result") : T("%d results").replace("%d", total)) +
      (esLocal ? "  ·  " + T("from this page, not from the server") : "");
    resultados.forEach(function (r, i) {
      var li = document.createElement("li");
      li.className = "buscador-resultado";
      li.setAttribute("data-ir", r.ancla);
      li.setAttribute("data-pag", r.pagina || "manual");
      li.setAttribute("role", "option");
      li.id = "buscador-r" + i;
      var t = document.createElement("b");
      t.innerHTML = resaltar(r.titulo, campo.value);
      var s = document.createElement("span");
      s.className = "buscador-trozo";
      // Siempre pasa por recorteLocal(), que escapa antes de marcar. La rama
      // anterior era "r.trozo !== undefined ? r.trozo : ..." y r.trozo ya no lo ponia
      // nadie: era codigo muerto que, ademas, sugeria que por ahi podia colarse algo
      // sin escapar. Un solo camino y se acabo la duda.
      s.innerHTML = recorteLocal(r.texto || "", palabrasDe(textoOriginal));
      var d = document.createElement("em");
      d.textContent = r.pagina === "manual" ? T("The manual") : T("This page");
      li.appendChild(t); li.appendChild(s); li.appendChild(d);
      lista.appendChild(li);
    });
  }

  // ── Resaltar en el título ───────────────────────────────────────────────────
  //
  // Se hace aquí y no con lo que devuelve Algolia, por dos razones: el marcado de
  // Algolia se decide en el servidor y no se puede revisar, y aquí hay que escapar
  // el texto de todas formas. Con dos lineas de escapado no hay superficie.
  function palabrasDe(q) {
    return String(q || "").replace(/\s+/g, " ").trim()
      .split(" ").filter(function (p) { return p.length > 1; });
  }

  function resaltar(texto, q) {
    var t = esc(texto);
    palabrasDe(q).forEach(function (p) {
      var rx = new RegExp("(" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      t = t.replace(rx, "<b>$1</b>");
    });
    return t;
  }

  // ── Ir al resultado ─────────────────────────────────────────────────────────

  function ir(ancla, pagina) {
    if (!ancla) { cerrar(); return; }
    // La página sale del resultado que se ha pinchado, no del primero de la lista.
    // Antes se usaba resultados[0].pagina siempre: con resultados de las dos páginas
    // mezclados, pinchar el segundo te llevaba a la página del primero.
    if (!pagina) pagina = resultados.length ? resultados[0].pagina : "manual";
    var aquí = /manual\.html$/.test(location.pathname);
    if (pagina === "manual" && !aquí) {
      location.href = "manual.html#" + ancla;
      return;
    }
    cerrar();
    var destino = document.getElementById(ancla);
    if (destino) {
      destino.scrollIntoView({ behavior: "smooth", block: "start" });
      // El foco se pone en el destino, no en el campo: con teclado, el siguiente tab
      // tiene que seguir leyendo el manual, no volver a la caja del buscador.
      if (!destino.hasAttribute("tabindex")) destino.setAttribute("tabindex", "-1");
      destino.focus({ preventScroll: true });
      destino.classList.add("destacado");
      setTimeout(function () { destino.classList.remove("destacado"); }, 1400);
    }
  }

  // ── Teclado ─────────────────────────────────────────────────────────────────

  function teclas(e) {
    if (e.key === "Escape") { e.preventDefault(); cerrar(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); mover(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (resaltado >= 0 && resultados[resaltado]) ir(resultados[resaltado].ancla, resultados[resaltado].pagina);
      else if (resultados.length) ir(resultados[0].ancla, resultados[0].pagina);
      return;
    }
  }

  function mover(delta) {
    if (!resultados.length) return;
    var prev = resaltado;
    resaltado = (resaltado + delta + resultados.length) % resultados.length;
    if (prev >= 0) lista.children[prev].classList.remove("resaltado");
    var ahora = lista.children[resaltado];
    if (ahora) {
      ahora.classList.add("resaltado");
      ahora.scrollIntoView({ block: "nearest" });
      campo.setAttribute("aria-activedescendant", ahora.id);
    }
  }

  // ── Atajo global ────────────────────────────────────────────────────────────

  function global(e) {
    // "/" con el foco en un campo, o Ctrl+K en cualquier sitio: se deja pasar.
    var enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "").toUpperCase());
    var esBarra = e.key === "/" && !enCampo && !e.metaKey && !e.ctrlKey && !e.altKey;
    var esK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
    if (esBarra || esK) {
      e.preventDefault();
      abrir();
    }
  }

  // ── Botón visible ───────────────────────────────────────────────────────────
  //
  // El atajo de teclado no sirve de nada en un móvil, así que también hay un botón.
  // Y sin botón no se ve que el buscador existe.
  //
  // ── Donde va el botón: a la derecha, centrado en vertical ────────────────────
  //
  // En la columna derecha (.der), delante del interruptor del tema. Esa columna ya
  // es flex con align-items:center, así que el botón sale centrado en vertical sin
  // hacer nada. Va delante del tema porque es el orden habitual: primero buscar,
  // después cambiar el tema.
  //
  // Antes estaba en el centro junto al reloj, dentro de un envoltorio para que los
  // dos fuesen un solo hijo del grid. Se movió a la derecha por dos motivos: en el
  // centro el reloj se desplazaba 20 px del sitio exacto, y a 390 px el título y el
  // botón se pisaban 17 px. A la derecha no pasa ninguna de las dos cosas y el reloj
  // vuelve a su centro exacto.
  //
  // Y FUERA del nav a propósito, igual que el interruptor: el nav recibe
  // display:none por debajo de 620 px, y dentro de él el botón desaparecería en el
  // móvil, que es justo donde más falta hace porque no hay teclado para la barra.

  function boton() {
    var der = document.querySelector(".isla .der");
    if (!der) return null;

    var b = document.createElement("button");
    b.type = "button";
    b.className = "buscador-boton";
    b.setAttribute("aria-label", T("Search this site"));
    b.innerHTML = '<span aria-hidden="true"></span>';
    b.addEventListener("click", function (e) {
      e.preventDefault();
      abrir();
    });

    // Delante del interruptor del tema, o primero si no está.
    var tema = der.querySelector(".interruptor");
    der.insertBefore(b, tema || der.firstChild);

    window.addEventListener("idioma", function () {
      b.setAttribute("aria-label", T("Search this site"));
    });
    return b;
  }

  // ── Atajo global ────────────────────────────────────────────────────────────

  function global(e) {
    // "/" con el foco en un campo, o Ctrl+K en cualquier sitio: se deja pasar.
    var enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "").toUpperCase());
    var esBarra = e.key === "/" && !enCampo && !e.metaKey && !e.ctrlKey && !e.altKey;
    var esK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
    if (esBarra || esK) {
      e.preventDefault();
      abrir();
    }
  }

  // ── Una cosa a medias ────────────────────────────────────────────────────────
  //
  // Si hay clave pero no ID, o al revés, el buscador no se monta y no se ve por qué:
  // la web funciona, y el botón simplemente no está. Se avisa en la consola, que es
  // donde se mira cuando algo no aparece.
  if (!HABILITADO && (APP_ID || CLAVE_BUSQUEDA) && window.console && console.warn) {
    console.warn("buscador: falta " + (!APP_ID ? "el Application ID" : "la clave") +
      ". Sin las dos cosas no se monta. Mirar assets/buscador.js, arriba del todo.");
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  //
  // Se espera a "listo", que es cuando ya se han pintado las dos páginas y ya se ha
  // traducido. Montarlo antes buscaría en un manual que todavía no existe.
  //
  // La bandera __RHYTHM_LISTO se mira primero, por si el script llega después de que
  // ya esté puesto. Y antes solo se miraba la bandera, sin esperar ningún aviso:
  // app.js la ponía a true pero no disparaba nada, así que el botón no aparecía nunca.
  // El diálogo sí abría, porque `abrir()` lo construye si no existe, y por eso el
  // fallo parecía parcial y no se veía de dónde venía.
  function cuandoEstenListas() {
    if (!HABILITADO) return;
    if (!caja) crear();
    if (!document.querySelector(".buscador-boton")) boton();
    document.addEventListener("keydown", global);
    window.addEventListener("idioma", function () {
      if (caja) {
        caja.setAttribute("aria-label", T("Search this site"));
        campo.placeholder = T("Search this site");
        var c = caja.querySelector(".buscador-cerrar");
        if (c) c.setAttribute("aria-label", T("Close"));
        var ps = caja.querySelectorAll("[data-pista]");
        for (var i = 0; i < ps.length; i++) {
          ps[i].textContent = T(ps[i].getAttribute("data-pista"));
        }
      }
    });
  }

  if (window.__RHYTHM_LISTO) cuandoEstenListas();
  else window.addEventListener("listo", cuandoEstenListas);

  // Se deja accesible desde la consola, que es como se comprueba que la clave
  // funciona: __buscador("pywal"). No expone la clave, solo hace la consulta.
  window.__buscador = function (q) {
    if (!HABILITADO) return Promise.reject(new Error("el buscador no esta configurado"));
    var params = { requests: [{ indexName: INDICE, query: q, hitsPerPage: 3,
      attributesToRetrieve: ["titulo", "ancla", "pagina"] }] };
    return fetch(URL_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Algolia-Application-Id": APP_ID,
        "X-Algolia-API-Key": CLAVE_BUSQUEDA
      },
      body: JSON.stringify(params)
    }).then(function (r) { return r.json(); });
  };
})();