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

### Cuadro 2. Costeo de la carcasa impresa en taller propio

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 200 g a $25.000/kg | $5.000 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $750 | estimación de taller |
| Energía, ~1 kWh por carcasa a $160/kWh | $160 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$6.900** |  |

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

### Cuadro 6. Inversión inicial total

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $9.000.000 | 30,3 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses de estructura) | $12.819.160 | 43,1 % |
| Inventario inicial (2 meses de ventas) | $2.706.752 | 9,1 % |
| **Inversión inicial total** | **$29.725.912** | **100,0 %** |

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

### Cuadro 13. Flujo de fondos para la evaluación del proyecto

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.629.936 | $-2.231.993 | $12.285.748 | $28.265.507 | $66.479.770 | $66.811.342 | $78.624.599 | $91.896.208 | $94.407.712 | $110.047.734 |
| (+) Depreciación y amortizacion | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.149.294 | $2.213.773 | $2.280.186 | $2.348.592 |
| (-) Cuota de capital del préstamo | $1.693.906 | $1.897.175 | $2.124.836 | $2.379.816 | $2.665.394 | $2.985.242 | $3.343.471 | $3.744.687 | $4.194.049 | $4.697.335 |
| **(=) Flujo de fondos** | $-1.483.842 | $-1.289.168 | $13.000.912 | $28.725.690 | $66.654.376 | $65.912.794 | $77.430.423 | $90.365.294 | $92.493.848 | $107.698.991 |
| Caja acumulada | $11.335.318 | $10.046.151 | $23.047.062 | $51.772.752 | $118.427.128 | $184.339.922 | $261.770.345 | $352.135.639 | $444.629.487 | $552.328.478 |

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
