#!/usr/bin/env python3
"""Prepara las capas del campo. Dos versiones: en color y en blanco y negro.

De donde sale cada una
----------------------
    A.png                                       el angel en color, con damero
    Fondo gotico con profundidad claro .png     el cementerio en color
    Fondo gotico con profundidad claro 1.png    el angel en blanco y negro

Salen dos juegos de capas en assets/, y la pagina elige uno u otro con el boton:

    fondo.webp  angel.webp  frente.webp        en color
    fondo-bn.webp  angel-bn.webp  frente-bn.webp  en blanco y negro
    velo.webp                                       la niebla, en las dos
    capa-datos.js                                   medidas y donde cae el halo

Que el angel en color venga con el damero PINTADO en los pixeles no estorba: su
histograma es bimodal con un hueco enorme entre medias, el angel esta por debajo
de 85 y el damero por encima de 244, sin un pixel en medio. Asi que la mascara es
un umbral y no una aproximacion.

El de blanco y negro es mas dificil: el fondo es blanco (250-255) y el angel es
marfil (200-245), con la madera entre los dos, sin hueco. El umbral va en 246, que
es justo donde acaba el angel y empieza el fondo, y despues se muerde el borde
dos pixeles para que no se contamine.
"""
import os

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESCARGA = os.path.expanduser("~/Downloads")
DESTINO = os.path.join(AQUI, "assets")

ANCHO = 2000

ORIGEN = {
    "color": {
        "angel": os.path.join(DESCARGA, "A.png"),
        "fondo": os.path.join(DESCARGA, "Fondo gótico con profundidad claro .png"),
    },
    "bn": {
        "angel": os.path.join(DESCARGA, "Fondo gótico con profundidad claro 1.png"),
        # El cementerio en blanco y negro no viene: se saca desaturando el de
        # color, que es el mismo sitio con la misma luz.
        "fondo": os.path.join(DESCARGA, "Fondo gótico con profundidad claro .png"),
    },
}

# Umbral del fondo que se quita: el damero en color, el blanco en B/N.
UMBRAL = {"color": 160, "bn": 246}

# Donde cae el halo, en fracciones de la foto. Medido en cada fichero, no a ojo.
HALO = {"color": (0.5035, 0.088, 0.032), "bn": (0.5200, 0.094, 0.030)}


def abrir(ruta, ancho):
    im = Image.open(ruta).convert("RGB")
    if im.width != ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    return im


def mascara_de_color(ruta, destino):
    """La mascara del recorte en color, reutilizable.

    Es la que se usa para el angel en blanco y negro, porque ese NO se puede
    recortar por luminancia: es marfil de 200 a 245 sobre blanco de 250 a 255, y
    entre los dos no hay hueco. Con un umbral se le perforan las plumas claras.
    Los dos ficheros son el mismo dibujo, asi que la mascara del de color sirve.

    Se busca tambien el desplazamiento vertical: los dos ficheros no estan
    exactamente alineados, y sin corregirlo la mascara se sale unos pixeles por
    un lado.
    """
    color = Image.open(ruta).convert("RGB")
    Wc, Hc = color.size
    gris = np.asarray(color.convert("L"), dtype=np.float32)
    m = Image.fromarray(np.where(gris < UMBRAL["color"], 255.0, 0.0).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.3))
    return m


def ajustar_mascara(mascara, bn, modo_destino):
    """Busca el desplazamiento que menos fondo se cuela por dentro."""
    W = mascara.width
    m = np.asarray(mascara, dtype=np.float32) / 255.0
    bn_gris = np.asarray(bn.convert("L"), dtype=np.float32)
    if bn_gris.shape != m.shape:
        bn_gris = np.asarray(bn.convert("L").resize(mascara.size, Image.LANCZOS), dtype=np.float32)
    dentro = m > 0.5
    if not dentro.any():
        return mascara

    mejor, mejor_fondo = 0, 1e9
    for dy in range(-40, 41):
        desplazada = np.roll(dentro, dy, axis=0)
        if dy > 0:
            desplazada[:dy] = False
        elif dy < 0:
            desplazada[dy:] = False
        if not desplazada.any():
            continue
        # Cuanto fondo (blanco, 250-255) se queda dentro de la mascara, menos es
        # mejor: significa que la mascara cae donde toca.
        fondo = float((bn_gris[desplazada] > 248).mean())
        if fondo < mejor_fondo:
            mejor, mejor_fondo = dy, fondo
    if mejor != 0:
        m = np.roll(m, mejor, axis=0)
        if mejor > 0:
            m[:mejor] = 0.0
        else:
            m[mejor:] = 0.0
        print("   mascara desplazada %d px (fueno del fondo dentro: %.2f%%)"
              % (mejor, mejor_fondo * 100))
    return Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), "L")


def sacar_angel(im, modo, mascara_externa=None):
    """El angel con canal alfa, fuera el fondo que tenga detras."""
    gris = np.asarray(im.convert("L"), dtype=np.float32)

    # MORDER el borde antes de nada. En los dos ficheros el ultimo pixel de la
    # silueta es una mezcla de la figura con el fondo: en color, con el damero;
    # en B/N, con el blanco. Alrededor de toda la silueta hay una orla de esos
    # pixeles, y si el alfa se difumina ahi la caida mezcla fondo claro sobre
    # escena oscura y sale un filo luminoso rodeando las alas.
    if mascara_externa is not None:
        a = ajustar_mascara(mascara_externa, im, modo)
        if a.size != im.size:
            a = a.resize(im.size, Image.LANCZOS)
    else:
        alfa = Image.fromarray(
            np.where(gris < UMBRAL[modo], 255.0, 0.0).astype(np.uint8), "L")
        alfa = alfa.filter(ImageFilter.MinFilter(5))
        alfa = alfa.filter(ImageFilter.MaxFilter(3))
        a = alfa.filter(ImageFilter.GaussianBlur(1.3))

    rgb = np.asarray(im, dtype=np.float32)
    if modo == "color":
        # Se baja un poco y se tira a frio: en color la figura viene mas clara y
        # mas neutra que el cementerio, y sin esto parece pegada encima.
        rgb = rgb * 0.90
        rgb = rgb * (1 - 0.12) + np.array([58.0, 76.0, 88.0]) * 0.12
    # En B/N no se toca el color: la version en blanco y negro ya viene clara, y
    # es esa la que hace que resalte contra el fondo oscuro.
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


def graded(fondo, modo):
    """El cementerio, ya sea de fondo."""
    if modo == "bn":
        # Sin desaturar sale con los verdes, y una pagina que se llama blanco y
        # negro con la hierba verde es mentira. El brillo baja bastante: el
        # angel de B/N es marfil claro, y con un fondo claro no se veria.
        f = fondo.convert("L").convert("RGB")
        f = f.filter(ImageFilter.GaussianBlur(5.0))
        f = ImageEnhance.Brightness(f).enhance(0.52)
        f = ImageEnhance.Contrast(f).enhance(1.06)
        return f
    f = fondo.filter(ImageFilter.GaussianBlur(5.0))
    f = ImageEnhance.Color(f).enhance(0.80)
    f = ImageEnhance.Brightness(f).enhance(0.66)
    f = ImageEnhance.Contrast(f).enhance(0.92)
    return Image.blend(f, Image.new("RGB", f.size, (26, 42, 54)), 0.24)


def frente_de(fondo, modo):
    """La franja de abajo: el suelo mojado y las lapidas de delante."""
    W, H = fondo.size
    franja = fondo.crop((0, int(H * 0.58), W, H))
    if modo == "bn":
        franja = ImageEnhance.Brightness(franja).enhance(0.70)
    else:
        franja = ImageEnhance.Brightness(franja).enhance(0.60)
        franja = ImageEnhance.Color(franja).enhance(0.72)
        franja = Image.blend(franja, Image.new("RGB", franja.size, (18, 30, 40)), 0.26)
    return franja


def main():
    os.makedirs(DESTINO, exist_ok=True)

    # El lienzo se mide en la version de color y se le impone al resto. Los dos
    # ficheros del angel tienen proporciones un poco distintas —1133 y 1138 de
    # alto con el mismo ancho— y si cada version midiese la suya, al cambiar de
    # version se moveria todo el encuadre. Forzado, la diferencia es del 0.5% y no
    # se ve, pero el encuadre no salta.
    lienzo = None
    mascara_color = None
    for modo in ("color", "bn"):
        rutas = ORIGEN[modo]
        faltan = [r for r in rutas.values() if not os.path.exists(r)]
        if faltan:
            print("faltan las imagenes de %s:" % modo)
            for f in faltan:
                print("   " + f)
            return 1

        if modo == "bn":
            # La mascara sale del fichero en color, al ancho de trabajo.
            mascara_color = mascara_de_color(ORIGEN["color"]["angel"], None)
            if mascara_color.width != ANCHO:
                mascara_color = mascara_color.resize(
                    (ANCHO, round(mascara_color.height * ANCHO / mascara_color.width)),
                    Image.LANCZOS)

        angel = abrir(rutas["angel"], ANCHO)
        fondo = abrir(rutas["fondo"], ANCHO)
        if fondo.size != angel.size:
            fondo = fondo.resize(angel.size, Image.LANCZOS)
        if lienzo is None:
            lienzo = angel.size
        elif angel.size != lienzo:
            angel = angel.resize(lienzo, Image.LANCZOS)
        sufijo = "" if modo == "color" else "-bn"

        if modo == "bn":
            print("   recortando con la mascara del fichero en color")
        angel = sacar_angel(angel, modo, mascara_color)
        angel.save(os.path.join(DESTINO, "angel%s.webp" % sufijo),
                   "WEBP", quality=92, method=6)
        opaco = float(np.asarray(angel.split()[-1], dtype=np.float32).mean() / 255.0)
        print("%-6s angel%s.webp  %dx%d  opaco %.1f%%"
              % (modo, sufijo, angel.width, angel.height, opaco * 100))

        graded(fondo, modo).save(os.path.join(DESTINO, "fondo%s.webp" % sufijo),
                                 "WEBP", quality=86, method=6)
        frente_de(fondo, modo).save(os.path.join(DESTINO, "frente%s.webp" % sufijo),
                                    "WEBP", quality=84, method=6)
        print("%-6s fondo%s.webp / frente%s.webp" % (modo, sufijo, sufijo))

        if modo == "color":
            W, H = angel.size
            mascara_color = None
            velo(W // 2, H // 2).save(os.path.join(DESTINO, "velo.webp"),
                                      "WEBP", quality=72, method=6)
            print("%-6s velo.webp  la misma en las dos versiones" % modo)

    with open(os.path.join(DESTINO, "capa-datos.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generado por scripts/preparar-angel.py. No editar a mano.\n")
        fh.write("window.RHYTHM_CAPA_TAM = {\n")
        fh.write("  w: %d,\n  h: %d,\n" % (W, H))
        fh.write("  halo: { x: %.4f, y: %.4f, r: %.4f },\n" % HALO["color"])
        fh.write("  haloBn: { x: %.4f, y: %.4f, r: %.4f }\n" % HALO["bn"])
        fh.write("};\n")
    print("capa-datos.js con las dos posiciones del halo")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())