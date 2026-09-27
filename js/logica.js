// Lógica "pura" de la sesión de práctica: sin tocar la pantalla, para poder
// probarla con pruebas automáticas (ver pruebas/logica.test.js). Se carga
// como <script> normal antes de js/app.js (sin módulos, sin build), y
// también funciona con require() desde Node para las pruebas.

function esRespuestaCorrecta(pregunta, claveElegida) {
  return claveElegida === pregunta.respuesta_correcta;
}

function esUltimaPregunta(sesion) {
  return sesion.indice >= sesion.lista.length - 1;
}

function filtrarPorMateria(preguntas, materia) {
  if (!materia) return preguntas.slice();
  return preguntas.filter((p) => p.materia.includes(materia));
}

function mezclar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function materiasConConteo(preguntas) {
  const conteo = new Map();
  for (const p of preguntas) {
    for (const m of p.materia) {
      conteo.set(m, (conteo.get(m) || 0) + 1);
    }
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    esRespuestaCorrecta,
    esUltimaPregunta,
    filtrarPorMateria,
    mezclar,
    materiasConConteo,
  };
}
