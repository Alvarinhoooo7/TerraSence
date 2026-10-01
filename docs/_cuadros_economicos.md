### Cuadro 1. Economías del análisis

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

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

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (carcasa de 110 × 100 × 40 mm para la placa de 99,9 × 90 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, ~1,05 kWh por carcasa a $160/kWh | $168 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.196** |  |

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

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $9.000.000 | 30,0 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,3 % |
| Capital de trabajo (3,0 meses de estructura) | $12.839.785 | 42,8 % |
| Inventario inicial (2 meses de ventas) | $2.941.328 | 9,8 % |
| **Inversión inicial total** | **$29.981.113** | **100,0 %** |

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

### Cuadro 12. Desglose estimado de servicios básicos mensuales

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $180.000 | $60.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$450.000** | **$150.000** |

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

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.327.433 | $-1.537.190 | $12.925.709 | $29.611.040 | $68.120.382 | $68.796.741 | $80.668.535 | $93.859.217 | $96.575.904 | $112.436.478 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Cuota de capital del préstamo | $1.708.449 | $1.913.463 | $2.143.078 | $2.400.247 | $2.688.277 | $3.010.870 | $3.372.175 | $3.776.836 | $4.230.056 | $4.737.663 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $10.433.467 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-1.195.882 | $-610.653 | $13.622.631 | $30.050.793 | $68.272.105 | $57.439.098 | $79.383.054 | $92.169.075 | $94.432.541 | $109.785.509 |
| Caja acumulada | $11.643.903 | $11.033.250 | $24.655.881 | $54.706.674 | $122.978.779 | $180.417.876 | $259.800.930 | $351.970.005 | $446.402.546 | $556.188.055 |

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

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $18.410.836 | $117.269.640 |
| TIR efectiva anual | 33,57 % | 54,37 % |
| Caja acumulada al cierre | $122.978.779 | $556.188.055 |
| Deuda bancaria pendiente al cierre | $19.127.599 | $0 |

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

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $460.856 | $485.846 | $485.846 | $971.691 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
