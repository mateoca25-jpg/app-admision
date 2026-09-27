// App de práctica - primera versión: Inicio -> elegir materia -> responder una por una.
// Sin IndexedDB, sin estadísticas ni "mis fallos" todavía (ver SPEC.md para el alcance completo).

const contenedor = document.getElementById("app");

let preguntas = [];
let sesion = null; // { lista, indice, respondida }

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function mezclar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function materiasConConteo() {
  const conteo = new Map();
  for (const p of preguntas) {
    for (const m of p.materia) {
      conteo.set(m, (conteo.get(m) || 0) + 1);
    }
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
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
  const materias = materiasConConteo();
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
  const filtradas = materia
    ? preguntas.filter((p) => p.materia.includes(materia))
    : preguntas;

  sesion = {
    materia: materia || "Todas las materias",
    lista: mezclar(filtradas),
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
      <span class="etiqueta">${escaparHtml(pregunta.tema)}</span>
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

  contenedor.querySelectorAll(".opcion").forEach((boton) => {
    boton.disabled = true;
    if (boton.dataset.clave === pregunta.respuesta_correcta) {
      boton.classList.add("correcta");
    } else if (boton.dataset.clave === claveElegida) {
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

  const esUltima = sesion.indice === sesion.lista.length - 1;
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
