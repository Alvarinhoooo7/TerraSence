"""Carcasa del medidor TerraSense, diseñada alrededor de la placa «Medidor De Suelos V2».

Genera en `salida/`:
- carcasa.step            ensamblaje completo (sin la placa) para CAD
- carcasa.glb             mismas piezas, con nombre y color, para el visor web
- stl/*.stl               una malla por pieza imprimible
- posiciones.json         dónde va cada pieza y la placa, para el visor y la animación

Sistema de coordenadas (mm): origen en el centro de la placa, X hacia el borde
derecho, Y hacia el borde superior (el de la antena del ESP32), Z hacia arriba
desde la cara exterior del fondo. Las cotas de la placa se toman del
`.kicad_pcb` (contorno, agujeros, LED, pulsador, borneras y USB-C del cargador).

Uso:  python carcasa.py
"""
import json
import sys
from pathlib import Path

import cadquery as cq

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / "salida"
MODELOS = AQUI.parent / "Medidor De Suelos V2" / "3d"
sys.path.insert(0, str(MODELOS))
import generar_modelos  # noqa: E402  (modelo de la batería, con sus colores)
FUENTE = "C:/Windows/Fonts/segoeuib.ttf"

# --- placa (coordenadas del .kicad_pcb) ---------------------------------
PCB_CX, PCB_CY = 126.595, 100.32          # centro del contorno de 100 x 90 mm


def B(bx: float, by: float) -> tuple[float, float]:
    """Convierte coordenadas de KiCad (Y hacia abajo) al sistema de la carcasa."""
    return (bx - PCB_CX, -(by - PCB_CY))


Z_PCB = 14.0                    # cara inferior de la placa
PCB_T = 1.6
AGUJEROS = [B(81.6, 60.3255), B(171.6045, 60.3255), B(81.6, 140.32), B(171.5945, 140.3245)]
LEDS = {"rojo": B(81.365, 76.81), "verde": B(81.3175, 82.14), "azul": B(81.3615, 87.74)}
LED_TOPE = Z_PCB + 2.69
SW1 = B(83.13, 98.28)
SW1_TOPE = Z_PCB + 3.10
USB = (B(74.68, 127.835)[0], B(74.68, 127.835)[1], Z_PCB + 3.545)   # cara del USB-C
J2_X = B(141.54, 0)[0]          # centro de la bornera de la sonda
INTERRUPTOR_Y = B(0, 130.0)[1]
BZ1 = B(159.1, 83.5)
BME_Y = (B(0, 79.9)[1], B(0, 64.7)[1])

# --- envolvente -----------------------------------------------------------
PARED = 2.5
FONDO = 2.0
CAV_X = (B(74.1, 0)[0], B(179.1, 0)[0])        # 2,5 mm libres a cada lado
CAV_Y = (B(0, 153.32)[1], B(0, 53.32)[1])      # 8 mm al sur para el cableado, 2 mm al norte
Z_TAPA = 28.5                                   # cara inferior de la tapa
TAPA_T = 2.5
R_EXT = 6.0
EXT_X = (CAV_X[0] - PARED, CAV_X[1] + PARED)
EXT_Y = (CAV_Y[0] - PARED, CAV_Y[1] + PARED)
EXT_W, EXT_L = EXT_X[1] - EXT_X[0], EXT_Y[1] - EXT_Y[0]
EXT_C = ((EXT_X[0] + EXT_X[1]) / 2, (EXT_Y[0] + EXT_Y[1]) / 2)
CAV_W, CAV_L = CAV_X[1] - CAV_X[0], CAV_Y[1] - CAV_Y[0]
CAV_C = ((CAV_X[0] + CAV_X[1]) / 2, (CAV_Y[0] + CAV_Y[1]) / 2)

# postes de la tapa, metidos en las esquinas de la cavidad
INSET = 0.9
POSTES_TAPA = [
    (CAV_X[0] + INSET, CAV_Y[1] - INSET), (CAV_X[1] - INSET, CAV_Y[1] - INSET),
    (CAV_X[0] + INSET, CAV_Y[0] + INSET), (CAV_X[1] - INSET, CAV_Y[0] + INSET),
]
R_POSTE_TAPA = 2.8

# batería: 100 x 60 x 7, cables hacia -X, entre las dos filas de postes
BAT_C = (B(128.6, 106.0)[0], B(128.6, 106.0)[1])
BAT_Z = FONDO

# accesorios
PE_Z = 20.5                     # eje del prensaestopas PG7 (pared sur)
PE_D = 12.5
INT_Z = 21.5                    # interruptor basculante (pared este)
INT_CORTE = (15.0, 10.0)        # recorte del panel: largo (Y) x alto (Z)
TUBO_D = 3.0
TUBO_Z = LED_TOPE + 0.3 + TUBO_D / 2
USB_HUECO = (13.0, 7.5)
USB_REBAJE = (17.0, 11.5, 1.0)
BOTON_D = 10.0

COLORES = {
    "base": (0.16, 0.18, 0.17),
    "tapa": (0.12, 0.36, 0.25),
    "logo_T": (0.92, 0.99, 0.96),
    "logo_S": (0.29, 0.87, 0.50),
    "texto": (0.92, 0.99, 0.96),
    "boton": (0.29, 0.72, 0.51),
    "tubo_luz": (0.92, 0.95, 0.97),
    "tapa_usb": (0.20, 0.22, 0.21),
    "interruptor": (0.07, 0.07, 0.08),
    "prensaestopas": (0.10, 0.10, 0.11),
    "cable_sonda": (0.05, 0.05, 0.05),
    "tornillo": (0.75, 0.76, 0.78),
}


def caja_redondeada(w, l, h, r, cx=0.0, cy=0.0, z=0.0):
    return cq.Workplane("XY").workplane(offset=z).center(cx, cy).rect(w, l).extrude(h).edges("|Z").fillet(r)


# ==========================================================================
# Base
# ==========================================================================
def base() -> cq.Workplane:
    cuerpo = caja_redondeada(EXT_W, EXT_L, Z_TAPA, R_EXT, *EXT_C)
    cuerpo = cuerpo.faces("<Z").edges().fillet(1.5)
    cav = caja_redondeada(CAV_W, CAV_L, Z_TAPA, R_EXT - PARED, *CAV_C, z=FONDO)
    cuerpo = cuerpo.cut(cav)

    # postes de la placa (M2 autorroscante)
    for x, y in AGUJEROS:
        poste = cq.Workplane("XY").workplane(offset=FONDO - 0.1).center(x, y).circle(3.0).extrude(Z_PCB - FONDO + 0.1)
        cuerpo = cuerpo.union(poste)
        cuerpo = cuerpo.cut(cq.Workplane("XY").workplane(offset=Z_PCB - 9).center(x, y).circle(0.9).extrude(9.1))

    # postes de la tapa, fundidos con las paredes
    for x, y in POSTES_TAPA:
        poste = cq.Workplane("XY").workplane(offset=FONDO - 0.1).center(x, y).circle(R_POSTE_TAPA).extrude(Z_TAPA - FONDO + 0.1)
        cuerpo = cuerpo.union(poste)
        cuerpo = cuerpo.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 10).center(x, y).circle(0.9).extrude(10.1))

    # nervios que encajonan la batería
    bx, by = BAT_C
    for s in (-1, 1):
        nervio = (
            cq.Workplane("XY").workplane(offset=FONDO - 0.1)
            .center(bx + 5, by + s * (30 + 0.4 + 0.6)).rect(70, 1.2).extrude(3.1)
        )
        cuerpo = cuerpo.union(nervio)

    # --- pared oeste: tubos de luz con sócalo y puerto de carga ---------------
    xo = EXT_X[0]
    ys_led = [ly for _, ly in LEDS.values()]
    largo = max(ys_led) - min(ys_led) + 7.2
    socalo = (
        cq.Workplane("YZ", origin=(xo + 0.2, (max(ys_led) + min(ys_led)) / 2, TUBO_Z))
        .slot2D(largo, 7.2).extrude(-1.4)
        .faces("<X").chamfer(0.6)
    )
    cuerpo = cuerpo.union(socalo)
    for _, ly in LEDS.values():
        cuerpo = cuerpo.cut(cq.Workplane("YZ", origin=(xo - 2, ly, TUBO_Z)).circle(TUBO_D / 2 + 0.1).extrude(PARED + 4))
    ux, uy, uz = USB
    rebaje = cq.Workplane("YZ", origin=(xo - 0.01, uy, uz)).rect(USB_REBAJE[0], USB_REBAJE[1]).extrude(USB_REBAJE[2]).edges("|X").fillet(2.5)
    hueco = cq.Workplane("YZ", origin=(xo - 1, uy, uz)).rect(*USB_HUECO).extrude(PARED + 2).edges("|X").fillet(3.0)
    cuerpo = cuerpo.cut(rebaje).cut(hueco)

    # --- pared este: interruptor basculante y rejilla del BME280 -------------
    xe = EXT_X[1]
    corte = cq.Workplane("YZ", origin=(xe - PARED - 1, INTERRUPTOR_Y, INT_Z)).rect(*INT_CORTE).extrude(PARED + 2)
    cuerpo = cuerpo.cut(corte)
    y0, y1 = BME_Y
    for i in range(4):
        z = 17.5 + i * 2.6
        ranura = (
            cq.Workplane("YZ", origin=(xe - PARED - 1, (y0 + y1) / 2, z))
            .slot2D(y1 - y0 - 1.0, 1.3).extrude(PARED + 2)
        )
        cuerpo = cuerpo.cut(ranura)

    # --- pared sur: prensaestopas PG7 -----------------------------------------
    ys = EXT_Y[0]
    refuerzo = cq.Workplane("XZ", origin=(J2_X, ys + 0.2, PE_Z)).circle(9.0).extrude(1.2)
    cuerpo = cuerpo.union(refuerzo)
    cuerpo = cuerpo.cut(cq.Workplane("XZ", origin=(J2_X, ys + PARED + 1, PE_Z)).circle(PE_D / 2).extrude(PARED + 4))

    # rebaje para la junta de la tapa
    return cuerpo


# ==========================================================================
# Tapa
# ==========================================================================
def _texto(txt, size, x, y, z, prof, halign="center"):
    return (
        cq.Workplane("XY").workplane(offset=z).center(x, y)
        .text(txt, size, prof, fontPath=FUENTE, halign=halign, valign="center", combine=False)
    )


LOGO_C = (8.0, 9.0)
LOGO_H = 30.0
TEXTO_C = (8.0, -24.0)
INLAY = 0.6


def logo_partes():
    z = Z_TAPA + TAPA_T - INLAY
    t = _texto("T", LOGO_H, LOGO_C[0] - 9.5, LOGO_C[1], z, INLAY + 0.02)
    s = _texto("S", LOGO_H, LOGO_C[0] + 9.5, LOGO_C[1], z, INLAY + 0.02)
    txt = _texto("TerraSense", 9.0, TEXTO_C[0], TEXTO_C[1], z, INLAY + 0.02)
    return t, s, txt


def tapa() -> cq.Workplane:
    placa = caja_redondeada(EXT_W, EXT_L, TAPA_T, R_EXT, *EXT_C, z=Z_TAPA)
    placa = placa.faces(">Z").edges().fillet(1.5)

    # pestaña perimetral que centra la tapa dentro de la base
    holg = 0.3
    labio = (
        caja_redondeada(CAV_W - 2 * holg, CAV_L - 2 * holg, 2.5, R_EXT - PARED - holg, *CAV_C, z=Z_TAPA - 2.5)
        .cut(caja_redondeada(CAV_W - 2 * holg - 2.4, CAV_L - 2 * holg - 2.4, 2.5, R_EXT - PARED - holg - 1.2, *CAV_C, z=Z_TAPA - 2.5))
    )
    for x, y in POSTES_TAPA:
        labio = labio.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 3).center(x, y).circle(R_POSTE_TAPA + 0.5).extrude(4))
    # escotes del labio frente al prensaestopas y al interruptor
    labio = labio.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 3).center(J2_X, CAV_Y[0]).rect(20, 6).extrude(4))
    labio = labio.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 3).center(CAV_X[1], INTERRUPTOR_Y).rect(8, 20).extrude(4))
    t = placa.union(labio)

    # tornillos de la tapa: pasante y avellanado
    for x, y in POSTES_TAPA:
        t = t.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 1).center(x, y).circle(1.2).extrude(TAPA_T + 2))
        t = t.cut(cq.Workplane("XY").workplane(offset=Z_TAPA + TAPA_T - 1.2).center(x, y).circle(2.2).extrude(2))

    # pulsador: agujero guía y anillo decorativo
    bx, by = SW1
    t = t.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 1).center(bx, by).circle(BOTON_D / 2 + 0.3).extrude(TAPA_T + 2))
    anillo = (
        cq.Workplane("XY").workplane(offset=Z_TAPA + TAPA_T - 0.5).center(bx, by)
        .circle(BOTON_D / 2 + 2.6).circle(BOTON_D / 2 + 1.8).extrude(1)
    )
    t = t.cut(anillo)

    # agujeros del buzzer
    zx, zy = BZ1
    pts = [(0, 0)] + [(2.6 * __import__("math").cos(a), 2.6 * __import__("math").sin(a)) for a in [i * 1.0471976 for i in range(6)]]
    for dx, dy in pts:
        t = t.cut(cq.Workplane("XY").workplane(offset=Z_TAPA - 1).center(zx + dx, zy + dy).circle(0.8).extrude(TAPA_T + 2))

    # bolsillos del logotipo y del nombre (se rellenan con piezas de color)
    for parte in logo_partes():
        t = t.cut(parte)
    return t


# ==========================================================================
# Piezas sueltas
# ==========================================================================
def boton() -> cq.Workplane:
    bx, by = SW1
    z_pie = SW1_TOPE + 0.3
    z_ala = Z_TAPA - 1.1
    domo = (
        cq.Workplane("XY").workplane(offset=z_ala).center(bx, by).circle(BOTON_D / 2).extrude(Z_TAPA + TAPA_T + 1.2 - z_ala)
        .faces(">Z").fillet(1.2)
    )
    ala = cq.Workplane("XY").workplane(offset=z_ala).center(bx, by).circle(BOTON_D / 2 + 1.6).extrude(1.0)
    vastago = cq.Workplane("XY").workplane(offset=z_pie).center(bx, by).circle(1.75).extrude(z_ala - z_pie + 0.1)
    b = domo.union(ala).union(vastago)
    # punto táctil en la cara superior
    b = b.cut(cq.Workplane("XY").workplane(offset=Z_TAPA + TAPA_T + 1.2 - 0.4).center(bx, by).circle(1.6).extrude(1))
    return b


def tubo_luz(ly: float) -> cq.Workplane:
    lx = LEDS["rojo"][0]
    x0 = EXT_X[0] - 1.2 - 0.5            # sobresale del sócalo como lente
    x1 = lx + TUBO_D / 2
    tubo = cq.Workplane("YZ", origin=(x0, ly, TUBO_Z)).circle(TUBO_D / 2).extrude(x1 - x0)
    tubo = tubo.faces("<X").fillet(0.8)
    # corte a 45° sobre el LED: refleja la luz hacia la pared
    corte = (
        cq.Workplane("XZ", origin=(0, ly + 3, 0))
        .polyline([(x1 - TUBO_D, TUBO_Z + TUBO_D), (x1 + 1, TUBO_Z + TUBO_D), (x1 + 1, TUBO_Z - TUBO_D * 2)])
        .close().extrude(6)
    )
    return tubo.cut(corte)


def tapa_usb() -> cq.Workplane:
    xo = EXT_X[0]
    _, uy, uz = USB
    w, h, p = USB_REBAJE
    placa = cq.Workplane("YZ", origin=(xo + p, uy, uz)).rect(w - 0.4, h - 0.4).extrude(-p).edges("|X").fillet(2.3)
    tapon = cq.Workplane("YZ", origin=(xo + p, uy, uz)).rect(USB_HUECO[0] - 0.3, USB_HUECO[1] - 0.3).extrude(1.4).edges("|X").fillet(2.8)
    lengueta = cq.Workplane("YZ", origin=(xo, uy - w / 2 + 1.0, uz)).rect(5, 4).extrude(-1.6).edges("|X").fillet(1.0)
    return placa.union(tapon).union(lengueta.translate((0, -2.5, 0)))


def interruptor() -> cq.Assembly:
    xe = EXT_X[1]
    y, z = INTERRUPTOR_Y, INT_Z
    marco = cq.Workplane("YZ", origin=(xe, y, z)).rect(INT_CORTE[0] + 3.5, INT_CORTE[1] + 3.5).extrude(1.8).edges("|X").fillet(1.0)
    marco = marco.cut(cq.Workplane("YZ", origin=(xe, y, z)).rect(INT_CORTE[0] - 1.2, INT_CORTE[1] - 1.2).extrude(3))
    cuerpo = cq.Workplane("YZ", origin=(xe - PARED, y, z)).rect(INT_CORTE[0] - 0.2, INT_CORTE[1] - 0.2).extrude(-10.0)
    cuerpo = cuerpo.union(cq.Workplane("YZ", origin=(xe, y, z)).rect(INT_CORTE[0] - 0.2, INT_CORTE[1] - 0.2).extrude(-PARED))
    # balancín inclinado (posición encendido)
    balancin = (
        cq.Workplane("YZ", origin=(xe + 0.6, y, z)).rect(INT_CORTE[0] - 1.6, INT_CORTE[1] - 1.6).extrude(2.6)
        .edges("|X").fillet(1.0)
    )
    balancin = balancin.rotate((xe, y, z), (xe, y, z + 1), 8)
    terminales = cq.Workplane("XY")
    for dy in (-3.5, 3.5):
        terminales = terminales.union(cq.Workplane("YZ", origin=(xe - PARED - 10, y + dy, z)).rect(0.8, 4.8).extrude(-6.5))
    marca_i = cq.Workplane("YZ", origin=(xe + 3.0, y + 3.2, z)).rect(0.8, 3.6).extrude(0.4).rotate((xe, y, z), (xe, y, z + 1), 8)
    marca_o = cq.Workplane("YZ", origin=(xe + 2.4, y - 3.2, z)).circle(1.6).circle(1.0).extrude(0.4).rotate((xe, y, z), (xe, y, z + 1), 8)
    a = cq.Assembly(name="interruptor")
    a.add(marco.union(cuerpo).union(balancin), name="interruptor_cuerpo", color=cq.Color(*COLORES["interruptor"]))
    a.add(terminales, name="interruptor_terminales", color=cq.Color(0.8, 0.8, 0.8))
    a.add(marca_i.union(marca_o), name="interruptor_marcas", color=cq.Color(0.95, 0.95, 0.95))
    return a


def prensaestopas() -> tuple[cq.Workplane, cq.Workplane]:
    ys = EXT_Y[0] - 1.2
    hexa = cq.Workplane("XZ", origin=(J2_X, ys, PE_Z)).polygon(6, 15.0 / 0.866).extrude(5.5)
    cupula = cq.Workplane("XZ", origin=(J2_X, ys - 5.5, PE_Z)).polygon(6, 13.5 / 0.866).extrude(4.0).edges(">Y").chamfer(1.0)
    cupula = cupula.union(cq.Workplane("XZ", origin=(J2_X, ys - 9.5, PE_Z)).circle(6.0).extrude(3.0).faces("<Y").fillet(1.5))
    rosca = cq.Workplane("XZ", origin=(J2_X, ys + PARED + 2.4, PE_Z)).circle(PE_D / 2 - 0.1).extrude(PARED + 2.4)
    tuerca = cq.Workplane("XZ", origin=(J2_X, EXT_Y[0] + PARED + 3.5, PE_Z)).polygon(6, 15.0 / 0.866).extrude(3.5)
    cuerpo = hexa.union(cupula).union(rosca).union(tuerca)
    cuerpo = cuerpo.cut(cq.Workplane("XZ", origin=(J2_X, ys + 20, PE_Z)).circle(2.6).extrude(60))
    cable = cq.Workplane("XZ", origin=(J2_X, EXT_Y[0] + PARED + 4.5, PE_Z)).circle(2.5).extrude(PARED + 4.5 + 1.2 + 12.5 + 70)
    return cuerpo, cable


def tornillo(x, y, z_cabeza, largo, d=2.0, cabeza=3.8, h=1.4) -> cq.Workplane:
    cab = cq.Workplane("XY").workplane(offset=z_cabeza).center(x, y).circle(cabeza / 2).extrude(h).faces(">Z").fillet(0.5)
    cab = cab.cut(cq.Workplane("XY").workplane(offset=z_cabeza + h - 0.7).center(x, y).rect(2.0, 0.5).extrude(1).rotate((x, y, 0), (x, y, 1), 45))
    cab = cab.cut(cq.Workplane("XY").workplane(offset=z_cabeza + h - 0.7).center(x, y).rect(2.0, 0.5).extrude(1).rotate((x, y, 0), (x, y, 1), -45))
    cuerpo = cq.Workplane("XY").workplane(offset=z_cabeza - largo).center(x, y).circle(d / 2).extrude(largo)
    return cab.union(cuerpo)


# ==========================================================================
def construir():
    SALIDA.mkdir(exist_ok=True)
    (SALIDA / "stl").mkdir(exist_ok=True)
    piezas = {}

    piezas["base"] = (base(), COLORES["base"])
    piezas["tapa"] = (tapa(), COLORES["tapa"])
    t, s, txt = logo_partes()
    piezas["logo_T"] = (t, COLORES["logo_T"])
    piezas["logo_S"] = (s, COLORES["logo_S"])
    piezas["texto"] = (txt, COLORES["texto"])
    piezas["boton"] = (boton(), COLORES["boton"])
    for nombre, (_, ly) in LEDS.items():
        piezas[f"tubo_{nombre}"] = (tubo_luz(ly), COLORES["tubo_luz"])
    piezas["tapa_usb"] = (tapa_usb(), COLORES["tapa_usb"])
    pe, cable = prensaestopas()
    piezas["prensaestopas"] = (pe, COLORES["prensaestopas"])
    piezas["cable_sonda"] = (cable, COLORES["cable_sonda"])
    for i, (x, y) in enumerate(AGUJEROS, 1):
        piezas[f"tornillo_placa_{i}"] = (tornillo(x, y, Z_PCB + PCB_T, 6.0), COLORES["tornillo"])
    for i, (x, y) in enumerate(POSTES_TAPA, 1):
        piezas[f"tornillo_tapa_{i}"] = (tornillo(x, y, Z_TAPA + TAPA_T - 1.2, 8.0, cabeza=3.8, h=1.2), COLORES["tornillo"])

    assy = cq.Assembly(name="carcasa_terrasense")
    for nombre, (forma, color) in piezas.items():
        assy.add(forma, name=nombre, color=cq.Color(*color))
    assy.add(interruptor(), name="interruptor")
    assy.add(generar_modelos.bateria(), name="bateria", loc=cq.Location((BAT_C[0], BAT_C[1], BAT_Z)))

    assy.export(str(SALIDA / "carcasa.step"))
    for nombre in ("base", "tapa", "logo_T", "logo_S", "texto", "boton", "tubo_rojo", "tubo_verde", "tubo_azul", "tapa_usb"):
        cq.exporters.export(piezas[nombre][0], str(SALIDA / "stl" / f"{nombre}.stl"), tolerance=0.02, angularTolerance=0.1)

    # mallas por pieza para el visor (GLB con un nodo por pieza)
    visor = cq.Assembly(name="carcasa")
    for nombre, (forma, color) in piezas.items():
        visor.add(forma, name=nombre, color=cq.Color(*color))
    visor.add(interruptor(), name="interruptor")
    visor.add(generar_modelos.bateria(), name="bateria", loc=cq.Location((BAT_C[0], BAT_C[1], BAT_Z)))
    visor.export(str(SALIDA / "carcasa.glb"), tolerance=0.05, angularTolerance=0.15)

    info = {
        "unidades": "mm",
        "placa": {"origen_kicad": [PCB_CX, PCB_CY], "z_inferior": Z_PCB, "espesor": PCB_T},
        "bateria": {"centro": BAT_C, "z": BAT_Z},
        "exterior": {"x": EXT_X, "y": EXT_Y, "alto": Z_TAPA + TAPA_T},
        "leds": {k: [v[0], v[1], TUBO_Z] for k, v in LEDS.items()},
        "x_pared_oeste": EXT_X[0],
        "usb": USB,
        "boton": [SW1[0], SW1[1]],
        "agujeros_placa": AGUJEROS,
        "postes_tapa": POSTES_TAPA,
        "prensaestopas": [J2_X, EXT_Y[0], PE_Z],
        "interruptor": [EXT_X[1], INTERRUPTOR_Y, INT_Z],
    }
    (SALIDA / "posiciones.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(f"exterior {EXT_W:.1f} x {EXT_L:.1f} x {Z_TAPA + TAPA_T:.1f} mm")


if __name__ == "__main__":
    construir()
