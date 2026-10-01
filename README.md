# Rhythm

La web donde caben los proyectos. HTML, CSS y JavaScript a pelo: sin build, sin
framework, sin dependencias. Se abre haciendo doble clic en `index.html` y
tambien se sirve tal cual desde GitHub Pages.

## Que tiene de dinamica

Tres cosas, y las tres degradan bien en vez de romperse.

**Los proyectos salen de `assets/projects.js`.** Es el unico fichero que hay
que tocar para anadir uno. Con `repo` puesto, la tarjeta consulta la API de
GitHub al cargar y enseña las estrellas, el lenguaje y el dia del ultimo
commit. Si la API falla o se agota la cuota, se queda el valor guardado y la
tarjeta no lo disimula.

**El estado del escritorio sale de `data/system.js`,** que genera
`scripts/collect-system-stats.sh` en la maquina. Ahi van las pantallas, los
atajos, las temperaturas, la carga y los servicios. Si el fichero no existe,
la seccion lo dice en vez de teachar ceros.

**El tema `Pywal` se construye con los colores que pywal esta generando ahora
mismo**, leidos de `~/.cache/wal/colors.json`. Cambia el fondo de pantalla y
cambia la pagina, que es la misma idea que hace Ryoku con el marco y la barra.

## Anadir un proyecto

Editar `assets/projects.js` y anadir un objeto al array:

```js
{
  name: "lo-que-sea",
  repo: "rhythmcreative/lo-que-sea",   // para los datos en vivo
  stars: 0,                            // valor de respaldo
  category: "desktop",                 // desktop | android | home | tools
  featured: true,                      // punto y borde de acento
  tagline: "Una frase.",
  blurb: "Dos lineas explicando que es.",
  tags: ["hyprland", "rust"]
}
```

La categoria tiene que existir tambien en `RHYTHM_CATEGORIES`, o el filtro no
la ensena y el boton no sale.

## Refrescar el estado del escritorio

```bash
./scripts/collect-system-stats.sh
```

Solo lee. No cambia nada del sistema, y lo que no encuentra lo deja en `null`
en vez de fallar. Se puede poner en un timer de systemd --user para que la
pagina este al dia sola.

## En local

```bash
./serve.sh          # http://127.0.0.1:8788/
./serve.sh 9000     # otro puerto
```

No hace falta: `index.html` funciona con doble clic.

## Publicarlo

Es un sitio estatico, asi que vale cualquier hosting. Con GitHub Pages, la
opcion mas simple es dejar el repo en publico y apuntar Pages a la rama.

## Por que los datos van en .js y no en .json

Porque la pagina tiene que poder abrirse desde `file://`. Un `fetch()` de un
`.json` local ahi lo bloquea el navegador por CORS, y no hay forma de evitarlo
sin servidor. Un `<script src="datos.js">` no tiene ese problema, porque no es
una peticion: es un fichero de script mas.

Eso obliga a que el valor este en una asignacion (`window.RHYTHM_SYSTEM = {...}`)
en vez de ser JSON a pelo. Se puede convertir con una linea de Python si alguna
vez hace falta.

## Atajos de la pagina

| Tecla | Que hace |
|---|---|
| `T` / `Shift`+`T` | Tema siguiente / anterior |
| `/` | Buscar proyectos |
| `G` | Ir a los proyectos |
| `E` | Ir al escritorio en vivo |
| `?` | Esta ventana |
| `Esc` | Cerrar |

## Estructura

```
index.html
assets/style.css        los siete temas, en variables CSS
assets/app.js           toda la lógica
assets/projects.js      los proyectos  <- se edita
data/system.js          el estado de la maquina  <- se genera
scripts/collect-system-stats.sh
serve.sh
```

## Una nota sobre la API de GitHub

Sin token, `api.github.com` da 60 peticiones por hora por IP. Con los 19 repos
sobra de largo. Si algun dia se queda corta, la pagina deja de pedir y se
queda con los valores guardados, sin reintentar: reintentar 19 veces solo
gastaria mas cuota. Para mas repos, meter un token.
