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
| Comisión comercial, 5 % sobre el precio bruto | $24.489 |
| **Costo variable total por equipo** | **$131.740** |

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
| Metrología y campaña de validación (30 muestras pareadas) | $1.300.000 |
| Ensayo IP67 en laboratorio acreditado | $475.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $1.300.000 |
| **Total activo nominal** | **$7.025.000** |
| Amortización anual (5 años) | $1.405.000 |

### Cuadro 7. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $5.930.988 | 20,3 % |
| Activo nominal (puesta en marcha) | $7.025.000 | 24,0 % |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 | 43,5 % |
| Inventario inicial (2 meses de ventas) | $3.575.022 | 12,2 % |
| **Inversión inicial total** | **$29.250.795** | **100,0 %** |

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
| Materiales y costo variable | $26.347.967 | $47.492.211 | $69.881.396 | $93.571.189 | $126.033.194 | $136.228.538 | $147.394.086 | $159.431.007 | $172.391.258 | $186.501.307 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.320.000 | $4.078.800 | $4.201.164 | $4.327.199 | $4.457.015 | $4.590.725 | $4.728.447 | $4.870.301 | $5.016.410 | $5.166.902 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $77.227.107 | $141.079.465 | $193.075.165 | $243.070.372 | $292.434.318 | $324.114.061 | $343.153.254 | $363.172.659 | $400.062.078 | $423.037.698 |

### Cuadro 16. Determinación del precio de venta

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.800.426.177 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.640.554.030 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$411.583** |
| IVA 19 % | $78.201 |
| **Precio de lista con IVA** | **$489.784** |

### Cuadro 17. Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $82.316.563 | $148.375.604 | $218.324.103 | $292.335.974 | $393.754.070 | $425.606.458 | $460.489.965 | $498.095.826 | $538.586.360 | $582.669.106 |
| (-) Costos operacionales | $26.347.967 | $47.492.211 | $69.881.396 | $93.571.189 | $126.033.194 | $136.228.538 | $147.394.086 | $159.431.007 | $172.391.258 | $186.501.307 |
| (-) Gastos de estructura | $50.879.140 | $93.587.254 | $123.193.769 | $149.499.182 | $166.401.124 | $187.885.523 | $195.759.168 | $203.741.652 | $227.670.820 | $236.536.391 |
| (-) Depreciación | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.186.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Amortización del activo nominal | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $1.405.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.245.447 | $3.045.427 | $2.821.405 | $2.570.500 | $2.289.487 | $1.974.752 | $1.622.248 | $1.227.445 | $785.264 | $290.023 |
| **(=) Utilidad antes de impuesto** | $-747.189 | $1.659.515 | $19.836.335 | $44.103.905 | $96.439.067 | $98.142.517 | $114.339.334 | $132.320.594 | $136.363.890 | $157.966.258 |
| (-) Impuesto a la renta | $0 | $136.849 | $4.959.084 | $11.025.976 | $24.109.767 | $24.535.629 | $28.584.834 | $33.080.149 | $34.090.972 | $39.491.564 |
| **(=) Utilidad del ejercicio** | $-747.189 | $1.522.666 | $14.877.251 | $33.077.929 | $72.329.301 | $73.606.888 | $85.754.501 | $99.240.446 | $102.272.917 | $118.474.693 |

### Cuadro 18. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-747.189 | $1.522.666 | $14.877.251 | $33.077.929 | $72.329.301 | $73.606.888 | $85.754.501 | $99.240.446 | $102.272.917 | $118.474.693 |
| (+) Depreciación y amortización | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $2.591.198 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 | $1.375.128 |
| (-) Cuota de capital del préstamo | $1.666.832 | $1.866.852 | $2.090.874 | $2.341.779 | $2.622.793 | $2.937.528 | $3.290.031 | $3.684.835 | $4.127.015 | $4.622.257 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $6.875.641 | $0 | $0 | $0 | $0 |
| (+) Cuota ya pagada con el pie | $4.912.279 | $4.087.721 | $0 | $0 | $0 | $0 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $5.089.455 | $6.334.732 | $15.377.575 | $33.327.347 | $72.297.706 | $65.168.848 | $83.839.598 | $96.930.739 | $99.521.031 | $115.227.565 |
| Caja acumulada | $17.809.240 | $24.143.973 | $39.521.547 | $72.848.894 | $145.146.600 | $210.315.448 | $294.155.045 | $391.085.785 | $490.606.815 | $605.834.380 |

### Cuadro 19. Evaluación económica

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Desembolso inicial evaluado (inversión $29.250.795 + pie $9.000.000) | $38.250.795 | — | — |
| VAN al 20 % | $130.079.377 | VAN > 0 | Cumple |
| TIR efectiva anual | 55,43 % | TIR > 20 % | Cumple |
| Payback simple | 3,34 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,16 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $17.809.240 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

### Cuadro 20. Comparación del horizonte de evaluación: cinco y diez años

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $24.415.639 | $130.079.377 |
| TIR efectiva anual | 36,29 % | 55,43 % |
| Caja acumulada al cierre | $145.146.600 | $605.834.380 |
| Deuda bancaria pendiente al cierre | $18.661.665 | $0 |

### Cuadro 21. VAN ante distintas tasas de descuento

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $378.403.104 | Positivo |
| 8 % | $303.314.730 | Positivo |
| 10 % | $262.478.749 | Positivo |
| 15 % | $184.227.659 | Positivo |
| 20 % | $130.079.377 | Positivo |
| 30 % | $64.041.107 | Positivo |
| 40 % | $28.315.629 | Positivo |
| 50 % | $7.615.081 | Positivo |
| TIR: 55,43 % | $0 | VAN aproximadamente cero |

### Cuadro 22. Análisis de sensibilidad y punto de quiebre

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $489.784 | $-747.189 | $130.079.377 | 55,4 % | $17.809.240 |
| Ventas -10 % | $489.784 | $-5.704.383 | $76.054.584 | 41,8 % | $10.397.198 |
| Ventas -25 % | $489.784 | $-13.140.174 | $-6.775.267 | 17,8 % | $-23.202.455 |
| Ventas -35 % | $489.784 | $-18.097.368 | $-65.368.234 | -3,3 % | $-67.704.486 |
| Ventas +20 % | $489.784 | $8.021.298 | $238.872.572 | 80,5 % | $26.657.060 |
| BOM +15 % | $489.784 | $-3.840.879 | $96.150.576 | 46,7 % | $14.771.721 |
| BOM +30 % | $489.784 | $-6.934.569 | $61.952.391 | 37,6 % | $6.915.449 |
| Precio rebajado a $469.990 (−4,0 %) | $469.990 | $-3.875.901 | $95.969.262 | 46,8 % | $14.680.529 |
| Precio rebajado a $439.990 (−10,2 %) | $439.990 | $-8.617.917 | $43.670.308 | 32,8 % | $1.684.626 |
| Precio rebajado a $419.990 (−14,2 %) | $419.990 | $-11.779.262 | $8.253.850 | 22,5 % | $-15.559.718 |
| Precio rebajado a $389.990 (−20,4 %) | $389.990 | $-16.521.279 | $-46.522.974 | 4,3 % | $-53.092.424 |

### Cuadro 23. Costo total de propiedad para el agricultor

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $489.784 | $514.774 | $514.774 | $1.029.547 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |
