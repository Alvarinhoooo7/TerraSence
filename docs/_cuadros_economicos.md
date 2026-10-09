### Cuadro 1. Economías del análisis

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

### Cuadro 2. Estructura de costos de fabricación (BOM) por equipo

| Bloque del equipo | Líneas | Subtotal neto por equipo | Participación |
|---|---:|---:|---:|
| Sonda | 1 | $44.394 | 55,1 % |
| Celda | 1 | $6.900 | 8,6 % |
| Carcasa | 1 | $7.238 | 9,0 % |
| PCB V3 y ensamble | 3 | $6.312 | 7,8 % |
| MCU y radio | 1 | $2.710 | 3,4 % |
| USB-C y carga | 18 | $1.054 | 1,3 % |
| Alimentación 3,3 V | 1 | $83 | 0,1 % |
| Elevador 5 V | 10 | $614 | 0,8 % |
| RS-485 | 5 | $249 | 0,3 % |
| Sensor ambiental | 2 | $4.613 | 5,7 % |
| Interfaz de usuario | 10 | $382 | 0,5 % |
| Protección y medición de batería | 5 | $730 | 0,9 % |
| Pasivos de desacoplo | 4 | $213 | 0,3 % |
| Montaje y embalaje | 9 | $5.142 | 6,4 % |
| **Total BOM neto por equipo** | **71** | **$80.632** | **100,0 %** |

### Cuadro 3. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 210 g a $25.000/kg (cota conservadora: material de la carcasa de 110 × 100 × 40 mm de la V2; la carcasa V3 mide 73 × 79 × 31 mm) | $5.250 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $788 | estimación de taller |
| Energía, 1,05 kWh por carcasa (K1C, 262 W promedio durante 4 h) a $200/kWh | $210 | tarifa BT1 de referencia, $180-$220/kWh |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$7.238** |  |

### Cuadro 4. Costo variable por equipo

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $80.632 |
| Merma de fabricación, 3 % de la BOM | $2.419 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $4.032 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$93.082** |
| Comisión comercial, 5 % sobre el precio bruto | $23.301 |
| **Costo variable total por equipo** | **$116.384** |

### Cuadro 5. Equipamiento e inversión en activo fijo

| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |
|---|---:|---:|---:|---:|---:|
| Impresora 3D: Creality K1C | 2 | $450.008 | $900.016 | 5 años | $180.003 |
| Estación de soldadura: Hakko FX-888D | 2 | $145.965 | $291.930 | 5 años | $58.386 |
| Estación de aire caliente: Quick 861DW | 1 | $332.702 | $332.702 | 5 años | $66.540 |
| Placa calefactora: UYUE 946-1010 (100 × 100 mm, 400 W, 50–350 °C) | 1 | $45.114 | $45.114 | 5 años | $9.023 |
| Esténcil de ensamble: Esténcil de acero de 0,12 mm para la PCB V3 (con marco) | 2 | $8.865 | $17.730 | 5 años | $3.546 |
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
| Metrología y campaña de validación (30 muestras pareadas) | $1.300.000 |
| Ensayo IP67 en laboratorio acreditado | $475.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $1.300.000 |
| **Total activo nominal** | **$7.025.000** |
| Amortización anual (5 años) | $1.405.000 |

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $5.930.988 | 20,6 % |
| Activo nominal (puesta en marcha) | $7.025.000 | 24,4 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 44,2 % |
| Inventario inicial (2 meses de ventas) | $3.102.740 | 10,8 % |
| **Inversión inicial total** | **$28.778.513** | **100,0 %** |

### Cuadro 8. Condiciones del financiamiento

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $28.778.513 |
| Monto del préstamo (capital), desembolsado íntegro por el banco | $28.778.513 |
| Pie de los socios, con capital propio | $9.000.000 |
| Aporte por socio (2 socios, partes iguales) | $4.500.000 |
| Destino del pie | Abono al banco el día del desembolso como cuotas pagadas por anticipado |
| Cuotas que cubre el pie | 22,3 cuotas mensuales: todo 2027 y hasta octubre de 2028 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $402.747 |
| Total intereses del crédito | $19.551.146 |
| Total pagado al banco (con el pie incluido) | $48.329.660 |

### Cuadro 9. Fuentes y usos de los fondos al inicio

| Fuentes | Monto | Usos | Monto |
|---|---:|---|---:|
| Crédito bancario | $28.778.513 | Inversión inicial | $28.778.513 |
| Pie de los socios | $9.000.000 | Cuotas pagadas por anticipado | $9.000.000 |
| **Total fuentes** | **$37.778.513** | **Total usos** | **$37.778.513** |

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
| 2027 | $28.778.513 | $1.639.920 | $3.193.046 | $4.832.966 | $4.832.966 | $0 | $27.138.594 |
| 2028 | $27.138.594 | $1.836.710 | $2.996.256 | $4.832.966 | $4.167.034 | $665.932 | $25.301.884 |
| 2029 | $25.301.884 | $2.057.115 | $2.775.851 | $4.832.966 | $0 | $4.832.966 | $23.244.769 |
| 2030 | $23.244.769 | $2.303.969 | $2.528.997 | $4.832.966 | $0 | $4.832.966 | $20.940.800 |
| 2031 | $20.940.800 | $2.580.445 | $2.252.521 | $4.832.966 | $0 | $4.832.966 | $18.360.355 |
| 2032 | $18.360.355 | $2.890.099 | $1.942.867 | $4.832.966 | $0 | $4.832.966 | $15.470.256 |
| 2033 | $15.470.256 | $3.236.910 | $1.596.056 | $4.832.966 | $0 | $4.832.966 | $12.233.346 |
| 2034 | $12.233.346 | $3.625.340 | $1.207.626 | $4.832.966 | $0 | $4.832.966 | $8.608.006 |
| 2035 | $8.608.006 | $4.060.380 | $772.586 | $4.832.966 | $0 | $4.832.966 | $4.547.626 |
| 2036 | $4.547.626 | $4.547.626 | $285.340 | $4.832.966 | $0 | $4.832.966 | $0 |
| **Total** |  | **$28.778.513** | **$19.551.146** | **$48.329.660** | **$9.000.000** | **$39.329.660** |  |

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
| Materiales y costo variable | $23.276.717 | $41.956.283 | $61.735.673 | $82.664.066 | $111.342.139 | $120.349.063 | $130.213.098 | $140.846.936 | $152.296.476 | $164.761.787 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.320.000 | $4.078.800 | $4.201.164 | $4.327.199 | $4.457.015 | $4.590.725 | $4.728.447 | $4.870.301 | $5.016.410 | $5.166.902 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $74.155.857 | $135.543.536 | $184.929.442 | $232.163.249 | $277.743.263 | $308.234.585 | $325.972.267 | $344.588.588 | $379.967.295 | $401.298.178 |

### Cuadro 16. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.664.596.260 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.463.975.139 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$391.620** |
| IVA 19 % | $74.408 |
| **Precio de lista con IVA** | **$466.027** |

### Cuadro 17. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $78.323.938 | $141.178.897 | $207.734.663 | $278.156.714 | $374.655.697 | $404.963.140 | $438.154.681 | $473.936.534 | $512.463.143 | $554.407.731 |
| (-) Costos operacionales | $23.276.717 | $41.956.283 | $61.735.673 | $82.664.066 | $111.342.139 | $120.349.063 | $130.213.098 | $140.846.936 | $152.296.476 | $164.761.787 |
| (-) Gastos de estructura | $50.879.140 | $93.587.254 | $123.193.769 | $149.499.182 | $166.401.124 | $187.885.523 | $195.759.168 | $203.741.652 | $227.670.820 | $236.536.391 |
| (-) Depreciación | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Amortización del activo nominal | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.193.046 | $2.996.256 | $2.775.851 | $2.528.997 | $2.252.521 | $1.942.867 | $1.596.056 | $1.207.626 | $772.586 | $285.340 |
| **(=) Utilidad antes de impuesto** | $-1.616.164 | $47.907 | $17.438.172 | $40.873.271 | $92.068.717 | $93.410.559 | $109.211.231 | $126.765.191 | $130.348.134 | $151.449.085 |
| (-) Impuesto a la renta | $0 | $0 | $3.967.479 | $10.218.318 | $23.017.179 | $23.352.640 | $27.302.808 | $31.691.298 | $32.587.034 | $37.862.271 |
| **(=) Utilidad del ejercicio** | $-1.616.164 | $47.907 | $13.470.693 | $30.654.953 | $69.051.537 | $70.057.919 | $81.908.423 | $95.073.894 | $97.761.101 | $113.586.814 |

### Cuadro 18. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-1.616.164 | $47.907 | $13.470.693 | $30.654.953 | $69.051.537 | $70.057.919 | $81.908.423 | $95.073.894 | $97.761.101 | $113.586.814 |
| (+) Depreciación y amortización | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Cuota de capital del préstamo | $1.639.920 | $1.836.710 | $2.057.115 | $2.303.969 | $2.580.445 | $2.890.099 | $3.236.910 | $3.625.340 | $4.060.380 | $4.547.626 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $6.875.641 | $0 | $0 | $0 | $0 |
| (+) Cuota ya pagada con el pie | $4.832.966 | $4.167.034 | $0 | $0 | $0 | $0 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $4.168.080 | $4.969.429 | $14.004.776 | $30.942.182 | $69.062.290 | $61.667.308 | $80.046.641 | $92.823.682 | $95.075.848 | $110.414.316 |
| Caja acumulada | $16.887.865 | $21.857.295 | $35.862.070 | $66.804.252 | $135.866.542 | $197.533.850 | $277.580.491 | $370.404.173 | $465.480.021 | $575.894.337 |

### Cuadro 19. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Desembolso inicial evaluado (inversión $28.778.513 + pie $9.000.000) | $37.778.513 | — | — |
| VAN al 20 % | $120.765.535 | VAN > 0 | Cumple |
| TIR efectiva anual | 53,37 % | TIR > 20 % | Cumple |
| Payback simple | 3,47 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,28 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $16.887.865 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

### Cuadro 20. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $19.927.043 | $120.765.535 |
| TIR efectiva anual | 33,54 % | 53,37 % |
| Caja acumulada al cierre | $135.866.542 | $575.894.337 |
| Deuda bancaria pendiente al cierre | $18.360.355 | $0 |

### Cuadro 21. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $357.167.699 | Positivo |
| 8 % | $285.626.653 | Positivo |
| 10 % | $246.735.830 | Positivo |
| 15 % | $172.255.754 | Positivo |
| 20 % | $120.765.535 | Positivo |
| 30 % | $58.063.701 | Positivo |
| 40 % | $24.225.755 | Positivo |
| 50 % | $4.673.601 | Positivo |
| TIR: 53,37 % | $0 | VAN aproximadamente cero |

### Cuadro 22. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $466.027 | $-1.616.164 | $120.765.535 | 53,4 % | $16.887.865 |
| Ventas -10 % | $466.027 | $-6.486.460 | $67.599.303 | 39,6 % | $8.216.024 |
| Ventas -25 % | $466.027 | $-13.791.905 | $-14.101.162 | 15,4 % | $-28.912.395 |
| Ventas -35 % | $466.027 | $-18.662.201 | $-72.394.692 | -6,1 % | $-72.891.832 |
| Ventas +20 % | $466.027 | $7.108.875 | $227.620.186 | 78,5 % | $25.681.756 |
| BOM +15 % | $466.027 | $-4.276.940 | $91.616.324 | 45,7 % | $14.275.399 |
| BOM +30 % | $466.027 | $-6.937.716 | $62.156.010 | 37,8 % | $6.921.934 |
| Precio rebajado a $439.990 (−5,6 %) | $439.990 | $-5.731.828 | $75.785.328 | 41,7 % | $10.323.146 |
| Precio rebajado a $419.990 (−9,9 %) | $419.990 | $-8.893.172 | $40.764.257 | 32,1 % | $135.287 |
| Precio rebajado a $399.990 (−14,2 %) | $399.990 | $-12.054.517 | $5.347.799 | 21,7 % | $-17.109.058 |
| Precio rebajado a $369.990 (−20,6 %) | $369.990 | $-16.796.534 | $-49.674.254 | 3,0 % | $-55.726.075 |

### Cuadro 23. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $466.027 | $491.017 | $491.017 | $982.035 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
