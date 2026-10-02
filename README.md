# Rhythmcrea

La web donde caben los proyectos. HTML, CSS y JavaScript a pelo: sin build, sin
framework, sin dependencias. Se abre haciendo doble clic en `index.html` y
tambien se sirve tal cual desde GitHub Pages.

## Que es la pagina

**La barra.** Una capsula de cristal, sin borde: el nombre a la izquierda, el
reloj en el medio y los enlaces a la derecha. El reloj va en una columna propia
de un grid `1fr auto 1fr`, para que quede centricado tanto si un lado crece como
si crece el otro; con flex y un margen automatico se descuadra.

El punto de la temperatura se fue de la barra: sobraba a la izquierda del todo.
Ahora la temperatura solo se ense�na en el halo del campo.

**El campo.** La foto del angel partida en cuatro capas que se mueven a distinta
velocidad con el raton. Eso es la profundidad: no un filtro, sino el nearer y el
farther separados de verdad.

| Capa | Que es | Cuanto se mueve |
|---|---|---|
| `frente` | el suelo mojado y las lapidas de delante | x5.2 |
| `velo` | las bandas de niebla | x3.4 |
| `angel` | la figura con las alas, recortada con canal alfa | x1.5 |
| `fondo` | el cementerio, desenfocado y frio | x0.6 |

Encima, el halo de la cabeza, que es el motivo que la pagina comparte con tu
barra. Ahi va el termometro real de la CPU: con la maquina fria esta apagado y
con la caliente brilla en oxido. Y el raton mueve una luz que no es un
degradado sino un disco con `soft-light`, por eso ilumina las alas por un lado y
las deja en sombra por el otro. Al pinchar, las alas se abren un poco y pasa un
barrido.

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

## Los dos temas: negro y blanco

Un boton en la barra, con iconos. En negro se ve la luna —el tema al que vas— y
en blanco se ve el sol. Cambia las dos cosas a la vez: las capas y los colores de
la pagina.

Los dos son MONOCROMOS, y cada uno con su cementerio, que es el mismo sitio en
distinta estacion:

| | cementerio | angel |
|---|---|---|
| **negro** | invierno, con niebla y sin hierba (`Angel-Photoroom.png`) | el recorte a color, oscurecido y tirado a frio (`A.png`) |
| **blanco** | verano, con la hiedra verde y la luz de la manana (`Fondo gotico con profundidad claro .png`) | el de blanco y negro, claro de nacimiento |

    fondo-oscuro.webp  angel-oscuro.webp  frente-oscuro.webp
    fondo-claro.webp   angel-claro.webp   frente-claro.webp
    velo.webp                              la misma en los dos

No es un filtro de saturacion, son ficheros aparte: el angel del tema blanco es
claro de nacimiento, y con un `grayscale()` saldria el mismo angel oscuro que en el
otro.

La eleccion se guarda en `localStorage`, que funciona tambien desde `file://`, y
sin nada guardado se empieza en negro. No se pregunta a `prefers-color-scheme`: la
pagina es oscura de por si, con lo que un tema claro del sistema no dice nada
util, y ademas hacia que la primera captura de la sesion saliera en blanco sin que
nadie lo hubiera pedido.

En blanco la pagina entera se da la vuelta: si solo cambiaran las imagenes, el
texto claro se pondria sobre fondo claro. Y el velo no puede ir con `screen`
sobre fondo claro, porque `screen` ahi no hace casi nada: con `multiply` si.

El halo del angel sigue siendo del color de la temperatura en los dos temas: es
un dato, no un adorno.

### Recortar el angel del tema blanco

Es lo unico que no sale con un umbral. Es marfil de 200 a 245 sobre blanco de 250
a 255, y entre los dos no hay hueco: con un umbral se le perforaban las plumas
claras.

Lo que sale bien es **reutilizar la mascara del recorte a color**, que es el mismo
dibujo y si tiene histograma bimodal. Los dos ficheros no estan exactamente
alineados —el del halo cae 6 px mas abajo—, asi que antes de nada se busca el
desplazamiento, de -40 a +40 px, que menos fondo deja dentro de la mascara.

## Como se adapta

El tipo y el ancho del contenido no estan fijos, que es lo que hacia que en un
4K todo se viera diminuto. La raiz va en `clamp(15px, 0.5vw + 10px, 21px)` y el
contenido en `clamp(330px, 74vw, 1640px)`.

Medido en el navegador, no estimado:

| pantalla | cuerpo | barra | contenido | nombre | seccion |
|---|---|---|---|---|---|
| 360x640 | 12,9px | 315px | 300px | 23px | 1 col |
| 390x844 | 12,9px | 330px | 299px | 23px | 1 col |
| 768x1024 | 12,9px | 330px | 298px | 24px | 1 col |
| 1024x768 | 12,9px | 568px | 523px | 43px | 1 col |
| 1280x1024 | 13,0px | 758px | 702px | 57px | 2 col |
| 1440x900 | 14,1px | 947px | 882px | 72px | 2 col |
| 1920x1080 | 14,8px | 1066px | 997px | 79px | 2 col |
| 2560x1440 | 16,9px | 1421px | 1342px | 90px | 2 col |
| 3840x2160 | 18,1px | 1640px | 1556px | 97px | 2 col |

Sin desbordamiento horizontal en ninguna.

La barra en movil solo lleva el nombre y la hora, que es lo que cabe. Por eso
el menu esta en el pie y no en la barra: en el movil, sin pie, no habia manera
de llegar a nada.

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