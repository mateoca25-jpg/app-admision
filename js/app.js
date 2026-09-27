// App de práctica: Inicio -> elegir materia (o Mis fallos) -> responder una por una,
// con progreso guardado en el dispositivo (ver SPEC.md).
// La lógica de calificar, filtrar, mezclar y calcular progreso vive en js/logica.js
// (con pruebas propias). El guardado en IndexedDB vive en js/almacenamiento.js.
// Este archivo solo maneja pantalla (DOM).

const contenedor = document.getElementById("app");

let preguntas = [];
let estados = new Map(); // preguntaId -> estado (ver calcularEstados en js/logica.js)
let sesion = null; // { nombre, lista, indice, respondida }
let fallosAbiertos = new Set(); // claves "materia||tema" expandidas en la pantalla de Mis fallos

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function renderInicio() {
  const cantidadFallos = preguntasEnFallos(preguntas, estados).length;

  contenedor.innerHTML = `
    <h1>Práctica examen de admisión</h1>
    <p class="subtitulo">${preguntas.length.toLocaleString("es")} preguntas disponibles</p>
    <button class="boton" id="btn-practicar">Practicar</button>
    <button class="boton boton-secundario" id="btn-fallos-practicar" ${cantidadFallos === 0 ? "disabled" : ""}>
      Practicar mis fallos ${cantidadFallos > 0 ? `(${cantidadFallos})` : ""}
    </button>
    <button class="boton boton-secundario" id="btn-fallos-ver">Mis fallos</button>
    <button class="boton boton-secundario" id="btn-progreso">Mi progreso</button>
    <button class="boton boton-secundario" id="btn-ajustes">Ajustes</button>
  `;

  document.getElementById("btn-practicar").addEventListener("click", renderElegirMateria);
  document.getElementById("btn-fallos-ver").addEventListener("click", renderFallos);
  document.getElementById("btn-progreso").addEventListener("click", renderProgreso);
  document.getElementById("btn-ajustes").addEventListener("click", renderAjustes);

  const btnPracticarFallos = document.getElementById("btn-fallos-practicar");
  if (cantidadFallos > 0) {
    btnPracticarFallos.addEventListener("click", practicarFallos);
  }
}

function renderElegirMateria() {
  const materias = materiasConConteo(preguntas);
  const filas = materias
    .map(
      ([nombre, cantidad]) => `
      <li>
        <button class="materia-item" data-materia="${escaparHtml(nombre)}">
          <span>${escaparHtml(nombre)}</span>
          <span class="conteo">${cantidad}</span>
        </button>
      </li>`
    )
    .join("");

  contenedor.innerHTML = `
    <h1>Elegí una materia</h1>
    <ul class="lista-materias">
      <li>
        <button class="materia-item" data-materia="">
          <span>Todas las materias</span>
          <span class="conteo">${preguntas.length}</span>
        </button>
      </li>
      ${filas}
    </ul>
    <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
  `;

  contenedor.querySelectorAll(".materia-item").forEach((boton) => {
    boton.addEventListener("click", () => iniciarSesion(boton.dataset.materia));
  });
  document.getElementById("btn-volver").addEventListener("click", renderInicio);
}

function iniciarSesion(materia) {
  const lista = mezclar(filtrarPorMateria(preguntas, materia));
  iniciarSesionConLista(lista, materia || "Todas las materias");
}

function practicarFallos() {
  const lista = mezclar(preguntasEnFallos(preguntas, estados));
  iniciarSesionConLista(lista, "Mis fallos");
}

function iniciarSesionConLista(lista, nombre) {
  sesion = {
    nombre,
    lista,
    indice: 0,
    respondida: false,
  };

  renderPregunta();
}

function renderPregunta() {
  const pregunta = sesion.lista[sesion.indice];
  const total = sesion.lista.length;

  const opcionesHtml = pregunta.opciones
    .map(
      (o) => `
      <button class="opcion" data-clave="${o.clave}">
        <span class="clave">${o.clave})</span>
        <span>${escaparHtml(o.texto)}</span>
      </button>`
    )
    .join("");

  contenedor.innerHTML = `
    <p class="progreso">${escaparHtml(sesion.nombre)} · ${sesion.indice + 1} / ${total}</p>
    <div class="etiquetas">
      <span class="etiqueta">${escaparHtml(pregunta.universidad)}</span>
      ${pregunta.materia.map((m) => `<span class="etiqueta">${escaparHtml(m)}</span>`).join("")}
    </div>
    <p class="enunciado">${escaparHtml(pregunta.enunciado)}</p>
    <div id="opciones">${opcionesHtml}</div>
    <div id="explicacion-contenedor"></div>
    <div class="siguiente-contenedor" id="siguiente-contenedor"></div>
  `;

  contenedor.querySelectorAll(".opcion").forEach((boton) => {
    boton.addEventListener("click", () => responder(boton.dataset.clave));
  });
}

function responder(claveElegida) {
  if (sesion.respondida) return;
  sesion.respondida = true;

  const pregunta = sesion.lista[sesion.indice];
  const correcta = esRespuestaCorrecta(pregunta, claveElegida);

  const intento = {
    preguntaId: pregunta.id,
    opcionElegida: claveElegida,
    correcta,
    fecha: new Date().toISOString(),
  };
  estados.set(pregunta.id, aplicarIntento(estados.get(pregunta.id), intento));
  guardarIntento(intento).catch((error) => {
    console.error("No se pudo guardar la respuesta", error);
  });

  contenedor.querySelectorAll(".opcion").forEach((boton) => {
    boton.disabled = true;
    const clave = boton.dataset.clave;
    if (esRespuestaCorrecta(pregunta, clave)) {
      boton.classList.add("correcta");
    } else if (clave === claveElegida) {
      boton.classList.add("incorrecta");
    }
  });

  if (pregunta.explicacion) {
    document.getElementById("explicacion-contenedor").innerHTML = `
      <div class="explicacion">
        <h2>Explicación</h2>
        <p>${escaparHtml(pregunta.explicacion)}</p>
      </div>
    `;
  }

  const esUltima = esUltimaPregunta(sesion);
  const textoBoton = esUltima ? "Volver al inicio" : "Siguiente";
  document.getElementById("siguiente-contenedor").innerHTML = `
    <button class="boton" id="btn-siguiente">${textoBoton}</button>
  `;
  document.getElementById("btn-siguiente").addEventListener("click", () => {
    if (esUltima) {
      sesion = null;
      renderInicio();
    } else {
      sesion.indice += 1;
      sesion.respondida = false;
      renderPregunta();
    }
  });
}

function renderProgreso() {
  const stats = calcularEstadisticas(preguntas, estados);

  if (stats.preguntasIntentadas === 0) {
    contenedor.innerHTML = `
      <h1>Mi progreso</h1>
      <p class="subtitulo">Todavía no respondiste ninguna pregunta.</p>
      <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
    `;
    document.getElementById("btn-volver").addEventListener("click", renderInicio);
    return;
  }

  const filasMateria = stats.porMateria
    .map(
      (m) => `
      <li class="fila-progreso">
        <span>${escaparHtml(m.materia)}</span>
        <span class="conteo">${m.porcentaje}% (${m.totalCorrectas}/${m.totalIntentos})</span>
      </li>`
    )
    .join("");

  contenedor.innerHTML = `
    <h1>Mi progreso</h1>
    <div class="tarjeta-stat">
      <p class="stat-numero">${stats.porcentajeGlobal}%</p>
      <p class="stat-etiqueta">Aciertos totales (${stats.totalCorrectas}/${stats.totalIntentos})</p>
    </div>
    <p class="subtitulo">${stats.preguntasIntentadas.toLocaleString("es")} / ${stats.totalPreguntas.toLocaleString("es")} preguntas intentadas</p>
    <h2>Por materia</h2>
    <ul class="lista-progreso">${filasMateria}</ul>
    <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
  `;
  document.getElementById("btn-volver").addEventListener("click", renderInicio);
}

function renderFallos() {
  const grupos = agruparFallosPorMateria(preguntas, estados);

  if (grupos.length === 0) {
    contenedor.innerHTML = `
      <h1>Mis fallos</h1>
      <p class="subtitulo">No tenés preguntas falladas pendientes.</p>
      <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
    `;
    document.getElementById("btn-volver").addEventListener("click", renderInicio);
    return;
  }

  const gruposHtml = grupos
    .map((grupo) => {
      const temasHtml = grupo.temas
        .map((t) => {
          const clave = `${grupo.materia}||${t.tema}`;
          const abierto = fallosAbiertos.has(clave);
          const preguntasHtml = abierto
            ? `<ul class="lista-preguntas-fallo">
                ${t.preguntas
                  .map(
                    (p) => `
                    <li>
                      <button class="pregunta-fallo-item" data-id="${p.id}">
                        ${escaparHtml(p.enunciado.slice(0, 90))}${p.enunciado.length > 90 ? "…" : ""}
                      </button>
                    </li>`
                  )
                  .join("")}
              </ul>`
            : "";

          return `
            <li>
              <button class="tema-item" data-clave="${escaparHtml(clave)}">
                <span>${escaparHtml(t.tema)}</span>
                <span class="conteo">${t.totalFallos}</span>
              </button>
              ${preguntasHtml}
            </li>`;
        })
        .join("");

      return `
        <div class="grupo-materia">
          <h2>${escaparHtml(grupo.materia)} <span class="conteo">${grupo.totalFallos}</span></h2>
          <ul class="lista-temas">${temasHtml}</ul>
        </div>`;
    })
    .join("");

  contenedor.innerHTML = `
    <h1>Mis fallos</h1>
    ${gruposHtml}
    <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
  `;

  contenedor.querySelectorAll(".tema-item").forEach((boton) => {
    boton.addEventListener("click", () => {
      const clave = boton.dataset.clave;
      if (fallosAbiertos.has(clave)) {
        fallosAbiertos.delete(clave);
      } else {
        fallosAbiertos.add(clave);
      }
      renderFallos();
    });
  });

  contenedor.querySelectorAll(".pregunta-fallo-item").forEach((boton) => {
    boton.addEventListener("click", () => {
      const pregunta = preguntas.find((p) => p.id === Number(boton.dataset.id));
      renderRevisionPregunta(pregunta);
    });
  });

  document.getElementById("btn-volver").addEventListener("click", renderInicio);
}

function renderRevisionPregunta(pregunta) {
  const opcionesHtml = pregunta.opciones
    .map((o) => {
      const esCorrecta = o.clave === pregunta.respuesta_correcta;
      return `
        <div class="opcion opcion-revision ${esCorrecta ? "correcta" : ""}">
          <span class="clave">${o.clave})</span>
          <span>${escaparHtml(o.texto)}</span>
        </div>`;
    })
    .join("");

  contenedor.innerHTML = `
    <p class="progreso">Revisión de pregunta fallada</p>
    <div class="etiquetas">
      <span class="etiqueta">${escaparHtml(pregunta.universidad)}</span>
      ${pregunta.materia.map((m) => `<span class="etiqueta">${escaparHtml(m)}</span>`).join("")}
    </div>
    <p class="tema">${escaparHtml(pregunta.tema)}</p>
    <p class="enunciado">${escaparHtml(pregunta.enunciado)}</p>
    <div id="opciones">${opcionesHtml}</div>
    ${
      pregunta.explicacion
        ? `<div class="explicacion">
            <h2>Explicación</h2>
            <p>${escaparHtml(pregunta.explicacion)}</p>
          </div>`
        : ""
    }
    <button class="boton boton-secundario" id="btn-volver">Volver a mis fallos</button>
  `;

  document.getElementById("btn-volver").addEventListener("click", renderFallos);
}

function renderAjustes() {
  contenedor.innerHTML = `
    <h1>Ajustes</h1>
    <button class="boton boton-secundario" id="btn-exportar">Exportar progreso</button>
    <button class="boton boton-secundario" id="btn-importar">Importar progreso</button>
    <input type="file" id="input-importar" accept="application/json" class="oculto" />
    <p id="mensaje-ajustes" class="mensaje-ajustes"></p>
    <button class="boton boton-secundario" id="btn-volver">Volver al inicio</button>
  `;

  document.getElementById("btn-exportar").addEventListener("click", exportarProgreso);
  document.getElementById("btn-importar").addEventListener("click", () => {
    document.getElementById("input-importar").click();
  });
  document.getElementById("input-importar").addEventListener("change", importarProgreso);
  document.getElementById("btn-volver").addEventListener("click", renderInicio);
}

function mostrarMensajeAjustes(texto, esError) {
  const mensaje = document.getElementById("mensaje-ajustes");
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.toggle("mensaje-error", Boolean(esError));
}

async function exportarProgreso() {
  try {
    const intentos = await obtenerTodosIntentos();
    const respaldo = crearRespaldo(intentos);

    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `respaldo-app-admision-${respaldo.fecha.slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);

    mostrarMensajeAjustes(`Se exportaron ${intentos.length} respuestas guardadas.`);
  } catch (error) {
    console.error(error);
    mostrarMensajeAjustes("No se pudo exportar el progreso.", true);
  }
}

async function importarProgreso(evento) {
  const archivo = evento.target.files[0];
  evento.target.value = "";
  if (!archivo) return;

  try {
    const texto = await archivo.text();
    const respaldo = JSON.parse(texto);
    const intentos = intentosDesdeRespaldo(respaldo);

    await reemplazarTodosIntentos(intentos);
    estados = calcularEstados(intentos);

    mostrarMensajeAjustes(`Se importaron ${intentos.length} respuestas. Reemplazaron el historial anterior.`);
  } catch (error) {
    console.error(error);
    mostrarMensajeAjustes(`No se pudo importar el archivo: ${error.message}`, true);
  }
}

async function iniciar() {
  try {
    const respuesta = await fetch("datos/preguntas.json");
    preguntas = await respuesta.json();
    const intentosGuardados = await obtenerTodosIntentos();
    estados = calcularEstados(intentosGuardados);
    renderInicio();
  } catch (error) {
    contenedor.innerHTML = `<p class="cargando">No se pudo cargar el banco de preguntas.</p>`;
    console.error(error);
  }
}

iniciar();
