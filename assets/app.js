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

  // El logotipo de Arch Linux, dibujado aqui en vez de traer un fichero.
  //
  // Son tres trazos y un hueco: las dos piernas del triangulo y la base, con un
  // corte entre la base y la pierna derecha. Ese corte es lo que hace que se
  // reconozca como el logo de Arch y no como un triangulo cualquiera.
  //
  // Va en currentColor, sin relleno y con trazo, para que tome el color de la
  // linea de la cabecera en los dos temas. Y con aria-hidden: al lado del numero
  // no le anade nada a quien no lo ve, y el nombre de la distribucion ya esta en
  // el titulo de la seccion y en el pie.
  var LOGO_ARCH = '<svg class="logo-arch" viewBox="0 0 24 22" aria-hidden="true" ' +
    'focusable="false"><path d="M12 1.8 L3 20.2" /><path d="M12 1.8 L21 20.2" />' +
    '<path d="M3 20.2 L13.4 20.2" /></svg>';

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
    var meta = ["★ " + esc(d.stars)];
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
      '" target="_blank" rel="noopener"><span>' + esc(H.manualTexto || "the manual") +
      '</span><i aria-hidden="true"></i></a>' +
      "</div>");

    // Instalar. Va DEBAJO del clip y de los botones, y es lo ultimo de la
    // seccion: es lo que se viene a hacer cuando ya se ha visto que esto es de
    // fiar.
    //
    // Una sola linea, y el boton de copiar dentro de la caja. Lo de las banderas
    // no va aqui: lo cuenta el manual, que ya esta enlazado un par de lineas mas
    // arriba.
    out.push('<div class="instalar">' +
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

    // El mapa de atajos. Viene de scripts/parse-binds.py leyendo hyprland.lua,
    // no de hyprctl: por la API salen como __lua(6), que no dice nada.
    //
    // El numero de hyprctl se queda como referencia. Si no coinciden, se dice en
    // pagina: es mejor que enseña un numero que no es el real.
    function atajos() {
      var lista = (S && S.atajos) || null;
      if (!lista || !lista.length) return '<p class="sin-datos">No keybindings parsed.</p>';
      var porGrupo = {};
      var orden = [];
      lista.forEach(function (a) {
        if (!porGrupo[a.grupo]) { porGrupo[a.grupo] = []; orden.push(a.grupo); }
        porGrupo[a.grupo].push(a);
      });
      var html = '<div class="atajos">' + orden.map(function (g) {
        return '<details class="grupo-atajos"' + (g === orden[0] ? " open" : "") + ">" +
          "<summary>" + esc(g) + "<span>" + porGrupo[g].length + "</span></summary>" +
          '<div class="filas-atajos">' + porGrupo[g].map(function (a) {
            var mods = a.tecla.split(" + ");
            var tecla = mods.pop();
            return '<div class="atajo"><span class="combo">' +
              mods.map(function (m) {
                return '<kbd>' + esc(m) + "</kbd>";
              }).join("<i>+</i>") +
              (mods.length ? "<i>+</i>" : "") +
              '<kbd class="tecla">' + esc(tecla) + "</kbd></span>" +
              '<span class="que">' + esc(a.que) + "</span>" +
              (a.bloqueado ? '<span class="candado" title="works while the screen is locked">locked</span>' : "") +
              "</div>";
          }).join("") + "</div></details>";
      }).join("") + "</div>";

      var porApi = S && S.binds ? S.binds.length : null;
      html += '<p class="nota-dato">' + lista.length + " keybindings, parsed from " +
        "<code>hyprland.lua</code>." +
        (porApi !== null ? " Hyprland itself reports " + porApi +
          (porApi === lista.length ? ", which matches."
                                    : ", which does <b>not</b> match — the config and the compositor disagree.") : "") +
        "</p>";
      return html;
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

  // De cuando son los datos. Va en el menu y no en la barra, que ya va bastante
  // cargada. Sin esto, el pie decia "sin datos" aunque los hubiera.
  // Que datos de la maquina salen en la pagina, y en que orden. Para quitar uno,
  // se borra de aqui. Ver el aviso del README.
  var FICHA = [
    ["kernel",   function (d) { return d.kernel; }],
    ["uptime",   function (d) { return d.uptime; }],
    ["load",     function (d) { return String(d.loadavg).split(",")[0]; }],
    ["disk",     function (d) { return d.disco_libre + " free"; }],
    ["services", function (d) {
      var v = d.servicios;
      if (!v) return null;
      return v.fallidos ? v.activos + " up, " + v.fallidos + " failed" : v.activos + " up";
    }]
  ];

  function ficha() {
    var el = $("#ficha");
    if (!el) return;
    if (!S) { el.textContent = ""; return; }
    el.textContent = FICHA.map(function (f) {
      var v = f[1](S);
      return v ? f[0] + " " + v : null;
    }).filter(Boolean).join("  ·  ");
  }

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

    // La seccion se pinta ANTES de mirar el clip. Antes estaba al reves, y el
    // observer se montaba sobre un DOM que todavia no tenia el <video>: no
    // observaba nada y el clip no se montaba hasta la red de seguridad de los
    // cuatro segundos. Cuatro segundos de poster por ir looking for un elemento
    // que ya estaba ahi.
    interruptor();
    sellos();
    ficha();
    pintarHyprland();

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
