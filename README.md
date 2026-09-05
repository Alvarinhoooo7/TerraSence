# 🌱 TerraSense — Diagnóstico agronómico de suelo y microclima

**Proyecto de Título — Ingeniería en Electrónica y Sistemas Inteligentes, INACAP**  
**Autores:** Álvaro Villena y Alan · **Versión:** 5 de septiembre de 2026

[Informe 1 completo](docs/INFORME%201%20.docx.md) · [Índice de documentación](docs/README.md)

TerraSense combina una sonda de suelo 7-en-1, un **sensor ambiental BME280**, un ESP32 y una aplicación móvil para convertir lecturas de terreno en recomendaciones de siembra, riego y manejo del cultivo. El equipo utiliza una **carcasa portátil impresa en 3D**.

El agricultor obtiene un diagnóstico del punto de muestreo según la etapa del cultivo: pre-siembra, vegetativo, floración o cosecha. La lectura local y el pronóstico meteorológico cumplen funciones distintas dentro del sistema.

## Lectura local y grilla 3×3

El **BME280 es parte esencial del instrumento**: mide la temperatura del aire, la humedad relativa y la presión barométrica en el punto de lectura. Esas tres variables forman el **tercio ambiental de la grilla 3×3**. Sin ellas, la lectura ambiental queda incompleta.

| Fuente | Información | Función |
|---|---|---|
| Sonda RS-485 de suelo | Humedad, temperatura del suelo, conductividad, pH y registros N/P/K | Diagnóstico edafológico |
| BME280 local por I²C | Temperatura del aire, humedad relativa y presión barométrica | Tres celdas ambientales de la grilla |
| API gratuita de clima | Pronóstico de los próximos cinco días | Complemento para planificar labores después de medir |

La temperatura y humedad del aire se distinguen de las mediciones del suelo. Los registros N/P/K requieren interpretación según la sonda y el método; el análisis de laboratorio sustenta las decisiones de fertilización. La grilla organiza la información del diagnóstico; no equivale a mostrar todos los registros de la sonda como mediciones independientes.

El sensor ambiental debe comunicarse con el aire exterior mediante una abertura protegida y ubicarse separado del calor del ESP32, del cargador y de la mano. La carcasa incorpora este requisito junto con las juntas y fijaciones. [Ficha del BME280, Bosch](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf).

## Pronóstico y recomendaciones

Después de la lectura, la API gratuita aporta el pronóstico para los **próximos cinco días**. Permite recomendar posponer una labor aunque el suelo presente condiciones favorables en ese instante. Por ejemplo:

- **Lluvias intensas previstas:** recomendar aplazar la siembra ante riesgo de saturación del suelo y problemas de germinación.
- **Ola de calor prevista:** advertir del riesgo para la emergencia del cultivo y ajustar la fecha de siembra o el manejo del riego.
- **Sin conexión:** conservar la medición local y presentar el diagnóstico sin pronóstico disponible.

La arquitectura reserva las tres celdas ambientales para el BME280. El pronóstico se presenta como contexto de planificación, con fecha y horizonte propios. El contrato de integración y su estado se detallan en [docs/INFORME%201%20.docx.md#integracion-bme280](docs/INFORME%201%20.docx.md#integracion-bme280).

## Modelo comercial

Venta directa del instrumento a pequeños y medianos agricultores, asesores agronómicos y administradores de predios. El equipo se ofrece con aplicación móvil y sin cobro por lectura.

La estrategia combina tienda, pauta digital, demostraciones y atención por WhatsApp. El plan comercial contempla 200, 350, 500, 650 y 850 equipos anuales durante los primeros cinco años. El presupuesto de adquisición es de $30.000 por venta objetivo; la gestión de agencia se incorpora desde 650 ventas anuales.

<!-- FINANZAS:INICIO -->

## Finanzas y modelo económico

Precio de venta: **$349.990 CLP con IVA** ($294.109 netos). Evaluación del proyecto a cinco años, 2027–2031, con flujos mensuales y tasa de descuento del 20 % anual.

### BOM y margen por equipo

| Componente | Cantidad | Costo unitario neto CLP | Subtotal CLP |
|---|---:|---:|---:|
| Sonda RS485 7-en-1 (SKU pendiente de ficha) | 1 | $48.000 | $48.000 |
| Placa de desarrollo ESP32-WROOM-32 | 1 | $6.723 | $6.723 |
| Módulo ambiental Bosch BME280 I2C | 1 | $2.941 | $2.941 |
| PCB combinada USB-C carga + boost | 1 | $900 | $900 |
| LiPo 2000 mAh protegida | 1 | $4.500 | $4.500 |
| SP3485 transceptor RS485 3.3 V | 1 | $900 | $900 |
| Conector JST batería 3 pines con contraparte/cable | 1 | $450 | $450 |
| Pulsador | 1 | $250 | $250 |
| LED SMD | 3 | $40 | $120 |
| Pasivos, protección y terminación RS485 | 1 | $1.200 | $1.200 |
| PCB portadora y montaje externo SMD | 1 | $2.500 | $2.500 |
| Carcasa impresa en 3D PETG (servicio externo) | 1 | $6.000 | $6.000 |
| Prensaestopas, fijaciones, juntas y respiradero BME280 | 1 | $1.500 | $1.500 |
| Cableado y conectores internos adicionales | 1 | $700 | $700 |
| Embalaje, manual y etiqueta | 1 | $2.000 | $2.000 |
| Flete de insumos y contingencia importación | 1 | $2.500 | $2.500 |
| **Total BOM** | | | **$81.184** |

El **BME280 cuesta $3.500 con IVA** por equipo. La **carcasa impresa en 3D** se incluye como servicio externo a $6.000 netos, con material, impresión, energía y acabado. Las fijaciones, juntas y ventilación protegida del sensor se contabilizan aparte a $1.500 netos.

Merma (3 %), reposiciones (5 %), envío y comisión suman **$29.994 por equipo**. El costo variable total es **$111.178** y el margen de contribución es **$182.931 (62.2% de la venta neta)**. El ensamblaje final se paga en la nómina. La API de pronóstico tiene costo directo de **$0**; los servicios digitales restantes conservan su presupuesto.

### Inversión y financiamiento

| Concepto | CLP |
|---|---:|
| Activos, desarrollo y formalización | $10.353.000 |
| Inventario inicial, IVA incluido | $964.378 |
| **Desembolso inicial** | **$11.317.378** |
| Aporte de socios | $9.000.000 |
| Crédito a 10 años, 12 % efectivo anual | $31.000.000 |
| Gastos de apertura | $620.000 |
| Caja inicial, reserva incluida | $28.062.622 |
| Cuota mensual | $433.836 |

El crédito cubre el desembolso y las necesidades de caja estacionales. Se dimensiona en tramos de $100.000 para mantener, durante los primeros 24 meses, una reserva de tres meses de gastos fijos y cuotas más 10 % del desembolso inicial.

### Flujo de caja anual

| Año | Equipos vendidos | EBITDA | Servicio deuda | Caja final | DSCR | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $4.426.234 | $5.206.035 | $26.470.982 | 0.69 | 176 / 205 |
| 2028 | 350 | $19.015.320 | $5.206.035 | $38.647.148 | 3.34 | 250 / 277 |
| 2029 | 500 | $31.680.620 | $5.206.035 | $57.237.408 | 4.57 | 337 / 364 |
| 2030 | 650 | $35.729.124 | $5.206.035 | $77.360.857 | 4.87 | 472 / 498 |
| 2031 | 850 | $49.915.370 | $5.206.035 | $110.083.164 | 7.29 | 608 / 634 |

La nómina incluye socios, producción y soporte. La contabilidad externa se incorpora desde el primer mes; la contratación aumenta con las horas de trabajo y la base de equipos activos. El DSCR compara la caja disponible para deuda con capital e intereses.

### VAN, TIR y payback

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.489.116 | $15.504.053 | 35,43 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | $20.478.616 | −$50.774.058 | -30,28 % | No recupera en 60 meses | No recupera en 60 meses |
| Crecimiento | $23.661.182 | $69.653.316 | 76,70 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |

Los tres indicadores se calculan sobre el flujo del proyecto: inversión inicial, operación, impuestos, inventario, reinversión y variaciones de caja mínima operativa. La TIR se expresa como tasa efectiva anual y el payback interpola el mes de recuperación. El horizonte de evaluación es de 60 meses, sin valor terminal.

La inversión económica incluye el desembolso inicial y la caja mínima operativa. El préstamo y sus cuotas se analizan en el flujo de financiamiento; los sueldos forman parte del costo de operación.

[Flujo de caja Excel](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) · [BOM Excel](PCB/BOM_TerraSense.xlsx) · [Resultados completos](docs/RESULTADOS_FINANCIEROS.md) · [Metodología y supuestos](docs/MODELO_ECONOMICO.md)

Actualizar cifras: `python finanzas/modelo.py`.

<!-- FINANZAS:FIN -->

## Módulos del proyecto

| Módulo | Contenido |
|---|---|
| [PCB](PCB/README.md) | ESP32-WROOM-32, sonda RS-485, BME280 I²C, alimentación y carcasa 3D |
| [App](App/README.md) | React Native/Expo, BLE, grilla 3×3, diagnóstico e historial de terreno |
| [Web](Web/README.md) | Consola de soporte y catálogo de firmware |
| [Supabase](supabase/README.md) | Datos, autenticación, PostGIS y funciones de backend |
| [Comercialización](Comercializacion%20de%20Tecnologias/README.md) | Guion de presentación y defensa del modelo comercial |
| [Documentación](docs/MODELO_ECONOMICO.md) | Estudio económico, supuestos, alcance y plan de integración |

## Ejecución local

La App utiliza el `.env` de la raíz con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. La consola Web utiliza su propio `Web/.env`, según [Web/.env.example](Web/.env.example).

```bash
cd App
npm install
npm test
npx tsc --noEmit
npx expo start
```

La conexión BLE requiere un build nativo instalado en el teléfono.

```bash
cd Web
npm install
npm run dev
npm run build
npm run type-check
```

Desde la raíz, para regenerar la BOM, el flujo de caja y las tablas económicas:

```bash
python -m pip install -r finanzas/requirements.txt
python finanzas/modelo.py
python -m unittest discover -s finanzas -p "test_*.py"
```

## Documentación del estudio

[Metodología económica](docs/MODELO_ECONOMICO.md) · [Estudio de viabilidad](docs/INFORME%201%20.docx.md#analisis-economico) · [Plan técnico](docs/PLAN_VALIDACION.md) · [Marco normativo](docs/MARCO_NORMATIVO_Y_ESTANDARES.md) · [Revisión de cálculos](docs/MODELO_ECONOMICO.md#correcciones-del-calculo)
