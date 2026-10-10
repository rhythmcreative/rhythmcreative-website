/* ─────────────────────────────────────────────────────────────────────────────
   El campo.

   La foto se ha deshecho en cuatro capas con scripts/preparar-angel.py y cada
   una se mueve con el raton a una velocidad distinta. Eso es la profundidad: no
   un filtro, sino el nearer y el farther separados de verdad.

       frente    la hierba y las cruces de abajo, lo mas cerca
       velo      las bandas de niebla
       angel     la figura con las alas, recortada con canal alfa
       fondo     la escena sin la figura, desenfocada y fria

   Encima, el halo de la cabeza, que es el otro motivo que comparte con la
   pagina: el de la barra. Ahi va el termometro.

   La luz que sigue al raton es una luz de verdad (un disco con blur y blend),
   no un degradado: por eso ilumina las alas por un lado y las deja en sombra por
   el otro. Pinchar enciende el halo de la cabeza y suelta una rafaga de ceniza.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // La profundidad del parallax del aro. Es el mismo numero que lleva su
  // data-hondo en el HTML, y esta aqui para que el bloom pueda moverse con el
  // aro: si diverge el uno del otro, se separan con el raton.
  var ARO_HONDO = 1.5;

  // El bloom del tema claro. Es el mismo dorado que el aro de
  // scripts/preparar-angel.py, para que en el tema blanco el aro y su luz sean
  // lo mismo. Va con multiply, y multiplicar dorado sobre papel da dorado.
  var HALO_CLARO = "rgba(198, 150, 58, 0.50)";

  // ── El punto de la barra y el halo: los dos toman su color de la temperatura
  //    REAL de la CPU, no de un temporizador.
  function paleta(temp) {
    // El alpha del halo es lo que decide quanta luz echa, y antes solo subia de
    // verdad con la CPU al 80: con 0.35 en la gama fresca el bloom era casi
    // invisible y el aro de la cabeza se veía apagado. Ahora los cuatro peldaños
    // suben un poco y el de hirviendo se queda, que ya era una placa de color.
    if (temp === null || temp === undefined)
      return { nucleo: "#6b828c", iris: "#304f79", halo: "rgba(107,130,140,0.46)", b: 0.5, txt: "sin datos de temperatura" };
    if (temp >= 80) return { nucleo: "#e97454", iris: "#ba5f44", halo: "rgba(233,116,84,0.82)", b: 1.0, txt: "cpu a " + temp.toFixed(0) + "° · hirviendo" };
    if (temp >= 70) return { nucleo: "#d8845a", iris: "#ba5f44", halo: "rgba(216,132,90,0.70)", b: 0.82, txt: "cpu a " + temp.toFixed(0) + "° · caliente" };
    if (temp >= 55) return { nucleo: "#cea878", iris: "#96603c", halo: "rgba(206,168,120,0.60)", b: 0.68, txt: "cpu a " + temp.toFixed(0) + "° · templada" };
    return { nucleo: "#99bac9", iris: "#3a6080", halo: "rgba(153,186,201,0.56)", b: 0.58, txt: "cpu a " + temp.toFixed(0) + "° · fresca" };
  }

  // El tamano y donde cae el halo los dice el propio script, que los midio en
  // la imagen. Estaban escritos a mano y al cambiar de foto se quedaron
  // viejos: el halo salia flotando en medio del cielo.
  //
  // rx y ry son SEMIEJES: rx es fraccion del ancho de la foto y ry de la altura.
  // El aro de la foto se ve tumbado, 2,8 a 1, asi que con un solo radio el bloom
  // salia redondo y no encajaba encima del aro. Estos numeros de reserva tienen
  // que ser los mismos que HALO en preparar-angel.py, que es de donde tambien
  // sale aro-*.webp: si los dos se separan, el aro y su bloom dejan de coincidir.
  var TAM = window.RHYTHM_CAPA_TAM || {
    w: 2000, h: 1133,
    halo: { x: 0.5040, y: 0.0918, rx: 0.0305, ry: 0.0221 },
    haloClaro: { x: 0.5030, y: 0.0918, rx: 0.0315, ry: 0.0203 }
  };
  var FOTO_W = TAM.w, FOTO_H = TAM.h;

  // Que tema esta puesto. El interruptor de app.js pone la clase en <html>.
  function esClaro() {
    return document.documentElement.classList.contains("claro");
  }

  // El halo esta en un punto distinto en cada version: los dos ficheros del
  // angel son recortes ligeramente distintos y el anillo cae en otro sitio.
  function haloActual() {
    return esClaro() ? (TAM.haloClaro || TAM.halo) : TAM.halo;
  }

  // ── La caja de las capas, a medida.
  //
  // Con background-size: cover, en un monitor 16:10 las dos puntas de las alas
  // se salen por los lados y la figura parece recortada. Con cover en un movil
  // alto pasaria lo contrario: la figura saldria diminuta.
  //
  // Asi que la escala sale de las dos cosas a la vez: que entre la foto
  // ENTERA (contain), pero que la figura llene al menos el 90% del alto. En
  // horizontal manda contain y se ve el angel completo, con franjas de niebla
  // arriba y abajo; en vertical manda el 90% y se recorta por lo alto, que es
  // lo unico que se puede recortar sin perder la figura.
  function encajar(escena, capas, caja) {
    var vw = escena.clientWidth, vh = escena.clientHeight;
    if (!vw || !vh) return null;
    var contiene = Math.min(vw / FOTO_W, vh / FOTO_H);
    // Que entre la foto ENTERA, o que llene el alto, segundo lo que admita la
    // pantalla.
    //
    // Antes era siempre "llena el 92% del alto", y en una ventana alta eso
    // recortaba la imagen mas de dos veces de ancho: las alas salian cortadas
    // de golpe en los dos bordes, que es justo lo que no puede ser. La foto no
    // se recorta por arriba o por abajo, se sigue.
    //
    // El recorte lateral solo se acepta en pantallas estrechas, que es donde
    // la figura llena la pantalla y las alas quedan en los bordes, que es lo
    // que ya se vio bien en el movil.
    //
    // En pantalla ANCHA la foto se escala SIEMPRE al ancho, aunque con eso haya
    // que recortar por arriba y por abajo. Con "que entre entera" salia al reves:
    // en un monitor mas ancho que 16:9 sobraban franjas a los lados, y esas
    // franjas eran el respaldo difuminado, con un corte vertical durísimo entre
    // la foto nítida y la niebla. La foto no se recorta de lado, que es justo lo
    // que no puede ser.
    //
    // En pantalla ESTRECHA se hace al reves, y se recorta por los lados: la
    // figura llena la pantalla y las alas quedan en los bordes, que es lo que ya
    // se vio bien en el movil.
    var escala = vw < 900
      ? Math.max(contiene, (vh * 0.92) / FOTO_H)
      : Math.max(contiene, vw / FOTO_W);
    var w = FOTO_W * escala, h = FOTO_H * escala;
    var mx = (vw - w) / 2;

    // Si sobra alto, se recorta casi todo por ABAJO: abajo esta la hierba y el
    // nombre. Por arriba solo se recorta un 3.5% de la foto como mucho, que es lo
    // justo para no comerse el halo ni las puntas de las alas, que estan al 6% y
    // al 9% de la altura. Recortando arriba en proporcion al exceso, en un
    // monitor 21:9 el recorte de arriba era del 18% y el halo desaparecia.
    var my;
    if (h <= vh) {
      my = (vh - h) / 2;
    } else {
      my = -Math.min((h - vh) * 0.3, h * 0.035);
    }

    // Las cuatro capas van al 100% dentro de la caja, asi que basta con medir
    // LA CAJA. Se miden aqui y no en un bucle por capa porque la mascara que
    // difumina el borde va en la caja: si la caja se queda en 0 x 0, la mascara
    // de un elemento sin altura se come el elemento entero y no se ve ni el
    // angel. Ya paso.
    if (caja) {
      caja.style.left = mx.toFixed(1) + "px";
      caja.style.top = my.toFixed(1) + "px";
      caja.style.width = w.toFixed(1) + "px";
      caja.style.height = h.toFixed(1) + "px";
      // La mascara de los bordes mide lo que hay de hueco DE VERDAD, no un numero
      // fijo. Si la foto ya llega al borde de la pantalla, el hueco es cero y la
      // mascara no tiene que difuminar nada: si difumina, lo que sale es una
      // franja borrosa arriba contra el resto nitido.
      //
      // Y el tope no son 12 px sino 180, porque con 12 y una franja de 654 —en
      // una ventana alta— la foto cortaba en recto contra el respaldo. El
      // difuminado tiene que dar la medida de la franja que tapa.
      var hueco = Math.min(180, Math.max(0, my));
      caja.style.setProperty("--fade", hueco.toFixed(1) + "px");

      // ── CUANTO DESENFOCAR, QUE ES LO QUE HACIA FALTA ──────────────────────
      //
      // La foto se estira SIEMPRE a la caja, y la caja se mide en pixeles CSS.
      // Pero el navegador no pinta pixeles CSS: pinta pixeles de la pantalla, y en
      // un telefono o en un monitor de alta resolucion son dos o tres por cada uno.
      // Medido con las medidas de ahora:
      //
      //   ventana  caja CSS  pixeles que se pintan  foto   estiramiento
      //      1440    1425        4275 (DPR 3)      2000      2,14x
      //      1024    1024        3072 (DPR 3)      2000      1,54x
      //       768     768        2304 (DPR 3)      1100      2,09x
      //       390    1371        4113 (DPR 3)      1100      3,74x
      //
      // Estirar una foto 2,14x o 3,74x es lo que hacia que se viera a cuadros: no
      // es que la foto fuera pequena, es que se le pedian mas pixeles de los que
      // tiene. En un movil el angel va 3,74x estirado, y ahi es donde se nota mas.
      //
      // El desenfoque se mide en la misma unidad que el estiramiento: medio pixel
      // de la foto por cada pixel al que se estira. Con eso los cuadros se
      // difuminan justo y la imagen sigue leyendose; con mas se perderia el detalle
      // de las plumas, que es lo que hace que se vea bien.
      //
      // Se escribe en la caja, no en el <html>, porque depende de como ha quedado
      // esta medida en concreto. Y si el script no llega a correr, la variable no
      // existe y el CSS usa 0px: la foto se ve nitida, que es lo de antes.
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var estirar = function(anchoFoto) {
        return (w * dpr) / anchoFoto;
      };
      // El angel tiene dos ficheros: el de 2000 px, y el de 1100 px que se carga
      // por debajo de 900 px de ventana. Cada uno con su propio estiramiento, que
      // no son el mismo: en un movil el de 1100 va 3,74x y el fondo 2,06x.
      var anchoP = TAM.p || 1100;
      var b = function(e) {
        return (Math.max(0, e - 1) * 0.5).toFixed(2) + "px";
      };
      caja.style.setProperty("--borr", b(estirar(FOTO_W)));
      caja.style.setProperty("--borr-p", b(estirar(anchoP)));
    }
    void capas;

    return { vw: vw, vh: vh, w: w, h: h, mx: mx, my: my, escala: escala };
  }

  // El halo va justo encima de la cabeza, que esta en un punto concreto de la
  // foto. Con la caja ya medida, sale de multiplicar.
  function colocarHalo(geo) {
    if (!geo) return;
    var halo = $("#halo");
    if (!halo) return;
    var h = haloActual();
    var cx = geo.mx + h.x * geo.w;
    var cy = geo.my + h.y * geo.h;
    // Los dos semiejes, cada uno en su eje: rx de la fraccion del ancho y ry de
    // la de la altura. Con width = height el bloom salia cuadrado, que es lo que
    // hacia que no encajara con el aro tumbado de la foto. El degradado es
    // radial, asi que en una caja que no es cuadrada se dibuja solo elipse.
    var rx = h.rx * geo.w, ry = h.ry * geo.h;
    halo.style.width = (rx * 2).toFixed(1) + "px";
    halo.style.height = (ry * 2).toFixed(1) + "px";
    halo.style.left = (cx - rx).toFixed(1) + "px";
    halo.style.top = (cy - ry).toFixed(1) + "px";
  }

  // Las motas, con una diferencia importante respecto a antes: el bucle se puede
    // PARAR. Encender devuelve una funcion para apagarlo.
    //
    // Encender una vez y leave que requestAnimationFrame corra para siempre es lo
    // que hacia que bajar por la pagina no se notase: las motas seguian
    // repintando un canvas de pantalla entera debajo de la seccion, sin que nadie
    // las viera. Ahora hay un Boton y el observer lo pulsa.
    function motas(canvas, donde) {
      if (!canvas) return null;
      var ctx = canvas.getContext("2d");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Los dos polvos toman su color del tema, en --ceniza la que flota y
      // --chispa la de la rafaga del clic. Son DOS porque no pueden ser lo mismo:
      // en claro la ceniza que flota tiene que ser un susurro, porque si no el
      // papel blanco se llena de motas y parece unaDirty; y la chispa del clic
      // tiene que ser fuerte y oscura, porque es lo unico que se ve al pulsar.
      // Compartiendo color, o la flotante se ve como ruido o el clic no se ve.
      //
      // Los dos son solo los tres canales, sin opacidad: la pone cada particula.
      // El objeto que devuelve getComputedStyle es vivo, asi que se lee una vez
      // por fotograma y se entera solo del cambio de tema.
      var estilo = getComputedStyle(document.documentElement);
      var ps = [];
      var corriendo = false;
      var id = 0;
      var ult = 0, t = 0;

      function medir() {
        canvas.width = Math.floor(innerWidth * dpr);
        canvas.height = Math.floor(innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function sembrar() {
        ps = [];
        // Poca ceniza, y despacio. Esto no es lluvia: la lluvia que estaba antes
        // era lo que mas estorbaba, aqui solo se insinua que el aire se mueve.
        var n = Math.max(16, Math.min(64, Math.round(innerWidth / 26)));
        for (var i = 0; i < n; i++) {
          ps.push({
            x: Math.random() * innerWidth,
            y: Math.random() * innerHeight,
            r: 0.5 + Math.random() * 1.5,
            vx: 3 + Math.random() * 9,
            vy: -2 - Math.random() * 7,
            a: 0.06 + Math.random() * 0.22,
            f: Math.random() * 6.28,
            vida: null          // la ceniza de fondo no caduca
          });
        }
      }
      function paso(ms) {
        if (!corriendo) return;
        var dt = Math.min(0.05, (ms - ult) / 1000 || 0.016);
        ult = ms; t += dt;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        var ceniza = (estilo.getPropertyValue("--ceniza") || "").trim() || "206,222,231";
        var chispa = (estilo.getPropertyValue("--chispa") || "").trim() || "240,248,253";
        for (var i = ps.length - 1; i >= 0; i--) {
          var p = ps[i];
          // Las de la rafaga se frenan un poco al caer, como la ceniza de verdad.
          p.vx *= (1 - dt * 1.4);
          p.x += (p.vx + Math.sin(t * 0.4 + p.f) * 5) * dt;
          p.y += p.vy * dt;
          if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random() * innerWidth; }
          if (p.x > innerWidth + 10) p.x = -10;
          if (p.x < -10) p.x = innerWidth + 10;

          // La vida es solo de las de la rafaga: las de fondo, null.
          var a = p.a;
          // Las de la rafaga son las que tienen vida. El color va con ellas.
          var col = p.vida === null ? ceniza : chispa;
          if (p.vida !== null) {
            p.vida -= dt;
            if (p.vida <= 0) { ps.splice(i, 1); continue; }
            // Cuadrado, para que se apague mas al principio y llegue a cero
            // sin dar un tiron al desaparecer.
            a = p.a * (p.vida / p.vidaMax) * (p.vida / p.vidaMax);
          }
          ctx.fillStyle = "rgba(" + col + "," + a.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        id = requestAnimationFrame(paso);
      }
      function encender() {
        if (corriendo) return true;
        corriendo = true;
        ult = 0;
        medir();
        sembrar();
        id = requestAnimationFrame(paso);
        return true;
      }
      function apagar() {
        if (!corriendo) return false;
        corriendo = false;
        cancelAnimationFrame(id);
        return false;
      }
      // La rafaga del clic.
      //
      // Las coordenadas que llegan son las del VIEWPORT (clientX del raton), y el
      // canvas vive dentro de la escena, que va con la pagina. Sin restar el
      // rectangulo, la ceniza sale por ahi donde no se ha pinchado: es el mismo
      // fallo que arrastraba la luz del raton.
      function rafaga(clientX, clientY, cuantos) {
        var r = donde.getBoundingClientRect();
        var x0 = clientX - r.left;
        var y0 = clientY - r.top;
        var n = cuantos || 26;
        for (var i = 0; i < n; i++) {
          // Reparto en disco, no en un cuadrado: sale como una explosion y no
          // como un bloque.
          var ang = Math.random() * Math.PI * 2;
          var vel = 50 + Math.random() * 170;
          var vida = 0.7 + Math.random() * 0.9;
          ps.push({
            x: x0 + Math.cos(ang) * 4,
            y: y0 + Math.sin(ang) * 4,
            r: 0.6 + Math.random() * 2,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 26,   // algo hacia arriba: sale y cae
            a: 0.4 + Math.random() * 0.4,
            vida: vida,
            vidaMax: vida,
            f: Math.random() * 6.28
          });
        }
        // Si no se esta pintando (la escena dormida), no vale la pena nada: el
        // clic ya esta descartado por golper() cuando la escena duerme.
        if (!corriendo) encender();
      }

      medir(); sembrar();
      addEventListener("resize", function () { medir(); if (corriendo) sembrar(); });
      return { encender: encender, apagar: apagar, sembrar: sembrar, rafaga: rafaga };
    }

  function montar(escena, temp) {
    if (!escena) return null;
    var capas = $$(".capa", escena).map(function (el) {
      return { el: el, hondo: parseFloat(el.getAttribute("data-hondo")) || 1 };
    });
    var frente = $(".frente", escena);
    var respaldo = $(".respaldo", escena);
    var caja = $("#capas", escena);
    var halo = $("#halo"), luz = $("#luz");
    var aro = $(".aro", escena);
    var pal = paleta(temp);
    var geo = null;

    if (halo) {
      // El color del bloom va POR TEMA, no por temperatura. En oscuro el
      // termometro va bien porque el bloom va con screen y aclarando el cielo
      // oscuro. En claro el bloom va con multiply, y multiplicar un gris azulado
      // sobre el papel sale un manchurron marron que tapa el aro; ahi lo que
      // ilumina de verdad es el dorado, el mismo del aro del tema claro.
      // La temperatura sigue mandando en el punto de la barra, que es donde se
      // lee el numero.
      halo.style.setProperty("--halo", esClaro() ? HALO_CLARO : pal.halo);
      halo.style.setProperty("--nucleo", pal.nucleo);
    }

    var quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raton = { x: 0, y: 0, dentro: false };
    var ahora = { x: 0, y: 0 };

    // Si la escena esta a la vista. Arranca dormida: hasta que el observer diga
    // que se ve, no se escribe nada. Asi el bucle no arranca si la pagina se
    // abre con el hash de la seccion de abajo, que es cuando la portada no se ve
    // en absoluto.
    var viva = false;
    var lienzo = null;
    var motasEncendidas = false;
    var idBucle = 0;
    escena.classList.remove("viva");

    function despertar() {
      if (viva) return;
      viva = true;
      escena.classList.add("viva");
    }
    function dormir() {
      if (!viva) return;
      viva = false;
      escena.classList.remove("viva");
      // Las motas miden la pantalla y sembran con ella: si no, al volver estan
      // todas en el sitio viejo y el canvas mide otra cosa. Dormir tambien las
      // para que el proximo despertar salga limpio.
      if (lienzo) lienzo.sembrar();
      motasEncendidas = false;
    }
    function pedirLienzo() {
      if (!lienzo) lienzo = motas($("#motas"), escena);
      if (lienzo && !motasEncendidas) { motasEncendidas = lienzo.encender(); }
    }

    function medir() {
      geo = encajar(escena, capas, caja);
      colocarHalo(geo);
    }

    // Cambiar de tema cambia el punto del halo, asi que hay que recalcularlo.
    //
    // Solo eso. Antes ademas ponia aqui la opacidad de la luz del raton, y como
    // era en linea se comia la regla del CSS: en claro se quedaba en 0.35, que
    // es lo que decia el comentario de aqui, y no lo que decia el CSS. Con dos
    // sitios controlando la misma propiedad, gana el en linea. Ahora lo pone el
    // CSS y aqui no se toca.
    function avisarCambio() {
      medir();
    }
    medir();
    addEventListener("resize", medir);
    // Las imagenes tardan en cargar, y hasta que no cargan el marco no tiene
    // el tamaño de la foto: sin esto el halo cae en otro sitio y las capas se
    // descuadran al entrar.
    $$(".capa", escena).forEach(function (c) {
      var fondo = getComputedStyle(c).backgroundImage.match(/url\(["']?([^"')]+)/);
      if (!fondo) return;
      var img = new Image();
      img.decoding = "async";
      img.onload = medir;
      img.src = fondo[1];
    });

    // ── La luz que sigue al raton ───────────────────────────────────────
    //
    // ESTO ES LO QUE LA ARRASTRABA. El translate se aplicaba sobre
    // left:50%/top:42% con un margen negativo, y las coordenadas que se le pasaban
    // eran clientX/clientY: las del VIEWPORT. Pero un translate se mide dentro de
    // la caja del elemento, y esa caja va con la pagina. En cuanto bajabas, la
    // caja subia y la luz se quedaba cada vez mas por encima del cursor, hasta
    // que en la mitad de abajo no seguia de ninguna manera. Por eso decia que no
    // seguia "mas abajo": mas scroll, mas error.
    //
    // Ahora se mide el rectangulo de la escena y se resta. El rectangulo se cachea
    // y se refresca al hacer scroll y al redimensionar, porque leerlo en cada
    // movimiento del raton es una lectura de layout por evento, y eso es
    // justamente lo que cuesta.
    var luzCaja = { x: 0, y: 0, w: 0, h: 0 };
    function medirLuz() {
      var r = escena.getBoundingClientRect();
      luzCaja.x = r.left;
      luzCaja.y = r.top;
      luzCaja.w = luz ? luz.offsetWidth : 0;
      luzCaja.h = luz ? luz.offsetHeight : 0;
    }
    function ponerLuz(clientX, clientY) {
      if (!luz) return;
      luz.style.transform = "translate(" + (clientX - luzCaja.x - luzCaja.w / 2).toFixed(1) +
        "px," + (clientY - luzCaja.y - luzCaja.h / 2).toFixed(1) + "px)";
    }
    medirLuz();
    addEventListener("scroll", medirLuz, { passive: true });
    addEventListener("resize", medirLuz);
    ponerLuz(innerWidth / 2, innerHeight * 0.42);

    function seguir(e) {
      // Solo con la escena despierta. El raton se mueve por toda la pagina y,
      // si esto escuchara siempre, abajo estarias moviendo cuatro capas que no
      // se ven y escribiendo su transform en cada movimiento.
      if (!viva) return;
      raton.x = (e.clientX / innerWidth - 0.5) * 2;
      raton.y = (e.clientY / innerHeight - 0.5) * 2;
      raton.dentro = true;
      ponerLuz(e.clientX, e.clientY);
    }
    function salir() { raton.dentro = false; }
    document.addEventListener("mousemove", seguir);
    document.addEventListener("mouseleave", salir);

    // Pinchar: el halo de la cabeza se enciende y se apaga, y cae ceniza.
    //
    // Antes hacian dos cosas mas: un barrido de luz por TODA la pantalla y que
    // las alas se abrieran un pelo. Los dos fuera: el barrido era una franja de
    // luz cruzando la imagen, que a 2560 de ancho tardaba mas de un segundo en
    // pasar, y las alas ya se mueven con el raton.
    //
    // El halo es el motivo que la pagina ya comparte con la barra, y el
    // termometro vive ahi: que se encienda al pinchar es lo que toca.
    function golpear(e) {
      if (quieto) return;
      if (!viva) return;                    // pinchar abajo no tiene que hacer nada
      // El aro, que es una capa con su propia imagen. El div .halo se queda con
      // su papel de termometro y YA no se enciende: iluminarlo era subirle el
      // opacity a un bloom, y con mix-blend-mode multiply en claro eso no es
      // "mas luz", es "mas oscuro".
      if (aro) {
        aro.classList.remove("pulsando");
        void aro.offsetWidth;               // reinicia la animacion
        aro.classList.add("pulsando");
      }
      if (lienzo && lienzo.rafaga) {
        var hayRaton = e && e.clientX !== undefined;
        lienzo.rafaga(hayRaton ? e.clientX : innerWidth / 2,
          hayRaton ? e.clientY : innerHeight * 0.42);
      }
    }
    escena.addEventListener("click", golpear);
    escena.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); golpear(); }
    });

    function acotar(valor, margen, tope) {
      // El desplazamiento no puede pasar del margen que sobra alrededor de la
      // foto, o la capa enseña el borde del lienzo. En un monitor ancho ese
      // margen es de unos 40 px y se nota enseguida.
      var m = Math.max(0, margen - 6);
      var v = valor * tope;
      return Math.max(-m, Math.min(m, v));
    }

    function bucle() {
      // El bucle se detiene solo al irse la escena, y el observer lo vuelve a
      // arrancar. No es solo economia: requestAnimationFrame sigue pidiendo
      // fotogramas cuando la escena ya no se ve, y eso es bateria en un movil y
      // calor en un portatil.
      if (!viva) { idBucle = 0; return; }

      // Persecucion suave hacia el raton. Sin inercia el parallax da un tiron
      // en cada movimiento y se nota que son cuatro capas sueltas.
      //
      // Y cuando ya ha llegado, se para de escribir. La pagina casi siempre esta
      // quieta con el raton parado, y estar escribiendo cinco transformaciones
      // por fotograma sin que nada se mueva obliga al compositor a estar
      // repintando cinco capas de pantalla entera para nada. Con un umbral de un
      // decimo de pixel, el coste solo existe mientras el raton se mueve.
      ahora.x += (raton.x - ahora.x) * 0.12;
      ahora.y += (raton.y - ahora.y) * 0.12;
      var quieta = Math.abs(raton.x - ahora.x) < 0.002 &&
                   Math.abs(raton.y - ahora.y) < 0.002;

      if (geo && !quieta) {
        for (var i = 0; i < capas.length; i++) {
          var c = capas[i], d = c.hondo;
          var dx = acotar(ahora.x, geo.mx, 11 * d);
          var dy = acotar(ahora.y, geo.my, 7 * d);
          // Un pelin de zoom. Muy poco: el recorte ya llega a los bordes de la
          // foto y con mas se salen las puntas de las alas.
          var z = 1 + (raton.dentro ? 0.006 * (1 + d * 0.1) : 0);
          c.el.style.transform = "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) +
            "px,0) scale(" + z.toFixed(4) + ")";
        }
        if (frente) {
          var fx = acotar(ahora.x, geo.mx, 30);
          var fy = acotar(ahora.y, geo.my, 11);
          frente.style.transform = "translate3d(" + fx.toFixed(2) + "px," +
            fy.toFixed(2) + "px,0) scale(1.12)";
        }
        // El bloom va CON EL ARO, y antes no se movia: solo se movian las capas.
        // Con el raton en una esquina el aro se iba hasta 16 px (11 por el hondo
        // de 1,5) y el bloom se quedaba, y se veian separados. Son el mismo
        // anillo, asi que se mueven juntos.
        //
        // El zoom hay que corregirlo: el aro se escala desde el centro de la CAJA
        // y el bloom esta centrado en el aro, o sea que su centro no se mueve con
        // el scale. Sin la correccion se quedan unos 3 px verticales, que es poco
        // pero se nota porque el aro es de 38 px de alto.
        if (halo) {
          var ha = haloActual();
          var hx = acotar(ahora.x, geo.mx, 11 * ARO_HONDO);
          var hy = acotar(ahora.y, geo.my, 7 * ARO_HONDO);
          var hz = 1 + (raton.dentro ? 0.006 * (1 + ARO_HONDO * 0.1) : 0);
          var ex = (hz - 1) * (ha.x - 0.5) * geo.w;
          var ey = (hz - 1) * (ha.y - 0.5) * geo.h;
          halo.style.transform = "translate3d(" + (hx + ex).toFixed(2) + "px," +
            (hy + ey).toFixed(2) + "px,0) scale(" + hz.toFixed(4) + ")";
        }
      }
      idBucle = requestAnimationFrame(bucle);
    }

    function arrancarBucle() {
      if (!idBucle && !quieto) idBucle = requestAnimationFrame(bucle);
    }

    // El observer decide si la escena esta a la vista. Con un margen de 150 px
    // arranca un poco antes de que su borde entre en pantalla, para que no se
    // note el primer fotograma quieto.
    if ("IntersectionObserver" in window) {
      var vis = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) {
            despertar();
            pedirLienzo();
            arrancarBucle();
            medir();
          } else {
            dormir();
            if (lienzo) lienzo.apagar();
            if (idBucle) { cancelAnimationFrame(idBucle); idBucle = 0; }
          }
        });
      }, { rootMargin: "150px 0px" });
      vis.observe(escena);
    } else {
      // Sin observer no hay forma de saberlo. Se deja despierta: es lo que
      // habia antes, y sin observer el navegador es antiguo.
      despertar();
      pedirLienzo();
      arrancarBucle();
    }

    if (quieto) {
      // Sin movimiento: una foto. El parallax va con el raton, que es
      // respuesta directa a lo que hace la persona y no movimiento por su cuenta,
      // pero con prefers-reduced-motion no se arrastra nada.
      document.removeEventListener("mousemove", seguir);
      if (luz) luz.style.transform = "translate(-50%,-50%)";
      capas.forEach(function (c) { c.el.style.transform = "scale(1)"; });
      if (frente) frente.style.transform = "scale(1.12)";
      escena.classList.add("viva");
      viva = true;
    }

    escena.setAttribute("tabindex", "-1");
    return { avisarCambio: avisarCambio };
  }

  window.RHYTHM_CAPA = { montar: montar, paleta: paleta };
})();
