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
| Sonda | 1 | $48.000 | 59,9 % |
| Celda | 1 | $4.400 | 5,5 % |
| Carcasa | 1 | $7.238 | 9,0 % |
| PCB V3 y ensamble | 3 | $4.896 | 6,1 % |
| MCU y radio | 1 | $2.710 | 3,4 % |
| USB-C y carga | 15 | $1.014 | 1,3 % |
| Alimentación 3,3 V | 1 | $83 | 0,1 % |
| Elevador 5 V | 10 | $614 | 0,8 % |
| RS-485 | 5 | $249 | 0,3 % |
| Sensor ambiental | 2 | $4.613 | 5,8 % |
| Interfaz de usuario | 10 | $382 | 0,5 % |
| Protección y medición de batería | 5 | $626 | 0,8 % |
| Pasivos de desacoplo | 4 | $213 | 0,3 % |
| Montaje y embalaje | 9 | $5.040 | 6,3 % |
| **Total BOM neto por equipo** | **68** | **$80.076** | **100,0 %** |

La sonda de suelo representa **$48.000, equivalente al 59,9 % del costo de materiales**, y es por lejos la decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de variables, calidad de construcción y material del vástago. El presupuesto adopta $48.000, en el tramo alto de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige.

En el otro extremo, la electrónica de la placa V3 (módulo ESP32, circuitos integrados, sensor ambiental, pasivos, indicadores y protecciones) suma $10.502 por equipo, un 13,1 % de la BOM, y dentro de ella el sensor BME280 y el módulo ESP32 concentran la mayor parte. La conclusión de diseño es directa: el costo del instrumento se decide en la sonda y en un puñado de circuitos integrados, y ninguna economía sobre los pasivos cambia el resultado, de modo que en ellos se privilegia la robustez sobre el ahorro.

Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:

- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 [42] eliminó la exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la exposición es de **$10.346 por equipo**, del orden de $2.069.100 anuales al volumen del primer año. El proyecto asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está en juego si no lo hace.
- **La placa de control es un módulo con antena soldado a la placa V3, no una placa de desarrollo.** El presupuesto adquiere el ESP32 como módulo WROOM-32D, que trae la antena y la certificación de radio, y suma en la propia placa el regulador de 3,3 V de baja corriente en reposo, el puente USB-serie, el cargador y el elevador de la sonda. Los cargos de ensamble de la placa se contratan a un fabricante ($1.231 por placa al lote de 200) y se incluyen en la BOM.

La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras Creality K1C, que figuran en el activo fijo, y el costo de cada carcasa se construye así:

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (carcasa de 110 × 100 × 40 mm para la placa de 99,9 × 90 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, 1,05 kWh por carcasa (K1C, 262 W promedio durante 4 h) a $200/kWh | $210 | tarifa BT1 de referencia, $180-$220/kWh |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.238** |  |

El filamento explica el 73 % del costo de cada carcasa; la merma, la energía y la mantención de las impresoras completan el resto. Imprimir en taller propio mantiene bajo control el plazo de entrega y permite corregir el diseño de la envolvente entre lotes sin depender de un proveedor externo, lo que importa mientras la estanqueidad IP67 no esté ensayada.

A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto pertenecen al costo variable y no a la estructura:

### Cuadro 4. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $80.076 |
| Merma de fabricación, 3 % de la BOM | $2.402 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $4.004 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$92.482** |
| Comisión comercial, 5 % sobre el precio bruto | $23.251 |
| **Costo variable total por equipo** | **$115.733** |

El costo variable total, $115.733 por equipo, equivale al 29,6 % del precio neto de venta. Cada unidad vendida deja por lo tanto un margen de contribución de $275.041, que es lo que queda disponible para cubrir la estructura fija de la empresa, los intereses y la utilidad. La comisión comercial es la única partida que depende del precio; todas las demás dependen de la BOM y del envío, y por eso una variación en el costo de la sonda se transmite casi íntegra al costo variable.

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
| Esténcil de ensamble: Esténcil de acero de 0,12 mm para la PCB V3 (con marco) | 2 | $8.865 | $17.730 | 5 años | $3.546 |
| Microscopio estereoscópico: AmScope SE400-Z (10× a 20×, binocular) | 1 | $225.568 | $225.568 | 5 años | $45.114 |
| Osciloscopio: Rigol DS1054Z (4 canales, 50 MHz) | 1 | $519.573 | $519.573 | 5 años | $103.915 |
| Fuente de laboratorio: Korad KA3005P (0 a 30 V, 0 a 5 A) | 1 | $111.656 | $111.656 | 5 años | $22.331 |
| Multímetro: UNI-T UT61E+ (resolución de 0,01 µA en el rango de 220 µA) | 2 | $116.607 | $233.214 | 5 años | $46.643 |
| Analizador lógico: SparkFun TOL-18627 (USB, 8 canales, 24 MHz, compatible con sigrok) | 1 | $30.846 | $30.846 | 5 años | $6.169 |
| Fixture de ensayo FAT: Fixture de pogo pines P75-E2 con placa FR4 y base impresa | 1 | $60.000 | $60.000 | 5 años | $12.000 |
| Notebook: ASUS Vivobook 15 M1502NAQ (Ryzen 7, 16 GB, SSD de 512 GB) | 3 | $554.613 | $1.663.839 | 5 años | $332.768 |
| Monitor: Samsung S4 de 24 pulgadas, IPS, Full HD | 3 | $92.429 | $277.287 | 5 años | $55.457 |
| Muebles de oficina: Escritorio Tripoli de 120 × 60 cm y silla ergonómica Belisa (juego) | 3 | $184.857 | $554.571 | 5 años | $110.914 |
| Impresora de oficina: Brother DCP-L2540DW (multifuncional láser monocromática) | 1 | $210.076 | $210.076 | 5 años | $42.015 |
| Herramientas: Kit de herramientas manuales, alfombra ESD y extractor de humo | 1 | $1.000.000 | $1.000.000 | 5 años | $200.000 |
| **Total activo fijo** |  |  | **$6.474.122** |  | **$1.294.824** |

El activo fijo suma $6.474.122 y se deprecia en línea recta a cinco años, a razón de $1.294.824 anuales que se cargan al estado de resultados. Al agotarse esa vida útil los equipos se renuevan: en 2032 el proyecto vuelve a comprarlos por $7.505.282, valor reajustado por inflación, y esa compra figura como reinversión en el flujo de fondos. Así la depreciación de los años siguientes corresponde a equipos efectivamente pagados.

### Cuadro 6. Activo nominal (gastos de puesta en marcha)

| Partida | Neto CLP |
|---|---:|
| Constitución de sociedad, trámites legales y marca | $700.000 |
| Prototipado electrónico (tres rondas de PCB portadora) | $1.100.000 |
| Prototipado mecánico (carcasa, juntas, estanqueidad) | $450.000 |
| Firmware del ESP32 | $900.000 |
| Aplicación móvil y consola web | $800.000 |
| Metrología y campaña de validación (30 muestras pareadas) | $1.300.000 |
| Ensayo IP67 en laboratorio acreditado | $350.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $300.000 |
| **Total activo nominal** | **$5.900.000** |
| Amortización anual (5 años) | $1.180.000 |

Del activo nominal, $5.200.000 (el 88 %) corresponde al desarrollo técnico que el propio informe declara pendiente: prototipos de placa y carcasa, programa del microcontrolador, aplicación, campaña de validación, ensayo IP67 y verificación ante SUBTEL. Solo $700.000 son trámites de constitución de la sociedad. Estos gastos no se deprecian porque no son bienes físicos; se amortizan en cinco años.

El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de 3 meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $6.474.122 | 23,0 % |
| Activo nominal (puesta en marcha) | $5.900.000 | 20,9 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 45,1 % |
| Inventario inicial (2 meses de ventas) | $3.082.735 | 10,9 % |
| **Inversión inicial total** | **$28.176.642** | **100,0 %** |

La partida más grande de la inversión no es un bien físico sino el capital de trabajo: $12.719.785, el 45,1 % del total. Es el dinero que financia la pérdida de los dos primeros ejercicios y los dos meses de inventario con que parte la producción. El equipamiento y el activo nominal, que son lo que habitualmente se asocia a «montar la empresa», representan juntos menos de la mitad.

### Financiamiento

El financiamiento se estructura de la forma en que opera la banca con una empresa nueva. **El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie equivalente al 30 % del monto solicitado como condición para que este desembolse el crédito, y es el crédito el que financia el 100 % de la inversión inicial. Sumar el pie y el crédito como si fueran dos fuentes contaría dos veces el mismo dinero.

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $28.176.642 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $28.176.642 |
| Pie propio exigido por el banco (30 % del crédito) | $8.452.993 |
| Aporte por socio (2 socios, partes iguales) | $4.226.496 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $394.324 |
| Total intereses del crédito | $19.142.255 |
| Total pagado al banco | $47.318.897 |

Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios opera con holgura estrecha. La cuota anual, $4.731.890, equivale al 6,1 % de las ventas netas del primer año y al 0,9 % de las del último, de modo que su peso sobre la operación se diluye a medida que el negocio crece.

### Cuadro 9. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $28.176.642 | $1.605.622 | $3.126.267 | $4.731.890 | $26.571.020 |
| 2028 | $26.571.020 | $1.798.297 | $2.933.593 | $4.731.890 | $24.772.722 |
| 2029 | $24.772.722 | $2.014.093 | $2.717.797 | $4.731.890 | $22.758.630 |
| 2030 | $22.758.630 | $2.255.784 | $2.476.106 | $4.731.890 | $20.502.846 |
| 2031 | $20.502.846 | $2.526.478 | $2.205.412 | $4.731.890 | $17.976.368 |
| 2032 | $17.976.368 | $2.829.655 | $1.902.234 | $4.731.890 | $15.146.713 |
| 2033 | $15.146.713 | $3.169.214 | $1.562.676 | $4.731.890 | $11.977.499 |
| 2034 | $11.977.499 | $3.549.520 | $1.182.370 | $4.731.890 | $8.427.979 |
| 2035 | $8.427.979 | $3.975.462 | $756.428 | $4.731.890 | $4.452.517 |
| 2036 | $4.452.517 | $4.452.517 | $279.372 | $4.731.890 | $0 |
| **Total** |  | **$28.176.642** | **$19.142.255** | **$47.318.897** |  |

El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de 2036 la deuda es cero. Los $19.142.255 de intereses son el precio del financiamiento y están descontados en el estado de resultados de cada ejercicio.

### Estructura de costos de operación

La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un contador, sin oficina y con la gestión comercial resuelta por los propios socios con publicidad digital. La oficina en Providencia entra el segundo año, el cargo de marketing el tercero, y los ensambladores se incorporan a medida que el volumen los exige.

### Cuadro 10. Dotación por año

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

### Cuadro 11. Sueldo bruto mensual por cargo y costo laboral anual

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

### Cuadro 12. Desglose estimado de servicios básicos mensuales

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $60.000 | $20.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$330.000** | **$110.000** |

El primer año la empresa opera desde un taller domiciliario, y los servicios básicos corresponden a la proporción de ese hogar que ocupa la actividad. Desde el segundo año la oficina en Providencia agrega un arriendo de $1.500.000 mensuales, fijado en el extremo superior de los avisos de oficinas comparables en la comuna, y servicios completos por $330.000. Ambos se reajustan por inflación.

### Cuadro 13. Costos operacionales, de administración y de comercialización

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Materiales y costo variable | $23.146.621 | $41.721.784 | $61.390.625 | $82.202.047 | $110.719.834 | $119.676.417 | $129.485.322 | $140.059.726 | $151.445.273 | $163.840.914 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.320.000 | $4.078.800 | $4.201.164 | $4.327.199 | $4.457.015 | $4.590.725 | $4.728.447 | $4.870.301 | $5.016.410 | $5.166.902 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $74.025.761 | $135.309.038 | $184.584.395 | $231.701.229 | $277.120.958 | $307.561.940 | $325.244.490 | $343.801.378 | $379.116.092 | $400.377.305 |

La tabla muestra dónde está el costo de la empresa. En 2027 el personal, sumando nómina, cargas, colación y movilización, se lleva el 51 % del costo total y los materiales solo el 31 %: es una empresa que todavía paga más estructura de la que su volumen justifica. En 2036 la proporción se ha acercado (40 % el personal y 41 % los materiales), porque la estructura crece por escalones mientras las ventas crecen todos los años. La publicidad digital se presupuesta en $30.000 por equipo vendido, de modo que acompaña al volumen en lugar de ser un monto fijo.

### Determinación del precio de venta

Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el 30 % sobre el costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los gastos de comercialización de todo el horizonte.

### Cuadro 14. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.658.842.587 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.456.495.363 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$390.774** |
| IVA 19 % | $74.247 |
| **Precio de lista con IVA** | **$465.021** |

El precio de lista resultante es de **$465.021 con IVA**, expresado en pesos de 2027 y reajustado cada año por inflación, igual que los costos; por eso se obtiene dividiendo las ventas necesarias por los equipos ponderados según ese reajuste, y no multiplicando un costo medio por el margen. Conviene explicitar cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los primeros ejercicios quedan por debajo del 30 % objetivo y los últimos por encima, de modo que el margen se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la que los años 2027 y 2028 arrojan pérdida: son los años en que se construye la empresa.

Este resultado define el posicionamiento competitivo. A $465.021, TerraSense queda por encima del precio de un medidor básico de importación como el Hanna HI9814 (US$294) o el Bluelab Pulse (US$339). **El argumento no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años y medio de análisis de laboratorio al ritmo habitual de cuatro muestras por año.

### Estado de resultados proyectado

### Cuadro 15. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $78.154.812 | $140.874.049 | $207.286.101 | $277.556.089 | $373.846.702 | $404.088.701 | $437.208.572 | $472.913.161 | $511.356.579 | $553.210.596 |
| (-) Costos operacionales | $23.146.621 | $41.721.784 | $61.390.625 | $82.202.047 | $110.719.834 | $119.676.417 | $129.485.322 | $140.059.726 | $151.445.273 | $163.840.914 |
| (-) Gastos de estructura | $50.879.140 | $93.587.254 | $123.193.769 | $149.499.182 | $166.401.124 | $187.885.523 | $195.759.168 | $203.741.652 | $227.670.820 | $236.536.391 |
| (-) Depreciación | $1.294.824 | $1.294.824 | $1.294.824 | $1.294.824 | $1.294.824 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 |
| (-) Amortización del activo nominal | $1.180.000 | $1.180.000 | $1.180.000 | $1.180.000 | $1.180.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.126.267 | $2.933.593 | $2.717.797 | $2.476.106 | $2.205.412 | $1.902.234 | $1.562.676 | $1.182.370 | $756.428 | $279.372 |
| **(=) Utilidad antes de impuesto** | $-1.472.040 | $156.594 | $17.509.085 | $40.903.930 | $92.045.507 | $93.123.470 | $108.900.350 | $126.428.356 | $129.983.003 | $151.052.862 |
| (-) Impuesto a la renta | $0 | $0 | $4.048.410 | $10.225.982 | $23.011.377 | $23.280.867 | $27.225.087 | $31.607.089 | $32.495.751 | $37.763.216 |
| **(=) Utilidad del ejercicio** | $-1.472.040 | $156.594 | $13.460.675 | $30.677.947 | $69.034.131 | $69.842.602 | $81.675.262 | $94.821.267 | $97.487.252 | $113.289.647 |

El primer ejercicio cierra con una pérdida de $1.472.040 y el segundo con $156.594. No es un defecto del modelo sino su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente —dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A partir de 2029 el resultado es positivo y creciente.

El impuesto a la renta se calcula bajo el régimen Pro Pyme [18], con las tasas de 12,5 % en 2027, 15 % en 2028 y 25 % desde 2029, y con arrastre de pérdidas: los $1.315.446 perdidos en los dos primeros ejercicios se descuentan de la base imponible de 2029, que por eso tributa sobre una utilidad menor que la contable. La depreciación y la amortización reducen el impuesto sin ser salidas de dinero, y por esa razón se suman de vuelta en el flujo de fondos.

### Flujo de fondos y evaluación

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-1.472.040 | $156.594 | $13.460.675 | $30.677.947 | $69.034.131 | $69.842.602 | $81.675.262 | $94.821.267 | $97.487.252 | $113.289.647 |
| (+) Depreciación y amortización | $2.474.824 | $2.474.824 | $2.474.824 | $2.474.824 | $2.474.824 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 |
| (-) Cuota de capital del préstamo | $1.605.622 | $1.798.297 | $2.014.093 | $2.255.784 | $2.526.478 | $2.829.655 | $3.169.214 | $3.549.520 | $3.975.462 | $4.452.517 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $7.505.282 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-602.838 | $833.122 | $13.921.407 | $30.896.988 | $68.982.477 | $61.008.722 | $80.007.105 | $92.772.804 | $95.012.847 | $110.338.186 |
| Caja acumulada | $12.116.947 | $12.950.069 | $26.871.476 | $57.768.463 | $126.750.940 | $187.759.662 | $267.766.767 | $360.539.571 | $455.552.417 | $565.890.603 |

El flujo de fondos parte de la utilidad, le devuelve la depreciación y la amortización que no son salidas de caja, y le descuenta lo que sí sale de la empresa sin pasar por resultados: el capital del préstamo y, en 2032, la renovación del activo fijo. La caja nunca baja de $12.116.947, que ocurre en 2027. Ese es el piso que el capital de trabajo fue dimensionado para sostener.

### Cuadro 17. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $28.176.642 | — | — |
| VAN al 20 % | $123.149.158 | VAN > 0 | Cumple |
| TIR efectiva anual | 57,52 % | TIR > 20 % | Cumple |
| Payback simple | 3,45 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,19 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $12.116.947 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

Todos los indicadores cumplen su criterio. El VAN de $123.149.158 indica excedente económico después de remunerar el capital al 20 % anual; la TIR de 57,52 % supera esa exigencia en 37,52 puntos porcentuales; y la inversión se recupera en 3,45 años nominales o 4,19 descontados, dentro del plazo de cinco años que el proyecto se fijó como criterio.

La evaluación principal es a diez años porque es el plazo del crédito y porque el equipo tiene una vida comercial que excede el lustro. La comparación con un horizonte de cinco años muestra qué parte del resultado depende de esa elección:

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $22.578.598 | $123.149.158 |
| TIR efectiva anual | 37,34 % | 57,52 % |
| Caja acumulada al cierre | $126.750.940 | $565.890.603 |
| Deuda bancaria pendiente al cierre | $17.976.368 | $0 |

A cinco años el proyecto ya crea valor, con un VAN de $22.578.598, pero conserva una deuda bancaria de $17.976.368 que a diez años está saldada. El grueso del VAN se genera en la segunda mitad del horizonte, cuando la estructura ya está pagada y cada venta adicional aporta casi todo su margen de contribución: evaluar a cinco años subestimaría el negocio, pero no cambiaría la decisión.

### Cuadro 19. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $357.661.023 | Positivo |
| 8 % | $286.578.714 | Positivo |
| 10 % | $247.967.157 | Positivo |
| 15 % | $174.108.073 | Positivo |
| 20 % | $123.149.158 | Positivo |
| 30 % | $61.312.405 | Positivo |
| 40 % | $28.152.133 | Positivo |
| 50 % | $9.147.286 | Positivo |
| TIR: 57,52 % | $0 | VAN aproximadamente cero |

El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

### Análisis de sensibilidad y punto de quiebre

Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y **manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que cambia una proyección.

### Cuadro 20. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $465.021 | $-1.472.040 | $123.149.158 | 57,5 % | $12.116.947 |
| Ventas -10 % | $465.021 | $-6.338.656 | $70.037.709 | 42,1 % | $-680.936 |
| Ventas -25 % | $465.021 | $-13.638.579 | $-11.575.710 | 16,0 % | $-37.775.080 |
| Ventas -35 % | $465.021 | $-18.505.194 | $-69.821.298 | -6,2 % | $-81.720.698 |
| Ventas +20 % | $465.021 | $7.228.542 | $229.920.245 | 86,7 % | $20.782.395 |
| BOM +15 % | $465.021 | $-4.114.479 | $94.190.756 | 48,9 % | $5.533.855 |
| BOM +30 % | $465.021 | $-6.756.917 | $64.933.839 | 40,1 % | $-1.882.358 |
| Precio rebajado a $439.990 (−5,4 %) | $439.990 | $-5.428.642 | $79.929.942 | 44,9 % | $1.861.692 |
| Precio rebajado a $419.990 (−9,7 %) | $419.990 | $-8.589.987 | $44.944.778 | 34,3 % | $-7.906.733 |
| Precio rebajado a $399.990 (−14,0 %) | $399.990 | $-11.751.331 | $9.528.319 | 23,1 % | $-25.151.077 |
| Precio rebajado a $369.990 (−20,4 %) | $369.990 | $-16.493.348 | $-45.366.448 | 3,8 % | $-63.240.736 |

Tres lecturas se desprenden de la tabla:

- **El punto de quiebre del volumen está entre una caída del 10 % y una del 25 % en las ventas.** Con −10 % el VAN sigue positivo en $70.037.709 pero la caja se vuelve negativa, de modo que el proyecto destruiría liquidez antes de destruir valor: la restricción que aparece primero es de caja, no de rentabilidad.
- **El costo de materiales admite desviación.** Un alza del 15 % en la BOM deja el VAN en $94.190.756 y la caja positiva; a +30 % el VAN sigue siendo de $64.933.839, pero la caja mínima cae a $-1.882.358. El margen resiste, pero confirma que la cotización de la sonda no admite descuido.
- **El precio no admite rebaja.** Con el financiamiento dimensionado, la caja se vuelve negativa con cualquier precio de lista inferior a $435.787, apenas un 6,3 % bajo el precio calculado, y el proyecto deja de crear valor bajo $394.649. Ese resultado confirma que el precio debe derivarse del costo y no fijarse por aspiración comercial: un precio elegido para parecer competitivo, sin mirar la estructura, deja a la empresa sin caja en su segundo año.

### Costo total de propiedad para el agricultor

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el argumento sobre un supuesto cómodo.

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $465.021 | $490.011 | $490.011 | $980.022 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como tales en la tabla de supuestos de mercado al final del capítulo.

Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: $465.021 de compra frente a $200.000 de laboratorio. Frente al laboratorio el cruce ocurre en el año 3 y la ventaja se mantiene hasta el final: a diez años la diferencia es de $2.000.000 contra $980.022, 2,0 veces. Frente a la asesoría habitual el resultado es más estrecho y no es monótono: TerraSense pasa adelante en el año 5, la compra del segundo equipo en el año 6 lo deja atrás durante 3 años, y recupera la ventaja en el año 9, para cerrar la década con una diferencia de 1,2 veces. Bajo uso intensivo las distancias se abren a 10,2 y 7,3 veces respectivamente.

El argumento estructural, en todo caso, no depende del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo que cada una le cuesta $980 frente a los $50.000 de una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene herramienta.

