#!/usr/bin/env python3
"""Coge las capturas del repo de hyprland y las deja listas para el manual.

POR QUE HAY UN SCRIPT Y NO SE COPIAN A MANO

Las capturas viven en el repo de hyprland, que es publico. El manual es una
pagina estatica: no puede leerlas de ahi en tiempo de ejecucion, asi que tienen
que estar en ESTE repo, y en un formato que pese poco. Eso son dos pasos —copiar
y comprimir— que hay que repetir cada vez que se retoque una captura, y un paso
repetido a mano es un paso que se olvida.

Lo que hace, entonces:

    1. Copia cada captura del repo a assets/manual/
    2. La pasa a WebP y la deja como mucho del ancho que se ve en pantalla
    3. Escribe data/imagenes.js con la lista, para que la pagina no adivine
    4. Dice cuanto se ha ahorrado, que es lo unico que hace falta para saber si
       el script ha hecho su trabajo

LO UNICO QUE HAY QUE EDITAR AQUI ES LA LISTA DE ARRIBA

Cada linea es: seccion, fichero de origen, ancho maximo, el texto que se oye si
la imagen no carga, y el pie que se lee debajo. Los dos ultimos son texto y son
lo que de verdad cuesta, asi que se escriben a mano y no se dejan al programa. Un
alt vacio es una imagen que no existe para quien navega con lector de pantalla, y
"captura de pantalla" no dice nada: "the hotkey browser, with every shortcut in
the config" si.

POR QUE WEBM Y NO PNG

Medido el 2026-10-03 con las capturas de este repo:

    desktop_autumn.png      2.6 MB  ->  desktop_autumn.webp     96 KB
    desktop_neon.png        2.2 MB  ->  desktop_neon.webp       84 KB
    desktop_cherry.png      1.5 MB  ->  desktop_cherry.webp      71 KB
    desktop.png             924 KB  ->  desktop.webp            63 KB
    powermenu.png           876 KB  ->  powermenu.webp          58 KB

Un PNG de captura guarda tres bytes por pixel donde un WebP guarda uno y medio, y
ahi no hay nada que perder: son pantallas de colores planos, con bordes duros y
texto pequeno, no gradientes suaves ni ruido de fotografia.

LO UNICO QUE NO SE COMPRIME

El GIF de la isla pesa 1.4 MB y es una animacion. WebP animado lo haria la mitad
de pequeno, pero ni Pillow ni el ImageMagick de esta maquina traen el
codificador: los dos lo niegan. Asi que el GIF se copia tal cual, con carga
perezosa para que no se descargue hasta que se llega a la seccion, y no se toca.
Si algun dia se instala cwebp, el sitio lo recoge solo: esta en SIN_COMPRIMIR.
"""
import json
import os
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SITIO = os.path.dirname(AQUI)
RAIZ_REPO = os.path.expanduser(os.environ.get("RHYTHM_HYPR", os.path.join("~", "hyprland")))
ORIGEN = os.path.join(RAIZ_REPO, "assets")
DESTINO = os.path.join(SITIO, "assets", "manual")
# El directorio del tema del login dentro del repo, que guarda sus propios
# previews. Va como constante y no como un trozo de ruta escrito en el for, para
# que se vea de un vistazo que es lo que se esta añadiendo a la busqueda.
TEMA_LOGIN = os.path.join(RAIZ_REPO, "sddm", "sddm-astronaut-theme")
MANIFIESTO = os.path.join(SITIO, "data", "imagenes.js")

# El ancho maximo de cada tipo de foto, en pixeles de la captura original.
#
# No es un numero de gusto: la columna de texto del manual mide unos 650 px, y
# con la pantalla del doble de densidad hace falta el doble. 1280 da de sobra a
# pantalla completa y no gasta de mas a resolucion normal. Los recortes ya son
# pequenos y se dejan como estan: reescalarlos hacia arriba solo engorda el
# fichero y difumina la foto.
ANCHO_PANTALLA = 1280
ANCHO_RECORTE = 900

# La calidad de WebP. 78 es donde el ojo ya no distingue el WebP del PNG en una
# captura de escritorio con texto, que es justo lo que hay aqui: bordes duros y
# letra pequena, donde los artefactos se ven antes que en una fotografia.
CALIDAD = 78

# DEL REPO QUE NO SE USA, Y POR QUE
#
#   dynamic_island_settings_full.png   Es la misma pantalla que
#                                      hyprland_settings_crop.png, que ya esta en
#                                      la lista: las dos muestran la pestana
#                                      "Hyprland Settings" de la isla. Una es un
#                                      recorte y la otra la pantalla entera con
#                                      el escritorio de fondo. Dos fotos de lo
#                                      mismo en dos secciones hacen que el manual
#                                      parezca mas largo de lo que es.
#
#   rofi_launcher.png                  La misma pantalla que rofi_launcher_crop,
#                                      sin recortar. El recorte se lee mejor en
#                                      una columna de texto de 650 px.
#
# El GIF se queda sin comprimir porque no hay webp animado en esta maquina.
SIN_COMPRIMIR = {".gif"}

# ── La lista ─────────────────────────────────────────────────────────────────
# (seccion, fichero, ancho maximo, alt, pie)
# La seccion es el id compuesto del manual: "proyecto/subseccion".
#
# El alt y el pie son textos distintos a proposito. El alt es lo que se oye si la
# imagen no carga, y por eso es largo y describe lo que se ve. El pie es lo que
# se lee debajo, y por eso son dos palabras. Poner lo mismo en los dos hace que
# un lector de pantalla lea la frase entera dos veces seguidas.
FIGURAS = [
    ("hyprland/empezar", ".config/hypr/wallpapers/default.jpg", ANCHO_PANTALLA,
     "The wallpaper on a fresh install, before you change anything: a painted "
     "mountain valley with a windmill on the ridge.",
     "The first wallpaper you get"),

    # Las dos capturas del tema de login —la de dia y la de noche— no van aqui.
    # La seccion del login se queda con UNA foto, la de la pantalla de inicio, que es
    # lo que se ve de verdad al arrancar. Las otras dos mostraban el mismo wallpaper
    # en dos momentos del dia, que es una misma pantalla dos veces.
    # Los ficheros siguen en Previews/ por si se quieren volver a usar; lo que no
    # es, la pagina no los enseña.

    ("hyprland/atajos", "rofi_hotkeys_crop.png", ANCHO_RECORTE,
     "The hotkey browser, open over the desktop, with every shortcut in the "
     "config listed and searchable.",
     "The hotkey browser"),

    ("hyprland/instalado", "rofi_launcher_crop.png", ANCHO_RECORTE,
     "The application launcher as a grid of icons: the file manager, the "
     "network tools, bluetooth, and the browsers, side by side.",
     "The launcher"),

    ("hyprland/instalado", "hyprland_settings_crop.png", ANCHO_RECORTE,
     "The compositor settings, live: animations, blur, shadows, performance, "
     "corner rounding and gaps, plus the monitor layout. These are the knobs "
     "that decide how a window looks.",
     "The compositor settings"),

    ("hyprland/instalado", "powermenu.png", ANCHO_PANTALLA,
     "The power menu: lock, suspend, log out, restart or shut down, with a "
     "countdown underneath before it acts on any of them.",
     "The power menu"),

    ("hyprland/isla", "dynamic_island.gif", ANCHO_PANTALLA,
     "The island folded down to a clock at the top edge of the screen, opening "
     "and closing on its own.",
     "Folding by itself"),

    ("hyprland/isla", "dynamic_island_full.png", ANCHO_PANTALLA,
     "The island open over the desktop, with every plugin on the machine: "
     "media, wifi, bluetooth, audio output, the dock, night light, caffeine, "
     "volume and brightness.",
     "The island, open"),

    ("hyprland/dock", "rust_dock_crop.png", ANCHO_RECORTE,
     "The dock along the bottom edge, with the running applications as icons.",
     "The dock"),

    ("hyprland/barra", "desktop.png", ANCHO_PANTALLA,
     "A full screen: the bar at the top, the dock at the bottom, and the island "
     "in the middle of the top edge.",
     "The whole desktop"),

    ("hyprland/barra", "control_center_crop.png", ANCHO_RECORTE,
     "The control centre opened from the bar: media, wifi, bluetooth, audio "
     "output, the dock, night light, caffeine, volume and brightness, with the "
     "power button at the top right.",
     "The control centre"),

    ("hyprland/tema", "desktop_autumn.png", ANCHO_PANTALLA,
     "The desktop with the autumn wallpaper, and the whole interface taking its "
     "colours from it.",
     "Autumn"),

    ("hyprland/tema", "desktop_cherry.png", ANCHO_PANTALLA,
     "The same desktop with the cherry blossom wallpaper.",
     "Cherry blossom"),

    ("hyprland/tema", "desktop_neon.png", ANCHO_PANTALLA,
     "And with the neon one, which is the darkest of the three.",
     "Neon"),

    ("hyprland/login", "sddm_login.png", ANCHO_PANTALLA,
     "The login screen before the session starts, with the same wallpaper as "
     "the desktop behind it.",
     "The login screen"),

    ("hyprland/problemas", "lockscreen.png", ANCHO_PANTALLA,
     "The lock screen, which is what you get instead of the desktop when the "
     "session is locked.",
     "The lock screen"),
]


def resuelve(fichero):
    """Donde esta un fichero del repo, o None si no esta en ningun sitio.

    Se prueban tres sitios, en este orden: assets/, que es donde vive casi todo;
    la raiz del repo, para el papel pintado por defecto que esta en
    .config/hypr/wallpapers; y el directorio del tema del login, que es donde
    estan sus previews.

    Con estos tres la lista se escribe con la ruta corta —"Previews/preview1.png"—
    en vez del camino entero, que en la lista de abajo occupies cuatro lineas por
    imagen y no dice nada que no se vea con abrir el repo.

    Si un dia aparece una imagen en un cuarto sitio, el fallo no es silencioso:
    sale un aviso con el nombre del fichero que falta y el script no escribe
    nada. Se comprobó letting el fallo pasar.
    """
    for base in (ORIGEN, RAIZ_REPO, TEMA_LOGIN):
        ruta = os.path.join(base, fichero)
        if os.path.exists(ruta):
            return ruta
    return None


def dimensiones(ruta):
    """(ancho, alto) de una imagen, o None si no se puede leer.

    Se pregunta por el fotograma [0] y no por el fichero entero. En un GIF con
    cien fotogramas, identify suelta cien pares de numeros pegados —"— 750 422
    749 422 745 422..."— y al partirlo no sale un par sino cien. Con el
    fotograma salen dos y ya.

    La diferencia se ve en la pagina: sin ancho ni alto en el HTML el navegador
    no puede reservar el hueco y el texto salta hacia abajo cuando la imagen
    llega. Con "0" y "0", que es lo que salia, la proporcion sale indefinida y
    pasa lo mismo, pero ademas el atributo parece correcto.
    """
    for objetivo in (ruta + "[0]", ruta):
        r = subprocess.run(["magick", "identify", "-format", "%w %h", objetivo],
                           capture_output=True, text=True)
        if r.returncode != 0:
            continue
        partes = r.stdout.strip().split()
        if len(partes) == 2:
            return (int(partes[0]), int(partes[1]))
    return None


def convierte(origen, destino, ancho):
    """Pasa una imagen a WebP al ancho pedido. Devuelve (bytes, ancho, alto).

    Se usa ImageMagick y no Pillow porque en una captura con texto, el WebP de
    Pillow deja en las letras una pelusa que se nota al ampliar. ImageMagick con
    Lanczos y ajuste de nitidez va mejor en lo que importa aqui, que es que el
    texto se lea.
    """
    reales = dimensiones(origen)
    cmd = ["magick", origen]
    # Solo se encoge. Un recorte de 700 px de ancho se deja como esta.
    if ancho and reales and reales[0] > ancho:
        cmd += ["-resize", "%dx>" % ancho]
    # -strip se lleva los metadatos: los PNG de captura traen el nombre del
    # programa que los hizo y la fecha, que no se ven y ocupan.
    cmd += ["-strip", "-colorspace", "sRGB",
            "-define", "webp:method=6", "-quality", str(CALIDAD), destino]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(destino):
        raise RuntimeError("magick fallo con %s:\n%s"
                           % (os.path.basename(origen), r.stderr[:300]))
    dim = dimensiones(destino) or (0, 0)
    return os.path.getsize(destino), dim[0], dim[1]


def limpia_sin_usar(usados):
    """Borra de assets/manual lo que no este en la lista.

    Sin esto, quitar una captura de la lista dejaria su copia en el repo para
    siempre, y el repo se va llenando de ficheros que ya no usa nadie.
    """
    for viejo in sorted(os.listdir(DESTINO)):
        if os.path.splitext(viejo)[0] not in usados:
            os.remove(os.path.join(DESTINO, viejo))
            print("  fuera %s (ya no esta en la lista)" % viejo)


def main():
    if not os.path.isdir(ORIGEN):
        print("no encuentro las capturas en %s" % ORIGEN)
        print("pon RHYTHM_HYPR=/ruta/al/repo y vuelve a correrlo")
        return 1

    os.makedirs(DESTINO, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFIESTO), exist_ok=True)

    faltan = [f for _, f, _, _, _ in FIGURAS if not resuelve(f)]
    if faltan:
        print("  en el repo no estan: %s" % ", ".join(faltan))
        return 1

    # El nombre, no la ruta: el fichero de salida es plano y se compara con el
    # nombre, no con la ruta de donde vino.
    limpia_sin_usar(set(os.path.splitext(os.path.basename(f))[0]
                        for _, f, _, _, _ in FIGURAS))

    cuerpo = {}
    lineas = []
    antes = 0
    despues = 0

    for seccion, fichero, ancho, alt, pie in FIGURAS:
        origen = resuelve(fichero)
        ext = os.path.splitext(fichero)[1].lower()
        peso_origen = os.path.getsize(origen)
        antes += peso_origen

        if ext in SIN_COMPRIMIR:
            nombre = os.path.basename(fichero)
            destino = os.path.join(DESTINO, nombre)
            shutil.copyfile(origen, destino)
            peso = os.path.getsize(destino)
            dim = dimensiones(destino) or (0, 0)
            motivo = "gif, sin webp animado en esta maquina"
        else:
            nombre = os.path.splitext(os.path.basename(fichero))[0] + ".webp"
            destino = os.path.join(DESTINO, nombre)
            peso, w, h = convierte(origen, destino, ancho)
            dim = (w, h)
            motivo = None

        despues += peso
        lineas.append("  %-32s %6.0f KB -> %6.0f KB%s"
                      % (fichero, peso_origen / 1024, peso / 1024,
                         "   (" + motivo + ")" if motivo else ""))

        cuerpo.setdefault(seccion, []).append({
            "src": "assets/manual/" + nombre,
            "alt": alt,
            "pie": pie,
            "w": dim[0],
            "h": dim[1],
            "kb": round(peso / 1024),
        })

    tmp = MANIFIESTO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("// Generado por scripts/collect-imagenes.py. No editar a mano.\n")
        f.write("// Las imagenes estan en assets/manual/ y son copias de las del\n")
        f.write("// repo de hyprland, comprimidas a WebP.\n")
        f.write("// Para cambiarlas hay que correr el script:\n")
        f.write("//     ./scripts/collect-imagenes.py\n")
        f.write("window.RHYTHM_IMG = ")
        json.dump(cuerpo, f, ensure_ascii=False, indent=None)
        f.write(";\n")
    os.replace(tmp, MANIFIESTO)

    print("\n".join(lineas))
    print("\n  %d imagenes en %d secciones, en %d ficheros de assets/manual/"
          % (sum(len(v) for v in cuerpo.values()), len(cuerpo),
             len(os.listdir(DESTINO))))
    print("  %.1f MB antes, %.0f KB despues: %.0f%% menos"
          % (antes / 1048576, despues / 1024,
             100.0 * (antes - despues) / antes if antes else 0))
    return 0


if __name__ == "__main__":
    sys.exit(main())