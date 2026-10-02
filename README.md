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

### El halo

En el angel se busca el aro de verdad, y sale en el sitio exacto. En uno
generico no hay aro, asi que se busca la **fuente de luz**: el punto mas claro
de la mitad de arriba, que en la practica es el cielo detras del sujeto. Se
suaviza antes de buscar el maximo, porque si no el anillo se planta en un grano
suelto. Y va acotado a `0.16..0.84` en horizontal y `0.09..0.40` en vertical:
sin acotar caia en `y 0.00`, en el borde, y un aro pegado al borde no es un aro,
se ve medio circulo cortado.

### `--auto` compara dos cosas, no una

Si no cambia nada, no se rehace, porque son veinte segundos. Se comparan:

- **el wallpaper** (contra el `origen` que escribe el propio script)
- **la receta**, una huella de las constantes que afectan al resultado

Lo de la receta estaba porque cambiar la graduacion y volver a correr `--auto` no
hacia nada: la comprobacion era solo "¿es el mismo wallpaper?" y el wallpaper era
el mismo. Veinte segundos mirando una imagen que no habia cambiado.

Y el campo va anclado al principio de linea (`^[ \t]*origen:`) porque sin el `^`
el comentario `// origen: de que imagen salieron` tambien casaba y devolvia `de`.
Medido: hacia que `--auto` rehiziese la foto cada vez y dijera que el wallpaper
habia cambiado cuando no habia cambiado nada.

### El tema claro se quemaba

A 226 de mediana, con una foto ya clara el factor era 1.0 y los claros se comian
el rango: el angel con la espada salia casi sin dibujo. Bajado a 206 y con el
tope de subida en 1.18 en vez de 1.45. Subir mas de lo que ya es claro no es
graduar, es quemar.

Medido sobre el resultado, con un wallpaper saturado en tema claro: nombre
16.97:1, subtitulo 14.71:1, boton 5.52:1. Los tres por encima de AA.

### Y pesa menos

| | imagen de la portada |
|---|---|
| el angel | 160 KB por tema |
| un wallpaper | **91 KB** por tema |

La pagina entera se queda en 148 KB con gzip en oscuro y 177 KB en claro.

### Lo que hay que saber antes de publicar

En modo `auto`, **el wallpaper se publica**: las capas van commiteadas en
`assets/`, porque GitHub Pages sirve desde el repo. Con el angel no hay nada que
darse cuenta; con `auto`, lo que tengas puesto en el escritorio se vera en la
portada.

## Los atajos: por que se leen del fichero y no de la API

`hyprctl binds` devuelve los 78 por dentro:

```js
{ key: 'Return', mod: 64, d: '__lua', arg: '6' }
```

`SUPER + Return -> __lua(6)` no le dice nada a nadie, y `desc` viene vacio en
los 78. La API no sabe que hace un atajo: solo que hay que llamar a la sexta
funcion del dispatcher de lua.

En el fichero de configuracion, en cambio, esta escrito en humano:

```lua
hl.bind(mainMod .. " + Return", hl.dsp.exec_cmd(terminal))
```

Asi que `scripts/parse-binds.py` lee `hyprland.lua` y saca de ahi el mapa. El
numero se sigue sacando de `hyprctl`, que es quien sabe la verdad, y la pagina
**compara los dos y avisa si no cuadran** en vez de enseñar un numero que no es
el real.

Que salgan los 78 exactos no es casualidad: el fichero tiene 60 llamadas a
`hl.bind`, pero dos estan dentro de `for i = 1, 10` y cada una genera diez.
60 − 2 + 20 = 78.

Lo que hace el parser, y por que:

- **Trocea por parentesis, no por regex.** Una regex se comia el parentesis final
  y la accion llegaba como `hl.dsp.exec_cmd("~/.local/bin/toggle-island"` — sin
  cerrar — y ninguna etiqueta casaba.
- **Resuelve las variables**: `mainMod` → SUPER, `terminal` → kitty,
  `fileManager` → thunar. Si no, salen cosas como `hl.dsp.exec_cmd(terminal)`.
- **Se queda con la cabeza de una tuberia**: `grim -g "$(slurp)" - | swappy -f -`
  es una captura, no "captura | swappy".
- **Traduce `wpctl`**: `set-volume @DEFAULT_AUDIO_SINK@ 5%-` es "volume down 5%",
  no "wpctl set volume DEFAULT AUDIO SINK 5%".
- **Quita el lanzador del nombre**, no de la frase: "rofi wifi menu" → "wifi
  menu". Si se quita despues con una regex sobre la frase entera,
  `adaptive rofi window` se queda en `window` y se pierde el "adaptive".

### Las columnas, decididas por container query y no por media query

La seccion tiene una columna fija a la izquierda y las piezas a la derecha, asi
que el sitio disponible no tiene nada que ver con el ancho de la ventana. Medido:

| pantalla | ancho de la pieza | sitio para la descripción |
|---|---|---|
| 1180 | 429 px | 57 px |
| 1440 | 578 px | 119 px |
| 1920 | 854 px | 234 px |

Con una media query a 760 de pantalla salían dos columnas con **57 px** de
descripción a 1180: una palabra por línea. Con `@container pieza (min-width:
700px)` la pregunta es "cuanto hay aqui", y sale una columna hasta 700 y dos a
partir de ahi. Por debajo de 400 de contenedor la descripción baja a su propia
fila, porque el combo mas largo se come 150 de 284.

## Los datos que se recogian y se tiraban

Ocho valores se recogian en cada ejecucion del recolector y no se enseban en
ninguna parte. Cinco van ahora en una linea de la columna "The data" del pie:

```
kernel 7.2.7-arch1-1  ·  uptime 1 h 27 min  ·  load 3.85  ·  disk 428G free  ·  services 22 up
```

**Aviso, porque esto va a estar en una pagina publica:** el kernel con su version
exacta y las horas de uptime son huella digital de la maquina. No es grave —el
usuario ya sale en la ruta que enseña el doctor, y las dos pantallas con su
resolucion ya estaban— pero quien quiera quitarlo borra de la lista `FICHA` en
`app.js` lo que no quiera, y es una linea.

`hostname` y `servicios` se siguen recogiendo pero **no** salen en la pagina: el
nombre del equipo no aporta nada a quien lo ve y publica una cosa de mas.

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