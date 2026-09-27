"""Genera los iconos de la PWA (carpeta icons/) a partir de formas simples,
sin depender de ningun archivo de imagen externo. Correr con:

    python scripts/generar_iconos.py

Regenera siempre los 4 archivos; no hace falta correrlo salvo que se quiera
cambiar el diseño del icono.
"""

from pathlib import Path
from PIL import Image, ImageDraw

CARPETA_ICONOS = Path(__file__).resolve().parent.parent / "icons"

COLOR_FONDO = (37, 99, 235)  # mismo azul que --color-primario en css/estilos.css
COLOR_FIGURA = (255, 255, 255)


def dibujar_cruz(draw, centro_x, centro_y, largo, grosor, color):
    mitad_largo = largo / 2
    mitad_grosor = grosor / 2
    draw.rounded_rectangle(
        [centro_x - mitad_grosor, centro_y - mitad_largo, centro_x + mitad_grosor, centro_y + mitad_largo],
        radius=mitad_grosor,
        fill=color,
    )
    draw.rounded_rectangle(
        [centro_x - mitad_largo, centro_y - mitad_grosor, centro_x + mitad_largo, centro_y + mitad_grosor],
        radius=mitad_grosor,
        fill=color,
    )


def generar_icono(tamano, radio_esquina, factor_cruz, archivo):
    imagen = Image.new("RGBA", (tamano, tamano), (0, 0, 0, 0))
    draw = ImageDraw.Draw(imagen)
    draw.rounded_rectangle([0, 0, tamano - 1, tamano - 1], radius=radio_esquina, fill=COLOR_FONDO)

    largo_cruz = tamano * factor_cruz
    grosor_cruz = largo_cruz * 0.32
    dibujar_cruz(draw, tamano / 2, tamano / 2, largo_cruz, grosor_cruz, COLOR_FIGURA)

    imagen.save(archivo)
    print(f"Generado {archivo} ({tamano}x{tamano})")


def main():
    CARPETA_ICONOS.mkdir(exist_ok=True)

    # Iconos normales (purpose "any"): esquinas redondeadas, la cruz ocupa buena parte.
    generar_icono(192, 192 * 0.18, 0.5, CARPETA_ICONOS / "icon-192.png")
    generar_icono(512, 512 * 0.18, 0.5, CARPETA_ICONOS / "icon-512.png")

    # Iconos "maskable": sin redondear (el sistema operativo recorta la forma final)
    # y con más margen alrededor para que nada se corte al aplicar esa máscara.
    generar_icono(192, 0, 0.35, CARPETA_ICONOS / "icon-maskable-192.png")
    generar_icono(512, 0, 0.35, CARPETA_ICONOS / "icon-maskable-512.png")


if __name__ == "__main__":
    main()
