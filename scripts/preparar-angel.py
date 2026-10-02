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

# Donde cae el halo, en fracciones de la foto. Medido en cada fichero.
HALO = {
    "oscuro": (0.5035, 0.088, 0.032),   # sobre el recorte a color
    "claro": (0.5200, 0.094, 0.030),    # sobre el de blanco y negro
}

# Cuanto sube o baja el cementerio. Sin esto los dos temas son el mismo gris con
# distinta brillantez, y no se nota el cambio.
SUBIDA_CLARO = 1.62
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
        f = ImageEnhance.Brightness(f).enhance(SUBIDA_CLARO)
        f = ImageEnhance.Contrast(f).enhance(0.86)         # las altas se lavan
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
        angel.save(os.path.join(DESTINO, "angel-%s.webp" % tema), "WEBP",
                   quality=92, method=6)
        opaco = float(np.asarray(angel.split()[-1], dtype=np.float32).mean() / 255.0)
        print("%-7s angel-%s.webp  opaco %.1f%%%s"
              % (tema, tema, opaco * 100, "  (desplazado %d px)" % dy if dy else ""))

        fondo = cemetery(ruta_fondo, claro)
        fondo.save(os.path.join(DESTINO, "fondo-%s.webp" % tema), "WEBP",
                   quality=86, method=6)
        primer_plano(fondo, claro).save(os.path.join(DESTINO, "frente-%s.webp" % tema),
                                        "WEBP", quality=84, method=6)
        print("%-7s fondo-%s.webp / frente-%s.webp" % (tema, tema, tema))

    velo(W // 2, H // 2).save(os.path.join(DESTINO, "velo.webp"), "WEBP",
                              quality=72, method=6)
    print("velo.webp  la misma para los dos temas")

    with open(os.path.join(DESTINO, "capa-datos.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generado por scripts/preparar-angel.py. No editar a mano.\n")
        fh.write("window.RHYTHM_CAPA_TAM = {\n  w: %d,\n  h: %d,\n" % (W, H))
        fh.write("  halo: { x: %.4f, y: %.4f, r: %.4f },\n" % HALO["oscuro"])
        fh.write("  haloClaro: { x: %.4f, y: %.4f, r: %.4f }\n" % HALO["claro"])
        fh.write("};\n")
    print("capa-datos.js con las dos posiciones del halo")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())