# -*- coding: utf-8 -*-
"""Alinea la prosa escrita a mano de `docs/INFORME 1 .docx.md` con el modelo vigente.

Las tablas del informe interno las genera `informe.py` entre marcadores. Este script
corrige el texto que las rodea, que quedó describiendo el modelo mensual anterior
(EBITDA, FCFF, FCFE, DSCR y FTE) y el precio fijado a priori.
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
fmt, dec, porc = M.fmt, M.dec, M.porc

texto = io.open(DESTINO, encoding="utf-8").read()
CAMBIOS = []


def sub(patron, reemplazo, etiqueta, flags=0):
    global texto
    nuevo, n = re.subn(patron, reemplazo, texto, flags=flags)
    if n:
        texto = nuevo
        CAMBIOS.append((etiqueta, n))


# ----------------------------------------------- tabla de las tres economias
sub(r"VAN, TIR y payback sobre el FCFF de 120 meses",
    "VAN, TIR y payback sobre el flujo de fondos anual", "tres economías: proyecto")
sub(r"BOM, margen de contribución, punto de equilibrio, EBITDA y DSCR",
    "BOM, costo variable, estructura de costos y estado de resultados", "tres economías: negocio")

# ------------------------------------------------------------ diagrama Mermaid
sub(r"flowchart TD\n    A\[BOM, ventas, personal y politicas\].*?I --> J\[Revisar DSCR y financiamiento de arranque\]",
    "flowchart TD\n"
    "    A[BOM, dotacion, estructura y plan de ventas] --> B[Costo total del horizonte]\n"
    "    B --> C[Precio derivado con el margen exigido]\n"
    "    C --> D[Estado de resultados proyectado]\n"
    "    A --> E[Inversion inicial: activo fijo, nominal y capital de trabajo]\n"
    "    E --> F[Credito que financia el 100 por ciento y tabla de amortizacion]\n"
    "    F --> D\n"
    "    D --> G[Flujo de fondos anual]\n"
    "    G --> H[VAN, TIR y payback]\n"
    "    G --> I[Caja acumulada y piso de seguridad]\n"
    "    I --> J[Dimensionar capital de trabajo por iteracion]\n"
    "    J --> E",
    "diagrama de construcción de flujos", re.S)

# --------------------------------------------------------------------- FTE
sub(r"Se incorpora capacidad técnica \(0,5 FTE\) y se activa el canal de asesores agronómicos\.",
    "Se incorpora el primer ensamblador y se activa el canal de asesores agronómicos.", "FTE año 2")
sub(r"Conviene precisar que FTE representa capacidad equivalente y \*\*no\*\* medio contrato ni media "
    r"persona; la forma de contratación y la distribución de tareas se resuelve al organizar la operación\.",
    "La dotación se expresa en **personas contratadas**, no en equivalentes de jornada: el modelo cuenta "
    "cargos reales con su sueldo bruto y sus cotizaciones.", "explicación de FTE")
sub(r"\(0,5 FTE\)", "(primer ensamblador)", "FTE suelto")
sub(r"\bFTE\b", "personas", "FTE residual")

# ------------------------------------------------------- EBITDA, FCFF y DSCR
sub(r"El resultado del primer ejercicio merece lectura detenida.*?(?=\n\n)",
    "El resultado del primer ejercicio merece lectura detenida, porque es donde el proyecto muestra su "
    "punto de tensión. El ejercicio %d cierra con una pérdida de %s y el %d con %s: con el volumen "
    "inicial, la estructura mínima que exige operar formalmente todavía no se cubre. Esa pérdida está "
    "financiada por el capital de trabajo, dimensionado precisamente para sostenerla, y la caja nunca "
    "baja de %s. Desde %d el resultado es positivo y creciente."
    % (M.ANIOS[0], fmt(abs(R["filas"][0]["util_neta"])), M.ANIOS[1],
       fmt(abs(R["filas"][1]["util_neta"])), fmt(min(f["caja"] for f in R["filas"])), M.ANIOS[2]),
    "lectura del primer ejercicio", re.S)

sub(r"\* \*\*Riesgo de cobertura de deuda en el arranque:\*\* el DSCR del Año 1 es de 0,72 y el "
    r"equilibrio con deuda \(204 unidades\) supera la meta de ventas \(200 unidades\)\. "
    r"\*Condición de mitigación:\*",
    "* **Riesgo de liquidez en el arranque:** los dos primeros ejercicios cierran con pérdida y la caja "
    "desciende hasta %s. *Condición de mitigación:*" % fmt(min(f["caja"] for f in R["filas"])),
    "riesgo de cobertura de deuda")

sub(r"\| \*\*DSCR Año 1\*\* \| 0,72 \| ≥ 1,0 \| \*\*No cumple en Año 1\*\* \|",
    "| **Caja mínima del horizonte** | %s | > 0 | Cumple |" % fmt(min(f["caja"] for f in R["filas"])),
    "fila DSCR de la tabla de evaluación")

sub(r"el DSCR del primer año es de 0,72 y el equilibrio con deuda \(204 unidades\) supera ligeramente "
    r"la meta de ventas, de modo que el arranque exige mantener íntegra la reserva de liquidez; y",
    "los dos primeros ejercicios cierran con pérdida, de modo que el arranque exige mantener íntegro el "
    "capital de trabajo; y", "conclusión DSCR")

# -------------------------------------------------- metodologia mensual -> anual
sub(r"El flujo del proyecto se evalúa \*\*antes del financiamiento\*\*, utilizando impuesto calculado "
    r"sin deducir intereses\.",
    "El flujo del proyecto se evalúa sobre el flujo de fondos anual, después de impuestos y del servicio "
    "de deuda, con la inversión inicial comprometida en el año cero.", "metodología del flujo")
sub(r"sobre 120 meses", "sobre diez años", "horizonte en meses")
sub(r"al mes 120", "al cierre del horizonte", "mes 120")
sub(r"de 120 meses", "de diez años", "120 meses")

# ------------------------------------------------------------------- precio
sub(r"\$349\.990", fmt(R["precio_lista"]), "precio de lista")
sub(r"\$294\.109", fmt(R["precio_neto_base"]), "precio neto")
sub(r"\$39\.000\.000", fmt(R["credito"]), "fuentes de financiamiento")

# ----------------------------------------------------- mapa de trazabilidad
sub(r"\| Todas las tablas y cifras económicas \| `finanzas/supuestos\.json` \(parámetros\) y "
    r"`finanzas/modelo\.py` \(modelo mensual\) \|",
    "| Todas las tablas y cifras económicas | `finanzas/supuestos.json` (parámetros) y "
    "`finanzas/modelo.py` (modelo anual) |", "mapa: modelo mensual -> anual")
sub(r"\| Financiamiento: pie, crédito, tasa y plazo \| Claves `aporte_socios`, `credito_principal`, "
    r"`tasa_credito_efectiva_anual` y `plazo_base` de `finanzas/supuestos\.json` \| El principal es un "
    r"monto fijo de decisión, no lo dimensiona el modelo \|",
    "| Financiamiento: pie, crédito, tasa y plazo | Claves `pie_total`, "
    "`tasa_credito_efectiva_anual` y `plazo_credito_anios` de `finanzas/supuestos.json` | El crédito "
    "desembolsa el 100 % de la inversión inicial, que el modelo sí dimensiona; el pie es un monto fijo de "
    "los socios que se abona al banco como cuotas pagadas por anticipado |", "mapa: financiamiento")


# ------------------------------------- residuos finales de la metodologia previa
sub(r"por lo que complementa —pero no sustituye— el análisis de flujo mensual y el indicador de "
    r"cobertura de deuda \(DSCR\)\.",
    "por lo que complementa —pero no sustituye— el flujo de fondos anual y la caja acumulada.",
    "equilibrio: referencia a DSCR")
sub(r"esta diferencia es la razón por la cual EBITDA y caja no coinciden",
    "esta diferencia es la razón por la cual la utilidad del ejercicio y la caja no coinciden",
    "EBITDA vs caja")
sub(r"sus aumentos posteriores se descuentan del FCFF\.",
    "sus aumentos posteriores se descuentan del flujo de fondos.", "aumentos de caja mínima")
sub(r"El saldo de deuda al quinto año se muestra en su propia tabla y no se resta nuevamente al FCFF, "
    r"que ya está definido antes de deuda\.",
    "El saldo de deuda de cada año se muestra en la tabla de amortización y no se vuelve a restar al "
    "flujo de fondos, que ya descuenta la cuota de capital.", "saldo de deuda")
sub(r"una caída del 10 % en el volumen ya lleva el VAN a terreno negativo y el DSCR prácticamente a "
    r"cero\. No existe holgura alguna sobre el precio: rebajarlo a \$299\.990 destruye el resultado",
    "una caída del 25 %% en el volumen ya lleva el VAN a terreno negativo, y la caja se agota antes que "
    "el valor. No existe holgura alguna sobre el precio: rebajarlo bajo %s destruye el resultado"
    % fmt(400000), "sensibilidad: DSCR y precio")
sub(r"porque el FCFF se calcula antes del financiamiento: es la verificación de que la metodología está "
    r"correctamente separada",
    "porque el flujo del proyecto se evalúa con el financiamiento congelado: es la verificación de que la "
    "metodología está correctamente separada", "alza de tasa")
sub(r"Por eso se publican también el DSCR, la reserva y la caja mensual\. Retorno económico y cobertura "
    r"temprana de deuda describen aspectos diferentes",
    "Por eso se publican también la caja acumulada y el piso de seguridad que el capital de trabajo "
    "sostiene. Retorno económico y liquidez de arranque describen aspectos diferentes",
    "conclusión: DSCR y reserva")

with io.open(DESTINO, "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)

print("Prosa del informe interno alineada:")
for etq, n in CAMBIOS:
    print("  %-44s %3d" % (etq, n))
print("Total:", sum(n for _, n in CAMBIOS))
