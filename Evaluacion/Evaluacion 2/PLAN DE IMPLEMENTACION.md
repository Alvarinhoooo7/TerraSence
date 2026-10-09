# Plan de implementación del informe 2

Lo que falta hacer fuera del informe para que todo lo que `INFORME 2.md` afirma quede respaldado. El informe no menciona estos puntos: cada uno se cierra aquí y no allá.

## Antes de entregar

| # | Tarea | Por qué | Cómo se cierra |
|---|---|---|---|
| 1 | Pegar el enlace de la carpeta de Google Drive en la sección «Anexos» | El informe deja el texto `[enlace a la carpeta de anexos]` para que lo reemplaces | Subir los anexos A a F y pegar el enlace compartido (permiso de lectura para el profesor) |
| 2 | Completar el diseño eléctrico de la placa V3 | La distribución conceptual está en `PCB/V3/V3.kicad_pcb`, con vistas en el informe y anexo C en PDF. Tiene componentes colocados, pero no redes ni pistas; la revisión de KiCad detectó 62 infracciones y 318 problemas de paridad con el esquemático | Resolver solapamientos, conectar desde el esquemático definitivo, rutear y aprobar las reglas de diseño antes de emitir archivos de fabricación |
| 3 | Llevar el esquemático V3 a la versión de circuitos integrados | Hoy `PCB/V3/V3.kicad_sch` usa las huellas de los módulos (ESP32-DEVKITC-32U, LX-LCBST, SP3485 y BME280) y el informe especifica los integrados soldados | Reemplazar los módulos por WROOM-32D, CH340C, TP4056, MT3608 (bobina de 22 µH, SS34, divisor 220 kΩ/30 kΩ), RT9080-33, SP3485EN con 120 Ω y SM712, y BME280 LGA-8 con pull-ups de 4,7 kΩ, según la tabla «Componentes de los módulos del prototipo V2 en la placa V3» y la BOM del anexo A |
| 4 | Validar el montaje y modelar la carcasa fabricable en CAD | El informe y el anexo D incluyen planta, frontal y corte de la envolvente conceptual, alineados con la distribución actual de la V3 | Revisar interferencias de insertos, conectores, celda y tapa; ajustar holguras y producir el modelo sólido y los planos de fabricación con la placa definitiva |
| 5 | Pasar el informe al formato institucional (Word) | La rúbrica 1.1.6.11 evalúa el documento final | Convertir `INFORME 2.md` con las imágenes de `Figuras/`, aplicar la plantilla institucional y revisar la paginación de tablas largas |

## Para reforzar el informe

| # | Tarea | Por qué |
|---|---|---|
| 6 | Nueva captura de «Prepara tu sonda» con el texto corregido | La app decía que la ventana PAIR queda abierta «unos minutos» y el firmware la cierra a los 30 s; el texto ya está corregido en `App/src/screens/OnboardingScreen.tsx`, falta una compilación nueva para capturarlo |
| 7 | Confirmar el sensor ambiental de la V2 | El banco del firmware leyó un BMP280; el informe declara el módulo SparkFun BME280. Montar el SparkFun en la V2 y verificar que `bme280.cpp` lea humedad |

## Estado del material gráfico y del presupuesto

Las figuras 2.7 a 2.9 y los anexos C y D son representaciones conceptuales, no documentos de liberación a fabricación. Se generan con `finanzas/figuras_e2.py` desde los renders de KiCad y las cotas de la envolvente. El modelo tridimensional del TP4056 usa un encapsulado representativo de la biblioteca estándar; no sustituye su huella ni su especificación de compra. El esquemático modular heredado registra 45 infracciones eléctricas y debe sustituirse por el diseño integrado indicado en el punto 3.

La lista de materiales y los costos se conservan por decisión del proyecto, sin anticipar ahorros por la reducción geométrica. La fuente económica sigue siendo `finanzas/supuestos.json` y los resultados se consultan en `docs/RESULTADOS_FINANCIEROS.md`.

## Cómo se regenera

```bash
python finanzas/modelo.py              # cifras, anexos A, B, E y F e informe 1 corregido
python finanzas/figuras_e2.py          # figuras y anexos conceptuales C y D
python finanzas/verificar_informe_e2.py   # informe 2 contra el modelo y los anexos: 0 errores
```
