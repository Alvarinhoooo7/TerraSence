# -*- coding: utf-8 -*-
"""Ensamble de la placa V3 (alternativa A frente a C) y capacidad del taller.

Fuente unica de las cifras de ensamble, impresion de carcasas y personas de taller. Los
parametros (tarifas de JLCPCB, tiempos, huella de la carcasa) viven en `supuestos.json`; la
huella de la carcasa es la vigente de la V2 y se recalcula cuando exista el contorno de la V3.

A: taller propio con esquenticil y placa calefactora (o aire caliente).
C: PCBA completo de JLCPCB con todas las piezas del catalogo LCSC.

Los tiempos son estimaciones de taller, sin medir.
"""
import math

import modelo as M

S = M.S
E = S["ensamble"]
CI = S["capacidad_impresion"]


# ------------------------------------------------------------ costo horario
def costo_hora_ensamblador(anio=None):
    """Costo del ensamblador por hora efectiva, en pesos del anio: sueldo con cargas y beneficios sobre las horas efectivas."""
    anio = anio or M.ANIOS[0]
    f = M.infl(anio)
    anual = S["sueldo_ensamblador"] * f * M.factor_empleador(anio) * 12 + (S["colacion_mensual"] + S["movilizacion_mensual"]) * f * 12
    return anual / E["horas_efectivas_anuales_por_persona"]


def costo_electronica_clp():
    """Costo de las piezas del catalogo LCSC por placa (base de la merma de retrabajo en el taller)."""
    return sum(f["cantidad"] * f["precio_clp"] for f in S["bom_filas"] if f["proveedor"] == "LCSC")


def equipo_alternativa_a():
    """Activo fijo propio de la alternativa A: placa calefactora, aire caliente y esteniles."""
    nombres = ("Placa calefactora", "Estación de aire caliente", "Esténcil de ensamble")
    return sum(f["cantidad"] * f["precio_neto_clp"] for f in S["taller_filas"] if f["equipo"] in nombres)


# -------------------------------------------------------------- A frente a C
def alternativa_a(lote):
    h = costo_hora_ensamblador()
    mano = E["min_pcba_taller"] / 60 * h
    pasta = E["pasta_y_consumibles_clp"]
    merma = E["merma_retrabajo_taller"] * costo_electronica_clp()
    equipo = equipo_alternativa_a() / 5 / lote          # depreciacion anual repartida en el lote del anio
    return {"mano": mano, "consumibles": pasta, "merma": merma, "equipo": equipo,
            "incremental": mano + pasta + merma, "total": mano + pasta + merma + equipo}


def alternativa_c(lote):
    c = M.pcba_cargos(lote)
    h = costo_hora_ensamblador()
    retoque = E["min_pcba_retoque_jlcpcb"] / 60 * h      # borneras, cabezal y revision de lo que llega ensamblado
    return {"cargos": c["por_placa_clp"], "retoque": retoque, "total": c["por_placa_clp"] + retoque, "detalle": c}


def comparacion():
    out = []
    for lote in E["lotes"]:
        a, c = alternativa_a(lote), alternativa_c(lote)
        out.append({"lote": lote, "A": a, "C": c, "mejor": "C" if c["total"] < a["total"] else "A",
                    "ahorro_c_por_placa": a["total"] - c["total"], "ahorro_incremental": a["incremental"] - c["total"]})
    return out


def lote_de_equilibrio():
    """Mayor lote en que A, con el equipo ya comprado (costo incremental), cuesta menos por placa que C. 0 si nunca."""
    mejor = 0
    for lote in range(1, 2001):
        if alternativa_a(lote)["incremental"] < alternativa_c(lote)["total"]:
            mejor = lote
    return mejor


def lote_de_equilibrio_total():
    """Mayor lote en que A, con su equipo prorrateado, cuesta menos por placa que C. 0 si nunca."""
    mejor = 0
    for lote in range(1, 2001):
        if alternativa_a(lote)["total"] < alternativa_c(lote)["total"]:
            mejor = lote
    return mejor


# ----------------------------------------------------------- impresion 3D
def piezas_por_cama(cama=None, huella=None, sep=None):
    cama = cama or CI["cama_mm"]
    huella = huella or CI["huella_mm"]
    sep = CI["separacion_mm"] if sep is None else sep
    a, b = huella
    mejor = 0
    for x, y in ((a, b), (b, a)):
        mejor = max(mejor, int((cama[0] + sep) // (x + sep)) * int((cama[1] + sep) // (y + sep)))
    return mejor


def capacidad_impresion(huella=None):
    piezas = piezas_por_cama(huella=huella)
    equipos_cama = piezas // CI["piezas_por_equipo"]
    volumen_mm3 = CI["masa_g"] / CI["densidad_g_cm3"] * 1000
    h_equipo = volumen_mm3 / CI["flujo_mm3_s"] / 3600 * (1 + CI["sobrecarga_tiempo"])
    h_cama = h_equipo * max(equipos_cama, 1)
    h_ciclo = h_cama + CI["cambio_de_cama_h"]
    h_disp = CI["dias_operativos"] * CI["horas_impresion_dia"] * CI["tasa_exito"]
    por_impresora = h_disp / h_ciclo * max(equipos_cama, 1)
    return {"piezas_cama": piezas, "equipos_cama": equipos_cama, "h_equipo": h_equipo, "h_cama": h_cama, "h_ciclo": h_ciclo,
            "h_disponibles": h_disp, "carcasas_por_impresora": por_impresora, "h_por_carcasa": h_ciclo / max(equipos_cama, 1)}


def impresoras_necesarias(demanda, huella=None):
    cap = capacidad_impresion(huella)
    exacto = demanda / cap["carcasas_por_impresora"]
    return {"demanda": demanda, "exacto": exacto, "impresoras": max(1, math.ceil(exacto)), "horas": demanda * cap["h_por_carcasa"],
            "utilizacion_con_1": exacto}


def tabla_impresion():
    return [dict(anio=a, **impresoras_necesarias(S["ventas"][str(a)])) for a in M.ANIOS]


# -------------------------------------------------------- personas de taller
def minutos_por_equipo(alternativa="C"):
    base = E["min_recepcion"] + E["min_programacion"] + E["min_ensamble_mecanico"] + E["min_fat"] + E["min_embalaje"] + E["min_impresion_atencion"]
    return base + (E["min_pcba_retoque_jlcpcb"] if alternativa == "C" else E["min_pcba_taller"])


def personas_de_taller(demanda, alternativa="C"):
    horas = demanda * minutos_por_equipo(alternativa) / 60
    return horas / (E["horas_efectivas_anuales_por_persona"] * E["ocupacion_productiva"]), horas


def tabla_personas():
    out = []
    for a in M.ANIOS:
        d = S["dotacion_por_anio"][str(a)]
        u = S["ventas"][str(a)]
        pc, hc = personas_de_taller(u, "C")
        pa, ha = personas_de_taller(u, "A")
        out.append({"anio": a, "unidades": u, "horas_C": hc, "personas_C": pc, "horas_A": ha, "personas_A": pa,
                    "ensambladores": d["ensambladores"], "socios": d["socios"]})
    return out


if __name__ == "__main__":
    print("Costo horario del ensamblador:", round(costo_hora_ensamblador()))
    for f in comparacion():
        print(f["lote"], round(f["A"]["total"]), round(f["C"]["total"]), f["mejor"])
    print("equilibrio incremental:", lote_de_equilibrio(), "total:", lote_de_equilibrio_total())
    print(capacidad_impresion())
    for f in tabla_impresion():
        print(f["anio"], f["demanda"], round(f["exacto"], 2), f["impresoras"])
    for f in tabla_personas():
        print(f["anio"], f["unidades"], round(f["personas_C"], 2), round(f["personas_A"], 2), f["ensambladores"])
