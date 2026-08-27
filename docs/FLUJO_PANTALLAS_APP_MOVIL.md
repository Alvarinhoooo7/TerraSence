# 📱 Especificación Integral del Flujo de Pantallas y Experiencia de Usuario (UI/UX) — TerraSense App

> **Versión del Documento:** 2.0  
> **Proyecto:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Plataforma:** React Native / Expo / TypeScript / Supabase / BLE 5.0  

---

## 📑 Tabla de Contenidos

1. [Filosofía de Diseño y Principios de Accesibilidad Rural (UI/UX)](#1-filosofía-de-diseño-y-principios-de-accesibilidad-rural-uiux)
2. [Mapa de Navegación y Máquina de Estados Global](#2-mapa-de-navegación-y-máquina-de-estados-global)
3. [Flujo 1: Onboarding y Propuesta de Valor (Carrusel 2 Pantallas)](#3-flujo-1-onboarding-y-propuesta-de-valor-carrusel-2-pantallas)
4. [Flujo 2: Autenticación y Gestión de Sesión](#4-flujo-2-autenticación-y-gestión-de-sesión)
5. [Flujo 3: Vinculación de Hardware y Gestión de Dispositivos (3 Caminos)](#5-flujo-3-vinculación-de-hardware-y-gestión-de-dispositivos-3-caminos)
   - [3.1. Opción A: Primer Usuario / Propietario (Pairing BLE + Botón 3s)](#51-opción-a-primer-usuario--propietario-pairing-ble--botón-3s)
   - [3.2. Opción B: Segundo Usuario / Operador (Escaneo QR o ID de 15 Dígitos)](#52-opción-b-segundo-usuario--operador-escaneo-qr-o-id-de-15-dígitos)
   - [3.3. Opción C: "Ya Estoy Vinculado" / Modo Exploración](#53-opción-c-ya-estoy-vinculado--modo-exploración)
6. [Flujo 4: Pantalla Principal (Main Dashboard)](#6-flujo-4-pantalla-principal-main-dashboard)
7. [Flujo 5: Pantalla de Carga y Medición Interactiva (Animación 2D + Muestreo)](#7-flujo-5-pantalla-de-carga-y-medición-interactiva-animación-2d--muestreo)
   - [5.1. Fundamentación Física y Metrológica del Tiempo de Muestreo (5 a 8 Segundos)](#71-fundamentación-física-y-metrológica-del-tiempo-de-muestreo-5-a-8-segundos)
8. [Flujo 6: Dashboard de Resultados en Grid 3×3 (9 Variables Físicas)](#8-flujo-6-dashboard-de-resultados-en-grid-33-9-variables-físicas)
   - [6.1. Vista Detallada y Diagnóstico Individual por Variable](#81-vista-detallada-y-diagnóstico-individual-por-variable)
9. [Flujo 7: Carrusel de Veredicto Holístico y Prescripciones Agronómicas](#9-flujo-7-carrusel-de-veredicto-holístico-y-prescripciones-agronómicas)
   - [7.1. Slide 1: Semáforo Global, Compatibilidad de Cultivos y Enmiendas](#91-slide-1-semáforo-global-compatibilidad-de-cultivos-y-enmiendas)
   - [7.2. Slide 2: Recomendaciones Agroclimáticas Predictivas (7 Días GPS)](#92-slide-2-recomendaciones-agroclimáticas-predictivas-7-días-gps)
   - [7.3. Slide 3: Guardado y Georreferenciación Predial (GIS)](#93-slide-3-guardado-y-georreferenciación-predial-gis)
10. [Flujo 8: Modalidad de Operación — Medición Rápida vs. Medición Detallada](#10-flujo-8-modalidad-de-operación--medición-rápida-vs-medición-detallada)
11. [Enfoque Productivo Integral: Las 4 Etapas del Ciclo Fenológico](#11-enfoque-productivo-integral-las-4-etapas-del-ciclo-fenológico)
12. [Visualizador Satelital y Cartografía GIS Predial](#12-visualizador-satelital-y-cartografía-gis-predial)

---

## 1. Filosofía de Diseño y Principios de Accesibilidad Rural (UI/UX)

La interfaz de usuario de TerraSense fue diseñada bajo la premisa de **cero fricción cognitiva en terreno**. El agricultor promedio de la pequeña y mediana agricultura en Chile (promedio 55 a 65 años) opera bajo condiciones adversas:
* **Iluminación solar extrema (hasta 100.000 lux en verano):** Requiere tipografía con contraste superior (WCAG 2.1 AAA), fondos oscuros con texto de alto contraste o temas adaptativos de alto brillo.
* **Uso con guantes de trabajo o manos con tierra:** Botones táctiles con áreas de impacto mínimas de $56 \times 56\text{ dp}$.
* **Semáforo Universal:** El veredicto técnico se traduce instantáneamente en tres colores inequívocos:
  * 🟢 **Verde:** Condición óptima / Apto para siembra o labor.
  * 🟡 **Amarillo:** Advertencia / Condición submáxima que requiere corrección o enmienda.
  * 🔴 **Rojo:** Crítico / Peligro agronómico inminente (bloqueo severo, salinidad tóxica o suelo congelado).

---

## 2. Mapa de Navegación y Máquina de Estados Global

```mermaid
stateDiagram-v2
    [*] --> Onboarding: Primera Apertura
    Onboarding --> LoginScreen: Finalizar Carrusel (2 Slides)
    [*] --> LoginScreen: Sesión No Iniciada
    [*] --> MainDashboard: Token Válido Existente
    
    LoginScreen --> PairingRouter: Autenticación Exitosa
    
    state PairingRouter {
        [*] --> ChoiceModal
        ChoiceModal --> BlePairingScreen: Opción A (Admin / BLE)
        ChoiceModal --> JoinDeviceScreen: Opción B (Operador / QR / ID)
        ChoiceModal --> MainDashboard: Opción C ("Ya estoy vinculado")
        
        BlePairingScreen --> MainDashboard: Pairing Exitoso
        JoinDeviceScreen --> WaitingApprovalScreen: Código Enviado
        WaitingApprovalScreen --> MainDashboard: Aprobación Recibida (Realtime)
    }
    
    state MainDashboard {
        [*] --> Idle
        Idle --> MeasureModeSelectModal: Pulsar "EMPEZAR MEDICIÓN"
        MeasureModeSelectModal --> MeasuringScreen_Fast: Modo Rápido
        MeasureModeSelectModal --> MeasuringScreen_Detail: Modo Detallado
    }
    
    state MeasuringScreen_Detail {
        [*] --> Animation2D_Stabilization: 5-8 Segundos
        Animation2D_Stabilization --> Grid3x3_Dashboard: Ráfaga BLE Completa
        Grid3x3_Dashboard --> VariableDetailModal: Tocar Variable (1 de 9)
        VariableDetailModal --> Grid3x3_Dashboard: Cerrar Modal
        Grid3x3_Dashboard --> Carousel_Recommendations: Deslizar a Sugerencias
        
        state Carousel_Recommendations {
            [*] --> Slide1_GlobalVerdict_Crops
            Slide1_GlobalVerdict_Crops --> Slide2_Agroclimate_Weather
            Slide2_Agroclimate_Weather --> Slide3_Save_Georeference
        }
        
        Slide3_Save_Georeference --> MainDashboard: Guardar en Historial + PostGIS
    }
    
    state MeasuringScreen_Fast {
        [*] --> Animation2D_Fast: 5 Segundos
        Animation2D_Fast --> QuickResultSummary: Semáforo + Grid 3x3
        QuickResultSummary --> MainDashboard: Auto-guardado en Mapa GPS
    }
```

---

## 3. Flujo 1: Onboarding y Propuesta de Valor (Carrusel 2 Pantallas)

Diseñado para generar un impacto visual inmediato y comunicar la misión del proyecto en menos de 10 segundos.

```text
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        ONBOARDING — SLIDE 1          │  │        ONBOARDING — SLIDE 2          │
│                                      │  │                                      │
│               🌱                     │  │               🤝                     │
│           TERRASENSE                 │  │          QUIÉNES SOMOS               │
│                                      │  │                                      │
│  "No vendemos datos.                 │  │  Democratizamos la agronomía         │
│   Vendemos decisiones."              │  │  de precisión para la pequeña y      │
│                                      │  │  mediana agricultura de Chile.       │
│  Tu ingeniero agrónomo de bolsillo   │  │                                      │
│  que te dice exactamente qué hacer   │  │  • Protegemos tu inversión familiar  │
│  en cada metro de tu tierra.         │  │  • Eliminamos la siembra 'al ojo'    │
│                                      │  │  • Acompañamos todo tu cultivo       │
│                                      │  │                                      │
│             ● ○                      │  │             ○ ●                      │
│                                      │  │                                      │
│       [ CONTINUAR ➔ ]                │  │       [ EMPEZAR AHORA ➔ ]            │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

* **Slide 1 — Identidad y Refrán:**
  * Logo de TerraSense con isotipo de brote verde e integración de ondas IoT.
  * Lema central: *"No vendemos datos. Vendemos decisiones"*.
  * Subtexto: *"El primer sistema que interpreta tu suelo al instante y te dice qué hacer para no perder tu inversión"*.
* **Slide 2 — Quiénes somos y a quién ayudamos:**
  * Destacado para la Agricultura Familiar Campesina (AFC), cooperativas y pequeños productores de INDAP.
  * Enfoque en protección del capital: *"Cada saco de fertilizante y cada semilla híbrida cuestan caro. Te ayudamos a sembrar y regar con certeza científica"*.

---

## 4. Flujo 2: Autenticación y Gestión de Sesión

```text
┌──────────────────────────────────────┐
│           INICIAR SESIÓN             │
│                                      │
│  Correo Electrónico:                 │
│  ┌────────────────────────────────┐  │
│  │ alvaro.agricola@gmail.com      │  │
│  └────────────────────────────────┘  │
│                                      │
│  Contraseña:                         │
│  ┌────────────────────────────────┐  │
│  │ ••••••••••••••                 │  │
│  └────────────────────────────────┘  │
│                                      │
│      [ INICIAR SESIÓN CON CORREO ]   │
│                                      │
│  ─── o continúa con ───              │
│                                      │
│      [ 🌐 Entrar con Google ]        │
│      [ 🪄 Enviar Magic Link ]        │
│                                      │
│  ¿No tienes cuenta? Regístrate aquí  │
└──────────────────────────────────────┘
```

* Integrado nativamente con **Supabase Auth** (JWT, refresh tokens automáticos y almacenamiento encriptado con `expo-secure-store`).
* Soporte para recuperación de contraseña sin conexión previa mediante caché local.

---

## 5. Flujo 3: Vinculación de Hardware y Gestión de Dispositivos (3 Caminos)

Al iniciar sesión por primera vez o ingresar a la gestión de hardware, se presenta un modal de tres vías:

```text
┌────────────────────────────────────────────────────────┐
│             VINCULAR DISPOSITIVO TERRASENSE            │
│                                                        │
│  Selecciona cómo deseas enlazar tu equipo:             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📡 OPCIÓN 1: VINCULAR MI EQUIPO (ADMIN)          │  │
│  │ Soy el dueño del equipo. Conectar por BLE.       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 👥 OPCIÓN 2: UNIRME A UN EQUIPO EXISTENTE        │  │
│  │ Soy operador/familiar. Escanear QR o código ID.  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚡ OPCIÓN 3: YA ESTOY VINCULADO / OMITIR         │  │
│  │ Entrar directamente a la pantalla principal.     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

### 5.1. Opción A: Primer Usuario / Propietario (Pairing BLE + Botón 3s)

```text
┌──────────────────────────────────────┐
│       MODO VINCULACIÓN BLE           │
│                                      │
│               🔵                     │
│         ( ( ( 🔘 ) ) )               │
│                                      │
│  1. Enciende el equipo TerraSense.   │
│  2. Mantén presionado el botón       │
│     [ PAIR ] durante 3 SEGUNDOS.     │
│  3. El LED azul parpadeará rápido.   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📡 Buscando: TerraSense-840    │  │
│  │    Señal: -48 dBm (Excelente)  │  │
│  └────────────────────────────────┘  │
│                                      │
│      [ VINCULAR Y REGISTRAR ]        │
└──────────────────────────────────────┘
```

1. **Instrucciones en Pantalla:** El usuario debe mantener presionado el pulsador táctil del dispositivo por 3 segundos.
2. **Respuesta del Firmware:** El ESP32 activa el modo de anunciamiento BLE rápido (4 Hz en LED WS2812B azul) durante 30 segundos.
3. **Handshake y Registro:** La app detecta el UUID del servicio primario (`00000001-5e4e-4c69-6d61-746572726101`), realiza el *bonding* criptográfico, almacena las credenciales en la memoria NVS del ESP32 y registra el dispositivo a nombre del usuario en Supabase con rol `propietario`.

---

### 5.2. Opción B: Segundo Usuario / Operador (Escaneo QR o ID de 15 Dígitos)

Diseñado para cuadrillas de campo, trabajadores de temporada, técnicos o familiares que comparten el mismo instrumento.

```text
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│     UNIRSE A EQUIPO (QR O ID)        │  │     PANTALLA DE ESPERA DE ADMIN      │
│                                      │  │                                      │
│  ┌────────────────────────────────┐  │  │               ⏳                     │
│  │       [ 📷 ESCANEAR QR ]       │  │  │      SOLICITUD ENVIADA               │
│  │   Apunta al QR del Administrador│  │  │                                      │
│  └────────────────────────────────┘  │  │  Equipo: TerraSense-840-A9F4         │
│                                      │  │  ID: TS-8409-2026-A9F4               │
│  ─── o ingresa el código ID ───      │  │                                      │
│                                      │  │  Esperando que el Administrador      │
│  ID de 15 Dígitos:                   │  │  apruebe tu acceso desde su app...   │
│  ┌────────────────────────────────┐  │  │                                      │
│  │ TS-8409-2026-A9F4              │  │  │  (Esta pantalla se actualizará      │
│  └────────────────────────────────┘  │  │   automáticamente en tiempo real)    │
│                                      │  │                                      │
│      [ ENVIAR SOLICITUD ACCESO ]     │  │       [ CANCELAR SOLICITUD ]         │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

* **Canal 1 (Cámara QR):** Escanea el código QR que el usuario Administrador genera desde su perfil de la app.
* **Canal 2 (Entrada Manual):** Ingresa la clave alfanumérica única de 15 dígitos grabada en la etiqueta láser del chasis IP67.
* **Pantalla de Espera Reactiva:** Se subscribe a un canal Supabase Realtime (`postgres_changes` sobre la tabla `device_authorizations`). En cuanto el administrador presiona "Aprobar", la pantalla avanza automáticamente al Main sin recargar.

---

### 5.3. Opción C: "Ya Estoy Vinculado" / Modo Exploración

Si el usuario escoge saltarse la vinculación:
* Entra directamente a la pantalla principal (**Main Dashboard**).
* **Control de Consistencia:** Si el sistema detecta que el usuario no tiene ningún hardware asociado ni en la memoria local ni en Supabase, el Main muestra una **tarjeta de alerta prominente y no intrusiva** en la parte superior:

```text
┌────────────────────────────────────────────────────────┐
│ ⚠️ NINGÚN EQUIPO VINCULADO                             │
│ Para realizar mediciones físicas necesitas enlazar un  │
│ equipo TerraSense.                                     │
│                                                        │
│  [ 📡 Vincular con BLE ]      [ 👥 Unirme con QR/ID ]  │
└────────────────────────────────────────────────────────┘
```

---

## 6. Flujo 4: Pantalla Principal (Main Dashboard)

El centro de operaciones del agricultor al abrir la app a las 7:00 AM:

```text
┌────────────────────────────────────────────────────────┐
│ 🌿 TERRASENSE                      📡 Conectado (98%) │
│ Predio: Fundo San Fernando — Potrero 4                 │
├────────────────────────────────────────────────────────┤
│ 🌦️ CLIMA LOCAL (GPS): 16.5°C | HR 62% | ☀️ Soleado    │
│    Alerta: Sin riesgo de helada en las próx. 72 horas. │
├────────────────────────────────────────────────────────┤
│                                                        │
│              ╔══════════════════════════╗              │
│              ║   📍 EMPEZAR MEDICIÓN    ║              │
│              ╚══════════════════════════╝              │
│             [ ⚡ RÁPIDA ]   [ 🔍 DETALLADA ]           │
│                                                        │
├────────────────────────────────────────────────────────┤
│ 📊 RESUMEN DEL DÍA (4 Puntos Muestreados)              │
│ • 🟢 3 Puntos: Óptimos para siembra de Maíz / Papa     │
│ • 🟡 1 Punto: Requiere encalado de suelo (pH 5.2)      │
├────────────────────────────────────────────────────────┤
│ 🗺️ ÚLTIMA UBICACIÓN GEOESPACIAL                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │  🗺️ [ MAPA SATELITAL INTERACTIVO CON PINES ]      │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [ 🏠 Inicio ]   [ 📊 Historial ]   [ 🗺️ GIS ]   [ ⚙️ Config ]│
└────────────────────────────────────────────────────────┘
```

---

## 7. Flujo 5: Pantalla de Carga y Medición Interactiva (Animación 2D + Muestreo)

Al presionar **"EMPEZAR MEDICIÓN"**, la app no muestra un simple spinner aburrido. En su lugar, despliega una **guía animada interactiva 2D** que instruye al usuario sobre el procedimiento de muestreo correcto en campo:

```text
┌────────────────────────────────────────────────────────┐
│                   MEDICIÓN EN PROCESO                  │
│                                                        │
│  Progreso de Muestreo: [██████████████░░] 78% (6.2 s) │
│                                                        │
│             ANIMACIÓN 2D EN TIEMPO REAL:               │
│                                                        │
│                      🌿 PLANTA                         │
│                      │                                 │
│          ┌───────────┴───────────┐                     │
│          │  Zona Radicular (15cm)│                     │
│          ▼                       ▼                     │
│      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ Suelo          │
│          │ ║ ║ ║                 ▲                     │
│          │ ║ ║ ║ ← Inserción     │ 15-20 cm            │
│          │ ║ ║ ║   Vertical      │ de Profundidad      │
│          ▼ █ █ █                 ▼                     │
│                                                        │
│  📢 INSTRUCCIONES EN VIVO:                             │
│  1. Inserte las varillas de acero inox verticalmente.  │
│  2. Asegure contacto pleno con la tierra sin moverla.  │
│  3. Espere el promedio de estabilización térmica.     │
│                                                        │
│  🔄 Adquiriendo ráfaga: Muestra 8 de 10...             │
└────────────────────────────────────────────────────────┘
```

---

### 7.1. Fundamentación Física y Metrológica del Tiempo de Muestreo (5 a 8 Segundos)

Una medición instantánea (< 1 segundo) en suelo agrícola es **metrológicamente inválida** debido a cuatro fenómenos biofísicos:

1. **Polarización Dieléctrica de Alta Frecuencia ($0 - 2\text{ s}$):** Las ondas electromagnéticas de alta frecuencia requieren estabilizar el campo eléctrico entre las varillas de acero para polarizar las moléculas de agua libre y agua adsorbida sin distorsión iónica.
2. **Equilibrio Térmico del Sensor ($2 - 4\text{ s}$):** El acero inoxidable 316L posee inercia térmica. La sonda debe alcanzar el equilibrio térmico exacto con el suelo circundante para compensar matemáticamente la conductividad eléctrica y el pH (fórmula de Nernst dependiente de la temperatura).
3. **Estabilización de la Doble Capa Electroquímica ($4 - 6\text{ s}$):** Los electrodos de pH de estado sólido y las interfases galvánicas de reactividad iónica (NPK) requieren 3 a 5 segundos de contacto húmedo íntimo para estabilizar la diferencia de potencial electroquímico.
4. **Filtro de Mediana Móvil y Rechazo de Ruido ($6 - 8\text{ s}$):** El firmware del ESP32 realiza **10 consultas Modbus RTU consecutivas** a $115.200\text{ bps}$, descarta los dos valores extremos (máximo y mínimo causados por micro-vibraciones mecánicas de inserción) y promedia las 8 muestras centrales restantes.

$$\text{Valor Final} = \frac{1}{8} \sum_{i=2}^{9} \text{Muestra}_{(i)} \quad \text{con } \sigma < 1.5\%$$

---

## 8. Flujo 6: Dashboard de Resultados en Grid 3×3 (9 Variables Físicas)

Tras completarse el ciclo de 7 segundos, la app despliega el **Grid Comercial 3×3**, presentando una matriz estética, simétrica y balanceada con las 9 variables físicas y ambientales:

```text
┌────────────────────────────────────────────────────────┐
│ 📊 RESULTADOS DE MEDICIÓN — GRID 3×3                   │
│ Predio: Potrero Bajo | Punto: #04 | 10:45 AM          │
├────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 💧 HUMEDAD    │ │ 🌡️ TEMP SUELO │ │ ⚡ COND. (EC) │ │
│ │    31.5 %     │ │    18.4 °C    │ │ 1.250 µS/cm │ │
│ │   🟢 Óptima   │ │   🟢 Templado │ │   🟢 Normal │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 🧪 pH SUELO   │ │ 🟢 NITRÓGENO  │ │ 🟡 FÓSFORO (P)│ │
│ │     5.3       │ │   65 mg/kg    │ │   18 mg/kg    │ │
│ │  🔴 Ácido     │ │   🟢 Medio    │ │  🟡 Bajo      │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 🟣 POTASIO(K) │ │ 🌤️ TEMP AIRE  │ │ 💨 HUMEDAD AMB│ │
│ │   145 mg/kg   │ │    21.2 °C    │ │    58.0 % HR  │ │
│ │   🟢 Adecuado │ │  ☀️ Favorable │ │   🟢 Confort  │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
├────────────────────────────────────────────────────────┤
│ 💡 Toca cualquier tarjeta para ver sugerencias y clima │
│                                                        │
│         [ VER DIAGNÓSTICO INTEGRAL Y CULTIVOS ➔ ]      │
└────────────────────────────────────────────────────────┘
```

---

### 8.1. Vista Detallada y Diagnóstico Individual por Variable

Al pulsar sobre cualquiera de las 9 tarjetas (por ejemplo, **🧪 pH SUELO = 5.3**), se abre una ventana modal con el desglose técnico y las acciones agronómicas correctivas:

```text
┌────────────────────────────────────────────────────────┐
│ 🧪 DETALLE: pH DEL SUELO                               │
│                                                        │
│  Valor Actual: 5.3 pH  |  Estado: 🔴 Fuertemente Ácido │
│                                                        │
│  📈 ESCALA DE ACIDEZ:                                  │
│  [ 4.0 ─── 🔴 5.3 ─── 🟡 5.8 ─── 🟢 6.5 ─── 8.5 ]      │
│                                                        │
│  ⚠️ DIAGNÓSTICO AGRONÓMICO:                            │
│  A este nivel de pH, el Fósforo (P) se encuentra       │
│  químicamente bloqueado por iones de Aluminio y        │
│  Hierro. El fertilizante que apliques se perderá en un │
│  60% sin ser absorbido por las raíces.                 │
│                                                        │
│  💊 ACCIÓN CORRECTIVA RECOMENDADA:                     │
│  • Aplicar 500 kg/ha de Cal Agrícola (CaCO₃) o dolomita│
│  • Incorporar con rastra ligera 15 días antes.         │
│  • Costo estimado de corrección: ~$35.000 CLP / ha.    │
│                                                        │
│  🌦️ CORRELACIÓN CLIMÁTICA:                             │
│  Aprovechar la humedad actual del 31.5% para que la    │
│  cal reaccione antes del alza térmica de la semana.    │
│                                                        │
│                     [ ENTENDIDO / CERRAR ]             │
└────────────────────────────────────────────────────────┘
```

---

## 9. Flujo 7: Carrusel de Veredicto Holístico y Prescripciones Agronómicas

Deslizando hacia la derecha o pulsando *"Ver Diagnóstico Integral"*, el usuario accede al carrusel prescriptivo de 3 pantallas:

### 9.1. Slide 1: Semáforo Global, Compatibilidad de Cultivos y Enmiendas

```text
┌────────────────────────────────────────────────────────┐
│           DIAGNÓSTICO AGRONÓMICO INTEGRAL              │
│                                                        │
│   🟡 VEREDICTO GENERAL: CONDICIONADO / REQUIERE CAL   │
│                                                        │
│  ❓ ¿Es recomendable plantar hoy?                      │
│  ➜ SÍ para Papa, Arándano y Avena (toleran acidez).    │
│  ➜ NO para Tomate, Maíz ni Alfalfa hasta encalar.      │
│                                                        │
│  🌿 MATRIZ DE CULTIVOS COMPATIBLES:                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🟢 Papa Pastusa / Desirée   │ 92% Compatibilidad │  │
│  │ 🟢 Arándano O'Neal          │ 88% Compatibilidad │  │
│  │ 🟡 Tomate Larga Vida        │ 54% (Bloqueo de P) │  │
│  │ 🔴 Cebolla Morada           │ 28% (Incompatible) │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  💊 PLAN DE ENMIENDA INTEGRADO:                        │
│  1. Cal Agrícola: 480 kg/ha para elevar pH a 6.2.      │
│  2. Fosfato Monoamónico (MAP): 60 kg/ha para suplir P. │
│                                                        │
│             ● ○ ○      [ SIGUIENTE: CLIMA ➔ ]          │
└────────────────────────────────────────────────────────┘
```

---

### 9.2. Slide 2: Recomendaciones Agroclimáticas Predictivas (7 Días GPS)

```text
┌────────────────────────────────────────────────────────┐
│           PRONÓSTICO AGROCLIMÁTICO (7 DÍAS)            │
│ Localidad: Paine / Buin | Estación GPS Local           │
├────────────────────────────────────────────────────────┤
│  📅 PRÓXIMOS 7 DÍAS:                                   │
│  • Jueves: 22°C / 8°C | ☀️ Despejado                   │
│  • Viernes: 20°C / 6°C | ⛅ Nubosidad parcial          │
│  • Sábado: 14°C / 4°C | 🌧️ Lluvia (18 mm acumulados)   │
│  • Domingo: 12°C / 2°C | ❄️ Alerta de Helada Matinal   │
├────────────────────────────────────────────────────────┤
│  📢 RECOMENDACIÓN DE LABORES AGRÍCOLAS:                │
│                                                        │
│  ⛔ POSPONER SIEMBRA DE SEMILLAS DIRECTAS HASTA EL     │
│     LUNES: La lluvia de 18 mm combinada con el suelo   │
│     húmedo actual (31.5%) generará barro y asfixia en  │
│     semillas recién brotadas.                          │
│                                                        │
│  💧 MANEJO DE RIEGO:                                   │
│  • Suspender el riego tecnificado por 4 días.          │
│  • Ahorro hídrico proyectado: ~120 m³ de agua / ha.    │
│                                                        │
│             ○ ● ○      [ SIGUIENTE: GUARDAR ➔ ]        │
└────────────────────────────────────────────────────────┘
```

---

### 9.3. Slide 3: Guardado y Georreferenciación Predial (GIS)

```text
┌────────────────────────────────────────────────────────┐
│            GUARDAR Y GEORREFERENCIAR REGISTRO          │
├────────────────────────────────────────────────────────┤
│  📍 Coordenadas GPS: -33.814298, -70.741022 (±1.8 m)  │
│  🏔️ Altitud: 412 msnm                                  │
│  📅 Fecha y Hora: 27 de Agosto 2026 — 10:45 AM         │
│                                                        │
│  Nombre del Cuartel / Potrero:                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Potrero Norte — Sector Tranque                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Etapa Fenológica Actual:                              │
│  [ Pre-Siembra ▼ ]                                     │
│                                                        │
│  Notas de Campo:                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Suelo con rastrojo de maíz. Se aplicará cal.     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  💾 Estado: Listo para guardar offline (Store & Fwd)  │
│                                                        │
│         [ 💾 GUARDAR MEDICIÓN EN EL PREDIO ]           │
└────────────────────────────────────────────────────────┘
```

---

## 10. Flujo 8: Modalidad de Operación — Medición Rápida vs. Medición Detallada

Para brindar versatilidad en terreno a diferentes perfiles de usuarios:

| Aspecto Operacional | ⚡ Medición Rápida | 🔍 Medición Detallada |
| :--- | :--- | :--- |
| **Público Objetivo** | Operador de cuadrilla, regador o chequeo veloz matinal. | Propietario del campo, asesor INDAP o agrónomo. |
| **Tiempo Total en Pantalla** | **~5 segundos**. | **~25 a 45 segundos**. |
| **Paso de Carga** | Animación rápida 2D + adquisición de 5s. | Animación guiada paso a paso + 7s con filtro Nernst. |
| **Presentación de Datos** | Grid 3×3 directo con semáforo global simplificado. | Grid 3×3 + Modales de diagnóstico individual. |
| **Análisis de Cultivos** | Omitido (evalúa fertilidad base general). | Matriz completa de +80 cultivos y % compatibilidad. |
| **Integración Climática** | Solo indicador de helada/lluvia en cabecera. | Pronóstico completo a 7 días y cálculo de evapotranspiración. |
| **Guardado de Datos** | Auto-guardado transparente en segundo plano. | Formulario con asignación de cuartel, etapa y notas. |

---

## 11. Enfoque Productivo Integral: Las 4 Etapas del Ciclo Fenológico

El valor de TerraSense no se agota en la siembra; acompaña todas las fases de la temporada:

```text
                  CICLO FENOLÓGICO CONTINUO CON TERRASENSE
  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │ 1. PRE-SIEMBRA  │───►│ 2. DESARROLLO   │───►│ 3. FLORACIÓN    │───►│ 4. PRE/POST     │
  │    Y TRASPLANTE │    │    VEGETATIVO   │    │    Y CUAJADO    │    │    COSECHA      │
  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
           │                      │                      │                      │
           ▼                      ▼                      ▼                      ▼
  • Temp > Cero Veg.     • Monitoreo de N       • Control salino (EC)  • Suelo seco para
  • pH sin bloqueos        y humedad en raíz.     crítico en floración   cosecha mecánica.
  • Enmiendas cal/yeso   • Manejo de riego      • Balance K para       • Acondicionamiento
  • Evitar siembra        para evitar asfixia    llenado y calibre      para próxima rotación.
    antes de lluvia.      radicular.             de fruto.
```

1. **Riego Diario y Manejo Hídrico:** Mide la humedad volumétrica real (VWC) en la zona de raíces activas (15 a 25 cm), indicando el momento exacto para encender o apagar las bombas, evitando el marchitamiento por sequedad y la asfixia radicular por sobre-riego.
2. **Crecimiento Vegetativo:** Evalúa la asimilación del Nitrógeno y la conductividad eléctrica durante la elongación de tallos y emisión de hojas, alertando sobre deficiencias nutricionales antes de que aparezca clorosis visible.
3. **Floración y Cuajado de Fruto:** La etapa de mayor sensibilidad hídrica y salina. Un pico de salinidad ($\text{EC} > 2.200\,\mu\text{S/cm}$) en floración aborta las flores y causa *blossom end rot* (pudrición apical) en tomates y pimientos.
4. **Maduración y Cosecha / Post-Cosecha:** Monitorea la humedad para programar la cosecha con piso firme para maquinaria agrícola y evalúa el agotamiento de nutrientes del suelo para calcular el plan de reposición orgánico/químico de la siguiente temporada.

---

## 12. Visualizador Satelital y Cartografía GIS Predial

Al presionar la pestaña **"🗺️ GIS"** en la barra de navegación inferior, la app abre el visor cartográfico satelital potenciado por Mapbox y PostGIS:

```text
┌────────────────────────────────────────────────────────┐
│ 🗺️ VISOR PREDIAL GEOESPACIAL           [ 🎛️ Capas ▼ ] │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │  🛰️ MAPA SATELITAL PREDIAL (HORTALIZAS)           │ │
│ │                                                    │ │
│ │   (P1) 🟢          (P2) 🟢                         │ │
│ │    pH 6.4           pH 6.6                         │ │
│ │                                                    │ │
│ │           (P3) 🟡                                  │ │
│ │            pH 5.8 [Cal 200 kg]                     │ │
│ │                                                    │ │
│ │   (P4) 🔴          (P5) 🟢                         │ │
│ │    pH 5.1           pH 6.5                         │ │
│ │    [Salino!]                                       │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🎛️ FILTROS ACTIVOS:                                    │
│ [ Capa: Semáforo Global ▼ ]   [ Fecha: Últimos 30 días ]│
│                                                        │
│ 📈 RESUMEN DEL PREDIO:                                 │
│ • Superficie Muestreada: 3.2 Hectáreas                 │
│ • Puntos Totales: 18 mediciones georreferenciadas      │
│ • % Superficie Apta: 78% (2.5 ha) | Enmienda: 22%      │
│                                                        │
│       [ 📄 EXPORTAR INFORME TÉCNICO PDF / EXCEL ]      │
└────────────────────────────────────────────────────────┘
```

* **Capas Temáticas Seleccionables:**
  1. *Capa Semáforo Global (Verde / Amarillo / Rojo)*.
  2. *Mapa de Calor de Salinidad (EC)* con gradiente de interpolación IDW.
  3. *Mapa de Calor de pH y Necesidad de Encalado*.
  4. *Mapa de Humedad Volumétrica (VWC)* para detección de fugas de riego o sectores secos.
* **Exportación de Informes Oficiales:** Genera reportes agronómicos con membrete profesional en formato PDF con mapas vectoriales para adjuntar a solicitudes de créditos INDAP o certificaciones de Buenas Prácticas Agrícolas (BPA).

---

*Documentación técnica elaborada para el proyecto TerraSense — INACAP 2026.*
