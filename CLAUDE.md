# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Primera versión de la app funcionando: Inicio → elegir materia → responder preguntas
una por una con feedback y explicación (sin estadísticas, sin Mis fallos, sin guardar
historial todavía — eso viene después). Sin build ni framework: HTML/CSS/JS simples.

- [SPEC.md](SPEC.md): especificación completa (alcance final, más allá de esta primera
  versión).
- `index.html`, `css/estilos.css`, `js/app.js`: la app. `js/app.js` solo maneja pantalla
  (DOM); la lógica de calificar, filtrar y mezclar vive aparte en `js/logica.js` para
  poder probarla sin navegador.
- `js/logica.js`: funciones puras (sin DOM) — `esRespuestaCorrecta`, `esUltimaPregunta`,
  `filtrarPorMateria`, `mezclar`, `materiasConConteo`. Se carga como `<script>` normal en
  `index.html` y también con `require()` desde las pruebas.
- `pruebas/logica.test.js`: pruebas de `js/logica.js` con el test runner que trae Node
  (sin dependencias). Correr con `node --test` desde la raíz del proyecto.
- `datos/Banco_de_10000_Preguntas.xlsx`: banco de preguntas fuente (no se toca a mano).
- `datos/preguntas.json`: banco de preguntas ya convertido (generado, no se edita a
  mano — ver regla más abajo).
- `datos/preguntas_excluidas.json`: preguntas del Excel que no se pudieron convertir,
  con el motivo de cada una, para revisión manual.
- `datos/mapeo_materias.csv`: mapeo de las variantes de "Especialidad" del Excel a un
  nombre de materia final único (ya aplicado a `preguntas.json`).
- `scripts/convertir_excel.py`: regenera `datos/preguntas.json` desde el Excel. Correr
  con `python scripts/convertir_excel.py` cada vez que se edite el Excel.
- `scripts/generar_mapeo_materias.py` / `scripts/aplicar_mapeo_materias.py`: regeneran y
  aplican `datos/mapeo_materias.csv` (solo hace falta si aparecen materias nuevas al
  reconvertir el Excel).
- `scripts/validar_preguntas.py`: revisa `datos/preguntas.json` (respuesta correcta
  presente y válida, ids sin duplicar, materia y tema presentes) e imprime un reporte.
  Correr con `python scripts/validar_preguntas.py`.

Para abrir la app localmente hace falta un servidor (no sirve abrir `index.html` con
doble clic, porque `fetch()` de un archivo local queda bloqueado). Hay un servidor de
prueba configurado en `.claude/launch.json` (`python -m http.server 8123`).

Cuando se agregue scaffolding real (`package.json`, build), actualiza esta sección con
los comandos reales — no los inventes mientras tanto.

## Arquitectura (ver SPEC.md para el detalle completo)

- PWA instalable (Windows + Android) que funciona sin internet. Sin backend: todo corre
  en el dispositivo.
- El banco de preguntas se genera una sola vez desde el Excel de `datos/` hacia
  `datos/preguntas.json` mediante un script de conversión aparte (no una función de la
  app). La conversión limpia el Excel: separa opciones del enunciado, normaliza la
  respuesta correcta, excluye preguntas no parseables, y usa el `#` del Excel como id
  estable (nunca renumerar preguntas existentes).
- El progreso del usuario (respuestas dadas) se guarda en IndexedDB en el dispositivo,
  separado del banco de preguntas.

## Reglas de trabajo en este repo

- El usuario es principiante y no programa: explica en español, en lenguaje sencillo,
  qué hiciste y por qué, sin jerga técnica.
- Tecnología: HTML, CSS y JavaScript simples (la opción más simple acordada en
  SPEC.md). Evita agregar dependencias innecesarias.
- `datos/preguntas.json` (una vez exista) nunca se modifica sin preguntarle al usuario
  primero — es el banco de preguntas generado desde su Excel.
- Diseño mobile-first: todo debe verse y funcionar bien primero en celular.
- Después de cada cambio: ejecuta las pruebas y muestra la evidencia (resultado de las
  pruebas o una captura de pantalla). No digas que algo está listo sin esa evidencia.
- Haz un commit de git después de cada función que funcione, con mensaje descriptivo en
  español.
