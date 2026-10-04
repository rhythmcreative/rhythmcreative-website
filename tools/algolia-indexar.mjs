#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Indexador de Algolia. Se ejecuta en TU maquina, nunca en el navegador.
//
//   ALGOLIA_APP_ID=XXXX  ALGOLIA_ADMIN_KEY=yyy  node tools/algolia-indexar.mjs
//
// Qué hace: abre las dos páginas en un Chromium sin ventana, las recorre tal como
// las ve un visitante, saca un registro por cada apartado y lo sube al índice.
//
// Para probarlo sin tocar internet:
//
//   node tools/algolia-indexar.mjs --seco
//
// ─────────────────────────────────────────────────────────────────────────────
// LO IMPORTANTE: LA CLAVE DE ESCRITURA
//
// La clave que sube esto NO va nunca en el navegador ni en el repositorio. Vive
// solo en la variable de entorno de este comando. Si algún día se te sale en un
// log, en una captura o en un commit, esa cuenta tiene dueño.
//
// Para el navegador hace falta OTRA clave: la de solo busqueda. Esa si va en el
// código, a la vista, y es lo correcto — es una clave pensada para ir en pagina
// publica, con los indices restringidos y sin permiso de escribir. Se crea en el
// panel de Algolia, en Settings -> API keys -> Add API Key:
//     ACL: Search-Only
//     Indices: el tuyo, y solo el tuyo
// Si el panel te deja elegir "Add API Key" sin marcar Search-Only, no la crees ahi.
//
// Este script se niega a arrancar si la clave de escritura no viene de la variable
// de entorno. Si alguien la escribe en un fichero, no la lee.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 9333;
const CROMIUM = process.env.CROMIUM || "/usr/bin/chromium";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// La lista de idiomas tiene que ser la MISMA que la de i18n.js. Si no, el buscador
// ofrece artículos en una lengua que la página no tiene.
const IDIOMAS = ["en", "es", "pt", "fr", "it", "ca"];
const PAGINAS = ["index.html", "manual.html"];

// ── Configuración ────────────────────────────────────────────────────────────

function entorno() {
  const app = process.env.ALGOLIA_APP_ID;
  const key = process.env.ALGOLIA_ADMIN_KEY;
  const idx = process.env.ALGOLIA_INDEX || "rhythmcrea";
  if (!app) {
    throw new Error(
      "Falta ALGOLIA_APP_ID.\n" +
      "  Se saca del panel de Algolia, arriba a la derecha, en \"Application ID\".\n" +
      "  Ejemplo:  ABCDEF1234\n" +
      "  No es un secreto: esto va en el HTML. Lo secreto es la clave de escritura."
    );
  }
  if (!key) {
    throw new Error(
      "Falta ALGOLIA_ADMIN_KEY.\n" +
      "  Esta NO va en ningún fichero. Solo en la variable de entorno de este comando.\n" +
      "  Se crea en el panel de Algolia -> Settings -> API keys.\n" +
      "\n" +
      "    ALGOLIA_ADMIN_KEY=pega-aqui-la-clave node tools/algolia-indexar.mjs\n"
    );
  }
  return { app, key, idx };
}

// ── Navegador ────────────────────────────────────────────────────────────────
//
// Se lanza uno propio en vez de reutilizar el que hay abierto en el puerto 9223.
// Así este script se puede lanzar cuando quieras, sin depender de que haya un
// navegador de pruebas encendido, y sin pisarle el suyo a nadie.

async function abrirNavegador() {
  const perfil = await mkdtemp(join(tmpdir(), "algolia-"));
  const hijo = spawn(CROMIUM, [
    "--headless", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--hide-scrollbars", "--disable-dev-shm-usage", "--window-size=1440,1200",
    "--user-data-dir=" + perfil,
    "--remote-debugging-port=" + PUERTO,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let err = "";
  hijo.stderr.on("data", (d) => { err += d.toString(); });

  // /json/version devuelve el socket del NAVEGADOR, y ese no sirve: no tiene los
  // dominios Page ni Runtime, así que contesta "'Page.enable' wasn't found" a
  // cada orden y no dice nada más. Hay que abrir una PESTAÑA y usar el suyo.
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: "PUT" });
      if (r.ok) {
        const pestana = await r.json();
        if (pestana.webSocketDebuggerUrl) return { hijo, url: pestana.webSocketDebuggerUrl };
      }
    } catch { /* todavía no está escuchando */ }
    await dormir(250);
  }
  hijo.kill("SIGKILL");
  throw new Error("El Chromium no abrió el puerto " + PUERTO + ".\n" + err.slice(0, 600));
}

// CDP contesta con `error` en vez de `result` cuando una orden no vale. Si eso se
// ignora, el que lee el `result` se encuentra un `undefined` tres líneas más tarde y
// no tiene ni idea de por qué. Aquí el error sale con su texto.
function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pend = new Map();
  const nombre = new Map();

  const listo = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", () => rej(new Error("no se pudo hablar con el navegador")));
  });

  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (!m.id || !pend.has(m.id)) return;
    const resuelve = pend.get(m.id);
    pend.delete(m.id);
    if (m.error) resuelve(new Error(`${nombre.get(m.id)}: ${m.error.message || JSON.stringify(m.error)}`));
    else resuelve(m.result);
  });

  const ev = (method, params) => {
    id++;
    const mio = id;
    nombre.set(mio, method);
    ws.send(JSON.stringify({ id: mio, method, params }));
    return new Promise((res) => pend.set(mio, res));
  };

  // Evaluar y quedarse con el valor, o fallar con el mensaje de verdad.
  const valor = async (expression, opts) => {
    const r = await ev("Runtime.evaluate", Object.assign(
      { expression, returnByValue: true }, opts || {}));
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error("la página falló al ejecutar el extractor: " +
        ((d.exception && d.exception.description) || d.text || JSON.stringify(d)).slice(0, 400));
    }
    return r.result ? r.result.value : undefined;
  };

  return { ws, listo, ev, valor };
}

// ── Lectura ──────────────────────────────────────────────────────────────────

async function leer(control) {
  const { valor } = control;
  await control.listo;
  await control.ev("Page.enable");
  await control.ev("Runtime.enable");
  await control.ev("Network.enable");
  await control.ev("Network.setCacheDisabled", { cacheDisabled: true });
  await control.ev("Emulation.setDeviceMetricsOverride",
    { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

  const servidor = process.env.SERVIDOR_LOCAL || "http://127.0.0.1:8788";
  // Se lee del fichero, no de una cadena aqui dentro. El extractor es codigo que
  // corre en la pagina y merece poder probarse solo: `node tools/extraer-probar.mjs`.
  const EXTRAER = await readFile(join(RAIZ, "tools", "extraer.js"), "utf8");
  const todos = [];

  for (const idioma of IDIOMAS) {
    for (const pag of PAGINAS) {
      await control.ev("Page.navigate", { url: `${servidor}/${pag}?lang=${idioma}&idx=1` });

      // Se espera al desplegable, no solo al <html>: el selector se monta DESPUÉS de
      // que cargue el diccionario, así que su presencia es la señal de que la
      // traducción ya está aplicada. Esperar solo al <html> guardaría los registros
      // en inglés con el idioma puesto a "es".
      for (let i = 0; i < 90; i++) {
        const listo = await valor(
          `!!document.getElementById("idioma-sel")&&!!document.getElementById("fuera")`);
        if (listo) break;
        await dormir(300);
      }

      // Scroll entero, para que existan en el DOM los apartados que se pintan abajo.
      await valor(
        `(async function(){var a=document.body.scrollHeight;` +
        `for(var y=0;y<a;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60);});}` +
        `window.scrollTo(0,0);})()`,
        { awaitPromise: true });
      await dormir(1200);

      const bruto = await valor(EXTRAER);
      if (!bruto) {
        console.log(`  · ${idioma}/${pag}: sin registros`);
        continue;
      }
      const filas = JSON.parse(bruto);
      for (const f of filas) {
        f.objectID = `${idioma}|${f.pagina}|${f.nivel}|${f.ancla}|${f.titulo}`.slice(0, 380);
        f.lang = idioma;
        // El título va dos veces en el campo buscable. Una vez es lo mínimo y la
        // segunda hace que escribir "pywal" encuentre tanto el apartado que lo
        // explica como el que lo nombra en el título, que es el que alguien busca.
        f.buscable = `${f.titulo} ${f.titulo} ${f.texto}`.slice(0, 1600);
      }
      todos.push(...filas);
      console.log(`  · ${idioma}/${pag}: ${filas.length} apartados`);
    }
  }
  return todos;
}

// ── Subida ───────────────────────────────────────────────────────────────────

async function subir(cfg, filas) {
  // El host de escritura y el de lectura son distintos a propósito: uno puede
  // escribir y el otro no. No se mezclan.
  const base = `https://${cfg.app}.algolia.net`;
  const cabeceras = {
    "content-type": "application/json",
    "x-algolia-application-id": cfg.app,
    "x-algolia-api-key": cfg.key,
    // Se declara qué cliente es. Algolia lo pide y le sirve para saber quién usa su
    // servicio. Aquí no se manda IP ni usuario: es un script tuyo, no una web.
    "x-algolia-agent": "rhythmcrea-indexador (1.0)"
  };
  const donde = `/1/indexes/${encodeURIComponent(cfg.idx)}`;

  console.log("\n  ── ajustes del índice ──");
  const ajustes = {
    // El orden importa: lo primero es lo que más pesa. Por eso "buscable" va el
    // primero, que es el título repetido más el texto.
    searchableAttributes: ["buscable", "titulo", "codigo"],
    attributesForFaceting: ["filterOnly(lang)", "lang", "pagina", "nivel"],
    // Esto es lo que hace que escribir "pywal" encuentre "pywal" sin tener que
    // escribirlo exacto. Sin esto el buscador es inútil para quien escribe de
    // memoria, que es justo el caso de quien visita un manual.
    typoTolerance: true,
    minWordSizefor1Typo: 4,
    minWordSizefor2Typos: 8,
    ignorePlurals: true,
    removeStopWords: ["the", "a", "an", "and", "or", "of", "to", "in", "is", "it",
      "el", "la", "los", "las", "un", "una", "de", "del", "y", "que", "se", "the"],
    // No se pide HTML a Algolia. El buscador escapa y resalta en casa, asi que el
    // servidor no tiene por que mandar <b> ni nada que meter en la pagina. Pedirlo
    // seria devolver unmarked con dosSpellchecking en la respuesta y confiar en que
    // este bien, que es justo lo que no hay que hacer.
    attributesToHighlight: [],
    attributesToSnippet: [],
    distinct: false
  };
  let r = await fetch(base + donde + "/settings",
    { method: "PUT", headers: cabeceras, body: JSON.stringify(ajustes) });
  if (!r.ok) throw new Error(`ajustes: ${r.status} ${(await r.text()).slice(0, 300)}`);
  console.log("  ok  erratas, facetas y qué se busca");

  // Se vacía antes. Si no, los apartados que han desaparecido de la página siguen en
  // el índice y aparecen en la búsqueda como enlaces a un sitio que ya no existe.
  r = await fetch(base + donde + "/batch", {
    method: "POST", headers: cabeceras,
    body: JSON.stringify({ requests: [{ action: "clear" }] })
  });
  if (!r.ok) throw new Error(`vaciar: ${r.status} ${(await r.text()).slice(0, 300)}`);
  console.log("  ok  índice vaciado de lo que hubiera");

  const LOTE = 500;
  let subidos = 0;
  for (let i = 0; i < filas.length; i += LOTE) {
    const trozo = filas.slice(i, i + LOTE);
    r = await fetch(base + donde + "/batch", {
      method: "POST", headers: cabeceras,
      body: JSON.stringify({
        requests: trozo.map((x) => ({ action: "updateObject", body: x }))
      })
    });
    if (!r.ok) throw new Error(`subir desde ${i}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    subidos += trozo.length;
    process.stdout.write(`  ok  ${subidos}/${filas.length}\r`);
  }
  console.log(`  ok  ${subidos} registros subidos a "${cfg.idx}"`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("\n  ══ indexador de Algolia ══\n");
  const seco = process.argv.includes("--seco");
  const cfg = seco
    ? { app: "", key: "", idx: process.env.ALGOLIA_INDEX || "rhythmcrea" }
    : entorno();

  const navegador = await abrirNavegador();
  const control = conectar(navegador.url);
  console.log("  Chromium: " + CROMIUM + "  (puerto " + PUERTO + ")\n");

  console.log("  ── leyendo las páginas ──");
  let filas;
  try {
    filas = await leer(control);
  } finally {
    try { control.ws.close(); } catch { /* ya estaba cerrado */ }
    navegador.hijo.kill("SIGKILL");
  }

  const out = join(RAIZ, "tools", "registros.json");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(filas, null, 1), "utf8");

  const porIdioma = {};
  for (const f of filas) porIdioma[f.lang] = (porIdioma[f.lang] || 0) + 1;

  console.log(`\n  ${filas.length} registros -> tools/registros.json`);
  console.log("  por idioma: " + (Object.entries(porIdioma).map(([k, v]) => `${k} ${v}`).join("  ") || "—"));
  console.log("  Ese fichero NO lleva ninguna clave, solo lo que se indexa. Se puede commitear.");
  console.log("  Sirve para mirar qué se va a indexar antes de subirlo.");

  if (seco) {
    console.log("\n  --seco: no se ha subido nada.\n");
    return;
  }
  await subir(cfg, filas);
  console.log("\n  Hecho. Comprueba en el navegador que el buscador responde.\n");
})().catch((e) => {
  console.error("\n  ERROR: " + e.message + "\n");
  process.exit(1);
});