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

set -euo pipefail

PUERTO="${1:-8788}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

case "$PUERTO" in
    ''|*[!0-9]*) echo "El puerto tiene que ser un numero" >&2; exit 1 ;;
esac

if ! command -v python3 >/dev/null 2>&1; then
    echo "No hay python3. Abre index.html directamente." >&2
    exit 1
fi

exec python3 "$AQUI/serve.py" "$PUERTO"
