// ─────────────────────────────────────────────────────────────────────────────
// Extractor. Se ejecuta DENTRO de la página, ya pintada y ya traducida, y devuelve
// un JSON con un registro por apartado.
//
// Por qué dentro de la página y no un parser de HTML: el manual entero lo genera
// app.js en tiempo de ejecución. En el fichero manual.html no hay ni un capítulo.
// La única forma de leer lo que ve el visitante es preguntárselo al navegador.
//
// Por qué un fichero aparte y no una cadena dentro del indexador: para poder
// probarlo solo, sin lanzar Chromium. `node tools/extraer-probar.mjs`.
//
// Devuelve: [{objectID, titulo, texto, codigo, ancla, nivel, pagina}]
//
// ─────────────────────────────────────────────────────────────────────────────
// LA ESTRUCTURA, QUE ES LO QUE MAS CUESTA
//
// El título de cada capítulo es un <h2> que vive DENTRO de un div
// .cabecera-seccion, y ese div es a su vez hijo de <section id="hyprland/atajos">.
// El cuerpo del capítulo es hermano del DIV, no del <h2>:
//
//     <section id="hyprland/atajos">
//       <div class="cabecera-seccion"><h2>Hotkeys</h2><span>2</span></div>
//       <div class="buscador">…</div>
//       <div class="atajos">…78 atajos…</div>
//     </section>
//
// La primera versión caminaba por los hermanos del <h2> —que dentro del div no hay
// casi nada— y por eso salían 13 capítulos con 25 caracteres de texto y dos sin
// aparecer. La sección se busca por el <h2> y se lee entera, no por trozos.
//
// ─────────────────────────────────────────────────────────────────────────────
// LO QUE NO SE INDEXA
//
// - La salida del médico: va en <pre>, y es texto de terminal. Se quita.
// - Los títulos de navegación: el índice lateral y las cajas que lo repiten. Si se
//   indexaran, una de cada dos búsquedas saldría el índice, que no es contenido.
// - Los trozos largos de código dentro del texto: la línea de bash de la instalación
//   son doscientos caracteres de curl. Va en `codigo`, que es donde se busca, y no
//   en `texto`, que es donde se lee.
//
// Lo que SÍ se guarda del código son las pieces cortas: "SUPER", "RETURN",
// "--resume". La primera versión quitaba <code> y <kbd> enteros y por eso las
// secciones de atajos se quedaban sin texto: inbuscables, que es peor que no existir.
(function () {
  var NIVEL = { H2: 2, H3: 3, H4: 4 };

  // Contenedores que son navegación, no contenido. Se comparan por id y por clase.
  var RUIDO_ID = ["indice", "fuera"];
  var RUIDO_CLASE = ["indice", "manual-cabecera", "cabecera-proyecto", "pie-menu"];

  function esRuido(el) {
    if (el.closest && el.closest(".indice")) return true;
    if (el.closest && el.closest(".manual-cabecera")) return true;
    if (el.closest && el.closest(".cabecera-proyecto")) return true;

    // Solo se mira HASTA el primer ancestro con id, y ese id es justamente el ancla
    // del apartado. Subir mas no dice nada del titulo.
    //
    // La primera version recorria todos los ancestros y buscaba "manual" en la
    // lista de ruido. "#manual" es el contenedor del manual entero, de modo que
    // todo salia como ruido y el extractor devolvia cero registros sin decir por
    // que. Por eso los ids de aqui son solo los que son contenedores de navegacion.
    var a = el.parentNode;
    while (a && a !== document.body && a.nodeType === 1) {
      if (a.id) return RUIDO_ID.indexOf(a.id) > -1;
      var c = a.className;
      if (c && typeof c === "string") {
        for (var i = 0; i < RUIDO_CLASE.length; i++) {
          if (c.indexOf(RUIDO_CLASE[i]) > -1) return true;
        }
      }
      a = a.parentNode;
    }
    return false;
  }

  // Texto de un trozo, sin <pre> ni vectores. Se conserva <code> y <kbd>.
  function limpio(el) {
    var c = el.cloneNode(true);
    var fuera = c.querySelectorAll("pre,svg,script,style");
    for (var i = 0; i < fuera.length; i++) fuera[i].parentNode.removeChild(fuera[i]);
    return (c.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Los trozos largos de código salen del texto. No se borran del indice: van en
  // `codigo`, que es un campo de Algolia en si mismo y se puede buscar aparte.
  function sinCodigoLargo(tx) {
    return tx
      .replace(/[a-z]+ -c "[^"]{60,}"/g, " ")
      .replace(/\b(bash|curl|git|systemctl|chmod|sudo)\b[^ ]* /g, " ");
  }

  function codigoDe(el, lista) {
    var c = el.querySelectorAll("code, kbd");
    for (var i = 0; i < c.length; i++) {
      var v = (c[i].textContent || "").replace(/\s+/g, " ").trim();
      if (v.length > 1 && v.length < 90 && lista.indexOf(v) === -1) lista.push(v);
    }
  }

  var out = [], vistos = {};

  // `titulo` llega como ELEMENTO, no como cadena, y aqui se saca su texto. La
  // primera version hacia `titulo.replace(...)` sobre el elemento y reventaba con
  // "titulo.replace is not a function", que se veia como un indice vacio en vez de
  // como un fallo: el extractor entero devolvia "[]" y no decia nada.
  // `titulo` llega como ELEMENTO, no como cadena, y aqui se saca su texto. La
  // primera version hacia `titulo.replace(...)` sobre el elemento y reventaba con
  // "titulo.replace is not a function", lo cual se veia como un indice vacio y no
  // como un fallo.
  function anota(el, cuerpo, codigo, ancla, nivel) {
    // Admite un elemento o una cadena. Se pasa un elemento en todos los capitulos;
    // en la portada se pasa el h1, que puede no existir segun como este la pagina.
    var titulo = typeof el === "string" ? el.replace(/\s+/g, " ").trim() : limpio(el);
    if (titulo.length < 2) return;
    // El nombre del proyecto no es un apartado. Sale en las dos paginas y no lleva a
    // ninguna parte, asi que en el buscador solo ocupa sitio.
    if (titulo === "hyprland") return;
    var txt = sinCodigoLargo(cuerpo || "").replace(/\s+/g, " ").trim().slice(0, 1400);
    if (txt.length < 12 && codigo.length === 0) return;

    var clave = ancla + "|" + titulo;
    if (vistos[clave]) return;
    vistos[clave] = 1;

    out.push({
      titulo: titulo.slice(0, 160),
      texto: txt,
      codigo: codigo.slice(0, 14),
      ancla: ancla || "",
      nivel: nivel,
      pagina: /manual\.html/.test(location.pathname) ? "manual" : "portada"
    });
  }

  var todos = document.querySelectorAll("h2, h3, h4");

  // La portada no es un manual: tiene un lema, un boton de instalar y poco mas, y casi
  // ningun titulo. Sin este registro, buscar en la portada no encuentra ni el lema ni
  // el comando de instalacion, que es justo lo que se busca ahi.
  if (!/manual\.html/.test(location.pathname)) {
    var principal = document.getElementById("contenido") || document.querySelector("main");
    if (principal) {
      var codPortada = [];
      codigoDe(principal, codPortada);
      var h1 = document.querySelector("h1");
      anota(h1 || "rhythmcrea", limpio(principal), codPortada, "hyprland", 1);
    }
  }

  for (var i = 0; i < todos.length; i++) {
    var h = todos[i];
    if (esRuido(h)) continue;

    var nv = NIVEL[h.tagName] || 3;
    var esCabecera = !!(h.closest && h.closest(".cabecera-seccion"));

    // ── Un título de capítulo: se lee la SECCIÓN entera ──
    //
    // Es lo que arregla la primera versión. El <h2> está dentro de un div y el
    // cuerpo es hermano del div, así que la sección se busca con closest() y se lee
    // entera, quitando el propio título para no repetirlo.
    if (esCabecera) {
      var sec = h.closest("[id]") || h.parentNode;
      var id = (sec && sec.id) || "";
      if (id && RUIDO_ID.indexOf(id) > -1) sec = h.parentNode.parentNode;
      var cod = [];
      codigoDe(sec, cod);
      var copia = sec.cloneNode(true);
      var cab = h.closest(".cabecera-seccion");
      if (cab && cab.parentNode) cab.parentNode.removeChild(cab);
      var quitar = copia.querySelectorAll("pre,svg,script,style");
      for (var q = 0; q < quitar.length; q++) quitar[q].parentNode.removeChild(quitar[q]);
      anota(h, copia.textContent || "", cod, id, nv);
      continue;
    }

    // ── Un subtítulo dentro de una sección: sus hermanos ──
    //
    // Aquí sí funciona lo de los hermanos, porque los <h4> ("Lo que no hace",
    // "La paleta") son hijos directos de la sección y su contenido va justo detrás.
    var partes = [], codigos = [], n = h.nextElementSibling, prof = nv;
    while (n && prof >= nv) {
      if (/^H[234]$/.test(n.tagName)) {
        var otro = NIVEL[n.tagName];
        if (otro <= nv) break;
        prof = otro;
      }
      codigoDe(n, codigos);
      var tx = limpio(n);
      if (tx) partes.push(tx);
      n = n.nextElementSibling;
    }
    var ancla = "";
    var sube = h.parentNode;
    while (sube && sube !== document.body && sube.nodeType === 1) {
      if (sube.id && sube.id.indexOf("hyprland/") === 0) { ancla = sube.id; break; }
      // En la portada no hay anclas "hyprland/...", pero el apartado esta dentro de
      // una caja con id. Sin este respaldo el boton de "Instalar" salia sin destino y
      // el resultado abria la pagina sin Highlight en ningun sitio.
      if (!ancla && sube.id && RUIDO_ID.indexOf(sube.id) === -1) ancla = sube.id;
      sube = sube.parentNode;
    }
    anota(h, partes.join(" "), codigos, ancla, nv);
  }

  return JSON.stringify(out);
})();