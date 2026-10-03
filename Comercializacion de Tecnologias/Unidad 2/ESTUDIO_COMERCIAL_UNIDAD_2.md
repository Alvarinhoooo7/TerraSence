# Plan de Marketing: TerraSense
**Evaluación N°2: Comercialización y Tecnologías**

## 1. Fundamentos del Marketing
De acuerdo con las definiciones de la AMA y Kotler, el marketing busca crear, comunicar y entregar **valor** a través de un **intercambio** que genere **satisfacción**. TerraSense adopta una **orientación al marketing social**, donde no solo buscamos satisfacer la necesidad del cliente, sino proteger el bienestar a largo plazo de la sociedad (optimizando el uso hídrico).
- **Necesidad:** Estado de carencia de información (incertidumbre del agricultor sobre la humedad y nutrientes).
- **Deseo:** La forma que toma la necesidad: un dispositivo portátil, sin cables y de diagnóstico rápido.
- **Demanda:** El deseo respaldado por el poder adquisitivo, apuntando a 200 unidades el primer año al precio de $465.021.
- **Valor y Satisfacción:** Se entrega un alto valor percibido al reducir la pérdida de cosechas, asegurando que el equipo cumpla las expectativas (satisfacción) mediante exactitud y facilidad de uso.

Nuestra propuesta evita la **miopía del marketing**: no vendemos sondas multiparamétricas, vendemos **certeza y decisiones agronómicas inmediatas en terreno**.

## 2. Análisis Estratégico del Entorno
### 2.1 Análisis PESTEL
*   **Político:** Políticas de eficiencia hídrica (Código de Aguas) e instrumentos de fomento (CORFO/INDAP) impulsan la adopción. La Ley 21.719 de Protección de Datos exige rigor en el manejo de datos de usuarios.
*   **Económico:** El alza en los costos de insumos (fertilizantes) hace que medir sea una inversión altamente rentable. Sin embargo, el costo de producción depende del USD (60% del BOM es importado).
*   **Social:** Relevo generacional en el agro. Nuevos agricultores son nativos digitales, pero conviven con la resistencia cultural al cambio de los agricultores tradicionales.
*   **Tecnológico:** Ecosistema maduro (ESP32, BLE, React Native). Riesgo de ingreso de grandes actores tecnológicos al segmento de bajo costo.
*   **Ecológico:** La megasequía de 15 años en Chile obliga a optimizar el riego. TerraSense se alinea fuertemente con la sustentabilidad y normativas ESG.
*   **Legal:** Necesidad de homologación SUBTEL para transmisión BLE y normativas sobre responsabilidad de los datos (la app incluye descargos de responsabilidad agronómica).

### 2.2 Análisis FODA
*   **Fortalezas:** Motor agronómico offline (funciona sin señal celular); modelo de negocio de pago único (sin SaaS); desarrollo in-house; economía unitaria robusta (30% de utilidad).
*   **Debilidades:** Menor exactitud que un análisis químico de laboratorio; flujo de caja inicial ajustado; hardware en iteración hacia certificación V3.
*   **Oportunidades:** Escasez hídrica crítica; fondos gubernamentales para digitalización agrícola; encarecimiento de insumos.
*   **Amenazas:** Ley de datos y homologación; fuerte competencia de empresas globales consolidadas (Hanna, Bluelab); exposición al tipo de cambio.

**Relación Estratégica:** Se utilizará la fortaleza del *funcionamiento offline* y el *pago único* para penetrar el mercado de agricultores desatendidos por soluciones complejas, mitigando la amenaza de la competencia internacional (que suele requerir suscripciones cloud).

## 3. Consumidor Objetivo y Factores de Compra
**Perfil:** Pequeños y medianos agricultores, así como asesores agronómicos independientes que requieren movilidad y rapidez en terreno.
**Factores de Influencia:**
*   **Culturales:** Transición de la cultura de "intuición empírica" hacia una de "datos". Valoran herramientas que se sientan robustas y confiables.
*   **Sociales:** Alta influencia del "boca a boca" (grupos de referencia), juntas de vigilancia y recomendaciones de agrónomos (estatus).
*   **Psicológicos:** Motivación (Maslow) impulsada por la *seguridad* (evitar pérdidas de cosecha). La percepción frente a tecnologías complejas es de rechazo, por lo que se requiere aprendizaje rápido.
*   **Personales:** Sensibilidad al flujo de caja (ingresos y ocupación). Prefieren un pago único en vez de suscripciones.

**Modelos de Comportamiento Aplicados:**
*   **Caja Negra (Kotler):** Estímulos externos (sequía, publicidad) ingresan a la mente del agricultor, quien procesa la compra buscando seguridad hídrica, resultando en la adopción del equipo.
*   **Modelo EKB:** Factores externos (recomendación de agrónomos) e internos (motivación por innovar) interactúan simultáneamente en la evaluación de TerraSense.
*   **Howard-Sheth:** Destaca el aprendizaje y percepción. La primera experiencia postcompra de TerraSense será vital para generar lealtad y retroalimentación positiva.

## 4. Recorrido del Consumidor ("Sigue al consumidor")
1.  **Necesidad (Reconocimiento):** El agricultor ve signos de estrés hídrico en sus cultivos o nota un aumento excesivo en sus facturas de fertilizante.
    *   *Acción:* Publicación de artículos educativos (blogs/RRSS) sobre cómo el mal riego afecta la rentabilidad.
2.  **Búsqueda de Información:** Pregunta a su asesor agronómico o busca en Google "cómo medir humedad del suelo rápido".
    *   *Acción:* Campañas SEM (Google Ads) para palabras clave específicas y un programa de comisiones por referidos para agrónomos.
3.  **Evaluación de Alternativas:** Compara: enviar muestras al laboratorio (lento/caro), comprar medidores básicos (solo datos crudos) o TerraSense (rápido y con diagnóstico).
    *   *Acción:* Tabla comparativa interactiva en la Landing Page ("TerraSense vs Laboratorio vs Competencia").
4.  **Decisión de Compra:** Siente fricción al pagar online por una marca de hardware nueva.
    *   *Acción:* Integración de un botón "Click-to-WhatsApp" en la web para cerrar la venta mediante atención humana, ofreciendo garantías claras.
5.  **Postcompra:** Usa el equipo por primera vez y evalúa su experiencia.
    *   *Acción:* *Onboarding* guiado por BLE desde la App (muy intuitivo). Envío de correo a los 15 días preguntando por sus resultados e incentivando que deje un testimonio a cambio de un beneficio.

## 5. Mercado, Competencia, Diferenciación y Posicionamiento
*   **Mercado y Competencia:** Mercado agrotech en expansión. Competidores directos: Bluelab Pulse (aprox. $539k) y Hanna HI9814 ($492k). Ambos entregan métricas crudas (CE, Humedad, Temperatura) delegando la interpretación en el usuario.
*   **Diferenciación:** TerraSense no solo mide, **interpreta offline**. Su motor agronómico traduce los datos en consejos accionables (ej. "Riego urgente", "Nutrientes óptimos") según la etapa fenológica del cultivo, operando 100% sin conexión a internet y sin cobrar mensualidad.
*   **Posicionamiento:** *"Tu asesor agronómico de bolsillo"*. TerraSense se posiciona como la herramienta más accesible, rápida y accionable del mercado; no entrega solo números, entrega respuestas.

## 6. Estrategia de Marketing (7P)
1.  **Producto:** Instrumento físico (Sonda RS-485 + ESP32 BLE) y plataforma digital (App móvil + Supabase). Características: portátil, batería de larga duración, motor agronómico offline.
2.  **Precio:** $465.021 (IVA incluido). Precio basado en el valor y en el modelo financiero del proyecto, asegurando un 30% de utilidad y manteniéndose por debajo de competidores premium.
3.  **Plaza:** Venta directa digital (B2C) a través de e-commerce propio (Shopify), despachando a todo Chile vía Bluexpress. Sin intermediarios para maximizar margen.
4.  **Promoción:** Publicidad digital enfocada (Ads), demostraciones en terreno (días de campo) y alianzas con consultores agrícolas.
5.  **Personas:** Soporte técnico empático y especializado. El equipo habla el "mismo idioma" (agronómico) que el usuario, generando confianza.
6.  **Procesos:** Flujo de emparejamiento BLE de 30 segundos (botón PAIR). Interfaz de lectura en 1 clic. Proceso de logística inversa expedito para garantías.
7.  **Presencia Física (Physical Evidence):** Empaque robusto diseñado para el campo. Equipo con certificación/aislamiento. Aplicación móvil con modo oscuro (Dark Mode) y diseño premium, garantizando alta legibilidad bajo el sol.

## 7. Publicidad y Promoción
*   **Público Objetivo:** Agricultores de hortalizas y frutales (30 a 60 años) y agrónomos jóvenes.
*   **Concepto Creativo:** *"Toma el control de tu suelo, al instante."*
*   **Mensaje Principal:** "Deja de adivinar cuándo regar. TerraSense te da la respuesta exacta en segundos, directo en tu teléfono y sin pagar mensualidades."
*   **Medios y Formatos:** 
    - Reels/TikTok demostrando el equipo enterrándose en el suelo en tiempo real.
    - Imágenes tipo "Antes/Después" en Facebook Ads (cultivo estresado vs. cultivo con TerraSense).
*   **Llamado a la Acción (CTA):** "Asesórate gratis por WhatsApp" (para mitigar desconfianza) o "Adquiérelo con envío gratis".
*   **Acciones Promocionales:** 10% de descuento a los primeros 50 compradores ("Early Adopters") y programa de incentivos por referidos.

## 8. Marketing Digital
*   **Estrategia Digital:** Embudo enfocado en educación y demostración de valor empírico.
*   **Canales:** Facebook e Instagram (gran penetración en zonas rurales chilenas) y Google Search Ads (intención de compra directa).
*   **Contenidos y Formatos:** 
    - *Atracción (ToFu):* Infografías sobre cuánto dinero se pierde por lixiviación de fertilizantes (2x semana).
    - *Consideración (MoFu):* Casos de éxito en video de clientes reales usando la app offline (1x semana).
    - *Conversión (BoFu):* Retargeting dinámico hacia quienes visitaron el producto, ofreciendo asistencia por chat.
*   **Interacción y Frecuencia:** Monitoreo diario de comentarios. Respuestas en menos de 1 hora. Historias interactivas semanales ("¿Cuánta agua crees que le falta a este predio?").

## 9. Identidad Visual y Comunicación
*   **Logotipo y Colores:** Paleta que mezcla la naturaleza con la tecnología: Verde Hoja, Tierra Oscuro y Azul Tecnológico. Transmite solidez, crecimiento y ciencia.
*   **Tipografía:** Fuentes sans-serif limpias (como Inter o Roboto). Es fundamental el alto contraste para que el agricultor pueda leer la pantalla a plena luz del sol.
*   **Composición Visual:** Fotografías documentales y reales. Manos sucias con tierra sosteniendo el smartphone. Nada de fotos de archivo de laboratorios asépticos.
*   **Estilo Comunicacional:** Cercano, empático y directo. Se tutea al agricultor, pero se utiliza jerga técnica precisa (ej. "capacidad de campo", "punto de marchitez permanente") para demostrar autoridad técnica.

## 10. Fuentes de Información
*   **Primarias:** 
    - Testing UX con agricultores reales para el desarrollo de la App.
    - Entrevistas y levantamiento de requerimientos funcionales en terreno.
*   **Secundarias:** 
    - Datos técnicos y comerciales de la competencia (manuales y catálogos de Bluelab, Hanna).
    - Repositorio técnico y financiero propio (`finanzas/supuestos.json`, `finanzas/modelo.py`).
    - Ley 21.719 sobre Protección de Datos Personales de Chile.
