# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Todavía no hay scaffolding de la app (sin `package.json`, sin build, sin tests de la
app en sí). Lo que sí existe:

- [SPEC.md](SPEC.md): especificación completa.
- `datos/Banco_de_10000_Preguntas.xlsx`: banco de preguntas fuente (no se toca a mano).
- `datos/preguntas.json`: banco de preguntas ya convertido (generado, no se edita a
  mano — ver regla más abajo).
- `datos/preguntas_excluidas.json`: preguntas del Excel que no se pudieron convertir
  (sin opciones parseables, sin respuesta correcta, o con respuesta correcta que no
  coincide con ninguna opción), con el motivo de cada una, para revisión manual.
- `scripts/convertir_excel.py`: regenera `datos/preguntas.json` desde el Excel. Correr
  con `python scripts/convertir_excel.py` cada vez que se edite el Excel.
- `scripts/validar_preguntas.py`: revisa `datos/preguntas.json` (respuesta correcta
  presente y válida, ids sin duplicar, materia y tema presentes) e imprime un reporte.
  Correr con `python scripts/validar_preguntas.py`.

Cuando se agregue el scaffolding real de la app (`package.json`, build, tests),
actualiza esta sección con los comandos reales — no los inventes mientras tanto.

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
