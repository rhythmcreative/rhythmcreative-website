// ─────────────────────────────────────────────────────────────────────────────
// PROYECTOS
//
// Este es el unico fichero que tienes que tocar para anadir un proyecto.
//
//   name        nombre que sale en la tarjeta
//   repo        owner/repo en GitHub. Es lo que hace que las estrellas, el
//               ultimo commit y el lenguaje sean EN VIVO: se consultan al
//               cargar la pagina. Si el repo es privado o no existe, la tarjeta
//               se queda con los valores de abajo.
//   stars       valor de respaldo, usado si la API falla o no se puede consultar
//   category    desktop | android | home | tools   (define el grupo del filtro)
//   tagline     la frase corta, en una linea
//   blurb       dos lineas de explicacion
//   tags        etiquetas sueltas
//   url         donde se abre la tarjeta. Por defecto, el repo.
//   featured    true lo saca arriba y le da mas tamano
//
// La API de GitHub sin token da 60 peticiones por hora. Con este numero de
// repos no hay problema, pero si algun dia anades muchos, anade un token.
// ─────────────────────────────────────────────────────────────────────────────

window.RHYTHM_PROJECTS = [
  {
    name: "hyprland",
    repo: "rhythmcreative/hyprland",
    stars: 25,
    category: "desktop",
    featured: true,
    tagline: "Un escritorio Hyprland que se instala bien a la primera.",
    blurb:
      "Instalador, actualizador sin tocar tu distro, y un doctor que dice que esta roto. Los cambios tuyos viven en una capa aparte y sobreviven a cada update.",
    tags: ["hyprland", "wayland", "quickshell", "installer", "ota"]
  },
  {
    name: "rust-dock",
    repo: "rhythmcreative/rust-dock",
    stars: 13,
    category: "desktop",
    featured: true,
    tagline: "Un dock para Hyprland, en Rust.",
    blurb:
      "Dock con caché de miniaturas, esquinas redondeadas y atajos por monitor. Sin dependencias de JS y con los tiempos de render medidos: 8198 ms a 1648 ms.",
    tags: ["rust", "gtk4", "wayland", "dock"]
  },
  {
    name: "wallpapers",
    repo: "rhythmcreative/wallpapers",
    stars: 0,
    category: "desktop",
    tagline: "Los fondos que se ven en los pantallazos.",
    blurb:
      "El fondo que eliges tambien tiñe la barra, la isla y el login. De ahi que el tema del sitio se pueda leer de ahi.",
    tags: ["wallpapers", "swww", "themes"]
  },
  {
    name: "tiktok",
    repo: "rhythmcreative/tiktok",
    stars: 14,
    category: "tools",
    featured: true,
    tagline: "TikTok en una ventana, en Linux.",
    blurb:
      "Interfaz propia en vez de la web. Con su icono en el dock, sus atajos y su sitio en el menu.",
    tags: ["gui", "tiktok", "electron"]
  },

  // ── Android ────────────────────────────────────────────────────────────────
  {
    name: "lineageos-flame-ota",
    repo: "rhythmcreative/lineageos-flame-ota",
    stars: 1,
    category: "android",
    tagline: "OTA para el Pixel 4.",
    blurb: "Actualizaciones del sistema para el Flame, sin tocar a mano.",
    tags: ["android", "lineageos", "ota", "pixel"]
  },
  {
    name: "lineageos-akita-ota",
    repo: "rhythmcreative/lineageos-akita-ota",
    stars: 1,
    category: "android",
    tagline: "OTA para el Pixel 8a.",
    blurb: "Actualizaciones del sistema para el Akita, sin tocar a mano.",
    tags: ["android", "lineageos", "ota", "pixel"]
  },
  {
    name: "lineageos-husky-ota",
    repo: "rhythmcreative/lineageos-husky-ota",
    stars: 0,
    category: "android",
    tagline: "OTA para el Pixel 8 Pro.",
    blurb: "El mismo trabajo para el Husky: Pixel 8 Pro con nombre en clave distinto.",
    tags: ["android", "lineageos", "ota", "pixel"]
  },
  {
    name: "lineage-launcher",
    repo: "rhythmcreative/lineage-launcher",
    stars: 0,
    category: "android",
    tagline: "Un launcher con dock deslizable.",
    blurb: "Kotlin. El dock se mueve con el dedo y la lista se desplaza con el.",
    tags: ["android", "kotlin", "launcher"]
  },
  {
    name: "motion-assist",
    repo: "rhythmcreative/motion-assist",
    stars: 0,
    category: "android",
    tagline: "Avisos de movimiento del vehiculo para Android.",
    blurb:
      "Java. Lee los sensores del coche y avisa de lo que viene: curvas, frenos y cambios de carril.",
    tags: ["android", "java", "automotive"]
  },
  {
    name: "AppStore",
    repo: "rhythmcreative/AppStore",
    stars: 0,
    category: "android",
    tagline: "Una tienda de apps propia.",
    blurb: "Kotlin. Para instalar lo tuyo sin pasar por la tienda de siempre.",
    tags: ["android", "kotlin"]
  },
  {
    name: "lineage-scripts",
    repo: "rhythmcreative/lineage-scripts",
    stars: 0,
    category: "android",
    tagline: "Los scripts de compilación de LineageOS.",
    blurb: "El guion de siempre, guardado para no reescribirlo cada vez.",
    tags: ["android", "lineageos", "build"]
  },
  {
    name: "lineage-build-scripts",
    repo: "rhythmcreative/lineage-build-scripts",
    stars: 1,
    category: "android",
    tagline: "Los scripts, con mas de un dispositivo.",
    blurb: "La parte de compilacion separada de la de OTA, para varios moviles.",
    tags: ["android", "lineageos", "build"]
  },
  {
    name: "android",
    repo: "rhythmcreative/android",
    stars: 0,
    category: "android",
    tagline: "El manifiesto de fuentes de LineageOS.",
    blurb: "La lista de repos desde la que se compila todo lo demas.",
    tags: ["android", "lineageos", "manifest"]
  },
  {
    name: "Info",
    repo: "rhythmcreative/Info",
    stars: 0,
    category: "android",
    tagline: "La ficha tecnica de cada movil.",
    blurb: "Kotlin. Que lleva cada modelo y que se le puede poner.",
    tags: ["android", "kotlin"]
  },

  // ── Casa ───────────────────────────────────────────────────────────────────
  {
    name: "Kiosk-chromium",
    repo: "rhythmcreative/Kiosk-chromium",
    stars: 1,
    category: "home",
    featured: true,
    tagline: "Home Assistant en modo kiosco sobre Chromium.",
    blurb:
      "Un panel de Home Assistant a pantalla completa, y se reinicia solo si se queda colgado.",
    tags: ["home-assistant", "python", "chromium", "kiosk"]
  },
  {
    name: "Kiosk-waydroid",
    repo: "rhythmcreative/Kiosk-waydroid",
    stars: 0,
    category: "home",
    tagline: "Waydroid dentro del kiosco.",
    blurb: "Python. Las apps de Android en la tablet de la pared, sin cable.",
    tags: ["home-assistant", "python", "waydroid", "kiosk"]
  },
  {
    name: "voice-satellite-card-llm-tools",
    repo: "rhythmcreative/voice-satellite-card-llm-tools",
    stars: 0,
    category: "home",
    tagline: "La tarjeta de voz, extendida con LLM.",
    blurb: "Python. Amplia el satelite de voz de Home Assistant con un modelo de lenguaje.",
    tags: ["home-assistant", "python", "llm", "voice"]
  },
  {
    name: "wakey",
    repo: "rhythmcreative/wakey",
    stars: 0,
    category: "home",
    tagline: "Un despertador para Home Assistant.",
    blurb: "Python. Repite entre semana, y se calla cuando pulsas.",
    tags: ["home-assistant", "python", "alarm"]
  },

  // ── Otros ──────────────────────────────────────────────────────────────────
  {
    name: "apps-repository",
    repo: "rhythmcreative/apps-repository",
    stars: 0,
    category: "tools",
    tagline: "Los metadatos y las releases de RhythmCreative.",
    blurb: "Python. La lista de lo publicado y como se descarga cada cosa.",
    tags: ["python", "releases"]
  }
];

window.RHYTHM_CATEGORIES = [
  { id: "all", label: "Todo" },
  { id: "desktop", label: "Escritorio" },
  { id: "android", label: "Android" },
  { id: "home", label: "Casa" },
  { id: "tools", label: "Herramientas" }
];
