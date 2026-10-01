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

El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): el desglose de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad y su costo neto. La lista contiene exactamente los componentes del esquemático de la placa, más la placa misma, la carcasa y el flete. Los precios se cotizaron en el mercado efectivo de abastecimiento del proyecto [45, 46, 47], convertidos a pesos al tipo de cambio de referencia [16], y cada línea declara su origen, de modo que se distinga lo verificado de lo presupuestado.

### Cuadro 2. Estructura de costos de fabricación (BOM) por equipo

| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |
|---|---:|---:|---:|---|
| Sonda de suelo 7-en-1 RS-485 Modbus RTU | 1 | $48.000 | $48.000 | AliExpress; presupuesto conservador, el mercado va de $12.100 a $82.100 |
| Carcasa PETG impresa en taller propio (110 × 100 × 40 mm) | 1 | $7.196 | $7.196 | costeo propio, detallado en la tabla siguiente |
| Placa de desarrollo ESP32 DevKitC con módulo WROOM-32D (antena impresa) | 1 | $4.800 | $4.800 | AliExpress Choice $3.506-$6.600; en Chile $8.148 con IVA |
| Batería LiPo 3,7 V 2.000 mAh con protección | 1 | $4.400 | $4.400 | AliExpress: $4.784 unitaria, $4.350 por unidad en pack de 10 |
| PCB portadora de 2 capas, 99,9 × 90 mm, fabricación y envío (sin ensamblar) | 1 | $3.000 | $3.000 | JLCPCB, compra real: pedido mínimo de 5 placas por $15.000 con envío, IVA e impuestos |
| Módulo ambiental BME280 (I²C) | 1 | $1.050 | $1.050 | AliExpress Choice $990-$1.064 |
| Módulo de carga USB-C y elevación a 5 V | 1 | $900 | $900 | AliExpress: equivalentes de carga y elevación $703-$900 |
| Módulo transceptor SP3485 RS-485 3,3 V | 1 | $900 | $900 | AliExpress: módulo $1.555; integrado suelto $285 por unidad en pack de 10 |
| MOSFET canal N AO3400A (control del corte de la sonda) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| MOSFET canal P AO3401A (interruptor de la rama de 5 V de la sonda) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Bornera de 2 vías, paso 5 mm (batería e interruptor) | 2 | $95 | $190 | LCSC, precio de catálogo por tramo; compra no realizada |
| Bornera de 4 vías, paso 5 mm (sonda) | 1 | $190 | $190 | LCSC, precio de catálogo por tramo; compra no realizada |
| Condensador electrolítico 100 µF 35 V | 2 | $29 | $58 | LCSC, precio de catálogo por tramo; compra no realizada |
| Condensador cerámico 100 nF 50 V (1206) | 4 | $4 | $16 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 100 kΩ (1206), divisor de batería | 2 | $2 | $4 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 330 Ω (1206), LED indicadores | 3 | $2 | $6 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 10 kΩ (1206), polarización del MOSFET y del pulsador | 2 | $2 | $4 | LCSC, precio de catálogo por tramo; compra no realizada |
| LED 0603 azul, rojo y verde | 3 | $8 | $24 | LCSC, precio de catálogo por tramo; compra no realizada |
| Pulsador SMD 4 mm | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Buzzer pasivo magnético 9042 (avisos sonoros, IO19) | 1 | $140 | $140 | LCSC, estimación sobre catálogo de buzzers 9042 (US$0,10-0,20); compra no realizada |
| Fusible 1 A (0603) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Diodo rectificador M7 (SMA), protección contra inversión | 1 | $4 | $4 | LCSC, verificado en US$0,0042 |
| Flete de los componentes LCSC, prorrateado por equipo | 1 | $150 | $150 | LCSC cobra el envío; prorrateado a 200 unidades |
| Interruptor de palanca mini de panel (rosca 6 mm) con capuchón estanco | 1 | $500 | $500 | AliExpress: interruptores de 6 mm con capuchón de goma desde US$0,25 el capuchón y US$1,09 el set de 10; consulta 01-10-2026 |
| Prensaestopa PG7 IP68 con tuerca (salida del cable de la sonda) | 1 | $390 | $390 | MCI Electronics (Chile): pack de 10 por $3.900; $990 unitaria; consulta 01-10-2026 |
| Respiradero M12 × 1,5 con membrana ePTFE (ventilación del BME280) | 1 | $950 | $950 | AliExpress: pack de 10 por US$9,95, a $950/US$; consulta 01-10-2026 |
| Tapón de silicona para el puerto USB-C | 1 | $200 | $200 | AliExpress: US$0,21 por unidad en pack de 50; consulta 01-10-2026 |
| Inserto roscado M3 de latón para la tapa | 4 | $25 | $100 | AliExpress: US$1,09-2,33 por 100 unidades; consulta 01-10-2026 |
| Tornillería: 4 tornillos M3 inoxidables de cierre y 4 tornillos M2 con separador para la PCB | 1 | $800 | $800 | MCI Electronics (Chile): kits de tornillos y separadores de $7.590-$8.490, prorrateados; consulta 01-10-2026 |
| Cordón de silicona de 2 mm para la junta de la tapa (≈ 45 cm) | 1 | $300 | $300 | estimación sobre catálogo AliExpress de cordón de silicona por metro |
| Cableado interno: cable de silicona 22 AWG y termorretráctil | 1 | $300 | $300 | estimación de taller |
| Embalaje: caja de cartón, manual impreso y etiqueta | 1 | $1.500 | $1.500 | estimación: caja $800, manual $500, etiqueta $200 |
| **Total BOM neto por equipo** |  |  | **$76.148** |  |

La sonda de suelo representa **$48.000, equivalente al 63,0 % del costo de materiales**, y es por lejos la decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de variables, calidad de construcción y material del vástago. El presupuesto adopta $48.000, en el tramo alto de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige.

En el otro extremo, los componentes discretos de la placa portadora (borneras, condensadores, resistencias, indicadores, los dos transistores MOSFET que cortan la alimentación de la sonda y las protecciones de la batería) suman apenas $862 por equipo, un 1,1 % de la BOM. La conclusión de diseño es directa: el costo del instrumento se decide en la sonda, la placa de control y la batería, y ninguna economía sobre los discretos cambia el resultado, de modo que en ellos se privilegia la robustez sobre el ahorro.

Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:

- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 [42] eliminó la exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la exposición es de **$11.742 por equipo**, del orden de $2.348.400 anuales al volumen del primer año. El proyecto asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está en juego si no lo hace.
- **La placa de control es una placa de desarrollo, no un módulo desnudo.** El presupuesto adquiere el ESP32 en formato DevKit, que ya incorpora su propio regulador de 3,3 V, el conversor USB-serie y el circuito de arranque. Esto simplifica la placa portadora y el montaje, a cambio de un consumo propio de la placa que no se apaga con el reposo del microcontrolador; el capítulo de gestión energética cuantifica ese efecto y explica por qué el equipo se apaga con un interruptor entre jornadas.

La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras 3D, que figuran en el activo fijo, y el costo de cada carcasa se construye así:

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (carcasa de 110 × 100 × 40 mm para la placa de 99,9 × 90 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, ~1,05 kWh por carcasa a $160/kWh | $168 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.196** |  |

El filamento explica el 73 % del costo de cada carcasa; la merma, la energía y la mantención de las impresoras completan el resto. Imprimir en taller propio mantiene bajo control el plazo de entrega y permite corregir el diseño de la envolvente entre lotes sin depender de un proveedor externo, lo que importa mientras la estanqueidad IP67 no esté ensayada.

A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto pertenecen al costo variable y no a la estructura:

### Cuadro 4. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $76.148 |
| Merma de fabricación, 3 % de la BOM | $2.284 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.807 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$88.240** |
| Comisión comercial, 5 % sobre el precio bruto | $23.043 |
| **Costo variable total por equipo** | **$111.283** |

El costo variable total, $111.283 por equipo, equivale al 28,7 % del precio neto de venta. Cada unidad vendida deja por lo tanto un margen de contribución de $275.991, que es lo que queda disponible para cubrir la estructura fija de la empresa, los intereses y la utilidad. La comisión comercial es la única partida que depende del precio; todas las demás dependen de la BOM y del envío, y por eso una variación en el costo de la sonda se transmite casi íntegra al costo variable.

### Inversión inicial

La puesta en marcha exige tres tipos de desembolso de naturaleza distinta, que conviene no mezclar: los bienes que se compran una vez y se deprecian, los gastos de constitución y desarrollo que se amortizan, y el dinero que debe quedar disponible para sostener la operación mientras las ventas todavía no cubren los costos.

El equipamiento se dimensionó **según la dotación real del proyecto**, no sobre una plantilla genérica: tres puestos de trabajo el primer año, dos impresoras para producir las carcasas e instrumental de laboratorio suficiente para el montaje y la verificación de cada unidad.

### Cuadro 5. Equipamiento e inversión en activo fijo

| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |
|---|---:|---:|---:|---:|---:|
| Impresora 3D | 2 | $800.000 | $1.600.000 | 5 años | $320.000 |
| Notebook | 3 | $1.000.000 | $3.000.000 | 5 años | $600.000 |
| Osciloscopio digital portátil | 1 | $500.000 | $500.000 | 5 años | $100.000 |
| Fuente de alimentación de laboratorio | 1 | $300.000 | $300.000 | 5 años | $60.000 |
| Multímetro | 2 | $100.000 | $200.000 | 5 años | $40.000 |
| Soldador de temperatura regulable | 2 | $150.000 | $300.000 | 5 años | $60.000 |
| Herramientas | 1 | $1.000.000 | $1.000.000 | 5 años | $200.000 |
| Muebles de oficina (sillas, escritorios) | 3 | $500.000 | $1.500.000 | 5 años | $300.000 |
| Monitores | 3 | $150.000 | $450.000 | 5 años | $90.000 |
| Impresora de oficina | 1 | $150.000 | $150.000 | 5 años | $30.000 |
| **Total activo fijo** |  |  | **$9.000.000** |  | **$1.800.000** |

El activo fijo suma $9.000.000 y se deprecia en línea recta a cinco años, a razón de $1.800.000 anuales que se cargan al estado de resultados. Al agotarse esa vida útil los equipos se renuevan: en 2032 el proyecto vuelve a comprarlos por $10.433.467, valor reajustado por inflación, y esa compra figura como reinversión en el flujo de fondos. Así la depreciación de los años siguientes corresponde a equipos efectivamente pagados.

### Cuadro 6. Activo nominal (gastos de puesta en marcha)

| Partida | Neto CLP |
|---|---:|
| Constitución de sociedad, trámites legales y marca | $700.000 |
| Prototipado electrónico (tres rondas de PCB portadora) | $1.100.000 |
| Prototipado mecánico (carcasa, juntas, estanqueidad) | $450.000 |
| Firmware del ESP32 | $900.000 |
| Aplicación móvil y consola web | $800.000 |
| Metrología y campaña de validación (30 muestras pareadas) | $600.000 |
| Ensayo IP67 en laboratorio acreditado | $350.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $300.000 |
| **Total activo nominal** | **$5.200.000** |
| Amortización anual (5 años) | $1.040.000 |

Del activo nominal, $4.500.000 (el 87 %) corresponde al desarrollo técnico que el propio informe declara pendiente: prototipos de placa y carcasa, programa del microcontrolador, aplicación, campaña de validación, ensayo IP67 y verificación ante SUBTEL. Solo $700.000 son trámites de constitución de la sociedad. Estos gastos no se deprecian porque no son bienes físicos; se amortizan en cinco años.

El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de 3 meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $9.000.000 | 30,0 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,3 % |
| Capital de trabajo (3,0 meses de estructura) | $12.839.785 | 42,8 % |
| Inventario inicial (2 meses de ventas) | $2.941.328 | 9,8 % |
| **Inversión inicial total** | **$29.981.113** | **100,0 %** |

La partida más grande de la inversión no es un bien físico sino el capital de trabajo: $12.839.785, el 42,8 % del total. Es el dinero que financia la pérdida de los dos primeros ejercicios y los dos meses de inventario con que parte la producción. El equipamiento y el activo nominal, que son lo que habitualmente se asocia a «montar la empresa», representan juntos menos de la mitad.

### Financiamiento

El financiamiento se estructura de la forma en que opera la banca con una empresa nueva. **El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie equivalente al 30 % del monto solicitado como condición para que este desembolse el crédito, y es el crédito el que financia el 100 % de la inversión inicial. Sumar el pie y el crédito como si fueran dos fuentes contaría dos veces el mismo dinero.

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.981.113 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $29.981.113 |
| Pie propio exigido por el banco (30 % del crédito) | $8.994.334 |
| Aporte por socio (2 socios, partes iguales) | $4.497.167 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $419.577 |
| Total intereses del crédito | $20.368.151 |
| Total pagado al banco | $50.349.264 |

Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios opera con holgura estrecha. La cuota anual, $5.034.926, equivale al 6,5 % de las ventas netas del primer año y al 0,9 % de las del último, de modo que su peso sobre la operación se diluye a medida que el negocio crece.

### Cuadro 9. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $29.981.113 | $1.708.449 | $3.326.478 | $5.034.926 | $28.272.664 |
| 2028 | $28.272.664 | $1.913.463 | $3.121.464 | $5.034.926 | $26.359.202 |
| 2029 | $26.359.202 | $2.143.078 | $2.891.848 | $5.034.926 | $24.216.124 |
| 2030 | $24.216.124 | $2.400.247 | $2.634.679 | $5.034.926 | $21.815.876 |
| 2031 | $21.815.876 | $2.688.277 | $2.346.649 | $5.034.926 | $19.127.599 |
| 2032 | $19.127.599 | $3.010.870 | $2.024.056 | $5.034.926 | $16.116.729 |
| 2033 | $16.116.729 | $3.372.175 | $1.662.752 | $5.034.926 | $12.744.554 |
| 2034 | $12.744.554 | $3.776.836 | $1.258.091 | $5.034.926 | $8.967.719 |
| 2035 | $8.967.719 | $4.230.056 | $804.870 | $5.034.926 | $4.737.663 |
| 2036 | $4.737.663 | $4.737.663 | $297.264 | $5.034.926 | $0 |
| **Total** |  | **$29.981.113** | **$20.368.151** | **$50.349.264** |  |

El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de 2036 la deuda es cero. Los $20.368.151 de intereses son el precio del financiamiento y están descontados en el estado de resultados de cada ejercicio.

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
| Electricidad | $180.000 | $60.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$450.000** | **$150.000** |

El primer año la empresa opera desde un taller domiciliario, y los servicios básicos corresponden a la proporción de ese hogar que ocupa la actividad. Desde el segundo año la oficina en Providencia agrega un arriendo de $1.500.000 mensuales, fijado en el extremo superior de los avisos de oficinas comparables en la comuna, y servicios completos por $450.000. Ambos se reajustan por inflación.

### Cuadro 13. Costos operacionales, de administración y de comercialización

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Materiales y costo variable | $22.256.523 | $40.117.383 | $59.029.863 | $79.040.987 | $106.462.129 | $115.074.290 | $124.505.995 | $134.673.763 | $145.621.481 | $157.540.451 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $73.615.663 | $135.187.837 | $183.751.329 | $230.113.696 | $274.483.986 | $304.629.167 | $321.984.598 | $340.186.433 | $375.116.450 | $395.955.715 |

La tabla muestra dónde está el costo de la empresa. En 2027 el personal, sumando nómina, cargas, colación y movilización, se lleva el 52 % del costo total y los materiales solo el 30 %: es una empresa que todavía paga más estructura de la que su volumen justifica. En 2036 la proporción se ha acercado (40 % el personal y 40 % los materiales), porque la estructura crece por escalones mientras las ventas crecen todos los años. La publicidad digital se presupuesta en $30.000 por equipo vendido, de modo que acompaña al volumen en lugar de ser un monto fijo.

### Determinación del precio de venta

Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el 30 % sobre el costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los gastos de comercialización de todo el horizonte.

### Cuadro 14. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.635.024.874 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.425.532.337 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$387.274** |
| IVA 19 % | $73.582 |
| **Precio de lista con IVA** | **$460.856** |

El precio de lista resultante es de **$460.856 con IVA**, expresado en pesos de 2027 y reajustado cada año por inflación, igual que los costos; por eso se obtiene dividiendo las ventas necesarias por los equipos ponderados según ese reajuste, y no multiplicando un costo medio por el margen. Conviene explicitar cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los primeros ejercicios quedan por debajo del 30 % objetivo y los últimos por encima, de modo que el margen se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la que los años 2027 y 2028 arrojan pérdida: son los años en que se construye la empresa.

Este resultado define el posicionamiento competitivo. A $460.856, TerraSense queda por encima del precio de un medidor básico de importación como el Hanna HI9814 (US$294) o el Bluelab Pulse (US$339). **El argumento no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años y medio de análisis de laboratorio al ritmo habitual de cuatro muestras por año.

### Estado de resultados proyectado

### Cuadro 15. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $77.454.707 | $139.612.110 | $205.429.248 | $275.069.763 | $370.497.811 | $400.468.905 | $433.292.090 | $468.676.840 | $506.775.886 | $548.254.977 |
| (-) Costos operacionales | $22.256.523 | $40.117.383 | $59.029.863 | $79.040.987 | $106.462.129 | $115.074.290 | $124.505.995 | $134.673.763 | $145.621.481 | $157.540.451 |
| (-) Gastos de estructura | $51.359.140 | $95.070.454 | $124.721.465 | $151.072.709 | $168.021.857 | $189.554.877 | $197.478.603 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Amortización del activo nominal | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.326.478 | $3.121.464 | $2.891.848 | $2.634.679 | $2.346.649 | $2.024.056 | $1.662.752 | $1.258.091 | $804.870 | $297.264 |
| **(=) Utilidad antes de impuesto** | $-2.327.433 | $-1.537.190 | $15.946.071 | $39.481.387 | $90.827.176 | $91.728.988 | $107.558.047 | $125.145.623 | $128.767.872 | $149.915.305 |
| (-) Impuesto a la renta | $0 | $0 | $3.020.362 | $9.870.347 | $22.706.794 | $22.932.247 | $26.889.512 | $31.286.406 | $32.191.968 | $37.478.826 |
| **(=) Utilidad del ejercicio** | $-2.327.433 | $-1.537.190 | $12.925.709 | $29.611.040 | $68.120.382 | $68.796.741 | $80.668.535 | $93.859.217 | $96.575.904 | $112.436.478 |

El primer ejercicio cierra con una pérdida de $2.327.433 y el segundo con $1.537.190. No es un defecto del modelo sino su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente —dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A partir de 2029 el resultado es positivo y creciente.

El impuesto a la renta se calcula bajo el régimen Pro Pyme [18], con las tasas de 12,5 % en 2027, 15 % en 2028 y 25 % desde 2029, y con arrastre de pérdidas: los $3.864.624 perdidos en los dos primeros ejercicios se descuentan de la base imponible de 2029, que por eso tributa sobre una utilidad menor que la contable. La depreciación y la amortización reducen el impuesto sin ser salidas de dinero, y por esa razón se suman de vuelta en el flujo de fondos.

### Flujo de fondos y evaluación

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.327.433 | $-1.537.190 | $12.925.709 | $29.611.040 | $68.120.382 | $68.796.741 | $80.668.535 | $93.859.217 | $96.575.904 | $112.436.478 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Cuota de capital del préstamo | $1.708.449 | $1.913.463 | $2.143.078 | $2.400.247 | $2.688.277 | $3.010.870 | $3.372.175 | $3.776.836 | $4.230.056 | $4.737.663 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $10.433.467 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-1.195.882 | $-610.653 | $13.622.631 | $30.050.793 | $68.272.105 | $57.439.098 | $79.383.054 | $92.169.075 | $94.432.541 | $109.785.509 |
| Caja acumulada | $11.643.903 | $11.033.250 | $24.655.881 | $54.706.674 | $122.978.779 | $180.417.876 | $259.800.930 | $351.970.005 | $446.402.546 | $556.188.055 |

El flujo de fondos parte de la utilidad, le devuelve la depreciación y la amortización que no son salidas de caja, y le descuenta lo que sí sale de la empresa sin pasar por resultados: el capital del préstamo y, en 2032, la renovación del activo fijo. La caja nunca baja de $11.033.250, que ocurre en 2028. Ese es el piso que el capital de trabajo fue dimensionado para sostener.

### Cuadro 17. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $29.981.113 | — | — |
| VAN al 20 % | $117.269.640 | VAN > 0 | Cumple |
| TIR efectiva anual | 54,37 % | TIR > 20 % | Cumple |
| Payback simple | 3,60 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,33 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $11.033.250 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

Todos los indicadores cumplen su criterio. El VAN de $117.269.640 indica excedente económico después de remunerar el capital al 20 % anual; la TIR de 54,37 % supera esa exigencia en 34,37 puntos porcentuales; y la inversión se recupera en 3,60 años nominales o 4,33 descontados, dentro del plazo de cinco años que el proyecto se fijó como criterio.

La evaluación principal es a diez años porque es el plazo del crédito y porque el equipo tiene una vida comercial que excede el lustro. La comparación con un horizonte de cinco años muestra qué parte del resultado depende de esa elección:

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $18.410.836 | $117.269.640 |
| TIR efectiva anual | 33,57 % | 54,37 % |
| Caja acumulada al cierre | $122.978.779 | $556.188.055 |
| Deuda bancaria pendiente al cierre | $19.127.599 | $0 |

A cinco años el proyecto ya crea valor, con un VAN de $18.410.836, pero conserva una deuda bancaria de $19.127.599 que a diez años está saldada. El grueso del VAN se genera en la segunda mitad del horizonte, cuando la estructura ya está pagada y cada venta adicional aporta casi todo su margen de contribución: evaluar a cinco años subestimaría el negocio, pero no cambiaría la decisión.

### Cuadro 19. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $348.242.143 | Positivo |
| 8 % | $278.158.635 | Positivo |
| 10 % | $240.110.803 | Positivo |
| 15 % | $167.385.982 | Positivo |
| 20 % | $117.269.640 | Positivo |
| 30 % | $56.566.032 | Positivo |
| 40 % | $24.104.816 | Positivo |
| 50 % | $5.558.409 | Positivo |
| TIR: 54,37 % | $0 | VAN aproximadamente cero |

El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

### Análisis de sensibilidad y punto de quiebre

Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y **manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que cambia una proyección.

### Cuadro 20. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $460.856 | $-2.327.433 | $117.269.640 | 54,4 % | $11.033.250 |
| Ventas -10 % | $460.856 | $-7.214.617 | $63.826.556 | 39,4 % | $-2.655.750 |
| Ventas -25 % | $460.856 | $-14.545.393 | $-18.379.893 | 13,9 % | $-42.672.045 |
| Ventas -35 % | $460.856 | $-19.432.576 | $-77.996.838 | -8,8 % | $-86.798.332 |
| Ventas +20 % | $460.856 | $6.516.067 | $224.401.761 | 82,4 % | $20.453.882 |
| BOM +15 % | $460.856 | $-4.840.252 | $89.695.457 | 46,5 % | $3.980.825 |
| BOM +30 % | $460.856 | $-7.353.071 | $61.829.958 | 38,4 % | $-3.071.601 |
| Precio rebajado a $439.990 (−4,5 %) | $439.990 | $-5.625.587 | $81.208.693 | 44,3 % | $1.790.176 |
| Precio rebajado a $409.990 (−11,0 %) | $409.990 | $-10.367.603 | $28.523.244 | 28,9 % | $-16.180.875 |
| Precio rebajado a $389.990 (−15,4 %) | $389.990 | $-13.528.948 | $-7.095.385 | 17,7 % | $-33.425.219 |
| Precio rebajado a $369.990 (−19,7 %) | $369.990 | $-16.690.292 | $-43.902.630 | 5,0 % | $-61.756.145 |

Tres lecturas se desprenden de la tabla:

- **El punto de quiebre del volumen está entre una caída del 10 % y una del 25 % en las ventas.** Con −10 % el VAN sigue positivo en $63.826.556 pero la caja se vuelve negativa, de modo que el proyecto destruiría liquidez antes de destruir valor: la restricción que aparece primero es de caja, no de rentabilidad.
- **El costo de materiales admite desviación.** Un alza del 15 % en la BOM deja el VAN en $89.695.457 y la caja positiva; a +30 % el VAN sigue siendo de $61.829.958, pero la caja mínima cae a $-3.071.601. El margen resiste, pero confirma que la cotización de la sonda no admite descuido.
- **El precio no admite rebaja.** Con el financiamiento dimensionado, la caja se vuelve negativa con cualquier precio de lista inferior a $435.949, apenas un 5,4 % bajo el precio calculado, y el proyecto deja de crear valor bajo $393.916. Ese resultado confirma que el precio debe derivarse del costo y no fijarse por aspiración comercial: un precio elegido para parecer competitivo, sin mirar la estructura, deja a la empresa sin caja en su segundo año.

### Costo total de propiedad para el agricultor

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el argumento sobre un supuesto cómodo.

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $460.856 | $485.846 | $485.846 | $971.691 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como tales en la tabla de supuestos de mercado al final del capítulo.

Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: $460.856 de compra frente a $200.000 de laboratorio. Frente al laboratorio el cruce ocurre en el año 3 y la ventaja se mantiene hasta el final: a diez años la diferencia es de $2.000.000 contra $971.691, 2,1 veces. Frente a la asesoría habitual el resultado es más estrecho y no es monótono: TerraSense pasa adelante en el año 5, la compra del segundo equipo en el año 6 lo deja atrás durante 3 años, y recupera la ventaja en el año 9, para cerrar la década con una diferencia de 1,2 veces. Bajo uso intensivo las distancias se abren a 10,3 y 7,4 veces respectivamente.

El argumento estructural, en todo caso, no depende del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo que cada una le cuesta $972 frente a los $50.000 de una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene herramienta.

