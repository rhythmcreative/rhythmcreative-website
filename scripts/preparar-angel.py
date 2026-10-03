#!/usr/bin/env python3
"""Prepara las capas del campo. Dos temas: uno blanco y otro negro.

De donde sale cada imagen
-------------------------
    Fondo gotico con profundidad claro .png     el cementerio, a color
    Fondo gotico con profundidad claro 1.png    el angel en blanco y negro
    A.png                                       el angel a color, con damero

Salen DOS juegos de capas, y la pagina elige uno u otro con el boton del sol y
la luna:

    fondo-oscuro.webp  angel-oscuro.webp  frente-oscuro.webp   tema negro
    fondo-claro.webp   angel-claro.webp   frente-claro.webp    tema blanco
    aro-claro.webp                                           el aro, solo

Los dos temas son MONOCROMOS. La version que habia antes era un gris oscuro que
no era ni blanco ni negro, con los azules y los verdes todavia dentro.

Que el angel a color venga con el damero PINTADO en los pixeles no estorba: su
histograma es bimodal con un hueco enorme entre medias, el angel esta por debajo
de 85 y el damero por encima de 244, sin un pixel en medio. Asi que la mascara es
un umbral y no una aproximacion.

El de blanco y negro es mas dificil: es marfil de 200 a 245 sobre blanco de 250
a 255, con la madera entre los dos, sin hueco. El angel del tema BLANCO es ese,
y no se puede recortar por luminancia. Se le pone la mascara del recorte a color,
que es el mismo dibujo y si la tiene, corrigiendo el desplazamiento vertical.
"""
import os

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESCARGA = os.path.expanduser("~/Downloads")
DESTINO = os.path.join(AQUI, "assets")

ANCHO = 2000
ANCHO_PEQUENO = 1100   # la variante para movil

# El mismo cementerio en dos estaciones, que es lo que hay. El del tema negro es
# el de invierno, con niebla y sin hierba, que es el que estaba antes. El del
# tema blanco es el de verano, con la hiedra verde y la luz de la manana.
CEMENTERIO_OSCURO = os.path.join(DESCARGA, "Angel-Photoroom.png")
CEMENTERIO_CLARO = os.path.join(DESCARGA, "Fondo gótico con profundidad claro .png")

# Y los dos angeles: el del tema negro es el recorte a color con el damero, y el
# del tema blanco es el de blanco y negro, que es claro de nacimiento.
ANGEL_OSCURO = os.path.join(DESCARGA, "A.png")
ANGEL_CLARO = os.path.join(DESCARGA, "Fondo gótico con profundidad claro 1.png")

# Umbral del fondo que se quita: el damero en el recorte a color.
UMBRAL_OSCURO = 160

# Donde cae el halo, en fracciones de la foto: centro x, centro y, y los DOS
# semiejes. Medido sobre el perfil de cada foto, no a ojo.
#
# SON DOS SEMIEJES Y NO UN RADIO porque el aro de la foto es una ELIPSE, no un
# circulo: la estatua esta vista de lado y el aro se ve tumbado. Medido sobre
# angel-claro.webp: el anillo va de x 943 a 1070 y de y 87 a 133, o sea 127 por
# 46, un 2,8 a 1. Con un solo radio el dibujo salia CIRCULAR y se quedaba encima de
# la elipse de la foto: dos aros que no coincidian, y al pinchar se encendia el
# equivocado.
#
# Los dos semiejes van en la misma unidad que el radio de antes: x en fracciones
# de W, y en fracciones de H. La y es la que de verdad cambia, porque H es 1133 y
# W son 2000: la misma proporcion en vertical seria casi el doble de alta.
# La Y ES LA MISMA EN LOS DOS: los recortes del angel se cortaron con una regla
# un poco distinta y el aro de cada foto cae 6 px mas abajo en el de blanco y
# negro (0,0971 contra 0,0918). Con la misma y los dos aros quedan a la misma
# altura en pantalla, que es lo que se ve al cambiar de tema. 6 px es nada
# comparado con los 46 px que el aro tiene de alto, asi que sigue encima del aro
# de su foto.
HALO = {
    # centro, semieje en x (de W), semieje en y (de H)
    "oscuro": (0.5040, 0.0918, 0.0305, 0.0221),   # sobre el recorte a color
    "claro":  (0.5030, 0.0918, 0.0315, 0.0203),   # sobre el de blanco y negro
}

# Cuanto de ancho tiene el anillo, como fraccion de la distancia al aro. A 0.34
# el aro ocupa de 0.66 a 1.34: es el grosor que tiene el de la foto, medido
# sobre el perfil radial. Con 0.42 sale un aro de neón, que es lo que pasaba
# antes.
ANCHO_ARO = 0.34

# Cuanto sube o baja el cementerio. Sin esto los dos temas son el mismo gris con
# distinta brillantez, y no se nota el cambio.
SUBIDA_CLARO = 1.40
BAJADA_OSCURO = 0.46


def abrir(ruta, ancho=ANCHO):
    im = Image.open(ruta).convert("RGB")
    if im.width != ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    return im


def mascara_del_color(ruta):
    """La mascara del recorte a color, que sirve para los dos."""
    gris = np.asarray(Image.open(ruta).convert("L").resize(
        (ANCHO, round(Image.open(ruta).height * ANCHO / Image.open(ruta).width)),
        Image.LANCZOS).convert("L"), dtype=np.float32)
    m = Image.fromarray(np.where(gris < UMBRAL_OSCURO, 255.0, 0.0).astype(np.uint8), "L")
    # Morder el borde: el ultimo pixel de la silueta es una mezcla de la figura con
    # el damero. Sin morderlo, al difuminar el alfa la caida mezcla gris claro y
    # sale un filo luminoso rodeando las alas.
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3))
    return m.filter(ImageFilter.GaussianBlur(1.3))


def ajustar(mascara, destino):
    """El desplazamiento vertical que menos fondo deja dentro de la mascara."""
    m = np.asarray(mascara, dtype=np.float32) / 255.0
    gris = np.asarray(destino.convert("L"), dtype=np.float32)
    if gris.shape != m.shape:
        gris = np.asarray(destino.convert("L").resize(mascara.size, Image.LANCZOS),
                          dtype=np.float32)
    dentro = m > 0.5
    if not dentro.any():
        return mascara, 0
    mejor_fondo, mejor_dy = 1e9, 0
    for dy in range(-40, 41):
        d = np.roll(dentro, dy, axis=0)
        if dy > 0:
            d[:dy] = False
        elif dy < 0:
            d[dy:] = False
        if not d.any():
            continue
        fondo = float((gris[d] > 248).mean())
        if fondo < mejor_fondo:
            mejor_fondo, mejor_dy = fondo, dy
    if mejor_dy:
        m = np.roll(m, mejor_dy, axis=0)
        if mejor_dy > 0:
            m[:mejor_dy] = 0.0
        else:
            m[mejor_dy:] = 0.0
    return Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), "L"), mejor_dy


def sacar_angel(im, mascara, tema):
    """El angel recortado y con el tono del tema."""
    a = ajustar(mascara, im)[0]
    if a.size != im.size:
        a = a.resize(im.size, Image.LANCZOS)
    rgb = np.asarray(im, dtype=np.float32)
    if tema == "oscuro":
        # Bajar y tirar a frio: si no, la figura viene mas clara que el fondo y
        # parece pegada encima.
        rgb = rgb * 0.92
        rgb = rgb * (1 - 0.14) + np.array([52.0, 68.0, 80.0]) * 0.14
    salida = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    salida.putalpha(a)
    return salida


def grises(im):
    """Sin color. Los dos temas son monocromos."""
    return im.convert("L").convert("RGB")


def cemetery(ruta, claro):
    f = grises(abrir(ruta))
    f = f.filter(ImageFilter.GaussianBlur(5.0))          # profundidad de campo
    if claro:
        # Ni tan lavado ni tan apagado. A 1.62 con contraste 0.86 el cementerio
        # se iba a casi blanco y se perdian los mausoleos, que es lo unico que
        # le daba estructura. Aqui se quedan: la pagina es clara, pero la foto
        # tiene que seguir teniendo fondo.
        f = ImageEnhance.Brightness(f).enhance(SUBIDA_CLARO)
        f = ImageEnhance.Contrast(f).enhance(1.04)
    else:
        f = ImageEnhance.Brightness(f).enhance(BAJADA_OSCURO)
        f = ImageEnhance.Contrast(f).enhance(1.12)
    return f


def primer_plano(fondo, claro):
    W, H = fondo.size
    franja = fondo.crop((0, int(H * 0.58), W, H))
    if claro:
        franja = ImageEnhance.Brightness(franja).enhance(1.55)
        return ImageEnhance.Color(franja).enhance(1.0)
    return ImageEnhance.Brightness(franja).enhance(0.62)


def velo(W, H):
    """Bandas de niebla. La misma imagen para los dos temas; lo que cambia es
    como se mezcla, y eso lo decide el CSS."""
    n = np.zeros((H, W), dtype=np.float32)
    rng = np.random.default_rng(7)
    for _ in range(16):
        y0 = rng.uniform(0.10, 0.94) * H
        alto = rng.uniform(0.035, 0.13) * H
        amp = rng.uniform(0.10, 0.30)
        fase = rng.uniform(0, 6.28)
        frec = rng.uniform(1.2, 3.4) / W
        xs = np.arange(W, dtype=np.float32)
        perfil = np.exp(-(((np.arange(H, dtype=np.float32)[:, None] - y0) / alto) ** 2))
        n += amp * perfil * (0.72 + 0.28 * np.sin(xs * frec * 6.28 + fase)[None, :])
    n = np.clip(n / n.max(), 0, 1) ** 1.35
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., 0] = 176
    rgba[..., 1] = 190
    rgba[..., 2] = 199
    rgba[..., 3] = (n * 118).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def aro(W, H):
    """SOLO el aro de la cabeza, en su propia capa transparente.

    Va su propia imagen y no un div con un radial-gradient por dos razones.

    La primera es que el aro hay que colocarlo donde esta la cabeza, y eso lo
    sabe el mismo sitio que coloca el halo: el centro y los dos semiejes estan
    medidos en HALO. Un div con un degradado enradial necesita que alguien vuelva
    a escribir esas fracciones en el CSS, y basta con que se desplace un pixel la
    foto para que el aro se quede fuera de su sitio.

    La segunda es el difuminado del borde. Un div con un degradado enradial lo
    resuelve con un solo radio, y este aro no es un circulo: es una elipse tumbada.
    Ademas el borde tiene que quedarse en alfa 0 hacia fuera, que es lo que evita
    que se vea la costura cuando el parallax separa el aro unos pixeles de la foto.
    Eso en un div hay que escribirlo a mano y se nota en cuanto algo se mueve.

    El aro dibuja una ELIPSE con los dos semiejes de HALO, no un circulo: la foto
    lo tiene tumbado y hay que superimposedlo encima. Y no lleva un pelo
    brillante en el borde: el aro de la foto ya es una linea difusa, y aqui el
    pelo lo convertia en un aro de neon dibujado.

    Se dibuja UNA vez, con la geometria de HALO["claro"], porque el aro va solo en
    el tema claro. En el oscuro no hay aro: --aro-min y --aro-alto valen 0 ahi y el
    keyframe del pinchazo los lee, con lo que tampoco se enciende al pinchar.
    """
    x, y, rx, ry = HALO["claro"]
    cx, cy = x * W, y * H
    semi_x, semi_y = rx * W, ry * H

    # Solo se dibuja en el rectangulo del aro y se pega: hacerlo en la imagen
    # entera son 2000x1133 pixeles de float para una elipse de 127 px.
    ancho = int(semi_x * 3.0)
    alto = int(semi_y * 3.0)
    x0, y0 = int(cx - ancho / 2), int(cy - alto / 2)
    yy, xx = np.mgrid[0:alto, 0:ancho]
    # d = 1 es justo la elipse; al ser 0.30 en x y 0.02 en y, esto no se puede
    # hacer con un radio normalizado a un lado y otro, y por eso d va partido.
    d = np.sqrt(((xx - ancho / 2.0) / semi_x) ** 2 + ((yy - alto / 2.0) / semi_y) ** 2)
    # El anillo: 1.0 es el aro medido, y se abre +-ANCHO_ARO a cero.
    t = np.abs(d - 1.0) / ANCHO_ARO
    alfa = np.clip(1.0 - t, 0.0, 1.0) ** 2.2
    # Un pelo de mas en el borde, pero muy suave: lo justo para que se lea como
    # aro y no como mancha, sin el nervio que antes lo hacia de neon.
    alfa = np.clip(alfa + np.exp(-((d - 1.0) / (ANCHO_ARO * 0.55)) ** 2) * 0.10, 0, 1)
    alfa[alfa < 0.004] = 0.0

    # El color va en la imagen y no en un filtro del CSS. Antes seClarificaba con
    # `brightness(0) invert(1)`, que solo tocaba el color y dejaba el alfa; pero el
    # aro blanco sobre el angel en blanco y negro no se veia (medido: el anillo
    # esta en 233 de 255 y con blanco solo sube a 251, 1.0:1). Para aclarar hay
    # que poner el color aqui.
    #
    # Este es el dorado de claro, 232,164,44. A la opacidad que lleva la capa
    # (0.78) el anillo sobre el 233 del fondo queda en 232,179,84: 1.55:1 de
    # contraste, que es lo justo para que se distinga sobre el papel.
    rgb = np.zeros((alto, ancho, 3), dtype=np.float32)
    rgb[..., 0] = 232.0
    rgb[..., 1] = 164.0
    rgb[..., 2] = 44.0

    capa = np.dstack([rgb, alfa * 255.0]).astype(np.uint8)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(Image.fromarray(capa, "RGBA"), (x0, y0))
    return out


def main():
    os.makedirs(DESTINO, exist_ok=True)
    faltan = [r for r in (CEMENTERIO_OSCURO, CEMENTERIO_CLARO,
                        ANGEL_OSCURO, ANGEL_CLARO) if not os.path.exists(r)]
    if faltan:
        print("faltan las imagenes en ~/Downloads:")
        for f in faltan:
            print("   " + f)
        return 1

    mascara = mascara_del_color(ANGEL_OSCURO)
    W = mascara.width
    ref = Image.open(CEMENTERIO_OSCURO)
    H = round(ref.height * W / ref.width)

    for tema, ruta_angel, ruta_fondo, claro in (
            ("oscuro", ANGEL_OSCURO, CEMENTERIO_OSCURO, False),
            ("claro", ANGEL_CLARO, CEMENTERIO_CLARO, True)):
        angel = abrir(ruta_angel, W)
        if angel.height != H:
            angel = angel.resize((W, H), Image.LANCZOS)
        _, dy = ajustar(mascara, angel)
        angel = sacar_angel(angel, mascara, tema)

        # Dos tamanos del angel. El grande va a 2000 px, que es lo que se ve en
        # un monitor. El pequeno va a 1100, que es lo que se ve en un movil, y a
        # 1100 escalado a la caja de un movil no se nota la perdida. Antes se
        # bajaba el mismo fichero de 171 KB tambien al movil.
        #
        # La calidad baja de 92 a 76: con niebla difusa por detras, el halo de
        # 171 KB a 92 no se diferenciaba de 95 KB a 76 ni de lejos.
        grande = os.path.join(DESTINO, "angel-%s.webp" % tema)
        angel.save(grande, "WEBP", quality=76, method=5)
        opaco = float(np.asarray(angel.split()[-1], dtype=np.float32).mean() / 255.0)
        print("%-7s angel-%s.webp  opaco %.1f%%  %.0f KB%s"
              % (tema, tema, opaco * 100,
                 os.path.getsize(grande) / 1024,
                 "  (desplazado %d px)" % dy if dy else ""))

        pequeno = angel.resize((ANCHO_PEQUENO, round(angel.height * ANCHO_PEQUENO / angel.width)),
                                Image.LANCZOS)
        p2 = os.path.join(DESTINO, "angel-%s-p.webp" % tema)
        pequeno.save(p2, "WEBP", quality=74, method=5)
        print("%-7s angel-%s-p.webp  %.0f KB  (el que se baja el movil)"
              % (tema, tema, os.path.getsize(p2) / 1024))

        fondo = cemetery(ruta_fondo, claro)
        fondo.save(os.path.join(DESTINO, "fondo-%s.webp" % tema), "WEBP",
                   quality=86, method=6)
        primer_plano(fondo, claro).save(os.path.join(DESTINO, "frente-%s.webp" % tema),
                                        "WEBP", quality=84, method=6)
        print("%-7s fondo-%s.webp / frente-%s.webp" % (tema, tema, tema))

    # El aro, en su propia capa y UNA SOLA VEZ, fuera del bucle de temas.
    #
    # Va con la foto entera de lienzo y con el radio medido, que es lo que lo hace
    # caer justo en la cabeza sin que haya que colocar nada desde el CSS.
    #
    # Solo se dibuja el de claro porque es el unico que se ve: en el oscuro
    # --aro-min y --aro-alto valen 0. El fondo, el angel y el frente si se hacen
    # por tema, porque esos se ven en los dos.
    capa_aro = aro(W, H)
    ruta_aro = os.path.join(DESTINO, "aro-claro.webp")
    capa_aro.save(ruta_aro, "WEBP", quality=88, method=6)
    print("aro-claro.webp  %.0f KB  (el anillo de la cabeza; en oscuro no va)"
          % (os.path.getsize(ruta_aro) / 1024))

    # El velo a un tercio: es una niebla difusa a la que no se le ve el borde, y
    # a 1000 px de ancho pesaba 26 KB para nada.
    velo(W // 3, H // 3).save(os.path.join(DESTINO, "velo.webp"), "WEBP",
                              quality=60, method=5)
    print("velo.webp  %.0f KB  la misma para los dos temas"
          % (os.path.getsize(os.path.join(DESTINO, "velo.webp")) / 1024))

    with open(os.path.join(DESTINO, "capa-datos.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generado por scripts/preparar-angel.py. No editar a mano.\n")
        fh.write("// origen y el mismo campo que escribe preparar-hero.py, para que los dos\n"
                 "// scripts hablen el mismo idioma y el recolector sepa de donde viene\n"
                 "// la portada. Aqui la foto es fija, asi que no hay de donde comprobar.\n")
        fh.write("window.RHYTHM_CAPA_TAM = {\n")
        fh.write('  origen: "angel",\n')
        fh.write("  w: %d,\n  h: %d,\n" % (W, H))
        # rx es fraccion de W y ry fraccion de H: son semiejes, y el del aro de
        # la foto son 2,8 a 1. Con un solo r, el bloom salia redondo.
        fh.write("  halo: { x: %.4f, y: %.4f, rx: %.4f, ry: %.4f },\n" % HALO["oscuro"])
        fh.write("  haloClaro: { x: %.4f, y: %.4f, rx: %.4f, ry: %.4f }\n" % HALO["claro"])
        fh.write("};\n")
    print("capa-datos.js con las dos posiciones del halo")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())