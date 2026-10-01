#!/usr/bin/env bash
# Genera data/system.js con el estado REAL de este escritorio.
#
# Por que un .js y no un .json: la pagina tiene que poder abrirse con doble clic
# en index.html, sin servidor. Un fetch() de un .json local desde file:// lo
# bloquea el navegador por CORS, pero un <script src="...js"> no. Por eso los
# datos van en window.RHYTHM_SYSTEM y no en un fetch.
#
# Todo lo que se recoge aqui es de solo lectura. No cambia nada del sistema, y
# lo que no encuentre lo deja en null en vez de fallar: si algo falta, la pagina
# lo muestra como "no disponible" en lugar de romperse.

set -uo pipefail

AQUI="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$AQUI/data/system.js"

# hyprctl solo funciona con la firma de Hyprland en el entorno. systemd no la
# pasa, asi que se descubre aqui, como en el resto del repo. Sin esto, esto
# devolveria la lista de monitores vacia y la pagina diria que no hay
# monitores, que es justo el fallo que se corrigio en el watcher del fondo.
if [ -z "${HYPRLAND_INSTANCE_SIGNATURE:-}" ]; then
    _r="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
    _s=$(ls -t "$_r/hypr/" 2>/dev/null | head -n1)
    [ -n "$_s" ] && export HYPRLAND_INSTANCE_SIGNATURE="$_s"
fi

# json_string: deja un valor seguro dentro de una cadena de JSON.
json_string() {
    printf '%s' "${1:-}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/ /g' | tr -d '\000-\010\013\014\016-\037'
    printf '\n'
}
# json_num: un numero, o null si no hay numero.
json_num() {
    case "${1:-}" in
        ''|*[!0-9.]*) printf 'null\n' ;;
        *) printf '%s\n' "$1" ;;
    esac
}

[ -f "$HOME/.cache/wal/colors.json" ] && HAY_PYWAL=1 || HAY_PYWAL=0

# ── monitors ─────────────────────────────────────────────────────────────────
MON_JSON="[]"
if command -v hyprctl >/dev/null 2>&1 && hyprctl monitors -j >/dev/null 2>&1; then
    MON_JSON=$(hyprctl monitors -j 2>/dev/null | python3 -c '
import json, sys
try:
    ms = json.load(sys.stdin)
except Exception:
    print("[]"); raise SystemExit
out = []
for m in ms:
    out.append({
        "name": m.get("name", "?"),
        "width": m.get("width"),
        "height": m.get("height"),
        "scale": m.get("scale"),
        "refresh": round(m.get("refresh", 0)) or None,
        "primary": bool(m.get("focused")),
    })
print(json.dumps(out))
')
fi

# ── atajos ───────────────────────────────────────────────────────────────────
BIND_JSON="[]"
if command -v hyprctl >/dev/null 2>&1; then
    BIND_JSON=$(hyprctl binds -j 2>/dev/null | python3 -c '
import json, sys
try:
    bs = json.load(sys.stdin)
except Exception:
    print("[]"); raise SystemExit
salidas = []
for b in bs:
    m = b.get("key", "")
    if not m:
        continue
    d = b.get("dispatcher", "")
    # En Hyprland 0.56 con el parser nuevo, TODO atajo pasa por el despachador
    # "__lua" con un indice al config, porque el config esta escrito con
    # hl.bind(). Filtrar por dispatcher distinto de __lua deja la lista VACIA:
    # es como estan escritos de verdad, asi que se cuentan todos y se marca
    # cuales vienen de Lua para poder decirlo en la pagina.
    salidas.append({
        "key": m,
        "mod": b.get("modmask", 0),
        "d": d,
        "lua": d == "__lua",
        "arg": b.get("arg", ""),
        "desc": b.get("description", "") or "",
    })
print(json.dumps(salidas))
')
fi

# ── temperaturas ─────────────────────────────────────────────────────────────
# Se leen de hwmon en vez de usar sensors: no necesita el paquete lm_sensors
# instalado y por HW y no por indice, que cambia al reconectar.
TEMP_JSON="null"
if [ -r /sys/class/hwmon ]; then
    TEMP_JSON=$(python3 - <<'PY'
import glob, json, os
def leer(pat):
    for f in glob.glob(pat):
        try:
            with open(f) as fh:
                return int(fh.read().strip()) / 1000.0
        except Exception:
            pass
    return None
salidas = []
# k10temp es la CPU en AMD, coretemp en Intel.
for etiqueta, patron in (("cpu", "/sys/class/hwmon/hwmon*/temp1_input"),
                         ("gpu", "/sys/class/hwmon/hwmon*/temp1_input")):
    v = leer(patron)
    if v is not None:
        salidas.append({"label": etiqueta, "c": round(v, 1)})
        break
# El resto de sensores se listan aparte, sin adivinar cual es cual.
otros = []
for base in sorted(glob.glob("/sys/class/hwmon/hwmon*")):
    nombre = "?"
    try:
        with open(os.path.join(base, "name")) as fh:
            nombre = fh.read().strip()
    except Exception:
        continue
    for i in range(1, 7):
        v = leer(os.path.join(base, "temp%d_input" % i))
        if v is not None:
            otros.append({"chip": nombre, "c": round(v, 1)})
print(json.dumps({"cpu": salidas[0]["c"] if salidas else None, "all": otros}))
PY
)
fi

# ── servicios ────────────────────────────────────────────────────────────────
SERV_JSON="[]"
if command -v systemctl >/dev/null 2>&1; then
    SERV_JSON=$(systemctl --user list-units --type=service --no-pager --all --no-legend 2>/dev/null | python3 -c '
import json, sys
activo = fallo = 0
for linea in sys.stdin:
    p = linea.split()
    if len(p) < 4:
        continue
    est = p[2]
    if est == "active":
        activo += 1
    elif est == "failed":
        fallo += 1
print(json.dumps({"activos": activo, "fallidos": fallo}))
')
fi

# ── uptime y carga ───────────────────────────────────────────────────────────
UPTIME_S=$(cut -d. -f1 /proc/uptime 2>/dev/null)
# El uptime se cuenta aqui y no con `uptime -p`: esa salida sale en ingles
# ("up 4 hours, 42 minutes") porque el locale del sistema es C, y esto va en la
# pagina, donde no tiene por que leerse en ingles.
UP_HUMANO=""
if [ -n "$UPTIME_S" ] && [ "$UPTIME_S" -eq "$UPTIME_S" ] 2>/dev/null; then
    d=$((UPTIME_S / 86400)); h=$(((UPTIME_S % 86400) / 3600)); m=$(((UPTIME_S % 3600) / 60))
    if   [ "$d" -gt 0 ]; then UP_HUMANO="${d} d ${h} h"
    elif [ "$h" -gt 0 ]; then UP_HUMANO="${h} h ${m} min"
    else                      UP_HUMANO="${m} min"; fi
fi
LOAD=$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null)
[ -n "$LOAD" ] && LOAD=$(printf '%s' "$LOAD" | tr ' ' ',')

# ── kernel, paquetes, disco ──────────────────────────────────────────────────
KERNEL=$(uname -r 2>/dev/null)
# `hostname` no siempre esta en el PATH de un systemd-minimal, asi que se lee de
# /proc, que siempre esta. Con el comando solo, el nombre salia vacio.
HOST=$(cat /proc/sys/kernel/hostname 2>/dev/null || hostname 2>/dev/null)
if command -v pacman >/dev/null 2>&1; then
    PAQUETES=$(pacman -Qq 2>/dev/null | wc -l)
else
    PAQUETES=""
fi
DISCO=$(df -h --output=avail,pcent / 2>/dev/null | tail -1 | awk '{print $1}')
DISCO_P=$(df -h --output=avail,pcent / 2>/dev/null | tail -1 | awk '{print $2}')

# ── fondo de pantalla y tema vivo ────────────────────────────────────────────
WALLPAPER=$(python3 - <<'PY'
import json, os
p = os.path.expanduser("~/.cache/current-wallpaper")
if os.path.exists(p):
    try:
        print(open(p).read().strip())
    except Exception:
        pass
PY
)

PYWAL_JSON="null"
if [ "$HAY_PYWAL" = "1" ]; then
    PYWAL_JSON=$(python3 - <<'PY'
import json, os
try:
    d = json.load(open(os.path.expanduser("~/.cache/wal/colors.json")))
except Exception:
    print("null"); raise SystemExit
c, s = d.get("colors", {}), d.get("special", {})
print(json.dumps({
    "bg": s.get("background"), "fg": s.get("foreground"),
    "c0": c.get("color0"), "c1": c.get("color1"),
    "c2": c.get("color2"), "c3": c.get("color3"),
    "c4": c.get("color4"), "c5": c.get("color5"),
}))
PY
)
fi

# ── escritura ──────────────────────────────────────────────────────────────────────
{
    printf '// Generado por scripts/collect-system-stats.sh. No editar a mano.\n'
    printf '// Ultima vez: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    printf 'window.RHYTHM_SYSTEM = {\n'
    printf '  generado: "%s",\n' "$(json_string "$(date '+%Y-%m-%d %H:%M:%S')")"
    printf '  hostname: "%s",\n' "$(json_string "$HOST")"
    printf '  kernel: "%s",\n' "$(json_string "$KERNEL")"
    printf '  uptime_s: %s,\n' "$(json_num "$UPTIME_S")"
    printf '  uptime: "%s",\n' "$(json_string "$UP_HUMANO")"
    printf '  loadavg: "%s",\n' "$(json_string "$LOAD")"
    printf '  paquetes: %s,\n' "$(json_num "$PAQUETES")"
    printf '  disco_libre: "%s",\n' "$(json_string "$DISCO")"
    printf '  disco_porcentaje: "%s",\n' "$(json_string "$DISCO_P")"
    printf '  wallpaper: "%s",\n' "$(json_string "$WALLPAPER")"
    printf '  monitors: %s,\n' "$MON_JSON"
    printf '  binds: %s,\n' "$BIND_JSON"
    printf '  temps: %s,\n' "$TEMP_JSON"
    printf '  servicios: %s,\n' "$SERV_JSON"
    printf '  pywal: %s\n' "$PYWAL_JSON"
    printf '};\n'
} > "$DESTINO"

# ── resumen por consola ──────────────────────────────────────────────────────
NMON=$(printf '%s' "$MON_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
NBIND=$(printf '%s' "$BIND_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
echo "system.js escrito en $DESTINO"
echo "  monitors: $NMON   atajos: $NBIND   paquetes: ${PAQUETES:-?}"
