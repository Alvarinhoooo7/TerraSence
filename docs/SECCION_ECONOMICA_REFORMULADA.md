## Análisis de Viabilidad Económica

El análisis que sigue determina si el proyecto es económicamente sostenible y, sobre todo, **a qué precio**. A diferencia de la versión anterior de este estudio, aquí el precio de venta no es un dato de entrada sino un resultado: se construye primero la estructura completa de costos e inversión, y el precio se deriva de ella exigiendo un margen de utilidad definido. Fijar el precio antes de conocer el costo es el error metodológico que este capítulo corrige.

La secuencia es la siguiente: se costea el equipo componente por componente, se dimensiona la inversión inicial y su financiamiento, se proyectan los costos de operación, administración y comercialización, y solo entonces se determina el precio que cubre todo eso con el margen exigido. Con ese precio se construyen el estado de resultados, el flujo de fondos y los indicadores de rentabilidad.

### Las tres economías del análisis

Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su desarrollo, porque mezclarlas vuelve incomparable cualquier evaluación. El análisis distingue tres economías con unidades, destinatarios y criterios de éxito propios.

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

La consecuencia práctica es una sola y se aplica sin excepción: **el ahorro del agricultor no es ingreso del proyecto.** Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen en ninguna línea del flujo de caja de la empresa; se presentan únicamente como argumento de adopción, porque explican por qué alguien compraría el equipo, no cuánto factura quien lo vende.

### Estructura de costos de fabricación

El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): el desglose de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad y su costo neto. Los precios se cotizaron en el mercado efectivo de abastecimiento del proyecto [45, 46, 47] y cada línea declara su origen, de modo que se distinga lo verificado de lo presupuestado.

### Cuadro 1. Estructura de costos de fabricación (BOM) por equipo

| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |
|---|---:|---:|---:|---|
| Sonda de suelo 7-en-1 RS-485 Modbus RTU | 1 | $48.000 | $48.000 | AliExpress; presupuesto conservador, el mercado va de $12.100 a $82.100 |
| Carcasa PETG impresa en taller propio | 1 | $6.900 | $6.900 | costeo propio, ver cuadro siguiente |
| ESP32 DevKit WROOM-32D | 1 | $4.800 | $4.800 | AliExpress Choice $3.506-$6.600; en Chile $8.148 c/IVA |
| Bateria LiPo 3,7 V 2.000 mAh con proteccion | 1 | $4.400 | $4.400 | AliExpress: $4.784 unitaria, $4.350/u en pack de 10 |
| PCB portadora 2 capas, fabricacion y envio | 1 | $2.000 | $2.000 | JLCPCB, estimacion propia a volumen de 200 u |
| Modulo ambiental BME280 (I2C) | 1 | $1.050 | $1.050 | AliExpress Choice $990-$1.064 |
| Modulo de carga y elevacion LX-LCBST (Modulos:Modulo_LX-LCBST) | 1 | $900 | $900 | AliExpress: equivalentes de carga+boost $703-$900 |
| Modulo transceptor SP3485 RS-485 3,3 V | 1 | $900 | $900 | AliExpress: modulo $1.555; IC suelto $285/u en pack de 10 |
| Terminal block 2 pines, paso 5 mm | 2 | $95 | $190 | LCSC, carrito pendiente |
| Terminal block 4 pines, paso 5 mm (TerminalBlock_MetzConnect Type055) | 1 | $190 | $190 | LCSC, carrito pendiente |
| Condensador electrolitico 100 uF 35 V (CP_Elec 6,3x7,7) | 2 | $29 | $58 | LCSC, carrito pendiente |
| Condensador ceramico 100 nF 50 V (1206) | 4 | $4 | $16 | LCSC, carrito pendiente |
| Resistencia 100 kOhm (1206) | 2 | $2 | $4 | LCSC, carrito pendiente |
| Resistencia 330 Ohm (1206) | 3 | $2 | $6 | LCSC, carrito pendiente |
| Resistencia 10 kOhm (1206) | 1 | $2 | $2 | LCSC, carrito pendiente |
| LED 0603 azul, rojo y verde | 3 | $8 | $24 | LCSC, carrito pendiente |
| Pulsador SMD 4 mm (XKB TS-1187A) | 1 | $19 | $19 | LCSC, carrito pendiente |
| Fusible 0603 | 1 | $19 | $19 | LCSC, carrito pendiente |
| Diodo 1N4007 / M7 (SMA DO-214AC) | 1 | $4 | $4 | LCSC C95872, verificado en US$0,0042 |
| Flete de discretos LCSC, prorrateado por equipo | 1 | $150 | $150 | LCSC cobra envio; prorrateado a 200 u |
| **Total BOM neto por equipo** |  |  | **$69.632** |  |

La sonda de suelo representa **$48.000, equivalente al 68,9 % del costo de materiales**, y es por lejos la decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de variables, calidad de construcción y material del vástago. El presupuesto adopta $48.000, en el tramo alto de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige.

Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:

- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 eliminó la exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la exposición es de **$11.410 por equipo**, del orden de $2.281.900 anuales al volumen del primer año. El proyecto asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está en juego si no lo hace.
- **La placa de control es una placa de desarrollo, no un módulo desnudo.** El presupuesto adquiere el ESP32 en formato DevKit WROOM-32, que incorpora un regulador de propósito general, un puente USB-UART y un LED de alimentación que no se apagan con el reposo profundo del microcontrolador. El diseño contempla por ello una intervención de taller sobre cada unidad, descrita en el capítulo de gestión energética, cuyo efecto sobre la autonomía se cuantifica allí.

La carcasa dejó de ser un servicio externo: el proyecto adquiere dos impresoras 3D, que figuran en el activo fijo, y la imprime en taller propio. Su costo se construye así:

### Cuadro 2. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 200 g a $25.000/kg | $5.000 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $750 | estimación de taller |
| Energía, ~1 kWh por carcasa a $160/kWh | $160 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$6.900** |  |

A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto pertenecen al costo variable y no a la estructura:

### Cuadro 3. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $69.632 |
| Merma de fabricación, 3 % de la BOM | $2.089 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.482 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$81.203** |
| Comisión comercial, 5 % sobre el precio bruto | $22.467 |
| **Costo variable total por equipo** | **$103.669** |

### Inversión inicial

La puesta en marcha exige tres tipos de desembolso de naturaleza distinta, que conviene no mezclar: los bienes que se compran una vez y se deprecian, los gastos de constitución y desarrollo que se amortizan, y el dinero que debe quedar disponible para sostener la operación mientras las ventas todavía no cubren los costos.

El equipamiento se dimensionó **según la dotación real del proyecto**, no sobre una plantilla genérica: tres puestos de trabajo el primer año, dos impresoras para producir las carcasas e instrumental de laboratorio suficiente para el montaje y la verificación de cada unidad.

### Cuadro 4. Equipamiento e inversión en activo fijo

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

### Cuadro 5. Activo nominal (gastos de puesta en marcha)

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

El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de 3 meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

### Cuadro 6. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $9.000.000 | 30,3 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses de estructura) | $12.819.160 | 43,1 % |
| Inventario inicial (2 meses de ventas) | $2.706.752 | 9,1 % |
| **Inversión inicial total** | **$29.725.912** | **100,0 %** |

### Financiamiento

El financiamiento se estructura de la forma en que opera efectivamente la banca con una empresa nueva, y este punto corrige un error de la versión anterior del estudio. **El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie equivalente al 30 % del monto solicitado como condición para que este desembolse el crédito, y es el crédito el que financia el 100 % de la inversión inicial. Decir que las fuentes suman el pie más el crédito cuenta dos veces el mismo dinero.

### Cuadro 7. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.725.912 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $29.725.912 |
| Pie propio exigido por el banco (30 % del crédito) | $8.917.774 |
| Aporte por socio (2 socios, partes iguales) | $4.458.887 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $416.006 |
| Total intereses del crédito | $20.194.777 |
| Total pagado al banco | $49.920.689 |

Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios opera con holgura estrecha.

### Cuadro 8. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $29.725.912 | $1.693.906 | $3.298.163 | $4.992.069 | $28.032.006 |
| 2028 | $28.032.006 | $1.897.175 | $3.094.894 | $4.992.069 | $26.134.831 |
| 2029 | $26.134.831 | $2.124.836 | $2.867.233 | $4.992.069 | $24.009.995 |
| 2030 | $24.009.995 | $2.379.816 | $2.612.253 | $4.992.069 | $21.630.178 |
| 2031 | $21.630.178 | $2.665.394 | $2.326.675 | $4.992.069 | $18.964.784 |
| 2032 | $18.964.784 | $2.985.242 | $2.006.827 | $4.992.069 | $15.979.543 |
| 2033 | $15.979.543 | $3.343.471 | $1.648.598 | $4.992.069 | $12.636.072 |
| 2034 | $12.636.072 | $3.744.687 | $1.247.382 | $4.992.069 | $8.891.385 |
| 2035 | $8.891.385 | $4.194.049 | $798.019 | $4.992.069 | $4.697.335 |
| 2036 | $4.697.335 | $4.697.335 | $294.733 | $4.992.069 | $0 |
| **Total** |  | **$29.725.912** | **$20.194.777** | **$49.920.689** |  |

El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de 2036 la deuda es cero. Los $20.194.777 de intereses son el precio del financiamiento y están descontados en el estado de resultados de cada ejercicio.

### Estructura de costos de operación

La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un contador, sin oficina y con la gestión comercial resuelta por los propios socios con pauta digital. La oficina en Providencia entra el segundo año, la encargada de marketing el tercero, y los ensambladores se incorporan a medida que el volumen los exige.

Los sueldos de los socios siguen una escala progresiva que parte cerca del ingreso mínimo mientras la empresa no es rentable y sube por escalones hasta $1.200.000 en 2031. Los empleados no siguen esa escala: se pagan a valor de mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir la remuneración como un socio difiere la suya.

### Cuadro 9. Dotación y sueldos brutos mensuales

| Año | Socios | Contador | Marketing | Ensambladores | Total personas | Sueldo socio | Oficina |
|---|---:|---:|---:|---:|---:|---:|---|
| 2027 | 2 | 1 | 0 | 0 | 3 | $600.000 | no |
| 2028 | 2 | 1 | 0 | 1 | 4 | $700.000 | sí |
| 2029 | 2 | 1 | 1 | 1 | 5 | $850.000 | sí |
| 2030 | 2 | 1 | 1 | 2 | 6 | $1.000.000 | sí |
| 2031 | 2 | 1 | 1 | 2 | 6 | $1.200.000 | sí |
| 2032 | 2 | 1 | 1 | 3 | 7 | $1.236.000 | sí |
| 2033 | 2 | 1 | 1 | 3 | 7 | $1.273.080 | sí |
| 2034 | 2 | 1 | 1 | 3 | 7 | $1.311.272 | sí |
| 2035 | 2 | 1 | 1 | 4 | 8 | $1.350.611 | sí |
| 2036 | 2 | 1 | 1 | 4 | 8 | $1.391.129 | sí |

### Cuadro 9b. Desglose estimado de servicios básicos mensuales

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $180.000 | $60.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$450.000** | **$150.000** |

Sobre el costo laboral, el modelo no aplica un recargo fijo sino el calendario legal vigente. La Ley N° 21.735 de reforma previsional introdujo una cotización de cargo del empleador que parte en 3,5 % desde agosto de 2026 y sube gradualmente hasta completar 8,5 % en 2033 sumada al Seguro de Invalidez y Sobrevivencia. A eso se agregan el seguro de cesantía (2,4 % en contrato indefinido) y la cotización de la mutualidad, más las provisiones de vacaciones e indemnización por años de servicio. El costo sobre el sueldo bruto pasa así de **23,5 % en 2027 a 28,5 % en 2036**, y esa progresión está incorporada año a año en lugar de aproximarse con un porcentaje único.

Conviene verificar además que la escala salarial se mantenga sobre el piso legal durante todo el horizonte. El ingreso mínimo mensual quedó en $553.553 desde mayo de 2026 y se reajusta por índice de precios; el cargo peor remunerado del proyecto, el de ensamblador, parte en $700.000 y termina el horizonte en $913.341, holgadamente por encima de la proyección del mínimo.

### Cuadro 10. Costos operacionales, de administración y de comercialización

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Materiales y costo variable | $20.733.877 | $37.372.814 | $54.991.426 | $73.633.519 | $99.178.687 | $107.201.659 | $115.988.109 | $125.460.265 | $135.659.011 | $146.762.563 |
| Nómina y cargas | $32.606.640 | $47.079.721 | $68.745.793 | $86.764.684 | $94.902.837 | $110.985.034 | $114.761.092 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $72.010.517 | $132.419.635 | $179.827.002 | $225.054.860 | $267.430.932 | $297.283.963 | $313.831.359 | $330.972.935 | $365.153.980 | $385.177.827 |

### Determinación del precio de venta

Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el 30 % sobre el costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los gastos de comercialización de todo el horizonte.

### Cuadro 11. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.569.163.011 |
| Equipos vendidos en los 10 años | 7.481 |
| Costo medio por equipo | $343.425 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| **Precio neto de venta (año base)** | **$377.594** |
| IVA 19 % | $71.743 |
| **Precio de lista con IVA** | **$449.337** |

El precio de lista resultante es de **$449.337 con IVA**. Conviene explicitar cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los primeros ejercicios quedan por debajo del 30 % objetivo y los últimos por encima, de modo que el margen se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la que los años 2027 y 2028 arrojan pérdida: son los años en que se construye la empresa.

Este resultado obliga a reformular el posicionamiento competitivo. Con el precio anterior de $349.990, el informe sostenía que TerraSense se ubicaba en el mismo orden de magnitud que un medidor básico de importación. A $449.337 eso ya no es cierto: el equipo queda por encima del Hanna HI9814 (US$294) y del Bluelab Pulse (US$339). **El argumento ya no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años de análisis de laboratorio.

### Estado de resultados proyectado

### Cuadro 12. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $75.518.744 | $136.122.536 | $200.294.589 | $268.194.455 | $361.237.300 | $390.459.273 | $422.462.050 | $456.962.366 | $494.109.134 | $534.551.465 |
| (-) Costos operacionales | $20.733.877 | $37.372.814 | $54.991.426 | $73.633.519 | $99.178.687 | $107.201.659 | $115.988.109 | $125.460.265 | $135.659.011 | $146.762.563 |
| (-) Gastos de estructura | $51.276.640 | $95.046.821 | $124.835.576 | $151.421.341 | $168.252.246 | $190.082.304 | $197.843.250 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $2.086.693 | $2.149.294 | $2.213.773 | $2.280.186 | $2.348.592 |
| (-) Amortización del activo nominal | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.298.163 | $3.094.894 | $2.867.233 | $2.612.253 | $2.326.675 | $2.006.827 | $1.648.598 | $1.247.382 | $798.019 | $294.733 |
| **(=) Utilidad antes de impuesto** | $-2.629.936 | $-2.231.993 | $14.760.354 | $37.687.342 | $88.639.694 | $89.081.789 | $104.832.799 | $122.528.277 | $125.876.949 | $146.730.312 |
| (-) Impuesto a la renta | $0 | $0 | $2.474.606 | $9.421.836 | $22.159.923 | $22.270.447 | $26.208.200 | $30.632.069 | $31.469.237 | $36.682.578 |
| **(=) Utilidad del ejercicio** | $-2.629.936 | $-2.231.993 | $12.285.748 | $28.265.507 | $66.479.770 | $66.811.342 | $78.624.599 | $91.896.208 | $94.407.712 | $110.047.734 |

El primer ejercicio cierra con una pérdida de $2.629.936 y el segundo con $2.231.993. No es un defecto del modelo sino su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente —dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A partir de 2029 el resultado es positivo y creciente.

### Flujo de fondos y evaluación

### Cuadro 13. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.629.936 | $-2.231.993 | $12.285.748 | $28.265.507 | $66.479.770 | $66.811.342 | $78.624.599 | $91.896.208 | $94.407.712 | $110.047.734 |
| (+) Depreciación y amortizacion | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.149.294 | $2.213.773 | $2.280.186 | $2.348.592 |
| (-) Cuota de capital del préstamo | $1.693.906 | $1.897.175 | $2.124.836 | $2.379.816 | $2.665.394 | $2.985.242 | $3.343.471 | $3.744.687 | $4.194.049 | $4.697.335 |
| **(=) Flujo de fondos** | $-1.483.842 | $-1.289.168 | $13.000.912 | $28.725.690 | $66.654.376 | $65.912.794 | $77.430.423 | $90.365.294 | $92.493.848 | $107.698.991 |
| Caja acumulada | $11.335.318 | $10.046.151 | $23.047.062 | $51.772.752 | $118.427.128 | $184.339.922 | $261.770.345 | $352.135.639 | $444.629.487 | $552.328.478 |

La caja nunca baja de $10.046.151, que ocurre en 2028. Ese es el piso que el capital de trabajo fue dimensionado para sostener.

### Cuadro 14. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $29.725.912 | — | — |
| VAN al 20 % | $116.325.391 | VAN > 0 | Cumple |
| TIR efectiva anual | 54,03 % | TIR > 20 % | Cumple |
| Payback simple | 3,68 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,39 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $10.046.151 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

Los cuatro indicadores cumplen su criterio. El VAN de $116.325.391 indica excedente económico después de remunerar el capital al 20 % anual; la TIR de 54,03 % supera esa exigencia en 34,03 puntos porcentuales; y la inversión se recupera en 3,68 años nominales o 4,39 descontados, dentro del plazo de cinco años que el proyecto se fijó como criterio.

### Cuadro 15. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $345.896.895 | Positivo |
| 8 % | $276.286.666 | Positivo |
| 10 % | $238.479.871 | Positivo |
| 15 % | $166.179.843 | Positivo |
| 20 % | $116.325.391 | Positivo |
| 30 % | $55.904.665 | Positivo |
| 40 % | $23.587.817 | Positivo |
| 50 % | $5.133.720 | Positivo |
| TIR: 54,03 % | $0 | VAN aproximadamente cero |

El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

### Análisis de sensibilidad y punto de quiebre

Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y **manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que cambia una proyección.

### Cuadro 16. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $449.337 | $-2.629.936 | $116.325.391 | 54,0 % | $10.046.151 |
| Ventas -10 % | $449.337 | $-7.478.390 | $63.246.795 | 39,2 % | $-3.534.896 |
| Ventas -25 % | $449.337 | $-14.751.072 | $-18.551.328 | 13,9 % | $-45.709.095 |
| Ventas -35 % | $449.337 | $-19.599.527 | $-78.587.038 | -9,4 % | $-89.478.772 |
| Ventas +20 % | $449.337 | $6.183.602 | $222.584.423 | 81,9 % | $20.118.007 |
| BOM +15 % | $449.337 | $-4.927.732 | $91.083.026 | 46,8 % | $3.597.203 |
| BOM +30 % | $449.337 | $-7.225.528 | $65.601.983 | 39,5 % | $-2.851.745 |
| Precio rebajado a $449.990 | $449.990 | $-2.526.643 | $117.450.296 | 54,3 % | $10.335.628 |
| Precio rebajado a $424.990 | $424.990 | $-6.478.324 | $74.147.113 | 42,2 % | $-738.957 |
| Precio rebajado a $399.990 | $399.990 | $-10.430.005 | $30.136.289 | 29,3 % | $-17.025.757 |
| Precio rebajado a $349.990 | $349.990 | $-18.333.366 | $-61.714.629 | -1,6 % | $-77.757.668 |

Tres lecturas se desprenden del cuadro:

- **El punto de quiebre del volumen está entre una caída del 10 % y una del 25 % en las ventas.** Con −10 % el VAN sigue positivo en $66.895.594 pero la caja se vuelve negativa, de modo que el proyecto destruiría liquidez antes de destruir valor: la restricción que muerde primero es de caja, no de rentabilidad.
- **El costo de materiales admite desviación.** Un alza del 15 % en la BOM deja el VAN en $93.063.006 y la caja positiva; recién a +30 % la caja se estrecha. El margen técnico resiste, pero confirma que la cotización de la sonda no admite descuido.
- **El precio no admite rebaja.** El punto de quiebre está cerca de $399.990. Y el dato decisivo: **al precio de $349.990 que proponía la versión anterior de este estudio, el proyecto arroja un VAN negativo y una caja que nunca se recupera.** Ese resultado es la justificación numérica del cambio de precio, y la razón por la que el precio debe derivarse del costo y no fijarse por aspiración comercial.

### Costo total de propiedad para el agricultor

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el argumento sobre un supuesto cómodo.

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $449.337 | $474.327 | $474.327 | $948.653 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como tales en el cuadro de supuestos al final de esta sección.

Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: $449.337 de compra frente a $200.000 de laboratorio. El cruce ocurre durante el tercer año frente al laboratorio, y a diez años la diferencia es de $2.000.000 contra $948.653, una ventaja de 2,1 veces. Frente a la asesoría la ventaja es más estrecha, de 1,3 veces. Bajo uso intensivo las distancias se abren a 10,5 y 7,6 veces respectivamente.

El precio más alto estrecha esta comparación respecto de la versión anterior del estudio, y corresponde declararlo en lugar de disimularlo. Pero el argumento estructural no cambia y no depende del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo que cada una le cuesta $949 frente a los $50.000 de una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene herramienta.

