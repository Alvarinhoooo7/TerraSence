## Análisis de Viabilidad Económica

El análisis que sigue determina si el proyecto es económicamente sostenible y, sobre todo, **a qué precio**. El precio de venta no es un dato de entrada sino un resultado: se construye primero la estructura completa de costos e inversión, y el precio se deriva de ella exigiendo un margen de utilidad definido. Fijar el precio antes de conocer el costo invierte la lógica del estudio, porque obliga a ajustar los costos a una cifra elegida de antemano.

La secuencia es la siguiente: se costea el equipo componente por componente, se dimensiona la inversión inicial y su financiamiento, se proyectan los costos de operación, administración y comercialización, y solo entonces se determina el precio que cubre todo eso con el margen exigido. Con ese precio se construyen el estado de resultados, el flujo de fondos y los indicadores de rentabilidad: el VAN (valor actual neto), la TIR (tasa interna de retorno) y el período de recuperación de la inversión o payback.

### Las tres economías del análisis

Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su desarrollo, porque mezclarlas vuelve incomparable cualquier evaluación. El análisis distingue tres economías con unidades, destinatarios y criterios de éxito propios.

### Cuadro 1. Economías del análisis

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

La consecuencia práctica es una sola y se aplica sin excepción: **el ahorro del agricultor no es ingreso del proyecto.** Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen en ninguna línea del flujo de caja de la empresa; se presentan únicamente como argumento de adopción, porque explican por qué alguien compraría el equipo, no cuánto factura quien lo vende.

### Estructura de costos de fabricación

El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): el desglose de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad y su costo neto. La lista corresponde al producto sobre la placa V3, sin placas de desarrollo ni módulos: el módulo ESP32-WROOM-32D (con antena y certificación) y los circuitos integrados y pasivos de la placa, más la sonda, la batería, la carcasa, los materiales de montaje y el flete. Los componentes electrónicos se cotizaron en LCSC y los precios se convirtieron a pesos al tipo de cambio de referencia [16]; el detalle por línea, con modelo, código del proveedor, fecha y enlace, está en el anexo de cotizaciones. Cada línea declara si su precio fue consultado o es una estimación, de modo que se distinga lo verificado de lo presupuestado. El prototipo de laboratorio descrito en el resto del documento, con placa de desarrollo y módulos, no es la base del costo: la evaluación económica se hace sobre el producto de la placa V3.

### Cuadro 2. Estructura de costos de fabricación (BOM) por equipo

| Bloque del equipo | Líneas | Subtotal neto por equipo | Participación |
|---|---:|---:|---:|
| Sonda | 1 | $44.394 | 47,4 % |
| Celda | 1 | $6.900 | 7,4 % |
| Carcasa | 1 | $7.238 | 7,7 % |
| PCB y ensamble | 3 | $6.289 | 6,7 % |
| MCU y radio | 1 | $2.710 | 2,9 % |
| USB-C y carga | 20 | $1.543 | 1,6 % |
| Alimentación 3,3 V | 1 | $83 | 0,1 % |
| Elevador 5 V | 10 | $665 | 0,7 % |
| RS-485 | 4 | $220 | 0,2 % |
| Sensor ambiental | 2 | $4.623 | 4,9 % |
| Interfaz de usuario | 10 | $229 | 0,2 % |
| Protección y medición de batería | 5 | $731 | 0,8 % |
| Pasivos de desacoplo | 4 | $657 | 0,7 % |
| Montaje y embalaje | 10 | $17.468 | 18,6 % |
| **Total BOM neto por equipo** | **73** | **$93.751** | **100,0 %** |

La sonda de suelo representa **$44.394, equivalente al 47,4 % del costo de materiales**, y es por lejos la decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de variables, calidad de construcción y material del vástago. La variante cotizada, de siete variables, cuesta $44.394 puesta en Chile según una publicación con fecha; una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige, y por eso se compra una muestra antes del lote.

En el otro extremo, la electrónica de la placa V3 (módulo ESP32, circuitos integrados, sensor ambiental, pasivos, indicadores y protecciones) suma $11.462 por equipo, un 12,2 % de la BOM, y dentro de ella el sensor BME280 y el módulo ESP32 concentran la mayor parte. La conclusión de diseño es directa: el costo del instrumento se decide en la sonda y en un puñado de circuitos integrados, y ninguna economía sobre los pasivos cambia el resultado, de modo que en ellos se privilegia la robustez sobre el ahorro.

Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:

- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 [42] eliminó la exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la exposición es de **$170 por equipo**, del orden de $33.972 anuales al volumen del primer año. El proyecto asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está en juego si no lo hace.
- **La placa de control es un módulo con antena soldado a la placa V3, no una placa de desarrollo.** El presupuesto adquiere el ESP32 como módulo WROOM-32D, que trae la antena y la certificación de radio, y suma en la propia placa el regulador de 3,3 V de baja corriente en reposo, el puente USB-serie, el cargador y el elevador de la sonda. Los cargos de ensamble de la placa se contratan a un fabricante ($1.214 por placa al lote de 200) y se incluyen en la BOM.

La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras Creality K1C, que figuran en el activo fijo, y el costo de cada carcasa se construye así:

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (cota conservadora: material de la carcasa de laboratorio de 110 × 100 × 40 mm; la carcasa del instrumento mide 99 × 87 × 31 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, 1,05 kWh por carcasa (K1C, 262 W promedio durante 4 h) a $200/kWh | $210 | tarifa BT1 de referencia, $180-$220/kWh |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.238** |  |

El filamento explica el 73 % del costo de cada carcasa; la merma, la energía y la mantención de las impresoras completan el resto. Imprimir en taller propio mantiene bajo control el plazo de entrega y permite corregir el diseño de la envolvente entre lotes sin depender de un proveedor externo, lo que importa mientras la estanqueidad IP67 no esté ensayada.

A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto pertenecen al costo variable y no a la estructura:

### Cuadro 4. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $93.751 |
| Merma de fabricación, 3 % de la BOM | $2.813 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $4.688 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$107.251** |
| Comisión comercial, 5 % sobre el precio bruto | $24.500 |
| **Costo variable total por equipo** | **$131.750** |

El costo variable total, $131.750 por equipo, equivale al 32,0 % del precio neto de venta. Cada unidad vendida deja por lo tanto un margen de contribución de $280.006, que es lo que queda disponible para cubrir la estructura fija de la empresa, los intereses y la utilidad. La comisión comercial es la única partida que depende del precio; todas las demás dependen de la BOM y del envío, y por eso una variación en el costo de la sonda se transmite casi íntegra al costo variable.

### Inversión inicial

La puesta en marcha exige tres tipos de desembolso de naturaleza distinta, que conviene no mezclar: los bienes que se compran una vez y se deprecian, los gastos de constitución y desarrollo que se amortizan, y el dinero que debe quedar disponible para sostener la operación mientras las ventas todavía no cubren los costos.

El equipamiento se dimensionó **según la dotación real del proyecto**, no sobre una plantilla genérica: tres puestos de trabajo el primer año, dos impresoras para producir las carcasas e instrumental de laboratorio (osciloscopio, fuente, multímetros, analizador lógico, estaciones de soldadura y de aire caliente, microscopio y fixture de ensayo) suficiente para el montaje y la verificación de cada unidad.

### Cuadro 5. Equipamiento e inversión en activo fijo

| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |
|---|---:|---:|---:|---:|---:|
| Impresora 3D: Creality K1C | 2 | $450.008 | $900.016 | 5 años | $180.003 |
| Estación de soldadura: Hakko FX-888D | 2 | $145.965 | $291.930 | 5 años | $58.386 |
| Estación de aire caliente: Quick 861DW | 1 | $332.702 | $332.702 | 5 años | $66.540 |
| Placa calefactora: UYUE 946-1010 (100 × 100 mm, 400 W, 50–350 °C) | 1 | $45.114 | $45.114 | 5 años | $9.023 |
| Esténcil de ensamble: Esténcil de acero de 0,12 mm para la PCB del instrumento (con marco) | 2 | $8.865 | $17.730 | 5 años | $3.546 |
| Microscopio estereoscópico: AmScope SE400-Z (10× a 20×, binocular) | 1 | $329.318 | $329.318 | 5 años | $65.864 |
| Osciloscopio: Rigol DS1054Z (4 canales, 50 MHz) | 1 | $519.573 | $519.573 | 5 años | $103.915 |
| Fuente de laboratorio: Korad KA3005P (0 a 30 V, 0 a 5 A) | 1 | $111.656 | $111.656 | 5 años | $22.331 |
| Multímetro: UNI-T UT61E+ (resolución de 0,01 µA en el rango de 220 µA) | 2 | $116.607 | $233.214 | 5 años | $46.643 |
| Analizador lógico: SparkFun TOL-18627 (USB, 8 canales, 24 MHz, compatible con sigrok) | 1 | $30.846 | $30.846 | 5 años | $6.169 |
| Fixture de ensayo FAT: Fixture de pogo pines P75-E2 con placa FR4 y base impresa | 1 | $38.528 | $38.528 | 5 años | $7.706 |
| Notebook: ASUS Vivobook 15 M1502NAQ (Ryzen 7, 16 GB, SSD de 512 GB) | 3 | $554.613 | $1.663.839 | 5 años | $332.768 |
| Monitor: Samsung S4 de 24 pulgadas, IPS, Full HD | 3 | $92.429 | $277.287 | 5 años | $55.457 |
| Muebles de oficina: Escritorio Tripoli de 120 × 60 cm y silla ergonómica Belisa (juego) | 3 | $184.857 | $554.571 | 5 años | $110.914 |
| Impresora de oficina: Brother DCP-L2540DW (multifuncional láser monocromática) | 1 | $210.076 | $210.076 | 5 años | $42.015 |
| Herramientas: Destornillador dinamométrico, extractores de humo, calibres, pistola de calor, puntas para insertos, alicates, destornilladores de precisión, pulseras antiestáticas, esteras e impresora de etiquetas | 1 | $374.588 | $374.588 | 5 años | $74.918 |
| **Total activo fijo** |  |  | **$5.930.988** |  | **$1.186.198** |

El activo fijo suma $5.930.988 y se deprecia en línea recta a cinco años, a razón de $1.186.198 anuales que se cargan al estado de resultados. Al agotarse esa vida útil los equipos se renuevan: en 2032 el proyecto vuelve a comprarlos por $6.875.641, valor reajustado por inflación, y esa compra figura como reinversión en el flujo de fondos. Así la depreciación de los años siguientes corresponde a equipos efectivamente pagados.

### Cuadro 6. Activo nominal (gastos de puesta en marcha)

| Partida | Neto CLP |
|---|---:|
| Constitución de sociedad, trámites legales y marca | $700.000 |
| Prototipado electrónico (tres rondas de PCB portadora) | $1.100.000 |
| Prototipado mecánico (carcasa, juntas, estanqueidad) | $450.000 |
| Firmware del ESP32 | $900.000 |
| Aplicación móvil y consola web | $800.000 |
| Metrología y campaña de validación (30 muestras pareadas) | $1.300.000 |
| Ensayo IP67 en laboratorio acreditado | $475.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $1.300.000 |
| **Total activo nominal** | **$7.025.000** |
| Amortización anual (5 años) | $1.405.000 |

Del activo nominal, $6.325.000 (el 90 %) corresponde al desarrollo técnico que el propio informe declara pendiente: prototipos de placa y carcasa, programa del microcontrolador, aplicación, campaña de validación, ensayo IP67 y verificación ante SUBTEL. Solo $700.000 son trámites de constitución de la sociedad. Estos gastos no se deprecian porque no son bienes físicos; se amortizan en cinco años.

El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de 3 meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $5.930.988 | 20,3 % |
| Activo nominal (puesta en marcha) | $7.025.000 | 24,0 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 43,5 % |
| Inventario inicial (2 meses de ventas) | $3.575.022 | 12,2 % |
| **Inversión inicial total** | **$29.250.795** | **100,0 %** |

La partida más grande de la inversión no es un bien físico sino el capital de trabajo: $12.719.785, el 43,5 % del total. Es el dinero que financia la pérdida de los dos primeros ejercicios y los dos meses de inventario con que parte la producción. El equipamiento y el activo nominal, que son lo que habitualmente se asocia a «montar la empresa», representan juntos menos de la mitad.

### Financiamiento

La inversión inicial se financia con un crédito bancario de largo plazo que el banco desembolsa por el total, $29.250.795. Para otorgar un crédito de ese tamaño a una empresa sin historial de ventas, el banco exige que los socios comprometan capital propio: un pie de $9.000.000, $4.500.000 por socio, que se abona al banco el mismo día del desembolso como **cuotas pagadas por anticipado**. Ese abono cubre las primeras 22,0 cuotas mensuales del calendario, es decir, todo 2027 y la mayor parte de 2028, los dos ejercicios de arranque en que la empresa todavía no cubre su estructura. Desde ahí la cuota sale de la caja de la operación.

El pie, entonces, no se suma a la inversión ni se pierde de vista: es dinero de los socios que paga deuda. Las fuentes del inicio son el crédito y el pie; los usos son la inversión inicial y las cuotas anticipadas. Ambos lados suman lo mismo, de modo que ningún peso se cuenta dos veces, y el pie aparece explícitamente en la tabla de amortización, en el flujo de fondos y en el desembolso inicial con que se calculan el VAN y la TIR.

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.250.795 |
| Monto del préstamo (capital), desembolsado íntegro por el banco | $29.250.795 |
| Pie de los socios, con capital propio | $9.000.000 |
| Aporte por socio (2 socios, partes iguales) | $4.500.000 |
| Destino del pie | Abono al banco el día del desembolso como cuotas pagadas por anticipado |
| Cuotas que cubre el pie | 22,0 cuotas mensuales: todo 2027 y hasta septiembre de 2028 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $409.357 |
| Total intereses del crédito | $19.871.998 |
| Total pagado al banco (con el pie incluido) | $49.122.793 |

### Cuadro 9. Fuentes y usos de los fondos al inicio

| Fuentes | Monto | Usos | Monto |
|---|---:|---|---:|
| Crédito bancario | $29.250.795 | Inversión inicial | $29.250.795 |
| Pie de los socios | $9.000.000 | Cuotas pagadas por anticipado | $9.000.000 |
| **Total fuentes** | **$38.250.795** | **Total usos** | **$38.250.795** |

#### Alternativas de financiamiento evaluadas

Antes de fijar esta estructura se compararon las alternativas a las que puede optar una empresa nueva de base tecnológica en Chile. Dos son instrumentos públicos de fomento: la garantía FOGAPE (Fondo de Garantía para Pequeños Empresarios), que no entrega dinero sino que avala hasta el 80 % de un crédito bancario de una micro o pequeña empresa [51], y los fondos concursables de capital semilla: Capital Semilla Emprende de Sercotec, con un subsidio de $3.500.000 [52], y Semilla Inicia de CORFO, con un subsidio no reembolsable de hasta $15.000.000 que cofinancia hasta el 75 % del proyecto [53].

### Cuadro 10. Matriz de decisión de las alternativas de financiamiento

| Criterio | Peso | Crédito bancario con pie propio | Crédito con garantía FOGAPE | Capital Semilla Emprende (Sercotec) | Semilla Inicia (CORFO) |
|---|---:|---:|---:|---:|---:|
| Certeza de obtener los fondos | 35 % | 4 | 2 | 1 | 1 |
| Suficiencia del monto frente a la inversión | 25 % | 5 | 5 | 1 | 3 |
| Disponibilidad al inicio de la operación | 20 % | 5 | 3 | 2 | 2 |
| Costo financiero | 10 % | 2 | 3 | 5 | 5 |
| Libertad de uso y control de la empresa | 10 % | 5 | 4 | 3 | 2 |
| **Puntaje ponderado** |  | **4,35** | **3,25** | **1,80** | **2,20** |

El criterio con más peso es la **certeza de obtener los fondos**, porque la empresa compromete arriendo, sueldos y compras de componentes desde el primer mes y no puede condicionar esos compromisos a un resultado que no controla. Ahí está la diferencia decisiva. Los fondos concursables se asignan por concurso, con cupos y convocatorias anuales: no basta con que el proyecto sea bueno para adjudicarlos, y su fecha de resolución no coincide necesariamente con la de inicio de la operación. Capital Semilla Emprende cubre además apenas el 12 % de la inversión y exige postular como persona natural sin inicio de actividades, y Semilla Inicia, aun en su monto máximo, deja sin financiar cerca de la mitad. La garantía FOGAPE, por su parte, la asigna el banco desde su propio cupo y la evalúa con la historia comercial del deudor, que una empresa nueva todavía no tiene.

La decisión, por lo tanto, **no responde a que el proyecto no califique** para estos instrumentos, sino a que los socios no quieren que la puesta en marcha dependa de un beneficio que no está asegurado. Prefieren comprometer su propio capital como pie y ejecutar el proyecto con un financiamiento que pueden asegurar de antemano. Los instrumentos públicos quedan como **escenario favorable, fuera del caso base**: si durante 2027 se adjudicara un fondo concursable, se destinaría a prepagar el crédito, y si el banco ofreciera la garantía FOGAPE, podría rebajar el pie o la tasa. A modo de referencia, un Semilla Inicia por su monto máximo aplicado a reducir el crédito ahorraría $10.190.491 de intereses en los diez años. Ninguna de esas cifras entra en la evaluación, porque un modelo que cuenta con ellas falla precisamente en el escenario en que no llegan.

Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios opera con holgura estrecha. La cuota anual, $4.912.279, equivale al 6,0 % de las ventas netas del primer año y al 0,8 % de las del último, de modo que su peso sobre la operación se diluye a medida que el negocio crece.

### Cuadro 11. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Pagada con el pie | Pagada por la empresa | Saldo final |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2027 | $29.250.795 | $1.666.832 | $3.245.447 | $4.912.279 | $4.912.279 | $0 | $27.583.963 |
| 2028 | $27.583.963 | $1.866.852 | $3.045.427 | $4.912.279 | $4.087.721 | $824.559 | $25.717.111 |
| 2029 | $25.717.111 | $2.090.874 | $2.821.405 | $4.912.279 | $0 | $4.912.279 | $23.626.237 |
| 2030 | $23.626.237 | $2.341.779 | $2.570.500 | $4.912.279 | $0 | $4.912.279 | $21.284.458 |
| 2031 | $21.284.458 | $2.622.793 | $2.289.487 | $4.912.279 | $0 | $4.912.279 | $18.661.665 |
| 2032 | $18.661.665 | $2.937.528 | $1.974.752 | $4.912.279 | $0 | $4.912.279 | $15.724.137 |
| 2033 | $15.724.137 | $3.290.031 | $1.622.248 | $4.912.279 | $0 | $4.912.279 | $12.434.106 |
| 2034 | $12.434.106 | $3.684.835 | $1.227.445 | $4.912.279 | $0 | $4.912.279 | $8.749.272 |
| 2035 | $8.749.272 | $4.127.015 | $785.264 | $4.912.279 | $0 | $4.912.279 | $4.622.257 |
| 2036 | $4.622.257 | $4.622.257 | $290.023 | $4.912.279 | $0 | $4.912.279 | $0 |
| **Total** |  | **$29.250.795** | **$19.871.998** | **$49.122.793** | **$9.000.000** | **$40.122.793** |  |

El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de 2036 la deuda es cero. Los $19.871.998 de intereses son el precio del financiamiento y están descontados en el estado de resultados de cada ejercicio, aunque las cuotas de 2027 y de parte de 2028 las haya pagado el pie: el interés es un gasto del año en que se devenga, no del año en que se desembolsa el dinero.

### Estructura de costos de operación

La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un contador, sin oficina y con la gestión comercial resuelta por los propios socios con publicidad digital. La oficina en Providencia entra el segundo año, el cargo de marketing el tercero, y los ensambladores se incorporan a medida que el volumen los exige.

### Cuadro 12. Dotación por año

| Año | Socios | Contador | Marketing | Ensambladores | Total personas | Oficina |
|---|---:|---:|---:|---:|---:|---|
| 2027 | 2 | 1 | 0 | 0 | 3 | no |
| 2028 | 2 | 1 | 0 | 1 | 4 | sí |
| 2029 | 2 | 1 | 1 | 1 | 5 | sí |
| 2030 | 2 | 1 | 1 | 2 | 6 | sí |
| 2031 | 2 | 1 | 1 | 2 | 6 | sí |
| 2032 | 2 | 1 | 1 | 3 | 7 | sí |
| 2033 | 2 | 1 | 1 | 3 | 7 | sí |
| 2034 | 2 | 1 | 1 | 3 | 7 | sí |
| 2035 | 2 | 1 | 1 | 4 | 8 | sí |
| 2036 | 2 | 1 | 1 | 4 | 8 | sí |

La dotación se expresa en personas y no en horas: el primer ensamblador entra en 2028, cuando el volumen supera lo que los socios pueden montar y verificar por sí mismos, y el cuarto en 2035, cuando las ventas se acercan a 1.033 equipos anuales.

Cada cargo tiene su propio sueldo. Los socios siguen una escala progresiva que parte cerca del ingreso mínimo mientras la empresa no es rentable y sube por escalones hasta $1.200.000 en 2031, desde donde solo se reajusta por inflación. Los empleados no siguen esa escala: se pagan a valor de mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir la remuneración como un socio difiere la suya. El contador y el cargo de marketing parten en $1.000.000 brutos mensuales cada uno y el ensamblador en $700.000, todos en pesos de 2027 y reajustados por una inflación del 3 % anual:

### Cuadro 13. Sueldo bruto mensual por cargo y costo laboral anual

| Año | Socio (c/u) | Contador | Marketing | Ensamblador (c/u) | Masa salarial bruta mensual | Cargas del empleador y provisiones | Costo laboral anual |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2027 | $600.000 | $1.000.000 | — | — | $2.200.000 | 23,8 % | $32.689.140 |
| 2028 | $700.000 | $1.030.000 | — | $721.000 | $3.151.000 | 24,6 % | $47.103.354 |
| 2029 | $850.000 | $1.060.900 | $1.060.900 | $742.630 | $4.564.430 | 25,3 % | $68.631.682 |
| 2030 | $1.000.000 | $1.092.727 | $1.092.727 | $764.909 | $5.715.272 | 26,0 % | $86.416.053 |
| 2031 | $1.200.000 | $1.125.509 | $1.125.509 | $787.856 | $6.226.730 | 26,7 % | $94.672.448 |
| 2032 | $1.236.000 | $1.159.274 | $1.159.274 | $811.492 | $7.225.024 | 27,4 % | $110.457.607 |
| 2033 | $1.273.080 | $1.194.052 | $1.194.052 | $835.837 | $7.441.774 | 28,1 % | $114.396.445 |
| 2034 | $1.311.272 | $1.229.874 | $1.229.874 | $860.912 | $7.665.028 | 28,5 % | $118.203.924 |
| 2035 | $1.350.611 | $1.266.770 | $1.266.770 | $886.739 | $8.781.718 | 28,5 % | $135.424.622 |
| 2036 | $1.391.129 | $1.304.773 | $1.304.773 | $913.341 | $9.045.169 | 28,5 % | $139.487.361 |

La masa salarial bruta pasa de $2.200.000 mensuales en 2027 a $9.045.169 en 2036, porque se combinan tres efectos: más personas, la escala de los socios y la inflación. El costo laboral anual es mayor que doce veces la masa bruta porque le suma las cargas del empleador y las provisiones. Sobre ese costo, el modelo no pondera los tramos legales por sus meses de vigencia: siete meses del tramo de enero y cinco del tramo que comienza en agosto. La Ley N° 21.735 [43] establece 3,5 % desde agosto de 2026, 4,25 % desde agosto de 2027 y aumentos hasta 8,5 % desde agosto de 2033; estos tramos ya incluyen el Seguro de Invalidez y Sobrevivencia. A eso se agregan el seguro de cesantía (2,4 % en contrato indefinido) y la cotización de la mutualidad, más las provisiones presupuestarias de vacaciones e indemnización, que no son tasas legales de cotización. La carga sobre el sueldo bruto pasa así de **23,8 % en 2027 a 28,5 % en 2036**. Aparte de la remuneración, cada persona recibe $150.000 mensuales de colación y movilización, que se registran en su propia línea de costos.

Conviene verificar además que la escala salarial se mantenga sobre el piso legal durante todo el horizonte. El ingreso mínimo mensual quedó en $553.553 [44] desde mayo de 2026 y se reajusta por índice de precios; el cargo peor remunerado del proyecto, el de ensamblador, parte en $700.000 y termina el horizonte en $913.341, holgadamente por encima de la proyección del mínimo.

### Cuadro 14. Desglose estimado de servicios básicos mensuales

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $60.000 | $20.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$330.000** | **$110.000** |

El primer año la empresa opera desde un taller domiciliario, y los servicios básicos corresponden a la proporción de ese hogar que ocupa la actividad. Desde el segundo año la oficina en Providencia agrega un arriendo de $1.500.000 mensuales, fijado en el extremo superior de los avisos de oficinas comparables en la comuna, y servicios completos por $330.000. Ambos se reajustan por inflación.

### Cuadro 15. Costos operacionales, de administración y de comercialización

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Materiales y costo variable | $26.350.032 | $47.495.932 | $69.886.872 | $93.578.521 | $126.043.070 | $136.239.213 | $147.405.635 | $159.443.500 | $172.404.766 | $186.515.920 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.320.000 | $4.078.800 | $4.201.164 | $4.327.199 | $4.457.015 | $4.590.725 | $4.728.447 | $4.870.301 | $5.016.410 | $5.166.902 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $77.229.172 | $141.083.186 | $193.080.641 | $243.077.704 | $292.444.194 | $324.124.736 | $343.164.803 | $363.185.152 | $400.075.585 | $423.052.311 |

La tabla muestra dónde está el costo de la empresa. En 2027 el personal, sumando nómina, cargas, colación y movilización, se lleva el 49 % del costo total y los materiales solo el 34 %: es una empresa que todavía paga más estructura de la que su volumen justifica. En 2036 la proporción se ha acercado (37 % el personal y 44 % los materiales), porque la estructura crece por escalones mientras las ventas crecen todos los años. La publicidad digital se presupuesta en $30.000 por equipo vendido, de modo que acompaña al volumen en lugar de ser un monto fijo.

### Determinación del precio de venta

Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el 30 % sobre el costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los gastos de comercialización de todo el horizonte.

### Cuadro 16. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.800.517.483 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.642.088.586 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$411.756** |
| IVA 19 % | $78.234 |
| **Precio de lista con IVA** | **$489.990** |

El precio de lista resultante es de **$489.990 con IVA**, expresado en pesos de 2027 y reajustado cada año por inflación, igual que los costos; por eso se obtiene dividiendo las ventas necesarias por los equipos ponderados según ese reajuste, y no multiplicando un costo medio por el margen. Conviene explicitar cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los primeros ejercicios quedan por debajo del 30 % objetivo y los últimos por encima, de modo que el margen se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la que los años 2027 y 2028 arrojan pérdida: son los años en que se construye la empresa.

Este resultado define el posicionamiento competitivo. A $489.990, TerraSense queda por encima del precio de un medidor básico de importación como el Hanna HI9814 (US$294) o el Bluelab Pulse (US$339). **El argumento no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años y medio de análisis de laboratorio al ritmo habitual de cuatro muestras por año.

### Estado de resultados proyectado

### Cuadro 17. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $82.351.261 | $148.438.147 | $218.416.131 | $292.459.199 | $393.920.044 | $425.785.859 | $460.684.069 | $498.305.782 | $538.813.383 | $582.914.711 |
| (-) Costos operacionales | $26.350.032 | $47.495.932 | $69.886.872 | $93.578.521 | $126.043.070 | $136.239.213 | $147.405.635 | $159.443.500 | $172.404.766 | $186.515.920 |
| (-) Gastos de estructura | $50.879.140 | $93.587.254 | $123.193.769 | $149.499.182 | $166.401.124 | $187.885.523 | $195.759.168 | $203.741.652 | $227.670.820 | $236.536.391 |
| (-) Depreciación | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Amortización del activo nominal | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.245.447 | $3.045.427 | $2.821.405 | $2.570.500 | $2.289.487 | $1.974.752 | $1.622.248 | $1.227.445 | $785.264 | $290.023 |
| **(=) Utilidad antes de impuesto** | $-714.556 | $1.718.336 | $19.922.887 | $44.219.798 | $96.595.166 | $98.311.243 | $114.521.890 | $132.518.058 | $136.577.406 | $158.197.250 |
| (-) Impuesto a la renta | $0 | $150.567 | $4.980.722 | $11.054.949 | $24.148.792 | $24.577.811 | $28.630.472 | $33.129.515 | $34.144.351 | $39.549.312 |
| **(=) Utilidad del ejercicio** | $-714.556 | $1.567.769 | $14.942.165 | $33.164.848 | $72.446.375 | $73.733.432 | $85.891.417 | $99.388.544 | $102.433.054 | $118.647.937 |

El primer ejercicio cierra con una pérdida de $714.556 y el segundo con $1.567.769. No es un defecto del modelo sino su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente —dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A partir de 2029 el resultado es positivo y creciente.

El impuesto a la renta se calcula bajo el régimen Pro Pyme [18], con las tasas de 12,5 % en 2027, 15 % en 2028 y 25 % desde 2029, y con arrastre de pérdidas: los $-1.003.780 perdidos en los dos primeros ejercicios se descuentan de la base imponible de 2029, que por eso tributa sobre una utilidad menor que la contable. La depreciación y la amortización reducen el impuesto sin ser salidas de dinero, y por esa razón se suman de vuelta en el flujo de fondos.

### Flujo de fondos y evaluación

### Cuadro 18. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-714.556 | $1.567.769 | $14.942.165 | $33.164.848 | $72.446.375 | $73.733.432 | $85.891.417 | $99.388.544 | $102.433.054 | $118.647.937 |
| (+) Depreciación y amortización | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Cuota de capital del préstamo | $1.666.832 | $1.866.852 | $2.090.874 | $2.341.779 | $2.622.793 | $2.937.528 | $3.290.031 | $3.684.835 | $4.127.015 | $4.622.257 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $6.875.641 | $0 | $0 | $0 | $0 |
| (+) Cuota ya pagada con el pie | $4.912.279 | $4.087.721 | $0 | $0 | $0 | $0 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $5.122.089 | $6.379.835 | $15.442.489 | $33.414.267 | $72.414.780 | $65.295.392 | $83.976.514 | $97.078.837 | $99.681.167 | $115.400.809 |
| Caja acumulada | $17.841.874 | $24.221.709 | $39.664.198 | $73.078.464 | $145.493.244 | $210.788.636 | $294.765.151 | $391.843.988 | $491.525.155 | $606.925.964 |

El flujo de fondos parte de la utilidad, le devuelve la depreciación y la amortización que no son salidas de caja, y le descuenta lo que sí sale de la empresa sin pasar por resultados: el capital del préstamo y, en 2032, la renovación del activo fijo. Le devuelve además la parte de la cuota que el pie ya pagó por anticipado en 2027 y 2028, porque ese dinero salió al inicio y no vuelve a salir de la caja. La caja nunca baja de $17.841.874, que ocurre en 2027.

### Cuadro 19. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Desembolso inicial evaluado (inversión $29.250.795 + pie $9.000.000) | $38.250.795 | — | — |
| VAN al 20 % | $130.438.474 | VAN > 0 | Cumple |
| TIR efectiva anual | 55,51 % | TIR > 20 % | Cumple |
| Payback simple | 3,34 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,15 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $17.841.874 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

Todos los indicadores cumplen su criterio. El VAN de $130.438.474 indica excedente económico después de remunerar el capital al 20 % anual; la TIR de 55,51 % supera esa exigencia en 35,51 puntos porcentuales; y el desembolso inicial, que suma la inversión y el pie, se recupera en 3,34 años nominales o 4,15 descontados, dentro del plazo de cinco años que el proyecto se fijó como criterio.

La evaluación principal es a diez años porque es el plazo del crédito y porque el equipo tiene una vida comercial que excede el lustro. La comparación con un horizonte de cinco años muestra qué parte del resultado depende de esa elección:

### Cuadro 20. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $24.600.688 | $130.438.474 |
| TIR efectiva anual | 36,41 % | 55,51 % |
| Caja acumulada al cierre | $145.493.244 | $606.925.964 |
| Deuda bancaria pendiente al cierre | $18.661.665 | $0 |

A cinco años el proyecto ya crea valor, con un VAN de $24.600.688, pero conserva una deuda bancaria de $18.661.665 que a diez años está saldada. El grueso del VAN se genera en la segunda mitad del horizonte, cuando la estructura ya está pagada y cada venta adicional aporta casi todo su margen de contribución: evaluar a cinco años subestimaría el negocio, pero no cambiaría la decisión.

### Cuadro 21. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $379.195.962 | Positivo |
| 8 % | $303.978.713 | Positivo |
| 10 % | $263.072.009 | Positivo |
| 15 % | $184.683.664 | Positivo |
| 20 % | $130.438.474 | Positivo |
| 30 % | $64.278.269 | Positivo |
| 40 % | $28.483.571 | Positivo |
| 50 % | $7.740.774 | Positivo |
| TIR: 55,51 % | $0 | VAN aproximadamente cero |

El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

### Análisis de sensibilidad y punto de quiebre

Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y **manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que cambia una proyección.

### Cuadro 22. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $489.990 | $-714.556 | $130.438.474 | 55,5 % | $17.841.874 |
| Ventas -10 % | $489.990 | $-5.675.013 | $76.378.308 | 41,8 % | $10.479.507 |
| Ventas -25 % | $489.990 | $-13.115.699 | $-6.495.386 | 17,9 % | $-23.069.034 |
| Ventas -35 % | $489.990 | $-18.076.156 | $-65.101.394 | -3,2 % | $-67.513.457 |
| Ventas +20 % | $489.990 | $8.055.563 | $239.303.472 | 80,6 % | $26.691.325 |
| BOM +15 % | $489.990 | $-3.808.246 | $96.505.968 | 46,7 % | $14.804.354 |
| BOM +30 % | $489.990 | $-6.901.936 | $62.312.075 | 37,7 % | $7.006.904 |
| Precio rebajado a $469.990 (−4,1 %) | $469.990 | $-3.875.901 | $95.969.262 | 46,8 % | $14.680.529 |
| Precio rebajado a $439.990 (−10,2 %) | $439.990 | $-8.617.917 | $43.670.308 | 32,8 % | $1.684.626 |
| Precio rebajado a $419.990 (−14,3 %) | $419.990 | $-11.779.262 | $8.253.850 | 22,5 % | $-15.559.718 |
| Precio rebajado a $389.990 (−20,4 %) | $389.990 | $-16.521.279 | $-46.522.974 | 4,3 % | $-53.092.424 |

Tres lecturas se desprenden de la tabla:

- **El punto de quiebre del volumen está entre una caída del 10 % y una del 25 % en las ventas.** Con −10 % el VAN sigue positivo en $76.378.308 y la caja mínima se mantiene en $10.479.507; con −25 % el VAN cae a $-6.495.386 y la caja a $-23.069.034, de modo que una caída de esa magnitud destruye a la vez valor y liquidez. Las cuotas que el pie dejó pagadas en los dos primeros años son las que sostienen la caja en el escenario de −10 %.
- **El costo de materiales admite desviación.** Un alza del 15 % en la BOM deja el VAN en $96.505.968 y la caja mínima en $14.804.354; a +30 % el VAN sigue siendo de $62.312.075 y la caja mínima baja a $7.006.904. El margen resiste, pero confirma que la cotización de la sonda no admite descuido.
- **El precio no admite rebaja.** Con el financiamiento dimensionado, la caja se vuelve negativa con cualquier precio de lista inferior a $438.036, apenas un 10,6 % bajo el precio calculado, y el proyecto deja de crear valor bajo $415.338. Ese resultado confirma que el precio debe derivarse del costo y no fijarse por aspiración comercial: un precio elegido para parecer competitivo, sin mirar la estructura, deja a la empresa sin caja en su tercer año.

### Costo total de propiedad para el agricultor

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el argumento sobre un supuesto cómodo.

### Cuadro 23. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $489.990 | $514.980 | $514.980 | $1.029.960 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como tales en la tabla de supuestos de mercado al final del capítulo.

Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: $489.990 de compra frente a $200.000 de laboratorio. Frente al laboratorio el cruce ocurre en el año 3 y la ventaja se mantiene hasta el final: a diez años la diferencia es de $2.000.000 contra $1.029.960, 1,9 veces. Frente a la asesoría habitual el resultado es más estrecho y no es monótono: TerraSense pasa adelante en el año 5, la compra del segundo equipo en el año 6 lo deja atrás durante 3 años, y recupera la ventaja en el año 9, para cerrar la década con una diferencia de 1,2 veces. Bajo uso intensivo las distancias se abren a 9,7 y 7,0 veces respectivamente.

El argumento estructural, en todo caso, no depende del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo que cada una le cuesta $1.030 frente a los $50.000 de una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene herramienta.

