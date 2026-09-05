# Documentación de TerraSense

| Documento | Función |
|---|---|
| [Informe 1](INFORME%201%20.docx.md) | Informe principal: problemática, solución, arquitectura, app, energía, sostenibilidad y evaluación económica |
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
