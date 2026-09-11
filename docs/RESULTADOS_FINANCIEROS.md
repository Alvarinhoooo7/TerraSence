# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

Precio inicial con IVA: **$349.990**; neto: $294.109. BOM neto provisional: **$81.184**.
Pie propio: **$9.000.000**. Crédito base dimensionado: **$31.000.000**, cuota $433.836 a 10 años y 12% efectivo anual hipotético.
Desembolso inicial: $11.317.378; gastos crédito: $620.000; caja inicial: $28.062.622 (incluye reserva; no sumar otra vez).

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $4.426.234 | $5.206.035 | $26.470.982 | $10.473.247 | 0.69 | 0 | 0 | 176 / 205 |
| 2028 | 350 | $19.015.320 | $5.206.035 | $38.647.148 | $14.179.109 | 3.34 | 0.5 | 0 | 250 / 277 |
| 2029 | 500 | $31.680.620 | $5.206.035 | $57.237.408 | $18.792.325 | 4.57 | 0.5 | 0.5 | 337 / 364 |
| 2030 | 650 | $35.729.124 | $5.206.035 | $77.360.857 | $26.011.563 | 4.87 | 1 | 1 | 472 / 498 |
| 2031 | 850 | $49.915.370 | $5.206.035 | $110.083.164 | $33.742.088 | 7.29 | 1.5 | 1.5 | 608 / 634 |
| 2032 | 892 | $50.743.843 | $5.206.035 | $143.657.986 | $37.075.312 | 7.45 | 1.5 | 2 | 653 / 678 |
| 2033 | 937 | $59.668.629 | $5.206.035 | $181.777.382 | $38.719.779 | 8.32 | 1.5 | 2 | 665 / 688 |
| 2034 | 984 | $62.009.246 | $5.206.035 | $222.826.660 | $42.316.580 | 8.88 | 1.5 | 2.5 | 709 / 732 |
| 2035 | 1033 | $72.836.612 | $5.206.035 | $271.578.201 | $44.114.859 | 10.36 | 1.5 | 2.5 | 719 / 742 |
| 2036 | 1085 | $85.094.046 | $5.206.035 | $329.226.698 | $45.955.978 | 12.07 | 1.5 | 2.5 | 729 / 751 |

Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.

| Crédito (mismo principal) | Cuota | Intereses totales | Saldo año 5 | Mínimo sobre reserva, 24 meses |
|---|---:|---:|---:|---:|
| 5 años | $680.007 | $9.800.394 | $0 | $-5.359.010 |
| 10 años | $433.836 | $21.060.349 | $19.777.637 | $56.737 |
| 15 años | $359.906 | $33.783.094 | $25.717.281 | $1.683.200 |

Dos créditos (resto a 5 años y $5 millones al 15% pagados íntegros mes 12): servicio del primer año **$12.593.937**, mínimo sobre reserva **$-8.696.084**.

| Escenario | Ventas año 1 | Mínimo caja libre 24m | VAN proyecto 10 años / 20% |
|---|---:|---:|---:|
| Base | 200 | $56.737 | $63.717.893 |
| Estres | 130 | $-19.433.131 | $-50.865.171 |
| Crecimiento | 300 | $3.010.507 | $166.848.598 |

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.489.116 | $63.717.893 | 48,94 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | $20.478.616 | −$50.865.171 | -3,81 % | No recupera en 120 meses | No recupera en 120 meses |
| Crecimiento | $23.661.182 | $166.848.598 | 84,86 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |

VAN, TIR y payback usan los mismos 120 flujos mensuales y mes 0. Caja operativa mínima: tres meses de fijos más contingencia; se descuentan sus aumentos del FCFF. Sin rescate, recuperación de reserva/inventario ni valor terminal. Deuda y gastos de apertura solo afectan el financiamiento. Sueldos incluidos en nómina; no se suman como retorno del capital.

Evaluación principal: diez años (2027–2036); comparación a cinco años (2027–2031). Los años 6–10 usan crecimiento hipotético de 5 %; años 11–15 solo ilustran deuda alternativa y operación posterior, sin incorporarse al VAN principal.

## Comparación a cinco años

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.489.116 | $15.504.053 | 35,43 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | $20.478.616 | −$50.774.058 | -30,28 % | No recupera en 60 meses | No recupera en 60 meses |
| Crecimiento | $23.661.182 | $69.653.316 | 76,70 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |

## Liquidez, retorno del pie y término de deuda

Pie propio: **$9.000.000**. Crédito: **$31.000.000**, contabilizado por separado.
Primer año con FCFE anual positivo y que permanece positivo en los años restantes del estudio: **2028**. Puede haber meses negativos por estacionalidad.
Cancelación contractual sin prepago: **mes 120** (2036). La cuota del escenario base es $433.836.
La suma del FCFE generado desde la operación alcanza el equivalente al pie en el **mes 24**.
Este último hito es capacidad acumulada de generación, no devolución efectiva del aporte ni payback económico. No se distribuyen dividendos en el modelo; la caja incluye crédito y reservas. No se considera el préstamo recibido como utilidad.
Caja positiva, FCFE positivo, VAN positivo y deuda saldada son criterios distintos. La reinversión, los impuestos y el servicio de deuda ya se descuentan del FCFE; confirmar el calendario tributario real y conservar reservas antes de distribuir.

| Año | FCFE anual | Caja final | Reserva | Caja sobre reserva | Deuda pendiente |
|---|---:|---:|---:|---:|---:|
| 2027 | −$1.591.640 | $26.470.982 | $10.473.247 | $15.997.736 | $29.233.491 |
| 2028 | $12.176.166 | $38.647.148 | $14.179.109 | $24.468.039 | $27.255.001 |
| 2029 | $18.590.260 | $57.237.408 | $18.792.325 | $38.445.084 | $25.039.092 |
| 2030 | $20.123.449 | $77.360.857 | $26.011.563 | $51.349.294 | $22.557.274 |
| 2031 | $32.722.306 | $110.083.164 | $33.742.088 | $76.341.076 | $19.777.637 |
| 2032 | $33.574.822 | $143.657.986 | $37.075.312 | $106.582.674 | $16.664.445 |
| 2033 | $38.119.396 | $181.777.382 | $38.719.779 | $143.057.602 | $13.177.669 |
| 2034 | $41.049.278 | $222.826.660 | $42.316.580 | $180.510.079 | $9.272.480 |
| 2035 | $48.751.541 | $271.578.201 | $44.114.859 | $227.463.341 | $4.898.669 |
| 2036 | $57.648.498 | $329.226.698 | $45.955.978 | $283.270.720 | $0 |
