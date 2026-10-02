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

  // ── El halo va justo encima de la cabeza, en la foto. Para no tener que
  //    calcular a ojo donde cae con cada medida de pantalla, se mide: se sabe
  //    el tamaño de la imagen y el del marco, y se aplica el mismo encaje que
  //    hace background-size: cover.
  function colocarHalo(escena, halo, fotoW, fotoH) {
    var w = escena.clientWidth, h = escena.clientHeight;
    if (!w || !h) return;
    var escala = Math.max(w / fotoW, h / fotoH);          // cover
    var ancho = fotoW * escala, alto = fotoH * escala;
    var ox = (w - ancho) / 2, oy = (h - alto) / 2;
    // En la foto el centro del halo cae hacia x 0.505, y 0.095.
    var cx = 0.505 * ancho + ox, cy = 0.095 * alto + oy;
    var r = 54 * escala;
    halo.style.width = halo.style.height = (r * 2) + "px";
    halo.style.left = (cx - r) + "px";
    halo.style.top = (cy - r) + "px";
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
    var halo = $("#halo"), luz = $("#luz"), brillo = $("#brillo");
    var angel = $(".angel", escena), frente = $(".frente", escena);
    var pal = paleta(temp);
    var FOTO_W = 2000, FOTO_H = 1125;

    // El punto y el halo, con el mismo color que sale de la temperatura.
    if (halo) {
      halo.style.setProperty("--halo", pal.halo);
      halo.style.setProperty("--nucleo", pal.nucleo);
    }

    var quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raton = { x: 0.5, y: 0.5, dentro: false };
    var ahora = { x: 0, y: 0 };
    var pulido = 0;            // el barrido de luz al pinchar

    function colocar() { colocarHalo(escena, halo, FOTO_W, FOTO_H); }
    colocar();
    addEventListener("resize", colocar);
    // Las imagenes tardan en cargar: al cargarse, el marco ya no tiene el
    // tamaño de la foto y el halo caeria donde no es.
    $$(".capa", escena).forEach(function (c) {
      var fondo = getComputedStyle(c).backgroundImage.match(/url\(["']?([^"')]+)/);
      if (!fondo) return;
      var img = new Image();
      img.onload = colocar;
      img.src = fondo[1];
    });

    function seguir(e) {
      raton.x = (e.clientX / innerWidth - 0.5) * 2;
      raton.y = (e.clientY / innerHeight - 0.5) * 2;
      raton.dentro = true;
      // La luz va con el raton. Sin esto el brillo estatico y el parallax
      // cuentan dos cosas distintas y la escena parece dos imagenes pegadas.
      if (luz) luz.style.transform = "translate(" + (e.clientX - innerWidth / 2) + "px," +
        (e.clientY - innerHeight * 0.42) + "px)";
    }
    function salir() { raton.dentro = false; }

    document.addEventListener("mousemove", seguir);
    document.addEventListener("mouseleave", salir);

    // Pinchar: las alas se abren un poco y pasa un barrido de luz.
    function golpear(e) {
      if (quieto) return;
      pulido = 1;
      angel.classList.remove("abriendo");
      void angel.offsetWidth;              // reinicia la animacion
      angel.classList.add("abriendo");
      if (brillo) {
        brillo.style.setProperty("--x", ((e.clientX / innerWidth) * 100) + "%");
        brillo.classList.remove("pasando");
        void brillo.offsetWidth;
        brillo.classList.add("pasando");
      }
    }
    escena.addEventListener("click", golpear);
    escena.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); golpear({ clientX: innerWidth * 0.5 }); }
    });

    function bucle() {
      // Persecucion suave hacia el raton. Sin inercia el parallax da un tirón
      // en cada movimiento y se nota que son cuatro capas sueltas.
      ahora.x += (raton.x - ahora.x) * 0.06;
      ahora.y += (raton.y - ahora.y) * 0.06;
      if (pulido > 0) pulido = Math.max(0, pulido - 0.012);

      for (var i = 0; i < capas.length; i++) {
        var c = capas[i], d = c.hondo;
        var dx = ahora.x * 11 * d, dy = ahora.y * 7 * d;
        // Un pelin de zoom con el raton. Muy poco: el recorte ya roza los
        // bordes de la foto y con mas las alas se salen del encuadre.
        var z = 1 + (raton.dentro ? 0.008 * (1 + d * 0.1) : 0);
        c.el.style.transform = "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0) scale(" + z.toFixed(4) + ")";
      }
      if (frente) {
        frente.style.transform = "translate3d(" + (ahora.x * 34).toFixed(2) + "px," +
          (ahora.y * 12).toFixed(2) + "px,0) scale(1.13)";
      }
      requestAnimationFrame(bucle);
    }

    if (quieto) {
      // Sin movimiento: se deja una foto, y el raton ya no mueve nada.
      document.removeEventListener("mousemove", seguir);
      if (luz) luz.style.transform = "translate(0,-10%)";
      capas.forEach(function (c) { c.el.style.transform = "scale(1)"; });
      if (frente) frente.style.transform = "scale(1.14)";
    } else {
      bucle();
      motas($("#motas"));
    }

    escena.setAttribute("tabindex", "-1");
    return escena;
  }

  window.RHYTHM_CAPA = { montar: montar, paleta: paleta };
})();