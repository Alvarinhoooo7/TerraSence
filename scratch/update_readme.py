import re

with open("README.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "No para cuidar plantas. **Para proteger el patrimonio de una familia que se juega el año en cada siembra.**" in line:
        new_lines.append(line)
        new_lines.append("\nEl fin filosófico no es cuidar la planta *per se*, sino **cuidar la economía familiar**. Una planta es un medio productivo; el beneficiario de la tecnología es el humano que la cultiva y cuyo sustento depende de ella. Las decisiones de riego y fertilización se toman para maximizar la rentabilidad y reducir el riesgo de quiebra.\n")
        continue

    if "## VI.4. Alternativa D — Sonda + ESP32 + BLE + smartphone *(seleccionada)*" in line:
        alt_nrf = """## VI.4. Alternativa D — Sonda + nRF52840 + smartphone

El nRF52840 es un SoC avanzado con radio BLE 5.0 nativa, ampliamente usado en wearables por su extrema eficiencia energética.

| Ventaja real | Limitación decisiva para este proyecto |
| :--- | :--- |
| Consumo de energía inigualable en sueño profundo | **Arquitectura single-core.** El SoC tiene un solo núcleo (ARM Cortex-M4). Debe mantener estricta temporización Modbus (pausas de 3,5 caracteres) mientras atiende interrupciones de la pila BLE. Un solo núcleo genera riesgo de caída de conexión BLE o error de trama RS-485. |
| Radio BLE nativa y muy robusta | Costo por unidad significativamente mayor frente al ESP32 |

**Veredicto:** Excelente candidato energético, pero la complejidad de sostener Modbus estricto y BLE en un solo núcleo sin RTOS dual no justifica el aumento de precio respecto al ESP32.

"""
        new_lines.append(alt_nrf)
        new_lines.append("## VI.5. Alternativa E — Sonda + ESP32 + BLE + smartphone *(seleccionada)*\n")
        continue

    if "## VI.5. Matriz de decisión ponderada" in line:
        new_lines.append("## VI.6. Matriz de decisión ponderada\n")
        continue
    
    if "| **A** · ATmega + BT Classic | **B** · Datalogger 4G | **C** · Sonda directa | **D** · ESP32 + BLE |" in line:
        new_lines.append("| Criterio | Peso | **A** · ATmega | **B** · Datalogger 4G | **C** · Sonda directa | **D** · nRF52840 | **E** · ESP32 + BLE |\n")
        continue

    if "| :--- | :---: | :---: | :---: | :---: | :---: |" in line and "Criterio" not in line:
        new_lines.append("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        continue

    if "| **Compatibilidad Android + iOS** | 18 % | 2 | 7 | 2 | **10** |" in line:
        new_lines.append("| **Compatibilidad Android + iOS** | 18 % | 2 | 7 | 2 | 10 | **10** |\n")
        continue
    if "| **Autonomía energética en campo** | 18 % | 3 | 8 | 9 | **9** |" in line:
        new_lines.append("| **Autonomía energética en campo** | 18 % | 3 | 8 | 9 | 10 | **9** |\n")
        continue
    if "| **Capacidad de ejecutar el motor de inferencia** | 16 % | 1 | 6 | 8 | **10** |" in line:
        new_lines.append("| **Capacidad de ejecutar el motor de inferencia** | 16 % | 1 | 6 | 8 | 10 | **10** |\n")
        continue
    if "| **Costo total del sistema (BOM + operación)** | 15 % | 6 | 1 | 10 | **8** |" in line:
        new_lines.append("| **Costo total del sistema (BOM + operación)** | 15 % | 6 | 1 | 10 | 6 | **8** |\n")
        continue
    if "| **Robustez mecánica en terreno** | 12 % | 4 | 5 | 2 | **9** |" in line:
        new_lines.append("| **Robustez mecánica en terreno** | 12 % | 4 | 5 | 2 | 9 | **9** |\n")
        continue
    if "| **Actualización de firmware y mantenibilidad** | 11 % | 1 | 7 | 10 | **10** |" in line:
        new_lines.append("| **Actualización de firmware y mantenibilidad** | 11 % | 1 | 7 | 10 | 10 | **10** |\n")
        continue
    if "| **Cobertura espacial (puntos por jornada)** | 10 % | 8 | 1 | 8 | **10** |" in line:
        new_lines.append("| **Cobertura espacial (puntos por jornada)** | 10 % | 8 | 1 | 8 | 10 | **10** |\n")
        continue
    if "| **PUNTAJE PONDERADO** | **100 %** | **3,42** | **5,32** | **6,71** | **🏆 9,42** |" in line:
        new_lines.append("| **PUNTAJE PONDERADO** | **100 %** | **3,42** | **5,32** | **6,71** | **9,08** | **🏆 9,42** |\n")
        continue
        
    if "## VIII.3. Diagramas de flujo de las alternativas evaluadas" in line:
        new_lines.append(line)
        diagrama_mermaid = """
> [!NOTE]
> A continuación se expone la diferencia entre la arquitectura procesada internamente con display (competencia) frente a la arquitectura IoT externalizada (nuestra propuesta).

```mermaid
graph TD
    subgraph ALT_COMPETENCIA["Arquitectura Competencia (con Pantalla)"]
        A1[Sonda Agrícola] --> A2(Microcontrolador / MCU)
        A2 --> A3[Procesamiento interno simple]
        A3 --> A4[Pantalla LCD/OLED]
        A4 --> A5(Usuario lee el número crudo)
        A5 --> A6{Usuario debe inferir qué hacer}
    end

    subgraph ALT_TERRASENSE["Arquitectura TerraSense (BLE + App)"]
        B1[Sonda Agrícola + BME280] --> B2(ESP32 lee y envía crudo por BLE)
        B2 -. BLE .-> B3[App Móvil iOS/Android]
        B3 --> B4[Motor de Inferencia Agronómica - 4 Capas]
        B4 --> B5[Recomendación Prescriptiva]
        B5 --> B6(Usuario toma decisión ejecutiva)
    end
```
"""
        new_lines.append(diagrama_mermaid)
        continue

    if "> **Cliente:** *«Quiero que el equipo tenga pantalla, para ver los números sin sacar el teléfono.»*" in line:
        new_lines.append(line)
        new_lines.append("> **Respuesta extendida:** *«Si usted desea, le puedo agregar una pantalla OLED, pero la cantidad de mediciones bajará drásticamente. Si quiere compensar ese consumo, le debo agregar otra batería 18650 en paralelo. Eso le costaría aproximadamente $3.000 CLP extra, aumentaría el peso del equipo, haría el diseño más voluminoso y nos obligaría a abrir una ranura en la carcasa, comprometiendo la certificación IP67 contra humedad y charcos.»*\n>\n")
        continue
        
    if "## X.3. Aptitud para condiciones de campo: el caso IP67" in line:
        new_lines.append(line)
        new_lines.append("\n> [!IMPORTANT]\n> **El IP67 no es un capricho técnico, es una obligación del mercado.** El equipo trabajará en el campo, rodeado de humedad matinal, rocío, lodo y eventuales caídas en charcos de riego. Validar técnicamente que está preparado para soportar estas condiciones climatológicas es lo único que garantiza la vida útil de la inversión del cliente.\n")
        continue

    if "## XII.1. Tabla maestra de parámetros del modelo" in line:
        new_lines.append(line)
        new_lines.append("\n**El modelo asume vender 120 unidades el primer año**. Esto representa apenas entre el **0,1% y 0,2% del mercado servible** focalizado. Es una meta de ventas conservadora y extremadamente realista que no exige vender números irreales.\n")
        continue
        
    if "## XII.3. CUADRO Nº 1 — Inversiones del proyecto" in line:
        new_lines.append(line)
        credito = """
### Detalle de Gastos e Inversiones Consideradas
Para que el proyecto sea viable, no sólo consideramos el costo de los componentes electrónicos (BOM). Se incluyen todos los gastos reales subyacentes:
* Hardware ensamblado y **coste de envío a Chile** escalado según el volumen de producción proyectado.
* Máquinas para imprimir en 3D (FDM) y herramientas.
* Gastos en logística de post-venta y stock de repuestos.
* Mantención de los servicios en la nube (AWS / Supabase) y pago de licencias de desarrollador de la App en iOS y Android.
* Presupuesto mensual destinado a marketing, promoción e infraestructura.

### Simulación de Financiamiento (Sistema Alemán)
Dado el alto capital inicial para fabricar las 120 unidades y gastos paralelos, se simula un préstamo amortizado bajo el **Sistema Alemán** (cuota de amortización de capital constante, intereses decrecientes sobre saldo deudor).
* **Monto del préstamo:** $1.522.415 CLP
* **Tasa de interés:** 10 % anual
* **Plazo:** 5 años

| Año | Cuota Capital | Interés (10%) | Cuota Total a Pagar | Saldo Deudor |
| :---: | ---: | ---: | ---: | ---: |
| 0 | - | - | - | $1.522.415 |
| 1 | $304.483 | $152.242 | $456.725 | $1.217.932 |
| 2 | $304.483 | $121.793 | $426.276 | $913.449 |
| 3 | $304.483 | $91.345 | $395.828 | $608.966 |
| 4 | $304.483 | $60.897 | $365.380 | $304.483 |
| 5 | $304.483 | $30.448 | $334.931 | $0 |

"""
        new_lines.append(credito)
        continue

    new_lines.append(line)

with open("README_updated.md", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Archivo README_updated.md generado con exito.")
