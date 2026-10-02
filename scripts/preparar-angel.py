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
    """Dos mascaras de la figura: el nucleo y el borde.

    Nucleo es donde la figura es solida. Borde es el nucleo 8 px mas ancho, con
    7 px de caida: la plush que tiene el ala de verdad al deshacerse en la
    niebla.

    Antes era una sola mascara con 2.4 px de desenfoque, y el ala salia cortada
    a tijera: el paso de opaco a transparente era tan corto que se leia como un
    recorte pegado encima. Con las dos separadas, el borde va acompasado con el
    desenfoque de la foto y no se ve donde esta el corte.
    """
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

    # Quedarse con la componente conexa grande: descarta el arbol mojado y las
    # cruces del fondo, que tambien son oscuros.
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

    # Caida vertical: la figura se disuelve hacia abajo en la niebla en vez de
    # acabar en un corte recto encima del mausoleo.
    caida = np.ones(H2, dtype=np.float32)
    ini = int(H2 * 0.58)
    caida[ini:] = np.linspace(1.0, 0.0, H2 - ini, dtype=np.float32) ** 1.4
    caida = caida[:, None]

    nucleo = np.asarray(m, dtype=np.float32) / 255.0 * caida
    nucleo = np.clip(nucleo, 0, 1)

    borde_img = m.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))
    borde = np.asarray(borde_img, dtype=np.float32) / 255.0 * caida
    # Suavizar el alfa con smoothstep: el teorema del valor medio. Un desenfoque
    # gaussiano a secas deja la transicion en S pero con los hombros redondos;
    # el smoothstep la deja plana en los dos extremos y con caida limpia en medio.
    t = np.clip(borde, 0, 1)
    borde = t * t * (3 - 2 * t)
    borde = np.clip(borde, 0, 1)

    return nucleo, borde


def rellenar_niebla(im, mascara):
    """La escena con la figura borrada, rellena de cielo.

    Se ha probado de cinco formas. Las cinco fallaban por lo mismo, por
    anclar el relleno a pixeles que NO son cielo:

      · difusion desde la foto: el oscuro del ala entra y la figura no se va
      · difusion normalizada: aro negro en el borde
      · filas: la niebla esta arriba, sale rayado horizontal
      · columnas con los dos extremos: el de ABAJO son arboles y lapidas, y
        como varia de columna a columna el relleno sale rayado vertical
      · columnas con los extremos suavizados: menos rayas, pero el mismo
        problema, porque abajo sigue habiendo edificio

    Asi que aqui no hay ningun anclaje abajo. UN solo anclaje por columna, el
    pixel de cielo justo encima de la figura, y ademas promediado en 601 px: el
    cielo de esta foto es un degradado suave, asi que con esa media sale cielo
    otra vez y todas las columnas parecian la misma. Y de ahi hacia abajo, solo
    un degradado fijo que lo va espesando.

    El resultado no es una reconstruccion, es niebla. Y es lo que tiene que
    ser: detras del angel solo hay cielo.
    """
    W, H = im.size
    base = np.asarray(im, dtype=np.float32)
    hueco = np.asarray(mascara, dtype=np.float32) / 255.0
    dentro = hueco > 0.5
    if not dentro.any():
        return im

    # ── El anclaje: una vez por columna ───────────────────────────────────
    techo = np.full(W, -1, dtype=np.int64)
    for x in range(W):
        ys = np.flatnonzero(dentro[:, x])
        if ys.size:
            techo[x] = ys[0]

    # Media movil ancha sobre el color del cielo, canal a canal. Se queda sin
    # anclaje donde no hay figura, y ahi vale el propio pixel.
    R = 300
    suave = base.copy()
    for ch in range(3):
        # Acumulado SOBRE COLUMNAS, que es por donde se promedia, y sobre
        # base[:, :, ch]: en un array (H, W, 3), base[:, ch] coje (W, H), que
        # es la transpuesta y descoloca todos los indices despues.
        c = np.concatenate((np.zeros((H, 1), dtype=np.float32),
                          np.cumsum(base[:, :, ch], axis=1)), axis=1)
        for x in range(W):
            t = techo[x]
            if t <= 0:
                continue
            y = min(H - 1, max(0, t - 1))
            a, b = max(0, x - R), min(W, x + R + 1)
            # c va por filas y columnas: primero la fila y, luego la
            # columna. Al reves sale un indice fuera de rango.
            suave[y, x, ch] = (c[y, b] - c[y, a]) / (b - a)

    # ── Rellenar: desde el cielo suavizado hacia abajo, espesando ─────────
    relleno = base.copy()
    ys_grid = np.arange(H, dtype=np.float32)
    for x in range(W):
        t = techo[x]
        if t <= 0:
            continue
        color = suave[min(H - 1, t - 1), x]
        span = float(H - t)
        u = np.clip((ys_grid - t) / max(1.0, span * 0.85), 0, 1)
        # 0.46 es cuanto se apaga la niebla al bajar. Poco: si apaga mas, el
        # relleno se separa del cielo de al lado y se ve la mancha.
        # u[t:] es (n,), y hay que estirarlo a (n, 1) para multiplicar por el
        # color, que es (3,): con un eje de mas sale (n, 1, 3).
        relleno[t:, x] = color[None, :] * (1.0 - 0.46 * u[t:])[:, None]

    # ── Mezclar, con la mascara agrandada y muy suave ─────────────────────
    # El umbral de gris corta el ala en seco, pero el ala de verdad tiene una
    # plush de quince o veinte pixeles. Si el relleno se queda en el umbral,
    # esa plush se queda fuera y aparece un aro oscuro rodeando la niebla.
    grande = Image.fromarray((dentro * 255).astype(np.uint8), "L")
    grande = grande.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.MinFilter(25))
    grande = grande.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))
    grande = grande.filter(ImageFilter.GaussianBlur(11.0))
    a = np.asarray(grande, dtype=np.float32) / 255.0
    a = a * a * (3 - 2 * a)
    salida = base * (1 - a[..., None]) + relleno * a[..., None]

    im2 = Image.fromarray(np.clip(salida, 0, 255).astype(np.uint8), "RGB")
    # La capa de atras tiene que estar desenfocada, o se nota que le falta el
    # angel. Y el desenfoque se lleva los ultimos pixeles de costura.
    return im2.filter(ImageFilter.GaussianBlur(7.0))


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

    recortadas = recorte_angel(im)
    if recortadas is None:
        print("no se ha podido recortar la figura")
        return 1
    nucleo, borde = recortadas
    mascara = Image.fromarray((borde * 255).astype(np.uint8), "L")

    # ── la figura, recortada ────────────────────────────────────────────────
    # El RGB se oscurece donde el alfa es parcial. Sin esto, la plush del ala se
    # mezcla con la niebla clara que hay detrás y sale un filo luminoso rodeando
    # el ala, que es justo lo que hacia que el recorte se viera pegado encima.
    rgb = np.asarray(im, dtype=np.float32)
    peso = 0.30 + 0.70 * np.clip(nucleo, 0, 1)[..., None]
    rgb = rgb * peso
    angel = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    angel.putalpha(mascara)
    angel.save(os.path.join(DESTINO, "angel.webp"), "WEBP", quality=90, method=6)
    print("angel.webp   recorte solido: %.1f%%  ·  con borde: %.1f%%" %
          (float(nucleo.mean()) * 100, float(borde.mean()) * 100))

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
    franja = im.crop((0, int(H * 0.58), W, H))
    franja = ImageEnhance.Brightness(franja).enhance(0.62)
    franja = ImageEnhance.Color(franja).enhance(0.7)
    franja = Image.blend(franja, Image.new("RGB", franja.size, (18, 30, 40)), 0.26)
    franja.save(os.path.join(DESTINO, "frente.webp"), "WEBP", quality=84, method=6)
    print("frente.webp  primer plano, %dx%d" % franja.size)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())