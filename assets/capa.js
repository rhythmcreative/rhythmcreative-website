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

   El brillo que cruza de un lado a otro con el raton es una luz de verdad
   (un disco con blur y blend), no un degradado: por eso ilumina las alas por un
   lado y las deja en sombra por el otro.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ── El punto de la barra y el halo: los dos toman su color de la temperatura
  //    REAL de la CPU, no de un temporizador.
  function paleta(temp) {
    if (temp === null || temp === undefined)
      return { nucleo: "#6b828c", iris: "#304f79", halo: "rgba(107,130,140,0.30)", b: 0.5, txt: "sin datos de temperatura" };
    if (temp >= 80) return { nucleo: "#e97454", iris: "#ba5f44", halo: "rgba(233,116,84,0.85)", b: 1.0, txt: "cpu a " + temp.toFixed(0) + "° · hirviendo" };
    if (temp >= 70) return { nucleo: "#d8845a", iris: "#ba5f44", halo: "rgba(216,132,90,0.60)", b: 0.82, txt: "cpu a " + temp.toFixed(0) + "° · caliente" };
    if (temp >= 55) return { nucleo: "#cea878", iris: "#96603c", halo: "rgba(206,168,120,0.40)", b: 0.68, txt: "cpu a " + temp.toFixed(0) + "° · templada" };
    return { nucleo: "#99bac9", iris: "#3a6080", halo: "rgba(153,186,201,0.35)", b: 0.58, txt: "cpu a " + temp.toFixed(0) + "° · fresca" };
  }

  // El tamano y donde cae el halo los dice el propio script, que los midio en
  // la imagen. Estaban escritos a mano y al cambiar de foto se quedaron
  // viejos: el halo salia flotando en medio del cielo.
  var TAM = window.RHYTHM_CAPA_TAM || {
    w: 2000, h: 1133,
    halo: { x: 0.5035, y: 0.088, r: 0.032 },
    haloClaro: { x: 0.5200, y: 0.094, r: 0.030 }
  };
  var FOTO_W = TAM.w, FOTO_H = TAM.h;

  // El halo esta en un punto distinto en cada version: los dos ficheros del
  // angel son recortes ligeramente distintos y el anillo cae en otro sitio.
  function haloActual() {
    var claro = document.documentElement.classList.contains("claro");
    return claro ? (TAM.haloClaro || TAM.halo) : TAM.halo;
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
    // El radio sale de la fraccion del ancho de la foto, no de un numero fijo:
    // el anillo es una elipse y con un radio igual en x y en y se salia.
    var r = h.r * geo.w;
    halo.style.width = halo.style.height = (r * 2).toFixed(1) + "px";
    halo.style.left = (cx - r).toFixed(1) + "px";
    halo.style.top = (cy - r).toFixed(1) + "px";
  }

  function motas(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ps = [];
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
          f: Math.random() * 6.28
        });
      }
    }
    var ult = 0, t = 0;
    function paso(ms) {
      var dt = Math.min(0.05, (ms - ult) / 1000 || 0.016);
      ult = ms; t += dt;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.x += (p.vx + Math.sin(t * 0.4 + p.f) * 5) * dt;
        p.y += p.vy * dt;
        if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random() * innerWidth; }
        if (p.x > innerWidth + 10) p.x = -10;
        ctx.fillStyle = "rgba(206,222,231," + p.a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(paso);
    }
    medir(); sembrar(); requestAnimationFrame(paso);
    addEventListener("resize", function () { medir(); sembrar(); });
  }

  function montar(escena, temp) {
    if (!escena) return null;
    var capas = $$(".capa", escena).map(function (el) {
      return { el: el, hondo: parseFloat(el.getAttribute("data-hondo")) || 1 };
    });
    var frente = $(".frente", escena);
    var respaldo = $(".respaldo", escena);
    var caja = $("#capas", escena);
    var halo = $("#halo"), luz = $("#luz"), brillo = $("#brillo");
    var angel = $(".angel", escena);
    var pal = paleta(temp);
    var geo = null;

    if (halo) {
      halo.style.setProperty("--halo", pal.halo);
      halo.style.setProperty("--nucleo", pal.nucleo);
    }

    var quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raton = { x: 0, y: 0, dentro: false };
    var ahora = { x: 0, y: 0 };

    function medir() {
      geo = encajar(escena, capas, caja);
      colocarHalo(geo);
    }

    // Cambiar de version cambia el punto del halo, asi que hay que recolocarlo.
    function avisarCambio() {
      medir();
      if (luz) luz.style.opacity = document.documentElement.classList.contains("claro") ? "0.35" : "0.7";
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
      img.onload = medir;
      img.src = fondo[1];
    });

    function seguir(e) {
      raton.x = (e.clientX / innerWidth - 0.5) * 2;
      raton.y = (e.clientY / innerHeight - 0.5) * 2;
      raton.dentro = true;
      // La luz va con el raton. Sin esto el brillo se queda quieto y el
      // parallax corre, y la escena parece un montaje de dos imagenes.
      if (luz) luz.style.transform = "translate(" + (e.clientX - innerWidth / 2) + "px," +
        (e.clientY - innerHeight * 0.42) + "px)";
    }
    function salir() { raton.dentro = false; }
    document.addEventListener("mousemove", seguir);
    document.addEventListener("mouseleave", salir);

    // Pinchar: las alas se abren un poco y pasa un barrido de luz.
    function golpear(e) {
      if (quieto || !angel) return;
      angel.classList.remove("abriendo");
      void angel.offsetWidth;              // reinicia la animacion
      angel.classList.add("abriendo");
      if (brillo) {
        brillo.classList.remove("pasando");
        void brillo.offsetWidth;
        brillo.classList.add("pasando");
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
      }
      requestAnimationFrame(bucle);
    }

    if (quieto) {
      // Sin movimiento: una foto. El parallax va con el raton, que es
      // respuesta directa a lo que hace la persona y no movimiento por su cuenta,
      // pero con prefers-reduced-motion no se arrastra nada.
      document.removeEventListener("mousemove", seguir);
      if (luz) luz.style.transform = "translate(0,-10%)";
      capas.forEach(function (c) { c.el.style.transform = "scale(1)"; });
      if (frente) frente.style.transform = "scale(1.12)";
    } else {
      bucle();
      motas($("#motas"));
    }

    escena.setAttribute("tabindex", "-1");
    return { avisarCambio: avisarCambio };
  }

  window.RHYTHM_CAPA = { montar: montar, paleta: paleta };
})();
