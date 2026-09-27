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
  estadoInicial,
  aplicarIntento,
  calcularEstados,
  preguntasEnFallos,
  calcularEstadisticas,
  agruparFallosPorMateria,
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

// --- aplicarIntento / calcularEstados: guardar respuestas y derivar "Mis fallos" ---

test("estadoInicial: una pregunta nunca respondida no está en fallos", () => {
  const estado = estadoInicial(1);
  assert.equal(estado.enFallos, false);
  assert.equal(estado.totalIntentos, 0);
});

test("aplicarIntento: una respuesta incorrecta marca la pregunta en fallos", () => {
  const estado = aplicarIntento(undefined, { preguntaId: 1, correcta: false, fecha: "2026-01-01" });
  assert.equal(estado.enFallos, true);
  assert.equal(estado.rachaCorrectaActual, 0);
  assert.equal(estado.totalIntentos, 1);
});

test("aplicarIntento: acertar una sola vez después de fallar no saca de fallos", () => {
  let estado = aplicarIntento(undefined, { preguntaId: 1, correcta: false, fecha: "2026-01-01" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: true, fecha: "2026-01-02" });
  assert.equal(estado.enFallos, true);
  assert.equal(estado.rachaCorrectaActual, 1);
});

test("aplicarIntento: acertar dos veces seguidas después de fallar saca de fallos", () => {
  let estado = aplicarIntento(undefined, { preguntaId: 1, correcta: false, fecha: "2026-01-01" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: true, fecha: "2026-01-02" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: true, fecha: "2026-01-03" });
  assert.equal(estado.enFallos, false);
});

test("aplicarIntento: fallar de nuevo después de haber salido de fallos vuelve a marcarla", () => {
  let estado = aplicarIntento(undefined, { preguntaId: 1, correcta: false, fecha: "2026-01-01" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: true, fecha: "2026-01-02" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: true, fecha: "2026-01-03" });
  estado = aplicarIntento(estado, { preguntaId: 1, correcta: false, fecha: "2026-01-04" });
  assert.equal(estado.enFallos, true);
  assert.equal(estado.rachaCorrectaActual, 0);
});

test("calcularEstados: reconstruye el estado de varias preguntas desde el historial completo", () => {
  const intentos = [
    { preguntaId: 1, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 2, correcta: true, fecha: "2026-01-01" },
    { preguntaId: 1, correcta: true, fecha: "2026-01-02" },
  ];
  const estados = calcularEstados(intentos);
  assert.equal(estados.get(1).enFallos, true);
  assert.equal(estados.get(1).totalIntentos, 2);
  assert.equal(estados.get(2).enFallos, false);
  assert.equal(estados.get(2).totalIntentos, 1);
});

// --- preguntasEnFallos ---

test("preguntasEnFallos: solo devuelve las preguntas marcadas en fallos", () => {
  const preguntas = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const estados = calcularEstados([
    { preguntaId: 1, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 2, correcta: true, fecha: "2026-01-01" },
  ]);
  const resultado = preguntasEnFallos(preguntas, estados);
  assert.deepEqual(resultado.map((p) => p.id), [1]);
});

test("preguntasEnFallos: una pregunta nunca respondida no aparece", () => {
  const preguntas = [{ id: 1 }];
  const estados = new Map();
  assert.equal(preguntasEnFallos(preguntas, estados).length, 0);
});

// --- calcularEstadisticas ---

test("calcularEstadisticas: calcula el porcentaje global y por materia", () => {
  const preguntas = [
    { id: 1, materia: ["Cardiología"] },
    { id: 2, materia: ["Cirugía"] },
  ];
  const estados = calcularEstados([
    { preguntaId: 1, correcta: true, fecha: "2026-01-01" },
    { preguntaId: 1, correcta: false, fecha: "2026-01-02" },
    { preguntaId: 2, correcta: true, fecha: "2026-01-01" },
  ]);
  const stats = calcularEstadisticas(preguntas, estados);
  assert.equal(stats.totalIntentos, 3);
  assert.equal(stats.totalCorrectas, 2);
  assert.equal(stats.porcentajeGlobal, 67);
  assert.equal(stats.preguntasIntentadas, 2);
  assert.equal(stats.totalPreguntas, 2);

  const cardio = stats.porMateria.find((m) => m.materia === "Cardiología");
  assert.equal(cardio.porcentaje, 50);
  const cirugia = stats.porMateria.find((m) => m.materia === "Cirugía");
  assert.equal(cirugia.porcentaje, 100);
});

test("calcularEstadisticas: una pregunta con materia compuesta suma en ambas materias", () => {
  const preguntas = [{ id: 1, materia: ["Cardiología", "Urgencias"] }];
  const estados = calcularEstados([{ preguntaId: 1, correcta: true, fecha: "2026-01-01" }]);
  const stats = calcularEstadisticas(preguntas, estados);
  assert.equal(stats.porMateria.find((m) => m.materia === "Cardiología").totalIntentos, 1);
  assert.equal(stats.porMateria.find((m) => m.materia === "Urgencias").totalIntentos, 1);
});

test("calcularEstadisticas: sin ningún intento, el porcentaje global es null", () => {
  const preguntas = [{ id: 1, materia: ["Cardiología"] }];
  const stats = calcularEstadisticas(preguntas, new Map());
  assert.equal(stats.porcentajeGlobal, null);
  assert.equal(stats.preguntasIntentadas, 0);
});

// --- agruparFallosPorMateria ---

test("agruparFallosPorMateria: agrupa por materia y por tema", () => {
  const preguntas = [
    { id: 1, materia: ["Cardiología"], tema: "IAM" },
    { id: 2, materia: ["Cardiología"], tema: "IAM" },
    { id: 3, materia: ["Cardiología"], tema: "Arritmias" },
    { id: 4, materia: ["Cirugía"], tema: "Apendicitis" },
  ];
  const estados = calcularEstados([
    { preguntaId: 1, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 2, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 3, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 4, correcta: false, fecha: "2026-01-01" },
  ]);
  const grupos = agruparFallosPorMateria(preguntas, estados);
  const cardio = grupos.find((g) => g.materia === "Cardiología");
  assert.equal(cardio.totalFallos, 3);
  assert.equal(cardio.temas[0].tema, "IAM");
  assert.equal(cardio.temas[0].totalFallos, 2);
  assert.equal(cardio.temas[1].tema, "Arritmias");
});

test("agruparFallosPorMateria: ordena las materias de más a menos fallos", () => {
  const preguntas = [
    { id: 1, materia: ["Cirugía"], tema: "Apendicitis" },
    { id: 2, materia: ["Cardiología"], tema: "IAM" },
    { id: 3, materia: ["Cardiología"], tema: "Arritmias" },
  ];
  const estados = calcularEstados([
    { preguntaId: 1, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 2, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 3, correcta: false, fecha: "2026-01-01" },
  ]);
  const grupos = agruparFallosPorMateria(preguntas, estados);
  assert.equal(grupos[0].materia, "Cardiología");
  assert.equal(grupos[0].totalFallos, 2);
});

test("agruparFallosPorMateria: una pregunta con materia compuesta cuenta en ambas materias", () => {
  const preguntas = [{ id: 1, materia: ["Cardiología", "Urgencias"], tema: "IAM" }];
  const estados = calcularEstados([{ preguntaId: 1, correcta: false, fecha: "2026-01-01" }]);
  const grupos = agruparFallosPorMateria(preguntas, estados);
  assert.equal(grupos.find((g) => g.materia === "Cardiología").totalFallos, 1);
  assert.equal(grupos.find((g) => g.materia === "Urgencias").totalFallos, 1);
});

test("agruparFallosPorMateria: una pregunta que ya salió de fallos no aparece", () => {
  const preguntas = [{ id: 1, materia: ["Cardiología"], tema: "IAM" }];
  const estados = calcularEstados([
    { preguntaId: 1, correcta: false, fecha: "2026-01-01" },
    { preguntaId: 1, correcta: true, fecha: "2026-01-02" },
    { preguntaId: 1, correcta: true, fecha: "2026-01-03" },
  ]);
  const grupos = agruparFallosPorMateria(preguntas, estados);
  assert.equal(grupos.length, 0);
});
