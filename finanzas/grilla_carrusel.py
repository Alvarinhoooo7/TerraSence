# -*- coding: utf-8 -*-
"""Arma la grilla de las siete imágenes del carrusel desde las diapositivas.

`carrusel_grilla.png` es la figura que el informe de marketing incrusta para
mostrar el carrusel completo. No es una captura más: es el montaje de las siete
diapositivas en cuatro columnas y dos filas, con la segunda fila centrada. Se
arma aquí para que no haya que rehacerlo a mano cada vez que cambia una cifra.

Las diapositivas se capturan desde `Carrusel/carrusel.html` con la vista
`#slide-N` a 1080 × 1350; este script sólo las compone.
"""
import os
import sys

from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
CARRUSEL = os.path.normpath(os.path.join(
    BASE, "..", "Comercializacion de Tecnologias", "Unidad 2", "Carrusel"))

ANCHO, ALTO = 2310, 1440        # tamaño de la figura, el mismo que incrusta el informe
COL, MARGEN, HUECO = 4, 20, 20
LAMINA_W = (ANCHO - 2 * MARGEN - (COL - 1) * HUECO) // COL
LAMINA_H = round(LAMINA_W * 1350 / 1080)
FONDO = (255, 255, 255)


def montar():
    laminas = []
    for i in range(1, 8):
        ruta = os.path.join(CARRUSEL, "slide_%d.png" % i)
        if not os.path.exists(ruta):
            sys.exit("falta %s" % ruta)
        img = Image.open(ruta).convert("RGB")
        if img.size != (1080, 1350):
            sys.exit("slide_%d.png mide %dx%d y debe medir 1080x1350" % (i, *img.size))
        laminas.append(img.resize((LAMINA_W, LAMINA_H), Image.LANCZOS))

    lienzo = Image.new("RGB", (ANCHO, ALTO), FONDO)
    y1 = MARGEN
    for c, img in enumerate(laminas[:4]):
        lienzo.paste(img, (MARGEN + c * (LAMINA_W + HUECO), y1))
    y2 = y1 + LAMINA_H + HUECO
    fila2 = 3 * LAMINA_W + 2 * HUECO
    x2 = (ANCHO - fila2) // 2
    for c, img in enumerate(laminas[4:]):
        lienzo.paste(img, (x2 + c * (LAMINA_W + HUECO), y2))

    destino = os.path.join(CARRUSEL, "carrusel_grilla.png")
    lienzo.save(destino, "PNG", optimize=True)
    print("carrusel_grilla.png: %dx%d con láminas de %dx%d"
          % (ANCHO, ALTO, LAMINA_W, LAMINA_H))


if __name__ == "__main__":
    montar()
