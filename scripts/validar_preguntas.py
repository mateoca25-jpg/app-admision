"""
Revisa datos/preguntas.json y muestra un reporte de salud del banco de
preguntas: total por materia, y cualquier pregunta con problemas.

No modifica preguntas.json ni inventa datos: solo reporta lo que encuentra,
para que Mateo decida que corregir en el Excel original.

Uso:
    python scripts/validar_preguntas.py
"""

import json
import sys
from collections import Counter
from pathlib import Path

RUTA_JSON = Path(__file__).resolve().parent.parent / "datos" / "preguntas.json"


def validar():
    data = json.loads(RUTA_JSON.read_text(encoding="utf-8"))

    problemas = []  # (id, descripcion)
    ids_vistos = Counter()
    conteo_por_materia = Counter()

    for q in data:
        id_pregunta = q.get("id")
        ids_vistos[id_pregunta] += 1

        opciones = q.get("opciones") or []
        claves_opciones = {o.get("clave") for o in opciones}

        if not q.get("respuesta_correcta"):
            problemas.append((id_pregunta, "sin respuesta_correcta"))
        elif q["respuesta_correcta"] not in claves_opciones:
            problemas.append((
                id_pregunta,
                f"respuesta_correcta '{q['respuesta_correcta']}' no esta entre las opciones {sorted(claves_opciones)}",
            ))

        materias = q.get("materia") or []
        if not materias:
            problemas.append((id_pregunta, "sin materia"))
        else:
            for m in materias:
                conteo_por_materia[m] += 1

        if not q.get("tema"):
            problemas.append((id_pregunta, "sin tema"))

        if not q.get("enunciado"):
            problemas.append((id_pregunta, "sin enunciado"))

        if len(opciones) < 2:
            problemas.append((id_pregunta, "menos de 2 opciones"))

    ids_duplicados = [id_ for id_, cant in ids_vistos.items() if cant > 1]
    for id_dup in ids_duplicados:
        problemas.append((id_dup, f"id duplicado (aparece {ids_vistos[id_dup]} veces)"))

    # --- Reporte ---
    print(f"Total de preguntas en el banco: {len(data)}")
    print()
    print("Preguntas por materia:")
    for materia, cantidad in sorted(conteo_por_materia.items(), key=lambda x: -x[1]):
        print(f"  {materia}: {cantidad}")
    print()

    if problemas:
        print(f"Preguntas con problemas ({len(problemas)}):")
        for id_pregunta, descripcion in problemas:
            print(f"  id {id_pregunta}: {descripcion}")
    else:
        print("No se encontraron problemas estructurales.")

    return len(problemas) == 0


if __name__ == "__main__":
    if not RUTA_JSON.exists():
        print(f"No existe {RUTA_JSON}. Corre primero scripts/convertir_excel.py", file=sys.stderr)
        sys.exit(1)
    ok = validar()
    sys.exit(0 if ok else 1)
