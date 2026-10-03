// Generado por scripts/preparar-angel.py. No editar a mano.
// origen y el mismo campo que escribe preparar-hero.py, para que los dos
// scripts hablen el mismo idioma y el recolector sepa de donde viene
// la portada. Aqui la foto es fija, asi que no hay de donde comprobar.
//
// rx es fraccion del ANCHO y ry de la ALTURA: son SEMIEJES. El aro de la
// foto se ve tumbado, 2,8 a 1, asi que con un solo radio el bloom salia
// redondo y no encajaba encima del aro. Son los mismos numeros que HALO
// en el script, de donde tambien sale aro-*.webp.
window.RHYTHM_CAPA_TAM = {
  origen: "angel",
  w: 2000,
  h: 1133,
  halo: { x: 0.5040, y: 0.0918, rx: 0.0305, ry: 0.0221 },
  haloClaro: { x: 0.5030, y: 0.0918, rx: 0.0315, ry: 0.0203 }
};
