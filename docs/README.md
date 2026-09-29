# Documentación de TerraSense

| Documento | Función |
|---|---|
| Informe académico entregado (`Evaluacion/Evaluacion 1/INFORME 1 .docx.pdf`) | El documento que se entrega. Exportación binaria cerrada: no se edita desde el repositorio |
| [Informe corregido](../Evaluacion/Evaluacion%201/INFORME%201%20CORREGIDO.md) | El entregable con todas las correcciones aplicadas. Generado; sin referencias al repositorio |
| [Informe interno](INFORME%201%20.docx.md) | Contraparte interna del informe, con el mapa de trazabilidad hacia el código |
| [Contrato BLE](CONTRATO_BLE.md) | Bytes entre el ESP32 y el teléfono: trama, estado, identidad y vinculación |
| [Modelo económico](MODELO_ECONOMICO.md) | Supuestos, convenciones y fuentes del cálculo |
| [Resultados financieros](RESULTADOS_FINANCIEROS.md) | Tablas generadas con la BOM y el flujo vigente |
| [Sección económica](SECCION_ECONOMICA_REFORMULADA.md) y [cuadros](_cuadros_economicos.md) | Análisis de viabilidad generado desde el modelo, tal como entra en el informe corregido |
| [Plan de validación](PLAN_VALIDACION.md) | Trabajo de integración, ensayos y comprobaciones pendientes |
| [Marco normativo](MARCO_NORMATIVO_Y_ESTANDARES.md) | Referencias y obligaciones relacionadas con el diseño |

El informe reúne la explicación que antes estaba distribuida entre documentos de filosofía, comparación de alternativas, viabilidad e integración BME280; esos documentos se retiraron para mantener una sola explicación vigente. El [archivo histórico](../finanzas/historico/) conserva los antecedentes, incluida la auditoría de septiembre de 2026.

Las especificaciones de implementación viven en los README de cada módulo: [Firmware](../Firmware/README.md), [App](../App/README.md), [Web](../Web/README.md), [Supabase](../supabase/README.md) y [PCB](../PCB/README.md). Por ejemplo: [App: captura, historial y pronóstico](../App/README.md#captura-historial-y-pronóstico-contrato-implementado), [Web: pantallas](../Web/README.md#2-pantallas), [Supabase: persistencia ambiental y batería](../supabase/README.md#persistencia-ambiental-y-bateria), [PCB: trama](../PCB/README.md#69-estructura-binaria-de-la-trama-ble-20-bytes) y [pruebas pendientes](PLAN_VALIDACION.md#5-dependencias-y-comprobaciones-de-software).

## Actualizar y verificar

Desde la raíz:

```bash
python finanzas/modelo.py
python -m unittest discover -s finanzas -p "test_*.py"
python docs/verificar_documentacion.py
```

El primer comando regenera el Excel de flujo de caja, `PCB/BOM_TerraSense.xlsx`, los resultados financieros, la sección económica y sus cuadros, el informe corregido, el bloque `FINANZAS` del README principal y los bloques `INFORME:*` del informe interno. Esos archivos o bloques no se editan a mano: las cifras se cambian en `finanzas/supuestos.json` y la redacción en el script que los genera. El resto del informe interno, incluidos sus diagramas Mermaid, se edita en Markdown.
