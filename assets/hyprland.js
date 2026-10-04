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
    // El WebM del mismo clip, a 720p en vez de 1080p. Va el primero en la lista de
    // <source> y por eso es el que se descarga casi siempre.
    //
    // Pesa 3,9 MB frente a los 10,4 del mp4, que es un 62 % menos, y no se ve
    // peor: el reproductor no pasa de 990 px de ancho y el mp4 estaba a 1920, con
    // lo que se Bajaba una resolucion que no se podia ver ni con zoom.
    //
    // Y hay una razon mas: hay bloqueadores de anuncios y redes de empresa que
    // cortan los .mp4. Si el webm va primero, a esos no les afecta. Quien no sepa
    // hacer WebM —un Safari viejo— cae en el mp4, que esta aqui justo para eso.
    //
    // Como se codifico, para poder rehacerlo:
    //   ffmpeg -i assets/hyprland-demo.mp4 -vf scale=1280:720 \
    //     -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -deadline good -cpu-used 3 \
    //     -c:a libopus -b:a 96k assets/hyprland-demo.webm
    webm: "assets/hyprland-demo.webm",
    poster: "assets/hyprland-poster.webp",
    nota: "Recorded off a real session.",

    // Por donde empieza el clip en vez de por el principio.
    //
    // El video abre con el escritorio desenfocado y encima un cartel de "HYPRLAND"
    // que se desvanece. El poster es un fotograma del propio video, del segundo
    // 5,2, asi que antes de darle a play se ve una escena y al pulsar de golpe
    // salia un cartel en negro: eso era lo de "a la primera no se pone bien".
    //
    // El segundo no es de ojo. Medido el 2026-10-04 mirando el brillo de la
    // banda central, que es donde va el texto, a lo largo del arranque:
    //
    //     4,0 s  gris  61     el cartel, entero
    //     4,4 s  gris  61     el cartel, entero
    //     4,6 s  gris  57     desvaneciendose
    //     4,8 s  gris  50     casi en negro
    //     5,0 s  gris 176     limpio, ya el escritorio
    //
    // Con 3.2, que era el del video anterior, caia de lleno en medio del cartel. Se
    // salta a 5,0, con margen para que el segundo que se busca no sea justo el
    // ultimo del desvanecido.
    //
    // Va en los datos y no dentro del reproductor para que el segundo sea un
    // numero que se cambia sin tocar codigo, y para que quede escrito que es una
    // decision y no un descuido.
    desde: 5.0
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
      resumen: "It says what is broken instead of failing quietly.",
      chips: ["rhythm-doctor", "diagnostics", "one command"],
      filas: [
        "One command that looks at the whole machine and says what is missing " +
        "or wrong. Without it a problem shows up three weeks later and nobody " +
        "knows where it came from.",
        "The installer runs it when it finishes, and the update runs it at the " +
        "end too, so there is nothing to remember and nothing to schedule.",
        "It only reads. It does not fix anything, it does not install anything, " +
        "and it will not touch a file: the fix is printed next to the finding, " +
        "for you to run.",
        "The block below is a real run of it on a machine where nothing is " +
        "wrong, with the colour codes taken out because they mean nothing on a " +
        "web page. When something is wrong it fails in the same place, with the " +
        "command that fixes it underneath."
      ],
      tipo: "terminal",
      salida:
        "rhythm-doctor: check (repo: ~/hyprland)\n\n"
          +           "  ok    /etc/sddm/Xsetup is up to date\n"
          +           "  ok    xsetup.conf.disabled is present (X11 stays off, correct)\n"
          +           "  ok    all deployed units point at real executables\n"
          +           "  ok    scripts referenced by the units are present\n"
          +           "  SDDM greeter:\n    wrapper: correct\n    template: correct\n"
          +           "    sddm.conf: correct\n    login cursor: correct\n"
          +           "    theme: correct\n    Xsetup (X11 fallback): correct\n"
          +           "    cursor theme 'Bibata-Modern-Ice' is installed\n    OK\n"
          +           "  ok    battery-limit.conf in ~/.local/state\n"
          +           "  ok    no local edits in .config/hypr\n\n"
          +           "doctor: everything correct.",    },
    {
      id: "paleta",
      titulo: "The palette",
      resumen: "Sixteen colours, read out of the wallpaper.",
      chips: ["pywal", "16 colours", "one file"],
      filas: [
        "pywal turns the wallpaper into a palette of sixteen colours and writes " +
        "them to ~/.cache/wal/colors.json. The bar, the dock, the launchers, the " +
        "terminal and the island all read that file instead of carrying colours " +
        "of their own.",
        "The file is rewritten every time the wallpaper changes, so there is " +
        "nothing to configure and nothing to keep in sync. The installer sets it " +
        "up once and it looks after itself from then on.",
        "What it does not do: choose well on a busy picture. It samples the image " +
        "and picks, so a wallpaper with three competing colours produces a " +
        "palette that is correct and not always pretty."
      ],
      tipo: "paleta"
    },
    {
      id: "isla",
      titulo: "The island",
      resumen: "The strip on the top edge. Quickshell, and every part of it " +
        "is a plugin.",
      chips: ["quickshell", "qml", "plugins", "34 px"],
      filas: [
        "The strip that sits against the top edge of the screen. It folds " +
        "down to 34 px and opens when it has something to show: a track " +
        "changing, a network going down, a notification arriving. Reaching " +
        "the edge with the mouse brings it out as well.",
        "Nothing inside it is privileged. The clock, the launcher, the " +
        "control centre and the screen capture tool are all plugins loaded " +
        "the same way, in QML, and any of them can be taken out without " +
        "breaking the rest.",
        "It reads HYPRLAND_INSTANCE_SIGNATURE by itself, so hyprctl works " +
        "for everything it starts. A panel that needs an environment " +
        "variable set by hand is a panel that breaks the day you add a " +
        "second monitor.",
        "The dot is the real CPU temperature, not a decorative circle: it " +
        "goes from blue to orange as the machine warms up.",
        "SUPER + I folds it by hand, which is the quickest way to check " +
        "whether it is doing something."
      ]
    },
    {
      id: "dock",
      titulo: "The dock",
      resumen: "The strip along the bottom edge. Ours, in Rust and GTK4, " +
        "compiled during the install.",
      chips: ["rust-dock", "rust", "gtk4", "30 fps"],
      filas: [
        "A dock in Rust with a GTK4 interface, compiled from source by the " +
        "installer. There is no package to install and nothing to update " +
        "afterwards. --skip-rust-dock skips the build if you would rather " +
        "put something else there.",
        "It has two halves. The left one holds the applications you have " +
        "anchored; the right one fills with whatever else is open. Windows " +
        "appear and disappear in real time at 30 fps, because the dock asks " +
        "the compositor instead of guessing.",
        "Drag an icon to reorder it. Hover a window for a preview rendered " +
        "with grim. Clicking focuses, clicking again minimizes.",
        "It takes its own options from the command line: position, icon " +
        "size, padding, spacing, corner radius, opacity, which monitor to " +
        "appear on, and --smart-view, which keeps it hidden until the " +
        "cursor reaches the edge.",
        "What it does not do: no clock, no tray, no systray, no favourites " +
        "launcher. The clock is in the bar, and the launcher is SUPER + A. " +
        "Looking for a panel with all of that in one piece, this is not it."
      ]
    },
    {
      id: "greeter",
      titulo: "The login screen",
      resumen: "SDDM, with its own theme, and only on the built-in panel.",
      chips: ["sddm", "own theme", "deployed"],
      filas: [
        "A custom theme for SDDM, using the system cursor and the wallpaper " +
        "you already have, so the screen you log in from is the same picture " +
        "you get afterwards.",
        "The files it needs live in /etc, which is not somewhere a normal user " +
        "writes, so they are deployed by rhythm-sddm-deploy rather than " +
        "installed directly. That script is the single source of truth for " +
        "them: when it runs it rebuilds every file from the repository.",
        "pywal rewrites the theme's colours while the machine is running, which " +
        "is why those files are not versioned. Running the deploy script " +
        "brings them back to the repository's version; running it twice is " +
        "harmless.",
        "It only comes up on the internal panel. There is no way to log in from " +
        "the external one, and that is not a setting somebody forgot: the " +
        "external screen is never a login target.",
        "What it does not do: work on a machine with a single panel. The theme " +
        "assumes the built-in display exists, and on a laptop with the lid " +
        "closed at boot there is nothing to draw it on."
      ]
    },
    {
      id: "temas",
      titulo: "The theme",
      resumen: "The wallpaper decides the colours, and everything else follows.",
      chips: ["pywal", "wallpaper", "every surface"],
      filas: [
        "Change the wallpaper and pywal writes a new palette from it. The bar, " +
        "the dock, the launchers, the terminal and the island all recolour " +
        "themselves. There is no theme picker and no second colour choice to " +
        "make anywhere.",
        "It reaches further than it looks. The terminal colours, the GTK theme " +
        "behind the dialogs, the cursor and the login screen's own template all " +
        "come from the same sixteen values. One wallpaper moves all of it.",
        "The wallpaper also repairs itself: if a monitor stops being painted, it " +
        "is repainted within seconds, without asking and without a restart.",
        "What it does not do: understand a photograph. pywal samples the image " +
        "and picks from what it finds, so a wallpaper with three competing " +
        "colours gives a correct palette that is not always the one you would " +
        "have chosen.",
        "And the fade only runs on the built-in panel. On the external one the " +
        "wallpaper cuts instead of dissolving, because that screen is driven " +
        "differently and nobody wired the animation into it."
      ]
    },
    {
      id: "pantallas",
      titulo: "The displays",
      resumen: "Two panels, and the login screen only on one of them.",
      chips: ["hyprland", "per-monitor", "eDP + DP"],
      filas: [
        "The machine has two: the built-in panel and an external one over DP. " +
        "Each carries its own name, resolution and scale in the compositor's " +
        "configuration, and the built-in one is the primary.",
        "That is why the login screen only ever appears on the internal panel: " +
        "the external one is not a login target. It is a screen, not a door.",
        "The wallpaper daemon needs to know which one it is painting, and it " +
        "reads that from the environment. If the variable is missing it falls " +
        "back to wayland-0, finds nothing there, and paints zero screens " +
        "without saying anything. It is the quietest failure in the whole " +
        "setup."
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
  // La seccion de movil va al final a proposito. Todo lo de antes es del
  // escritorio y de como se instala; esta responde a una pregunta de otro
  // tipo —"y desde el movil?"— y encaja mejor como ultima nota que metida
  // entre el instalador y los atajos.
  //
  // Solo hay un proyecto, y es a proposito. La barra y el dock tienen repos
  // propio, pero son piezas que instala el instalador de hyprland y que se
  // configuran desde su misma configuracion: documentarlos como proyectos
  // sueltos los hacia parecer cosas aparte, y no lo son. Cuando haya un proyecto
  // que se instale por su cuenta, se anade aqui como segundo objeto y el indice
  // lo recoge sin tocar nada mas.
  // Cada subseccion puede llevar `pieza`: el id de una entrada de `piezas` de
  // arriba, de donde sale su texto, o una lista de ids si la seccion necesita mas
  // de una —la del tema, por ejemplo, es el tema y la paleta—. Las que no llevan
  // `pieza` sacan su texto de data/documentacion.js o de una funcion de app.js,
  // porque su texto no es contenido de este fichero.
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
        { id: "instalado",  t: "What's installed",    pieza: "pantallas" },
        { id: "isla",       t: "The island",         pieza: "isla" },
        { id: "dock",       t: "The dock",           pieza: "dock" },
        { id: "barra",      t: "The bar" },
        { id: "tema",       t: "The theme",          pieza: ["temas", "paleta"] },
        { id: "login",      t: "The login screen",   pieza: "greeter" },
        { id: "doctor",     t: "The doctor",         pieza: "doctor" },
        { id: "actualizar", t: "Updating" },
        { id: "arbol",      t: "The file tree" },
        { id: "problemas",  t: "When something breaks" },
        { id: "movil",      t: "On a phone" }
      ]
    }
  ],
};