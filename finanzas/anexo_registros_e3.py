"""Escribe el anexo G del informe 3: registros de medición con estadísticos y gráficos de Excel.

Lee los datos crudos de `Evaluacion/Evaluacion 3/Registros de ensayo/` y los del ensayo de
consumo del informe 2, y genera `Evaluacion/Evaluacion 3/Anexos/Anexo G - Registros de
medicion TerraSense.xlsx`. Los estadísticos son fórmulas de Excel sobre los datos, no valores
copiados, y cada hoja lleva su gráfico nativo. El archivo viaja con el informe: no contiene
rutas ni referencias al repositorio.

    python finanzas/anexo_registros_e3.py
"""

import csv
import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference, ScatterChart, Series
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

RAIZ = Path(__file__).resolve().parents[1]
E3 = RAIZ / "Evaluacion" / "Evaluacion 3"
REG = E3 / "Registros de ensayo"
D07 = RAIZ / "Evaluacion" / "Evaluacion 2" / "Registros de banco" / "D-07 consumo"
DESTINO = E3 / "Anexos" / "Anexo G - Registros de medicion TerraSense.xlsx"

VERDE = "1F5E3B"
VERDE_C = "E7F1EA"
GRIS_C = "F2F3F1"
TITULO = Font(name="Arial", size=13, bold=True, color=VERDE)
CABECERA = Font(name="Arial", size=10, bold=True, color="FFFFFF")
NORMAL = Font(name="Arial", size=10)
NOTA = Font(name="Arial", size=9, italic=True, color="5A646C")
FONDO = PatternFill("solid", fgColor=VERDE)
BANDA = PatternFill("solid", fgColor=GRIS_C)
RESALTE = PatternFill("solid", fgColor=VERDE_C)
LINEA = Side(style="thin", color="C9CED2")
BORDE = Border(left=LINEA, right=LINEA, top=LINEA, bottom=LINEA)


def leer(ruta):
    with open(ruta, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def num(x):
    try:
        v = float(x)
        return int(v) if v.is_integer() and "." not in str(x) else v
    except (TypeError, ValueError):
        return x


def hoja(wb, nombre, titulo, nota, cabecera, filas, anchos=None, fila0=4):
    ws = wb.create_sheet(nombre)
    ws["A1"] = titulo
    ws["A1"].font = TITULO
    ws["A2"] = nota
    ws["A2"].font = NOTA
    for j, c in enumerate(cabecera, 1):
        celda = ws.cell(row=fila0, column=j, value=c)
        celda.font, celda.fill, celda.border = CABECERA, FONDO, BORDE
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[fila0].height = 32
    for i, f in enumerate(filas, fila0 + 1):
        for j, v in enumerate(f, 1):
            celda = ws.cell(row=i, column=j, value=v)
            celda.font, celda.border = NORMAL, BORDE
            if (i - fila0) % 2 == 0:
                celda.fill = BANDA
    for j in range(1, len(cabecera) + 1):
        ws.column_dimensions[get_column_letter(j)].width = (anchos or {}).get(j, 14)
    ws.freeze_panes = ws.cell(row=fila0 + 1, column=1)
    return ws


def estadisticos(ws, fila, col_etiqueta, columnas, primera, ultima, titulo="Estadísticos (fórmulas)"):
    """Escribe promedio, desviación, mínimo y máximo de cada columna como fórmulas de Excel."""
    ws.cell(row=fila, column=col_etiqueta, value=titulo).font = Font(name="Arial", size=10, bold=True, color=VERDE)
    for k, (nombre, func) in enumerate([("Promedio", "AVERAGE"), ("Desviación estándar", "STDEV"),
                                        ("Mínimo", "MIN"), ("Máximo", "MAX")], 1):
        c = ws.cell(row=fila + k, column=col_etiqueta, value=nombre)
        c.font, c.fill, c.border = NORMAL, RESALTE, BORDE
        for col in columnas:
            letra = get_column_letter(col)
            c = ws.cell(row=fila + k, column=col, value="=%s(%s%d:%s%d)" % (func, letra, primera, letra, ultima))
            c.font, c.fill, c.border = NORMAL, RESALTE, BORDE
            c.number_format = "0.00"


def resumen(wb):
    ws = wb.active
    ws.title = "Resumen"
    ws["A1"] = "TerraSense: registros de medición del prototipo"
    ws["A1"].font = Font(name="Arial", size=15, bold=True, color=VERDE)
    ws["A2"] = ("Anexo G del informe de implementación y validación. Cada hoja reúne los datos de un ensayo, "
                "sus estadísticos calculados con fórmulas y su gráfico.")
    ws["A2"].font = NOTA
    filas = [
        ("Sonda", "Siete variables del suelo al aire, en agua potable, en suelo seco y en suelo regado", "21-11-2026",
         "Monitor serie, ráfaga de 10 consultas Modbus"),
        ("Riego", "Evolución de humedad, CE y pH después de regar la maceta", "21-11-2026", "Monitor serie cada 30 s"),
        ("Consumo", "Corriente media y energía de cada medición, campañas del 31-10 y del 21-11", "31-10 y 21-11-2026",
         "FNIRSI FNB58 a 100 muestras/s"),
        ("Corriente", "Perfil de corriente del 21-11 promediado cada 100 ms", "21-11-2026", "FNIRSI FNB58"),
        ("Ciclo", "Tiempos de búsqueda, conexión, adquisición y ciclo completo de cada medición", "21-11-2026",
         "PC con Bluetooth, ciclo de la aplicación"),
        ("Modbus", "Ensayo D-14: 1.000 consultas consecutivas por corrida", "31-10 y 21-11-2026", "Monitor serie"),
        ("BME280", "Temperatura, presión y humedad del aire con el equipo encendido", "21-11-2026", "Monitor serie cada 20 s"),
        ("Batería", "Tensión leída por el equipo frente al multímetro", "21-11-2026", "Multímetro digital"),
    ]
    if (REG / "descarga.csv").exists():
        filas.append(("Descarga", "Descarga acelerada: una medición cada 12 min hasta agotar la celda", "21 y 22-11-2026",
                      "PC con Bluetooth"))
    if (REG / "carga" / "corriente.csv").exists():
        filas.append(("Carga", "Corriente de carga de la celda por USB", "2026", "FNIRSI FNB58"))
    for j, c in enumerate(["Hoja", "Contenido", "Fecha", "Instrumento"], 1):
        celda = ws.cell(row=4, column=j, value=c)
        celda.font, celda.fill, celda.border = CABECERA, FONDO, BORDE
    for i, f in enumerate(filas, 5):
        for j, v in enumerate(f, 1):
            celda = ws.cell(row=i, column=j, value=v)
            celda.font, celda.border = NORMAL, BORDE
    for j, w in enumerate([14, 78, 20, 40], 1):
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.cell(row=len(filas) + 7, column=1,
            value="Placa de laboratorio con el firmware 1.1.0. Las condiciones y los criterios de aceptación de cada "
                  "ensayo están en el capítulo de mediciones y resultados del informe.").font = NOTA


def sonda(wb):
    filas = leer(REG / "sonda.csv")
    cab = ["Fecha y hora", "Condición", "Lectura", "Humedad (%)", "Temperatura (°C)", "CE (µS/cm)", "pH",
           "N (mg/kg)", "P (mg/kg)", "K (mg/kg)", "Δ humedad en la ráfaga", "Δ CE en la ráfaga"]
    datos = [[f["fecha_hora"], f["condicion"].replace(" (estabilizacion)", ", estabilización"), int(f["k"]),
              num(f["humedad_pct"]), num(f["temp_suelo_C"]), num(f["ce_uScm"]), num(f["ph"]), num(f["n_mgkg"]),
              num(f["p_mgkg"]), num(f["k_mgkg"]), num(f["d_hum"]), num(f["d_ce"])] for f in filas]
    ws = hoja(wb, "Sonda", "Lecturas de la sonda por condición",
              "Cada fila es una ráfaga de 10 consultas Modbus con media recortada sobre las 6 centrales.", cab, datos,
              {1: 20, 2: 30})
    ultima = 4 + len(datos)
    # Promedio por condición con PROMEDIO.SI, para que la tabla se recalcule si se agregan lecturas.
    fila = ultima + 3
    ws.cell(row=fila, column=2, value="Promedio por condición (fórmulas)").font = Font(name="Arial", size=10, bold=True,
                                                                                        color=VERDE)
    conds = []
    for d in datos:
        if d[1] not in conds:
            conds.append(d[1])
    for j, c in enumerate(["Condición", "Lecturas", "Humedad (%)", "Temperatura (°C)", "CE (µS/cm)", "pH", "K (mg/kg)"], 2):
        celda = ws.cell(row=fila + 1, column=j, value=c)
        celda.font, celda.fill, celda.border = CABECERA, FONDO, BORDE
    for k, c in enumerate(conds):
        r = fila + 2 + k
        ws.cell(row=r, column=2, value=c).border = BORDE
        ws.cell(row=r, column=3, value='=COUNTIF($B$5:$B$%d,B%d)' % (ultima, r)).border = BORDE
        for j, col in zip(range(4, 9), ["D", "E", "F", "G", "J"]):
            celda = ws.cell(row=r, column=j, value='=AVERAGEIF($B$5:$B$%d,B%d,%s$5:%s$%d)' % (ultima, r, col, col, ultima))
            celda.number_format, celda.border, celda.fill = "0.0", BORDE, RESALTE
    # Gráfico de K frente a CE: muestra que los valores de referencia derivan de la conductividad.
    ch = ScatterChart()
    ch.title = "N, P y K frente a la conductividad"
    ch.x_axis.title = "CE (µS/cm)"
    ch.y_axis.title = "mg/kg"
    ch.style = 13
    x = Reference(ws, min_col=6, min_row=5, max_row=ultima)
    for col, nombre in ((8, "N"), (9, "P"), (10, "K")):
        s = Series(Reference(ws, min_col=col, min_row=5, max_row=ultima), x, title=nombre)
        s.marker.symbol = "circle"
        s.graphicalProperties.line.noFill = True
        ch.series.append(s)
    ch.height, ch.width = 9, 16
    ws.add_chart(ch, "N4")
    ch2 = LineChart()
    ch2.title = "Humedad de cada lectura"
    ch2.y_axis.title = "%"
    ch2.add_data(Reference(ws, min_col=4, min_row=4, max_row=ultima), titles_from_data=True)
    ch2.height, ch2.width = 8, 16
    ws.add_chart(ch2, "N24")


def consumo(wb):
    b = json.loads((D07 / "3 firmware final 80 MHz y anuncio 150 ms" / "resumen.json").read_text(encoding="utf-8"))
    nuevo = REG / "consumo" / "resumen.json"
    n = json.loads(nuevo.read_text(encoding="utf-8")) if nuevo.exists() else None
    datos = []
    for k in range(10):
        a = b["mediciones"][k]
        fila = [k + 1, round(a["s"], 2), round(a["i_med"], 1), round(a["e_mwh"], 3)]
        if n:
            m = n["mediciones"][k]
            fila += [round(m["s"], 2), round(m["i"], 1), round(m["e"], 3)]
        datos.append(fila)
    cab = ["Medición", "31-10: duración (s)", "31-10: corriente media (mA)", "31-10: energía (mWh)"]
    if n:
        cab += ["21-11: duración (s)", "21-11: corriente media (mA)", "21-11: energía (mWh)"]
    ws = hoja(wb, "Consumo", "Energía de cada medición",
              "Integral de tensión × corriente en la ventana de conexión. Balance de diseño: 1,106 mWh por ciclo de 16 s.",
              cab, datos, {j: 16 for j in range(1, 8)})
    estadisticos(ws, 16, 1, range(2, len(cab) + 1), 5, 14)
    r = 22
    ws.cell(row=r, column=1, value="Reposo con anuncio BLE (mA)").font = Font(name="Arial", size=10, bold=True)
    ws.cell(row=r, column=2, value=round(b["base_i"], 2))
    if n:
        ws.cell(row=r, column=5, value=round(n["base"], 2))
    ws.cell(row=r + 1, column=1, value="Energía de diseño (mWh)")
    ws.cell(row=r + 1, column=2, value=1.106)
    ws.cell(row=r + 2, column=1, value="Ahorro frente al diseño")
    c = ws.cell(row=r + 2, column=2, value="=1-B17/B23")
    c.number_format = "0.0%"
    ch = BarChart()
    ch.title = "Energía por medición (mWh)"
    ch.y_axis.title = "mWh"
    ch.x_axis.title = "Medición"
    for col in ([4, 7] if n else [4]):
        ch.add_data(Reference(ws, min_col=col, min_row=4, max_row=14), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=1, min_row=5, max_row=14))
    ch.height, ch.width = 8, 16
    ws.add_chart(ch, "I4")
    # Corriente por estado de las dos versiones del firmware.
    a0 = json.loads((D07 / "1 firmware original" / "resumen.json").read_text(encoding="utf-8"))
    estados = ["Reposo con anuncio BLE", "LED y buzzer", "Sonda energizada (consulta continua)"]
    fila = 28
    for j, c in enumerate(["Estado", "Firmware original (mA)", "Firmware ajustado (mA)", "Reducción"], 1):
        celda = ws.cell(row=fila, column=j, value=c)
        celda.font, celda.fill, celda.border = CABECERA, FONDO, BORDE
    for k, e in enumerate(estados, 1):
        ws.cell(row=fila + k, column=1, value=e)
        ws.cell(row=fila + k, column=2, value=round(a0["tramos"][e]["i_med"], 1))
        ws.cell(row=fila + k, column=3, value=round(b["tramos"][e]["i_med"], 1))
        c = ws.cell(row=fila + k, column=4, value="=1-C%d/B%d" % (fila + k, fila + k))
        c.number_format = "0.0%"
    ch2 = BarChart()
    ch2.title = "Corriente por estado (mA)"
    ch2.add_data(Reference(ws, min_col=2, min_row=fila, max_col=3, max_row=fila + 3), titles_from_data=True)
    ch2.set_categories(Reference(ws, min_col=1, min_row=fila + 1, max_row=fila + 3))
    ch2.height, ch2.width = 8, 16
    ws.add_chart(ch2, "I22")


def corriente(wb):
    ruta = REG / "consumo" / "corriente.csv"
    if not ruta.exists():
        return
    filas = leer(ruta)
    marcas = json.loads((REG / "consumo" / "marcas.json").read_text(encoding="utf-8"))
    t0 = min(m["t"] for m in marcas)
    tf = max(m["t"] for m in marcas)
    datos, bloque = [], []
    for f in filas:
        t = float(f["t_unix"])
        if t0 <= t <= tf:
            bloque.append((t, float(f["voltaje_V"]), float(f["corriente_A"]) * 1000))
            if len(bloque) == 10:
                tm = sum(x[0] for x in bloque) / 10 - t0
                datos.append([round(tm, 2), round(sum(x[1] for x in bloque) / 10, 3), round(sum(x[2] for x in bloque) / 10, 1)])
                bloque = []
    ws = hoja(wb, "Corriente", "Perfil de corriente con el firmware vigente",
              "Promedio de cada 10 muestras (100 ms) del FNB58; 60 s de reposo, 10 mediciones y 30 s de reposo.",
              ["Tiempo (s)", "Tensión (V)", "Corriente (mA)"], datos)
    estadisticos(ws, 4, 5, [7], 5, 4 + len(datos), "Corriente (fórmulas)")
    ws.cell(row=4, column=7, value="Corriente (mA)")
    ch = ScatterChart()
    ch.title = "Corriente en la entrada USB"
    ch.x_axis.title = "Tiempo (s)"
    ch.y_axis.title = "mA"
    s = Series(Reference(ws, min_col=3, min_row=5, max_row=4 + len(datos)),
               Reference(ws, min_col=1, min_row=5, max_row=4 + len(datos)), title="Corriente")
    s.marker.symbol = "none"
    ch.series.append(s)
    ch.height, ch.width = 9, 22
    ws.add_chart(ch, "I4")


def ciclo(wb):
    ruta = REG / "consumo" / "mediciones.csv"
    if not ruta.exists():
        return
    filas = [f for f in leer(ruta) if f.get("ciclo_s")]
    datos = [[int(f["i"]), num(f["busqueda_s"]), num(f["conexion_s"]), num(f["adquisicion_envio_s"]), num(f["ciclo_s"]),
              f["trama"]] for f in filas]
    ws = hoja(wb, "Ciclo", "Tiempos del ciclo de medición (R03: adquisición y envío ≤ 10 s; ciclo ≤ 20 s)",
              "Ciclo de la aplicación ejecutado desde el PC: buscar, conectar, leer el estado, suscribirse, recibir la trama y desconectar.",
              ["Medición", "Búsqueda (s)", "Conexión (s)", "Adquisición y envío (s)", "Ciclo completo (s)",
               "Trama de 20 bytes (hexadecimal)"], datos, {6: 46})
    estadisticos(ws, 16, 1, range(2, 6), 5, 14)
    ch = BarChart()
    ch.type = "col"
    ch.grouping = "stacked"
    ch.overlap = 100
    ch.title = "Composición del ciclo (s)"
    ch.add_data(Reference(ws, min_col=2, min_row=4, max_col=4, max_row=14), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=1, min_row=5, max_row=14))
    ch.height, ch.width = 8, 16
    ws.add_chart(ch, "H4")


def modbus(wb):
    filas = [["Al aire", "31-10-2026", 1000, 1000, 0, 64, 69, 74], ["Al aire, repetición", "31-10-2026", 1000, 1000, 0, 64, 69, 74]]
    ruta = REG / "03_D14_enterrada.txt"
    if ruta.exists():
        m = re.search(r"mín (\d+) ms, prom (\d+) ms, máx (\d+) ms", ruta.read_text(encoding="utf-8"))
        filas.append(["Enterrada en suelo", "21-11-2026", 1000, 1000, 0] + [int(x) for x in m.groups()])
    ws = hoja(wb, "Modbus", "Ensayo D-14: consultas Modbus consecutivas a 4.800 baudios, sin reintentos",
              "Criterio R15: 1.000 de 1.000 lecturas sin error de CRC.",
              ["Condición", "Fecha", "Consultas", "Correctas", "Errores de CRC", "Respuesta mínima (ms)",
               "Respuesta media (ms)", "Respuesta máxima (ms)"], filas, {1: 22})
    r = 5 + len(filas)
    ws.cell(row=r, column=1, value="Total").font = Font(name="Arial", size=10, bold=True)
    for col in "CDE":
        ws["%s%d" % (col, r)] = "=SUM(%s5:%s%d)" % (col, col, r - 1)
    ws.cell(row=r + 1, column=1, value="Tasa de éxito")
    c = ws.cell(row=r + 1, column=4, value="=D%d/C%d" % (r, r))
    c.number_format = "0.00%"


def bme(wb):
    ruta = REG / "bme.csv"
    if not ruta.exists():
        return
    filas = leer(ruta)
    datos = [[f["fecha_hora"], f["condicion"], round(float(f["t_s"]) / 60, 2), num(f["temp_aire_C"]),
              num(f["presion_hPa"]), num(f["hr_pct"])] for f in filas]
    ws = hoja(wb, "BME280", "Sensor ambiental con el equipo encendido",
              "BME280 en modo forzado, ráfaga de 10 con media recortada. Criterio R02: deriva menor que 0,5 °C.",
              ["Fecha y hora", "Condición", "Tiempo (min)", "Temperatura (°C)", "Presión (hPa)", "Humedad relativa (%)"],
              datos, {1: 20, 2: 22})
    ultima = 4 + len(datos)
    estadisticos(ws, ultima + 2, 3, [4, 5, 6], 5, ultima)
    ch = ScatterChart()
    ch.title = "Temperatura del aire (°C)"
    ch.x_axis.title = "Tiempo (min)"
    s = Series(Reference(ws, min_col=4, min_row=5, max_row=ultima), Reference(ws, min_col=3, min_row=5, max_row=ultima),
               title="Temperatura")
    s.marker.symbol = "circle"
    ch.series.append(s)
    ch.height, ch.width = 8, 16
    ws.add_chart(ch, "H4")


def bateria(wb):
    filas = [["31-10-2026", 4.011, None, None], ["21-11-2026", 3.958, 3.895, None]]
    ws = hoja(wb, "Batería", "Tensión de la celda: equipo frente a multímetro",
              "Criterio D-10: error de la tensión leída menor que 2 %.",
              ["Fecha", "Leída por el equipo (V)", "Multímetro en bornes (V)", "Error relativo"], filas, {1: 14, 2: 22, 3: 24})
    ws["D6"] = "=(B6-C6)/C6"
    ws["D6"].number_format = "0.00%"
    ws["D5"] = "Sin multímetro"


def descarga(wb):
    ruta = REG / "descarga.csv"
    if not ruta.exists():
        return
    filas = [f for f in leer(ruta)]
    datos = [[f["fecha_hora"], num(f["t_h"]), int(f["k"]), f["resultado"], num(f["bat_estado"]), num(f["v_equiv"]),
              num(f.get("hum")), num(f.get("ce")), num(f.get("ciclo_s"))] for f in filas]
    ws = hoja(wb, "Descarga", "Descarga acelerada: una medición cada 12 minutos",
              "Cada fila repite el ciclo de la aplicación; la tensión se deduce del porcentaje que informa el equipo.",
              ["Fecha y hora", "Tiempo (h)", "Intento", "Resultado", "Batería (%)", "Tensión equivalente (V)",
               "Humedad (%)", "CE (µS/cm)", "Ciclo (s)"], datos, {1: 20, 4: 16})
    ultima = 4 + len(datos)
    r = ultima + 2
    ws.cell(row=r, column=1, value="Mediciones válidas").font = Font(name="Arial", size=10, bold=True)
    ws.cell(row=r, column=2, value='=COUNTIF(D5:D%d,"ok")' % ultima)
    ws.cell(row=r + 1, column=1, value="Horas encendido")
    ws.cell(row=r + 1, column=2, value="=MAX(B5:B%d)" % ultima)
    ch = ScatterChart()
    ch.title = "Batería durante la descarga (%)"
    ch.x_axis.title = "Horas"
    s = Series(Reference(ws, min_col=5, min_row=5, max_row=ultima), Reference(ws, min_col=2, min_row=5, max_row=ultima),
               title="Batería")
    s.marker.symbol = "none"
    ch.series.append(s)
    ch.height, ch.width = 8, 18
    ws.add_chart(ch, "K4")


def carga(wb):
    ruta = REG / "carga" / "corriente.csv"
    if not ruta.exists():
        return
    filas = leer(ruta)
    t0 = float(filas[0]["t_unix"])
    datos, bloque = [], []
    for f in filas:
        bloque.append((float(f["t_unix"]), float(f["voltaje_V"]), float(f["corriente_A"]) * 1000))
        if len(bloque) == 6000:  # un minuto
            datos.append([round((sum(x[0] for x in bloque) / len(bloque) - t0) / 60, 1),
                          round(sum(x[1] for x in bloque) / len(bloque), 3), round(sum(x[2] for x in bloque) / len(bloque), 1)])
            bloque = []
    ws = hoja(wb, "Carga", "Carga de la celda por USB",
              "Promedio por minuto del FNB58 en la entrada del cargador. Criterio R08: corriente ≤ 500 mA.",
              ["Tiempo (min)", "Tensión (V)", "Corriente (mA)"], datos)
    ultima = 4 + len(datos)
    ws.cell(row=ultima + 2, column=1, value="Energía tomada (Wh)").font = Font(name="Arial", size=10, bold=True)
    ws.cell(row=ultima + 2, column=2, value="=SUMPRODUCT(B5:B%d,C5:C%d)/1000/60" % (ultima, ultima))
    ws.cell(row=ultima + 3, column=1, value="Corriente máxima (mA)")
    ws.cell(row=ultima + 3, column=2, value="=MAX(C5:C%d)" % ultima)
    ch = ScatterChart()
    ch.title = "Corriente de carga (mA)"
    ch.x_axis.title = "Minutos"
    s = Series(Reference(ws, min_col=3, min_row=5, max_row=ultima), Reference(ws, min_col=1, min_row=5, max_row=ultima),
               title="Corriente")
    s.marker.symbol = "none"
    ch.series.append(s)
    ch.height, ch.width = 8, 18
    ws.add_chart(ch, "F4")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    wb = Workbook()
    resumen(wb)
    sonda(wb)
    consumo(wb)
    corriente(wb)
    ciclo(wb)
    modbus(wb)
    bme(wb)
    bateria(wb)
    descarga(wb)
    carga(wb)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    wb.save(DESTINO)
    print("Anexo G escrito: %s (%d hojas)" % (DESTINO.name, len(wb.sheetnames)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
