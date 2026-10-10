#!/usr/bin/env node
/**
 * Pre-renders static HTML content for manual.html and index.html.
 *
 * Like omarchy-site, having the real static DOM in the HTML allows the browser
 * to know the full document height at initial parse time. This makes native
 * scroll restoration instant, eliminates flashes of top (y=0), and makes anchor
 * links work even before JavaScript executes.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

const makeEl = () => ({
  value: '',
  innerHTML: '',
  children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {},
  getAttribute() { return ''; },
  removeAttribute() {},
  addEventListener() {},
  removeEventListener() {},
  style: { setProperty() {}, removeProperty() {} },
  dataset: {},
  closest() { return makeEl(); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  getBoundingClientRect() { return { height: 60, top: 0, left: 0, right: 0, width: 100 }; }
});

const sandbox = {
  window: {},
  document: {
    documentElement: makeEl(),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  navigator: {},
  location: { pathname: '/manual.html', search: '', hash: '' },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: () => {},
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '#07090b' }),
  innerWidth: 1440,
  innerHeight: 900
};
sandbox.window = sandbox;
sandbox.window.getComputedStyle = sandbox.getComputedStyle;
sandbox.window.RHYTHM_CAPA = {
  paleta: () => ({ nucleo: '', iris: '', halo: '', txt: '' }),
  montar: () => {}
};

const githubCode = fs.readFileSync(path.join(root, 'data/github.js'), 'utf8');
const hyprCode = fs.readFileSync(path.join(root, 'assets/hyprland.js'), 'utf8');
const docsCode = fs.readFileSync(path.join(root, 'data/documentacion.js'), 'utf8');
const imgCode = fs.readFileSync(path.join(root, 'data/imagenes.js'), 'utf8');

vm.createContext(sandbox);
vm.runInContext(githubCode, sandbox);
vm.runInContext(hyprCode, sandbox);
vm.runInContext(docsCode, sandbox);
vm.runInContext(imgCode, sandbox);

const appCode = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

const containers = {
  '#manual': makeEl(),
  '#indice': makeEl(),
  '#hyprland-caja': makeEl(),
  '#reloj': makeEl(),
  '#sello-docs': makeEl(),
  '#escena': makeEl(),
  '.barra-z': makeEl(),
  '#contenidos': makeEl(),
  '.nombre': Object.assign(makeEl(), { textContent: 'Rhythmcrea' })
};
sandbox.document.querySelector = (sel) => containers[sel] || makeEl();
sandbox.document.querySelectorAll = () => [];
sandbox.document.getElementById = (id) => containers['#' + id] || makeEl();

vm.runInContext(appCode, sandbox);

const manualHtml = containers['#manual'].innerHTML;
const indiceHtml = containers['#indice'].innerHTML;
const hyprlandHtml = containers['#hyprland-caja'].innerHTML;

console.log(`Rendered manual: ${manualHtml.length} bytes`);
console.log(`Rendered indice: ${indiceHtml.length} bytes`);
console.log(`Rendered hyprland: ${hyprlandHtml.length} bytes`);

// Inject into manual.html
const manualFile = path.join(root, 'manual.html');
let manualContent = fs.readFileSync(manualFile, 'utf8');

manualContent = manualContent.replace(
  /<nav class="indice" id="indice" aria-label="On this page">[\s\S]*?<\/nav>/,
  `<nav class="indice" id="indice" aria-label="On this page">\n${indiceHtml}\n  </nav>`
);

const manualStart = manualContent.indexOf('<div id="manual">');
const manualEnd = manualContent.indexOf('</main>', manualStart);
if (manualStart !== -1 && manualEnd !== -1) {
  manualContent = manualContent.slice(0, manualStart) +
    `<div id="manual">\n${manualHtml}\n    </div>\n  ` +
    manualContent.slice(manualEnd);
}

fs.writeFileSync(manualFile, manualContent, 'utf8');
console.log('Updated manual.html');

// Inject into index.html
const indexFile = path.join(root, 'index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');

const hyprStart = indexContent.indexOf('<div id="hyprland-caja">');
const hyprEnd = indexContent.indexOf('</section>', hyprStart);
if (hyprStart !== -1 && hyprEnd !== -1) {
  const lastDiv = indexContent.lastIndexOf('</div>', hyprEnd);
  indexContent = indexContent.slice(0, hyprStart) +
    `<div id="hyprland-caja">\n${hyprlandHtml}\n  </div>\n` +
    indexContent.slice(lastDiv + 6);
}

fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('Updated index.html');
