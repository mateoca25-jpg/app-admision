"""
Aplica datos/mapeo_materias.csv a datos/preguntas.json: reemplaza cada valor
de "materia" por su materia_final propuesta (ya revisada por Mateo).

No toca el Excel original. Si se vuelve a correr scripts/convertir_excel.py
despues de editar el Excel, hay que volver a correr este script (o revisar
si el mapeo sigue vigente) porque convertir_excel.py parte otra vez de las
materias crudas del Excel.

Uso:
    python scripts/generar_mapeo_materias.py   (si el CSV necesita regenerarse)
    python scripts/aplicar_mapeo_materias.py
    python scripts/validar_preguntas.py
"""

import csv
import json
import sys
from collections import Counter
from pathlib import Path

RUTA_JSON = Path(__file__).resolve().parent.parent / "datos" / "preguntas.json"
RUTA_CSV = Path(__file__).resolve().parent.parent / "datos" / "mapeo_materias.csv"


def cargar_mapeo():
    mapeo = {}
    with RUTA_CSV.open(encoding="utf-8-sig", newline="") as f:
        for fila in csv.DictReader(f):
            mapeo[fila["variante_original"]] = fila["materia_final"]
    return mapeo


def aplicar():
    mapeo = cargar_mapeo()
    data = json.loads(RUTA_JSON.read_text(encoding="utf-8"))

    sin_mapeo = set()
    cambios = 0
    for q in data:
        materias_nuevas = []
        for m in q["materia"]:
            if m not in mapeo:
                sin_mapeo.add(m)
                materias_nuevas.append(m)
                continue
            final = mapeo[m]
            if final != m:
                cambios += 1
            if final not in materias_nuevas:
                materias_nuevas.append(final)
        q["materia"] = materias_nuevas

    if sin_mapeo:
        print("ERROR: estas materias no estan en mapeo_materias.csv:", file=sys.stderr)
        for m in sorted(sin_mapeo):
            print(f"  {m!r}", file=sys.stderr)
        print("Corre scripts/generar_mapeo_materias.py para actualizar el CSV.", file=sys.stderr)
        sys.exit(1)

    RUTA_JSON.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    conteo_final = Counter()
    for q in data:
        for m in q["materia"]:
            conteo_final[m] += 1

    print(f"Preguntas actualizadas: {len(data)}")
    print(f"Valores de materia reemplazados: {cambios}")
    print(f"Materias finales distintas: {len(conteo_final)}")
    print()
    print("=== Preguntas por materia (tras aplicar el mapeo) ===")
    for materia, cantidad in sorted(conteo_final.items(), key=lambda x: -x[1]):
        print(f"  {materia}: {cantidad}")
    print()
    print(f"Guardado: {RUTA_JSON}")


if __name__ == "__main__":
    if not RUTA_CSV.exists():
        print(f"No existe {RUTA_CSV}. Corre primero scripts/generar_mapeo_materias.py", file=sys.stderr)
        sys.exit(1)
    aplicar()
