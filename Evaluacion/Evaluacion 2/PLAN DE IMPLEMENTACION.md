# Plan de implementación del informe 2

Lo que falta hacer fuera del informe para que todo lo que `INFORME 2.md` afirma quede respaldado. El informe no menciona estos puntos: cada uno se cierra aquí y no allá.

## Antes de entregar

| # | Tarea | Por qué | Cómo se cierra |
|---|---|---|---|
| 1 | Adjuntar los anexos A a F a la entrega y pegar el enlace de la carpeta | En la preevaluación los anexos quedaron nombrados en el informe pero no adjuntos, y el índice general apuntaba a una página que no existía: el profesor no pudo abrirlos y lo anotó explícitamente | Subir los seis anexos y pegar el enlace compartido con permiso de lectura, además de adjuntar los archivos junto al documento |
| 2 | Cerrar la última unión de masa de la placa | `PCB/V3/V3.kicad_pcb` está ruteada con planos de masa en ambas caras; la revisión de reglas de KiCad no registra infracciones eléctricas ni de paridad, pero queda 1 conexión de masa sin cerrar entre islas del plano superior | Unir la isla con una vía o un tramo corto, volver a llenar las zonas y correr el DRC hasta 0 conexiones pendientes; luego emitir Gerber, taladros, BOM y posiciones para JLCPCB |
| 3 | Confirmar en banco dos datos de compra de la BOM | La BOM del anexo A ya sigue el esquemático pieza por pieza (pasivos 1206, bornera de 4 vías de paso 5 mm, USB4105, bobina SLH0704 de 7,3 mm y buzzer YS-MBZ9042 de montaje pasante con paso de 4 mm). Quedan dos verificaciones: la bobina de 42 Ω del buzzer, que se deduce de su código, y el stock del USB4105-GF-A-120, que hoy figura en JLCPCB y no en LCSC | Medir la bobina del buzzer recibido y confirmar el stock del conector al emitir la orden; si falta, usar la alternativa USB4105-GF-A |
| 4 | Validar el montaje y modelar la carcasa fabricable en CAD | El informe y el anexo D incluyen planta, frontal y corte de la envolvente de 99 × 87 × 31 mm para la placa de 90 × 64 mm | Revisar interferencias de insertos, conectores, celda y tapa; ajustar holguras y producir el modelo sólido y los planos de fabricación |
| 5 | Cerrar el `.docx` en Word | La rúbrica 1.1.6.11 evalúa el documento final, y es el único criterio en que la preevaluación no dio el puntaje completo | `python finanzas/exportar_informe_e2.py` produce `INFORME 2.docx` ya en formato institucional: carta, Arial 11 justificado a 1,5 líneas, títulos en Arial negrita, logotipo en el encabezado y número de página más franja roja en el pie. En Word queda abrirlo, aceptar la actualización de campos para que el índice general tome sus números de página, revisar el corte de las tablas de siete y ocho columnas y comprobar que ninguna figura quede separada de su rótulo |

## Para reforzar el informe

| # | Tarea | Por qué |
|---|---|---|
| 6 | Nueva captura de «Prepara tu sonda» con el texto corregido | La app decía que la ventana PAIR queda abierta «unos minutos» y el firmware la cierra a los 30 s; el texto ya está corregido en `App/src/screens/OnboardingScreen.tsx`, falta una compilación nueva para capturarlo |
| 7 | Confirmar el sensor ambiental de la placa de laboratorio | El banco del firmware leyó un BMP280; el informe declara el módulo SparkFun BME280. Montar el SparkFun en la placa de laboratorio y verificar que `bme280.cpp` lea humedad |
| 8 | Implementar el reposo profundo en el firmware | Es la única mejora del informe que cambia una cifra grande: la autonomía calculada pasa de 125,6 a unos 595,6 días. Mientras no esté, el producto declara los 125,6 días y el ensayo D-08 no se puede correr | Reposo profundo con despertar por el pulsador, y después medir la corriente en el prototipo para cerrar D-08 |
| 9 | Mantener al día el conteo de pruebas del informe | El informe declara 425 de 425 pruebas de la aplicación y 8 de 8 de la consola, medidas con `npm test`. El motor agronómico sigue creciendo, así que el número cambia | Volver a correr `cd App && npm test` y `cd Web && npm test` antes de exportar el `.docx` y ajustar la cifra si cambió |

## Estado del material gráfico y del presupuesto

Las figuras 2.7 a 3.0 y los anexos C y D salen de la placa ruteada: `finanzas/figuras_e2.py` toma los renders y las vistas de cobre de `PCB/V3/V3.kicad_pcb` con `kicad-cli` y dibuja la carcasa con las cotas de la placa. Los modelos tridimensionales del ESP32 (WROOM-32), de las borneras (Phoenix PT-1,5), de los pulsadores (B3S) y de la bobina (SRN6045) son representativos de la biblioteca de KiCad 9, que no trae los de las huellas usadas; no sustituyen la huella ni la especificación de compra.

El esquemático `PCB/V3/V3.kicad_sch` quedó alineado con el diseño que el informe costea: USB-C de 16 pines con CC1/CC2, PTC y USBLC6; ruta de carga con AO3401A y SS14; RT9080-33 desde el interruptor; MT3608 con EN en IO5 (4,7 kΩ a tierra) y divisor fijo de 220 kΩ/30 kΩ; CH340C sólo desde VBUS con divisor de 10 kΩ/20 kΩ en TXD; pulsadores EN y BOOT con red de 10 kΩ y 1 µF; termistor de la celda en TEMP con 4,7 kΩ y 47 kΩ; buzzer con S8050, 47 Ω y 1N4148W; RS-485 con SM712, 120 Ω y polarización de 4,7 kΩ, y RO/DI en IO16/IO17 como en `Firmware/pines.h`. El ERC queda en 0 errores. La carpeta `PCB/V3/` sigue fuera de git por `.gitignore`.

La lista de materiales y los costos se conservan por decisión del proyecto, sin anticipar ahorros por la reducción geométrica. La fuente económica sigue siendo `finanzas/supuestos.json` y los resultados se consultan en `docs/RESULTADOS_FINANCIEROS.md`.

## Cómo se regenera

```bash
python finanzas/modelo.py              # cifras, anexos A, B, E y F e informe 1 corregido
python finanzas/figuras_e2.py          # figuras y anexos C y D (renders de la placa con kicad-cli)
python finanzas/renumerar_informe_e2.py   # renumera tablas y figuras y rehace los tres índices
python finanzas/verificar_informe_e2.py   # informe 2 contra el modelo y los anexos: 0 errores
python finanzas/exportar_informe_e2.py    # INFORME 2.docx con los enlaces a la bibliografía
```
