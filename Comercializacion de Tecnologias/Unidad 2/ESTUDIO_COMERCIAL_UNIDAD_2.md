# TerraSense — Estudio Comercial Integrado (Unidad 2)

> **Alcance:** Este documento consolida el análisis estratégico de marketing, el comportamiento del consumidor y la auditoría del entorno (Micro y Macro) del proyecto TerraSense, aplicando los marcos teóricos de comercialización de tecnologías a la realidad financiera y técnica del repositorio.

---

## 1. Estrategia de Marketing y Orientación Empresarial

El marketing de TerraSense no se enfoca en vender "sondas", sino en resolver un problema operativo crítico, evitando así la clásica *Miopía de Marketing*.

### 1.1 De la Necesidad a la Demanda
*   **Necesidad:** El agricultor tiene un estado de carencia (certidumbre) respecto a las condiciones hídricas y de fertilidad de su suelo.
*   **Deseo:** La necesidad se moldea culturalmente en el deseo de un "asesor de bolsillo" que sea fácil de usar, sin cables, y que entregue un veredicto claro y accionable sin tener que esperar a un laboratorio.
*   **Demanda:** Cuando ese deseo es respaldado por el poder adquisitivo (y la voluntad de pagar los $465.021 fijados en nuestro equilibrio), se convierte en demanda efectiva, cuantificada como las 200 unidades meta del Año 1.

### 1.2 Orientación de la Empresa
TerraSense descarta la *Orientación a las Ventas* (empujar volumen sin importar la satisfacción) y adopta firmemente la **Orientación al Marketing y al Marketing Social**:
*   **Orientación al Marketing:** El desarrollo de la solución (Firmware, App, Cloud) está diseñado en función de lo que el cliente realmente necesita (interpretación offline y portabilidad) mejor que la competencia (Hanna, Bluelab).
*   **Marketing Social:** La propuesta de valor incluye un propósito más amplio: **Sustentabilidad y Democratización**. Evitar el riego innecesario protege el recurso hídrico, y evitar la sobre-fertilización protege las napas subterráneas. 

### 1.3 El Plan de Marketing Integrado (Las 4 P's)
*   **Producto:** Sonda RS-485 7-en-1 + Microcontrolador ESP32 BLE + App Móvil (motor agronómico offline) + Cloud (Supabase). Entregando un veredicto accionable ("Semáforo") sin cobros por suscripción. El diseño de detalle incluye carcasa y PCB V3 con sus respectivos protocolos FAT y SAT.
*   **Precio:** Fijado en **$465.021** (IVA incluido). Posicionamiento estratégico por debajo de los sustitutos de marca pero asegurando el margen objetivo neto del 30 % necesario para el sostenimiento financiero.
*   **Plaza:** En el Año 1: **Venta Directa** a través de e-commerce (ej. Shopify), gestionando logística con Bluexpress.
*   **Promoción:** Publicidad digital (Facebook/Google Ads) orientada a la búsqueda de soluciones de riego. Técnica de *Click-to-WhatsApp* para reducir la fricción y permitir soporte pre-venta personalizado.

---

## 2. Análisis del Entorno: Microentorno

El microentorno está compuesto por los actores cercanos que afectan la capacidad de la empresa para servir a sus clientes.

*   **La Empresa (Ambiente Interno):** Sincronización de tres frentes técnicos: Hardware/I+D (PCB V2, impresión 3D), Software (Supabase, App React Native) y Finanzas (gestión del crédito y flujo de fondos inicial negativo).
*   **Proveedores:** Importación directa de la sonda RS-485 7-en-1 (representa el 60 % del BOM = $80.076, alta exposición al dólar) y sensores BME280.
*   **Intermediarios del Marketing:** Plataformas de E-commerce (Shopify), pasarelas (Webpay, Mercado Pago) y logística de última milla.
*   **Competidores:** Medidores portátiles básicos (ej. Hanna HI9814 a ~$492k) y sensores intermedios (ej. Bluelab Pulse a ~$539k). Laboratorios químicos como complemento de alta exactitud.
*   **Clientes:** Mercado de Consumo (B2C) enfocado en pequeños y medianos agricultores. Mercado B2B enfocado en cooperativas o asesores agronómicos.
*   **Públicos:** Gobierno y Reguladores (SUBTEL, Ley de Protección de Datos 21.719), Instituciones de Fomento (INDAP, CORFO).

---

## 3. Análisis FODA (Estudio Independiente)

### 3.1 Fortalezas (Factores Internos Positivos)
*   **Motor agronómico offline:** Procesa la información y sugiere acciones sin requerir internet, clave para la ruralidad chilena.
*   **Modelo de pago único:** Sin cobros recurrentes (SaaS), reduciendo la barrera de adopción.
*   **Economía unitaria robusta:** Margen objetivo neto del 30 % que permite absorber costos fijos y de adquisición.
*   **Desarrollo in-house:** Impresión 3D y código propio que elimina altos costos de matricería (CAPEX).

### 3.2 Debilidades (Factores Internos Negativos)
*   **Sin exactitud analítica de laboratorio:** Valores de N/P/K inferidos, exigen manejar muy bien las expectativas.
*   **Flujo ajustado:** El servicio de deuda y costos fijos del primer año superan la generación de caja inicial, arrojando una pérdida operativa temporal.
*   **Hardware pendiente de ensayo físico:** Aunque la ingeniería de detalle (V3) cuenta con protocolos FAT y SAT, aún requieren ejecución en terreno y laboratorio.
*   **Precio sin validación comercial:** Los $465.021 son una hipótesis financiera sin tracción demostrada.
*   **Exposición cambiaria:** Fuerte dependencia de la cotización del dólar por la sonda importada.

### 3.3 Oportunidades y Amenazas (Derivadas del PESTEL)
*   *Oportunidades:* Escasez hídrica, encarecimiento de fertilizantes, relevo generacional, y fondos estatales (CORFO).
*   *Amenazas:* Cumplimiento de la Ley 21.719 y homologación SUBTEL, brecha digital, y competencia de actores globales.

---

## 4. Análisis PESTEL (Macroentorno)

### P — Político
*   **Oportunidades:** Política nacional de agricultura de precisión; Instrumentos de fomento productivo (CORFO, FIA); Incentivos a la eficiencia hídrica (Código de Aguas).
*   **Amenazas:** Inestabilidad regulatoria por la Ley 21.719 de Protección de Datos (vigencia 01-12-2026); Obligaciones SUBTEL pendientes para homologación BLE.

### E — Económico
*   **Oportunidades:** Alza en el costo de insumos agrícolas (mayor valor de medir); Precio competitivo (~8% bajo Hanna); Modelo sin suscripción.
*   **Amenazas:** Alta exposición al tipo de cambio (USD/CLP) afectando el 60 % del BOM; flujo de caja inicial en déficit el primer año; Sensibilidad a las condiciones del crédito bancario.

### S — Social
*   **Oportunidades:** Relevo generacional en el campo; Conciencia sobre sustentabilidad; Democratización del acceso tecnológico (smartphones).
*   **Amenazas:** Brecha digital en el agricultor tradicional; Fuerte resistencia cultural al cambio de método (intuición vs datos).

### T — Tecnológico
*   **Oportunidades:** Ecosistema ESP32 y BLE maduro; Madurez de Supabase; Impresión 3D y ensamble PCBA externo.
*   **Amenazas:** Hardware V3 con protocolos de prueba aún pendientes de ejecución; Riesgo de obsolescencia del SKU de la sonda 7-en-1; Ingreso de grandes plataformas al segmento de bajo costo.

### E — Ecológico / Ambiental
*   **Oportunidades:** Megasequía (15 años) impulsa la demanda de eficiencia hídrica; Normativa ambiental en fertilizantes; Posicionamiento ESG.
*   **Amenazas:** Variabilidad climática extrema afecta la calibración empírica; Salinización de suelos invalida el modelo de inferencia N/P/K.

### L — Legal
*   **Oportunidades:** Marco normativo agrotech aún en desarrollo (pocas barreras sanitarias comparado con dispositivos médicos).
*   **Amenazas:** Ley 21.719 exige arquitectura de privacidad estricta; SUBTEL requiere homologación antes de la venta; Disclaimers necesarios sobre responsabilidad agronómica.

---

## 5. Comportamiento del Consumidor Agrícola

Aplicación de los factores de influencia y modelos de decisión al usuario objetivo.

### 5.1 Factores de Influencia
*   **Culturales:** Transición de la "cultura de intuición empírica" a la agricultura de precisión impulsada por la subcultura digitalizada del relevo generacional.
*   **Sociales:** Fuerte peso del "boca a boca" (grupos de referencia como vecinos o cooperativas).
*   **Psicológicos:** La motivación principal (Maslow) es la *seguridad* frente a la pérdida de cosecha. Existe una barrera de percepción por malas experiencias pasadas con tecnología compleja.
*   **Personales:** Presupuesto estacional del agricultor, que hace que un pago único encaje mejor en su flujo de caja que una mensualidad SaaS.

### 5.2 Modelos de Comportamiento Aplicados
*   **Caja Negra (Kotler):** Estímulos (Sequía, publicidad) → Caja Negra (Miedo a perder cultivo, evaluación de $451k) → Respuesta (Compra).
*   **Modelo EKB:** Combina factores internos (miedo) y externos (recomendación de agrónomo) simultáneamente para evaluar el equipo.
*   **Howard-Sheth:** Destaca el *aprendizaje*. Si la primera experiencia (vinculación BLE y lectura) es positiva, genera lealtad rápida.

### 5.3 Proceso de Decisión de Compra (5 Etapas)
1.  **Reconocimiento:** El agricultor detecta gasto excesivo o riesgo hídrico inminente.
2.  **Búsqueda:** Consulta a pares, foros agrícolas o asesores.
3.  **Evaluación:** Compara *Laboratorio* (Exacto pero lento), *Hanna HI9814* ($492k, solo datos crudos) y *TerraSense* ($465k, rápido, interpretado).
4.  **Decisión:** Fricción superada por canales asistidos (WhatsApp) frente al e-commerce automatizado.
5.  **Postcompra:** La satisfacción ocurre si TerraSense evita un mal riego. Puede haber disonancia cognitiva si el cliente esperaba una precisión de laboratorio (por ello, la App excluye deliberadamente el cálculo de dosificación química).
