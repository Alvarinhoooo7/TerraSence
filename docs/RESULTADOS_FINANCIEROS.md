# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

Precio inicial con IVA: **$349.990**; neto: $294.109. BOM neto provisional: **$81.184**.
Pie propio de los socios: **$9.000.000** ($4.500.000 cada socio, 50 % y 50 %), equivalente al **30 % del crédito**. Crédito bancario solicitado: **$30.000.000** a 10 años, 12 % efectivo anual (0,9489 % mensual), cuota fija de $419.842. Total de fuentes: **$39.000.000**.
Desembolso inicial: $11.317.378; gastos crédito: $600.000; caja inicial: $27.082.622 (incluye reserva; no sumar otra vez).

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $4.426.234 | $5.038.098 | $25.658.919 | $10.431.262 | 0.72 | 0 | 0 | 176 / 204 |
| 2028 | 350 | $19.015.320 | $5.038.098 | $37.970.762 | $14.137.125 | 3.44 | 0.5 | 0 | 250 / 276 |
| 2029 | 500 | $31.680.620 | $5.038.098 | $56.704.844 | $18.750.340 | 4.72 | 0.5 | 0.5 | 337 / 363 |
| 2030 | 650 | $35.729.124 | $5.038.098 | $76.974.260 | $25.969.579 | 5.02 | 1 | 1 | 472 / 497 |
| 2031 | 850 | $49.915.370 | $5.038.098 | $109.844.935 | $33.700.104 | 7.52 | 1.5 | 1.5 | 608 / 633 |
| 2032 | 892 | $50.743.843 | $5.038.098 | $143.570.816 | $37.033.328 | 7.69 | 1.5 | 2 | 653 / 677 |
| 2033 | 937 | $59.668.629 | $5.038.098 | $181.844.284 | $38.677.795 | 8.60 | 1.5 | 2 | 665 / 688 |
| 2034 | 984 | $62.009.246 | $5.038.098 | $223.051.008 | $42.274.596 | 9.18 | 1.5 | 2.5 | 709 / 731 |
| 2035 | 1033 | $72.836.612 | $5.038.098 | $271.963.774 | $44.072.875 | 10.71 | 1.5 | 2.5 | 719 / 741 |
| 2036 | 1085 | $85.094.046 | $5.038.098 | $329.777.729 | $45.913.994 | 12.48 | 1.5 | 2.5 | 729 / 750 |

Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.

| Plazo del crédito (mismo principal de $30.000.000) | Cuota | Intereses totales | Saldo año 5 | Caja mínima, 24 meses |
|---|---:|---:|---:|---:|
| 5 años | $658.071 | $9.484.253 | $0 | $8.995.388 |
| 10 años (adoptado) | $419.842 | $20.380.983 | $19.139.649 | $13.521.745 |
| 15 años | $348.296 | $32.693.316 | $24.887.691 | $14.881.107 |

| Escenario | Ventas año 1 | Caja mínima 24m | VAN proyecto 10 años / 20% |
|---|---:|---:|---:|
| Base | 200 | $13.521.745 | $63.717.893 |
| Estres | 130 | $-5.980.612 | $-50.865.171 |
| Crecimiento | 300 | $14.795.409 | $166.848.598 |

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

Pie propio de los socios: **$9.000.000** ($4.500.000 cada uno, 50 % y 50 %), equivalente al **30 % del crédito**. Crédito bancario: **$30.000.000** a 10 años y 12 % efectivo anual, contabilizado por separado.
Primer año con FCFE anual positivo y que permanece positivo en los años restantes del estudio: **2028**. Puede haber meses negativos por estacionalidad.
Cancelación contractual sin prepago: **mes 120** (2036). La cuota del escenario base es $419.842.
La suma del FCFE generado desde la operación alcanza el equivalente al pie en el **mes 24**.
Este último hito es capacidad acumulada de generación, no devolución efectiva del aporte ni payback económico. No se distribuyen dividendos en el modelo; la caja incluye crédito y reservas. No se considera el préstamo recibido como utilidad.
Caja positiva, FCFE positivo, VAN positivo y deuda saldada son criterios distintos. La reinversión, los impuestos y el servicio de deuda ya se descuentan del FCFE; confirmar el calendario tributario real y conservar reservas antes de distribuir.

| Año | FCFE anual | Caja final | Reserva | Caja sobre reserva | Deuda pendiente |
|---|---:|---:|---:|---:|---:|
| 2027 | −$1.423.703 | $25.658.919 | $10.431.262 | $15.227.657 | $28.290.475 |
| 2028 | $12.311.843 | $37.970.762 | $14.137.125 | $23.833.637 | $26.375.807 |
| 2029 | $18.734.083 | $56.704.844 | $18.750.340 | $37.954.504 | $24.231.379 |
| 2030 | $20.269.416 | $76.974.260 | $25.969.579 | $51.004.681 | $21.829.620 |
| 2031 | $32.870.675 | $109.844.935 | $33.700.104 | $76.144.832 | $19.139.649 |
| 2032 | $33.725.881 | $143.570.816 | $37.033.328 | $106.537.489 | $16.126.882 |
| 2033 | $38.273.467 | $181.844.284 | $38.677.795 | $143.166.489 | $12.752.583 |
| 2034 | $41.206.724 | $223.051.008 | $42.274.596 | $180.776.412 | $8.973.368 |
| 2035 | $48.912.766 | $271.963.774 | $44.072.875 | $227.890.899 | $4.740.647 |
| 2036 | $57.813.955 | $329.777.729 | $45.913.994 | $283.863.735 | $0 |
