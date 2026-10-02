# Rhythm

La web donde caben los proyectos. HTML, CSS y JavaScript a pelo: sin build, sin
framework, sin dependencias. Se abre haciendo doble clic en `index.html` y
tambien se sirve tal cual desde GitHub Pages.

## Que es la pagina

Dos piezas, y solo dos.

**La barra.** Una capsula de cristal con un punto que brilla a la izquierda, el
nombre, dos enlaces y la hora. Ese punto no es decoracion: su color lo pone la
temperatura real de la CPU, leida de `data/system.js`. Con la maquina fria esta
apagado, con la maquina caliente brilla en oxido.

**El campo.** Lluvia y un ojo. El ojo se dibuja en cada cuadro en un `<canvas>`,
no es una imagen, y por eso te sigue con la pupila, parpadea, respira, y al
pincharlo suelta un anillo. Su paleta tambien sale de la temperatura real.

Debajo, los repos como capsulas sueltas. Pincha una y se abre ahi mismo, encima
de su sitio en la rejilla, como se abre tu isla.

De donde sale todo: tu fondo de pantalla es una noche con lluvia y unos ojos
rojos, y tu barra tiene un ojo. Eso es lo unico que hay.

## Anadir un proyecto

Editar `assets/projects.js` y anadir un objeto al array:

```js
{
  name: "lo-que-sea",
  repo: "rhythmcreative/lo-que-sea",
  stars: 0,                 // solo si no hay dato recogido de GitHub
  category: "desktop",      // desktop | android | home | tools
  tagline: "Una frase.",
  blurb: "Dos lineas explicando que es.",
  tags: ["hyprland", "rust"]
}
```

Los datos de GitHub (estrellas, lenguaje, ultimo push) se anaden solos desde
`data/github.js`, que los deja el recolector. `stars` es el valor de respaldo
para cuando aun no se ha recogido nada.

## Los datos

La pagina no pide nada a nadie. Dos scripts escriben dos ficheros y la pagina los
lee:

| Fichero | Quien lo escribe | Cada cuanto |
|---|---|---|
| `data/system.js` | `scripts/collect-system-stats.sh` | 5 min |
| `data/github.js` | `scripts/collect-github.py` | 2 h |

Los timers ya estan puestos:

```bash
systemctl --user list-timers rhythm-site-*
```

`collect-github.py` saca el token de `gh auth token` desde la unidad de systemd,
porque sin token la API de GitHub da 60 peticiones por hora y el recolector
manda 27. A mano:

```bash
GITHUB_TOKEN=$(gh auth token) ./scripts/collect-github.py
```

Ambos leen y nada mas: no tocan el sistema, y lo que no encuentran lo dejan en
`null` en vez de fallar.

## El sensor de la CPU

Ojo con esto, que ya fallo una vez: el recolector busca el sensor de la CPU
**por nombre** (`k10temp`, `coretemp`, `zenpower`, `x86_pkg_temp`, `cpu_thermal`),
no cogiendo el primero que aparezca. Antes cogia el primero por orden de
directorio y en este portatil salia `spd5118`, que es la RAM. La pagina decia
"cpu 64 grados, fresca" con la CPU a 96. `acpitz` se descarta ademas porque solo
rebota la lectura del SoC y hacia aparecer la CPU dos veces.

## Por que los datos van en .js y no en .json

Porque la pagina tiene que poder abrirse desde `file://`. Un `fetch()` de un
`.json` local ahi lo bloquea el navegador por CORS, y no hay forma de evitarlo
sin servidor. Un `<script src="datos.js">` no tiene ese problema, porque no es
una peticion: es un fichero de script mas.

Eso obliga a que el valor este en una asignacion (`window.RHYTHM_SYSTEM = {...}`)
en vez de ser JSON a pelo.

## Un detalle sobre la API de eventos

Los commits NO se sacan de `/users/<u>/events/public`, aunque parezca lo natural.
Esa llamada si anuncia los pushes (86 `PushEvent` de 100) pero el campo `commits`
de todos ellos llega vacio, y la pagina acababa diciendo que no habia commits
cuando si los habia. Van por `/repos/<repo>/commits`, que si los devuelve.

## Atajos

| Tecla | Que hace |
|---|---|
| `J` | Abre el primer proyecto |
| `Esc` | Cierra lo que este abierto |

El ojo tambien responde a `Enter` y a `Espacio` desde el teclado, para que no
dependa del raton.

## Accesibilidad

Con `prefers-reduced-motion: reduce` la lluvia no se dibuja y el ojo se pinta una
sola vez: no parpadea, no respira y no suelta ondas. La pupila sigue al raton,
porque eso es respuesta a lo que hace la persona y no movimiento por su cuenta.

## En local

```bash
./serve.sh          # http://127.0.0.1:8788/
./serve.sh 9000     # otro puerto
```

No hace falta: `index.html` funciona con doble clic.

## Publicarlo

Es un sitio estatico, asi que vale cualquier hosting. Con GitHub Pages, la
opcion mas simple es dejar el repo en publico y apuntar Pages a la rama.

Antes de publicarlo hay que decidir que hacer con `data/system.js`, que esta en
`.gitignore` a proposito: lleva el nombre de la maquina, el kernel y los
nombres de los sensores, y eso no va a un repo publico. Sin ese fichero la
pagina funciona igual, pero el ojo se queda en gris y sin temperatura.

## Estructura

```
index.html
assets/style.css        los colores de pywal, en variables CSS
assets/ojo.js           el ojo, en canvas
assets/app.js           la lluvia, la barra y los repos
assets/projects.js      los proyectos  <- se edita
assets/fuentes/         JetBrains Mono, autoalojada
data/system.js          el estado de la maquina  <- se genera, no se sube
data/github.js          repos y commits          <- se genera
scripts/collect-system-stats.sh
scripts/collect-github.py
serve.sh
```

## Los colores

`--suelo #0b0d0f`, `--hielo #99bac9`, `--oxido #ba5f44`, y la rampa azul de
`~/.cache/wal/colors.json`. Cambia el fondo de pantalla, cambia pywal, y se
cambian a mano en `assets/style.css`.