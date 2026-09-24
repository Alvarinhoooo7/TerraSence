# -*- coding: utf-8 -*-
"""Bloques cuantitativos del informe interno `docs/INFORME 1 .docx.md`.

Rellena cada región marcada con `<!-- INFORME:<CLAVE>:INICIO -->` y
`<!-- INFORME:<CLAVE>:FIN -->` con tablas generadas desde el modelo. La prosa
que rodea los bloques se edita a mano; las tablas, nunca.
"""
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(BASE, "..", "docs", "INFORME 1 .docx.md")

sys.path.insert(0, BASE)
import modelo as M  # noqa: E402

R = M.dimensionar()
IND = M.resumen(R)
F, INV = R["filas"], R["inversion"]
fmt, dec, porc = M.fmt, M.dec, M.porc


def tabla(cab, filas):
    out = ["| " + " | ".join(cab) + " |", "|" + "|".join(["---"] * len(cab)) + "|"]
    out += ["| " + " | ".join(str(v) for v in f) + " |" for f in filas]
    return "\n".join(out)


def serie(etq, fn, fuente=F):
    return [etq] + [fmt(fn(x)) for x in fuente]


ANIOS = [str(a) for a in M.ANIOS]
BLOQUES = {}

# --------------------------------------------------------------- ventas
BLOQUES["VENTAS"] = "\n\n".join([
    tabla(["Año", "Equipos", "Personas", "Sueldo socio", "Oficina", "Publicidad digital"],
          [[f["anio"], f["unidades"], f["gastos"]["personas"], fmt(M.sueldo_socio(f["anio"])),
            "sí" if M.S["dotacion_por_anio"][str(f["anio"])]["oficina"] else "no",
            fmt(f["gastos"]["pauta"])] for f in F]),
    '###### **Tabla 2.1 “Plan de Ventas y Dotación”**',
    "La dotación crece de forma escalonada: el primer año operan los dos socios y un contador, sin "
    "oficina. La oficina entra el segundo año y la encargada de marketing el tercero. El plan suma "
    "**%d equipos** en los diez años." % sum(f["unidades"] for f in F),
])

# ------------------------------------------------------------------ BOM
BLOQUES["BOM"] = "\n\n".join([
    tabla(["Material o servicio por equipo", "Cant.", "Neto unitario", "Subtotal", "Origen del precio"],
          [[n, c, fmt(p), fmt(c * p), ev] for n, c, p, ev in M.S["bom"]]
          + [["**Total BOM neto**", "", "", "**%s**" % fmt(M.BOM), ""]]),
    '###### **Tabla 2.2 “Estructura de Costos de Fabricación (BOM)”**',
    "La BOM contiene **exclusivamente** los componentes presentes en el esquemático. %s"
    % M.S["_bom_pendiente"],
    tabla(["Concepto", "Neto CLP"],
          [["Materiales y servicios de la BOM", fmt(M.BOM)],
           ["Merma de fabricación, %s de la BOM" % porc(M.S["merma_fraccion_bom"], 0),
            fmt(M.BOM * M.S["merma_fraccion_bom"])],
           ["Provisión de reposiciones y garantía, %s de la BOM" % porc(M.S["garantia_fraccion_bom"], 0),
            fmt(M.BOM * M.S["garantia_fraccion_bom"])],
           ["Envío al cliente", fmt(M.S["envio_neto_por_equipo"])],
           ["**Costo variable por equipo, sin comisión**", "**%s**" % fmt(M.VAR_UNIT)]]),
    '###### **Tabla 2.3 “Costo Variable por Equipo”**',
])

# --------------------------------------------------------------- fijos
BLOQUES["FIJOS"] = "\n\n".join([
    tabla(["Concepto"] + ANIOS, [
        serie("Nómina y cargas", lambda x: x["gastos"]["nomina"]),
        serie("Colación y movilización", lambda x: x["gastos"]["beneficios"]),
        serie("Arriendo de oficina", lambda x: x["gastos"]["arriendo"]),
        serie("Servicios básicos", lambda x: x["gastos"]["servicios"]),
        serie("Softwares y planes cloud", lambda x: x["gastos"]["software"]),
        serie("Publicidad digital", lambda x: x["gastos"]["pauta"]),
        serie("Otros de estructura", lambda x: x["gastos"]["patente"] + x["gastos"]["materiales"]
              + x["gastos"]["mantencion"]),
        serie("**Total gastos de estructura**", lambda x: x["gastos"]["total"]),
    ]),
    '###### **Tabla 2.4 “Estructura de Gastos de Operación, Administración y Comercialización”**',
    "El costo laboral sobre el sueldo bruto no es un recargo fijo: sigue el calendario de la Ley "
    "N° 21.735, y pasa de **%s en %d a %s en %d**, más cesantía, mutualidad y las provisiones de "
    "vacaciones e indemnización." % (porc(M.factor_empleador(M.ANIOS[0]) - 1), M.ANIOS[0],
                                     porc(M.factor_empleador(M.ANIOS[-1]) - 1), M.ANIOS[-1]),
])

# ---------------------------------------------------------- inversion
BLOQUES["INVERSION"] = "\n\n".join([
    tabla(["Destino", "CLP", "Participación"],
          [["Equipamiento y activo fijo", fmt(INV["equipamiento"]), porc(INV["equipamiento"] / INV["total"])],
           ["Activo nominal (puesta en marcha)", fmt(INV["activo_nominal"]), porc(INV["activo_nominal"] / INV["total"])],
           ["Capital de trabajo (%s meses)" % dec(INV["meses_cubiertos"], 1), fmt(INV["capital_trabajo"]),
            porc(INV["capital_trabajo"] / INV["total"])],
           ["Inventario inicial", fmt(INV["inventario"]), porc(INV["inventario"] / INV["total"])],
           ["**Inversión inicial total**", "**%s**" % fmt(INV["total"]), "**100,0 %**"]]),
    '###### **Tabla 2.5 “Inversión Inicial”**',
    "**El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie del %s del "
    "monto solicitado como condición de entrada, y es el crédito el que financia el 100 %% de la "
    "inversión: **%s** de crédito y **%s** de pie (%s por socio), con cuota mensual de %s por el sistema "
    "francés." % (porc(M.S["pie_sobre_credito"], 0), fmt(R["credito"]), fmt(R["pie"]),
                  fmt(R["pie"] / 2), fmt(R["cuota"])),
    tabla(["Periodo", "Saldo inicial", "Cuota de capital", "Intereses", "Cuota total", "Saldo final"],
          [[a["anio"], fmt(a["saldo_inicial"]), fmt(a["capital"]), fmt(a["interes"]),
            fmt(a["cuota"]), fmt(a["saldo_final"])] for a in R["amortizacion"]]),
    '###### **Tabla 2.6 “Amortización del Crédito”**',
])

# ----------------------------------------------------------------- flujos
BLOQUES["FLUJOS"] = "\n\n".join([
    tabla(["Concepto"] + ANIOS, [
        serie("(+) Ventas netas", lambda x: x["ventas"]),
        serie("(-) Costos operacionales", lambda x: x["variables"]),
        serie("(-) Gastos de estructura", lambda x: x["gastos"]["total"]),
        serie("(-) Depreciación y amortización", lambda x: x["deprec"] + x["amort_nom"]),
        serie("(-) Intereses", lambda x: x["interes"]),
        serie("(-) Impuesto a la renta", lambda x: x["impuesto"]),
        serie("**(=) Utilidad del ejercicio**", lambda x: x["util_neta"]),
        serie("(+) Depreciación y amortización", lambda x: x["deprec"] + x["amort_nom"]),
        serie("(-) Cuota de capital", lambda x: x["capital"]),
        serie("**(=) Flujo de fondos**", lambda x: x["flujo"]),
        serie("Caja acumulada", lambda x: x["caja"]),
    ]),
    '###### **Tabla 2.7 “Estado de Resultados y Flujo de Fondos Proyectado”**',
    "Los ejercicios %d y %d cierran con pérdida porque la estructura mínima para operar formalmente no se "
    "cubre con el volumen inicial. La caja nunca baja de **%s**."
    % (M.ANIOS[0], M.ANIOS[1], fmt(min(f["caja"] for f in F))),
])

# ------------------------------------------------------------ indicadores
BLOQUES["INDICADORES"] = "\n\n".join([
    tabla(["Indicador", "Valor", "Criterio", "Veredicto"],
          [["Inversión inicial", fmt(INV["total"]), "—", "—"],
           ["VAN al %s" % porc(M.S["tasa_descuento"], 0), fmt(IND["van"]), "VAN > 0", "Cumple"],
           ["TIR efectiva anual", porc(IND["tir"], 2), "TIR > %s" % porc(M.S["tasa_descuento"], 0), "Cumple"],
           ["Payback simple", "%s años" % dec(IND["payback"]), "≤ 5 años", "Cumple"],
           ["Payback descontado", "%s años" % dec(IND["payback_desc"]), "≤ 5 años", "Cumple"],
           ["Deuda al cierre de %d" % M.ANIOS[-1], fmt(0), "Crédito saldado", "Cumple"]]),
    '###### **Tabla 2.8 “Evaluación Económica”**',
    "El precio **se deriva** del costo total exigiendo un %s de utilidad: %s con IVA (%s netos). No es un "
    "supuesto de entrada." % (porc(M.S["margen_objetivo"], 0), fmt(R["precio_lista"]),
                              fmt(R["precio_neto_base"])),
])

# ----------------------------------------------------------- sensibilidad
P, CT = R["precio_lista"], INV["capital_trabajo"]
casos = [("Caso base", {}), ("Ventas −10 %", {"factor_ventas": 0.90}),
         ("Ventas −25 %", {"factor_ventas": 0.75}), ("BOM +15 %", {"factor_bom": 1.15}),
         ("BOM +30 %", {"factor_bom": 1.30}), ("Precio a $399.990", {"precio_forzado": 399990}),
         ("Precio a $349.990", {"precio_forzado": 349990})]
filas_sens = []
for etq, kw in casos:
    kw.setdefault("precio_forzado", P)
    rr = M.correr(capital_trabajo=CT, **kw)
    ss = M.resumen(rr)
    filas_sens.append([etq, fmt(rr["precio_lista"]), fmt(rr["filas"][0]["util_neta"]),
                       fmt(ss["van"]), porc(ss["tir"], 1),
                       fmt(min(x["caja"] for x in rr["filas"]))])
BLOQUES["SENSIBILIDAD"] = "\n\n".join([
    tabla(["Caso", "Precio", "Utilidad año 1", "VAN a 10 años", "TIR", "Caja mínima"], filas_sens),
    '###### **Tabla 2.9 “Análisis de Sensibilidad y Punto de Quiebre”**',
    "Se modifica una condición a la vez **manteniendo congelado el financiamiento**. El punto de quiebre "
    "del precio está cerca de $400.000: al precio de $349.990 de versiones anteriores del estudio, el "
    "proyecto arroja VAN negativo y caja que nunca se recupera.",
])

# -------------------------------------------------------------- descuento
flujos = [f["flujo"] for f in F]
BLOQUES["DESCUENTO"] = "\n\n".join([
    tabla(["Tasa efectiva anual", "VAN"],
          [[porc(t, 0), fmt(M.van(INV["total"], flujos, t))]
           for t in (0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50)]
          + [["TIR: %s" % porc(IND["tir"], 2), fmt(0)]]),
    '###### **Tabla 3.0 “Análisis del VAN”**',
])

# ----------------------------------------------------------------- cierre
BLOQUES["CIERRE"] = (
    "En el escenario base el proyecto presenta **VAN de %s**, **TIR efectiva anual de %s** y **payback "
    "simple de %s años**. La BOM asciende a **%s netos por equipo** y el precio de lista derivado es de "
    "**%s con IVA**. La empresa cancela su crédito dentro del horizonte y cierra %d con %s de caja."
    % (fmt(IND["van"]), porc(IND["tir"], 2), dec(IND["payback"]), fmt(M.BOM),
       fmt(R["precio_lista"]), M.ANIOS[-1], fmt(F[-1]["caja"])))


def main():
    texto = io.open(DESTINO, encoding="utf-8").read()
    escritos = []
    for clave, cuerpo in BLOQUES.items():
        patron = re.compile(
            r"(<!-- INFORME:%s:INICIO -->).*?(<!-- INFORME:%s:FIN -->)" % (clave, clave), re.S)
        nuevo, n = patron.subn(lambda m: m.group(1) + "\n\n" + cuerpo + "\n\n" + m.group(2), texto)
        if n:
            texto = nuevo
            escritos.append(clave)
    with io.open(DESTINO, "w", encoding="utf-8", newline="\r\n") as fh:
        fh.write(texto)
    print("Bloques del informe interno actualizados:", ", ".join(escritos) or "ninguno")


if __name__ == "__main__":
    main()
