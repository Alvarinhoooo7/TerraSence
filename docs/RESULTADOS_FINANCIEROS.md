# Resultados financieros generados

No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.

El precio **se deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada.

Precio de lista: **$450.929** con IVA ($378.932 netos). BOM neta por equipo: **$70.666**.

Inversión inicial: **$29.783.761**, financiada al 100 % por el crédito. Pie propio exigido: **$8.935.128** ($4.467.564 por socio), entregado al banco como condición de entrada. Cuota mensual: $416.815.

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $75.786.311 | $-2.690.551 | $-1.547.754 | $11.292.031 |
| 2028 | 350 | $136.604.826 | $-2.210.632 | $-1.271.499 | $10.020.532 |
| 2029 | 500 | $201.004.244 | $12.433.259 | $13.144.288 | $23.164.821 |
| 2030 | 650 | $269.144.683 | $28.598.553 | $29.054.105 | $52.218.926 |
| 2031 | 850 | $362.517.185 | $66.750.705 | $66.920.123 | $119.139.049 |
| 2032 | 892 | $391.842.693 | $67.313.735 | $55.975.911 | $175.114.960 |
| 2033 | 937 | $423.958.858 | $79.061.377 | $77.798.093 | $252.913.053 |
| 2034 | 984 | $458.581.410 | $92.118.142 | $90.452.861 | $343.365.914 |
| 2035 | 1033 | $495.859.791 | $94.690.554 | $92.575.036 | $435.940.950 |
| 2036 | 1085 | $536.445.411 | $110.393.983 | $107.774.199 | $543.715.149 |

| Indicador | Valor |
|---|---:|
| VAN al 20 % | $113.397.717 |
| TIR efectiva anual | 53,43 % |
| Payback simple | 3,67 años |
| Payback descontado | 4,38 años |
| Caja mínima del horizonte | $10.020.532 |
| Deuda al cierre de 2036 | $0 |

Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios 2027 y 2028 cierran con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y esa pérdida está financiada por el capital de trabajo.
