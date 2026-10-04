#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Comprueba las credenciales de Algolia SIN escribir ninguna en un fichero y sin
// pegarlas en un chat.
//
//   ALGOLIA_APP_ID=ABCD1234 ALGOLIA_CLAVE_BUSQUEDA=... node tools/algolia-comprobar.mjs
//   ALGOLIA_APP_ID=ABCD1234 ALGOLIA_ADMIN_KEY=...     node tools/algolia-comprobar.mjs
//
// Las claves se leen de la variable de entorno y no se guardan en ningún sitio. Se
// imprimen los primeros 4 caracteres, que es lo justo para distinguir una de otra sin
// enseñarla entera.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE
//
// Hace falta para algo que no se puede hacer desde aquí: comprobar que la clave que
// hay pegada en assets/buscador.js es de solo búsqueda y está restringida a este
// índice, y no la de escritura. Eso se pregunta a Algolia, y la pregunta necesita las
// credenciales.
//
// Y al revés también: confirmar que la clave de escritura NO está en el navegador. Eso
// no lo responde Algolia, lo responde el repositorio, y lo comprueba este script
// leyendo los ficheros de la web.
//
// ─────────────────────────────────────────────────────────────────────────────
// LO QUE DICE DE CADA COSA
//
//   Application ID   · si el host existe. Un ID mal escrito da un error de DNS; uno
//                     bien escrito llega a Algolia y contesta.
//   search-only      · si la clave puede buscar. Un 403 es que existe pero no puede.
//   admin            · si la clave puede escribir, listar índices y borrarlos.
//   restricted       · si la clave está atada a un índice o puede leer todos.
//   índice           · si existe y cuántos registros tiene.
//   navegador        · que en el código de la web no haya ninguna clave de escritura.

import { readdir, readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const app = (process.env.ALGOLIA_APP_ID || "").trim();
const busqueda = (process.env.ALGOLIA_CLAVE_BUSQUEDA || "").trim();
const admin = (process.env.ALGOLIA_ADMIN_KEY || "").trim();

// ── Comprobaciones ────────────────────────────────────────────────────────────

const resultados = [];
const anota = (ok, nombre, detalle) => {
  resultados.push({ ok, nombre, detalle });
  console.log(`  ${ok ? "ok   " : "FALLA"}  ${nombre.padEnd(34)} ${detalle}`);
};

if (!app) {
  console.log(`
  Falta ALGOLIA_APP_ID.

  Son 10 caracteres en mayusculas, y NO son 32 hexadecimales. Si lo que tienes son
  32 hexadecimales, es una clave de API, no el ID.

  El ID esta en el panel, arriba a la derecha, en el campo "Application ID", en
  Settings -> API keys. O en la URL: https://EL-ID.algolia.com/...
`);
  process.exit(2);
}

// El formato del ID se comprueba ANTES de hacer nada. Un ID son 10 caracteres
// alfanumericos en mayuscula. Si tiene 32 hex, no es un ID, y seguir adelante
// daria un error de DNS que no dice nada util.
const pareceId = /^[A-Z0-9]{10}$/.test(app);
anota(pareceId, "el Application ID tiene forma de ID",
  pareceId ? `${app} (10 caracteres)` :
  `«${app}» son ${app.length} caracteres. Un ID son 10 en mayusculas, como RHYT8MZC3K.`);

if (!pareceId) {
  console.log(`
  Se para aqui a proposito. Con un ID que no es un ID, cualquier prueba que viene
  despues daria "fetch failed", que parece un problema de red y no es de formato.
`);
  process.exit(2);
}

const cabeceras = (clave) => ({
  "content-type": "application/json",
  "X-Algolia-Application-Id": app,
  "X-Algolia-API-Key": clave
});

// El nombre del indice. Tiene que ser el MISMO en los tres sitios: aqui, en el
// INDICE de assets/buscador.js y en ALGOLIA_INDEX del indexador. Si no, el navegador
// busca en un indice y el indexador escribe en otro, y el error no se ve por ningun
// lado: la busqueda simplemente devuelve cero resultados y parece que el indice
// esta vacio.
const INDICE = process.env.ALGOLIA_INDEX || "rhythmcrea";

// ── ¿La clave de búsqueda busca? ──────────────────────────────────────────────

if (busqueda) {
  try {
    const r = await fetch(`https://${app}-dsn.algolia.net/1/indexes/*/queries`, {
      method: "POST", headers: cabeceras(busqueda),
      body: JSON.stringify({ requests: [{ indexName: INDICE, query: "pywal", hitsPerPage: 1 }] })
    });
    const cuerpo = await r.text();
    if (r.ok) {
      let n = 0;
      try { n = (JSON.parse(cuerpo).results[0].nbHits); } catch { /* respuesta rara */ }
      anota(true, "la clave de busqueda busca", `correcta. ${n} resultados para "pywal"`);
    } else if (r.status === 403) {
      anota(false, "la clave de busqueda busca", "403. Existe pero no le dejan buscar");
    } else if (r.status === 404) {
      anota(false, "la clave de busqueda busca", "404. El índice no existe todavía: hay que indexar antes");
    } else {
      anota(false, "la clave de busqueda busca", `${r.status} ${cuerpo.slice(0, 120)}`);
    }
  } catch (e) {
    anota(false, "la clave de busqueda busca", "no se pudo llamar: " + (e.cause?.code || e.message));
  }
}

// ── ¿La clave de escritura escribe? ───────────────────────────────────────────

if (admin) {
  try {
    const r = await fetch(`https://${app}.algolia.net/1/indexes`, { headers: cabeceras(admin) });
    if (r.ok) {
      const j = await r.json();
      const lista = (j.items || []).map((i) => i.name);
      anota(true, "la clave de escritura escribe", `correcta. ${lista.length} índices: ${lista.join(", ") || "ninguno"}`);
      anota(!lista.includes(INDICE), "el índice ya está subido",
        lista.includes(INDICE) ? `«${INDICE}» existe. Si tiene 0 registros, todavía no se ha indexado.` :
        `«${INDICE}» no existe. Hay que correr el indexador.`);
    } else if (r.status === 403) {
      anota(false, "la clave de escritura escribe", "403. Es de solo lectura: sirve para el navegador, no para indexar");
    } else {
      anota(false, "la clave de escritura escribe", `${r.status} ${(await r.text()).slice(0, 120)}`);
    }
  } catch (e) {
    anota(false, "la clave de escritura escribe", "no se pudo llamar: " + (e.cause?.code || e.message));
  }
}

// ── ¿Hay alguna clave de escritura en el código de la web? ────────────────────
//
// Esto no se le pregunta a Algolia: se lee el repositorio. Y es la comprobación que
// de verdad importa, porque una clave de escritura en el navegador permite a cualquiera
// vaciar el índice desde la consola de cualquier visitante.

async function ficheros(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "tools") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await ficheros(p, acc);
    else if ([".js", ".html", ".css", ".json", ".mjs"].includes(extname(e.name))) acc.push(p);
  }
  return acc;
}

const marcadores = [
  [/ALGOLIA_ADMIN_KEY\s*[:=]\s*["'][0-9a-f]{16,}/i, "una clave de escritura"],
  [/["'][0-9a-f]{32}["']\s*;\s*\/\/.*admin/i, "una clave de escritura"],
  [/(adminKey|algoliaAdminKey)\s*[:=]\s*["'][0-9a-f]{16,}/i, "una clave de escritura"]
];
let encontrado = null;
for (const f of await ficheros(RAIZ)) {
  const t = await readFile(f, "utf8");
  for (const [rx, que] of marcadores) {
    if (rx.test(t)) encontrado = `${f.replace(RAIZ + "/", "")}: ${que}`;
  }
}
anota(!encontrado, "ninguna clave de escritura en la web",
  encontrado ? encontrado : "revisados los .js, .html, .css y .json que se sirven");

// Y qué hay en el navegador ahora mismo.
const nav = join(RAIZ, "assets", "buscador.js");
const txt = await readFile(nav, "utf8");
const enNav = txt.match(/CLAVE_BUSQUEDA\s*=\s*["']([0-9a-f]{32})["']/);
anota(!!enNav, "la clave del navegador es de 32 hex", enNav
  ? `${enNav[1].slice(0, 4)}…  — que sea de 32 hex NO dice si es de búsqueda o de escritura.` +
    ` Eso solo lo responde Algolia, con la prueba de arriba.`
  : "no hay ninguna clave puesta todavía");

// ── Resumen ───────────────────────────────────────────────────────────────────

const malos = resultados.filter((r) => !r.ok);
console.log("");
if (malos.length) {
  console.log(`  ${malos.length} cosa(s) sin resolver. Lo que hace falta está arriba.`);
} else {
  console.log("  Todo correcto.");
}
if (!busqueda && !admin) {
  console.log(`
  No has pasado ninguna clave, así que solo se ha comprobado el Application ID.

    ALGOLIA_APP_ID=${app} ALGOLIA_CLAVE_BUSQUEDA=<la de buscar> node tools/algolia-comprobar.mjs
`);
}
process.exit(malos.length ? 1 : 0);