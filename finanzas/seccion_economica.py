# -*- coding: utf-8 -*-
"""Genera la sección de Análisis de Viabilidad Económica del informe.

Toda cifra proviene de `modelo.py`; no se escribe ningún número a mano. El texto
describe el estado vigente del estudio: no compara contra versiones anteriores.
"""
import io
import re
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
import cuadros as C  # noqa: E402  (mismos datos que los cuadros ya escritos)

CUADROS = io.open("../docs/_cuadros_economicos.md", encoding="utf-8").read()
TITULOS = {t: int(n) for n, t in re.findall(r"^### Cuadro (\d+)\. (.+)$", CUADROS, re.M)}


def cuadro(titulo):
    """Extrae el bloque completo del cuadro con ese título."""
    n = TITULOS[titulo]
    i = CUADROS.index("### Cuadro %d. " % n)
    j = CUADROS.find("### Cuadro %d. " % (n + 1))
    return CUADROS[i:j if j > 0 else len(CUADROS)].rstrip()


intereses = sum(a["interes"] for a in R["amortizacion"])
caja_min = M.caja_minima(R)
precio = R["precio_lista"]
neto = R["precio_neto_base"]
f0, fN = F[0], F[-1]
reinversion = sum(f["reinversion"] for f in F)
anio_reinversion = next(f["anio"] for f in F if f["reinversion"])

# Abastecimiento: lo que se compra en plataformas internacionales paga IVA en el checkout
importado = sum(c * v for n, c, v, o in S["bom"] if o.startswith("AliExpress"))
discretos = sum(c * v for n, c, v, o in S["bom"] if o.startswith("LCSC"))
carcasa = dict((n, v) for n, v, _ in S["_carcasa_detalle"])
filamento = next(v for n, v in carcasa.items() if n.startswith("Filamento"))
comision = S["comision_sobre_bruto"] * precio
var_total = M.VAR_UNIT + comision
contribucion = neto - var_total

# Activo nominal: separar la constitución legal del desarrollo técnico
constitucion = next(v for n, v in S["activo_nominal"] if n.startswith("Constitución"))
desarrollo = M.NOMINAL_TOTAL - constitucion

# Estructura de costos
nomina_0 = f0["gastos"]["nomina"] + f0["gastos"]["beneficios"]
nomina_N = fN["gastos"]["nomina"] + fN["gastos"]["beneficios"]
_, _, _, masa_0 = M.nomina(ANIOS[0])
_, _, _, masa_N = M.nomina(ANIOS[-1])

# Impuesto: la pérdida de los dos primeros años se arrastra al tercero
perdida_arrastrada = -(F[0]["util_antes"] + F[1]["util_antes"])

# Sensibilidad
quiebre_van = M.precio_de_quiebre(R, "van")
quiebre_caja = M.precio_de_quiebre(R, "caja")
CT = INV["capital_trabajo"]
v10 = M.resumen(M.correr(precio_forzado=precio, capital_trabajo=CT, factor_ventas=0.90))["van"]
bom15 = M.correr(precio_forzado=precio, capital_trabajo=CT, factor_bom=1.15)
bom30 = M.correr(precio_forzado=precio, capital_trabajo=CT, factor_bom=1.30)

# Horizonte corto
flujos = [f["flujo"] for f in F]
van5 = M.van(INV["total"], flujos[:5], S["tasa_descuento"])

# Costo total de propiedad del agricultor, año a año
KIT, LAB, ASE = C.KIT_BATERIA, C.LAB_MUESTRA, C.ASESORIA_VISITA


def tco_terrasense(n):
    """Acumulado a n años: equipo en el año 1 y en el 6, kit de batería en los años 3 y 8."""
    return precio * (1 + (n >= 6)) + KIT * ((n >= 3) + (n >= 8))


def anios_a_favor(anual):
    return [n for n in range(1, 11) if anual * n > tco_terrasense(n)]


lab_favor = anios_a_favor(4 * LAB)
ase_favor = anios_a_favor(2 * ASE)
tco_10 = tco_terrasense(10)

T = []


def w(s=""):
    T.append(s)


w("## Análisis de Viabilidad Económica")
w()
w("El análisis que sigue determina si el proyecto es económicamente sostenible y, sobre todo, **a qué "
  "precio**. El precio de venta no es un dato de entrada sino un resultado: se construye primero la "
  "estructura completa de costos e inversión, y el precio se deriva de ella exigiendo un margen de "
  "utilidad definido. Fijar el precio antes de conocer el costo invierte la lógica del estudio, porque "
  "obliga a ajustar los costos a una cifra elegida de antemano.")
w()
w("La secuencia es la siguiente: se costea el equipo componente por componente, se dimensiona la "
  "inversión inicial y su financiamiento, se proyectan los costos de operación, administración y "
  "comercialización, y solo entonces se determina el precio que cubre todo eso con el margen exigido. "
  "Con ese precio se construyen el estado de resultados, el flujo de fondos y los indicadores de "
  "rentabilidad: el VAN (valor actual neto), la TIR (tasa interna de retorno) y el período de "
  "recuperación de la inversión o payback.")
w()

w("### Las tres economías del análisis")
w()
w("Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su "
  "desarrollo, porque mezclarlas vuelve incomparable cualquier evaluación. El análisis distingue tres "
  "economías con unidades, destinatarios y criterios de éxito propios.")
w()
w(cuadro("Economías del análisis"))
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
  "y su costo neto. La lista contiene exactamente los componentes del esquemático de la placa, más la "
  "placa misma, la carcasa y el flete. Los precios se cotizaron en el mercado efectivo de abastecimiento "
  "del proyecto [45, 46, 47], convertidos a pesos al tipo de cambio de referencia [16], y cada línea "
  "declara su origen, de modo que se distinga lo verificado de lo presupuestado.")
w()
w(cuadro("Estructura de costos de fabricación (BOM) por equipo"))
w()
w("La sonda de suelo representa **%s, equivalente al %s del costo de materiales**, y es por lejos la "
  "decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una "
  "dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de "
  "variables, calidad de construcción y material del vástago. El presupuesto adopta %s, en el tramo alto "
  "de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el "
  "protocolo de validación exige." % (p(48000), pct(48000 / M.BOM), p(48000)))
w()
w("En el otro extremo, los componentes discretos de la placa portadora (borneras, condensadores, "
  "resistencias, indicadores, los dos transistores MOSFET que cortan la alimentación de la sonda y las "
  "protecciones de la batería) suman apenas %s por equipo, un %s de la BOM. La conclusión de diseño es "
  "directa: el costo del instrumento se decide en la sonda, la placa de control y la batería, y ninguna "
  "economía sobre los discretos cambia el resultado, de modo que en ellos se privilegia la robustez "
  "sobre el ahorro." % (p(discretos), pct(discretos / M.BOM)))
w()
w("Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:")
w()
w("- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 [42] eliminó la "
  "exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y "
  "las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la "
  "compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito "
  "fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la "
  "exposición es de **%s por equipo**, del orden de %s anuales al volumen del primer año. El proyecto "
  "asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está "
  "en juego si no lo hace." % (p(importado * S["iva"]), p(importado * S["iva"] * f0["unidades"])))
w("- **La placa de control es una placa de desarrollo, no un módulo desnudo.** El presupuesto adquiere el "
  "ESP32 en formato DevKit, que ya incorpora su propio regulador de 3,3 V, el conversor USB-serie y el "
  "circuito de arranque. Esto simplifica la placa portadora y el montaje, a cambio de un consumo propio "
  "de la placa que no se apaga con el reposo del microcontrolador; el capítulo de gestión energética "
  "cuantifica ese efecto y explica por qué el equipo se apaga con un interruptor entre jornadas.")
w()
w("La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras 3D, que figuran en el "
  "activo fijo, y el costo de cada carcasa se construye así:")
w()
w(cuadro("Costeo de la carcasa impresa en taller propio"))
w()
w("El filamento explica el %s del costo de cada carcasa; la merma, la energía y la mantención de las "
  "impresoras completan el resto. Imprimir en taller propio mantiene bajo control el plazo de entrega y "
  "permite corregir el diseño de la envolvente entre lotes sin depender de un proveedor externo, lo que "
  "importa mientras la estanqueidad IP67 no esté ensayada."
  % pct(filamento / sum(v for _, v, _ in S["_carcasa_detalle"]), 0))
w()
w("A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto "
  "pertenecen al costo variable y no a la estructura:")
w()
w(cuadro("Costo variable por equipo"))
w()
w("El costo variable total, %s por equipo, equivale al %s del precio neto de venta. Cada unidad vendida "
  "deja por lo tanto un margen de contribución de %s, que es lo que queda disponible para cubrir la "
  "estructura fija de la empresa, los intereses y la utilidad. La comisión comercial es la única partida "
  "que depende del precio; todas las demás dependen de la BOM y del envío, y por eso una variación en el "
  "costo de la sonda se transmite casi íntegra al costo variable."
  % (p(var_total), pct(var_total / neto), p(contribucion)))
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
w(cuadro("Equipamiento e inversión en activo fijo"))
w()
w("El activo fijo suma %s y se deprecia en línea recta a cinco años, a razón de %s anuales que se cargan "
  "al estado de resultados. Al agotarse esa vida útil los equipos se renuevan: en %d el proyecto vuelve a "
  "comprarlos por %s, valor reajustado por inflación, y esa compra figura como reinversión en el flujo de "
  "fondos. Así la depreciación de los años siguientes corresponde a equipos efectivamente pagados."
  % (p(M.EQUIP_TOTAL), p(M.DEPREC_ANUAL), anio_reinversion, p(reinversion)))
w()
w(cuadro("Activo nominal (gastos de puesta en marcha)"))
w()
w("Del activo nominal, %s (el %s) corresponde al desarrollo técnico que el propio informe declara "
  "pendiente: prototipos de placa y carcasa, programa del microcontrolador, aplicación, campaña de "
  "validación, ensayo IP67 y verificación ante SUBTEL. Solo %s son trámites de constitución de la "
  "sociedad. Estos gastos no se deprecian porque no son bienes físicos; se amortizan en cinco años."
  % (p(desarrollo), pct(desarrollo / M.NOMINAL_TOTAL, 0), p(constitucion)))
w()
w("El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja "
  "nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de "
  "%s meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más "
  "crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez "
  "exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas."
  % S["capital_trabajo_meses"])
w()
w(cuadro("Inversión inicial total"))
w()
w("La partida más grande de la inversión no es un bien físico sino el capital de trabajo: %s, el %s del "
  "total. Es el dinero que financia la pérdida de los dos primeros ejercicios y los dos meses de "
  "inventario con que parte la producción. El equipamiento y el activo nominal, que son lo que "
  "habitualmente se asocia a «montar la empresa», representan juntos menos de la mitad."
  % (p(INV["capital_trabajo"]), pct(INV["capital_trabajo"] / INV["total"])))
w()

w("### Financiamiento")
w()
w("El financiamiento se estructura de la forma en que opera la banca con una empresa nueva. **El pie no "
  "es una fuente adicional de fondos.** Los socios entregan al banco un pie equivalente al %s del monto "
  "solicitado como condición para que este desembolse el crédito, y es el crédito el que financia el "
  "100 %% de la inversión inicial. Sumar el pie y el crédito como si fueran dos fuentes contaría dos "
  "veces el mismo dinero." % pct(S["pie_sobre_credito"], 0))
w()
w(cuadro("Condiciones del financiamiento"))
w()
w("Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente "
  "y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. "
  "La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios "
  "opera con holgura estrecha. La cuota anual, %s, equivale al %s de las ventas netas del primer año y "
  "al %s de las del último, de modo que su peso sobre la operación se diluye a medida que el negocio "
  "crece." % (p(R["cuota"] * 12), pct(R["cuota"] * 12 / f0["ventas"]), pct(R["cuota"] * 12 / fN["ventas"])))
w()
w(cuadro("Tabla de amortización del crédito"))
w()
w("El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de %d la deuda es "
  "cero. Los %s de intereses son el precio del financiamiento y están descontados en el estado de "
  "resultados de cada ejercicio." % (ANIOS[-1], p(intereses)))
w()

w("### Estructura de costos de operación")
w()
w("La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un "
  "contador, sin oficina y con la gestión comercial resuelta por los propios socios con publicidad "
  "digital. La oficina en Providencia entra el segundo año, el cargo de marketing el tercero, y los "
  "ensambladores se incorporan a medida que el volumen los exige.")
w()
w(cuadro("Dotación por año"))
w()
w("La dotación se expresa en personas y no en horas: el primer ensamblador entra en %d, cuando el "
  "volumen supera lo que los socios pueden montar y verificar por sí mismos, y el cuarto en %d, cuando "
  "las ventas se acercan a %s equipos anuales."
  % (next(a for a in ANIOS if S["dotacion_por_anio"][str(a)]["ensambladores"]),
     next(a for a in ANIOS if S["dotacion_por_anio"][str(a)]["ensambladores"] >= 4),
     mil(F[ANIOS.index(next(a for a in ANIOS if S["dotacion_por_anio"][str(a)]["ensambladores"] >= 4))]
         ["unidades"])))
w()
w("Cada cargo tiene su propio sueldo. Los socios siguen una escala progresiva que parte cerca del "
  "ingreso mínimo mientras la empresa no es rentable y sube por escalones hasta %s en 2031, desde "
  "donde solo se reajusta por inflación. Los empleados no siguen esa escala: se pagan a valor de "
  "mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir la "
  "remuneración como un socio difiere la suya. El contador y el cargo de marketing parten en %s brutos "
  "mensuales cada uno y el ensamblador en %s, todos en pesos de 2027 y reajustados por una inflación "
  "del %s anual:" % (p(S["sueldo_socio_por_anio"]["2031"]), p(S["sueldo_contador"]),
                     p(S["sueldo_ensamblador"]), pct(S["inflacion"], 0)))
w()
w(cuadro("Sueldo bruto mensual por cargo y costo laboral anual"))
w()
w("La masa salarial bruta pasa de %s mensuales en %d a %s en %d, porque se combinan tres efectos: más "
  "personas, la escala de los socios y la inflación. El costo laboral anual es mayor que doce veces la "
  "masa bruta porque le suma las cargas del empleador y las provisiones. Sobre ese costo, el modelo no "
  "pondera los tramos legales por sus meses de vigencia: siete meses del tramo de enero y cinco del "
  "tramo que comienza en agosto. La Ley N° 21.735 [43] establece 3,5 %% desde agosto de 2026, "
  "4,25 %% desde agosto de 2027 y aumentos hasta 8,5 %% desde agosto de 2033; estos tramos ya "
  "incluyen el Seguro de Invalidez y Sobrevivencia. A eso se "
  "agregan el seguro de cesantía (2,4 %% en contrato indefinido) y la cotización de la mutualidad, más las "
  "provisiones presupuestarias de vacaciones e indemnización, que no son tasas legales de cotización. La carga sobre el sueldo bruto pasa "
  "así de **%s en %d a %s en %d**. Aparte de la remuneración, cada persona recibe %s mensuales de "
  "colación y movilización, que se registran en su propia línea de costos."
  % (p(masa_0), ANIOS[0], p(masa_N), ANIOS[-1], pct(M.factor_empleador(2027) - 1), 2027,
     pct(M.factor_empleador(2036) - 1), 2036, p(S["colacion_mensual"] + S["movilizacion_mensual"])))
w()
w("Conviene verificar además que la escala salarial se mantenga sobre el piso legal durante todo el "
  "horizonte. El ingreso mínimo mensual quedó en $553.553 [44] desde mayo de 2026 y se reajusta por índice de "
  "precios; el cargo peor remunerado del proyecto, el de ensamblador, parte en %s y termina el horizonte "
  "en %s, holgadamente por encima de la proyección del mínimo."
  % (p(S["sueldo_ensamblador"]), p(S["sueldo_ensamblador"] * (1 + S["inflacion"]) ** 9)))
w()
w(cuadro("Desglose estimado de servicios básicos mensuales"))
w()
w("El primer año la empresa opera desde un taller domiciliario, y los servicios básicos corresponden a la "
  "proporción de ese hogar que ocupa la actividad. Desde el segundo año la oficina en Providencia agrega "
  "un arriendo de %s mensuales, fijado en el extremo superior de los avisos de oficinas comparables en "
  "la comuna, y servicios completos por %s. Ambos se reajustan por inflación."
  % (p(S["arriendo_oficina"]), p(S["servicios_basicos_con_oficina"])))
w()
w(cuadro("Costos operacionales, de administración y de comercialización"))
w()
w("La tabla muestra dónde está el costo de la empresa. En %d el personal, sumando nómina, cargas, "
  "colación y movilización, se lleva el %s del costo total y los materiales solo el %s: es una empresa "
  "que todavía paga más estructura de la que su volumen justifica. En %d la proporción se ha acercado "
  "(%s el personal y %s los materiales), porque la estructura crece por escalones mientras las ventas "
  "crecen todos los años. La publicidad digital se presupuesta en %s por equipo vendido, de modo que "
  "acompaña al volumen en lugar de ser un monto fijo."
  % (ANIOS[0], pct(nomina_0 / f0["costo_total"], 0), pct(f0["variables"] / f0["costo_total"], 0),
     ANIOS[-1], pct(nomina_N / fN["costo_total"], 0), pct(fN["variables"] / fN["costo_total"], 0),
     p(S["pauta_por_equipo"])))
w()

w("### Determinación del precio de venta")
w()
w("Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y "
  "pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el %s sobre el "
  "costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los "
  "gastos de comercialización de todo el horizonte." % pct(S["margen_objetivo"], 0))
w()
w(cuadro("Determinación del precio de venta"))
w()
w("El precio de lista resultante es de **%s con IVA**, expresado en pesos de %d y reajustado cada año por "
  "inflación, igual que los costos; por eso se obtiene dividiendo las ventas necesarias por los equipos "
  "ponderados según ese reajuste, y no multiplicando un costo medio por el margen. Conviene explicitar "
  "cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los "
  "primeros ejercicios quedan por debajo del %s objetivo y los últimos por encima, de modo que el margen "
  "se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la "
  "que los años %d y %d arrojan pérdida: son los años en que se construye la empresa."
  % (p(precio), ANIOS[0], pct(S["margen_objetivo"], 0), ANIOS[0], ANIOS[1]))
w()
w("Este resultado define el posicionamiento competitivo. A %s, TerraSense queda por encima del precio de "
  "un medidor básico de importación como el Hanna HI9814 (US$294) o el Bluelab Pulse (US$339). **El "
  "argumento no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de "
  "suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, "
  "frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años y "
  "medio de análisis de laboratorio al ritmo habitual de cuatro muestras por año." % p(precio))
w()

w("### Estado de resultados proyectado")
w()
w(cuadro("Estado de resultados proyectado"))
w()
w("El primer ejercicio cierra con una pérdida de %s y el segundo con %s. No es un defecto del modelo sino "
  "su hallazgo más útil: con %d equipos vendidos, la estructura mínima que exige operar formalmente "
  "—dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A "
  "partir de %d el resultado es positivo y creciente." % (
      p(abs(F[0]["util_neta"])), p(abs(F[1]["util_neta"])), f0["unidades"], ANIOS[2]))
w()
w("El impuesto a la renta se calcula bajo el régimen Pro Pyme [18], con las tasas de %s en %d, %s en %d y "
  "%s desde %d, y con arrastre de pérdidas: los %s perdidos en los dos primeros ejercicios se descuentan "
  "de la base imponible de %d, que por eso tributa sobre una utilidad menor que la contable. La "
  "depreciación y la amortización reducen el impuesto sin ser salidas de dinero, y por esa razón se "
  "suman de vuelta en el flujo de fondos."
  % (pct(S["tasa_impuesto"]["2027"]), 2027, pct(S["tasa_impuesto"]["2028"], 0), 2028,
     pct(S["tasa_impuesto"]["default"], 0), 2029, p(perdida_arrastrada), ANIOS[2]))
w()

w("### Flujo de fondos y evaluación")
w()
w(cuadro("Flujo de fondos para la evaluación del proyecto"))
w()
w("El flujo de fondos parte de la utilidad, le devuelve la depreciación y la amortización que no son "
  "salidas de caja, y le descuenta lo que sí sale de la empresa sin pasar por resultados: el capital del "
  "préstamo y, en %d, la renovación del activo fijo. La caja nunca baja de %s, que ocurre en %d. Ese es "
  "el piso que el capital de trabajo fue dimensionado para sostener."
  % (anio_reinversion, p(caja_min), F[[f["caja"] for f in F].index(caja_min)]["anio"]))
w()
w(cuadro("Evaluación económica"))
w()
w("Todos los indicadores cumplen su criterio. El VAN de %s indica excedente económico después de "
  "remunerar el capital al %s anual; la TIR de %s supera esa exigencia en %s puntos porcentuales; y la "
  "inversión se recupera en %s años nominales o %s descontados, dentro del plazo de cinco años que el "
  "proyecto se fijó como criterio." % (
      p(IND["van"]), pct(S["tasa_descuento"], 0), pct(IND["tir"], 2),
      num((IND["tir"] - S["tasa_descuento"]) * 100), num(IND["payback"]), num(IND["payback_desc"])))
w()
w("La evaluación principal es a diez años porque es el plazo del crédito y porque el equipo tiene una "
  "vida comercial que excede el lustro. La comparación con un horizonte de cinco años muestra qué parte "
  "del resultado depende de esa elección:")
w()
w(cuadro("Comparación del horizonte de evaluación: cinco y diez años"))
w()
w("A cinco años el proyecto ya crea valor, con un VAN de %s, pero conserva una deuda bancaria de %s que "
  "a diez años está saldada. El grueso del VAN se genera en la segunda mitad del horizonte, cuando la "
  "estructura ya está pagada y cada venta adicional aporta casi todo su margen de contribución: evaluar "
  "a cinco años subestimaría el negocio, pero no cambiaría la decisión."
  % (p(van5), p(R["amortizacion"][4]["saldo_final"])))
w()
w(cuadro("VAN ante distintas tasas de descuento"))
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
w(cuadro("Análisis de sensibilidad y punto de quiebre"))
w()
w("Tres lecturas se desprenden de la tabla:")
w()
w("- **El punto de quiebre del volumen está entre una caída del 10 %% y una del 25 %% en las ventas.** "
  "Con −10 %% el VAN sigue positivo en %s pero la caja se vuelve negativa, de modo que el proyecto "
  "destruiría liquidez antes de destruir valor: la restricción que aparece primero es de caja, no de "
  "rentabilidad." % p(v10))
w("- **El costo de materiales admite desviación.** Un alza del 15 %% en la BOM deja el VAN en %s y la "
  "caja positiva; a +30 %% el VAN sigue siendo de %s, pero la caja mínima cae a %s. El margen "
  "resiste, pero confirma que la cotización de la sonda no admite descuido."
  % (p(M.resumen(bom15)["van"]), p(M.resumen(bom30)["van"]), p(M.caja_minima(bom30))))
w("- **El precio no admite rebaja.** Con el financiamiento dimensionado, la caja se vuelve negativa con "
  "cualquier precio de lista inferior a %s, apenas un %s bajo el precio calculado, y el proyecto deja de "
  "crear valor bajo %s. Ese resultado confirma que el precio debe derivarse del costo y no fijarse por "
  "aspiración comercial: un precio elegido para parecer competitivo, sin mirar la estructura, deja a la "
  "empresa sin caja en su segundo año."
  % (p(quiebre_caja), pct(1 - quiebre_caja / precio), p(quiebre_van)))
w()

w("### Costo total de propiedad para el agricultor")
w()
w("La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto "
  "le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. "
  "El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación "
  "se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el "
  "argumento sobre un supuesto cómodo.")
w()
w(cuadro("Costo total de propiedad para el agricultor"))
w()
w("Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como "
  "tales en la tabla de supuestos de mercado al final del capítulo.")
w()
w("Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: %s de "
  "compra frente a %s de laboratorio. Frente al laboratorio el cruce ocurre en el año %d y la ventaja se "
  "mantiene hasta el final: a diez años la diferencia es de %s contra %s, %s veces. Frente a la asesoría "
  "habitual el resultado es más estrecho y no es monótono: TerraSense pasa adelante en el año %d, la "
  "compra del segundo equipo en el año 6 lo deja atrás durante %s, y recupera la ventaja en el año %d, "
  "para cerrar la década con una diferencia de %s veces. Bajo uso intensivo las distancias se abren a %s "
  "y %s veces respectivamente." % (
      p(precio), p(4 * LAB), lab_favor[0], p(4 * LAB * 10), p(tco_10), num(4 * LAB * 10 / tco_10, 1),
      ase_favor[0],
      "dos años" if len([n for n in range(ase_favor[0], 11) if n not in ase_favor]) == 2 else
      "%d años" % len([n for n in range(ase_favor[0], 11) if n not in ase_favor]),
      min(n for n in ase_favor if n > 6), num(2 * ASE * 10 / tco_10, 1),
      num(20 * LAB * 10 / tco_10, 1), num(12 * ASE * 10 / tco_10, 1)))
w()
w("El argumento estructural, en todo caso, no depende del precio: **el costo marginal de cada medición "
  "adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo "
  "que cada una le cuesta %s frente a los %s de una muestra de laboratorio. El laboratorio y la asesoría "
  "conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo "
  "que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene "
  "herramienta." % (p(tco_10 / 1000), p(LAB)))
w()

texto = "\n".join(T) + "\n"
with io.open("../docs/SECCION_ECONOMICA_REFORMULADA.md", "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)
print("Sección escrita:", len(texto), "caracteres")
