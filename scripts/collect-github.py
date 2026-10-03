#!/usr/bin/env python3
"""Guarda los datos de GitHub en data/github.js.

POR QUE ESTO NO LO HACE LA PAGINA
----------------------------------
La API de GitHub sin token da 60 peticiones por hora por IP, y la pagina
hacia una por repos: 19. Con tres visitas al dia la cuota se acababa, y cuando
se acaba el API responde con un objeto de error en vez de una lista. La pagina
entonces decia "sin commits publicos", que es mentira: lo que pasa es que le
han cortado.

Ademas desde file:// no se puede consultar la API sin CORS, y la pagina tiene
que poder abrirse con doble clic.

Lo que se hace aqui, en su lugar, es lo mismo que con el estado de la maquina:
un script recoge los datos y deja un fichero, y la pagina lo lee. Cuesta cero
llamadas por visita, funciona sin conexion, y la pagina puede decir la verdad
sobre cuando se recogieron.

Con GITHUB_TOKEN se suben a 5000 por hora. Sin el, 60: 19 repos + 8 listas de
commits son 27, asi que aguanta dos recogidas por hora. El timer lo lanza con
token de gh, asi que no importa, pero si lo corres a mano sin token, espera un
rato antes de repetir.

Los commits NO se sacan de /users/<u>/events/public. Esa llamada si los anuncia
(86 PushEvent de 100) pero llega con el array "commits" vacio en todos ellos, y
la pagina acababa diciendo que no habia commits cuando si los habia. Van por
/repos/<repo>/commits, que si los devuelve.
"""
import json
import os
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(AQUI, "data", "github.js")
CABECERA = {"Accept": "application/vnd.github+json", "User-Agent": "rhythm-site"}


def pedir(url):
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    cab = dict(CABECERA)
    if token:
        cab["Authorization"] = "Bearer " + token
    req = Request(url, headers=cab)
    with urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    # De donde sale la lista de repos.
    #
    # Antes se leia de assets/projects.js, que ya no existe:.projects.js se
    # borro cuando se quito la lista de repos de la pagina (commit da167d0, "El
    # reloj al centro, y la seccion en dos columnas"), y el recolector se quedo
    # apuntando a un fichero que no estaba. No se ha ejecutado desde entonces, asi
    # que data/github.js tenia los datos viejos.
    #
    # Ahora la lista sale de una variable: es la unica copia y se lee aqui, no en
    # dos sitios. Si algun dia vuelve a haber una lista en la pagina, esto es lo
    # que hay que volver a enganchar.
    REPOS = [
        "rhythmcreative/hyprland",
        "rhythmcreative/rust-dock",
        "rhythmcreative/wallpapers",
        "rhythmcreative/tiktok",
        "rhythmcreative/lineageos-flame-ota",
        "rhythmcreative/lineageos-akita-ota",
        "rhythmcreative/lineageos-husky-ota",
        "rhythmcreative/lineage-launcher",
        "rhythmcreative/motion-assist",
        "rhythmcreative/AppStore",
        "rhythmcreative/lineage-scripts",
        "rhythmcreative/lineage-build-scripts",
        "rhythmcreative/android",
        "rhythmcreative/Info",
        "rhythmcreative/Kiosk-chromium",
        "rhythmcreative/Kiosk-waydroid",
        "rhythmcreative/voice-satellite-card-llm-tools",
        "rhythmcreative/wakey",
        "rhythmcreative/apps-repository",
    ]
    repos = list(REPOS)

    fallos = []
    datos = {}
    # Cuantas releases se buscan. Con token da igual (5000 por hora), pero sin
    # token la cuota son 60 y buscar una release en cada repo son 20 peticiones
    # mas: se puede apagar con SIN_RELEASES=1.
    SIN_RELEASES = os.environ.get("SIN_RELEASES", "").strip() not in ("", "0", "no", "false")

    for nombre in repos:
        try:
            d = pedir("https://api.github.com/repos/" + nombre)
            datos[nombre] = {
                "stars": d.get("stargazers_count"),
                "lenguaje": d.get("language"),
                "push": d.get("pushed_at"),
                "desc": d.get("description"),
                "issues": d.get("open_issues_count"),
            }
        except HTTPError as e:
            fallos.append("%s (%d)" % (nombre, e.code))
        except Exception as e:
            fallos.append("%s (%s)" % (nombre, e))

    # La ultima release de cada repo: la version que tiene ahora mismo.
    #
    # No hay forma de saber si un repo tiene releases sin preguntar, asi que son
    # 20 llamadas. El 404 NO cuenta como fallo a proposito: la mayoria de estos
    # repos no ha publicado nunca una release, y meterlos en "fallos" haria que
    # la pagina dijera que algo va mal cuando lo unico que pasa es que no hay.
    if not SIN_RELEASES:
        for nombre, d in datos.items():
            try:
                r = pedir("https://api.github.com/repos/" + nombre + "/releases/latest")
                d["release"] = r.get("tag_name")
            except HTTPError as e:
                if e.code != 404:
                    fallos.append("%s release (%d)" % (nombre, e.code))
            except Exception as e:
                fallos.append("%s release (%s)" % (nombre, e))

    # ── Los commits recientes, que son las gotas de la lluvia ────────────────
    #
    # NO salen de /users/<u>/events/public aunque parezca lo natural. Se
    # comprueba: esa llamada devuelve 100 eventos con 86 PushEvent y el campo
    # "commits" de todos ellos llega VACIO. GitHub avisa de los pushes pero no
    # manda su contenido, asi que la pagina se quedaba sin lluvia y decia que
    # no habia commits, que no era verdad.
    #
    # La fuente que si los da es /repos/<repo>/commits. Cuesta una llamada por
    # repo, asi que solo se le pide a los 8 movidos hace poco, ordenados por
    # "pushed_at", que ya tenemos de la llamada anterior.
    RECIENTES = 8
    POR_REPO = 5
    commits = []
    vistos = set()
    recientes = sorted(
        (k for k in datos if datos[k].get("push")),
        key=lambda k: datos[k]["push"],
        reverse=True,
    )[:RECIENTES]
    for nombre in recientes:
        try:
            for c in pedir("https://api.github.com/repos/%s/commits?per_page=%d"
                           % (nombre, POR_REPO)):
                sha = (c.get("sha") or "")[:8]
                msg = (((c.get("commit") or {}).get("message")) or "").split("\n")[0]
                fecha = (((c.get("commit") or {}).get("committer")) or {}).get("date")
                if not msg or sha in vistos:
                    continue
                vistos.add(sha)
                commits.append({
                    "msg": msg,
                    "repo": nombre,
                    "sha": sha,
                    "cuando": fecha,
                    "quien": ((c.get("author") or {}).get("login")
                              or (((c.get("commit") or {}).get("author")) or {}).get("name")
                              or ""),
                })
        except HTTPError as e:
            fallos.append("commits %s (%d)" % (nombre, e.code))
        except Exception as e:
            fallos.append("commits %s (%s)" % (nombre, e))

    # De mas antiguo a mas reciente: asi la lluvia cae en orden cronologico.
    commits.sort(key=lambda c: c.get("cuando") or "")

    ahora = time.strftime("%Y-%m-%d %H:%M:%S")
    cuerpo = {
        "recogido": ahora,
        "cuota_ok": len(fallos) == 0,
        "fallos": fallos,
        "repos": datos,
        "commits": commits[:40],
        "total": sum(v["stars"] or 0 for v in datos.values()),
    }

    # Se escribe como .js y no como .json por lo mismo que system.js: un fetch
    # de un .json local desde file:// lo bloquea el navegador.
    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    tmp = DESTINO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("// Generado por scripts/collect-github.py. No editar a mano.\n")
        f.write("window.RHYTHM_GITHUB = ")
        json.dump(cuerpo, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    os.replace(tmp, DESTINO)

    print("github.js escrito: %d repos, %d commits de %d repos, %d estrellas%s" % (
        len(datos), len(commits[:40]), len(recientes),
        sum(v["stars"] or 0 for v in datos.values()),
        (", %d fallos" % len(fallos)) if fallos else ""))
    for f in fallos[:4]:
        print("   fallo:", f)
    return 0 if not fallos else 0


if __name__ == "__main__":
    sys.exit(main())
