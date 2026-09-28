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
| Carcasa PETG impresa en taller propio | 1 | $6.900 | $6.900 | costeo propio, detallado en la tabla siguiente |
| Placa de desarrollo ESP32 DevKit WROOM-32 | 1 | $4.800 | $4.800 | AliExpress Choice $3.506-$6.600; en Chile $8.148 con IVA |
| Batería LiPo 3,7 V 2.000 mAh con protección | 1 | $4.400 | $4.400 | AliExpress: $4.784 unitaria, $4.350 por unidad en pack de 10 |
| PCB portadora de 2 capas, fabricación y envío (sin ensamblar) | 1 | $2.854 | $2.854 | JLCPCB, compra real: lote de 5 placas por US$15,02 con envío e impuestos de aduana, US$3,00 por placa a $950/US$ |
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
| **Total BOM neto por equipo** |  |  | **$70.666** |  |

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 200 g a $25.000/kg | $5.000 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $750 | estimación de taller |
| Energía, ~1 kWh por carcasa a $160/kWh | $160 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$6.900** |  |

### Cuadro 4. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $70.666 |
| Merma de fabricación, 3 % de la BOM | $2.120 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.533 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$82.319** |
| Comisión comercial, 5 % sobre el precio bruto | $22.546 |
| **Costo variable total por equipo** | **$104.866** |

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
| Equipamiento y activo fijo | $9.000.000 | 30,2 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses de estructura) | $12.839.785 | 43,1 % |
| Inventario inicial (2 meses de ventas) | $2.743.976 | 9,2 % |
| **Inversión inicial total** | **$29.783.761** | **100,0 %** |

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.783.761 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $29.783.761 |
| Pie propio exigido por el banco (30 % del crédito) | $8.935.128 |
| Aporte por socio (2 socios, partes iguales) | $4.467.564 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $416.815 |
| Total intereses del crédito | $20.234.077 |
| Total pagado al banco | $50.017.838 |

### Cuadro 9. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $29.783.761 | $1.697.203 | $3.304.581 | $5.001.784 | $28.086.558 |
| 2028 | $28.086.558 | $1.900.867 | $3.100.917 | $5.001.784 | $26.185.691 |
| 2029 | $26.185.691 | $2.128.971 | $2.872.813 | $5.001.784 | $24.056.720 |
| 2030 | $24.056.720 | $2.384.448 | $2.617.336 | $5.001.784 | $21.672.272 |
| 2031 | $21.672.272 | $2.670.581 | $2.331.202 | $5.001.784 | $19.001.691 |
| 2032 | $19.001.691 | $2.991.051 | $2.010.733 | $5.001.784 | $16.010.640 |
| 2033 | $16.010.640 | $3.349.977 | $1.651.807 | $5.001.784 | $12.660.663 |
| 2034 | $12.660.663 | $3.751.975 | $1.249.809 | $5.001.784 | $8.908.688 |
| 2035 | $8.908.688 | $4.202.211 | $799.572 | $5.001.784 | $4.706.477 |
| 2036 | $4.706.477 | $4.706.477 | $295.307 | $5.001.784 | $0 |
| **Total** |  | **$29.783.761** | **$20.234.077** | **$50.017.838** |  |

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
| Materiales y costo variable | $20.973.142 | $37.804.088 | $55.626.015 | $74.483.234 | $100.323.186 | $108.438.742 | $117.326.585 | $126.908.048 | $137.224.485 | $148.456.170 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $72.332.282 | $132.874.541 | $180.347.480 | $225.555.943 | $268.345.043 | $297.993.619 | $314.805.189 | $332.420.718 | $366.719.454 | $386.871.434 |

### Cuadro 14. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.578.265.702 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.351.745.413 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$378.932** |
| IVA 19 % | $71.997 |
| **Precio de lista con IVA** | **$450.929** |

### Cuadro 15. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $75.786.311 | $136.604.826 | $201.004.244 | $269.144.683 | $362.517.185 | $391.842.693 | $423.958.858 | $458.581.410 | $495.859.791 | $536.445.411 |
| (-) Costos operacionales | $20.973.142 | $37.804.088 | $55.626.015 | $74.483.234 | $100.323.186 | $108.438.742 | $117.326.585 | $126.908.048 | $137.224.485 | $148.456.170 |
| (-) Gastos de estructura | $51.359.140 | $95.070.454 | $124.721.465 | $151.072.709 | $168.021.857 | $189.554.877 | $197.478.603 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Amortización del activo nominal | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.304.581 | $3.100.917 | $2.872.813 | $2.617.336 | $2.331.202 | $2.010.733 | $1.651.807 | $1.249.809 | $799.572 | $295.307 |
| **(=) Utilidad antes de impuesto** | $-2.690.551 | $-2.210.632 | $14.943.952 | $38.131.404 | $89.000.939 | $89.751.647 | $105.415.169 | $122.824.190 | $126.254.072 | $147.191.977 |
| (-) Impuesto a la renta | $0 | $0 | $2.510.692 | $9.532.851 | $22.250.235 | $22.437.912 | $26.353.792 | $30.706.047 | $31.563.518 | $36.797.994 |
| **(=) Utilidad del ejercicio** | $-2.690.551 | $-2.210.632 | $12.433.259 | $28.598.553 | $66.750.705 | $67.313.735 | $79.061.377 | $92.118.142 | $94.690.554 | $110.393.983 |

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.690.551 | $-2.210.632 | $12.433.259 | $28.598.553 | $66.750.705 | $67.313.735 | $79.061.377 | $92.118.142 | $94.690.554 | $110.393.983 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Cuota de capital del préstamo | $1.697.203 | $1.900.867 | $2.128.971 | $2.384.448 | $2.670.581 | $2.991.051 | $3.349.977 | $3.751.975 | $4.202.211 | $4.706.477 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $10.433.467 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-1.547.754 | $-1.271.499 | $13.144.288 | $29.054.105 | $66.920.123 | $55.975.911 | $77.798.093 | $90.452.861 | $92.575.036 | $107.774.199 |
| Caja acumulada | $11.292.031 | $10.020.532 | $23.164.821 | $52.218.926 | $119.139.049 | $175.114.960 | $252.913.053 | $343.365.914 | $435.940.950 | $543.715.149 |

### Cuadro 17. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $29.783.761 | — | — |
| VAN al 20 % | $113.397.717 | VAN > 0 | Cumple |
| TIR efectiva anual | 53,43 % | TIR > 20 % | Cumple |
| Payback simple | 3,67 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,38 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $10.020.532 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $16.555.236 | $113.397.717 |
| TIR efectiva anual | 32,29 % | 53,43 % |
| Caja acumulada al cierre | $119.139.049 | $543.715.149 |
| Deuda bancaria pendiente al cierre | $19.001.691 | $0 |

### Cuadro 19. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $339.400.482 | Positivo |
| 8 % | $270.796.233 | Positivo |
| 10 % | $233.559.403 | Positivo |
| 15 % | $162.406.474 | Positivo |
| 20 % | $113.397.717 | Positivo |
| 30 % | $54.083.683 | Positivo |
| 40 % | $22.408.104 | Positivo |
| 50 % | $4.339.443 | Positivo |
| TIR: 53,43 % | $0 | VAN aproximadamente cero |

### Cuadro 20. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $450.929 | $-2.690.551 | $113.397.717 | 53,4 % | $10.020.532 |
| Ventas -10 % | $450.929 | $-7.541.423 | $60.297.496 | 38,4 % | $-3.567.196 |
| Ventas -25 % | $450.929 | $-14.817.731 | $-21.492.510 | 12,8 % | $-45.173.290 |
| Ventas -35 % | $450.929 | $-19.668.603 | $-81.373.293 | -10,7 % | $-91.196.331 |
| Ventas +20 % | $450.929 | $6.134.793 | $219.705.256 | 81,5 % | $20.086.103 |
| BOM +15 % | $450.929 | $-5.022.469 | $87.780.451 | 46,1 % | $3.475.821 |
| BOM +30 % | $450.929 | $-7.354.386 | $61.921.028 | 38,6 % | $-3.068.891 |
| Precio rebajado a $429.990 (−4,6 %) | $429.990 | $-6.000.250 | $77.160.354 | 43,2 % | $745.101 |
| Precio rebajado a $409.990 (−9,1 %) | $409.990 | $-9.161.595 | $42.112.953 | 33,0 % | $-9.622.412 |
| Precio rebajado a $379.990 (−15,7 %) | $379.990 | $-13.903.612 | $-11.303.894 | 16,3 % | $-36.723.616 |
| Precio rebajado a $359.990 (−20,2 %) | $359.990 | $-17.064.956 | $-48.326.404 | 3,3 % | $-65.195.041 |

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $450.929 | $475.919 | $475.919 | $951.837 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
