#!/usr/bin/env python3
"""Prepara las capas del campo a partir de las dos imagenes.

    A.png                 el angel, ya recortado y con el damero PINTADO
    Angel-Photoroom.png   el cementerio con niebla

Salen cuatro capas en assets/, que se mueven a distinta velocidad con el raton:

    fondo.webp    el cementerio, desenfocado y frio. Lo de atras
    angel.webp    la figura con las alas, con canal alfa. Lo de delante
    velo.webp     las bandas de niebla. Lo de en medio
    frente.webp   la franja de abajo, el primer plano

Y ademas assets/capa-datos.js, con el tamano de la foto y donde cae el halo, que
es lo unico que el navegador no puede deducir por si solo.

Que esto sea mucho mas facil que antes
--------------------------------------
La foto anterior traia al angel DENTRO, y elannotated trabajo era quitarlo del
fondo: seis formas de rellenarlo y cinco fallaban. Aqui son dos imagenes
distintas y no hay nada que rellenar.

Lo unico que hay que quitar es el damero, y sale regalado: el histograma de A.png
es bimodal y con un hueco enorme entre medias. El angel esta por debajo de 85 y
el damero por encima de 244, sin un solo pixel en medio, asi que la mascara es
un umbral y no una aproximacion. No hace falta ni connected components ni
descontaminacion de color.
"""
import os

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN_ANGEL = os.path.expanduser("~/Downloads/A.png")
ORIGEN_FONDO = os.path.expanduser("~/Downloads/Angel-Photoroom.png")
DESTINO = os.path.join(AQUI, "assets")

ANCHO = 2000

# Umbral del damero. A 160 esta en mitad del hueco entre los dos modos, que va
# de 85 a 244: cualquier valor entre 120 y 200 da el mismo recorte.
UMBRAL_DAMERO = 160

# Donde cae el halo en la foto, en fracciones. Se midio en el fichero, no a ojo:
# el anillo de la cabeza ocupa y de 0.070 a 0.106, y de x 0.472 a 0.535.
HALO_X, HALO_Y, HALO_R = 0.5035, 0.088, 0.032


def abrir(ruta, ancho):
    im = Image.open(ruta).convert("RGB")
    if im.width != ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    return im


def sacar_angel(im):
    """El angel con canal alfa, sin el damero."""
    W, H = im.size
    gris = np.asarray(im.convert("L"), dtype=np.float32)

    # El damero se va con un umbral, pero el umbral solo no basta, y el motivo es
    # que el BORDE del recorte ya esta sucio. En A.png el ultimo pixel del ala es
    # una mezcla de pluma oscura y damero claro: un gris claro que se va con el
    # damero. Alrededor de toda la silueta hay una orla de esos pixeles.
    #
    # Si el alfa se difumina ahi, la caida mezcla ese gris claro sobre el fondo
    # oscuro, y sale un filo luminoso rodeando las alas. Parecia un halo y no lo
    # era: era la contaminación del recorte.
    #
    # Por eso se MUERDE el borde antes de nada: dos pixeles de erosión se comen
    # la orla y dejan la caida dentro de la figura, donde los pixeles son de
    # verdad del angel. El recorte queda un pixel mas estrecho, que a este
    # tamano no se ve, y a cambio el borde se desvanece en el color correcto.
    alfa = Image.fromarray(
        np.where(gris < UMBRAL_DAMERO, 255.0, 0.0).astype(np.uint8), "L")
    alfa = alfa.filter(ImageFilter.MinFilter(5))       # -{2 px} de orla
    alfa = alfa.filter(ImageFilter.MaxFilter(3))       # +{1 px}, para no comerse
    a = alfa.filter(ImageFilter.GaussianBlur(1.2))

    # Tono: la figura viene mas clara y mas neutra que el cementerio, y si se deja
    # asi parece pegada encima. Se baja un poco y se tira a frio, que es el aire
    # de la escena. Un 12% hacia el azul de la niebla: lo justo para que se lea
    # detras del velo y no delante.
    rgb = np.asarray(im, dtype=np.float32)
    rgb = rgb * 0.90
    rgb = rgb * (1 - 0.12) + np.array([58.0, 76.0, 88.0]) * 0.12
    salida = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    salida.putalpha(a)
    return salida


def velo(W, H):
    """Bandas de niebla, en blanco con alfa, para poner entre capas."""
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

    if not os.path.exists(ORIGEN_ANGEL) or not os.path.exists(ORIGEN_FONDO):
        print("faltan las imagenes de origen en ~/Downloads/")
        return 1

    angel = abrir(ORIGEN_ANGEL, ANCHO)
    fondo = abrir(ORIGEN_FONDO, ANCHO)
    W, H = angel.size
    print("angel %dx%d   fondo %dx%d" % (angel.width, angel.height,
                                        fondo.width, fondo.height))
    if fondo.size != angel.size:
        fondo = fondo.resize(angel.size, Image.LANCZOS)

    # ── la figura ────────────────────────────────────────────────────────────
    angel = sacar_angel(angel)
    angel.save(os.path.join(DESTINO, "angel.webp"), "WEBP", quality=92, method=6)
    opaco = float(np.asarray(angel.split()[-1], dtype=np.float32).mean() / 255.0)
    print("angel.webp    opaco en %.1f%% de la imagen" % (opaco * 100))

    # ── el fondo ─────────────────────────────────────────────────────────────
    # Desenfoque de fondo. No por estilo: es la profundidad de campo. La figura
    # va nitida y el cementerio no, y eso ya separa los dos planos aunque las
    # capas no se muevan.
    f = fondo.filter(ImageFilter.GaussianBlur(5.0))
    f = ImageEnhance.Color(f).enhance(0.80)
    f = ImageEnhance.Brightness(f).enhance(0.66)
    f = ImageEnhance.Contrast(f).enhance(0.92)
    # Azul de noche, el mismo tono que el pywal de la pagina.
    f = Image.blend(f, Image.new("RGB", f.size, (26, 42, 54)), 0.24)
    f.save(os.path.join(DESTINO, "fondo.webp"), "WEBP", quality=86, method=6)
    print("fondo.webp    cementerio, desenfocado y frio")

    # ── la niebla de en medio ───────────────────────────────────────────────
    # A media resolucion: es una niebla suave, y a ancho completo en PNG pesaba
    # 145 KB para nada.
    velo(W // 2, H // 2).save(os.path.join(DESTINO, "velo.webp"), "WEBP",
                              quality=72, method=6)
    print("velo.webp     bandas de niebla %dx%d" % (W // 2, H // 2))

    # ── el primer plano ───────────────────────────────────────────────────
    # La franja de abajo: el suelo mojado, la hierba y las lapidas de delante.
    # Sobredimensionada en la pagina, se separa del fondo al mover el raton, y es
    # la capa que mas se mueve.
    franja = fondo.crop((0, int(H * 0.58), W, H))
    franja = ImageEnhance.Brightness(franja).enhance(0.60)
    franja = ImageEnhance.Color(franja).enhance(0.72)
    franja = Image.blend(franja, Image.new("RGB", franja.size, (18, 30, 40)), 0.26)
    franja.save(os.path.join(DESTINO, "frente.webp"), "WEBP", quality=84, method=6)
    print("frente.webp   primer plano, %dx%d" % franja.size)

    # ── los numeros que el navegador no puede saber ────────────────────────
    with open(os.path.join(DESTINO, "capa-datos.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generado por scripts/preparar-angel.py. No editar a mano.\n")
        fh.write("window.RHYTHM_CAPA_TAM = {\n")
        fh.write("  w: %d,\n  h: %d,\n" % (W, H))
        fh.write("  halo: { x: %.4f, y: %.4f, r: %.4f }\n" % (HALO_X, HALO_Y, HALO_R))
        fh.write("};\n")
    print("capa-datos.js %dx%d, halo en (%.3f, %.3f)" % (W, H, HALO_X, HALO_Y))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())