# -*- coding: utf-8 -*-
"""Aplica al espejo del informe todas las correcciones derivadas de la
reformulacion economica, y escribe `docs/INFORME_1_CORREGIDO.md`.

Sustituye el bloque de viabilidad economica por la seccion generada desde el
modelo y corrige, en el resto del documento, lo que esos cambios arrastran mas
los defectos de referencias, numeracion y lengua detectados en la auditoria.
"""
import io
import os
import re
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(BASE, "..", "docs")
SECCION = os.path.join(DOCS, "SECCION_ECONOMICA_REFORMULADA.md")
SALIDA = os.path.join(BASE, "..", "Evaluacion", "Evaluacion 1", "INFORME 1 CORREGIDO.md")

# El espejo del PDF es un intermedio de trabajo, no un documento del repositorio:
# se genera en un temporal y se descarta al terminar.
ESPEJO = os.path.join(tempfile.gettempdir(), "terrasense_espejo_informe1.md")
subprocess.run([sys.executable, os.path.join(BASE, "espejo.py"), ESPEJO], check=True, cwd=BASE)
subprocess.run([sys.executable, os.path.join(BASE, "seccion_economica.py")], check=True, cwd=BASE)

sys.path.insert(0, BASE)
import modelo as M  # noqa: E402

R = M.dimensionar()
IND = M.resumen(R)
PRECIO = R["precio_lista"]


def p(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def pct(x, d=1):
    return (("%." + str(d) + "f") % (x * 100)).replace(".", ",") + " %"


texto = io.open(ESPEJO, encoding="utf-8").read()
seccion = io.open(SECCION, encoding="utf-8").read()

# --------------------------------------------------------------------------
# 1. Reemplazo del bloque economico completo
# --------------------------------------------------------------------------
ini = texto.index("### Análisis de Viabilidad Económica")
fin = texto.index("### Especificaciones Técnicas del Proyecto")
# La seccion generada abre con "## "; aqui vive un nivel mas abajo.
cuerpo = seccion.replace("\n## ", "\n### ").replace("\n### Cuadro", "\n#### Cuadro")
if cuerpo.startswith("## "):
    cuerpo = "### " + cuerpo[3:]
texto = texto[:ini] + cuerpo.rstrip() + "\n\n\n" + texto[fin:]

CAMBIOS = []


def sub(patron, reemplazo, etiqueta, flags=0):
    global texto
    nuevo, n = re.subn(patron, reemplazo, texto, flags=flags)
    if n:
        texto = nuevo
        CAMBIOS.append((etiqueta, n))
    return n


# --------------------------------------------------------------------------
# 2. Arrastre del precio y de las cifras economicas al resto del documento
# --------------------------------------------------------------------------
sub(r"\$349\.990", p(PRECIO), "precio de lista")
sub(r"\$294\.109", p(R["precio_neto_base"]), "precio neto")
sub(r"\$63\.717\.893", p(IND["van"]), "VAN")
sub(r"48,94 ?%", pct(IND["tir"], 2), "TIR")
sub(r"\$39\.000\.000 de fuentes", p(R["credito"]) + " de fuentes", "fuentes de financiamiento")
sub(r"59,1 ?%", pct(48000 / M.BOM), "peso de la sonda en la BOM")
sub(r"\$81\.184", p(M.BOM), "total BOM")

# --------------------------------------------------------------------------
# 3. Contradicciones que los cambios introducen
# --------------------------------------------------------------------------
sub(r"La impresión de la carcasa es un servicio externo pagado por unidad y ya contabilizado en la BOM: "
    r"el proyecto no compra impresora 3D\.",
    "La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras 3D, que figuran en el "
    "activo fijo y se deprecian, mientras el filamento, la merma, la energía y la mantención se cargan al "
    "costo unitario de cada carcasa.",
    "carcasa: servicio externo -> taller propio")

sub(r"Carcasa impresa en 3D PETG \(servicio externo\)", "Carcasa PETG impresa en taller propio",
    "rotulo de la carcasa")

# El mapa y la extension PostGIS se retiraron del producto: la medicion se sigue
# georreferenciando con GPS del telefono, pero no hay cartografia ni geometrias.
sub(r"Supabase \(PostgreSQL \+ PostGIS\) \+ Consola Web", "Supabase (PostgreSQL) + Consola Web",
    "Tabla 1.0: PostGIS retirado del producto")
sub(r"soporte posventa y analítica multitemporal\.",
    "soporte posventa y consulta del histórico de cada equipo.",
    "Tabla 1.0: analitica multitemporal -> consulta del historico")

# --------------------------------------------------------------------------
# 4. Errores de referencias detectados en la auditoria
# --------------------------------------------------------------------------
sub(r"Resolución SUBTEL N° 737/2025 \[19\]", "Resolución SUBTEL N° 737/2025 [17]",
    "referencia SUBTEL 737/2025")
sub(r"IEC 60529 \[28\]", "IEC 60529 [27]", "referencia IEC 60529")
sub(r"UN 38\.3 / IEC 62133-2 \[27\]", "UN 38.3 / IEC 62133-2 [28]", "referencia UN 38.3")
sub(r"Transceptor SP3485 \(driver activo\) \[26\]", "Transceptor SP3485 (driver activo) [24]",
    "referencia SP3485 en el balance energetico")
sub(r"ISO 11277 \[36\]: Método gravimétrico", "ISO 11465 [36]: Método gravimétrico",
    "ISO 11277 duplicada -> ISO 11465")

# --------------------------------------------------------------------------
# 5. Numeracion y rotulado de tablas
# --------------------------------------------------------------------------
sub(r'Tabla 4\.6 “ Fases de Operación y Consumo Energético”',
    'Tabla 4.6 “Balance Energético por Nodo de Tensión”', "rotulo duplicado 4.6")
sub(r'Tabla 4\.7 “ Fases de Operación y Consumo Energético”',
    'Tabla 4.7 “Energía por Ciclo de Medición”', "rotulo duplicado 4.7")
# Espacio sobrante tras la comilla de apertura en los 54 rotulos
sub(r'(Tabla|Figura) (\d+\.\d+) “ ', r'\1 \2 “', "espacio tras comilla en rotulos")
sub(r'\(20 bytes\) ”', '(20 bytes)”', "espacio antes de comilla de cierre")

# --------------------------------------------------------------------------
# 6. Contenido tecnico afectado
# --------------------------------------------------------------------------
sub(r"Esta digitalización se sostiene sobre cinco pilares técnicos",
    "Esta digitalización se sostiene sobre cuatro pilares técnicos",
    "cinco pilares -> cuatro (la tabla tiene cuatro filas)")
sub(r"tramas compactas de 20 bytes como máximo", "tramas de 20 bytes de longitud fija",
    "trama BLE: 'como maximo' contradice el contrato unico")
sub(r"autogestionando su transición a reposo inmediatamente tras cada muestreo de 3,6 µA",
    "autogestionando su transición a reposo tras cada muestreo; los 3,6 µA son el consumo medio a 1 Hz "
    "declarado en la hoja de datos, no la corriente instantánea durante la conversión",
    "BME280: 3,6 uA es promedio, no instantaneo")

# --------------------------------------------------------------------------
# 6b. Conclusiones economicas, reescritas sobre el modelo nuevo
# --------------------------------------------------------------------------
F = R["filas"]
caja_final = F[-1]["caja"]
kit = 24990
tco10 = PRECIO * 2 + kit * 2

sub(r"Desde la perspectiva económica, la evaluación a diez años.*?se rebaja a \$299\.990\.",
    "Desde la perspectiva económica, la evaluación a diez años (2027–2036) entrega un resultado favorable "
    "bajo las condiciones declaradas, con cada partida abierta y trazable hasta su origen. El cambio "
    "metodológico más importante respecto de versiones anteriores de este estudio es que **el precio ya "
    "no es un supuesto sino un resultado**: se construyó primero la estructura completa de costos y el "
    "precio se derivó de ella exigiendo un %s de utilidad sobre el costo total, lo que arroja un precio "
    "de lista de %s con IVA. Con una inversión inicial de %s financiada íntegramente por un crédito de "
    "igual monto a diez años y %s efectivo anual, con cuota fija de %s, y un pie propio de %s entregado "
    "al banco en partes iguales por los socios (%s cada uno), el proyecto alcanza un VAN de %s al %s de "
    "descuento, una TIR de %s, un payback simple de %s años y uno descontado de %s años. La empresa "
    "cancela la totalidad de su deuda dentro del horizonte evaluado y cierra %d con %s de caja acumulada "
    "y sin pasivo bancario. El punto de tensión está identificado y es de arranque, no de rentabilidad: "
    "los ejercicios %d y %d cierran con pérdida porque la estructura mínima para operar formalmente no se "
    "cubre con 200 equipos, y esa pérdida se financia con el capital de trabajo dimensionado para ello. "
    "Las sensibilidades acotan el margen de error: el proyecto resiste un alza del 15 %% en el costo de "
    "materiales, pero deja de crear valor si las ventas caen un 25 %% o si el precio se rebaja por debajo "
    "de %s aproximadamente."
    % (pct(M.S["margen_objetivo"], 0), p(PRECIO), p(R["inversion"]["total"]),
       pct(M.S["tasa_credito_efectiva_anual"], 0), p(R["cuota"]), p(R["pie"]), p(R["pie"] / 2),
       p(IND["van"]), pct(M.S["tasa_descuento"], 0), pct(IND["tir"], 2),
       ("%.2f" % IND["payback"]).replace(".", ","), ("%.2f" % IND["payback_desc"]).replace(".", ","),
       M.ANIOS[-1], p(caja_final), M.ANIOS[0], M.ANIOS[1], p(400000)),
    "conclusion economica", re.S)

sub(r"acumulando a diez años una ventaja de 2,7 y 1,6 veces respectivamente",
    "acumulando a diez años una ventaja de %s y %s veces respectivamente"
    % (("%.1f" % (2000000 / tco10)).replace(".", ","), ("%.1f" % (1200000 / tco10)).replace(".", ",")),
    "ventaja TCO")
sub(r"cada lectura cuesta \$750", "cada lectura cuesta " + p(tco10 / 1000), "costo por medicion")


# --------------------------------------------------------------------------
# 8. Normativa economica y tributaria que la reformulacion incorpora
# --------------------------------------------------------------------------
FILA_21713 = (
    "| Ley N° 21.713 (cumplimiento de obligaciones tributarias) | Obligatoria (Chile) | "
    "Abastecimiento formalizado como importación, con Declaración de Ingreso, para que el IVA "
    "de los insumos constituya crédito fiscal | Revisión de la carpeta tributaria de "
    "importación antes de la primera orden de volumen. Criterio: toda compra de insumos respaldada "
    "con DIN o factura nacional. Evidencia: declaraciones de ingreso y registro de crédito fiscal | "
    "Pendiente |")
FILA_21735 = (
    "| Ley N° 21.735 (reforma previsional) | Obligatoria (Chile) | Cotización de cargo del "
    "empleador aplicada según el calendario gradual vigente, además de cesantía y "
    "mutualidad | Revisión de las declaraciones previsionales mensuales. Criterio: tasa del "
    "período correctamente aplicada sobre cada remuneración. Evidencia: certificados de pago "
    "previsional | Pendiente |")
sub(r"(\| IEC 60529 \(grado IP67\) \| Voluntaria como estándar)",
    FILA_21713 + "\n" + FILA_21735 + "\n" + r"\1", "matriz normativa: leyes 21.713 y 21.735")

SECCION_TRIB = (
    "### Obligaciones Tributarias y Laborales\n\n"
    "- **Ley N° 21.713 (cumplimiento de obligaciones tributarias):** desde octubre de 2025 eliminó "
    "la exención que liberaba de IVA a las importaciones bajo US$41. Toda compra internacional paga "
    "IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan al momento de la "
    "compra para pedidos de hasta US$500, sin arancel aduanero adicional. La consecuencia de diseño "
    "es económica y no técnica: ese IVA **sólo constituye crédito fiscal si la compra "
    "se formaliza como importación con Declaración de Ingreso**, de modo que el abastecimiento "
    "debe formalizarse antes de comprometer volumen.\n"
    "- **Ley N° 21.735 (reforma previsional):** introdujo una cotización de cargo del empleador "
    "que parte en 3,5 % y sube de forma gradual hasta completar 8,5 % junto con el Seguro de Invalidez y "
    "Sobrevivencia. El proyecto la incorpora año a año en el costo laboral en lugar de "
    "aproximarla con un recargo fijo, porque sobre un horizonte de diez años la diferencia es "
    "material.\n\n")
sub(r"(### Protección al Consumidor)", SECCION_TRIB + r"\1",
    "seccion normativa: obligaciones tributarias y laborales")

# --------------------------------------------------------------------------
# 7. Lengua: terminologia del proyecto y erratas
# --------------------------------------------------------------------------
sub(r"\bpredios\b", "campos", "predios -> campos")
sub(r"\bpredio\b", "campo", "predio -> campo")
sub(r"\bPredios\b", "Campos", "Predios -> Campos")
sub(r"estación concentradora predial", "estación concentradora en el campo", "predial -> en el campo")
sub(r"\bpredial\b", "de campo", "predial -> de campo")
sub(r"Si se puntuará", "Si se puntuara", "puntuará -> puntuara")
sub(r"simulador de crédito de consumo pública", "simulador de crédito de consumo publica",
    "pública -> publica")
sub(r"\bél mes 19\b", "el mes 19", "él -> el")
sub(r"Interfaz Fisica de Usuario", "Interfaz Física de Usuario", "Fisica -> Física")
sub(r"Aprobación Electrica", "Aprobación Eléctrica", "Electrica -> Eléctrica")
sub(r"Soporte\s+Tecnico", "Soporte Técnico", "Tecnico -> Técnico")
sub(r"Bateria LiPo", "Batería LiPo", "Bateria -> Batería")
sub(r"Arquitectura de Sonda conecta al Teléfono", "Arquitectura de Sonda conectada al Teléfono",
    "conecta -> conectada")

# Unidades sin espacio
for u in ("V DC", "V", "W", "mA", "µA", "mW", "hPa", "dBm"):
    pass
sub(r"(\d)(VDC)\b", r"\1 V DC", "unidad VDC sin espacio")
sub(r"(\d)V\b", r"\1 V", "unidad V sin espacio")
sub(r"(\d)W\b", r"\1 W", "unidad W sin espacio")
sub(r"(\d)µA\b", r"\1 µA", "unidad µA sin espacio")
sub(r"(\d)MΩ\b", r"\1 MΩ", "unidad MΩ sin espacio")
sub(r"(\d)%", r"\1 %", "porcentaje sin espacio")

# --------------------------------------------------------------------------
# 9. Numeracion unica de tablas y reconstruccion del indice
# --------------------------------------------------------------------------
# La seccion economica llega rotulada "Cuadro N" y el resto del informe usa
# "Tabla X.Y". Se unifican en una sola serie continua y sin huecos, y el indice
# se reconstruye desde los rotulos que realmente existen en el documento.
CUADROS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "9b",
           "10", "11", "12", "13", "14", "15", "16"]


def etiqueta(indice):
    """Serie continua que arranca en 1.7, donde termina la parte tecnica previa."""
    n = 17 + indice
    return "%d.%d" % (n // 10, n % 10)


convertidas = 0
for i, c in enumerate(CUADROS):
    m = re.search(r"^#### Cuadro %s\. (.+)$" % re.escape(c), texto, re.M)
    if not m:
        continue
    rotulo = "Tabla %s “%s”" % (etiqueta(i), m.group(1).strip())
    texto = texto.replace(m.group(0), "**%s**" % rotulo)
    convertidas += 1
CAMBIOS.append(("seccion economica: Cuadro N -> Tabla X.Y", convertidas))

# Las tablas posteriores se corren para cerrar el hueco de la seccion antigua.
CORRIMIENTO = [("3.8", "3.4"), ("3.9", "3.5"), ("4.0", "3.6"), ("4.1", "3.7"),
               ("4.2", "3.8"), ("4.3", "3.9"), ("4.4", "4.0"), ("4.5", "4.1"),
               ("4.6", "4.2"), ("4.7", "4.3"), ("4.8", "4.4"), ("4.9", "4.5"),
               ("5.0", "4.6"), ("5.1", "4.7"), ("5.2", "4.8"), ("5.3", "4.9")]
corte = texto.index("### Especificaciones Técnicas del Proyecto")
cabeza, cola = texto[:corte], texto[corte:]
for viejo, nuevo in CORRIMIENTO:
    cola = cola.replace("Tabla %s “" % viejo, "@@%s “" % nuevo)
cola = cola.replace("@@", "Tabla ")
texto = cabeza + cola
CAMBIOS.append(("tablas posteriores renumeradas", len(CORRIMIENTO)))

rotulos = re.findall(r"\*\*(Tabla \d\.\d “[^”]*”)\*\*", texto)
vistos, orden = set(), []
for r_ in rotulos:
    if r_ not in vistos:
        vistos.add(r_)
        orden.append(r_)
texto = re.sub(r"(### Índice de tablas\n\n)\*\*Tabla 1\.0.*?\*\*",
               lambda m: m.group(1) + "\n".join("- " + x for x in orden),
               texto, flags=re.S)
CAMBIOS.append(("indice de tablas reconstruido", len(orden)))

# El indice original terminaba en una pagina aparte; esa ultima linea queda huerfana.
sub(r"\n\*\*Tabla \d\.\d “Supuestos de Mercado Declarados”\.{3,}\s*\d*\*\*\n", "\n",
    "linea huerfana del indice antiguo")

# --------------------------------------------------------------------------
# 10. Referencias: separar la lista fusionada y sumar las fuentes nuevas
# --------------------------------------------------------------------------
NUEVAS_REFERENCIAS = [
    "Servicio de Impuestos Internos (SII), Chile. (2025). Ley N° 21.713 sobre cumplimiento de las "
    "obligaciones tributarias: aplicación de IVA a bienes adquiridos en el extranjero por hasta "
    "US$500 y fin de la exención bajo US$41. Recuperado de https://www.sii.cl/",
    "Ministerio del Trabajo y Previsión Social / Superintendencia de Pensiones. (2025). Ley "
    "N° 21.735 de reforma previsional: cotización de cargo del empleador y su calendario "
    "gradual. Recuperado de https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html",
    "Senado de la República de Chile. (2026). Reajuste del ingreso mínimo mensual. Recuperado "
    "de https://www.senado.cl/comunicaciones/noticias/ley-reajuste-al-ingreso-minimo-mensual",
    "LCSC Electronics. (2026). Catálogo de componentes electrónicos: precios unitarios por "
    "tramo de cantidad, empleados para los discretos de la lista de materiales. Recuperado de "
    "https://www.lcsc.com/",
    "AliExpress. (2026). Precios de referencia con envío Choice a Chile de los módulos, la "
    "sonda de suelo y la celda de litio de la lista de materiales. Recuperado de "
    "https://www.aliexpress.com/",
    "JLCPCB. (2026). Fabricación de circuito impreso de dos capas: precio según cantidad y "
    "envío a Chile. Recuperado de https://jlcpcb.com/",
]

inicio_refs = texto.rindex("Referencias bibliográficas")
cabecera, lista = texto[:inicio_refs], texto[inicio_refs:]
# La exportacion fusiono las 41 entradas en un solo parrafo: se restituye el salto.
lista, partidas = re.subn(r"(?<=[\S]) (\d{1,2})\. (?=[A-ZÁÉÍÓÚÑ(])",
                          lambda m: "\n%s. " % m.group(1), lista)
if partidas:
    CAMBIOS.append(("lista de referencias separada en entradas", partidas))
ultimo = max((int(n) for n in re.findall(r"^(\d{1,2})\. ", lista, re.M)), default=41)
lista = lista.rstrip() + "\n" + "\n".join(
    "%d. %s" % (ultimo + i + 1, r_) for i, r_ in enumerate(NUEVAS_REFERENCIAS)) + "\n"
texto = cabecera + lista
CAMBIOS.append(("referencias nuevas agregadas", len(NUEVAS_REFERENCIAS)))

# Las referencias nuevas deben quedar citadas en el cuerpo, no solo listadas.
MARCADORES = [
    (r"(la Ley N° 21\.713 eliminó)", r"la Ley N° 21.713 [42] eliminó"),
    (r"(Ley N° 21\.713 \(cumplimiento de obligaciones tributarias\) \|)",
     r"Ley N° 21.713 [42] (cumplimiento de obligaciones tributarias) |"),
    (r"(calendario legal vigente\. La Ley N° 21\.735)", r"calendario legal vigente. La Ley N° 21.735 [43]"),
    (r"(Ley N° 21\.735 \(reforma previsional\) \|)", r"Ley N° 21.735 [43] (reforma previsional) |"),
    (r"(El ingreso mínimo mensual quedó en \$553\.553)",
     r"El ingreso mínimo mensual quedó en $553.553 [44]"),
]
citados = 0
for patron, reemplazo in MARCADORES:
    texto, k = re.subn(patron, reemplazo.replace("\\u00b0", "°").replace("\\u00ed", "í"),
                       texto, count=1)
    citados += k
CAMBIOS.append(("marcadores de cita de las referencias nuevas", citados))

texto = re.sub(r"\n{4,}", "\n\n\n", texto)
with io.open(SALIDA, "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)

os.remove(ESPEJO)
print("Escrito:", os.path.normpath(SALIDA))
print("Correcciones aplicadas:")
for etq, n in CAMBIOS:
    print("  %-56s %3d" % (etq, n))
print("Total de sustituciones:", sum(n for _, n in CAMBIOS))
