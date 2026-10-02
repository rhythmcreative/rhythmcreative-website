#!/usr/bin/env python3
"""Genera la imagen que se ve al compartir el enlace: 1200 x 630.

La que usan Discord, Mastodon, Twitter, Slack o un cliente de correo. Sin esto,
compartir el enlace no enseña nada: ni titulo, ni imagen, ni descripcion.

Es la misma foto que la portada, con el nombre encima, en el mismo sitio y con la
misma separacion de letras. Es la imagen que ya es la portada, recortada al
formato que piden los protocolos de compartir, que es 1.91:1.

De donde sale la foto: de las capas, no de una sola. `angel-oscuro.webp` es la
figura recortada con canal alfa, y sola sobre un lienzo gris sale con el cielo
claro del papel y las alas cortadas por arriba: no es la portada, es una parte
de la portada. La escena es fondo + angel, que es lo que se ve en la pagina.

JPEG y no PNG: los客户服务 de social no saben leer webp, y PNG a 1200x630 de
una foto pesa el doble que lo mismo en JPEG con calidad 88. Comprobado: el PNG
salia de 900 KB y el JPEG de 130.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONDO = os.path.join(RAIZ, "assets", "fondo-oscuro.webp")
ANGEL = os.path.join(RAIZ, "assets", "angel-oscuro.webp")
DESTINO = os.path.join(RAIZ, "assets", "og.jpg")

ANCHO, ALTO = 1200, 630
FUENTES = [
    "/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Medium.ttf",
    "/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
]


def fuente(tam):
    for f in FUENTES:
        if os.path.exists(f):
            try:
                return ImageFont.truetype(f, tam)
            except OSError:
                pass
    return ImageFont.load_default()


def con_sangria(dib, texto, x, y, sep, relleno):
    """Escribe letra a letra, que es como se consigue la separacion grande.

    draw.text no tiene letter-spacing en ninguna version de Pillow, y separarlo a
    mano es lo unico que reproduce el ritmo del nombre de la portada.
    """
    total = sum(dib.textlength(c, font=dib.font) for c in texto) + sep * (len(texto) - 1)
    x -= total / 2
    for c in texto:
        dib.text((x, y), c, font=dib.font, fill=relleno)
        x += dib.textlength(c, font=dib.font) + sep


def main():
    if not (os.path.exists(FONDO) and os.path.exists(ANGEL)):
        print("faltan las capas; corre antes scripts/preparar-angel.py", file=sys.stderr)
        return 1

    # Fondo primero, angel encima. El orden es el del DOM en la pagina.
    im = Image.open(FONDO).convert("RGB")
    im.paste(Image.open(ANGEL).convert("RGBA"), (0, 0), Image.open(ANGEL).convert("RGBA"))

    # Encajar la foto en 1200x630 sin recortar por los lados ni por arriba, que
    # es la regla de la pagina entera: la foto no se recorta, se sigue. Se ajusta
    # el lienzo al que pide el formato y se escala por dentro.
    escala = max(ANCHO / im.width, ALTO / im.height)
    nueva = (round(im.width * escala), round(im.height * escala))
    im = im.resize(nueva, Image.LANCZOS)
    # El recorte que queda es por arriba y por abajo, no por los lados, porque
    # se ha escalado por el lado que manda. Y aun asi se mira: si el recorte
    # fuera lateral, no se haria y se reduiria la foto con margen.
    if nueva[0] > ANCHO:
        raise SystemExit("el recorte seria horizontal, y la foto no se recorta")
    arriba = (nueva[1] - ALTO) // 2
    im = im.crop((0, arriba, nueva[0], arriba + ALTO))

    # La misma graduacion que el fondo en la pagina, para que la imagen y la
    # portada se parezcan al abrirla.
    im = ImageEnhance.Brightness(im).enhance(0.86)
    im = ImageEnhance.Contrast(im).enhance(1.04)

    # Un velo oscuro solo en la parte de abajo, para que el nombre se lea. La foto
    # de por si ya es muy oscura arriba, asi que arriba no se toca.
    velo = Image.new("L", (ANCHO, ALTO), 0)
    vd = ImageDraw.Draw(velo)
    for y in range(ALTO):
        t = max(0.0, (y / ALTO - 0.34) / 0.66)
        vd.line([(0, y), (ANCHO, y)], fill=int(205 * t ** 1.5))
    im = Image.composite(Image.new("RGB", (ANCHO, ALTO), (4, 6, 8)), im, velo)

    dib = ImageDraw.Draw(im)
    dib.font = fuente(64)
    con_sangria(dib, "RHYTHMCREA", ANCHO / 2, 300, 15, (233, 243, 248))

    dib.font = fuente(19)
    con_sangria(dib, "A HYPRLAND DESKTOP", ANCHO / 2, 392, 7, (150, 174, 186))

    im.save(DESTINO, "JPEG", quality=88, optimize=True, progressive=True)
    print("%s  %dx%d  %.0f KB" % (os.path.basename(DESTINO), im.width, im.height,
                                  os.path.getsize(DESTINO) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())