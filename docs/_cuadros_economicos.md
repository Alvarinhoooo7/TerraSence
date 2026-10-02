### Cuadro 1. Economías del análisis

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

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

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (carcasa de 110 × 100 × 40 mm para la placa de 99,9 × 90 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, 1,05 kWh por carcasa (K1C, 262 W promedio durante 4 h) a $200/kWh | $210 | tarifa BT1 de referencia, $180-$220/kWh |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.238** |  |

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

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $6.474.122 | 23,0 % |
| Activo nominal (puesta en marcha) | $5.900.000 | 20,9 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 45,1 % |
| Inventario inicial (2 meses de ventas) | $3.082.735 | 10,9 % |
| **Inversión inicial total** | **$28.176.642** | **100,0 %** |

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
| Electricidad | $60.000 | $20.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$330.000** | **$110.000** |

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

### Cuadro 16. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-1.472.040 | $156.594 | $13.460.675 | $30.677.947 | $69.034.131 | $69.842.602 | $81.675.262 | $94.821.267 | $97.487.252 | $113.289.647 |
| (+) Depreciación y amortización | $2.474.824 | $2.474.824 | $2.474.824 | $2.474.824 | $2.474.824 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 | $1.501.056 |
| (-) Cuota de capital del préstamo | $1.605.622 | $1.798.297 | $2.014.093 | $2.255.784 | $2.526.478 | $2.829.655 | $3.169.214 | $3.549.520 | $3.975.462 | $4.452.517 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $7.505.282 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-602.838 | $833.122 | $13.921.407 | $30.896.988 | $68.982.477 | $61.008.722 | $80.007.105 | $92.772.804 | $95.012.847 | $110.338.186 |
| Caja acumulada | $12.116.947 | $12.950.069 | $26.871.476 | $57.768.463 | $126.750.940 | $187.759.662 | $267.766.767 | $360.539.571 | $455.552.417 | $565.890.603 |

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

### Cuadro 18. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $22.578.598 | $123.149.158 |
| TIR efectiva anual | 37,34 % | 57,52 % |
| Caja acumulada al cierre | $126.750.940 | $565.890.603 |
| Deuda bancaria pendiente al cierre | $17.976.368 | $0 |

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

### Cuadro 21. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $465.021 | $490.011 | $490.011 | $980.022 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
