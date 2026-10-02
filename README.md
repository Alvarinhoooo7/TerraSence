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

* 📡 **Medición Integral (Grid 2×5):** Diez variables: humedad del suelo, conductividad eléctrica, temperatura del suelo, nitrógeno, fósforo, potasio y pH de la sonda; temperatura ambiente, humedad relativa ambiente y presión atmosférica ambiente del BME280. En la App, un Grid de dos columnas y cinco filas; en el backoffice web, las mismas diez variables en filas desplegables.
* 🌦️ **Microclima Local + Pronóstico:** El sensor **BME280** lee temperatura, humedad relativa y presión en el lugar físico de la medición. Como **apoyo y complemento**, una API gratuita de clima aporta el pronóstico de los próximos 5 días, permitiendo planificar labores a futuro (ej. posponer siembra si hay riesgo de lluvias intensas).
* 🔋 **Diseño de Bajo Consumo:** La sonda se corta por MOSFET fuera del instante de lectura, el equipo se apaga con un interruptor entre jornadas y la batería LiPo se recarga por USB-C, sin pilas desechables. La autonomía por patrón de uso está calculada en el balance energético del [informe corregido](Evaluacion/Evaluacion%201/INFORME%201%20CORREGIDO.md): **la medición desde batería en banco sigue pendiente**.
* 📱 **Ecosistema Interconectado:** Comunicación Bluetooth Low Energy (BLE) hacia la App móvil que no requiere internet para diagnosticar, respaldado por una plataforma Web y base de datos.

---

## 🧩 Módulos del Proyecto

El repositorio está dividido en áreas de dominio específicas, cada una con su propia documentación detallada:

| Directorio | Descripción | Tecnologías |
|:---|:---|:---|
| 🪛 [**`/PCB`**](PCB/README.md) | Esquemáticos KiCad, arquitectura de potencia, contrato de trama BLE y diseño de carcasa 3D. | ESP32, BME280, RS-485 |
| 🔌 [**`/Firmware`**](Firmware/README.md) | Firmware del ESP32: vinculación BLE con pulsador PAIR, LEDs, buzzer, BME280 y trama de 20 bytes. Aún no lee la sonda de suelo. | Arduino IDE, núcleo esp32 3.x |
| 📱 [**`/App`**](App/README.md) | Aplicación móvil que recibe las lecturas vía BLE y genera el diagnóstico agronómico. | React Native, Expo, BLE |
| 💻 [**`/Web`**](Web/README.md) | Backoffice de soporte, de una sola cuenta: buscar equipos, administrar sus usuarios, resetearlos y enviarles actualizaciones de firmware. | React, Vite, TypeScript |
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
    G[Backoffice Web] <-->|Soporte| F;
```

---

## 🚀 Ejecución Local Rápida

### 1. Variables de Entorno
La App lee `App/.env` y, como respaldo, el `.env` de la raíz (`App/.env` tiene prioridad). El backoffice web usa el suyo en `Web/.env`, con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
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

### 3. Backoffice (Web)
```bash
cd Web
npm install
npm run dev         # Servidor en http://localhost:5173
```

### 4. Modelo Financiero (Scripts de simulación)
Desde la raíz del proyecto:
```bash
python -m pip install -r finanzas/requirements.txt
python finanzas/modelo.py          # cifras, planillas, sección económica, informe corregido y README
python -m unittest discover -s finanzas -p "test_*.py"   # pruebas del modelo financiero
```

---

## 📊 Viabilidad y Modelo Comercial

TerraSense está planteado como un proyecto económicamente sustentable y escalable:
- **Modelo de ingreso:** venta directa del hardware con IVA incluido. La app y el diagnóstico local no tienen suscripción.
- **Precio:** se **deriva** del costo total con un margen exigido del 30 %; no es un supuesto de entrada.
- **Costos y margen:** la sonda RS-485 concentra el 59,9 % de la BOM. El ensamblaje se paga en la nómina y no se duplica como costo variable.
- **Financiamiento:** el pie de los socios se entrega al banco como condición de entrada y el crédito financia el 100 % de la inversión inicial. Pie y crédito **no se suman** como fuentes.
- **Evaluación:** flujos anuales sobre 10 años (2027–2036), sin valor terminal, con depreciación, amortización del activo nominal y tabla de amortización del crédito por sistema francés.

> 💡 Las cifras del bloque siguiente se generan desde `finanzas/supuestos_reformulado.json`. **No editar a mano:** ejecutar `python finanzas/documentacion_reformulada.py`.

<!-- FINANZAS:INICIO -->

## Finanzas y modelo económico

**El precio no es un supuesto: es un resultado.** Se construye primero la estructura completa de costos e inversión y el precio se deriva de ella exigiendo un 30 % de utilidad sobre el costo total. Precio de lista resultante: **$465.021 CLP con IVA** ($390.774 netos). Evaluación a diez años, 2027–2036, con tasa de descuento del 20 % anual.

### BOM por equipo

| Bloque del equipo | Líneas | Subtotal neto por equipo |
|---|---:|---:|
| Sonda | 1 | $48.000 |
| Celda | 1 | $4.400 |
| Carcasa | 1 | $7.238 |
| PCB V3 y ensamble | 3 | $4.896 |
| MCU y radio | 1 | $2.710 |
| USB-C y carga | 15 | $1.014 |
| Alimentación 3,3 V | 1 | $83 |
| Elevador 5 V | 10 | $614 |
| RS-485 | 5 | $249 |
| Sensor ambiental | 2 | $4.613 |
| Interfaz de usuario | 10 | $382 |
| Protección y medición de batería | 5 | $626 |
| Pasivos de desacoplo | 4 | $213 |
| Montaje y embalaje | 9 | $5.040 |
| **Total BOM neto** | **68** | **$80.076** |

La BOM es la del **producto sobre la PCB V3, sin placas de desarrollo ni módulos** (sí el módulo ESP32-WROOM-32D, con antena y certificación). Cada línea lleva modelo, código de proveedor (LCSC principal, DigiKey alternativa), precio, fecha de consulta y enlace en la planilla `PCB/BOM_TerraSense.xlsx` y en el anexo A de la Evaluación 2. La sonda de suelo concentra el 59,9 % del costo de materiales y es la decisión de abastecimiento crítica del proyecto.

> La BOM de la V3 se construye con precios de catálogo de LCSC (consultados el 02-10-2026) y estimaciones declaradas; la única compra efectuada es la de la PCB V2. Los materiales de montaje y sellado y la sonda no tienen cotización formal.

Sumando merma (3 %), provisión de reposiciones y garantía (5 %) y envío, el costo variable por equipo antes de comisión es **$92.482**. La carcasa se imprime en taller propio: las dos impresoras 3D están en el activo fijo y el filamento, la merma, la energía y la mantención se cargan al costo unitario.

### Inversión inicial y financiamiento

| Concepto | CLP |
|---|---:|
| Equipamiento y activo fijo | $6.474.122 |
| Activo nominal (puesta en marcha) | $5.900.000 |
| Capital de trabajo (3,0 meses de estructura) | $12.719.785 |
| Inventario inicial | $3.082.735 |
| **Inversión inicial total** | **$28.176.642** |
| Crédito bancario a 10 años, 12 % efectivo anual | $28.176.642 |
| Pie propio exigido (30 % del crédito) | $8.452.993 |
| Aporte por socio | $4.226.496 |
| Cuota mensual (sistema francés) | $394.324 |

**El pie no es una fuente adicional de fondos.** Los socios lo entregan al banco como condición de entrada y es el crédito el que financia el 100 % de la inversión inicial; sumar pie más crédito cuenta dos veces el mismo dinero. El capital de trabajo no se fijó por regla sino iterando hasta que la caja nunca baje de un piso de seguridad, con un mínimo de política de 3 meses de estructura.

### Flujo de caja anual

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $78.154.812 | $-1.472.040 | $-602.838 | $12.116.947 |
| 2028 | 350 | $140.874.049 | $156.594 | $833.122 | $12.950.069 |
| 2029 | 500 | $207.286.101 | $13.460.675 | $13.921.407 | $26.871.476 |
| 2030 | 650 | $277.556.089 | $30.677.947 | $30.896.988 | $57.768.463 |
| 2031 | 850 | $373.846.702 | $69.034.131 | $68.982.477 | $126.750.940 |
| 2032 | 892 | $404.088.701 | $69.842.602 | $61.008.722 | $187.759.662 |
| 2033 | 937 | $437.208.572 | $81.675.262 | $80.007.105 | $267.766.767 |
| 2034 | 984 | $472.913.161 | $94.821.267 | $92.772.804 | $360.539.571 |
| 2035 | 1033 | $511.356.579 | $97.487.252 | $95.012.847 | $455.552.417 |
| 2036 | 1085 | $553.210.596 | $113.289.647 | $110.338.186 | $565.890.603 |

Los ejercicios 2027 y 2028 cierran con pérdida: con 200 y 350 equipos la estructura mínima para operar formalmente todavía no se cubre. Esa pérdida está financiada por el capital de trabajo y la caja nunca baja de $12.116.947.

### VAN, TIR y payback

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| VAN al 20 % | $123.149.158 | VAN > 0 | Cumple |
| TIR efectiva anual | 57,52 % | TIR > 20 % | Cumple |
| Payback simple | 3,45 años | ≤ 5 años | Cumple |
| Payback descontado | 4,19 años | ≤ 5 años | Cumple |
| Deuda al cierre de 2036 | $0 | Crédito saldado | Cumple |

**Punto de quiebre del precio.** Con el financiamiento dimensionado, la caja se vuelve negativa bajo un precio de lista de $435.787 y el proyecto deja de crear valor bajo $394.649. Ese resultado es la justificación numérica de derivar el precio del costo en lugar de fijarlo por aspiración comercial.

[Informe 1 corregido](Evaluacion/Evaluacion%201/INFORME%201%20CORREGIDO.md) · [Sección económica](docs/SECCION_ECONOMICA_REFORMULADA.md) · [Metodología](docs/MODELO_ECONOMICO.md)

Actualizar cifras: `python finanzas/modelo.py`.

<!-- FINANZAS:FIN -->

---

<div align="center">
  <b>Autores:</b> Álvaro Villena y Alan <br>
  Proyecto de Ingeniería en Electrónica y Sistemas Inteligentes - INACAP (2026)
</div>
