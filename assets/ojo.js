/* ─────────────────────────────────────────────────────────────────────────────
   El ojo.

   Tu fondo de pantalla es una noche con lluvia y dos ojos rojos. Tu isla tiene
   un ojo. Lo unico que de verdad es tuyo y de verdad esta vivo es eso, asi que
   la pagina es un ojo grande en un campo de lluvia y nada mas.

   No esta dibujado con una imagen: se pinta en cada cuadro, y por eso puede
   seguirte, parpadear y encogerse cuando lo miras de cerca. El color sale de
   la temperatura real de la CPU, leida de data/system.js: no es decoracion,
   con la maquina fria esta apagado y con la maquina caliente brilla.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  function Ojo(canvas, temp) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
    this.raton = { x: 0, y: 0, dentro: false, activa: 0 };
    this.onda = [];              // anillos al pinchar
    this.golpe = null;            // destello
    this.temp = temp;
    this.pal = null;
    this.parpadeoEn = 2.2;
    this.parpadeo = 0;            // 0 abierto, 1 cerrado
    this.mirada = { x: 0, y: 0 };
    this.medir();
  }

  // ── Color por temperatura. Apagado es el valor bajo, como un ojo de verdad:
  //    no tiene luz propia, la coje del sitio. ────────────────────────────────
  Ojo.prototype.paleta = function () {
    var t = this.temp;
    if (t === null || t === undefined) {
      return { nucleo: "90,120,134", iris: "48,79,121", halo: "rgba(107,130,140,0.16)", brillo: 0.42 };
    }
    if (t < 55) return { nucleo: "153,186,201", iris: "58,96,128", halo: "rgba(153,186,201,0.20)", brillo: 0.62 };
    if (t < 70) return { nucleo: "206,168,120", iris: "150,96,60",  halo: "rgba(206,168,120,0.26)", brillo: 0.76 };
    if (t < 80) return { nucleo: "216,132,90",  iris: "186,95,68",  halo: "rgba(216,132,90,0.34)",   brillo: 0.9 };
    return        { nucleo: "233,116,84",  iris: "186,95,68",  halo: "rgba(233,116,84,0.44)",   brillo: 1.1 };
  };

  Ojo.prototype.medir = function () {
    var r = this.c.getBoundingClientRect();
    this.w = r.width || 320;
    this.h = r.height || 320;
    this.c.width = Math.floor(this.w * this.dpr);
    this.c.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  // ── Anillos de la pupila. Un iris de verdad tiene muchos, y son lo que hace
  //    que un circulo se lea como un ojo y no como un boton. ──────────────────
  Ojo.prototype.irisAnillos = function (R, pal) {
    var ctx = this.ctx;
    var g = ctx.createRadialGradient(0, -R * 0.1, R * 0.05, 0, 0, R);
    g.addColorStop(0.00, "rgba(" + pal.nucleo + ",0.95)");
    g.addColorStop(0.30, "rgba(" + pal.nucleo + ",0.55)");
    g.addColorStop(0.46, "rgba(" + pal.iris + ",0.85)");
    g.addColorStop(0.72, "rgba(" + pal.iris + ",0.55)");
    g.addColorStop(0.92, "rgba(" + pal.iris + ",0.28)");
    g.addColorStop(1.00, "rgba(11,13,15,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // Fibras radiales. 54 lineitas cortas, giradas un poco: dan la direccion
    // desde la que mira, y es lo que mas se nota cuando se mueve.
    ctx.save();
    ctx.rotate(this.t * 0.02);
    ctx.strokeStyle = "rgba(" + pal.nucleo + ",0.20)";
    ctx.lineWidth = 0.8;
    for (var i = 0; i < 54; i++) {
      var a = (i / 54) * Math.PI * 2;
      var r0 = R * (0.47 + Math.abs(Math.sin(i * 2.7)) * 0.06);
      var r1 = R * (0.86 + Math.sin(i * 1.9) * 0.09);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  };

  Ojo.prototype.paso = function (dt) {
    this.t += dt;
    var ctx = this.ctx;

    // ── Mirada: la pupila va hacia el raton, con inercia. Sin inercia parece
    //    un etiqueta pegada al cursor; con ella, que te esta mirando.
    var mx = 0, my = 0;
    if (this.raton.dentro) {
      mx = (this.raton.x - this.w / 2) / (this.w / 2);
      my = (this.raton.y - this.h / 2) / (this.h / 2);
      // Cuanto mas cerca del ojo, mas se abre la pupila.
      var d = Math.sqrt(mx * mx + my * my);
      this.raton.activa += ((d < 0.9 ? 1 : 0) - this.raton.activa) * Math.min(1, dt * 3.2);
    } else {
      this.raton.activa += (0 - this.raton.activa) * Math.min(1, dt * 2.2);
    }
    this.mirada.x += (mx * 0.30 - this.mirada.x) * Math.min(1, dt * 5);
    this.mirada.y += (my * 0.20 - this.mirada.y) * Math.min(1, dt * 5);

    // ── Parpadeo. A intervalos irregulares, con el cierre dos veces mas rapido
    //    que la apertura: un parpadeo real no es simetrico.
    this.parpadeoEn -= dt;
    if (this.parpadeoEn <= 0) {
      this.parpadeo = 0.0001;
      this.parpadeoEn = 2.6 + Math.random() * 5;
    }
    if (this.parpadeo > 0) {
      this.parpadeo += dt * (this.parpadeo < 0.5 ? 13 : 8);
      if (this.parpadeo >= 1) this.parpadeo = 0;
    }

    // ── Ondas
    var i;
    for (i = this.onda.length - 1; i >= 0; i--) {
      this.onda[i].r += this.onda[i].v * dt;
      this.onda[i].a -= dt * 0.55;
      if (this.onda[i].a <= 0) this.onda.splice(i, 1);
    }
    if (this.golpe) {
      this.golpe.vida -= dt;
      if (this.golpe.vida <= 0) this.golpe = null;
    }
  };

  Ojo.prototype.dibujar = function () {
    var ctx = this.ctx, pal = this.paleta();
    var cx = this.w / 2, cy = this.h / 2;
    var base = Math.min(this.w, this.h) * 0.27;
    var abierto = 1 - this.parpadeo;
    var R = base * (1 + this.raton.activa * 0.06);   // se abre un pelo al mirarlo
    var breathe = 1 + Math.sin(this.t * 0.7) * 0.012;
    R *= breathe;

    ctx.clearRect(0, 0, this.w, this.h);

    // ── Halo. Va en 'lighter': es luz, no una mancha de color.
    //
    // El radio exterior llega hasta la esquina. Antes se quedaba corto, a
    // 3.4 radios, y como el lienzo es cuadrado se veía un rectangulo con las
    // esquinas iluminadas y un borde recto: la caja del canvas delatada.
    ctx.globalCompositeOperation = "lighter";
    var lejos = Math.hypot(this.w, this.h) / 2 + 2;
    var b = pal.brillo;
    var halo = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, lejos);
    halo.addColorStop(0.00, "rgba(" + pal.nucleo + "," + (0.30 * b).toFixed(3) + ")");
    halo.addColorStop(0.08, "rgba(" + pal.nucleo + "," + (0.16 * b).toFixed(3) + ")");
    halo.addColorStop(0.26, "rgba(" + pal.iris + "," + (0.055 * b).toFixed(3) + ")");
    halo.addColorStop(0.55, "rgba(" + pal.iris + "," + (0.012 * b).toFixed(3) + ")");
    halo.addColorStop(1.00, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, this.w, this.h);

    // ── Ondas
    var i;
    for (i = 0; i < this.onda.length; i++) {
      var o = this.onda[i];
      ctx.strokeStyle = "rgba(" + pal.nucleo + "," + Math.max(0, o.a * 0.5).toFixed(3) + ")";
      ctx.lineWidth = 1.4 * o.a + 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // ── Esclera: almendra muy tenue. Sin ella el iris flota en el negro y
    //    parece un planeta; con ella, se lee como un ojo.
    ctx.save();
    ctx.translate(cx, cy);
    var AL = R * 2.05, AH = R * 1.02 * abierto + 0.001;
    ctx.beginPath();
    ctx.moveTo(-AL, 0);
    ctx.quadraticCurveTo(0, -AH * 1.28, AL, 0);
    ctx.quadraticCurveTo(0, AH * 1.28, -AL, 0);
    ctx.closePath();
    ctx.clip();
    // La esclera es MAS CLARA que el fondo, no mas oscura. Con un relleno
    // oscuro salian dos cunas negras a los lados del iris y el ojo parecia
    // una mascara.
    var gradEs = ctx.createLinearGradient(0, -AH * 1.3, 0, AH * 1.3);
    gradEs.addColorStop(0, "rgba(126,156,172,0.13)");
    gradEs.addColorStop(0.5, "rgba(88,116,132,0.09)");
    gradEs.addColorStop(1, "rgba(58,80,94,0.14)");
    ctx.fillStyle = gradEs;
    ctx.fillRect(-AL - 2, -AH * 1.5, AL * 2 + 4, AH * 3);

    // ── Iris y pupila, desplazados hacia donde miras.
    ctx.save();
    ctx.translate(this.mirada.x * R, this.mirada.y * R);
    var cerrar = abierto;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.02, R * 1.02 * (0.12 + cerrar * 0.88), 0, 0, Math.PI * 2);
    ctx.clip();
    this.irisAnillos(R, pal);

    // Pupila. Se contrae con la luz, como la de verdad: al mirar de cerca se
    // hace mas pequena.
    var pr = R * (0.34 - this.raton.activa * 0.055);
    // El borde de la pupila no es negro puro: tiene un aro del color del iris
    // difuminado. Con negro plano se leia como un agujero.
    var pg = ctx.createRadialGradient(0, 0, pr * 0.45, 0, 0, pr);
    pg.addColorStop(0, "rgba(4,5,7,0.96)");
    pg.addColorStop(0.82, "rgba(6,8,11,0.90)");
    pg.addColorStop(1, "rgba(" + pal.iris + ",0.55)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();

    // Nucleo: la luz de dentro de la pupila. Ancha y difusa; antes era un
    // punto tan pequeno que parecia una burbuja pegada al centro.
    var nc = ctx.createRadialGradient(0, 0, 0, 0, 0, pr * 1.5);
    nc.addColorStop(0.00, "rgba(" + pal.nucleo + "," + (0.78 * b).toFixed(2) + ")");
    nc.addColorStop(0.28, "rgba(" + pal.nucleo + "," + (0.34 * b).toFixed(2) + ")");
    nc.addColorStop(0.60, "rgba(" + pal.nucleo + "," + (0.10 * b).toFixed(2) + ")");
    nc.addColorStop(1.00, "rgba(" + pal.nucleo + ",0)");
    ctx.fillStyle = nc;
    ctx.beginPath();
    ctx.arc(0, 0, pr * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Brillo especular: fuera de la pupila. Adentro parecian burbujas de aire.
    var sp = ctx.createRadialGradient(-R * 0.42, -R * 0.44, 0, -R * 0.42, -R * 0.44, R * 0.30);
    sp.addColorStop(0, "rgba(216,232,240,0.32)");
    sp.addColorStop(0.45, "rgba(216,232,240,0.10)");
    sp.addColorStop(1, "rgba(216,232,240,0)");
    ctx.fillStyle = sp;
    ctx.beginPath();
    ctx.arc(-R * 0.42, -R * 0.44, R * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(216,232,240,0.12)";
    ctx.beginPath();
    ctx.arc(R * 0.30, R * 0.36, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // ── Párpados y borde. El borde de abajo lleva un filo de oxido, que es el
    //    filo de luz que tiene el ojo de tu wallpaper.
    if (cerrar < 0.995) {
      ctx.strokeStyle = "rgba(" + pal.iris + ",0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-AL, 0);
      ctx.quadraticCurveTo(0, -AH * 1.28, AL, 0);
      ctx.stroke();
      ctx.strokeStyle = "rgba(" + pal.nucleo + ",0.42)";
      ctx.beginPath();
      ctx.moveTo(-AL, 0);
      ctx.quadraticCurveTo(0, AH * 1.28, AL, 0);
      ctx.stroke();
    }

    // Pestana superior: cuando el ojo esta casi cerrado, baja desde arriba.
    if (cerrar < 0.94) {
      var alto = (1 - cerrar) * AH * 2.56;
      ctx.fillStyle = "rgba(11,13,15,0.97)";
      ctx.beginPath();
      ctx.moveTo(-AL - 2, -AH * 1.3);
      ctx.lineTo(AL + 2, -AH * 1.3);
      ctx.lineTo(AL + 2, -AH * 1.3 + alto);
      ctx.quadraticCurveTo(0, -AH * 1.3 + alto + AH * 0.22, -AL - 2, -AH * 1.3 + alto);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── Destello del pinchazo
    if (this.golpe) {
      var f = this.golpe.vida / this.golpe.max;
      ctx.globalCompositeOperation = "lighter";
      var gb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(lejos, R * 4 * (1.2 - f) + R));
      gb.addColorStop(0, "rgba(" + pal.nucleo + "," + (0.30 * f).toFixed(3) + ")");
      gb.addColorStop(0.5, "rgba(" + pal.nucleo + "," + (0.07 * f).toFixed(3) + ")");
      gb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gb;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalCompositeOperation = "source-over";
    }
  };

  // Con prefers-reduced-motion el ojo se dibuja una vez y se queda quieto: no
  // parpadea, no respira y no hay ondas. Eso que es movimiento no pedido, que
  // es justo lo que esa opcion viene a quitar. La pupila sigue siguiendo al
  // raton, porque eso si es respuesta a lo que hace la persona.
  Ojo.prototype.anima = function (ms) {
    var self = this;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.quieto = true;
      this.dibujar();
      this.c.addEventListener("mousemove", function () { self.dibujar(); });
      return;
    }
    var ult = ms;
    function bucle(x) {
      var dt = Math.min(0.05, (x - ult) / 1000 || 0.016);
      ult = x;
      self.paso(dt);
      self.dibujar();
      requestAnimationFrame(bucle);
    }
    requestAnimationFrame(bucle);
  };

  function montar(canvas, temp) {
    if (!canvas) return null;
    var o = new Ojo(canvas, temp);
    canvas.addEventListener("mousemove", function (ev) {
      var r = canvas.getBoundingClientRect();
      o.raton.x = ev.clientX - r.left;
      o.raton.y = ev.clientY - r.top;
      o.raton.dentro = true;
    });
    canvas.addEventListener("mouseleave", function () { o.raton.dentro = false; });
    canvas.addEventListener("click", function () {
      if (!o.quieto) { o.onda.push({ r: o.min || 40, v: 420, a: 1 }); o.golpe = { vida: 0.5, max: 0.5 }; }
    });
    // Con el teclado tambien: el sitio tiene que responder sin raton.
    canvas.setAttribute("tabindex", "0");
    canvas.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        o.onda.push({ r: o.min || 40, v: 420, a: 1 });
        o.golpe = { vida: 0.5, max: 0.5 };
      }
    });
    window.addEventListener("resize", function () { o.medir(); });
    o.anima(performance.now());
    o.min = Math.min(o.w, o.h) * 0.27;
    return o;
  }

  window.RHYTHM_OJO = { montar: montar };
})();