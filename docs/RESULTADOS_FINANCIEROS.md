# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

El precio **se deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada. Una vez derivado se redondea al alza a la terminación comercial de $990, de modo que el margen resultante supera al exigido y nunca queda por debajo.

Precio de lista: **$489.990** con IVA ($411.756 netos). BOM neta por equipo: **$93.751**.

Inversión inicial: **$29.250.795**, desembolsada íntegra por el crédito. Pie de los socios: **$9.000.000** ($4.500.000 por socio), abonado al banco al desembolso como cuotas pagadas por anticipado: cubre las primeras 22,0 cuotas mensuales de $409.357. Desembolso inicial evaluado (inversión más pie): $38.250.795.

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $82.351.261 | $-714.556 | $5.122.089 | $17.841.874 |
| 2028 | 350 | $148.438.147 | $1.567.769 | $6.379.835 | $24.221.709 |
| 2029 | 500 | $218.416.131 | $14.942.165 | $15.442.489 | $39.664.198 |
| 2030 | 650 | $292.459.199 | $33.164.848 | $33.414.267 | $73.078.464 |
| 2031 | 850 | $393.920.044 | $72.446.375 | $72.414.780 | $145.493.244 |
| 2032 | 892 | $425.785.859 | $73.733.432 | $65.295.392 | $210.788.636 |
| 2033 | 937 | $460.684.069 | $85.891.417 | $83.976.514 | $294.765.151 |
| 2034 | 984 | $498.305.782 | $99.388.544 | $97.078.837 | $391.843.988 |
| 2035 | 1033 | $538.813.383 | $102.433.054 | $99.681.167 | $491.525.155 |
| 2036 | 1085 | $582.914.711 | $118.647.937 | $115.400.809 | $606.925.964 |

| Indicador | Valor |
|---|---:|
| VAN al 20 % | $130.438.474 |
| TIR efectiva anual | 55,51 % |
| Payback simple | 3,34 años |
| Payback descontado | 4,15 años |
| Caja mínima del horizonte | $17.841.874 |
| Deuda al cierre de 2036 | $0 |

Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios 2027 y 2028 cierran con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y esa pérdida está financiada por el capital de trabajo.
