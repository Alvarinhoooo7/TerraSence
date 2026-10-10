# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

El precio **se deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada.

Precio de lista: **$467.463** con IVA ($392.826 netos). BOM neta por equipo: **$81.425**.

Inversión inicial: **$28.807.059**, desembolsada íntegra por el crédito. Pie de los socios: **$9.000.000** ($4.500.000 por socio), abonado al banco al desembolso como cuotas pagadas por anticipado: cubre las primeras 22,3 cuotas mensuales de $403.147. Desembolso inicial evaluado (inversión más pie): $37.807.059.

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $78.565.258 | $-1.563.641 | $4.223.770 | $16.943.555 |
| 2028 | 350 | $141.613.878 | $145.316 | $5.060.222 | $22.003.777 |
| 2029 | 500 | $208.374.707 | $13.541.922 | $14.073.965 | $36.077.741 |
| 2030 | 650 | $279.013.732 | $30.801.402 | $31.086.345 | $67.164.086 |
| 2031 | 850 | $375.810.035 | $69.249.651 | $69.257.844 | $136.421.930 |
| 2032 | 892 | $406.210.856 | $70.272.425 | $61.878.947 | $198.300.877 |
| 2033 | 937 | $439.504.663 | $82.140.887 | $80.275.894 | $278.576.770 |
| 2034 | 984 | $475.396.762 | $95.325.727 | $93.071.919 | $371.648.690 |
| 2035 | 1033 | $514.042.074 | $98.033.802 | $95.344.523 | $466.993.213 |
| 2036 | 1085 | $556.115.895 | $113.882.245 | $110.705.236 | $577.698.449 |

| Indicador | Valor |
|---|---:|
| VAN al 20 % | $121.326.245 |
| TIR efectiva anual | 53,50 % |
| Payback simple | 3,46 años |
| Payback descontado | 4,27 años |
| Caja mínima del horizonte | $16.943.555 |
| Deuda al cierre de 2036 | $0 |

Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios 2027 y 2028 cierran con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y esa pérdida está financiada por el capital de trabajo.
