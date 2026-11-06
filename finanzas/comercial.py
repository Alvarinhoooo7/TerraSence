# -*- coding: utf-8 -*-
"""Sincroniza las cifras replicadas en los documentos comerciales.

Los documentos de `Comercializacion de Tecnologias/` y sus piezas gráficas
repiten cifras que nacen en otra parte: el precio, el costo de materiales, el
financiamiento y el costo acumulado del agricultor salen de `modelo.py`, y el
tamaño del catálogo de cultivos sale del código de la aplicación. Este script
las reescribe en su lugar en cada ejecución del modelo, de modo que la cifra
siga viviendo en un solo lugar y el documento sólo la replique.

La prosa se edita a mano; las cifras, nunca. Cada patrón exige una cantidad
exacta de coincidencias y el script falla si no la encuentra: si alguien
reescribe una frase y rompe un ancla, se entera aquí y no en la entrega.

Ejecutado por `python finanzas/modelo.py`. La verificación del repositorio
corre el modelo y exige que el árbol no quede sucio, de modo que una cifra
editada a mano o un modelo regenerado sin sincronizar rompen la integración.
"""
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(BASE, ".."))

sys.path.insert(0, BASE)
import modelo as M  # noqa: E402

# --------------------------------------------------------------- cifras
R = M.dimensionar()
fmt, dec = M.fmt, M.dec

PRECIO_N = R["precio_lista"]
KIT_BATERIA = 24990          # política de repuestos de docs/MODELO_ECONOMICO.md
HANNA_N, PULSE_N = 491827, 538990   # referencias consultadas el 04-09-2026
SONDA_N = 48000              # sonda 7-en-1 del BOM
BOM_N = M.bom_total()


def tco(n):
    """Acumulado del agricultor a n años, con la misma regla que el informe:
    equipo en los años 1 y 6, kit de batería en los años 3 y 8."""
    return PRECIO_N * (1 + (n >= 6)) + KIT_BATERIA * ((n >= 3) + (n >= 8))


CATALOGO = os.path.join(RAIZ, "App", "src", "engine", "speciesCatalog.ts")


def catalogo():
    """Especies del catálogo de cultivos por grupo, contadas en el código.

    Cada entrada es `sp('<id>', '<grupo>', …)`: el segundo literal es el grupo.
    """
    with open(CATALOGO, encoding="utf-8") as f:
        filas = re.findall(r"^  sp\(([^\n]*)$", f.read(), re.M)
    cuenta = {}
    for fila in filas:
        literales = re.findall(r"'([^']*)'", fila)
        if len(literales) >= 2:
            cuenta[literales[1]] = cuenta.get(literales[1], 0) + 1
    return len(filas), cuenta


PRECIO = fmt(PRECIO_N)
NETO = fmt(R["precio_neto_base"])
BOM = fmt(BOM_N)
SONDA_PCT = dec(SONDA_N / BOM_N * 100, 0)
INVERSION = fmt(R["inversion"]["total"] if isinstance(R["inversion"], dict) else R["credito"])
CUOTA = fmt(R["cuota"])
PIE = fmt(R["pie"])
PIE_SOCIO = fmt(R["pie"] / 2)
CUOTAS_ANT = dec(R["cuotas_anticipadas"], 1)
DESEMBOLSO = fmt(R["desembolso"])
CAJA_MIN = fmt(M.caja_minima(R))
DIF_HANNA, DIF_PULSE = fmt(HANNA_N - PRECIO_N), fmt(PULSE_N - PRECIO_N)
PCT_HANNA = dec((HANNA_N - PRECIO_N) / HANNA_N * 100, 2)
PCT_PULSE = dec((PULSE_N - PRECIO_N) / PULSE_N * 100, 2)
PCT_HANNA_1 = dec((HANNA_N - PRECIO_N) / HANNA_N * 100, 1)
PCT_PULSE_1 = dec((PULSE_N - PRECIO_N) / PULSE_N * 100, 1)
TCO_1, TCO_3, TCO_5, TCO_10 = (fmt(tco(n)) for n in (1, 3, 5, 10))
TOTAL_ESPECIES, POR_GRUPO = catalogo()
ESPECIES = str(TOTAL_ESPECIES)

# Los rótulos del selector de especies del carrusel, en el orden en que la
# pieza los muestra, con el grupo del catálogo que cuenta cada uno.
GRUPOS_CARRUSEL = [
    ("HORTALIZAS", "hortalizas"),
    ("FRUTALES", "frutales"),
    ("BERRIES", "berries"),
    ("CEREALES, LEGUMBRES E INDUSTRIALES", "cultivos"),
    ("FORRAJERAS", "forrajeras"),
    ("AROMÁTICAS · LISTA PARCIAL", "aromaticas"),
    ("ÁRBOLES FORESTALES · LISTA PARCIAL", "forestales"),
]

# Ancho de las barras del comparador, relativas al techo de $600.000 del
# laboratorio a tres años, que es el 100 % del gráfico.
ANCHO_TERRA = "%d%%" % round(PRECIO_N / 600000 * 100)

# --------------------------------------------------------------- reemplazos
# (clave, patrón, reemplazo, coincidencias exigidas)
COMERCIAL_README = [
    ("precio-propuesto", r"precio propuesto de \*\*\$[\d.]+ con IVA\*\*",
     "precio propuesto de **%s con IVA**" % PRECIO, 1),
    ("bom-costos", r"\(BOM de \$[\d.]+,", "(BOM de %s," % BOM, 1),
    ("precio-lista", r"Precio de lista propuesto: \*\*\$[\d.]+ con IVA\*\* \(\$[\d.]+ neto\)",
     "Precio de lista propuesto: **%s con IVA** (%s neto)" % (PRECIO, NETO), 1),
    ("precio-diagrama", r"P\(Precio: \$[\d.]+\)", "P(Precio: %s)" % PRECIO, 1),
    ("sonda-bom-costos", r"\*\*\$48\.000 de los \$[\d.]+ del Costo de Materiales \(BOM\)\*\*",
     "**%s de los %s del Costo de Materiales (BOM)**" % (fmt(SONDA_N), BOM), 1),
    ("precio-demanda", r"precio establecido de \*\*\$[\d.]+\*\*",
     "precio establecido de **%s**" % PRECIO, 1),
    ("tabla-competencia", r"\| \*\*TerraSense\*\* \| \*\*\$[\d.]+\*\* \| [^|]+\|",
     "| **TerraSense** | **%s** | %s %% bajo Hanna, %s %% bajo Pulse: paridad con el Hanna. |"
     % (PRECIO, PCT_HANNA_1, PCT_PULSE_1), 1),
    ("precio-riesgo", r"\| Precio \$[\d.]+ sin validar \|",
     "| Precio %s sin validar |" % PRECIO, 1),
    ("financiamiento",
     r"La inversión inicial es de \*\*\$[\d.]+\*\*,.*?baj[ae] de \$[\d.]+\.",
     "La inversión inicial es de **%s**, desembolsada íntegra por un crédito bancario a "
     "%d años con cuota fija de %s al %s %% efectivo anual. Los socios aportan un **pie fijo "
     "de %s** (%s cada uno), que se abona al banco el día del desembolso como cuotas pagadas "
     "por anticipado: cubre las primeras %s cuotas del calendario, no se descuenta del "
     "principal y no se devuelve. El desembolso inicial evaluado, inversión más pie, es de %s, "
     "y la caja del horizonte nunca baja de %s."
     % (INVERSION, M.S["plazo_credito_anios"], CUOTA,
        dec(M.S["tasa_credito_efectiva_anual"] * 100, 0), PIE, PIE_SOCIO, CUOTAS_ANT,
        DESEMBOLSO, CAJA_MIN), 1),
    ("pregunta-5", r"### 5\. ¿Por qué \$[\d.]+ y no un precio menor\?",
     "### 5. ¿Por qué %s y no un precio menor?" % PRECIO, 1),
    ("precio-derivado", r"el precio se eleva a \*\*\$[\d.]+ con IVA\*\* \(\$[\d.]+ neto\)",
     "el precio se eleva a **%s con IVA** (%s neto)" % (PRECIO, NETO), 1),
    ("referencias-competencia",
     r"\*\*Hanna HI9814 a \$[\d.]+\*\* y \*\*Bluelab Pulse a \$[\d.]+\*\*",
     "**Hanna HI9814 a %s** y **Bluelab Pulse a %s**" % (fmt(HANNA_N), fmt(PULSE_N)), 1),
    ("brecha-competencia", r"quedamos [\d,]+ % bajo el Hanna y [\d,]+ % bajo el Pulse",
     "quedamos %s %% bajo el Hanna y %s %% bajo el Pulse" % (PCT_HANNA, PCT_PULSE), 1),
    ("sonda-bom-fx", r"\*\*\$48\.000 de los \$[\d.]+ del BOM \([\d,]+ %\)\*\*",
     "**%s de los %s del BOM (%s %%)**" % (fmt(SONDA_N), BOM, SONDA_PCT), 1),
    ("primer-ejercicio",
     r"La utilidad del ejercicio de 2027 es de \*\*\$[-\d.]+\*\* y el flujo de fondos es de "
     r"\*\*\$[-\d.]+\*\*\..*?La caja acumulada nunca baja de \*\*\$[\d.]+\*\*\.",
     "La utilidad del ejercicio de 2027 es de **%s** y el flujo de fondos es de **%s**. La "
     "operación no alcanza a cubrir en su primer año la estructura mínima para funcionar "
     "formalmente, y esa pérdida la financia el capital de trabajo. La caja acumulada nunca "
     "baja de **%s**."
     % (fmt(R["filas"][0]["util_neta"]), fmt(R["filas"][0]["flujo"]), CAJA_MIN), 1),
    ("horizonte-flujos", r"Se proyectan los flujos a \d+ años obteniendo",
     "Se proyectan los flujos a %d años obteniendo" % M.S["horizonte_anios"], 1),
    ("horizonte-evaluacion", r"con flujos mensuales a \S+ años",
     "con flujos mensuales a %d años" % M.S["horizonte_anios"], 1),
]

INFORME_MARKETING = [
    ("demanda", r"dispuestos a pagar \$[\d.]+ con IVA",
     "dispuestos a pagar %s con IVA" % PRECIO, 1),
    ("tabla-competencia", r"\| \*\*TerraSense\*\* \| Directa \| \*\*\$[\d.]+\*\* \|",
     "| **TerraSense** | Directa | **%s** |" % PRECIO, 1),
    ("figura-5-2",
     r"TerraSense cuesta \$[\d.]+ menos que Hanna \(un [\d,]+ % menos\) y \$[\d.]+ menos que "
     r"Bluelab \(un [\d,]+ % menos\)",
     "TerraSense cuesta %s menos que Hanna (un %s %% menos) y %s menos que Bluelab "
     "(un %s %% menos)" % (DIF_HANNA, PCT_HANNA, DIF_PULSE, PCT_PULSE), 1),
    ("tabla-tco",
     r"\| TerraSense \(incluye kits de batería y un segundo equipo en el año 6\) \| Ilimitado \| "
     r"\$[\d.]+ \| \$[\d.]+ \| \$[\d.]+ \| \$[\d.]+ \|",
     "| TerraSense (incluye kits de batería y un segundo equipo en el año 6) | Ilimitado | "
     "%s | %s | %s | %s |" % (TCO_1, TCO_3, TCO_5, TCO_10), 1),
    ("precio-lista", r"El precio de lista es de \*\*\$[\d.]+ con IVA\*\* \(\$[\d.]+ neto\)",
     "El precio de lista es de **%s con IVA** (%s neto)" % (PRECIO, NETO), 1),
    ("justificacion",
     r"el precio queda un [\d,]+ % bajo Hanna[^.]*?y un [\d,]+ % bajo Bluelab",
     "el precio queda un %s %% bajo Hanna —paridad práctica— y un %s %% bajo Bluelab"
     % (PCT_HANNA, PCT_PULSE), 1),
    ("tabla-estrategia", r"\| Precio \| \$[\d.]+, por valor, sin rebajas \|",
     "| Precio | %s, por valor, sin rebajas |" % PRECIO, 1),
    ("especies-descripcion", r"entre las \d+ del catálogo",
     "entre las %s del catálogo" % ESPECIES, 1),
    ("especies-aumentado", r"registro de la especie entre \d+ del catálogo",
     "registro de la especie entre %s del catálogo" % ESPECIES, 1),
    ("especies-carrusel", r"elige su cultivo entre \d+ especies",
     "elige su cultivo entre %s especies" % ESPECIES, 1),
    ("especies-tabla", r"qué tienes plantado: \d+ especies",
     "qué tienes plantado: %s especies" % ESPECIES, 1),
    ("tco-carrusel", r"\$600\.000 en análisis de laboratorio frente a \$[\d.]+ de TerraSense",
     "$600.000 en análisis de laboratorio frente a %s de TerraSense" % TCO_3, 1),
]

CARRUSEL = [
    ("pago-unico", r"<h3>Pago único \(\$[\d.]+\)</h3>",
     "<h3>Pago único (%s)</h3>" % PRECIO, 1),
    ("barra-terra",
     r"<small>Equipo \$[\d.]+ · Costo total a 3 años: \$[\d.]+</small></div>"
     r"<div class=\"track\"><div class=\"fill\" style=\"width:\d+%;background:var\(--bosque\)\">"
     r"\$[\d.]+</div>",
     "<small>Equipo %s · Costo total a 3 años: %s</small></div>"
     "<div class=\"track\"><div class=\"fill\" style=\"width:%s;background:var(--bosque)\">"
     "%s</div>" % (PRECIO, TCO_3, ANCHO_TERRA, PRECIO), 1),
    ("nota-barras",
     r"En 3 años de uso \(\$[\d.]+ incluyendo kit de mantención\), TerraSense cuesta menos",
     "En 3 años de uso (%s incluyendo kit de mantención), TerraSense cuesta menos" % TCO_3, 1),
    ("precio-cierre", r"<p class=\"price\">\$[\d.]+ IVA INCL\.",
     "<p class=\"price\">%s IVA INCL." % PRECIO, 1),
    ("especies-titulo", r"<span class=\"hl-bosque\">\d+ cultivos\.</span>",
     "<span class=\"hl-bosque\">%s cultivos.</span>" % ESPECIES, 1),
] + [
    ("grupo-" + clave,
     r"<span class=\"t\">%s</span><span class=\"n\">\d+</span>" % re.escape(rotulo),
     "<span class=\"t\">%s</span><span class=\"n\">%d</span>" % (rotulo, POR_GRUPO[clave]), 1)
    for rotulo, clave in GRUPOS_CARRUSEL
] + [
    ("especies-nota", r"con sus \d+ especies en siete grupos",
     "con sus %s especies en siete grupos" % ESPECIES, 1),
    ("especies-pantalla", r"<div class=\"sp-count\">\d+ especies</div>",
     "<div class=\"sp-count\">%s especies</div>" % ESPECIES, 1),
]

FIGURAS = [
    ("demanda", r"dispuestos a pagar \$[\d.]+ por el equipo",
     "dispuestos a pagar %s por el equipo" % PRECIO, 1),
    # Barra de TerraSense del gráfico de precios: el eje de la figura sitúa el
    # cero en x=300 y $100.000 cada 183,33 px (líneas de $200.000 a $500.000).
    ("barra-precio",
     r"<rect x=\"300\" y=\"50\" width=\"\d+\" height=\"80\" rx=\"12\" fill=\"#1F5B3F\"/>"
     r"<text x=\"\d+\" y=\"102\" text-anchor=\"end\" font-size=\"28\" font-weight=\"900\" "
     r"fill=\"#fff\">\$[\d.]+</text>",
     "<rect x=\"300\" y=\"50\" width=\"%d\" height=\"80\" rx=\"12\" fill=\"#1F5B3F\"/>"
     "<text x=\"%d\" y=\"102\" text-anchor=\"end\" font-size=\"28\" font-weight=\"900\" "
     "fill=\"#fff\">%s</text>"
     % (round(PRECIO_N * 183.3333 / 100000), round(300 + PRECIO_N * 183.3333 / 100000 - 20),
        PRECIO), 1),
    ("delta-hanna",
     r"<text x=\"1215\" y=\"242\" font-size=\"20\" font-weight=\"700\" fill=\"#A33528\">"
     r"\+\$[\d.]+</text>",
     "<text x=\"1215\" y=\"242\" font-size=\"20\" font-weight=\"700\" fill=\"#A33528\">"
     "+%s</text>" % DIF_HANNA, 1),
    ("delta-pulse",
     r"<text x=\"1301\" y=\"382\" font-size=\"20\" font-weight=\"700\" fill=\"#A33528\">"
     r"\+\$[\d.]+</text>",
     "<text x=\"1301\" y=\"382\" font-size=\"20\" font-weight=\"700\" fill=\"#A33528\">"
     "+%s</text>" % DIF_PULSE, 1),
    ("serie-tco", r"const terra = \[[\d, ]+\];",
     "const terra = [%s];" % ", ".join(str(round(tco(max(n, 1)))) for n in range(11)), 1),
    ("fila-precio", r"\['Precio', '\$[\d.]+, pago único, estrategia por valor'",
     "['Precio', '%s, pago único, estrategia por valor'" % PRECIO, 1),
]

DOCUMENTOS = [
    (os.path.join("Comercializacion de Tecnologias", "README.md"), COMERCIAL_README),
    (os.path.join("Comercializacion de Tecnologias", "Unidad 2",
                  "informe 2 comercializacio.md"), INFORME_MARKETING),
    (os.path.join("Comercializacion de Tecnologias", "Unidad 2", "Carrusel",
                  "carrusel.html"), CARRUSEL),
    (os.path.join("Comercializacion de Tecnologias", "Unidad 2", "Figuras",
                  "figuras.html"), FIGURAS),
]


def sincronizar():
    """Reescribe cada cifra en su lugar sin tocar nada más del archivo.

    Los reemplazos se aplican sobre el texto tal como está en disco, sin
    normalizar los saltos de línea: ninguno de estos documentos está declarado
    con fin de línea fijo, de modo que normalizarlos reescribiría el archivo
    entero en un runner Linux y la verificación fallaría por los saltos y no
    por el contenido. Por eso ningún patrón cruza un salto de línea.
    """
    errores = []
    for rel, reemplazos in DOCUMENTOS:
        ruta = os.path.join(RAIZ, rel)
        with open(ruta, "rb") as f:
            bruto = f.read()
        texto = bruto.decode("utf-8")
        cambios = 0
        for clave, patron, destino, exigidas in reemplazos:
            texto, n = re.subn(patron, destino.replace("\\", "\\\\"), texto)
            if n != exigidas:
                errores.append("%s / %s: %d coincidencias, se exigen %d" % (rel, clave, n, exigidas))
            cambios += n
        nuevo = texto.encode("utf-8")
        if nuevo != bruto:
            with open(ruta, "wb") as f:
                f.write(nuevo)
        print("%-62s %2d cifras sincronizadas" % (rel, cambios))
    if errores:
        for e in errores:
            print("ERROR  " + e)
        raise SystemExit("comercial.py: %d anclas rotas" % len(errores))
    print("Comercial sincronizado: precio %s, BOM %s, catálogo de %s especies"
          % (PRECIO, BOM, ESPECIES))


if __name__ == "__main__":
    sincronizar()
