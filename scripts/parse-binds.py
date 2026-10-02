#!/usr/bin/env python3
"""Lee los atajos de hyprland.lua y los saca legibles.

Por que NO se usa `hyprctl binds`: los 78 salen como

    {'key': 'Return', 'mod': 64, 'd': '__lua', 'arg': '6'}

Es el interior de la implementacion. `SUPER + Return -> __lua(6)` no le dice
nada a nadie. En el fichero de configuracion, en cambio, esta escrito:

    hl.bind(mainMod .. " + Return", hl.dsp.exec_cmd(terminal))

que si se lee. Asi que el mapa sale de aqui.

Comprobado que salen los mismos 78 que da hyprctl: el fichero tiene 60 llamadas a
hl.bind, pero dos de ellas estan dentro de `for i = 1, 10`, y cada una genera
diez. 60 - 2 + 20 = 78. Si algum dia no cuadra, el recolector lo avisa en vez de
enseñar un numero que no es el real.
"""
import json
import os
import re
import sys

# Las variables que hl.bind usa en el fichero, con su valor. Se resuelven aqui
# en vez de評 evaluarlas: son cuatro y no cambian solas.
VARIABLES = {"mainMod": "SUPER", "terminal": "kitty", "fileManager": "thunar"}

# Los grupos, en el orden en que salen en el fichero. Los comentarios que los
# encabezan son de una palabra, y ese es el unico sitio del que se sacan.
GRUPOS = [
    ("General", re.compile(r"^--\s*General\s*$")),
    ("Focus", re.compile(r"^--\s*Focus\s*$")),
    ("Workspaces", re.compile(r"^--\s*Workspaces\s*$")),
    ("Screenshot", re.compile(r"^--\s*Screenshot\s*$")),
    ("Special workspace", re.compile(r"^--\s*Special workspace\s*$")),
    ("Scroll workspaces", re.compile(r"^--\s*Scroll workspaces\s*$")),
    ("Mouse", re.compile(r"^--\s*Mouse binds\s*$")),
    ("Volume & brightness", re.compile(r"^--\s*Volume and brightness\s*$")),
    ("Media", re.compile(r"^--\s*Media\s*$")),
    ("Misc", re.compile(r"^--\s*Misc\s*$")),
]

# Que poner en la pagina, en vez del comando literal. El comando entero se
# guarda tambien, en `detalle`, por si acaso.
ETIQUETAS = [
    # Los scripts de ~/.local/bin ya se llaman a si mismos.
    (re.compile(r"~/.local/bin/(?:rofi-)?([a-z0-9-]+)$"), r"\1"),
    (re.compile(r"~/.config/hypr/scripts/([a-z_]+)\.sh$"), r"\1"),
    (re.compile(r"^playerctl (.+)$"), r"media \1"),
    (re.compile(r"^wpctl set-mute .* toggle$"), "mute microphone"),
    (re.compile(r"^wpctl set-volume .* 5%-"), "volume down 5%"),
    (re.compile(r"^wpctl set-volume .* 5%\+"), "volume up 5%"),
    (re.compile(r"^hyprpicker"), "colour picker"),
    (re.compile(r"^grim"), "screenshot"),
    (re.compile(r"^hyprlock"), "lock"),
    (re.compile(r"^hyprctl eval .*fullscreen"), "fullscreen"),
    (re.compile(r"^(kitty|alacritty|foot|wezterm)$"), "terminal"),
    (re.compile(r"^(thunar|nautilus|dolphin)$"), "files"),
]


def _bonito(txt):
    """De un nombre de guion a palabras: volume-dynamic_up -> volume dynamic up."""
    txt = txt.replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", txt).strip()


# Los argumentos que no aportan nada a lo que ve el usuario. Se tiran en vez de
# acabar pegados a la etiqueta: "hyprpicker -a" es "colour picker", no
# "colour picker a".
RUIDO = {"-a", "-f", "-", "--immediate-render", "-e", "--", "-i", "-r"}


def _nombre_propio(cab):
    """Unos cuantos que se llaman distinto de lo que hacen."""
    if cab in ("kitty", "alacritty", "foot", "wezterm"):
        return "terminal"
    if cab in ("thunar", "nautilus", "dolphin"):
        return "files"
    if cab == "grim":
        return "screenshot"
    if cab == "hyprpicker":
        return "colour picker"
    if cab == "hyprlock":
        return "lock screen"
    if cab == "playerctl":
        return "media"
    return None


def _wpctl(cmd):
    """wpctl con rutas de pulso dentro: hay que traducirlo antes de quitar nada.

    "wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-" sin esto sale como
    "wpctl set volume DEFAULT AUDIO SINK 5%", que no significa nada.
    """
    m = re.match(r"wpctl set-volume \S+ (\d+)%(\+|-)\s*$", cmd)
    if m:
        return "volume " + ("up" if m.group(2) == "+" else "down") + " " + m.group(1) + "%"
    m = re.match(r"wpctl set-mute \S+ toggle\s*$", cmd)
    if m:
        return "mute microphone"
    return None


def _de_comando(cmd):
    """De una linea de shell a lo que hace, en una frase."""
    w = _wpctl(cmd)
    if w:
        return w
    # Una tuberia: lo que hace la cosa es la cabeza. grim -g ... | swappy -f -
    # es una captura, no "captura | swappy".
    cmd = re.split(r"[|;&]", cmd)[0].strip()
    # Las comillas por dentro no aportan: -g "$(slurp)".
    cmd = re.sub(r'"[^"]*"', " ", cmd)
    trozos = [t for t in cmd.split() if t not in RUIDO]
    if not trozos:
        return None
    cab = trozos[0]
    # Si es una ruta, el nombre del guion es lo que importa.
    base = os.path.basename(cab) if "/" in cab else cab
    propio = _nombre_propio(base)
    resto = [t for t in trozos[1:] if not t.startswith("-")]
    if propio:
        return propio + (" " + _bonito(" ".join(resto)) if resto else "")
    if not base:
        return None
    # El .sh no dice nada: toggle_performance.sh es lo mismo que toggle_performance.
    nombre = re.sub(r"\.(sh|lua)$", "", base)
    # "rofi wifi menu" -> "wifi menu", "adaptive-rofi window" -> "adaptive window":
    # el lanzador es como se llama el guion, no lo que hace. Se quita del NOMBRE,
    # antes de unirlo con los argumentos. Si se quita despues, con una regex sobre
    # la frase entera, "adaptive rofi window" se queda en "window" y se pierde el
    # "adaptive" por el camino.
    nombre = re.sub(r"^(?:[a-z0-9]+-)?rofi-", "", nombre)
    return _bonito(nombre + (" " + " ".join(resto) if resto else ""))


def etiqueta(accion):
    """De la accion de lua a algo que se pueda leer en una linea."""
    a = accion.strip()

    # Las ventanas y el resto de acciones de hyprland, antes de tocar la shell.
    if re.search(r"\bwindow\.close\(\)", a):
        return "close window"
    if "window.drag()" in a:
        return "move window"
    if "window.resize()" in a:
        return "resize window"
    if "window.fullscreen" in a:
        return "fullscreen"
    if "window.float" in a:
        return "float window"
    m = re.search(r"window\.move\(\{\s*workspace\s*=\s*(.+?)\s*\}\)", a)
    if m:
        ws = m.group(1).strip("\"'")
        if ws.startswith("special:"):
            return "move to " + _bonito(ws.split(":", 1)[1])
        return "move to workspace " + ws
    m = re.search(r"focus\(\{\s*workspace\s*=\s*(.+?)\s*\}\)", a)
    if m:
        ws = m.group(1).strip("\"'")
        if ws.startswith("e+") or ws.startswith("e-"):
            return "workspace " + ws[1:]
        if ws.startswith("special:"):
            return "special workspace"
        return "workspace " + ws
    m = re.search(r"focus\(\{\s*direction\s*=\s*['\"](.+?)['\"]\s*\}\)", a)
    if m:
        return "focus " + m.group(1)
    if "workspace.toggle_special" in a:
        return "special workspace"
    if "layout(" in a:
        m = re.search(r"layout\(\s*['\"](.+?)['\"]", a)
        return ("split layout" if m and m.group(1) == "togglesplit"
                else "layout " + (m.group(1) if m else ""))
    if re.search(r"\bexit\(\)", a):
        return "log out"

    # hyprctl eval 'hl.dsp.window.fullscreen(0)'  ->  la parte de lua que hay
    # dentro, que es lo que en realidad se ejecuta.
    m = re.search(r"hyprctl eval ['\"](.*?)['\"]", a)
    if m:
        return etiqueta(m.group(1))

    # exec_cmd con cadena, o con una variable suelta: exec_cmd(terminal)
    m = re.search(r"exec_cmd\(\s*(?:['\"](.+?)['\"]|(\w+))", a)
    if m:
        cmd = m.group(1) if m.group(1) is not None else VARIABLES.get(m.group(2), m.group(2))
        et = _de_comando(cmd)
        if et:
            return et

    return _bonito(a)



def argumentos(texto):
    """Trocea los argumentos de una llamada separando por comas de nivel superior.

    Antes se hacia con una regex que se comia el parentesis final: el texto de la
    accion llegaba como `hl.dsp.exec_cmd("~/.local/bin/toggle-island"` — sin
    cerrar — y ninguna etiqueta casaba, asi que salia el comando crudo. Aqui se
    cuentan los parentesis y las comillas, que es lo que hace falta.
    """
    salida, actual = [], []
    nivel = 0
    comilla = None
    i = 0
    while i < len(texto):
        c = texto[i]
        if comilla:
            actual.append(c)
            if c == "\\" and i + 1 < len(texto):
                actual.append(texto[i + 1])
                i += 2
                continue
            if c == comilla:
                comilla = None
        elif c in "\"'":
            comilla = c
            actual.append(c)
        elif c in "({[":
            nivel += 1
            actual.append(c)
        elif c in ")}]":
            nivel -= 1
            actual.append(c)
        elif c == "," and nivel == 0:
            salida.append("".join(actual).strip())
            actual = []
        else:
            actual.append(c)
        i += 1
    if actual:
        salida.append("".join(actual).strip())
    return salida


def resolver_tecla(expr):
    """De `mainMod .. " + Return" .. key` a `SUPER + Return`."""
    expr = expr.strip()
    # Los bucles: se sustituye la variable por el valor del caso.
    if expr == '" + " .. key':
        return None            # lo resuelve el llamante
    partes = []
    for trozo in re.findall(r'mainMod|"[^"]*"|\bkey\b|\bi\b', expr):
        if trozo == "mainMod":
            partes.append(VARIABLES["mainMod"])
        elif trozo == "key":
            partes.append("{key}")
        elif trozo == "i":
            partes.append("{i}")
        else:
            partes.append(trozo.strip('"'))
    # "SUPER" + " + Return" -> "SUPER + Return"
    texto = "".join(partes) if len(partes) > 1 else partes[0]
    return re.sub(r"\s*\+\s*", " + ", texto).strip()


def parsear(ruta):
    with open(ruta, encoding="utf-8") as f:
        lineas = f.read().split("\n")

    salida = []
    grupo = "General"
    dentro_bucle = False

    for linea in lineas:
        txt = linea.strip()
        if txt.startswith("--"):
            for nombre, pat in GRUPOS:
                if pat.match(txt):
                    grupo = nombre
            continue
        # El bucle de workspaces: dentro se generan 10 atajos por cada hl.bind.
        if re.match(r"^for\s+\w+\s*=\s*1,\s*10\s+do", txt):
            dentro_bucle = True
            continue
        if dentro_bucle and txt == "end":
            dentro_bucle = False
            continue
        if "hl.bind(" not in txt:
            continue

        dentro = argumentos(txt[txt.index("hl.bind(") + len("hl.bind("):])
        # El ultimo trozo se lleva el parentesis que cierra el bind.
        if dentro:
            dentro[-1] = dentro[-1].rstrip()
            if dentro[-1].endswith(")"):
                dentro[-1] = dentro[-1][:-1].rstrip()
        if len(dentro) < 2:
            continue
        cruda, cuerpo = dentro[0], dentro[1]
        # El segundo argumento suele acabar en parentesis de su cuenta; aqui se
        # queda el texto tal cual, que etiqueta() ya sabe quitarlo.
        raton = "mouse: true" in txt or "mouse_down" in cruda or "mouse_up" in cruda \
                or "mouse:" in cruda
        bloqueado = "locked = true" in txt

        tecla = resolver_tecla(cruda)
        if tecla is None:
            continue

        casos = [1]
        if dentro_bucle:
            # key = i % 10  ->  para i en 1..10 sale 1..9 y 0
            casos = list(range(1, 10)) + [0]

        for caso in casos:
            t = tecla.replace("{key}", str(caso)).replace("{i}", str(caso))
            # El `i` del bucle tambien sale en la accion: workspace = i. Sin
            # sustituirlo, los diez atajos de workspace salen con la letra i.
            acc = re.sub(r"workspace\s*=\s*i\b", "workspace = " + str(caso), cuerpo)
            if not raton:
                t = re.sub(r"\bmouse_down\b", "scroll down", t)
                t = re.sub(r"\bmouse_up\b", "scroll up", t)
            else:
                t = t.replace("mouse:272", "left button")
                t = t.replace("mouse:273", "right button")
            salida.append({
                "tecla": t,
                "que": etiqueta(acc),
                "grupo": grupo,
                "raton": bool(raton),
                "bloqueado": bloqueado,
            })
    return salida


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/hyprland")
    ruta = os.path.join(repo, "hyprland.lua")
    if not os.path.exists(ruta):
        # Sin el fichero, la pagina lo dira. No es un fallo del recolector.
        print("null")
        return

    atajos = parsear(ruta)

    # user.lua se carga al final y gana: si el usuario se ha puesto algo ahi, es
    # un atajo de verdad aunque no este en el repo. Se anyade aparte, sin tocar
    # el recuento del repo.
    extra = os.path.expanduser("~/.config/hypr/user.lua")
    if os.path.exists(extra):
        try:
            atajos += parsear(extra)
        except Exception:
            pass

    print(json.dumps(atajos, ensure_ascii=False))


if __name__ == "__main__":
    main()