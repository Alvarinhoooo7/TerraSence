# Modelo económico: metodología, supuestos y límites

Este documento explica **cómo** se calcula la evaluación económica de TerraSense y qué no acredita. No contiene cifras: todas viven en un solo lugar, [`finanzas/supuestos.json`](../finanzas/supuestos.json), y los resultados se publican generados en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md) y en la [sección económica del informe](SECCION_ECONOMICA_REFORMULADA.md).

No constituye una cotización bancaria ni una validación de demanda.

## 1. El precio es un resultado, no un supuesto

Es la decisión metodológica que ordena todo el modelo, y corrige el error de versiones anteriores del estudio, que fijaban el precio primero y acomodaban el flujo después.

La secuencia es: se costea el equipo componente por componente, se dimensiona la inversión inicial y su financiamiento, se proyectan los costos de operación, administración y comercialización, y **solo entonces** se despeja el precio que cubre todo eso con el margen exigido.

El criterio es que las ventas del horizonte completo sean `(1 + margen)` veces el costo total, entendido como costos operacionales más gastos de administración y comercialización. La comisión comercial depende del precio, de modo que la ecuación es circular y se resuelve en forma cerrada, no por tanteo.

Consecuencia que conviene tener presente: al ser un precio único sobre una estructura que se diluye con el volumen, **los primeros ejercicios quedan bajo el margen objetivo y los últimos sobre él**. El margen se cumple sobre el horizonte, no ejercicio por ejercicio. Por eso los dos primeros años cierran con pérdida, y eso es un hallazgo del modelo, no un defecto.

## 2. Estructura escalonada

La dotación no arranca completa. El primer año operan los dos socios y un contador, sin oficina y con la gestión comercial resuelta por los socios con publicidad digital. La oficina entra el segundo año, la encargada de marketing el tercero, y los ensambladores se incorporan a medida que el volumen los exige.

Los sueldos de los socios siguen una **escala progresiva** que parte cerca del ingreso mínimo mientras la empresa no es rentable y sube por escalones. Los empleados no siguen esa escala: se pagan a valor de mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir la remuneración como un socio difiere la suya.

El costo laboral sobre el sueldo bruto **no es un recargo fijo**. Sigue el calendario de la Ley N° 21.735 de reforma previsional, que introdujo una cotización de cargo del empleador gradual hasta completar 8,5 % en 2033 sumada al Seguro de Invalidez y Sobrevivencia, más el seguro de cesantía, la mutualidad y las provisiones de vacaciones e indemnización. El modelo lo aplica año a año.

## 3. Financiamiento: el pie no es una fuente adicional

Los socios entregan al banco un pie equivalente al 30 % del monto solicitado **como condición de entrada**, y es el crédito el que financia el 100 % de la inversión inicial. Sumar pie más crédito como «fuentes» cuenta dos veces el mismo dinero: ese era otro error de versiones anteriores.

La amortización usa el **sistema francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo y porque la cuota fija facilita planificar la caja de una empresa que opera con holgura estrecha al arranque.

La tasa y los gastos de apertura son presupuestos del estudio: **no son CAE ni tasa bancaria observada**. Si el banco no ofrece el plazo o exige garantías inaceptables, corresponde reducir el lanzamiento y validar preventas, no sustituir automáticamente por un crédito de consumo.

## 4. Capital de trabajo: dimensionado, no supuesto

No se fija por una regla de tantos meses. Se **itera** hasta que la caja no baje de un piso de seguridad durante todo el horizonte, con un mínimo de política de tres meses de estructura.

El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

## 5. Qué se retiró deliberadamente

El estudio **no usa EBITDA, FCFF, FCFE, DSCR ni FTE**. Son indicadores válidos, pero exceden el nivel de una evaluación de viabilidad económica y el equipo no los maneja; presentarlos sin dominarlos es peor que omitirlos. La dotación se expresa en personas, no en equivalentes de jornada.

Lo que sí se conserva, porque responde las preguntas que el proyecto debe responder: **VAN, TIR, payback** (simple y descontado), el **análisis de sensibilidad y punto de quiebre**, y el **costo total de propiedad** del agricultor.

## 6. Alcance de la BOM

La BOM contiene **exclusivamente los componentes presentes en el esquemático**, itemizados uno por uno. Lo que todavía no está en el diseño no se incluye, y se declara aparte con su orden de magnitud: prensaestopas, o-ring y respiradero, cableado interno, y embalaje con manual y etiqueta.

Los precios se cotizaron en el mercado efectivo de abastecimiento y **cada línea declara su origen**, para distinguir lo verificado de lo presupuestado. La sonda de suelo concentra la mayor parte del costo de materiales y es la decisión de abastecimiento crítica: el presupuesto la toma en el tramo alto de un mercado muy disperso, porque una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige.

Sobre el régimen tributario de las compras importadas: desde octubre de 2025 la Ley N° 21.713 eliminó la exención que liberaba de IVA a las importaciones bajo US$41. El IVA que las plataformas inscritas recaudan en el checkout **solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso**. El proyecto asume formalizar el abastecimiento antes de comprometer volumen; la sección económica cuantifica la exposición si no lo hace.

## 7. Lo que el modelo no acredita

- Que el precio de la sonda sea el presupuestado, porque no existe orden de compra ni ficha técnica del SKU.
- Que la demanda responda como proyecta el plan comercial, porque no hay piloto pagado.
- Que el banco otorgue el crédito en las condiciones supuestas, porque no hay oferta formal.
- Que los precios cotizados se sostengan al volumen y con factura, porque son precios de plataforma al detalle.

Ninguno de esos cuatro es un obstáculo oculto: están identificados con su método de verificación. La reserva de caja financia transitorios, no pérdidas permanentes.

## 8. Cómo se regenera

```bash
python finanzas/modelo.py                                  # toda la cadena
python -m unittest discover -s finanzas -p "test_*.py"     # invariantes del modelo
python docs/verificar_documentacion.py                     # enlaces y diagramas
```

Para cambiar una cifra se edita [`finanzas/supuestos.json`](../finanzas/supuestos.json) y se regenera. Para cambiar la redacción de un bloque generado se edita el generador correspondiente, nunca el resultado.
