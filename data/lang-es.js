// ── Español ───────────────────────────────────────────────────────────────────
// ES EL IDIOMA DE REFERENCIA, Y ESTE ES EL FICHERO QUE SE COPIA AL RESTO.
//
// No tiene claves ni identificadores: la clave es el texto ingles que ahora mismo
// se lee en la pagina, y el valor lo mismo en español. Para añadir un idioma se
// copia este fichero, se le cambia el nombre y se va|traduciendo linea a linea. Lo
// que no se traduzca se queda en ingles, sin romperse.
//
// ── POR QUE NO HAY ACENTES EN ESTE FICHERO ────────────────────────────────────
//
// Porque el traductor escribe en `nodeValue`, y en un nodo de texto NO se
// descodifican las entidades: si aqui se pusiera "&aacute;", en pantalla saldria
// literalmente "&aacute;". Los acentes tienen que ser el caracter de verdad.
//
// Y aun asi, el fichero se queda en ASCII, escribiendo el caracter como
// `\u00e1`. Es lo mismo —el navegador ve una "a" con tilde— y ademas el fichero no
// se rompe nunca con una codificacion mal puesta, y se puede buscar con grep. Por
// eso tambien las claves llevan `\u2019` en vez de la comilla tipografica: la clave
// tiene que ser EXACTAMENTE lo que hay en el nodo de texto, que ya viene
// descodificado.
//
// ── LO QUE NO SE TRADUCE ──────────────────────────────────────────────────────
//
// Nombres propios, banderas del instalador (--preview, --resume), comandos, teclas
// (SUPER, SHIFT), rutas y ficheros de codigo. Son 141 de las 457 cadenas, y
// traducirlas seria inventar cosas.
//
// Y OJO: dentro de los valores si puede haber etiquetas de HTML, porque el
// traductor las escribe en el texto y las etiquetas se pierden. Se pueden usar solo
// las de la lista negra de la CSP, que es `script-src`, y ningun dato del sitio
// necesita `<style>`.

window.RHYTHM_I18N = window.RHYTHM_I18N || {};
window.RHYTHM_I18N.es = {

  // ── Lo que hay en el HTML de las dos paginas ───────────────────────────────
  "Skip to content": "Ir al contenido",
  "Switch theme": "Cambiar tema",
  "Contents": "\u00cdndice",
  "Language": "Idioma",

  // La portada
  "RHYTHMCREA": "RHYTHMCREA",
  "a page for rhythmcrea\u2019s repositories":
    "una p\u00e1gina para los repositorios de rhythmcrea",
  "repositories": "repositorios",
  "An Arch desktop that doesn\u2019t break.": "Un escritorio Arch que no se rompe.",

  // El pie
  "THIS PAGE": "EN ESTA P\u00c1GINA",
  "the installer": "el instalador",
  "Install": "Instalar",
  "On GitHub Pages, from": "En GitHub Pages, desde",

  // La cabecera del manual
  "The manual \u2014 Rhythmcrea": "El manual \u2014 Rhythmcrea",
  "The manual": "El manual",
  "The whole desktop, piece by piece: what each thing is, what it does, and what it does not do.":
    "El escritorio entero, pieza a pieza: qu\u00e9 es cada cosa, qu\u00e9 hace y qu\u00e9 no hace.",
  "This page is generated from the repository by <code>scripts/collect-docs.py</code>. When you change a keybinding or a flag, run it again and commit the file it writes.":
    "Esta p\u00e1gina se genera desde el repositorio con <code>scripts/collect-docs.py</code>. Cuando cambies un atajo o una bandera, ejec\u00fautalo otra vez y sube el fichero que escribe.",

  // El indice y los titulos de los 13 capitulos
  "On this page": "En esta p\u00e1gina",
  "Getting started": "Empezar",
  "Hotkeys": "Atajos",
  // Las dos comillas. El titulo viene de hyprland.js con un apostrofo normal y el
  // indice lo copia tal cual, asi que con una sola no encuentra: medido, salia
  // "What's installed" en ingles al lado de los otros doce ya traducidos.
  "What\u2019s installed": "Qu\u00e9 hay instalado",
  "What's installed": "Qu\u00e9 hay instalado",
  "The island": "La isla",
  "The dock": "El dock",
  "The bar": "La barra",
  "The theme": "El tema",
  "The login screen": "La pantalla de entrada",
  "The doctor": "El m\u00e9dico",
  "Updating": "Actualizar",
  "The file tree": "El \u00e1rbol de ficheros",
  "When something breaks": "Cuando algo se rompe",
  "On a phone": "En un m\u00f3vil",
  "documents": "documentos",

  // ── El reproductor de video ────────────────────────────────────────────────
  "hyprland, the desktop": "hyprland, el escritorio",
  "Recorded off a real session.": "Grabado de una sesi\u00f3n real.",
  "Play": "Reproducir",
  "Pause": "Pausa",
  "Mute": "Silenciar",
  "Unmute": "Quitar el silencio",
  "Position": "Posici\u00f3n",
  "Volume": "Volumen",

  // Los avisos del reproductor
  "Playing without sound: the browser blocked audio.":
    "Sonando sin sonido: el navegador ha bloqueado el audio.",
  "This browser will not play the clip.": "Este navegador no va a reproducir el clip.",
  "The clip did not load. Your browser or network may be blocking video files.":
    "El clip no se ha cargado. Puede que tu navegador o tu red est\u00e9n bloqueando los archivos de v\u00eddeo.",
  "The clip stopped downloading. Check your connection and try again.":
    "El clip ha dejado de descargarse. Revisa tu conexi\u00f3n y prueba otra vez.",
  "This browser cannot play the clip. It is 50 seconds of the desktop: the launcher, the control centre and the end.":
    "Este navegador no puede reproducir el clip. Son 50 segundos del escritorio: el lanzador, el centro de control y el final.",

  // Si falta un dato
  "No data in <code>assets/hyprland.js</code>.": "No hay datos en <code>assets/hyprland.js</code>.",
  "No projects in <code>H.proyectos</code>.": "No hay proyectos en <code>H.proyectos</code>.",

  // ── El capitulo del instalador ─────────────────────────────────────────────
  "The installer": "El instalador",
  "One line, and it works.": "Una l\u00ednea, y funciona.",
  "arch": "arch",
  "single pass": "una sola pasada",

  "A single command: curl the install.sh and you're done. Nothing to clone, no packages to pick by hand, nothing to fix afterwards.":
    "Un solo comando: descarga el install.sh con curl y ya est\u00e1. Nada que clonar, ni que elegir paquetes a mano, ni que arreglar despu\u00e9s.",
  "It refuses to continue if this isn't Arch, if sudo isn't authenticated, or if there's no network. Before touching anything.":
    "Se niega a seguir si esto no es Arch, si sudo no est\u00e1 autenticado o si no hay red. Antes de tocar nada.",
  "--preview runs the whole script through without executing a single line.":
    "<code>--preview</code> pasa el script entero sin ejecutar ni una l\u00ednea.",
  "--resume picks up an interrupted install: finished steps are skipped, and configs that already match the repo are left alone instead of being backed up and overwritten.":
    "<code>--resume</code> retoma una instalaci\u00f3n interrumpida: se saltan los pasos ya hechos, y las configuraciones que ya coinciden con el repo se dejan como est\u00e1n en vez de hacer copia de seguridad y sobrescribirlas.",
  "The log goes to a file and it says where, so a failure isn't lost in the terminal.":
    "El registro va a un fichero y dice cu\u00e1l, para que un fallo no se pierda en la terminal.",

  "sync configs, helpers and packages": "sincroniza configuraciones, ayudantes y paquetes",
  "run the script through without changing the system":
    "pasa el script entero sin cambiar el sistema",
  "continue an interrupted install": "retoma una instalaci\u00f3n interrumpida",
  "nvidia, amd, intel, auto or none": "nvidia, amd, intel, auto o ninguno",
  "overwrite without keeping .bak copies": "sobrescribe sin guardar copias .bak",
  "no questions, no reboot": "sin preguntas y sin reiniciar",

  // ── Avisos sueltos ──────────────────────────────────────────────────────────
  // Los rotulos del boton del tema. Se traduce cada trozo, no el rotulo entero: hay
  // nueve combinaciones de "modo actual" por "modo siguiente", y con el rotulo
  // entero habria que mantener las nueve al dia.
  "Theme": "Tema",
  "Change it.": "C\u00e1mbialo.",
  "tap for": "pulsa para pasar a",
  "Matches your device": "Como el del sistema",
  "Light": "Claro",
  "Dark": "Negro",
  "no data": "sin datos",
  "just now": "ahora mismo",
  "Copy": "Copiar",
  "Copied": "Copiado",
  "Back to top": "Volver arriba",
  "Previous": "Anterior",
  "Next": "Siguiente",
  "Open the full-size image": "Abrir la imagen a tama\u00f1o completo",

  // ── Como se lee una fecha ───────────────────────────────────────────────────
  "min ago": "min",
  "h ago": "h",
  "d ago": "d"
};