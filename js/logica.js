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

// --- Progreso: guardar intentos y derivar estado por pregunta (ver SPEC.md 3.2 y 3.3) ---

function estadoInicial(preguntaId) {
  return {
    preguntaId,
    totalIntentos: 0,
    totalCorrectas: 0,
    rachaCorrectaActual: 0,
    enFallos: false,
    ultimoIntento: null,
  };
}

// Aplica un intento (respuesta dada) al estado previo de esa pregunta y devuelve el
// estado nuevo, sin modificar el que recibió. Regla (SPEC.md 3.3):
// - Incorrecta -> enFallos = true, racha se reinicia en 0.
// - Correcta -> racha suma 1; si llega a 2 seguidas, sale de fallos.
function aplicarIntento(estadoPrevio, intento) {
  const estado = estadoPrevio
    ? { ...estadoPrevio }
    : estadoInicial(intento.preguntaId);

  estado.totalIntentos += 1;
  estado.ultimoIntento = intento.fecha;

  if (intento.correcta) {
    estado.totalCorrectas += 1;
    estado.rachaCorrectaActual += 1;
    if (estado.rachaCorrectaActual >= 2) {
      estado.enFallos = false;
    }
  } else {
    estado.rachaCorrectaActual = 0;
    estado.enFallos = true;
  }

  return estado;
}

// Reconstruye el estado de todas las preguntas a partir del historial completo de
// intentos (en orden cronológico). Devuelve un Map preguntaId -> estado.
function calcularEstados(intentos) {
  const estados = new Map();
  for (const intento of intentos) {
    const previo = estados.get(intento.preguntaId);
    estados.set(intento.preguntaId, aplicarIntento(previo, intento));
  }
  return estados;
}

function preguntasEnFallos(preguntas, estados) {
  return preguntas.filter((p) => {
    const estado = estados.get(p.id);
    return Boolean(estado && estado.enFallos);
  });
}

// % de aciertos global y por materia, solo contando preguntas con al menos un intento.
function calcularEstadisticas(preguntas, estados) {
  let totalIntentos = 0;
  let totalCorrectas = 0;
  let preguntasIntentadas = 0;
  const porMateriaAcum = new Map();

  for (const p of preguntas) {
    const estado = estados.get(p.id);
    if (!estado || estado.totalIntentos === 0) continue;

    preguntasIntentadas += 1;
    totalIntentos += estado.totalIntentos;
    totalCorrectas += estado.totalCorrectas;

    for (const m of p.materia) {
      const actual = porMateriaAcum.get(m) || { totalIntentos: 0, totalCorrectas: 0 };
      actual.totalIntentos += estado.totalIntentos;
      actual.totalCorrectas += estado.totalCorrectas;
      porMateriaAcum.set(m, actual);
    }
  }

  const porMateria = [...porMateriaAcum.entries()]
    .map(([materia, datos]) => ({
      materia,
      totalIntentos: datos.totalIntentos,
      totalCorrectas: datos.totalCorrectas,
      porcentaje: Math.round((datos.totalCorrectas / datos.totalIntentos) * 100),
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje);

  return {
    totalIntentos,
    totalCorrectas,
    porcentajeGlobal:
      totalIntentos === 0 ? null : Math.round((totalCorrectas / totalIntentos) * 100),
    preguntasIntentadas,
    totalPreguntas: preguntas.length,
    porMateria,
  };
}

// Agrupa las preguntas falladas por materia y, dentro de cada materia, por tema,
// ordenando del tema con más fallos al que menos (así como las materias entre sí).
// Una pregunta con materia compuesta cuenta en el grupo de cada una de sus materias.
function agruparFallosPorMateria(preguntas, estados) {
  const fallidas = preguntasEnFallos(preguntas, estados);
  const porMateria = new Map(); // materia -> Map(tema -> preguntas[])

  for (const p of fallidas) {
    for (const m of p.materia) {
      if (!porMateria.has(m)) porMateria.set(m, new Map());
      const porTema = porMateria.get(m);
      if (!porTema.has(p.tema)) porTema.set(p.tema, []);
      porTema.get(p.tema).push(p);
    }
  }

  const materias = [...porMateria.entries()].map(([materia, porTema]) => {
    const temas = [...porTema.entries()]
      .map(([tema, preguntasTema]) => ({
        tema,
        totalFallos: preguntasTema.length,
        preguntas: preguntasTema,
      }))
      .sort((a, b) => b.totalFallos - a.totalFallos);

    const totalFallos = temas.reduce((suma, t) => suma + t.totalFallos, 0);
    return { materia, totalFallos, temas };
  });

  materias.sort((a, b) => b.totalFallos - a.totalFallos);
  return materias;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
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
  };
}
