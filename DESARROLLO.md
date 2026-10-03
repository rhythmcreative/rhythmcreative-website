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

**La seccion de Hyprland.** Tres cosas y nada mas, en una sola columna: la
cabecera con los numeros del repo (`hyprland` + `★ 25 · Shell · 18 h ago`), el clip
y los dos botones. Antes era un grid de dos columnas con la identidad a la
izquierda, un lema, un parrafo de intro, tres bloques de datos vivos y nueve
piezas desplegables. Todo eso ya no se pinta.

Se ha quitado a proposito: el clip dice lo mismo que el lema, pero en movimiento,
y los datos vivos estaban en nueve piezas que nadie iba a desplegar una por una.
Los datos **no se han perdido**: `lema`, `intro`, `enVivo`, `base`, `piezas` y
los renderizadores (`paleta`, `terminal`, `comando`, `pantallas`, `atajos`) siguen
en `assets/hyprland.js` y en `assets/app.js`. Solo ha dejado de llamarlos
`pintarHyprland()`. Si hay que volver, es descomentar.

No hay lista de repositorios. Se pidio quitar.

**El clip.** `assets/hyprland-demo.mp4`: 33 segundos de la sesion de verdad, con
cartela de inicio y de cierre. Va suelto en la seccion, no como pieza
desplegable: son 2,7 MB y son lo primero que hay que ver, asi que esconderlo
detras de un "+" no tiene sentido.

**Como esta montado, y por que.** El `.mp4` son 2,7 MB y la pagina entera 242 KB.
Si el `<video>` fuera un atributo normal, el navegador lo pediria en cuanto parsea
el HTML y el visitante estaria pagando once veces la pagina sin haberla visto. Por
eso lleva `preload="none"` y el `src` esta en un `data-src` que `montarVideos()`
pone cuando el clip va a entrar en pantalla, con un `IntersectionObserver` y 600 px
de margen para que llegue empezado. Hay tambien una red de seguridad a los cuatro
segundos: si el observer no dispara, el clip se queda en el poster para siempre y
no hay ningun boton que diga que lo que falta es el `src`.

El poster (23 KB) va si, porque es lo que se ve en el hueco hasta entonces: sin
el, el rectangulo sale negro.

No hay `autoplay` en ninguna medida, ni con scripts: el atributo no esta puesto.
El bucle es movimiento continuo y con `prefers-reduced-motion` la pagina ya se
ocupa de pararlo todo lo demas.

El `width="1280" height="720"` no es decorativo: el navegador reserva la caja antes
de tener el metadato, y sin eso el clip crece al cargar y los botones de debajo
bajan de golpe.

Si el navegador no sabe reproducir MP4, sale el texto de dentro del `<video>`, no
un rectangulo roto. Y si el fichero no esta, `video()` devuelve la linea de
`.sin-datos` de siempre: el mismo camino que el resto de bloques que no tienen
dato.

## El reproductor

**No se usan los controles del navegador.** La barra gris del sistema, encima de
una pagina con este cuidado, parecia un trozo pegado. Lo sustituye `reproductor()`
en `assets/app.js`: play y pausa, barra de progreso con arrastre, tiempo y sonido,
con el estilo del sitio.

| | |
|---|---|
| Boton grande de play | en el centro, y **no vuelve** al pasar el raton |
| Barra de progreso | `role="slider"`, con `aria-valuenow` y `aria-valuetext` |
| Volumen | altavoz + barrita, como en Omarchy |
| Saltar | clic en la pista, arrastre con raton o dedo, y flechas de 5 s |
| Teclado | `espacio` o `k` sobre el video |

**El boton grande no reaparece al pasar el raton.** Antes lo hacia, y era justo lo
que mas molestaba: estas viendo el clip y aparece un play encima de en medio.
Para parar esta el boton de la barra, que siempre esta a la vista.

**El volumen es un `<input type="range">`, no un `role="slider"` a mano.** El
teclado, el lector de pantalla y el arrastre con el dedo vienen hechos, y el
`accent-color` lo deja del color del sitio sin tocar los pseudoelementos de cada
navegador. La barrita se abre de lado (de 0 a 4.6 rem) con el raton encima o con
el foco por teclado, como la de Omarchy.

Al mutear **la barrita se queda donde estaba** y lo unico que cambia es el icono a
altavoz tachado, que es lo que hace cualquier reproductor. El volumen anterior se
guarda, asi que el siguiente clic devuelve el sonido a donde estaba en vez de a 1.

Lo que no tiene: pantalla completa ni picture-in-picture. El fullscreen lo pone el
navegador con F11 y con el menu del contenedor, asi que un boton mas era ruido.

### Pinchar en el clip lo para y lo reanuda

Como en cualquier reproductor. Antes no habia nada: el boton grande se apaga en
cuanto el clip arranca y ademas lleva `pointer-events: none`, y el unico sitio
desde el que se podia parar era el boton de la barra de abajo.

El manejador va en la **caja** (`.escena-clip`) y no en el `<video>`, para que el
clic del boton grande, que esta dentro, tambien cuente. Ese lleva
`stopPropagation`, porque sin el el clic llegaba a los dos: el primero ponía en
marcha y el segundo paraba, y el boton grande no hacia nada.

La barra de controles esta **fuera** de la caja, asi que pulsar play, el tiempo
o el volumen no toca la reproduccion.

### El boton de Github, entero blanco

Blanco puro (`#ffffff`) en el tema oscuro y negro puro (`#000000`) en el claro: el
logo, el texto y el borde. No es `--hielo`, que es un gris azulado, ni un tono de
la pagina. Es el color del logo de verdad.

El fondo de la caja del mark se queda transparente. Con la caja invertida el icono
salia del color de la caja y no blanco, que era justo lo que no servia.

### Los dos iconos a la vez

Cada boton tiene los dos iconos en el DOM (play y pausa, altavoz y altavoz
tachado) y se cambia cual se ve con una clase en la barra. Eso estaba mal:

```css
.clip-btn svg      { display: block; }   /* (0,1,1) gana */
.ico-mudo          { display: none;  }   /* (0,1,0) */
```

Un selector con una clase y un elemento **gana a uno con una sola clase**, asi que
la pausa y el altavoz tachado se veian SIEMPRE, encima de los otros. Se arreglo
arreglando el selector, no el orden:

```css
.clip-btn svg.ico-pausa, .clip-btn svg.ico-mudo { display: none; }
.clip-barra.sonando .clip-btn svg.ico-pausa    { display: block; }
.clip-barra.sin-sonido .clip-btn svg.ico-mudo  { display: block; }
```

### La seccion se pinta antes de mirar el clip

`pintarHyprland()` va **antes** de crear el observer del clip. Estaba al reves, y
el observer se montaba sobre un DOM que todavia no tenia el `<video>`: no
observaba nada y el clip no se montaba hasta la red de seguridad de los cuatro
segundos. O sea, cuatro segundos de poster por buscar un elemento que ya estaba
ahi. El orden en `inicio()` importa:

```
pintarHyprland()      -> el <video> existe en el DOM
  observer del clip   -> lo observa
    arrancarClip()     -> pone el src y engancha el reproductor
```

**El boton grande va DE HERMANO del `<video>`, no dentro.** Por una regla de HTML,
dentro de un `<video>` solo se permite `<source>`, `<track>` y texto plano:
cualquier otra cosa se saca al padre y el boton desaparece de la pagina. Por eso
la barra y el overlay son hermanos, y el video se apila con `position: absolute`.

**El `<video>` no lleva `muted`.** Sin atributo `muted` el boton de sonido arranca
enseñando el altavoz, que es lo que toca: el clip tiene musica. Para poder
autoplay en silencio haria falta ponerlo, y aqui no hay autoplay porque el play
solo pasa dentro de un clic.

## El servidor

`serve.sh` llama a `serve.py`, y no a `python3 -m http.server`. Este ultimo **no
sabe responder a una peticion por rango**, y en cuanto hay un `<video>` el
navegador solo ve el poster: el control de reproduccion no arranca. Es el sintoma
clasico de "no puedo reproducir".

Los navegadores preguntan "dame los bytes del 0 al 1023" para no bajarse los 2,7
MB enteros antes de pintar, y `http.server` contesta con un 200 y el fichero
entero. `serve.py` contesta `206 Partial Content`, que es lo que se pide.

GitHub Pages **si** soporta rangos, asi que en el sitio publicado no hay problema:
esto solo afecta al servidor de desarrollo. Comprobado con las cuatro formas de
pedir un rango:

```
bytes=0-1023        -> 206  bytes 0-1023/2806969
bytes=2000-         -> 206  bytes 2000-2806968/2806969
bytes=-500          -> 206  bytes 2806469-2806968/2806969
bytes=99999999-     -> 416  bytes */2806969
GET normal          -> 200  Accept-Ranges: bytes
```

**El audio.** El original venia en `yuv444p`, que los navegadores no reproducen de
forma general, y con el audio a -11 dB de pico. Se paso a `yuv420p` y se bajo a
-18 LUFS con `loudnorm`. Ojo: **la musica es lo-fi de un stream** (Pokemon &
Chill). Hay que cambiarla antes de publicar esto.

## Cambiar el clip o los botones

Editar `assets/hyprland.js`. Los tres datos de la seccion estan ahi arriba del
todo, y son lo unico que se pinta:

```js
clip: {
  id: "hyprland",
  titulo: "hyprland, the desktop",     // el aria-label del <video>
  src: "assets/hyprland-demo.mp4",
  poster: "assets/hyprland-poster.webp",
  nota: "33 seconds, 2.7 MB. Recorded off the real session."
},
manual: "https://github.com/rhythmcreative/hyprland#manual-install",
manualTexto: "the manual",
```

**El poster hay que rehacerlo** cada vez que se cambia el clip. Es un fotograma
del principio, y si no, el rectangulo que se ve antes de que cargue ensena otra
cosa. A mano:

```sh
ffmpeg -ss 8 -i assets/hyprland-demo.mp4 -frames:v 1 -q:v 4 /tmp/p.jpg
ffmpeg -i /tmp/p.jpg -c:v libwebp -quality 74 assets/hyprland-poster.webp
```

El `src` va en un `data-src`, en el HTML generado por `video()`. Si lo pones en el
`src` de verdad, el navegador lo pide al cargar la pagina.

## Las piezas, que ya no se pintan

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

Una pieza con video necesita `tipo: "video"` mas `src` y `poster`. El renderizador
es `video()` en `assets/app.js`; no hay que tocar el HTML.

**Ojo**: las piezas ya no se pintan (ver arriba). El formato sigue siendo valido
para cuando vuelvan, y los renderizadores siguen en `app.js`, pero
`pintarHyprland()` no las llama. Para volver, hay que deshacer el borrado de
`pieza()` y de la llamada a `montarVideos()`.

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

## Rendimiento

Medido con `performance.getEntriesByType("resource")`, no estimado.

| | antes | ahora |
|---|---|---|
| escritorio, total | 306 KB | **242 KB** |
| movil, total | 306 KB | **188 KB** |
| el angel, escritorio | 171 KB | **113 KB** |
| el angel, movil | 171 KB | **59 KB** |
| la niebla | 26 KB | **18 KB** |

**Dos tamanos del angel.** A 2000 px para el monitor y a 1100 para el movil, que
es lo que se ve ahi. Antes el movil bajaba el mismo fichero de 171 KB para una
figura que ocupa 430 px de ancho. La calidad baja de 92 a 76: con niebla difusa
detras, a esa distancia no se nota.

**Que no se mezcla nada por fotograma.** El velo llevaba `mix-blend-mode: screen`,
que obliga a volver a mezclar una capa del tamaño de la pantalla entera cada vez
que se mueve, con las capas de debajo. Con alpha normal, la niebla blanca sobre
fondo oscuro se ve casi igual y no cuesta nada.

**La barra sin `backdrop-filter`.** Debajo hay capas que se mueven en cada
fotograma, y el desenfoque de fondo hay que recalcularlo cada vez que algo pasa
por ahi. Con lo que hay debajo —niebla oscura— un cristal algo mas opaco se ve
igual.

**La luz del raton mas pequena.** Era 62vw con 28 px de desenfoque: 893 px de
lado en un monitor de 1440, y ademas se movia en cada movimiento del raton. Ahora
38vw con 16 px. Misma idea, menos de la mitad de coste, que es al cuadrado.

**El parallax se para en reposo.** Escribia cinco transformaciones por fotograma
aunque el raton no se moviera, obligando al compositor a repintar cinco capas de
pantalla entera para nada. Con un umbral de un decimo de pixel, el coste solo
existe mientras el raton se mueve, que es casi nunca.

**Fuera `.brindis`**, que estaba muerta desde que se quitaron los avisos pero
seguia compositando con su `backdrop-filter`.

**Precarga del angel.** Es el elemento mas grande y el primero que se ve, y
referenciado solo desde el CSS: sin precarga el navegador no lo descubre hasta
que ha parseado la hoja, que va detras.

Lo que NO se ha medido: los fotogramas por segundo. En este navegador sin
ventana `requestAnimationFrame` no corre lo bastante para sacar una muestra
fiable, y un numero de FPS aqui seria inventado. Lo que si se ha medido son los
bytes, que son solidos, y los costes por fotograma que se ven en la estructura
del CSS.

## La barra, y lo que estaba roto en movil

Medido a 390 px de verdad, dentro de un iframe de ancho fijo (que es la unica
forma fiable: `--window-size` se ignora en modo `--dump-dom`, y en modo captura
el viewport sale 60 px mas estrecho de lo pedido):

| | antes | ahora |
|---|---|---|
| alto de la barra | 31 px | 53 px |
| interruptor de tema | 28x28 px, **y oculto** | 44x44 px, siempre visible |
| rotulo | 11.4 px | 12.6 px |
| reloj | 11.4 px | 13.8 px |
| enlaces | ocultos, 28 px de alto | 44 px de alto |

**Lo grave no era el tamano: era que en un movil no se podia cambiar de tema.**
El interruptor estaba *dentro* del `<nav>`, y el `<nav>` recibe `display: none`
por debajo de 620 px. El boton se iba con el. Ahora vive en su propia zona
derecha, y el nav puede seguir ocultandose porque el nav no lo manda.

### Lo que faltaba de mas

- **`safe-area`.** No habia ni una mencion. En un iPhone con notch, la barra fija
  queda debajo del status bar, justo donde no se pulsa nada. Ahora
  `.barra-z` usa `env(safe-area-inset-*)`, y el meta lleva `viewport-fit=cover`,
  que es lo que hace que esos valores valgan algo: sin el, son siempre 0.
- **`<html lang="es">`** con la pagina entera en ingles. Los lectores de pantalla
  pronunciaban el ingles con las reglas del espanol.
- **`aria-label="Navegacion"`**, en espanol, en una pagina inglesa.
- **`theme-color` fijo** en el negro del tema oscuro. Era la unica parte de la
  pagina que no cambiaba con el tema: en movil la barra del navegador se quedaba
  negra con la pagina en blanco. Ahora se toma de `--suelo`.
- **`<main>` y enlace de salto.** No habia|region principal ni forma de saltarse
  la barra con el teclado: el tabulador se paraba en cuatro cosas in utiles.
- **`:active` en los botones.** En un dedo no hay `:hover`: no hay a donde
  apuntar, y se queda en hover hasta que tocas otra parte. Todo se ve Dead al
  tocarlo. Con `(hover: none)` hay estado de pulsacion real.

### El reloj sigue en el centro, y ahora por estructura

Con `1fr auto 1fr` las dos pistas de los lados **no siempre miden lo mismo**: un
`1fr` tiene como minimo automatico su `min-content`, asi que si el contenido de la
derecha no cabe en la mitad que le toca, esa pista se hincha y el reloj se
desplaza. Medido a 360 px: pistas de `117.39` y `122.47`, con el reloj 3 px fuera.

`minmax(0, 1fr)` hace que las dos pistas midan siempre lo mismo. Para que no
llegue a pasar, los breakpoints quitan enlaces antes de que la zona derecha se
pase de su mitad: la zona derecha mide 202 px con los dos enlaces, la izquierda 99
y el reloj 78, asi que hacen falta 379 px de barra como minimo. "Elsewhere" se cae
por debajo de 700 px (esta en el pie); el interruptor no se cae nunca.

Comprobado de 320 a 1920: **desvio del reloj 0 px en todos los anchos**, sin
desborde horizontal en ninguno.

### 44 px tambien en tableta

El corte de los 620 px es de *layout*; el del objetivo tactil es otro, porque
depende de como se usa la cosa y no de lo ancha que sea. Una tableta de 768 se
toca con el dedo igual que un movil de 390. Con `(hover: none)` los 44 px se
aplican a cualquier tamano que se toque, y con raton la barra conserva sus
proporciones de siempre.

## Medir en movil: dos trampas

**`--window-size` no sirve para medir.** En modo `--dump-dom` se ignora
enteramente: el viewport sale siempre en 500 px, pidas lo que pidas. En modo
captura el PNG sale al tamano pedido, pero el viewport es 60 px mas estrecho. Lo
que funciona es un `<iframe>` con el ancho en CSS: su viewport es exactamente ese,
porque no depende de nada del navegador.

**Las transiciones no avanzan en headless.** `requestAnimationFrame` corre a dos
fotogramas por segundo, asi que cualquier `transition` se queda en su valor de
partida y parece un fallo. Esto se ha llevao por delante dos veces en esta pagina:
el enlace de salto "no aparecia" y las lineas del terminal "no tenian color" (esa
era la animacion `sur gir` de la pieza, que empieza en `opacity: 0`).

## La portada se deshace sola del wallpaper

`scripts/preparar-hero.py` deshace **cualquier** wallpaper de
`~/Pictures/Wallpapers` en las mismas tres capas que el angel, con la misma
profundidad. Cambia el wallpaper, corre el recolector, y la portada cambia con
el. Igual que la paleta de pywal.

    scripts/preparar-hero.py                        # el wallpaper de ahora
    scripts/preparar-hero.py ruta/a/una.jpg         # uno concreto
    scripts/preparar-hero.py --auto " wallpaper "   # solo si ha cambiado

`hero.conf` decide cual de las dos portadas se usa:

- **`angel`** — la del angel del cementerio, con la mascara hecha a mano. Es la
  mejor: seis intentos de recorte. Las capas estan commiteadas, asi que con esto
  no se toca nada.
- **`auto`** — la del wallpaper del escritorio, deshecha automaticamente.

Ahora esta en `auto`, que es lo que se ha pedido. Para volver al angel: una
palabra en `hero.conf` y `python3 scripts/preparar-angel.py`.

### Lo que no se puede hacer, y por que

El angel se recorta con una mascara hecha a mano porque es un recorte de una
figura concreta. Eso **no se puede repetir con los 572 wallpapers de esa
carpeta**: separar la figura del fondo es segmentacion, y en esta maquina solo
hay PIL y numpy. Sin `cv2`, sin `torch`, sin `rembg` ni un modelo de profundidad
guardado en local, no hay nada que sepa donde esta el sujeto.

Lo que si se puede es usar las dos cosas que **todos** esos wallpapers tienen en
comun aunque no se parezcan en nada:

1. **El sujeto esta cerca del centro.** En los seis que se miraron —un angel con
   espada, gatos goticos, unos ojos en ascii, el logo de Arch, un arbol con una
   luna, una chica con una espada— esta en el centro o cerca.
2. **Abajo esta lo cerca y arriba lo lejos.** Suelo abajo, cielo arriba: es como
   el ojo lee la profundidad en una foto fija.

De ahi sale el sujeto: una **elipse suave en el centro**, con las feathers
largas para que no se vea el circulo. No es una segmentacion y no lo pretende.

### La otra mitad de la profundidad: perspectiva aerea

Las tres capas ya se movian a velocidades distintas con el raton —0.6, 1.5 y 5.2
segun `data-hondo`— y eso es el paralaje. Pero el paralaje solo se ve como un
temblor si todas las capas estan igual de nitidas.

Aqui ademas:

- **lo lejano va desenfocado** (1.6 % del alto de radio) y lo cercano nitido. Eso
  es perspectiva aerea, y es la mitad de la profundidad que no es movimiento.
- **la graduacion se adapta a la foto**, no es un factor fijo. Se mide la mediana
  de la imagen y se empuja a un objetivo: 46 en oscuro, 206 en claro. Con un
  factor fijo, el angel con la espada —que es casi blanco— se iba a perder, o el
  de los gatos goticos —que es casi negro— se comia. Es lo mismo que hace pywal.

Comprobado en cuatro wallpapers muy distintos —uno claro, uno de arte ascii, un
paisaje y el de Arch—: en los cuatro la figura sale nitida y el entorno
desenfocado, y el efecto se lee.

## El aro, y por que no se iluminaba

Pinchar encendia el `.halo`, que es un `div` con un `radial-gradient` y
`mix-blend-mode: screen` en oscuro y `multiply` en claro. Iluminar eso es
**subirle el opacity**, y en claro `multiply` no da más luz: da más oscuro. Por
eso en el tema blanco no se veía nada, y en el negro salía un bloom que no era
un aro.

El aro ahora es **una capa con su propia imagen**, `assets/aro-{oscuro,claro}.webp`
de 8 KB, que solo contiene el anillo:

- **Medido, no-Etimado**: el perfil radial de la foto tiene el brillo mas alto a
  `r = 116 px` sobre 3600 de ancho, o sea `0,032`. Es exactamente el radio que ya
  declaraba `HALO`, asi que el aro cae donde esta la cabeza sin colocar nada desde
  el CSS.
- El grosor (`ANCHO_ARO = 0.30`, o sea de 0.70 a 1.30 del radio) tambien sale de
  ahi: el pico cae a la base en unos 140 px. Con 0.42 salia un aro de neon.
- El color va **en la imagen**, no en un `mix-blend-mode`: en claro el aro es
  tinta oscura y se multiplica; con blanco no multiplicaria nada.
- Va con `data-hondo="1.5"`, el mismo que el angel, para que se mueva pegado a la
  cabeza mientras las capas de al lado se separan.

**La animacion es solo de `opacity`.** El `transform` lo escribe el parallax en
cada fotograma con un estilo **en linea**, y un estilo en linea gana a una
animacion: por eso la de las alas no se notaba nunca. Es el mismo motivo por el
que el barrido y las alas se fueron.

## Las animaciones en claro

Los topes estaban **fijos dentro de los keyframes**:

```css
@keyframes respirar { 0%, 100% { opacity: 0.42 } 50% { opacity: 0.72 } }
```

Un keyframe gana sobre la regla del tema, asi que en claro el halo respiraba a
0.72 con `multiply` (= mas oscuro) y la regla `html.claro .halo { opacity: 0.45 }`
no hacia nada. Ahora los topes son **variables** y cada tema pone las suyas:

```css
:root        { --halo-min: 0.42; --halo-max: 0.72; --aro-min: 0.16; }
html.claro   { --halo-min: 0.20; --halo-max: 0.34; --aro-min: 0.20; }
@keyframes respirar { 0%, 100% { opacity: var(--halo-min) } 50% { opacity: var(--halo-max) } }
```

En claro el rango es mas bajo y mas corto porque la foto ya es clara y un bloom
fuerte se come la cabeza.

## Instalar

Va **debajo del clip y de los dos botones**: primero se ve como es, y luego ya se
decide si se copia.

```
● INSTALL
  One line. It asks before it changes anything, and it stops if this isn't Arch.

  ┌──────────────────────────────────────────────────────┐
  │ $ bash -c "$(curl ...install.sh)"              copy  │
  └──────────────────────────────────────────────────────┘
```

### Lo unico que va en caja es el comando

El bloque entero **no** lleva panel. Se intento y se tiro: un rectangulo de color
alrededor era la cuarta variante, y tapaba el comando en vez de destacar. El corte
lo hace el filete de arriba, como en el resto de la pagina, y el aire son los
`2.4rem` de padding.

| | |
|---|---|
| El bloque | filete arriba, `3.4rem` de margen, `2.4rem` de aire |
| El rotulo | `INSTALL` con el punto azul de las cabeceras |
| El parrafo | `--gris`, el de la pagina |
| El comando | caja con `--cristal-opaco` y `--linea`, `copy` dentro |
| El comando | `--azul-4`, subrayado al pasar el raton |

### El punto, el de hyprland

El rotulo lleva punto, y es **el mismo**: `8px`, `border-radius: 50%`,
`background: var(--azul-4)`, los tres valores identicos a `.punto-mini` de
`.cabecera-seccion`. Con el rotulo en `display: flex` y `gap: 0.6rem` para que el
punto quede a su izquierda y centrado, como en las otras dos cabeceras.

El test lo comprueba comparando los tres valores con los de `.punto-mini`, no solo
que esten parecidos.

Del `h2` de hyprland se copio tambien `text-transform` y `color`; el
`letter-spacing` es `0.28em` en vez de `0.3em` porque el rotulo es mas pequeno
(0.8rem contra 0.86rem) y con el mismo espaciado se abriria demasiado.

### El comando, en caja

Caja propia con el cristal de la pagina, y **dentro** el `copy`, que no se ve hasta
que se busca. Se copia tambien **pinchando el comando**: sin nada mas que un
subrayado al pasar el raton, se entiende que se puede, asi que tiene que
funcionar.

El `$` va en `.instalar-cmd::before` y no en el `code`: si estuviera en el texto,
el subrayado pasaria por encima y al copiar saldria con el `$` delante.

### Contraste

Los dos textos van con los colores de la pagina y eso ya estaba medido:

| | sobre | oscuro | claro |
|---|---|---|---|
| el comando | la caja | 4.18:1 | 6.46:1 |
| el comando en hover | la caja | 9.27:1 | 16.20:1 |
| el parrafo | el suelo | 4.94:1 | 3.82:1 |

**Los dos que quedan bajo 4.5:1 son los de toda la pagina**, no de este bloque:
`--azul-4` sobre `--cristal-opaco` es lo que lleva cada `.comando code` del
instalador, y `--gris` sobre `--suelo` es lo que lleva cada texto secundario. Se
podrian subir, pero eso ya seria cambiar el sitio entero y no es lo que se pedia.

## Compartir el enlace

Antes no habia ni una etiqueta Open Graph: al mandar el enlace a Discord,
Mastodon, Slack, Twitter o un correo no se veia nada.

`scripts/preparar-og.py` compone `assets/og.jpg` a 1200x630 — fondo + angel,
que es lo que se ve en la portada, no la figura suelta — con el nombre encima en
la misma tipografia y la misma separacion de letras. JPEG y no PNG porque los
clientes de social y de correo no saben leer webp, y PNG a ese tamano pesaba mas
del doble.

**La imagen no se descarga al abrir la pagina**, comprobado con el registro de
red: los `<meta>` no son recursos. Cuesta 0 KB de la carga.

### Al publicar hay que cambiar una cosa

Las URL de las etiquetas tienen que ser **absolutas** — una relativa no la
resuelve nadie — y aqui no hay ninguna todavia porque el sitio no esta publicado.
Hay que cambiar `TU-DOMINIO` en `index.html` (5 veces, todas en el mismo bloque)
por el dominio de verdad. Es lo unico pendiente.

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

## Los cuatro bloques de datos vivos

Cuatro piezas de la seccion de Hyprland leen de `data/system.js`, que escribe
`scripts/collect-system-stats.sh` en la maquina. `tipo` en `assets/hyprland.js`
elige cual se pinta.

| pieza | de donde sale |
|---|---|
| la paleta | `~/.cache/wal/colors.json`, los ocho valores de pywal |
| el doctor | la salida real de `rhythm-doctor --check`, sin el color, 40 lineas como mucho |
| el comando | el `curl` del instalador, con boton de copiar |
| las pantallas | `hyprctl monitors`, con su escala y la principal marcada |

**Si el dato no esta, sale una linea de aviso. Nunca un numero inventado.** Una
pagina que se inventa un dato es peor que una que no lo tiene.

### El doctor, y por que enseña el fallo

La pagina enseña la salida literal, **incluido lo que sale mal**. Un doctor que
solo dice `ok` no demuestra nada: demostraria que no se ha comprobado. Ademas,
`rhythm-doctor` y `rhythm-sddm-deploy` se tradujeron a ingles para esto, y solo
las cadenas que imprimen — la logica no se toco.

Ahora mismo el bloque enseña un `FAIL` real: el envoltorio del greeter esta
desplegado pero distinto del repo. Se arregla con
`sudo ~/.local/bin/rhythm-sddm-deploy`, que es justo lo que dice la linea de abajo.

### Que no se corte nada

Medido, no supuesto: el comando de instalar tenia **876 px de texto en una caja de
384** y el terminal **584 en 435**. Los dos usaban scroll horizontal, asi que en
cualquier captura salia una linea partida por la mitad y parecia un fallo de la
pagina. Ahora los dos envuelven — el comando con sangria francesa y el terminal
como una terminal de verdad — y el degradado de abajo del terminal solo aparece si
de verdad hay mas linea, que es el mismo problema en pequeño.

Las banderas tambien estaban descuadradas: con `flex-wrap`, `--preview` se quedaba
solo en una linea con su explicacion debajo. Ahora son dos columnas de verdad.

### Contraste

El boton `repositories` en tema claro estaba en **3.18:1**, por debajo del 4.5:1
que pide WCAG AA para texto normal. A `0.66` se mide en **5.07:1** y sigue
viéndose apagado, que es lo que tiene que ser un boton secundario. El subtitulo
subio de 4.89:1 a 5.48:1.

## En movil se veia todo ajustado

No era el espacio vertical: era **horizontal**. La caja del contenido no llegaba a
usar la pantalla.

`--ancho` es `clamp(330px, 74vw, 1640px)`, y ese minimo de 330 px esta puesto para
que en un monitor grande el contenido no se haga una tira. En un movil ese minimo
gana siempre: a **320, 360, 390 y 430 de pantalla el contenido media exactamente lo
mismo, 292 px**. El 330 del clamp mas el padding de `.cola` (19 px a cada lado) se
comian 68 px de los 360.

| pantalla | antes | ahora |
|---|---|---|
| 320 | 282 px | 293 px |
| 360 | 292 px | **333 px** |
| 390 | 292 px | 363 px |
| 430 | 292 px | 403 px |
| 560 | 292 px | 533 px |

El video, que es de 1280x720, pasa de **292 x 164** a **333 x 188** en un movil de
360. Y lo importante: ya no sale igual en 360 que en 430, que es lo que hacia que
se viera justo — el margen estaba atado a un ancho fijo en vez de al de la pantalla.

La solucion es una regla en `<= 700px`: `.cola` quita su `max-width` y el margen lo
pone el padding. Fuera de ahi no se toca nada, asi que un monitor sigue con su
columna de 1640.

### Mas aire entre bloques

Con la caja abierta el contenido ya no va pegado a los lados, y en vertical se leia
justo. En `<= 700px`: el clip de 1.4 a 1.9 rem, los botones de 1.6 a 1.9 y el bloque
de instalar de 3.4 a 4.2.

### El $ del comando se quedaba solo en una linea

En la captura se ve el `$` en su propia linea y el comando debajo. El motivo es
`flex-wrap: wrap` en la caja del comando: **al elegir linea el navegador usa el
tamaño hipotetico del item**, o sea el comando entero en una linea, que es mas
ancho que la caja; el comando se va a una linea nueva y el `$` se queda solo
delante. El `flex-wrap` ya no hacia falta para nada, porque el boton de copiar
lleva un tiempo siendo `absolute`. Quitado.

## La hoja de estilos estaba duplicada

Averiguando lo de arriba salio otra cosa: **`assets/style.css` tenia 2749 lineas y
por dentro havia varias copias solapadas** de `.barra-z`, `.isla`, `.interruptor`,
`.muestras`, `.terminal`… Al final de todo habia un fragmento que habia perdido el
`/*` de apertura, y en su primera linea se quedaba un `*/` suelto.

**Eso es un error de CSS, no un aviso**: el navegador descarta desde el `*/` hasta
el siguiente, o sea que se leian mal reglas enteras sin que se viera nada. El
fichero esta ahora en **1435 lineas**, con 351 llaves abertas y 351 cerradas, 123
comentarios abiertos y 123 cerrados, y ninguna regla repetida.

Como se comprueba que no se repita: `prueba-css.js` mira que las llaves y los
comentarios cuadren y esten **en orden** —un `*/` sin un `/*` antes es justo lo que
rompia la hoja—, que las comillas vayan pares y que no haya dos reglas de nivel 0
con el mismo selector **y el mismo cuerpo**. Con el cuerpo distinto si es una
ampliacion legitima: `.abierta` aparece dos veces porque la segunda le anade
`container-type`.

### Lo que dejo dicho para el que mida otra vez

`prueba-movil.js` y `prueba-css.js` tricuran con los dos `@media (max-width: 700px)`
que hay: la caja y el aire. Con un `indexOf` a pelo solo se coge el primero, que es
el de la caja, y las reglas de aire parece que no existen.

## En movil se veia pequeno

**Todo el sitio esta en rem**, asi que lo que decide si la pagina se lee es una
sola regla:

```
html { font-size: clamp(19px, 0.5vw + 10px, 21px); }
```

El liquido estaba bien para monitores grandes, pero el **minimo** no. Con
`0.5vw + 10`, la raiz **se queda en el minimo en todo lo que va de 0 a 1000 px de
ancho**: en un movil de 360 eran 15 px, y ahi el texto corriente caia a **11,1 px**
y el rotulo mas pequeno a **8,2 px**.

Lo que pasaba es que todos los tamaños estan medidos con una raiz de 17 a 21 px —la
de un monitor— y **en el movil no habia compensacion ninguna**. El sitio estaba
pensado para una pantalla grande y en un telefono se encogia un 40%.

Con el minimo en 19 px:

| | antes | ahora |
|---|---|---|
| la raiz, en 360 de ancho | 15 px | **19 px** |
| el texto corriente (0.74rem) | 11,1 px | **14,1 px** |
| el rotulo mas pequeno (0.55rem) | 8,2 px | **10,5 px** |
| a 1440 de ancho | 17,2 px | 19 px |
| a 1920 y 2560 | 19,6 y 21 px | igual |

Lo que **no** cambia: a partir de 1920 el liquido manda y la raiz es la misma de
siempre. Y en un movil el texto corriente deja 39 caracteres por linea, que para
monoespaciada es de sobra.

Los alto fijos en rem (`max-height: 17rem` del terminal) suben de 255 a 323 px en
un movil, y el mas grande son 399 px de 740 de pantalla.

Mirado despues: las medidas de movil que hay en la hoja **suben** los tamaños donde
hace falta —el nombre de la barra a 0.84rem y el reloj a 0.92rem—, asi que no
habia ninguna que encogiera el texto para que cupiera. La unica que baja algo es
`.terminal pre` a 0.6rem, que es un bloque de codigo y esta bien que sea pequeno.

### El test

`prueba-movil.js` evalua el `clamp` de verdad en once anchos y comprueba que el
texto corriente no baja de 13 px en movil, que el rotulo mas pequeno llega a 10, que
los altos fijos no se salen de la pantalla y que quedan al menos 30 caracteres por
linea.

Dos trampas que costaron tiempo y estan comentadas en el test: `clamp(A, B, C)` es
`Math.max(A, Math.min(B, C))` y **no** `Math.min(A, C, B)`, y la expresion del
medio (`0.5vw + 10`) hay que evaluarla como expresion, no leer el primer numero.

## El aro de la cabeza


La foto **ya trae el aro de la estatua**. Encima se dibuja otro, en su propia
capa, para que se pueda encender al pinchar. Las dos cosas tienen que caer una
encima de la otra o lo que se ve son dos aros.

### El fallo: era un circulo encima de una elipse

`HALO` tenia **un radio**, y con un radio el dibujo sale redondo. Pero el aro de
la foto se ve **tumbado**, porque la estatua esta de perfil: medido sobre
`angel-claro.webp` va de x 936 a 1067 y de y 89 a 127, o sea **131 por 38, un 3,4
a 1**. El de oscuro es 2,6 a 1.

Con un circulo de radio 60 encima de una elipse de 38 de alto, el aro dibujado
se salia por arriba y por abajo, y al pinchar se encendia **el equivocado**.

| | antes | ahora |
|---|---|---|
| forma | un radio, un circulo | dos semiejes, una elipse |
| `HALO` | `(x, y, r)` | `(x, y, rx, ry)` |
| `rx` | fraccion de W | fraccion de W |
| `ry` | — | fraccion de **H** |

`ry` va en fracciones de la altura y no del ancho a proposito: la foto es de
2000 x 1133, y la misma proporcion en vertical seria casi el doble de alta.

Los tres sitios que llevan los numeros dicen lo mismo, y el test lo comprueba:
`HALO` en `preparar-angel.py`, `assets/capa-datos.js` (que genera el script) y el
reserva de `TAM` en `assets/capa.js`.

### El bloom tambien era cuadrado

`colocarHalo` tenia el comentario diciendo que el anillo es una elipse y dos
lineas mas abajo ponia `width = height`. El bloom salia redondo, 124 x 124, con
el aro de 131 x 38 debajo: la mitad de la luz se iba por encima y por abajo, que
es justo lo que se ve en la captura de antes de arreglarlo.

Ahora el ancho sale de `rx` y el alto de `ry`. El degradado es radial, asi que en
una caja que no es cuadrada se dibuja elipse solo, sin tocar el CSS.

### Los dos aros a la misma altura

Los recortes del angel se cortaron con una regla un poco distinta y el aro de
cada foto caia 6 px mas abajo en el de blanco y negro (0,0971 contra 0,0918). Con
la misma `y` los dos aros quedan a la misma altura en pantalla, que es lo que se
nota al cambiar de tema. 6 px es nada frente a los 38 px que el aro tiene de alto,
asi que sigue encima del aro de su foto.

### El aro es dorado en los dos temas, y SIN mezcla

Lo primero que se probo fue poner `screen` en oscuro y `multiply` en claro, que
es lo que habia. Con eso el dorado **no se veia en oscuro**, y el motivo es que
**`screen` no puede pintar de nada lo que ya es claro**: el aro de la foto es un
aro claro, y aclararlo con un dorado lo deja igual. Solo se notaba el dorado en
los bordes, donde el fondo es el cielo oscuro.

 Asi que `.aro` **ya no lleva `mix-blend-mode`**. La imagen pinta su propio
dorado con su propio alfa y ya esta. No hay costura porque el alfa del aro se va a
cero hacia fuera, y en el centro, donde es opaco, esta justo encima del aro de la
foto.

| | color |
|---|---|
| `aro-oscuro.webp` | `rgb(255, 212, 130)` |
| `aro-claro.webp` | `rgb(214, 170, 74)` |

Los dos son dorados, asi que **cambiar de tema no cambia el color del aro**, que
era justo lo que pasaba antes: en oscuro era un aro de neón blanco y en claro un
círculo a lápiz.

### El aro y su bloom se separaban: eso era el desalineo

El aro es una `.capa` y se movia con el parallax. El bloom (`.halo`) es un hermano
suyo y **no se movia**. Con el raton abajo el aro se iba 10 px y el bloom se
quedaba: medido, **14 px de separacion** en una escena de 2560 x 1600.

Aparte, el aro lleva un pelin de zoom (`scale(1.0069)`) que se aplica **desde el
centro de la caja**, no desde el aro. El bloom esta centrado en el aro, o sea que
su centro no se mueve con el scale. Eso son otros **3 px** verticales, que en un
aro de 38 px de alto se notan.

Las dos cosas se arreglan en el bucle de parallax de `capa.js`:

```js
if (halo) {
  var ha = haloActual();
  var hx = acotar(ahora.x, geo.mx, 11 * ARO_HONDO);
  var hy = acotar(ahora.y, geo.my, 7 * ARO_HONDO);
  var hz = 1 + (raton.dentro ? 0.006 * (1 + ARO_HONDO * 0.1) : 0);
  var ex = (hz - 1) * (ha.x - 0.5) * geo.w;    // la correccion del zoom
  var ey = (hz - 1) * (ha.y - 0.5) * geo.h;
  halo.style.transform = "translate3d(" + (hx + ex) + "px," + (hy + ey) + "px,0) " +
    "scale(" + hz.toFixed(4) + ")";
}
```

`ARO_HONDO` es `1.5`, el mismo numero que lleva el `data-hondo` del aro en el
HTML. Si divergieran, se volverian a separar.

Ojo con `acotar()`: en una pantalla ancha `encajar()` hace que la foto llene el
ancho, asi que el margen es 0 y **el parallax no se mueve nada**. El movimiento se
ve solo cuando queda hueco de verdad, que es cuando la foto cabe en alto (por
debajo de 1450 px de alto a 2560 de ancho, con la foto en 1133/2000).

### El test que lo comprueba

`prueba-alineado.js` corre el bucle de verdad en jsdom, mueve el raton a cinco
sitios y mide donde queda el centro del aro y el del bloom. La caja de la foto la
lee **del estilo que escribe `encajar()`**, no de una formula propia: al principio
el test recalculaba la caja y media separaciones que no existian.

Con el arreglo: **0,06 px** en los cinco sitios. Sin el: 14,2 px. El test esta
comprobado rompiéndolo a proposito.

### Al pinchar el aro se pone BLANCO

El aro se queda dorado en reposo —el de la foto, tal cual— y al pinchar se pone
blanco. El color se cambia con un **filtro**, no con otra imagen ni con otra capa:

```
filter: brightness(0) invert(1)
```

`brightness(0)` deja el aro negro y `invert(1)` lo pasa a blanco, **conservando el
alfa**. Asi no hay un `aro-blanco.webp` que mantener igual que el dorado, ni una
capa mas que el parallax tenga que mover.

En **tema claro el blanco no se ve** sobre el papel, asi que ahi el destello es un
dorado saturado: `brightness(0.62) saturate(1.9)`, que lleva el aro de
`rgb(214,170,74)` a `rgb(156,104,0)`. `saturate` no cambia el tono, asi que sigue
siendo un halo dorado, solo que mas fuerte.

El filtro va en la misma regla que la animacion y **no dentro del keyframe**, a
propósito: el parallax escribe el `transform` en un estilo en linea cada
fotograma, y un estilo en linea gana a una animacion. Por eso el keyframe solo
mueve `opacity` y el filtro se queda quieto.

### El bloom de claro tambien es dorado

El color del bloom salia de `paleta()`, que es el **termometro de la CPU**. En
oscuro va bien, porque el bloom va con `screen` y aclarando el cielo oscuro. En
claro el bloom va con `multiply`, y multiplicar un gris azulado sobre el papel
sale un manchurron **marron** que tapa el aro.

Asi que en claro el bloom es dorado fijo (`HALO_CLARO` en `capa.js`), el mismo
tono que el aro. La temperatura sigue mandando en el punto de la barra, que es
donde se lee el numero.

### Los dos polvos, y por que no pueden ser el mismo

Eran **la ceniza que flota** por la escena y **la chispa de la ráfaga del
clic**, y compartian color. No pueden compartirlo:

- En claro, la que flota tiene que ser **un susurro**: con el mismo color que la
  chispa, el papel blanco se llenaba de motas y parecia una foto sucia.
- La chispa del clic tiene que ser **fuerte y oscura**, porque es lo unico que se
  ve al pulsar. Y no se veia: el canvas estaba a `opacity: 0.55` en claro y la
  particula a 0,4 de alfa, o sea un 22% de un gris palido sobre papel blanco.

Ahora hay dos variables, y cada particula usa la suya segun si tiene vida:

| | `--ceniza` (flota) | `--chispa` (clic) |
|---|---|---|
| oscuro | `206, 222, 231` | `244, 250, 254` |
| claro | `138, 146, 152` | `30, 36, 42` |

En oscuro la chispa es mas clara que la ceniza, y en claro mas oscura: cada tema
invierte el signo, porque el polvo se ve contra el fondo. Y
`html.claro .motas` pasa de `0.55` a `0.85`.

Antes los dos tenian un `rgba(206,222,231,...)` escrito en el codigo, que sobre
el papel casi blanco **no se veia nada**.

### Mas luz

El bloom se queda corto porque **su alpha viene del termometro**, y solo subia de
verdad con la CPU a 80: en la gama fresca eran 0,35 y el aro se veia apagado. Los
cuatro peldaños de `paleta()` suben y se sube el piso.

| | antes | ahora |
|---|---|---|
| sin datos | 0.30 | 0.46 |
| fresca | 0.35 | 0.56 |
| templada | 0.40 | 0.60 |
| caliente | 0.60 | 0.70 |
| hirviendo | 0.85 | 0.82 |

El de hirviendo **baja**: con la CPU al 80 el bloom era una placa de color plana
encima del aro. Y los topes de las dos animaciones suben en los dos temas:

| | oscuro | claro |
|---|---|---|
| `--halo-min` / `--halo-max` | 0.50 / 0.82 | 0.34 / 0.58 |
| `--aro-min` / `--aro-alto` | 0.54 / 0.88 | 0.46 / 0.72 |

### Dos tiempos de la respiracion

`--aro-alto` es el pico al pinchar, y antes era un `opacity: 1` fijo. En oscuro
sube mas porque ahi aclarar es encender; en claro, que multiplica, un 1 fijo
bajaba el anillo a un gris 66 y lo que salia era un aro de tinta duro, cuando la
foto sola esta en 163.

### El fallo de las variables que no estavam

Quitando las variables del panel del instalador se llevaron por delante
`--halo-min` y `--halo-max` **de los dos temas**. Una variable que falta no es
"un 0": la declaracion entera del keyframe se queda invalida y el `opacity` cae al
valor inicial, que es **1**. El bloom entero a tope, sin animacion.

Ahora hay un test que las mira: **toda variable que leen los keyframes tiene que
estar en los dos temas**, o la animacion no existe.

## Idioma


Todo el texto visible esta en ingles; los comentarios del codigo se quedan en
español, como en los otros repos de rhythmcrea.

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

La caja de las capas la calcula capa.js, y la regla cabe en dos lineas:

    pantalla estrecha (menos de 900 px)   escala al ALTO de la pantalla
    pantalla ancha                         escala al ANCHO de la pantalla

En horizontal la foto se escala SIEMPRE al ancho de la pantalla, aunque con eso
haya que recortar por arriba y por abajo. En vertical se recorta por los lados,
que es donde la figura llena la pantalla y las alas quedan en los bordes, que es
como se vio bien en el movil.

El invariante es simple: **en pantalla ancha el margen lateral nunca puede ser
positivo**, porque la escala es como minimo `ancho / 2000`, con lo que el ancho
de la foto nunca baja del de la pantalla. La franja sin fondo no puede aparecer.

Tres formas que se probaron y fallaron:

1. `background-size: cover`. En un monitor 16:10 las puntas de las alas se
   salian por los lados.
2. "Que la figura llene el 90-92% del alto", sin mirar el ancho. En una ventana
   alta —1440x2100— escalaba la imagen hasta 2,2 veces de ancho y la cortaba de
   golpe por los dos lados, con las alas partidas.
3. "Que entre la foto entera", sin mirar el ancho tampoco, que es la que ha
   estado hasta ahora. En un monitor mas ancho que 16:9 sobraban franjas a los
   lados, y esas franjas eran el respaldo difuminado: un corte vertical durisimo
   entre la foto nitida y la niebla. Es lo de la captura.

Cuando sobra alto se recorta casi todo por abajo —la hierba y el nombre—, y por
arriba un 3.5% de la foto como mucho, que es lo justo para no comerse el halo ni
las puntas de las alas, que estan al 9% y al 6% de la altura. Repartido en
proporcion al exceso, en un monitor 21:9 el recorte de arriba era del 18% y el
halo desaparecia.

El parallax se acota al margen que sobra alrededor, para que ninguna capa enseñe
un borde al moverse, y el difuminado de los bordes va con la medida de la franja
que tapa, hasta 180 px.

Comprobado en 3440x1440, 3840x2160, 2560x1440, 1920x1080, 1440x900, 1280x1024,
1024x768, 768x1024, 430x880 y 360x640: sin franja ni corte vertical en ninguna.

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