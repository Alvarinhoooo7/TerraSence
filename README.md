<div align="center">
  
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="Logo/Logo/terrasense-dark.svg" />
    <img src="Logo/Logo/terrasense.svg" alt="TerraSense · Soil Technologies" width="380" />
  </picture>

  # TerraSense
  **Diagnóstico agronómico de suelo y microclima impulsado por IoT**

  [![Estado](https://img.shields.io/badge/Estado-En_desarrollo-blue.svg)](#)
  [![Hardware](https://img.shields.io/badge/Hardware-ESP32-green.svg)](#)
  [![App](https://img.shields.io/badge/App-React_Native-61DAFB.svg)](#)
  [![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](#)
  [![Institución](https://img.shields.io/badge/Proyecto_de_T%C3%ADtulo-INACAP-red.svg)](#)

  *Convirtiendo lecturas de terreno en recomendaciones prácticas de siembra, riego y manejo de cultivos.*

  [Índice de Documentación](docs/README.md) · [Arquitectura](#arquitectura-del-sistema)

</div>

---

## 📖 Descripción General

**TerraSense** es una herramienta portátil diseñada para pequeños y medianos agricultores, asesores agronómicos y administradores de campos. Combina una sonda de suelo 7-en-1 de nivel industrial, un sensor ambiental local (BME280), y un cerebro procesador ESP32 integrado en una carcasa portátil impresa en 3D.

El objetivo principal no es solo mostrar números crudos, sino entregar un **diagnóstico prescriptivo** del punto de muestreo según la etapa del cultivo (pre-siembra, vegetativo, floración o cosecha) sin requerir conexión a internet durante la medición. La nube interviene solo para el respaldo diferido, la gestión de cuentas y el pronóstico climático.

## 🚨 La Problemática

La problemática real radica en que los pequeños y medianos agricultores carecen de herramientas tecnológicas accesibles y comprensibles para diagnosticar el estado de su suelo. En un contexto de sequía constante y alto costo de los insumos agrícolas, optimizar el uso del agua y los fertilizantes es vital para la supervivencia del cultivo.

El problema central es que el agricultor agrícola opera **"a ciegas"**. Carece de herramientas accesibles para diagnosticar el estado de su suelo y se ve obligado a tomar decisiones críticas basándose únicamente en la intuición. 

¿Por qué ocurre esto? Principalmente por dos barreras:
*   **Barrera Económica:** Los equipos de medición profesional son financieramente inalcanzables para la agricultura familiar.
*   **Barrera de Interpretación:** Los instrumentos disponibles entregan datos técnicos crudos, incomprensibles sin estudios agronómicos avanzados, que no brindan el feedback necesario para ejecutar una acción concreta.

Este escenario genera un impacto negativo a lo largo de todo el ciclo de vida del cultivo:
*   **Pre-siembra:** Pérdida de semillas por siembra en suelos fríos o altamente salinos.
*   **Vegetativo:** Asfixia de raíces y pérdida de fertilizantes por riegos ineficientes.
*   **Floración:** Aborto floral masivo por estrés hídrico no detectado a tiempo.
*   **Cosecha:** Destrucción de la estructura del suelo por ingresar con exceso de humedad.

## ✨ Características Principales

* 📡 **Medición Integral (Grid 2×5):** Diez variables: humedad del suelo, conductividad eléctrica, temperatura del suelo, nitrógeno, fósforo, potasio y pH de la sonda; temperatura ambiente, humedad relativa ambiente y presión atmosférica ambiente del BME280. Dos columnas y cinco filas, implementadas en la App y en el detalle de la consola web.
* 🌦️ **Microclima Local + Pronóstico:** El sensor **BME280** lee temperatura, humedad relativa y presión en el lugar físico de la medición. Como **apoyo y complemento**, una API gratuita de clima aporta el pronóstico de los próximos 5 días, permitiendo planificar labores a futuro (ej. posponer siembra si hay riesgo de lluvias intensas).
* 🔋 **Diseño de Bajo Consumo:** La rama de medición se corta por MOSFET fuera del instante de lectura y la batería LiPo se recarga por USB-C, sin pilas desechables. Con reposo supuesto de ~19,4 µA, el balance en Wh da una referencia optimista de **~256 días**, antes de cerrar consumos auxiliares y condiciones reales. Es una cifra calculada: **la medición desde batería en banco sigue pendiente**.
* 📱 **Ecosistema Interconectado:** Comunicación Bluetooth Low Energy (BLE) hacia la App móvil que no requiere internet para diagnosticar, respaldado por una plataforma Web y base de datos.

---

## 🧩 Módulos del Proyecto

El repositorio está dividido en áreas de dominio específicas, cada una con su propia documentación detallada:

| Directorio | Descripción | Tecnologías |
|:---|:---|:---|
| 🪛 [**`/PCB`**](PCB/README.md) | Esquemáticos KiCad, arquitectura de potencia, contrato de trama BLE y diseño de carcasa 3D. | ESP32, BME280, RS-485 |
| 📱 [**`/App`**](App/README.md) | Aplicación móvil que recibe las lecturas vía BLE y genera el diagnóstico agronómico. | React Native, Expo, BLE |
| 💻 [**`/Web`**](Web/README.md) | Consola de administración y soporte web para gestión del sistema. | React, Vite, TypeScript |
| ☁️ [**`/supabase`**](supabase/README.md) | Funciones de backend (RPC), políticas RLS y migraciones. | PostgreSQL, Edge Functions |
| 📄 [**`/docs`**](docs/README.md) | Informes formales del proyecto de título, manuales, normativas y planes de validación. | Markdown, Documentación |
| 📈 [**`/finanzas`**](docs/MODELO_ECONOMICO.md) | Estudio de viabilidad, cálculo de costos (BOM) y simulador de flujo de caja. | Python, Excel |

---

<a id="arquitectura-del-sistema"></a>

## ⚙️ Arquitectura del Sistema

```mermaid
graph TD;
    A[Sonda Suelo 7-en-1] <-->|RS-485| B(ESP32-WROOM-32);
    C[Sensor BME280] <-->|I2C| B;
    B <-->|Bluetooth LE| D{App Móvil TerraSense};
    E[API Clima 5 Días] -.->|Internet| D;
    D <-->|Sincronización| F[(Supabase Backend)];
    G[Consola Web] <-->|Gestión| F;
```

---

## 🚀 Ejecución Local Rápida

### 1. Variables de Entorno
La App utiliza el archivo `.env` en la raíz del proyecto. La consola web utiliza el suyo propio en `Web/.env`.
```env
# .env (Raíz)
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### 2. Aplicación Móvil (App)
> **Nota:** La conexión real por BLE requiere un build nativo en el teléfono físico. La simulación está disponible en desarrollo.
```bash
cd App
npm install
npm test            # Ejecutar pruebas unitarias
npx tsc --noEmit    # Chequeo de tipos
npx expo start      # Servidor de desarrollo
```

### 3. Consola Administrativa (Web)
```bash
cd Web
npm install
npm run dev         # Servidor en http://localhost:5173
```

### 4. Modelo Financiero (Scripts de simulación)
Desde la raíz del proyecto:
```bash
python -m pip install -r finanzas/requirements.txt
python finanzas/modelo.py
```

---

## 📊 Viabilidad y Modelo Comercial

TerraSense está planteado como un proyecto económicamente sustentable y escalable:
- **Modelo de Ingreso:** Venta directa del hardware con IVA incluido. La app y el diagnóstico local no tienen costos de suscripción mensual.
- **Costos y Margen:** La sonda RS-485 concentra la mayor parte de la BOM; el ensamblaje final se paga en la nómina y no se duplica como costo variable.
- **Financiamiento:** **$9.000.000 de los socios como PIE propio**, más crédito bancario para el saldo de inversión y capital de trabajo. El pie se cuenta una sola vez; modalidad, tasa y plazo requieren cotización.
- **Evaluación:** Flujos mensuales sobre 120 meses, con comparación a 60 meses, sin valor terminal, distinguiendo el retorno económico del proyecto de la cobertura de deuda (DSCR).

> 💡 Las cifras del bloque siguiente se generan desde `finanzas/supuestos.json`. **No editar a mano:** ejecutar `python finanzas/modelo.py`.

<!-- FINANZAS:INICIO -->

## Finanzas y modelo económico

Precio de venta: **$349.990 CLP con IVA** ($294.109 netos). Evaluación del proyecto a diez años, 2027–2036, con flujos mensuales y tasa de descuento del 20 % anual.

### BOM y margen por equipo

| Componente | Cantidad | Costo unitario neto CLP | Subtotal CLP |
|---|---:|---:|---:|
| Sonda RS485 7-en-1 (AliExpress 1005005548177699; variante pendiente) | 1 | $48.000 | $48.000 |
| Módulo ESP32-WROOM-32 desnudo | 1 | $2.300 | $2.300 |
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
| **Total BOM** | | | **$76.761** |

El **BME280 cuesta $3.500 con IVA** por equipo. La **carcasa impresa en 3D** se incluye como servicio externo a $6.000 netos, con material, impresión, energía y acabado. Las fijaciones, juntas y ventilación protegida del sensor se contabilizan aparte a $1.500 netos.

Merma (3 %), reposiciones (5 %), envío y comisión suman **$29.640 por equipo**. El costo variable total es **$106.402** y el margen de contribución es **$187.708 (63.8% de la venta neta)**. El ensamblaje final se paga en la nómina. La API de pronóstico tiene costo directo de **$0**; los servicios digitales restantes conservan su presupuesto.

### Inversión y financiamiento

| Concepto | CLP |
|---|---:|
| Activos, desarrollo y formalización | $10.353.000 |
| Inventario inicial, IVA incluido | $911.748 |
| **Desembolso inicial** | **$11.264.748** |
| Pie propio de socios ($4.500.000 cada uno) | $9.000.000 |
| Crédito bancario a 10 años, 12 % efectivo anual | $30.000.000 |
| Gastos de apertura | $600.000 |
| Caja inicial, reserva incluida | $27.135.252 |
| Cuota mensual | $419.842 |

Los $9 millones propios son el **pie** de los socios, $4.500.000 cada uno (50 % y 50 %), equivalentes al **30 % del crédito**: es el capital propio que el banco exige antes de desembolsar el suyo. No se descuenta del principal ni se devuelve al banco. El crédito de $30.000.000 cubre el saldo del desembolso y la caja de arranque; se toma a 10 años y 12 % efectivo anual, con cuota fija de $419.842 e intereses totales de $20.380.983. La reserva objetivo es de tres meses de gastos fijos y cuotas más 10 % del desembolso inicial; con este principal queda $1.248.625 corta en su punto más bajo (mes 17), sin que la caja baje de $15.217.179 en los primeros 24 meses.

### Flujo de caja anual

| Año | Equipos vendidos | EBITDA | Servicio deuda | Caja final | DSCR | Equilibrio operativo / con deuda |
|---|---:|---:|---:|---:|---:|---:|
| 2027 | 200 | $5.381.535 | $5.038.098 | $26.711.077 | 0.92 | 172 / 199 |
| 2028 | 350 | $20.734.413 | $5.038.098 | $40.377.446 | 3.71 | 243 / 269 |
| 2029 | 500 | $34.209.899 | $5.038.098 | $61.047.265 | 5.10 | 329 / 354 |
| 2030 | 650 | $39.115.675 | $5.038.098 | $83.906.772 | 5.54 | 460 / 484 |
| 2031 | 850 | $54.477.140 | $5.038.098 | $120.205.037 | 8.20 | 593 / 617 |
| 2032 | 892 | $55.675.031 | $5.038.098 | $157.618.328 | 8.43 | 637 / 660 |
| 2033 | 937 | $65.004.734 | $5.038.098 | $199.921.914 | 9.40 | 648 / 670 |
| 2034 | 984 | $67.781.034 | $5.038.098 | $245.488.913 | 10.04 | 691 / 713 |
| 2035 | 1033 | $79.076.985 | $5.038.098 | $299.129.915 | 11.65 | 701 / 722 |
| 2036 | 1085 | $91.844.429 | $5.038.098 | $361.983.396 | 13.48 | 711 / 731 |

La nómina incluye socios, producción y soporte. La contabilidad externa se incorpora desde el primer mes; la contratación aumenta con las horas de trabajo y la base de equipos activos. El DSCR compara la caja disponible para deuda con capital e intereses.

### VAN, TIR y payback

| Escenario | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
|---|---:|---:|---:|---:|---:|
| Base | $20.431.223 | $75.510.458 | 54,42 % | 34,25 meses (2,85 años) | 35,61 meses (2,97 años) |
| Estrés | $20.420.723 | −$42.507.593 | -0,02 % | No recupera en 120 meses | No recupera en 120 meses |
| Crecimiento | $23.545.396 | $184.538.801 | 92,45 % | 22,29 meses (1,86 años) | 22,92 meses (1,91 años) |

Los tres indicadores se calculan sobre el flujo del proyecto: inversión inicial, operación, impuestos, inventario, reinversión y variaciones de caja mínima operativa. La TIR se expresa como tasa efectiva anual y el payback interpola el mes de recuperación. El horizonte de evaluación es de 120 meses, sin valor terminal.

La inversión económica incluye el desembolso inicial y la caja mínima operativa. El préstamo y sus cuotas se analizan en el flujo de financiamiento; los sueldos forman parte del costo de operación.

[Flujo de caja Excel](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) · [BOM Excel](PCB/BOM_TerraSense.xlsx) · [Resultados completos](docs/RESULTADOS_FINANCIEROS.md) · [Metodología y supuestos](docs/MODELO_ECONOMICO.md)

La comparación a cinco años y los hitos de liquidez y deuda están en los resultados completos y en el Excel.

Actualizar cifras: `python finanzas/modelo.py`.

<!-- FINANZAS:FIN -->

Para un desglose completo, revisa el [Modelo Económico](docs/MODELO_ECONOMICO.md), el [Informe 1](docs/INFORME%201%20.docx.md#analisis-economico), la [Planilla de Flujo de Caja](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx), y la [BOM de Componentes](PCB/BOM_TerraSense.xlsx).

---

<div align="center">
  <b>Autores:</b> Álvaro Villena y Alan <br>
  Proyecto de Ingeniería en Electrónica y Sistemas Inteligentes - INACAP (2026)
</div>
