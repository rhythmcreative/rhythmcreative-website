#!/usr/bin/env python3
"""Prepara la foto del angel en capas, para que la pagina tenga profundidad.

De una sola foto sale una imagen plana. Aqui se saca en tres piezas que se
mueven a distinta velocidad con el raton, que es lo que hace que un fondo se
sepa de una figura:

    fondo.webp    la escena sin el angel, oscura y desenfocada. Lo de atras
    angel.webp    la figura con las alas, recortada y con canal alfa. Lo de delante
    velo.png      las bandas de niebla. Lo de en medio

Y el recorte lo hace el navegador en dos capas mas, con el raton y con el
raton-oxigeno.

De donde sale el recorte
-----------------------
El angel es oscuro contra una niebla clara arriba, asi que en la mitad de arriba
un umbral de gris lo separa bien. Abajo NO: la tumba y la hierba tambien son
oscuras, y ahi el umbral se comeria el cementerio entero. Por eso el recorte se
limita a la banda de arriba y la base se queda en el fondo, que es donde de
verdad esta.

Sin scipy ni rembg, que no estan: la morfologia va con los filtros de PIL, la
componente conexa con ImageDraw.floodfill, y el relleno de la figura en el
fondo es una difusion: se va difuminando lo que hay dentro del recorte, dejando
intacto lo de fuera, hasta que se convierte en niebla suave.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.expanduser("~/Pictures/Wallpapers/Angel.jpg")
DESTINO = os.path.join(AQUI, "assets")

ANCHO = 2000          # de trabajo


def abrir():
    im = Image.open(ORIGEN).convert("RGB")
    if im.width < ANCHO:
        im = im.resize((ANCHO, round(im.height * ANCHO / im.width)), Image.LANCZOS)
    return im


def difuminar(arr):
    """Box blur 3x3 con numpy, para la difusion del relleno."""
    a = np.pad(arr, ((1, 1), (1, 1), (0, 0)), mode="edge")
    s = np.zeros_like(arr, dtype=np.float32)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            s += a[dy:dy + arr.shape[0], dx:dx + arr.shape[1]]
    return s / 9.0


def recorte_angel(im):
    """Mascara de la figura: alas, cuerpo y la coronacion del mausoleo."""
    W, H = im.size
    gris = np.asarray(im.convert("L"), dtype=np.float32)

    y = np.arange(H, dtype=np.float32)[:, None]
    banda_alta = y < H * 0.72
    # El umbral se ensancha al bajar: 118 arriba, donde hay niebla detras, y 62
    # abajo, donde casi todo lo oscuro ya es parte de la figura o del mausoleo.
    umbral = 118.0 - (y / H) * 56.0
    mask = (gris < umbral) & banda_alta

    m = Image.fromarray((mask * 255).astype(np.uint8), "L")
    # Cerrar huecos entre plumas: sin esto las alas salen rasgadas.
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    # Abrir: las ramas mojadas de la izquierda y las cruces de la derecha son
    # oscuras y tocaban el ala, asi que se colaban en el recorte. Son finas, y
    # una apertura las corta; el ala es gruesa y no le pasa nada.
    m = m.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))

    # Quedarse con la componente conexa grande: descarta el arbol mojado de la
    # izquierda y los cruces del fondo, que tambien son oscuros.
    px = m.load()
    W2, H2 = m.size
    semilla = None
    for intento in range(60):
        yy = int(H2 * (0.42 + intento * 0.006))
        xx = int(W2 * 0.50)
        if 0 <= yy < H2 and px[xx, yy] > 200:
            semilla = (xx, yy)
            break
    if semilla is None:
        return None
    ImageDraw.floodfill(m, semilla, 255, thresh=120)

    # Difuminar: un borde de 2 px es lo que hace que no se vea el recorte.
    m = m.filter(ImageFilter.GaussianBlur(2.4))

    # Caida vertical: el angel se disuelve hacia abajo en la niebla en vez de
    # acabar en un corte recto encima del mausoleo.
    arr = np.asarray(m, dtype=np.float32) / 255.0
    caida = np.ones(H2, dtype=np.float32)
    ini = int(H2 * 0.58)
    caida[ini:] = np.linspace(1.0, 0.0, H2 - ini, dtype=np.float32) ** 1.4
    arr *= caida[:, None]
    return Image.fromarray((arr * 255).astype(np.uint8), "L")


def rellenar_niebla(im, mascara):
    """La escena con la figura borrada, rellena de niebla.

    Esto se ha probado de tres formas y solo una sale bien:

    1. Difusion desde la foto. Las alas son oscuras, el oscuro se arrastra
       hacia dentro, y la figura no desaparece: solo se emborrona.
    2. Interpolacion por filas. La niebla esta arriba, no a los lados, asi que
       en las filas donde el ala llega al borde no hay nada que poner a la
       izquierda y sale un rayado horizontal de kilometros.
    3. Interpolacion por columnas. Lo mismo al reves: el borde del ala es
       irregular, y cada columna sale con un brillo distinto. Rayado vertical.

    La que funciona es la primera, pero disgando el relleno. La clave esta en
    la inicializacion: en vez de partir de la foto, que dentro de la mascara es
    la figura oscura, se parte del color DEL CIELO, medido justo encima de las
    alas. Ahi lo que hay dentro es niebla clara, y al difundir sale una niebla suave
    que encaja con el borde. Es literalmente lo que haria un mate de niebla.
    """
    W, H = im.size
    base = np.asarray(im, dtype=np.float32)
    hueco = np.asarray(mascara, dtype=np.float32) / 255.0
    dentro = hueco > 0.5

    if not dentro.any():
        return im

    # El color con el que se empieza a rellenar NO es uno solo para toda la
    # imagen: es, en cada columna, el pixel de niebla que hay justo por encima
    # de la figura. Con un gris medio la niebla salia demasiado clara y se leia
    # como un agujero recortado; con el color de cada columna, el relleno se
    # parece a la niebla que hay detras de las alas en ese punto.
    techo = np.flatnonzero(dentro.any(axis=1))[0]
    techo = max(1, int(techo) - 4)
    color = np.empty((H, W, 3), dtype=np.float32)
    for x in range(W):
        col = np.flatnonzero(dentro[:, x])
        arriba = int(col[0]) - 1 if col.size else 0
        color[:, x] = base[max(0, arriba), x]

    # A media resolucion: la niebla es suave, no se gana nada con 2000 de ancho.
    f = 2
    w2, h2 = W // f, H // f
    dentro_s = dentro[::f, ::f][:h2, :w2]
    conocido = ~dentro_s
    if not dentro_s.any() or not conocido.any():
        return im

    base_s = base[::f, ::f][:h2, :w2]
    color_s = color[::f, ::f][:h2, :w2]

    # Convolution normalizada: se difunden a la vez la imagen y una mascara
    # (1 fuera de la figura, 0 dentro), y se divide una por otra.
    #
    # El truco esta en lo que se devuelve en cada paso. Se 曾 puede poner a cero
    # lo de fuera y dividir al final: sale un aro negro justo en el borde, que
    # es el fallo que hacia antes. Lo de fuera tiene que conservar su valor
    # real, porque es el dato que manda; lo de dentro es lo que se interpola.
    cur = base_s.copy()
    cur[dentro_s] = color_s[dentro_s]
    peso = conocido.astype(np.float32)

    for _ in range(500):
        cur = difuminar(cur)
        cur[conocido] = base_s[conocido]
        peso = difuminar(peso[..., None])[..., 0]
        peso[conocido] = 1.0

    niebla = cur / np.clip(peso, 1e-4, None)[..., None]

    # La niebla de relleno sale con el brillo del cielo, que es lo mas claro de
    # la foto, y por eso se leia como un agujero. Se baja un poco y se le mete un
    # degradado vertical: la niebla se espesa y se oscurece al bajar.
    # Se aplica al tamano de la malla pequena, que es donde se ha calculado.
    vertical = np.linspace(0.86, 0.62, niebla.shape[0], dtype=np.float32)[:, None, None]
    niebla = niebla * vertical
    rell = Image.fromarray(
        np.clip(niebla, 0, 255).astype(np.uint8), "RGB").resize((W, H), Image.BICUBIC)

    # El relleno se come bastante mas alla del recorte. El umbral de gris corta
    # el ala en seco, pero el ala de verdad tiene una plush de quince o veinte
    # pixels que se va deshaciendo en la niebla. Si el relleno se queda en el
    # umbral, esa plush se queda fuera y sale un aro oscuro rodeando la niebla
    # clara, que es justo lo que se veia.
    grande = Image.fromarray((dentro * 255).astype(np.uint8), "L")
    grande = grande.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.MinFilter(31))
    grande = grande.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(15))
    grande = grande.filter(ImageFilter.GaussianBlur(9.0))
    a = (np.asarray(grande, dtype=np.float32) / 255.0)[..., None]
    a = a * a * (3 - 2 * a)          # suave, para que no haya costura
    salida = base * (1 - a) + np.asarray(rell, dtype=np.float32) * a
    im2 = Image.fromarray(np.clip(salida, 0, 255).astype(np.uint8), "RGB")
    # Desenfoque de fondo: la capa de atras tiene que estar desenfocada, o se
    # nota que le falta el angel.
    return im2.filter(ImageFilter.GaussianBlur(6.0))


def velo(W, H):
    """Las bandas de niebla, en blanco con alfa, para poner entre capas."""
    n = np.zeros((H, W), dtype=np.float32)
    rng = np.random.default_rng(7)
    for _ in range(16):
        y0 = rng.uniform(0.12, 0.94) * H
        alto = rng.uniform(0.035, 0.13) * H
        amp = rng.uniform(0.10, 0.30)
        # Cada banda ondula un poco con la x, para que no salga en bandas rectas.
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
    im = abrir()
    W, H = im.size
    print("origen:", W, "x", H)

    mascara = recorte_angel(im)
    if mascara is None:
        print("no se ha podido recortar la figura")
        return 1

    # ── la figura, recortada ────────────────────────────────────────────────
    angel = im.copy()
    angel.putalpha(mascara)
    angel.save(os.path.join(DESTINO, "angel.webp"), "WEBP", quality=90, method=6)
    print("angel.webp   recorte: %.1f%% de la imagen" %
          (float(np.asarray(mascara).mean() / 255.0) * 100))

    # ── el fondo: la escena sin la figura ──────────────────────────────────
    fondo = rellenar_niebla(im, mascara)
    fondo = fondo.filter(ImageFilter.GaussianBlur(2.0))
    fondo = ImageEnhance.Color(fondo).enhance(0.72)
    fondo = ImageEnhance.Brightness(fondo).enhance(0.62)
    fondo = ImageEnhance.Contrast(fondo).enhance(0.88)
    # Azul de noche, el mismo tono que el pywal de la pagina.
    azul = Image.new("RGB", fondo.size, (24, 40, 52))
    fondo = Image.blend(fondo, azul, 0.22)
    fondo.save(os.path.join(DESTINO, "fondo.webp"), "WEBP", quality=86, method=6)
    print("fondo.webp   escena sin la figura, nitida y fria")

    # ── la niebla de en medio ──────────────────────────────────────────────
    # A media resolucion y en webp: es una niebla suave, y a 2000 de ancho en
    # PNGPesaba 145 KB para nada.
    velo(W // 2, H // 2).save(os.path.join(DESTINO, "velo.webp"), "WEBP",
                             quality=72, method=6)
    print("velo.webp    bandas de niebla %dx%d" % (W // 2, H // 2))

    # ── el primer plano ───────────────────────────────────────────────────
    # La franja de abajo de la foto: los escalones, la hierba de delante y las
    # cruces. Ahi no llega el ala, asi que sale entera y de verdad esta mas
    # cerca que todo lo demas. Sobredimensionada en la pagina, se separa del
    # fondo al mover el raton, y es la que mas se mueve.
    franja = im.crop((0, int(H * 0.66), W, H))
    franja = ImageEnhance.Brightness(franja).enhance(0.62)
    franja = ImageEnhance.Color(franja).enhance(0.7)
    franja = Image.blend(franja, Image.new("RGB", franja.size, (18, 30, 40)), 0.26)
    franja.save(os.path.join(DESTINO, "frente.webp"), "WEBP", quality=84, method=6)
    print("frente.webp  primer plano, %dx%d" % franja.size)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())