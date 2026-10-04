#!/usr/bin/env node
// Añade claves a un diccionario de idioma sin romperlo.
//
//   node tools/claves-buscar.mjs es pt fr it ca
//
// Por qué existe: la primera vez que se hizo, a mano, el script buscaba "= {" en el
// fichero y ese patron aparece tambien dentro de los comentarios de la cabecera. El
// resultado fue machacar los 419 Apartados del portugues y franceces y dejar 8 lineas.
// Se perduio media hora y se restauro con git.
//
// Aqui el punto de insercion NO se busca por patron: es la linea que empieza por
// "window.RHYTHM_I18N." mas exactamente un igual. Es unica, y si no aparece o
// aparece mas de una el script para sin escribir nada. Antes de escribir, comprueba
// cuantas claves hay; si el numero baja, no escribe.

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

// Las nueve cadenas que escribe el buscador. A mano, como todas las demás: aquí no
// hay ningún traductor automático y no lo habrá.
const TR = {
  es: {
    "Search this site": "Buscar en esta página",
    "Close": "Cerrar",
    "Searching…": "Buscando…",
    "Nothing found.": "No se encuentra nada.",
    "Try fewer words.": "Prueba con menos palabras.",
    "1 result": "1 resultado",
    "%d results": "%d resultados",
    "Search the manual, the shortcuts and the installer.":
      "Busca en el manual, en los atajos y en el instalador.",
    "from this page, not from the server": "de esta página, no del servidor"
  },
  pt: {
    "Search this site": "Procurar nesta página",
    "Close": "Fechar",
    "Searching…": "A procurar…",
    "Nothing found.": "Não se encontra nada.",
    "Try fewer words.": "Tenta com menos palavras.",
    "1 result": "1 resultado",
    "%d results": "%d resultados",
    "Search the manual, the shortcuts and the installer.":
      "Procura no manual, nos atalhos e no instalador.",
    "from this page, not from the server": "desta página, não do servidor"
  },
  fr: {
    "Search this site": "Rechercher sur ce site",
    "Close": "Fermer",
    "Searching…": "Recherche…",
    "Nothing found.": "Rien trouvé.",
    "Try fewer words.": "Essayez avec moins de mots.",
    "1 result": "1 résultat",
    "%d results": "%d résultats",
    "Search the manual, the shortcuts and the installer.":
      "Cherchez dans le manuel, dans les raccourcis et dans l'installeur.",
    "from this page, not from the server": "de cette page, pas du serveur"
  },
  it: {
    "Search this site": "Cerca in questa pagina",
    "Close": "Chiudi",
    "Searching…": "Sto cercando…",
    "Nothing found.": "Non si trova niente.",
    "Try fewer words.": "Prova con meno parole.",
    "1 result": "1 risultato",
    "%d results": "%d risultati",
    "Search the manual, the shortcuts and the installer.":
      "Cerca nel manuale, nelle scorciatoie e nell'installatore.",
    "from this page, not from the server": "di questa pagina, non dal server"
  },
  ca: {
    "Search this site": "Cerca en aquesta pàgina",
    "Close": "Tanca",
    "Searching…": "Cercant…",
    "Nothing found.": "No es troba res.",
    "Try fewer words.": "Prova amb menys paraules.",
    "1 result": "1 resultat",
    "%d results": "%d resultats",
    "Search the manual, the shortcuts and the installer.":
      "Cerca al manual, a les dreceres i a l'instal·lador.",
    "from this page, not from the server": "d'aquesta pàgina, no del servidor"
  }
};

const esc = (s) => JSON.stringify(s, { ensure_ascii: true });
const cuentaClaves = (s) => (s.match(/^\s*"(?:[^"\\]|\\.)*":/gm) || []).length;

const idiomas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TR);
let fallos = 0;

for (const codigo of idiomas) {
  const adder = TR[codigo];
  if (!adder) { console.log(`  ${codigo}: no hay traducciones escritas`); fallos++; continue; }
  const ruta = join(RAIZ, "data", `lang-${codigo}.js`);
  const antes = await readFile(ruta, "utf8");
  const clavesAntes = cuentaClaves(antes);

  // Punto de insercion: la linea que abre el diccionario. Se busca con una
  // expresion ANCLADA, no con index() sobre un patron suelto.
  const lineas = antes.split("\n");
  const Aperturas = [];
  lineas.forEach((l, n) => { if (/^window\.RHYTHM_I18N\.[a-z-]+ = \{\s*$/.test(l)) Aperturas.push(n); });

  if (Aperturas.length !== 1) {
    console.log(`  ${codigo}: se esperaba 1 apertura del diccionario y hay ${Aperturas.length}. No se toca nada.`);
    fallos++;
    continue;
  }
  const abrir = Aperturas[0];

  const nuevas = Object.entries(adder).map(([k, v]) => `  ${esc(k)}: ${esc(v)},`);
  lineas.splice(abrir + 1, 0, ...nuevas);
  const despues = lineas.join("\n");
  const clavesDespues = cuentaClaves(despues);

  // La comprobacion que habria evitado el desastre: si el numero de claves ha
  // bajado es que se ha perdido algo, y no se escribe.
  if (clavesDespues < clavesAntes) {
    console.log(`  ${codigo}: ${clavesAntes} -> ${clavesDespues}. HAN DESAPARECIDO CLAVES. No se escribe.`);
    fallos++;
    continue;
  }
  if (clavesDespues !== clavesAntes + Object.keys(adder).length) {
    console.log(`  ${codigo}: esperaba ${clavesAntes}+${Object.keys(adder).length} y hay ${clavesDespues}. No se escribe.`);
    fallos++;
    continue;
  }

  await writeFile(ruta, despues, "utf8");
  console.log(`  ${codigo}: ${clavesAntes} -> ${clavesDespues} claves`);
}

process.exit(fallos ? 1 : 0);