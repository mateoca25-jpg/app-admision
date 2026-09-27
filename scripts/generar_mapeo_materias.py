"""
Genera datos/mapeo_materias.csv: una propuesta de nombre canonico por cada
variante de "materia" (Especialidad) encontrada en datos/preguntas.json.

Esto NO modifica preguntas.json. Es solo una propuesta para que Mateo la
revise en Excel/CSV antes de aplicarla (paso aparte, a pedido explicito).

Uso:
    python scripts/generar_mapeo_materias.py
"""

import csv
import json
import sys
from collections import Counter
from pathlib import Path

RUTA_JSON = Path(__file__).resolve().parent.parent / "datos" / "preguntas.json"
RUTA_CSV = Path(__file__).resolve().parent.parent / "datos" / "mapeo_materias.csv"

# variante_original (tal cual aparece en preguntas.json) -> (materia_final propuesta, dudosa)
#
# Reglas que segui para decidir sin "adivinar":
# - Fusiono variantes que son claramente lo mismo escrito distinto: mayus/minus,
#   tildes, singular/plural, o abreviaturas estandar sin ambiguedad (ej. "Cardio"
#   -> "Cardiologia", "ORL" -> "Otorrinolaringologia").
#   deportes en la version original.
# - Fusiono nombres formales de especialidades combinadas conocidas (ej.
#   "Medicina Preventiva" + "Salud Publica" porque la especialidad formal es
#   "Medicina Preventiva y Salud Publica"; "Metabolismo" + "Endocrinologia"
#   porque la especialidad formal es "Endocrinologia y Metabolismo").
# - NO fusiono subespecialidades reales aunque tengan pocas preguntas (ej.
#   "Cardiologia Pediatrica", "Cirugia Pediatrica"): son terminos validos y
#   distintos, solo les corrijo mayusculas/tildes.
# - Marco DUDOSA cuando el termino no es un nombre de especialidad (es un tema,
#   una enfermedad, o algo no medico), o cuando podria pertenecer a mas de una
#   especialidad ya presente en la lista sin forma de saber cual sin adivinar.
MAPEO = {
    "Alergología": ("Alergología", False),
    "Anatomía": ("Anatomía", False),
    "Anatomía Patológica": ("Anatomía Patológica", False),
    "Anestesia": ("Anestesiología", False),
    "Anestesiología": ("Anestesiología", False),
    "Angiología": ("Angiología", False),
    "Arte": ("DUDOSA", True),
    "Biología Celular": ("Biología Celular", False),
    "Biología Molecular": ("Biología Molecular", False),
    "Biología celular": ("Biología Celular", False),
    "Bioquímica": ("Bioquímica", False),
    "Bioética": ("Bioética", False),
    "Botánica": ("DUDOSA", True),
    "Cardio": ("Cardiología", False),
    "Cardiología": ("Cardiología", False),
    "Cardiología Pediátrica": ("Cardiología Pediátrica", False),
    "Ciclo Celular": ("DUDOSA", True),
    "Cirugía": ("Cirugía", False),
    "Cirugía Cardiaca": ("Cirugía Cardiaca", False),
    "Cirugía Cardiovascular": ("Cirugía Cardiovascular", False),
    "Cirugía Digestiva": ("Cirugía Digestiva", False),
    "Cirugía General": ("Cirugía General", False),
    "Cirugía General -": ("Cirugía General", False),
    "Cirugía Maxilofacial": ("Cirugía Maxilofacial", False),
    "Cirugía Ortopédica": ("Ortopedia", False),
    "Cirugía Pediátrica": ("Cirugía Pediátrica", False),
    "Cirugía Torácica": ("Cirugía Torácica", False),
    "Cirugía Vascular": ("Cirugía Vascular", False),
    "Cirugía de Emergencias": ("Cirugía de Emergencias", False),
    "Cirugía de Trauma": ("Cirugía de Trauma", False),
    "Cirugía general": ("Cirugía General", False),
    "Cirugía torácica": ("Cirugía Torácica", False),
    "Cirugía vascular": ("Cirugía Vascular", False),
    "Crítica": ("DUDOSA", True),
    "Críticos": ("DUDOSA", True),
    "Cuidado Paliativo": ("Cuidados Paliativos", False),
    "Cuidados Críticos": ("Medicina Intensiva", False),
    "Cuidados Paliativos": ("Cuidados Paliativos", False),
    "Cultura y Sociedad": ("DUDOSA", True),
    "Cx general": ("Cirugía General", False),
    "Derecho": ("DUDOSA", True),
    "Derecho Médico": ("DUDOSA", True),
    "Dermatología": ("Dermatología", False),
    "ETS": ("DUDOSA", True),
    "Economía de la Salud": ("DUDOSA", True),
    "Electrofisiología": ("Electrofisiología", False),
    "Electrolitos": ("DUDOSA", True),
    "Embriología": ("Embriología", False),
    "Emergencia": ("DUDOSA", True),
    "Emergencias": ("DUDOSA", True),
    "Endocrino": ("Endocrinología", False),
    "Endocrinología": ("Endocrinología", False),
    "Epidemiología": ("Epidemiología", False),
    "Estadística": ("Epidemiología", False),
    "Farmacología": ("Farmacología", False),
    "Fauna Colombiana": ("DUDOSA", True),
    "Fisiología": ("Fisiología", False),
    "Fisiología Renal": ("Fisiología", False),
    "Fisiología del músculo": ("Fisiología", False),
    "Fisiología respiratoria": ("Fisiología", False),
    "Flebolinfología": ("Flebolinfología", False),
    "Flebología": ("Flebología", False),
    "Gastro": ("Gastroenterología", False),
    "Gastroenterología": ("Gastroenterología", False),
    "Genética": ("Genética", False),
    "Genética Médica": ("Genética", False),
    "Genética médica": ("Genética", False),
    "Geografía": ("DUDOSA", True),
    "Geriatría": ("Geriatría", False),
    "Gineco-Obst": ("Ginecología y Obstetricia", False),
    "Gineco-Obstetricia": ("Ginecología y Obstetricia", False),
    "Gineco-obstetricia": ("Ginecología y Obstetricia", False),
    "Gineco-oncología": ("Ginecología Oncológica", False),
    "Ginecología": ("Ginecología", False),
    "Ginecología Oncológica": ("Ginecología Oncológica", False),
    "Ginecología y Obstetricia": ("Ginecología y Obstetricia", False),
    "Ginecoobstetricia": ("Ginecología y Obstetricia", False),
    "HLH": ("DUDOSA", True),
    "Hemato-oncología": ("Hemato-oncología", False),
    "Hematologia": ("Hematología", False),
    "Hematología": ("Hematología", False),
    "Hepatología": ("Hepatología", False),
    "Histología": ("Histología", False),
    "Infecciones": ("Infectología", False),
    "Infecciosas": ("Infectología", False),
    "Infeccioso": ("Infectología", False),
    "Infectología": ("Infectología", False),
    "Inmunología": ("Inmunología", False),
    "Legal": ("DUDOSA", True),
    "Legislación": ("Legislación Colombiana", False),
    "Legislación Colombia": ("Legislación Colombiana", False),
    "Legislación Colombiana": ("Legislación Colombiana", False),
    "Literatura": ("DUDOSA", True),
    "Logopedia": ("Logopedia", False),
    "Malaria": ("DUDOSA", True),
    "Mamología": ("Mamología", False),
    "Mastología": ("Mamología", False),
    "Medicina Basada en la Evidencia": ("Medicina Basada en la Evidencia", False),
    "Medicina Crítica": ("Medicina Intensiva", False),
    "Medicina Deportiva": ("Medicina Deportiva", False),
    "Medicina General": ("Medicina General", False),
    "Medicina Histórica": ("DUDOSA", True),
    "Medicina Intensiva": ("Medicina Intensiva", False),
    "Medicina Interna": ("Medicina Interna", False),
    "Medicina Laboral": ("Medicina Laboral", False),
    "Medicina Legal": ("Medicina Legal", False),
    "Medicina Paliativa": ("Cuidados Paliativos", False),
    "Medicina Preventiva": ("Salud Pública", False),
    "Medicina Tropical": ("Medicina Tropical", False),
    "Medicina de Emergencias": ("DUDOSA", True),
    "Medicina de Urgencias": ("Urgencias", False),
    "Medicina de urgencias": ("Urgencias", False),
    "Medicina del Trabajo": ("Medicina Laboral", False),
    "Medicina general": ("Medicina General", False),
    "Medicina interna": ("Medicina Interna", False),
    "Medicina legal": ("Medicina Legal", False),
    "Medicina tropical": ("Medicina Tropical", False),
    "Metabolismo": ("Endocrinología", False),
    "Microbiología": ("Microbiología", False),
    "Músculoesquel": ("DUDOSA", True),
    "Música": ("DUDOSA", True),
    "Nefrología": ("Nefrología", False),
    "Neonatología": ("Neonatología", False),
    "Neumo": ("Neumología", False),
    "Neumología": ("Neumología", False),
    "Neuro": ("Neurología", False),
    "Neuroanatomía": ("Neuroanatomía", False),
    "Neurociencia": ("Neurociencias", False),
    "Neurociencias": ("Neurociencias", False),
    "Neurocirugía": ("Neurocirugía", False),
    "Neurología": ("Neurología", False),
    "Neurología Pediátrica": ("Neurología Pediátrica", False),
    "Neuropsicología": ("Neuropsicología", False),
    "Neurotrauma": ("Neurotrauma", False),
    "Nutrición": ("Nutrición", False),
    "ORL": ("Otorrinolaringología", False),
    "Obstetricia": ("Obstetricia", False),
    "Obstetricia y Ginecología": ("Ginecología y Obstetricia", False),
    "Oftalmología": ("Oftalmología", False),
    "Oftalmología Pediátrica": ("Oftalmología Pediátrica", False),
    "Oncología": ("Oncología", False),
    "Oncología Pediátrica": ("Oncología Pediátrica", False),
    "Oncológico": ("Oncología", False),
    "Ortopedia": ("Ortopedia", False),
    "Ortopedia Pediátrica": ("Ortopedia Pediátrica", False),
    "Osteología": ("Osteología", False),
    "Osteoporosis": ("DUDOSA", True),
    "Otorrino": ("Otorrinolaringología", False),
    "Otorrinolaringología": ("Otorrinolaringología", False),
    "Parasitología": ("Parasitología", False),
    "Patología": ("DUDOSA", True),
    "Pedia": ("Pediatría", False),
    "Pediatria": ("Pediatría", False),
    "Pediatría": ("Pediatría", False),
    "Psicología": ("Psicología", False),
    "Psiquiatría": ("Psiquiatría", False),
    "Radiología": ("Radiología", False),
    "Reanimación": ("DUDOSA", True),
    "Rehabilitación": ("Rehabilitación", False),
    "Respiratorio": ("DUDOSA", True),
    "Reuma": ("Reumatología", False),
    "Reumatología": ("Reumatología", False),
    "Salud Materno-Perinatal": ("Salud Materno-Perinatal", False),
    "Salud Publica": ("Salud Pública", False),
    "Salud Pública": ("Salud Pública", False),
    "Salud pública": ("Salud Pública", False),
    "Seguridad del paciente": ("Seguridad del paciente", False),
    "Seguridad social": ("Seguridad social", False),
    "Sin clasificar": ("Sin clasificar", False),
    "Síndrome de ASIA": ("DUDOSA", True),
    "TBC": ("DUDOSA", True),
    "Terminal": ("DUDOSA", True),
    "Toxicología": ("Toxicología", False),
    "Trasplante": ("Trasplantes", False),
    "Trasplantes": ("Trasplantes", False),
    "Trauma": ("DUDOSA", True),
    "Traumatología": ("Traumatología", False),
    "Tropical": ("Medicina Tropical", False),
    "UCI": ("Medicina Intensiva", False),
    "Urgencias": ("Urgencias", False),
    "Uroginecología": ("Uroginecología", False),
    "Urología": ("Urología", False),
    "VIH": ("DUDOSA", True),
    "Vacunas": ("DUDOSA", True),
    "Vascular": ("DUDOSA", True),
    "inecología": ("Ginecología", False),
    "Ética Médica": ("Ética Médica", False),
    "Ética médica": ("Ética Médica", False),
}


def generar():
    data = json.loads(RUTA_JSON.read_text(encoding="utf-8"))
    conteo = Counter()
    for q in data:
        for m in q["materia"]:
            conteo[m] += 1

    faltantes = sorted(set(conteo) - set(MAPEO))
    if faltantes:
        print("ERROR: hay variantes en preguntas.json que no estan en MAPEO:", file=sys.stderr)
        for f in faltantes:
            print(f"  {f!r} ({conteo[f]} preguntas)", file=sys.stderr)
        sys.exit(1)

    filas = []
    for variante, cantidad in conteo.items():
        materia_final, dudosa = MAPEO[variante]
        filas.append({
            "variante_original": variante,
            "materia_final": materia_final,
            "numero_de_preguntas": cantidad,
            "dudosa": "sí" if dudosa else "no",
        })

    filas.sort(key=lambda f: (f["materia_final"], -f["numero_de_preguntas"]))

    with RUTA_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["variante_original", "materia_final", "numero_de_preguntas", "dudosa"])
        writer.writeheader()
        writer.writerows(filas)

    # --- Reportes en pantalla ---
    totales_finales = Counter()
    for fila in filas:
        totales_finales[fila["materia_final"]] += fila["numero_de_preguntas"]

    print(f"Variantes originales: {len(conteo)}")
    print(f"Materias finales propuestas (incluyendo DUDOSA): {len(totales_finales)}")
    print()
    print("=== Lista final de materias con cantidad de preguntas ===")
    for materia, cantidad in sorted(totales_finales.items(), key=lambda x: -x[1]):
        print(f"  {materia}: {cantidad}")

    print()
    dudosas = [f for f in filas if f["dudosa"] == "sí"]
    print(f"=== Variantes marcadas como DUDOSA ({len(dudosas)}) ===")
    for f in sorted(dudosas, key=lambda x: -x["numero_de_preguntas"]):
        print(f"  {f['variante_original']!r}: {f['numero_de_preguntas']} preguntas")

    print()
    print(f"Guardado: {RUTA_CSV}")


if __name__ == "__main__":
    generar()
