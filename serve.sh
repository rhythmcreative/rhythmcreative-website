#!/usr/bin/env bash
# Levanta la web en local y dice la direccion.
#
# No es obligatorio: index.html se abre con doble clic y funciona, porque los
# datos van en ficheros .js y no en .json (un fetch de un JSON local desde
# file:// lo bloquea el navegador). Esto esta para cuando se quiere probar en
#condiciones parecidas a las de un servidor, que es como se vera en GitHub Pages.

set -euo pipefail

PUERTO="${1:-8788}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

case "$PUERTO" in
    ''|*[!0-9]*) echo "El puerto tiene que ser un numero" >&2; exit 1 ;;
esac

if command -v python3 >/dev/null 2>&1; then
    CMD=(python3 -m http.server "$PUERTO" --bind 127.0.0.1)
elif command -v busybox >/dev/null 2>&1; then
    CMD=(busybox httpd -f -p "127.0.0.1:$PUERTO" -h "$AQUI")
else
    echo "No hay python3 ni busybox para servir. Abre index.html directamente." >&2
    exit 1
fi

echo "Sirviendo $AQUI"
echo "  http://127.0.0.1:$PUERTO/"
echo "  Ctrl+C para parar"
cd "$AQUI"
exec "${CMD[@]}"
