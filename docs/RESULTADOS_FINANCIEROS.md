# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

El precio **se deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada.

Precio de lista: **$466.027** con IVA ($391.620 netos). BOM neta por equipo: **$80.632**.

Inversión inicial: **$28.778.513**, desembolsada íntegra por el crédito. Pie de los socios: **$9.000.000** ($4.500.000 por socio), abonado al banco al desembolso como cuotas pagadas por anticipado: cubre las primeras 22,3 cuotas mensuales de $402.747. Desembolso inicial evaluado (inversión más pie): $37.778.513.

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $78.323.938 | $-1.616.164 | $4.168.080 | $16.887.865 |
| 2028 | 350 | $141.178.897 | $47.907 | $4.969.429 | $21.857.295 |
| 2029 | 500 | $207.734.663 | $13.470.693 | $14.004.776 | $35.862.070 |
| 2030 | 650 | $278.156.714 | $30.654.953 | $30.942.182 | $66.804.252 |
| 2031 | 850 | $374.655.697 | $69.051.537 | $69.062.290 | $135.866.542 |
| 2032 | 892 | $404.963.140 | $70.057.919 | $61.667.308 | $197.533.850 |
| 2033 | 937 | $438.154.681 | $81.908.423 | $80.046.641 | $277.580.491 |
| 2034 | 984 | $473.936.534 | $95.073.894 | $92.823.682 | $370.404.173 |
| 2035 | 1033 | $512.463.143 | $97.761.101 | $95.075.848 | $465.480.021 |
| 2036 | 1085 | $554.407.731 | $113.586.814 | $110.414.316 | $575.894.337 |

| Indicador | Valor |
|---|---:|
| VAN al 20 % | $120.765.535 |
| TIR efectiva anual | 53,37 % |
| Payback simple | 3,47 años |
| Payback descontado | 4,28 años |
| Caja mínima del horizonte | $16.887.865 |
| Deuda al cierre de 2036 | $0 |

Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios 2027 y 2028 cierran con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y esa pérdida está financiada por el capital de trabajo.
