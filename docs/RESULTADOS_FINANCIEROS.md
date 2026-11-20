# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

El precio **se deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada. Una vez derivado se redondea al alza a la terminación comercial de $990, de modo que el margen resultante supera al exigido y nunca queda por debajo.

Precio de lista: **$489.990** con IVA ($411.756 netos). BOM neta por equipo: **$93.751**.

Inversión inicial: **$30.125.795**, desembolsada íntegra por el crédito. Pie de los socios: **$9.000.000** ($4.500.000 por socio), abonado al banco al desembolso como cuotas pagadas por anticipado: cubre las primeras 21,3 cuotas mensuales de $421.602. Desembolso inicial evaluado (inversión más pie): $39.125.795.

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $82.351.261 | $-986.639 | $5.122.089 | $17.841.874 |
| 2028 | 350 | $148.438.147 | $1.382.397 | $6.166.674 | $24.008.548 |
| 2029 | 500 | $218.416.131 | $14.747.616 | $15.360.394 | $39.368.941 |
| 2030 | 650 | $292.459.199 | $32.975.928 | $33.330.295 | $72.699.237 |
| 2031 | 850 | $393.920.044 | $72.263.759 | $72.328.707 | $145.027.944 |
| 2032 | 892 | $425.785.859 | $73.689.128 | $65.163.216 | $210.191.159 |
| 2033 | 937 | $460.684.069 | $85.855.022 | $83.841.702 | $294.032.861 |
| 2034 | 984 | $498.305.782 | $99.361.006 | $96.941.072 | $390.973.933 |
| 2035 | 1033 | $538.813.383 | $102.415.437 | $99.540.095 | $490.514.028 |
| 2036 | 1085 | $582.914.711 | $118.641.430 | $115.256.033 | $605.770.061 |

| Indicador | Valor |
|---|---:|
| VAN al 20 % | $129.128.199 |
| TIR efectiva anual | 54,69 % |
| Payback simple | 3,37 años |
| Payback descontado | 4,19 años |
| Caja mínima del horizonte | $17.841.874 |
| Deuda al cierre de 2036 | $0 |

Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios 2027 y 2028 cierran con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y esa pérdida está financiada por el capital de trabajo.
