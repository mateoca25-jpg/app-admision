# SPEC — App de práctica para examen de admisión a residencia (Colombia)

## 1. Resumen del proyecto

Una PWA (Progressive Web App) instalable en Windows y Android, pensada para estudiar
desde el celular, **que funciona sin conexión a internet** una vez instalada. Permite
practicar con un banco de preguntas de opción múltiple extraído de exámenes de admisión
a residencia médica de universidades colombianas, registrar cada respuesta dada, y
enfocar el estudio en las preguntas que se han fallado.

No requiere backend ni servidor: todo el banco de preguntas y todo el historial de
respuestas vive en el propio dispositivo.

---

## 2. Origen y limpieza de los datos

Fuente: `datos/Banco_de_10000_Preguntas.xlsx` (10,499 filas, 8 columnas: `#`,
`Pregunta`, `Predicción`, `Respuesta correcta`, `Especialidad`, `Tema`,
`Retroalimentación`, `Universidad`).

El Excel **no se usa directamente en la app**. Se convierte, en un paso aparte (script
de conversión, no una pantalla dentro de la app), a un archivo JSON estático que se
empaqueta con la aplicación. Esta conversión aplica las siguientes reglas:

### 2.1 Parseo del enunciado y opciones
- El texto de `Pregunta` trae el enunciado y las opciones (a/b/c/d, a veces e) mezclados
  en un solo bloque de texto, en al menos 6 estilos distintos (mayúscula/minúscula, con
  paréntesis o con punto, en la misma línea o en líneas separadas).
- El script debe separar el enunciado de las opciones usando reglas de patrón
  (`A)`, `a)`, `A.`, etc., con o sin salto de línea) y producir una lista estructurada
  de opciones (`clave`, `texto`).

### 2.2 Preguntas excluidas del banco
Se **excluyen** del banco final (no se importan a la app):
- Las preguntas cuyo texto no se pudo separar en opciones estructuradas de forma
  confiable (~819 detectadas en el análisis inicial).
- Las 4 preguntas sin `Respuesta correcta` registrada.

Banco final estimado: **≈ 9,676 preguntas**. El script de conversión debe imprimir al
final cuántas preguntas quedaron incluidas y cuántas excluidas (y por qué), para poder
verificarlo en cada reimportación.

### 2.3 Normalización de la respuesta correcta
`Respuesta correcta` viene en formatos inconsistentes (mayúscula, minúscula, con
paréntesis, texto completo de la opción, etc.). Se normaliza siempre a una sola letra
mayúscula (`A`–`E`) que debe coincidir con una de las claves de `opciones`. Si tras
normalizar no coincide con ninguna opción parseada, la pregunta se excluye (cae en el
grupo 2.2).

### 2.4 Especialidad compuesta
Cuando `Especialidad` trae varias especialidades separadas por `/` (ej.
`"Cardiología/Infectología"`, ~300 casos), la pregunta queda asociada a **ambas**
especialidades como una lista (`especialidades: string[]`). Cuenta para el resumen de
fallos y para los filtros de práctica de cada una por separado.

### 2.5 Campos faltantes
- Si `Tema` o `Especialidad` vienen vacíos (~20 filas), se guarda como
  `"Sin clasificar"` en vez de dejarlo vacío, para que no rompa agrupaciones ni filtros.
- Si `Retroalimentación` viene vacía (2 filas), se guarda como cadena vacía y la
  pantalla de pregunta simplemente no muestra sección de explicación para esa pregunta.
- La columna `Predicción` se descarta por completo (siempre vacía en el origen).

### 2.6 IDs estables — advertencia importante
El `#` del Excel se usa como identificador único de cada pregunta (`id`), y el
historial de respuestas se guarda ligado a ese `id`. **Para no perder o mezclar el
historial al actualizar el banco**, las preguntas existentes nunca deben renumerarse:
las preguntas nuevas siempre se agregan al final con números nuevos, y las que se
corrigen se editan en su misma fila sin cambiar su `#`.

### 2.7 Cuándo se actualiza el banco
La actualización del Excel a JSON es un paso manual que se hace "aparte" (no hay
pantalla de importación dentro de la app). Cada vez que Mateo edite el Excel, se vuelve
a correr el script de conversión y se reconstruye la app conservando el historial de
respuestas (que vive por separado, en el dispositivo).

---

## 3. Estructura de datos

### 3.1 `Pregunta` (banco estático, uno por pregunta, generado del Excel)
```
{
  id: number,                // columna "#" del Excel, estable, no se reutiliza
  enunciado: string,         // texto de la pregunta sin las opciones
  opciones: [
    { clave: "A", texto: string },
    { clave: "B", texto: string },
    ...
  ],
  respuestaCorrecta: string, // una de las claves de "opciones", ej. "B"
  especialidades: string[],  // 1 o 2 valores (split por "/")
  tema: string,               // "Sin clasificar" si venía vacío
  universidad: string,        // UDEA, UIS, UNIVALLE, NACIONAL, ROSARIO, UMNG,
                              // SANITAS, CES, FUCS, JAVERIANA, BOSQUE
  explicacion: string         // texto de "Retroalimentación", puede ser ""
}
```

### 3.2 `Intento` (historial, uno por cada respuesta dada, en IndexedDB)
```
{
  id: auto-incremental,
  preguntaId: number,
  fecha: string (ISO 8601),
  opcionElegida: string,   // clave de la opción que el usuario marcó
  correcta: boolean
}
```
Se guarda un `Intento` por cada respuesta, sin sobreescribir ni borrar intentos
anteriores: el historial completo se conserva siempre para poder ver fecha y evolución.

### 3.3 Estado derivado por pregunta (calculado desde los `Intento`, o mantenido como
tabla auxiliar en IndexedDB para no recalcular todo el historial en cada pantalla)
```
{
  preguntaId: number,
  totalIntentos: number,
  totalCorrectas: number,
  rachaCorrectaActual: number,  // aciertos consecutivos desde el último fallo
  enFallos: boolean,             // true si está pendiente de repasar
  ultimoIntento: string (ISO 8601)
}
```
**Regla de actualización:**
- Respuesta incorrecta → `enFallos = true`, `rachaCorrectaActual = 0`.
- Respuesta correcta → `rachaCorrectaActual += 1`; si `rachaCorrectaActual >= 2` →
  `enFallos = false`.
- Una pregunta nunca fallada tiene `enFallos = false` desde el inicio (no aparece en
  "Mis fallos" hasta que se falle al menos una vez).

### 3.4 Archivo de respaldo (exportado/importado por el usuario)
Un único archivo JSON descargable que contiene todos los `Intento` guardados (y,
opcionalmente, la tabla de estado derivado, que también puede recalcularse a partir de
los intentos). Debe incluir versión de formato y fecha de exportación para poder
validarlo al importar.

---

## 4. Pantallas

### 4.1 Inicio / Menú principal
Punto de entrada. Botones grandes y simples (pensado para uso desde el celular):
- Practicar mis fallos (muestra cuántas preguntas hay pendientes)
- Práctica libre
- Simulacro cronometrado
- Aleatorio (todo el banco)
- Mis fallos (resumen)
- Estadísticas
- Ajustes / Respaldo

### 4.2 Práctica libre — configuración
Antes de iniciar la sesión, el usuario elige:
- Especialidad(es) (multi-selección; opción "todas")
- Universidad/banco de examen (opcional, multi-selección; opción "todas")
- Cantidad de preguntas para esta sesión (el usuario la escribe/selecciona cada vez, sin
  valor por defecto fijo)

Al confirmar, arranca la pantalla de pregunta (4.5) con ese conjunto filtrado y
mezclado al azar.

### 4.3 Simulacro cronometrado — configuración
El usuario elige cuántas preguntas quiere (ej. 20, 50, 100). La app calcula y muestra un
tiempo sugerido (≈1.5 min por pregunta) antes de empezar. Durante el simulacro se ve un
cronómetro corriendo. El feedback sigue siendo inmediato tras cada pregunta (igual que
en los demás modos — no se oculta hasta el final). Si el tiempo se agota, la sesión
termina y pasa directo al resumen (4.6) con las preguntas no respondidas marcadas como
tal.

### 4.4 Mis fallos — practicar
Arranca directo una sesión con todas las preguntas que actualmente tienen
`enFallos = true` (con opción de filtrar antes por especialidad, reutilizando el mismo
selector que 4.2).

### 4.5 Pantalla de pregunta (compartida por todos los modos)
- Muestra el enunciado, las opciones como botones grandes.
- Al seleccionar una opción: se marca en verde (correcta) o rojo (incorrecta, mostrando
  también cuál era la correcta), y aparece el texto de `explicacion` debajo.
- Se registra un `Intento` en cuanto el usuario responde.
- Botón "Siguiente" para avanzar (el usuario controla el ritmo, no hay avance
  automático).
- Muestra discretamente `especialidad`, `tema` y `universidad` de la pregunta actual
  (como etiquetas pequeñas, no intrusivas).
- Barra de progreso de la sesión (ej. "7 / 20").

### 4.6 Resumen de sesión
Al terminar una sesión (de cualquier modo): puntaje (aciertos/total), tiempo tomado (si
aplica), y lista de las preguntas de esa sesión con su resultado, con posibilidad de
volver a leer la explicación de cualquiera.

### 4.7 Mis fallos — resumen
Lista agrupada **por especialidad** (no por tema, porque el tema es casi único por
pregunta y no sirve como categoría de resumen). Por cada especialidad con fallos
pendientes se muestra el conteo total, y al entrar se despliega la lista de preguntas
falladas de esa especialidad mostrando su `tema` como subtítulo de cada una. Desde aquí
se puede lanzar "Practicar estos fallos" para esa especialidad o para todas.

### 4.8 Estadísticas
Pantalla simple de solo lectura:
- % de aciertos global (sobre el total de intentos)
- Preguntas distintas intentadas / total del banco (ej. "3,204 / 9,676")
- Lista de % de aciertos por especialidad

### 4.9 Ajustes / Respaldo
- "Guardar copia": descarga el archivo de respaldo (ver 3.4).
- "Restaurar copia": permite elegir un archivo de respaldo previamente guardado y
  recupera el historial de intentos.
- Información de versión del banco de preguntas (fecha de la última conversión del
  Excel, cantidad de preguntas incluidas).

---

## 5. Fuera de alcance (explícitamente no incluido en esta versión)

- **Imágenes o figuras**: el banco de datos no contiene imágenes adjuntas (los hallazgos
  de imágenes solo se describen en texto); no se agrega soporte para adjuntar o mostrar
  imágenes.
- **Dificultad de las preguntas**: el Excel no tiene ese campo; no se implementa
  selección ni cálculo de dificultad en esta versión.
- **Sincronización automática multi-dispositivo / nube**: el respaldo es manual
  (exportar/importar un archivo), no hay cuenta de usuario ni sincronización en tiempo
  real entre dispositivos.
- **Edición de preguntas dentro de la app**: las correcciones al contenido se hacen en
  el Excel original y se reimportan aparte; la app no permite editar preguntas.
- **Agrupación automática de temas por similitud semántica**: se descartó a favor de
  agrupar solo por especialidad.
- **Multiusuario / login**: la app está pensada para una sola persona por instalación.
- **Re-importación del Excel desde dentro de la app**: la conversión Excel → JSON es un
  paso manual aparte, no una función de la interfaz.
- **Las ~823 preguntas problemáticas del banco original** (sin opciones parseables o sin
  respuesta correcta) no se incluyen en esta versión.

---

## 6. Checklist final de verificación

Antes de dar la app por terminada, comprobar en el dispositivo real (no solo en el
computador de desarrollo):

- [ ] La app se puede **instalar** como aplicación (ícono en pantalla de inicio) tanto
      en **Windows** (Edge/Chrome) como en **Android** (Chrome).
- [ ] Tras la primera carga, **funciona sin internet** (activar modo avión y volver a
      abrir la app instalada).
- [ ] El banco de preguntas cargado tiene la cantidad esperada de preguntas (≈9,676) y
      ninguna aparece con opciones rotas o sin respuesta correcta.
- [ ] Al responder una pregunta, el feedback (correcto/incorrecto + explicación)
      aparece **inmediatamente**.
- [ ] Cada respuesta dada queda registrada (verificar en Estadísticas que el contador de
      intentos sube).
- [ ] Fallar una pregunta la hace aparecer en **Mis fallos**, agrupada bajo su
      especialidad correcta.
- [ ] Una pregunta fallada **no** desaparece de Mis fallos tras acertarla una sola vez,
      pero **sí** desaparece tras acertarla **2 veces seguidas**.
- [ ] Una pregunta con especialidad compuesta (ej. "Cardiología/Infectología") aparece
      en el resumen de fallos de **ambas** especialidades si se falla.
- [ ] Se puede filtrar la práctica libre por especialidad y por universidad, y elegir
      la cantidad de preguntas cada vez.
- [ ] Se puede correr un simulacro cronometrado eligiendo la cantidad de preguntas, con
      cronómetro visible.
- [ ] "Guardar copia" descarga un archivo de respaldo; borrar los datos del navegador y
      luego "Restaurar copia" con ese archivo recupera el historial completo (los
      contadores de Estadísticas y Mis fallos vuelven a como estaban).
- [ ] La pantalla de Estadísticas refleja correctamente el % de aciertos global y por
      especialidad.
- [ ] La interfaz es usable con una sola mano en un celular (botones grandes, texto
      legible sin hacer zoom).
