# -*- coding: utf-8 -*-
"""Aplica al espejo del informe entregable todas las correcciones vigentes y escribe
`Evaluacion/Evaluacion 1/INFORME 1 CORREGIDO.md`.

Sustituye el bloque de viabilidad economica por la seccion generada desde el modelo,
alinea la gestion energetica con el esquematico de la placa, renumbera las tablas en
una sola serie y reconstruye los indices. El documento resultante vive junto al
entregable: no contiene referencias al repositorio ni compara contra versiones previas.

Al terminar lista cada correccion con el numero de veces que se aplico. Una correccion
con 0 aplicaciones es un defecto que el PDF ya no tiene; una con aplicaciones es algo
que todavia hay que llevar al documento editable.
"""
import io
import os
import re
import subprocess
import sys
import tempfile

# La consola de Windows usa cp1252 y no imprime símbolos como «Ω»: el resumen sale en UTF-8.
sys.stdout.reconfigure(encoding="utf-8")

BASE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(BASE, "..", "docs")
SECCION = os.path.join(DOCS, "SECCION_ECONOMICA_REFORMULADA.md")
SALIDA = os.path.join(BASE, "..", "Evaluacion", "Evaluacion 1", "INFORME 1 CORREGIDO.md")

# El espejo del PDF es un intermedio de trabajo, no un documento del repositorio:
# se genera en un temporal y se descarta al terminar.
ESPEJO = os.path.join(tempfile.gettempdir(), "terrasense_espejo_informe1.md")
subprocess.run([sys.executable, os.path.join(BASE, "espejo.py"), ESPEJO], check=True, cwd=BASE,
               stdout=subprocess.DEVNULL)
subprocess.run([sys.executable, os.path.join(BASE, "seccion_economica.py")], check=True, cwd=BASE,
               stdout=subprocess.DEVNULL)

sys.path.insert(0, BASE)
import modelo as M  # noqa: E402

R = M.dimensionar()
IND = M.resumen(R)
PRECIO = R["precio_lista"]


def p(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def num(x, d=1):
    return (("%." + str(d) + "f") % x).replace(".", ",")


def pct(x, d=1):
    return num(x * 100, d) + " %"


texto = io.open(ESPEJO, encoding="utf-8").read()
seccion = io.open(SECCION, encoding="utf-8").read()
CAMBIOS = []


def sub(patron, reemplazo, etiqueta, flags=0):
    """Correccion puntual: se registra cuantas veces aplico, aunque sea cero."""
    global texto
    texto, n = re.subn(patron, reemplazo, texto, flags=flags)
    CAMBIOS.append((etiqueta, n))
    return n


def exigir(patron, reemplazo, etiqueta, flags=re.S):
    """Correccion estructural. Si el ancla no aparece, basta con que el PDF ya traiga el texto
    corregido completo; si no, el espejo cambio y hay que revisar la correccion. Se compara el texto
    entero y no su comienzo: un parrafo con la redaccion nueva y cifras viejas no cuenta como corregido."""
    if sub(patron, reemplazo, etiqueta, flags):
        return

    def plano(s):
        return re.sub(r"[\s*|]", "", s)

    if callable(reemplazo) or plano(reemplazo.replace("%%", "%")) not in plano(texto):
        if os.environ.get("CORREGIR_LISTAR_FALLOS"):
            print("FALLA:", etiqueta)
            return
        raise SystemExit("No se encontró el ancla de la corrección «%s»" % etiqueta)


def bloque(desde, hasta, nuevo, etiqueta):
    """Reemplaza desde el titulo `desde` (incluido) hasta el titulo `hasta` (excluido)."""
    global texto
    i = texto.index(desde)
    j = texto.index(hasta, i + len(desde))
    texto = texto[:i] + nuevo.rstrip() + "\n\n\n" + texto[j:]
    CAMBIOS.append((etiqueta, 1))


def tabla(filas, titulo):
    """Tabla Markdown con su rotulo debajo; el numero se asigna al renumerar."""
    cab = "| " + " | ".join(filas[0]) + " |\n|" + "---|" * len(filas[0])
    cuerpo = "\n".join("| " + " | ".join(f) + " |" for f in filas[1:])
    # Se escapa el signo de porcentaje: la tabla se inserta en textos que luego se formatean con %.
    return ("%s\n%s\n\n**Tabla @@ “%s”**" % (cab, cuerpo, titulo)).replace("%", "%%")


# --------------------------------------------------------------------------
# 1. Seccion economica generada por el modelo
# --------------------------------------------------------------------------
cuerpo = seccion.replace("\r\n", "\n").replace("\n## ", "\n### ").replace("\n### Cuadro", "\n#### Cuadro")
if cuerpo.startswith("## "):
    cuerpo = "### " + cuerpo[3:]
# Cada "Cuadro N. Titulo" pasa a ser una tabla rotulada debajo, como el resto del informe.
cuerpo = re.sub(r"^#### Cuadro \d+\. (.+)\n\n((?:\|.*\n?)+)",
                lambda m: m.group(2).rstrip("\n") + "\n\n**Tabla @@ “%s”**\n" % m.group(1),
                cuerpo, flags=re.M)
bloque("### Análisis de Viabilidad Económica", "### Especificaciones Técnicas del Proyecto", cuerpo,
       "sección económica generada desde el modelo")

# --------------------------------------------------------------------------
# 2. Gestion energetica alineada con el esquematico de la placa
# --------------------------------------------------------------------------
from energia import *  # noqa: E402,F401,F403  (modelo energético compartido con el informe interno)

# 2a. Descripcion de las ramas de alimentacion, en las especificaciones tecnicas
RAMAS = (
    "La fuente de energía primaria es una celda LiPo protegida de 2.000 mAh a 3,7 V nominales, equivalente "
    "a una energía de referencia de aproximadamente 7,4 Wh. Antes de llegar a cualquier otro circuito, la "
    "celda pasa por un fusible de 1 A y un diodo de protección contra inversión de polaridad: si la batería "
    "se conecta al revés, el diodo conduce y el fusible corta, de modo que ninguno de los dos protege por sí "
    "solo. Un puente soldable en serie permite además intercalar un amperímetro para medir en banco el "
    "consumo real del equipo. Desde ese punto derivan cuatro ramas:\n\n"
    "- Rama de Carga y Elevación: un módulo combinado USB-C carga la celda con sus protecciones "
    "(sobrecarga, sobredescarga y cortocircuito) y eleva su tensión a 5 V. Esa salida alimenta todo el "
    "equipo a través del interruptor mecánico de encendido, que corta la salida del módulo y no la celda: "
    "así el equipo puede cargarse estando apagado.\n\n"
    "- Rama de Control: la placa de desarrollo ESP32 recibe los 5 V en su entrada y los reduce a 3,3 V con "
    "su propio regulador lineal, del que se alimentan también el sensor ambiental y el transceptor RS-485. "
    "Ese regulador y el LED de alimentación de la placa consumen del orden de %s mA mientras el equipo está "
    "encendido, aunque el microcontrolador esté en reposo, y por eso la autonomía se gestiona apagando el "
    "equipo entre jornadas y no con el reposo profundo del microcontrolador.\n\n"
    "- Rama de Medición Conmutada: un par de transistores MOSFET, uno de canal P en serie con la "
    "alimentación de la sonda y uno de canal N gobernado por el microcontrolador, entrega los 5 V a la "
    "sonda de suelo RS-485 solo durante la lectura.\n\n"
    "- Rama de Interfaz: tres LED indicadores gobernados por el microcontrolador y un divisor resistivo de "
    "100 kΩ + 100 kΩ, conectado a la celda después de sus protecciones, que entrega la mitad de la tensión "
    "de batería, entre 1,5 y 2,1 V, a una entrada analógica del ESP32.\n\n"
    "El divisor drena de forma permanente %s µA (I = V/R = 3,7 V / 200 kΩ), incluso con el equipo "
    "apagado. El valor se adopta por dos razones. La primera es de medición: el conversor analógico del "
    "ESP32 muestrea cargando un condensador interno, y una fuente de alta impedancia, como un divisor de "
    "1 MΩ + 1 MΩ, entrega lecturas más ruidosas y lentas de estabilizar; con 100 kΩ la lectura es estable "
    "sin componentes adicionales. La segunda es de proporción: en esta placa el drenaje del divisor es menor "
    "que el consumo en vacío del módulo de carga y elevación, de modo que reducirlo diez veces solo "
    "alargaría la autonomía en un %s. Las resistencias se montan en encapsulado 1206, la misma huella que "
    "admite valores de 1 MΩ: si una revisión posterior reduce el resto del consumo en apagado hasta que el "
    "divisor pese, el cambio se resuelve reemplazando dos resistencias, sin rediseñar la placa.\n\n"
    "La carga y la elevación de tensión se resuelven mediante una PCB combinada USB-C de carga y boost, "
    "integrada como un único componente. Concentrar ambas funciones en un solo módulo reduce el número de "
    "referencias de la BOM, el área de placa portadora y los puntos de soldadura del ensamblaje, sin renunciar "
    "a las protecciones de sobrecarga, sobredescarga y cortocircuito que exige la celda de litio."
    % (num(PROPIO_PLACA, 0), num(DIVISOR * 1000), pct(DIAS_1M / DIAS_HABITUAL - 1)))
exigir(r"La fuente de energía primaria es una celda LiPo.*?(?=\n+(?:<!--[^\n]*-->\n+)*### Sistema de Procesamiento)",
       RAMAS, "ramas de alimentación según el esquemático, con divisor de 100 kΩ")

exigir(r"### Sistema de Procesamiento y Conectividad: El núcleo del procesamiento recae en el módulo\n\n"
       r"ESP32-WROOM-32 \[19\]\.",
       "### Sistema de Procesamiento y Conectividad\n\nEl núcleo del procesamiento recae en el módulo "
       "ESP32-WROOM-32 [19].", "título de procesamiento separado del párrafo")

exigir(r"La última fila de la tabla exige una advertencia.*?tabla de sensibilidad al reposo\.",
       "La última fila de la tabla es una cifra del módulo y no del equipo. La BOM adquiere una placa de "
       "desarrollo que mantiene alimentados su regulador y su LED de alimentación mientras recibe tensión, con "
       "un consumo propio del orden de %s mA [48, 49], varios cientos de veces el reposo profundo del módulo. "
       "En esta placa, por lo tanto, la herramienta de ahorro no es el reposo profundo sino el interruptor, "
       "que corta la alimentación de la placa completa; la sección de gestión energética cuantifica el efecto."
       % num(PROPIO_PLACA, 0), "advertencia sobre el reposo de la placa de desarrollo")

# 2b. Estado probatorio: filas que dependen de la placa real
FILAS_PROBATORIO = [
    (r"\| ESP32: reposo profundo 10 µA \|[^\n]*",
     "| ESP32: reposo profundo 10 µA | Hoja de datos del módulo [19] | Confirmada para el módulo; no "
     "determina la autonomía, porque la placa de desarrollo tiene un consumo propio mayor | Nada |"),
    (r"\| Intervención de taller sobre la placa de desarrollo[^\n]*",
     "| Consumo propio de la placa de desarrollo: ≈%s mA en su entrada de 5 V (regulador y LED de "
     "alimentación) | Hoja de datos de un regulador representativo de la categoría y guía de la placa "
     "[48, 49] | Representativa, no medida sobre la placa adquirida | Medir en banco la corriente de la "
     "placa encendida con el microcontrolador en reposo |" % num(PROPIO_PLACA, 0)),
    (r"\| HT7533-1: 2,5 µA de quiescente \|[^\n]*",
     "| Interruptor de encendido después del módulo de carga | Decisión de diseño del esquemático | "
     "Definida, no medida | Medir la corriente de la celda con el interruptor abierto, usando el puente "
     "soldable de medición |"),
    (r"\| Circuito cargador/protección: ≈5 µA en vigilancia \|[^\n]*",
     "| Módulo de carga y elevación en vacío: 30–100 µA | Integrado de referencia de la categoría [21] | "
     "Estimación de diseño, no medida | Medir en banco sobre el módulo finalmente adquirido |"),
    (r"\| Divisor de batería: 1,85 µA \|[^\n]*",
     "| Divisor de batería: %s µA | Cálculo directo (3,7 V / 200 kΩ) sobre el valor de resistencia "
     "adoptado | Calculada a partir de una decisión de diseño | Nada; verificar con las resistencias reales "
     "y su tolerancia |" % num(DIVISOR * 1000)),
    (r"\| Reposo del sistema: ≈19,4 µA y autonomía de 8,5 meses \|[^\n]*",
     "| Autonomía: ≈%s semanas por carga en uso habitual | Balance energético por nodo sobre las líneas "
     "anteriores | Calculada; hereda la incertidumbre de las estimaciones anteriores | Medir la energía de "
     "una jornada tipo y la corriente con el equipo apagado |" % num(SEMANAS_HABITUAL, 0)),
]
# La tabla cruza un salto de página en el PDF, y editarla ahí suele dejarla incompleta: se reescribe
# entera. Las filas que dependen de la placa real salen de FILAS_PROBATORIO, con sus cifras calculadas.
TABLA_PROBATORIO = [
    "| Especificación declarada | Origen de la cifra | Nivel de evidencia | Qué falta para confirmar |",
    "| ESP32-WROOM-32: procesamiento, memoria, radio | Hoja de datos del módulo [19] | Confirmada por hoja de datos del componente seleccionado | Nada |",
    FILAS_PROBATORIO[0][1],
    FILAS_PROBATORIO[1][1],
    "| ESP32: FCC ID 2AC7Z-ESPWROOM32 | Certificado modular del fabricante | Confirmada | Verificar que la integración respeta las condiciones del certificado modular |",
    "| BME280: ±1,0 °C, ±3 % HR, ±1,0 hPa, 0,1 µA en reposo | Hoja de datos Bosch del componente exacto [13] | Confirmada por hoja de datos del componente seleccionado | Nada; verificar la respuesta térmica una vez montado tras el respiradero |",
    "| SP3485: 2 mA con driver habilitado | Hoja de datos del transceptor exacto [24] | Confirmada por hoja de datos del componente seleccionado | Nada |",
    FILAS_PROBATORIO[2][1],
    "| Sonda 7-en-1: rangos y exactitudes de las 7 variables | Manual del fabricante del modelo adquirido, ComWinTop CWT-Soil-NPKPHCTH-S [20] | Confirmada por la hoja de datos del componente exacto, en condiciones de laboratorio | Contrastar en suelo real con la campaña de validación de 30 muestras |",
    "| Sonda: alimentación 4,5–30 V DC y consumo 30 mA a 5 V | Manual del fabricante (4,5–30 V; 0,5 W como máximo a 24 V) [20], ficha de una sonda equivalente (0,15 W a 12 V) [50] y supuesto propio de potencia constante | Alimentación confirmada por el manual; consumo, supuesto de diseño | Medir consumo y exactitud operando a 5 V; si la exactitud se degradara, la contingencia es elevar a 12 V |",
    "| Sonda: acero inoxidable 316L | Descripción del vendedor | Declaración del vendedor | Certificado de material o ensayo; afecta la vida útil en suelos salinos |",
    FILAS_PROBATORIO[3][1],
    "| Elevador: eficiencia η ≈ 0,85 | Valor típico de convertidores elevadores de esta clase y corriente | Estimación de diseño, no medida | Medir la eficiencia real a la corriente de excitación de la sonda |",
    FILAS_PROBATORIO[4][1],
    FILAS_PROBATORIO[5][1],
]


def tabla_completa(filas):
    return "\n".join([filas[0], "|" + "---|" * (filas[0].count("|") - 1)] + filas[1:]) + "\n\n"


exigir(r"^\| Especificación declarada \| Origen de la cifra.*?(?=^\*\*Tabla \d\.\d “\s*Estado Probatorio)",
       lambda m: tabla_completa(TABLA_PROBATORIO), "estado probatorio: tabla completa", re.S | re.M)

exigir(r"(?:Toda la|La) electrónica de control está confirmada por hojas de datos.*?volumen de compra\.",
       "La electrónica de control está confirmada por hojas de datos de los componentes exactos, y la "
       "incertidumbre relevante se concentra en dos puntos: la sonda de suelo, que concentra además el %s "
       "del costo de materiales, y el consumo propio de la placa de desarrollo y del módulo de carga, que en "
       "esta placa determinan la autonomía. De ahí que las dos primeras acciones del plan de trabajo sean "
       "ensayar en banco la muestra de la sonda ya adquirida, cuyo modelo y manual del fabricante están "
       "identificados, "
       "y medir el consumo del conjunto ensamblado encendido y apagado, ambas antes de comprometer cualquier "
       "volumen de compra." % pct(48000 / M.BOM), "conclusión del estado probatorio")

# 2c. Gestion energetica
GESTION = ((
    "### Gestión Energética\n\n"
    "La autonomía del dispositivo depende de dos cortes: el que el microcontrolador aplica a la sonda en "
    "cada medición y el que el usuario aplica al equipo completo entre jornadas.\n\n"
    + tabla([
        ["Componente de Potencia", "Función en la Arquitectura"],
        ["Fusible de 1 A y diodo de protección", "Protección de la celda contra cortocircuito e inversión "
         "de polaridad: el diodo detecta la inversión y el fusible corta."],
        ["PCB combinada USB-C (carga + boost)", "Carga de la celda de litio por USB-C con protecciones "
         "(sobrecarga, sobredescarga, cortocircuito) y elevación a 5 V para todo el equipo, en un solo módulo."],
        ["Interruptor mecánico de encendido", "Corta la salida de 5 V del módulo hacia el resto del equipo; "
         "la celda queda conectada al módulo para poder cargar con el equipo apagado."],
        ["Regulador de 3,3 V de la placa de desarrollo", "Alimenta el microcontrolador, el sensor ambiental "
         "y el transceptor RS-485 a partir de los 5 V."],
        ["MOSFET de canal P y de canal N", "Corte de la alimentación de 5 V de la sonda, gobernado por un "
         "pin del microcontrolador."],
        ["Divisor resistivo 100 kΩ + 100 kΩ", "Lectura del estado de batería por la entrada analógica del "
         "microcontrolador."],
    ], "Gestión Energética") + "\n\n"
    "El corte de la sonda está resuelto para fallar hacia el lado seguro. El MOSFET de canal P, en serie "
    "con los 5 V de la sonda, mantiene su compuerta en alto mediante una resistencia de 10 kΩ, de modo que "
    "la rama queda apagada por defecto; el microcontrolador la habilita encendiendo el MOSFET de canal N, "
    "que lleva esa compuerta a tierra. Si el programa se detiene o el microcontrolador se reinicia, la sonda "
    "queda desconectada, y en operación normal solo se energiza durante los tres segundos de la adquisición. "
    "Sin ese corte, sus %s mW referidos a la batería se sumarían de forma continua a los %s mW que el equipo "
    "consume en espera, más que duplicándolos.\n\n"
    "Con el equipo encendido y el microcontrolador en reposo, el consumo no baja de la decena de "
    "miliamperios. La placa de desarrollo mantiene alimentados su regulador y su LED, y como la placa "
    "recibe 5 V desde el elevador, cada miliamperio de la rama de 3,3 V le cuesta a la batería la potencia de "
    "un miliamperio a 5 V dividida por la eficiencia del elevador. Solo el consumo propio de la placa "
    "representa %s mW desde la batería, varios cientos de veces lo que consumiría el módulo ESP32 en reposo "
    "profundo. Por eso, en esta placa, dejar el equipo encendido entre jornadas no es una opción de "
    "operación: el equipo se enciende al llegar al campo y se apaga al terminar.\n\n"
    "Con el interruptor abierto quedan conectados a la celda solo dos consumos: el divisor de batería, "
    "%s µA, y el módulo de carga y elevación en vacío, entre 30 y 100 µA según su modo de reposo [21]. El "
    "balance adopta el extremo superior, a confirmar en banco, lo que da ≈%s mA en total, dos órdenes de "
    "magnitud bajo el consumo del equipo encendido.\n\n"
    "Esta arquitectura tiene un camino de mejora identificado para una versión de producción: reemplazar la "
    "placa de desarrollo por el módulo ESP32 desnudo, alimentado desde la celda por un regulador de baja "
    "corriente de reposo, como el HT7533 de 2,5 µA [22]. Eso permitiría dejar el equipo en reposo profundo "
    "entre mediciones sin apagarlo, a cambio de incorporar a la placa portadora el regulador, el conversor "
    "USB-serie y el circuito de arranque que hoy aporta la placa de desarrollo.\n\n"
    "A modo de referencia del árbol de alimentación completo, incluyendo el punto de corte del MOSFET y los "
    "dos nodos de tensión regulada:"
    ) % (num(SONDA_MW / ETA), num(P_ESPERA), num(P_PROPIO), num(DIVISOR * 1000), num(DIVISOR + MODULO_VACIO, 2)))
exigir(r"### Gestión Energética\n.*?A modo de referencia del árbol de alimentación completo[^\n]*",
       GESTION.replace("\\", "\\\\"), "gestión energética según el esquemático")

exigir(r"El diagrama hace explícito lo que la Tabla de Balance Energético por Nodo.*?referirla a la batería\.",
       "El diagrama hace explícito lo que el balance energético por nodo cuantifica más adelante: toda la "
       "energía pasa primero por el elevador de 5 V, y la rama de 3,3 V cuelga de él a través del regulador "
       "lineal de la placa, de modo que ninguna corriente puede sumarse directamente a otra sin antes "
       "referirla a la batería.", "lectura del árbol de alimentación")

exigir(r"y por qué cada placa de desarrollo se interviene en taller antes de montarse",
       "y por qué el equipo lleva un interruptor mecánico que corta la alimentación de la placa completa "
       "entre jornadas", "regla de eficiencia: interruptor en lugar de intervención de taller")

exigir(r"El rendimiento real lo dictan componentes básicos implementados estratégicamente\..*?"
       r"mejor inversión electrónica del diseño\.",
       "El rendimiento real lo dictan componentes básicos implementados estratégicamente. La sonda no "
       "permanece alimentada mientras el equipo está encendido: dos MOSFET gobernados por el "
       "microcontrolador cortan su alimentación salvo durante los segundos exactos en que se toma una "
       "lectura. Sin ese corte, la sonda sola consumiría más que todo el resto del equipo en espera. Los dos "
       "MOSFET cuestan en conjunto %s y son, proporcionalmente, la mejor inversión electrónica del diseño."
       % p(2 * 19), "arquitectura de gestión eficiente: corte de la sonda")

sub(r"porque la carga dominante es la sonda y la autodescarga de la batería",
    "porque la carga dominante es el consumo propio de la placa de control mientras el equipo está "
    "encendido, no la radio", "comparativa de microcontroladores: carga dominante")
sub(r"porque coincide con el nivel que ya requiere el transceptor RS-485 y evita añadir un segundo convertidor",
    "porque coincide con la tensión que el mismo elevador ya entrega a la placa de control y evita añadir "
    "un segundo convertidor", "sonda a 5 V: el transceptor opera a 3,3 V")
sub(r"la contingencia de diseño es reemplazar el elevador actual por uno de 12 ?V, lo que no altera la "
    r"arquitectura general pero sí el consumo de la Rama de Medición Conmutada",
    "la contingencia de diseño es agregar un elevador de 12 V dedicado a la sonda, detrás del mismo corte "
    "por MOSFET, lo que no altera la arquitectura general pero sí el consumo de la Rama de Medición Conmutada",
    "contingencia de 12 V: elevador dedicado a la sonda")

# 2d. Modelo de autonomia
AUTONOMIA = ((
    "### Modelo de Autonomía en el Campo\n\n"
    "Cada vez que el usuario pulsa “Medir”, se dispara una lectura y el equipo recorre tres fases "
    "consecutivas. Entre una medición y otra el equipo permanece encendido en espera, con el enlace BLE "
    "disponible, y al final de la jornada se apaga con el interruptor.\n\n"
    "El error metodológico más común al estimar autonomía es sumar corrientes de distintos nodos de "
    "tensión como si fueran directamente equivalentes. El equipo no opera a una única tensión: la celda "
    "entrega 3,7 V nominales, el elevador la lleva a 5 V para todo el equipo, y la rama digital trabaja a "
    "3,3 V detrás del regulador lineal de la placa de desarrollo. Un miliamperio-hora no significa lo mismo "
    "en cada uno de esos nodos, de modo que el balance completo se plantea en unidades de energía (mWh) y no "
    "de carga (mAh): la energía sí es aditiva entre nodos de distinta tensión, la carga no.\n\n"
    "La conversión hacia la batería sigue una sola cadena. El elevador, de eficiencia η ≈ 0,85 [21], "
    "entrega los 5 V a costa de un 15 %% de pérdida. El regulador lineal de la placa entrega a la rama de "
    "3,3 V la misma corriente que toma de los 5 V, y disipa como calor la diferencia de tensión. Por eso la "
    "potencia desde la batería de cualquier componente de la rama de 3,3 V es 5 V × corriente del nodo / η, "
    "y solo el %s de la energía que sale de la celda llega efectivamente a la electrónica de 3,3 V. La sonda, "
    "que cuelga directamente de los 5 V, pierde solo la eficiencia del elevador.\n\n"
    + tabla(filas_nodo, "Balance Energético por Nodo de Tensión") + "\n\n"
    + tabla(filas_ciclo, "Energía por Ciclo de Medición") + "\n\n"
    "Tres precisiones sostienen estas tablas frente a un cálculo por suma directa de corrientes. La sonda "
    "toma 150 mW en su nodo de 5 V, pero exige %s mW a la batería: el factor 1/η = 1,176 que impone el "
    "elevador es energía perdida en la conversión. La rama de 3,3 V exhibe una pérdida mayor: los 40 mA de "
    "la Fase 1 valen 132 mW en su nodo, pero cuestan %s mW de batería, porque el regulador lineal y el "
    "elevador pierden en serie. Y el consumo propio de la placa, %s mW desde la batería, está presente en "
    "todas las fases y en la espera, de modo que la energía de la jornada la determina el tiempo que el "
    "equipo permanece encendido, no el número de mediciones. La corriente de transmisión del ESP32 en la "
    "Fase 3 se fija en 150 mA, el extremo superior de la banda de transmisión BLE declarada en la "
    "comparativa de microcontroladores; el consumo del transceptor SP3485 se toma del extremo superior de "
    "su hoja de datos [24]; y el de la sonda, del supuesto de potencia constante ya declarado.\n\n"
    "### Autonomía según el Patrón de Uso\n\n"
    "Como el equipo se apaga entre jornadas, la autonomía no se expresa en tiempo de reposo sino en "
    "jornadas de trabajo por carga. El ejercicio supone jornadas de %d horas encendido con %d mediciones "
    "cada una (%s mWh por jornada), una capacidad útil de %s mAh equivalente a %s mWh a 3,7 V, el consumo "
    "con el equipo apagado de la sección anterior (%s mW) y una autodescarga de la celda del 2 %% mensual "
    "(%s mWh por día):\n\n"
    + tabla(filas_esc, "Autonomía según el Patrón de Uso") + "\n\n"
    "La tabla muestra la consecuencia de operar con placa de desarrollo: el mismo equipo que almacenado "
    "apagado conserva su carga durante más de un año, se descarga en menos de dos días si se olvida "
    "encendido. Bajo el uso habitual, dos jornadas por semana, una carga dura del orden de %s semanas y "
    "%s mediciones; bajo uso intensivo diario, del orden de %s semanas. En ambos casos la recarga se "
    "resuelve con el mismo cargador USB-C del teléfono, y el equipo puede cargarse apagado.\n\n"
    "### Sensibilidad de la Autonomía\n\n"
    "Las cifras anteriores heredan dos estimaciones no medidas: el consumo propio de la placa de "
    "desarrollo y el consumo en vacío del módulo de carga. La siguiente tabla acota su efecto sobre el "
    "uso habitual:\n\n"
    + tabla(filas_sens, "Sensibilidad de la Autonomía al Consumo y al Uso") + "\n\n"
    "Las variables decisivas son el tiempo que el equipo pasa encendido y lo que consume apagado: duplicar "
    "la duración de las jornadas reduce la autonomía en un %s, duplicar el consumo propio de la placa en un "
    "%s y una fuga de 1 mA con el equipo apagado en un %s. El divisor de batería, en cambio, casi no pesa: reemplazarlo por uno de 1 MΩ + 1 MΩ "
    "la alarga apenas un %s, y por eso se conserva el de 100 kΩ, que entrega una lectura más estable.\n\n"
    "La cifra de referencia que se sostiene de aquí en adelante, de forma consistente en Síntesis y "
    "Conclusiones, es la del uso habitual: aproximadamente %s semanas (%s mediciones) con una sola carga, "
    "con un piso de %s semanas si se materializara una fuga de 1 mA antes de validarse en laboratorio.\n\n"
    "Corresponde subrayar el carácter de esta cifra: es un resultado calculado, no medido. Procede del "
    "balance energético por nodo con las eficiencias declaradas, y su confirmación exige medir el consumo "
    "del conjunto ensamblado encendido y apagado. Esa medición es la primera de las verificaciones "
    "pendientes que este informe enumera en sus conclusiones."
    ) % (pct(RENDIMIENTO_33, 0), num(SONDA_MW / ETA), num(V5 * 40 / ETA), num(P_PROPIO),
       JORNADA_H, MEDICIONES, num(E_JORNADA), format(CAPACIDAD_UTIL_MAH, ",d").replace(",", "."),
       format(int(E_UTIL), ",d").replace(",", "."), num(apagado(), 2), num(AUTODESCARGA, 2),
       num(SEMANAS_HABITUAL, 0), format(MEDICIONES_HABITUAL, ",d").replace(",", "."),
       num(DIAS_INTENSIVO / 7, 0),
       pct(1 - autonomia(2, horas=4) / DIAS_HABITUAL, 0),
       pct(1 - autonomia(2, propio=2 * PROPIO_PLACA) / DIAS_HABITUAL, 0),
       pct(1 - autonomia(2, modulo=MODULO_VACIO + 1.0) / DIAS_HABITUAL, 0), pct(DIAS_1M / DIAS_HABITUAL - 1),
       num(SEMANAS_HABITUAL, 0), format(MEDICIONES_HABITUAL, ",d").replace(",", "."),
       num(autonomia(2, modulo=MODULO_VACIO + 1.0) / 7, 1)))
bloque("### Modelo de Autonomía en el Campo", "### Sostenibilidad Ambiental", AUTONOMIA,
       "modelo de autonomía según el esquemático")

SINTESIS = (
    "### Síntesis de Eficiencia Energética\n\n"
    "El diseño del sistema prioriza la autonomía como un atributo crítico de confiabilidad. Con la placa "
    "de desarrollo del prototipo V2, esa autonomía se obtiene cortando la energía donde no se usa: la "
    "sonda solo recibe alimentación durante la lectura y el equipo completo se apaga entre jornadas. Bajo el "
    "uso habitual, una carga sostiene aproximadamente %s semanas de trabajo (%s mediciones) según el balance "
    "energético por nodo. Esta eficiencia es fruto de tres pilares de diseño:\n\n"
    "- Aislamiento Activo (Power Gating): Utilización de dos MOSFET para desconectar físicamente la sonda "
    "fuera de la lectura, de modo que su consumo no se suma a la espera.\n\n"
    "- Apagado Completo entre Jornadas: Un interruptor mecánico corta la salida del módulo de carga hacia "
    "la placa, dejando conectados a la celda solo el divisor de batería y el módulo en vacío, del orden de "
    "%s mA.\n\n"
    "- Optimización de Radio y Gestión Local: Empleo de Bluetooth Low Energy (BLE) con tramas de 20 bytes "
    "de longitud fija y ciclos de medición acotados (16 segundos), mientras el procesamiento offline en el "
    "teléfono libera al instrumento de tareas de cómputo intensivas y de almacenamiento."
    % (num(SEMANAS_HABITUAL, 0), format(MEDICIONES_HABITUAL, ",d").replace(",", "."),
       num(DIVISOR + MODULO_VACIO, 2)))
bloque("### Síntesis de Eficiencia Energética", "### Condiciones Técnicas y Normativas", SINTESIS,
       "síntesis de eficiencia energética")

# --------------------------------------------------------------------------
# 3. Contenido tecnico y de lengua
# --------------------------------------------------------------------------
sub(r", pero el mecanismo se nombra aquí con exactitud en lugar de aproximarlo\.", ".",
    "frase sobre el mecanismo de almacenamiento")
sub(r"Asume que el usuario dispone de un teléfono \(respaldado por conectividad rural\)\.",
    "Asume que el usuario dispone de un teléfono, supuesto respaldado por la alta penetración del "
    "smartphone en zonas rurales [15].", "cita de la penetración del smartphone rural")
sub(r"### Cumple la totalidad de los requisitos y pasa a puntuar\.",
    "Cumple la totalidad de los requisitos y pasa a puntuar.", "veredicto de la arquitectura como texto")
sub(r"Supabase \(PostgreSQL \+ PostGIS\) \+ Consola Web", "Supabase (PostgreSQL) + Consola Web",
    "Tabla 1.0: PostGIS retirado del producto")
sub(r"soporte posventa y analítica multitemporal\.", "soporte posventa y consulta del histórico de cada equipo.",
    "Tabla 1.0: analítica multitemporal")
# Producto vigente: no hay consola de flota ni perfiles de asesor o cooperativa, y ni la
# aplicación ni la consola web generan o exportan informes. La consola web la usa sólo soporte.
sub(r"Respaldo y Flota", "Respaldo y soporte", "Tabla 1.0: sin flota")
sub(r"puede consultarlas, exportarlas y usarlas libremente", "puede consultarlas y usarlas libremente",
    "principios: sin exportación")
sub(r"^\| Exportación del histórico local \|[^\n]*\n", "", "frontera offline: sin exportación", re.M)
sub(r"^\| Consola web de flota para asesores y cooperativas \|[^\n]*\n", "",
    "frontera offline: sin consola de flota", re.M)
sub(r"^\| Arquitectura multi-rol \|[^\n]*\|$",
    "| Roles por equipo | Cada equipo tiene un administrador y usuarios aprobados por él; con seguridad a "
    "nivel de fila, cada cuenta accede sólo a los equipos de los que es miembro. Los usuarios operan "
    "únicamente desde la aplicación: la consola web es exclusiva del soporte técnico. |",
    "digitalización: roles reales en lugar de multi-rol", re.M)
sub(r"la exportación de datos por el titular, el aislamiento por rol ya implementado",
    "la atención de los derechos del titular a través del correo de contacto que informa la aplicación, "
    "el aislamiento por equipo y rol ya implementado", "Ley 19.628: sin exportación")
# Interfaz del equipo segun el firmware vigente: tres luces y un zumbador, apagados en reposo.
# El boton solo abre la ventana de vinculacion; la medicion la pide la aplicacion.
sub(r"tres luces indicadoras, un botón de emparejamiento,", "tres luces indicadoras, un zumbador, un botón de emparejamiento,",
    "interfaz: zumbador")
sub(r"Las tres luces comunican, mediante distintos patrones de encendido, la totalidad de los estados relevantes "
    r"del equipo sin necesidad de abrir la aplicación:",
    "Las luces y el zumbador comunican los estados relevantes del equipo sin necesidad de abrir la aplicación. "
    "En reposo permanecen apagados y en silencio, y cada color tiene un único significado: azul, vinculación; "
    "verde, operación correcta; rojo, necesita atención:", "interfaz: reposo y significado de cada color")
TABLA_INTERFAZ = [
    "| Estado Operativo | Indicador Activo | Patrón de Señalización | Sonido | Significado Técnico |",
    "| Encendido | 🟢 Verde | Fijo durante 1 s, una vez | Un pitido corto | El equipo arrancó y está listo para vincularse o medir. |",
    "| Ventana de vinculación | 🔵 Azul | Parpadeo de 2 Hz durante 30 s | Un pitido corto al abrirse | Se mantuvo el botón 3 s; mientras dure, la aplicación puede vincular el equipo. |",
    "| Vinculación confirmada | 🟢 Verde | Tres destellos | Dos pitidos ascendentes | La aplicación registró el equipo y se lo confirmó. |",
    "| Vinculación rechazada | 🔴 Rojo | Tres destellos | Tono grave de 0,4 s | La ventana estaba cerrada o el identificador no corresponde al equipo. |",
    "| Medición enviada | 🟢 Verde | Tres destellos | Dos pitidos ascendentes | La lectura llegó al teléfono. |",
    "| Error de sonda | 🔴 Rojo | Tres destellos | Tono grave de 0,4 s | La lectura llegó sin datos de suelo: sonda desconectada, sin respuesta Modbus o con CRC inválido. |",
    "| Batería baja | 🔴 Rojo | Un destello corto cada 10 s | Dos tonos graves, sólo al entrar en batería baja | Tensión de batería bajo el umbral de aviso; requiere recarga por USB-C. |",
]
exigir(r"^\| Estado Operativo \| Indicador Activo \|.*?(?=^\*\*Tabla \d+\.\d+ “\s*Interfaz Hardware)",
       lambda m: tabla_completa(TABLA_INTERFAZ), "interfaz: tabla de luces y sonidos del firmware", re.S | re.M)
# El firmware se actualiza por Bluetooth desde la aplicacion: el producto no usa Wi-Fi.
sub(r"^\| Actualización remota \(OTA\) \|[^\n]*\|$",
    "| Actualización remota (OTA) | El firmware se actualiza por Bluetooth desde la aplicación, sin Wi-Fi: la "
    "consola web de soporte publica cada versión y la aplicación la transfiere al equipo. El mapa de registros "
    "Modbus, la dirección del esclavo y los coeficientes de calibración se diseñan para residir en la memoria no "
    "volátil del microcontrolador y ajustarse por esa misma vía, sin reemplazar el firmware completo; la app "
    "móvil se distribuye por los canales estándar de actualización de cada tienda de aplicaciones. |",
    "digitalización: OTA por Bluetooth, sin Wi-Fi", re.M)
# Matriz de microcontroladores: el criterio de Wi-Fi para OTA pasa a actualizacion del firmware por
# Bluetooth, porque el producto no usa Wi-Fi. La tabla muestra la nota de cada criterio; los demas
# criterios conservan las notas con que se calcularon los puntajes originales.
sub(r"Wi-Fi integrado para actualización remota \(20 %\)", "actualización del firmware por Bluetooth (20 %)",
    "microcontroladores: criterio de actualización por Bluetooth")
sub(r"disponibilidad y costo en el mercado local \(20 %\)\.",
    "disponibilidad y costo en el mercado local (20 %). Cada celda de la tabla es la nota del criterio y el "
    "puntaje ponderado, la suma de cada nota por su peso.", "microcontroladores: cómo leer la tabla")
TABLA_MCU = [
    "| Microcontrolador | Consumo de radio en Tx BLE (20 %) | Actualización del firmware por Bluetooth (20 %) | Concurrencia (15 %) | Ecosistema y documentación (25 %) | Disponibilidad y costo (20 %) | Puntaje ponderado | Veredicto |",
    "| STM32WB55 | 10 (~5–6 mA [8]) | 8 | 8 (2 núcleos) | 5 | 4 | 6,85 | Descartado |",
    "| nRF52840 | 10 (~5–6 mA [9]) | 10 | 5 (1 núcleo) | 7 | 5 | 7,50 | Descartado |",
    "| ESP32 | 4 (~130–150 mA [19]) | 7 | 10 (2 núcleos) | 10 | 10 | 8,20 | Seleccionado |",
]
exigir(r"^\| Microcontrolador \| Consumo de radio en Tx BLE \|.*?(?=^\*\*Tabla \d+\.\d+ “\s*Comparativa de Microcontroladores)",
       lambda m: tabla_completa(TABLA_MCU), "microcontroladores: tabla con la nota de cada criterio", re.S | re.M)
sub(r"A cambio de resignar ese porcentaje, el ESP32 aporta Wi-Fi integrado.*?para proyectos basados en este "
    r"microcontrolador\.",
    "A cambio de resignar ese porcentaje, el ESP32 gana en los criterios de mayor peso: el ecosistema de "
    "desarrollo y el soporte de la comunidad, la disponibilidad y el costo en el mercado local, y el doble núcleo "
    "para sostener la temporización de la sonda sin perder el Bluetooth. En actualización del firmware por "
    "Bluetooth queda detrás del nRF52840, cuyo mecanismo de actualización por BLE es maduro: el ESP32 aporta las "
    "particiones y la interfaz de actualización, pero el transporte por Bluetooth lo implementa el propio "
    "firmware. El producto no usa el Wi-Fi integrado del ESP32; el firmware se actualiza por Bluetooth desde la "
    "aplicación.", "microcontroladores: justificación sin Wi-Fi", re.S)
# Introduccion: el PDF corta la ultima oracion a mitad de palabra
sub(r"con comparación a cinco años, el marco norm(?!ativo)\s*\d*",
    "con comparación a cinco años, el marco normativo y el protocolo de validación experimental que "
    "sustentan su factibilidad técnica y económica.", "introducción truncada")
# Filosofia: el segundo principio se repite tras el salto de pagina y falta el tercero de los cuatro
# El PDF entregado ya trae el párrafo sin duplicar y los cuatro principios: la corrección queda opcional.
sub(r"capacidad de cálculo y memoria,\s*Fabricar un instrumento nuevo.*?(?=^- Cero Suscripciones Recurrentes)",
       "capacidad de cálculo y memoria. Fabricar un instrumento nuevo que vuelva a incluir todas esas "
       "capacidades sería cobrarle dos veces al agricultor por algo que ya tiene. Por eso, el aparato físico se "
       "reduce a lo mínimo indispensable: hacer lo único que el teléfono no puede hacer por sí solo (tomar "
       "contacto físico con la tierra y el ambiente). Todo el resto ocurre en el teléfono. Además de que el "
       "100 % del procesamiento agronómico ocurre en el procesador del teléfono sin depender de cobertura de "
       "red móvil (3G/4G/5G). La nube actúa exclusivamente como respaldo posterior.\n\n"
       "- Diseño para el Campo Real, no para el Laboratorio: El instrumento no vivirá sobre un escritorio; se "
       "caerá sobre tierra y piedras, se mojará, viajará en la caja de una camioneta y será manipulado con "
       "guantes de trabajo. Cada elección de materiales responde a esa realidad de uso, priorizando la "
       "austeridad y la resistencia sobre la estética.\n\n",
       "principios: párrafo duplicado y principio faltante", re.S | re.M)
# Cifras que quedaron del precio antiguo o de modelos anteriores
MUESTRAS = -(-int(round(PRECIO)) // 50000)
PALABRAS = {8: "ocho", 9: "nueve", 10: "diez", 11: "once", 12: "doce"}
sub(r"a ese costo, siete muestras ya igualan el precio completo",
    "a ese costo, %s muestras ya cubren el precio completo" % PALABRAS.get(MUESTRAS, str(MUESTRAS)),
    "muestras de laboratorio que cubren el precio")
sub(r"está contenida en las 2,25 horas por equipo que la nómina ya presupuesta",
    "está contenida en el trabajo de los ensambladores que la nómina ya presupuesta",
    "calibración de fábrica: sin horas por equipo inexistentes")
sub(r"reduce ese flujo a una celda por ciclo de vida del instrumento, es decir del orden de dos unidades en "
    r"diez años según el propio cuadro de costo total de propiedad\.",
    "reduce ese flujo a una celda cada varios años: del orden de cuatro en diez años según el propio cuadro "
    "de costo total de propiedad (la original, las de los kits de batería de los años 3 y 8 y la del segundo "
    "equipo del año 6).", "celdas en diez años según el costo total de propiedad")
sub(r"la autonomía caería a unas 5 semanas\.",
    "la autonomía caería a unas %s semanas." % num(autonomia(2, modulo=MODULO_VACIO + 1.0) / 7, 1),
    "conclusión: autonomía con fuga de 1 mA")
sub(r"Esta digitalización se sostiene sobre cinco pilares técnicos",
    "Esta digitalización se sostiene sobre cuatro pilares técnicos", "cinco pilares -> cuatro")
sub(r"tramas compactas de 20\s+bytes como máximo", "tramas de 20 bytes de longitud fija",
    "trama BLE de longitud fija")
sub(r"autogestionando su transición a reposo inmediatamente tras cada muestreo de 3,6 µA",
    "autogestionando su transición a reposo tras cada muestreo; los 3,6 µA son el consumo medio a 1 Hz "
    "declarado en la hoja de datos, no la corriente instantánea durante la conversión",
    "BME280: 3,6 µA es un promedio")
sub(r"Resolución SUBTEL N° 737/2025 \[19\]", "Resolución SUBTEL N° 737/2025 [17]", "referencia SUBTEL 737/2025")
sub(r"IEC 60529 \[28\]", "IEC 60529 [27]", "referencia IEC 60529")
sub(r"UN 38\.3 / IEC 62133-2 \[27\]", "UN 38.3 / IEC 62133-2 [28]", "referencia UN 38.3")
sub(r"ISO 11277 \[36\]: Método gravimétrico", "ISO 11465 [36]: Método gravimétrico", "ISO 11465")
sub(r"\bpredios\b", "campos", "predios -> campos")
sub(r"\bpredio\b", "campo", "predio -> campo")
sub(r"estación concentradora predial", "estación concentradora en el campo", "predial -> en el campo")
sub(r"\bpredial\b", "de campo", "predial -> de campo")
sub(r"Si se puntuará", "Si se puntuara", "puntuará -> puntuara")
sub(r"Interfaz Fisica de Usuario", "Interfaz Física de Usuario", "Fisica -> Física")
sub(r"Aprobación Electrica", "Aprobación Eléctrica", "Electrica -> Eléctrica")
sub(r"Arquitectura de Sonda conecta al Teléfono", "Arquitectura de Sonda conectada al Teléfono",
    "conecta -> conectada")
sub(r"ESP32-WROOM-3 2\b", "ESP32-WROOM-32", "nombre del módulo partido")
sub(r"(\d)(VDC)\b", r"\1 V DC", "unidad VDC sin espacio")
sub(r"(\d)V\b", r"\1 V", "unidad V sin espacio")
sub(r"(\d)µA\b", r"\1 µA", "unidad µA sin espacio")
sub(r"(\d)MΩ\b", r"\1 MΩ", "unidad MΩ sin espacio")
sub(r"(\d)%", r"\1 %", "porcentaje sin espacio")

# Titulos de capitulo con el formato de los demas
sub(r"^### III\.\s*Propuesta de Solución Tecnológica\.?$", "## III. Propuesta de Solución Tecnológica",
    "título del capítulo III", re.M)
sub(r"^### IV\.\s*Objetivos del Proyecto\.?$", "## IV. Objetivos del Proyecto", "título del capítulo IV", re.M)
sub(r"^### VI\.\s*Conclusiones$", "## VI. Conclusiones", "título del capítulo VI", re.M)

# Normativa tributaria y laboral que la evaluación económica aplica
FILA_21713 = (
    "| Ley N° 21.713 [42] (cumplimiento de obligaciones tributarias) | Obligatoria (Chile) | Abastecimiento "
    "formalizado como importación, con Declaración de Ingreso, para que el IVA de los insumos constituya "
    "crédito fiscal | Revisión de la carpeta tributaria de importación antes de la primera orden de volumen. "
    "Criterio: toda compra de insumos respaldada con DIN o factura nacional. Evidencia: declaraciones de "
    "ingreso y registro de crédito fiscal | Pendiente |")
FILA_21735 = (
    "| Ley N° 21.735 [43] (reforma previsional) | Obligatoria (Chile) | Cotización de cargo del empleador "
    "aplicada según el calendario gradual vigente, además de cesantía y mutualidad | Revisión de las "
    "declaraciones previsionales mensuales. Criterio: tasa del período correctamente aplicada sobre cada "
    "remuneración. Evidencia: certificados de pago previsional | Pendiente |")
# La matriz normativa cruza cuatro saltos de página: se reescribe completa, con las dos leyes que la
# evaluación económica aplica.
TABLA_NORMATIVA = [
    "| Norma | Carácter | Requisito de diseño derivado | Método de verificación, criterio de aceptación y evidencia | Estado |",
    "| Ley N° 20.920 (Ley REP) | Obligatoria (Chile) | Diseño desmontable con celdas extraíbles y canal de recepción al fin de vida útil | Ensayo funcional de desmontaje sin herramientas especiales y convenio escrito con gestor autorizado. Criterio: celda extraíble y punto de recepción operativo. Evidencia: procedimiento de desmontaje y convenio firmado | Pendiente |",
    "| SUBTEL, Res. Exenta N° 1.985/2017 | Obligatoria (Chile) | Enlace BLE a +9 dBm (≈8 mW), con margen frente al límite aplicable | Medición en banda 2,4 GHz sobre la unidad ensamblada, previa confirmación documental de cuál es el límite vigente y sobre qué magnitud se mide. Criterio: cumplir el límite acreditado con margen. Evidencia: extracto de la resolución vigente e informe de medición | Pendiente |",
    "| SUBTEL, Resolución N° 737/2025 | Obligatoria (Chile) | Verificación formal del producto terminado, con cargo al rubro de desarrollo y validación | Trámite formal de verificación ante la autoridad sectorial. Criterio: resolución favorable previa a la comercialización. Evidencia: expediente y resolución | Pendiente |",
    "| UN 38.3 / IEC 62133-2 | Obligatoria (transporte y comercialización de celdas de litio) | Celdas comerciales con certificación de origen y protección electrónica del cargador | Solicitud de certificados al proveedor de celdas y ensayo de las protecciones del cargador. Criterio: certificados vigentes y corte por sobrecarga, sobredescarga y cortocircuito. Evidencia: certificados y acta de ensayo | Pendiente |",
    "| Ley N° 19.628 (Protección de la Vida Privada) | Obligatoria (Chile) | Aislamiento por equipo y rol; derechos del titular atendidos a través del correo de contacto | Pruebas de acceso cruzado entre cuentas y registro de solicitudes. Criterio: cero lecturas de equipos ajenos y respuesta a cada solicitud del titular en el plazo legal. Evidencia: batería de pruebas de aislamiento y registro de solicitudes | Parcial: aislamiento implementado, procedimiento de solicitudes pendiente |",
    "| Ley N° 21.719 (Protección de Datos Personales) | Obligatoria (Chile) | Registro de actividades de tratamiento y procedimiento escrito de notificación de vulneraciones | Revisión documental antes de abrir la primera cuenta comercial. Criterio: registro y procedimiento redactados, con responsable designado. Evidencia: documentos firmados | Pendiente |",
    "| Ley N° 21.398 (“Pro Consumidor”) | Obligatoria (Chile) | Garantía legal de 6 meses más provisión del 5 % de BOM para atenderla | Revisión legal de las condiciones de garantía y provisión contable. Criterio: cobertura ≥ 6 meses y provisión del 5 % de BOM reservada. Evidencia: texto de garantía y asiento de provisión | Parcial |",
    "| Ley N° 19.496 (Protección al Consumidor) | Obligatoria (Chile) | Declaración comercial como “diseñado conforme a IP67” hasta contar con ensayo de laboratorio | Auditoría del material comercial. Criterio: ninguna pieza declara IP67 certificado mientras no exista ensayo. Evidencia: material revisado y aprobado | Cumple |",
    FILA_21713,
    FILA_21735,
    "| IEC 60529 (grado IP67) | Voluntaria como estándar; exigible como declaración una vez publicada, por efecto de la Ley N° 19.496 | Envolvente PETG con O-ring, sellado intercapa, prensaestopas M12 y respiradero protegido del sensor ambiental | Ensayo IP67 en laboratorio acreditado sobre el conjunto ensamblado, incluido el respiradero. Criterio: sin ingreso de agua tras 30 min a 1 m. Evidencia: informe de ensayo | Pendiente |",
    "| Métodos oficiales SAG / INIA | Voluntaria (referencia técnica nacional adoptada) | Umbrales de la matriz de cultivos trazables a criterios oficiales publicados | Contraste de cada umbral de la matriz de cultivos con su fuente oficial. Criterio: trazabilidad documental de cada umbral. Evidencia: tabla de correspondencia umbral–fuente, con fecha de consulta | Pendiente |",
    "| RoHS 2011/65/EU y RoHS 3 | Voluntaria en Chile / referencia de mercado futuro | Soldadura SAC305 y declaración de conformidad de proveedores | Recopilación de declaraciones de conformidad de proveedores. Criterio: cobertura documental de los componentes de la BOM. Evidencia: carpeta de declaraciones | Pendiente |",
    "| FCC, Título 47 CFR Parte 15 | Referencia de mercado futuro (EE. UU., no exigible en Chile) | Cubierto de forma incidental por el módulo ESP32 pre-certificado | Verificación del FCC ID del módulo y de las condiciones de uso del certificado modular. Criterio: integración dentro del alcance declarado. Evidencia: ficha del módulo | No aplica en Chile |",
    "| TIA/EIA-485-A y Modbus V1.1b3 | Voluntaria (estándares técnicos abiertos) | Base de diseño del bus RS-485 y la trama Modbus RTU hacia la sonda | Prueba de bus con analizador lógico sobre la trama Modbus RTU. Criterio: terminación correcta y cero errores de CRC en 1.000 lecturas consecutivas. Evidencia: captura y registro de errores | Parcial |",
    "| ISO 10390, ISO 11265, ISO 11277, ISO 11465 | Voluntaria (métodos de referencia de laboratorio) | Métodos de contraste del protocolo de validación in situ | Protocolo de validación in situ contra laboratorio acreditado bajo ISO/IEC 17025. Criterio: el fijado en el propio protocolo. Evidencia: informes de laboratorio y análisis de concordancia | Pendiente |",
    "| ISO/IEC 27001:2022 e ISO/IEC 25010 | Voluntaria (certificación de gestión y calidad de software) | Cifrado en tránsito y reposo, control de acceso segmentado | Revisión de configuración de cifrado y de segmentación de accesos. Criterio: TLS vigente y ausencia de credenciales embebidas. Evidencia: informe de revisión | Parcial |",
    "| WCAG 2.1, nivel AA | Voluntaria (no exigida por ley a aplicaciones privadas en Chile) | Contraste ≥ 4,5:1, área táctil ≥ 48×48 dp y color no exclusivo como portador de información | Auditoría de accesibilidad sobre las pantallas de la aplicación. Criterio: contraste ≥ 4,5:1 y ninguna información transmitida solo por color. Evidencia: informe de auditoría | Pendiente |",
]
exigir(r"^\| Norma \| Carácter \| Requisito de diseño derivado.*?(?=^\*\*Tabla \d\.\d “\s*Clasificación Normativa)",
       lambda m: tabla_completa(TABLA_NORMATIVA), "matriz normativa: tabla completa con leyes 21.713 y 21.735",
       re.S | re.M)
PROTOCOLO_ESTADISTICO = (
    "#### Criterio estadístico para declarar ausencia de sesgo\n\n"
    "Una prueba que no encuentra diferencia significativa no demuestra que la diferencia no exista: con 30 "
    "puntos, una regresión puede no detectar un sesgo proporcional del 15 % sólo porque la muestra es "
    "pequeña. Por eso el protocolo no declara ausencia de sesgo cuando la prueba «no resulta significativa», "
    "sino cuando el intervalo de confianza demuestra que el sesgo, si existe, es menor que un margen fijado de "
    "antemano. Es un criterio de **equivalencia**, no de significancia.\n\n"
    "- **Sesgo proporcional.** Se ajusta la regresión de Passing-Bablok [57] de la lectura in situ (eje y) "
    "sobre la de laboratorio (eje x). Este método no supone normalidad, admite error en ambos métodos y no lo "
    "desplaza un valor atípico aislado, que en suelo real es frecuente. Sin sesgo proporcional la pendiente "
    "vale 1. Se declara la ausencia de sesgo proporcional sólo si el intervalo de confianza del 95 % de la "
    "pendiente queda **entero** dentro de 0,90–1,10. El margen de ±10 % no es arbitrario: es el mismo error "
    "relativo que el umbral de conductividad tolera, y en humedad equivale a 3 puntos porcentuales en un suelo "
    "al 30 %, bajo el umbral de 4 puntos.\n"
    "- **Sesgo constante.** Con la misma regresión, la ordenada en el origen vale 0 si no hay sesgo constante. "
    "Se declara su ausencia si el intervalo de confianza del 95 % de la ordenada contiene el cero.\n"
    "- **Concordancia.** El análisis de Bland-Altman [56] grafica la diferencia entre ambos métodos contra su "
    "promedio y entrega el sesgo medio, con su intervalo de confianza, y los límites de concordancia, iguales "
    "al sesgo ± 1,96 desviaciones estándar de las diferencias. Si las diferencias crecen con el promedio, "
    "señal de sesgo proporcional, los límites se calculan sobre diferencias porcentuales y no absolutas.\n\n"
    "Si el intervalo de la pendiente sale más ancho que el margen, el resultado no es «aprobado» ni "
    "«rechazado» sino **no concluyente**: se agregan puntos hasta que el intervalo permita decidir, en lugar "
    "de aprobar la variable porque la muestra fue demasiado chica para ver el error.")
PROTOCOLO_HUMEDAD = (
    "#### Conversión entre humedad gravimétrica y volumétrica\n\n"
    "La sonda informa **humedad volumétrica** (θv, volumen de agua por volumen de suelo), mientras que el "
    "método gravimétrico de laboratorio entrega **humedad gravimétrica** (w, masa de agua por masa de suelo "
    "seco). Las dos magnitudes no son comparables directamente: las relaciona la densidad aparente seca del "
    "suelo (ρb), que varía de un punto a otro con la textura, la materia orgánica y la compactación. La "
    "conversión se formaliza así:\n\n"
    "| Magnitud | Expresión | Unidad | Origen |\n"
    "|---|---|---|---|\n"
    "| Humedad gravimétrica | w = (mh − ms) / ms | g/g | ISO 11465 [36]: masa húmeda (mh) y masa seca a 105 °C hasta masa constante (ms) |\n"
    "| Densidad aparente seca | ρb = ms / V | g/cm³ | ISO 11272 [54]: masa seca del cilindro de volumen conocido (V = 100 cm³) |\n"
    "| Humedad volumétrica | θv = w × ρb / ρw = (mh − ms) / (ρw × V) | cm³/cm³ (× 100 = %) | ISO 11461 [55], con ρw = 1,00 g/cm³ (densidad del agua) |\n"
    "| Incertidumbre relativa | u(θv)/θv = √[(u(w)/w)² + (u(ρb)/ρb)²] | adimensional | Propagación de las incertidumbres de w y de ρb |\n\n"
    "**Tabla 5.3 “Conversión de la humedad gravimétrica a volumétrica”**\n\n"
    "En cada punto de la campaña se toma, a no más de 10 cm del punto de inserción de la sonda y a la misma "
    "profundidad de sus electrodos, un cilindro de acero de 100 cm³ hincado sin compactar el suelo, dentro de "
    "los 15 minutos siguientes a la lectura in situ. El cilindro se sella, se pesa húmedo dentro de 24 horas y "
    "se seca en estufa a 105 °C hasta masa constante. De la misma muestra salen w, ρb y θv, y es θv, expresado "
    "en porcentaje, el que se compara con la lectura de la sonda; la diferencia se informa en puntos "
    "porcentuales.\n\n"
    "Un ejemplo muestra por qué la densidad aparente se mide en cada punto y no se toma de una tabla por "
    "textura. Con w = 0,20 g/g y ρb = 1,35 g/cm³, la humedad volumétrica es 0,20 × 1,35 = 0,27, es decir "
    "27 %. Si en vez de medir ρb se asumiera 1,30 g/cm³ en un suelo que en realidad tiene 1,50 g/cm³, el valor "
    "de referencia saldría 26 % cuando el real es 30 %: un error de 4 puntos, igual a todo el umbral de "
    "aceptación, atribuido injustamente a la sonda. Medir w y ρb sobre el mismo cilindro elimina esa fuente "
    "de error.")
SECCION_TRIB = (
    "### Obligaciones Tributarias y Laborales\n\n"
    "- Ley N° 21.713 [42] (cumplimiento de obligaciones tributarias): desde octubre de 2025 eliminó la "
    "exención que liberaba de IVA a las importaciones bajo US$41. Toda compra internacional paga IVA, y las "
    "plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan al momento de la compra para "
    "pedidos de hasta US$500, sin arancel aduanero adicional. La consecuencia de diseño es económica y no "
    "técnica: ese IVA sólo constituye crédito fiscal si la compra se formaliza como importación con "
    "Declaración de Ingreso, de modo que el abastecimiento debe formalizarse antes de comprometer volumen.\n\n"
    "- Ley N° 21.735 [43] (reforma previsional): introdujo una cotización de cargo del empleador que parte "
    "en 3,5 % desde agosto de 2026 y sube de forma gradual hasta completar 8,5 % desde agosto de 2033, "
    "incluido el Seguro de Invalidez y Sobrevivencia. El proyecto pondera cada tramo por sus meses de vigencia en el costo laboral, porque sobre un horizonte de "
    "diez años la diferencia frente a un recargo fijo es material.\n\n")
if "### Obligaciones Tributarias y Laborales" not in texto:
    sub(r"(### Protección al Consumidor)", lambda m: SECCION_TRIB + m.group(1),
        "sección normativa: obligaciones tributarias y laborales")

# 3b. Protocolo de validación: sesgo proporcional por equivalencia y conversión de humedad
exigir(r"^\| Referencia de laboratorio \|[^\n]*\|\n",
       "| Referencia de laboratorio | pH según ISO 10390; conductividad eléctrica según ISO 11265; textura según "
       "ISO 11277; humedad gravimétrica según ISO 11465 [36] y densidad aparente seca según ISO 11272 [54], ambas "
       "sobre el mismo cilindro de volumen conocido, y humedad volumétrica derivada de ellas según ISO 11461 [55]. "
       "Laboratorio acreditado bajo ISO/IEC 17025 para los ensayos solicitados |\n",
       "protocolo: referencia de laboratorio con densidad aparente", re.M)
exigir(r"^\| Estadístico de concordancia \|[^\n]*\|\n",
       "| Estadístico de concordancia | Coeficiente de determinación (R²) y error cuadrático medio (RMSE) en la "
       "unidad nativa de cada variable; regresión de Passing-Bablok [57] de la lectura in situ sobre la de "
       "laboratorio, con el intervalo de confianza del 95 % de la pendiente y de la ordenada; análisis de "
       "Bland-Altman [56] con el sesgo medio, su intervalo de confianza del 95 % y los límites de concordancia |\n",
       "protocolo: estadístico de concordancia", re.M)
exigir(r"^\| Umbral de aceptación \|[^\n]*\|\n",
       "| Umbral de aceptación | Umbral agronómico propio: pH, RMSE ≤ 0,3 unidades; conductividad eléctrica, "
       "RMSE ≤ 10 % de la lectura o 200 µS/cm, el mayor de ambos; humedad volumétrica, RMSE ≤ 4 puntos "
       "porcentuales. Adicionalmente R² ≥ 0,80; sin sesgo proporcional, demostrado por equivalencia: el "
       "intervalo de confianza del 95 % de la pendiente de Passing-Bablok queda entero dentro de 0,90–1,10; y sin "
       "sesgo constante: el intervalo de confianza del 95 % de la ordenada contiene el cero |\n",
       "protocolo: umbral de sesgo proporcional por equivalencia", re.M)
exigir(r"(uno de 10 puntos sí lo altera\.)(?!\n\n#### Criterio estadístico)",
       lambda m: m.group(1) + "\n\n" + PROTOCOLO_ESTADISTICO + "\n\n" + PROTOCOLO_HUMEDAD,
       "protocolo: criterio estadístico y conversión de humedad", re.S)

# --------------------------------------------------------------------------
# 4. Conclusiones, reescritas sobre el modelo y la placa vigentes
# --------------------------------------------------------------------------
F = R["filas"]
KIT = 24990


def tco(n):
    return PRECIO * (1 + (n >= 6)) + KIT * ((n >= 3) + (n >= 8))


lab = [n for n in range(1, 11) if 200000 * n > tco(n)]
ase = [n for n in range(1, 11) if 120000 * n > tco(n)]

exigir(r"El diseño energético(?:, basado en power gating| corta la alimentación de la sonda).*?(?=\n)",
       "El diseño energético corta la alimentación de la sonda fuera de cada lectura y apaga el equipo "
       "completo entre jornadas, y con ello sostiene aproximadamente %s semanas de uso habitual (%s "
       "mediciones) con una sola carga, sin el recambio constante de pilas primarias de los dos equipos de "
       "referencia comparados. Esa cifra proviene del balance energético por nodo de tensión, con las "
       "eficiencias de conversión declaradas, y su confirmación exige medir el consumo de la placa "
       "ensamblada encendida y apagada: si apareciera una fuga no identificada de 1 mA con el equipo apagado, "
       "la autonomía caería a unas %s semanas. Alcanzar autonomías de varios meses sin apagar el equipo exige "
       "reemplazar la placa de desarrollo por el módulo desnudo con un regulador de baja corriente de "
       "reposo, mejora que queda identificada para la versión de producción."
       % (num(SEMANAS_HABITUAL, 0), format(MEDICIONES_HABITUAL, ",d").replace(",", "."),
          num(autonomia(2, modulo=MODULO_VACIO + 1.0) / 7, 1)), "conclusión ingenieril: autonomía")

# En el PDF este párrafo está partido en dos; se reemplaza hasta su cierre real.
exigir(r"Desde la perspectiva económica, la evaluación a diez años.*?(?:\$[\d.]+ aproximadamente|si el precio baja de \$[\d.]+)\.",
       "Desde la perspectiva económica, la evaluación a diez años (2027–2036) entrega un resultado favorable "
       "bajo las condiciones declaradas, con cada partida abierta y trazable hasta su origen. **El precio es "
       "un resultado y no un supuesto**: se construyó primero la estructura completa de costos y el precio se "
       "derivó de ella exigiendo un %s de utilidad sobre el costo total, lo que arroja un precio de lista de "
       "%s con IVA. Con una inversión inicial de %s desembolsada íntegramente por un crédito de igual monto a "
       "diez años y %s efectivo anual, con cuota fija de %s, y un pie propio de %s que los socios aportan en "
       "partes iguales (%s cada uno) y abonan al banco como cuotas pagadas por anticipado, el proyecto alcanza un VAN de %s al %s de descuento, una "
       "TIR de %s, un payback simple de %s años y uno descontado de %s años. La empresa renueva su activo "
       "fijo en %d, cancela la totalidad de su deuda dentro del horizonte evaluado y cierra %d con %s de caja "
       "acumulada y sin pasivo bancario. El punto de tensión está identificado y es de arranque, no de "
       "rentabilidad: los ejercicios %d y %d cierran con pérdida porque la estructura mínima para operar "
       "formalmente no se cubre con %d equipos, y esa pérdida se financia con el capital de trabajo "
       "dimensionado para ello y con las cuotas que el pie dejó pagadas. Las sensibilidades acotan el margen "
       "de error: el proyecto resiste un alza del 15 %% en el costo de materiales y una caída del 10 %% en "
       "las ventas sin quedarse sin caja, pero se queda sin ella si el precio de lista baja de %s, y deja de "
       "crear valor si las ventas caen un 25 %% o si el precio baja de %s."
       % (pct(M.S["margen_objetivo"], 0), p(PRECIO), p(R["inversion"]["total"]),
          pct(M.S["tasa_credito_efectiva_anual"], 0), p(R["cuota"]), p(R["pie"]), p(R["pie"] / 2),
          p(IND["van"]), pct(M.S["tasa_descuento"], 0), pct(IND["tir"], 2), num(IND["payback"], 2),
          num(IND["payback_desc"], 2), next(f["anio"] for f in F if f["reinversion"]), M.ANIOS[-1],
          p(F[-1]["caja"]), M.ANIOS[0], M.ANIOS[1], F[0]["unidades"],
          p(M.precio_de_quiebre(R, "caja")), p(M.precio_de_quiebre(R, "van"))),
       "conclusión económica")

exigir(r"Bajo la intensidad habitual, que es el caso base, el instrumento no se paga el primer año(?: y cruza |; cruza )"
       r".*?cada lectura cuesta \$[\d.]+",
       "Bajo la intensidad habitual, que es el caso base, el instrumento no se paga el primer año; cruza a "
       "favor en el año %d frente al laboratorio y en el año %d frente a la asesoría, aunque frente a esta "
       "última la compra del segundo equipo lo deja atrás de forma transitoria, y acumula a diez años una "
       "ventaja de %s y %s veces respectivamente. El argumento estructural, sin embargo, no es el ahorro "
       "nominal sino el costo marginal cero de la medición repetida: a cien mediciones anuales, cada lectura "
       "cuesta %s" % (lab[0], ase[0], num(2000000 / tco(10)), num(1200000 / tco(10)), p(tco(10) / 1000)),
       "conclusión del cliente: años de cruce")

exigir(r"2\. Que el consumo de reposo del conjunto ensamblado.*?(?=\n)",
       "2. Que el consumo del conjunto ensamblado, encendido y apagado, sea el estimado, porque el consumo "
       "propio de la placa de desarrollo y del módulo de carga proviene de hojas de datos representativas y no "
       "de una medición.", "verificación pendiente 2: consumo del conjunto")
exigir(r"instrumentar una placa piloto para medir su reposo antes y después de la intervención\.",
       "instrumentar una placa piloto, a través de su puente soldable de medición, para medir su consumo "
       "encendida y apagada.", "acción inmediata: medir la placa piloto")

# --------------------------------------------------------------------------
# 5. Numeracion unica de tablas y reconstruccion de los indices
# --------------------------------------------------------------------------
# Todo rotulo de tabla pasa a una serie continua en orden de aparición.
texto = re.sub(r"\*\*Tabla \d+\.\d+ “\s*([^”\n]+?)\s*”\s*\.?\*\*", r"**Tabla @@ “\1”**", texto)
titulos = []


def numerar(m):
    n = len(titulos)
    titulos.append(m.group(1))
    return "**Tabla %d.%d “%s”**" % (1 + n // 10, n % 10, m.group(1))


texto = re.sub(r"\*\*Tabla @@ “(.+?)”\*\*", numerar, texto)
NUMERO = {t: "%d.%d" % (1 + i // 10, i % 10) for i, t in enumerate(titulos)}
CAMBIOS.append(("tablas numeradas en una serie continua", len(titulos)))

figuras = [(n, t.strip()) for n, t in re.findall(r"^\*\*Figura (\d+\.\d+) “\s*(.+?)\s*”\.?\*\*$", texto, re.M)]
texto = re.sub(r"^\*\*Figura (\d+\.\d+) “\s*(.+?)\s*”\.?\*\*$", r"**Figura \1 “\2”**", texto, flags=re.M)

# Referencias en el texto a tablas por su número
sub(r"La Tabla \d\.\d presenta además dos intensidades de uso",
    "La Tabla %s presenta además dos intensidades de uso" % NUMERO["Costo total de propiedad para el agricultor"],
    "referencia a la tabla de costo total de propiedad")
sub(r"en la Tabla \d\.\d “Supuestos de Mercado Declarados”",
    "en la Tabla %s “Supuestos de Mercado Declarados”" % NUMERO["Supuestos de Mercado Declarados"],
    "referencia a la tabla de supuestos de mercado")

CAPITULOS = re.findall(r"^## ((?:I|II|III|IV|V|VI|VII)\. .+)$", texto[texto.index("### Índice de tablas"):],
                       re.M)
SUBSECCIONES_V = ["Análisis de Viabilidad Técnica", "Arquitectura de Conectividad",
                  "Análisis de Viabilidad Económica", "Especificaciones Técnicas del Proyecto",
                  "Gestión Energética", "Carcasa del Dispositivo",
                  "Criterios de Eficiencia Energética y Digitalización", "Modelo de Autonomía en el Campo",
                  "Condiciones Técnicas y Normativas Respecto al Diseño",
                  "Protocolo de Validación de la Medición In Situ contra Laboratorio de Referencia",
                  "Plan de Calibración y Control de Deriva", "Supuestos de Mercado"]
general = []
for c in CAPITULOS:
    general.append("- " + c)
    if c.startswith("V. "):
        for s in SUBSECCIONES_V:
            if "### " + s in texto:
                general.append("  - " + s)
bloque("### Índice general", "### Índice de figuras",
       "### Índice general\n\n" + "\n".join(general), "índice general con las secciones del capítulo V")
bloque("### Índice de figuras", "### Índice de tablas",
       "### Índice de figuras\n\n" + "\n".join("- Figura %s “%s”" % f for f in figuras),
       "índice de figuras sin números de página desactualizados")
bloque("### Índice de tablas", "## I. Introducción",
       "### Índice de tablas\n\n" + "\n".join("- Tabla %s “%s”" % (NUMERO[t], t) for t in titulos),
       "índice de tablas reconstruido")

# --------------------------------------------------------------------------
# 6. Referencias: completar la lista sin duplicar las que el documento ya trae
# --------------------------------------------------------------------------
REFERENCIAS = {
    42: "Servicio de Impuestos Internos (SII), Chile. (2025). Ley N° 21.713 sobre cumplimiento de las "
        "obligaciones tributarias: aplicación de IVA a bienes adquiridos en el extranjero por hasta US$500 y "
        "fin de la exención bajo US$41. Recuperado de https://www.sii.cl/",
    43: "Ministerio del Trabajo y Previsión Social / Superintendencia de Pensiones. (2025). Ley N° 21.735 de "
        "reforma previsional: cotización de cargo del empleador y su calendario gradual. Recuperado de "
        "https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html",
    44: "Senado de la República de Chile. (2026). Reajuste del ingreso mínimo mensual. Recuperado de "
        "https://www.senado.cl/comunicaciones/noticias/ley-reajuste-al-ingreso-minimo-mensual",
    45: "LCSC Electronics. (2026). Catálogo de componentes electrónicos: precios unitarios por tramo de "
        "cantidad, empleados para los discretos de la lista de materiales. Recuperado de https://www.lcsc.com/",
    46: "AliExpress. (2026). Precios de referencia con envío Choice a Chile de los módulos, la sonda de suelo y "
        "la celda de litio de la lista de materiales. Recuperado de https://www.aliexpress.com/",
    47: "JLCPCB. (2026). Fabricación de circuito impreso de dos capas: precio según cantidad y envío a Chile. "
        "Recuperado de https://jlcpcb.com/",
    48: "Advanced Monolithic Systems. (s.f.). AMS1117: 1A Low Dropout Voltage Regulator. Datasheet (corriente "
        "de reposo típica de 5 mA, representativa del regulador de las placas de desarrollo ESP32). Recuperado "
        "de http://www.advanced-monolithic.com/pdf/ds1117.pdf",
    49: "Espressif Systems. (s.f.). ESP32-DevKitC V4 Getting Started Guide: alimentación de la placa, "
        "regulador de 3,3 V y LED de alimentación. Recuperado de "
        "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html",
    51: "Comisión para el Mercado Financiero (CMF) / BancoEstado. (2025). Fondo de Garantía para Pequeños "
        "Empresarios (FOGAPE): garantía de hasta el 80 % del crédito para empresas con ventas anuales de hasta "
        "UF 25.000, comisión de hasta 1 % anual sobre el monto garantizado y plazo de hasta diez años. Recuperado "
        "de https://www.bancoestado.cl/content/bancoestado-public/cl/es/home/inicio---bancoestado-pequena-empresa/"
        "productos/garantias-estatales---bancoestado-pequena-empresa/fogape-para-el-pequeno-empresario---"
        "bancoestado-pequenas-empresa.html",
    52: "Servicio de Cooperación Técnica (Sercotec). (2025). Bases de convocatoria Capital Semilla Emprende, "
        "Región Metropolitana 2025: subsidio de $3.500.000 para personas naturales sin inicio de actividades. "
        "Recuperado de https://www.sercotec.cl/capital-semilla-emprende-region-metropolitana-2025/",
    53: "Corporación de Fomento de la Producción (CORFO). (2025). Semilla Inicia: subsidio no reembolsable de "
        "hasta $15.000.000 que cofinancia hasta el 75 % del proyecto. Recuperado de "
        "https://www.corfo.gob.cl/sites/cpp/convocatoria/semilla_inicia/",
    54: "International Organization for Standardization. (2017). ISO 11272: Soil quality — Determination of dry "
        "bulk density. Ginebra: ISO.",
    55: "International Organization for Standardization. (2014). ISO 11461: Soil quality — Determination of "
        "soil water content as a volume fraction using coring sleeves — Gravimetric method. Ginebra: ISO.",
    56: "Bland, J. M., & Altman, D. G. (1999). Measuring agreement in method comparison studies. Statistical "
        "Methods in Medical Research, 8(2), 135–160.",
    57: "Passing, H., & Bablok, W. (1983). A new biometrical procedure for testing the equality of "
        "measurements from two different analytical methods. Journal of Clinical Chemistry and Clinical "
        "Biochemistry, 21(11), 709–720.",
    # La ficha de familia que el PDF cita como [20] pasa aquí: sólo respalda el consumo a 12 V.
    50: "Sumeet Instruments. (s.f.). 7 in 1 Integrated Soil Sensor NPK-pH-EC-Temperature-Moisture, RS485, "
        "alimentación 5–24 V DC. Ficha técnica de una sonda equivalente (0,15 W a 12 V DC; 0,5 W a 24 V DC). "
        "Recuperado de https://sumeetinstruments.com/Soil-NPK-pH-EC-Temperature-Moisture-7in1-Sensor-RS485",
}
inicio_refs = [m.start() for m in re.finditer(r"Referencias bibliográficas", texto, re.I)][-1]
cabecera, lista = texto[:inicio_refs], texto[inicio_refs:]
lista, partidas = re.subn(r"(?<=[\S]) (\d{1,2})\. (?=[A-ZÁÉÍÓÚÑ(])", lambda m: "\n%s. " % m.group(1), lista)
CAMBIOS.append(("lista de referencias separada en entradas", partidas))
nota = re.search(r"\s*(Nota sobre los supuestos de mercado\..*?)(?=\n\d{1,2}\. |\Z)", lista, re.S)
if nota:
    lista = lista.replace(nota.group(0), "")
presentes = set(int(n) for n in re.findall(r"^(\d{1,2})\. ", lista, re.M))
faltantes = [n for n in sorted(REFERENCIAS) if n not in presentes]
lista = lista.rstrip() + "\n" + "".join("%d. %s\n" % (n, REFERENCIAS[n]) for n in faltantes)
if nota:
    lista += "\n" + re.sub(r"\s+", " ", nota.group(1)).strip() + "\n"
texto = cabecera + lista
CAMBIOS.append(("referencias agregadas a la lista", len(faltantes)))


# --------------------------------------------------------------------------
# 7. Tablas partidas por el salto de página del PDF: se unen en una sola
# --------------------------------------------------------------------------
def celdas(fila):
    return [c.strip() for c in fila.strip().strip("|").split("|")]


def unir(m):
    anterior, siguiente = m.group(1), m.group(2)
    a, s = celdas(anterior), celdas(siguiente)
    # Una fila cuya primera celda viene vacía es la mitad inferior de la fila anterior
    if len(a) == len(s) and not s[0]:
        return "| " + " | ".join((x + " " + y).strip() for x, y in zip(a, s)) + " |\n"
    return anterior + "\n" + siguiente + "\n"


uniones = 0
while True:
    texto, n = re.subn(r"^(\|[^\n]*\|)\n+<!-- ===== PAGINA \d+ ===== -->\n+(\|[^\n]*\|)\n",
                       unir, texto, count=1, flags=re.M)
    if not n:
        break
    uniones += 1
CAMBIOS.append(("tablas partidas por el salto de página, unidas", uniones))

# --------------------------------------------------------------------------
# 8. Sonda: manual del fabricante del modelo adquirido en lugar de la ficha de familia
# --------------------------------------------------------------------------
# El PDF cita como [20] la ficha de una sonda representativa de la familia. La muestra
# adquirida es la ComWinTop CWT-Soil-NPKPHCTH-S, cuyo manual pasa a ser la [20]; la ficha
# de familia queda como [50] y sólo respalda el consumo a 12 V. Va al final, sobre el texto
# con las referencias separadas y las tablas unidas.
SONDA = "ComWinTop CWT-Soil-NPKPHCTH-S"
exigir(r"^20\. Sumeet Instruments\.[^\n]*",
       "20. ComWinTop (CWT Co., Limited). (s.f.). Soil sensor (5PIN Probe, RS485 output type) manual, versión "
       "1.0, válido para el modelo NPKPHCTH-S: alimentación de 4,5 a 30 V DC y 0,5 W como máximo a 24 V; "
       "RS-485 Modbus RTU a 4.800 baudios 8N1, dirección 1; rangos, exactitudes y colores del cable. La "
       "exactitud de temperatura figura como ±5 °C y el rango de conductividad como 0–200.000 µS/cm, erratas "
       "de esa versión: el manual V1.4 de la misma serie (modelo THCPH-S) declara ±0,5 °C y 0–20.000 µS/cm. "
       "Recuperado de https://www.comwintop.com/", "sonda: referencia [20] al manual del fabricante", re.M)
exigir(r"Sonda de Suelo 7-en-1 \(RS-485 Modbus RTU\): El nodo extrae",
       "Sonda de Suelo 7-en-1 (RS-485 Modbus RTU), modelo %s: El nodo extrae" % SONDA, "sonda: modelo")
exigir(r"^\| Parámetro \| Rango de Operación \| Exactitud Declarada \|.*?(?=^\*\*Tabla \d+\.\d+ “\s*Especificaciones Técnicas Sonda)",
       "| Parámetro | Rango de Operación | Exactitud Declarada |\n|---|---|---|\n"
       "| Humedad Volumétrica | 0 – 100 % | ±2 % (0–50 %); ±3 % (50–100 %) |\n"
       "| Temperatura de Suelo | −40 °C a +80 °C | ±0,5 °C (a 25 °C) |\n"
       "| Conductividad Eléctrica | 0 – 20.000 µS/cm | ±3 % (hasta 10.000 µS/cm); ±5 % (10.000–20.000 µS/cm) |\n"
       "| pH | 3,0 – 9,0 | ±0,3 |\n"
       "| Macronutrientes (N, P, K) | 1 – 1.999 mg/kg c/u | ±2 % de la escala completa (según fabricante) |\n\n",
       "sonda: tabla con el manual del fabricante", re.S | re.M)
exigir(r"Estas cifras provienen de la ficha de una sonda representativa de la familia \[20\].*?no está verificada\.",
       "Estas cifras provienen del manual del fabricante del modelo adquirido, la %s [20], y se declaran en "
       "condiciones de laboratorio. La distinción no es formal: el protocolo de validación de este informe fija "
       "su criterio de aceptación sobre umbrales agronómicos propios porque la exactitud del fabricante no está "
       "verificada en suelo real." % SONDA, "sonda: origen de las cifras")
exigir(r"El rango de alimentación de 5 a 24 V DC es representativo de la familia de sondas 7-en-1 RS-485 "
       r"industriales \[20\]; dentro de ese rango,",
       "El manual del fabricante fija la alimentación de la sonda entre 4,5 y 30 V DC [20]; dentro de ese rango,",
       "sonda: rango de alimentación")
exigir(r"a validar contra la ficha técnica definitiva del SKU adquirido, dado que otras sondas de la misma "
       r"familia sólo alcanzan",
       "a validar en banco con la muestra adquirida, dado que otras sondas 7-en-1 sólo alcanzan",
       "sonda: validación a 5 V")
exigir(r"La descripción del vendedor entrega 0,15 ?W a 12 V y 0,5 ?W a 24 V,",
       "El manual del fabricante sólo declara el máximo, 0,5 W a 24 V [20], y la ficha de una sonda "
       "equivalente entrega 0,15 W a 12 V [50],", "sonda: consumo declarado")
exigir(r"La comunicación se establece a 9\.600 baudios vía Modbus RTU\.",
       "La comunicación se establece vía Modbus RTU a 4.800 baudios, 8N1 y dirección 1, la configuración de "
       "fábrica según el manual [20].", "sonda: velocidad del bus")
exigir(r"otras de una ficha representativa de la familia mientras no se cierre el SKU,",
       "otras de declaraciones del vendedor,", "sonda: niveles de evidencia")
exigir(r"Por qué un umbral propio y no el del fabricante\. Una formulación.*?no es una cifra sino una "
       r"decisión de manejo\.",
       "Por qué un umbral propio y no el del fabricante. El manual de la sonda declara ±0,3 unidades de pH, "
       "±3 %% de conductividad y ±2 a 3 %% de humedad. El umbral de pH coincide con esa cifra, pero no se fija "
       "por ella, por dos razones. La primera es de condiciones: la exactitud del fabricante se declara en "
       "laboratorio, a 25 °C y en un medio homogéneo, mientras que la campaña compara mediciones en suelo "
       "real, con su heterogeneidad y su contacto variable con los electrodos, contra un laboratorio "
       "acreditado; exigir la cifra del fabricante en esas condiciones mediría el suelo y no el instrumento. "
       "La segunda es de pertinencia: el producto de este instrumento no es una cifra sino una decisión de "
       "manejo.".replace("%%", "%"), "sonda: umbral propio frente al del fabricante")
exigir(r"Que el precio de la sonda sea el presupuestado, porque aún no existe una orden de compra ni ficha "
       r"técnica del SKU\.",
       "Que el precio de la sonda sea el presupuestado, porque aún no existe una orden de compra en volumen.",
       "sonda: precio sin orden de compra")
exigir(r"pedir al proveedor la ficha del SKU y una unidad de muestra, e instrumentar",
       "ensayar en banco la muestra de la sonda, cuyo modelo y manual ya están identificados, e instrumentar",
       "sonda: primera verificación")

texto = re.sub(r"\n{4,}", "\n\n\n", texto)
with io.open(SALIDA, "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)

os.remove(ESPEJO)
print("Escrito:", os.path.normpath(SALIDA))
print("Correcciones (0 = el PDF ya está corregido en ese punto):")
for etq, n in CAMBIOS:
    print("  %-72s %3d" % (etq, n))
