#!/usr/bin/env python3
"""Deshace un wallpaper cualquiera en capas, como la del angel.

Por que hace falta. Elangel tiene una mascara hecha a mano —seis intentos, segun
el README— porque es un recorte de una figura concreta. Eso no se puede repetir
con 572 wallpapers distintos: separar la figura del fondo es segmentacion, y aqui
solo hay PIL y numpy. Sin cv2, sin torch, sin rembg ni un modelo de profundidad
guardado, no hay nada que sepa donde esta el sujeto.

Lo que si se puede, y es lo que hace esto, es usar las dos cosas que TODOS los
wallpapers de esta carpeta tienen en comun aunque no se parezcan en nada:

    1. El sujeto esta cerca del centro. En los seis que se miraron —un angel con
       espada, gatos goticos, unos ojos en ascii, el logo de Arch, un arbol con
       una luna, una chica con una espada— el sujeto esta en el centro o cerca.
    2. Abajo esta lo cerca y arriba lo lejos. El suelo en el borde inferior y el
       cielo en el superior es como el ojo lee la profundidad en una foto fija.

De ahi salen las tres capas, y de ahi sale tambien la profundidad: ademas de que
cada capa se mueva a una velocidad distinta con el raton —que es lo que ya hace
capa.js— la capa lejana va DESENFOCADA y la cercana nitida. Eso es perspectiva
aerea, la otra mitad de la profundidad, y sin ella el paralaje solo se ve como
un temblor.

Como el angel se queda como esta (su mascara a mano es mejor que cualquier
heuristica) esto no lo sustituye: lo sustituye cuando elijes otro wallpaper.

    scripts/preparar-hero.py                       # el wallpaper actual
    scripts/preparar-hero.py ruta/a/una.jpg        # uno concreto
"""
import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(RAIZ, "assets")
DESTINO = os.path.join(ASSETS, "capa-datos.js")

# Ancho de generacion. El angel va a 2000 porque es la capa que se ve de cerca y
# es la que mas enlargement necesita; 1100 para el movil.
ANCHO = 2000
ANCHO_MOVIL = 1100
CALIDAD = 76

# Desenfoque de la capa lejana, en proporcion del alto. Mas desenfoque del que
# parece normal: es perspectiva aerea, no un filtro, y es lo que dice "lejos".
DESENFOQUE_LEJANO = 0.016

# Todo lo que cambia el resultado va aqui. Se saca una huella corta y se escribe
# en capa-datos.js, y --auto compara tambien con ella. Sin esto, cambiar la
# graduacion y volver a correr --auto no hacia NADA y no decia por que: la
# comprobacion era solo "¿es el mismo wallpaper?", y el wallpaper era el mismo.
# Cuesto veinte segundos deUSTED mirando una imagen que no habia cambiado.
RECETA = (1, ANCHO, ANCHO_MOVIL, CALIDAD, DESENFOQUE_LEJANO, 46.0, 206.0)


def huella_receta():
    import hashlib
    return hashlib.sha1(repr(RECETA).encode("utf-8")).hexdigest()[:10]

# Cuanto tira cada capa con el raton, en porcentaje de la foto. Los valores de
# data-hondo que hay en index.html son 0.6 / 1.5 / 5.2, y esta es la foto de
# donde salen, que es lo que hace que el efecto tenga sentido.
TIRA = {"fondo": 0.6, "angel": 1.5, "frente": 5.2}


def cargar(ruta, ancho):
    """Abre la imagen y la deja en un lienzo de ancho fijo, sin recortar de lado.

    La regla de la pagina entera: la foto no se recorta, se sigue. Si la foto es
    mas alta que 16:9 lo que sobra es por arriba y por abajo, que es donde no se
    nota, y el encuadre final lo decide capa.js con numeros.
    """
    im = Image.open(ruta)
    if im.mode in ("RGBA", "LA", "P"):
        # Los PNG con transparencia: el fondo transparente se pone negro, que es
        # lo que se veria de todos modos en un fondo de escritorio.
        fondo = Image.new("RGBA", im.size, (8, 10, 12, 255))
        im = Image.alpha_composite(fondo, im.convert("RGBA"))
    im = im.convert("RGB")
    if im.width != ancho:
        im = im.resize((ancho, max(1, round(im.height * ancho / im.width))),
                       Image.LANCZOS)
    return im


defExtension = None


def mascara_sujeto(w, h):
    """Alfa suave con forma de elipse alrededor del centro.

    No es una segmentacion y no lo pretende: es una aproximacion a "lo que hay en
    el medio se acerca". Va con degradado por los bordes, no con un recorte, para
    que no haya filo ni costura donde se junta con el fondo.

    El centro esta un poco por encima de la mitad: en las fotos el sujeto ocupa
    mas arriba que abajo, porque el horizonte suele estar en la mitad de abajo.
    """
    mascara = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mascara)
    # Una elipse que ocupa la mayor parte del encuadre: si fuera pequena, en un
    # fondo liso no se notaria el cambio de nitidez y en uno con muchos detalles
    # se veria un circulo. Ancha y con las feathers largas.
    ex, ey = int(w * 0.44), int(h * 0.46)
    cx, cy = int(w * 0.5), int(h * 0.46)
    d.ellipse([cx - ex, cy - ey, cx + ex, cy + ey], fill=255)
    # El feather: un desenfoque grande es lo que convierte un recorte en algo
    # que no tiene borde. Sin esto se ve el circulo, que es el error clasico.
    r = max(8, int(min(w, h) * 0.13))
    return mascara.filter(ImageFilter.GaussianBlur(r))


def mascara_frente(w, h):
    """Banda de abajo. El CSS ya la vuelve transparente hacia arriba, asi que
    aqui solo hace falta el recorte; el degradado lo pone .frente.

    Se sube un poco el inicio porque el CSS usa transparent 58% -> #000 76%, y si
    la imagen ya viene cortada por ahi se solapan las dos y se nota una linea."""
    mascara = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mascara)
    y = int(h * 0.56)
    d.rectangle([0, y, w, h], fill=255)
    return mascara.filter(ImageFilter.GaussianBlur(max(4, int(h * 0.05))))


def graduar(im, tema):
    """La graduacion. Se adapta a la foto en vez de ser fija.

    Una misma multiplicacion no sirve para todo: el angel con la espada es casi
    blanco y el de los gatos goticos es casi negro. Con un factor fijo, uno de
    los dos se va a perder. Asi que se mide la mediana de la imagen y se empuja a
    un objetivo, que es justo lo que hace pywal con el wallpaper.
    """
    gris = np.asarray(im.convert("L"), dtype=np.float32)
    mediana = float(np.median(gris))

    if tema == "oscuro":
        # objetivo ~46/255. Si la foto ya es oscura se sube algo, para que se vea
        # algo y no un negro plano.
        objetivo = 46.0
        f = objetivo / max(mediana, 1.0)
        f = min(max(f, 0.55), 1.55)
        im = ImageEnhance.Brightness(im).enhance(f)
        im = ImageEnhance.Contrast(im).enhance(1.08)
        # Frio, poco: los rojos y los verdes bajan un pelo mas que el azul.
        r, g, b = im.split()
        r = r.point(lambda v: min(255, int(v * 0.95)))
        g = g.point(lambda v: min(255, int(v * 0.985)))
        im = Image.merge("RGB", (r, g, b))
    else:
        # objetivo ~206/255. A 226 la foto se iba a blanco plano: con la mediana
        # ya en 226 el factor era 1.0 y los claros se comian el rango, y el angel
        # con la espada salia casi sin dibujo. 206 deja sitio para que el texto
        # oscuro se lea encima. Y el tope de subida es 1.18, no 1.45: subir mas de
        # lo que ya es claro no es graduar, es quemar.
        objetivo = 206.0
        f = objetivo / max(mediana, 1.0)
        f = min(max(f, 0.42), 1.18)
        im = ImageEnhance.Brightness(im).enhance(f)
        im = ImageEnhance.Contrast(im).enhance(0.95)
        r, g, b = im.split()
        b = b.point(lambda v: min(255, int(v * 0.985)))
        im = Image.merge("RGB", (r, g, b))

    return im


def elegir_halo(im):
    """Donde va el anillo de luz.

    En el angel se busca el aro de verdad. Aqui no hay un aro, asi que se busca
    la fuente de luz: el punto mas claro de la mitad de arriba, que en practica
    es el cielo detras del sujeto o el resplandor que sea. Si la foto es plana y
    no hay nada que destaque, cae en el centro de arriba, que es donde suele
    estar la luz aunque no se note.
    """
    w, h = im.size
    arriba = im.crop((0, 0, w, int(h * 0.46)))
    gris = np.asarray(arriba.convert("L"), dtype=np.float32)
    # Se suaviza antes de buscar el maximo: en el pixel mas claro puede haber un
    # grano suelto y el anillo se plantaria ahi, en un sitio sin nada.
    try:
        from PIL import ImageFilter as _F
        suave = np.asarray(arriba.convert("L").filter(_F.GaussianBlur(9)),
                           dtype=np.float32)
    except Exception:
        suave = gris
    iy, ix = np.unravel_index(int(np.argmax(suave)), suave.shape)
    x = (ix + 0.5) / w
    y = (iy + 0.5) / h
    # Acotado. El maximo se cae en el borde de arriba de la foto muy a menudo —
    # el cielo es lo mas claro y lo mas arriba—, y un anillo de luz pegado al
    # borde no es un anillo: se ve medio circulo cortado. Medido: en la foto de
    # 2B salia en y 0.00.
    x = min(max(x, 0.16), 0.84)
    y = min(max(y, 0.09), 0.40)
    # Si no hay contraste real, el "maximo" es ruido y no dice nada: se va al
    # centro de arriba.
    if float(suave.max()) - float(suave.mean()) < 9:
        x, y = 0.5, 0.17
    # rx es fraccion del ancho y ry de la altura. Aqui no hay un aro real que
    # majar, asi que el resplandor se deja redondo de verdad: ry se compensa con
    # la proporcion de la foto para que en pixeles siga siendo un circulo.
    rx = 0.10
    ry = round(rx * w / h, 4)
    return {"x": round(float(x), 4), "y": round(float(y), 4), "rx": rx, "ry": ry}


def guardar_webp(im, nombre, ancho_destino):
    if im.width != ancho_destino:
        h = max(1, round(im.height * ancho_destino / im.width))
        im = im.resize((ancho_destino, h), Image.LANCZOS)
    ruta = os.path.join(ASSETS, nombre)
    if im.mode == "RGBA":
        im.save(ruta, "WEBP", quality=CALIDAD, method=4)
    else:
        im.save(ruta, "WEBP", quality=CALIDAD, method=4)
    return ruta, os.path.getsize(ruta)


def preparar(ruta, salida=None):
    salida = salida or {}
    if not os.path.exists(ruta):
        print("no existe: %s" % ruta, file=sys.stderr)
        return None

    im = cargar(ruta, ANCHO)
    w, h = im.size
    mascara_s = mascara_sujeto(w, h)
    mascara_f = mascara_frente(w, h)

    halos = {}
    for tema in ("oscuro", "claro"):
        base = graduar(im, tema)

        # LEJOS: la foto entera, desenfocada. Sin recorte: es el fondo de todo.
        lejos = base.filter(ImageFilter.GaussianBlur(max(2, int(h * DESENFOQUE_LEJANO))))
        r1, n1 = guardar_webp(lejos, "fondo-%s.webp" % tema, ANCHO)

        # MEDIO: la foto con el sujeto encima, nitido y un punto mas de contraste.
        # Se compone sobre el fondo desenfocado para que donde no hay sujeto se
        # vea el fondo y no un recorte con alfa.
        medio = Image.composite(
            ImageEnhance.Contrast(base).enhance(1.12), lejos, mascara_s)
        r2, n2 = guardar_webp(medio, "angel-%s.webp" % tema, ANCHO)
        guardar_webp(medio, "angel-%s-p.webp" % tema, ANCHO_MOVIL)

        # CERCA: la banda de abajo de la foto, nitida. El CSS la enmascara.
        frente = Image.composite(base, lejos, mascara_f)
        frente = frente.resize((w, int(h * 1.10)), Image.LANCZOS)
        frente = frente.crop((0, int(h * 1.10) - h, w, int(h * 1.10)))
        r3, n3 = guardar_webp(frente, "frente-%s.webp" % tema, ANCHO)

        halos[tema] = elegir_halo(base)
        salida[tema] = (r1, n1, r2, n2, r3, n3)

    with open(DESTINO, "w", encoding="utf-8") as fh:
        fh.write("// Generado por scripts/preparar-hero.py. No editar a mano.\n")
        fh.write("// Las tres capas salen del wallpaper de tu maquina; el sujeto se\n"
                 "// aproxima con una elipse suave en el centro, no con segmentacion.\n")
        fh.write("//\n")
        fh.write("// origen: de que imagen salieron. El recolector lo compara con el\n"
                 "// wallpaper que hay puesto y solo vuelve a hacer el trabajo si ha\n"
                 "// cambiado, que son unos veinte segundos.\n")
        fh.write("window.RHYTHM_CAPA_TAM = {\n")
        fh.write("  origen: %s,\n" % json.dumps(os.path.abspath(ruta)))
        fh.write("  receta: %s,\n" % json.dumps(huella_receta()))
        fh.write("  w: %d,\n  h: %d,\n" % (w, h))
        fh.write("  halo: { x: %.4f, y: %.4f, rx: %.4f, ry: %.4f },\n" % (halos["oscuro"]["x"],
               halos["oscuro"]["y"], halos["oscuro"]["rx"], halos["oscuro"]["ry"]))
        fh.write("  haloClaro: { x: %.4f, y: %.4f, rx: %.4f, ry: %.4f }\n" % (halos["claro"]["x"],
               halos["claro"]["y"], halos["claro"]["rx"], halos["claro"]["ry"]))
        fh.write("};\n")

    return salida, w, h, halos


def leer_capa_datos():
    """Lo que dice el capa-datos.js de ahora: de que imagen salio y con que receta."""
    try:
        with open(DESTINO, encoding="utf-8") as fh:
            t = fh.read()
    except Exception:
        return None, None
    def campo(nombre):
        # Anclado al principio de la linea a proposito. Sin el ^, el comentario
        # "// origen: de que imagen salieron" tambien casaba y devolvia "de", que
        # es lo que hacia que --auto rehiziese la foto cada vez y dijera que el
        # wallpaper habia cambiado cuando no habia cambiado nada.
        m = re.search(r'^[ \t]*%s:[ \t]*("[^"]*"|[0-9a-z]+)' % nombre, t, re.M)
        if not m:
            return None
        return json.loads(m.group(1)) if m.group(1).startswith('"') else m.group(1)
    return campo("origen"), campo("receta")


def main():
    argv = sys.argv[1:]
    auto = "--auto" in argv
    args = [a for a in argv if not a.startswith("-")]
    ruta = args[0] if args else wallpaper_actual()
    if not ruta:
        print("no se ha dicho ningun wallpaper", file=sys.stderr)
        return 1

    if auto:
        previa_o, previa_r = leer_capa_datos()
        misma_foto = previa_o == os.path.abspath(ruta)
        misma_receta = previa_r == huella_receta()
        if misma_foto and misma_receta:
            print("el hero ya sale de ese wallpaper y con esa receta: no se toca nada")
            return 0
        if misma_foto:
            print("el wallpaper es el mismo pero la receta ha cambiado: se rehace")
        else:
            print("el wallpaper ha cambiado: se rehace")

    hecho = preparar(ruta)
    if not hecho:
        return 1
    salida, w, h, halos = hecho

    print("%s  ->  %dx%d" % (os.path.basename(ruta), w, h))
    total = 0
    for tema in ("oscuro", "claro"):
        r1, n1, r2, n2, r3, n3 = salida[tema]
        print("  %-7s fondo %5.0f KB   angel %5.0f KB   frente %4.0f KB"
              % (tema, n1 / 1024, n2 / 1024, n3 / 1024))
        print("          halo en (%.2f, %.2f)" % (halos[tema]["x"], halos[tema]["y"]))
        total += n1 + n2 + n3
    print("  %.0f KB las tres capas de un tema" % (total / 2 / 1024))
    return 0


def wallpaper_actual():
    """El wallpaper que tiene puesto la maquina ahora, como pywal."""
    for cmd in (["hyprctl", "getvar", "general:wallpaper"],
                ["swww", "query"]):
        try:
            import subprocess
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            v = out.stdout.strip().split("\n")[0].strip()
            if v and os.path.exists(v):
                return v
        except Exception:
            pass
    return None


if __name__ == "__main__":
    raise SystemExit(main())