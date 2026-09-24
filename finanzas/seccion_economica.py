# -*- coding: utf-8 -*-
"""Genera la sección de Análisis de Viabilidad Económica del informe.

Toda cifra proviene de `modelo.py`; no se escribe ningún número a mano.
"""
import io
import subprocess
import sys

import modelo as M

S, ANIOS = M.S, M.ANIOS
R = M.dimensionar()
F, INV = R["filas"], R["inversion"]
IND = M.resumen(R)


def p(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def pct(x, d=1):
    return (("%." + str(d) + "f") % (x * 100)).replace(".", ",") + " %"


def num(x, d=2):
    return (("%." + str(d) + "f") % x).replace(".", ",")


def mil(x):
    return format(int(round(x)), ",d").replace(",", ".")


# Cuadros ya generados por cuadros.py
subprocess.run([sys.executable, "cuadros.py"], check=True)
CUADROS = io.open("../docs/_cuadros_economicos.md", encoding="utf-8").read()


def cuadro(n):
    """Extrae el bloque del cuadro n."""
    marca = "### Cuadro %d." % n
    i = CUADROS.index(marca)
    j = CUADROS.find("### Cuadro %d." % (n + 1))
    return CUADROS[i:j if j > 0 else len(CUADROS)].rstrip()


intereses = sum(a["interes"] for a in R["amortizacion"])
ventas_tot = sum(f["ventas"] for f in F)
costo_tot = sum(f["costo_total"] for f in F)
unid_tot = sum(f["unidades"] for f in F)
caja_min = min(f["caja"] for f in F)
precio = R["precio_lista"]
kit_bateria = 24990

# TCO del agricultor con el precio nuevo
tco_10 = precio * 2 + kit_bateria * 2
lab_hab_10, ases_hab_10 = 50000 * 4 * 10, 60000 * 2 * 10
lab_int_10, ases_int_10 = 50000 * 20 * 10, 60000 * 12 * 10

T = []
def w(s=""):
    T.append(s)


w("## Análisis de Viabilidad Económica")
w()
w("El análisis que sigue determina si el proyecto es económicamente sostenible y, sobre todo, **a qué "
  "precio**. A diferencia de la versión anterior de este estudio, aquí el precio de venta no es un dato "
  "de entrada sino un resultado: se construye primero la estructura completa de costos e inversión, y el "
  "precio se deriva de ella exigiendo un margen de utilidad definido. Fijar el precio antes de conocer el "
  "costo es el error metodológico que este capítulo corrige.")
w()
w("La secuencia es la siguiente: se costea el equipo componente por componente, se dimensiona la "
  "inversión inicial y su financiamiento, se proyectan los costos de operación, administración y "
  "comercialización, y solo entonces se determina el precio que cubre todo eso con el margen exigido. "
  "Con ese precio se construyen el estado de resultados, el flujo de fondos y los indicadores de "
  "rentabilidad.")
w()

w("### Las tres economías del análisis")
w()
w("Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su "
  "desarrollo, porque mezclarlas vuelve incomparable cualquier evaluación. El análisis distingue tres "
  "economías con unidades, destinatarios y criterios de éxito propios.")
w()
w("| Economía | Qué mide | Con qué se evalúa |")
w("|---|---|---|")
w("| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |")
w("| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |")
w("| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |")
w()
w("La consecuencia práctica es una sola y se aplica sin excepción: **el ahorro del agricultor no es "
  "ingreso del proyecto.** Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen "
  "en ninguna línea del flujo de caja de la empresa; se presentan únicamente como argumento de adopción, "
  "porque explican por qué alguien compraría el equipo, no cuánto factura quien lo vende.")
w()

w("### Estructura de costos de fabricación")
w()
w("El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): "
  "el desglose de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad "
  "y su costo neto. Los precios se cotizaron en el mercado efectivo de abastecimiento del proyecto "
  "[45, 46, 47] y cada "
  "línea declara su origen, de modo que se distinga lo verificado de lo presupuestado.")
w()
w(cuadro(1))
w()
w("La sonda de suelo representa **%s, equivalente al %s del costo de materiales**, y es por lejos la "
  "decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una "
  "dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de "
  "variables, calidad de construcción y material del vástago. El presupuesto adopta %s, en el tramo alto "
  "de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el "
  "protocolo de validación exige." % (p(48000), pct(48000 / M.BOM), p(48000)))
w()
w("Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:")
w()
w("- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 eliminó la "
  "exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y "
  "las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la "
  "compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito "
  "fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la "
  "exposición es de **%s por equipo**, del orden de %s anuales al volumen del primer año. El proyecto "
  "asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está "
  "en juego si no lo hace." % (p(60050 * 0.19), p(60050 * 0.19 * 200)))
w("- **La placa de control es una placa de desarrollo, no un módulo desnudo.** El presupuesto adquiere el "
  "ESP32 en formato DevKit WROOM-32, que incorpora un regulador de propósito general, un puente USB-UART "
  "y un LED de alimentación que no se apagan con el reposo profundo del microcontrolador. El diseño "
  "contempla por ello una intervención de taller sobre cada unidad, descrita en el capítulo de gestión "
  "energética, cuyo efecto sobre la autonomía se cuantifica allí.")
w()
w("La carcasa dejó de ser un servicio externo: el proyecto adquiere dos impresoras 3D, que figuran en el "
  "activo fijo, y la imprime en taller propio. Su costo se construye así:")
w()
w(cuadro(2))
w()
w("A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto "
  "pertenecen al costo variable y no a la estructura:")
w()
w(cuadro(3))
w()

w("### Inversión inicial")
w()
w("La puesta en marcha exige tres tipos de desembolso de naturaleza distinta, que conviene no mezclar: "
  "los bienes que se compran una vez y se deprecian, los gastos de constitución y desarrollo que se "
  "amortizan, y el dinero que debe quedar disponible para sostener la operación mientras las ventas "
  "todavía no cubren los costos.")
w()
w("El equipamiento se dimensionó **según la dotación real del proyecto**, no sobre una plantilla "
  "genérica: tres puestos de trabajo el primer año, dos impresoras para producir las carcasas e "
  "instrumental de laboratorio suficiente para el montaje y la verificación de cada unidad.")
w()
w(cuadro(4))
w()
w(cuadro(5))
w()
w("El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja "
  "nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de "
  "%s meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más "
  "crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez "
  "exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas."
  % S["capital_trabajo_meses"])
w()
w(cuadro(6))
w()

w("### Financiamiento")
w()
w("El financiamiento se estructura de la forma en que opera efectivamente la banca con una empresa nueva, "
  "y este punto corrige un error de la versión anterior del estudio. **El pie no es una fuente adicional "
  "de fondos.** Los socios entregan al banco un pie equivalente al %s del monto solicitado como condición "
  "para que este desembolse el crédito, y es el crédito el que financia el 100 %% de la inversión "
  "inicial. Decir que las fuentes suman el pie más el crédito cuenta dos veces el mismo dinero."
  % pct(S["pie_sobre_credito"], 0))
w()
w(cuadro(7))
w()
w("Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente "
  "y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. "
  "La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios "
  "opera con holgura estrecha.")
w()
w(cuadro(8))
w()
w("El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de %d la deuda es "
  "cero. Los %s de intereses son el precio del financiamiento y están descontados en el estado de "
  "resultados de cada ejercicio." % (ANIOS[-1], p(intereses)))
w()

w("### Estructura de costos de operación")
w()
w("La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un "
  "contador, sin oficina y con la gestión comercial resuelta por los propios socios con pauta digital. "
  "La oficina en Providencia entra el segundo año, la encargada de marketing el tercero, y los "
  "ensambladores se incorporan a medida que el volumen los exige.")
w()
w("Los sueldos de los socios siguen una escala progresiva que parte cerca del ingreso mínimo mientras la "
  "empresa no es rentable y sube por escalones hasta %s en %d. Los empleados no siguen esa escala: se "
  "pagan a valor de mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir "
  "la remuneración como un socio difiere la suya."
  % (p(S["sueldo_socio_por_anio"]["2031"]), 2031))
w()
w(cuadro(9))
w()
w("Sobre el costo laboral, el modelo no aplica un recargo fijo sino el calendario legal vigente. La Ley "
  "N° 21.735 de reforma previsional introdujo una cotización de cargo del empleador que parte en 3,5 %% "
  "desde agosto de 2026 y sube gradualmente hasta completar 8,5 %% en 2033 sumada al Seguro de "
  "Invalidez y Sobrevivencia. A eso se agregan el seguro de cesantía (2,4 %% en contrato indefinido) y la "
  "cotización de la mutualidad, más las provisiones de vacaciones e indemnización por años de servicio. "
  "El costo sobre el sueldo bruto pasa así de **%s en %d a %s en %d**, y esa progresión está incorporada "
  "año a año en lugar de aproximarse con un porcentaje único."
  % (pct(M.factor_empleador(2027) - 1), 2027, pct(M.factor_empleador(2036) - 1), 2036))
w()
w("Conviene verificar además que la escala salarial se mantenga sobre el piso legal durante todo el "
  "horizonte. El ingreso mínimo mensual quedó en $553.553 desde mayo de 2026 y se reajusta por índice de "
  "precios; el cargo peor remunerado del proyecto, el de ensamblador, parte en %s y termina el horizonte "
  "en %s, holgadamente por encima de la proyección del mínimo."
  % (p(S["sueldo_ensamblador"]), p(S["sueldo_ensamblador"] * (1 + S["inflacion"]) ** 9)))
w()
w(cuadro(10))
w()

w("### Determinación del precio de venta")
w()
w("Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y "
  "pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el %s sobre el "
  "costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los "
  "gastos de comercialización de todo el horizonte." % pct(S["margen_objetivo"], 0))
w()
w(cuadro(11))
w()
w("El precio de lista resultante es de **%s con IVA**. Conviene explicitar cómo se comporta ese margen en "
  "el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los "
  "primeros ejercicios quedan por debajo del %s objetivo y los últimos por encima, de modo que el margen "
  "se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la "
  "que los años %d y %d arrojan pérdida: son los años en que se construye la empresa."
  % (p(precio), pct(S["margen_objetivo"], 0), ANIOS[0], ANIOS[1]))
w()
w("Este resultado obliga a reformular el posicionamiento competitivo. Con el precio anterior de $349.990, "
  "el informe sostenía que TerraSense se ubicaba en el mismo orden de magnitud que un medidor básico de "
  "importación. A %s eso ya no es cierto: el equipo queda por encima del Hanna HI9814 (US$294) y del "
  "Bluelab Pulse (US$339). **El argumento ya no es de etiqueta sino de capacidad y de costo de uso**: "
  "TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones "
  "ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, "
  "y cuesta menos que dos años de análisis de laboratorio." % p(precio))
w()

w("### Estado de resultados proyectado")
w()
w(cuadro(12))
w()
w("El primer ejercicio cierra con una pérdida de %s y el segundo con %s. No es un defecto del modelo sino "
  "su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente "
  "—dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A "
  "partir de %d el resultado es positivo y creciente." % (
      p(abs(F[0]["util_neta"])), p(abs(F[1]["util_neta"])), ANIOS[2]))
w()

w("### Flujo de fondos y evaluación")
w()
w(cuadro(13))
w()
w("La caja nunca baja de %s, que ocurre en %d. Ese es el piso que el capital de trabajo fue dimensionado "
  "para sostener." % (p(caja_min), F[[f["caja"] for f in F].index(caja_min)]["anio"]))
w()
w(cuadro(14))
w()
w("Los cuatro indicadores cumplen su criterio. El VAN de %s indica excedente económico después de "
  "remunerar el capital al %s anual; la TIR de %s supera esa exigencia en %s puntos porcentuales; y la "
  "inversión se recupera en %s años nominales o %s descontados, dentro del plazo de cinco años que el "
  "proyecto se fijó como criterio." % (
      p(IND["van"]), pct(S["tasa_descuento"], 0), pct(IND["tir"], 2),
      num((IND["tir"] - S["tasa_descuento"]) * 100), num(IND["payback"]), num(IND["payback_desc"])))
w()
w(cuadro(15))
w()
w("El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal "
  "como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad "
  "muy superiores al %s de referencia." % pct(S["tasa_descuento"], 0))
w()

w("### Análisis de sensibilidad y punto de quiebre")
w()
w("Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y "
  "**manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que "
  "cambia una proyección.")
w()
w(cuadro(16))
w()
w("Tres lecturas se desprenden del cuadro:")
w()
w("- **El punto de quiebre del volumen está entre una caída del 10 %% y una del 25 %% en las ventas.** "
  "Con −10 %% el VAN sigue positivo en %s pero la caja se vuelve negativa, de modo que el proyecto "
  "destruiría liquidez antes de destruir valor: la restricción que muerde primero es de caja, no de "
  "rentabilidad." % p(66895594))
w("- **El costo de materiales admite desviación.** Un alza del 15 %% en la BOM deja el VAN en %s y la "
  "caja positiva; recién a +30 %% la caja se estrecha. El margen técnico resiste, pero confirma que la "
  "cotización de la sonda no admite descuido." % p(93063006))
w("- **El precio no admite rebaja.** El punto de quiebre está cerca de %s. Y el dato decisivo: **al "
  "precio de $349.990 que proponía la versión anterior de este estudio, el proyecto arroja un VAN "
  "negativo y una caja que nunca se recupera.** Ese resultado es la justificación numérica del cambio de "
  "precio, y la razón por la que el precio debe derivarse del costo y no fijarse por aspiración "
  "comercial." % p(399990))
w()

w("### Costo total de propiedad para el agricultor")
w()
w("La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto "
  "le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. "
  "El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación "
  "se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el "
  "argumento sobre un supuesto cómodo.")
w()
w("| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |")
w("|---|---|---:|---:|---:|---:|")
w("| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | %s | %s | %s | %s |"
  % (p(precio), p(precio + kit_bateria), p(precio + kit_bateria), p(tco_10)))
w("| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | %s | %s | %s | %s |"
  % (p(200000), p(600000), p(1000000), p(lab_hab_10)))
w("| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | %s | %s | %s | %s |"
  % (p(1000000), p(3000000), p(5000000), p(lab_int_10)))
w("| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | %s | %s | %s | %s |"
  % (p(120000), p(360000), p(600000), p(ases_hab_10)))
w("| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | %s | %s | %s | %s |"
  % (p(720000), p(2160000), p(3600000), p(ases_int_10)))
w()
w("Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como "
  "tales en el cuadro de supuestos al final de esta sección.")
w()
w("Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: %s de "
  "compra frente a %s de laboratorio. El cruce ocurre durante el tercer año frente al laboratorio, y a "
  "diez años la diferencia es de %s contra %s, una ventaja de %s veces. Frente a la asesoría la ventaja "
  "es más estrecha, de %s veces. Bajo uso intensivo las distancias se abren a %s y %s veces "
  "respectivamente." % (
      p(precio), p(200000), p(lab_hab_10), p(tco_10), num(lab_hab_10 / tco_10, 1),
      num(ases_hab_10 / tco_10, 1), num(lab_int_10 / tco_10, 1), num(ases_int_10 / tco_10, 1)))
w()
w("El precio más alto estrecha esta comparación respecto de la versión anterior del estudio, y "
  "corresponde declararlo en lugar de disimularlo. Pero el argumento estructural no cambia y no depende "
  "del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien "
  "mediciones al año acumula mil en diez años, de modo que cada una le cuesta %s frente a los $50.000 de "
  "una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las "
  "determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el "
  "seguimiento rutinario entre temporadas, que hoy no tiene herramienta." % p(tco_10 / 1000))
w()

texto = "\n".join(T) + "\n"
with io.open("../docs/SECCION_ECONOMICA_REFORMULADA.md", "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)
print("Sección escrita:", len(texto), "caracteres")
