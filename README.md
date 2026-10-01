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
- **Costos y margen:** la sonda RS-485 concentra el 63,0 % de la BOM. El ensamblaje se paga en la nómina y no se duplica como costo variable.
- **Financiamiento:** el pie de los socios se entrega al banco como condición de entrada y el crédito financia el 100 % de la inversión inicial. Pie y crédito **no se suman** como fuentes.
- **Evaluación:** flujos anuales sobre 10 años (2027–2036), sin valor terminal, con depreciación, amortización del activo nominal y tabla de amortización del crédito por sistema francés.

> 💡 Las cifras del bloque siguiente se generan desde `finanzas/supuestos_reformulado.json`. **No editar a mano:** ejecutar `python finanzas/documentacion_reformulada.py`.

<!-- FINANZAS:INICIO -->

## Finanzas y modelo económico

**El precio no es un supuesto: es un resultado.** Se construye primero la estructura completa de costos e inversión y el precio se deriva de ella exigiendo un 30 % de utilidad sobre el costo total. Precio de lista resultante: **$460.856 CLP con IVA** ($387.274 netos). Evaluación a diez años, 2027–2036, con tasa de descuento del 20 % anual.

### BOM por equipo

| Componente | Cant. | Neto unitario | Subtotal |
|---|---:|---:|---:|
| Sonda de suelo 7-en-1 RS-485 Modbus RTU | 1 | $48.000 | $48.000 |
| Carcasa PETG impresa en taller propio (110 × 100 × 40 mm) | 1 | $7.196 | $7.196 |
| Placa de desarrollo ESP32 DevKitC con módulo WROOM-32D (antena impresa) | 1 | $4.800 | $4.800 |
| Batería LiPo 3,7 V 2.000 mAh con protección | 1 | $4.400 | $4.400 |
| PCB portadora de 2 capas, 99,9 × 90 mm, fabricación y envío (sin ensamblar) | 1 | $3.000 | $3.000 |
| Módulo ambiental BME280 (I²C) | 1 | $1.050 | $1.050 |
| Módulo de carga USB-C y elevación a 5 V | 1 | $900 | $900 |
| Módulo transceptor SP3485 RS-485 3,3 V | 1 | $900 | $900 |
| MOSFET canal N AO3400A (control del corte de la sonda) | 1 | $19 | $19 |
| MOSFET canal P AO3401A (interruptor de la rama de 5 V de la sonda) | 1 | $19 | $19 |
| Bornera de 2 vías, paso 5 mm (batería e interruptor) | 2 | $95 | $190 |
| Bornera de 4 vías, paso 5 mm (sonda) | 1 | $190 | $190 |
| Condensador electrolítico 100 µF 35 V | 2 | $29 | $58 |
| Condensador cerámico 100 nF 50 V (1206) | 4 | $4 | $16 |
| Resistencia 100 kΩ (1206), divisor de batería | 2 | $2 | $4 |
| Resistencia 330 Ω (1206), LED indicadores | 3 | $2 | $6 |
| Resistencia 10 kΩ (1206), polarización del MOSFET y del pulsador | 2 | $2 | $4 |
| LED 0603 azul, rojo y verde | 3 | $8 | $24 |
| Pulsador SMD 4 mm | 1 | $19 | $19 |
| Buzzer pasivo magnético 9042 (avisos sonoros, IO19) | 1 | $140 | $140 |
| Fusible 1 A (0603) | 1 | $19 | $19 |
| Diodo rectificador M7 (SMA), protección contra inversión | 1 | $4 | $4 |
| Flete de los componentes LCSC, prorrateado por equipo | 1 | $150 | $150 |
| Interruptor de palanca mini de panel (rosca 6 mm) con capuchón estanco | 1 | $500 | $500 |
| Prensaestopa PG7 IP68 con tuerca (salida del cable de la sonda) | 1 | $390 | $390 |
| Respiradero M12 × 1,5 con membrana ePTFE (ventilación del BME280) | 1 | $950 | $950 |
| Tapón de silicona para el puerto USB-C | 1 | $200 | $200 |
| Inserto roscado M3 de latón para la tapa | 4 | $25 | $100 |
| Tornillería: 4 tornillos M3 inoxidables de cierre y 4 tornillos M2 con separador para la PCB | 1 | $800 | $800 |
| Cordón de silicona de 2 mm para la junta de la tapa (≈ 45 cm) | 1 | $300 | $300 |
| Cableado interno: cable de silicona 22 AWG y termorretráctil | 1 | $300 | $300 |
| Embalaje: caja de cartón, manual impreso y etiqueta | 1 | $1.500 | $1.500 |
| **Total BOM neto** | | | **$76.148** |

La BOM contiene **exclusivamente los componentes presentes en el esquemático**. Los módulos y la batería se cotizaron en AliExpress con envío Choice a Chile; los discretos en LCSC. La sonda de suelo concentra el 63,0 % del costo de materiales y es la decisión de abastecimiento crítica del proyecto.

> Quedan **fuera de la BOM** por no estar todavía en el esquemático ni en el diseño mecánico cerrado: prensaestopas M12, o-ring y respiradero del BME280, cableado interno, y embalaje con manual y etiqueta. Su orden de magnitud conjunto es de $4.000 a $5.000 por equipo.

Sumando merma (3 %), provisión de reposiciones y garantía (5 %) y envío, el costo variable por equipo antes de comisión es **$88.240**. La carcasa se imprime en taller propio: las dos impresoras 3D están en el activo fijo y el filamento, la merma, la energía y la mantención se cargan al costo unitario.

### Inversión inicial y financiamiento

| Concepto | CLP |
|---|---:|
| Equipamiento y activo fijo | $9.000.000 |
| Activo nominal (puesta en marcha) | $5.200.000 |
| Capital de trabajo (3,0 meses de estructura) | $12.839.785 |
| Inventario inicial | $2.941.328 |
| **Inversión inicial total** | **$29.981.113** |
| Crédito bancario a 10 años, 12 % efectivo anual | $29.981.113 |
| Pie propio exigido (30 % del crédito) | $8.994.334 |
| Aporte por socio | $4.497.167 |
| Cuota mensual (sistema francés) | $419.577 |

**El pie no es una fuente adicional de fondos.** Los socios lo entregan al banco como condición de entrada y es el crédito el que financia el 100 % de la inversión inicial; sumar pie más crédito cuenta dos veces el mismo dinero. El capital de trabajo no se fijó por regla sino iterando hasta que la caja nunca baje de un piso de seguridad, con un mínimo de política de 3 meses de estructura.

### Flujo de caja anual

| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |
|---|---:|---:|---:|---:|---:|
| 2027 | 200 | $77.454.707 | $-2.327.433 | $-1.195.882 | $11.643.903 |
| 2028 | 350 | $139.612.110 | $-1.537.190 | $-610.653 | $11.033.250 |
| 2029 | 500 | $205.429.248 | $12.925.709 | $13.622.631 | $24.655.881 |
| 2030 | 650 | $275.069.763 | $29.611.040 | $30.050.793 | $54.706.674 |
| 2031 | 850 | $370.497.811 | $68.120.382 | $68.272.105 | $122.978.779 |
| 2032 | 892 | $400.468.905 | $68.796.741 | $57.439.098 | $180.417.876 |
| 2033 | 937 | $433.292.090 | $80.668.535 | $79.383.054 | $259.800.930 |
| 2034 | 984 | $468.676.840 | $93.859.217 | $92.169.075 | $351.970.005 |
| 2035 | 1033 | $506.775.886 | $96.575.904 | $94.432.541 | $446.402.546 |
| 2036 | 1085 | $548.254.977 | $112.436.478 | $109.785.509 | $556.188.055 |

Los ejercicios 2027 y 2028 cierran con pérdida: con 200 y 350 equipos la estructura mínima para operar formalmente todavía no se cubre. Esa pérdida está financiada por el capital de trabajo y la caja nunca baja de $11.033.250.

### VAN, TIR y payback

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| VAN al 20 % | $117.269.640 | VAN > 0 | Cumple |
| TIR efectiva anual | 54,37 % | TIR > 20 % | Cumple |
| Payback simple | 3,60 años | ≤ 5 años | Cumple |
| Payback descontado | 4,33 años | ≤ 5 años | Cumple |
| Deuda al cierre de 2036 | $0 | Crédito saldado | Cumple |

**Punto de quiebre del precio.** Con el financiamiento dimensionado, la caja se vuelve negativa bajo un precio de lista de $435.949 y el proyecto deja de crear valor bajo $393.916. Ese resultado es la justificación numérica de derivar el precio del costo en lugar de fijarlo por aspiración comercial.

[Informe 1 corregido](Evaluacion/Evaluacion%201/INFORME%201%20CORREGIDO.md) · [Sección económica](docs/SECCION_ECONOMICA_REFORMULADA.md) · [Metodología](docs/MODELO_ECONOMICO.md)

Actualizar cifras: `python finanzas/modelo.py`.

<!-- FINANZAS:FIN -->

---

<div align="center">
  <b>Autores:</b> Álvaro Villena y Alan <br>
  Proyecto de Ingeniería en Electrónica y Sistemas Inteligentes - INACAP (2026)
</div>
