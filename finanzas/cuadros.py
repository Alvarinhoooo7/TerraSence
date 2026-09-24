# -*- coding: utf-8 -*-
"""Emite en Markdown todos los cuadros de la seccion de viabilidad economica.

Los cuadros se numeran en el orden en que aparecen en el informe; cada uno abre
con "### Cuadro N. Titulo" y `corregir_informe.py` lo convierte en rotulo de tabla.
"""
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
IND = M.resumen(R)
OUT = []
N = [0]

# Datos del costo total de propiedad del agricultor (supuestos S1 y S2 del informe)
KIT_BATERIA = 24990
LAB_MUESTRA, ASESORIA_VISITA = 50000, 60000


def w(*t):
    OUT.extend(t)


def cuadro(titulo):
    N[0] += 1
    w("### Cuadro %d. %s\n" % (N[0], titulo))


def fila(etq, f):
    w("| %s | %s |" % (etq, " | ".join(p(f(x)) for x in FILAS)))


def encabezado_anual():
    w("| Concepto | " + " | ".join(str(a) for a in ANIOS) + " |")
    w("|---" * (len(ANIOS) + 1) + "|")


# ------------------------------------------------------ tres economias
cuadro("Economías del análisis")
w("| Economía | Qué mide | Con qué se evalúa |")
w("|---|---|---|")
w("| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |")
w("| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |")
w("| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |")
w("")

# ---------------------------------------------------------------- BOM
cuadro("Estructura de costos de fabricación (BOM) por equipo")
w("| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |")
w("|---|---:|---:|---:|---|")
for nom, c, pu, ev in S["bom"]:
    w("| %s | %d | %s | %s | %s |" % (nom, c, p(pu), p(c * pu), ev))
w("| **Total BOM neto por equipo** |  |  | **%s** |  |" % p(M.BOM))
w("")

cuadro("Costeo de la carcasa impresa en taller propio")
w("| Concepto | Neto CLP | Base de cálculo |")
w("|---|---:|---|")
tot_c = 0
for nom, v, ev in S["_carcasa_detalle"]:
    tot_c += v
    w("| %s | %s | %s |" % (nom, p(v), ev))
w("| **Total por carcasa** | **%s** |  |" % p(tot_c))
w("")

# ------------------------------------------------------- costo variable
cuadro("Costo variable por equipo")
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
cuadro("Equipamiento e inversión en activo fijo")
w("| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |")
w("|---|---:|---:|---:|---:|---:|")
for nom, c, v, vu in S["equipamiento"]:
    w("| %s | %d | %s | %s | %d años | %s |" % (nom, c, p(v), p(c * v), vu, p(c * v / vu)))
w("| **Total activo fijo** |  |  | **%s** |  | **%s** |" % (p(M.EQUIP_TOTAL), p(M.DEPREC_ANUAL)))
w("")

cuadro("Activo nominal (gastos de puesta en marcha)")
w("| Partida | Neto CLP |")
w("|---|---:|")
for nom, v in S["activo_nominal"]:
    w("| %s | %s |" % (nom, p(v)))
w("| **Total activo nominal** | **%s** |" % p(M.NOMINAL_TOTAL))
w("| Amortización anual (5 años) | %s |" % p(M.AMORT_NOMINAL_ANUAL))
w("")

# ------------------------------------------------------ inversion inicial
cuadro("Inversión inicial total")
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
cuadro("Condiciones del financiamiento")
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

cuadro("Tabla de amortización del crédito")
w("| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |")
w("|---|---:|---:|---:|---:|---:|")
for a in R["amortizacion"]:
    w("| %d | %s | %s | %s | %s | %s |" % (a["anio"], p(a["saldo_inicial"]), p(a["capital"]),
                                            p(a["interes"]), p(a["cuota"]), p(a["saldo_final"])))
w("| **Total** |  | **%s** | **%s** | **%s** |  |" % (
    p(sum(a["capital"] for a in R["amortizacion"])), p(intereses), p(R["credito"] + intereses)))
w("")

# ----------------------------------------------------------- estructura
cuadro("Dotación por año")
w("| Año | Socios | Contador | Marketing | Ensambladores | Total personas | Oficina |")
w("|---|---:|---:|---:|---:|---:|---|")
for a in ANIOS:
    d = S["dotacion_por_anio"][str(a)]
    tot = d["socios"] + d["contador"] + d["marketing"] + d["ensambladores"]
    w("| %d | %d | %d | %d | %d | %d | %s |" % (
        a, d["socios"], d["contador"], d["marketing"], d["ensambladores"], tot,
        "sí" if d["oficina"] else "no"))
w("")

cuadro("Sueldo bruto mensual por cargo y costo laboral anual")
w("| Año | Socio (c/u) | Contador | Marketing | Ensamblador (c/u) | Masa salarial bruta mensual | Cargas del empleador y provisiones | Costo laboral anual |")
w("|---|---:|---:|---:|---:|---:|---:|---:|")
for a in ANIOS:
    d = S["dotacion_por_anio"][str(a)]
    f = M.infl(a)
    costo, _, _, bruto = M.nomina(a)

    def cargo(clave, sueldo):
        return p(sueldo * f) if d[clave] else "—"

    w("| %d | %s | %s | %s | %s | %s | %s | %s |" % (
        a, p(M.sueldo_socio(a)), cargo("contador", S["sueldo_contador"]),
        cargo("marketing", S["sueldo_marketing"]), cargo("ensambladores", S["sueldo_ensamblador"]),
        p(bruto), pct(M.factor_empleador(a) - 1), p(costo)))
w("")

cuadro("Desglose estimado de servicios básicos mensuales")
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

cuadro("Costos operacionales, de administración y de comercialización")
encabezado_anual()
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
cuadro("Determinación del precio de venta")
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
cuadro("Estado de resultados proyectado")
encabezado_anual()
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

cuadro("Flujo de fondos para la evaluación del proyecto")
encabezado_anual()
fila("Utilidad del ejercicio", lambda x: x["util_neta"])
fila("(+) Depreciación y amortización", lambda x: x["deprec"] + x["amort_nom"])
fila("(-) Cuota de capital del préstamo", lambda x: x["capital"])
fila("(-) Reinversión en activo fijo", lambda x: x["reinversion"])
fila("**(=) Flujo de fondos**", lambda x: x["flujo"])
fila("Caja acumulada", lambda x: x["caja"])
w("")

# ---------------------------------------------------------- indicadores
def veredicto(ok):
    return "Cumple" if ok else "No cumple"


caja_min = M.caja_minima(R)
cuadro("Evaluación económica")
w("| Indicador | Valor | Criterio | Veredicto |")
w("|---|---:|---|---|")
w("| Inversión inicial | %s | — | — |" % p(INV["total"]))
w("| VAN al %s | %s | VAN > 0 | %s |" % (pct(S["tasa_descuento"], 0), p(IND["van"]), veredicto(IND["van"] > 0)))
w("| TIR efectiva anual | %s | TIR > %s | %s |" % (pct(IND["tir"], 2), pct(S["tasa_descuento"], 0),
                                                   veredicto(IND["tir"] > S["tasa_descuento"])))
w("| Payback simple | %s años | ≤ 5 años | %s |" % (num(IND["payback"]), veredicto(IND["payback"] <= 5)))
w("| Payback descontado al %s | %s años | ≤ 5 años | %s |" % (
    pct(S["tasa_descuento"], 0), num(IND["payback_desc"]), veredicto(IND["payback_desc"] <= 5)))
w("| Caja mínima del horizonte | %s | > 0 | %s |" % (p(caja_min), veredicto(caja_min > 0)))
w("| Deuda al cierre del horizonte | %s | Crédito saldado | %s |" % (
    p(R["amortizacion"][-1]["saldo_final"]), veredicto(R["amortizacion"][-1]["saldo_final"] < 1)))
w("")

flujos = [f["flujo"] for f in FILAS]
cuadro("Comparación del horizonte de evaluación: cinco y diez años")
w("| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |")
w("|---|---:|---:|")
w("| VAN al %s | %s | %s |" % (pct(S["tasa_descuento"], 0), p(M.van(INV["total"], flujos[:5], S["tasa_descuento"])),
                             p(IND["van"])))
w("| TIR efectiva anual | %s | %s |" % (pct(M.tir(INV["total"], flujos[:5]), 2), pct(IND["tir"], 2)))
w("| Caja acumulada al cierre | %s | %s |" % (p(FILAS[4]["caja"]), p(FILAS[-1]["caja"])))
w("| Deuda bancaria pendiente al cierre | %s | %s |" % (p(R["amortizacion"][4]["saldo_final"]),
                                                      p(R["amortizacion"][-1]["saldo_final"])))
w("")

cuadro("VAN ante distintas tasas de descuento")
w("| Tasa efectiva anual | VAN | Interpretación |")
w("|---:|---:|---|")
for t in (0.05, 0.08, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50):
    v = M.van(INV["total"], flujos, t)
    w("| %s | %s | %s |" % (pct(t, 0), p(v), "Positivo" if v > 0 else "Negativo"))
w("| TIR: %s | $0 | VAN aproximadamente cero |" % pct(IND["tir"], 2))
w("")

# --------------------------------------------------------- sensibilidad
cuadro("Análisis de sensibilidad y punto de quiebre")
w("| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |")
w("|---|---:|---:|---:|---:|---:|")
P, CT = R["precio_lista"], INV["capital_trabajo"]


def sens(etq, **kw):
    r = M.correr(precio_forzado=kw.pop("precio", P), capital_trabajo=CT, **kw)
    ss = M.resumen(r)
    w("| %s | %s | %s | %s | %s | %s |" % (
        etq, p(r["precio_lista"]), p(r["filas"][0]["util_neta"]), p(ss["van"]),
        pct(ss["tir"], 1), p(M.caja_minima(r))))


def precio_rebajado(fraccion):
    """Precio de lista rebajado en la fraccion dada, redondeado a un valor comercial terminado en 990."""
    return int(round(P * (1 - fraccion), -4)) - 10


REBAJAS = (0.05, 0.10, 0.15, 0.20)
sens("Caso base")
sens("Ventas -10 %", factor_ventas=0.90)
sens("Ventas -25 %", factor_ventas=0.75)
sens("Ventas -35 %", factor_ventas=0.65)
sens("Ventas +20 %", factor_ventas=1.20)
sens("BOM +15 %", factor_bom=1.15)
sens("BOM +30 %", factor_bom=1.30)
for fr in REBAJAS:
    pr = precio_rebajado(fr)
    sens("Precio rebajado a %s (−%s)" % (p(pr), pct(1 - pr / P)), precio=pr)
w("")

# --------------------------------------------------- costo total del cliente
PRECIO = R["precio_lista"]
TCO = {  # acumulado a 1, 3, 5 y 10 años
    "terrasense": (PRECIO, PRECIO + KIT_BATERIA, PRECIO + KIT_BATERIA, 2 * PRECIO + 2 * KIT_BATERIA),
}
cuadro("Costo total de propiedad para el agricultor")
w("| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |")
w("|---|---|---:|---:|---:|---:|")
w("| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | %s |"
  % " | ".join(p(x) for x in TCO["terrasense"]))
for etq, intensidad, unidades, costo in (
        ("Análisis de laboratorio (S1)", "Uso habitual: 4 muestras/año", 4, LAB_MUESTRA),
        ("Análisis de laboratorio (S1)", "Uso intensivo: 20 muestras/año", 20, LAB_MUESTRA),
        ("Asesoría agronómica externa (S2)", "Uso habitual: 2 visitas/año", 2, ASESORIA_VISITA),
        ("Asesoría agronómica externa (S2)", "Uso intensivo: 12 visitas/año", 12, ASESORIA_VISITA)):
    anual = unidades * costo
    w("| %s | %s | %s |" % (etq, intensidad, " | ".join(p(anual * n) for n in (1, 3, 5, 10))))
w("")

with open("../docs/_cuadros_economicos.md", "w", encoding="utf-8") as fh:
    fh.write("\n".join(OUT))
print("Cuadros escritos:", N[0], "cuadros,", len(OUT), "lineas")
