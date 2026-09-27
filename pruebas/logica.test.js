// Pruebas de la logica de calificar respuestas y de sesion (js/logica.js).
// Se corren con el test runner que trae Node, sin instalar nada:
//   node --test pruebas/

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  esRespuestaCorrecta,
  esUltimaPregunta,
  filtrarPorMateria,
  mezclar,
  materiasConConteo,
} = require("../js/logica.js");

test("esRespuestaCorrecta: true cuando la clave elegida es la correcta", () => {
  const pregunta = { respuesta_correcta: "B" };
  assert.equal(esRespuestaCorrecta(pregunta, "B"), true);
});

test("esRespuestaCorrecta: false cuando la clave elegida no es la correcta", () => {
  const pregunta = { respuesta_correcta: "B" };
  assert.equal(esRespuestaCorrecta(pregunta, "A"), false);
});

test("esRespuestaCorrecta: false si no se eligio ninguna opcion", () => {
  const pregunta = { respuesta_correcta: "B" };
  assert.equal(esRespuestaCorrecta(pregunta, undefined), false);
});

test("esUltimaPregunta: true en la ultima pregunta de la sesion", () => {
  const sesion = { indice: 2, lista: [1, 2, 3] };
  assert.equal(esUltimaPregunta(sesion), true);
});

test("esUltimaPregunta: false si todavia quedan preguntas despues", () => {
  const sesion = { indice: 0, lista: [1, 2, 3] };
  assert.equal(esUltimaPregunta(sesion), false);
});

test("esUltimaPregunta: true cuando la sesion tiene una sola pregunta", () => {
  const sesion = { indice: 0, lista: [1] };
  assert.equal(esUltimaPregunta(sesion), true);
});

test("filtrarPorMateria: sin materia devuelve todas las preguntas", () => {
  const preguntas = [{ materia: ["Cardiología"] }, { materia: ["Cirugía"] }];
  assert.equal(filtrarPorMateria(preguntas, "").length, 2);
  assert.equal(filtrarPorMateria(preguntas, null).length, 2);
});

test("filtrarPorMateria: incluye solo preguntas de la materia elegida", () => {
  const preguntas = [
    { id: 1, materia: ["Cardiología"] },
    { id: 2, materia: ["Cirugía"] },
  ];
  const resultado = filtrarPorMateria(preguntas, "Cardiología");
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id, 1);
});

test("filtrarPorMateria: una pregunta con materia compuesta aparece en ambos filtros", () => {
  const preguntas = [
    { id: 1, materia: ["Cardiología", "Urgencias"] },
    { id: 2, materia: ["Cirugía"] },
  ];
  assert.equal(filtrarPorMateria(preguntas, "Cardiología")[0].id, 1);
  assert.equal(filtrarPorMateria(preguntas, "Urgencias")[0].id, 1);
});

test("mezclar: conserva la cantidad y los mismos elementos", () => {
  const original = [1, 2, 3, 4, 5];
  const mezclada = mezclar(original);
  assert.equal(mezclada.length, original.length);
  assert.deepEqual([...mezclada].sort(), [...original].sort());
});

test("mezclar: no modifica el arreglo original", () => {
  const original = [1, 2, 3, 4, 5];
  const copia = [...original];
  mezclar(original);
  assert.deepEqual(original, copia);
});

test("materiasConConteo: cuenta cuantas preguntas tiene cada materia", () => {
  const preguntas = [
    { materia: ["Cardiología"] },
    { materia: ["Cardiología"] },
    { materia: ["Cirugía"] },
  ];
  const conteo = new Map(materiasConConteo(preguntas));
  assert.equal(conteo.get("Cardiología"), 2);
  assert.equal(conteo.get("Cirugía"), 1);
});

test("materiasConConteo: una pregunta con dos materias suma en ambas", () => {
  const preguntas = [{ materia: ["Cardiología", "Urgencias"] }];
  const conteo = new Map(materiasConConteo(preguntas));
  assert.equal(conteo.get("Cardiología"), 1);
  assert.equal(conteo.get("Urgencias"), 1);
});

test("materiasConConteo: ordena de mayor a menor cantidad", () => {
  const preguntas = [
    { materia: ["Rara"] },
    { materia: ["Comun"] },
    { materia: ["Comun"] },
    { materia: ["Comun"] },
  ];
  const conteo = materiasConConteo(preguntas);
  assert.equal(conteo[0][0], "Comun");
  assert.equal(conteo[0][1], 3);
});
