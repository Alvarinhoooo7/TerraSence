# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

Precio inicial con IVA: **$349.990**; neto: $294.109. BOM neto provisional: **$75.243**.
Aporte: **$9.000.000**. Crédito base dimensionado: **$27.700.000**, cuota $387.654 a 10 años y 12% efectivo anual hipotético.
Desembolso inicial: $11.248.388; gastos crédito: $554.000; caja inicial: $24.897.612 (incluye reserva; no sumar otra vez).

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $5.709.528 | $4.651.844 | $25.061.618 | $10.327.800 | 1.04 | 0 | 0 | 170 / 195 |
| 2028 | 350 | $21.324.647 | $4.651.844 | $39.526.551 | $14.033.662 | 4.11 | 0.5 | 0 | 241 / 265 |
| 2029 | 500 | $35.078.302 | $4.651.844 | $61.191.779 | $18.646.878 | 5.66 | 0.5 | 0.5 | 326 / 349 |
| 2030 | 650 | $40.278.414 | $4.651.844 | $85.276.292 | $25.866.117 | 6.18 | 1 | 1 | 456 / 478 |
| 2031 | 850 | $56.043.380 | $4.651.844 | $123.092.636 | $33.596.641 | 9.13 | 1.5 | 1.5 | 588 / 610 |

Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.

| Crédito (mismo principal) | Cuota | Intereses totales | Saldo año 5 | Mínimo sobre reserva, 24 meses |
|---|---:|---:|---:|---:|
| 5 años | $607.619 | $8.757.127 | $0 | $-4.525.964 |
| 10 años | $387.654 | $18.818.441 | $17.672.276 | $45.210 |
| 15 años | $321.593 | $30.186.829 | $22.979.635 | $1.366.413 |

Dos créditos (resto a 5 años y $5 millones al 15% pagados íntegros mes 12): servicio del primer año **$11.725.284**, mínimo sobre reserva **$-7.910.523**.

| Escenario | Ventas año 1 | Mínimo caja libre 24m | VAN proyecto 5 años / 20% |
|---|---:|---:|---:|
| Base | 200 | $45.210 | $21.874.878 |
| Estres | 130 | $-19.803.623 | $-47.949.651 |
| Crecimiento | 300 | $824.154 | $87.302.635 |

VAN sin rescate, recuperación de reserva/inventario ni valor terminal. La reserva inicial se trata como capital comprometido. Los gastos de apertura son del financiamiento, no del FCFF. El FCFE no se distribuye automáticamente; no se publica una falsa TIR del socio sumando su sueldo.

Los años 6–15 son extensión mecánica para mostrar toda la deuda; no evidencia de demanda, supervivencia, precio ni rentabilidad futura.
