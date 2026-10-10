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
import gzip
import io
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

    # Que cabecera de cache se manda. Lo normal es "no-cache", que NO es lo que
    # parece: deja guardar el fichero pero obliga a preguntar antes de usarlo. Con
    # el ETag de abajo, esa pregunta se responde con un 304 vacio, y una recarga
    # no baja practicamente nada. Con "fresco" se vuelve a no-store, que es lo
    # que habia antes y no deja ni guardar una copia.
    cabecera_cache = "no-cache"

    def __init__(self, *args, directorio, **kwargs):
        super().__init__(*args, directory=directorio, **kwargs)

    def _etag(self):
        """Una etiqueta por fichero, o None si no hay fichero que servir.

        La etiqueta tiene que cambiar cuando el contenido cambia, y solo entonces.
        Con la fecha de modificacion y el tamaño sale: si tocas el fichero, cambia
        la fecha, y si dos ficheros distintos tienen la misma fecha, el tamaño los
        distingue. Con solo la fecha habia un fallo raro —reescribir un fichero
        dentro del mismo segundo—, que es de los que hacen perder media tarde.
        """
        ruta = self.translate_path(self.path)
        if os.path.isdir(ruta):
            ruta = os.path.join(ruta, "index.html")
        try:
            st = os.stat(ruta)
        except OSError:
            return None
        return '"%x-%x"' % (int(st.st_mtime_ns), st.st_size)

    def end_headers(self):
        # Ahi es donde el padre escribe las cabeceras: se anade esta antes de
        # cerrar la cabecera, que es lo que hace insertar cabeceras de verdad.
        self.send_header("Accept-Ranges", "bytes")
        # El ETag es lo que arregla la recarga. Antes no habia ni Cache-Control ni
        # ETag, asi que el navegador se guardaba el CSS y el JS con el criterio que
        # cada uno se inventa y no siempre revalidaba: se cambia el CSS y la pagina
        # sigue igual, que es cuando uno cree que el cambio no ha surtido efecto.
        # Pasa porque el Last-Modified solo, sin ETag, no obliga a revalidar nada.
        etiqueta = self._etag()
        if etiqueta:
            self.send_header("ETag", etiqueta)
        self.send_header("Cache-Control", self.cabecera_cache)
        super().end_headers()

    def _sin_cambios(self):
        """True si el navegador ya tiene la copia buena y no hay que mandarla.

        Es la respuesta 304, que no lleva cuerpo: el navegador se queda con lo que
        ya tenia. Medido en la recarga: sin esto bajaba 604 KB cada vez, y con esto
        baja 1 KB, que es solo el HTML.
        """
        etiqueta = self._etag()
        adelante = self.headers.get("If-None-Match")
        if not etiqueta or not adelante:
            return False
        # If-None-Match puede ser una lista, y cualquiera de las dos cosas que se
        # pueden poner ahi es "que me tienes lo que te pedi": la lista entera o un
        # asterisco. La respuesta a cualquiera de las dos es la misma.
        return "*" in adelante or etiqueta in [x.strip() for x in adelante.split(",")]

    def _es_de_git(self, ruta):
        """True si la ruta cae dentro de un .git.

        Sin esto, http://127.0.0.1:8788/.git/config responde 200 y entrega el
        repositorio entero: el historial, las ramas, y lo que se hubiera
        configurado ahi. En local no pasa nada, pero este servidor tiene un
        --bind que lo pone a escuchar en la red sin contrasena, que es justo como
        se prueba desde el movil. Y nada de lo que la pagina necesita esta en
        .git, asi que no se pierde nada.
        """
        # Se compara por partes, no con "in": "/x/.gitignore" no es "/x/.git/" y
        # ese fichero si se quiere servir.
        partes = ruta.replace(os.sep, "/").split("/")
        return ".git" in partes

    def send_head(self):
        """Devuelve la respuesta a un GET o a un HEAD. El padre decide el 200."""
        if self._es_de_git(self.translate_path(self.path)):
            self.send_error(404, "File not found")
            return None

        rango = self.headers.get("Range")

        # El 304 se comprueba solo sin rango: una peticion por rango siempre quiere
        # bytes de verdad, y responderle con un "no ha cambiado" la deja sin nada.
        if not rango and self._sin_cambios():
            self.send_response(304)
            self.end_headers()
            return None

        if not rango:
            ruta = self.translate_path(self.path)
            if os.path.isdir(ruta):
                for idx in ("index.html", "index.htm"):
                    cand = os.path.join(ruta, idx)
                    if os.path.exists(cand):
                        ruta = cand
                        break
            if not os.path.isdir(ruta) and os.path.exists(ruta):
                ae = self.headers.get("Accept-Encoding", "")
                ctype = self.guess_type(ruta)
                es_texto = (
                    ctype.startswith("text/")
                    or ctype in ("application/javascript", "application/json", "image/svg+xml")
                )
                if "gzip" in ae and es_texto:
                    try:
                        with open(ruta, "rb") as f_in:
                            datos = f_in.read()
                        if len(datos) > 200:
                            gz_datos = gzip.compress(datos, compresslevel=6)
                            self.send_response(200)
                            self.send_header("Content-Type", ctype)
                            self.send_header("Content-Encoding", "gzip")
                            self.send_header("Content-Length", str(len(gz_datos)))
                            fs = os.stat(ruta)
                            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                            self.end_headers()
                            return io.BytesIO(gz_datos)
                    except OSError:
                        pass
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
    ap.add_argument(
        "--fresco",
        action="store_true",
        help=(
            "No deja ni guardar copias en el navegador. Por defecto el servidor "
            "guarda el ETag y responde 304 a lo que no ha cambiado, que recarga "
            "al instante y siempre trae la version nueva."
        ),
    )
    args = ap.parse_args()

    manejador = partial(ConRangos, directorio=args.dir)
    if args.fresco:
        # Se cambia en la clase y no en la instancia: el manejador se crea por
        # peticion, y la cabecera se escribe en end_headers, que no recibe nada.
        ConRangos.cabecera_cache = "no-store"
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