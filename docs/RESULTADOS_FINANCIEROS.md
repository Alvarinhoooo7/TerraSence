# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

Precio inicial con IVA: **$349.990**; neto: $294.109. BOM neto provisional: **$76.761**.
Pie propio de los socios: **$9.000.000** ($4.500.000 cada socio, 50 % y 50 %), equivalente al **30 % del crédito**. Crédito bancario solicitado: **$30.000.000** a 10 años, 12 % efectivo anual (0,9489 % mensual), cuota fija de $419.842. Total de fuentes: **$39.000.000**.
Desembolso inicial: $11.264.748; gastos crédito: $600.000; caja inicial: $27.135.252 (incluye reserva; no sumar otra vez).

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $5.381.535 | $5.038.098 | $26.711.077 | $10.425.999 | 0.92 | 0 | 0 | 172 / 199 |
| 2028 | 350 | $20.734.413 | $5.038.098 | $40.377.446 | $14.131.862 | 3.71 | 0.5 | 0 | 243 / 269 |
| 2029 | 500 | $34.209.899 | $5.038.098 | $61.047.265 | $18.745.077 | 5.10 | 0.5 | 0.5 | 329 / 354 |
| 2030 | 650 | $39.115.675 | $5.038.098 | $83.906.772 | $25.964.316 | 5.54 | 1 | 1 | 460 / 484 |
| 2031 | 850 | $54.477.140 | $5.038.098 | $120.205.037 | $33.694.841 | 8.20 | 1.5 | 1.5 | 593 / 617 |
| 2032 | 892 | $55.675.031 | $5.038.098 | $157.618.328 | $37.028.065 | 8.43 | 1.5 | 2 | 637 / 660 |
| 2033 | 937 | $65.004.734 | $5.038.098 | $199.921.914 | $38.672.532 | 9.40 | 1.5 | 2 | 648 / 670 |
| 2034 | 984 | $67.781.034 | $5.038.098 | $245.488.913 | $42.269.333 | 10.04 | 1.5 | 2.5 | 691 / 713 |
| 2035 | 1033 | $79.076.985 | $5.038.098 | $299.129.915 | $44.067.612 | 11.65 | 1.5 | 2.5 | 701 / 722 |
| 2036 | 1085 | $91.844.429 | $5.038.098 | $361.983.396 | $45.908.731 | 13.48 | 1.5 | 2.5 | 711 / 731 |

Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.

| Plazo del crédito (mismo principal de $30.000.000) | Cuota | Intereses totales | Saldo año 5 | Caja mínima, 24 meses |
|---|---:|---:|---:|---:|
| 5 años | $658.071 | $9.484.253 | $0 | $10.938.735 |
| 10 años (adoptado) | $419.842 | $20.380.983 | $19.139.649 | $15.217.179 |
| 15 años | $348.296 | $32.693.316 | $24.887.691 | $15.717.996 |

| Escenario | Ventas año 1 | Caja mínima 24m | VAN proyecto 10 años / 20% |
|---|---:|---:|---:|
| Base | 200 | $15.217.179 | $75.510.458 |
| Estres | 130 | $-4.541.379 | $-42.507.593 |
| Crecimiento | 300 | $15.468.454 | $184.538.801 |

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.431.223 | $75.510.458 | 54,42 % | 34,25 meses (2,85 años) | 35,61 meses (2,97 años) |
| Estrés | $20.420.723 | −$42.507.593 | -0,02 % | No recupera en 120 meses | No recupera en 120 meses |
| Crecimiento | $23.545.396 | $184.538.801 | 92,45 % | 22,29 meses (1,86 años) | 22,92 meses (1,91 años) |

VAN, TIR y payback usan los mismos 120 flujos mensuales y mes 0. Caja operativa mínima: tres meses de fijos más contingencia; se descuentan sus aumentos del FCFF. Sin rescate, recuperación de reserva/inventario ni valor terminal. Deuda y gastos de apertura solo afectan el financiamiento. Sueldos incluidos en nómina; no se suman como retorno del capital.

Evaluación principal: diez años (2027–2036); comparación a cinco años (2027–2031). Los años 6–10 usan crecimiento hipotético de 5 %; años 11–15 solo ilustran deuda alternativa y operación posterior, sin incorporarse al VAN principal.

## Comparación a cinco años

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.431.223 | $21.642.542 | 41,66 % | 34,25 meses (2,85 años) | 35,61 meses (2,97 años) |
| Estrés | $20.420.723 | −$45.775.634 | -25,16 % | No recupera en 60 meses | No recupera en 60 meses |
| Crecimiento | $23.545.396 | $78.861.115 | 84,90 % | 22,29 meses (1,86 años) | 22,92 meses (1,91 años) |

## Liquidez, retorno del pie y término de deuda

Pie propio de los socios: **$9.000.000** ($4.500.000 cada uno, 50 % y 50 %), equivalente al **30 % del crédito**. Crédito bancario: **$30.000.000** a 10 años y 12 % efectivo anual, contabilizado por separado.
Primer año con FCFE anual positivo y que permanece positivo en los años restantes del estudio: **2028**. Puede haber meses negativos por estacionalidad.
Cancelación contractual sin prepago: **mes 120** (2036). La cuota del escenario base es $419.842.
La suma del FCFE generado desde la operación alcanza el equivalente al pie en el **mes 24**.
Este último hito es capacidad acumulada de generación, no devolución efectiva del aporte ni payback económico. No se distribuyen dividendos en el modelo; la caja incluye crédito y reservas. No se considera el préstamo recibido como utilidad.
Caja positiva, FCFE positivo, VAN positivo y deuda saldada son criterios distintos. La reinversión, los impuestos y el servicio de deuda ya se descuentan del FCFE; confirmar el calendario tributario real y conservar reservas antes de distribuir.

| Año | FCFE anual | Caja final | Reserva | Caja sobre reserva | Deuda pendiente |
|---|---:|---:|---:|---:|---:|
| 2027 | −$424.175 | $26.711.077 | $10.425.999 | $16.285.077 | $28.290.475 |
| 2028 | $13.666.369 | $40.377.446 | $14.131.862 | $26.245.584 | $26.375.807 |
| 2029 | $20.669.819 | $61.047.265 | $18.745.077 | $42.302.188 | $24.231.379 |
| 2030 | $22.859.507 | $83.906.772 | $25.964.316 | $57.942.455 | $21.829.620 |
| 2031 | $36.298.265 | $120.205.037 | $33.694.841 | $86.510.196 | $19.139.649 |
| 2032 | $37.413.291 | $157.618.328 | $37.028.065 | $120.590.263 | $16.126.882 |
| 2033 | $42.303.586 | $199.921.914 | $38.672.532 | $161.249.381 | $12.752.583 |
| 2034 | $45.566.999 | $245.488.913 | $42.269.333 | $203.219.580 | $8.973.368 |
| 2035 | $53.641.002 | $299.129.915 | $44.067.612 | $255.062.303 | $4.740.647 |
| 2036 | $62.853.481 | $361.983.396 | $45.908.731 | $316.074.664 | $0 |
