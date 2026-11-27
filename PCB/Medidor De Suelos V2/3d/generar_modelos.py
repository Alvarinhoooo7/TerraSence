"""Modelos 3D de los componentes que la librería de KiCad no trae instalados.

Genera, en esta misma carpeta, los STEP con color que usa la placa:

- SW_Push_5.1x5.1_TS-1187A.step  pulsador táctil SMD de 5,1 x 5,1 mm (actuador dorado)
- TerminalBlock_5.00mm_2P.step   bornera verde de tornillo, paso 5 mm, 2 polos
- TerminalBlock_5.00mm_4P.step   ídem, 4 polos
- Bateria_LiPo_100x60x7.step     celda de polímero de litio de 100 x 60 x 7 mm con sus cables

Convención de KiCad: origen en el pin 1, z = 0 en la cara superior del cobre,
eje Y del modelo hacia arriba (opuesto al eje Y de la huella).

Uso:  python generar_modelos.py
"""
from pathlib import Path

import cadquery as cq

AQUI = Path(__file__).resolve().parent

VERDE = cq.Color(0.10, 0.55, 0.25)
METAL = cq.Color(0.78, 0.78, 0.80)
DORADO = cq.Color(0.85, 0.68, 0.25)
NEGRO = cq.Color(0.08, 0.08, 0.09)
ESTANO = cq.Color(0.70, 0.70, 0.72)


def guardar(assy: cq.Assembly, nombre: str) -> None:
    ruta = AQUI / nombre
    assy.export(str(ruta))
    print("ok", ruta.name)


# --------------------------------------------------------------------------
# Pulsador táctil 5,1 x 5,1 mm (huella Button_Switch_SMD:SW_Push_1P1T_XKB_TS-1187A)
# --------------------------------------------------------------------------
def pulsador() -> cq.Assembly:
    base = (
        cq.Workplane("XY").rect(5.1, 5.1).extrude(0.9)
        .edges("|Z").chamfer(0.6)
    )
    tapa = (
        cq.Workplane("XY").workplane(offset=0.9).rect(5.1, 5.1).extrude(0.2)
        .edges("|Z").chamfer(0.6)
        .faces(">Z").workplane().hole(3.2)
    )
    actuador = cq.Workplane("XY").workplane(offset=0.9).circle(1.5).extrude(0.6).faces(">Z").fillet(0.25)
    patas = cq.Workplane("XY")
    for sx in (-1, 1):
        for sy in (-1, 1):
            pata = (
                cq.Workplane("XY")
                .center(sx * 2.95, sy * 1.875)
                .rect(0.9, 0.7)
                .extrude(0.15)
            )
            patas = patas.union(pata)
    a = cq.Assembly(name="SW_Push_5.1x5.1")
    a.add(base, name="cuerpo", color=NEGRO)
    a.add(tapa, name="tapa", color=METAL)
    a.add(actuador, name="actuador", color=DORADO)
    a.add(patas, name="patas", color=ESTANO)
    return a


# --------------------------------------------------------------------------
# Bornera verde de tornillo, paso 5,00 mm, entrada de cable horizontal.
# Huella (Y hacia abajo): cuerpo de x = -2,5 a 5n - 2,5 e y = -4 a 4.
# La entrada de cable mira hacia el borde de la placa: +Y del modelo.
# --------------------------------------------------------------------------
def bornera(polos: int) -> cq.Assembly:
    paso = 5.0
    ancho = paso * polos
    x0 = -2.5
    prof = 8.0
    alto = 10.0
    cx = x0 + ancho / 2

    cuerpo = (
        cq.Workplane("XY").center(cx, 0).rect(ancho, prof).extrude(alto)
        # chaflán trasero superior, típico de la bornera
        .faces(">Z").edges("<Y").chamfer(2.5, 1.5)
    )
    for i in range(polos):
        x = i * paso
        # boca de cable en la cara frontal (+Y)
        boca = cq.Workplane("XZ", origin=(x, prof / 2 + 0.1, 0)).center(0, 3.6).rect(3.4, 3.4).extrude(5.0)
        cuerpo = cuerpo.cut(boca)
        # pozo del tornillo en la cara superior
        pozo = cq.Workplane("XY", origin=(x, 0.6, alto - 3.0)).circle(2.0).extrude(3.1)
        cuerpo = cuerpo.cut(pozo)
        # ranura de separación entre polos
        if i > 0:
            ranura = cq.Workplane("XY", origin=(x - paso / 2, 0, alto - 1.2)).rect(0.6, prof + 1).extrude(1.3)
            cuerpo = cuerpo.cut(ranura)

    tornillos = cq.Workplane("XY")
    jaulas = cq.Workplane("XY")
    pines = cq.Workplane("XY")
    for i in range(polos):
        x = i * paso
        t = (
            cq.Workplane("XY", origin=(x, 0.6, alto - 2.6)).circle(1.75).extrude(1.9)
            .faces(">Z").workplane().rect(3.6, 0.55).cutBlind(-0.7)
        )
        tornillos = tornillos.union(t)
        j = (
            cq.Workplane("XZ", origin=(x, prof / 2 - 0.4, 0)).center(0, 3.6)
            .rect(3.4, 3.4).rect(2.8, 2.8).extrude(3.0)
        )
        jaulas = jaulas.union(j)
        p = cq.Workplane("XY", origin=(x, 0, -3.3)).rect(1.0, 0.6).extrude(3.4)
        pines = pines.union(p)

    a = cq.Assembly(name=f"TerminalBlock_5.00mm_{polos}P")
    a.add(cuerpo, name="cuerpo", color=VERDE)
    a.add(tornillos, name="tornillos", color=METAL)
    a.add(jaulas, name="jaulas", color=METAL)
    a.add(pines, name="pines", color=ESTANO)
    return a


# --------------------------------------------------------------------------
# Celda LiPo 100 x 60 x 7 mm. Origen en el centro de la cara inferior;
# los cables salen por el lado corto -X.
# --------------------------------------------------------------------------
def bateria() -> cq.Assembly:
    L, A, E = 100.0, 60.0, 7.0
    cuerpo = (
        cq.Workplane("XY").rect(L - 4, A).extrude(E)
        .edges("|Z").fillet(2.0)
        .edges(">Z or <Z").fillet(1.2)
    )
    # pestaña sellada del lado de los terminales
    sello = cq.Workplane("XY").center(-(L - 4) / 2 - 2, 0).rect(4, A - 6).extrude(1.0).translate((0, 0, E / 2 - 0.5))
    etiqueta = (
        cq.Workplane("XY").workplane(offset=E - 0.05).rect(L - 16, A - 12).extrude(0.1)
        .edges("|Z").fillet(2.0)
    )
    pcm = cq.Workplane("XY").center(-L / 2 + 1, 0).rect(2.0, 30).extrude(4).translate((0, 0, 1.5))

    # Cables pelados que van atornillados a la bornera de la placa: salen 2 mm
    # por el extremo -X y se doblan hacia arriba, para caber junto a la pared.
    def cable(y: float) -> cq.Workplane:
        z0 = E / 2
        ruta = (
            cq.Workplane("XZ", origin=(0, y, 0))
            .moveTo(-L / 2, z0)
            .lineTo(-L / 2 - 2.0, z0)
            .radiusArc((-L / 2 - 3.2, z0 + 1.2), 1.2)
            .lineTo(-L / 2 - 3.2, z0 + 9.0)
        )
        return cq.Workplane("YZ", origin=(-L / 2, y, z0)).circle(0.65).sweep(ruta, transition="round")

    rojo = cable(-2.2)
    negro = cable(2.2)

    a = cq.Assembly(name="Bateria_LiPo_100x60x7")
    a.add(cuerpo.union(sello), name="bolsa", color=cq.Color(0.72, 0.74, 0.78))
    a.add(etiqueta, name="etiqueta", color=cq.Color(0.12, 0.28, 0.55))
    a.add(pcm, name="proteccion", color=cq.Color(0.15, 0.45, 0.20))
    a.add(rojo, name="cable_rojo", color=cq.Color(0.80, 0.08, 0.08))
    a.add(negro, name="cable_negro", color=NEGRO)
    return a


if __name__ == "__main__":
    guardar(pulsador(), "SW_Push_5.1x5.1_TS-1187A.step")
    guardar(bornera(2), "TerminalBlock_5.00mm_2P.step")
    guardar(bornera(4), "TerminalBlock_5.00mm_4P.step")
    guardar(bateria(), "Bateria_LiPo_100x60x7.step")
