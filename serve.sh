#!/usr/bin/env bash
# Levanta la web en local y dice la direccion.
#
# No es obligatorio: index.html se abre con doble clic y funciona, porque los
# datos van en ficheros .js y no en .json (un fetch de un JSON local desde
# file:// lo bloquea el navegador). Esto esta para cuando se quiere probar en
#condiciones parecidas a las de un servidor, que es como se vera en GitHub Pages.

# Va con serve.py y no con "python3 -m http.server" porque este ultimo no sabe
# responder a una peticion por rango, y en cuanto hay un <video> el navegador
# solo ve el poster: el control de reproduccion no arranca. GitHub Pages si
# soporta rangos, asi que en el sitio publicado no hay problema; el problema es
# solo de este servidor de desarrollo.

# El ETag y el 304 los pone serve.py. Por defecto el servidor guarda lo que se le
# pide y responde "no ha cambiado" a lo que ya tienes, que recarga al instante y
# aun asi trae siempre la version nueva. Con --fresco se vuelve al modo de antes,
# en el que el navegador no guarda nada y cada recarga baja los 600 KB enteros.
#
#   ./serve.sh 8788            normal: recarga instantanea y sin ficheros viejos
#   ./serve.sh 8788 --fresco   sin cache: para medir de verdad, o si algo se porta raro

set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
PUERTO=8788

# El puerto puede ir delante o no ir, y --fresco puede ir en cualquier orden. Se
# recoge todo en una lista y se le pasa a serve.py lo que sobre. Con "set -e" un
# "[ ... ] && shift" que no se cumple mataria el script aqui, asi que los shifts
# van dentro de un if y nunca solos en una linea con "&&".
RESTO=()
for ARG in "$@"; do
    case "$ARG" in
        --fresco) RESTO+=("$ARG") ;;
        ''|*[!0-9]*) echo "El puerto tiene que ser un numero: $ARG" >&2; exit 1 ;;
        *) PUERTO="$ARG" ;;
    esac
done

if ! command -v python3 >/dev/null 2>&1; then
    echo "No hay python3. Abre index.html directamente." >&2
    exit 1
fi

exec python3 "$AQUI/serve.py" "$PUERTO" ${RESTO[@]+"${RESTO[@]}"}
