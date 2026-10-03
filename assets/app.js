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
      // El texto se lee ANTES de reescribir, asi que el cursor no cuenta: esta
      // funcion corre una vez, al arrancar. Si corriera dos veces, la segunda se
      // comeria el <span class="ultima"> y partiria la A por la mitad. El cursor
      // se vuelve a poner al final, porque este innerHTML lo borra.
      h.innerHTML = esc(t.slice(0, -1)) + '<span class="ultima">' + esc(t.slice(-1)) + "</span>" +
        '<span class="cursor" aria-hidden="true"></span>';
  }

  // ── La seccion de Hyprland ─────────────────────────────────────────────────

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

  // El logotipo de Arch Linux, como imagen.
  //
  // Antes era un SVG de tres trazos dibujado aqui, en currentColor para que
  // tomase el color de la linea. A 0.6rem de fuente, que es el tamano de esta
  // linea, salia a 7 px: el corte que distingue el logo de Arch de un triangulo
  // qualquer caia por debajo del pixel y lo que se veia era un triangulo
  // partido. Este es el icono de la distribucion, el cuadrado azul con la A
  // blanca, que a esa medida si se lee.
  //
  // Es un webp de 64 px sin pérdida, 2 KB. Los 512 px de origen se recortan al
  // cuadrado azul y se reducen a 64: la linea de la cabecera mide 0.6rem y con
  // 1.35em el icono sale a 13 px en escritorio y a unos 17 en movil, con lo que
  // 64 va sobrado para el doble de resolucion y no hace falta traer el original.
  //
  // width y height van en el HTML y no solo en el CSS para que el navegador
  // reserve el hueco antes de descargar y la linea no salte al aparecer.
  var LOGO_ARCH = '<img class="logo-arch" src="assets/logo-arch.webp" alt="" ' +
    'aria-hidden="true" width="64" height="64" decoding="async">';

  function pintarHyprland() {
    if (!H) return;
    var d = datoDelRepo();

    // ── La seccion, que ahora es una sola columna ───────────────────────
    //
    // Antes esto era un grid de dos: la identidad a la izquierda y las piezas
    // desplegables a la derecha. Ahora son cuatro cosas en este orden, en una
    // sola columna y con el ancho del contenido: la cabecera con los numeros
    // del repo, el clip, y los dos botones. Ni lema, ni intro, ni bloques de
    // datos vivos, ni las piezas. El clip dice lo que el lema decia, y lo dice
    // en movimiento.
    var out = [];

    out.push('<div class="cabecera-seccion">');
    out.push('<span class="punto-mini"></span>');
    out.push("<h2>hyprland</h2>");
    // La version que tiene el repo AHORA, no el lenguaje en el que esta
    // escrito. "Shell" no le dice nada a quien llega: el repo entero es un
    // script de shell, eso ya se ve. Lo que interesa es que release es, que es
    // lo que dice si lo tienes al dia.
    //
    // La release la recoge scripts/collect-github.py en data/github.js. Si aun
    // no hay ninguna, se enseña el lenguaje: la cabecera no puede quedarse con un
    // hueco raro en mitad de la linea.
    // El logotipo de Arch va pegado a la version y NO separado por el punto medio:
    // es de la release, no un dato mas de la linea. Por eso entra en el mismo
    // elemento de la lista, delante del numero.
    //
    // Las estrellas NO salen. Se quitaron a proposito: la cuenta de estrellas es
    // un numero que sube y baja por gente que marca el repo sin abrirlo, y
    // delante de la version la hacia leer como si fuera el dato de la release.
    var meta = [];
    if (d.release) meta.push(LOGO_ARCH + esc(d.release));
    else if (d.lenguaje) meta.push(LOGO_ARCH + esc(d.lenguaje));
    if (d.push) meta.push(esc(hace(d.push)));
    out.push('<span class="meta">' + meta.join("  ·  ") + "</span>");
    out.push("</div>");

    out.push(video(H.clip || {}));

    // Los dos botones. El de github a la izquierda y el del manual a la
    // derecha, tirados del ancho con justify-content: space-between, para que
    // en una pantalla ancha no se queden juntos en una esquina.
    //
    // El de github lleva el mark de verdad (el octocat del set oficial, que es
    // una sola ruta SVG) en un cuadrado con radio. Va en currentColor, asi que
    // no hay dos iconos que mantener ni que cambiar con el tema.
    // El "_blank" del boton del manual se decide aqui y no en la cadena: el manual
    // es una pagina de ESTE sitio, y abrir una pestana nueva para saltar dentro
    // deja al visitante con dos pestanas y sin pila de retroceso. Si algun dia
    // vuelve a apuntar a algo externo (un README, un foro), se vuelve a abrir en
    // pestana nueva sin tocar nada mas.
    var manualExt = /^https?:/i.test(H.manual || "");

      // El "_blank" del boton del manual se decide aqui y no dentro de la cadena: el
      // manual es una pagina de ESTE sitio, y abrir una pestana nueva para saltar
      // dentro deja al visitante con dos pestanas y sin pila de retroceso. Si
      // algun dia vuelve a apuntar a algo externo (un README, un foro), se vuelve
      // a abrir en pestana nueva sin tocar nada mas.
      var manualExt = /^https?:/i.test(H.manual || "");

    out.push('<div class="acciones-seccion">' +
      '<a class="b b-gh" href="https://github.com/' + esc(H.repo) +
      '" target="_blank" rel="noopener">' +
      '<span class="marca" aria-hidden="true"><svg viewBox="0 0 16 16" fill="currentColor">' +
      '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
      '0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 ' +
      '1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 ' +
      '0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 ' +
      '0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>' +
      '</svg></span>Github</a>' +
      '<a class="b b-flecha" href="' + esc(H.manual || "#hyprland") +
      '"' + (manualExt ? ' target="_blank" rel="noopener"' : "") + '><span>' + esc(H.manualTexto || "the manual") +
      '</span><i aria-hidden="true"></i></a>' +
      "</div>");

    // Instalar. Va DEBAJO del clip y de los botones, y es lo ultimo de la
    // seccion: es lo que se viene a hacer cuando ya se ha visto que esto es de
    // fiar.
    //
    // Una sola linea, y el boton de copiar dentro de la caja. Lo de las banderas
    // no va aqui: lo cuenta el manual, que ya esta enlazado un par de lineas mas
    // arriba.
    out.push('<div class="instalar" id="instalar">' +
      '<h3 class="instalar-titulo">' + esc(H.instalar.titulo) + "</h3>" +
      '<p class="instalar-texto">' + esc(H.instalar.texto) + "</p>" +
      '<div class="comando instalar-cmd"><code>' + esc(H.instalar.comando) + "</code>" +
      '<button class="copiar" type="button" data-copiar="' + esc(H.instalar.comando) +
      '">copy</button></div>' +
      "</div>");


    var caja = $("#hyprland-caja");
    if (caja) caja.innerHTML = out.join("");
  }


// ── Los bloques de datos vivos ─────────────────────────────────────────
    //
    // Todos leen de data/system.js, que escribe el recolector en la maquina
    // del sitio. Ya no se pintan en la pagina: la seccion se quedo en la
    // cabecera, el clip y los dos botones. Se dejan aqui porque son lo que
    // haria falta si algun dia vuelven.
    //
    // Si el dato no esta, sale una linea de aviso. Nunca un numero inventado:
    // una pagina que se inventa un dato es peor que una que no lo tiene.
    function vivo(p) {
      if (p.tipo === "paleta") return paleta();
      if (p.tipo === "terminal") return terminal();
      if (p.tipo === "comando") return comando(p);
      if (p.tipo === "pantallas") return pantallas();
      if (p.tipo === "atajos") return atajos();
      if (p.tipo === "video") return video(p);
      return "";
    }

    // El clip del escritorio.
    //
    // Lo importante aqui es que NO baja al abrir la pagina. Son 1,4 MB, y la
    // pagina pesa 242 KB: si el <video> fuera un atributo normal, el navegador
    // lo pediria en cuanto parsea el HTML, y el visitante estaria pagando 1,4 MB
    // de los que no ha pedido. Se pone preload="none" y el src se asigna al
    // abrirse la pieza, que es el momento en que alguien ha dicho que lo quiere.
    //
    // El poster son 22 KB y va si, porque es lo que se ve en el hueco antes de
    // que se abra: sin el, el rectangulo sale negro.
    //
    // width/height van puestos para que el navegador reserve la caja antes de
    // tener el metadato. Sin eso la pieza crece al cargar y todo lo de debajo
    // baja de golpe.
    function video(p) {
      if (!p.src) return '<p class="sin-datos">No clip recorded yet.</p>';
      var id = "clip-" + esc(p.id || "video");
      // Sin `controls`: los del navegador son una barra gris del sistema, que
      // en una pagina con este cuidado queda como un trozo pegado encima. El
      // reproductor de abajo es el del sitio.
      //
      // El <button> de play va DENTRO del <video>, no al lado. Por una regla de
      // HTML, dentro de un <video> solo se permite <source>, <track> y texto
      // plano; cualquier otra cosa se saca al padre y se pierde el boton.
      // Por eso el overlay del play es un hermano, y el video se apila debajo
      // con position: absolute.
      return '<figure class="clip">' +
        '<div class="escena-clip">' +
          '<video id="' + id + '" width="1280" height="720" ' +
          'poster="' + esc(p.poster || "") + '" preload="none" playsinline ' +
          'loop aria-label="' + esc(p.titulo || "clip") + '">' +
          '<source data-src="' + esc(p.src) + '" type="video/mp4">' +
          "Tu navegador no sabe reproducir MP4. El clip son 33 segundos del " +
          "escritorio, con el launcher, el panel de control y el final." +
          "</video>" +
          '<button class="clip-play" type="button" data-play="' + id +
          '" aria-label="Reproducir el clip"><svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg></button>' +
        "</div>" +
        '<div class="clip-barra">' +
          '<button class="clip-btn" type="button" data-accion="play" aria-label="Reproducir">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-play"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-pausa"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>' +
          "</button>" +
          '<div class="clip-pista" role="slider" tabindex="0" aria-label="Posicion" ' +
            'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
            '<span class="clip-barra-rota"></span><span class="clip-mando"></span>' +
          "</div>" +
          '<span class="clip-tiempo"><b class="clip-actual">0:00</b>' +
            '<i>/</i><span class="clip-total">0:33</span></span>' +
          // El volumen, como en Omarchy: el altavoz con una barrita al lado.
          //
          // Es el mismo markup que la pista de progreso y por el mismo motivo:
          // el <input type="range"> nativo hay que centrarle el pulgar con
          // margin-top y ::-webkit-slider-thumb, y el numero que lo centra bien
          // no es el mismo en cada navegador. Con dos piezas de markup las dos
          // barras se comportan igual.
          '<div class="clip-vol">' +
            '<button class="clip-btn" type="button" data-accion="mute" aria-label="Quitar el sonido">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-son"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>' +
              '<path d="M16 8.5a4.5 4.5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
              '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-mudo"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/>' +
              '<path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            "</button>" +
            '<div class="clip-pista clip-vol-pista" role="slider" tabindex="0" ' +
              'aria-label="Volumen" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">' +
              '<span class="clip-barra-rota"></span><span class="clip-mando"></span>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<figcaption class="nota-dato">' + esc(p.nota || "") + "</figcaption>" +
        "</figure>";
    }

    // El src se asigna aqui y no antes. Cada vez que el clip va a entrar en
    // pantalla se comprueba si tiene un <source data-src> al que le falte el src.
    function montarVideos() {
      document.querySelectorAll("video source[data-src]").forEach(function (s) {
        if (s.getAttribute("src")) return;
        s.setAttribute("src", s.getAttribute("data-src"));
        var v = s.parentNode;
        if (v) v.load();
      });
    }

    // ── El reproductor ───────────────────────────────────────────────────
    //
    // Todo lo que hace el control nativo, pero con el estilo del sitio: play y
    // pausa, barra de progreso con arrastre, tiempo, y el sonido.
    //
    // Lo unico que no tiene es el picture-in-picture y el fullscreen. El
    // fullscreen lo pone el propio navegador con F11 y con el menu del
    // contenedor, asi que no hacia falta un boton mas.
    function reproductor(video) {
      if (!video) return;
      var arrastrando = false;
      var barra = video.parentNode.parentNode.querySelector(".clip-barra");
      if (!barra) return;
      var btnPlay = barra.querySelector('[data-accion="play"]');
      var btnMute = barra.querySelector('[data-accion="mute"]');
      var pista = barra.querySelector(".clip-pista");
      var relleno = pista.querySelector(".clip-barra-rota");
      var mando = pista.querySelector(".clip-mando");
      var actual = barra.querySelector(".clip-actual");
      var total = barra.querySelector(".clip-total");

      function reloj(s) {
        if (!isFinite(s)) return "0:00";
        var m = Math.floor(s / 60);
        var r = Math.floor(s % 60);
        return m + ":" + (r < 10 ? "0" : "") + r;
      }

      function pintar() {
        var d = video.duration || 0;
        var pct = d ? (video.currentTime / d) * 100 : 0;
        relleno.style.width = pct + "%";
        // Y la BOLITA se mueve con el relleno. Esto faltaba: se movia el
        // relleno y la bolita se quedaba clavada en el principio. Se veia en
        // cuanto pinchabas en la barra para saltar: la linea iba a donde
        // hubieras pinchado y el punto seguia en el borde izquierdo.
        mando.style.left = pct + "%";
        pista.setAttribute("aria-valuenow", Math.round(pct));
        pista.setAttribute("aria-valuetext", reloj(video.currentTime) + " de " + reloj(d));
        actual.textContent = reloj(video.currentTime);
        // Antes de que llegue el metadato no se pinta nada: poner el ancho a
        // NaN% deja la barra en un estado que hay que deshacer.
        if (d) total.textContent = reloj(d);
      }

      function alternar() {
        // El primer play necesita un play() dentro de un gesto del usuario, y
        // este lo es: el boton. A partir de ahi se puede pausar y reanudar.
        if (video.paused) {
          var p = video.play();
          if (p && p.catch) p.catch(function () { });
        } else video.pause();
      }

      video.addEventListener("timeupdate", pintar);
      video.addEventListener("loadedmetadata", pintar);
      video.addEventListener("play", function () {
        // La clase va en los dos sitios: la del boton grande (que esta en la caja
        // del video) y la de los iconos de la barra. Con una sola no se
        // cambiaria ninguno de los dos.
        video.parentNode.classList.add("sonando");
        barra.classList.add("sonando");
        btnPlay.setAttribute("aria-label", "Pausar");
      });
      video.addEventListener("pause", function () {
        video.parentNode.classList.remove("sonando");
        barra.classList.remove("sonando");
        btnPlay.setAttribute("aria-label", "Reproducir");
      });

      btnPlay.addEventListener("click", alternar);
      // El boton grande del overlay. Es el mismo play: si el clip ya esta
      // sonando, lo para, que es lo que espera cualquiera que pulse ahi.
      var grande = video.parentNode.querySelector(".clip-play");
      if (grande) {
        grande.addEventListener("click", function (ev) {
          // Sin esto el clic llegaria dos veces al contenedor de mas abajo, que
          // tambien alterna: uno pondria en marcha y el otro pararia, y el
          // boton grande no haria nada.
          ev.stopPropagation();
          alternar();
          video.focus();
        });
      }

      // Pinchar en el clip lo para y lo reanuda. Antes no habia nada: como el
      // boton grande se apaga en cuanto arranca y ademas con pointer-events:
      // none, la unica manera de parar era el boton de la barra de abajo. En un
      // reproductor de verdad, pinchar en el video es lo primero que pruebas.
      //
      // El manejador va en la CAJA (que es .escena-clip) y no en el <video>, para
      // que el clic del boton grande, que esta dentro, tambien cuente; ese se
      // para antes con stopPropagation.
      //
      // La barra de controles esta FUERA de la caja, asi que pulsar play, el
      // tiempo o el volumen aqui no toca la reproduccion.
      var caja = video.parentNode;
      caja.addEventListener("click", function () {
        alternar();
        video.focus();
      });

      // El sonido va ON. El <video> no lleva el atributo muted a proposito: el clip
      // tiene musica y quien le da a play quiere oirla. Sin atributo muted el
      // boton arranca enseñando el altavoz, que es lo que hay. Para poder
      // autoplay en silencio habria que ponerlo, y aqui no hay autoplay: el play
      // solo pasa dentro de un clic, que es un gesto, y ahi el navegador lo
      // deja sonar sin problema.
      barra.classList.toggle("sin-sonido", video.muted);

      // El volumen. La pista va de 0 a 100 y el <video> va de 0 a 1, asi que hay
      // que convertir en los dos sentidos.
      var volPista = barra.querySelector(".clip-vol-pista");
      var volRelleno = volPista.querySelector(".clip-barra-rota");
      var volMando = volPista.querySelector(".clip-mando");
      var volumenAntesDeMutar = 1;

      function marcarSonido() {
        barra.classList.toggle("sin-sonido", video.muted || video.volume === 0);
        btnMute.setAttribute("aria-label", video.muted || video.volume === 0
          ? "Poner el sonido" : "Quitar el sonido");
      }

      function pintarVolumen() {
        var pct = Math.round(video.volume * 100);
        volRelleno.style.width = pct + "%";
        // La bolita tambien, que es el mismo forget que en la pista.
        volMando.style.left = pct + "%";
        volPista.setAttribute("aria-valuenow", pct);
        volPista.setAttribute("aria-valuetext", pct + " de 100");
      }

      function ponerVolumen(pct) {
        pct = Math.max(0, Math.min(100, pct));
        video.volume = pct / 100;
        // Mover la barrita a algo que no sea cero quita el mute: es lo que
        // espera cualquiera que la toque, y si no habia que pulsar dos veces.
        if (pct > 0) video.muted = false;
        marcarSonido();
        pintarVolumen();
      }

      // Clic y arrastre, igual que la pista de progreso.
      function saltarVolumen(evt) {
        var r = volPista.getBoundingClientRect();
        var x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
        if (!r.width) return;
        ponerVolumen((x / r.width) * 100);
      }
      var arrastrandoVol = false;
      volPista.addEventListener("click", saltarVolumen);
      volPista.addEventListener("mousedown", function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault();
        arrastrandoVol = true;
        saltarVolumen(ev);
      });
      addEventListener("mousemove", function (ev) {
        if (arrastrandoVol) saltarVolumen(ev);
      });
      addEventListener("mouseup", function () { arrastrandoVol = false; });

      // Doble clic para volver al maximo, como en cualquier reproductor.
      volPista.addEventListener("dblclick", function () { ponerVolumen(100); });

      // Con el teclado, de cinco en cinco, que es lo que hace la de progreso.
      volPista.addEventListener("keydown", function (ev) {
        var salta = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 5
                  : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -5 : 0;
        if (!salta) return;
        ev.preventDefault();
        ponerVolumen(video.volume * 100 + salta);
      });

      btnMute.addEventListener("click", function () {
        if (!video.muted && video.volume > 0) {
          // Guardar el volumen antes de callar, para que el siguiente clic lo
          // devuelva a donde estaba en vez de a 1.
          volumenAntesDeMutar = video.volume;
          video.muted = true;
        } else if (video.muted) {
          video.muted = false;
          if (video.volume === 0) video.volume = volumenAntesDeMutar || 1;
        }
        marcarSonido();
        pintarVolumen();
      });

      marcarSonido();
      pintarVolumen();

      // La pista: clic para saltar, y arrastre con el raton y con el dedo.
      function saltar(evt) {
        var r = pista.getBoundingClientRect();
        var x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
        var pct = Math.max(0, Math.min(1, x / r.width));
        if (video.duration) video.currentTime = pct * video.duration;
        pintar();
      }
      pista.addEventListener("click", saltar);
      pista.addEventListener("mousedown", function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault();
        arrastrando = true;
        saltar(ev);
      });
      window.addEventListener("mousemove", function (ev) {
        if (arrastrando) saltar(ev);
      });
      window.addEventListener("mouseup", function () { arrastrando = false; });

      // Con el teclado la pista va de cinco en cinco segundos, que es lo que
      // hace el control nativo y lo que espera cualquiera que la mueva.
      pista.addEventListener("keydown", function (ev) {
        if (!video.duration) return;
        var salta = ev.key === "ArrowRight" ? 5 : ev.key === "ArrowLeft" ? -5 : 0;
        if (!salta) return;
        ev.preventDefault();
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + salta));
        pintar();
      });

      // Espacio y k sobre el video, sin capturar la tecla en la pagina entera.
      video.setAttribute("tabindex", "0");
      video.addEventListener("keydown", function (ev) {
        if (ev.key === " " || ev.key === "k") { ev.preventDefault(); alternar(); }
      });

      pintar();
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
    //
    // Tambien copia el comando de instalar al pinchar EN el comando, no solo en
    // el boton: sin caja, el comando sale subrayado al pasar el raton y eso ya
    // esta diciendo que se puede pinchar. El aviso va al boton en los dos casos,
    // que es donde esta la palabra "copied".
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".copiar");
      var cod = !b && ev.target.closest && ev.target.closest(".instalar-cmd code");
      if (!b && !cod) return;
      var caja = b ? b : cod.closest(".instalar-cmd");
      // El texto del code es el comando entero y solo el: el "$" va en un
      // pseudo de la caja, precisamente para que esto salga limpio.
      var txt = b ? (b.getAttribute("data-copiar") || "")
                  : (cod.textContent || "").replace(/\s+/g, " ").trim();
      var listo = function () {
        var aviso = caja.querySelector(".copiar");
        if (!aviso) return;
        var antes = aviso.textContent;
        aviso.textContent = "copied";
        aviso.classList.add("hecho");
        setTimeout(function () {
          aviso.textContent = antes;
          aviso.classList.remove("hecho");
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

  // Aqui ya no hay datos de la maquina en la pagina. No se quitaron solo de la
  // vista: la columna de "The data" que los teacha no existe ya, asi que seguir
  // recogiendolos cada cinco minutos era guardar la huella digital de la maquina
  // para no enseñarla. Ni el kernel con su version exacta, ni las horas de uptime,
  // ni la carga, ni el disco, ni los servicios.
  //
  // Si algun dia vuelven a hacer falta, la lista de lo que se puede enseñar estaba
  // aqui (FICHA: kernel, uptime, load, disk, services) y el script que lo recoge
  // del sistema es scripts/collect-system-stats.sh, que sigue corriendo cada
  // cinco minutos y escribiendo data/system.js.

// ── La pagina del manual ───────────────────────────────────────────────────
//
// Va aparte de pintarHyprland() porque son dos cosas distintas: la portada es
// una foto con un clip y dos botones, y el manual es texto con tablas.
//
// TODO sale de H.proyectos, en assets/hyprland.js. Ese array es la lista de
// verdad: el indice, los numeros, el enlace "next", el anclaje y el orden salen
// de ahi. Anadir un proyecto es anadir un objeto con su array `subs`, y ya esta:
// no hay que tocar ni el indice ni este codigo ni el HTML. Esa es la razon de que
// el indice no este escrito a mano en el HTML.
//
// La forma es la del manual de omarchy, que es de donde sale: una portada con
// la lista de los capitulos numerada, y cada capitulo con su titulo, su prosa y
// un enlace al siguiente. La diferencia es que los capitulos van agrupados por
// proyecto, porque lo que hay aqui son tres repos y no una sola cosa.
//
// El anclaje es compuesto —#hyprland/atajos— y no #atajos: asi dos proyectos
// pueden tener una subseccion que se llame igual sin chocar, y el hash se lee
// como la ruta que es. Los ids de HTML admiten "/".
  var PROYECTOS = (H && H.proyectos) || [];

  function idDe(proy, sub) { return proy.id + "/" + sub.id; }

  // El manual entero en una lista plana y ordenada. Se calcula una vez y se usa
  // para tres cosas: numerar, el enlace "next", y el recorrido del teclado. Asi
  // el numero que sale en el indice, el que sale en la seccion y el del "next"
  // son el mismo numero por construccion, y no tres que haya que mantener.
  var PLANO = [];
  PROYECTOS.forEach(function (proy) {
    proy.subs.forEach(function (sub) {
      PLANO.push({ proy: proy, sub: sub, id: idDe(proy, sub), n: PLANO.length + 1 });
    });
  });

  function piezaPorId(id) {
    if (!H || !H.piezas) return null;
    for (var i = 0; i < H.piezas.length; i++) {
      if (H.piezas[i].id === id) return H.piezas[i];
    }
    return null;
  }

  // El buscador dentro de los atajos. No es decoration: con 78 en diez grupos,
  // sin esto encontrar uno es scroll. Filtra sobre el texto ya pintado porque si
  // se filtraran las filas enteras se perderia el resaltado de los grupos.
  function buscadorAtajos() {
    return '<div class="buscador">' +
      '<input type="search" id="busca-atajos" placeholder="Search the shortcuts" ' +
      'autocomplete="off" spellcheck="false" aria-label="Search the keybindings">' +
      '<span class="buscador-conteo" id="cuenta-atajos"></span></div>';
  }

  function atajos() {
    // El dato es ESTATICO y sale del repo. Antes salia de S.atajos, que es el
    // estado de la maquina del autor: en GitHub Pages no esta (esta en
    // .gitignore) y leeria "No keybindings parsed." a todo el mundo.
    var D = window.RHYTHM_DOCS || null;
    var lista = (D && D.atajos) || null;
    if (!lista || !lista.length) {
      return '<p class="sin-datos">No keybindings in <code>data/documentacion.js</code>. ' +
        "Run <code>./scripts/collect-docs.py</code> to build it.</p>";
    }

    var porGrupo = {}, orden = [];
    lista.forEach(function (a) {
      if (!porGrupo[a.grupo]) { porGrupo[a.grupo] = []; orden.push(a.grupo); }
      porGrupo[a.grupo].push(a);
    });

    var cuerpo = orden.map(function (g) {
      // El primer grupo viene abierto y los demas plegados. Con 78 en diez
      // grupos, abiertos todos son 78 lineas de golpe antes de entender nada.
      var abierto = g === orden[0] ? " open" : "";
      return '<details class="grupo-atajos"' + abierto + ">" +
        "<summary>" + esc(g) + "<span>" + porGrupo[g].length + "</span></summary>" +
        '<div class="filas-atajos">' + porGrupo[g].map(function (a) {
          var mods = a.tecla.split(" + ");
          var tecla = mods.pop();
          return '<div class="atajo">' +
            '<span class="combo">' +
            mods.map(function (m) { return "<kbd>" + esc(m) + "</kbd>"; }).join("<i>+</i>") +
            (mods.length ? "<i>+</i>" : "") +
            '<kbd class="tecla">' + esc(tecla) + "</kbd></span>" +
            '<span class="que">' + esc(a.nota || a.que) + "</span>" +
            (a.bloqueado ? '<span class="candado" title="works while the screen is locked">locked</span>' : "") +
            (a.raton ? '<span class="candado" title="mouse button">mouse</span>' : "") +
            "</div>";
        }).join("") + "</div></details>";
    }).join("");

    return buscadorAtajos() + '<div class="atajos" id="lista-atajos">' + cuerpo + "</div>" +
      '<p class="nota-dato">' + lista.length + " keybindings, parsed from " +
      "<code>hyprland.lua</code>" +
      (D && D.version ? " on " + esc(D.version) : "") +
      ". Read from the repository, not from a running compositor, so this is the " +
      "list a fresh install gets.</p>";
  }

  function banderas() {
    var D = window.RHYTHM_DOCS || null;
    var lista = (D && D.banderas) || [];
    if (!lista.length) {
      return '<p class="sin-datos">No installer flags in <code>data/documentacion.js</code>.</p>';
    }
    return '<div class="banderas">' + lista.map(function (b) {
      return '<div class="bandera"><span class="nombres">' +
        "<code>" + esc(b.corta) + "</code>" +
        (b.larga && b.larga !== b.corta ? "<code>" + esc(b.larga) + "</code>" : "") +
        '</span><span class="que">' + esc(b.desc) + "</span></div>";
    }).join("") + "</div>" +
      '<p class="nota-dato">' + lista.length +
      " flags, read from <code>install.sh --help</code>. The README only lists 12 of them.</p>";
  }

  function componentes() {
    var D = window.RHYTHM_DOCS || null;
    var lista = (D && D.componentes) || [];
    if (!lista.length) {
      return '<p class="sin-datos">No components in <code>data/documentacion.js</code>.</p>';
    }
    return '<dl class="componentes">' + lista.map(function (c) {
      return "<dt>" + esc(c.que) + "</dt><dd>" + esc(c["con"]) + "</dd>";
    }).join("") + "</dl>" +
      '<p class="nota-dato">' + lista.length + " components, read from the README.</p>";
  }

  function arbol() {
    var D = window.RHYTHM_DOCS || null;
    var a = (D && D.arbol) || {};
    if (!a.scripts) return '<p class="sin-datos">No tree in <code>data/documentacion.js</code>.</p>';
    var filas = [
      ["~/.local/bin", a.scripts, "every helper script, all on PATH"],
      [".config/hypr", a.conf, "the compositor config"],
      [".config/systemd/user", a.servicios, "services started at login"],
      [".config/systemd/user", a.temporizadores, "timers: OTA checks, collectors"],
      [".config/quickshell", a.quickshell, "the island, in QML"],
      ["sddm/", a.sddm, "the login screen, installed to /usr and /etc"]
    ].filter(function (f) { return f[1]; });
    return '<div class="arbol">' + filas.map(function (f) {
      return '<div class="fila-arbol"><span class="ruta">' + esc(f[0]) + "</span>" +
        '<span class="cifra">' + f[1] + "</span>" +
        '<span class="nota">' + esc(f[2]) + "</span></div>";
    }).join("") + "</div>" +
      '<p class="nota-dato">Counted from the repository, hiding dotfiles and ' +
      "<code>__pycache__</code>. Listing all " + a.scripts + " scripts would be a table " +
      "nobody reads top to bottom.</p>";
  }

  // ── Las secciones de texto nuevo ───────────────────────────────────────────
  //
  // Estas van aqui y no en H.piezas porque no describen una pieza del escritorio:
  // describen un proceso (actualizar), un sintoma (problemas) y el proyecto de
  // otro (la barra). El texto es fijo y no sale de ninguna parte generada:
  // meterlo en H.piezas seria fingir que se puede regenerar.
  function seccionActualizar() {
    return "<p>The installer is not a one-shot script. There is a second half to " +
      "it: the update, the overlays, and what happens to the files you have edited.</p>" +
      '<div class="filas">' +
      fila("rhythm", "Checks for a new release, shows what it would do, and asks. " +
        "It never installs on its own: every update is something you said yes to.") +
      fila("rhythm status", "The same check without changing anything. " +
        "Current version, latest version, commits behind, pending packages.") +
      fila("--resume", "An interrupted install picks up where it stopped. Steps that " +
        "already ran are skipped, and configs that already match the repository are " +
        "left alone instead of being backed up and overwritten.") +
      fila("--preview", "Runs the whole script through without executing a single " +
        "line. Useful for seeing what it would touch on a machine you do not want " +
        "to touch yet.") +
      "</div>" +
      "<h4>Your edits survive updates</h4>" +
      "<p>Updating used to overwrite anything you had edited in <code>~/.config</code>, " +
      "leaving a dated <code>.bak</code> beside it. Two trees exist now: the base is " +
      "re-laid in full on every update, and your edits live in a sparse overlay " +
      "applied last, so they win without opting out of upstream fixes.</p>" +
      '<div class="filas">' +
      fila("hyprland.lua", "sources <code>user.lua</code> at the end through " +
        "<code>loadfile</code> inside <code>pcall</code>, so a typo there drops " +
        "your part and not the desktop") +
      fila("kitty.conf", "glob-includes <code>user.conf</code>") +
      fila("both", "gitignored, so they cannot be shipped and clobbered") +
      "</div>";
  }

  function seccionProblemas() {
    return "<p>Start here before changing anything. Most of what looks broken is " +
      "one file that drifted, and <code>rhythm-doctor</code> usually says which.</p>" +
      '<div class="filas">' +
      fila("rhythm-doctor", "Looks at the whole machine and names what is missing " +
        "or wrong, with the command that fixes it. The installer runs it when it " +
        "finishes, and the update runs it at the end too.") +
      fila("The wallpaper is not on every screen", "The wallpaper daemon needs to " +
        "know which Wayland socket the compositor is on. If the variable is not set " +
        "it falls back to <code>wayland-0</code>, finds nothing, and paints zero " +
        "outputs — silently, and with a log line that says it worked. See " +
        '<a href="#hyprland/doctor">the doctor</a>.') +
      fila("The login screen does not start", "On a hybrid-GPU machine the greeter " +
        "can fail to start its renderer entirely. If the login screen comes up as a " +
        "loop of restarts, that is this.") +
      fila("Something looks stale", "Ctrl+Shift+R. The stylesheet is cached and a " +
        "plain reload may serve the old one.") +
      "</div>" +
      "<h4>Where the logs are</h4>" +
      '<div class="filas">' +
      fila("~/.local/state/rhythm/", "the OTA logs, including the doctor output") +
      fila("~/.cache/rhythm-install.log", "the installer's own log, which says " +
        "where it wrote it") +
      "</div>";
  }

  function seccionBarra() {
    return '<p class="destacado">The strip along the top of the screen. A dynamic ' +
      "island for Hyprland written in QML, from " +
      '<a href="https://github.com/k4ditano/k4" target="_blank" rel="noopener">k4ditano/k4</a>' +
      ". It is the one piece of this desktop written by somebody else, and the " +
      "installer puts it in place along with everything else.</p>" +
      '<div class="filas">' +
      fila("What it is", "Media keys, a control centre, notifications, an app " +
        "launcher, screen capture, and a video editor, all in one strip that " +
        "expands when you touch it and folds away when you do not.") +
      fila("Dual mode", "The bar leaves the top of the screen and becomes a dock. " +
        "Same process, same configuration, different place.") +
      fila("Plugins", "Its own plugin API, and a documented one. Install from the " +
        "bar itself, write one, or ask your agent for one.") +
      fila("Wallpapers", "It pulls its colours out of the wallpaper, so the bar " +
        "changes with the desktop instead of asking you to pick a palette twice.") +
      "</div>" +
      "<h4>What it does not do</h4>" +
      "<p>It is not configurable from <code>hyprland.lua</code>. Everything about " +
      "the bar lives in its own files under <code>~/.config/k4</code>, and a " +
      "broken plugin there shows up in the bar and nowhere else — so when " +
      "<code>rhythm-doctor</code> says the compositor is fine and the bar is not, " +
      "the answer is in that directory.</p>";
  }

  function fila(a, b) {
    return '<div class="fila"><span class="k">' + esc(a) + "</span>" +
      '<span class="v">' + esc(b) + "</span></div>";
  }

  // Las fotos de la seccion. Salen de data/imagenes.js, que escribe
  // scripts/collect-imagenes.py leyendo las capturas del repo.
  //
  // El enlace va a la propia imagen y no a una lupa: sin JavaScript se veria
  // igual, y una lupa hecha a mano son unos 40 lineas de mas y una clase mas
  // que mantener por el gusto de hacer la foto un 20% mas grande. La foto ya
  // esta al ancho de la columna, que es lo que se lee.
  //
  // El width y el height van en el HTML aunque el CSS los ponga a 100%: el
  // navegador los necesita antes de descargar el fichero para reservar el hueco
  // y que el texto no salte cuando la imagen llega. Con el CSS despues no se ve.
  function figuras(id) {
    var I = window.RHYTHM_IMG || null;
    var lista = (I && I[id]) || [];
    if (!lista.length) return "";
    // Las que tienen el mismo tamano son una serie —los tres fondos de pantalla,
    // por ejemplo— y esa serie se compara de un vistazo, asi que van en una fila
    // y no en la rejilla de dos columnas donde quedan 2+1 y se lee como si
    // faltara una. Se decide por el tamano y no con una marca en los datos
    // porque el tamano es justo lo que hace que sean comparables.
    var misma = lista.length > 1 && lista.every(function (im) {
      return im.w === lista[0].w && im.h === lista[0].h;
    });
    var varias = lista.length > 1 && !misma;
    return '<div class="figuras' + (misma ? " figuras-serie" : "") +
      (varias ? " figuras-varias" : "") + '">' +
      lista.map(function (im) {
        return '<figure class="figura">' +
          '<a href="' + esc(im.src) + '" target="_blank" rel="noopener" ' +
          'title="Open the full-size image">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(im.alt) + '" ' +
          'loading="lazy" decoding="async" ' +
          'width="' + im.w + '" height="' + im.h + '"></a>' +
          "<figcaption>" + esc(im.pie || "") + "</figcaption>" +
          "</figure>";
      }).join("") + "</div>";
  }

  // Que pinta cada subseccion. El orden importa: lo especifico (los atajos, la
  // tabla de componentes) va antes de mirar las piezas, porque esas tienen id
  // propio y podrian coincidir por casualidad con una subseccion.
  function cuerpoSeccion(proy, sub) {
    // Las fotos primero. En las ocho secciones que las tienen, la foto explica la
    // seccion en un segundo y el texto la matiza; al reves, el texto obliga a
    // leer antes de saber de que esta hablando.
    var foto = figuras(idDe(proy, sub));

    // Las secciones cuyo texto no sale de las piezas: sale del dato generado, o
    // esta escrito aqui. Van por id y no por `pieza` porque las piezas son
    // contenido de hyprland.js y estas son de las dos cosas.
    var propias = {
      atajos: atajos,
      instalado: componentes,
      actualizar: seccionActualizar,
      arbol: arbol,
      problemas: seccionProblemas,
      barra: seccionBarra
    };
    if (propias[sub.id]) return foto + propias[sub.id]();

    // Y las que salen de una pieza de hyprland.js.
    var p = sub.pieza ? piezaPorId(sub.pieza) : null;
    if (!p) {
      return foto + '<p class="sin-datos">This section points at <code>' +
        esc(sub.pieza || sub.id) + "</code>, which is not in the data.</p>";
    }
    var out = "";
    if (p.resumen) out += '<p class="destacado">' + esc(p.resumen) + "</p>";
    if (p.filas && p.filas.length) {
      out += '<ul class="prosa">' + p.filas.map(function (f) {
        return "<li>" + esc(f) + "</li>";
      }).join("") + "</ul>";
    }
    if (p.tipo === "comando") out += comando(p);
    // La tabla de banderas va con el instalador, que es de donde salen.
    if (sub.id === "empezar") out += "<h4>Every flag</h4>" + banderas();
    return foto + out;
  }

  // ── El indice ──────────────────────────────────────────────────────────────
  //
  // Dos niveles y numeracion continua, como el de omarchy. El numero va en el
  // mismo sitio que el enlace, no en una columna aparte, para que al copiar el
  // enlace a otra persona se lea "4. The island" y no un numero suelto.
  function pintarIndice() {
    var caja = $("#indice");
    if (!caja) return;
    var D = window.RHYTHM_DOCS || null;
    var nGrupos = D && D.atajos
      ? new Set(D.atajos.map(function (a) { return a.grupo; })).size : null;

    caja.innerHTML = '<h2>On this page</h2>' + PROYECTOS.map(function (proy) {
      var subs = proy.subs.map(function (sub) {
        var entrada = PLANO.filter(function (x) { return x.proy === proy && x.sub === sub; })[0];
        var extra = sub.id === "atajos" && nGrupos
          ? "<span>" + nGrupos + " groups</span>" : "";
        return '<li><a href="#' + esc(idDe(proy, sub)) + '">' +
          '<i class="n">' + (entrada ? entrada.n : "?") + "</i>" +
          "<b>" + esc(sub.t) + "</b>" + extra + "</a></li>";
      }).join("");

      return '<div class="grupo-indice">' +
        '<h3>' + esc(proy.titulo) + "</h3>" +
        '<ol class="subs">' + subs + "</ol></div>";
    }).join("") +
      (D && D.version ? '<p class="indice-sello">documents ' + esc(D.version) + "</p>" : "");
  }

  // ── El cuerpo ──────────────────────────────────────────────────────────────
  function pintarManual() {
    var caja = $("#manual");
    if (!caja) return;                    // no estamos en la pagina del manual
    if (!PROYECTOS.length) {
      caja.innerHTML = '<p class="sin-datos">No projects in <code>H.proyectos</code>.</p>';
      return;
    }

    // La portada: los proyectos y lo que hay dentro de cada uno. Es el mismo
    // dato que el indice, en grande. En omarchy esta lista es la pagina entera y
    // cada capitulo tiene su URL; aqui la lista esta arriba y las dos coisas
    // comparten fuente.
    var portada = '<div class="portada' + (PROYECTOS.length === 1 ? " portada-una" : "") +
      '">' + PROYECTOS.map(function (proy) {
      var subs = proy.subs.map(function (sub) {
        var e = PLANO.filter(function (x) { return x.proy === proy && x.sub === sub; })[0];
        return '<li><a href="#' + esc(idDe(proy, sub)) + '">' +
          '<i class="n">' + (e ? e.n : "?") + "</i>" + esc(sub.t) + "</a></li>";
      }).join("");
      return '<article class="proyecto">' +
        '<h2>' + esc(proy.titulo) + "</h2>" +
        '<p class="proyecto-res">' + esc(proy.resumen || "") + "</p>" +
        (proy.repo
          ? '<a class="proyecto-repo" href="https://github.com/' + esc(proy.repo) +
            '" target="_blank" rel="noopener">' + esc(proy.repo) + "</a>"
          : "") +
        '<ol class="proyecto-subs">' + subs + "</ol></article>";
    }).join("") + "</div>";

    // Las secciones. Cada proyecto abre con un encabezado propio y sus
    // subsecciones van debajo, para que al leer en scroll largo se sepa de que
    // parte se esta hablando.
    var secciones = PROYECTOS.map(function (proy) {
      var cuerpo = proy.subs.map(function (sub) {
        var entrada = PLANO.filter(function (x) { return x.proy === proy && x.sub === sub; })[0];
        var siguiente = entrada ? PLANO[entrada.n] : null;   // PLANO[n] es el n+1
        var chips = (piezaPorId(sub.pieza) || {}).chips || [];

        return '<section class="seccion-manual" id="' + esc(idDe(proy, sub)) + '">' +
          '<div class="cabecera-seccion">' +
          '<span class="punto-mini"></span>' +
          '<span class="seccion-n">' + (entrada ? entrada.n : "") + "</span>" +
          "<h2>" + esc(sub.t) + "</h2>" +
          (chips.length
            ? '<span class="chips">' + chips.map(function (c) {
                return '<span class="chip">' + esc(c) + "</span>";
              }).join("") + "</span>"
            : "") +
          "</div>" + cuerpoSeccion(proy, sub) +
          (siguiente
            ? '<a class="siguiente" href="#' + esc(siguiente.id) + '">' +
              "<span>Next</span>" + esc(siguiente.sub.t) + "<i aria-hidden=\"true\"></i></a>"
            : '<p class="fin-manual">That is the whole manual. ' +
              'Back to <a href="index.html">the front page</a>.</p>') +
          "</section>";
      }).join("");

      return '<div class="bloque-proyecto" id="proy-' + esc(proy.id) + '">' +
        '<div class="cabecera-proyecto">' +
        '<h2>' + esc(proy.titulo) + "</h2>" +
        '<p>' + esc(proy.resumen || "") + "</p>" +
        (proy.repo
          ? '<a href="https://github.com/' + esc(proy.repo) +
            '" target="_blank" rel="noopener">' + esc(proy.repo) + "</a>"
          : "") +
        "</div>" + cuerpo + "</div>";
    }).join("");

    caja.innerHTML = portada + secciones;

    // El indice antes que nada: necesita el DOM ya pintado para poder medir, y
    // se pinta desde PLANO, no desde las secciones, asi que el orden entre estas
    // dos llamadas solo importa para que marcarIndice() encuentre los enlaces.
    pintarIndice();
    montarBuscador();
    marcarIndice();

    // Un solo listener para todo el scroll, no uno por seccion. Con doce
    // secciones, doce listeners cada uno midiendo doce rectangulos, es trabajo
    // en cada fotograma por algo que aqui son doce medidas y un bucle.
    addEventListener("scroll", marcarIndice, { passive: true });
    addEventListener("resize", marcarIndice, { passive: true });
  }

  function montarBuscador() {
    var busca = $("#busca-atajos");
    if (!busca) return;
    var cuenta = $("#cuenta-atajos");
    var todos = $$("#lista-atajos .atajo");
    var marcar = function () {
      var q = busca.value.trim().toLowerCase();
      var n = 0;
      todos.forEach(function (f) {
        var coincide = !q || f.textContent.toLowerCase().indexOf(q) !== -1;
        f.style.display = coincide ? "" : "none";
        if (coincide) n++;
      });
      if (cuenta) cuenta.textContent = q ? n + " of " + todos.length : "";
      // Los grupos que se quedan sin nada se cierran y se esconden, para que la
      // lista no sea un agujero de grupos vacios.
      $$("#lista-atajos .grupo-atajos").forEach(function (g) {
        var vivos = Array.prototype.slice.call(g.querySelectorAll(".atajo"))
          .filter(function (f) { return f.style.display !== "none"; });
        g.style.display = vivos.length ? "" : "none";
        if (q && vivos.length) g.open = true;
      });
    };
    busca.addEventListener("input", marcar, { passive: true });
    marcar();
  }

  // Que entrada del indice se marca. Se mide contra el borde de arriba en vez de
  // esperar al observer, porque el observer solo avisa cuando ALGO entra en el
  // margen: si el visitante esta en el ultimo proyecto y sube al ultimo pixel,
  // no se dispara nada y el indice se queda marcando el anterior. Con el scroll
  // siempre se recalcula y siempre acierta.
  function marcarIndice() {
    var enlaces = $$("#indice a");
    if (!enlaces.length) return;
    var actual = null;
    PLANO.forEach(function (x) {
      var el = document.getElementById(x.id);
      if (!el) return;
      if (el.getBoundingClientRect().top <= 140) actual = x.id;
    });
    enlaces.forEach(function (a) {
      var activo = a.getAttribute("href") === "#" + actual;
      a.classList.toggle("activo", activo);
      if (activo) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    // Y el proyecto entero, con un poco mas de margen, para que el encabezado
    // grande se resalte tambien al pasar por el.
    var proyecto = null;
    PROYECTOS.forEach(function (proy) {
      var el = document.getElementById("proy-" + proy.id);
      if (el && el.getBoundingClientRect().top <= 200) proyecto = proy.id;
    });
    $$("#indice .grupo-indice").forEach(function (g) {
      g.classList.toggle("activo", g.querySelector("h3").textContent ===
        (PROYECTOS.filter(function (p) { return p.id === proyecto; })[0] || {}).titulo);
    });
  }

  // El sello de arriba: que version del repo describe esto y de cuando es.
  function selloDocs() {
    var el = $("#sello-docs");
    if (!el) return;
    var D = window.RHYTHM_DOCS || null;
    if (!D) { el.textContent = ""; return; }
    // "in N projects" solo cuando hay mas de uno. Con uno solo sale
    // "1 projects", que es ingles mal dicho y se ve en la pagina.
    el.textContent = "documents " + (D.version || "the repository") +
      " · " + PLANO.length + " sections" +
      (PROYECTOS.length > 1 ? " in " + PROYECTOS.length + " projects" : "") +
      " · collected " + hace(D.recogido);
  }


  // ── Arranque ───────────────────────────────────────────────────────────────

  // ── Volver a donde estabas ─────────────────────────────────────────────────
  //
  // POR QUE HAY QUE HACERLO A MANO
  //
  // La seccion de hyprland nace VACIA en el HTML (#hyprland-caja sin nada) y la
  // pinta pintarHyprland() un momento despues. Al recargar, el navegador decide
  // la posicion de scroll con el documento que tiene en ese instante, que es el
  // corto; luego este script inyecta el contenido, la pagina crece del alto de
  // una pantalla al de cuatro, y la posicion restituida ya no apunta al mismo
  // sitio: se queda a mitad de camino de lo que se estaba mirando.
  //
  // Con history.scrollRestoration en "manual" el navegador deja de adivinar y avisa
  // de que la pagina va a cambiar de alto por su cuenta. La posicion se guarda aqui,
  // en sessionStorage, y se devuelve cuando el documento ya tiene su alto bueno.
  //
  // sessionStorage y no localStorage: esto es "donde estaba en esta pestana". Si se
  // guardara en localStorage, volver manana abriria la pagina a media altura de una
  // sesion que ya no existe, que es la forma mas incomoda de empezar.
  //
  // Y hay una excepcion: si la URL lleva #algo manda el ancla. El usuario ha pedido
  // un sitio concreto y devolverle "donde estaba" le haria caso omiso.
  var CLAVE_POS = "rhythm-crea-scroll";
  var posGuardada = 0;

  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch (e) { /* sin scrollRestoration */ }

  function leerPos() {
    try { return parseInt(sessionStorage.getItem(CLAVE_POS), 10) || 0; }
    catch (e) { return 0; }        // sin storage: se empieza arriba, que es lo de siempre
  }

  function guardarPos() {
    try { sessionStorage.setItem(CLAVE_POS, String(Math.round(window.scrollY))); }
    catch (e) { /* sin storage */ }
  }

  // Con throttle y no en cada scroll: el evento salta a 60 por segundo, y escribir
  // en storage ese numero de veces funciona en una maquina y va mal en un movil con
  // la pestana en segundo plano.
  var ultimoGuardado = 0;
  addEventListener("scroll", function () {
    var ahora = Date.now();
    if (ahora - ultimoGuardado < 300) return;
    ultimoGuardado = ahora;
    guardarPos();
  }, { passive: true });

  // En pagehide y en visibilitychange, y no solo en unload: en movil cambiar de
  // pestana o cerrar la del navegador no dispara unload. Sin esto, recargar sin
  // haber hecho scroll lately guardaba una posicion de hace medio minuto.
  addEventListener("pagehide", guardarPos);
  addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") guardarPos();
  });

    // ── Cuando se devuelve la posicion ─────────────────────────────────────────
    //
    // NO vale con esperar dos fotogramas. Al principio lo hacia asi y el resultado
    // era abrir la pagina ABAJO del todo, en el final del documento. El motivo es
    // que a los dos fotogramas la pagina todavia esta CORTA: la foto del angel, la
    // fuente y el cartel del clip se estan descargando, y el alto que se mide ahi no
    // es el alto bueno. La posicion recordada era mas grande que ese alto corto, y
    // el tope que se ponia para no salirse (min(y, max)) la convertia en el final
    // del documento. O sea: abrir abajo, que es justo el fallo.
    //
    // Ahora se espera al evento load, que es cuando ya han llegado las imagenes y
    // la fuente y el alto por fin es el definitivo. Si load ya ha pasado, que es el
    // caso de cuando se navega con la cache en calor, se va directo.
    function devolverPos() {
      if (location.hash) return;                 // manda el ancla
      var y = posGuardada;
      if (y <= 0) return;

      var poner = function () {
        // Dos fotogramas DESPUES de load: el layout ya esta resuelto, y un
        // requestAnimationFrame mas asegura que el navegador aplico los estilos
        // calculados con los recursos nuevos.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            var alto = document.documentElement.scrollHeight - innerHeight;
            //
            // NUNCA al final del documento. Este era el fallo de verdad y hacia mas
            // de lo que parece. Si el punto guardado no existe ya —la pagina quedo
            // mas corta que la ultima vez, o la ventana es mas baja, o el ancho
            // cambio y la foto de las alas ocupa otra altura—, lo unico que se
            // puede hacer con un tope es ir al final. Y "abajo del todo" es
            // justamente lo que se quejaba el visitante: recargar y verse en la
            // ultima linea del documento.
            //
            // Si el punto no existe, se empieza por arriba. Arriba siempre es un
            // sitio del que se sale, y es lo que espera cualquiera que recarga.
            scrollTo(0, y > alto ? 0 : y);
          });
        });
      };

      if (document.readyState === "complete") poner();
      else addEventListener("load", poner, { once: true });
    }

  // ── La entrada ─────────────────────────────────────────────────────────────
  //
  // Aqui se animaba SOLO la primera visita, y se guardaba una marca en localStorage
  // para acordarse. Mal: en cuanto se ponia la marca —y se ponia en la primera
  // visita— la entrada no volvia a existir nunca mas. Recargar cinco veces y ya no
  // se volvia a ver nunca, y no habia forma de volver a verla porque el unico
  // boton era el storage del navegador.
  //
  // Ahora se anima en cada carga, y corta. Un segundo y poco de entrada no cansa a
  // nadie: lo que cansa es un retraso, y esta animacion ES el retraso. Omarchy
  // hace lo mismo, y es lo que hacen las paginas que se sienten rapidas: una
  // entrada corta y siempre igual, no una entrada que pasa una vez y luego no.
  //
  // Si el visitante pide menos movimiento, el CSS lo anula. Y si el JavaScript no
  // llega a correr, la clase no se pone y la pagina se pinta normal, porque el
  // estado invisible esta DENTRO de la clase y no en las reglas de siempre.
  function entrada() {
    //
    // SOLO si la pagina se abre por ARRIBA. Esto era un fallo muy visible: la
    // entrada pone html.entrando, y esa clase deja #hyprland en opacity 0 hasta
    // que el observer la marca. Al recargar con la posicion restaurada, el
    // visitante cae en mitad de la pagina SIN HABER VISTO LA PORTADA y lo que
    // tiene delante es un rectangulo invisible de mas de mil pixeles de alto
    // durante medio segundo. Medido a 1440x900 recargando en 700: a los 200 ms la
    // seccion estaba en opacidad 0 y a los 500 ms en 0.996.
    //
    // Lo que se veia entonces era la cola del heroe arriba, un hueco negro en medio
    // y el pie abajo. De ahi lo de que "todo le aparecia abajo": no era el scroll,
    // era que lo del medio no estaba.
    //
    // Y la entrada en si no tiene sentido a media pagina: su gracia es que se vea
    // la portada entrar. Recargar y que la portada entre animada cuando ya estas
    // mil pixeles mas abajo, no es una entrada: es un retraso en un sitio donde no
    // se nota.
    if (posGuardada > 40 || location.hash) return;

    // Tambien se mira aqui y no solo en el CSS. Es lo que hace omarchy.org: si el
    // sistema pide menos movimiento, la clase NO se pone. Es distinto de anularla
    // por CSS, porque sin la clase el resto de la pagina ni se entera de que habia
    // una entrada que cancelar.
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch (e) { /* sin matchMedia: se anima */ }

    document.documentElement.classList.add("entrando");

    // La seccion de hyprland entra al llegar, no al cargar. Sin observer se marca
    // al montar, porque si no se quedaria con opacity 0 para siempre.
    var seccion = $("#hyprland");
    if (seccion) {
      var marcar = function () { seccion.classList.add("hyprland-visto"); };
      if ("IntersectionObserver" in window) {
        var obsE = new IntersectionObserver(function (e) {
          if (!e[0].isIntersecting) return;
          marcar();
          obsE.disconnect();
        }, { rootMargin: "0px 0px -12% 0px" });
        obsE.observe(seccion);
      } else {
        marcar();
      }
    }

    // La clase se quita cuando la animacion mas larga ha terminado, para que el DOM
    // vuelva a su estado normal y las transiciones de despues (el hover, el cambio
    // de tema) no peleen con un animation-fill-mode: forwards.
    //
    // 5 segundos, como omarchy. No es que la animacion dure eso: dura 0,55 s. Es el
    // margen de seguridad para el caso de que algo no dispare y la pagina se quede
    // a medias. Pasados los 5 s la clase se quita pase lo que pase y el DOM vuelve
    // a su estado normal, porque el estado invisible vive dentro de la clase.
    setTimeout(function () {
      document.documentElement.classList.remove("entrando");
    }, 5000);
  }


  function tic() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    var r = $("#reloj");
    if (r) r.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function inicio() {
    // La posicion se lee PRIMERO, antes de la entrada: entrada() necesita saber si
    // la pagina se abre por arriba o por el medio, y esa respuesta esta en la
    // posicion guardada. Todavia no se ha restaurado nada, que es justo lo que hace
    // falta: aqui el scrollY sigue a 0 porque scrollRestoration esta en manual.
    posGuardada = leerPos();
    entrada();
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

    // La seccion se pinta ANTES de mirar el clip. Antes estaba al reves, y el
    // observer se montaba sobre un DOM que todavia no tenia el <video>: no
    // observaba nada y el clip no se montaba hasta la red de seguridad de los
    // cuatro segundos. Cuatro segundos de poster por ir looking for un elemento
    // que ya estaba ahi.
    interruptor();
    pintarManual();
    selloDocs();
    pintarHyprland();

    // Aqui ya esta todo el contenido en el DOM, que es lo que faltaba para que la
    // posicion guardada signifique algo. devolverPos() espera dos fotogramas por su
    // cuenta, asi que no hay que añadir ningun setTimeout aqui.
    devolverPos();

    // El clip no espera a que nadie pulse nada: ya no hay una pieza que abrir.
    // Espera a que este a punto de entrar en pantalla, que es el momento en que
    // bajar 2,7 MB deja de molestar. Con rootMargin se adelanta 600 px para que
    // llegue empezado en vez de esperar a que se vea el borde.
    //
    // El reproductor se engancha aqui y no antes, para que no se quede
    // escuchando eventos de un <video> al que todavia no le han puesto el src.
    //
    // clipMontado evita hacerlo dos veces: el src se pondria otra vez y el
    // <video> recargaria desde el principio, que es lo que mas se nota.
    var clipMontado = false;
    function arrancarClip() {
      if (clipMontado) return;
      clipMontado = true;
      montarVideos();
      $$("#hyprland-caja video").forEach(reproductor);
    }

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          arrancarClip();
          obs.disconnect();
        });
      }, { rootMargin: "600px 0px" });
      var pendiente = $$("video source[data-src]");
      if (pendiente.length) obs.observe(pendiente[0].parentNode);
      // Red de seguridad. El observer deberia disparar siempre, pero si no lo
      // hace el clip se queda en el poster para siempre y no hay ningun boton
      // fallado que diga que lo que falta es el src. A los cuatro segundos se
      // monta igual; todavia esta fuera de pantalla, asi que solo se adelanta
      // la descarga.
      setTimeout(arrancarClip, 4000);
    } else {
      arrancarClip();
    }

    // La tecla "j" abria la primera pieza. Ya no hay piezas, asi que baja al
    // clip, que es lo que se abre ahora.
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "j") return;
      var v = $("#hyprland-caja video");
      if (v) v.scrollIntoView({ block: "center" });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicio);
  else inicio();

})();
