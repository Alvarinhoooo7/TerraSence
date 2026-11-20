# Evaluación 3: cierre experimental

`INFORME 3.md` parte del informe de la Evaluación 2 (sus figuras se toman de `../Evaluacion 2/Figuras/`) e incorpora el cierre experimental que pidió la retroalimentación del informe final, guardada en [../Evaluacion 2/Readme.md](../Evaluacion%202/Readme.md#retroalimentación-del-informe-final-19-11-2026).

## Qué cambió respecto del informe 2

| Frente | Resultado incorporado | Origen |
| :--- | :--- | :--- |
| IP67 (R09, N-01) | Inmersión a 1 m durante 30 min sin ingreso de agua: indicador interior sin pigmentación y sello íntegro; tapa de cierre sobre el puerto de carga. Recomendación de uso: no sumergir intencionalmente ni lavar con chorro a presión; la garantía no cubre daños por inmersión ni por ingreso de líquidos | Ensayo del equipo, sin registro fotográfico |
| Caída (R11, N-02) | Caídas de 1,0 a 5,0 m sobre tierra compactada y dura sin daño y con el equipo funcional | Ensayo del equipo, sin registro fotográfico |
| Sonda (D-13) | Mismas lecturas a 5 V y a 30 V en el mismo punto, junto a una planta de tomate en floración, con suelo seco y húmedo; contingencia de 12 V descartada | Ensayo del equipo; rango de 4,5 a 30 V del manual [20] |
| Laboratorio (S1 y campaña) | Cotizaciones de $50.000 a $70.000 por punto según variables y especie; listas publicadas de Agrolab y UACh [85, 86]. S1 conserva $50.000 (extremo que menos favorece a TerraSense en el costo para el agricultor) y la campaña de 30 puntos se presupuesta al extremo superior: $2.175.000 con patrones, en lugar de $1.300.000. El modelo regenerado mantiene el precio de $489.990; la inversión sube a $30.125.795, el VAN queda en $129.128.199 y la TIR en 54,69 % | Cotizaciones del equipo, búsqueda web y `finanzas/modelo.py` del 19-11-2026 |
| ESD (R16, N-04) | Protección implementada en el diseño (USBLC6-2SC6 nivel 4 en USB-C, TVS SM712 en el bus); el ensayo de sistema sigue programado | Hojas de datos [73, 74] |

## Pendiente antes de entregar

- **Ficha de la sonda.** Adjuntar el manual de la ComWinTop CWT-Soil-NPKPHCTH-S (referencia [20]) cuando el equipo lo descargue.
- **Anexos.** `python finanzas/modelo.py` escribe los anexos A, B, E y F en `../Evaluacion 2/Anexos/`, con las cifras vigentes; copiarlos a esta carpeta al preparar la entrega.
- **Herramientas.** Los scripts `renumerar_informe_e2.py`, `verificar_informe_e2.py` y `exportar_informe_e2.py` apuntan al informe 2; para exportar este informe a Word hay que generalizarlos.
