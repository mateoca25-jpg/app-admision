"""
Convierte datos/Banco_de_10000_Preguntas.xlsx a datos/preguntas.json.

Este script se corre a mano cada vez que Mateo edita el Excel (ver SPEC.md
seccion 2). No es parte de la app: la app solo lee el JSON generado.

Uso:
    python scripts/convertir_excel.py

Reglas de conversion (ver SPEC.md seccion 2 para el detalle completo):
- El enunciado y las opciones vienen mezclados en la columna "Pregunta" en
  varios formatos distintos (A) / a) / A. / a. / en la misma linea o en
  lineas separadas). Se separan con un detector de patrones.
- La "Respuesta correcta" se normaliza siempre a una sola letra (A-E) que
  debe coincidir con una de las opciones encontradas.
- Se excluyen las preguntas que no se pudieron separar en opciones de forma
  confiable, las que no tienen respuesta correcta, y las que tienen una
  respuesta correcta que no coincide con ninguna opcion. Estas NUNCA se
  inventan: quedan registradas en datos/preguntas_excluidas.json para que
  Mateo las revise y las corrija en el Excel si quiere.
- El "#" del Excel se usa como id estable (nunca se renumera).
"""

import json
import re
import sys
from pathlib import Path

import pandas as pd

RUTA_EXCEL = Path(__file__).resolve().parent.parent / "datos" / "Banco_de_10000_Preguntas.xlsx"
RUTA_JSON_SALIDA = Path(__file__).resolve().parent.parent / "datos" / "preguntas.json"
RUTA_EXCLUIDAS = Path(__file__).resolve().parent.parent / "datos" / "preguntas_excluidas.json"

# La hoja tiene 2 filas de adorno antes del encabezado real (ver fila 2 = "#", "Pregunta", ...)
FILA_ENCABEZADO = 2

# Letra de opcion (A-E), seguida de ")" "." o ">" (el Excel usa las 3), sin que el
# caracter anterior sea alfanumerico (para no matchear "vs." o abreviaturas dentro
# de una palabra).
MARCADOR_MAYUS = re.compile(r"(?<![A-Za-z0-9])([A-E])[\)\.>]\s*")
MARCADOR_MINUS = re.compile(r"(?<![A-Za-z0-9])([a-e])[\)\.>]\s*")

# Letra sola al inicio de "Respuesta correcta" (A-E), como token independiente:
# "B", "b", "B)", "d (por extrapolacion)" -> todas extraen la letra.
# "Todos se evaluan" / "Ninguna es correcta" -> no matchean, se descartan.
RESPUESTA_LETRA = re.compile(r"^\s*([A-Ea-e])(?=[\)\.\s]|$)")


def encontrar_marcadores_reales(texto, patron):
    """Busca ocurrencias del patron que formen una secuencia A, B, C, D, (E) en orden."""
    encontrados = []
    esperado = ord("A")
    for m in patron.finditer(texto):
        letra = m.group(1).upper()
        if ord(letra) == esperado:
            encontrados.append(m)
            esperado += 1
            if esperado > ord("E"):
                break
    return encontrados


def separar_enunciado_y_opciones(texto_pregunta):
    """
    Devuelve (enunciado, [{clave, texto}, ...]) o (None, None) si no se pudo
    separar de forma confiable.
    """
    texto = str(texto_pregunta).replace("\\n", "\n").replace("\\r", "\n")

    marcadores_mayus = encontrar_marcadores_reales(texto, MARCADOR_MAYUS)
    marcadores_minus = encontrar_marcadores_reales(texto, MARCADOR_MINUS)
    marcadores = marcadores_mayus if len(marcadores_mayus) >= len(marcadores_minus) else marcadores_minus

    if len(marcadores) < 2:
        return None, None

    enunciado = texto[: marcadores[0].start()].strip()
    if not enunciado:
        return None, None

    opciones = []
    for i, m in enumerate(marcadores):
        inicio_texto = m.end()
        fin_texto = marcadores[i + 1].start() if i + 1 < len(marcadores) else len(texto)
        texto_opcion = texto[inicio_texto:fin_texto].strip()
        if not texto_opcion:
            return None, None
        opciones.append({"clave": m.group(1).upper(), "texto": texto_opcion})

    return enunciado, opciones


def normalizar_respuesta_correcta(valor):
    if pd.isna(valor):
        return None
    m = RESPUESTA_LETRA.match(str(valor))
    if not m:
        return None
    return m.group(1).upper()


def normalizar_materia(valor):
    if pd.isna(valor) or not str(valor).strip():
        return ["Sin clasificar"]
    return [parte.strip() for parte in str(valor).split("/") if parte.strip()]


def normalizar_tema(valor):
    if pd.isna(valor) or not str(valor).strip():
        return "Sin clasificar"
    return str(valor).strip()


def normalizar_explicacion(valor):
    if pd.isna(valor):
        return ""
    return str(valor).strip()


def convertir():
    df = pd.read_excel(RUTA_EXCEL, header=FILA_ENCABEZADO)

    preguntas = []
    excluidas = []

    for _, fila in df.iterrows():
        id_pregunta = int(fila["#"])

        enunciado, opciones = separar_enunciado_y_opciones(fila["Pregunta"])
        if opciones is None:
            excluidas.append({
                "id": id_pregunta,
                "motivo": "no_se_pudieron_separar_las_opciones",
                "texto_original": str(fila["Pregunta"])[:300],
            })
            continue

        claves_validas = {o["clave"] for o in opciones}

        respuesta_correcta = normalizar_respuesta_correcta(fila["Respuesta correcta"])
        if respuesta_correcta is None:
            excluidas.append({
                "id": id_pregunta,
                "motivo": "sin_respuesta_correcta_valida",
                "respuesta_original": None if pd.isna(fila["Respuesta correcta"]) else str(fila["Respuesta correcta"]),
            })
            continue

        if respuesta_correcta not in claves_validas:
            excluidas.append({
                "id": id_pregunta,
                "motivo": "respuesta_correcta_no_coincide_con_ninguna_opcion",
                "respuesta_original": str(fila["Respuesta correcta"]),
                "opciones_encontradas": sorted(claves_validas),
            })
            continue

        preguntas.append({
            "id": id_pregunta,
            "universidad": str(fila["Universidad"]).strip(),
            "materia": normalizar_materia(fila["Especialidad"]),
            "tema": normalizar_tema(fila["Tema"]),
            "enunciado": enunciado,
            "opciones": opciones,
            "respuesta_correcta": respuesta_correcta,
            "explicacion": normalizar_explicacion(fila["Retroalimentación"]),
        })

    RUTA_JSON_SALIDA.write_text(
        json.dumps(preguntas, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    RUTA_EXCLUIDAS.write_text(
        json.dumps(excluidas, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Filas leidas del Excel:      {len(df)}")
    print(f"Preguntas incluidas:         {len(preguntas)}")
    print(f"Preguntas excluidas:         {len(excluidas)}")
    print()
    print("Motivos de exclusion:")
    motivos = {}
    for e in excluidas:
        motivos[e["motivo"]] = motivos.get(e["motivo"], 0) + 1
    for motivo, cantidad in sorted(motivos.items(), key=lambda x: -x[1]):
        print(f"  {motivo}: {cantidad}")
    print()
    print(f"Guardado: {RUTA_JSON_SALIDA}")
    print(f"Guardado: {RUTA_EXCLUIDAS}  (para que revises las excluidas)")


if __name__ == "__main__":
    if not RUTA_EXCEL.exists():
        print(f"No se encontro el Excel en: {RUTA_EXCEL}", file=sys.stderr)
        sys.exit(1)
    convertir()
