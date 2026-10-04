// ── Los idiomas ───────────────────────────────────────────────────────────────
//
// COMO FUNCIONA, Y POR QUE ESTA HECHO ASI
//
// No hay ni un archivo por pagina en cada idioma, ni rutas distintas, ni nada que
// sea un servidor. Un idioma es UN fichero: data/lang-xx.js, que define
// window.RHYTHM_I18N. La pagina se sigue sirviendo siempre del mismo index.html y
// del mismo manual.html, y el idioma se elige con ?lang=xx en la direccion o con el
// boton del pie.
//
// El diccionario esta ordenado por el texto INGLES que hay que cambiar. Es decir,
// no hay identificadores: la clave es literally lo que se lee en la pagina ahora
// mismo, y el valor es lo mismo en otro idioma. Asi se puede escribir un idioma
// nuevo mirando la pagina, sin buscar una clave en el codigo.
//
// Que sea por texto y no por clave tiene una consecuencia importante, y es que NO
// se rompe nunca: si un idioma no trae una cadena, esa cadena se queda como estaba.
// No aparece un hueco, ni un "undefined", ni una mezcla rara. Un idioma a medias se
// ve a medias, que es mucho mejor que no verse.
//
// LO QUE NO HACE
//
// No se traducen los nombres propios, ni las banderas del instalador, ni los
// comandos, ni las teclas, ni las rutas. Eso son 141 de las 457 cadenas, y
// traducirlas seria inventar cosas: `--preview` no se llama `--aviso` en ningun
// sitio. La traduccion se aplica a los NODOS DE TEXTO y a cinco atributos
// (aria-label, title, placeholder, alt y aria-valuetext), y se saltan los nodos que
// estan dentro de <code>, <pre>, <kbd> y <samp>, que es donde vive justo lo que no
// se toca.
//
// EL ORDEN
//
// La pagina pinta el manual con JavaScript, asi que cuando este script se ejecuta
// todavia no hay nada que traducir en el. Por eso no se autollama al arrancar:
// espera a que app.js diga que ha terminado, con window.__RHYTHM_LISTO, y si el
// script se carga despues, se aplica solo.
//
//(app.js) pinta la pagina -> (__RHYTHM_LISTO) -> esto traduce -> (__IDIANO)
//                                                   y avisa por si hay que repintar
(function () {
  "use strict";

  var CLAVE = "rhythm-crea-idioma";
  // ── Los idiomas que HAY, no los que uno quisiera que hubiera ────────────────
  //
  // La lista se lee del propio diccionario, no de una lista escrita a mano. Poner
  // una lista de cuarenta y traducir dos es lo que hacia antes: el desplegable
  // ofrecia seventy y pico idiomas, y al elegir uno la pagina se recargaba en
  // ingles y se quedaba guardada esa preferencia.
  //
  // Asi, anadir un idioma es UNA cosa: copiar data/lang-es.js, renombrarlo, y ya
  // sale en el desplegable. No hay que tocar ni esta linea ni ningun HTML.
  function disponibles() {
    var d = window.RHYTHM_I18N || {};
    var lista = Object.keys(d);
    // El ingles esta siempre, aunque no tenga fichero: la pagina esta escrita en
    // ingles, asi que no necesita diccionario para estar en ingles. Sin esto,
    // `?lang=en` caia a otro idioma, porque "en" no aparecia en la lista.
    if (lista.indexOf("en") === -1) lista.push("en");
    return lista.sort();
  }

  // El nombre de cada idioma en el suyo. Los que falten se quedan con el codigo, que
  // es feo pero no miente.
  var NOMBRES = {
    en: "English",
    es: "Español"
  };

  // Los nodos donde lo que hay NO se traduce.
  var INTOCABLES = { CODE: 1, PRE: 1, KBD: 1, SAMP: 1, SVG: 1, SCRIPT: 1, STYLE: 1 };

  function dentroDeCodigo(nodo) {
    for (var p = nodo && nodo.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (INTOCABLES[p.nodeName]) return true;
    }
    return false;
  }

  // ── Que idioma ───────────────────────────────────────────────────────────────
  //
  // Tres sitios, por este orden: lo que dice la direccion, lo que esta guardado, y
  // el idioma del navegador. Lo primero que gana es `?lang=`, y eso es a proposito:
  // es lo que hace que se pueda mandar a alguien un enlace ya en su idioma
  // —rhythmcrea.com/?lang=es— sin guardarlo en ningun sitio.
  //
  // El idioma del navegador solo se mira si es de los que tenemos. No se pide
  // Accepted-Language al servidor, que ademas aqui no se podria: todo son ficheros
  // estaticos.
  function decidirIdioma() {
    var hay = disponibles();
    var deUrl = null;
    try {
      var m = /[?&]lang=([a-zA-Z-]{2,5})/.exec(location.search);
      if (m) deUrl = m[1];
    } catch (e) { /* sin location */ }

    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE); } catch (e) { /* sin storage */ }

    var delNavegador = null;
    try {
      var lista = navigator.languages || [navigator.language];
      for (var i = 0; i < (lista || []).length; i++) {
        var c = String(lista[i] || "").toLowerCase();
        if (hay.indexOf(c) > -1) { delNavegador = c; break; }
        var corto = c.split("-")[0];
        if (hay.indexOf(corto) > -1) { delNavegador = corto; break; }
      }
    } catch (e) { /* sin navigator */ }

    // El orden es: la direccion, lo guardado, el del navegador. Y lo que salga de ahi
    // tiene que existir de verdad. Medido: antes, `?lang=fr` ponia `lang="fr"` en la
    // pagina y la dejaba entera en ingles, y un lector de pantalla la pronunciaba
    // con fonetica francesa.
    var elegido = deUrl || guardado || delNavegador || "en";
    if (hay.indexOf(elegido) === -1) elegido = hay.indexOf("en") > -1 ? "en" : (hay[0] || "en");
    return elegido;
  }

  // Lo que se ha pedido en la direccion y no existe. Se avisa en vez de fingir, pero
  // solo si el visitante lo ha puesto a mano: si es el navegador el que lo ha
  // pedido, no hay nada que avisar.
  function idiomaPedidoQueNoHay() {
    try {
      var m = /[?&]lang=([a-zA-Z-]{2,5})/.exec(location.search);
      if (!m) return null;
      return disponibles().indexOf(m[1]) > -1 ? null : m[1];
    } catch (e) { return null; }
  }

  function diccionario(idioma) {
    var todo = window.RHYTHM_I18N || {};
    return todo[idioma] || null;
  }

  // ── Aplicar ──────────────────────────────────────────────────────────────────
  var aplicada = "";

  function aplicar() {
    var idioma = decidirIdioma();
    var dic = diccionario(idioma);
    // El atributo `lang` va SIEMPRE con el idioma que esta really en la pagina. Antes
    // se ponia el que se habia pedido, y con `?lang=fr` la pagina entera en ingles
    // se anunciaba como francesa: mal para un lector de pantalla, para el corrector
    // del navegador y para la traduccion automatica.
    document.documentElement.setAttribute("lang", idioma);
    if (!dic) { aplicada = ""; return 0; }

    var n = 0;

    // Los nodos de texto. Se comparan con los espacios de alrededor ya normalizados,
    // que es como estan escritos los datos.
    var recorrer = document.createTreeWalker(document.body || document.documentElement,
      NodeFilter.SHOW_TEXT, null);
    var nodo;
    while ((nodo = recorrer.nextNode())) {
      var bruto = nodo.nodeValue;
      if (!bruto) continue;
      var limpio = bruto.replace(/\s+/g, " ").trim();
      if (!limpio || limpio.length < 2) continue;
      if (dentroDeCodigo(nodo)) continue;
      var t = dic[limpio];
      if (typeof t !== "string" || t === limpio) continue;
      // Se conserva el espacio que sobraba para que el salto de linea no cambie.
      var antes = bruto.slice(0, bruto.length - bruto.replace(/^\s+/, "").length);
      var despues = bruto.length - bruto.replace(/\s+$/, "").length;
      nodo.nodeValue = antes + t + (despues ? bruto.slice(bruto.length - despues) : "");
      n++;
    }

    // Los cinco atributos que se leen en voz alta o se ven en un tooltip.
    var ATRIBUTOS = ["aria-label", "title", "placeholder", "alt", "aria-valuetext"];
    ATRIBUTOS.forEach(function (a) {
      var els = document.querySelectorAll("[" + a + "]");
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (dentroDeCodigo(el)) continue;
        var v = (el.getAttribute(a) || "").replace(/\s+/g, " ").trim();
        var t = dic[v];
        if (typeof t === "string" && t !== v) { el.setAttribute(a, t); n++; }
      }
    });

    aplicada = idioma;
    document.documentElement.setAttribute("data-idioma", idioma);
    try { localStorage.setItem(CLAVE, idioma); } catch (e) { /* sin storage */ }
    return n;
  }

  // ── El boton de idioma ───────────────────────────────────────────────────────
  //
  // Va en el pie y es un <select>, que es lo unico que ya funciona con el dedo, con
  // el teclado y con el lector de pantalla sin escribir cuatro manejadores. Y no
  // guarda un solo enlace por idioma, que con cuarenta son cuarenta enlaces y un
  // bloque enorme en el pie.
  function montarSelector() {
    var sitio = document.getElementById("idiomas");
    if (!sitio) return;
    if (sitio.getAttribute("data-listo") === "1") return;
    sitio.setAttribute("data-listo", "1");

    var hay = disponibles();
    // Con un solo idioma no hay nada que elegir, y un desplegable con una opcion
    // parece un boton roto. No se pinta.
    if (hay.length < 2) { sitio.setAttribute("data-oculto", "1"); return; }

    var sel = document.createElement("select");
    sel.className = "idioma-sel";
    sel.id = "idioma-sel";
    sel.setAttribute("aria-label", "Language");
    hay.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c;
      o.textContent = NOMBRES[c] || c;
      if (c === "en") o.setAttribute("data-original", "1");
      sel.appendChild(o);
    });
    sel.value = decidirIdioma();
    sel.addEventListener("change", function () {
      var c = sel.value;
      try { localStorage.setItem(CLAVE, c); } catch (e) { /* sin storage */ }
      // Con la direccion: se recarga la pagina con el idioma, para que el enlace que
      // se copie o se mande salga ya con ese idioma y no con el de quien lo abre.
      var u = new URL(location.href);
      u.searchParams.set("lang", c);
      location.replace(u.toString());
    });
    sitio.appendChild(sel);
  }

  // Si alguien llega con `?lang=fr` y el frances no esta, no se finge que se le ha
  // dado: se le sirve el ingles y se le dice. Antes salia una pagina en ingles con
  // `lang="fr"` y sin una palabra.
  function avisar(pedido) {
    var sitio = document.getElementById("idiomas");
    if (!sitio) return;
    var n = document.createElement("span");
    n.className = "idioma-aviso";
    n.textContent = pedido + " is not available yet — this page is in English.";
    sitio.appendChild(n);
  }

  // ── Arranque ─────────────────────────────────────────────────────────────────
  function cuandoEstaListo() {
    var pedido = idiomaPedidoQueNoHay();
    montarSelector();
    if (pedido && !document.querySelector(".idioma-aviso")) avisar(pedido);
    var n = aplicar();
    if (n && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("idioma", { detail: { cadenas: n } }));
    }
  }

  // Para el codigo que escribe texto despues de translated: el boton del tema, que
  // se repinta cada segundo, y cualquier otra cosa que se ponga mientras la pagina
  // esta viva. Sin esto, lo que se escriba en ingles cada segundo borra lo que el
  // traductor hizo, y al final solo el boton del tema se queda en ingles.
  window.traducir = function (texto) {
    if (!texto) return texto;
    var dic = diccionario(document.documentElement.getAttribute("data-idioma") || decidirIdioma());
    var t = dic && dic[String(texto).replace(/\s+/g, " ").trim()];
    return typeof t === "string" ? t : texto;
  };

  window.aplicarIdioma = aplicar;

  // Dos caminos, porque el orden de los scripts no esta garantizado:
  //
  //   1. app.js ya ha pintado —el caso normal, porque en el HTML este script va
  //      antes— y entonces se traduce un momento despues de DOMContentLoaded.
  //   2. Este script se carga despues de que la pagina este pintada —si alguien lo
  //      anade a mano, o si un navegador lo retrasa— y entonces la bandera ya esta
  //      puesta y hay que mirar el 'load' para traducir en cuanto se sepa.
  //
  // En los dos casos se vuelve a mirar al cargar la pagina entera, porque hay
  // imagenes perezosas que anaden texto despues (el indice del manual se pinta
  // cuando llegan los datos).
  function revisar() {
    if (window.__RHYTHM_LISTO) cuandoEstaListo();
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(revisar, 0);
  } else {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(revisar, 0); });
  }
  window.addEventListener("load", function () { setTimeout(revisar, 0); });
  // Y un poco despues, por si las imagenes perezosas han traido mas texto.
  setTimeout(revisar, 900);
})();