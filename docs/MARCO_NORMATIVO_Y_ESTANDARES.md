# 📜 Marco Normativo, Estándares Internacionales y Cumplimiento Regulatorio — TerraSense

> **Proyecto:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Área:** Cumplimiento Normativo, Certificaciones Metrológicas, Ciberseguridad y Legislación  
> **Institución:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  

---

> ### 🛑 Estado de verificación — leer antes de citar este documento
> Revisado tras la [auditoría del 4 de septiembre de 2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md).
>
> **TerraSense no tiene ninguna certificación obtenida.** Este documento identifica el marco normativo **aplicable** y describe atributos de diseño orientados a cumplirlo. **No acredita cumplimiento**: no hay ensayos, actas, expedientes presentados ni evaluaciones de conformidad. La matriz de §7 fue corregida: los antiguos «100 % Cumplido» eran afirmaciones sin respaldo.
>
> Un módulo de radio pre-homologado, una celda con protección o un gabinete con junta son **componentes o características de diseño**, no demostración de conformidad del **producto terminado**.

## 📑 Tabla de Contenidos

1. [Introducción y Objetivos de Cumplimiento Regulatorio](#1-introducción-y-objetivos-de-cumplimiento-regulatorio)
2. [Normativas de Hardware, Seguridad Eléctrica y Envolventes](#2-normativas-de-hardware-seguridad-eléctrica-y-envolventes)
   - [2.1. IEC 60529 — Grados de Protección Proporcionados por Envolventes (IP67 / IP68)](#21-iec-60529--grados-de-protección-proporcionados-por-envolventes-ip67--ip68)
   - [2.2. UN 38.3 e IEC 62133-2 — Seguridad de Baterías de Ion-Litio / LiPo](#22-un-383-e-iec-62133-2--seguridad-de-baterías-de-ion-litio--lipo)
   - [2.3. Directiva RoHS 2011/65/EU y RoHS 3 (2015/863) — Sustancias Peligrosas](#23-directiva-rohs-201165eu-y-rohs-3-2015863--sustancias-peligrosas)
   - [2.4. Ley REP N° 20.920 (Chile) y Directiva WEEE 2012/19/EU — Gestión de RAEE](#24-ley-rep-n-20920-chile-y-directiva-weee-201219eu--gestión-de-raee)
3. [Normativas de Telecomunicaciones, Radiofrecuencia y Compatibilidad Electromagnética (EMC)](#3-normativas-de-telecomunicaciones-radiofrecuencia-y-compatibilidad-electromagnética-emc)
   - [3.1. Subsecretaría de Telecomunicaciones de Chile (SUBTEL — Res. Exenta N° 1.985 / 2017)](#31-subsecretaría-de-telecomunicaciones-de-chile-subtel--res-exenta-n-1985--2017)
   - [3.2. FCC Parte 15 Subparte B y Subparte C (EE.UU.) — BLE 2.4 GHz](#32-fcc-parte-15-subparte-b-y-subparte-c-eeuu--ble-24-ghz)
   - [3.3. Directiva RED 2014/53/EU (Unión Europea) — Equipos de Radio](#33-directiva-red-201453eu-unión-europea--equipos-de-radio)
4. [Estándares de Buses Industriales y Protocolos de Comunicación](#4-estándares-de-buses-industriales-y-protocolos-de-comunicación)
   - [4.1. EIA/TIA-485-A — Transmisión Diferencial Multipunto](#41-eiatia-485-a--transmisión-diferencial-multipunto)
   - [4.2. Modbus-IDA Protocol Specification v1.1b3 — Modbus RTU](#42-modbus-ida-protocol-specification-v11b3--modbus-rtu)
5. [Estándares Edafológicos, Agronómicos y Metrología de Suelos](#5-estándares-edafológicos-agronómicos-y-metrología-de-suelos)
   - [5.1. ISO 10390:2021 — Calidad del Suelo: Determinación de pH](#51-iso-103902021--calidad-del-suelo-determinación-de-ph)
   - [5.2. ISO 11265:1994 — Determinación de la Conductividad Eléctrica Específica](#52-iso-112651994--determinación-de-la-conductividad-eléctrica-específica)
   - [5.3. ISO 11277:2020 — Granulometría y Textura de Suelo Mineral](#53-iso-112772020--granulometría-y-textura-de-suelo-mineral)
   - [5.4. Métodos Oficiales del SAG / INIA Chile — Recomendaciones Agrícolas](#54-métodos-oficiales-del-sag--inia-chile--recomendaciones-agrícolas)
6. [Legislación de Protección de Datos, Ciberseguridad y Accesibilidad de Software](#6-legislación-de-protección-de-datos-ciberseguridad-y-accesibilidad-de-software)
   - [6.1. Ley N° 19.628 y Nueva Ley de Protección de Datos Personales en Chile (Alineada con RGPD / GDPR)](#61-ley-n-19628-y-nueva-ley-de-protección-de-datos-personales-en-chile-alineada-con-rgpd--gdpr)
   - [6.2. ISO/IEC 27001:2022 — Seguridad de la Información y Cifrado de Datos](#62-isoiec-270012022--seguridad-de-la-información-y-cifrado-de-datos)
   - [6.3. ISO/IEC 25010:2011 — Modelo de Calidad del Producto de Software](#63-isoiec-250102011--modelo-de-calidad-del-producto-de-software)
   - [6.4. WCAG 2.1 Nivel AA — Accesibilidad Web y Móvil para Entornos Rurales](#64-wcag-21-nivel-aa--accesibilidad-web-y-móvil-para-entornos-rurales)
7. [Matriz de Cumplimiento Normativo Consolidada](#matriz-cumplimiento)

---

## 1. Introducción y Objetivos de Cumplimiento Regulatorio

El diseño, fabricación, comercialización y despliegue del sistema **TerraSense** debe regirse por un cuerpo normativo multidisciplinario que garantice:
1. La **seguridad física y eléctrica del agricultor** durante la operación en terreno.
2. La **confiabilidad metrológica y validez agronómica** de las mediciones y prescripciones de cultivo.
3. La **compatibilidad electromagnética e inocuidad del espectro radioeléctrico**.
4. La **privacidad, soberanía y confidencialidad de la información territorial y comercial** de los productores agrícolas.

```text
                     ECOSISTEMA REGULATORIO TERRASENSE
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ HARDWARE & ENERGÍA     │ 📡 RADIO & TELECOM      │ 🧪 EDAFOLOGÍA & AGRO  │
│ • IEC 60529 (IP67)        │ • SUBTEL Res. 1.985     │ • ISO 10390 (pH)      │
│ • UN 38.3 / IEC 62133-2   │ • FCC Parte 15 Clase B  │ • ISO 11265 (EC)      │
│ • RoHS 3 (2015/863/EU)    │ • RED 2014/53/EU (BLE)  │ • Métodos SAG / INIA  │
├───────────────────────────┼─────────────────────────┼───────────────────────┤
│ 🏭 PROTOCOLOS INDUSTRIALES│ 🛡️ CIBERSEGURIDAD & PRIV│ 👁️ ACCESIBILIDAD & UX │
│ • EIA/TIA-485-A           │ • Ley 19.628 / GDPR     │ • WCAG 2.1 Nivel AA   │
│ • Modbus-IDA v1.1b3       │ • ISO/IEC 27001 (SGSI)  │ • ISO/IEC 25010       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Normativas de Hardware, Seguridad Eléctrica y Envolventes

### 2.1. IEC 60529 — Grados de Protección Proporcionados por Envolventes (IP67 / IP68)
* **Gabinete Principal (Empuñadura ABS):** **Objetivo de diseño IP67 — sin ensayo ni certificación.**
  * **Primer Dígito (6):** Protección total contra el ingreso de polvo fino y partículas sólidas (ensayo de cámara de talco en suspensión por 8 horas con presión reducida).
  * **Segundo Dígito (7):** Protección contra los efectos de la inmersión temporal en agua a **1 metro de profundidad durante 30 minutos** sin filtración dañina.
* **Sonda Edafológica (Varillas Inox 316L):** Certificación **IP68** para trabajo en suelo saturado o bajo agua continua.

### 2.2. UN 38.3 e IEC 62133-2 — Seguridad de Baterías de Ion-Litio / LiPo
* El paquete de batería integrado (celda de litio de $2.000\text{ mAh}$) **debe** ajustarse al manual de pruebas de la ONU (Sección 38.3) y a **IEC 62133-2:2017**. ⚠️ **No se ha adquirido la celda definitiva ni se dispone de su expediente de ensayos**; lo siguiente describe los requisitos de diseño, no conformidad acreditada:
  * **Prueba T.1 a T.5:** Simulación de altitud (11.6 kPa), ciclado térmico ($-40^\circ\text{C}$ a $+72^\circ\text{C}$), vibración mecánica senoidal, choque de impacto ($150\text{ gn}$) y cortocircuito externo a $+55^\circ\text{C}$.
  * **Circuito de protección (PCM de la celda + PCB combinada de carga/boost):** corte por sobrecarga ($V_{\text{cell}} > 4.25\text{V}$), sobredescarga ($V_{\text{cell}} < 2.80\text{V}$) y sobrecorriente. *(El diseño vigente usa una PCB combinada de carga y elevación, no un TP4056 discreto.)*

### 2.3. Directiva RoHS 2011/65/EU y RoHS 3 (2015/863) — Sustancias Peligrosas
* El ensamblaje de la placa de circuito impreso (PCB) y componentes electrónicos garantiza la ausencia o concentración por debajo de los límites permitidos de:
  * Plomo ($\text{Pb} < 0.1\%$) mediante el uso exclusivo de soldadura libre de plomo **SAC305 (Sn96.5/Ag3.0/Cu0.5)**.
  * Cadmio ($\text{Cd} < 0.01\%$), Mercurio ($\text{Hg} < 0.1\%$), Cromo Hexavalente ($\text{Cr}^{6+} < 0.1\%$), PBB y PBDE.

### 2.4. Ley REP N° 20.920 (Chile) y Directiva WEEE 2012/19/EU — Gestión de RAEE
* Marco para la Responsabilidad Extendida del Productor en Chile:
  * Etiquetado del símbolo de contenedor tachado en el empaque.
  * Programa de recolección y reciclaje de baterías de litio y placas electrónicas al término de su ciclo de vida útil en alianza con gestores autorizados.

---

## 3. Normativas de Telecomunicaciones, Radiofrecuencia y Compatibilidad Electromagnética (EMC)

### 3.1. Subsecretaría de Telecomunicaciones de Chile (SUBTEL — Res. Exenta N° 1.985 / 2017)
* Regula los **Equipos de Radiocomunicación de Corto Alcance** en territorio nacional:
  * **Banda de Operación:** $2.400,0 - 2.483,5\text{ MHz}$ (Banda ISM).
  * **Potencia máxima radiada aparente (PIRE):** $\le 100\text{ mW}$ ($+20\text{ dBm}$). El presupuesto de diseño es de **$+9\text{ dBm}$ ($\approx 8\text{ mW}$)**, holgadamente bajo el límite. ⚠️ **Estar bajo el límite de potencia no equivale a haber cumplido el procedimiento**: SUBTEL actualizó el régimen de equipos de alcance reducido con vigencia desde **febrero de 2026** y las obligaciones aplican al **producto terminado**, no al módulo. No se ha presentado expediente alguno.

### 3.2. FCC Parte 15 Subparte B y Subparte C (EE.UU.) — BLE 2.4 GHz
* **FCC Parte 15.247 (Radiador Intencional):** Modulación digital GFSK en Bluetooth Low Energy con ancho de banda a $-6\text{ dB} \ge 500\text{ kHz}$ y emisiones espurias en reposo por debajo de los límites de Clase B.
* **Módulo ESP32-WROOM-32:** Certificación modular precertificada **FCC ID: 2AC7Z-ESPWROOM32**.

### 3.3. Directiva RED 2014/53/EU (Unión Europea) — Equipos de Radio
* Cumplimiento de estándares armonizados:
  * **EN 300 328 v2.2.2:** Requisitos técnicos para sistemas de transmisión de datos en banda ancha a 2.4 GHz.
  * **EN 301 489-1 / EN 301 489-17:** Inmunidad electrostática (ESD $\pm 4\text{ kV}$ contacto / $\pm 8\text{ kV}$ aire según IEC 61000-4-2) y compatibilidad electromagnética en entornos comerciales e industriales ligeros.

---

## 4. Estándares de Buses Industriales y Protocolos de Comunicación

### 4.1. EIA/TIA-485-A — Transmisión Diferencial Multipunto
* Especificación de la capa física entre el microcontrolador y la sonda:
  * Transmisión diferencial simétrica con voltajes de línea $V_A - V_B$ de $\pm 1.5\text{V}$ a $\pm 5.0\text{V}$.
  * Alta inmunidad frente al ruido inductivo generado por motobombas, generadores diésel y líneas eléctricas rurales cercanas.

### 4.2. Modbus-IDA Protocol Specification v1.1b3 — Modbus RTU
* Implementación estricta de la trama serial maestro-esclavo:
  * Función 0x03 (*Read Holding Registers*).
  * Verificación de integridad mediante cálculo de redundancia cíclica **CRC-16 (Polinomio generador 0xA001)** en cada consulta y respuesta.

---

## 5. Estándares Edafológicos, Agronómicos y Metrología de Suelos

Para que los datos entregados por TerraSense gocen de credibilidad técnica ante ingenieros agrónomos y comisiones evaluadoras, los modelos de inferencia se basan en normas ISO de calidad de suelo:

### 5.1. ISO 10390:2021 — Calidad del Suelo: Determinación de pH
* Define el protocolo internacional de referencia para medición potenciométrica de pH en suspensión de suelo con agua (relación 1:5) o solución de cloruro de calcio ($\text{CaCl}_2$ 0.01 mol/L).
* El algoritmo de TerraSense aplica una **curva de compensación de temperatura basada en la ecuación electroquímica de Nernst**:
  $$E = E_0 - \frac{2.303 \cdot R \cdot T}{F} \cdot \text{pH}$$

### 5.2. ISO 11265:1994 — Determinación de la Conductividad Eléctrica Específica
* Estandariza la medición de la salinidad del suelo mediante la conductividad electrolítica a una temperatura de referencia de **$25.0^\circ\text{C}$**.
* TerraSense normaliza internamente la lectura mediante el coeficiente térmico estándar ($\alpha = 2.0\% / ^\circ\text{C}$):
  $$\text{EC}_{25} = \frac{\text{EC}_{\text{medido}}}{1 + 0.020 \cdot (T_{\text{suelo}} - 25.0)}$$

### 5.3. ISO 11277:2020 — Granulometría y Textura de Suelo Mineral
* Clasificación de texturas según el triángulo USDA (Arena, Limo, Arcilla) para parametrizar la Capacidad de Campo ($\theta_{\text{CC}}$) y el Punto de Marchitez Permanente ($\theta_{\text{PMP}}$) en el cálculo del Agua Útil Disponible (AUD).

### 5.4. Métodos Oficiales del SAG / INIA Chile — Recomendaciones Agrícolas
* Alineación de las tablas de fertilidad N-P-K y encalado con las pautas técnicas del **Instituto de Investigaciones Agropecuarias (INIA)** y la **Comisión de Normalización de Análisis de Suelo de la Sociedad Chilena de la Ciencia del Suelo**.

---

## 6. Legislación de Protección de Datos, Ciberseguridad y Accesibilidad de Software

### 6.1. Ley N° 19.628 y Nueva Ley de Protección de Datos Personales en Chile (Alineada con RGPD / GDPR)
* **Principio de Minimización y Consentimiento:** La app solo recopila los datos estrictamente necesarios para el diagnóstico agronómico (coordenadas GPS del punto de muestreo y lecturas físicas).
* **Aislamiento Multi-Predio con RLS:** La base de datos Supabase implementa **Row Level Security (RLS)** en PostgreSQL, garantizando que ningún agricultor o cooperativa pueda visualizar las coordenadas, rendimientos o datos de fertilidad de otro predio.
* **Derechos ARCO:** El usuario cuenta con la facultad de solicitar la exportación completa de sus registros históricos o el borrado permanente de su cuenta en cualquier momento.

### 6.2. ISO/IEC 27001:2022 — Seguridad de la Información y Cifrado de Datos
* **Cifrado en Tránsito:** Todas las comunicaciones entre la app móvil y Supabase se ejecutan obligatoriamente sobre canales cifrados **TLS 1.3 / HTTPS / WSS**.
* **Cifrado en Reposo:** Las credenciales y tokens JWT se almacenan en el enclave de seguridad local del smartphone (*iOS Keychain* y *Android EncryptedSharedPreferences*).

### 6.3. ISO/IEC 25010:2011 — Modelo de Calidad del Producto de Software
* Evaluación de los 8 atributos de calidad: Adecuación Funcional, Eficiencia de Desempeño, Compatibilidad, Usabilidad, Fiabilidad, Seguridad, Mantenibilidad y Portabilidad.

### 6.4. WCAG 2.1 Nivel AA — Accesibilidad Web y Móvil para Entornos Rurales
* Adaptaciones indispensables para usuarios rurales de edad avanzada:
  * **Relación de Contraste:** Mínimo **4.5:1** para texto normal y **3:1** para componentes visuales de interfaz contra fondos oscuros o claros.
  * **Área Táctil Mínima:** Todos los botones interactivos poseen un área de activación física de al menos **$48 \times 48\text{ dp}$**.
  * **Independencia del Color:** Ninguna instrucción depende exclusivamente del color; cada estado del semáforo incluye texto explícito e iconos universales (🟢 *"Óptimo"*, 🟡 *"Advertencia"*, 🔴 *"Crítico"*).

---

<a id="matriz-cumplimiento"></a>
## 7. Matriz de cumplimiento normativo — estado real

> **Ninguna fila dice «cumplido».** Todas describen obligaciones identificadas y el trabajo que falta. Esta tabla reemplaza la anterior, que declaraba «100 % Cumplido» en las nueve filas sin ensayo ni expediente alguno.

| Norma / Estándar | Ámbito | Estado real | Qué falta para acreditarlo |
| :--- | :--- | :--- | :--- |
| **IEC 60529** | Estanqueidad IP67 | ⚠️ **Objetivo de diseño, sin ensayo** | Ensayo de ingreso de polvo y agua sobre el producto final ensamblado. Una junta o un prensaestopas no son certificación |
| **UN 38.3 / IEC 62133-2** | Seguridad de baterías | ⚠️ **No acreditado** | Expediente de la celda adquirida, ensayos y documentación de transporte. Una protección PCM es un atributo de diseño, no conformidad |
| **RoHS 2011/65/EU** | Sustancias peligrosas | ⚠️ **Depende del proveedor** | Declaraciones de conformidad de los componentes efectivamente comprados |
| **SUBTEL — equipos de alcance reducido** | Radiocomunicaciones Chile | ⚠️ **Procedimiento actualizado, vigente desde febrero de 2026** | Revisar la declaración e información exigibles al **producto terminado** bajo el [régimen vigente](https://www.subtel.gob.cl/equipos-de-alcance-reducido/). La referencia a la Res. Ex. 1.985/2017 quedó desactualizada |
| **FCC / CE del módulo** | Emisiones del módulo de radio | ℹ️ **Del módulo, no del equipo** | La homologación del ESP32 **no acredita automáticamente** el cumplimiento local del producto final |
| **Seguridad eléctrica (SEC)** | Producto y cargador | ⚠️ **Sin definir** | Definir qué se entrega —cargador o adaptador incluidos— y evaluar obligaciones. El carácter SELV a 5 V es un atributo de diseño, **no una exención universal demostrada** |
| **Modbus RTU** | Comunicación con la sonda | ⚠️ **Sin firmware ni captura real** | No hay firmware en el repositorio; el mapa de registros **no está confirmado** contra la ficha del proveedor |
| **ISO 10390 / 11265** | Metrología de pH y conductividad | ⚠️ **Sin validación metrológica** | Ensayos de incertidumbre, sesgo y repetibilidad por variable. **La antigua referencia a ISO 11272 para humedad volumétrica era incorrecta**: esa norma trata la determinación de densidad aparente seca |
| **Ley N° 21.719 (datos personales)** | Privacidad | ⚠️ **Entra en vigencia el 1 de diciembre de 2026** | Bases de tratamiento, derechos de los titulares, política de retención, seguridad y reglas de transferencia internacional. RLS y TLS son medidas de seguridad, **no cumplimiento integral**; alojar en Brasil no resuelve estas obligaciones. [BCN: Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01) |
| **WCAG 2.1 AA** | Accesibilidad | ⚠️ **Sin auditoría** | Revisión de accesibilidad con herramientas y usuarios; los criterios de tamaño y contraste son de diseño, no una evaluación |

**Antes de comercializar** deben cerrarse, como mínimo: obligaciones ante SUBTEL para el producto terminado, expediente de batería y transporte, definición del alcance de seguridad eléctrica, y el régimen de datos personales de la Ley 21.719.

---

*Documento revisado el 4 de septiembre de 2026. Ver el [plan de validación](PLAN_VALIDACION.md) para el trabajo regulatorio pendiente.*
