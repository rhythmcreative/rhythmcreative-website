<h1 align="center">Rhythmcrea</h1>

<div align="center">

<p><i>One page for the projects. Plain HTML, CSS and JavaScript.</i></p>

[![Static](https://img.shields.io/badge/Stack-Static-167C80?style=for-the-badge)](#)
[![No&nbsp;dependencies](https://img.shields.io/badge/Dependencies-None-2EA44F?style=for-the-badge)](#)
[![No&nbsp;build](https://img.shields.io/badge/Build_None-2EA44F?style=for-the-badge)](#)
[![Arch&nbsp;Linux](https://img.shields.io/badge/Target-Arch%20Linux-1793D1?style=for-the-badge&logo=archlinux&logoColor=white)](https://archlinux.org/)

</div>

## What it is

Static files. No framework, no bundler, no `node_modules`, no build step — **the
repository is the deployable artifact**.

Open `index.html` and it works. So does serving it from a host.

## Run it

```bash
./serve.sh 8788
```

Or skip the server entirely and just open `index.html`.

The bundled server exists only because `<video>` needs HTTP range requests;
without them the browser shows the poster and never starts.

## Update the data

The site reads plain `.js` files instead of fetching JSON, so that it works from
`file://`. Two scripts fill them in:

```bash
./scripts/collect-github.py    # stars, releases and commits
./scripts/preparar-angel.py    # cut a new photo into parallax layers
```

Both write a file that you commit.

## Deploy

Push to `main`, then set **Settings → Pages → Deploy from a branch → `main` /
root**.

## Layout

```
index.html          the page
assets/             style.css, app.js, and the images
data/               generated .js files, committed
scripts/            the generators
serve.py serve.sh   local server with range support
DESARROLLO.md       development log
```

## Disclaimer

Personal projects, unaffiliated with and not endorsed by Arch Linux, Hyprland or
the Rust Foundation.

<div align="center">

<p>Made with ❤️ from rhythmcreative.</p>

</div>