# Plan de implementación del informe 2

Acciones de implementación, validación y preparación de la entrega. El informe distingue las funciones implementadas de su aceptación mediante ensayo; este plan conserva los detalles internos necesarios para cerrar cada acción.

## Antes de entregar
| # | Tarea | Por qué | Cómo se cierra |
|---|---|---|---|
| 1 | Adjuntar los anexos A a F junto al informe | El entregable identifica seis archivos adjuntos, sin depender de enlaces locales ni de una carpeta compartida | Entregar el Word junto con los seis archivos de `Anexos/` y comprobar que todos se abran |
| 2 | Corregir la placa V3 y emitir su paquete de fabricación | El proyecto KiCad de la V3 ya está en `PCB/V3/` (excluido de git). Al 31-10-2026 el ERC da 0 errores y 2 avisos (unidad B de SW1 sin colocar y SDO del BME280 contra una bandera de alimentación), los 12 pines del ESP32 coinciden con `Firmware/pines.h` y el DRC marca **un error real**: un fragmento del plano GND de la cara superior queda sin unión con el resto; las otras 36 marcas son de serigrafía. Informes en `Registros de banco/V3_ERC.rpt` y `V3_DRC.rpt` | Unir el fragmento de GND en KiCad (vía de unión o reruteo), repetir ERC y DRC sin errores y emitir Gerber, taladros, lista de materiales y posiciones con revisión, huellas digitales y acta de liberación |
| 3 | Confirmar en banco dos datos de compra de la BOM | La BOM del anexo A ya sigue el esquemático pieza por pieza (pasivos 1206, bornera de 4 vías de paso 5 mm, USB4105, bobina SLH0704 de 7,3 mm y buzzer YS-MBZ9042 de montaje pasante con paso de 4 mm). Quedan dos verificaciones: la bobina de 42 Ω del buzzer, que se deduce de su código, y el stock del USB4105-GF-A-120, que hoy figura en JLCPCB y no en LCSC | Medir la bobina del buzzer recibido y confirmar el stock del conector al emitir la orden; si falta, usar la alternativa USB4105-GF-A |
| 4 | Validar el montaje y modelar la carcasa fabricable en CAD | El informe y el anexo D incluyen planta, frontal y corte de la envolvente de 99 × 87 × 31 mm para la placa de 90 × 64 mm | Revisar interferencias de insertos, conectores, celda y tapa; ajustar holguras y producir el modelo sólido y los planos de fabricación |
| 5 | Regenerar y revisar el Word paginado | La rúbrica 1.1.6.11 evalúa el documento final | `python finanzas/exportar_informe_e2.py --paginar` pagina con LibreOffice si está instalado y, si no, con Microsoft Word en segundo plano (`--pdf-revision` deja una copia PDF). Conserva carta, Arial, logotipo y pie institucional; rechaza tablas malformadas. Revisar las tablas anchas y los saltos antes de enviar |
| 6 | Revisar los índices de figuras y de tablas | La paginación con Word ya los deja con número de página y relleno de puntos: busca la página de cada rótulo y reescribe su entrada | Con LibreOffice siguen saliendo como viñetas: paginar en un equipo con Word antes de entregar |
| 8 | Completar la matriz de teléfonos con equipos reales | La retroalimentación pide la matriz Android e iOS real. T-01 ya quedó con modelo real (Motorola moto g56 5G, Android 15) y ensayado el 31-10-2026; T-02 a T-05 siguen como perfiles. Este computador ha conectado iPhone y un Samsung S24 del equipo | Registrar modelo y versión de sistema de esos teléfonos en la matriz y ejecutar T-02 a T-05; en T-01 faltan los permisos de cámara y notificaciones |
| 9 | Adjuntar las cotizaciones formales y reemplazar S1 y S2 | La retroalimentación las pide para los componentes y servicios críticos, y pide sustituir los supuestos de laboratorio y asesoría por cotizaciones o levantamientos. El anexo A conserva precios de catálogo fechados el 02-10-2026, que no acreditan stock ni cotización | Incorporar las cotizaciones formales al anexo A y a la Tabla 9.0, reemplazar S1 y S2 en la Tabla 5.9 y regenerar con `python finanzas/modelo.py` |

## Para reforzar el informe
| # | Tarea | Por qué | Cómo se cierra |
|---|---|---|---|
| 10 | Captura de «Prepara tu sonda» | La ventana PAIR dura 30 s en el firmware y en el texto de `App/src/screens/OnboardingScreen.tsx` | Capturar una compilación vigente y comprobar el texto de la figura |
| 11 | Contrastar el BME280 contra una referencia | El 31-10-2026 el banco confirmó un BME280 real (identidad `0x60`) con humedad: 23,2 °C, 959,7 hPa y 60,3 % HR | F-08: comparar contra termohigrómetro y barómetro patrón |
| 12 | Confirmar la autonomía con una descarga completa | D-07 midió el consumo el 31-10-2026 (FNB58, 100 muestras/s): reposo 56,2 mA y 0,36 mWh por medición con el firmware 1.1.0. El informe fija R07 en al menos 130 mediciones por carga (135 calculadas con la corriente medida) | D-08: descarga completa con la celda de 2.000 mAh, dos jornadas semanales de 2 h con 10 mediciones y apagado entre jornadas; actualizar `finanzas/energia_v3.py` si el piloto confirma otra espera |
| 13 | Mantener al día los resultados de software | La Tabla 11.3 del informe identifica el alcance y el resultado de las pruebas; el conteo depende de la versión evaluada | Ejecutar las pruebas de App, Web y del despachador de avisos antes de exportar; registrar fecha y resultado sin atribuir pruebas de formatos al aislamiento de datos |
| 14 | Acta de aceptación del aislamiento por equipo y rol (W-04/R25) | El control de acceso está implementado, pero las pruebas web de formatos no verifican accesos cruzados | Ejecutar casos con cuentas y equipos distintos sobre una réplica local; conservar casos, identidad de la configuración y resultados, y sólo entonces declarar cumplido R25 |
| 15 | Confirmar las especificaciones de la muestra de sonda | La publicación del fabricante declara ±5 °C y un rango de CE distinto del intervalo con exactitud detallada. No corresponde sustituir esos datos por los de otra variante | Solicitar confirmación escrita para el modelo y lote adquiridos, y contrastar la muestra contra patrones antes de elevar las prestaciones declaradas |
| 16 | Cerrar el reposo profundo y el receptor de actualización por BLE | Son las dos únicas observaciones de la retroalimentación que se cierran con código y no con ensayo. El firmware 1.1.0 ya baja la espera de 73,8 a 56,2 mA (80 MHz y anuncio cada ~155 ms), pero no duerme: el reposo ligero automático exige `CONFIG_PM_ENABLE`, desactivado en el núcleo de Arduino, y el receptor de actualización tampoco existe (F8), aunque la consola ya publica binarios | Elegir entre recompilar el framework con gestión de energía o apagar el equipo por inactividad con despertar por IO33; medir con el mismo procedimiento de D-07. Para la actualización, definir la partición **antes** de repartir equipos, porque sólo se cambia por USB, y ensayar integridad, interrupción y recuperación antes de ofrecerla |
| 17 | Mostrar en la aplicación las mediciones que quedan por carga | La autonomía está medida en banco —al menos 135 mediciones y unas 6,7 semanas de uso habitual por carga, con la corriente de D-07 del 31-10-2026— pero la aplicación sólo expone el porcentaje de la celda y avisa bajo 15 % con rearme sobre 20 % (`LOW_BATTERY_PERCENT` en `App/src/utils/batteryWarning.ts`). El dato más útil para el productor, cuántas mediciones le quedan, está calculado y no se muestra | Traducir el porcentaje a mediciones restantes con el consumo por medición de `finanzas/energia_v3.py`, declarar el supuesto en pantalla (celda sana y uso habitual) y no presentarlo como garantía; actualizar la ficha técnica cuando D-08 cierre la descarga completa |

## Estado del material gráfico y del presupuesto

Las figuras de la placa y los anexos C y D representan la placa y la envolvente de diseño. Su generador, `finanzas/figuras_e2.py`, usa el proyecto `PCB/V3/V3.kicad_pcb`, que ya está en este espacio de trabajo; mientras el DRC conserve el error del plano GND no puede acreditarse un paquete de fabricación. Los modelos tridimensionales representativos de KiCad no sustituyen las huellas ni la especificación de compra.

La configuración descrita en el informe incluye USB-C con CC1/CC2 y protección, ruta de carga externa, regulador RT9080-33, elevador MT3608, buzzer con transistor y bus RS-485 protegido. Son especificaciones a contrastar con el esquemático recuperado y el prototipo; no se conserva aquí un veredicto de ERC o DRC que no pueda reproducirse. La carpeta `PCB/V3/` está excluida de git, de modo que el historial del repositorio no sirve para recuperar ni acreditar esa revisión: la única copia es la del computador donde se diseñó.

## Cotejo con la retroalimentación del académico

La retroalimentación reconoce el nivel de desarrollo del informe y pide, para la entrega final, **no más contenido sino convertir en evidencia lo que hoy está definido como diseño**. Enumera 44 observaciones. Los cuadros siguientes las recorren una por una; el cuadro de frentes de la sección siguiente detalla la evidencia que debe producir el equipo.

**Resueltas en el informe.** No requieren más trabajo.
| Observación | Dónde quedó resuelta |
|---|---|
| Mantener N, P y K exclusivamente como registros informativos | Capítulo V, Tabla 10.7 y conclusiones: se presentan como información derivada de la conductividad, sin medición química independiente y sin diagnóstico nutricional. El informe y la aplicación los nombran **valores de referencia** en lugar de «registros informativos»: el contenido de la observación se conserva íntegro y sólo cambia la palabra, porque «registro» aplicado a una magnitud confunde al comprador |
| Ejecutar las 1.000 lecturas Modbus consecutivas sin error de CRC | D-14 del 31-10-2026: 1.000 de 1.000, repetido con igual resultado; R15 cumple |
| Medir el consumo real en cada estado operativo y actualizar el modelo energético | D-07 del 31-10-2026 con FNB58; nueva sección «Consumo Medido en Banco» y R07 fijado en mediciones por carga |
| Mantener separado el ensayo IP67 de la prueba de estanqueidad del FAT | R09: N-01 acreditado frente a F-13 como control de proceso por muestreo. Aprobar F-13 en todas las unidades no autoriza a retirar «objetivo de diseño IP67» |
| Actualizar cada requisito R01–R27 a Cumple / No cumple / Pendiente | Columna «Veredicto» de la Tabla 10.7, con tres valores: cinco requerimientos cumplen (R03, R07, R15, R20 y R21) y 22 conservan aceptación pendiente |
| Agregar una columna con número de informe, fotografía o registro de ensayo | Columnas «Evidencia» y «Registro, informe o fotografía» de la Tabla 10.7, que dicen «Sin acta experimental de cierre» donde no existe |
| Congelar definitivamente la variante ESP32-WROOM utilizada en producción | ESP32-WROOM-32D con flash de 4 MB en la Tabla 8.8 y en la sección de congelación; el 32E queda como alternativa de abastecimiento, no como reemplazo |
| Congelar los números de parte de todos los componentes con alternativas abiertas | Tabla 7.8 y lista de compra: C&K 7101MCWZQE, Lapp 53015000 y 53019000, Amphenol LTW VENT-PS1NGY-O8002, Adafruit 4993 y ruthex GE-M3x57-001, con proveedor y precio en el anexo A (31-10-2026); el costo se recalculó con `finanzas/modelo.py` |
| Validar las segundas fuentes antes de declararlas reemplazos directos | Regla escrita: hasta aprobar los ensayos de su bloque, cada segunda fuente es «alternativa de abastecimiento no validada». La validación en sí es ensayo |
| Incorporar número de revisión de PCB, carcasa, firmware y aplicación | Tabla 8.9, con las seis revisiones y el alcance de cada una |
| Vincular cada unidad fabricada con su revisión mediante el número de serie | Tabla 8.9 y formulario FAT del anexo E, que anota la combinación de las cuatro revisiones de cada número de serie |
| Cerrar la actualización por BLE antes de declararla capacidad comercial | Tabla 11.6 y conclusiones: ampliación diseñada, fuera del material de venta. Implementarla es la tarea 16 |
| Corregir numeración duplicada de tablas y figuras | 112 tablas (1.0 a 12.1) y 25 figuras (1.0 a 3.4) sin repetición. `python finanzas/renumerar_informe_e2.py` la rehace y `verificar_informe_e2.py` la exige |
| Revisar la redacción de los requisitos, especialmente batería baja | R17 en dos capas independientes: el equipo por tensión de celda (3,40 V con rearme en 3,50 V) y la aplicación por carga estimada (15 % con rearme en 20 %) |
| Mantener diferenciados los estados de diseño, implementado y verificado | Escalera de cuatro grados de la ficha técnica (declarado, diseñado, implementado, verificado) y Tabla 4.5 «Estado probatorio» |
| Declarar «cumplido» sólo lo que tenga evidencia experimental | Cinco «Cumple», cada uno con su alcance declarado en la propia celda: R03, R07 y R15 con ensayo de banco del 31-10-2026 (ciclo de medición, consumo medido y 1.000 de 1.000 lecturas Modbus), y R20 y R21 con alcance documental |
| Implementar la alimentación alternativa si a 5 V no cumple la precisión | Contingencia de 12 V escrita en la Tabla 4.5; se activa sólo si el ensayo a 5 V degrada la exactitud |

**Se cierran sin ensayo.** Dependen de un archivo o de un dato que el equipo tiene que aportar.
| Observación | Qué falta | Tarea |
|---|---|---|
| Adjuntar efectivamente los anexos A–F | Nada más que la acción de entrega: los seis existen y abren | 1 |
| Verificar que los archivos de fabricación de PCB correspondan a la revisión evaluada | El proyecto KiCad de la V3 está en otro computador del equipo | 2 |
| Completar la matriz de teléfonos Android e iOS reales | Modelo y versión de sistema de cuatro de los cinco perfiles | 8 |
| Adjuntar las cotizaciones formales de componentes y servicios críticos | Las cotizaciones; el anexo A lleva precios de catálogo fechados | 9 |
| Reemplazar S1 y S2 por cotizaciones o levantamientos formales | El precio real del análisis de laboratorio y de la visita de asesoría | 9 |

**Se cierran con código.** Las dos únicas observaciones que no esperan banco ni laboratorio.
| Observación | Estado hoy | Tarea |
|---|---|---|
| Cerrar la implementación del deep-sleep, que se encuentra programada | No implementado: el firmware no configura reposo y el ahorro entre jornadas se apoya en el interruptor (`Firmware/TASK.md`, F4) | 12 y 16 |
| Cerrar la actualización de firmware por BLE | La consola publica binarios; el equipo todavía no los recibe (F8) | 16 |

**Exigen banco, campo o laboratorio acreditado.** El informe ya les asigna identificador, método, criterio numérico, formulario en el anexo E y fecha en la carta Gantt: lo que falta es el acta.
| Observación | Ensayo que la especifica |
|---|---|
| Ejecutar la campaña de validación contra laboratorio con los 30 puntos pareados | D-13 y S-05, con el protocolo de la Tabla 5.6 |
| Presentar RMSE, R², Passing-Bablok y Bland-Altman con los datos reales | Criterio de aceptación de R04 |
| Separar los resultados por clase textural además del agregado | El protocolo exige al menos diez puntos por clase |
| Validar la sonda funcionando a 5 V | D-05 del 31-10-2026 en el prototipo: 4,54 V con 1.000 de 1.000 lecturas, bajo el criterio de 4,75 V; se repite en la placa del instrumento y en D-14 |
| Ejecutar el ensayo real de autonomía y compararlo con el cálculo | D-08, con batería de 2.000 mAh y apagado entre jornadas |
| Verificar el riel de 3,3 V con la celda próxima a 3,4 V y durante picos | D-04 |
| Ejecutar pruebas completas del circuito de carga y del power-path externo | D-15 |
| Verificar corriente, tensión de flotación y temperatura durante la carga | D-15 y F-11 |
| Ejecutar la prueba real de alcance BLE a 5 m y 10 m con carcasa cerrada | S-06; preliminar del 31-10-2026 sin envolvente: 19 de 19 a 5 m y 5 de 5 a más de 10 m con muros |
| Ejecutar las seis pruebas de caída desde 1 m | N-02 |
| Ejecutar pruebas de operación a −5 °C, +25 °C y +50 °C | N-03, que añade +5 °C |
| Ejecutar el ensayo IP67 normativo | N-01, en laboratorio acreditado |
| Confirmar que respiradero, USB-C, interruptor y prensaestopa mantienen la estanqueidad | N-01 con el conjunto completo montado |
| Ejecutar ensayos ESD de los puertos accesibles | D-03 y N-04, por cotizar junto al de radiofrecuencia |
| Verificar experimentalmente el torque de cierre y la repetibilidad del sello | D-16, cinco ciclos de cierre con inmersión de control |
| Ejecutar la prueba de cambio de batería y confirmar el requisito de 5 min o menos | D-18 y F-14 |
| Revisar la compatibilidad ambiental del PETG tras exposición térmica y solar | D-17, con contingencia de ASA |
| Ejecutar el FAT completo sobre el prototipo y después sobre el 100 % de las unidades | F-01 a F-15, formularios del anexo E |
| Ejecutar el SAT en campo y obtener recepción firmada | S-01 a S-09, acta firmada del anexo E |
| Ejecutar las pruebas reales de operación offline y sincronización posterior | T-01 ejecutado el 31-10-2026 en el moto g56 5G; faltan S-04 y S-07 en campo |
| Verificar la ausencia de duplicados o pérdidas durante la sincronización | T-01 y S-07; W-01 sólo cubre la lógica en computador |

## Evidencia necesaria para cerrar la retroalimentación

La edición del informe no sustituye ensayos. El Word conserva el veredicto Pendiente donde no existe aceptación completa, tal como lo pide la retroalimentación. Los registros de banco del 31-10-2026 (D-05, D-07, D-14, S-06 preliminar y T-01) están en `Registros de banco/`, con datos crudos, capturas y los scripts de medición. El nombre de producto adoptado es **sonda portátil multivariable de diagnóstico agronómico**; «agrónomo» designa a la persona, no al diagnóstico.
| Frente | Qué existe o se corrigió | Evidencia que debe aportar el equipo |
|---|---|---|
| Campaña pareada R04 | Protocolo de 30 puntos, al menos 10 por clase textural; textura como estrato de laboratorio, no variable de la sonda; RMSE, R y R², Passing-Bablok y Bland-Altman con alcance correcto | Planilla de pares reales, certificados y métodos del laboratorio, humedad y densidad del mismo cilindro, identificación de muestras y resultados agregados y por textura; una campaña independiente si se ajusta calibración |
| Sonda a 5 V y Modbus R01/R15 | Lectura implementada en `Firmware/sonda.cpp`; antecedente de una trama válida, no aceptación completa | Registro a 5 y 12 V con patrones, consumo y estabilización; 1.000 lecturas consecutivas con CRC, reintentos y tiempos. Si 5 V falla, implementar y ensayar alimentación alternativa y actualizar energía |
| Energía R07/R08/R17 | Autonomía calculada; umbrales exactos de batería y seis sonidos alineados con el código; carga FAT coherente con 4,20 V ± 0,05 V | Corriente y energía por estado, duración real con el patrón de uso, tensión de corte, oscilogramas de 3,3 V con batería a 3,4 V y picos, ciclo de carga completo, temperatura de celda y cargador, corriente de batería separada de consumo del equipo y conmutación del power-path |
| Sellado y mecánica R09/R11/R27 | IP67 separado del control FAT y del grado de cada accesorio; revisiones identificadas como diseño | Ensayo normativo de polvo e inmersión, seis caídas de 1 m, torque y repetibilidad del sello, USB-C/interruptor/respiradero/prensaestopa montados, cambio de batería ≤ 5 min y prueba de sellado posterior |
| Ambiente y protecciones R02/R10/R16/R18/R19 | BME280 especificado; banco documenta BMP280 sin humedad; hoja de datos separada de exactitud del equipo | Contraste del BME280 real, operación a +5/+25/+50 °C pedidos y −5 °C que exige el diseño, exposición térmica/solar PETG, ESD, certificados de celda, protecciones y conformidad de radio |
| BLE y teléfonos R03/R05/R06/R12/R13/R14/R25/R26 | App con especie opcional y cobertura; 436 pruebas App, 8 Web y 29 despachador aprobadas el 29-10-2026, sólo en sus alcances de software | Modelos físicos y versiones exactas Android/iOS; tiempo de captura; 20 intentos por distancia a 5 y 10 m con carcasa cerrada; modo avión, reinicio con cola, interrupción de envío, comparación de identificadores y valores; accesos cruzados y accesibilidad |
| Compra y fabricación R22/R23/R24 | ESP32-WROOM-32D es selección de diseño; segundas fuentes sin validación; R24 deja de declararse cumplido; anexos A a F existen y se pueden abrir | Números de parte completos, revisión KiCad recuperada, acta de liberación de Gerber/BOM/posiciones, órdenes y cotizaciones formales, reemplazo de S1/S2 por levantamientos o cotizaciones, validación por bloque de alternativas y tiempos de estación |
| Trazabilidad FAT/SAT | Anexo E incorpora acta, revisión de PCB/carcasa, huella de firmware, compilación de app y referencias a fotografías o registros | FAT completo del prototipo y después de todas las unidades, justificación de ensayos por muestreo, SAT en campo firmado y asociación inequívoca con cada número de serie |
| Firmware comercial | Modbus, estado BLE y monitor implementados; deep-sleep y receptor de actualización BLE no implementados | Ensayos de sueño/despertar y corriente; actualización BLE completa con integridad, interrupción y recuperación, antes de ofrecer esas capacidades |

Las cifras económicas y el calendario del anexo F conservan su base y fecha de corte: no se cambiaron para aparentar ejecución. Los precios consultados no se renuevan por cambiar la fecha del informe. La documentación de raíz contiene además una descripción antigua que dice que el firmware aún no lee suelo; para esta auditoría se siguió el código y `Firmware/TASK.md`, como exige la regla de fuentes de verdad.

Para la trazabilidad interna de la aplicación se revisaron `App/src/screens/MeasureScreen.tsx`, `App/src/utils/measureSpecies.ts`, `App/src/engine/speciesCatalog.ts`, `App/src/engine/speciesRules.ts`, `App/src/engine/prePlanting.ts`, `App/src/engine/evaluationCoverage.ts`, `App/src/utils/measureCaptureSession.ts` y `App/src/services/measurementsService.ts`. El Word no contiene estas rutas.

La lista de materiales y los costos se conservan por decisión del proyecto, sin anticipar ahorros por la reducción geométrica. La fuente económica sigue siendo `finanzas/supuestos.json` y los resultados se consultan en `docs/RESULTADOS_FINANCIEROS.md`.

## Preparación práctica de la campaña de laboratorio

El cierre de R04 requiere datos que todavía no están incorporados al expediente. No basta la compra de la sonda, su respuesta Modbus o su funcionamiento a 5 V. Estos últimos comprueban adquisición y operación; la campaña cuantifica la correspondencia con referencias y sus límites por textura.

1. **Acordar el servicio antes de salir a campo.** Solicitar pH con medio y relación suelo:solución, CE con método de extracción y temperatura de referencia, humedad gravimétrica, densidad aparente seca y textura. Confirmar métodos incluidos en la acreditación, incertidumbre cuando corresponda, masa, envases, conservación, recepción, precio y plazo. El paquete de fertilidad no implica que incluya las determinaciones físicas. La Facultad de Ciencias Agronómicas de la Universidad de Chile distingue servicios de química y física de suelos; puede requerirse coordinación entre ambos.
2. **Definir 30 puntos independientes.** Planificar al menos diez por cada una de tres clases texturales, confirmadas después por laboratorio. No mezclar puntos en una muestra compuesta para esta comparación. Las lecturas repetidas del mismo punto se conservan como repetibilidad, sin aumentar artificialmente el número de puntos. Mantener la misma revisión de equipo y firmware durante la campaña o identificar los cambios.
3. **Medir y tomar las muestras pareadas.** Asignar códigos estables, por ejemplo P01 a P30. Medir primero con la sonda a 5 V; registrar tensión durante lectura, posición, profundidad, fecha, suelo, lecturas y estabilidad. Después extraer la muestra próxima a los electrodos y el cilindro de volumen conocido sin compactar; mantener la humedad, identificar y transportar según lo acordado. Para cada punto, el cilindro y la muestra de química deben poder asociarse al mismo registro.
4. **Consolidar los datos crudos.** Columnas mínimas: punto; fecha/hora; coordenadas; operador; número de serie; revisiones de placa y carcasa; firmware; versión/compilación de app; tensión de sonda; profundidad; repeticiones de pH, CE, humedad y temperatura; número de muestra y cilindro; informe del laboratorio; método/unidades; textura; masa húmeda, seca y tara; volumen; densidad aparente; valores de referencia; incidencias. Conservar resultados fallidos y exclusiones justificadas, no sólo las lecturas favorables.
5. **Comparar métodos compatibles.** El pH directo y el pH en suspensión, y la CE directa y la CE de extracto, no son automáticamente intercambiables. El laboratorio debe definir el alcance de la comparación; una correlación no convierte la sonda en un analizador de extractos. Para humedad, convertir la gravimétrica a volumétrica con densidad aparente medida en el mismo cilindro; no usar una densidad supuesta por textura.
6. **Preparar los resultados.** Para pH, CE y humedad: tabla de pares, RMSE, R y R², Passing-Bablok (pendiente/ordenada e intervalos del 95 %) y Bland-Altman (sesgo/límites e intervalos), tanto agregados como por textura. Aplicar los límites de la Tabla 5.6 del informe. Los diez puntos por textura pueden dejar intervalos amplios: un resultado no concluyente no se transforma en aprobación. Mantener N, P y K informativos. Si se ajusta una calibración, validar con puntos nuevos.
7. **Cerrar el acta.** Adjuntar certificados del laboratorio, registros de campo, datos originales, cálculos/gráficos y conclusión frente a cada criterio. Actualizar R04 únicamente según ese resultado. La temperatura del suelo y el BME280 se contrastan por separado con patrones; no forman parte de las tres comparaciones químicas/físicas anteriores.

**Aclaraciones de operación aportadas por el equipo.** El usuario informa que la muestra funciona a 5 V, batería nominal de 2.000 mAh, interruptor para apagar, placa retenida con M2 y acceso de batería mediante tapa y dos tornillos de bornera con Phillips. Se incorporan como operación observada y configuración, no como exactitud, autonomía, IP67, inmunidad ESD o tiempo de recambio acreditados. El valor de 100 mA se planteó como recuerdo aproximado, sin medición: no se adopta como máximo ni como dato del modelo. El receptor de actualización por BLE no está en el firmware revisado y no se declara implementado. El usuario informa que la V3 contiene cotizaciones formales; se solicitó la ruta porque esa carpeta no está disponible en este espacio de trabajo.

## Cómo se regenera

```bash
python finanzas/modelo.py              # cifras, anexos A, B, E y F e informe 1 corregido
python finanzas/figuras_e2.py          # figuras y anexos C y D (renders de la placa con kicad-cli)
python finanzas/renumerar_informe_e2.py   # renumera tablas y figuras y rehace los tres índices
python finanzas/verificar_informe_e2.py   # informe 2 contra el modelo y los anexos: 0 errores
python finanzas/exportar_informe_e2.py --paginar  # Word con índice y páginas actualizados
```
