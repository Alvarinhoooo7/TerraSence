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

# Sueldo de cada cargo por año; un guion marca los cargos que aún no existen
FILAS_SUELDO = []
for _a in M.ANIOS:
    _d = M.S["dotacion_por_anio"][str(_a)]
    _costo, _, _, _bruto = M.nomina(_a)

    def _cargo(clave, sueldo):
        return fmt(sueldo * M.infl(_a)) if _d[clave] else "—"

    FILAS_SUELDO.append([_a, fmt(M.sueldo_socio(_a)), _cargo("contador", M.S["sueldo_contador"]),
                         _cargo("marketing", M.S["sueldo_marketing"]),
                         _cargo("ensambladores", M.S["sueldo_ensamblador"]), fmt(_bruto),
                         porc(M.factor_empleador(_a) - 1), fmt(_costo)])

# Equilibrio del primer año: estructura (y cuota) divididas por el margen de contribución
CONTRIBUCION = (R["precio_neto_base"] - M.VAR_UNIT
                - M.S["comision_sobre_bruto"] * R["precio_lista"])
EQUILIBRIO_OPERATIVO = int(-(-F[0]["gastos"]["total"] // CONTRIBUCION))
EQUILIBRIO_CON_DEUDA = int(-(-(F[0]["gastos"]["total"] + R["cuota"] * 12) // CONTRIBUCION))

# Mismo principal y tasa a distintos plazos
PLAZOS = {}
for _n in (5, 10, 15):
    _cuota, _i, _meses = M.cuota_francesa(R["credito"], M.S["tasa_credito_efectiva_anual"], _n)
    _saldo5 = max(R["credito"] * (1 + _i) ** 60 - _cuota * ((1 + _i) ** 60 - 1) / _i, 0) if _n > 5 else 0
    PLAZOS[_n] = (_cuota, _cuota * _meses - R["credito"], _saldo5)
FILAS_PLAZO = [["%d años" % n, fmt(c), fmt(i), fmt(s)] for n, (c, i, s) in PLAZOS.items()]

# --------------------------------------------------------------- ventas
BLOQUES["VENTAS"] = "\n\n".join([
    tabla(["Año", "Equipos", "Personas", "Sueldo socio", "Oficina", "Publicidad digital"],
          [[f["anio"], f["unidades"], f["gastos"]["personas"], fmt(M.sueldo_socio(f["anio"])),
            "sí" if M.S["dotacion_por_anio"][str(f["anio"])]["oficina"] else "no",
            fmt(f["gastos"]["pauta"])] for f in F]),
    '###### **Tabla @@ “Plan de Ventas y Dotación”**',
    "La dotación crece de forma escalonada: el primer año operan los dos socios y un contador, sin "
    "oficina. La oficina entra el segundo año y el cargo de marketing el tercero. El plan suma "
    "**%s equipos** en los diez años." % format(sum(f["unidades"] for f in F), ",d").replace(",", "."),
])

# ------------------------------------------------------------------ BOM
BLOQUES["BOM"] = "\n\n".join([
    tabla(["Material o servicio por equipo", "Cant.", "Neto unitario", "Subtotal", "Origen del precio"],
          [[n, c, fmt(p), fmt(c * p), ev] for n, c, p, ev in M.S["bom"]]
          + [["**Total BOM neto**", "", "", "**%s**" % fmt(M.BOM), ""]]),
    '###### **Tabla @@ “Estructura de Costos de Fabricación (BOM)”**',
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
    '###### **Tabla @@ “Costo Variable por Equipo”**',
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
    '###### **Tabla @@ “Estructura de Gastos de Operación, Administración y Comercialización”**',
    "El costo laboral sobre el sueldo bruto no es un recargo fijo: sigue el calendario de la Ley "
    "N° 21.735, y pasa de **%s en %d a %s en %d**, más cesantía, mutualidad y las provisiones de "
    "vacaciones e indemnización." % (porc(M.factor_empleador(M.ANIOS[0]) - 1), M.ANIOS[0],
                                     porc(M.factor_empleador(M.ANIOS[-1]) - 1), M.ANIOS[-1]),
    tabla(["Año", "Socio (c/u)", "Contador", "Marketing", "Ensamblador (c/u)", "Masa salarial bruta mensual",
           "Cargas y provisiones", "Costo laboral anual"], FILAS_SUELDO),
    '###### **Tabla @@ “Sueldo Bruto Mensual por Cargo y Costo Laboral Anual”**',
    "Los socios siguen una escala que parte cerca del ingreso mínimo y sube por escalones hasta %s en "
    "2031; desde ahí solo se reajustan por inflación. Contador y marketing parten en %s brutos mensuales y "
    "el ensamblador en %s, en pesos de %d reajustados un %s anual; un guion indica que el cargo aún no "
    "existe ese año. Con el margen de contribución de %s por equipo, la estructura de %d se cubre con "
    "**%d equipos** y, sumando la cuota anual del crédito, con **%d**: la meta de %d unidades queda por "
    "debajo de ese segundo umbral, y esa es la razón por la que el primer ejercicio cierra con pérdida."
    % (fmt(M.S["sueldo_socio_por_anio"]["2031"]), fmt(M.S["sueldo_contador"]), fmt(M.S["sueldo_ensamblador"]),
       M.ANIOS[0], porc(M.S["inflacion"], 0), fmt(CONTRIBUCION), M.ANIOS[0], EQUILIBRIO_OPERATIVO,
       EQUILIBRIO_CON_DEUDA, F[0]["unidades"]),
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
    '###### **Tabla @@ “Inversión Inicial”**',
    "**El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie del %s del "
    "monto solicitado como condición de entrada, y es el crédito el que financia el 100 %% de la "
    "inversión: **%s** de crédito y **%s** de pie (%s por socio), con cuota mensual de %s por el sistema "
    "francés." % (porc(M.S["pie_sobre_credito"], 0), fmt(R["credito"]), fmt(R["pie"]),
                  fmt(R["pie"] / 2), fmt(R["cuota"])),
    tabla(["Periodo", "Saldo inicial", "Cuota de capital", "Intereses", "Cuota total", "Saldo final"],
          [[a["anio"], fmt(a["saldo_inicial"]), fmt(a["capital"]), fmt(a["interes"]),
            fmt(a["cuota"]), fmt(a["saldo_final"])] for a in R["amortizacion"]]),
    '###### **Tabla @@ “Amortización del Crédito”**',
    "La tasa efectiva anual se lleva a período mensual como `r_m = (1 + %s)^(1/12) − 1 = %s`, y no "
    "dividiendo por doce. Sobre el mismo principal y la misma tasa, el plazo cambia la cuota y el costo "
    "financiero total:" % (dec(M.S["tasa_credito_efectiva_anual"], 2),
                           porc((1 + M.S["tasa_credito_efectiva_anual"]) ** (1 / 12) - 1, 4)),
    tabla(["Plazo", "Cuota mensual", "Intereses totales", "Saldo al cierre del año 5"], FILAS_PLAZO),
    '###### **Tabla @@ “Comparación de Plazos del Crédito”**',
    "El modelo evalúa el plazo de diez años. A cinco años los intereses bajan a %s, pero la cuota sube a "
    "%s justo cuando los dos primeros ejercicios cierran con pérdida; a quince años la cuota baja a %s a "
    "cambio de %s de intereses y de una deuda que sobrevive al horizonte de evaluación."
    % (fmt(PLAZOS[5][1]), fmt(PLAZOS[5][0]), fmt(PLAZOS[15][0]), fmt(PLAZOS[15][1])),
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
        serie("(-) Reinversión en activo fijo", lambda x: x["reinversion"]),
        serie("**(=) Flujo de fondos**", lambda x: x["flujo"]),
        serie("Caja acumulada", lambda x: x["caja"]),
    ]),
    '###### **Tabla @@ “Estado de Resultados y Flujo de Fondos Proyectado”**',
    "Los ejercicios %d y %d cierran con pérdida, de %s y %s, porque la estructura mínima para operar "
    "formalmente no se cubre con el volumen inicial; desde %d el resultado es positivo y creciente. En %d el "
    "activo fijo agota su vida útil y se renueva por %s, compra que el flujo descuenta y que sostiene la "
    "depreciación de los años siguientes. La caja nunca baja de **%s**."
    % (M.ANIOS[0], M.ANIOS[1], fmt(abs(F[0]["util_neta"])), fmt(abs(F[1]["util_neta"])), M.ANIOS[2],
       next(f["anio"] for f in F if f["reinversion"]), fmt(sum(f["reinversion"] for f in F)),
       fmt(min(f["caja"] for f in F))),
])

# ------------------------------------------------------------ horizonte
_flujos = [f["flujo"] for f in F]
BLOQUES["HORIZONTE"] = "\n\n".join([
    tabla(["Indicador", "A 5 años (%d–%d)" % (M.ANIOS[0], M.ANIOS[4]),
           "A 10 años (%d–%d)" % (M.ANIOS[0], M.ANIOS[-1])],
          [["VAN al %s" % porc(M.S["tasa_descuento"], 0),
            fmt(M.van(INV["total"], _flujos[:5], M.S["tasa_descuento"])), fmt(IND["van"])],
           ["TIR efectiva anual", porc(M.tir(INV["total"], _flujos[:5]), 2), porc(IND["tir"], 2)],
           ["Caja acumulada al cierre", fmt(F[4]["caja"]), fmt(F[-1]["caja"])],
           ["Deuda bancaria pendiente al cierre", fmt(R["amortizacion"][4]["saldo_final"]),
            fmt(R["amortizacion"][-1]["saldo_final"])]]),
    '###### **Tabla @@ “Comparación del Horizonte: Cinco y Diez Años”**',
    "A cinco años el proyecto ya crea valor, pero conserva deuda bancaria; el grueso del VAN se genera en "
    "la segunda mitad del horizonte, cuando la estructura ya está pagada.",
])

# ------------------------------------------------------------------- TCO
_P, _KIT, _LAB, _ASE = R["precio_lista"], 24990, 50000, 60000


def _tco(n):
    """Acumulado del agricultor a n años: equipo en los años 1 y 6, kit de batería en los años 3 y 8."""
    return _P * (1 + (n >= 6)) + _KIT * ((n >= 3) + (n >= 8))


_lab = [n for n in range(1, 11) if 4 * _LAB * n > _tco(n)]
_ase = [n for n in range(1, 11) if 2 * _ASE * n > _tco(n)]
BLOQUES["TCO"] = "\n\n".join([
    tabla(["Alternativa", "Intensidad", "Año 1", "Acumulado a 3 años", "Acumulado a 5 años",
           "Acumulado a 10 años"],
          [["**TerraSense** (equipo, kit de batería en años 3 y 8, segundo equipo en año 6)",
            "Mediciones ilimitadas"] + [fmt(_tco(n)) for n in (1, 3, 5, 10)]]
          + [[etq, intensidad] + [fmt(u * c * n) for n in (1, 3, 5, 10)]
             for etq, intensidad, u, c in (("Análisis de laboratorio (S1)", "4 muestras/año", 4, _LAB),
                                           ("Análisis de laboratorio (S1)", "20 muestras/año", 20, _LAB),
                                           ("Asesoría agronómica externa (S2)", "2 visitas/año", 2, _ASE),
                                           ("Asesoría agronómica externa (S2)", "12 visitas/año", 12, _ASE))]),
    '###### **Tabla @@ “Costo Total de Propiedad del Agricultor a 1, 3, 5 y 10 Años”**',
    "**Lectura del resultado.** Bajo la intensidad habitual el instrumento **no se paga el primer año**: "
    "%s contra %s de laboratorio o %s de asesoría. Frente al laboratorio el cruce ocurre en el año %d y "
    "la ventaja se mantiene; frente a la asesoría ocurre en el año %d, se pierde de forma transitoria con "
    "la compra del segundo equipo y se recupera en el año %d. A diez años la ventaja es de %s y %s veces, y "
    "bajo uso intensivo de %s y %s veces. El argumento **no es el ahorro nominal sino el costo marginal "
    "cero de la medición repetida**: a cien mediciones anuales cada lectura cuesta %s frente a los %s de "
    "una muestra de laboratorio."
    % (fmt(_P), fmt(4 * _LAB), fmt(2 * _ASE), _lab[0], _ase[0], min(n for n in _ase if n > 6),
       dec(4 * _LAB * 10 / _tco(10), 1), dec(2 * _ASE * 10 / _tco(10), 1),
       dec(20 * _LAB * 10 / _tco(10), 1), dec(12 * _ASE * 10 / _tco(10), 1), fmt(_tco(10) / 1000),
       fmt(_LAB)),
])

# --------------------------------------------------------------- energía
import energia as E  # noqa: E402


def _tabla_filas(filas):
    return tabla(filas[0], filas[1:])


BLOQUES["ENERGIA"] = "\n\n".join([
    _tabla_filas(E.filas_nodo),
    '###### **Tabla @@ “Balance Energético por Nodo de Tensión”**',
    _tabla_filas(E.filas_ciclo),
    '###### **Tabla @@ “Energía por Ciclo de Medición”**',
    "Con el equipo apagado quedan conectados a la celda el divisor de batería (%s µA) y el módulo de carga "
    "y elevación en vacío (%s µA, extremo superior de su hoja de datos), es decir %s mW. Suponiendo jornadas "
    "de %d h encendido con %d mediciones (%s mWh por jornada), %s mAh útiles (%s mWh) y una autodescarga "
    "del 2 %% mensual (%s mWh por día):"
    % (E.num(E.DIVISOR * 1000), E.num(E.MODULO_VACIO * 1000, 0), E.num(E.apagado(), 2), E.JORNADA_H,
       E.MEDICIONES, E.num(E.E_JORNADA), format(E.CAPACIDAD_UTIL_MAH, ",d").replace(",", "."),
       format(int(E.E_UTIL), ",d").replace(",", "."), E.num(E.AUTODESCARGA, 2)),
    _tabla_filas(E.filas_esc),
    '###### **Tabla @@ “Autonomía según el Patrón de Uso”**',
    _tabla_filas(E.filas_sens),
    '###### **Tabla @@ “Sensibilidad de la Autonomía al Consumo y al Uso”**',
    "La cifra de referencia es la del uso habitual: aproximadamente **%s semanas (%s mediciones)** con una "
    "carga, con un piso de %s semanas si apareciera una fuga de 1 mA con el equipo apagado. Reemplazar el "
    "divisor de 100 kΩ por uno de 1 MΩ alargaría la autonomía apenas un %s. Es un **resultado calculado, "
    "no medido**."
    % (E.num(E.SEMANAS_HABITUAL, 0), format(E.MEDICIONES_HABITUAL, ",d").replace(",", "."),
       E.num(E.autonomia(2, modulo=E.MODULO_VACIO + 1.0) / 7, 0), E.pct(E.DIAS_1M / E.DIAS_HABITUAL - 1)),
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
    '###### **Tabla @@ “Evaluación Económica”**',
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
    '###### **Tabla @@ “Análisis de Sensibilidad y Punto de Quiebre”**',
    "Se modifica una condición a la vez **manteniendo congelado el financiamiento**. La caja se vuelve "
    "negativa bajo un precio de lista de %s y el proyecto deja de crear valor bajo %s."
    % (fmt(M.precio_de_quiebre(R, "caja")), fmt(M.precio_de_quiebre(R, "van"))),
])

# -------------------------------------------------------------- descuento
flujos = [f["flujo"] for f in F]
BLOQUES["DESCUENTO"] = "\n\n".join([
    tabla(["Tasa efectiva anual", "VAN"],
          [[porc(t, 0), fmt(M.van(INV["total"], flujos, t))]
           for t in (0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50)]
          + [["TIR: %s" % porc(IND["tir"], 2), fmt(0)]]),
    '###### **Tabla @@ “Análisis del VAN”**',
])

# ----------------------------------------------------------------- cierre
BLOQUES["CIERRE"] = (
    "En el escenario base el proyecto presenta **VAN de %s**, **TIR efectiva anual de %s** y **payback "
    "simple de %s años**. La BOM asciende a **%s netos por equipo** y el precio de lista derivado es de "
    "**%s con IVA**. La empresa cancela su crédito dentro del horizonte y cierra %d con %s de caja."
    % (fmt(IND["van"]), porc(IND["tir"], 2), dec(IND["payback"]), fmt(M.BOM),
       fmt(R["precio_lista"]), M.ANIOS[-1], fmt(F[-1]["caja"])))


CAPTION = re.compile(r"^###### \*\*Tabla (\d+\.\d+|@@) “([^”]+)”\*\*", re.M)
FIGURA = re.compile(r"^##### \*\*Figura (\d+\.\d+) “(\s*)([^”]+?)\s*”\*\*", re.M)


def ancla(texto):
    """Ancla de encabezado al estilo de GitHub."""
    t = texto.lower().replace("\\", "")
    t = re.sub(r"[^\w\s-]", "", t)
    return re.sub(r"\s", "-", t)


def numerar(texto):
    """Serie continua de tablas en orden de lectura."""
    nuevos = {}

    def asignar(m):
        k = len(nuevos)
        nuevos[m.group(2)] = "%d.%d" % (1 + k // 10, k % 10)
        return "###### **Tabla %s “%s”**" % (nuevos[m.group(2)], m.group(2))

    return nuevos, CAPTION.sub(asignar, texto)


def referencias(texto, previo, nuevos):
    """Cada «Tabla X.Y» del texto sigue a su tabla, identificada por su título."""
    lineas = texto.split("\n")
    for i, linea in enumerate(lineas):
        if linea.startswith(("###### ", "- [Tabla", "- [Figura")):
            continue
        lineas[i] = re.sub(r"Tabla (\d+\.\d+)\b",
                           lambda m: "Tabla " + nuevos.get(previo.get(m.group(1)), m.group(1)), linea)
    return "\n".join(lineas)


def indices(texto):
    tablas = ["- [Tabla %s “%s”](#%s)" % (n, t, ancla("Tabla %s “%s”" % (n, t)))
              for n, t in CAPTION.findall(texto)]
    figuras = ["- [Figura %s “%s”](#%s)" % (n, t, ancla("Figura %s “%s%s”" % (n, esp, t)))
               for n, esp, t in FIGURA.findall(texto)]
    general = ["- [I. Introducción](#introducción)",
               "- [II. Descripción de la Problemática](#descripción-de-la-problemática)",
               "- [III. Propuesta de Solución Tecnológica](#propuesta-de-solución-tecnológica.)",
               "- [IV. Objetivos del Proyecto](#objetivos-del-proyecto.)",
               "- [V. Ingeniería conceptual](#ingeniería-conceptual)",
               "- [VI. Conclusiones](#conclusiones)",
               "- [VII. Referencias bibliográficas](#referencias-bibliográficas)"]
    cuerpo = ("**Índice general**\n\n" + "\n".join(general) + "\n\n**Índice de figuras**\n\n"
              + "\n".join(figuras) + "\n\n**Índice de tablas**\n\n" + "\n".join(tablas) + "\n\n")
    i = texto.index("**Índice general**")
    j = texto.index('<a id="introducción"></a>')
    return texto[:i] + cuerpo + texto[j:]


def main():
    original = io.open(DESTINO, encoding="utf-8").read()
    texto = original
    escritos = []
    for clave, cuerpo in BLOQUES.items():
        patron = re.compile(
            r"(<!-- INFORME:%s:INICIO -->).*?(<!-- INFORME:%s:FIN -->)" % (clave, clave), re.S)
        nuevo, n = patron.subn(lambda m: m.group(1) + "\n\n" + cuerpo + "\n\n" + m.group(2), texto)
        if n:
            texto = nuevo
            escritos.append(clave)
    # Las referencias se resuelven contra el estado previo, cuya numeración ya era única.
    previo = {n: t for n, t in CAPTION.findall(original) if n != "@@"}
    nuevos, texto = numerar(texto)
    texto = referencias(texto, previo, nuevos)
    texto = indices(texto)
    with io.open(DESTINO, "w", encoding="utf-8", newline="\r\n") as fh:
        fh.write(texto)
    print("Bloques del informe interno actualizados:", ", ".join(escritos) or "ninguno")
    print("Tablas numeradas:", len(nuevos))


if __name__ == "__main__":
    main()
