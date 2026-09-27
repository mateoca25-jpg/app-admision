// App de práctica - primera versión: Inicio -> elegir materia -> responder una por una.
// Sin IndexedDB, sin estadísticas ni "mis fallos" todavía (ver SPEC.md para el alcance completo).
// La lógica de calificar respuestas, filtrar y mezclar vive en js/logica.js (con pruebas propias).

const contenedor = document.getElementById("app");

let preguntas = [];
let sesion = null; // { lista, indice, respondida }

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function renderInicio() {
  contenedor.innerHTML = `
    <h1>Práctica examen de admisión</h1>
    <p class="subtitulo">${preguntas.length.toLocaleString("es")} preguntas disponibles</p>
    <button class="boton" id="btn-practicar">Practicar</button>
  `;
  document.getElementById("btn-practicar").addEventListener("click", renderElegirMateria);
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
  `;

  contenedor.querySelectorAll(".materia-item").forEach((boton) => {
    boton.addEventListener("click", () => iniciarSesion(boton.dataset.materia));
  });
}

function iniciarSesion(materia) {
  sesion = {
    materia: materia || "Todas las materias",
    lista: mezclar(filtrarPorMateria(preguntas, materia)),
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
    <p class="progreso">${sesion.materia} · ${sesion.indice + 1} / ${total}</p>
    <div class="etiquetas">
      <span class="etiqueta">${escaparHtml(pregunta.universidad)}</span>
      ${pregunta.materia.map((m) => `<span class="etiqueta">${escaparHtml(m)}</span>`).join("")}
    </div>
    <p class="tema">${escaparHtml(pregunta.tema)}</p>
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

async function iniciar() {
  try {
    const respuesta = await fetch("datos/preguntas.json");
    preguntas = await respuesta.json();
    renderInicio();
  } catch (error) {
    contenedor.innerHTML = `<p class="cargando">No se pudo cargar el banco de preguntas.</p>`;
    console.error(error);
  }
}

iniciar();
