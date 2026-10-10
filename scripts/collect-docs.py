#!/usr/bin/env python3
"""Guarda la documentacion del repo de hyprland en data/documentacion.js.

POR QUE HAY UN FICHERO Y NO SE LEE DIRECTO DEL REPO

La pagina del manual es publica y el visitante no tiene el repo de hyprland en su
maquina: no hay git clone, no hay .lua, no hay install.sh. Lo unico que puede
leer son los .js que esta pagina carga. Asi que lo mismo que con los datos de
GitHub: un script recoge, deja un fichero, y la pagina lo lee.

Y sale ESTATICO a proposito, no vivo. La version que lee data/system.js es el
estado de MI maquina y no se publica (esta en .gitignore, precisamente para no
enseñar el hostname). Un visitante no lo tiene, con lo que los bloques de atajos,
de paleta y de pantallas le saldrian vacios. Aqui se lee del REPO, que es publico
por definicion: los 78 atajos, las banderas del instalador y los componentes son
los mismos para cualquiera.

Lo que se lee y de donde:

    atajos      hyprland.lua, con scripts/parse-binds.py, que ya sabia leerlo
    banderas    install.sh --help
    componentes la tabla del README
    arbol       el arbol del repo, contado y resumido
    version     git describe del repo

QUE HAY QUE VOLVER A CORRER

Cada vez que se cambien atajos o banderas en el repo:

    ./scripts/collect-docs.py

Que es lo mismo que hay que hacer con el resto de scripts de este directorio. El
fichero va commiteado, asi que si no se corre, la documentacion se queda
desfasada en silencio. Por eso el final comprueba que el numero de atajos que
salen es el que sale y avisa si no.

Las banderas se sacan de `--help` y no de la tabla del README a proposito: el
README se queda corto. Medido el 2026-10-03, `--help` documenta 14 banderas y la
tabla del README solo 12, y le faltan `--update` y `--skip-apps`.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
SITIO = os.path.dirname(AQUI)
DESTINO = os.path.join(SITIO, "data", "documentacion.js")

# El repo del que se lee. Se puede cambiar con la variable de entorno, por si no esta
# en el sitio habitual.
REPO = os.path.expanduser(
    os.environ.get("RHYTHM_HYPR", os.path.join("~", "hyprland"))
)


# ── Las descripciones ───────────────────────────────────────────────────────
#
# El campo que da parse-binds.py se llama `que` y es el NOMBRE DEL SCRIPT:
# "rust dock toggle all", "toggle island", "focus left". Es cierto, sale de leer
# la configuracion de verdad, pero leido asi parece un log y no
# un un manual: nadie documenta un atajo diciendo "focus left".
#
# Asi que cada uno lleva ademas una frase. Estas estan escritas a mano, una por
# una, en vez de traducir el nombre del script con una regla: porque "toggle
# island" traducido automaticamente sale "alternar isla", y un manual que dice
# eso no ayuda a nadie. El nombre del script se queda puesto tambien, en un sitio
# aparte, porque es la pista de donde sale el atajo.
#
# Lo que no hay que hacer es inventar atajos. Los 78 salen del fichero, y si uno
# no esta en este mapa se queda con el nombre del script y punto, que es mejor
# que inventarle una descripcion.
NOTAS = {
    # Focus
    "focus left": "Move focus to the window on the left",
    "focus right": "Move focus to the window on the right",
    "focus up": "Move focus to the window above",
    "focus down": "Move focus to the window below",
    # General
    "terminal": "Open a terminal",
    "rust dock toggle all": "Show or hide the dock",
    "toggle island": "Fold or unfold the island",
    "show hotkeys": "Search every shortcut on the system",
    "settings menu": "Open the control centre",
    "wifi menu": "Connect to a network",
    "bluetooth menu": "Pair or forget a device",
    "open clipboard": "Open the clipboard history",
    "open notifications": "Open the notification centre",
    "close window": "Close the focused window",
    "log out": "Leave the session",
    "files": "Open the file manager",
    "float window": "Float or tile the focused window",
    "style3 monitor adaptive": "Open the launcher, styled for the screen it is on",
    "workspace overview": "See every workspace at once",
    "adaptive rofi window": "Switch windows with the launcher",
    # El comando es grim -g "$(slurp)" - | swappy -f -. Eso es: eliges un
    # RECTANGULO con el raton y sale solo esa parte. No hay atajo de pantalla
    # completa: los dos que hay, SUPER + P y SUPER + SHIFT + Print, son el mismo
    # comando y los dos son parciales. Decirlo aqui evita que se vaya a buscar un
    # atajo de captura completa que no existe.
    "screenshot": "Screenshot of a part of the screen: drag out the area with the "
                  "mouse and it opens in the editor. There is no full-screen one",
    "colour picker": "Pick a colour off the screen and copy its hex",
    "split layout": "Split the window in half",
    "fullscreen": "Fullscreen",
    "lock screen": "Lock the screen",
    "toggle performance": "Turn animations and blur down for gaming",
    "powermenu with monitor detection": "Shut down, reboot or sleep",
    "pywal wallpaper sync": "Recolour everything from the current wallpaper",
    "wallpaper selector": "Pick a wallpaper",
    "wallpaper change adaptive": "Pick a random wallpaper",
    # Media
    "media next": "Next track",
    "media play pause": "Play or pause",
    "media previous": "Previous track",
    # Misc
    "toggle bluetooth": "Turn Bluetooth on or off",
    "toggle keyboard layout": "Switch the keyboard layout",
    "cast screen": "Send the screen to a TV or another monitor",
    "volume down 5%": "Volume down",
    "volume up 5%": "Volume up",
    "keyboard backlight down": "Dim the keyboard",
    "keyboard backlight up": "Brighten the keyboard",
    "power save": "Switch the power profile",
    "toggle dnd": "Silence notifications, keep the history",
    # Mouse
    "move window": "Drag the window around",
    "resize window": "Drag the window's edge to resize it",
    # Scroll workspaces
    "workspace +1": "Next workspace, on the wheel",
    "workspace -1": "Previous workspace, on the wheel",
    # Special workspace
    "special workspace": "Open the scratchpad",
    "move to magic": "Send the window to the scratchpad",
    # Volume & brightness
    "volume dynamic up": "Volume up, in steps",
    "volume dynamic down": "Volume down, in steps",
    "volume dynamic mute": "Mute",
    "mute microphone": "Mute the microphone",
    "brightness dynamic up": "Brighter",
    "brightness dynamic down": "Dimmer",
}

# Los de workspace son veinte y son todos iguales, asi que se generan en vez de
# escribir veinte lineas. El orden va de 1 a 9 y luego 0, que es como lo cuenta
# todo el mundo.
for n in list(range(1, 10)) + [0]:
    NOTAS["workspace %d" % n] = "Go to workspace %d" % n
    NOTAS["move to workspace %d" % n] = "Send the window to workspace %d" % n


def atajos():
    """Los atajos, con su descripcion.

    Se llama a parse-binds.py en vez de reimplementar el parser aqui: ya esta
    escrito, ya esta probado contra los 78 que da hyprctl, y duplicarlo
    significaria dos sitios que se pueden desincronizar sin que nadie se entere.
    """
    salida = subprocess.run(
        ["python3", os.path.join(AQUI, "parse-binds.py"), REPO],
        capture_output=True, text=True,
    )
    if salida.returncode != 0 or not salida.stdout.strip():
        raise RuntimeError("parse-binds.py no ha devuelto nada:\n" + salida.stderr[:400])
    lista = json.loads(salida.stdout)
    for a in lista:
        a["nota"] = NOTAS.get(a["que"], a["que"])
    return lista


def banderas():
    """Las banderas del instalador, de `--help`.

    Se leen de ahi y no de la tabla del README porque el README se queda corto:
    `--help` documenta 14 y la tabla del README 12, y le faltan `--update` y
    `--skip-apps`. Si esto se sacara del README, la documentacion de la pagina
    estaria mas incompleta que la del propio repo.

    El formato es una bandera, hueco, y la descripcion. Las lineas de continuacion
    van mas indentadas que la primera, y se pegan a la de arriba: `--resume` ocupa
    tres lineas en el --help y si no se juntan se queda la descripcion cortada por
    la mitad.
    """
    salida = subprocess.run(
        [os.path.join(REPO, "install.sh"), "--help"],
        capture_output=True, text=True, cwd=REPO,
    )
    texto = salida.stdout + salida.stderr

    # Dos espacios, medidos en el --help de verdad. Con cuatro no casaba ni uno y
    # el fichero salia con cero banderas, sin que se notara: por eso esta funcion
    # tiene un aviso al final que avisa si el numero no es el que se espera.
    re_bandera = re.compile(r"^ {2}(-{1,2}[A-Za-z0-9][\w-]*)(?:, (-{1,2}[\w-]+))?"
                           r"(?: <[^>]+>)?\s\s+(.*)$")
    lista = []
    for linea in texto.split("\n"):
        m = re_bandera.match(linea)
        if m:
            corta, larga, desc = m.group(1), m.group(2), m.group(3).strip()
            lista.append({"corta": corta, "larga": larga or corta, "desc": desc})
            continue
        # Continuacion: 29 espacios en el --help, contra los 2 de la bandera. Sin
        # esto la descripcion de --resume se queda en "Continue an interrupted
        # install: steps already done", que no explica nada de lo que hace despues.
        if lista and len(linea) - len(linea.lstrip()) > 10 and linea.strip():
            lista[-1]["desc"] = (lista[-1]["desc"] + " " + linea.strip()).strip()
    # Se acaben en "Examples:" y los ejemplos sueltos, que empiezan por "./install.sh".
    return [b for b in lista if b["desc"] and not b["desc"].startswith("./")]


def componentes():
    """Los componentes, de la tabla del README.

    Se leen del README y no se hardcodean aqui por una razon: si estan en el fichero,
    se quedan viejos el dia que anadas una cosa y no te acuerdas de volver
    aqui. Leyendolas, se actualizan solas.
    """
    ruta = os.path.join(REPO, "README.md")
    if not os.path.exists(ruta):
        return []
    filas = []
    dentro = False
    for linea in open(ruta, encoding="utf-8"):
        s = linea.strip()
        if "Installed components" in s:
            dentro = True
            continue
        if dentro:
            if not s.startswith("|"):
                if filas:
                    break
                continue
            celdas = [c.strip() for c in s.strip("|").split("|")]
            if len(celdas) != 2:
                continue
            if celdas[0] in ("Component", "---") or set(celdas[0]) == {"-"}:
                continue
            filas.append({"que": celdas[0], "con": celdas[1]})
    return filas


def arbol():
    """Un resumen del arbol, para la seccion de estructura.

    No el arbol entero: son 122 scripts y listarlos todos en la pagina es una
    tabla que nadie va a leer de arriba abajo. Esto son las cifras y los sitios
    que de verdad hay que mirar.
    """
    out = {}

    def cuenta(rel, extension=None):
        d = os.path.join(REPO, rel) if rel else REPO
        if not os.path.isdir(d):
            return 0
        n = 0
        for raiz, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if x not in (".git", "__pycache__", "node_modules")]
            for f in files:
                if f.startswith("."):
                    continue
                if extension and not f.endswith(extension):
                    continue
                n += 1
        return n

    out["scripts"] = cuenta(".local/bin")
    out["conf"] = cuenta(".config/hypr", ".conf")
    out["servicios"] = cuenta(".config/systemd/user", ".service")
    out["temporizadores"] = cuenta(".config/systemd/user", ".timer")
    out["quickshell"] = cuenta(".config/quickshell", ".qml")
    out["sddm"] = cuenta("sddm")
    out["iconos"] = cuenta(".local/share/icons")
    return out


def version():
    """Que version del repo describe esto.

    Va dentro del fichero para que la pagina pueda decir "this documents v0.24"
    sin tener que preguntar a GitHub, que es una peticion por visita.
    """
    try:
        v = subprocess.run(
            ["git", "-C", REPO, "describe", "--tags", "--always"],
            capture_output=True, text=True,
        ).stdout.strip()
        return v or None
    except Exception:
        return None


def main():
    if not os.path.isdir(REPO):
        print("no encuentro el repo de hyprland en %s" % REPO)
        print("pon RHYTHM_HYPR=/ruta/al/repo y vuelve a correrlo")
        return 1

    try:
        lista = atajos()
        flags = banderas()
        comps = componentes()
    except Exception as e:
        print("fallo leyendo el repo: %s" % e)
        return 1

    # Los numeros se comprueban contra lo que se sabe. Si el dia de manana el
    # repo tiene 80 atajos, este aviso salta y se cambia el numero de aqui. Si no
    # esta el aviso, un parser roto que devuelva cero se cuela como si fuera
    # verdad: la pagina documentando un repo vacio, en silencio.
    avisos = []
    if len(lista) != 78:
        avisos.append("atajos: %d (se esperaban 78)" % len(lista))
    if len(flags) != 14:
        avisos.append("banderas: %d (se esperaban 14)" % len(flags))
    if len(comps) != 16:
        avisos.append("componentes: %d (se esperaban 16)" % len(comps))
    sin_nota = sorted(set(a["que"] for a in lista if a["nota"] == a["que"]
                          and a["que"] not in ("workspace +1", "workspace -1")))
    if sin_nota:
        avisos.append("sin descripcion: %s" % ", ".join(sin_nota))

    cuerpo = {
        "recogido": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "repo": "rhythmcreative/hyprland",
        "version": version(),
        "atajos": lista,
        "banderas": flags,
        "componentes": comps,
        "arbol": arbol(),
    }

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    tmp = DESTINO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("// Generado por scripts/collect-docs.py. No editar a mano.\n")
        f.write("// Lee el repo de hyprland. Para cambiarlo hay que correr el script:\n")
        f.write("//     ./scripts/collect-docs.py\n")
        f.write("// Ver el docstring del script para que lee y de donde.\n")
        f.write("window.RHYTHM_DOCS = ")
        json.dump(cuerpo, f, ensure_ascii=False, indent=None)
        f.write(";\n")
    os.replace(tmp, DESTINO)

    kb = os.path.getsize(DESTINO) / 1024
    print("documentacion.js escrito: %d atajos, %d banderas, %d componentes, %.0f KB"
          % (len(lista), len(flags), len(comps), kb))
    if version():
        print("  describe %s, recogido %s" % (cuerpo["version"], cuerpo["recogido"]))
    for a in avisos:
        print("  AVISO %s" % a)

    prerender = os.path.join(SITIO, "scripts", "prerender.js")
    if os.path.isfile(prerender):
        try:
            subprocess.run(["node", prerender], check=False, cwd=SITIO)
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())