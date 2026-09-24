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
| PCB portadora de 2 capas, fabricación y envío | 1 | $2.000 | $2.000 | JLCPCB, estimación propia a volumen de 200 unidades |
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
| Fusible 1 A (0603) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Diodo rectificador M7 (SMA), protección contra inversión | 1 | $4 | $4 | LCSC, verificado en US$0,0042 |
| Flete de los componentes LCSC, prorrateado por equipo | 1 | $150 | $150 | LCSC cobra el envío; prorrateado a 200 unidades |
| **Total BOM neto por equipo** |  |  | **$69.672** |  |

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
| Materiales y servicios de la BOM | $69.672 |
| Merma de fabricación, 3 % de la BOM | $2.090 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.484 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$81.246** |
| Comisión comercial, 5 % sobre el precio bruto | $22.470 |
| **Costo variable total por equipo** | **$103.716** |

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
| Equipamiento y activo fijo | $9.000.000 | 30,3 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses de estructura) | $12.819.160 | 43,1 % |
| Inventario inicial (2 meses de ventas) | $2.708.192 | 9,1 % |
| **Inversión inicial total** | **$29.727.352** | **100,0 %** |

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.727.352 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $29.727.352 |
| Pie propio exigido por el banco (30 % del crédito) | $8.918.206 |
| Aporte por socio (2 socios, partes iguales) | $4.459.103 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $416.026 |
| Total intereses del crédito | $20.195.755 |
| Total pagado al banco | $49.923.107 |

### Cuadro 9. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $29.727.352 | $1.693.988 | $3.298.322 | $4.992.311 | $28.033.364 |
| 2028 | $28.033.364 | $1.897.267 | $3.095.044 | $4.992.311 | $26.136.097 |
| 2029 | $26.136.097 | $2.124.939 | $2.867.372 | $4.992.311 | $24.011.158 |
| 2030 | $24.011.158 | $2.379.932 | $2.612.379 | $4.992.311 | $21.631.226 |
| 2031 | $21.631.226 | $2.665.523 | $2.326.787 | $4.992.311 | $18.965.703 |
| 2032 | $18.965.703 | $2.985.386 | $2.006.924 | $4.992.311 | $15.980.317 |
| 2033 | $15.980.317 | $3.343.633 | $1.648.678 | $4.992.311 | $12.636.684 |
| 2034 | $12.636.684 | $3.744.868 | $1.247.442 | $4.992.311 | $8.891.816 |
| 2035 | $8.891.816 | $4.194.253 | $798.058 | $4.992.311 | $4.697.563 |
| 2036 | $4.697.563 | $4.697.563 | $294.748 | $4.992.311 | $0 |
| **Total** |  | **$29.727.352** | **$20.195.755** | **$49.923.107** |  |

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
| 2027 | $600.000 | $1.000.000 | — | — | $2.200.000 | 23,5 % | $32.606.640 |
| 2028 | $700.000 | $1.030.000 | — | $721.000 | $3.151.000 | 24,5 % | $47.079.721 |
| 2029 | $850.000 | $1.060.900 | $1.060.900 | $742.630 | $4.564.430 | 25,5 % | $68.745.793 |
| 2030 | $1.000.000 | $1.092.727 | $1.092.727 | $764.909 | $5.715.272 | 26,5 % | $86.764.684 |
| 2031 | $1.200.000 | $1.125.509 | $1.125.509 | $787.856 | $6.226.730 | 27,0 % | $94.902.837 |
| 2032 | $1.236.000 | $1.159.274 | $1.159.274 | $811.492 | $7.225.024 | 28,0 % | $110.985.034 |
| 2033 | $1.273.080 | $1.194.052 | $1.194.052 | $835.837 | $7.441.774 | 28,5 % | $114.761.092 |
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
| Materiales y costo variable | $20.743.242 | $37.389.693 | $55.016.263 | $73.666.776 | $99.223.480 | $107.250.076 | $116.040.494 | $125.516.928 | $135.720.281 | $146.828.848 |
| Nómina y cargas | $32.606.640 | $47.079.721 | $68.745.793 | $86.764.684 | $94.902.837 | $110.985.034 | $114.761.092 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $72.019.882 | $132.436.514 | $179.851.839 | $225.088.116 | $267.475.726 | $297.332.380 | $313.883.744 | $331.029.598 | $365.215.249 | $385.244.112 |

### Cuadro 14. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.569.577.160 |
| Equipos vendidos en los 10 años | 7.481 |
| Costo medio por equipo | $343.480 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| **Precio neto de venta (año base)** | **$377.655** |
| IVA 19 % | $71.754 |
| **Precio de lista con IVA** | **$449.409** |

### Cuadro 15. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $75.530.918 | $136.144.479 | $200.326.877 | $268.237.688 | $361.295.532 | $390.522.215 | $422.530.151 | $457.036.029 | $494.188.785 | $534.637.635 |
| (-) Costos operacionales | $20.743.242 | $37.389.693 | $55.016.263 | $73.666.776 | $99.223.480 | $107.250.076 | $116.040.494 | $125.516.928 | $135.720.281 | $146.828.848 |
| (-) Gastos de estructura | $51.276.640 | $95.046.821 | $124.835.576 | $151.421.341 | $168.252.246 | $190.082.304 | $197.843.250 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Amortización del activo nominal | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.298.322 | $3.095.044 | $2.867.372 | $2.612.379 | $2.326.787 | $2.006.924 | $1.648.678 | $1.247.442 | $798.058 | $294.748 |
| **(=) Utilidad antes de impuesto** | $-2.627.286 | $-2.227.079 | $14.767.666 | $37.697.192 | $88.653.019 | $89.096.217 | $104.911.035 | $122.672.295 | $126.088.784 | $147.012.082 |
| (-) Impuesto a la renta | $0 | $0 | $2.478.325 | $9.424.298 | $22.163.255 | $22.274.054 | $26.227.759 | $30.668.074 | $31.522.196 | $36.753.020 |
| **(=) Utilidad del ejercicio** | $-2.627.286 | $-2.227.079 | $12.289.341 | $28.272.894 | $66.489.764 | $66.822.163 | $78.683.277 | $92.004.221 | $94.566.588 | $110.259.061 |

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.627.286 | $-2.227.079 | $12.289.341 | $28.272.894 | $66.489.764 | $66.822.163 | $78.683.277 | $92.004.221 | $94.566.588 | $110.259.061 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Cuota de capital del préstamo | $1.693.988 | $1.897.267 | $2.124.939 | $2.379.932 | $2.665.523 | $2.985.386 | $3.343.633 | $3.744.868 | $4.194.253 | $4.697.563 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $10.433.467 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-1.481.275 | $-1.284.346 | $13.004.402 | $28.732.963 | $66.664.241 | $55.490.003 | $77.426.337 | $90.346.046 | $92.459.029 | $107.648.192 |
| Caja acumulada | $11.337.885 | $10.053.540 | $23.057.942 | $51.790.905 | $118.455.145 | $173.945.149 | $251.371.486 | $341.717.532 | $434.176.561 | $541.824.753 |

### Cuadro 17. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $29.727.352 | — | — |
| VAN al 20 % | $112.827.790 | VAN > 0 | Cumple |
| TIR efectiva anual | 53,35 % | TIR > 20 % | Cumple |
| Payback simple | 3,68 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,39 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $10.053.540 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $16.319.465 | $112.827.790 |
| TIR efectiva anual | 32,16 % | 53,35 % |
| Caja acumulada al cierre | $118.455.145 | $541.824.753 |
| Deuda bancaria pendiente al cierre | $18.965.703 | $0 |

### Cuadro 19. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $338.071.793 | Positivo |
| 8 % | $269.684.711 | Positivo |
| 10 % | $232.569.644 | Positivo |
| 15 % | $161.659.297 | Positivo |
| 20 % | $112.827.790 | Positivo |
| 30 % | $53.745.512 | Positivo |
| 40 % | $22.206.283 | Positivo |
| 50 % | $4.222.095 | Positivo |
| TIR: 53,35 % | $0 | VAN aproximadamente cero |

### Cuadro 20. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $449.409 | $-2.627.286 | $112.827.790 | 53,3 % | $10.053.540 |
| Ventas -10 % | $449.409 | $-7.476.006 | $59.746.693 | 38,3 % | $-3.528.245 |
| Ventas -25 % | $449.409 | $-14.749.085 | $-22.054.319 | 12,6 % | $-45.690.845 |
| Ventas -35 % | $449.409 | $-19.597.805 | $-82.056.548 | -11,0 % | $-92.601.298 |
| Ventas +20 % | $449.409 | $6.186.384 | $219.092.838 | 81,5 % | $20.120.691 |
| BOM +15 % | $449.409 | $-4.926.403 | $87.571.146 | 46,1 % | $3.600.887 |
| BOM +30 % | $449.409 | $-7.225.519 | $62.075.466 | 38,6 % | $-2.851.765 |
| Precio rebajado a $429.990 (−4,3 %) | $429.990 | $-5.696.787 | $79.234.766 | 43,9 % | $1.451.263 |
| Precio rebajado a $399.990 (−11,0 %) | $399.990 | $-10.438.804 | $26.511.277 | 28,3 % | $-17.073.611 |
| Precio rebajado a $379.990 (−15,4 %) | $379.990 | $-13.600.149 | $-9.157.143 | 17,0 % | $-35.129.310 |
| Precio rebajado a $359.990 (−19,9 %) | $359.990 | $-16.761.493 | $-46.093.472 | 4,2 % | $-63.600.735 |

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $449.409 | $474.399 | $474.399 | $948.798 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
