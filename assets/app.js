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
    // El idioma se pregunta aqui y no en el diccionario porque la forma es distinta:
    // el ingles pone la unidad delante y el español detrás ("12 h" contra "h 12"), y
    // el español además quiere el "hace" delante. Con un diccionario de frases
    // enteras esto no se podria hacer: la cifra cambia cada minuto.
    var T = window.traducir || function (x) { return x; };
    var es = T("just now") !== "just now";
    if (min < 1) return T("just now");
    if (min < 60) return es ? T("hace") + " " + min + " " + T("min") : min + " " + T("min ago");
    var h = Math.floor(min / 60);
    if (h < 24) return es ? T("hace") + " " + h + " h" : h + " " + T("h ago");
    var d = Math.floor(h / 24);
    return es ? T("hace") + " " + d + " " + T("d") : d + " " + T("d ago");
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
    if (d.release) meta.push(esc(d.release));
    else if (d.lenguaje) meta.push(esc(d.lenguaje));
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
      '<div class="distros-soportadas" aria-label="Supported distributions">' +
        '<span class="chip-distro">Arch</span>' +
        '<span class="chip-distro">NixOS</span>' +
        '<span class="chip-distro">openSUSE</span>' +
        '<span class="chip-distro">Fedora</span>' +
        '<span class="chip-distro">Debian</span>' +
        '<span class="chip-distro">Ubuntu</span>' +
        '<span class="chip-distro">Alpine</span>' +
      '</div>' +
      '<div class="comando instalar-cmd"><code>' + esc(H.instalar.comando) + "</code>" +
      '<button class="copiar" type="button" data-copiar="' + esc(H.instalar.comando) +
      '">copy</button></div>' +
      "</div>");


    var caja = $("#hyprland-caja");
    if (caja && !caja.children.length) caja.innerHTML = out.join("");
  }


// ── Los bloques de datos vivos ─────────────────────────────────────────
    //
    // Antes leian de data/system.js, que escribia un recolector en la maquina del
    // sitio. Eso ya no existe: ni el fichero ni el script que lo hacia, porque una
    // web estatica no tiene por que saber nada de la maquina de quien la publica.
    // Se dejan aqui porque son lo que haria falta si algun dia vuelven, y solo
    // tendrian que recibir los datos por otro lado.
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
          // El segundo por el que se salta el arranque en negro del clip. Va como
          // atributo y no como dato pasado al reproductor para que se vea en el
          // HTML, que es donde se busca cuando el cartel sale en negro.
          (p.desde ? ' data-desde="' + esc(p.desde) + '"' : "") +
          ' loop aria-label="' + esc(p.titulo || "clip") + '">' +
          // El WebM va PRIMERO, y el MP4 detras. No es por Taste: hay dos razones.
          //
          // Una: pesa menos. El mp4 son 10,4 MB y el webm del mismo clip a 720p
          // se queda en una fraccion, y el reproductor nunca pasa de 990 px de
          // ancho, asi que a 1920 no se ve ni un detalle mas.
          //
          // Dos, y es la que importa: hay bloqueadores de anuncios y redes de
          // empresa que cortan los .mp4. Medido con la peticion bloqueada: el
          // navegador se queda en readyState 0 y networkState 3 —sin fuente— y no
          // pone NINGUN error, ni en la consola ni en el elemento. Con dos
          // <source>, en cuanto falla el primero el navegador pasa al segundo, y
          // el clip suena igual.
          //
          // El orden es webm-mp4 y no mp4-webm a proposito: el mp4 pesa 10,4 MB y
          // con el mp4 delante se lo bajaba todo el mundo. Quien no sepa hacer
          // WebM —un Safari viejo— cae en el mp4, que es justo lo que tiene que
          // pasar.
          '<source data-src="' + esc(p.webm || p.src) + '" type="video/webm">' +
          '<source data-src="' + esc(p.src) + '" type="video/mp4">' +
          "This browser cannot play the clip. It is 50 seconds of the desktop: " +
          "the launcher, the control centre and the end." +
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
            // El total sale "--:--" y no un numero. Estaba escrito en el HTML a
            // mano —0:33— y era el segundo en que duraba el clip el dia que se
            // escribio. Si el video cambia, o si no se puede leer el metadato,
            // eso es un numero falso; "--:--" se ve como lo que es: que aun no se
            // sabe. pintar() lo rellena en cuanto loadedmetadata llega.
            '<i>/</i><span class="clip-total">--:--</span></span>' +
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

      // Cuando el navegador se niega a reproducir, hay que decirselo.
      //
      // Antes el error se tragaba con un `.catch(function () { })` y aqui no
      // pasaba nada: se pulsaba el play y no se veia ninguna reaction, sin error en
      // pantalla y sin nada en la consola. Quien lo suffer no tiene forma de saber
      // si la pagina esta rota o si es su navegador, que es justo la situacion en la
      // que mas caro resulta pedir ayuda.
      //
      // Pasa por tres sitios, y los tres son "el navegador ha decidido que no":
      //   NotAllowedError  la politica de reproduccion automatica. En un movil con
      //                   ahorro de datos o modo de bajo consumo, el navegador
      //                   prohibe reproducir con sonido, y con este boton, que es
      //                   un icono y no un <video controls>, no hay manera de
      //                   hacerlo desde el propio navegador.
      //   NotSupportedError el fichero no se puede decodificar aqui.
      //   AbortError       otra peticion de reproduccion se ha adelantado.
      //
      // Se avisa con el propio boton: se queda en estado de fallo y con el titulo
      // puesto, que se lee al pasar el raton por encima. No sale un cartel por
      // pantalla porque el aviso se lleva el texto del boton y el texto de la
      // pagina esta en ingles por lo mismo.
      function avisar(motivo) {
        barra.classList.add("clip-fallo");
        btnPlay.setAttribute("title", motivo);
        btnPlay.setAttribute("aria-label", motivo);
        btnPlay.setAttribute("data-fallo", "1");
      }

      // ── CUANDO EL FICHERO NO LLEGA, QUE SE DIGA ─────────────────────────────
      //
      // Todo lo de arriba escucha el rechazo de `play()`. Pero hay un caso en el que
      // no hay nada que escuchar, y es el mas comun en un ordenador.
      //
      // Medido con la peticion del clip bloqueada, que es lo que hace un bloqueador
      // de anuncios o una red de empresa:
      //
      //     readyState   0        no ha cargado nada
      //     networkState 3        SIN FUENTE
      //     video.error  ninguno   el navegador no se queja
      //     el boton     normal   sin marca y sin aviso
      //
      // Es decir: un rectangulo negro de 990 x 558 y un play que no hace nada, sin
      // un solo mensaje. Nadie puede saber si la pagina esta rota o si es su
      // navegador, que es lo que hace que esto sea tan dificil de reportar.
      //
      // Por eso se escuchan los eventos del propio elemento —`error` y `stalled`—
      // y por eso se comprueba `networkState`, que es el unico dato que delata el
      // caso: 3 es NETWORK_NO_SOURCE, y un video sin fuente no se puede reproducir
      // por mas que se le insista.
      //
      // El aviso se pone en el boton, y no en un cartel por pantalla, porque el
      // boton ya esta ahi y no tapa el texto de la pagina.
      function funcionar() {
        barra.classList.remove("clip-fallo");
        btnPlay.removeAttribute("title");
        btnPlay.removeAttribute("aria-label");
        btnPlay.removeAttribute("data-fallo");
      }

      // Tres cosas que solo aqui pueden saber que el clip no va a venir.
      //
      //   error    el navegador no pudo cargar ni el webm ni el mp4. Es el evento
      //            normal cuando los dos formatos estan bloqueados.
      //   stalled   la conexion se quedo parada a media carga.
      //   probe     al abrir el menu, para el caso de que el fallo ya hubiera
      //            pasado antes de que hubiera quien escuchara. Con esto no hace
      //            falta que nadie pulse play para enterarse.
      video.addEventListener("error", function () {
        avisar("The clip did not load. Your browser or network may be blocking video files.");
      });
      video.addEventListener("stalled", function () {
        avisar("The clip stopped downloading. Check your connection and try again.");
      });
      // Y el aviso se quita solo en cuanto el clip se reproduce. Sin esto se quedaba
      // puesto para siempre en un caso que antes no existia: al intentar el mp4 se
      // dispara un `stalled` de camino al webm, el boton se marca, el webm carga y
      // el clip suena — con el boton en rojo, que es una contradiccion. Medido.
      //
      // Se escucha `playing` y no `canplay` a proposito: `canplay` salta con lo
      // justo para empezar, y el aviso que importa es el de "no suena", que ya no
      // es cierto en cuanto hay imagen en movimiento.
      video.addEventListener("playing", funcionar);

      // Y la comprobacion de "no hay fuente", que es el unico dato que delata el
      // caso. NO se hace aqui, al montar, porque en ese instante el elemento todavia
      // no tiene fuente: el src se asigna justo despues y con `preload="none"` el
      // navegador no carga nada hasta que se le pide. Medido: marcando aqui, el
      // boton se ponia en rojo en el caso BUENO —con el mp4 bloqueado y el webm
      // ya sonando— y no habia ningun evento posterior que lo quitara.
      //
      // Se comprueba mas tarde, cuando ya ha pasado el tiempo de empezar a cargar,
      // y otra vez en cada pulsacion.
      setTimeout(function () {
        if (video.networkState === 3) {
          avisar("The clip did not load. Your browser or network may be blocking video files.");
        }
      }, 3000);
      function alternar() {
        // Si el fichero no llego, se dice antes de intentar nada. Sin esta
        // comprobacion, con el clip sin fuente, `play()` no siempre rechaza —a veces
        // no promesse nada— y la pulsacion se pierde en silencio.
        if (video.paused && video.networkState === 3 && !video.error) {
          avisar("The clip did not load. Your browser or network may be blocking video files.");
          return;
        }
        // El primer play necesita un play() dentro de un gesto del usuario, y
        // este lo es: el boton. A partir de ahi se puede pausar y reanudar.
        if (video.paused) {
          var p = video.play();
          if (p && p.then) {
            p.then(function () { funcionar(); }, function (e) {
              // Si el navegador no lo quiere, al menos sin sonido puede. Es lo
              // que hacen los controles de mas de un sitio, y aqui el boton es
              // nuestro, asi que no hay ningun control del navegador al que
              // apelar. Un silencio con aviso vale mas que una pantalla en negro.
              if (e && (e.name === "NotAllowedError" || e.name === "AbortError") &&
                  !video.muted) {
                video.muted = true;
                var q = video.play();
                if (q && q.catch) {
                  q.then(function () { avisar("Playing without sound: the browser blocked audio."); },
                         function () { avisar("This browser will not play the clip."); });
                } else avisar("This browser will not play the clip.");
                return;
              }
              avisar("This browser will not play the clip.");
            });
          }
        } else video.pause();
      }

      // Saltar el arranque en negro del clip.
      //
      // El video empieza con dos segundos y medio de negro con un cartel, y el
      // poster es un fotograma de DESPUES. Sin esto, lo que se ve al pulsar es una
      // pantalla negra: medida, es lo que pasaba. Se salta al primer plano con
      // contenido y asi el paso del poster al video es continuo.
      //
      // Una sola vez, y solo si el video sigue al principio. Si alguien lo ha
      // visto, lo ha parado y ha vuelto a empezar, se respeta su posicion: el
      // salto es solo para el primer play.
      var desde = parseFloat(video.getAttribute("data-desde"));
      function saltarIntro() {
        if (!desde || video.getAttribute("data-intro") === "saltada") return;
        if (video.currentTime > 0.05) return;
        video.setAttribute("data-intro", "saltada");
        try { video.currentTime = desde; } catch (e) { /* si no puede, se queda */ }
      }

      video.addEventListener("timeupdate", pintar);
      video.addEventListener("loadedmetadata", function () {
        saltarIntro();
        pintar();
      });
      video.addEventListener("seeked", pintar);
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

      // ── Aviso de carga ───────────────────────────────────────────────────
      //
      // Al darle a play el boton grande se apaga en 0.25 s y el video todavía no
      // tiene nada que pintar: medido con la red a 1,5 Mbit, entre que se apaga el
      // boton y que entra el primer fotograma hay casi medio segundo de rectangulo
      // negro sin ningun indicio de que este pasando algo. El cartel de negro del
      // principio hacia ese hueco todavia mas largo.
      //
      // Se pone con los eventos del propio <video> en vez de con un temporizador:
      // waiting salta cuando se queda sin datos, playing cuando ya los tiene. Un
      // setTimeout seria "probablemente" y aqui se sabe.
      // La clase va en los DOS sitios, igual que la de "sonando": la barra lleva
      // el texto "cargando" y la caja del video el anillo. Con la clase solo en la
      // barra el texto aparecia y el anillo no, que es medio aviso.
      var cargando = function () {
        var sí = video.readyState < 3 && !video.paused;
        barra.classList.toggle("cargando", sí);
        video.parentNode.classList.toggle("cargando", sí);
      };
      ["waiting", "stalled", "playing", "canplay", "pause", "seeking", "seeked",
       "loadeddata", "emptied"].forEach(function (ev) {
        video.addEventListener(ev, cargando);
      });
      video.addEventListener("error", function () {
        // Si el video no se puede reproducir, el boton de "play" no va a hacer nada
        // y no hay ningun aviso. Esto es lo unico que avisa, y por eso se pone.
        video.parentNode.classList.add("fallo");
        barra.classList.add("fallo");
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

      // Pinchar sobre el propio video cuando esta en marcha lo pausa.
      video.addEventListener("click", function () {
        if (!video.paused) alternar();
      });

      // Pinchar en el clip lo para y lo reanuda. Antes no habia nada: como el
      // boton grande se apaga en cuanto arranca y ademas con pointer-events:
      // none, la unica manera de parar era el boton de la barra de abajo. En un
      // reproductor de verdad, pinchar en el video es lo primero que pruebas.
      //
      // El manejador va en la CAJA (que es .escena-clip) y no en el <video>, para
      // que el clic del boton grande, que esta dentro, tambien cuente; ese se
      // para antes con stopPropagation.
      //
      // El recuadro entero del video NO es un boton de play. Antes lo era, y eso
      // ha sido un problema serio: un clic en cualquier parte de la imagen
      // arrancaba la reproduccion con sonido, al 100 % de volumen, y como el clip
      // va en bucle no paraba nunca. Medido: un clic a 299,199 —una esquina, sin
      // tocar ni el boton ni la barra— lo dejo sonando y a los 2,5 s iba por el
      // segundo 8 con loop puesto.
      //
      // Lo que se acaba viendo es que el boton de play es opcional: el que quiere
      // el video pulsa el boton, que es para eso. Un blanco de 990x558 px que al
      // pulsarlo arranca audio es la forma mas facil de que alguien se coma una
      // reproduccion que no ha pedido, y en una pagina que se abre sola en un
      // movil eso es un disgusto con sonido.
      //
      // El <video> sin controles no es pulsable por si mismo —no tiene nada que
      // pulsar— asi que sin este manejador no hay ningun camino a play() que no
      // pase por un clic en el boton.

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
      //
      // Antes solo habia mousedown / mousemove / mouseup, y el dedo no pasaba por
      // ahi. En un movil eso significa que el navegador se queda con el gesto para
      // desplazar la pagina y el clip no se mueve: se deslizaba el dedo y lo que
      // bajaba era la pagina, no el video. Medido en un navegador con dedo.
      //
      // Ahora son Pointer Events, que son un solo camino para raton, dedo y lapiz.
      // Lo que hace que el dedo llegue hasta aqui es el `touch-action: none` de la
      // pista, en el CSS: sin eso el navegador se reserva el gesto antes de que
      // llegue a ningun manejador, y por muchos eventos que se escuchen.
      //
      // `setPointerCapture` deja el gesto dentro de la pista aunque el dedo se salga
      // de ella al arrastrar, que es lo que hace cualquier control de desplazamiento.
      // Antes hacia falta un listener en `window` para eso.
      function saltar(evt) {
        var r = pista.getBoundingClientRect();
        var x = evt.clientX - r.left;
        var pct = Math.max(0, Math.min(1, x / r.width));
        if (video.duration) video.currentTime = pct * video.duration;
        pintar();
      }
      pista.addEventListener("pointerdown", function (ev) {
        // Con el raton, el boton 0 es el izquierdo. Con el dedo no hay botones y
        // `button` sale 0, asi que el filtro solo puedebearlo cuando es raton.
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        arrastrando = true;
        try { pista.setPointerCapture(ev.pointerId); } catch (e) { /* sin capturacion */ }
        ev.preventDefault();
        saltar(ev);
      });
      pista.addEventListener("pointermove", function (ev) {
        if (arrastrando) saltar(ev);
      });
      pista.addEventListener("pointerup", function () { arrastrando = false; });
      // El dedo puede ser cancelado por el sistema —una llamada entrante, un
      // aviso del navegador— y sin esto el arrastre se queda activo para siempre
      // y el siguiente movimiento del rato mueve el clip sin haber pulsado nada.
      pista.addEventListener("pointercancel", function () { arrastrando = false; });

      // El `click` de antes se queda solo para el teclado. Con el raton o el dedo ya
      // se salta en el pointerdown, y si se escuchase tambien el click cada pulsacion
      // saltaria dos veces. Un click hecho con el teclado tiene detail 0; uno hecho
      // con el raton o el dedo, detail 1 o mas.
      pista.addEventListener("click", function (ev) {
        if (ev.detail === 0) saltar(ev);
      });

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

      // Teclado sobre el video: espacio/k para alternar, m para silenciar, flechas para saltar 5s.
      video.setAttribute("tabindex", "0");
      video.addEventListener("keydown", function (ev) {
        if (ev.key === " " || ev.key === "k" || ev.key === "K") {
          ev.preventDefault();
          alternar();
        } else if (ev.key === "m" || ev.key === "M") {
          ev.preventDefault();
          btnMute.click();
        } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
          if (!video.duration) return;
          ev.preventDefault();
          var salta = ev.key === "ArrowRight" ? 5 : -5;
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + salta));
          pintar();
        }
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
      // ".comando code" y no ".instalar-cmd code": en la portada la caja lleva las
      // dos clases, y en el manual solo ".comando". Con el selector antigo, pinchar
      // en el texto del comando del manual no copiaba nada —el boton si, porque va
      // por su propia clase— y el texto no tenia ni cursor de puntero que dijera
      // que se podia pinchar.
      var cod = !b && ev.target.closest && ev.target.closest(".comando code");
      if (!b && !cod) return;
      // La caja donde vive el aviso del "copied". Con `b ? b` —el boton— era el
      // propio boton, y un boton no tiene un .copiar DENTRO: `querySelector` no
      // encontraba nada y la funcion se iba sin avisar. Medido: al pinchar el texto
      // del comando salia "copied", y al pinchar el boton se copiaba bien pero no
      // se veia nada. Ahora se busca la caja en los dos casos.
      //
      // Esto hacia falta antes y no se notaba, porque el boton no hacia nada que
      // alguien echara de menos. Pero el boton es la unica pista de que el comando
      // se puede copiar, y sin su aviso el que pulsa el boton no sabe si ha
      // funcionado. Con el texto pasa igual: tambien es un <code> y tampoco tiene
      // un .copiar dentro.
      var caja = (b || cod).closest(".comando");
      // El texto del code es el comando entero y solo el. El "$" va en un pseudo
      // —en la portada en la caja y aqui en el propio code—, y un pseudo no entra
      // en textContent, asi que esto sale limpio en las dos paginas. Si algún dia
      // se pasara el "$" a texto de verdad, habria que recortarlo aqui.
      var txt = b ? (b.getAttribute("data-copiar") || "")
                  : (cod.textContent || "").replace(/\s+/g, " ").trim();
      var listo = function () {
        var aviso = caja.querySelector(".copiar");
        if (!aviso) return;
        var antes = aviso.textContent;
        var tCopiado = (window.traducir && window.traducir("copied")) || "copied";
        if (tCopiado === "copied") {
          var idm = document.documentElement.getAttribute("data-idioma") || document.documentElement.getAttribute("lang");
          if (idm === "es") tCopiado = "copiado";
          else if (idm === "ca") tCopiado = "copiat";
          else if (idm === "fr") tCopiado = "copié";
          else if (idm === "it") tCopiado = "copiato";
          else if (idm === "pt") tCopiado = "copiado";
        }
        aviso.textContent = tCopiado;
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
  // ── El tema: automatico, claro y negro ────────────────────────────────────
  //
  // Tres modos en vez de dos. El tercero es "automatico", que es el que se usa
  // por defecto y el que no habia: sigue lo que diga el dispositivo con
  // prefers-color-scheme. Antes solo se podia elegir claro o negro, y quien
  // lleva el sistema en claro se encontraba con una pagina oscura sin haber
  // pedido nada.
  //
  // Se guarda en localStorage, que funciona tambien desde file://. Lo aplica una
  // clase en <html>, de la que cuelgan tanto las capas como los colores, para que
  // cambien las dos cosas a la vez.
  var CLAVE = "rhythm-crea-tema";
  var MODOS = ["auto", "claro", "negro"];
  var ETIQUETAS = {
    auto: "Matches your device",
    claro: "Light",
    negro: "Dark"
  };

  function modoGuardado() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }

  // "auto" si no hay eleccion guardada o si lo que hay no es uno de los tres.
  // Un valor viejo o escrito a mano no puede dejar la pagina sin tema.
  function modoActual() {
    var g = modoGuardado();
    return MODOS.indexOf(g) > -1 ? g : "auto";
  }

  function elDispositivoPideClaro() {
    return !!(window.matchMedia &&
              matchMedia("(prefers-color-scheme: light)").matches);
  }

  function aplicarTema(modo) {
    var claro = modo === "claro" || (modo === "auto" && elDispositivoPideClaro());
    document.documentElement.classList.toggle("claro", claro);
    // El modo va en <html> y no solo en la clase, porque el icono del boton
    // depende de los TRES modos y con dos clases no hay forma de distinguir
    // "automatico en oscuro" de "negro elegido a mano": se ven igual pero se
    // comportan distinto cuando el sistema cambia de tema.
    document.documentElement.setAttribute("data-tema", modo);

    var b = $("#interruptor");
    if (b) {
      // Los dos rotulos de este boton pasan por el traductor porque se componen de
      // trozos y el traductor no puede rehacerlos: "Theme" + ": " + el modo + ". "
      // + "Change it." no existe como frase en ninguna parte de la pagina.
      //
      // Ojo con lo que decia antes este comentario, que era falso: NO es el reloj
      // quien lo repinta cada segundo. `tic()` solo pone la hora, y esta funcion
      // se llama una vez, al arrancar. Por eso, cuando el diccionario llega mas
      // tarde —que es lo que pasa ahora que se carga bajo demanda— hay que
      // volver a llamarla desde el evento `idioma`. Abajo, donde se hace.
      //
      // Y no se traduce el rotulo ENTERO, porque se compone de tres trozos y hay
      // nueve combinaciones: tres modos por los tres que puede ser el siguiente. Si
      // el diccionario tuviera las nueve, cualquier cambio en un rotulo obligaria a
      // acordarse de las otras ocho.
      //
      // Se traducen los trozos y luego se juntan. El texto va en `setAttribute`, no
      // en `innerHTML`, asi que aqui no valen las entidades: van los caracteres.
      var T = window.traducir || function (x) { return x; };
      b.setAttribute("aria-label",
        T("Theme") + ": " + T(ETIQUETAS[modo]) + ". " + T("Change it."));
      b.setAttribute("aria-pressed", String(modo === "claro"));
      // El title dice cual es el siguiente, no cual es el actual: el icono ya
      // enseña el actual, y lo que hace falta saber antes de pinchar es a donde
      // vas a ir.
      var sig = MODOS[(MODOS.indexOf(modo) + 1) % MODOS.length];
      b.title = T("Theme") + ": " + T(ETIQUETAS[modo]) + " \u2014 " +
        T("tap for") + " " + T(ETIQUETAS[sig]).toLowerCase();
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

  // Cambiar de tema CON la transicion. Es lo que se llama desde el boton y desde
  // el aviso del sistema, en los dos sentidos: de oscuro a claro y de claro a
  // oscuro, que la raja es la misma se vaya o se venga.
  //
  // Como lo hace omarchy-site: se congela la pagina en una foto, se cambia la clase
  // por debajo y la foto vieja se abre con la raja. Todo lo que cambia el tema —
  // la clase, el data-tema, los rotulos, el theme-color del movil y el aviso al
  // canvas— esta dentro de aplicarTema(), asi que la foto nueva sale completa.
  //
  // Sin View Transitions en el navegador, o con movimiento reducido, es un cambio
  // instantaneo como el de antes: mejor eso que una raja a medias o un error.
  var cambiando = false;

  function cambiarTema(modo, guardar) {
    var cambia = function () {
      aplicarTema(modo);
      if (guardar) {
        try { localStorage.setItem(CLAVE, modo); } catch (e) { /* sin storage */ }
      }
    };
    var reduc = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (cambiando || !document.startViewTransition || reduc) { cambia(); return; }
    cambiando = true;
    // Sin transiciones propias durante el cambio: ver la nota en style.css.
    document.documentElement.classList.add("sin-transicion");
    var quita = function () {
      document.documentElement.classList.remove("sin-transicion");
      cambiando = false;
    };
    try {
      var v = document.startViewTransition(function () { cambia(); });
      if (v && v.finished && v.finished.then) v.finished.then(quita, quita);
      else quita();
    } catch (e) {
      cambia();
      quita();
    }
  }

  function interruptor() {
    var b = $("#interruptor");
    if (!b) return;
    var modo = modoActual();
    aplicarTema(modo);

    b.addEventListener("click", function () {
      modo = MODOS[(MODOS.indexOf(modo) + 1) % MODOS.length];
      cambiarTema(modo, true);
    });

    // En "automatico" hay que ENTERSE de que el sistema cambia de tema, no solo
    // de lo que decia al abrir la pagina. Sin esto, quien tiene el movil en
    // claro de noche se queda con la pagina en claro hasta que recarga.
    if (window.matchMedia) {
      var avisa = function () {
        if (modoActual() === "auto") cambiarTema("auto", false);
      };
      var mq = matchMedia("(prefers-color-scheme: light)");
      if (mq.addEventListener) mq.addEventListener("change", avisa);
      else if (mq.addListener) mq.addListener(avisa);   // Safari viejo
    }
  }

  // Aqui ya no hay datos de la maquina en la pagina. No se quitaron solo de la
  // vista: la columna de "The data" que los teacha no existe ya, asi que seguir
  // recogiendolos cada cinco minutos era guardar la huella digital de la maquina
  // para no enseñarla. Ni el kernel con su version exacta, ni las horas de uptime,
  // ni la carga, ni el disco, ni los servicios.
  //
  // Si algun dia vuelven a hacer falta, la lista de lo que se puede enseñar estaba
  // aqui (FICHA: kernel, uptime, load, disk, services). El script que lo recogia
  // del sistema se fue con el resto: leerlo de la maquina del autor obligaba a que
  // esa maquina existiera para siempre, y una pagina web no es eso.

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
    var vistos = {}, conteoUnico = 0;
    lista.forEach(function (a) {
      var clave = (a.grupo + "|" + a.tecla.toLowerCase() + "|" + (a.nota || a.que)).trim();
      if (vistos[clave]) return;
      vistos[clave] = true;
      conteoUnico++;
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
      '<p class="nota-dato">' + conteoUnico + " keybindings, parsed from " +
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
    var entrada = "<p>The repository is mostly a pile of scripts with nothing to " +
      "compile, which is why installing it takes one command and not a build " +
      "system. Almost all of it lands in <code>~/.local/bin</code>, which is " +
      "already on your PATH, so a script is installed by being copied and made " +
      "executable.</p>" +
      "<p>The files that are <em>not</em> yours are the ones under " +
      "<code>/etc</code> and <code>/usr</code>: the login screen has to be " +
      "written as root, so those go in a directory under <code>sddm/</code> and " +
      "a deploy script copies them into place. Editing them by hand works until " +
      "the next update, which puts them back.</p>";
    var filas = [
      ["~/.local/bin", a.scripts, "every helper script, all on PATH"],
      [".config/hypr", a.conf, "the compositor config"],
      [".config/systemd/user", a.servicios, "services started at login"],
      [".config/systemd/user", a.temporizadores, "timers: OTA checks, collectors"],
      [".config/quickshell", a.quickshell, "the island, in QML"],
      ["sddm/", a.sddm, "the login screen, installed to /usr and /etc"]
    ].filter(function (f) { return f[1]; });
    return entrada + '<div class="arbol">' + filas.map(function (f) {
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
    return '<p class="destacado">The status bar at the top of the screen. Powered by Waybar, styled to match the active Pywal wallpaper palette automatically.</p>' +
      '<div class="filas">' +
      fila("Workspaces & windows", "Shows your active workspaces, workspace indicators, and the title of the focused window.") +
      fila("System monitors", "Real-time indicators for CPU, memory, temperatures, battery status, network connection, and audio volume.") +
      fila("Dynamic theming", "Reloads colors automatically on wallpaper change without restarting the compositor.") +
      fila("Tray and clock", "System tray icons for background services and a clean clock with date and calendar popover.") +
      "</div>" +
      "<h4>Configuration</h4>" +
      "<p>Everything lives in <code>~/.config/waybar/config.jsonc</code> and <code>~/.config/waybar/style.css</code>. Custom module scripts reside in <code>scripts/waybar/</code> and can be tweaked without breaking the base layout.</p>";
  }

  // ── Desde un movil ──────────────────────────────────────────────────────────
  //
  // Esta seccion casi toda son cosas que NO funcionan, y esa es la razon de que
  // este. Hyprland es un compositor de Wayland que necesita una GPU, asi que no
  // corre en Android ni en iOS y ningun sitio de este repo finge que si.
  //
  // Comprobado en la maquina el 2026-10-03, no de memoria:
  //
  //   si      ssh, cliphist.service, grim, slurp
  //   no      wtype, wlrctl, ydotool, syncthing, kdeconnect
  //
  function seccionDistros() {
    var distrosData = [
      {
        nombre: "CachyOS",
        tipo: "Arch-based (Bore / Linux-cachyos kernel)",
        pkg: "pacman / paru",
        img: "assets/manual/distro_cachyos.webp",
        w: 1280, h: 720,
        desc: "High-performance Arch derivative with optimized x86-64-v3/v4 binaries. Full hardware acceleration, dynamic Pywal color integration, and native compositor support out of the box."
      },
      {
        nombre: "Debian",
        tipo: "Debian 13 (Trixie) & 12 (Bookworm)",
        pkg: "apt",
        img: "assets/manual/distro_debian.webp",
        w: 1280, h: 720,
        desc: "Stable and testing releases supported. Includes targeted QML6 declarative dependencies, PAM configuration, custom Astronaut SDDM session handoff, and Wayland compositor integration."
      },
      {
        nombre: "Fedora",
        tipo: "Fedora 40 & 41 (Workstation / Server)",
        pkg: "dnf",
        img: "assets/manual/distro_fedora.webp",
        w: 1280, h: 720,
        desc: "Modern Red Hat base with PipeWire audio, systemd user services, and SELinux-aware wrappers. Waybar, Quickshell, and full font stack installed and themed automatically."
      },
      {
        nombre: "NixOS",
        tipo: "NixOS 24.05 & Unstable",
        pkg: "nix / flake",
        img: "assets/manual/distro_nixos.webp",
        w: 1280, h: 720,
        desc: "Declarative and reproducible installation. Integrates rust-dock placement, standalone quickshell components, Pywal color generation, and complete Wayland environment."
      },
      {
        nombre: "openSUSE",
        tipo: "Tumbleweed, Slowroll & Leap",
        pkg: "zypper",
        img: "assets/manual/distro_opensuse.webp",
        w: 1280, h: 720,
        desc: "Rolling and stable openSUSE branches. Resolves pywal color scheme transitions, colors-rofi-dark integration, SUPER+Shift+W wallpaper toggles, and Waybar monitoring."
      },
      {
        nombre: "Ubuntu",
        tipo: "Ubuntu 24.04 LTS & 24.10",
        pkg: "apt",
        img: "assets/manual/distro_ubuntu.webp",
        w: 1280, h: 720,
        desc: "Canonical LTS platform support. Handles Wayland compositor dependencies, audio/brightness keybindings, SDDM login screen setup, and cliphist clipboard daemon."
      }
    ];

    var tarjetas = distrosData.map(function (d) {
      return '<div class="tarjeta-distro">' +
        '<div class="distro-visual">' +
        '<a href="' + esc(d.img) + '" target="_blank" rel="noopener" title="View ' + esc(d.nombre) + ' screenshot">' +
        '<img src="' + esc(d.img) + '" alt="Hyprland running on ' + esc(d.nombre) + '" width="' + d.w + '" height="' + d.h + '" loading="lazy" decoding="async">' +
        '</a>' +
        '</div>' +
        '<div class="distro-info">' +
        '<div class="distro-cabecera">' +
        '<h4 class="distro-titulo">' + esc(d.nombre) + '</h4>' +
        '<span class="chip">' + esc(d.pkg) + '</span>' +
        '</div>' +
        '<span class="distro-tipo">' + esc(d.tipo) + '</span>' +
        '<p class="distro-desc">' + esc(d.desc) + '</p>' +
        '</div>' +
        '</div>';
    }).join("");

    return '<p class="destacado">Real installations tested and verified across every supported Linux distribution. The installer detects your package manager and kernel environment automatically.</p>' +
      '<div class="rejilla-distros">' + tarjetas + '</div>' +
      '<p class="nota-dato">6 distribution families captured and validated with live testing builds.</p>';
  }

  function seccionFuturo() {
    var hitos = [
      {
        estado: "completado",
        fase: "Milestone 1",
        tag: "Completed",
        titulo: "Cross-distro installer engine",
        desc: "Automated distribution detection and package provisioning across Arch, CachyOS, NixOS, openSUSE, Fedora, Debian, Ubuntu, and Alpine Linux.",
        tech: ["Multi-distro", "install.sh", "8 families"]
      },
      {
        estado: "completado",
        fase: "Milestone 2",
        tag: "Completed",
        titulo: "Dynamic Pywal harmony",
        desc: "Color palette extracted on the fly from active wallpapers and synchronized across Waybar, Quickshell, Kitty, Rofi, and GTK without restarting compositor sessions.",
        tech: ["Pywal", "Hot reload", "Palette sync"]
      },
      {
        estado: "completado",
        fase: "Milestone 3",
        tag: "Completed",
        titulo: "Quickshell dynamic island",
        desc: "Collapsible top island with integrated media controls, WiFi/Bluetooth selectors, audio output routing, backlight adjustments, and power profiles.",
        tech: ["Quickshell", "QML", "Dynamic island"]
      },
      {
        estado: "completado",
        fase: "Milestone 4",
        tag: "Completed",
        titulo: "SDDM Astronaut login theme",
        desc: "Custom display manager greeter with coordinated wallpaper backdrops, Wayland session registration, and multi-distro PAM integration.",
        tech: ["SDDM", "Astronaut", "PAM"]
      },
      {
        estado: "completado",
        fase: "Milestone 5",
        tag: "Completed",
        titulo: "Diagnostic doctor & safe overlays",
        desc: "Automated system inspector checking Wayland sockets, required binaries, and user units, combined with non-destructive overlays (user.lua, user.conf).",
        tech: ["rhythm-doctor", "user.lua", "Overlays"]
      },
      {
        estado: "actual",
        fase: "Milestone 6",
        tag: "Current status",
        titulo: "Release v0.25 & multi-distro verification",
        desc: "Current verified milestone. Fully tested across all 6 active distribution families with live testing builds, instant scroll restoration, and comprehensive manual docs.",
        tech: ["Release v0.25", "Current stable", "Verified builds"]
      },
      {
        estado: "futuro",
        fase: "Milestone 7",
        tag: "Planned",
        titulo: "Replace Waybar with Quickshell",
        desc: "Migrate the status bar entirely to Quickshell in native QML, merging the top island and bar into a single reactive, unified framework.",
        tech: ["Quickshell", "Native QML", "Unified bar & island"]
      },
      {
        estado: "futuro",
        fase: "Milestone 8",
        tag: "Planned",
        titulo: "Full tablet & touchscreen support",
        desc: "Complete touch and tablet experience: touch gestures, on-screen keyboard (wvkbd), auto-rotation sensor integration (iio-sensor-proxy), and 44px touch targets.",
        tech: ["Tablets", "wvkbd", "Auto-rotate", "Touch gestures"]
      },
      {
        estado: "futuro",
        fase: "Milestone 9",
        tag: "Planned",
        titulo: "Niri window manager support",
        desc: "Native integration for the Niri scrollable-tiling Wayland compositor alongside Hyprland, sharing the same Pywal palette, Quickshell island, and configs.",
        tech: ["Niri", "Scrollable tiling", "Wayland compositor"]
      },
      {
        estado: "futuro",
        fase: "Milestone 10",
        tag: "Planned",
        titulo: "Complete standalone Live ISO",
        desc: "Full standalone bootable Live ISO ready to download, test in live session, and install out-of-the-box without requiring a pre-existing Linux install.",
        tech: ["Live ISO", "Bootable image", "Offline installer"]
      }
    ];

    var htmlHitos = hitos.map(function (h, i) {
      var dotContent = "";
      if (h.estado === "completado") {
        dotContent = '<svg class="ico-dot-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" fill="currentColor"/></svg>';
      } else if (h.estado === "actual") {
        dotContent = '<span class="pulso-radar" aria-hidden="true"></span><span class="dot-nucleo" aria-hidden="true"></span>';
      } else {
        dotContent = '<span class="dot-num" aria-hidden="true">' + (i + 1) + '</span>';
      }

      var chipsHtml = h.tech.map(function (t) {
        return '<span class="chip">' + esc(t) + '</span>';
      }).join("");

      return '<article class="hito-roadmap hito-' + h.estado + '" data-estado="' + h.estado + '">' +
        '<div class="hito-dot-col">' +
        '<div class="hito-dot">' + dotContent + '</div>' +
        '</div>' +
        '<div class="hito-cuerpo">' +
        '<div class="hito-meta">' +
        '<span class="hito-tag hito-tag-' + h.estado + '">' + esc(h.tag) + '</span>' +
        '<span class="hito-fase">' + esc(h.fase) + '</span>' +
        '</div>' +
        '<h4 class="hito-titulo">' + esc(h.titulo) + '</h4>' +
        '<p class="hito-desc">' + esc(h.desc) + '</p>' +
        '<div class="hito-chips">' + chipsHtml + '</div>' +
        '</div>' +
        '</article>';
    }).join("");

    return '<p class="destacado">An interactive timeline tracking shipped capabilities, our current active status, and planned developments for upcoming releases.</p>' +
      '<div class="mapa-roadmap" id="mapa-roadmap">' +
      '<div class="timeline-riel" aria-hidden="true">' +
      '<div class="timeline-linea-progreso" id="timeline-linea-progreso"></div>' +
      '</div>' +
      '<div class="hitos-lista">' + htmlHitos + '</div>' +
      '</div>' +
      '<p class="nota-dato">Scroll through the roadmap to trace completed milestones up to the current release and into future planned features.</p>';
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

    // Lo que anade la seccion encima de las piezas: el dato generado —los
    // atajos, la tabla de componentes— o un texto escrito aqui.
    //
    // NO se devuelve aqui con un return temprano. Antes se hacia, y por eso la
    // seccion de "what's installed" se comia su propio texto: tenia pieza
    // asignada y el return la impedia llegar a ella. Las dos cosas se pintan,
    // piezas primero y luego esto.
    var propias = {
      atajos: atajos,
      instalado: componentes,
      distros: seccionDistros,
      actualizar: seccionActualizar,
      arbol: arbol,
      problemas: seccionProblemas,
      barra: seccionBarra,
      futuro: seccionFuturo
    };

    // Y las que salen de una pieza de hyprland.js. Puede haber mas de una: la
    // seccion del tema es el tema y la paleta, y con una sola se perdia una de
    // las dos. Se pintan en el orden en que estan en la lista.
    var ids = sub.pieza
      ? (Array.isArray(sub.pieza) ? sub.pieza : [sub.pieza])
      : [];
    var out = "";
    ids.forEach(function (id, i) {
      var p = piezaPorId(id);
      if (!p) {
        out += '<p class="sin-datos">This section points at <code>' + esc(id) +
          "</code>, which is not in the data.</p>";
        return;
      }
      // La segunda pieza y siguientes llevan su propio subtitulo, porque si no
      // sus frases se pegan a las de la primera y se leen como una sola lista
      // con el resumen en medio.
      if (i > 0) out += "<h4>" + esc(p.titulo) + "</h4>";
      if (p.resumen) out += '<p class="destacado">' + esc(p.resumen) + "</p>";
      if (p.filas && p.filas.length) {
        out += '<ul class="prosa">' + p.filas.map(function (f) {
          return "<li>" + esc(f) + "</li>";
        }).join("") + "</ul>";
      }
      if (p.tipo === "comando") out += comando(p);
      // La salida real del doctor. Va commiteada con la pieza en vez de leerse
      // de la maquina del autor: si se leyera de ahi, en la web el bloque saldria
      // vacio y el texto de arriba diria "esta es su salida de verdad" sin
      // ninguna salida debajo.
      if (p.tipo === "terminal" && p.salida) out += salidaTerminal(p.salida);
    });
    // Y por ultimo lo de la seccion: las banderas del instalador, que salen
    // del --help y no de este fichero.
    if (sub.id === "empezar") out += "<h4>Every flag</h4>" + banderas();
    if (propias[sub.id]) out += propias[sub.id]();
    return foto + out;
  }

  // La salida de un comando, como bloque de texto pegado.
  //
  // Se marca cada linea que empieza por "ok" con una clase, y no se pintan los
  // codigos de color ANSI del terminal: en una pagina web son texto invisible y
  // rompen el ancho de la linea. El prefijo "ok" lo escribe el propio doctor, no
  // lo pone este codigo, asi que si manana el doctor deja de usarlo lo que sale
  // es un bloque gris sin verde, que es feo pero no mentira.
  function salidaTerminal(texto) {
    var lineas = String(texto).split("\n");
    return '<pre class="salida">' + lineas.map(function (l) {
      var esOk = /^\s*ok\s/.test(l);
      return '<span class="' + (esOk ? "linea-ok" : "linea") + '">' +
        (esc(l) || "&nbsp;") + "</span>";
    }).join("") + "</pre>";
  }

  // ── El indice ──────────────────────────────────────────────────────────────
  //
  // Dos niveles y numeracion continua, como el de omarchy. El numero va en el
  // mismo sitio que el enlace, no en una columna aparte, para que al copiar el
  // enlace a otra persona se lea "4. The island" y no un numero suelto.
  function pintarIndice() {
    var caja = $("#indice");
    if (!caja || caja.children.length) return;
    var D = window.RHYTHM_DOCS || null;

    // Antes al lado de "Hotkeys" salia "10 groups", el numero de grupos de atajos
    // que hay debajo. Quitado: el indice es para saltar a un capitulo, y un dato
    // sobre lo que hay DENTRO del capitulo no ayuda a elegir. Ademas el numero
    // cambia solo cada vez que se re-genera la lista de atajos, con lo que el
    // indice y el capitulo pueden llegar a decir cosas distintas.
    caja.innerHTML = '<h2>On this page</h2>' + PROYECTOS.map(function (proy) {
      var subs = proy.subs.map(function (sub) {
        var entrada = PLANO.filter(function (x) { return x.proy === proy && x.sub === sub; })[0];
        return '<li><a href="#' + esc(idDe(proy, sub)) + '">' +
          '<i class="n">' + (entrada ? entrada.n : "?") + "</i>" +
          "<b>" + esc(sub.t) + "</b></a></li>";
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
    if (!caja.children.length) {
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
          // PLANO va de 0 y la entrada n va de 1, asi que el siguiente es
          // PLANO[entrada.n] y el anterior es PLANO[entrada.n - 2]. Con el -2
          // al principio: la entrada numero 1 no tiene anterior y sale undefined,
          // que es justo lo que hace falta para no pintarlo.
          var siguiente = entrada ? PLANO[entrada.n] : null;
          var anterior = entrada ? PLANO[entrada.n - 2] : null;
          var chips = (piezaPorId(sub.pieza) || {}).chips || [];

          return '<section class="seccion-manual" id="' + esc(idDe(proy, sub)) + '">' +
            '<div class="cabecera-seccion">' +
            '<span class="seccion-n">' + (entrada ? entrada.n : "") + "</span>" +
            '<h2><a class="manual-titulo-link" href="#' + esc(idDe(proy, sub)) + '">' + esc(sub.t) + '<span class="manual-hash" aria-hidden="true">#</span></a></h2>' +
            (chips.length
              ? '<span class="chips">' + chips.map(function (c) {
                  return '<span class="chip">' + esc(c) + "</span>";
                }).join("") + "</span>"
              : "") +
            "</div>" + cuerpoSeccion(proy, sub) +
            // Abajo van los dos: antes solo el siguiente, con lo que en movil no
            // habia manera de volver atras sin tirar del indice. Y en la ultima
            // seccion, en vez de eso, un vuelta arriba —que es lo que se quiere
            // pulsar al terminar, no un enlace a la portada.
            (anterior || siguiente
              ? '<div class="siguientes">' +
                (anterior
                  ? '<a class="siguiente anterior" href="#' + esc(anterior.id) + '">' +
                    '<i aria-hidden="true"></i><span>Previous</span>' +
                    esc(anterior.sub.t) + "</a>"
                  : "") +
                (siguiente
                  ? '<a class="siguiente" href="#' + esc(siguiente.id) + '">' +
                    "<span>Next</span>" + esc(siguiente.sub.t) +
                    '<i aria-hidden="true"></i></a>'
                  : '<a class="siguiente anterior arriba" href="#contenido">' +
                    '<i aria-hidden="true"></i><span>End of the manual</span>' +
                    "Back to the top</a>") +
                "</div>"
              : "") +
            "</section>";
        }).join("");

        var cabecera = PROYECTOS.length > 1
          ? ('<div class="cabecera-proyecto">' +
             '<h2><a class="manual-titulo-link" href="#proy-' + esc(proy.id) + '">' + esc(proy.titulo) + '<span class="manual-hash" aria-hidden="true">#</span></a></h2>' +
             '<p>' + esc(proy.resumen || "") + "</p>" +
             (proy.repo
               ? '<a href="https://github.com/' + esc(proy.repo) +
                 '" target="_blank" rel="noopener">' + esc(proy.repo) + "</a>"
               : "") +
             "</div>")
          : "";

        return '<div class="bloque-proyecto" id="proy-' + esc(proy.id) + '">' +
          cabecera + cuerpo + "</div>";
      }).join("");

      caja.innerHTML = portada + secciones;
      pintarIndice();
    }

    // El indice antes que nada: necesita el DOM ya pintado para poder medir, y
    // se pinta desde PLANO, no desde las secciones, asi que el orden entre estas
    // dos llamadas solo importa para que marcarIndice() encuentre los enlaces.
    pintarIndice();
    altoBarra();
    indicePanel();
    montarBuscador();
    marcarIndice();
    animarRoadmap();

    var enScroll = function () {
      marcarIndice();
      animarRoadmap();
    };

    addEventListener("scroll", enScroll, { passive: true });
    addEventListener("resize", enScroll, { passive: true });
  }

  function animarRoadmap() {
    var mapa = $("#mapa-roadmap");
    if (!mapa) return;
    var riel = $("#timeline-linea-progreso");
    var hitos = $$("#mapa-roadmap .hito-roadmap");
    if (!hitos.length) return;

    var rect = mapa.getBoundingClientRect();
    var viewH = window.innerHeight;
    var puntoLectura = viewH * 0.65;
    var distancia = puntoLectura - rect.top;
    var pct = Math.max(0, Math.min(100, (distancia / rect.height) * 100));

    if (riel) {
      riel.style.height = pct.toFixed(1) + "%";
    }

    hitos.forEach(function (h) {
      var hRect = h.getBoundingClientRect();
      var hitoCentro = hRect.top + (hRect.height * 0.35);
      if (hitoCentro <= puntoLectura) {
        h.classList.add("alcanzado");
      } else {
        h.classList.remove("alcanzado");
      }
    });
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
    busca.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && busca.value) {
        e.preventDefault();
        busca.value = "";
        marcar();
      }
    });
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
    var activoEl = null;
    enlaces.forEach(function (a) {
      var activo = a.getAttribute("href") === "#" + actual;
      a.classList.toggle("activo", activo);
      if (activo) { a.setAttribute("aria-current", "true"); activoEl = a; }
      else a.removeAttribute("aria-current");
    });
    sigueAlActivo(activoEl);
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

    // Como en omarchy, no se cambia el hash de la URL al hacer scroll:
    // cambiar location.hash mientras se lee ensucia la direccion y hace que
    // una recarga salte a la cabecera de la seccion en vez de restaurar la
    // linea exacta donde se habia quedado el lector.
  }

  // Lleva el enlace activo de la tira a la vista, sin mover la pagina.
  //
  // Se mide a mano en vez de usar scrollIntoView porque scrollIntoView tambien
  // desplaza la pagina entera, y al marcar la seccion While you scroll eso
  // haria que la pagina saltase cada vez que el indice se actualiza. Con esto
  // solo se mueve la tira, y solo si el enlaceactivo esta fuera de su hueco.
  function sigueAlActivo(el) {
    if (!el) return;
    var tira = el.closest(".indice ol") || el.closest(".subs") || el.closest(".indice");
    if (!tira || tira.scrollWidth <= tira.clientWidth + 2) return;
    var a = el.getBoundingClientRect(), t = tira.getBoundingClientRect();
    if (a.left < t.left + 16) {
      tira.scrollLeft += (a.left - t.left - 16);
    } else if (a.right > t.right - 16) {
      tira.scrollLeft += (a.right - t.right + 16);
    }
  }

  // La altura de la barra, en una variable de CSS.
  //
  // El menu que baja desde arriba tiene que apoyarse JUSTO debajo de la barra, y
  // esa altura no es un numero: medido, en un movil de 390 px son 65 px, no los
  // 44 del objetivo tactil, porque la barra lleva el relleno del safe-area y el
  // borde de la isla por encima. Escribi 65 a mano y a la semana siguiente, con
  // otro movil, el menu se comia media barra.
  //
  // Asi que se mide. Un ResizeObserver y ya esta: cuando la barra cambia de alto
  // —que pasa al girar el movil, o al pasar de dedo a raton— la variable se
  // actualiza sola y el menu baja con ella.
  function altoBarra() {
    var barra = $(".barra-z");
    if (!barra) return;
    var fijar = function () {
      var alto = Math.round(barra.getBoundingClientRect().height);
      if (alto > 0) document.documentElement.style.setProperty("--alto-barra", alto + "px");
    };
    if ("ResizeObserver" in window) new ResizeObserver(fijar).observe(barra);
    addEventListener("resize", fijar, { passive: true });
    fijar();
  }

  // El panel de contenido de movil.
  //
  // Se abre con el boton de la barra y se cierra solo: al elegir una seccion, con
  // Escape, o al volver arriba. Un menu que hay que cerrar a mano encima de un
  // menu que tapa la pantalla es el peor de los dos.
  // El boton de las tres rayas hace dos cosas segun el ancho, y son distintas.
  //
  // POR QUE DOS
  //
  // En movil el indice es una tira horizontal de dos mil pixeles metida en tres
  //cientos: no cabe y no hay forma de saber donde estas. El boton abre el indice
  // entero encima del texto y se cierra solo al tocar un enlace o al bajar.
  //
  // En escritorio el indice ya es una columna fija al lado, y ahi lo que hace
  // falta no es abrirlo sino QUITARLO: la columna son 15 rem que se le quitan al
  // texto, y hay pantallas de 1024 donde el parrafo sale mas corto que en un
  // movil. Con el boton la columna se pliega y el texto usa todo el ancho, y se
  // vuelve a poner a un clic.
  //
  // El corte es el mismo de siempre, 860 px, que es donde el indice deja de ser
  // columna y pasa a ser tira.
  function indicePanel() {
    var boton = $("#contenidos");
    var panel = $("#indice");
    if (!boton || !panel) return;

    // El ancho decide que hace. Se pregunta cada vez que se pulsa y no solo al
    // arrancar, porque una ventana se puede arrastrar de 1200 a 700 sin que se
    // recargue nada, y el boton tiene que cambiar de comportamiento en el momento.
    var estrecho = function () { return innerWidth <= 860; };
    var plegado = false;   // en escritorio: columna recogida o no
    var abierto = false;   // en movil: menu desplegado o no

    // El tiempo que tarda la salida. Tiene que ser el mismo que la transicion del
    // CSS (0.18 s), o el panel se borra a mitad de fundido y se ve un parpadeo.
    var CIERRE_MS = 180;
    var cerrando = null;

    var fijar = function () {
      if (estrecho()) {
        panel.classList.toggle("indice-abierto", abierto);
        document.documentElement.classList.toggle("con-indice", abierto);
        // Bloquea el desplazamiento de la pagina mientras el menu esta abierto.
        document.documentElement.classList.toggle("pagina-quieta", abierto);
        document.documentElement.classList.remove("sin-indice");
      } else {
        // El panel desplegado es una cosa de movil. Si se redimensiona con el
        // menu abierto, la clase se quita, o el menu se queda encima del texto
        // en una pantalla donde no tiene sentido.
        panel.classList.remove("indice-abierto");
        document.documentElement.classList.remove("con-indice");
        document.documentElement.classList.remove("pagina-quieta");
        document.documentElement.classList.toggle("sin-indice", plegado);
      }
      boton.setAttribute("aria-expanded", (estrecho() ? abierto : !plegado) ? "true" : "false");
      boton.setAttribute("aria-label", estrecho() ? "Contents" : "Toggle the contents column");
    };

    // Abrir y cerrar por separado, y no con un `abierto = !abierto`, porque cerrar
    // ya no es instantaneo: hay que dejar el menu en pantalla mientras se va.
    //
    // Durante esos 180 ms `abierto` sigue siendo true a proposito, para que el
    // bloqueo del scroll se quite en el mismo momento que el menu desaparece y no
    // con 180 ms de adelanto, que se lee como un tirón al volver a poder deslizar.
    var abrir = function () {
      if (cerrando) { clearTimeout(cerrando); cerrando = null; }
      panel.classList.remove("indice-cerrando");
      abierto = true;
      fijar();
    };
    var cerrar = function () {
      if (cerrando) return;                    // ya se esta cerrando
      if (!estrecho() || !abierto) { abierto = false; fijar(); return; }
      panel.classList.add("indice-cerrando");
      cerrando = setTimeout(function () {
        cerrando = null;
        abierto = false;
        panel.classList.remove("indice-cerrando");
        fijar();
      }, CIERRE_MS);
    };

    boton.addEventListener("click", function () {
      if (!estrecho()) { plegado = !plegado; fijar(); return; }
      if (abierto || cerrando) cerrar(); else abrir();
    });

    // Al tocar un enlace se cierra, y el panel se va con el scroll que trae el
    // cambio de seccion: si el lector pasa el dedo hacia arriba para seguir
    // leyendo, el menu no le queda encima tapando el texto.
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a") && estrecho()) cerrar();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      // Escape: cierra lo mismo que el boton, y `cerrar` ya esta hecho para eso.
      // Si el menu esta a media salida, `cerrar` no hace nada porque el temporizador
      // que ya corre lo terminara — y no hay que limpiarlo, porque si se limpiara
      // sin ponerlo a null el menu se quedaria a media salida para siempre.
      if (estrecho() && (abierto || cerrando)) { cerrar(); boton.focus(); }
      else if (!estrecho() && plegado) { plegado = false; fijar(); boton.focus(); }
    });
    // El cierre al bajar es SOLO del menu de movil. En escritorio el indice esta
    // pegado al texto y no se va nunca; si se cerrara aqui, cualquier scroll lo
    // desplegaria solo y no habria manera de dejarlo recogido.
    //
    // El menu se cierra con el boton, con Escape y al tocar un enlace. Y ya esta.
    //
    // Antes se cerraba tambien al bajar la pagina, y con el menu abierto la pagina
    // esta bloqueada: poner overflow:hidden al abrir dispara un scroll, que hacia
    // cerrar el menu, que quita el bloqueo, que vuelve a disparar el scroll. Un
    // bucle, medido: se abria y se cerraba solo.
    //
    // Asi que o el menu cierra por scroll o el menu bloquea el scroll, no las dos
    // cosas. Se elige bloquear, porque el otro problema —que las imagenes perezosas
    // carguen y empujen la pagina, y con ella el menu— se arregla asi y no de otra
    // manera: no hay forma de saber si los pixeles que se ha movido la pagina los
    // ha puesto un dedo o el navegador, porque el navegador solo avisa de que se
    // ha movido. Medido: con margen de 24 px y luego de 120, la carga de las
    // imagenes movia la pagina 102 px de golpe y el menu se cerraba igual.
    //
    // El menu lleva overflow-y:auto, asi que las trece secciones se siguen
    // recorriendo con el dedo por dentro. Y en escritorio esto no aplica: el indice
    // esta siempre a la vista y la pagina se desplaza normal.

    // Y al cambiar el ancho se aplica el estado que toque, para que al pasar de
    // movil a escritorio no se quede el menu pegado ni la columna sin recoger.
    addEventListener("resize", function () { fijar(); }, { passive: true });

    fijar();
  }

  // El sello de arriba: que version del repo describe esto y de cuando es.
  function selloDocs() {
    var el = $("#sello-docs");
    if (!el) return;
    var D = window.RHYTHM_DOCS || null;
    if (!D) { el.textContent = ""; return; }
    // "in N projects" solo cuando hay mas de uno. Con uno solo sale
    // "1 projects", que es ingles mal dicho y se ve en la pagina.
    //
    // Todo esto se compone de trozos traducidos, y no como una frase entera, porque
    // lleva un numero dentro. La linea que sale es
    //   "documents v0.24 · 13 sections · collected 12 h ago"
    // y la hora cambia cada minuto, asi que como cadena entera jamas podria estar en
    // un diccionario: habria que escribir una entrada por cada edad posible.
    // Medido: asi se quedaba en ingles con el dictionary lleno.
    var T = window.traducir || function (x) { return x; };
    el.textContent = T("documents") + " " + (D.version || T("the repository")) +
      " · " + PLANO.length + " " + T("sections") +
      (PROYECTOS.length > 1 ? " " + T("in") + " " + PROYECTOS.length + " " + T("projects") : "") +
      " · " + T("collected") + " " + hace(D.recogido);
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
  // Con el HTML pre-renderizado (como omarchy), el navegador ya conoce la altura
  // real del documento en el primer tick de parseo. La restauracion nativa
  // de scroll funciona de forma instantanea sin saltos ni pantallas negras.
  //
  // Guardamos la posicion en sessionStorage y localStorage como respaldo
  // para cuando se abre una pestana nueva o se vuelve despues de cerrar el navegador.
  var paginaId = ((location.pathname || "").split("/").pop() || "index").replace(/\.html$/, "") || "index";
  var CLAVE_POS = "rhythm-scroll-" + paginaId;
  var posGuardada = leerPos();
  var restaurado = false;

  var esRecarga = false;
  try {
    var nav = (performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0]) || null;
    esRecarga = nav ? nav.type === "reload" : ((performance.navigation &&
      performance.navigation.type === 1) ? true : false);
  } catch (e) { esRecarga = false; }

  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch (e) { /* sin history */ }

  function leerPos() {
    try {
      var v = parseInt(sessionStorage.getItem(CLAVE_POS), 10) ||
              parseInt(sessionStorage.getItem(CLAVE_POS + ".html"), 10) ||
              parseInt(sessionStorage.getItem("rhythm-crea-scroll"), 10);
      if (v > 0) return v;
      var local = parseInt(localStorage.getItem(CLAVE_POS), 10) ||
                  parseInt(localStorage.getItem(CLAVE_POS + ".html"), 10) ||
                  parseInt(localStorage.getItem("rhythm-crea-scroll"), 10);
      if (local > 0) return local;
      return 0;
    } catch (e) { return 0; }
  }

  function guardarPos() {
    if (!restaurado) return;
    try {
      var val = String(Math.round(window.scrollY));
      sessionStorage.setItem(CLAVE_POS, val);
      localStorage.setItem(CLAVE_POS, val);
    } catch (e) { /* sin storage */ }
  }

  var ultimoGuardado = 0;
  addEventListener("scroll", function () {
    var ahora = Date.now();
    if (ahora - ultimoGuardado < 100) return;
    ultimoGuardado = ahora;
    guardarPos();
  }, { passive: true });

  addEventListener("beforeunload", function () {
    try {
      var val = String(Math.round(window.scrollY));
      sessionStorage.setItem(CLAVE_POS, val);
      localStorage.setItem(CLAVE_POS, val);
    } catch (e) { /* sin storage */ }
  });
  addEventListener("pagehide", function () {
    try {
      var val = String(Math.round(window.scrollY));
      sessionStorage.setItem(CLAVE_POS, val);
      localStorage.setItem(CLAVE_POS, val);
    } catch (e) { /* sin storage */ }
  });
  addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      try {
        var val = String(Math.round(window.scrollY));
        sessionStorage.setItem(CLAVE_POS, val);
        localStorage.setItem(CLAVE_POS, val);
      } catch (e) { /* sin storage */ }
    }
  });

  // ── Animacion de desplazamiento suave al restaurar ─────────────────────────
  function animarScroll(destino, cb) {
    var inicio = window.scrollY;
    var distancia = Math.abs(destino - inicio);
    if (distancia < 10) {
      window.scrollTo(0, destino);
      if (cb) cb();
      return;
    }

    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollTo(0, destino);
        if (cb) cb();
        return;
      }
    } catch (e) { /* sin matchMedia */ }

    var t0 = performance.now();
    var duracion = Math.min(750, Math.max(450, Math.round(Math.sqrt(distancia) * 15)));

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    var cancelado = false;
    function cancelar() {
      cancelado = true;
      quitar();
    }
    function quitar() {
      window.removeEventListener("wheel", cancelar);
      window.removeEventListener("touchstart", cancelar);
      window.removeEventListener("keydown", cancelar);
    }
    window.addEventListener("wheel", cancelar, { passive: true });
    window.addEventListener("touchstart", cancelar, { passive: true });
    window.addEventListener("keydown", cancelar, { passive: true });

    function paso(ahora) {
      if (cancelado) {
        quitar();
        if (cb) cb();
        return;
      }
      var p = Math.min(1, (ahora - t0) / duracion);
      var y = Math.round(inicio + (destino - inicio) * ease(p));
      window.scrollTo(0, y);
      if (p < 1) {
        requestAnimationFrame(paso);
      } else {
        quitar();
        if (cb) cb();
      }
    }

    requestAnimationFrame(paso);
  }

  // ── Cuando se devuelve la posicion ─────────────────────────────────────────
  function devolverPos() {
    var hashActual = location.hash || "";
    var destino = 0;

    if (hashActual && !esRecarga) {
      var id = decodeURIComponent(hashActual.slice(1));
      var el = document.getElementById(id);
      if (el) {
        var r = el.getBoundingClientRect();
        var alto = document.documentElement.scrollHeight - innerHeight;
        destino = Math.min(Math.round(r.top + window.scrollY), Math.max(0, alto));
      }
    }

    if (!destino && posGuardada > 0) {
      var altoDoc = document.documentElement.scrollHeight - innerHeight;
      if (altoDoc > 0) {
        destino = Math.min(posGuardada, altoDoc);
      }
    }

    if (destino > 20) {
      if (window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
      setTimeout(function () {
        animarScroll(destino, function () {
          restaurado = true;
        });
      }, 70);
    } else {
      restaurado = true;
    }
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
    if (paginaId === "manual" || window.scrollY > 20 || posGuardada > 20 || location.hash) return;

    // Tambien se mira aqui y no solo en el CSS. Es lo que hace omarchy.org: si el
    // sistema pide menos movimiento, la clase NO se pone. Es distinto de anularla
    // por CSS, porque sin la clase el resto de la pagina ni se entera de que habia
    // una entrada que cancelar.
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch (e) { /* sin matchMedia: se anima */ }

    // Y tampoco en una recarga. La entrada es para la primera vez que se ve la
    // pagina; recargar arriba y verla entrar otra vez no es una bienvenida, es
    // un retraso de medio segundo en una pagina que ya se conoce. Omarchy carga
    // directa, sin coreografia, y la recarga tiene que sentirse igual: la pagina
    // ya puesta, sin pasar por el estado invisible.
    //
    // Se mira el tipo de navegacion, con el API viejo de respaldo. Todo dentro de
    // un try: si no se puede saber, se anima, que es lo de antes.
    try {
      var nav = (performance.getEntriesByType &&
        performance.getEntriesByType("navigation")[0]) || null;
      var tipo = nav ? nav.type : ((performance.navigation &&
        performance.navigation.type === 1) ? "reload" : "");
      if (tipo === "reload") return;
    } catch (e) { /* sin performance: se anima */ }

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

  function montarProgreso() {
    var barra = $("#linea-progreso");
    if (!barra) {
      barra = document.createElement("div");
      barra.id = "linea-progreso";
      barra.className = "linea-progreso";
      barra.setAttribute("aria-hidden", "true");
      document.body.prepend(barra);
    }
    var raf = null;
    function actualizar() {
      var h = document.documentElement;
      var max = h.scrollHeight - window.innerHeight;
      if (max <= 0) {
        barra.style.width = "0%";
        return;
      }
      var y = window.scrollY || window.pageYOffset || 0;
      var pct = Math.min(100, Math.max(0, (y / max) * 100));
      barra.style.width = pct.toFixed(2) + "%";
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        actualizar();
      });
    }
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    actualizar();
  }

  function inicio() {
    montarProgreso();
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
      pararCuandoNoSeMira();
    }

    // El clip se para solo en cuanto deja de mirarse. Antes no habia nada de esto
    // y el sonido se quedaba: el clip va en bucle, asi que en cuanto arrancaba
    // seguia sonando mientras el visitante leia el resto de la pagina, y seguia
    // sonando con la pestaña en segundo plano. Medido: 50 s de clip en bucle, o sea
    // que el sonido no se acababa nunca.
    //
    // Tres cosas lo paran, y las tres son "ya no te estan mirando":
    //
    //   1. Que el recuadro se salga de la pantalla. Se corta antes de que salga
    //      entero, a media caja, para que no haya un momento en que se ve la
    //      imagen y no se oye.
    //   2. Que la pestaña pase a segundo plano. Un movil al que te llamar o que
    //      abres otra app lo deja en visibilitychange.
    //   3. Que te vayas de la pagina, en pagehide, que en movil es lo que salta al
    //      cerrar la pestaña o al ir atras.
    //
    // Al volver a mirarlo NO se reanuda solo: reanudar un video por accident es
    // justo el fallo que se esta arreglando. Quien lo quiere, pulsa play.
    function pararCuandoNoSeMira() {
      $$("#hyprland-caja video").forEach(function (video) {
        var escena = video.parentNode;
        if (!video.paused) video.pause();
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (entradas) {
            entradas.forEach(function (e) {
              // media caja visible todavia cuenta como mirarse.
              if (e.isIntersecting) return;
              if (!video.paused) video.pause();
            });
          }, { threshold: [0, 0.5, 1] }).observe(escena);
        }
      });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "hidden") return;
        $$("#hyprland-caja video").forEach(function (v) { if (!v.paused) v.pause(); });
      });
      addEventListener("pagehide", function () {
        $$("#hyprland-caja video").forEach(function (v) { if (!v.paused) v.pause(); });
      });
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

  // La pagina ya esta pintada, y ahora i18n.js puede traducir lo que haya
  // encontrado. Sin este aviso el traductor solo veria el HTML de origen —una
  // decena de cadenas— y se le escaparia todo el manual, que lo pinta este mismo
  // script. Va al final de `inicio` y no aqui, porque aqui todavia no se ha pintado
  // nada.
  var arranque = function () {
    inicio();
    window.__RHYTHM_LISTO = true;
    // Ademas de la bandera, un aviso. La bandera la puede mirar quien quiera en
    // cualquier momento; el aviso es para el que necesita ENTER EN ESTE MOMENTO, y
    // solo funciona si se dispara de verdad.
    //
    // Existia la bandera y ningun aviso, y el buscador —que se montaba al oir ese
    // aviso que nunca llegaba— se quedaba sin botón. El diálogo sí abría, porque
    // `abrir()` lo construye si no existe, y por eso el fallo parecía parcial.
    if (window.dispatchEvent) window.dispatchEvent(new Event("listo"));
    if (window.aplicarIdioma) window.aplicarIdioma();
  };
  // Cuando el traductor acaba, hay que rehacer lo que se compone con datos dentro.
  //
  // El boton del tema dice "Tema: Como el del sistema. Cambialo.", que son tres
  // trozos pegados y ninguna frase entera: el traductor, que va de nodo en nodo, no
  // puede rehacerla. La construye `interruptor()`, y `interruptor()` se llama una
  // sola vez, al arrancar.
  //
  // Con el diccionario cargado en el HTML eso no pasaba: ya estaba ahi cuando se
  // llamaba. Al cargar el fichero bajo demanda, todavia no esta, y el boton se
  // quedaba en ingles con la pagina entera traduicda. Medido.
  //
  // El sello de arriba tiene el mismo problema —lleva la hora y el numero de
  // capitulos— y se rehace tambien.
  window.addEventListener("idioma", function () {
    interruptor();
    selloDocs();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arranque);
  else arranque();

})();
