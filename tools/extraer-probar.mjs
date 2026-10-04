#!/usr/bin/env node
// Prueba el extractor SIN lanzar Chromium ni tocar internet.
//
//   node tools/extraer-probar.mjs            todas las paginas, todos los idiomas
//   node tools/extraer-probar.mjs manual es  solo una
//
// Es para poder cambiar el extractor y ver en cuanto se rompe, sin pagar el coste de
// arrancar el navegador ni risking el indice.

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 9334;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const soloPag = process.argv[2];
const soloIdioma = process.argv[3];
const PAGINAS = soloPag ? [soloPag] : ["index.html", "manual.html"];
const IDIOMAS = soloIdioma ? [soloIdioma] : ["en", "es", "ca"];

async function navegador() {
  const perfil = await mkdtemp(join(tmpdir(), "extraer-"));
  const hijo = spawn(process.env.CROMIUM || "/usr/bin/chromium", [
    "--headless", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--hide-scrollbars", "--disable-dev-shm-usage", "--window-size=1440,1200",
    "--user-data-dir=" + perfil, "--remote-debugging-port=" + PUERTO, "about:blank"
  ], { stdio: ["ignore", "ignore", "ignore"] });

  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: "PUT" });
      if (r.ok) {
        const t = await r.json();
        if (t.webSocketDebuggerUrl) return { hijo, url: t.webSocketDebuggerUrl };
      }
    } catch { /* aun no escucha */ }
    await dormir(250);
  }
  hijo.kill("SIGKILL");
  throw new Error("el Chromium noFlojó");
}

function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pend = new Map();
  const listo = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", () => rej(new Error("no se pudo conectar")));
  });
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (!m.id || !pend.has(m.id)) return;
    const f = pend.get(m.id);
    pend.delete(m.id);
    if (m.error) f(new Error(m.error.message));
    else f(m.result);
  });
  const ev = (method, params) => {
    id++;
    const mio = id;
    ws.send(JSON.stringify({ id: mio, method, params }));
    return new Promise((res) => pend.set(mio, res));
  };
  const valor = async (expression, opts) => {
    const r = await ev("Runtime.evaluate", Object.assign({ expression, returnByValue: true }, opts || {}));
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error("la página falló: " + ((d.exception && d.exception.description) || d.text || "").slice(0, 300));
    }
    return r.result ? r.result.value : undefined;
  };
  return { ws, listo, ev, valor };
}

const nav = await navegador();
const ctl = conectar(nav.url);
await ctl.listo;
await ctl.ev("Page.enable");
await ctl.ev("Runtime.enable");
await ctl.ev("Network.enable");
await ctl.ev("Network.setCacheDisabled", { cacheDisabled: true });
await ctl.ev("Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

const EXTRAER = await readFile(join(RAIZ, "tools", "extraer.js"), "utf8");
const servidor = process.env.SERVIDOR_LOCAL || "http://127.0.0.1:8788";

for (const idioma of IDIOMAS) {
  for (const pag of PAGINAS) {
    await ctl.ev("Page.navigate", { url: `${servidor}/${pag}?lang=${idioma}&prueba=1` });
    for (let i = 0; i < 90; i++) {
      if (await ctl.valor(`!!document.getElementById("idioma-sel")&&!!document.getElementById("fuera")`)) break;
      await dormir(300);
    }
    await ctl.valor(
      `(async function(){var a=document.body.scrollHeight;` +
      `for(var y=0;y<a;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60);});}` +
      `window.scrollTo(0,0);})()`, { awaitPromise: true });
    await dormir(1200);

    // Antes de sacar nada se comprueba que la pagina esta de verdad ahi. Un extractor
    // que devuelve cero porque la pagina no cargo se parece muchisimo a uno que
    // devuelve cero porque el filtro tira todo, y son dos fallos distintos.
    const donde = await ctl.valor(`location.href+" | h2="+document.querySelectorAll("h2").length+
      " | sel="+(!!document.getElementById("idioma-sel"))`);
    const bruto = await ctl.valor(EXTRAER);
    if (bruto) console.log(`     donde: ${donde}`);
    const filas = bruto ? JSON.parse(bruto.split("|DBG|")[0]) : [];
    console.log(`\n  ══ ${idioma}/${pag}: ${filas.length} registros ══`);
    for (const f of filas) {
      const marca = f.texto.length < 40 && !f.codigo.length ? "  ¡pobre!" : "";
      console.log(`     ${(f.ancla || "—").padEnd(26)} ${String(f.texto.length).padStart(5)} car  ` +
        `cod ${String(f.codigo.length).padStart(2)}  ${f.titulo.slice(0, 44)}${marca}`);
    }
    const sinAncla = filas.filter((f) => !f.ancla);
    const pauvre = filas.filter((f) => f.texto.length < 40 && !f.codigo.length);
    const pre = filas.filter((f) => /curl|systemctl -|bash -c/.test(f.texto));
    console.log(`     sin ancla: ${sinAncla.length}   con poquísimo texto: ${pauvre.length}   con bash en el texto: ${pre.length}`);
    if (pre.length) pre.slice(0, 2).forEach((f) => console.log("       · " + f.titulo + " -> " + f.texto.slice(0, 90)));
  }
}

ctl.ws.close();
nav.hijo.kill("SIGKILL");
console.log("");