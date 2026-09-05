# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

Precio inicial con IVA: **$349.990**; neto: $294.109. BOM neto provisional: **$81.184**.
Aporte: **$9.000.000**. Crédito base dimensionado: **$31.000.000**, cuota $433.836 a 10 años y 12% efectivo anual hipotético.
Desembolso inicial: $11.317.378; gastos crédito: $620.000; caja inicial: $28.062.622 (incluye reserva; no sumar otra vez).

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $4.426.234 | $5.206.035 | $26.470.982 | $10.473.247 | 0.69 | 0 | 0 | 176 / 205 |
| 2028 | 350 | $19.015.320 | $5.206.035 | $38.647.148 | $14.179.109 | 3.34 | 0.5 | 0 | 250 / 277 |
| 2029 | 500 | $31.680.620 | $5.206.035 | $57.237.408 | $18.792.325 | 4.57 | 0.5 | 0.5 | 337 / 364 |
| 2030 | 650 | $35.729.124 | $5.206.035 | $77.360.857 | $26.011.563 | 4.87 | 1 | 1 | 472 / 498 |
| 2031 | 850 | $49.915.370 | $5.206.035 | $110.083.164 | $33.742.088 | 7.29 | 1.5 | 1.5 | 608 / 634 |

Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.

| Crédito (mismo principal) | Cuota | Intereses totales | Saldo año 5 | Mínimo sobre reserva, 24 meses |
|---|---:|---:|---:|---:|
| 5 años | $680.007 | $9.800.394 | $0 | $-5.359.010 |
| 10 años | $433.836 | $21.060.349 | $19.777.637 | $56.737 |
| 15 años | $359.906 | $33.783.094 | $25.717.281 | $1.683.200 |

Dos créditos (resto a 5 años y $5 millones al 15% pagados íntegros mes 12): servicio del primer año **$12.593.937**, mínimo sobre reserva **$-8.696.084**.

| Escenario | Ventas año 1 | Mínimo caja libre 24m | VAN proyecto 5 años / 20% |
|---|---:|---:|---:|
| Base | 200 | $56.737 | $15.504.053 |
| Estres | 130 | $-19.433.131 | $-50.774.058 |
| Crecimiento | 300 | $3.010.507 | $69.653.316 |

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.489.116 | $15.504.053 | 35,43 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | $20.478.616 | −$50.774.058 | -30,28 % | No recupera en 60 meses | No recupera en 60 meses |
| Crecimiento | $23.661.182 | $69.653.316 | 76,70 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |

VAN, TIR y payback usan los mismos 60 flujos mensuales y mes 0. Caja operativa mínima: tres meses de fijos más contingencia; se descuentan sus aumentos del FCFF. Sin rescate, recuperación de reserva/inventario ni valor terminal. Deuda y gastos de apertura solo afectan el financiamiento. Sueldos incluidos en nómina; no se suman como retorno del capital.

Los años 6–15 extienden la operación para mostrar toda la deuda; la evaluación publicada comprende 2027–2031.
