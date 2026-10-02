/* ─────────────────────────────────────────────────────────────────────────────
   La seccion de Hyprland.

   Todo lo que hay aqui sale del repo de verdad, no inventado:
     · los scripts son los de ~/.local/bin
     · las banderas son las que --help imprime en install.sh
     · las estrellas y el ultimo push los recoge scripts/collect-github.py

   Es el unico fichero que hay que tocar para anadir o cambiar una pieza.
   ───────────────────────────────────────────────────────────────────────────── */

window.RHYTHM_HYPRLAND = {
  repo: "rhythmcreative/hyprland",
  nombre: "rhythm's hyprland",
  lema: "Un escritorio Arch que no se rompe.",
  intro: "Instalador que funciona a la primera, actualizaciones que no tocan tu " +
         "distro y un doctor que dice que esta roto. Sin esto se puede tener " +
         "Hyprland; con esto se tiene un escritorio.",

  // Lo que hay en la sesion ahora mismo, del recolector.
  enVivo: [
    { etiqueta: "atajos",    valor: null, de: "binds" },
    { etiqueta: "pantallas", valor: null, de: "monitors" },
    { etiqueta: "paquetes",  valor: null, de: "paquetes" }
  ],

  // Las piezas. `chips` es lo pequeno que va abajo; `filas` son lineas de
  // detalle que salen al abrirla.
  piezas: [
    {
      id: "instalador",
      titulo: "El instalador",
      resumen: "Una linea, y funciona.",
      chips: ["install.sh", "arch", "una sola pasada"],
      filas: [
        "Un solo comando: curl del install.sh y ya. No hay que clonar, ni elegir " +
        "paquetes a mano, ni arreglar nada despues.",
        "Rechaza seguir si no es Arch, si no hay sudo autenticado o si no hay " +
        "internet. Antes de tocar nada.",
        "Con --preview se ve el guion entero sin que se ejecute una sola linea.",
        "Con --resume sigue una instalacion a medias: lo ya hecho no se repite, y " +
        "las configs que ya son iguales al repo no se tocan ni se respaldan.",
        "El log va a un fichero y se dice donde, asi que un fallo no se pierde " +
        "en la terminal."
      ],
      banderas: [
        ["--update", "sincroniza configs, ayudantes y paquetes"],
        ["--preview", "ensaya el guion entero sin tocar el sistema"],
        ["--resume", "continua una instalacion interrumpida"],
        ["--gpu", "nvidia, amd, intel, auto o none"],
        ["--replace-configs-all", "sobrescribe sin dejar copias .bak"],
        ["-y --no-reboot", "sin preguntas y sin reiniciar"]
      ]
    },
    {
      id: "doctor",
      titulo: "El doctor",
      resumen: "Dice que esta roto, en vez de fallar en silencio.",
      chips: ["rhythm-doctor", "diagnostico"],
      filas: [
        "Un comando que mira el sistema entero y dice que falta o que esta " +
        "mal. Sin el, un fallo aparece tres semanas despues y no se sabe de " +
        "donde vino.",
        "El verificador lo llama el propio instalador al terminar, asi que no " +
        "hay que acordarse de ejecutarlo."
      ],
      banderas: []
    },
    {
      id: "ota",
      titulo: "Las actualizaciones",
      resumen: "Sin tocar tu distro.",
      chips: ["system-ota", "rhythm-ota-checker", "paquetes propios"],
      filas: [
        "El escritorio se actualiza sin tocar la distro. No se anade ningun " +
        "repositorio de terceros a pacman ni se mezclan los paquetes de Arch " +
        "con los propios.",
        "El sistema avisa cuando hay version nueva y dice que trae antes de " +
        "aplicarla.",
        "Cada version sale con notas en ingles, cortas, con lo que cambia y " +
        "lo que se rompe."
      ],
      banderas: []
    },
    {
      id: "isla",
      titulo: "La isla",
      resumen: "Quickshell. Se pliega y se abre sola.",
      chips: ["quickshell", "qml", "plugin", "barra"],
      filas: [
        "La barra es un plugin. Tambien lo son el reloj, el lanzador, el " +
        "centro de control y la captura: no hay nada privileged dentro.",
        "Se pliega a 34 px pegada al borde y se abre cuando tiene algo que " +
        "ensenar. El raton llegando al filo tambien la saca.",
        "Encuentra HYPRLAND_INSTANCE_SIGNATURE por su cuenta, para que hyprctl " +
        "le funcione a todo lo que lanza.",
        "El color del punto es la temperatura real de la CPU."
      ],
      banderas: []
    },
    {
      id: "dock",
      titulo: "El dock",
      resumen: "En Rust, compilado desde el fuente.",
      chips: ["rust-dock", "rust", "instalador lo compila"],
      filas: [
        "Un dock escrito en Rust, compilado durante la instalacion. Con " +
        "--skip-rust-dock se salta.",
        "Es el proceso que mas memoria se ahorra frente a lo habitual en un " +
        "escritorio de Hyprland."
      ],
      banderas: []
    },
    {
      id: "greeter",
      titulo: "La pantalla de acceso",
      resumen: "SDDM con tema propio, y solo en la pantalla de dentro.",
      chips: ["sddm", "tema propio", "cursor"],
      filas: [
        "Tema propio para SDDM, con el cursor del sistema y el fondo que " +
        "tengas.",
        "El tema se despliega con rhythm-sddm-deploy, que es la unica fuente " +
        "de verdad de esos ficheros del sistema. pywal los modifica en vivo, " +
        "y por eso no se versionan.",
        "Solo aparece en el panel interno: en la pantalla de fuera no se ofrece " +
        "iniciar sesion."
      ],
      banderas: []
    },
    {
      id: "temas",
      titulo: "El tema",
      resumen: "pywal se retine solo al cambiar el fondo.",
      chips: ["pywal", "se regenera", "los tres planos"],
      filas: [
        "Cambias el fondo de pantalla y pywal vuelve a escribir la paleta " +
        "entera. Barra, dock, rofi, terminal y la isla se recolorean solos.",
        "El fondo se repara solo: si un monitor se queda sin pintar, se vuelve " +
        "a pintar en unos segundos.",
        "La transicion al cambiar de fondo solo se hace en la pantalla de " +
        "dentro."
      ],
      banderas: []
    }
  ],

  // Con que esta hecho. Solo nombres; el detalle esta en el repo.
  base: ["Hyprland", "Quickshell", "Rust", "Waybar", "Hyprlock", "Rofi",
         "Pywal", "SDDM", "bash", "QML"],

  // El resto del ecosistema, para el pie. Solo enlaces.
  alrededor: [
    { nombre: "rust-dock", repo: "rhythmcreative/rust-dock" },
    { nombre: "k4", repo: "k4ditano/k4" }
  ]
};