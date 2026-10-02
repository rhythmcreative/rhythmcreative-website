# Rhythmcrea

La web donde caben los proyectos. HTML, CSS y JavaScript a pelo: sin build, sin
framework, sin dependencias. Se abre haciendo doble clic en `index.html` y
tambien se sirve tal cual desde GitHub Pages.

## Que es la pagina

La barra y una foto deshecha en capas.

**La barra.** Una capsula de cristal con un punto que brilla a la izquierda, el
nombre, dos enlaces y la hora. Ese punto no es decoracion: su color lo pone la
temperatura real de la CPU, leida de `data/system.js`. Con la maquina fria esta
apagado, con la maquina caliente brilla en oxido.

**El campo.** La foto del angel partida en cuatro capas que se mueven a distinta
velocidad con el raton. Eso es la profundidad: no un filtro, sino el nearer y el
farther separados de verdad.

| Capa | Que es | Cuanto se mueve |
|---|---|---|
| `frente` | la hierba y las cruces de abajo de la foto | x5.2 |
| `velo` | las bandas de niebla | x3.4 |
| `angel` | la figura con las alas, recortada con canal alfa | x1.5 |
| `fondo` | la escena sin la figura, desenfocada y fria | x0.6 |

Encima, el halo de la cabeza, que es el otro motivo que comparte con la pagina:
el de la barra. Ahi va el termometro, con el mismo color que el punto.

Y el raton mueve tambien una luz, que no es un degradado sino un disco con
`mix-blend-mode: soft-light`: por eso ilumina las alas por un lado y las deja en
sombra por el otro. Al pinchar, las alas se abren un poco y pasa un barrido.

Debajo, los repos como capsulas sueltas. Pincha una y se abre ahi mismo, encima
de su sitio en la rejilla, como se abre tu isla.

No hay lluvia. Se cambio por muy poca ceniza a la deriva, que es lo que hace
falta para que el aire parezca vivo sin estorbar.

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

El angel es oscuro contra niebla clara arriba, asi que en la mitad de arriba un
umbral de gris lo separa bien. Abajo no: la tumba y la hierba tambien son
oscuras, y ahi el umbral se come el cementerio entero. Por eso el recorte se
limita a la banda de arriba y la base se queda en el fondo.

Del recorte se saca la componente conexa grande, para tirar el arbol mojado de la
izquierda y las cruces de la derecha. Antes de eso hay una apertura, que es lo
que corta esas ramas: son finas, y el ala es gruesa.

### Como se borra la figura del fondo

Esto se probo de cuatro formas y solo una sirvio, que queda aqui para que nadie
la repita por curiosity:

1. **Difusion desde la foto.** Las alas son oscuras, el oscuro se arrastra hacia
   dentro, y la figura no desaparece: solo se emborrona. Sale una mancha con
   forma de angel.
2. **Interpolacion por filas.** La niebla esta ARRIBA, no a los lados. En las
   filas donde el ala llega al borde no hay nada que poner a la izquierda, se
   coge el pixel de la derecha, que es oscuro, y sale un rayado horizontal de
   kilometros.
3. **Interpolacion por columnas.** Lo mismo al reves: el borde del ala es
   irregular, cada columna sale con un brillo distinto, y sale rayado vertical.
4. **Difusion pero disgando el relleno.** Esta. Se difunden a la vez la imagen y
   una mascara (1 fuera de la figura, 0 dentro), y se divide una por otra:
   convolution normalizada. La clave es que lo de fuera conserva su valor real,
   porque es el dato que manda; lo de dentro se interpola. Y lo de dentro
   arranca del color DEL CIELO de cada columna, no de la foto, que ahi dentro
   esta la figura oscura.

El error clasico aqui es poner a cero lo de fuera y normalizar al final: sale un
aro negro justo en el borde, y parece que el recorte esta mal.

## Estructura

```
index.html
assets/style.css        los colores de pywal, en variables CSS
assets/capa.js          las capas, el parallax, la luz y la ceniza
assets/app.js           la barra y los repos
assets/projects.js      los proyectos  <- se edita
assets/fuentes/         JetBrains Mono, autoalojada
assets/{angel,fondo,frente,velo}.webp   <- se generan
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