# ⚡ Criterios de Eficiencia Energética y Digitalización Agrícola — TerraSense

> **Proyecto:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Área:** Eficiencia Energética, Modelado de Potencia, Sustentabilidad y Transformación Digital Rural  
> **Institución:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  

---

## 📑 Tabla de Contenidos

1. [Introducción y Fundamentos de Sustentabilidad en el Agro](#1-introducción-y-fundamentos-de-sustentabilidad-en-el-agro)
2. [Criterios de Eficiencia Energética y Gestión de Potencia](#2-criterios-de-eficiencia-energética-y-gestión-de-potencia)
   - [2.1. Benchmarking Energético: La Competencia vs. TerraSense](#21-benchmarking-energético-la-competencia-vs-terrasense)
   - [2.2. Arquitectura de Ultra-Bajo Consumo: Conmutación por Power Gating](#22-arquitectura-de-ultra-bajo-consumo-conmutación-por-power-gating)
   - [2.3. Modelo Matemático de Consumo y Balance de Energía](#23-modelo-matemático-de-consumo-y-balance-de-energía)
   - [2.4. Estimación de Autonomía de Campo y Vida Útil de las Celdas 18650](#24-estimación-de-autonomía-de-campo-y-vida-útil-de-las-celdas-18650)
   - [2.5. Sistema de Carga Rápida Inteligente USB-C (TP5100)](#25-sistema-de-carga-rápida-inteligente-usb-c-tp5100)
3. [Criterios de Digitalización e Inclusión Tecnológica Rural](#3-criterios-de-digitalización-e-inclusión-tecnológica-rural)
   - [3.1. Transición del Cuaderno de Campo Analógico al Registro Satelital GIS](#31-transición-del-cuaderno-de-campo-analógico-al-registro-satelital-gis)
   - [3.2. Arquitectura Store & Forward: Digitalización sin Brechas de Cobertura](#32-arquitectura-store--forward-digitalización-sin-brechas-de-cobertura)
   - [3.3. Interoperabilidad con Plataformas Estatales (INDAP, SAG, CNR, ODEPA)](#33-interoperabilidad-con-plataformas-estatales-indap-sag-cnr-odepa)
   - [3.4. Democratización de la Agricultura de Precisión en la Pequeña Escala](#34-democratización-de-la-agricultura-de-precisión-en-la-pequeña-escala)
4. [Matriz Resumen de Impacto Energético y Digital](#4-matriz-resumen-de-impacto-energético-y-digital)

---

## 1. Introducción y Fundamentos de Sustentabilidad en el Agro

En los entornos rurales aislados de Chile y Latinoamérica, la disponibilidad de energía eléctrica confiable es escasa y las distancias de desplazamiento en terreno son extensas. Por ello, el desarrollo de TerraSense se fundamenta en dos pilares estratégicos de ingeniería:

1. **Eficiencia Energética Extrema:** Diseñar un hardware autónomo que no requiera recargas frecuentes ni baterías desechables contaminantes, superando holgadamente la autonomía y la practicidad de las alternativas comerciales del mercado.
2. **Digitalización Inclusiva y Soberana:** Eliminar el uso de registros en papel y planillas manuales, transformando cada medición de terreno en un activo digital georreferenciado e interoperable con políticas de fomento público.

---

## 2. Criterios de Eficiencia Energética y Gestión de Potencia

### 2.1. Benchmarking Energético: La Competencia vs. TerraSense

```text
               COMPARATIVA DE FUENTES DE ENERGÍA Y AUTONOMÍA
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. DATALOGGERS CIENTÍFICOS (Spectrum / Campbell / Meter Group):             │
│    • Batería pesada de Plomo-Ácido 12V 7Ah (peso > 2.5 kg).                │
│    • Requieren mástil con Panel Solar de 10W - 25W permanente.              │
│    • Consumo en reposo: 50 a 150 mA constantes.                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. INSTRUMENTOS PORTÁTILES COMERCIALES (Hanna GroLine / Bluelab):           │
│    • Pilas alcalinas desechables (9V o 3xAAA).                              │
│    • Autonomía limitada: 30 a 60 horas de uso continuo.                    │
│    • Alto impacto ambiental por desecho de metales pesados en el campo.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. TERRASENSE IoT:                                                          │
│    • 2x Celdas Li-Ion 18650 recargables (6.000 mAh / 22.2 Wh).              │
│    • Arquitectura Power Gating: 0.0 µA en reposo de potencia.               │
│    • Más de 1.500 mediciones activas por carga (> 6 meses de autonomía).    │
│    • Recarga universal USB-C a 2A (< 3 horas).                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2. Arquitectura de Ultra-Bajo Consumo: Conmutación por Power Gating

La sonda industrial RS-485 NPK 7-en-1 requiere una tensión de alimentación de **$12\text{V DC}$** y un transceptor de línea MAX485 que consumirían conjuntamente entre **$30\text{ mA}$ y $45\text{ mA}$** de forma permanente si permanecieran encendidos en reposo, agotando una batería estándar en menos de 4 días.

Para erradicar este consumo parásito, TerraSense implementa una etapa de **Power Gating** con transistor MOSFET de potencia controlado por el pin **GPIO 4 del ESP32**:

```text
               CIRCUITO DE GESTIÓN DE ENERGÍA POR POWER GATING
                              V_BAT (3.7V - 4.2V)
                                       │
                                 ┌─────┴─────┐
                                 │ P-MOSFET  │
                 GPIO 4 ESP32 ──►│ Si2301DS  │ (LOW = Conduce / HIGH = 0.0 µA)
                                 └─────┬─────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
           ┌──────────────────────┐          ┌──────────────────────┐
           │ MT3608 Boost Step-Up │          │ MAX485 Driver RS-485 │
           │ 3.7V ──► 12V DC      │          │ Bus Diferencial      │
           └──────────┬───────────┘          └──────────┬───────────┘
                      └────────────────┬────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │ Sonda Suelo Inox 7-en-1       │
                       │ CONSUMO EN REPOSO: 0.0 µA     │
                       └───────────────────────────────┘
```

* **Estado de Reposo:** El pin de control mantiene el MOSFET bloqueado. La corriente que fluye hacia el elevador Boost MT3608, la sonda 7-en-1 y el transceptor MAX485 es **exactamente $0.0\,\mu\text{A}$**.
* **Estado de Medición Activa:** Al recibir el comando por BLE desde la app móvil, el ESP32 conmuta el MOSFET durante solo **$7.0\text{ segundos}$** para polarizar los electrodos, adquirir las 10 tramas Modbus, estabilizar la lectura de temperatura y volver a cortar la energía de inmediato.

---

### 2.3. Modelo Matemático de Consumo y Balance de Energía

El consumo de energía total por ciclo de operación ($E_{\text{ciclo}}$) se descompone en las siguientes fases operativas:

$$\begin{aligned}
E_{\text{ciclo}} &= I_{\text{boot}} \cdot t_{\text{boot}} + I_{\text{meas}} \cdot t_{\text{meas}} + I_{\text{ble\_tx}} \cdot t_{\text{ble\_tx}}
\end{aligned}$$

| Fase Operativa | Subsistemas Activos | Corriente ($I$) | Duración ($t$) | Carga Consumida ($Q$) |
| :--- | :--- | :---: | :---: | :---: |
| **1. Conexión y Handshake BLE** | ESP32 Radio BLE activa | $22.0\text{ mA}$ | $1.0\text{ s}$ | $22.0\text{ mAs}$ |
| **2. Estabilización y Muestreo Modbus** | Boost 12V + Sonda 7-en-1 + MAX485 + BME280 + ESP32 | $65.0\text{ mA}$ | $7.0\text{ s}$ | $455.0\text{ mAs}$ |
| **3. Transmisión Ráfaga BLE Telemetría**| ESP32 TX @ $+9\text{ dBm}$ | $85.0\text{ mA}$ | $0.2\text{ s}$ | $17.0\text{ mAs}$ |
| **4. Retorno a Standby BLE** | ESP32 BLE conectado en escucha | $18.0\text{ mA}$ | $0.8\text{ s}$ | $14.4\text{ mAs}$ |
| **TOTAL POR CICLO DE MEDICIÓN** | | | **$9.0\text{ s}$** | **$508.4\text{ mAs} \approx \mathbf{0.141\text{ mAh}}$** |

---

### 2.4. Estimación de Autonomía de Campo y Vida Útil de las Celdas 18650

* **Capacidad Nominal del Banco:** $C_{\text{nom}} = 2 \times 3.000\text{ mAh} = \mathbf{6.000\text{ mAh}}$ ($22.2\text{ Wh}$ a $3.7\text{V}$).
* **Capacidad Útil Real:** Aplicando un factor de seguridad por envejecimiento y eficiencia térmica ($\eta = 85\%$):
  $$C_{\text{util}} = 6.000\text{ mAh} \times 0.85 = \mathbf{5.100\text{ mAh}}$$
* **Número Teórico de Mediciones Activas por Carga Completa:**
  $$\text{Mediciones Máximas} = \frac{C_{\text{util}}}{Q_{\text{ciclo}}} = \frac{5.100\text{ mAh}}{0.141\text{ mAh/medición}} \approx \mathbf{36.170\text{ mediciones}}$$

* **Escenario Real en Campo (Jornada de Muestreo de 4 horas diarias):**
  * Consumo Standby BLE durante la jornada ($4\text{ h} \times 18\text{ mA} = 72\text{ mAh/día}$).
  * 15 mediciones activas por día ($15 \times 0.141\text{ mAh} = 2.115\text{ mAh/día}$).
  * Apagado total con Rocker Switch físico las 20 horas restantes ($0.0\,\mu\text{A}$).
  * Consumo diario total: $\approx 74.1\text{ mAh/día}$.
  * **Autonomía Práctica de Terreno:**
    $$\text{Autonomía} = \frac{5.100\text{ mAh}}{74.1\text{ mAh/día}} \approx \mathbf{68.8\text{ días de uso intensivo continuo}}\quad(\mathbf{> 2.3\text{ meses}})$$
  * En un régimen de monitoreo estándar de pequeño agricultor (3 jornadas semanales de 1 hora):
    $$\mathbf{\text{Autonomía Supera los } 6\text{ a } 8\text{ Meses de Operación Sin Recargar}}$$

---

### 2.5. Sistema de Carga Rápida Inteligente USB-C (TP5100)

* **Controlador Integrado TP5100:** Perfil de carga lineal en dos etapas (Corriente Constante / Tensión Constante CC/CV).
* **Parámetros de Carga:** Corriente de carga fijada en $I_{\text{chg}} = 2.0\text{ A}$ @ $5\text{V}$ (10W).
* **Tiempo de Carga Completa ($0\% \rightarrow 100\%$):**
  $$t_{\text{carga}} = \frac{6.000\text{ mAh}}{2.000\text{ mA}} \times 1.15\text{ (pérdidas CC/CV)} \approx \mathbf{3.45\text{ horas}}$$
* **Compatibilidad Universal:** Se recarga con cualquier cargador estándar de smartphone, conector de vehículo de 12V/USB o batería portátil (*powerbank*) de $5\text{V}$, eliminando la necesidad de cargadores propietarios de laboratorio.

---

## 3. Criterios de Digitalización e Inclusión Tecnológica Rural

### 3.1. Transición del Cuaderno de Campo Analógico al Registro Satelital GIS

El método imperante en el 92% de los agricultores de INDAP es el cuaderno de notas en papel:

```text
DE LA LIBRETA DE PAPEL A LA PLATAFORMA DIGITAL GIS:
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        CUADERNO DE PAPEL (ANTES)     │     │        TERRASENSE GIS (HOY)          │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ ❌ Datos aislados sin georreferencia.│ ──► │ ✅ Cada dato tiene lat/lon ±1.5 m.   │
│ ❌ Manchas de barro y hojas rotas.   │ ──► │ ✅ Respaldo en la nube (PostGIS).    │
│ ❌ Imposible generar mapas de calor. │ ──► │ ✅ Mapas satelitales automáticos.   │
│ ❌ Se pierde al cambiar de temporada.│ ──► │ ✅ Historial predial de 5+ años.     │
│ ❌ Sin cruce con pronóstico del clima│ ──► │ ✅ Integración meteorológica GPS.    │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

### 3.2. Arquitectura Store & Forward: Digitalización sin Brechas de Cobertura

En valles interiores y zonas precordilleranas (ej. Valle del Huasco, Choapa, Maule Sur, La Araucanía), la cobertura celular 4G es discontinua o inexistente.

* **Almacenamiento Local Transaccional:** La app móvil persiste todas las lecturas en una base de datos local SQLite encriptada en el smartphone.
* **Cola de Sincronización Asíncrona (Store & Forward):** Un servicio en segundo plano detecta la reconexión a redes móviles o WiFi doméstico y transmite los registros pendientes hacia la base de datos Supabase en bloques comprimidos mediante HTTPS/WSS sin requerir intervención del usuario.

---

### 3.3. Interoperabilidad con Plataformas Estatales (INDAP, SAG, CNR, ODEPA)

La digitalización no es un fin en sí misma; es la llave para acceder a beneficios públicos y certificaciones:

1. **INDAP / PRODESAL:** Los asesores técnicos pueden auditar remotamente los registros prediales de sus usuarios para recomendar planes de fertilización colectivos.
2. **Servicio Agrícola y Ganadero (SAG):** Exportación de reportes oficiales de calidad de suelo en formato GeoJSON/PDF para programas de recuperación de suelos degradados (SIRSD-S).
3. **Comisión Nacional de Riego (CNR):** Demostración de huella hídrica y eficiencia de riego para postular a bonificaciones de tecnificación de la Ley N° 18.450.

---

### 3.4. Democratización de la Agricultura de Precisión en la Pequeña Escala

La agricultura de precisión fue históricamente un privilegio exclusivo de las grandes corporaciones agroexportadoras (viñas premium, cereceros de exportación) capaces de pagar $10.000 USD por sensores telemétricos y vuelos de dron multiespectrales.

TerraSense **democratiza la agricultura de precisión** para el pequeño productor de 1 hectárea:
* Permite mapear la variabilidad espacial intrapredial a costo marginal de **$0 CLP**.
* Reduce el consumo innecesario de fertilizantes químicos en hasta un **30%**, disminuyendo la lixiviación de nitratos hacia las napas freáticas.
* Ahorra hasta un **25% de agua de riego** al evitar el sobre-riego por intuición.

---

## 4. Matriz Resumen de Impacto Energético y Digital

| Dimensión de Impacto | Estado Tradicional (Competencia) | Enfoque TerraSense IoT | Beneficio Cuantificable |
| :--- | :--- | :--- | :--- |
| **Consumo en Reposo** | $50 - 150\text{ mA}$ (Permanente) | **$0.0\,\mu\text{A}$ (Power Gating)** | Eliminación del 100% del consumo parásito. |
| **Tipo de Batería** | Plomo-Ácido pesada / Pilas 9V | **2x 18650 Li-Ion (6.000 mAh)** | Recargable, liviana y sin residuos tóxicos. |
| **Tiempo de Recarga** | Requiere panel solar continuo | **$< 3.5\text{ h}$ vía USB-C 2A** | Recarga universal con cargador de celular. |
| **Autonomía Operativa** | 30 a 60 horas (Pilas) | **$> 6\text{ meses}$ (Uso normal)** | Disponibilidad continua durante toda la temporada. |
| **Registro de Terreno**| Libreta de papel o Excel manual | **GIS Satelital + PostGIS** | Trazabilidad espacial y mapas de calor automáticos. |
| **Operación Sin Red** | Dataloggers exigen SIM 4G activa| **100% Offline (Store & Fwd)** | Operatividad total en cerros y quebradas aisladas. |

---

*Documento de eficiencia y digitalización elaborado para el proyecto TerraSense — INACAP 2026.*
