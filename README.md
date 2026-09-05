# 🌱 TerraSense — Sistema IoT de Diagnóstico Agronómico Prescriptivo

> **No vendemos datos. Vendemos decisiones agronómicas en menos de 5 segundos.**

**Proyecto de Título — Ingeniería en Electrónica y Sistemas Inteligentes, INACAP**  
**Autores:** Álvaro Villena y Alan (Socios Fundadores) · **Versión:** 4.0 revisada (4 de septiembre de 2026)

> ### ⚠️ Estado de verificación
> **TerraSense es un prototipo en validación, no un producto comercial con rentabilidad probada.** Las prestaciones se declaran con estado explícito: *implementado*, *probado localmente*, *proyectado* o *pendiente de ensayo*. No hay ensayos físicos, certificaciones, cotizaciones firmes ni ventas pagadas que respalden las cifras de este documento.
>
> - Supuestos y límites del modelo económico: [`docs/MODELO_ECONOMICO.md`](docs/MODELO_ECONOMICO.md)
> - Cifras generadas (no editar a mano): [`docs/RESULTADOS_FINANCIEROS.md`](docs/RESULTADOS_FINANCIEROS.md)
> - Correcciones aplicadas y trabajo pendiente: [`docs/PLAN_VALIDACION.md`](docs/PLAN_VALIDACION.md)

| Dimensión | Especificación Oficial del Negocio |
| :--- | :--- |
| **Producto** | Prototipo de instrumento agronómico portátil 7-en-1 con motor prescriptivo local en smartphone. El ambiente mostrado proviene de servicio meteorológico, no de un BME280 conectado |
| **Pila Tecnológica** | ESP32-WROOM-32 (devkit) · RS-485 Modbus RTU · BLE 4.2 · React Native (Expo/TS) · Supabase + PostGIS · Vite Backoffice |
| **Mercado Objetivo** | Pequeño y mediano agricultor comercial (0,5 a 20 ha), asesores agronómicos y recambio generacional en Chile |
| **Precio de lista (hipótesis)** | **$349.990 CLP con IVA** ($294.109 CLP neto). Precio de prueba a validar con pilotos pagados; no es un precio demostrado |
| **Financiamiento (propuesto)** | Desembolso inicial $11.248.388. Aporte de socios **$9.000.000**; crédito dimensionado **$27.700.000 a 10 años** al 12 % efectivo anual **supuesto — sin oferta bancaria** |
| **Resultado del modelo** | VAN proyecto 5 años al 20 %: **+$21.874.878** · DSCR año 1: **1,04** (bajo el criterio interno de 1,3) · Equilibrio año 1: **170 u** operativo / **195 u** con deuda |
| **Retorno por socio** | **No se publica.** El sueldo del socio es costo laboral, no retorno del capital, y no existe política de dividendos definida. Escenario de estrés: VAN **−$47.949.651** |

[![Estado](https://img.shields.io/badge/estado-prototipo%20en%20validación-orange.svg)](docs/PLAN_VALIDACION.md)
[![ESP32](https://img.shields.io/badge/MCU-ESP32--WROOM--32-E7352C.svg)](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html)
[![BLE](https://img.shields.io/badge/Radio-BLE%204.2-0082FC.svg)](https://www.bluetooth.com/)
[![React Native](https://img.shields.io/badge/App-React%20Native%20%2B%20Expo-61DAFB.svg)](https://reactnative.dev/)
[![Web Console](https://img.shields.io/badge/Web-Vite%20%2B%20Tailwind-646CFF.svg)](https://terrasense-web.vercel.app)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20PostGIS-3ECF8E.svg)](https://supabase.com/)

---

## 🗺️ Ecosistema Tecnológico y Enlaces a Módulos

El proyecto se encuentra modularizado con documentación técnica especializada en cada carpeta:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ARQUITECTURA DEL SISTEMA                                │
├────────────────────────────────────────────────────────┬────────────────────────────────┤
│ 🔌 Hardware, PCB y Diseño Portátil                     │ 📱 Aplicación Móvil de Campo   │
│    Esquemático KiCad, PCB combinada carga/boost USB-C, │    React Native, Expo, BLE,    │
│    LiPo 2.000 mAh, SP3485. PCB SIN RUTEAR; sellado y   │    4 etapas fenológicas,       │
│    autonomía son objetivos sin ensayo.                 │    carrusel de 3 páginas.      │
│    ➜ Ver: [PCB/README.md](PCB/README.md)               │    ➜ Ver: [App/README.md](App/README.md) │
├────────────────────────────────────────────────────────┼────────────────────────────────┤
│ 🖥️ Consola Web de Soporte y Firmware                  │ 🗄️ Backend y Base de Datos     │
│    Backoffice operativo en Vite + React, panel         │    PostgreSQL en Supabase con  │
│    /admin, diagnóstico de flota, fábrica reset y       │    PostGIS, políticas RLS y    │
│    distribución masiva OTA /firmware.                  │    Edge Functions (Deno).      │
│    ➜ Ver: [Web/README.md](Web/README.md)               │    ➜ Ver: [supabase/README.md](supabase/README.md) │
├────────────────────────────────────────────────────────┼────────────────────────────────┤
│ 📊 Planilla Financiera Maestra (Excel)                 │ 📑 Estudio de Viabilidad y GTM │
│    Generada por finanzas/modelo.py: 180 meses, tres    │    Estudio formal y guion de   │
│    escenarios, FCFF/FCFE y comparación de deuda.       │    defensa oral para comisión. │
│    ➜ Ver: [Flujo de caja.xlsx](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) │ ➜ Ver: [Comercialización](Comercializacion%20de%20Tecnologias/README.md) / [docs](docs/ESTUDIO_VIABILIDAD_TECNICA_ECONOMICA.md) │
└────────────────────────────────────────────────────────┴────────────────────────────────┘
```

---

## 📑 Tabla de Contenidos

1. [I. Resumen Ejecutivo del Proyecto](#i-resumen-ejecutivo-del-proyecto)
2. [II. Descripción de la Problemática Agronómica y Económica](#ii-descripción-de-la-problemática-agronómica-y-económica)
   - [2.1. El Contexto Macro: Megasequía y Suelo Degradado](#21-el-contexto-macro-megasequía-y-suelo-degradado)
   - [2.2. El Micro-Problema: La Decisión de las 7:00 AM](#22-el-micro-problema-la-decisión-de-las-700-am)
   - [2.3. Por qué el Laboratorio Químico No Resuelve el Día a Día](#23-por-qué-el-laboratorio-químico-no-resuelve-el-día-a-día)
   - [2.4. Cuantificación Económica del Error Agronómico](#24-cuantificación-económica-del-error-agronómico)
   - [2.5. Universo Censal Verificado (Censo 2021)](#25-universo-censal-verificado-censo-2021)
3. [III. Propuesta de Solución y Filosofía de Producto](#iii-propuesta-de-solución-y-filosofía-de-producto)
   - [3.1. Arquitectura de Cuatro Capas de Inferencia](#31-arquitectura-de-cuatro-capas-de-inferencia)
   - [3.2. Qué NO es este Proyecto (Límites Declarados)](#32-qué-no-es-este-proyecto-límites-declarados)
4. [IV. Estudio de Mercado y Factibilidad Comercial](#iv-estudio-de-mercado-y-factibilidad-comercial)
   - [4.1. Dimensionamiento de Mercado: TAM, SAM y SOM](#41-dimensionamiento-de-mercado-tam-sam-y-som)
   - [4.2. Benchmarking y Análisis Competitivo](#42-benchmarking-y-análisis-competitivo)
   - [4.3. Estrategia Comercial Go-To-Market (Año 1)](#43-estrategia-comercial-go-to-market-año-1)
   - [4.4. Escalamiento Comercial y Agencia de Marketing (Años 2 a 5)](#44-escalamiento-comercial-y-agencia-de-marketing-años-2-a-5)
5. [V. Estudio Económico y Evaluación Financiera Integral](#v-estudio-económico-y-evaluación-financiera-integral)
   - [5.1. Costo unitario y margen de contribución](#51-costo-unitario-y-margen-de-contribución)
   - [5.2. Precio propuesto ($349.990) y por qué es una hipótesis](#52-precio-propuesto-349990-y-por-qué-es-una-hipótesis)
   - [5.3. Desembolso inicial, reserva y financiamiento propuesto](#53-desembolso-inicial-reserva-y-financiamiento-propuesto)
   - [5.4. Gastos fijos y contratación por capacidad](#54-gastos-fijos-y-contratación-por-capacidad)
   - [5.5. Contabilidad externa desde el mes 1](#55-contabilidad-externa-desde-el-mes-1)
   - [5.6. Equilibrio operativo y con deuda](#56-equilibrio-operativo-y-con-deuda)
   - [5.7. Resultados anuales del modelo](#57-resultados-anuales-del-modelo)
   - [5.8. Evaluación: VAN, DSCR y escenarios](#58-evaluación-van-dscr-y-escenarios)
   - [5.9. Qué falta para defender estas cifras](#59-qué-falta-para-defender-estas-cifras)
6. [VI. Resumen de Módulos del Ecosistema Tecnológico](#vi-resumen-de-módulos-del-ecosistema-tecnológico)
   - [6.1. Hardware Embarcado y Sensor Portátil (PCB)](#61-hardware-embarcado-y-sensor-portátil-pcb)
   - [6.2. Aplicación Móvil de Campo (App)](#62-aplicación-móvil-de-campo-app)
   - [6.3. Consola Web de Soporte y Actualización (Web)](#63-consola-web-de-soporte-y-actualización-web)
   - [6.4. Backend y Seguridad de Datos (Supabase)](#64-backend-y-seguridad-de-datos-supabase)
7. [VII. Condiciones Técnicas, Normativas y Metrología](#vii-condiciones-técnicas-normativas-y-metrología)
8. [VIII. Puesta en Marcha y Ejecución Local](#viii-puesta-en-marcha-y-ejecución-local)
9. [IX. Conclusiones y Defensa del Proyecto](#ix-conclusiones-y-defensa-del-proyecto)
10. [X. Referencias Bibliográficas](#x-referencias-bibliográficas)

---

# I. Resumen Ejecutivo del Proyecto

**TerraSense** es un prototipo de instrumento agronómico portátil de diagnóstico edafológico prescriptivo. Integra un chasis de mano con una sonda industrial 7-en-1 de inserción directa (humedad volumétrica, temperatura de suelo, conductividad eléctrica, pH y tres registros asociados a N, P y K), un microcontrolador ESP32-WROOM-32 y una aplicación móvil que procesa localmente un motor de inferencia agronómica de cuatro capas. **Los registros N/P/K derivan de conductividad eléctrica: no son análisis químicos y la app no los presenta como cifras interpretables.** La versión actual **no incorpora un sensor ambiental BME280**; las variables de ambiente provienen de un servicio meteorológico por internet.

El sistema se diseñó bajo una premisa central: **el agricultor no necesita números crudos; necesita prescripciones inmediatas y comprensibles**. La aplicación entrega un semáforo 3×3 de variables, un diagnóstico contextualizado y recomendaciones de labor según la etapa fenológica del cultivo (pre-siembra, vegetativo, floración o cosecha). El motor de inferencia opera sin conexión; el dato meteorológico sí requiere red. **El tiempo de respuesta extremo a extremo no está medido**: no se publica una cifra hasta contar con percentiles reales.

El modelo de negocio es **privado, sin subsidios estatales**, y se sostiene sobre un precio de lista **hipotético** de $349.990 CLP con IVA ($294.109 neto). El costo de materiales presupuestado es de **$75.243 netos por equipo**, con SKU, impuestos y plazos de entrega todavía por cotizar: no es un costo puesto en taller verificado. El equilibrio del año 1 se alcanza en **170 unidades** de operación y **195** incluyendo servicio de deuda, frente a una meta de 200 unidades que es un objetivo comercial, **no demanda observada ni pedidos firmados**.

Con un aporte de socios de **$9.000.000** y un crédito dimensionado en **$27.700.000 a 10 años** (12 % efectivo anual supuesto, sin oferta bancaria), el modelo mensual arroja un **VAN de proyecto a 5 años de +$21.874.878** al 20 % y un **DSCR de 1,04 en el año 1**, por debajo del criterio interno de 1,3 veces. En el escenario de estrés (−35 % de ventas sin recortar marketing) el VAN es **−$47.949.651** y la caja libre mínima cae a **−$19.803.623**. La rentabilidad **no está probada**: depende de cotizaciones, validación técnica y ventas piloto pendientes.

No se publican TIR, Pay Back ni «retorno por socio». La remuneración de los socios es costo laboral de la empresa, nunca retorno del capital, y no existe una política de dividendos definida que permita calcular un rendimiento patrimonial. Todas las cifras económicas de este README provienen de [`docs/RESULTADOS_FINANCIEROS.md`](docs/RESULTADOS_FINANCIEROS.md), generado con `python finanzas/modelo.py` desde [`finanzas/supuestos.json`](finanzas/supuestos.json).

---

# II. Descripción de la Problemática Agronómica y Económica

## 2.1. El Contexto Macro: Megasequía y Suelo Degradado
El suelo agrícola es el activo productivo más valioso de una explotación, pero en la inmensa mayoría de los predios pequeños y medianos **nunca se mide físicamente**.

Chile atraviesa la sequía más prolongada de su historia documentada: desde 2010, la zona central (Coquimbo a La Araucanía) acumula un **déficit de precipitaciones del ~30 % ininterrumpido** <sup>[4]</sup>. Esto genera dos impactos críticos en el agro:
1. **Salinización progresiva de suelos:** La menor lluvia reduce el lavado natural de sales, y el riego con aguas subterráneas o de pozo concentra sales en la zona radicular activa. La conductividad eléctrica deja de ser un valor teórico y se convierte en el principal factor limitante del cultivo.
2. **Desacople térmico y fenológico:** Las fechas tradicionales de siembra ("a mediados de septiembre") ya no coinciden con la temperatura real del suelo a 15 cm de profundidad. Sembrar en suelo frío pudre la semilla antes de germinar.

## 2.2. El Micro-Problema: La Decisión de las 7:00 AM
Cada mañana, el agricultor se enfrenta al potrero con la inversión de su temporada comprometida:
* *¿Riego hoy o el suelo todavía retiene humedad en profundidad?* (Regar de más lava nutrientes y gasta energía de bombeo; regar de menos provoca estrés hídrico irreversible).
* *¿Aplico fertilizante hoy?* (Si el pH del suelo está fuera de rango, entre 5,5 y 7,0, los nutrientes quedan bloqueados químicamente: el agricultor gasta dinero en fertilizante que la planta no puede absorber).
* *¿El agua de riego está acumulando sales en la raíz?*

## 2.3. Por qué el Laboratorio Químico No Resuelve el Día a Día
El análisis químico de laboratorio acreditado es la referencia de oro analítica, pero posee barreras insalvables para el manejo diario de campo:
* **Costo por muestra:** del orden de $35.000 a $60.000 CLP por análisis, según laboratorio y determinaciones solicitadas. Un muestreo compuesto bien diseñado no equivale a un análisis por punto: la cantidad de informes depende del objetivo y de las unidades homogéneas de muestreo, no del número de lecturas.
* **Tiempo de espera:** los plazos varían por laboratorio y temporada. **No es correcto afirmar que todo laboratorio demora 15 a 30 días hábiles**; el plazo debe consultarse al proveedor concreto.
* **Brecha de interpretación:** un informe con valores técnicos (meq/100 g, ppm, dS/m) requiere interpretación agronómica. Cabe señalar que [INIA documenta servicios de laboratorio que sí entregan recomendación](https://www.inia.cl/laboratorios/), de modo que la brecha depende del servicio contratado.

> **Tesis del proyecto:** TerraSense **no reemplaza al laboratorio químico** y su lectura no es un análisis evitado. Busca convertir mediciones frecuentes de terreno en decisiones de manejo, **sin cobro por lectura** — que no es lo mismo que costo cero: el uso implica tiempo de muestreo, limpieza, calibración, energía, mantenimiento y desgaste. La frecuencia recomendable de análisis de laboratorio depende del cultivo y la intensidad de manejo; no se fija aquí un intervalo universal.

## 2.4. Cuantificación Económica del Error Agronómico
Tomar decisiones a ciegas genera pérdidas masivas en la pequeña y mediana agricultura:
Los mecanismos de pérdida están descritos en la literatura agronómica: sembrar en suelo frío compromete la emergencia, un pH fuera de rango reduce la disponibilidad de fósforo y la salinidad no detectada afecta el rendimiento de especies sensibles.

**Las magnitudes concretas no se publican como beneficio del producto.** Rangos como «30–50 % de emergencia», «60 % del fósforo» o «$350.000–$700.000 por hectárea» requieren cultivo, dosis, suelo, temporada, fuente y cálculo identificados; sin eso describen un daño potencial genérico, no un ahorro atribuible a TerraSense. Cuantificarlos es parte del [plan de validación](docs/PLAN_VALIDACION.md), no un resultado disponible hoy.

## 2.5. Universo Censal Verificado (Censo 2021)
Según el VIII Censo Agropecuario y Forestal (INE 2021) <sup>[1]</sup>:
* **Unidades Productivas Agropecuarias (UPA):** 138.628 unidades comerciales.
* **Unidades de Autoconsumo (UAC):** 36.928 unidades (< 2 ha).
* **Total Nacional Censado:** **175.556 explotaciones**, sobre una superficie censada de **45.742.565 ha de UPA y 31.854 ha de UAC** según el cuadro nacional consultado. Cualquier cifra de superficie debe citarse identificando universo y tabla.
* **Acceso a internet en hogares rurales (SUBTEL):** el porcentaje citado se refiere a **acceso declarado en hogares**, no a cobertura móvil efectiva en potrero ni a posesión individual de un smartphone compatible con BLE. Debe identificarse la edición y tabla de la encuesta antes de usarlo como respaldo comercial.

---

# III. Propuesta de Solución y Filosofía de Producto

TerraSense traslada la inteligencia al teléfono del agricultor:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                       FLUJO DE ADQUISICIÓN Y DECISIÓN                       │
 └─────────────────────────────────────────────────────────────────────────────┘

  [ Sonda Portátil de Mano ] ──(BLE GATT 4.2)──► [ Smartphone (App Offline) ]
    • 7 Variables de Suelo (Modbus 5V)             • Motor Inferencia 4 Capas
    • Ambiente: servicio meteorológico              • Clima: requiere red (sin caché)
      por internet, NO sensor a bordo               • Prescripción cualitativa
    • Tiempo de muestreo sin medir                  • Sin dosis kg/ha ni costos
                                                           │
                                                           ▼ (Sincronización cuando hay red)
                                                 [ Nube Supabase + Backoffice Web ]
```

## 3.1. Arquitectura de Cuatro Capas de Inferencia
La aplicación ejecuta un algoritmo determinista calibrado para cultivos chilenos:
1. **Capa 1 (Veredicto físico 3×3):** Compara las variables de suelo y el dato meteorológico contra umbrales agronómicos clasificados en semáforo: Verde (óptimo), Amarillo (precaución) y Rojo (crítico). La grilla es de 3×3 celdas, pero **no representa nueve mediciones físicas del instrumento**.
2. **Capa 2 (Salvaguarda por salinidad sobre N/P/K):** Con conductividad eléctrica alta y al menos un registro de N, P o K elevado, el motor marca la lectura como de baja confianza y la excluye del veredicto. **La app no muestra N/P/K como cifras interpretables en ningún caso**, porque una lectura de conductividad no identifica concentraciones independientes de nitrógeno, fósforo y potasio. La salvaguarda es parcial, no una validación analítica.
3. **Capa 3 (Contextualización Fenológica):** Adapta los requerimientos según la fase elegida por el usuario: Pre-siembra (Siembra), Vegetativo, Floración o Cosecha.
4. **Capa 4 (Prescripción y clima):** Cruza el estado del suelo con el dato meteorológico disponible y emite acciones agronómicas cualitativas. **Estado real: la consulta meteorológica pide 2 días de pronóstico, requiere red y no tiene caché; devuelve nulo si falla.** El motor **no entrega dosis de cal en kg/ha ni costos por hectárea**: calcular una dosis de enmienda exige capacidad tampón, acidez de reserva, profundidad efectiva y poder neutralizante del material, que este instrumento no determina.

## 3.2. Qué NO es este Proyecto (Límites Declarados)
* **No es un laboratorio acreditado:** No reemplaza la cromatografía ni análisis de micronutrientes para certificación de exportación.
* **No es un diagnóstico foliar:** Detecta condiciones de suelo y microclima; no plagas de follaje ni virus.
* **No es un SaaS con suscripción:** El cliente compra el hardware una vez. La app es gratuita, sin pagos mensuales ni bloqueo de funciones. Los servicios de nube tienen costo para la empresa y **no se promete gratuidad perpetua**: debe definirse duración contractual, exportación de datos y funcionamiento local.
* **No es un medidor de NPK:** Los tres registros asociados a nitrógeno, fósforo y potasio se derivan de conductividad eléctrica y **no equivalen a un análisis químico**. Ninguna decisión de fertilización debe tomarse a partir de ellos.
* **No es un producto certificado:** IP67, autonomía, peso, cumplimiento SEC/SUBTEL y precisión metrológica son **objetivos de diseño sin ensayo**, no prestaciones verificadas.

---

# IV. Estudio de Mercado y Factibilidad Comercial

## 4.1. Dimensionamiento de Mercado: TAM, SAM y SOM
* **TAM (Mercado Total Direccionable):** **175.556 explotaciones** agrícolas en Chile (universo censal INE 2021).
* **SAM (Mercado Servible Disponible):** **~120.000 explotaciones** — **supuesto sin tabla de respaldo**. No existe todavía un cálculo que aplique región, superficie 0,5–20 ha, rubro, tecnología y disposición a pagar. Además, una explotación no equivale necesariamente a un cliente ni a un equipo.
* **SOM Año 1 (meta comercial):** **200 unidades**. Los porcentajes sobre el SAM son aritmética correcta sobre un supuesto no validado. La distribución mensual del modelo está concentrada en el segundo semestre y es **estacionalidad hipotética**, no histórico ni pedidos firmados.
* **SOM acumulado a 5 años:** **2.550 unidades** (200 + 350 + 500 + 650 + 850). Son **metas de trabajo**, no demanda validada; el escenario de estrés del modelo evalúa un 35 % menos.

## 4.2. Benchmarking y Análisis Competitivo

Precios exhibidos consultados el **04-09-2026**; falta confirmar despacho, factura, vigencia y condiciones al cotizar. **Comparar cantidad de variables sin método ni exactitud declarada no es una comparación válida**, y una sonda de solución nutritiva no es equivalente a un instrumento de inserción en suelo.

| Equipo / Solución | Precio exhibido CLP | Alcance real y limitación de la comparación |
| :--- | ---:| :--- |
| [**Hanna HI9814 GroLine**](https://hannachile.com/producto/medidor-portatil-e-impermeable-de-ph-ce-tds-temperatura-groline-hidroponia-hi9814/) | $491.827 | pH/CE/TDS/temperatura para **soluciones hidropónicas y sustratos preparados**; no mide humedad de suelo. TDS no es un sensor independiente de CE. |
| [**Bluelab Pulse Meter**](https://delaferia.cl/products/pulse-meter-bluelab-temperatura-humedad-y-ec) | $538.990 | Humedad, CE y temperatura **con Bluetooth, app, historial y uso sin internet tras el acceso inicial**. Referencia funcional más cercana; esas funciones no son diferenciadores exclusivos de TerraSense. |
| [**FieldScout TDR 350**](https://sandbox.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter) | No cotizado localmente | Humedad, CE y temperatura, **con registro de datos, GPS y Bluetooth**. |
| **Análisis de Laboratorio** | ~$35.000–$60.000/muestra | Referencia analítica. **No es sustituible por TerraSense**; algunos laboratorios entregan recomendación agronómica incluida. |
| **TerraSense (propuesta)** | **$349.990 CLP** | Aprox. **29 % bajo Hanna** y **35 % bajo Pulse**. Producto en validación: **no hay equivalencia demostrada de precisión, garantía técnica ni madurez**. |

El precio propuesto **no se deduce de un «techo competitivo»**: la disposición a pagar depende también de evidencia de precisión, confiabilidad y servicio, que aún no existe. La [documentación de Bluelab](https://support.bluelab.com/bluelab-pulse-meter-faq) distingue explícitamente el seguimiento por conductividad del análisis de nutrientes individuales.

## 4.3. Estrategia Comercial Go-To-Market (Año 1)
En el primer año, la venta es directa y digital, autogestionada por los socios fundadores con un presupuesto de marketing de **$6.000.000 CLP anuales** ($30.000 por venta objetivo). El embudo de ejemplo a validar — 60 % de ventas atribuibles a anuncios, CAC publicitario de $50.000, cierre de 5 % sobre contactos calificados — **son objetivos, no conversiones observadas**:
1. **Tienda E-Commerce Shopify:** Plataforma formal con emisión de **Factura Electrónica con IVA** y despachos trazables. El modelo presupuesta un **5 % del precio bruto** como costo comercial agregado, que incluye el riesgo de la tarifa adicional por pagos externos de [Shopify Basic](https://www.shopify.com/cl/precios). **No es una tarifa verificada de una pasarela** y el modelo actual **no contempla ventas en cuotas ni a crédito**: incorporarlas exige un escenario nuevo.
2. **Pauta Digital Directa (Meta & Google Ads):** Anuncios en video mostrando el uso real del sensor portátil de mano insertándose en potreros con barro y el resultado instantáneo en la app, más campañas de búsqueda en Google para términos de alta intención (*"sensor ph suelo chile"*, *"medidor humedad agrícola"*).
3. **Embudo Click-to-WhatsApp:** Cada anuncio dirige a WhatsApp Business, donde los socios fundadores resuelven dudas agronómicas y cierran la venta en forma personalizada.
4. **Público Objetivo (Recambio Generacional):** La pauta se segmenta quirúrgicamente hacia los hijos y administradores jóvenes de predios agrícolas (28 a 45 años) y agrónomos asesores independientes que gestionan múltiples campos.

## 4.4. Escalamiento Comercial y Agencia de Marketing (Años 2 a 5)
A partir del Año 2, la empresa terceriza su comercialización en una **agencia de marketing digital externa**:
* **Presupuesto de agencia:** $250.000/mes de gestión **aparte de la pauta**, y solo desde un objetivo de 650 ventas anuales (año 4 en el escenario base). Es una opción de organización, no una obligación; debe compararse con una persona interna y honorarios reales.
* **Pauta publicitaria:** escala con la meta de ventas a $30.000 por venta objetivo. Subir el presupuesto **solo después** de medir CAC por cohorte, conversión, devoluciones, margen después de soporte y capacidad de entrega. Pagar más no garantiza vender más.
* **Canales B2B e institucionales:** la apertura de canal INDAP/PRODESAL y los convenios de distribución están **fuera del modelo actual**, que no incluye descuentos de distribuidor ni ventas a crédito. Cualquiera de esas vías requiere un escenario financiero propio, no el margen de la venta directa.

---

# V. Estudio Económico y Evaluación Financiera Integral

## 5.1. Costo unitario y margen de contribución

> **Todos los valores de esta sección se generan con `python finanzas/modelo.py` desde [`finanzas/supuestos.json`](finanzas/supuestos.json).** No editar a mano. La versión vigente completa está en [`docs/RESULTADOS_FINANCIEROS.md`](docs/RESULTADOS_FINANCIEROS.md) y los supuestos y sus límites en [`docs/MODELO_ECONOMICO.md`](docs/MODELO_ECONOMICO.md).

El BOM vigente es **provisional**: valores netos presupuestados, **sin SKU cotizado, sin impuestos confirmados y sin plazos de entrega**. La lista completa con la evidencia pendiente de cada línea está en [`PCB/BOM_TerraSense.xlsx`](PCB/BOM_TerraSense.xlsx).

| Concepto | Monto neto CLP | Nota |
| :--- | ---:| :--- |
| Sonda RS-485 7-en-1 | $48.000 | SKU y voltaje **por cotizar**; es el 64 % del BOM |
| Placa de desarrollo ESP32-WROOM-32 | $6.723 | Referencia AFEL $8.000 con IVA; el USB-UART va incluido en el devkit |
| PCB combinada USB-C carga + boost | $900 | Precio confirmado por los socios; sin crédito de IVA hasta tener factura |
| LiPo 2.000 mAh protegida | $4.500 | Presupuesto; falta cotizar dimensiones, descarga y protección |
| SP3485, JST 3 pines, pulsador, LED, pasivos | $2.770 | Presupuesto; revisar esquema y protección ESD |
| PCB portadora y montaje externo SMD | $2.500 | Servicio externo; **no** incluye ensamblaje final |
| Carcasa, sellado, cableado, embalaje | $7.200 | Prototipo; **no acredita IP67** |
| Flete de insumos y contingencia de importación | $2.500 | Reserva de costo neto adicional |
| **TOTAL BOM NETO PROVISIONAL** | **$75.243** | |

Sobre ese BOM, el costo variable del año 1 agrega merma (3 % del BOM), garantía y reposiciones (5 %), envío neto de $6.000 y una comisión comercial presupuestada de 5 % sobre el precio bruto — **$29.519 por unidad**. **No se agrega mano de obra directa como costo variable**: el ensamblaje final ya está pagado dentro de la nómina, y cargarlo dos veces inflaría el costo unitario.

| Economía unitaria, año 1 | Monto CLP |
| :--- | ---:|
| Precio neto de venta | $294.109 |
| (−) Costo de materiales (BOM) | −$75.243 |
| (−) Costos variables (merma, garantía, envío, comisión) | −$29.519 |
| **(=) Margen de contribución unitario** | **$189.347** |
| **Margen sobre venta neta** | **64,4 %** |

## 5.2. Precio propuesto ($349.990) y por qué es una hipótesis

El precio de lista propuesto es **$349.990 CLP con IVA** ($294.109 neto). Es una **hipótesis comercial defendible por costos y por las referencias de competencia**, no un precio correcto demostrado. Debe validarse con pilotos pagados antes de comprar volumen.

La hoja `Sensibilidades` del Excel evalúa qué ocurre a precios menores, y también con ventas 35 % más bajas o una tasa de crédito del 18 %. Con remuneraciones, comercialización y soporte completos, bajar el precio comprime rápidamente la cobertura de deuda del primer año.

No deben ofrecerse descuentos permanentes, cuotas subsidiadas ni distribución mayorista financiados con el margen de la venta directa: ninguna de esas modalidades está en el modelo.

## 5.3. Desembolso inicial, reserva y financiamiento propuesto

| Concepto | Monto CLP |
| :--- | ---:|
| Activos, desarrollo/validación y formalización (con IVA prudencial) | $10.353.100 |
| Inventario inicial (con IVA prudencial) | $895.288 |
| **Desembolso inicial total** | **$11.248.388** |
| Aporte de los socios ($4.500.000 cada uno) | $9.000.000 |
| Crédito dimensionado (10 años, 12 % e.a. **supuesto**) | $27.700.000 |
| Gastos de apertura presupuestados (2 % del crédito) | $554.000 |
| **Caja inicial (incluye la reserva; no sumarla otra vez)** | **$24.897.612** |

El crédito **no se dimensiona por capricho**: el modelo busca el mínimo, en tramos de $100.000, que mantiene la reserva objetivo durante los primeros 24 meses del escenario base. La **reserva objetivo** son 3 meses de gastos fijos (marketing incluido) más la cuota, más un 10 % del desembolso inicial. **La reserva está dentro de la caja**: no es un gasto adicional ni se suma dos veces a la inversión.

> **Advertencia sobre el financiamiento.** El 12 % efectivo anual y el 2 % de gastos de apertura son **presupuestos, no un CAE ni una tasa bancaria observada**. La [ficha de FOGAPE para pequeña empresa de BancoEstado](https://nwm.bancoestado.cl/content/bancoestado-public/cl/es/home/inicio---bancoestado-pequena-empresa/productos/garantias-estatales---bancoestado-pequenas-empresa/fogape-para-el-pequeno-empresario---bancoestado-pequenas-empresa.html) menciona plazos de hasta diez años **sujetos a evaluación**; FOGAPE es una garantía, **no un subsidio ni una condonación**, y una ficha general no prueba el acceso de una empresa sin ventas. Si el banco no ofrece el plazo o exige garantías inaceptables, corresponde reducir el lanzamiento y validar preventas, **no** sustituirlo por un crédito personal.

El modelo compara el **mismo principal a 5, 10 y 15 años**, mostrando toda la amortización y no solo cinco años con la deuda restante oculta:

| Crédito (mismo principal) | Cuota mensual | Intereses totales | Saldo al año 5 | Mínimo sobre reserva, 24 meses |
| :--- | ---:| ---:| ---:| ---:|
| 5 años | $607.619 | $8.757.127 | $0 | **−$4.525.964** |
| **10 años (propuesto)** | **$387.654** | **$18.818.441** | **$17.672.276** | **$45.210** |
| 15 años | $321.593 | $30.186.829 | $22.979.635 | $1.366.413 |

Un esquema de **dos créditos** —resto a 5 años más $5 millones al 15 % pagados íntegros en el mes 12— exigiría **$11.725.284 de servicio de deuda el primer año** y dejaría la caja **$7.910.523 bajo la reserva**: queda descartado. Quince años ahorra poco al mes y encarece mucho los intereses para un producto tecnológico no validado.

## 5.4. Gastos fijos y contratación por capacidad

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 |
| :--- | ---:| ---:| ---:| ---:| ---:|
| Nómina (socios + técnicos + soporte, carga incluida) | $19.440.000 | $28.783.350 | $41.247.792 | $60.187.403 | $82.049.592 |
| Contabilidad externa | $1.440.000 | $1.606.800 | $1.782.312 | $2.098.036 | $2.431.099 |
| Servicios digitales (tienda, backend, mapas, clima) | $1.920.000 | $2.317.500 | $2.928.084 | $3.769.908 | $4.895.963 |
| Agencia de marketing (solo desde 650 u/año) | $0 | $0 | $0 | $3.278.181 | $3.376.526 |
| Taller, servicios básicos, seguros y administración | $3.360.000 | $3.460.800 | $3.564.624 | $3.671.563 | $3.781.710 |
| Pauta de marketing ($30.000 por venta objetivo) | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 |
| **TOTAL GASTOS FIJOS** | **$32.160.000** | **$46.983.450** | **$65.436.312** | **$94.313.267** | **$125.235.365** |

**Remuneración de los socios:** base mensual bruta por socio en moneda del año inicial de $600.000, $700.000, $850.000, $1.000.000 y $1.200.000, más reajuste anual del 3 %. **No son sueldos líquidos y no son retorno del capital.** La condición laboral y tributaria de socios con control de la empresa debe revisarla el contador: no se presume aquí un contrato subordinado válido solo para obtener deducciones.

**Sobrecosto laboral del 35 %** sobre sueldos, para gratificación, cargas patronales y otros costos. **No es una tasa legal única ni una liquidación salarial.** Debe revisarse contratos, jornada, mutual, AFC, vacaciones y reemplazos, y someterse también a un estrés de 45 %. El [ingreso mínimo](https://www.dt.gob.cl/portal/1626/w3-article-60141.html) y la [gratificación legal](https://dt.gob.cl/legislacion/1624/w3-article-106600.html) aplicables a 2027 y años siguientes deben actualizarse, no inferirse del valor de 2026.

**Contratación por capacidad**, en escalones de 0,5 FTE (equivalente de jornada presupuestado, **no número de contratos**), sobre 1.400 horas productivas por FTE al año:

| Año | 2027 | 2028 | 2029 | 2030 | 2031 |
| :--- | :---:| :---:| :---:| :---:| :---:|
| Técnicos FTE (2,25 h/equipo, socios aportan 500 h) | 0 | 0,5 | 0,5 | 1,0 | 1,5 |
| Soporte/comercial FTE (2 h/venta + 0,5 h/equipo activo, socios aportan 900 h) | 0 | 0 | 0,5 | 1,0 | 1,5 |

Los tiempos de ensamblaje, prueba y retrabajo son **presupuestos por recalcular con datos reales**. Si el soporte o el CAC consumen más horas, hay que adelantar la contratación.

## 5.5. Contabilidad externa desde el mes 1

El modelo presupuesta **contador externo desde el mes 1** — incluso antes, para la apertura, el régimen tributario y el diseño de remuneraciones — a **$120.000/mes** de base más $20.000 por cada FTE contratado, reajustado.

**No existe ninguna regla que obligue a contratar un contador interno en un año determinado.** Lo que existe son obligaciones tributarias desde el inicio y una necesidad operativa de asesoría. Hay [ofertas públicas de servicios contables externos](https://www.contadoresdigitales.cl/planes-contables/), pero no todos los planes incluyen inventario, nómina y renta anual: hay que solicitar una propuesta completa antes de fijar el monto.

## 5.6. Equilibrio operativo y con deuda

| Año | Equilibrio operativo | Equilibrio con servicio de deuda | Meta de ventas |
| :--- | ---:| ---:| ---:|
| 2027 | 170 u | 195 u | 200 u |
| 2028 | 241 u | 265 u | 350 u |
| 2029 | 326 u | 349 u | 500 u |
| 2030 | 456 u | 478 u | 650 u |
| 2031 | 588 u | 610 u | 850 u |

El equilibrio con deuda incluye capital e intereses, pero **no impuesto ni acumulación de inventario**. Por eso no es la prueba de solvencia: **la prueba real es la caja mensual y el DSCR**. En 2027 el margen sobre el equilibrio con deuda es de apenas 5 unidades.

## 5.7. Resultados anuales del modelo

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR |
| :--- | ---:| ---:| ---:| ---:| ---:| ---:|
| 2027 | 200 | $5.709.528 | $4.651.844 | $25.061.618 | $10.327.800 | **1,04** |
| 2028 | 350 | $21.324.647 | $4.651.844 | $39.526.551 | $14.033.662 | 4,11 |
| 2029 | 500 | $35.078.302 | $4.651.844 | $61.191.779 | $18.646.878 | 5,66 |
| 2030 | 650 | $40.278.414 | $4.651.844 | $85.276.292 | $25.866.117 | 6,18 |
| 2031 | 850 | $56.043.380 | $4.651.844 | $123.092.636 | $33.596.641 | 9,13 |

**Impuestos:** aproximación de caja Pro Pyme con pérdidas arrastradas y reserva anual al cierre — **no es un calendario F29 ni un pago legal en diciembre**. Las tasas de referencia son 12,5 % (2027), 15 % (2028) y 25 % en adelante según el régimen y condiciones de la [Circular SII 53/2025](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf); hay que comprobar que la empresa califica. Antes de operar deben incorporarse PPM mensuales, declaración de abril e IVA efectivo con el contador.

**IVA:** las ventas se registran netas, el débito se inmoviliza en el mes de venta y el crédito de compras documentadas queda disponible desde el mes siguiente. No se usa recuperación inicial de activos, desarrollo ni servicios: es un tratamiento **prudente**, no una declaración exacta.

## 5.8. Evaluación: VAN, DSCR y escenarios

Las dos perspectivas se mantienen separadas y no se mezclan para calcular el VAN:

* **FCFF (proyecto):** caja operativa después de impuestos calculados **sin** deducir intereses, menos reinversión, inventario e IVA.
* **FCFE (accionista):** caja después de intereses, capital e impuesto con financiamiento. **No se distribuye automáticamente**: es generación de caja, no un depósito al socio.

| Escenario | Ventas año 1 | Mínimo de caja libre a 24 meses | VAN del proyecto, 5 años al 20 % |
| :--- | ---:| ---:| ---:|
| **Base** | 200 | $45.210 | **+$21.874.878** |
| **Estrés** (−35 % ventas, mismo marketing) | 130 | **−$19.803.623** | **−$47.949.651** |
| **Crecimiento** (+50 % ventas y adquisición) | 300 | $824.154 | +$87.302.635 |

El VAN se calcula con flujos mensuales, **sin valor de rescate, sin recuperación de reserva o inventario y sin valor terminal**; la reserva inicial se trata como capital comprometido y los gastos de apertura pertenecen al financiamiento, no al FCFF.

**No se publica TIR, Pay Back ni «ganancia neta por socio».** Sumar el sueldo bruto del socio al retorno del capital produce una cifra sin significado financiero: la remuneración es costo laboral de la empresa. Los dividendos y prepagos deben decidirse anualmente con información real y con la reserva cubierta antes de estimar cualquier rendimiento patrimonial.

**Lectura honesta del resultado:** el escenario base crea valor, pero el primer año tiene **cobertura de deuda estrecha (DSCR 1,04, bajo el criterio interno de 1,3)** y el escenario de estrés destruye valor y deja la caja bajo la reserva. Los años 6 a 15 del Excel son una **extensión mecánica** para mostrar toda la amortización de la deuda: no son evidencia de demanda, supervivencia ni rentabilidad futura.

## 5.9. Qué falta para defender estas cifras

1. **BOM cotizado** con SKU, cantidades, precio neto y bruto, moneda, fecha, vigencia y costo puesto en taller.
2. **Ensayos** de terreno y laboratorio: incertidumbre por variable, sesgos, repetibilidad, comportamiento con salinidad y humedad, calibración y límites de interpretación.
3. **Embudo comercial observado y ventas piloto pagadas**: precio efectivamente pagado, CAC, devoluciones y horas de soporte reales.
4. **Oferta bancaria efectiva** en CLP a tasa fija, con todos los cargos, garantías exigidas, gracia y comisión de prepago.
5. **Revisión contable independiente** del régimen, remuneraciones de socios, PPM, IVA efectivo y deducibilidad.
6. **Obligaciones revisadas** ante SUBTEL, normativa de baterías, protección al consumidor y datos personales.

Si las ventas del escenario de estrés se materializan, corresponde **redimensionar el negocio**, no tapar una pérdida recurrente con un plazo de quince años.

---

# VI. Resumen de Módulos del Ecosistema Tecnológico

Para mantener la documentación limpia y modular, el detalle de ingeniería profunda se gestiona en sus carpetas dedicadas:

### 6.1. Hardware Embarcado y Sensor Portátil (PCB)
* **Contenido:** Esquemático KiCad, pinout del ESP32-WROOM-32, PCB combinada de carga y elevación por USB-C, batería de litio de 2.000 mAh, transceptor SP3485 y trama binaria BLE GATT de 16 bytes.
* **Estado real:** el archivo `PCB/terrasense.kicad_pcb` **no contiene componentes, pistas ni contorno** — no hay placa ruteada. El informe ERC registra errores sin cierre documentado y **no hay firmware fuente de ESP32 en el repositorio**. **El consumo en reposo no está medido**: cortar la rama de 5 V de la sonda no elimina el consumo del ESP32, reguladores, cargador, protección y divisores, y debe medirse desde la batería. **La autonomía tampoco está ensayada.** IP67, peso y grado de protección son objetivos sin ensayo. **No fabricar desde el archivo de PCB actual.**
* ➜ **Documentación completa:** [`PCB/README.md`](PCB/README.md)

### 6.2. Aplicación Móvil de Campo (App)
* **Contenido:** React Native 0.81, Expo 54, TypeScript y Zustand. Motor agronómico local, enlace BLE por GATT, recordatorio de limpieza de electrodos, flujo de 4 etapas fenológicas y carrusel de 3 páginas (grilla 3×3, diagnóstico contextualizado y mapa predial).
* **Estado real:** el motor de inferencia opera sin conexión; el **dato meteorológico requiere red y no tiene caché**. Las mediciones **sin GPS ahora se guardan** en el historial local y quedan excluidas del mapa. El círculo de 20 m del mapa es una **representación cartográfica**, no evidencia de homogeneidad de los 1.256,6 m² que abarca. La app **no muestra N/P/K como cifras interpretables** ni calcula dosis de cal en kg/ha.
* ➜ **Documentación completa:** [`App/README.md`](App/README.md)

### 6.3. Consola Web de Soporte y Actualización (Web)
* **Contenido:** SPA en React 19, Vite 6 y Tailwind CSS v4, como **backoffice técnico para el fabricante/administrador**: panel de soporte `/admin` con búsqueda multi-criterio, ficha de sonda, roles de miembros y factory reset remoto.
* **Estado real:** la vista `/firmware` es un **catálogo de solo lectura**. **No implementa carga de binarios, verificación SHA-256 ni publicación OTA masiva**, y una alerta push no demuestra instalación en el dispositivo. Falta distinguir catálogo, aviso, descarga, verificación e instalación comprobada; no existe un binario validado contra hardware.
* ➜ **Documentación completa:** [`Web/README.md`](Web/README.md)

### 6.4. Backend y Seguridad de Datos (Supabase)
* **Contenido:** PostgreSQL en São Paulo (Brasil) con PostGIS, autenticación, políticas de seguridad a nivel de fila (RLS), funciones RPC (`register_paired_device`, `claim_operator_membership`, `reset_device_to_factory`) y Edge Functions en Deno (`device-checkin`, `send-push-alert`).
* **Estado real:** las migraciones baseline son **marcadores que no reconstruyen el esquema original**; hacen falta una exportación de esquema versionada y una prueba de restauración antes de afirmar reproducibilidad. Existir un workflow de respaldo **no es lo mismo que haber probado una recuperación**. Las RPC con comprobaciones son una mejora real, pero **no justifican declarar el backend «100 % seguro» ni «100 % operativo»**.
* ➜ **Documentación completa:** [`supabase/README.md`](supabase/README.md)

---

# VII. Condiciones Técnicas, Normativas y Metrología

> **TerraSense no declara cumplimiento normativo demostrado.** Lo que sigue son *obligaciones identificadas y atributos de diseño*, no certificaciones obtenidas. Ninguna debe presentarse ante un cliente o una comisión como acreditada.

* **Seguridad eléctrica y baterías:** el carácter SELV (5 V DC) y una protección de celda son **atributos de diseño**, no demostración de exención SEC para cualquier configuración comercial ni de cumplimiento de IEC 62133-2. Debe definirse qué se entrega — cargador o adaptador incluidos — y respaldarse el expediente de batería, ensayos y transporte.
* **Telecomunicaciones y radiofrecuencia:** SUBTEL actualizó el procedimiento de equipos de alcance reducido con vigencia desde **febrero de 2026**; corresponde revisar la declaración e información exigibles al **producto terminado**. Una certificación FCC/CE del módulo **no acredita automáticamente** el cumplimiento local del equipo final. [SUBTEL: régimen vigente](https://www.subtel.gob.cl/equipos-de-alcance-reducido/).
* **Protección mecánica y ambiental:** **IP67 e IP68 son objetivos de diseño sin ensayo**. No hay actas de ensayo, pesaje del conjunto ni validación mecánica. Una junta o una resina no constituyen certificación.
* **Metrología y edafología:** debe identificarse la norma y el método efectivamente aplicables a cada variable, y no hay validación metrológica: faltan ensayos de incertidumbre, sesgo y repetibilidad. Conviene notar que [ISO 11272](https://www.iso.org/standard/68255.html?browse=tc) trata la **densidad aparente seca**, no la humedad volumétrica.
* **Datos personales:** la **Ley 21.719 entra en vigencia el 1 de diciembre de 2026**. Pedir GPS solo bajo demanda no produce cumplimiento automático: se requieren bases de tratamiento, derechos de los titulares, retención, seguridad y reglas de transferencia internacional. Alojar en Brasil por cercanía no resuelve esas obligaciones. [BCN: Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01).

➜ *Para el análisis normativo exhaustivo, consultar:* [`docs/MARCO_NORMATIVO_Y_ESTANDARES.md`](docs/MARCO_NORMATIVO_Y_ESTANDARES.md).

---

# VIII. Puesta en Marcha y Ejecución Local

### 1. Variables de Entorno
**No hay un único `.env` que sirva a los dos frontends.** La App carga el `.env` de la raíz; la consola Web usa Vite y requiere su propio archivo con el prefijo `VITE_` (ver [`Web/.env.example`](Web/.env.example)). Ambos están ignorados por Git.

```env
# .env en la raiz — consumido por App/
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

```env
# Web/.env — consumido por Web/ (Vite no lee el .env de la raiz)
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

### 2. Comandos de la Aplicación Móvil (`App/`)
```bash
cd App
npm install
npm test            # 25 pruebas unitarias (verificadas: 25/25 aprobadas)
npx tsc --noEmit    # Chequeo de tipos (verificado: aprobado)
npx expo start      # Servidor de desarrollo Expo
```

> **BLE requiere un build nativo.** `npm run android` ejecuta `expo start --android`: levanta el servidor y pide abrir Android, **no compila el módulo nativo BLE**. Para probar la sonda real hay que generar un *development build* o un build de release e instalarlo en el teléfono. La simulación de lecturas está restringida a desarrollo y el guardado en modo demo está bloqueado.

### 3. Comandos de la Consola Web (`Web/`)
```bash
cd Web
npm install
npm run dev         # Servidor de desarrollo Vite (http://localhost:5173)
npm run build       # Paquete de producción
npm run type-check  # Chequeo de tipos por proyecto (tsc -b)
```

> `type-check` usa `tsc -b` y no `tsc --noEmit`: el `tsconfig` raíz tiene `files: []` con referencias, de modo que el comando aislado no comprobaba los proyectos referenciados. La compilación de Web **no se verificó localmente** por dependencias ausentes en el entorno de revisión (`react-router-dom`, `framer-motion`, `lucide-react`); instalar dependencias antes de compilar.

---

# IX. Conclusiones y Defensa del Proyecto

1. **Trabajo de ingeniería real, factibilidad aún no comprobada.** Existe un motor agronómico determinista funcionando sin conexión, una app con 25 pruebas unitarias aprobadas y chequeo de tipos limpio, un backend con RLS y RPC, y una consola de soporte operativa. **No existe todavía** una PCB ruteada, firmware en el repositorio, un ensayo de autonomía, un cierre de ERC ni una medición de consumo desde batería. La factibilidad técnica es **plausible y parcialmente demostrada en software**, no comprobada en hardware.

2. **La propuesta de valor es la prescripción, y sus límites son parte de la propuesta.** TerraSense convierte lecturas de terreno en decisiones de manejo sin cobro por lectura. No compite en exactitud de laboratorio y **no lo reemplaza**: los registros N/P/K derivan de conductividad y no son análisis químicos, por lo que ninguna decisión de fertilización debe basarse en ellos. Mantener el análisis de laboratorio para decisiones de fertilización y encalado.

3. **Estructura financiera privada, con un supuesto crítico sin resolver.** El proyecto no depende de subsidios: se financia con un aporte de socios de **$9.000.000** y un crédito propuesto de **$27.700.000 a 10 años**. Ese crédito **no tiene oferta bancaria**; la tasa del 12 % efectivo anual es un presupuesto. Si el banco no ofrece el plazo o exige garantías inaceptables, el lanzamiento debe reducirse.

4. **El modelo crea valor en el caso base y lo destruye bajo estrés.** Al 20 % de descuento, el VAN del proyecto a 5 años es **+$21.874.878**, con un **DSCR de 1,04 en el año 1** — bajo el criterio interno de 1,3. En el escenario de estrés el VAN es **−$47.949.651**. **No se publica TIR, Pay Back ni retorno por socio**, porque sumar la remuneración del socio al retorno del capital produce una cifra sin significado financiero. La rentabilidad es una **hipótesis sometida a validación**, no un resultado probado.

5. **Lo que corresponde hacer antes de comprometer dinero** está listado en la sección 5.9 y detallado en el [plan de validación](docs/PLAN_VALIDACION.md): cotizar el BOM con SKU, ensayar el instrumento, vender pilotos pagados, obtener una oferta bancaria efectiva, revisar régimen tributario y remuneraciones, y cerrar las obligaciones de SUBTEL, baterías, consumidor y datos personales.

---

# X. Referencias Bibliográficas

- <sup>[1]</sup> **INE (2021):** *VIII Censo Nacional Agropecuario y Forestal*. Instituto Nacional de Estadísticas, Santiago, Chile.
- <sup>[2]</sup> **ODEPA (2022):** *Agricultura Chilena: Reflexiones a partir del Censo Agropecuario 2021*. Oficina de Estudios y Políticas Agrarias, Ministerio de Agricultura.
- <sup>[3]</sup> **INDAP (2021):** *Caracterización de la Agricultura Familiar Campesina e Indígena en Chile*. Instituto de Desarrollo Agropecuario.
- <sup>[4]</sup> **CR2 (2023):** *Informe a la Nación: La megasequía en Chile central*. Centro de Ciencia del Clima y la Resiliencia (CR2), Universidad de Chile.
- <sup>[5]</sup> **FAO (2020):** *State of the World's Land and Water Resources for Food and Agriculture (SOLAW)*. Organización de las Naciones Unidas para la Alimentación y la Agricultura.
- <sup>[6]</sup> **ODEPA (2024):** *Boletín de Precios de Insumos Agropecuarios*. Ministerio de Agricultura de Chile.
- <sup>[7]</sup> **INE (2024):** *Encuesta de Superficie Sembrada de Hortalizas*. Instituto Nacional de Estadísticas.
- <sup>[8]</sup> **SUBTEL (2024):** *X Encuesta de Acceso y Usos de Internet*. Subsecretaría de Telecomunicaciones de Chile.
- <sup>[9]</sup> **Espressif Systems (2023):** *ESP32-WROOM-32E Datasheet v1.7*.
- <sup>[10]</sup> **MaxLinear (2020):** *SP3485 3.3V Low Power RS-485 Transceiver Datasheet*.
- <sup>[14]</sup> **INIA (2018):** *Manual de Fertirriego y Manejo de Suelos en Hortalizas*. Instituto de Investigaciones Agropecuarias, Boletín Técnico N° 342.
- <sup>[15]</sup> **Robert Half (2024–2025):** *Reporte de Mercado Laboral y Guía Salarial Chile*. Robert Half International.
- <sup>[16]</sup> **Michael Page (2024–2025):** *Estudio de Remuneraciones Chile: Finanzas y Contabilidad*. PageGroup.
- <sup>[17]</sup> **Servicio de Impuestos Internos (2025):** [*Circular N° 53 de 2025*](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf) — tasas de referencia del Régimen Pro Pyme aplicadas en el modelo.
- <sup>[18]</sup> **Espressif Systems:** [*ESP32-WROOM-32E / 32UE Datasheet*](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html) — especifica **Bluetooth 4.2 BR/EDR y BLE**, no BLE 5.0.
- <sup>[19]</sup> **INE:** [*VIII Censo Agropecuario y Forestal — resultados finales*](https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales).
- <sup>[20]</sup> **Bluelab:** [*Límites de interpretación de la conductividad*](https://support.bluelab.com/hc/en-us/articles/360001103995-understanding-nutrient-measurements-with-the-pulse-meter).
- <sup>[21]</sup> **Revisión interna de documentación:** [`docs/AUDITORIA_READMES_2026-09-04.md`](docs/AUDITORIA_READMES_2026-09-04.md).
