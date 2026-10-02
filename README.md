# Rhythmcrea

La web donde caben los proyectos. HTML, CSS y JavaScript a pelo: sin build, sin
framework, sin dependencias. Se abre haciendo doble clic en `index.html` y
tambien se sirve tal cual desde GitHub Pages.

## Que es la pagina

**La barra.** Una capsula de cristal con un punto que brilla a la izquierda, el
nombre, un enlace y la hora. El punto no es decoracion: su color lo pone la
temperatura real de la CPU, leida de `data/system.js`.

**El campo.** La foto del angel partida en cuatro capas que se mueven a distinta
velocidad con el raton. Eso es la profundidad: no un filtro, sino el nearer y el
farther separados de verdad.

| Capa | Que es | Cuanto se mueve |
|---|---|---|
| `frente` | el suelo mojado y las lapidas de delante | x5.2 |
| `velo` | las bandas de niebla | x3.4 |
| `angel` | la figura con las alas, recortada con canal alfa | x1.5 |
| `fondo` | el cementerio, desenfocado y frio | x0.6 |

Encima, el halo de la cabeza, que es el otro motivo que comparte con la pagina:
el de la barra. Ahi va el termometro real, con el mismo color que el punto. Y el
raton mueve una luz que no es un degradado sino un disco con `soft-light`: por
eso ilumina las alas por un lado y las deja en sombra por el otro. Al pinchar,
las alas se abren un poco y pasa un barrido.

**La seccion de Hyprland.** Debajo, y solo eso. Un lema, lo que hay vivo en la
sesion ahora mismo (atajos, pantallas, paquetes), y las piezas del escritorio
como filas que se abren en su sitio.

No hay lista de repositorios. Se pidio quitar.

## Anadir una pieza a la seccion

Editar `assets/hyprland.js`. Todo lo que se ve ahi sale de ese fichero, y sale
del repo de verdad: los scripts son los de `~/.local/bin`, las banderas son las
que imprime `install.sh --help`.

```js
{
  id: "instalador",
  titulo: "El instalador",
  resumen: "Una linea, y funciona.",
  chips: ["install.sh", "arch"],
  filas: ["Un parrafo por idea. Uno por parrafo."],
  banderas: [["--preview", "que hace"]]
}
```

Los numeros de arriba (estrellas, lenguaje, ultimo push) los anade solo
`data/github.js`. Los de "vivo" salen de `data/system.js`, asi que si el
recolector no ha corrido everan en vez de inventarse un numero.

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

La escena tambien responde a `Enter` y a `Espacio` desde el teclado, para que el
barrido de luz y las alas no dependan del raton.

## Accesibilidad

Con `prefers-reduced-motion: reduce` no se dibuja la ceniza, las capas no se
mueven, el halo no respira y el raton no arrastra la luz. La escena se queda en
una foto y todo lo de leer sigue igual. El parallax va con el raton, asi que ahi
no hay nada unsolicited que apagar: es respuesta directa a lo que hace la
persona.

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
pagina funciona igual, pero el punto de la barra se queda en gris y el halo sin
encender.

## Las capas: como se hacen

```bash
python3 scripts/preparar-angel.py
```

Sale de `~/Pictures/Wallpapers/Angel.jpg` y deja en `assets/`:

- `angel.webp` — la figura con las alas, con canal alfa
- `fondo.webp` — la escena sin la figura
- `velo.webp` — las bandas de niebla
- `frente.webp` — la franja de abajo, el primer plano

Para volver a generarlas hay que tener el script de Pillow y numpy. No hace
falde red, ni modelos, ni scipy.

### Como sale el recorte

`A.png` llega con el angel ya recortado y con el damero PINTADO en los pixeles
(es RGB, no tiene canal alfa). Se quita con un umbral, y sale regalado porque el
histograma es bimodal con un hueco enorme entre medias: el angel esta por debajo
de 85 y el damero por encima de 244, sin un solo pixel en medio. Asi que la
mascara es exacta y no hace falta ni componente conexa ni descontaminacion de
color.

Lo que si costaba era el BORDE. El ultimo pixel del ala es una mezcla de pluma
oscura y damero claro, y alrededor de toda la silueta hay una orla de esos
pixeles. Si el alfa se difumina ahi, la caida mezcla gris claro sobre fondo
oscuro y sale un filo luminoso rodeando las alas. Por eso el borde se MUERDE dos
pixeles antes de difuminar: la caida cae dentro de la figura, donde los pixeles
si son del angel.

### El fondo ya no hay que rellenar

La foto anterior traia al angel DENTRO, y el trabajo era quitarlo del fondo: seis
formas de rellenarlo y cinco fallaban por lo mismo, anclar el relleno a pixels que
no eran cielo (abajo son arboles y lapidas, y como cambia de columna salia
rayado vertical). Con estas dos imagenes, que son distintas, no hay nada que
rellenar. Se queda el metodo por si algun dia vuelve a hacer falta.

### El respaldo y las costuras

El respaldo es la misma foto, a la misma escala y en la misma posicion que las
capas. Antes se resolvia estirandola a una caja mayor con 60 px de sangrado por
lado, y eso es un error de cuenta: al anadir el mismo numero de pixeles en ancho
y en alto la caja deja de tener la proporcion de la foto, la foto sale estirada
y en la union su contenido no coincide con el de las capas. Medido en pantalla,
saltaba una linea de TODO el ancho con la escena pasando de 92 a 69 de brillo.

Las franjas que quedan cuando la figura no llena la pantalla van en color plano,
con el color de la niebla de los bordes de la foto medido aqui.

### El encuadre

La caja de las capas la calcula capa.js. Con `background-size: cover` en un
monitor 16:10 las dos puntas de las alas se salian por los lados. La escala sale
de las dos cosas a la vez: que entre la foto entera, pero que la figura llene al
menos el 90% del alto. En horizontal manda la foto entera y se ve el angel
completo; en vertical manda el 90% y se recorta por lo alto, que es lo unico
que se puede recortar sin perder la figura. El parallax se acota al margen que
sobra alrededor, para que ninguna capa enseñe un borde al moverse.

## Estructura

```
index.html
assets/style.css        los colores de pywal, en variables CSS
assets/capa.js          las capas, el parallax, la luz y la ceniza
assets/app.js           la barra y la seccion
assets/hyprland.js      la seccion de Hyprland  <- se edita
assets/fuentes/         JetBrains Mono, autoalojada
assets/{angel,fondo,frente,velo}.webp   <- se generan
assets/capa-datos.js    el tamaño de la foto y donde cae el halo  <- se genera
data/system.js          el estado de la maquina  <- se genera, no se sube
data/github.js          repos y commits          <- se genera
scripts/preparar-angel.py
scripts/collect-system-stats.sh
scripts/collect-github.py
serve.sh
```

## Los colores

`--suelo #0b0d0f`, `--hielo #99bac9`, `--oxido #ba5f44`, y la rampa azul de
`~/.cache/wal/colors.json`. Cambia el fondo de pantalla, cambia pywal, y se
cambian a mano en `assets/style.css`.