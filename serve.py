#!/usr/bin/env python3
"""El servidor de la pagina, con lo que le falta al de Python.

El `http.server` de la biblioteca estandar no sabe responder a una peticion por
rango, y los navegadores las hacen siempre que hay un <video> en la pagina:
preguntan "dame los bytes del 0 al 1023" para no tener que bajarse los 2,7 MB
enteros antes de empezar a pintar.

Contestar con un 200 y el fichero entero, que es lo que hace SimpleHTTPServer,
deja al navegador sin poder avanzar: el <video> se queda en el poster y el
scrub no responde. Es el sintoma clasico de "no puedo reproducir".

Aqui se contestan con 206 Partial Content, que es lo que se pedia.

Un servidor de desarrollo y poco mas: sirve un directorio, sin HTTPS, sin
autenticacion, atado a loopback. No lo pongas en un sitio publico.
"""

import argparse
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# El navegador manda algo como "bytes=0-1023", "bytes=2000-" o "bytes=-500" para
# los tres casos. Los sufijos (k, m) no hacen falta aqui: un <video> nunca los
# usa, pero si se traga un numero enorme no revienta con un error de Python.
RANGO = re.compile(r"^bytes=(\d*)-(\d*)$")


class ConRangos(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler + respuestas 206 para peticiones por rango."""

    def __init__(self, *args, directorio, **kwargs):
        super().__init__(*args, directory=directorio, **kwargs)

    def end_headers(self):
        # Ahi es donde el padre escribe las cabeceras: se anade esta antes de
        # cerrar la cabecera, que es lo que hace insertar cabeceras de verdad.
        self.send_header("Accept-Ranges", "bytes")
        # Sin esto el navegador se guarda el CSS y el JS con su propio criterio y
        # los vuelve a pintar sin preguntar al servidor. Como no hay Cache-Control
        # ni ETag, el freshness es el que cada navegador se inventa, y recargar no
        # siempre revalida: se ve el fichero viejo, se cambia el CSS y la
        # pagina sigue igual, que es justo cuando uno cree que el cambio no ha
        # surtido efecto. Pasa porque el Last-Modified solo, sin ETag, no obliga a
        # revalidar nada.
        #
        # no-store y no max-age=0 a proposito: la primera no deja ni guardar la
        # copia, y la segunda la deja guardar pero obliga a preguntar cada vez.
        # En desarrollo da igual cual de las dos, y la segunda no evita el disco.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        """Devuelve la respuesta a un GET o a un HEAD. El padre decide el 200."""
        rango = self.headers.get("Range")
        if not rango:
            return super().send_head()

        coincide = RANGO.match(rango.strip())
        if not coincide:
            # Una cabecera Range que no se entiende no es un error: se ignora y
            # se manda el fichero entero, que es lo que haria cualquiera.
            return super().send_head()

        ruta = self.translate_path(self.path)
        if os.path.isdir(ruta):
            return super().send_head()
        try:
            fichero = open(ruta, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        tamano = os.fstat(fichero.fileno()).st_size
        primero, ultimo = coincide.groups()

        if primero:
            inicio = int(primero)
            # "bytes=2000-" acaba en el final del fichero.
            fin = int(ultimo) if ultimo else tamano - 1
        else:
            # "bytes=-500" son los ultimos 500 bytes, no desde el byte 500.
            largo = int(ultimo)
            inicio = max(0, tamano - largo)
            fin = tamano - 1

        # Lo que pidio mas alla del final: se recorta en vez de fallar, que es lo
        # que dice el RFC y lo que hacen los servidores de verdad.
        if inicio >= tamano:
            fichero.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{tamano}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        fin = min(fin, tamano - 1)

        largo = fin - inicio + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(ruta))
        self.send_header("Content-Range", f"bytes {inicio}-{fin}/{tamano}")
        self.send_header("Content-Length", str(largo))
        self.send_header("Last-Modified", self.date_time_string(os.fstat(fichero.fileno()).st_mtime))
        self.end_headers()

        # El padre devuelve un file object y se encarga de copiarlo al socket
        # en do_GET. Aqui se le entrega ya posicionado en el primer byte del
        # trozo, y se marca como "no cerrar" con el patron del modulo copyfile.
        fichero.seek(inicio)
        return _Trozo(fichero, largo)

    def log_message(self, formato, *args):
        sys.stderr.write("  %s\n" % (formato % args))


class _Trozo:
    """Fichero que solo deja leer `largo` bytes, para el copyfile del padre."""

    def __init__(self, fichero, largo):
        self.fichero = fichero
        self.largo = largo

    def read(self, n=-1):
        if self.largo <= 0:
            return b""
        if n is None or n < 0 or n > self.largo:
            n = self.largo
        datos = self.fichero.read(n)
        self.largo -= len(datos)
        return datos

    def close(self):
        self.fichero.close()


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description="Servidor de la pagina, con rangos.")
    ap.add_argument("puerto", nargs="?", type=int, default=8788)
    ap.add_argument("--bind", default="127.0.0.1")
    ap.add_argument("--dir", default=aqui)
    args = ap.parse_args()

    manejador = partial(ConRangos, directorio=args.dir)
    servidor = ThreadingHTTPServer((args.bind, args.puerto), manejador)

    print(f"Sirviendo {args.dir}")
    print(f"  http://{args.bind}:{args.puerto}/")
    print("  Ctrl+C para parar")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nParado")
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()