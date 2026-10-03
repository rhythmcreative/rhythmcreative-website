<h1 align="center">Rhythmcrea</h1>

<div align="center">

<p><i>The projects, in one page. Plain HTML, CSS and JavaScript — no build step, no framework, no dependencies.</i></p>

[![Static](https://img.shields.io/badge/Stack-Static%20HTML%20%2B%20CSS%20%2B%20JS-167C80?style=for-the-badge)](#)
[![Zero&nbsp;Dependencies](https://img.shields.io/badge/Dependencies-None-2EA44F?style=for-the-badge)](#)
[![No&nbsp;Build](https://img.shields.io/badge/Build-Step_None-2EA44F?style=for-the-badge)](#)
[![Arch&nbsp;Linux](https://img.shields.io/badge/Target-Arch%20Linux-1793D1?style=for-the-badge&logo=archlinux&logoColor=white)](https://archlinux.org/)
[![Hyprland](https://img.shields.io/badge/Desktop-Hyprland-7C3AED?style=for-the-badge)](https://github.com/rhythmcreative/hyprland)
[![Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-167C80?style=for-the-badge&logo=github&logoColor=white)](#)

</div>

## About

This repository is the source of **[rhythmcreative.github.io/rhythmcreative-website](https://github.com/rhythmcreative/rhythmcreative-website)** — a single-page home for the projects, built to be read rather than served by a framework.

Everything ships as static files. There is no bundler, no transpiler, no `node_modules`, and no build step of any kind: the repository **is** the deployable artifact. Open `index.html` from the filesystem and it works; serve it from GitHub Pages and it works identically.

The site is deliberately restrained. One typeface, a near-monochrome palette, hairline rules, and motion that only happens when you ask for it — the hero is a real photograph cut into parallax layers, the live readout is the machine's own CPU temperature, and the cursor carries a soft light that lights the scene as it moves.

## Features

| | |
| :--- | :--- |
| **Zero dependencies** | No runtime, no build, no lockfile. Three languages and a folder of images. |
| **Two full themes** | Light and dark, each with its own generated image set, swapped by a single class on `<html>`. |
| **Parallax hero** | Five layers cut from one photograph, measured and positioned in exact pixels by JavaScript. |
| **Custom video player** | Play/pause, scrub, time and volume — built from scratch, no `<video controls>`. |
| **Live system data** | Real CPU temperature drives the halo colour and the status dot. Absent data shows a dash, never a made-up number. |
| **Fluid typography** | A single `clamp()` root size scales every `rem` on the page from a 360 px phone to a 4K display. |
| **Accessible** | Skip link, visible focus rings, `aria` on every control, and 44 px touch targets on coarse pointers. |
| **Respects preferences** | `prefers-reduced-motion` and `prefers-color-scheme` are both honoured. |

## Quick Start

There is nothing to install. Serve the folder with anything:

```bash
# 1. The bundled dev server — adds HTTP range requests, which <video> needs
./serve.sh

# 2. Or anything else you already have
python3 -m http.server 8080
php -S localhost:8080

# 3. Or no server at all
xdg-open index.html
```

Then refresh the generated data whenever you want it current:

```bash
# Live machine stats (temperature, sensors, displays) — gitignored, never committed
./scripts/collect-system-stats.sh

# GitHub stars, releases and recent commits across every public repo
./scripts/collect-github.py

# Regenerate the hero layers from a new photograph
./scripts/preparar-angel.py
```

## How It Works

### 1. Rendering (`assets/app.js`)

A small set of renderers — one per block type — read plain data objects and emit HTML strings. There is no template language and no virtual DOM; each section is a function that returns a string, and the page is assembled by joining them.

```
app.js ──▶ pintarHyprland()  ──▶ cabecera · clip · botones · instalar
       ──▶ video()           ──▶ reproductor a medida
       ──▶ menu()            ──▶ el pie
```

### 2. The hero (`assets/capa.js` + `scripts/preparar-angel.py`)

The photograph is cut into five layers — background, figure, halo, veil and foreground — each one already masked in Python. At runtime `capa.js` measures the viewport, fits the figure without ever cropping the wings, and writes one `translate3d` per layer per frame.

The halo is the interesting part: the photograph *already contains* a halo, so the script measures where it is and draws a second, elliptical one exactly on top. It registers in the same coordinate space, so the two cannot drift apart when the pointer moves.

### 3. The clock (`assets/hyprland.js`)

Plain data, separated from rendering so the copy can be edited without touching code:

```js
H.instalar = {
  titulo: "Install",
  texto:  "One line. It asks before it changes anything, and it stops if this isn't Arch.",
  comando: 'bash -c "$(curl -fsSL … install.sh)"'
};
```

### 4. Colour (`scripts/preparar-hero.py`)

Swap the hero for your own wallpaper and the palette follows it. Eight samples are graded straight into the page, so a colour change never requires touching the CSS.

Set `hero.conf` to `angel` for the bundled layers, or `auto` to generate them from whatever wallpaper is currently set.

## Project Structure

```
.
├── index.html              # The whole page. 11 KB, no build.
├── serve.py                # Dev server with HTTP range support (<video> needs it)
├── serve.sh                # Wrapper for the above
├── hero.conf               # Which hero to use: angel | auto
├── version.txt
├── assets/
│   ├── app.js              # Renderers, custom player, copy-to-clipboard
│   ├── capa.js             # Hero parallax, halo, ash particles
│   ├── hyprland.js         # All site copy as data
│   ├── style.css           # One stylesheet, custom properties for both themes
│   ├── *.webp              # Generated layers, one set per theme
│   └── fuentes/            # JetBrains Mono variable (subset)
├── data/
│   ├── github.js           # Generated: stars, releases, recent commits
│   └── system.js           # Generated: live machine stats (gitignored)
├── scripts/
│   ├── preparar-angel.py   # Cuts the photograph into parallax layers
│   ├── preparar-hero.py    # Same, from your own wallpaper + pywal palette
│   ├── preparar-og.py      # Social preview image
│   ├── collect-github.py   # GitHub metadata collector
│   └── collect-system-stats.sh
└── DESARROLLO.md           # Development log: every decision and why
```

## Deployment

The repository is the artifact — push to `main` and it is live.

```bash
# GitHub Pages: Settings → Pages → Deploy from a branch → main / (root)
git push origin main
```

Two things worth knowing before going live:

- **`data/system.js` is gitignored on purpose.** It holds this machine's hostname, kernel build and sensor names. The site degrades gracefully without it — the status dot simply shows a dash.
- **GitHub Pages on a private repository requires a paid plan.** If the repository stays private, the site will not be served publicly.

## Disclaimer

The Hyprland configuration, the Rust dock and the installer referenced here are personal projects, unaffiliated with and not endorsed by Arch Linux, Hyprland, or the Rust Foundation.

<div align="center">

<p>Made with ❤️ from rhythmcreative.</p>

</div>
