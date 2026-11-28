"""Genera «TerraSense - Guion de exposicion.pdf» con el orden vigente de la presentación.

Ejecutar: python "Evaluacion/Evaluacion 3/Presentacion/guion.py"
Las cifras se leen de datos.js (preparar.py) y se derivan igual que en contenido.js, para que el
guion y las pantallas digan lo mismo. Requiere playwright y Chrome, como verificar.py.
"""
from pathlib import Path
import html
import json
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "TerraSense - Guion de exposicion.pdf"
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
raw = (HERE / "datos.js").read_text(encoding="utf-8")
D = json.loads(raw[raw.index("=") + 1:].rstrip().rstrip(";"))
F, S = D["financial"], D["session"]


def n(x, d=0):
    """Número con formato chileno: punto de miles y coma decimal."""
    s = f"{x:,.{d}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".")


def money(x):
    return "$" + n(round(x))


def mill(x, d=1):
    return n(x / 1e6, d) + " millones"


# Cifras derivadas exactamente como en contenido.js.
pairing = (D["timings"]["busqueda_s"] + D["timings"]["conexion_s"]) * S["awakeMw"] / 3600
reading, waiting = D["energyMean"], S["grace"]
per_measurement = pairing + reading + waiting
useful2, useful5 = 1600 * 3.7, 4000 * 3.7
sd = lambda u: .02 * u / 4.33  # autodescarga del 2 % mensual, por semana
scale = lambda w2: useful5 / (useful2 / w2 - sd(useful2) + sd(useful5))
habitual, intensive = [scale(w) for w in (22.4, 27.8)], [scale(w) for w in (7, 9.5)]
meas_low, meas_high = round(habitual[0] * 20 / 10) * 10, round(intensive[1] * 70 / 10) * 10
inv = F["investment"]
term10 = next(t for t in F["terms"] if t["years"] == 10)
term5 = next(t for t in F["terms"] if t["years"] == 5)
interest10, interest5 = term10["monthly"] * 120 - F["credit"], term5["monthly"] * 60 - F["credit"]
parts = {p["name"]: p["value"] for p in F["price"]["parts"]}
fabric = parts["Materiales del equipo"] + parts["Merma, garantía y envío"]
sell = parts["Publicidad"] + parts["Comisión a canales"]
rows = F["rows"]
acc, saldo = -F["desembolso"], []
for r in rows:
    acc += r["flujo"]
    saldo.append(acc)
five_years = sum(r["unidades"] for r in rows[:5])

A, B, AMBOS = "Álvaro", "Alan", "Ambos"

# Cada pantalla: título, intervenciones [(expositor, texto)], indicaciones de apoyo y preguntas probables.
SLIDES = [
    ("TerraSense", [(A,
        "Buenos días. Somos Álvaro Villena y Alan Escobar, y hoy presentamos TerraSense, nuestro proyecto de título. "
        "Queremos comenzar con una pregunta muy simple: ¿cómo sabe hoy un agricultor si conviene regar, sembrar o fertilizar? "
        "En la mayoría de los casos, lo decide por experiencia. Esa experiencia es valiosa, pero le falta algo: información "
        "actual de su propio suelo y una interpretación que le diga qué significa para su cultivo. TerraSense nace para "
        "entregar esa información en el mismo campo y transformarla en una orientación concreta.")],
     "Mirar al público al plantear la pregunta y hacer una pausa breve antes de avanzar.", []),

    ("Problemática", [(A,
        "Comenzaremos por la problemática. La presentamos desde el agricultor y desde las opciones que hoy tiene para "
        "conocer su suelo: el laboratorio y los instrumentos de medición.")],
     "Portada de sección: decir la frase y avanzar.", []),

    ("Problemática · El agricultor", [(A,
        "El problema central es este: el agricultor decide en su campo sin conocer el estado del suelo o sin entender lo "
        "que miden. Riega y siembra por costumbre o calendario. Cuando tiene una medición, un número no le dice qué hacer "
        "con su cultivo, y trata igual a cada cultivo y a cada etapa. El suelo afecta al cultivo antes de que el daño se "
        "note, no tiene un historial para comparar temporadas ni resultados, y perder agua, insumos o cosecha golpea "
        "directamente el ingreso familiar.")],
     "Leer el problema central con calma; luego recorrer las tarjetas por fila, sin leer cada texto completo. "
     "No descalificar la experiencia del agricultor: el mensaje es que le falta información actual.", []),

    ("Problemática · Laboratorio e instrumentos de medición", [(A,
        "Hoy el agricultor tiene dos caminos. El laboratorio es la referencia de exactitud, y TerraSense no pretende "
        "reemplazarlo, pero cada análisis tiene un costo, así que se mide una o dos veces por temporada; tomar la muestra, "
        "enviarla y esperar el resultado toma días, y con pocas muestras no se pueden recorrer ni comparar los sectores del "
        "campo. Los instrumentos son la vía rápida: los medidores de mano entregan dos o tres datos, y ni el informe de "
        "laboratorio ni el medidor dicen qué hacer según el cultivo y su etapa. Además, los portátiles funcionan con pilas "
        "desechables, y los nodos fijos miden un solo punto y cobran una mensualidad. Alan presentará nuestros objetivos.")],
     "Recalcar que el laboratorio sigue siendo la referencia y que TerraSense lo complementa con la repetición. Las marcas "
     "no aparecen en la pantalla; mencionarlas solo si se pregunta. No afirmar que los medidores portátiles cobren "
     "suscripción ni que necesiten internet: no es así.",
     [("¿TerraSense reemplaza al laboratorio?",
       "No. El laboratorio fija el punto de referencia con exactitud trazable; TerraSense aporta la repetición que ese "
       "análisis no puede costear: medir antes y después de fertilizar, varios sectores el mismo día y cuantas veces se "
       "quiera, y termina en un plan de acción que el informe de laboratorio no incluye."),
      ("¿Con qué equipos se comparan?",
       "Con medidores portátiles como Hanna GroLine HI9814 y Bluelab Pulse, y con nodos fijos de telemetría. Los portátiles "
       "también son de mano y no cobran cuota; nuestra diferencia es la interpretación según la especie y la etapa, el "
       "plan de acción y las diez variables en una inserción.")]),

    ("Nuestros objetivos", [(B, "Gracias, Álvaro. A partir de esa problemática definimos nuestros objetivos.")],
     "Portada de sección.", []),

    ("Objetivos del proyecto", [(B,
        "Nuestro objetivo general es diseñar y validar una sonda portátil multivariable para el sensado agronómico, capaz "
        "de entregar en el momento un plan de acción, sin cobros extra. Para lograrlo, definimos cuatro objetivos "
        "específicos, que son las cualidades que el equipo debe cumplir. Que sea portátil: un equipo de mano, con batería "
        "propia, que permita medir en cualquier sector del campo. Que tenga autonomía energética: gran capacidad de batería "
        "y bajo consumo, gracias a que el equipo reposa entre mediciones. Que razone correctamente: que interprete las diez "
        "variables según la especie y su etapa, con criterios respaldados por fuentes establecidas. Y que funcione sin "
        "conexión: medir, interpretar y guardar los resultados en el campo, sin necesidad de internet. Al final de la "
        "presentación volveremos a cada uno de estos objetivos con lo que obtuvimos.")],
     "Destacar el objetivo general y recorrer los cuatro específicos de izquierda a derecha.", []),

    ("Propuesta de valor", [(B,
        "Nuestra propuesta de valor se resume en una frase: no le entregamos un número, le entregamos qué hacer. Medimos "
        "diez variables en una sola inserción y las convertimos en un plan de acción según la especie y la etapa del "
        "cultivo, en el mismo campo. Se ordena en tres clases de valor. El valor funcional: el plan le indica si regar, "
        "esperar o corregir el manejo, con criterios para 111 especies, y considera el pronóstico; por ejemplo, si se esperan "
        f"5 milímetros de lluvia o más, sugiere postergar el riego. El valor económico: un pago único de {money(F['price']['list'])}, "
        "con la aplicación, las actualizaciones y las especies incluidas, sin el cobro por muestra del laboratorio ni la "
        "mensualidad del monitoreo remoto; un análisis de laboratorio cuesta entre 50 y 70 mil pesos por muestra, mientras que "
        "repetir una medición con la sonda no tiene costo. Y el valor emocional: decidir con seguridad, porque equivocarse en "
        "un riego o una fertilización cuesta mucho más que medir, con un criterio respaldado por fuentes chilenas como INE, "
        "ODEPA, CIREN, SAG e INFOR.")],
     "El pago único es diferencia frente al laboratorio y al monitoreo remoto, no frente a otros medidores portátiles. "
     "La orientación es cualitativa: no prescribe dosis.",
     [("¿El plan de acción indica dosis de fertilizante?",
       "No. Indica qué revisar y qué hacer, en lenguaje simple. Nitrógeno, fósforo y potasio son valores de referencia "
       "que derivan de la conductividad, por lo que no se usan para recomendar dosis.")]),

    ("Hardware", [(A, "Ahora presentaremos el hardware: qué mide el equipo y cómo se integra con el resto del sistema.")],
     "Portada de sección.", []),

    ("¿Qué mide TerraSense?", [(A,
        "TerraSense mide diez variables en una sola inserción. Siete corresponden al suelo y las entrega una sonda 7 en 1: "
        "humedad, temperatura, conductividad eléctrica, pH, nitrógeno, fósforo y potasio. Las otras tres corresponden al "
        "ambiente y las entrega un sensor BME280: temperatura del aire, humedad del aire y presión atmosférica. Medir el "
        "suelo y el ambiente en el mismo punto y en el mismo momento permite interpretar mejor las condiciones de la lectura.")],
     "Señalar primero el bloque del suelo y luego el del ambiente.",
     [("¿Qué tan exactos son el nitrógeno, el fósforo y el potasio?",
       "Son valores de referencia: la sonda los deriva de la conductividad eléctrica. Por eso no los usamos para indicar "
       "dosis, y el laboratorio sigue siendo la referencia para esas determinaciones.")]),

    ("Arquitectura del sistema", [(A,
        "El sistema se compone de dos partes. A la izquierda está el equipo, con cuatro bloques. La energía: una batería "
        "recargable de 5.000 miliamperios-hora con carga por USB y protección contra sobrecorriente e inversión de "
        "polaridad. Los sensores: la sonda de suelo, conectada por RS-485, un estándar de comunicación por cable resistente "
        "al ruido eléctrico, y el sensor ambiental. El ESP32, que lee los sensores, envía los datos y reposa entre "
        "mediciones. Y la interfaz: un pulsador para emparejar el equipo con el teléfono, un LED, un zumbador y un "
        "interruptor. El equipo se comunica con el teléfono por Bluetooth de bajo consumo, sin internet. A la derecha se "
        "forma un anillo. El teléfono, con la aplicación y el motor agronómico, interpreta, recomienda y guarda cada medición. "
        "Cuando hay conexión, respalda el historial en la base de datos. Desde la web de administración, el soporte técnico "
        "revisa los equipos y envía actualizaciones, que vuelven al equipo a través de la aplicación.")],
     "Recorrer de izquierda a derecha y luego seguir el anillo en el sentido de las flechas.",
     [("¿Por qué ESP32 y no otro microcontrolador?",
       "Comparamos cuatro opciones. El nRF52840 y el STM32WB55 gastan menos en la radio, pero en el balance total esa "
       "ventaja casi no cambia la autonomía. El ESP32 obtuvo 8,2 de 10 frente a 7,5 y 6,9: integra Bluetooth, tiene dos "
       "núcleos para leer la sonda sin interrumpir la conexión, está muy documentado y se consigue a bajo costo en Chile. "
       "El ATmega328P con módulo HC-05 se descartó porque su Bluetooth clásico no funciona con iPhone.")]),

    ("El equipo", [(B, "A continuación, presentamos un video del ensamblaje del equipo.")],
     "Portada de sección: decir la frase y avanzar al video.", []),

    ("Ensamblaje del equipo", [(B,
        "Esta animación, construida desde el modelo 3D de la placa y de la carcasa, muestra cómo se arma el equipo. La "
        "batería queda fijada en la base de la carcasa y sobre ella va la placa, fija mediante tornillos. Luego se inserta "
        "un acrílico protector en los orificios de los LED de estado, para que se vean desde afuera sin que ingrese humedad "
        "ni agua. El cable de la sonda entra por una prensaestopa, que lo sella herméticamente. Y el puerto de carga, que "
        "suele ser el eslabón más débil de un ensamblaje, cuenta con su propia tapa, que lo protege mientras no se carga.")],
     "Reproducir el video desde el inicio (24 segundos) y narrar cada característica cuando se ilumine a la derecha. Es "
     "una animación del diseño, no una grabación del montaje físico.", []),

    ("Cumplimiento normativo", [(B,
        "Para su venta, el equipo debe cumplir la normativa. En la radio Bluetooth, la Subsecretaría de Telecomunicaciones "
        "fija para los equipos de internet de las cosas en la banda de 2,4 gigahercios un límite de 1 vatio, es decir, "
        "1.000 milivatios. El ESP32 transmite como máximo a +9 dBm, cerca de 8 milivatios. El equipo opera muy por debajo "
        "del límite permitido, y antes de su venta se acredita mediante la medición del equipo terminado. Para el trabajo "
        "en terreno consideramos tres normas internacionales: IP67, protección contra el polvo y contra una inmersión "
        "temporal; IEC 62133-2, seguridad de la batería de litio; e IEC 60068-2-31, resistencia a golpes y caídas.")],
     "Son referencias de diseño del producto final, no certificaciones obtenidas. El límite proviene de la Resolución "
     "Exenta 1.985/2017, literal k).",
     [("¿Ya está certificado?",
       "Todavía no. Son los requisitos del producto final; la verificación formal ante SUBTEL y los ensayos se realizan "
       "con el equipo terminado, antes de la venta.")]),

    ("Consumo energético", [(A, "Ahora revisaremos el consumo energético, uno de los ejes del diseño.")],
     "Portada de sección.", []),

    ("Consumo por fase de medición", [(A,
        "Medimos el consumo real del equipo con un medidor USB que registra cien muestras por segundo. Una medición se "
        "divide en fases. La primera es el emparejamiento: el agricultor presiona el pulsador y el equipo abre el enlace con "
        f"su aplicación; se encuentran y se conectan en {n(D['timings']['busqueda_s'] + D['timings']['conexion_s'], 1)} "
        f"segundos, con un consumo de {n(pairing, 2)} milivatios-hora. La segunda es la lectura y el envío a la aplicación: "
        "la sonda lee las diez variables y el equipo las envía por Bluetooth al teléfono, que las interpreta al instante; "
        f"consume {n(reading, 2)} milivatios-hora. La tercera es la espera: el equipo queda dos minutos atento por si el "
        f"agricultor quiere repetir la lectura sin volver a emparejar, y consume {n(waiting, 2)} milivatios-hora. Si no hay "
        "otra lectura viene la cuarta fase, el reposo profundo: el equipo se duerme solo y casi no consume, cerca de "
        "0,15 milivatios-hora por hora, hasta que vuelvan a presionar el pulsador. En total, una medición consume cerca de "
        f"{n(per_measurement, 1)} milivatios-hora.")],
     "Explicar que mWh es energía consumida. Señalar que la espera es la fase que más consume.",
     [("¿Por qué el equipo espera dos minutos despierto?",
       "Para que el agricultor pueda repetir la lectura en el mismo punto sin volver a emparejar el equipo. Es una decisión "
       "de uso que se puede ajustar en el firmware si se prioriza aún más la autonomía."),
      ("¿El valor de reposo es medido?",
       "El reposo de 40 microamperios corresponde a la placa del instrumento y proviene de su hoja de datos. Lo medido es "
       "la caída de consumo en la placa de banco, que usa módulos de desarrollo y por eso consume más dormida.")]),

    ("Duración de la batería", [(A,
        f"Con estos consumos estimamos la duración de la batería de 5.000 miliamperios-hora: cerca de mil mediciones por "
        f"carga, entre {n(meas_low)} y {n(meas_high)} según el uso. En uso habitual, con dos jornadas semanales de diez "
        f"mediciones, una carga dura entre {n(habitual[0] / 4.33)} y {n(habitual[1] / 4.33)} meses. En uso intensivo, con "
        f"diez mediciones diarias todos los días, dura entre {n(intensive[0] / 4.33)} y {n(intensive[1] / 4.33)} meses. "
        "Frente a la competencia, Bluelab Pulse declara cerca de cuatro meses por pila con un uso similar al intensivo, y "
        "tanto Bluelab como Hanna funcionan con pilas desechables. TerraSense se recarga por USB, sin compra de pilas y sin "
        "residuos. Con esto, Alan presentará la evaluación económica.")],
     "Enunciar siempre la duración junto con el patrón de uso.",
     [("¿De dónde sale la estimación?",
       "Del modelo de autonomía del informe, construido con los consumos medidos y una autodescarga del 2 % mensual, "
       "escalado a la batería de 5.000 mAh. Se confirma con una descarga completa del equipo.")]),

    ("Economía", [(B, "Gracias, Álvaro. Pasamos a la evaluación económica del proyecto.")],
     "Portada de sección.", []),

    ("Tamaño del mercado", [(B,
        "Para dimensionar el mercado usamos tres niveles. El TAM, o mercado total, corresponde a las 175.556 explotaciones "
        "agrícolas registradas en el Censo Agropecuario y Forestal 2021. El SAM, o mercado accesible, son cerca de 120 mil "
        "explotaciones de pequeños y medianos agricultores dispuestos a invertir en tecnología. Y el SOM, o mercado "
        f"objetivo, son {n(rows[0]['unidades'])} dispositivos presupuestados para el primer año de venta, apenas el "
        f"{n(rows[0]['unidades'] / 120000 * 100, 2)} % del mercado accesible. En cinco años, el plan alcanza "
        f"{n(five_years)} equipos. El límite del proyecto no es el tamaño del mercado, sino la capacidad de llegar a él y de "
        "ganar su confianza.")],
     "Avanzar dos veces para revelar el SAM y luego el SOM.",
     [("¿De dónde sale el SAM?",
       "Es una estimación del equipo a partir del censo, que deberá afinarse por región, superficie y rubro. Solo el TAM "
       "tiene fuente oficial.")]),

    ("Financiamiento", [(B,
        f"La inversión inicial es de {money(inv['total'])}. Incluye equipos y herramientas por {money(inv['equipamiento'])}, "
        f"desarrollo y certificaciones por {money(inv['activo_nominal'])}, el primer stock de componentes por "
        f"{money(inv['inventario'])} y capital para operar {int(inv['meses_cubiertos'])} meses por {money(inv['capital_trabajo'])}. "
        "Esta inversión la financia en su totalidad un crédito bancario. Los socios aportan un pie de "
        f"{money(F['downpayment'])}, que se abona al banco el primer día y cubre las primeras {int(F['prepaid'])} cuotas: casi "
        "dos años sin cuota mientras el negocio se establece. El crédito es a diez años, con una cuota mensual de "
        f"{money(term10['monthly'])} y una tasa anual del {n(F['rate'] * 100)} %. Se optó por ese plazo para reducir la cuota "
        "mensual y resguardar la liquidez de la empresa durante sus primeros años de operación, cuando las ventas aún están "
        "en crecimiento. El mayor costo en intereses se compensa con un flujo de caja más holgado en la etapa de introducción.")],
     "Leer los montos con calma. El pie no reduce el crédito: paga cuotas por adelantado.",
     [("¿Cuánto cambia con un crédito a cinco años?",
       f"La cuota subiría a {money(term5['monthly'])} mensuales: {money(term5['monthly'] - term10['monthly'])} más cada mes. "
       f"Los intereses totales serían {money(interest5)}, frente a {money(interest10)} a diez años."),
      ("¿Por qué no usar fondos públicos?",
       "Capital Semilla, Semilla Inicia y FOGAPE se evaluaron, pero no forman parte del caso base porque su obtención no es "
       "segura. Si se obtienen, mejoran el proyecto; el plan no depende de ellos.")]),

    ("Composición del precio", [(B,
        "El precio no se fijó de antemano: se obtiene del costo total de cada equipo. La fabricación del equipo, con "
        f"materiales, mermas, garantía y despacho, cuesta {money(fabric)}. El personal suma {money(parts['Personas'])}; la "
        f"administración, {money(parts['Administración'])}; y la comercialización, con publicidad y comisión a los canales, "
        f"{money(sell)}. El costo total por equipo es de {money(F['price']['cost'])}. A ese costo se le agrega un 30 % de "
        f"utilidad, {money(F['price']['profit'])}, con lo que el precio neto es de {money(F['price']['net'])}. Al sumar el IVA "
        f"del 19 %, {money(F['price']['vat'])}, el precio de venta es de {money(F['price']['list'])}. La utilidad se destina "
        "primero al pago del crédito y luego a la reinversión en nuevos dispositivos y áreas del negocio.")],
     "Avanzar dos veces: primero la utilidad y el precio neto, luego el IVA y el precio de venta.",
     [("¿Es competitivo ese precio?",
       "Sí. Es menor que el de los medidores comparables en Chile, Hanna a $491.827 y Bluelab a $538.990, y entrega diez "
       "variables y un plan de acción."),
      ("¿Por qué no un precio más bajo?",
       "Con el precio de $349.990 de versiones anteriores, fijado antes de conocer el costo, el VAN del proyecto resultaba negativo. "
       "El precio actual cubre la totalidad de los costos.")]),

    ("Resultados y recuperación de la inversión", [(B,
        "Este gráfico resume los resultados del proyecto entre 2027 y 2036, y cada elemento está rotulado. Las barras son la "
        f"utilidad de cada año. Los primeros años no son rentables: 2027 cierra con una pérdida de {money(-rows[0]['util_neta'])} "
        f"y 2028 con una utilidad mínima, de {money(rows[1]['util_neta'])}; desde 2029 la utilidad crece de forma "
        "sostenida. La línea verde es la recuperación de la inversión de "
        f"{mill(F['inversion'])} de pesos, que financia el crédito. Parte en menos {mill(F['inversion'])} y suma cada año lo que "
        "deja el negocio después de pagar las cuotas del crédito; las primeras cuotas se pagan con el pie de los socios. "
        f"Durante los primeros años sigue en contra y, a los {n(F['payback'], 1)} años, a mediados de 2030, pasa a positivo: "
        "la inversión está recuperada. La línea gris es la deuda pendiente con el banco: parte en "
        f"{mill(F['credit'])} y baja con cada cuota hasta quedar en cero en 2036, al cumplirse el plazo de diez años. Para todo "
        f"el horizonte, el VAN, valor actual neto, es de {mill(F['van'])} de pesos: el valor que genera el proyecto, expresado en "
        f"dinero de hoy, después de recuperar lo invertido y de exigir un {n(F['discountRate'] * 100)} % anual. La TIR, tasa "
        f"interna de retorno, es de {n(F['tir'] * 100, 1)} %, muy por sobre ese 20 % exigido.")],
     "Mostrar primero las barras y la línea gris; avanzar una vez para revelar la línea verde y la marca de 3,4 años. "
     "Leer la leyenda de abajo si el público no identifica las líneas.",
     [("Si los primeros años no son rentables, ¿el VAN y la TIR lo consideran?",
       "Sí. Se calculan con los resultados de los diez años, incluidos los primeros, que son negativos o cercanos a cero; "
       "aun así, el VAN es de 129,1 millones."),
      ("¿Recuperar la inversión significa terminar de pagar el crédito?",
       "No. A los 3,4 años el negocio ya generó lo invertido, pero el crédito se sigue pagando con cuotas mensuales hasta "
       "2036, como muestra la línea gris. Esas cuotas ya están descontadas en la línea verde."),
      ("¿La caja de la empresa queda negativa algún año?",
       "No. El crédito financia también capital para operar los primeros meses y el pie cubre las primeras cuotas, por lo "
       "que la caja se mantiene positiva aun en 2027."),
      ("¿Cuál es la recuperación considerando el valor del dinero en el tiempo?",
       f"Con el descuento del 20 % anual, la inversión se recupera a los {n(F['payback_desc'], 1)} años.")]),

    ("Demostración de medición", [(AMBOS,
        "A continuación realizaremos una demostración de medición en vivo, con la pantalla del teléfono proyectada.")],
     "Secuencia: 1) proyectar la pantalla del teléfono; 2) despertar el equipo con dos pulsaciones del botón PAIR; "
     "3) en la aplicación, tocar «Medir» y esperar la conexión; 4) insertar la sonda en la muestra de suelo; 5) elegir la "
     "etapa y la especie; 6) mostrar las variables y el plan de acción; 7) mostrar que la medición quedó en el historial. "
     "Plan alternativo: si el teléfono no conecta, mantener presionado PAIR tres segundos para volver a vincular. "
     "Al terminar, agradecer y abrir las preguntas.",
     [("¿Por qué no usar inteligencia artificial o un chatbot en el motor agronómico?",
       "Porque las reglas con fuente dan la misma respuesta ante la misma lectura, se puede revisar de dónde sale cada "
       "criterio, funcionan sin internet y no tienen costo por consulta. Un modelo de lenguaje necesitaría conexión y un "
       "servidor pagado, y puede entregar con total seguridad una respuesta o una dosis equivocada."),
      ("¿La lectura de la sonda es confiable?",
       "En banco obtuvimos 1.000 de 1.000 lecturas sin error de comunicación. Lo que sigue es contrastar la exactitud en "
       "tierra y frente a soluciones patrón.")]),
]

total = len(SLIDES)
# Duración estimada a partir de las palabras habladas (140 por minuto) más el video de 24 s.
spoken = sum(len(txt.split()) for _, talk, _, _ in SLIDES for _, txt in talk)
minutes = spoken / 140 + 24 / 60
duration = f"{int(minutes)} a {int(minutes) + 2} minutos"
def _rangos(nums):
    """[1, 2, 3, 5] -> «01–03 y 05»."""
    tramos, ini = [], None
    for k, x in enumerate(nums):
        ini = x if ini is None else ini
        if k + 1 == len(nums) or nums[k + 1] != x + 1:
            tramos.append(f"{ini:02d}" if ini == x else f"{ini:02d}–{x:02d}")
            ini = None
    return ", ".join(tramos[:-1]) + " y " + tramos[-1] if len(tramos) > 1 else tramos[0]


# Reparto calculado desde quién habla en cada pantalla, para que no se desfase al quitar o mover láminas.
_quien = [{w for w, _ in talk} for _, talk, _, _ in SLIDES]
_solo = {p: [i + 1 for i, q in enumerate(_quien) if q == {p}] for p in (A, B)}
_ambos = [i + 1 for i, q in enumerate(_quien) if q - {A, B} or len(q) > 1]
reparto = f"{A}: pantallas {_rangos(_solo[A])}. {B}: pantallas {_rangos(_solo[B])}."
if _ambos:
    reparto += f" Ambos: pantalla{'s' if len(_ambos) > 1 else ''} {_rangos(_ambos)}."


def page(i, title, talk, support, questions):
    speak = "".join(f'<p class="talk"><b>{html.escape(who)}.</b> {html.escape(txt)}</p>' for who, txt in talk)
    qa = ""
    if questions:
        qa = '<div class="qa"><h4>Si preguntan</h4>' + "".join(
            f'<p><b>{html.escape(q)}</b><br>{html.escape(a)}</p>' for q, a in questions) + "</div>"
    return (f'<section class="slide"><p class="num">PANTALLA {i:02d} / {total}</p><h2>{html.escape(title)}</h2>'
            f'{speak}<div class="support"><b>Apoyo:</b> {html.escape(support)}</div>{qa}</section>')


body = "".join(page(i + 1, *s) for i, s in enumerate(SLIDES))
doc = f"""<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><title>TerraSense — Guion de exposición</title>
<style>
@page{{size:Letter;margin:22mm 20mm 20mm}}
body{{font-family:Calibri,"Segoe UI",Carlito,Arial,sans-serif;color:#262626;font-size:12pt;line-height:1.5;margin:0}}
.cover{{height:225mm;display:flex;flex-direction:column;page-break-after:always}}
.cover .course{{font-size:9pt;letter-spacing:2px;text-transform:uppercase;color:#6b6b6b;font-weight:700}}
.cover h1{{font-size:46pt;margin:60mm 0 0;line-height:1}}.cover .sub{{font-size:20pt;margin:4mm 0 0}}
.cover .bar{{width:40mm;height:3mm;background:#c8102e;margin:8mm 0}}
.cover dl{{margin-top:auto;display:grid;grid-template-columns:auto 1fr;gap:2mm 8mm;font-size:12pt}}
.cover dt{{font-size:8.5pt;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b6b;font-weight:700;padding-top:1mm}}.cover dd{{margin:0}}
.howto{{page-break-after:always}}.howto h2{{font-size:18pt;margin:0 0 4mm}}.howto h3{{font-size:13pt;margin:7mm 0 2mm}}
.howto ul{{margin:0;padding-left:5mm}}.howto li{{margin:1.5mm 0}}
.order{{columns:2;column-gap:10mm;font-size:11pt;margin-top:2mm}}.order p{{margin:0 0 1mm;break-inside:avoid}}
.slide{{break-inside:avoid;padding:5mm 0 6mm;border-top:1.2pt solid #262626}}
.slide+.slide{{margin-top:2mm}}
.num{{font-size:8.5pt;letter-spacing:2px;color:#6b6b6b;font-weight:700;margin:0}}
.slide h2{{font-size:16pt;margin:1mm 0 3mm;line-height:1.2}}
.talk{{margin:0 0 2.5mm;text-align:justify}}
.support{{background:#f2f2f2;border-left:3pt solid #262626;padding:2.5mm 4mm;font-size:10.5pt;margin-top:3mm}}
.qa{{border:0.8pt solid #cfcfcf;border-radius:2mm;padding:2.5mm 4mm;margin-top:3mm;font-size:10.5pt}}
.qa h4{{margin:0 0 1.5mm;font-size:9pt;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b6b}}.qa p{{margin:0 0 2mm}}
</style></head><body>
<section class="cover"><p class="course">Proyecto de título · Presentación oral</p><h1>TerraSense</h1>
<p class="sub">Guion de exposición</p><div class="bar"></div>
<p>{total} pantallas · duración orientativa: {duration} ({n(spoken)} palabras), incluido el video y sin contar la demostración ni las preguntas.</p>
<dl><dt>Integrantes</dt><dd>Álvaro Villena · Alan Escobar</dd><dt>Docente</dt><dd>Osvaldo Javier Duarte Faúndez</dd><dt>Sede</dt><dd>INACAP Santiago Sur · 2026</dd></dl></section>
<section class="howto"><h2>Cómo usar este guion</h2>
<ul><li>El texto de cada expositor está redactado para decirse en voz alta, en registro formal. No es necesario memorizarlo palabra por palabra: lo importante es conservar las cifras y el orden de las ideas.</li>
<li>Los recuadros grises son indicaciones de apoyo y no se leen al público.</li>
<li>Los recuadros «Si preguntan» preparan las preguntas más probables de la comisión.</li>
<li>Las pantallas con pasos se avanzan con la flecha derecha; la tecla N muestra las notas y fuentes de cada pantalla.</li></ul>
<h3>Reparto propuesto</h3><p>{html.escape(reparto)}</p>
<h3>Orden de las pantallas</h3><div class="order">{''.join(f'<p>{i + 1:02d} · {html.escape(s[0])}</p>' for i, s in enumerate(SLIDES))}</div></section>
{body}</body></html>"""

tmp = HERE / "_guion.html"
tmp.write_text(doc, encoding="utf-8")
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(CHROME), headless=True)
        pg = browser.new_page()
        pg.goto(tmp.as_uri())
        pg.pdf(path=str(OUT), format="Letter", print_background=True, display_header_footer=True,
               header_template="<span></span>",
               footer_template='<div style="font-family:Calibri,Arial;font-size:8px;color:#888;width:100%;padding:0 20mm;display:flex;justify-content:space-between">'
                               '<span>TerraSense · Guion de exposición</span><span class="pageNumber"></span></div>',
               margin={"top": "22mm", "bottom": "20mm", "left": "20mm", "right": "20mm"})
        browser.close()
finally:
    tmp.unlink(missing_ok=True)
print(f"Guion generado: {OUT.name} · {total} pantallas")
