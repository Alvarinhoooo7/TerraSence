# Documentación de TerraSense

| Documento | Función |
|---|---|
| Informe académico revisado | Feedback del 10-09-2026: problemática, solución, arquitectura, app, energía, sostenibilidad y evaluación económica |
| [Modelo económico](MODELO_ECONOMICO.md) | Supuestos, convenciones y fuentes del cálculo |
| [Resultados financieros](RESULTADOS_FINANCIEROS.md) | Tablas generadas con la BOM y el flujo vigente |
| [Plan de validación](PLAN_VALIDACION.md) | Trabajo de integración, ensayos y comprobaciones pendientes |
| [Marco normativo](MARCO_NORMATIVO_Y_ESTANDARES.md) | Referencias y obligaciones relacionadas con el diseño |

El Informe 1 reúne la explicación que antes estaba distribuida entre documentos de filosofía, comparación de alternativas, viabilidad e integración BME280. La metodología de la revisión financiera se conserva en el modelo económico y en el propio informe. Esos documentos separados se retiraron para mantener una sola explicación vigente.

El [archivo histórico](../finanzas/historico/) conserva los antecedentes, incluida la auditoría de septiembre de 2026. Las especificaciones de implementación permanecen en los README de [App](../App/README.md), [PCB](../PCB/README.md), [Web](../Web/README.md) y [Supabase](../supabase/README.md).

## Actualizar y verificar

Desde la raíz:

```bash
python finanzas/modelo.py
python -m unittest discover -s finanzas -p "test_*.py"
python docs/verificar_documentacion.py
```

El primer comando actualiza Excel, BOM, resultados, README principal y bloques económicos del Informe 1. El texto analítico se edita en el informe; los bloques marcados `INFORME:...` se generan desde Python. Los diagramas Mermaid se editan dentro del informe.


## Revisión del 10-09-2026

El informe de la raíz concentra las correcciones de costos, pie, estudio de diez años y comparación de cinco, TCO parcial, energía en Wh, ficha de sonda, operación offline/online, metrología, matriz normativa y referencias. El Grid 2×5, el historial ambiental y el pronóstico están implementados en la App y en la consola web. Ninguna de las dos dibuja mapas.

El modelo financiero regenera Excel, BOM, resultados y ambos informes. El bloque ECONOMIA_RAIZ del informe de la raíz procede de finanzas/informe_raiz.py; los bloques INFORME de la copia técnica proceden de finanzas/informe.py. El contenido técnico restante se edita en Markdown. Pendiente posterior: unificar las dos versiones técnicas y revisar documentos auxiliares antiguos contra el informe académico actualizado.


## Documentación funcional por módulo

El registro de integración del 11-09-2026 se consolidó en los documentos permanentes: [App: captura, historial y pronóstico](../App/README.md#captura-historial-y-pronóstico-contrato-implementado), [Web: vistas y rutas](../Web/README.md#mediciones-e-inventario), [Supabase: migración aplicada y verificación](../supabase/README.md#persistencia-ambiental-y-bateria), [PCB: trama](../PCB/README.md#69-estructura-binaria-de-la-trama-ble-20-bytes), [contrato BLE](CONTRATO_BLE.md) y [pruebas y pendientes](PLAN_VALIDACION.md#5-dependencias-y-comprobaciones-de-software). El archivo temporal de integración no es necesario para consultar esos requisitos y evidencias.
