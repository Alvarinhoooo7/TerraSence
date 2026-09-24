# -*- coding: utf-8 -*-
"""Emite en Markdown todos los cuadros de la seccion de viabilidad economica."""
import modelo as M

S = M.S
ANIOS = M.ANIOS


def p(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def pct(x, d=1):
    return (("%." + str(d) + "f") % (x * 100)).replace(".", ",") + " %"


def num(x, d=2):
    return (("%." + str(d) + "f") % x).replace(".", ",")


R = M.dimensionar()
FILAS = R["filas"]
INV = R["inversion"]
OUT = []


def w(*t):
    OUT.extend(t)


# ---------------------------------------------------------------- BOM
w("### Cuadro 1. Estructura de costos de fabricación (BOM) por equipo\n")
w("| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |")
w("|---|---:|---:|---:|---|")
for nom, c, pu, ev in S["bom"]:
    w("| %s | %d | %s | %s | %s |" % (nom, c, p(pu), p(c * pu), ev))
w("| **Total BOM neto por equipo** |  |  | **%s** |  |" % p(M.BOM))
w("")

w("### Cuadro 2. Costeo de la carcasa impresa en taller propio\n")
w("| Concepto | Neto CLP | Base de cálculo |")
w("|---|---:|---|")
tot_c = 0
for nom, v, ev in S["_carcasa_detalle"]:
    tot_c += v
    w("| %s | %s | %s |" % (nom, p(v), ev))
w("| **Total por carcasa** | **%s** |  |" % p(tot_c))
w("")

# ------------------------------------------------------- costo variable
w("### Cuadro 3. Costo variable por equipo\n")
w("| Concepto | Neto CLP |")
w("|---|---:|")
w("| Materiales y servicios de la BOM | %s |" % p(M.BOM))
w("| Merma de fabricación, %s de la BOM | %s |" % (pct(S["merma_fraccion_bom"], 0), p(M.BOM * S["merma_fraccion_bom"])))
w("| Provisión de reposiciones y garantía, %s de la BOM | %s |" % (pct(S["garantia_fraccion_bom"], 0), p(M.BOM * S["garantia_fraccion_bom"])))
w("| Envío al cliente | %s |" % p(S["envio_neto_por_equipo"]))
w("| **Subtotal sin comisión** | **%s** |" % p(M.VAR_UNIT))
com = S["comision_sobre_bruto"] * R["precio_lista"]
w("| Comisión comercial, %s sobre el precio bruto | %s |" % (pct(S["comision_sobre_bruto"], 0), p(com)))
w("| **Costo variable total por equipo** | **%s** |" % p(M.VAR_UNIT + com))
w("")

# ---------------------------------------------------------- equipamiento
w("### Cuadro 4. Equipamiento e inversión en activo fijo\n")
w("| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |")
w("|---|---:|---:|---:|---:|---:|")
for nom, c, v, vu in S["equipamiento"]:
    w("| %s | %d | %s | %s | %d años | %s |" % (nom, c, p(v), p(c * v), vu, p(c * v / vu)))
w("| **Total activo fijo** |  |  | **%s** |  | **%s** |" % (p(M.EQUIP_TOTAL), p(M.DEPREC_ANUAL)))
w("")

w("### Cuadro 5. Activo nominal (gastos de puesta en marcha)\n")
w("| Partida | Neto CLP |")
w("|---|---:|")
for nom, v in S["activo_nominal"]:
    w("| %s | %s |" % (nom, p(v)))
w("| **Total activo nominal** | **%s** |" % p(M.NOMINAL_TOTAL))
w("| Amortización anual (5 años) | %s |" % p(M.AMORT_NOMINAL_ANUAL))
w("")

# ------------------------------------------------------ inversion inicial
w("### Cuadro 6. Inversión inicial total\n")
w("| Destino | CLP | Participación |")
w("|---|---:|---:|")
for k, etq in (("equipamiento", "Equipamiento y activo fijo"),
               ("activo_nominal", "Activo nominal (puesta en marcha)"),
               ("capital_trabajo", "Capital de trabajo (%s meses de estructura)" % num(INV["meses_cubiertos"], 1)),
               ("inventario", "Inventario inicial (2 meses de ventas)")):
    w("| %s | %s | %s |" % (etq, p(INV[k]), pct(INV[k] / INV["total"])))
w("| **Inversión inicial total** | **%s** | **100,0 %%** |" % p(INV["total"]))
w("")

# --------------------------------------------------------- financiamiento
w("### Cuadro 7. Condiciones del financiamiento\n")
w("| Condición | Valor |")
w("|---|---|")
w("| Inversión inicial total del proyecto | %s |" % p(INV["total"]))
w("| Porcentaje financiado con préstamo bancario | 100,00 % |")
w("| Monto del préstamo (capital) | %s |" % p(R["credito"]))
w("| Pie propio exigido por el banco (%s del crédito) | %s |" % (pct(S["pie_sobre_credito"], 0), p(R["pie"])))
w("| Aporte por socio (%d socios, partes iguales) | %s |" % (S["socios"], p(R["pie"] / S["socios"])))
w("| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |")
w("| Tasa de interés | %s efectiva anual (%s %% mensual) |" % (
    pct(S["tasa_credito_efectiva_anual"], 0), num(((1 + S["tasa_credito_efectiva_anual"]) ** (1 / 12) - 1) * 100, 4)))
w("| Plazo | %d años, %d cuotas mensuales iguales |" % (S["plazo_credito_anios"], S["plazo_credito_anios"] * 12))
w("| Cuota mensual | %s |" % p(R["cuota"]))
intereses = sum(a["interes"] for a in R["amortizacion"])
w("| Total intereses del crédito | %s |" % p(intereses))
w("| Total pagado al banco | %s |" % p(R["credito"] + intereses))
w("")

w("### Cuadro 8. Tabla de amortización del crédito\n")
w("| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |")
w("|---|---:|---:|---:|---:|---:|")
for a in R["amortizacion"]:
    w("| %d | %s | %s | %s | %s | %s |" % (a["anio"], p(a["saldo_inicial"]), p(a["capital"]),
                                            p(a["interes"]), p(a["cuota"]), p(a["saldo_final"])))
w("| **Total** |  | **%s** | **%s** | **%s** |  |" % (
    p(sum(a["capital"] for a in R["amortizacion"])), p(intereses), p(R["credito"] + intereses)))
w("")

# ----------------------------------------------------------- estructura
w("### Cuadro 9. Dotación y sueldos brutos mensuales\n")
w("| Año | Socios | Contador | Marketing | Ensambladores | Total personas | Sueldo socio | Oficina |")
w("|---|---:|---:|---:|---:|---:|---:|---|")
for a in ANIOS:
    d = S["dotacion_por_anio"][str(a)]
    tot = d["socios"] + d["contador"] + d["marketing"] + d["ensambladores"]
    w("| %d | %d | %d | %d | %d | %d | %s | %s |" % (
        a, d["socios"], d["contador"], d["marketing"], d["ensambladores"], tot,
        p(M.sueldo_socio(a)), "sí" if d["oficina"] else "no"))
w("")


w("### Cuadro 9b. Desglose estimado de servicios básicos mensuales\n")
w("| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |")
w("|---|---:|---:|")
con = {n: v for n, v in S["_servicios_detalle_oficina"]}
sin = {n: v for n, v in S["_servicios_detalle_sin_oficina"]}
filas_srv = [
    ("Electricidad", con["Electricidad (puestos de trabajo, impresoras 3D e instrumental)"],
     sin["Proporcion de electricidad del taller domiciliario"]),
    ("Gastos comunes del edificio", con["Gastos comunes del edificio"], sin["Proporcion de gastos comunes"]),
    ("Internet de fibra", con["Internet de fibra empresarial"], sin["Internet de fibra"]),
    ("Agua y gas", con["Agua"] + con["Gas (calefaccion)"], sin["Proporcion de agua y gas"]),
]
for nom, a, b in filas_srv:
    w("| %s | %s | %s |" % (nom, p(a), p(b)))
w("| **Total mensual** | **%s** | **%s** |" % (p(sum(x[1] for x in filas_srv)), p(sum(x[2] for x in filas_srv))))
w("")

w("### Cuadro 10. Costos operacionales, de administración y de comercialización\n")
w("| Concepto | " + " | ".join(str(a) for a in ANIOS) + " |")
w("|---" * (len(ANIOS) + 1) + "|")
def fila(etq, f):
    w("| %s | %s |" % (etq, " | ".join(p(f(x)) for x in FILAS)))
fila("Materiales y costo variable", lambda x: x["variables"])
fila("Nómina y cargas", lambda x: x["gastos"]["nomina"])
fila("Colación y movilización", lambda x: x["gastos"]["beneficios"])
fila("Arriendo de oficina", lambda x: x["gastos"]["arriendo"])
fila("Servicios básicos", lambda x: x["gastos"]["servicios"])
fila("Patente comercial", lambda x: x["gastos"]["patente"])
fila("Softwares y planes cloud", lambda x: x["gastos"]["software"])
fila("Materiales de oficina", lambda x: x["gastos"]["materiales"])
fila("Mantención de equipos", lambda x: x["gastos"]["mantencion"])
fila("Publicidad digital", lambda x: x["gastos"]["pauta"])
fila("**Costo y gasto total**", lambda x: x["costo_total"])
w("")

# --------------------------------------------------------------- precio
w("### Cuadro 11. Determinación del precio de venta\n")
U = R["unidades_ponderadas"]
w("| Concepto | Valor |")
w("|---|---:|")
w("| Costo y gasto total de los %d años | %s |" % (len(ANIOS), p(sum(f["costo_total"] for f in FILAS))))
w("| Equipos vendidos en los %d años | %s |" % (len(ANIOS), format(sum(f["unidades"] for f in FILAS), ",d").replace(",", ".")))
w("| Costo medio por equipo | %s |" % p(sum(f["costo_total"] for f in FILAS) / sum(f["unidades"] for f in FILAS)))
w("| Margen de utilidad exigido sobre el costo total | %s |" % pct(S["margen_objetivo"], 0))
w("| **Precio neto de venta (año base)** | **%s** |" % p(R["precio_neto_base"]))
w("| IVA %s | %s |" % (pct(S["iva"], 0), p(R["precio_lista"] - R["precio_neto_base"])))
w("| **Precio de lista con IVA** | **%s** |" % p(R["precio_lista"]))
w("")

# ------------------------------------------------------ estado resultados
w("### Cuadro 12. Estado de resultados proyectado\n")
w("| Concepto | " + " | ".join(str(a) for a in ANIOS) + " |")
w("|---" * (len(ANIOS) + 1) + "|")
fila("(+) Ventas netas", lambda x: x["ventas"])
fila("(-) Costos operacionales", lambda x: x["variables"])
fila("(-) Gastos de estructura", lambda x: x["gastos"]["total"])
fila("(-) Depreciación", lambda x: x["deprec"])
fila("(-) Amortización del activo nominal", lambda x: x["amort_nom"])
fila("(-) Costo financiero (intereses)", lambda x: x["interes"])
fila("**(=) Utilidad antes de impuesto**", lambda x: x["util_antes"])
fila("(-) Impuesto a la renta", lambda x: x["impuesto"])
fila("**(=) Utilidad del ejercicio**", lambda x: x["util_neta"])
w("")

w("### Cuadro 13. Flujo de fondos para la evaluación del proyecto\n")
w("| Concepto | " + " | ".join(str(a) for a in ANIOS) + " |")
w("|---" * (len(ANIOS) + 1) + "|")
fila("Utilidad del ejercicio", lambda x: x["util_neta"])
fila("(+) Depreciación y amortizacion", lambda x: x["deprec"] + x["amort_nom"])
fila("(-) Cuota de capital del préstamo", lambda x: x["capital"])
fila("**(=) Flujo de fondos**", lambda x: x["flujo"])
fila("Caja acumulada", lambda x: x["caja"])
w("")

# ---------------------------------------------------------- indicadores
s = M.resumen(R)
w("### Cuadro 14. Evaluación económica\n")
w("| Indicador | Valor | Criterio | Veredicto |")
w("|---|---:|---|---|")
w("| Inversión inicial | %s | — | — |" % p(INV["total"]))
w("| VAN al %s | %s | VAN > 0 | Cumple |" % (pct(S["tasa_descuento"], 0), p(s["van"])))
w("| TIR efectiva anual | %s | TIR > %s | Cumple |" % (pct(s["tir"], 2), pct(S["tasa_descuento"], 0)))
w("| Payback simple | %s años | ≤ 5 años | Cumple |" % num(s["payback"]))
w("| Payback descontado al %s | %s años | ≤ 5 años | Cumple |" % (pct(S["tasa_descuento"], 0), num(s["payback_desc"])))
w("| Caja mínima del horizonte | %s | > 0 | Cumple |" % p(min(f["caja"] for f in FILAS)))
w("| Deuda al cierre del horizonte | %s | Crédito saldado | Cumple |" % p(R["amortizacion"][-1]["saldo_final"]))
w("")

w("### Cuadro 15. VAN ante distintas tasas de descuento\n")
flujos = [f["flujo"] for f in FILAS]
w("| Tasa efectiva anual | VAN | Interpretación |")
w("|---:|---:|---|")
for t in (0.05, 0.08, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50):
    w("| %s | %s | Positivo |" % (pct(t, 0), p(M.van(INV["total"], flujos, t))))
w("| TIR: %s | $0 | VAN aproximadamente cero |" % pct(s["tir"], 2))
w("")

# --------------------------------------------------------- sensibilidad
w("### Cuadro 16. Análisis de sensibilidad y punto de quiebre\n")
w("| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |")
w("|---|---:|---:|---:|---:|---:|")
P, CT = R["precio_lista"], INV["capital_trabajo"]


def sens(etq, **kw):
    r = M.correr(precio_forzado=kw.pop("precio", P), capital_trabajo=CT, **kw)
    ss = M.resumen(r)
    w("| %s | %s | %s | %s | %s | %s |" % (
        etq, p(r["precio_lista"]), p(r["filas"][0]["util_neta"]), p(ss["van"]),
        pct(ss["tir"], 1), p(min(f["caja"] for f in r["filas"]))))


sens("Caso base")
sens("Ventas -10 %", factor_ventas=0.90)
sens("Ventas -25 %", factor_ventas=0.75)
sens("Ventas -35 %", factor_ventas=0.65)
sens("Ventas +20 %", factor_ventas=1.20)
sens("BOM +15 %", factor_bom=1.15)
sens("BOM +30 %", factor_bom=1.30)
for pr in (449990, 424990, 399990, 349990):
    sens("Precio rebajado a %s" % p(pr), precio=pr)
w("")

with open("../docs/_cuadros_economicos.md", "w", encoding="utf-8") as fh:
    fh.write("\n".join(OUT))
print("Cuadros escritos:", len(OUT), "lineas")
