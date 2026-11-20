### Cuadro 1. Economías del análisis

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

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

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (cota conservadora: material de la carcasa de laboratorio de 110 × 100 × 40 mm; la carcasa del instrumento mide 99 × 87 × 31 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, 1,05 kWh por carcasa (K1C, 262 W promedio durante 4 h) a $200/kWh | $210 | tarifa BT1 de referencia, $180-$220/kWh |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.238** |  |

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

### Cuadro 6. Activo nominal (gastos de puesta en marcha)

| Partida | Neto CLP |
|---|---:|
| Constitución de sociedad, trámites legales y marca | $700.000 |
| Prototipado electrónico (tres rondas de PCB portadora) | $1.100.000 |
| Prototipado mecánico (carcasa, juntas, estanqueidad) | $450.000 |
| Firmware del ESP32 | $900.000 |
| Aplicación móvil y consola web | $800.000 |
| Metrología y campaña de validación (30 muestras pareadas) | $2.175.000 |
| Ensayo IP67 en laboratorio acreditado | $475.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $1.300.000 |
| **Total activo nominal** | **$7.900.000** |
| Amortización anual (5 años) | $1.580.000 |

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $5.930.988 | 19,7 % |
| Activo nominal (puesta en marcha) | $7.900.000 | 26,2 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 42,2 % |
| Inventario inicial (2 meses de ventas) | $3.575.022 | 11,9 % |
| **Inversión inicial total** | **$30.125.795** | **100,0 %** |

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $30.125.795 |
| Monto del préstamo (capital), desembolsado íntegro por el banco | $30.125.795 |
| Pie de los socios, con capital propio | $9.000.000 |
| Aporte por socio (2 socios, partes iguales) | $4.500.000 |
| Destino del pie | Abono al banco el día del desembolso como cuotas pagadas por anticipado |
| Cuotas que cubre el pie | 21,3 cuotas mensuales: todo 2027 y hasta septiembre de 2028 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $421.602 |
| Total intereses del crédito | $20.466.443 |
| Total pagado al banco (con el pie incluido) | $50.592.238 |

### Cuadro 9. Fuentes y usos de los fondos al inicio

| Fuentes | Monto | Usos | Monto |
|---|---:|---|---:|
| Crédito bancario | $30.125.795 | Inversión inicial | $30.125.795 |
| Pie de los socios | $9.000.000 | Cuotas pagadas por anticipado | $9.000.000 |
| **Total fuentes** | **$39.125.795** | **Total usos** | **$39.125.795** |

### Cuadro 10. Matriz de decisión de las alternativas de financiamiento

| Criterio | Peso | Crédito bancario con pie propio | Crédito con garantía FOGAPE | Capital Semilla Emprende (Sercotec) | Semilla Inicia (CORFO) |
|---|---:|---:|---:|---:|---:|
| Certeza de obtener los fondos | 35 % | 4 | 2 | 1 | 1 |
| Suficiencia del monto frente a la inversión | 25 % | 5 | 5 | 1 | 3 |
| Disponibilidad al inicio de la operación | 20 % | 5 | 3 | 2 | 2 |
| Costo financiero | 10 % | 2 | 3 | 5 | 5 |
| Libertad de uso y control de la empresa | 10 % | 5 | 4 | 3 | 2 |
| **Puntaje ponderado** |  | **4,35** | **3,25** | **1,80** | **2,20** |

### Cuadro 11. Tabla de amortización del crédito

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Pagada con el pie | Pagada por la empresa | Saldo final |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2027 | $30.125.795 | $1.716.693 | $3.342.531 | $5.059.224 | $5.059.224 | $0 | $28.409.102 |
| 2028 | $28.409.102 | $1.922.696 | $3.136.527 | $5.059.224 | $3.940.776 | $1.118.448 | $26.486.405 |
| 2029 | $26.486.405 | $2.153.420 | $2.905.804 | $5.059.224 | $0 | $5.059.224 | $24.332.985 |
| 2030 | $24.332.985 | $2.411.830 | $2.647.393 | $5.059.224 | $0 | $5.059.224 | $21.921.155 |
| 2031 | $21.921.155 | $2.701.250 | $2.357.974 | $5.059.224 | $0 | $5.059.224 | $19.219.905 |
| 2032 | $19.219.905 | $3.025.400 | $2.033.824 | $5.059.224 | $0 | $5.059.224 | $16.194.505 |
| 2033 | $16.194.505 | $3.388.448 | $1.670.776 | $5.059.224 | $0 | $5.059.224 | $12.806.057 |
| 2034 | $12.806.057 | $3.795.062 | $1.264.162 | $5.059.224 | $0 | $5.059.224 | $9.010.995 |
| 2035 | $9.010.995 | $4.250.469 | $808.755 | $5.059.224 | $0 | $5.059.224 | $4.760.526 |
| 2036 | $4.760.526 | $4.760.526 | $298.698 | $5.059.224 | $0 | $5.059.224 | $0 |
| **Total** |  | **$30.125.795** | **$20.466.443** | **$50.592.238** | **$9.000.000** | **$41.592.238** |  |

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

### Cuadro 14. Desglose estimado de servicios básicos mensuales

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $60.000 | $20.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$330.000** | **$110.000** |

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

### Cuadro 17. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $82.351.261 | $148.438.147 | $218.416.131 | $292.459.199 | $393.920.044 | $425.785.859 | $460.684.069 | $498.305.782 | $538.813.383 | $582.914.711 |
| (-) Costos operacionales | $26.350.032 | $47.495.932 | $69.886.872 | $93.578.521 | $126.043.070 | $136.239.213 | $147.405.635 | $159.443.500 | $172.404.766 | $186.515.920 |
| (-) Gastos de estructura | $50.879.140 | $93.587.254 | $123.193.769 | $149.499.182 | $166.401.124 | $187.885.523 | $195.759.168 | $203.741.652 | $227.670.820 | $236.536.391 |
| (-) Depreciación | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Amortización del activo nominal | $1.580.000 | $1.580.000 | $1.580.000 | $1.580.000 | $1.580.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.342.531 | $3.136.527 | $2.905.804 | $2.647.393 | $2.357.974 | $2.033.824 | $1.670.776 | $1.264.162 | $808.755 | $298.698 |
| **(=) Utilidad antes de impuesto** | $-986.639 | $1.452.236 | $19.663.488 | $43.967.904 | $96.351.679 | $98.252.171 | $114.473.362 | $132.481.341 | $136.553.915 | $158.188.574 |
| (-) Impuesto a la renta | $0 | $69.839 | $4.915.872 | $10.991.976 | $24.087.920 | $24.563.043 | $28.618.341 | $33.120.335 | $34.138.479 | $39.547.143 |
| **(=) Utilidad del ejercicio** | $-986.639 | $1.382.397 | $14.747.616 | $32.975.928 | $72.263.759 | $73.689.128 | $85.855.022 | $99.361.006 | $102.415.437 | $118.641.430 |

### Cuadro 18. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-986.639 | $1.382.397 | $14.747.616 | $32.975.928 | $72.263.759 | $73.689.128 | $85.855.022 | $99.361.006 | $102.415.437 | $118.641.430 |
| (+) Depreciación y amortización | $2.766.198 | $2.766.198 | $2.766.198 | $2.766.198 | $2.766.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Cuota de capital del préstamo | $1.716.693 | $1.922.696 | $2.153.420 | $2.411.830 | $2.701.250 | $3.025.400 | $3.388.448 | $3.795.062 | $4.250.469 | $4.760.526 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $6.875.641 | $0 | $0 | $0 | $0 |
| (+) Cuota ya pagada con el pie | $5.059.224 | $3.940.776 | $0 | $0 | $0 | $0 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $5.122.089 | $6.166.674 | $15.360.394 | $33.330.295 | $72.328.707 | $65.163.216 | $83.841.702 | $96.941.072 | $99.540.095 | $115.256.033 |
| Caja acumulada | $17.841.874 | $24.008.548 | $39.368.941 | $72.699.237 | $145.027.944 | $210.191.159 | $294.032.861 | $390.973.933 | $490.514.028 | $605.770.061 |

### Cuadro 19. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Desembolso inicial evaluado (inversión $30.125.795 + pie $9.000.000) | $39.125.795 | — | — |
| VAN al 20 % | $129.128.199 | VAN > 0 | Cumple |
| TIR efectiva anual | 54,69 % | TIR > 20 % | Cumple |
| Payback simple | 3,37 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,19 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $17.841.874 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

### Cuadro 20. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $23.455.064 | $129.128.199 |
| TIR efectiva anual | 35,42 % | 54,69 % |
| Caja acumulada al cierre | $145.027.944 | $605.770.061 |
| Deuda bancaria pendiente al cierre | $19.219.905 | $0 |

### Cuadro 21. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $377.452.676 | Positivo |
| 8 % | $302.361.475 | Positivo |
| 10 % | $261.524.661 | Positivo |
| 15 % | $183.273.952 | Positivo |
| 20 % | $129.128.199 | Positivo |
| 30 % | $63.097.627 | Positivo |
| 40 % | $27.380.523 | Positivo |
| 50 % | $6.687.740 | Positivo |
| TIR: 54,69 % | $0 | VAN aproximadamente cero |

### Cuadro 22. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $489.990 | $-986.639 | $129.128.199 | 54,7 % | $17.841.874 |
| Ventas -10 % | $489.990 | $-5.947.097 | $75.070.602 | 41,2 % | $10.185.618 |
| Ventas -25 % | $489.990 | $-13.387.782 | $-7.845.830 | 17,5 % | $-23.509.868 |
| Ventas -35 % | $489.990 | $-18.348.239 | $-66.512.715 | -3,4 % | $-68.101.235 |
| Ventas +20 % | $489.990 | $7.817.490 | $237.993.197 | 79,4 % | $26.725.335 |
| BOM +15 % | $489.990 | $-4.080.329 | $95.217.494 | 46,1 % | $14.804.354 |
| BOM +30 % | $489.990 | $-7.174.019 | $61.004.369 | 37,1 % | $6.713.015 |
| Precio rebajado a $469.990 (−4,1 %) | $469.990 | $-4.147.984 | $94.680.788 | 46,1 % | $14.680.529 |
| Precio rebajado a $439.990 (−10,2 %) | $439.990 | $-8.890.001 | $42.341.514 | 32,3 % | $1.243.793 |
| Precio rebajado a $419.990 (−14,3 %) | $419.990 | $-12.051.345 | $6.925.056 | 22,1 % | $-16.000.551 |
| Precio rebajado a $389.990 (−20,4 %) | $389.990 | $-16.793.362 | $-47.908.571 | 4,0 % | $-53.680.202 |

### Cuadro 23. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $489.990 | $514.980 | $514.980 | $1.029.960 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
