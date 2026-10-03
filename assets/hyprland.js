/* ─────────────────────────────────────────────────────────────────────────────
   The Hyprland section.

   Everything here comes out of the repo, not made up:
     · the scripts are the ones in ~/.local/bin
     · the flags are the ones install.sh --help prints
     · the stars and the last push come from scripts/collect-github.py

   Four of the pieces render live data out of data/system.js: the palette, the
   doctor, the install command and the displays. `tipo` picks the renderer.

   This is the only file to edit to add or change a piece.
   ───────────────────────────────────────────────────────────────────────────── */

window.RHYTHM_HYPRLAND = {
  repo: "rhythmcreative/hyprland",

  // El clip. Va suelto en la seccion, no como pieza desplegable: son 2,7 MB y
  // son lo primero que hay que ver, asi que no tiene sentido esconderlo detras
  // de un "+". El src se pone cuando el clip va a entrar en pantalla; el
  // poster son 23 KB y es lo que se ve hasta entonces.
  clip: {
    id: "hyprland",
    titulo: "hyprland, the desktop",
    src: "assets/hyprland-demo.mp4",
    poster: "assets/hyprland-poster.webp",
    nota: "Recorded off a real session."
  },

  // Los dos botones de abajo. El del manual va con flecha porque abre el manual,
  // que antes era el README del repo y ahora es manual.html: una pagina de esta
  // misma web con los atajos, las banderas y los componentes.
  //
  // No es una URL absoluta a proposito: en local es "manual.html" y al publicar
  // tambien, porque las dos estan en la raiz del repo y GitHub Pages sirve las
  // dos desde el mismo sitio. Con una ruta absoluta habria que cambiarla el dia
  // de publicar, y con un enlace al GitHub se perderia el diseno.
  manual: "manual.html",
  manualTexto: "Manual",

  // Instalar. Va DEBAJO del clip y de los botones, que es donde toca: primero se ve
  // como es, y luego ya se decide si se copia.
  //
  // Sin la nota de las banderas: era un parrafo entero debajo de la caja y, con
  // el comando entero arriba, el bloque ocupaba mas que el clip. Lo cuenta el
  // manual, que esta enlazado dos lineas mas arriba.
  instalar: {
    titulo: "Install",
    texto: "One line. It asks before it changes anything, and it stops if this " +
           "isn't Arch.",
    comando: 'bash -c "$(curl -fsSL --connect-timeout 10 --max-time 60 ' +
             'https://raw.githubusercontent.com/rhythmcreative/hyprland/main/install.sh)"'
  },

  // Lo que habia aqui antes (lema, intro, bloques de datos vivos y las piezas
  // desplegables) ya no se pinta. Se queda en el fichero de datos por si hay
  // que volver, pero la seccion es: cabecera, clip y los dos botones.
  lema: "An Arch desktop that doesn't break.",
  intro: "An installer that works the first time, updates that don't touch your " +
         "distro, and a doctor that tells you what's broken. You can have " +
         "Hyprland without any of this. With it, you have a desktop.",

  // What is running right now, from the collector. If it hasn't run, it shows a
  // dash rather than making a number up.
  enVivo: [
    { etiqueta: "keybindings", de: "binds" },
    { etiqueta: "displays",    de: "monitors" },
    { etiqueta: "packages",    de: "paquetes" }
  ],

  piezas: [
    {
      id: "instalador",
      titulo: "The installer",
      resumen: "One line, and it works.",
      chips: ["install.sh", "arch", "single pass"],
      filas: [
        "A single command: curl the install.sh and you're done. Nothing to clone, " +
        "no packages to pick by hand, nothing to fix afterwards.",
        "It refuses to continue if this isn't Arch, if sudo isn't authenticated, " +
        "or if there's no network. Before touching anything.",
        "--preview runs the whole script through without executing a single line.",
        "--resume picks up an interrupted install: finished steps are skipped, " +
        "and configs that already match the repo are left alone instead of being " +
        "backed up and overwritten.",
        "The log goes to a file and it says where, so a failure isn't lost in the " +
        "terminal."
      ],
      tipo: "comando",
      comando: 'bash -c "$(curl -fsSL --connect-timeout 10 --max-time 60 https://raw.githubusercontent.com/rhythmcreative/hyprland/main/install.sh)"',
      banderas: [
        ["--update", "sync configs, helpers and packages"],
        ["--preview", "run the script through without changing the system"],
        ["--resume", "continue an interrupted install"],
        ["--gpu", "nvidia, amd, intel, auto or none"],
        ["--replace-configs-all", "overwrite without keeping .bak copies"],
        ["-y --no-reboot", "no questions, no reboot"]
      ]
    },
    {
      id: "doctor",
      titulo: "The doctor",
      resumen: "It tells you what's broken instead of failing quietly.",
      chips: ["rhythm-doctor", "diagnostics"],
      filas: [
        "One command that looks at the whole machine and says what's missing or " +
        "wrong. Without it, a problem shows up three weeks later and nobody " +
        "knows where it came from.",
        "The installer runs it when it finishes, so there's nothing to remember.",
        "This is its actual output, not a summary of it. When something fails, " +
        "it fails here too — with the command that fixes it."
      ],
      tipo: "terminal"
    },
    {
      id: "paleta",
      titulo: "The palette",
      resumen: "pywal re-tints itself when the wallpaper changes.",
      chips: ["pywal", "live", "this page"],
      filas: [
        "Change the wallpaper and pywal rewrites the whole palette. The bar, the " +
        "dock, rofi, the terminal and the island recolour themselves.",
        "The swatches below are the ones your system generated a moment ago — " +
        "they're read from ~/.cache/wal/colors.json. They change when you change " +
        "the wallpaper.",
        "This page is themed from its own pywal too, which is why it doesn't look " +
        "the same twice."
      ],
      tipo: "paleta"
    },
    {
      id: "atajos",
      titulo: "The keybindings",
      resumen: "Every one of them, parsed out of the config.",
      chips: ["78", "hyprland.lua", "searchable"],
      filas: [
        "Every shortcut on the machine, with what it actually does. Read out of " +
        "the config file rather than the compositor: the API hands them over as " +
        "internal call ids that mean nothing to anyone.",
        "SUPER and SHIFT as keys, the way you press them. The ones marked locked " +
        "also work on the lock screen.",
        "The file is the source. The installer ships it and the update puts it " +
        "back, so this is what a fresh install actually gets."
      ],
      tipo: "atajos"
    },
    {
      id: "isla",
      titulo: "The island",
      resumen: "Quickshell. Folds away, opens by itself.",
      chips: ["quickshell", "qml", "plugin", "bar"],
      filas: [
        "The bar is a plugin. So are the clock, the launcher, the control centre " +
        "and the capture tool: there's nothing privileged inside.",
        "It folds to 34 px against the screen edge and opens when it has " +
        "something to show. Reaching the edge with the mouse brings it out too.",
        "It finds HYPRLAND_INSTANCE_SIGNATURE on its own, so hyprctl works for " +
        "everything it spawns.",
        "The dot's colour is the real CPU temperature."
      ]
    },
    {
      id: "dock",
      titulo: "The dock",
      resumen: "In Rust, built from source.",
      chips: ["rust-dock", "rust", "built by the installer"],
      filas: [
        "A dock written in Rust, compiled during the install. " +
        "--skip-rust-dock skips it.",
        "It's the process that saves the most memory compared to a typical " +
        "Hyprland desktop."
      ]
    },
    {
      id: "greeter",
      titulo: "The login screen",
      resumen: "SDDM with its own theme, and only on the built-in panel.",
      chips: ["sddm", "own theme", "cursor"],
      filas: [
        "A custom theme for SDDM, with the system cursor and the wallpaper you " +
        "already have.",
        "The theme is deployed by rhythm-sddm-deploy, which is the single source " +
        "of truth for those system files. pywal modifies them live, which is why " +
        "they aren't versioned.",
        "It only shows up on the internal panel: there's no way to log in from the " +
        "external one."
      ]
    },
    {
      id: "temas",
      titulo: "The theme",
      resumen: "pywal re-tints itself when the wallpaper changes.",
      chips: ["pywal", "regenerates", "all three surfaces"],
      filas: [
        "Change the wallpaper and pywal rewrites the palette again. Bar, dock, " +
        "rofi, terminal and island all follow.",
        "The wallpaper repairs itself: if a monitor stops being painted, it gets " +
        "repainted within seconds.",
        "The transition when you change wallpaper only runs on the built-in panel."
      ]
    },
    {
      id: "pantallas",
      titulo: "The displays",
      resumen: "Two panels, and the greeter only on one of them.",
      chips: ["hyprland", "per-monitor", "live"],
      filas: [
        "Read straight from Hyprland: name, resolution and scale, with the " +
        "primary one marked.",
        "This is why the login screen only appears on the internal panel — the " +
        "external one is never a login target."
      ],
      tipo: "pantallas"
    }
  ],

  // What it's built with. Names only; the detail is in the repo.
  base: ["Hyprland", "Quickshell", "Rust", "Waybar", "Hyprlock", "Rofi",
         "Pywal", "SDDM", "bash", "QML"],

  // ── El manual, por proyectos ───────────────────────────────────────────────
  //
  // Se llama `proyectos` y no `manual` porque `manual` ya lo usa el boton de la
  // portada para su URL. Dos cosas distintas con el mismo nombre en el mismo
  // objeto es un bug esperando: uno pisa al otro y no se ve hasta que el boton
  // sale con "[object Object]" de href.
  //
  // Es la lista de verdad de lo que hay escrito. El indice y el cuerpo se pintan
  // los dos desde aqui, asi que anadir un proyecto es anadir un objeto a esta
  // lista, y anadirle una seccion es anadir una linea a su `subs`. Nada mas: el
  // indice, el numero, el enlace "next" y el anclaje salen solos de ahi.
  //
  // El separador del anclaje es "/", no "-", para que el hash se lea como una
  // ruta —#hyprland/atajos— y no como un id suelto. El id del elemento lleva la
  // misma barra: los ids de HTML admiten "/", y asi dos proyectos pueden tener
  // una subseccion con el mismo nombre sin chocar entre si.
  //
  // Solo hay un proyecto, y es a proposito. La barra y el dock tienen repos
  // propio, pero son piezas que instala el instalador de hyprland y que se
  // configuran desde su misma configuracion: documentarlos como proyectos
  // sueltos los hacia parecer cosas aparte, y no lo son. Cuando haya un proyecto
  // que se instale por su cuenta, se anade aqui como segundo objeto y el indice
  // lo recoge sin tocar nada mas.
  // Cada subseccion puede llevar `pieza`: el id de una entrada de `piezas` de
  // arriba, de donde sale su texto. Las que no llevan `pieza` se pintan con una
  // funcion propia (los atajos, la tabla de componentes), porque su texto sale
  // de data/documentacion.js y no de aqui.
  proyectos: [
    {
      id: "hyprland",
      titulo: "hyprland",
      repo: "rhythmcreative/hyprland",
      resumen: "The installer, the config, and every piece of the desktop, " +
        "written from the repository.",
      subs: [
        { id: "empezar",    t: "Getting started",    pieza: "instalador" },
        { id: "atajos",     t: "Hotkeys" },
        { id: "instalado",  t: "What's installed" },
        { id: "isla",       t: "The island",         pieza: "isla" },
        { id: "dock",       t: "The dock",           pieza: "dock" },
        { id: "barra",      t: "The bar" },
        { id: "tema",       t: "The theme",          pieza: "temas" },
        { id: "login",      t: "The login screen",   pieza: "greeter" },
        { id: "doctor",     t: "The doctor",         pieza: "doctor" },
        { id: "actualizar", t: "Updating" },
        { id: "arbol",      t: "The file tree" },
        { id: "problemas",  t: "When something breaks" }
      ]
    }
  ],
};