# -*- coding: utf-8 -*-
"""Anexos A (cotizaciones), B (flujo de caja), E (protocolos FAT y SAT) y F (carta Gantt) de la
Evaluacion 2, mas la planilla de BOM del repositorio.

Los llama `modelo.py`. Los libros que se entregan (anexos) no contienen ninguna referencia al
repositorio: ni rutas, ni nombres de scripts, ni instrucciones de regeneracion.

Anexo B: doce hojas independientes enlazadas por formulas con valor en cache, de modo que el
revisor siga cada cifra. La separacion entre administracion y comercializacion es solo una
reagrupacion del costo total del modelo; `verificar_reagrupacion` lo comprueba.
"""
import xlsxwriter
from xlsxwriter.utility import xl_rowcol_to_cell, xl_col_to_name

import modelo as M

S = M.S
ANIOS = M.ANIOS

CLP = '"$"#,##0;[Red]-"$"#,##0'
CLP2 = '"$"#,##0.00'
PCT = "0.0%"


# ============================================================ Anexo A
PROVEEDOR_ORDEN = ["LCSC", "DigiKey", "JLCPCB"]


def _formatos(wb):
    f = {}
    f["tit"] = wb.add_format({"bold": True, "bg_color": "#1F3864", "font_color": "#FFFFFF", "border": 1,
                              "text_wrap": True, "valign": "vcenter", "align": "center"})
    f["txt"] = wb.add_format({"text_wrap": True, "valign": "top", "border": 1, "border_color": "#BFBFBF"})
    f["num"] = wb.add_format({"valign": "top", "border": 1, "border_color": "#BFBFBF", "align": "center"})
    f["clp2"] = wb.add_format({"num_format": CLP2, "valign": "top", "border": 1, "border_color": "#BFBFBF"})
    f["clp"] = wb.add_format({"num_format": CLP, "valign": "top", "border": 1, "border_color": "#BFBFBF"})
    f["tot_txt"] = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1})
    f["tot_clp"] = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1, "num_format": CLP})
    f["link"] = wb.add_format({"font_color": "#0563C1", "underline": 1, "valign": "top", "border": 1,
                               "border_color": "#BFBFBF", "text_wrap": False})
    f["nota"] = wb.add_format({"italic": True, "text_wrap": True, "valign": "top"})
    f["sub"] = wb.add_format({"bold": True, "bg_color": "#EEEEEE", "border": 1})
    f["usd"] = wb.add_format({"num_format": '"US$"#,##0.0000', "valign": "top", "border": 1, "border_color": "#BFBFBF"})
    f["usd2"] = wb.add_format({"num_format": '"US$"#,##0.00', "valign": "top", "border": 1, "border_color": "#BFBFBF"})
    return f


def _fecha(iso):
    a, m, d = iso.split("-")
    return "%s-%s-%s" % (d, m, a)


def _enlace(ws, fila, col, url, f):
    if url and url.startswith("http"):
        ws.write_url(fila, col, url, f["link"], string=url)
    else:
        ws.write(fila, col, url or "—", f["txt"])


def hoja_producto(wb, nombre, f):
    """BOM del producto por equipo. Devuelve (fila_total_1based, total)."""
    ws = wb.add_worksheet(nombre)
    cols = ["Equipo", "Modelo", "Cantidad", "Proveedor", "Valor unitario", "Valor total",
            "Fecha de consulta", "Enlace", "Código del proveedor", "Moneda de origen", "Precio original",
            "Tramo de cantidad", "Estado del precio", "Bloque del equipo", "Alternativa", "Observación"]
    ws.write_row(0, 0, cols, f["tit"])
    ws.set_row(0, 32)
    for c, w in enumerate((52, 34, 10, 22, 14, 14, 14, 44, 16, 11, 12, 14, 14, 26, 56, 62)):
        ws.set_column(c, c, w)
    n = 0
    for i, fila in enumerate(S["bom_filas"], 1):
        n = i
        ws.write(i, 0, fila["equipo"], f["txt"])
        ws.write(i, 1, fila["modelo"], f["txt"])
        ws.write_number(i, 2, fila["cantidad"], f["num"])
        ws.write(i, 3, fila["proveedor"], f["txt"])
        ws.write_number(i, 4, fila["precio_clp"], f["clp2"])
        ws.write_formula(i, 5, "=C%d*E%d" % (i + 1, i + 1), f["clp"], fila["cantidad"] * fila["precio_clp"])
        ws.write(i, 6, _fecha(fila["fecha"]), f["num"])
        _enlace(ws, i, 7, fila["enlace"], f)
        ws.write(i, 8, fila["codigo"], f["num"])
        ws.write(i, 9, fila["moneda"], f["num"])
        ws.write_number(i, 10, fila["precio_original"], f["clp2"] if fila["moneda"] == "CLP" else f["usd"])
        ws.write(i, 11, str(fila["tramo"]), f["num"])
        ws.write(i, 12, fila["estado"], f["num"])
        ws.write(i, 13, fila["bloque"], f["txt"])
        ws.write(i, 14, fila["alternativa"], f["txt"])
        ws.write(i, 15, fila["nota"], f["txt"])
    tot = n + 1
    total = sum(x["cantidad"] * x["precio_clp"] for x in S["bom_filas"])
    ws.write(tot, 0, "TOTAL POR EQUIPO (neto de IVA)", f["tot_txt"])
    for c in range(1, 6):
        if c != 5:
            ws.write(tot, c, "", f["tot_txt"])
    ws.write_formula(tot, 5, "=SUM(F2:F%d)" % (n + 1), f["tot_clp"], total)
    # Subtotales por bloque
    base = tot + 2
    ws.write(base, 0, "Subtotal por bloque del equipo", f["sub"])
    ws.write(base, 1, "", f["sub"])
    ws.write(base, 2, "Líneas", f["sub"])
    ws.write(base, 3, "", f["sub"])
    ws.write(base, 4, "", f["sub"])
    ws.write(base, 5, "Valor total", f["sub"])
    for k, (bl, nl, sub) in enumerate(M.bom_por_bloque(), 1):
        r = base + k
        ws.write(r, 0, bl, f["txt"])
        ws.write(r, 1, "", f["txt"])
        ws.write_formula(r, 2, '=COUNTIF($N$2:$N$%d,A%d)' % (n + 1, r + 1), f["num"], nl)
        ws.write(r, 3, "", f["txt"])
        ws.write(r, 4, "", f["txt"])
        ws.write_formula(r, 5, '=SUMIF($N$2:$N$%d,A%d,$F$2:$F$%d)' % (n + 1, r + 1, n + 1), f["clp"], sub)
    nb = len(M.bom_por_bloque())
    r = base + nb + 1
    ws.write(r, 0, "Total de los bloques", f["tot_txt"])
    for c in (1, 3, 4):
        ws.write(r, c, "", f["tot_txt"])
    ws.write_formula(r, 2, "=SUM(C%d:C%d)" % (base + 2, base + nb + 1), f["tot_txt"], len(S["bom_filas"]))
    ws.write_formula(r, 5, "=SUM(F%d:F%d)" % (base + 2, base + nb + 1), f["tot_clp"], total)
    ws.write(r + 2, 0, "Los precios de LCSC se consultaron el %s en su catálogo público, en US$ al tramo que corresponde "
             "a 200 equipos, y se convirtieron a pesos a $%s por US$. Todo valor es neto de IVA: el IVA de importación "
             "(Ley 21.713) se trata como crédito fiscal. Las filas con estado «estimación» explican su razón en la "
             "observación." % (_fecha(S["fecha_consulta_precios"]), format(S["tipo_cambio_usd_clp"], ",d").replace(",", ".")),
             f["nota"])
    ws.set_row(r + 2, 48)
    ws.freeze_panes(1, 2)
    return tot + 1, total


def hoja_taller(wb, nombre, f):
    ws = wb.add_worksheet(nombre)
    cols = ["Equipo", "Modelo", "Cantidad", "Proveedor", "Valor unitario", "Valor total",
            "Fecha de consulta", "Enlace", "Código del proveedor", "Moneda de origen", "Precio original",
            "Vida útil (años)", "Estado del precio", "Uso en el taller", "Alternativa", "Observación"]
    ws.write_row(0, 0, cols, f["tit"])
    ws.set_row(0, 32)
    for c, w in enumerate((30, 44, 10, 24, 14, 14, 14, 44, 16, 11, 12, 11, 14, 48, 40, 60)):
        ws.set_column(c, c, w)
    n = 0
    fusd = f["usd2"]
    for i, fila in enumerate(S["taller_filas"], 1):
        n = i
        ws.write(i, 0, fila["equipo"], f["txt"])
        ws.write(i, 1, fila["modelo"], f["txt"])
        ws.write_number(i, 2, fila["cantidad"], f["num"])
        ws.write(i, 3, fila["proveedor"], f["txt"])
        ws.write_number(i, 4, fila["precio_neto_clp"], f["clp"])
        ws.write_formula(i, 5, "=C%d*E%d" % (i + 1, i + 1), f["clp"], fila["cantidad"] * fila["precio_neto_clp"])
        ws.write(i, 6, _fecha(fila["fecha"]), f["num"])
        _enlace(ws, i, 7, fila["enlace"], f)
        ws.write(i, 8, fila["codigo"], f["num"])
        ws.write(i, 9, fila["moneda"], f["num"])
        ws.write_number(i, 10, fila["precio_original"], fusd if fila["moneda"] == "USD" else f["clp"])
        ws.write_number(i, 11, fila["vida_util"], f["num"])
        ws.write(i, 12, fila["estado"], f["num"])
        ws.write(i, 13, fila["uso"], f["txt"])
        ws.write(i, 14, fila["alternativa"], f["txt"])
        ws.write(i, 15, fila["nota"], f["txt"])
    tot = n + 1
    total = sum(x["cantidad"] * x["precio_neto_clp"] for x in S["taller_filas"])
    ws.write(tot, 0, "TOTAL ACTIVO FIJO DEL TALLER (neto de IVA)", f["tot_txt"])
    for c in range(1, 5):
        ws.write(tot, c, "", f["tot_txt"])
    ws.write_formula(tot, 5, "=SUM(F2:F%d)" % (n + 1), f["tot_clp"], total)
    k = S["internacion_taller"]
    ws.write(tot + 2, 0, "Los equipos en US$ se convierten a $%s por US$ y se les agrega flete y seguro (%d %%) y arancel "
             "general (%d %%) sobre el valor puesto en Chile; el IVA de importación es crédito fiscal y no entra al valor "
             "neto. Los equipos de oficina y las herramientas conservan el valor del supuesto vigente."
             % (format(S["tipo_cambio_usd_clp"], ",d").replace(",", "."), round(k["flete_seguro"] * 100), round(k["arancel"] * 100)),
             f["nota"])
    ws.set_row(tot + 2, 48)
    ws.freeze_panes(1, 2)
    return tot + 1, total


def hoja_servicios(wb, nombre, f):
    ws = wb.add_worksheet(nombre)
    cols = ["Equipo", "Modelo", "Cantidad", "Proveedor", "Valor unitario", "Valor total",
            "Fecha de consulta", "Enlace", "Estado del precio", "Observación"]
    ws.write_row(0, 0, cols, f["tit"])
    ws.set_row(0, 32)
    for c, w in enumerate((46, 48, 10, 34, 14, 14, 14, 44, 14, 70)):
        ws.set_column(c, c, w)
    n = 0
    for i, fila in enumerate(S["servicios_filas"], 1):
        n = i
        ws.write(i, 0, fila["equipo"], f["txt"])
        ws.write(i, 1, fila["modelo"], f["txt"])
        ws.write_number(i, 2, fila["cantidad"], f["num"])
        ws.write(i, 3, fila["proveedor"], f["txt"])
        ws.write_number(i, 4, fila["precio_clp"], f["clp"])
        ws.write_formula(i, 5, "=C%d*E%d" % (i + 1, i + 1), f["clp"], fila["cantidad"] * fila["precio_clp"])
        ws.write(i, 6, _fecha(fila["fecha"]), f["num"])
        _enlace(ws, i, 7, fila["enlace"], f)
        ws.write(i, 8, fila["estado"], f["num"])
        ws.write(i, 9, fila["nota"], f["txt"])
    tot = n + 1
    total = sum(x["cantidad"] * x["precio_clp"] for x in S["servicios_filas"])
    ws.write(tot, 0, "TOTAL DE SERVICIOS (neto de IVA)", f["tot_txt"])
    for c in range(1, 5):
        ws.write(tot, c, "", f["tot_txt"])
    ws.write_formula(tot, 5, "=SUM(F2:F%d)" % (n + 1), f["tot_clp"], total)
    ws.freeze_panes(1, 1)
    return tot + 1, total


def total_servicios():
    return sum(x["cantidad"] * x["precio_clp"] for x in S["servicios_filas"])


def total_taller():
    return sum(x["cantidad"] * x["precio_neto_clp"] for x in S["taller_filas"])


def anexo_a(ruta):
    """Anexo A. Cotizaciones: producto, taller, servicios y resumen por proveedor."""
    with xlsxwriter.Workbook(ruta) as wb:
        wb.set_properties({"title": "Anexo A. Cotizaciones TerraSense", "subject": "Cotizaciones del producto, del taller y de los servicios",
                           "author": "TerraSense"})
        f = _formatos(wb)
        np_, tp = hoja_producto(wb, "Producto (BOM por equipo)", f)
        nt, tt = hoja_taller(wb, "Taller (activo fijo)", f)
        ns, ts = hoja_servicios(wb, "Servicios", f)
        ws = wb.add_worksheet("Resumen por proveedor")
        ws.write_row(0, 0, ["Proveedor", "Producto (por equipo)", "Taller (activo fijo)", "Servicios"], f["tit"])
        ws.set_column(0, 0, 44)
        ws.set_column(1, 3, 22)
        ws.set_row(0, 30)
        provs = []
        for lst in (S["bom_filas"], S["taller_filas"], S["servicios_filas"]):
            for x in lst:
                if x["proveedor"] not in provs:
                    provs.append(x["proveedor"])
        provs.sort(key=lambda p: (PROVEEDOR_ORDEN.index(p) if p in PROVEEDOR_ORDEN else 99, p))
        np_last, nt_last, ns_last = len(S["bom_filas"]) + 1, len(S["taller_filas"]) + 1, len(S["servicios_filas"]) + 1
        for i, p in enumerate(provs, 1):
            ws.write(i, 0, p, f["txt"])
            vp = sum(x["cantidad"] * x["precio_clp"] for x in S["bom_filas"] if x["proveedor"] == p)
            vt = sum(x["cantidad"] * x["precio_neto_clp"] for x in S["taller_filas"] if x["proveedor"] == p)
            vs = sum(x["cantidad"] * x["precio_clp"] for x in S["servicios_filas"] if x["proveedor"] == p)
            ws.write_formula(i, 1, "=SUMIF('Producto (BOM por equipo)'!$D$2:$D$%d,$A%d,'Producto (BOM por equipo)'!$F$2:$F$%d)"
                             % (np_last, i + 1, np_last), f["clp"], vp)
            ws.write_formula(i, 2, "=SUMIF('Taller (activo fijo)'!$D$2:$D$%d,$A%d,'Taller (activo fijo)'!$F$2:$F$%d)"
                             % (nt_last, i + 1, nt_last), f["clp"], vt)
            ws.write_formula(i, 3, "=SUMIF(Servicios!$D$2:$D$%d,$A%d,Servicios!$F$2:$F$%d)" % (ns_last, i + 1, ns_last), f["clp"], vs)
        fin = len(provs) + 1
        ws.write(fin, 0, "TOTAL", f["tot_txt"])
        ws.write_formula(fin, 1, "=SUM(B2:B%d)" % fin, f["tot_clp"], tp)
        ws.write_formula(fin, 2, "=SUM(C2:C%d)" % fin, f["tot_clp"], tt)
        ws.write_formula(fin, 3, "=SUM(D2:D%d)" % fin, f["tot_clp"], ts)
        ws.write(fin + 2, 0, "El producto se expresa por equipo; el taller y los servicios, por compra única o por lote. "
                 "Los tres totales coinciden con los de sus hojas.", f["nota"])
        ws.set_row(fin + 2, 48)
    return {"producto": tp, "taller": tt, "servicios": ts}


def planilla_bom(ruta):
    """Planilla de BOM del repositorio (misma tabla del anexo A, hoja del producto)."""
    with xlsxwriter.Workbook(ruta) as wb:
        f = _formatos(wb)
        hoja_producto(wb, "BOM vigente", f)


# ============================================================ Anexo E
def pruebas_fat():
    """Pruebas de aceptacion en fabrica (tabla FAT del informe), con las corrientes de referencia del modelo energetico del instrumento."""
    import energia_v3 as EV
    espera = EV.p_bateria(EV.ESPERA_REPOSO) / EV.V_BAT
    adquisicion = EV.p_bateria(EV.FASES_V3[1][2], EV.FASES_V3[1][3]) / EV.V_BAT
    ma = lambda x: ("%.0f" % x)
    return [
        ("Inspección visual y de cierre", "Revisión del cordón de silicona, los 4 tornillos con su torque y la etiqueta",
         "Cordón uniforme; tornillos a 0,4 N·m; etiqueta igual al identificador", "R09, R23"),
        ("Corriente en espera", "Multímetro en el puente JP1 con el fixture, equipo encendido sin medir",
         "%s mA ± 25 %%" % ma(espera), "R07"),
        ("Corriente en adquisición", "Multímetro con registro en JP1 durante una medición",
         "%s mA ± 25 %%" % ma(adquisicion), "R07"),
        ("Programación y versión", "Lectura de la versión de firmware y del identificador por USB",
         "Versión de la liberación vigente; identificador de 15 dígitos igual a la dirección física", "R23"),
        ("BLE y trama", "Vinculación con la aplicación de prueba y lectura de una trama",
         "Trama de 20 bytes con formato 1", "R13, R14"),
        ("Lectura de la sonda de cada unidad", "Verificar la sonda que se despacha, en soluciones separadas de pH 7,00 y CE 1.413 µS/cm; enjuagar entre patrones",
         "Siete campos válidos y CRC correcto; pH 7,00 ± 0,3; CE 1.413 ± 200 µS/cm; N, P y K sólo informativos", "R01, R15"),
        ("Tiempo de medición", "Cronometrar 10 mediciones consecutivas con la aplicación",
         "Adquisición y envío ≤ 10 s; ciclo con conexión ≤ 20 s en cada intento", "R03"),
        ("BME280 contra la referencia", "Comparación con termohigrómetro y barómetro patrón",
         "±1,0 °C; ±3 % HR; ±1,0 hPa", "R02"),
        ("LED, buzzer y pulsador PAIR", "Recorrido de los eventos de la filosofía operativa",
         "Tres colores y cinco señales sonoras; ventana de vinculación de 30 ± 1 s", "R12, R13"),
        ("Corte de la sonda", "Tensión en la bornera de la sonda con el equipo encendido y sin medir",
         "Menos de 0,1 V", "R16"),
        ("Carga", "Cargador USB de 1 A; corriente por JP1, tensión de flotación en la bornera de la celda y luz de carga",
         "Corriente de 0,5 A o menos; tensión de flotación de 4,25 V o menos; luz de carga encendida", "R08"),
        ("Aviso de batería baja", "Fuente ajustable: bajar de 3,40 V y subir sobre 3,50 V; comprobar también el aviso de la aplicación",
         "Aviso del equipo al cruzar 3,40 V y rearme sobre 3,50 V; aplicación: aviso al 15 % y rearme sobre 20 %", "R17"),
        ("Estanqueidad por muestreo", "Inmersión de 10 min a 0,5 m (1 de cada 10 unidades y las 5 primeras de cada lote)",
         "Sin ingreso de agua; si la unidad no está en la muestra, se marca «No aplica»", "R09"),
        ("Celda extraíble por muestreo", "Una unidad por lote: desmontar la celda con destornillador y repetir el cierre y el control de estanqueidad",
         "≤ 5 min sin daño; No aplica sólo fuera de la muestra documentada", "R27"),
    ]


def pruebas_sat():
    """Pruebas de aceptacion en sitio (tabla SAT del informe)."""
    return [
        ("Recepción", "Revisión de la etiqueta y de la carga completa", "Número de serie legible y celda cargada", "R08, R23"),
        ("Vinculación", "Con red: PAIR durante 3 s, buscar dentro de la ventana de 30 s y completar el registro",
         "El agricultor queda como administrador; aviso verde sólo si la confirmación llega dentro de la ventana", "R13"),
        ("Primera medición con ubicación", "Medición con la fase fenológica elegida y la ubicación activa",
         "Diez variables y ubicación como texto", "R01, R02, R05"),
        ("Operación sin red", "Con cuenta y equipo previamente registrados: modo avión, reactivar Bluetooth y ubicación, mantener datos y Wi-Fi apagados", "La medición se guarda y queda en cola", "R05"),
        ("Comparación con una muestra de laboratorio", "Muestra del punto medido y cilindro de 100 cm³ para la humedad, enviados a laboratorio (sólo en el piloto)",
         "Registrar el par, los métodos, la humedad gravimétrica y la densidad aparente; aceptación estadística al completar ≥ 30 puntos: RMSE pH ≤ 0,3; RMSE de CE ≤ 10 % o 200 µS/cm; RMSE humedad ≤ 4 puntos; R² ≥ 0,80; intervalo de confianza del 95 % de la pendiente de Passing-Bablok dentro de 0,90–1,10. No aplica fuera del piloto", "R04"),
        ("Alcance BLE", "Equipo cerrado en el suelo: 20 intentos por distancia a 1, 3, 5 y 10 m",
         "20 de 20 lecturas a 1, 3 y 5 m; registrar éxitos a 10 m como objetivo", "R06"),
        ("Sincronización con la nube", "Recuperar la cobertura", "La medición aparece en el historial y en la consola; cola vacía", "R05, R25"),
        ("Aviso de batería", "Estado de batería en la aplicación frente a la tensión medida con voltímetro",
         "Porcentaje coherente con la tensión medida", "R17"),
    ]


def _hoja_protocolo(wb, f, nombre, titulo, cabecera, pruebas, firmas):
    ws = wb.add_worksheet(nombre)
    ws.set_column(0, 0, 5)
    ws.set_column(1, 1, 30)
    ws.set_column(2, 3, 44)
    ws.set_column(4, 4, 14)
    ws.set_column(5, 5, 16)
    ws.set_column(6, 6, 16)
    ws.set_column(7, 7, 30)
    tit = wb.add_format({"bold": True, "font_size": 14, "font_color": "#1F3864"})
    lab = wb.add_format({"bold": True, "border": 1, "bg_color": "#D9E1F2"})
    vac = wb.add_format({"border": 1, "border_color": "#BFBFBF"})
    ws.write(0, 0, titulo, tit)
    for i, c in enumerate(cabecera):
        ws.write(2 + i, 1, c, lab)
        ws.merge_range(2 + i, 2, 2 + i, 3, "", vac)
    fila = 3 + len(cabecera)
    ws.write_row(fila, 0, ["N.º", "Prueba", "Método", "Criterio de aceptación", "Requerimientos", "Valor medido",
                           "Resultado", "Observaciones"], f["tit"])
    ws.set_row(fila, 30)
    for j, (prueba, metodo, criterio, req) in enumerate(pruebas, 1):
        r = fila + j
        ws.write_number(r, 0, j, f["num"])
        ws.write_row(r, 1, [prueba, metodo, criterio], f["txt"])
        ws.write(r, 4, req, f["num"])
        ws.write_row(r, 5, ["", "", ""], vac)
        ws.data_validation(r, 6, r, 6, {"validate": "list", "source": ["Aprueba", "Rechaza", "No aplica"]})
        ws.set_row(r, 45)
    r = fila + len(pruebas) + 1
    ws.write(r, 1, "Resultado global", lab)
    ws.merge_range(r, 2, r, 5, "Aprueba sólo con todas las pruebas aplicables aprobadas, sin casillas pendientes y con firmas. No aplica exige justificación; sólo se admite en muestreo o fuera del piloto.", f["nota"])
    ws.data_validation(r, 6, r, 6, {"validate": "list", "source": ["Aprueba", "Rechaza"]})
    ws.write(r, 6, "", vac)
    ws.set_row(r, 55)
    for k, firma in enumerate(firmas):
        ws.write(r + 3, 1 + 2 * k, "_" * 30)
        ws.write(r + 4, 1 + 2 * k, firma)
    ws.set_landscape()
    ws.fit_to_pages(1, 0)
    ws.repeat_rows(fila)
    return ws


def anexo_e(ruta):
    """Anexo E. Formularios de las pruebas de aceptacion en fabrica (FAT) y en sitio (SAT), uno por hoja."""
    with xlsxwriter.Workbook(ruta) as wb:
        wb.set_properties({"title": "Anexo E. Protocolos FAT y SAT TerraSense", "author": "TerraSense"})
        f = _formatos(wb)
        _hoja_protocolo(wb, f, "FAT", "Prueba de aceptación en fábrica (FAT) — una hoja por unidad",
                        ["Número de serie (15 dígitos)", "Lote de fabricación", "Fecha", "Operador", "Versión de firmware",
                         "Instrumentos y vigencia de calibración", "Lotes de patrones y temperatura", "Acta de ensayos de desarrollo aprobada"],
                        pruebas_fat(), ["Firma del operador", "Firma de control de calidad"])
        _hoja_protocolo(wb, f, "SAT", "Prueba de aceptación en sitio (SAT) — una hoja por equipo instalado",
                        ["Número de serie (15 dígitos)", "Cliente", "Campo y comuna", "Fecha", "Técnico a cargo",
                         "Teléfono, sistema y versión de aplicación", "Instrumentos y patrones", "Acta de campaña pareada (si aplica)"],
                        pruebas_sat(), ["Firma del técnico", "Firma de recepción del cliente"])
        ws = wb.add_worksheet("Instrucciones")
        ws.set_column(0, 0, 110)
        texto = [
            "Uso de los formularios",
            "1. Se completa un formulario FAT por cada unidad, en la estación de ensayo y antes de embalar. El número de serie es el "
            "identificador de 15 dígitos que el equipo informa por USB y que figura en su etiqueta.",
            "2. En «Valor medido» se anota la cifra leída en el instrumento; en «Resultado» se elige Aprueba, Rechaza o No aplica.",
            "3. Una sola prueba rechazada devuelve la unidad a diagnóstico; tras el retrabajo se repite el FAT completo en un formulario nuevo.",
            "4. El SAT se completa en el campo del cliente durante la puesta en marcha y cierra con la firma de recepción.",
            "5. Los formularios se archivan por número de serie: son el registro de trazabilidad de cada unidad.",
            "6. La campaña de laboratorio usa error de CE normalizado: (lectura − referencia) / máximo(0,10 × referencia, 200 µS/cm). "
            "La raíz del promedio de sus cuadrados debe ser ≤ 1. Un solo punto no demuestra R² ni valida la campaña.",
            "7. Las corrientes son objetivos del diseño con reposo ligero. Antes del FAT deben aprobarse el firmware y los ensayos de desarrollo, "
            "incluidos carga completa, temperatura, comunicación prolongada y autonomía; el FAT breve no los reemplaza.",
            "8. Una falla de estanqueidad retiene el lote: investigar la causa, corregir y ampliar la inspección al 100 %. "
            "El muestreo de fábrica no certifica IP67. Registrar las unidades seleccionadas antes del ensayo.",
        ]
        ws.write(0, 0, texto[0], wb.add_format({"bold": True, "font_size": 14, "font_color": "#1F3864"}))
        for i, x in enumerate(texto[1:], 2):
            ws.write(i, 0, x, f["nota"])
            ws.set_row(i, 32)
    return {"fat": len(pruebas_fat()), "sat": len(pruebas_sat())}


# ============================================================ Anexo F
import datetime as _dt

FECHA_CORTE = "2026-10-04"          # estado de avance de la carta
MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def plan_proyecto():
    """Carta Gantt del proyecto: única fuente de fechas para el anexo F y el capítulo IX del informe.

    (EDT, actividad, área, inicio, término, predecesoras, entregable, tipo). Tipo: fase, tarea, hito u
    operacion (la operación comercial empieza dentro del período pero no es parte del proyecto). Las
    fechas anteriores al corte salen del historial de trabajo; las posteriores son planificadas.
    """
    return [
        ("1", "Ingeniería conceptual", "", "2026-08-03", "2026-09-10", "", "", "fase"),
        ("1.1", "Necesidades, requerimientos medibles y filtro de viabilidad", "Gestión", "2026-08-03", "2026-08-14", "", "Requerimientos R01 a R27", "tarea"),
        ("1.2", "Matriz de arquitecturas y selección de componentes base", "Hardware", "2026-08-17", "2026-08-31", "1.1", "Matriz de decisión", "tarea"),
        ("1.3", "Mercado y evaluación económica preliminar", "Gestión", "2026-08-24", "2026-09-04", "1.1", "Dimensionamiento de mercado y flujo preliminar", "tarea"),
        ("1.4", "Ingeniería conceptual cerrada", "Gestión", "2026-09-10", "2026-09-10", "1.2, 1.3", "Informe de ingeniería conceptual", "hito"),
        ("2", "Prototipo de laboratorio y plataforma", "", "2026-08-24", "2026-10-09", "", "", "fase"),
        ("2.1", "Aplicación móvil, base de datos y backoffice en versión base", "Software", "2026-08-24", "2026-09-30", "1.1", "Aplicación y backoffice operativos", "tarea"),
        ("2.2", "Diseño de la placa de laboratorio", "Hardware", "2026-09-07", "2026-09-23", "1.2", "Esquemático y trazado de la placa de laboratorio", "tarea"),
        ("2.3", "Fabricación y envío de la placa de laboratorio", "Hardware", "2026-09-24", "2026-10-09", "2.2", "5 placas de laboratorio", "tarea"),
        ("2.4", "Firmware base con BLE, LED, buzzer y vinculación", "Firmware", "2026-09-21", "2026-10-09", "1.2", "Firmware en ensayo de banco", "tarea"),
        ("2.5", "Ficha y muestra de la sonda", "Hardware", "2026-10-03", "2026-10-03", "1.2", "Manual del fabricante y unidad de muestra", "hito"),
        ("3", "Ingeniería básica y de detalle", "", "2026-09-21", "2026-11-27", "", "", "fase"),
        ("3.1", "Alcance, filosofía operativa y matrices de decisión", "Gestión", "2026-09-21", "2026-10-09", "1.4", "Ingeniería básica", "tarea"),
        ("3.2", "Cotizaciones, flujo de caja y protocolos FAT y SAT", "Gestión", "2026-09-28", "2026-10-09", "1.3", "Anexos A, B y E", "tarea"),
        ("3.3", "Diseño de la placa del instrumento", "Hardware", "2026-10-05", "2026-11-05", "1.4, 2.5", "Esquemático, trazado y archivos de fabricación", "tarea"),
        ("3.4", "Placa del instrumento diseñada", "Hardware", "2026-11-06", "2026-11-06", "3.3", "Revisión de diseño aprobada y pedido emitido", "hito"),
        ("3.5", "CAD e impresión de la carcasa", "Mecánica", "2026-10-12", "2026-11-27", "3.1", "Modelo 3D y carcasa de prueba", "tarea"),
        ("3.6", "Planos de la placa y de la carcasa", "Hardware", "2026-11-09", "2026-11-27", "3.4", "Anexos C y D", "tarea"),
        ("4", "Prototipo funcional", "", "2026-10-26", "2026-12-17", "", "", "fase"),
        ("4.1", "Firmware con lectura Modbus y reposo profundo", "Firmware", "2026-10-26", "2026-12-03", "2.3, 2.4, 2.5", "Firmware que lee la sonda y duerme entre mediciones", "tarea"),
        ("4.2", "Firmware con Modbus y reposo", "Firmware", "2026-12-04", "2026-12-04", "4.1", "1.000 lecturas consecutivas sin error de CRC", "hito"),
        ("4.3", "Pedido de la placa y de los componentes", "Hardware", "2026-11-09", "2026-11-27", "3.4, 3.2", "Placa montada y componentes recibidos", "tarea"),
        ("4.4", "Ensamble y FAT del prototipo", "Calidad", "2026-11-30", "2026-12-04", "4.3, 3.5", "Prototipo armado con FAT aprobado", "tarea"),
        ("4.5", "Calibración con soluciones patrón", "Calidad", "2026-12-07", "2026-12-16", "4.2, 4.4", "Coeficientes de calibración registrados", "tarea"),
        ("4.6", "Prototipo funcional entregado", "Gestión", "2026-12-17", "2026-12-17", "4.5, 3.6", "Prototipo armado, calibrado y con FAT aprobado", "hito"),
        ("5", "Validación y habilitación comercial", "", "2027-01-04", "2027-04-19", "", "", "fase"),
        ("5.1", "Constitución de la empresa y crédito", "Gestión", "2027-01-04", "2027-03-26", "4.6", "Sociedad constituida y crédito desembolsado", "tarea"),
        ("5.2", "Campaña de laboratorio de 30 muestras", "Calidad", "2027-01-11", "2027-02-26", "4.6", "Informe de concordancia con el laboratorio", "tarea"),
        ("5.3", "Ensayo IP67 en laboratorio acreditado", "Calidad", "2027-01-11", "2027-02-05", "4.6", "Informe de ensayo IEC 60529", "tarea"),
        ("5.4", "Conformidad de radio y declaración ante SUBTEL", "Gestión", "2027-01-18", "2027-03-26", "4.6", "Declaración de conformidad con código QR", "tarea"),
        ("5.5", "Puesta en marcha y SAT del piloto", "Calidad", "2027-02-01", "2027-02-25", "4.6", "Equipo instalado en el campo del piloto", "tarea"),
        ("5.6", "SAT del piloto aprobado", "Calidad", "2027-02-26", "2027-02-26", "5.5", "SAT aprobado y firmado", "hito"),
        ("5.7", "Publicación de la aplicación en Google Play y App Store", "Software", "2027-03-01", "2027-03-30", "5.6, 2.1", "Aplicación descargable en ambas tiendas", "tarea"),
        ("5.8", "Aplicación aprobada en las tiendas", "Software", "2027-03-31", "2027-03-31", "5.7", "Versión descargable e instalable", "hito"),
        ("5.9", "Primer lote de producción con FAT", "Calidad", "2027-03-08", "2027-04-16", "5.6, 5.3", "Primer lote con FAT al 100 %", "tarea"),
        ("5.10", "Lanzamiento comercial", "Gestión", "2027-04-19", "2027-04-19", "5.1, 5.2, 5.4, 5.8, 5.9", "Primer lote disponible para la venta", "hito"),
        ("6", "Cierre del proyecto", "", "2027-04-19", "2027-07-30", "", "", "fase"),
        ("6.1", "Ventas y lotes de producción (operación, continúa después del cierre)", "Gestión", "2027-04-19", "2027-07-30", "5.10", "200 equipos vendidos en 2027", "operacion"),
        ("6.2", "Revisión de la placa con lo aprendido en el piloto", "Hardware", "2027-05-03", "2027-07-23", "5.6, 5.10", "Placa revisada y validada", "tarea"),
        ("6.3", "Documentación final y transferencia", "Gestión", "2027-07-26", "2027-07-29", "6.2", "Documentación de fabricación y de operación", "tarea"),
        ("6.4", "Proyecto entregado", "Gestión", "2027-07-30", "2027-07-30", "6.3", "Placa revisada liberada y documentación aceptada", "hito"),
    ]


def _d(iso):
    return _dt.date.fromisoformat(iso)


def _habil(d):
    return d.weekday() < 5


def dias_habiles(desde, hasta):
    """Días hábiles (lunes a viernes, sin feriados) de `desde` a `hasta`, ambos incluidos."""
    n, d = 0, desde
    while d <= hasta:
        n += _habil(d)
        d += _dt.timedelta(days=1)
    return n


def _habil_anterior(d):
    d -= _dt.timedelta(days=1)
    while not _habil(d):
        d -= _dt.timedelta(days=1)
    return d


def _restar_habiles(d, n):
    """Retrocede n días hábiles desde d."""
    while n > 0:
        d = _habil_anterior(d)
        n -= 1
    return d


def holguras():
    """Holgura total en días hábiles por actividad: pasada hacia atrás desde cada hito, que es una fecha comprometida.

    El hito ocurre al inicio de su día: la actividad que lo precede termina, a más tardar, el día hábil
    anterior; ante otra actividad, el día hábil anterior a su inicio más tardío. La ruta crítica son las tareas con holgura cero. No se calcula para las fases ni
    para la operación comercial.
    """
    plan = [p for p in plan_proyecto() if p[7] in ("tarea", "hito")]
    por_edt = {p[0]: p for p in plan}
    sucesores = {e: [] for e in por_edt}
    for p in plan:
        for pre in filter(None, (x.strip() for x in p[5].split(","))):
            if pre in sucesores:
                sucesores[pre].append(p[0])
    fin_proyecto = max(_d(p[4]) for p in plan)
    tarde = {}

    def termino_tardio(edt):
        if edt in tarde:
            return tarde[edt]
        p = por_edt[edt]
        if p[7] == "hito":
            lf = _d(p[3])
        else:
            limites = []
            for s in sucesores[edt]:
                ps = por_edt[s]
                if ps[7] == "hito":
                    limites.append(_habil_anterior(termino_tardio(s)))
                else:
                    inicio_tardio = _restar_habiles(termino_tardio(s), dias_habiles(_d(ps[3]), _d(ps[4])) - 1)
                    limites.append(_habil_anterior(inicio_tardio))
            lf = min(limites) if limites else fin_proyecto
        tarde[edt] = lf
        return lf

    out = {}
    for edt, p in por_edt.items():
        if p[7] != "tarea":
            continue
        lf, fin = termino_tardio(edt), _d(p[4])
        out[edt] = dias_habiles(fin + _dt.timedelta(days=1), lf) if lf >= fin else -dias_habiles(lf + _dt.timedelta(days=1), fin)
    return out


def estado(p, corte=FECHA_CORTE):
    ini, fin, c = _d(p[3]), _d(p[4]), _d(corte)
    if fin < c or (p[7] == "hito" and fin <= c):
        return "Terminada" if p[7] != "hito" else "Cumplido"
    if ini <= c:
        return "En curso"
    return "Pendiente"


def meses_gantt():
    """Agosto de 2026 a julio de 2027, mes a mes; el encabezado los agrupa por trimestre."""
    plan = plan_proyecto()
    ini, fin = min(_d(p[3]) for p in plan), max(_d(p[4]) for p in plan)
    meses, a, m = [], ini.year, ini.month
    while (a, m) <= (fin.year, fin.month):
        meses.append((a, m))
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return meses


def fecha_texto(iso):
    d = _d(iso)
    return "%02d-%02d-%d" % (d.day, d.month, d.year)


def anexo_f(ruta):
    """Anexo F. Carta Gantt industrial por trimestres y meses, con EDT, holgura, ruta crítica e hitos."""
    plan, meses, hol = plan_proyecto(), meses_gantt(), holguras()
    corte = _d(FECHA_CORTE)
    with xlsxwriter.Workbook(ruta) as wb:
        wb.set_properties({"title": "Anexo F. Carta Gantt TerraSense", "author": "TerraSense"})
        f = _formatos(wb)
        borde = {"border": 1, "border_color": "#BFBFBF"}
        tit = wb.add_format({"bold": True, "font_size": 15, "font_color": "#1F3864"})
        dato = wb.add_format({"font_color": "#404040"})
        fase_txt = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1, "valign": "vcenter"})
        fase_ctr = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1, "align": "center", "valign": "vcenter"})
        txt = wb.add_format(dict(borde, text_wrap=True, valign="vcenter"))
        ctr = wb.add_format(dict(borde, align="center", valign="vcenter", text_wrap=True))
        hito_txt = wb.add_format(dict(borde, bold=True, text_wrap=True, valign="vcenter"))
        anio_f = wb.add_format({"bold": True, "bg_color": "#1F3864", "font_color": "#FFFFFF", "border": 1, "align": "center"})
        mes_f = wb.add_format({"bold": True, "bg_color": "#2F5597", "font_color": "#FFFFFF", "border": 1, "align": "center"})
        mes_corte = wb.add_format({"bold": True, "bg_color": "#C00000", "font_color": "#FFFFFF", "border": 1, "align": "center"})
        vacia = wb.add_format(borde)
        vacia_corte = wb.add_format({"border": 1, "border_color": "#BFBFBF", "left": 2, "left_color": "#C00000", "right": 2, "right_color": "#C00000"})
        barra = {
            "fase": wb.add_format({"bg_color": "#1F3864", "border": 1, "border_color": "#FFFFFF"}),
            "terminada": wb.add_format({"bg_color": "#A6A6A6", "border": 1, "border_color": "#FFFFFF"}),
            "critica": wb.add_format({"bg_color": "#C00000", "border": 1, "border_color": "#FFFFFF"}),
            "normal": wb.add_format({"bg_color": "#2F75B5", "border": 1, "border_color": "#FFFFFF"}),
            "operacion": wb.add_format({"bg_color": "#A9D08E", "pattern": 1, "border": 1, "border_color": "#FFFFFF"}),
        }
        hito_f = wb.add_format({"bold": True, "align": "center", "valign": "vcenter", "font_size": 12, **borde})
        hito_hecho = wb.add_format({"bold": True, "align": "center", "valign": "vcenter", "font_size": 12, "font_color": "#7F7F7F", **borde})

        ws = wb.add_worksheet("Carta Gantt")
        cab = ["EDT", "Actividad", "Área responsable", "Inicio", "Término", "Duración (días hábiles)", "Predecesoras",
               "Entregable", "Estado al %s" % fecha_texto(FECHA_CORTE), "Holgura (días hábiles)", "Ruta crítica"]
        anchos = [6, 46, 13, 11, 11, 10, 12, 34, 12, 10, 8]
        for i, w in enumerate(anchos):
            ws.set_column(i, i, w)
        c0 = len(cab)
        ws.set_column(c0, c0 + len(meses) - 1, 6.5)
        ws.write(0, 0, "Carta Gantt del proyecto TerraSense", tit)
        ws.write(1, 0, "Período: %s de %d a %s de %d, por trimestres y meses. Fecha de corte del avance: %s."
                 % (MESES_LARGOS[meses[0][1] - 1], meses[0][0], MESES_LARGOS[meses[-1][1] - 1], meses[-1][0], fecha_texto(FECHA_CORTE)), dato)
        fila_anio, fila_mes = 3, 4
        for i, c in enumerate(cab):
            ws.merge_range(fila_anio, i, fila_mes, i, c, f["tit"])
        trimestre = lambda a, m: "Q%d %d" % ((m - 1) // 3 + 1, a)
        j = 0
        while j < len(meses):
            k = j
            while k + 1 < len(meses) and trimestre(*meses[k + 1]) == trimestre(*meses[j]):
                k += 1
            if k > j:
                ws.merge_range(fila_anio, c0 + j, fila_anio, c0 + k, trimestre(*meses[j]), anio_f)
            else:
                ws.write(fila_anio, c0 + j, trimestre(*meses[j]), anio_f)
            j = k + 1
        for j, (a, m) in enumerate(meses):
            ws.write(fila_mes, c0 + j, MESES_ES[m - 1].capitalize(), mes_corte if (a, m) == (corte.year, corte.month) else mes_f)
        ws.set_row(fila_anio, 18)
        ws.set_row(fila_mes, 30)
        r = fila_mes + 1
        for p in plan:
            edt, nombre, area, ini, fin, pre, entregable, tipo = p
            di, df = _d(ini), _d(fin)
            if tipo == "fase":
                ws.write(r, 0, edt, fase_ctr)
                ws.merge_range(r, 1, r, 2, nombre, fase_txt)
                ws.write(r, 3, fecha_texto(ini), fase_ctr)
                ws.write(r, 4, fecha_texto(fin), fase_ctr)
                ws.write(r, 5, dias_habiles(di, df), fase_ctr)
                for c in range(6, c0):
                    ws.write(r, c, "", fase_txt)
            else:
                est = estado(p)
                ws.write(r, 0, edt, ctr)
                ws.write(r, 1, ("◆ " if tipo == "hito" else "") + nombre, hito_txt if tipo == "hito" else txt)
                ws.write(r, 2, area, ctr)
                ws.write(r, 3, fecha_texto(ini), ctr)
                ws.write(r, 4, fecha_texto(fin), ctr)
                ws.write(r, 5, 0 if tipo == "hito" else dias_habiles(di, df), ctr)
                ws.write(r, 6, pre or "—", ctr)
                ws.write(r, 7, entregable, txt)
                ws.write(r, 8, "Operación" if tipo == "operacion" else est, ctr)
                h = hol.get(edt)
                ws.write(r, 9, "—" if h is None or est == "Terminada" else h, ctr)
                ws.write(r, 10, "Sí" if h == 0 and est != "Terminada" else ("Hito" if tipo == "hito" else "No"), ctr)
            for j, (a, m) in enumerate(meses):
                inicio_mes = _dt.date(a, m, 1)
                fin_mes = (_dt.date(a + (m == 12), m % 12 + 1, 1) - _dt.timedelta(days=1))
                en_corte = (a, m) == (corte.year, corte.month)
                activa = di <= fin_mes and df >= inicio_mes
                if tipo == "hito":
                    if activa:
                        ws.write(r, c0 + j, "◆ %d" % df.day, hito_hecho if estado(p) == "Cumplido" else hito_f)
                    else:
                        ws.write(r, c0 + j, "", vacia_corte if en_corte else vacia)
                elif activa:
                    if tipo == "fase":
                        clave = "fase"
                    elif tipo == "operacion":
                        clave = "operacion"
                    elif estado(p) == "Terminada":
                        clave = "terminada"
                    else:
                        clave = "critica" if hol.get(edt) == 0 else "normal"
                    ws.write(r, c0 + j, "", barra[clave])
                else:
                    ws.write(r, c0 + j, "", vacia_corte if en_corte else vacia)
            ws.set_row(r, 22 if tipo == "fase" else 30)
            r += 1
        r += 1
        ws.write(r, 1, "Simbología", wb.add_format({"bold": True}))
        leyenda = [("terminada", "Actividad terminada a la fecha de corte"), ("critica", "Ruta crítica: holgura cero frente a un hito comprometido"),
                   ("normal", "Actividad con holgura"), ("fase", "Fase (resumen de sus actividades)"),
                   ("operacion", "Operación comercial: empieza dentro del período, no forma parte del proyecto")]
        for k, (clave, texto) in enumerate(leyenda, 1):
            ws.write(r + k, c0, "", barra[clave])
            ws.write(r + k, 1, texto)
        ws.write(r + len(leyenda) + 1, c0, "◆", hito_f)
        ws.write(r + len(leyenda) + 1, 1, "Hito con su día del mes; en gris, hito cumplido")
        ws.write(r + len(leyenda) + 2, c0, "", vacia_corte)
        ws.write(r + len(leyenda) + 2, 1, "Mes de la fecha de corte (encabezado en rojo)")
        ws.freeze_panes(fila_mes + 1, 2)
        ws.set_landscape()
        ws.set_paper(8)
        ws.fit_to_pages(1, 0)
        ws.repeat_rows(fila_anio, fila_mes)

        wh = wb.add_worksheet("Hitos")
        wh.set_column(0, 0, 6)
        wh.set_column(1, 1, 46)
        wh.set_column(2, 3, 12)
        wh.set_column(4, 4, 50)
        wh.set_column(5, 5, 12)
        wh.write(0, 0, "Hitos del proyecto", tit)
        wh.write_row(2, 0, ["EDT", "Hito", "Fecha", "Responsable", "Criterio de cumplimiento", "Estado"], f["tit"])
        hitos = [p for p in plan if p[7] == "hito"]
        for k, p in enumerate(hitos, 3):
            wh.write_row(k, 0, [p[0], p[1], fecha_texto(p[3]), p[2], p[6], estado(p)], txt)
            wh.set_row(k, 30)

        wn = wb.add_worksheet("Método")
        wn.set_column(0, 0, 120)
        notas = [
            "Cómo se construyó la carta",
            "1. La carta cubre el proyecto, no el curso: no incluye evaluaciones. Parte en agosto de 2026 y termina con la entrega del proyecto en julio de 2027. Se organiza por trimestres (Q3 de 2026 a Q3 de 2027) y, dentro de cada uno, por mes.",
            "2. Las fechas anteriores al corte (%s) registran lo ejecutado; las posteriores son planificadas y se revisan en cada corte." % fecha_texto(FECHA_CORTE),
            "3. La duración y la holgura se cuentan en días hábiles de lunes a viernes, sin descontar feriados.",
            "4. Los hitos son fechas comprometidas y ocurren al inicio de su día. La holgura total de cada actividad se calcula hacia atrás desde el hito o la actividad que la sigue: debe terminar, a más tardar, el día hábil anterior al hito o al inicio más tardío de la actividad siguiente.",
            "5. La ruta crítica son las actividades con holgura cero: cualquier atraso en ellas mueve un hito. Las actividades terminadas no tienen holgura.",
            "6. La entrega del prototipo funcional, el %s, es el hito fijo del proyecto." % fecha_texto(next(p[3] for p in plan if p[1].startswith("Prototipo funcional entregado"))),
            "7. La operación comercial (ventas y lotes) empieza con el lanzamiento y continúa después del cierre; se muestra para situarla, pero no forma parte del alcance del proyecto.",
        ]
        wn.write(0, 0, notas[0], tit)
        for k, x in enumerate(notas[1:], 2):
            wn.write(k, 0, x, f["nota"])
            wn.set_row(k, 32)
    return {"actividades": sum(p[7] in ("tarea", "operacion") for p in plan), "hitos": sum(p[7] == "hito" for p in plan), "meses": len(meses)}


# ============================================================ Anexo B
def _nomina_por_cargo(anio):
    """Reparte la nomina del modelo por cargo: (administracion, comercializacion, produccion), cada una (costo, beneficios)."""
    d = S["dotacion_por_anio"][str(anio)]
    f = M.infl(anio)
    fe = M.factor_empleador(anio)
    ben = (S["colacion_mensual"] + S["movilizacion_mensual"]) * f * 12
    adm = ((d["socios"] * M.sueldo_socio(anio) + d["contador"] * S["sueldo_contador"] * f) * fe * 12, (d["socios"] + d["contador"]) * ben)
    com = (d["marketing"] * S["sueldo_marketing"] * f * fe * 12, d["marketing"] * ben)
    pro = (d["ensambladores"] * S["sueldo_ensamblador"] * f * fe * 12, d["ensambladores"] * ben)
    return adm, com, pro


def reagrupacion(r):
    """Por anio: costos operacionales (hoja 4), administracion (5) y comercializacion (6), y su suma."""
    out = []
    for fila in r["filas"]:
        a = fila["anio"]
        g = fila["gastos"]
        adm, com, pro = _nomina_por_cargo(a)
        c_oper = fila["variables"] + pro[0] + pro[1]
        c_adm = adm[0] + adm[1] + g["arriendo"] + g["servicios"] + g["patente"] + g["software"] + g["materiales"] + g["mantencion"]
        c_com = com[0] + com[1] + g["pauta"]
        out.append({"anio": a, "operacionales": c_oper, "administracion": c_adm, "comercializacion": c_com,
                    "total": c_oper + c_adm + c_com, "costo_total_modelo": fila["costo_total"]})
    return out


class _Libro:
    def __init__(self, wb):
        self.wb = wb
        self.ws = {}
        self.fila = {}   # (hoja, clave) -> fila 0-based
        self.col0 = {}   # hoja -> columna 0-based del primer anio
        self.nombre = {}
        fm = {}
        fm["tit"] = wb.add_format({"bold": True, "font_size": 14, "font_color": "#1F3864"})
        fm["enc"] = wb.add_format({"bold": True, "bg_color": "#1F3864", "font_color": "#FFFFFF", "border": 1, "align": "center",
                                   "valign": "vcenter", "text_wrap": True})
        fm["encl"] = wb.add_format({"bold": True, "bg_color": "#1F3864", "font_color": "#FFFFFF", "border": 1, "valign": "vcenter", "text_wrap": True})
        fm["lab"] = wb.add_format({"border": 1, "border_color": "#BFBFBF", "text_wrap": True, "valign": "top"})
        fm["labb"] = wb.add_format({"border": 1, "bold": True, "bg_color": "#D9E1F2", "text_wrap": True})
        fm["clp"] = wb.add_format({"num_format": CLP, "border": 1, "border_color": "#BFBFBF"})
        fm["clpb"] = wb.add_format({"num_format": CLP, "border": 1, "bold": True, "bg_color": "#D9E1F2"})
        fm["clpi"] = wb.add_format({"num_format": CLP, "border": 1, "border_color": "#BFBFBF", "font_color": "#0000FF"})
        fm["n0"] = wb.add_format({"num_format": "#,##0", "border": 1, "border_color": "#BFBFBF"})
        fm["n0i"] = wb.add_format({"num_format": "#,##0", "border": 1, "border_color": "#BFBFBF", "font_color": "#0000FF"})
        fm["n0b"] = wb.add_format({"num_format": "#,##0", "border": 1, "bold": True, "bg_color": "#D9E1F2"})
        fm["n2"] = wb.add_format({"num_format": "0.000", "border": 1, "border_color": "#BFBFBF"})
        fm["n2i"] = wb.add_format({"num_format": "0.0000", "border": 1, "border_color": "#BFBFBF", "font_color": "#0000FF"})
        fm["pct"] = wb.add_format({"num_format": PCT, "border": 1, "border_color": "#BFBFBF"})
        fm["pcti"] = wb.add_format({"num_format": "0.00%", "border": 1, "border_color": "#BFBFBF", "font_color": "#0000FF"})
        fm["pctb"] = wb.add_format({"num_format": "0.00%", "border": 1, "bold": True, "bg_color": "#D9E1F2"})
        fm["anio"] = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1, "align": "center", "num_format": "0"})
        fm["nota"] = wb.add_format({"italic": True, "text_wrap": True, "valign": "top", "font_color": "#595959"})
        fm["dec"] = wb.add_format({"num_format": "0.00", "border": 1, "bold": True, "bg_color": "#D9E1F2"})
        fm["txt"] = wb.add_format({"border": 1, "border_color": "#BFBFBF", "text_wrap": True, "valign": "top"})
        self.f = fm

    def hoja(self, clave, nombre, titulo, ancho_a=58, anio_col0=1, nota=None):
        ws = self.wb.add_worksheet(nombre)
        self.ws[clave] = ws
        self.nombre[clave] = nombre
        self.col0[clave] = anio_col0
        ws.set_column(0, 0, ancho_a)
        ws.set_column(1, 14, 16)
        ws.write(0, 0, titulo, self.f["tit"])
        if nota:
            ws.merge_range(1, 0, 1, 8, nota, self.f["nota"])
            ws.set_row(1, 32)
        return ws

    def ref(self, clave, fila_clave, i=None, col=None, abs_=False, hoja=True):
        """Referencia A1 a la celda (hoja, fila_clave) del anio i (o columna absoluta col)."""
        r = self.fila[(clave, fila_clave)]
        c = self.col0[clave] + i if i is not None else col
        a1 = xl_rowcol_to_cell(r, c, row_abs=abs_, col_abs=abs_)
        return ("'%s'!%s" % (self.nombre[clave], a1)) if hoja else a1

    def rango(self, clave, fila_clave, i0, i1, hoja=True):
        r = self.fila[(clave, fila_clave)]
        a = xl_rowcol_to_cell(r, self.col0[clave] + i0)
        b = xl_rowcol_to_cell(r, self.col0[clave] + i1)
        return ("'%s'!%s:%s" % (self.nombre[clave], a, b)) if hoja else "%s:%s" % (a, b)


def _encabezado_anios(L, clave, fila, texto="Concepto", total=True, extra=None):
    ws = L.ws[clave]
    ws.write(fila, 0, texto, L.f["encl"])
    c0 = L.col0[clave]
    for i, a in enumerate(ANIOS):
        ws.write_number(fila, c0 + i, a, L.f["enc"])
    if total:
        ws.write(fila, c0 + len(ANIOS), "Total", L.f["enc"])
    ws.set_row(fila, 22)


def _serie(L, clave, fila, key, etiqueta, formulas, valores, fmt="clp", total=False, bold=False, entradas=False):
    """Escribe una fila anual. formulas: lista de str con '=' (o None si es entrada). Valor en cache siempre."""
    ws = L.ws[clave]
    L.fila[(clave, key)] = fila
    ws.write(fila, 0, etiqueta, L.f["labb"] if bold else L.f["lab"])
    c0 = L.col0[clave]
    for i, v in enumerate(valores):
        fm = L.f[fmt + "b"] if bold and (fmt + "b") in L.f else L.f[fmt]
        if formulas is None:
            ws.write_number(fila, c0 + i, v, L.f[fmt + "i"] if (fmt + "i") in L.f else L.f[fmt])
        else:
            ws.write_formula(fila, c0 + i, formulas[i], fm, v)
    if total:
        a = xl_rowcol_to_cell(fila, c0)
        b = xl_rowcol_to_cell(fila, c0 + len(valores) - 1)
        ws.write_formula(fila, c0 + len(valores), "=SUM(%s:%s)" % (a, b), L.f["clpb" if bold else "clp"] if fmt == "clp" else L.f["n0b" if bold else "n0"],
                         sum(valores))


def _param(L, clave, fila, key, etiqueta, valor, fmt, formula=None, col=1):
    ws = L.ws[clave]
    L.fila[(clave, key)] = fila
    ws.write(fila, 0, etiqueta, L.f["lab"])
    if formula:
        ws.write_formula(fila, col, formula, L.f[fmt.rstrip("i")], valor)
    else:
        ws.write_number(fila, col, valor, L.f[fmt])


def planilla_flujo(r, ruta, nombre_hojas=None):
    """Anexo B. Flujo de caja: doce hojas independientes enlazadas por formulas con valor en cache."""
    filas = r["filas"]
    N = len(filas)
    ind = M.resumen(r)
    inv = r["inversion"]
    re = reagrupacion(r)
    infl_f = [M.infl(a) for a in ANIOS]
    q = [f["unidades"] for f in filas]
    assert all(v[3] == 5 for v in S["equipamiento"]), "la hoja de depreciacion supone vida util de 5 anios"

    with xlsxwriter.Workbook(ruta) as wb:
        wb.set_properties({"title": "Anexo B. Flujo de caja TerraSense", "subject": "Flujo de caja y financiamiento a 10 años",
                           "author": "TerraSense"})
        L = _Libro(wb)
        N_ = {"resumen": "1 Resumen", "inv": "2 Inversión", "ventas": "3 Ventas", "oper": "4 Costos operacionales",
              "adm": "5 Gastos de administración", "com": "6 Gastos de comercialización", "fin": "7 Financiamiento",
              "cf": "8 Costo financiero", "dep": "9 Depreciación", "amo": "10 Amortización",
              "er": "11 Estado de resultados", "fc": "12 Flujo de caja"}
        T = {
            "resumen": "Resumen de indicadores", "inv": "Inversión inicial", "ventas": "Ventas", "oper": "Costos operacionales",
            "adm": "Gastos de administración", "com": "Gastos de comercialización", "fin": "Financiamiento",
            "cf": "Costo financiero", "dep": "Depreciación del activo fijo", "amo": "Amortización del activo nominal",
            "er": "Estado de resultados", "fc": "Flujo de caja",
        }
        # Se crean las hojas en el orden pedido y se llenan en orden de dependencia
        for k in ("resumen", "inv", "ventas", "oper", "adm", "com", "fin", "cf", "dep", "amo", "er", "fc"):
            L.hoja(k, N_[k], T[k], anio_col0=1)
        L.col0["fc"] = 2  # columna B de la hoja 12 es el año 0
        L.col0["fin"] = 1

        # ---------------------------------------------------------- 3 Ventas
        k = "ventas"
        ws = L.ws[k]
        _param(L, k, 2, "inflacion", "Inflación anual", S["inflacion"], "pcti")
        _param(L, k, 3, "anio0", "Año base", ANIOS[0], "n0i")
        _param(L, k, 4, "precio0", "Precio neto base de %d (derivado del costo total con %d %% de utilidad)" % (ANIOS[0], round(S["margen_objetivo"] * 100)),
               r["precio_neto_base"], "clpi")
        _param(L, k, 5, "iva", "IVA", S["iva"], "pcti")
        _encabezado_anios(L, k, 7)
        _serie(L, k, 8, "factor", "Factor de inflación acumulada",
               ["=(1+$B$3)^(%s-$B$4)" % xl_rowcol_to_cell(7, 1 + i) for i in range(N)], infl_f, fmt="n2")
        _serie(L, k, 9, "unid", "Equipos vendidos", None, q, fmt="n0")
        ws.write_formula(9, 1 + N, "=SUM(B10:%s10)" % xl_col_to_name(N), L.f["n0"], sum(q))
        _serie(L, k, 10, "precio", "Precio neto por equipo", ["=$B$5*%s" % xl_rowcol_to_cell(8, 1 + i) for i in range(N)],
               [f["precio_neto"] for f in filas])
        _serie(L, k, 11, "lista", "Precio de lista con IVA", ["=%s*(1+$B$6)" % xl_rowcol_to_cell(10, 1 + i) for i in range(N)],
               [f["precio_neto"] * (1 + S["iva"]) for f in filas])
        _serie(L, k, 12, "ventas", "Ventas netas", ["=%s*%s" % (xl_rowcol_to_cell(9, 1 + i), xl_rowcol_to_cell(10, 1 + i)) for i in range(N)],
               [f["ventas"] for f in filas], total=True, bold=True)
        ws.merge_range(14, 0, 14, 8, "El precio no es un dato de entrada: se deriva del costo total del horizonte exigiendo la utilidad indicada, "
                       "y se reajusta cada año por inflación. Las unidades son el plan de ventas.", L.f["nota"])
        ws.set_row(14, 30)

        # ------------------------------------------------ 4 Costos operacionales
        k = "oper"
        ws = L.ws[k]
        _param(L, k, 2, "bom", "Costo de materiales (BOM) por equipo, neto, pesos de %d" % ANIOS[0], M.BOM, "clpi")
        _param(L, k, 3, "merma", "Merma de fabricación sobre la BOM", S["merma_fraccion_bom"], "pcti")
        _param(L, k, 4, "garantia", "Provisión de reposiciones y garantía sobre la BOM", S["garantia_fraccion_bom"], "pcti")
        _param(L, k, 5, "envio", "Envío al cliente por equipo, neto", S["envio_neto_por_equipo"], "clpi")
        _param(L, k, 6, "comision", "Comisión comercial sobre el precio de lista", S["comision_sobre_bruto"], "pcti")
        _param(L, k, 7, "var0", "Costo variable por equipo antes de comisión, %d" % ANIOS[0], M.VAR_UNIT, "clp",
               formula="=B3*(1+B4+B5)+B6")
        _param(L, k, 8, "sens", "Sueldo bruto mensual del ensamblador, pesos de %d" % ANIOS[0], S["sueldo_ensamblador"], "clpi")
        _param(L, k, 9, "benef", "Colación y movilización mensuales por persona", S["colacion_mensual"] + S["movilizacion_mensual"], "clpi")
        _encabezado_anios(L, k, 11)
        V = lambda key, i: L.ref("ventas", key, i)
        _serie(L, k, 12, "unid", "Equipos vendidos", ["=%s" % V("unid", i) for i in range(N)], q, fmt="n0")
        _serie(L, k, 13, "factor", "Factor de inflación acumulada", ["=%s" % V("factor", i) for i in range(N)], infl_f, fmt="n2")
        mat = [M.BOM * (1 + S["merma_fraccion_bom"] + S["garantia_fraccion_bom"]) * infl_f[i] * q[i] for i in range(N)]
        env = [S["envio_neto_por_equipo"] * infl_f[i] * q[i] for i in range(N)]
        com = [S["comision_sobre_bruto"] * filas[i]["precio_neto"] * (1 + S["iva"]) * q[i] for i in range(N)]
        c = lambda row, i: xl_rowcol_to_cell(row, 1 + i)
        _serie(L, k, 14, "mat", "Materiales (BOM) con merma y garantía",
               ["=$B$3*(1+$B$4+$B$5)*%s*%s" % (c(13, i), c(12, i)) for i in range(N)], mat, total=True)
        _serie(L, k, 15, "env", "Envío al cliente", ["=$B$6*%s*%s" % (c(13, i), c(12, i)) for i in range(N)], env, total=True)
        _serie(L, k, 16, "com", "Comisión comercial", ["=$B$7*%s*(1+%s)*%s" % (V("precio", i), "'%s'!$B$6" % N_["ventas"], c(12, i)) for i in range(N)],
               com, total=True)
        vt = [mat[i] + env[i] + com[i] for i in range(N)]
        _serie(L, k, 17, "var", "Subtotal costos variables", ["=SUM(%s:%s)" % (c(14, i), c(16, i)) for i in range(N)], vt, total=True, bold=True)
        d_ens = [S["dotacion_por_anio"][str(a)]["ensambladores"] for a in ANIOS]
        _serie(L, k, 18, "ens", "Ensambladores (personas)", None, d_ens, fmt="n0")
        fe = [M.factor_empleador(a) for a in ANIOS]
        _serie(L, k, 19, "fe", "Factor de costo del empleador sobre el sueldo bruto", None, fe, fmt="n2")
        lab_ens = [_nomina_por_cargo(a)[2][0] for a in ANIOS]
        ben_ens = [_nomina_por_cargo(a)[2][1] for a in ANIOS]
        _serie(L, k, 20, "lab", "Remuneraciones de producción (ensambladores): sueldo × factor × 12",
               ["=%s*$B$9*%s*%s*12" % (c(18, i), c(13, i), c(19, i)) for i in range(N)], lab_ens, total=True)
        _serie(L, k, 21, "ben", "Colación y movilización de producción",
               ["=%s*$B$10*%s*12" % (c(18, i), c(13, i)) for i in range(N)], ben_ens, total=True)
        tot_oper = [re[i]["operacionales"] for i in range(N)]
        _serie(L, k, 22, "total", "TOTAL COSTOS OPERACIONALES", ["=%s+%s+%s" % (c(17, i), c(20, i), c(21, i)) for i in range(N)],
               tot_oper, total=True, bold=True)
        ws.merge_range(24, 0, 24, 8, "Costos que existen porque se produce y se vende: materiales, envío, comisión y la remuneración del personal de ensamble. "
                       "El costo de materiales por equipo es el total de la hoja del producto del anexo A.", L.f["nota"])
        ws.set_row(24, 30)

        # ------------------------------------------- 5 Gastos de administración
        k = "adm"
        ws = L.ws[k]
        _param(L, k, 2, "arr", "Arriendo mensual de la oficina, pesos de %d" % ANIOS[0], S["arriendo_oficina"], "clpi")
        _param(L, k, 3, "con", "Servicios básicos mensuales con oficina", S["servicios_basicos_con_oficina"], "clpi")
        _param(L, k, 4, "sin", "Servicios básicos mensuales sin oficina", S["servicios_basicos_sin_oficina"], "clpi")
        _param(L, k, 5, "pat", "Patente comercial anual", S["patente_comercial_anual"], "clpi")
        _param(L, k, 6, "soft", "Software y servicios en la nube, mensual", S["softwares_cloud"], "clpi")
        _param(L, k, 7, "mat", "Materiales de oficina, mensual", S["materiales_oficina"], "clpi")
        _param(L, k, 8, "mant", "Mantención de equipos, mensual", S["mantencion_equipos"], "clpi")
        _param(L, k, 9, "sc", "Sueldo bruto mensual del contador, pesos de %d" % ANIOS[0], S["sueldo_contador"], "clpi")
        _param(L, k, 10, "benef", "Colación y movilización mensuales por persona", S["colacion_mensual"] + S["movilizacion_mensual"], "clpi")
        _encabezado_anios(L, k, 12)
        _serie(L, k, 13, "factor", "Factor de inflación acumulada", ["=%s" % V("factor", i) for i in range(N)], infl_f, fmt="n2")
        dd = [S["dotacion_por_anio"][str(a)] for a in ANIOS]
        _serie(L, k, 14, "soc", "Socios (personas)", None, [x["socios"] for x in dd], fmt="n0")
        _serie(L, k, 15, "ssoc", "Sueldo bruto mensual por socio (escala por escalones)", None, [M.sueldo_socio(a) for a in ANIOS])
        _serie(L, k, 16, "cont", "Contador (personas)", None, [x["contador"] for x in dd], fmt="n0")
        _serie(L, k, 17, "fe", "Factor de costo del empleador sobre el sueldo bruto", None, fe, fmt="n2")
        adm_lab = [_nomina_por_cargo(a)[0][0] for a in ANIOS]
        adm_ben = [_nomina_por_cargo(a)[0][1] for a in ANIOS]
        a_ = lambda row, i: xl_rowcol_to_cell(row, 1 + i)
        _serie(L, k, 18, "lab", "Remuneraciones de administración (socios y contador): sueldo × factor × 12",
               ["=(%s*%s+%s*$B$10*%s)*%s*12" % (a_(14, i), a_(15, i), a_(16, i), a_(13, i), a_(17, i)) for i in range(N)], adm_lab, total=True)
        _serie(L, k, 19, "ben", "Colación y movilización de administración",
               ["=(%s+%s)*$B$11*%s*12" % (a_(14, i), a_(16, i), a_(13, i)) for i in range(N)], adm_ben, total=True)
        _serie(L, k, 20, "of", "Oficina (1 = sí, 0 = no)", None, [1 if x["oficina"] else 0 for x in dd], fmt="n0")
        gs = [f["gastos"] for f in filas]
        _serie(L, k, 21, "arr", "Arriendo de oficina", ["=$B$3*%s*%s*12" % (a_(20, i), a_(13, i)) for i in range(N)], [g["arriendo"] for g in gs], total=True)
        _serie(L, k, 22, "serv", "Servicios básicos", ["=IF(%s=1,$B$4,$B$5)*%s*12" % (a_(20, i), a_(13, i)) for i in range(N)], [g["servicios"] for g in gs], total=True)
        _serie(L, k, 23, "pat", "Patente comercial", ["=$B$6*%s" % a_(13, i) for i in range(N)], [g["patente"] for g in gs], total=True)
        _serie(L, k, 24, "soft", "Software y servicios en la nube", ["=$B$7*%s*12" % a_(13, i) for i in range(N)], [g["software"] for g in gs], total=True)
        _serie(L, k, 25, "mat", "Materiales de oficina", ["=$B$8*%s*12" % a_(13, i) for i in range(N)], [g["materiales"] for g in gs], total=True)
        _serie(L, k, 26, "mant", "Mantención de equipos", ["=$B$9*%s*12" % a_(13, i) for i in range(N)], [g["mantencion"] for g in gs], total=True)
        tot_adm = [re[i]["administracion"] for i in range(N)]
        _serie(L, k, 27, "total", "TOTAL GASTOS DE ADMINISTRACIÓN",
               ["=%s+%s+SUM(%s:%s)" % (a_(18, i), a_(19, i), a_(21, i), a_(26, i)) for i in range(N)], tot_adm, total=True, bold=True)
        ws.merge_range(29, 0, 29, 8, "Dirección de la empresa (los dos socios), contabilidad, oficina, servicios, patente, software, materiales y mantención.", L.f["nota"])

        # ---------------------------------- 6 Gastos de comercialización
        k = "com"
        ws = L.ws[k]
        _param(L, k, 2, "sm", "Sueldo bruto mensual de marketing, pesos de %d" % ANIOS[0], S["sueldo_marketing"], "clpi")
        _param(L, k, 3, "benef", "Colación y movilización mensuales por persona", S["colacion_mensual"] + S["movilizacion_mensual"], "clpi")
        _param(L, k, 4, "pauta", "Publicidad por equipo vendido, pesos de %d" % ANIOS[0], S["pauta_por_equipo"], "clpi")
        _encabezado_anios(L, k, 6)
        _serie(L, k, 7, "factor", "Factor de inflación acumulada", ["=%s" % V("factor", i) for i in range(N)], infl_f, fmt="n2")
        _serie(L, k, 8, "unid", "Equipos vendidos", ["=%s" % V("unid", i) for i in range(N)], q, fmt="n0")
        _serie(L, k, 9, "mk", "Marketing (personas)", None, [x["marketing"] for x in dd], fmt="n0")
        _serie(L, k, 10, "fe", "Factor de costo del empleador sobre el sueldo bruto", None, fe, fmt="n2")
        c_ = lambda row, i: xl_rowcol_to_cell(row, 1 + i)
        com_lab = [_nomina_por_cargo(a)[1][0] for a in ANIOS]
        com_ben = [_nomina_por_cargo(a)[1][1] for a in ANIOS]
        _serie(L, k, 11, "lab", "Remuneraciones comerciales: sueldo × factor × 12",
               ["=%s*$B$3*%s*%s*12" % (c_(9, i), c_(7, i), c_(10, i)) for i in range(N)], com_lab, total=True)
        _serie(L, k, 12, "ben", "Colación y movilización comerciales", ["=%s*$B$4*%s*12" % (c_(9, i), c_(7, i)) for i in range(N)], com_ben, total=True)
        _serie(L, k, 13, "pub", "Publicidad digital", ["=$B$5*%s*%s" % (c_(7, i), c_(8, i)) for i in range(N)], [g["pauta"] for g in gs], total=True)
        tot_com = [re[i]["comercializacion"] for i in range(N)]
        _serie(L, k, 14, "total", "TOTAL GASTOS DE COMERCIALIZACIÓN", ["=SUM(%s:%s)" % (c_(11, i), c_(13, i)) for i in range(N)], tot_com, total=True, bold=True)
        ws.merge_range(16, 0, 16, 8, "Publicidad y personal comercial. Las comisiones por venta son costo operacional y están en la hoja 4.", L.f["nota"])

        # ------------------------------------------------------ 2 Inversión
        k = "inv"
        ws = L.ws[k]
        ws.set_column(1, 5, 18)
        ws.write_row(2, 0, ["Activo fijo (equipamiento del taller y la oficina)", "Cantidad", "Valor unitario", "Valor total", "Vida útil (años)", "Depreciación anual"], L.f["encl"])
        ws.set_row(2, 32)
        af = S["taller_filas"]
        for i, fila in enumerate(af):
            rr = 3 + i
            ws.write(rr, 0, fila["equipo"] + ": " + fila["modelo"], L.f["lab"])
            ws.write_number(rr, 1, fila["cantidad"], L.f["n0i"])
            ws.write_number(rr, 2, fila["precio_neto_clp"], L.f["clpi"])
            ws.write_formula(rr, 3, "=B%d*C%d" % (rr + 1, rr + 1), L.f["clp"], fila["cantidad"] * fila["precio_neto_clp"])
            ws.write_number(rr, 4, fila["vida_util"], L.f["n0i"])
            ws.write_formula(rr, 5, "=D%d/E%d" % (rr + 1, rr + 1), L.f["clp"], fila["cantidad"] * fila["precio_neto_clp"] / fila["vida_util"])
        r_af = 3 + len(af)
        ws.write(r_af, 0, "TOTAL ACTIVO FIJO", L.f["labb"])
        for c_i in (1, 2, 4):
            ws.write(r_af, c_i, "", L.f["labb"])
        ws.write_formula(r_af, 3, "=SUM(D4:D%d)" % r_af, L.f["clpb"], M.EQUIP_TOTAL)
        ws.write_formula(r_af, 5, "=SUM(F4:F%d)" % r_af, L.f["clpb"], M.DEPREC_ANUAL)
        L.fila[(k, "af")] = r_af
        r_n0 = r_af + 2
        ws.write_row(r_n0, 0, ["Activo nominal (gastos de puesta en marcha)", "", "", "Valor"], L.f["encl"])
        for i, (nom, v) in enumerate(S["activo_nominal"]):
            rr = r_n0 + 1 + i
            ws.write(rr, 0, nom, L.f["lab"])
            ws.write_number(rr, 3, v, L.f["clpi"])
        r_nom = r_n0 + 1 + len(S["activo_nominal"])
        ws.write(r_nom, 0, "TOTAL ACTIVO NOMINAL", L.f["labb"])
        ws.write_formula(r_nom, 3, "=SUM(D%d:D%d)" % (r_n0 + 2, r_nom), L.f["clpb"], M.NOMINAL_TOTAL)
        L.fila[(k, "nom")] = r_nom
        r_c = r_nom + 2
        ws.write_row(r_c, 0, ["Capital de trabajo e inventario", "", "", "Valor"], L.f["encl"])
        burn = (tot_adm[0] + tot_com[0] + tot_oper[0] - vt[0]) / 12
        _gf = lambda key, hoja: L.ref(hoja, key, 0)
        ws.write(r_c + 1, 0, "Estructura mensual del primer año (administración, comercialización y remuneraciones de producción)", L.f["lab"])
        ws.write_formula(r_c + 1, 3, "=(%s+%s+%s+%s)/12" % (_gf("total", "adm"), _gf("total", "com"), _gf("lab", "oper"), _gf("ben", "oper")),
                         L.f["clp"], burn)
        L.fila[(k, "burn")] = r_c + 1
        ws.write(r_c + 2, 0, "Capital de trabajo dimensionado (la caja nunca baja de la reserva mínima)", L.f["lab"])
        ws.write_number(r_c + 2, 3, inv["capital_trabajo"], L.f["clpi"])
        L.fila[(k, "ct")] = r_c + 2
        ws.write(r_c + 3, 0, "Meses de estructura que cubre el capital de trabajo", L.f["lab"])
        ws.write_formula(r_c + 3, 3, "=D%d/D%d" % (r_c + 3, r_c + 2), L.f["n2"], inv["capital_trabajo"] / burn)
        ws.write(r_c + 4, 0, "Inventario inicial (dos meses de ventas a costo variable)", L.f["lab"])
        ws.write_formula(r_c + 4, 3, "=%s*%s/12*2" % (L.ref("oper", "var0", col=1, abs_=True), V("unid", 0)), L.f["clp"], inv["inventario"])
        L.fila[(k, "inventario")] = r_c + 4
        r_t = r_c + 6
        ws.write_row(r_t, 0, ["Inversión inicial", "", "", "Valor", "Participación"], L.f["encl"])
        items = [("Activo fijo", "=D%d" % (r_af + 1), M.EQUIP_TOTAL), ("Activo nominal", "=D%d" % (r_nom + 1), M.NOMINAL_TOTAL),
                 ("Capital de trabajo", "=D%d" % (r_c + 3), inv["capital_trabajo"]), ("Inventario inicial", "=D%d" % (r_c + 5), inv["inventario"])]
        for i, (et, fo, v) in enumerate(items):
            rr = r_t + 1 + i
            ws.write(rr, 0, et, L.f["lab"])
            ws.write_formula(rr, 3, fo, L.f["clp"], v)
            ws.write_formula(rr, 4, "=D%d/D%d" % (rr + 1, r_t + 6), L.f["pct"], v / inv["total"])
        rr = r_t + 5
        ws.write(rr, 0, "INVERSIÓN INICIAL TOTAL", L.f["labb"])
        ws.write_formula(rr, 3, "=SUM(D%d:D%d)" % (r_t + 2, r_t + 5), L.f["clpb"], inv["total"])
        ws.write_formula(rr, 4, "=SUM(E%d:E%d)" % (r_t + 2, r_t + 5), L.f["pctb"], 1.0)
        L.fila[(k, "total")] = rr
        INV_TOTAL = "'%s'!$D$%d" % (N_["inv"], rr + 1)
        INV_CT = "'%s'!$D$%d" % (N_["inv"], r_c + 3)
        INV_AF = "'%s'!$D$%d" % (N_["inv"], r_af + 1)
        INV_NOM = "'%s'!$D$%d" % (N_["inv"], r_nom + 1)

        # ---------------------------------------------------- 7 Financiamiento
        k = "fin"
        ws = L.ws[k]
        ws.set_column(1, 6, 18)
        i_m = (1 + S["tasa_credito_efectiva_anual"]) ** (1 / 12) - 1
        n_m = S["plazo_credito_anios"] * 12
        _param(L, k, 2, "monto", "Inversión inicial por financiar", inv["total"], "clp", formula="=%s" % INV_TOTAL)
        _param(L, k, 3, "pcred", "Parte de la inversión que desembolsa el crédito", 1.0, "pcti")
        _param(L, k, 4, "cred", "Crédito bancario", r["credito"], "clp", formula="=B3*B4")
        _param(L, k, 5, "pie", "Pie de los socios, abonado al banco como cuotas pagadas por anticipado", r["pie"], "clpi")
        _param(L, k, 6, "soc", "Socios", S["socios"], "n0i")
        _param(L, k, 7, "piesoc", "Pie por socio", r["pie"] / S["socios"], "clp", formula="=B6/B7")
        _param(L, k, 8, "tasa", "Tasa de interés efectiva anual", S["tasa_credito_efectiva_anual"], "pcti")
        _param(L, k, 9, "plazo", "Plazo (años)", S["plazo_credito_anios"], "n0i")
        _param(L, k, 10, "tm", "Tasa efectiva mensual = (1 + tasa anual)^(1/12) − 1", i_m, "pct", formula="=(1+B9)^(1/12)-1")
        ws.write_formula(10, 1, "=(1+B9)^(1/12)-1", wb.add_format({"num_format": "0.0000%", "border": 1, "border_color": "#BFBFBF"}), i_m)
        _param(L, k, 11, "nm", "Número de cuotas mensuales", n_m, "n0", formula="=B10*12")
        _param(L, k, 12, "cuota", "Cuota mensual (sistema francés)", r["cuota"], "clp", formula="=B5*B11/(1-(1+B11)^-B12)")
        _param(L, k, 13, "ncub", "Cuotas mensuales que cubre el pie", r["cuotas_anticipadas"], "n2", formula="=B6/B13")
        ws.merge_range(14, 0, 14, 7, "Fuentes: crédito más pie. Usos: inversión inicial más cuotas pagadas por anticipado. El banco desembolsa el total de la "
                       "inversión y el pie, abonado el mismo día, paga las primeras cuotas del calendario hasta agotarse.", L.f["nota"])
        ws.set_row(14, 30)
        ws.set_column(6, 7, 18)
        ws.write_row(16, 0, ["Cuadro de amortización anual", "Saldo inicial", "Cuota anual", "Intereses", "Amortización de capital", "Saldo final",
                             "Cuota pagada con el pie", "Cuota pagada por la empresa"], L.f["encl"])
        ws.set_row(16, 32)
        am = r["amortizacion"]
        for i, a in enumerate(am):
            rr = 17 + i
            ws.write_number(rr, 0, a["anio"], L.f["n0"])
            if i == 0:
                ws.write_formula(rr, 1, "=B5", L.f["clp"], a["saldo_inicial"])
            else:
                ws.write_formula(rr, 1, "=F%d" % rr, L.f["clp"], a["saldo_inicial"])
            ws.write_formula(rr, 2, "=12*$B$13", L.f["clp"], a["cuota"])
            ws.write_formula(rr, 3, "=C%d-E%d" % (rr + 1, rr + 1), L.f["clp"], a["interes"])
            ws.write_formula(rr, 4, "=B%d-F%d" % (rr + 1, rr + 1), L.f["clp"], a["capital"])
            ws.write_formula(rr, 5, "=MAX($B$5*(1+$B$11)^(12*%d)-$B$13*((1+$B$11)^(12*%d)-1)/$B$11,0)" % (i + 1, i + 1), L.f["clp"], a["saldo_final"])
            previo = "0" if i == 0 else "SUM(G$18:G%d)" % rr
            ws.write_formula(rr, 6, "=MIN(C%d,$B$6-%s)" % (rr + 1, previo), L.f["clp"], filas[i]["pie_aplicado"])
            ws.write_formula(rr, 7, "=C%d-G%d" % (rr + 1, rr + 1), L.f["clp"], a["cuota"] - filas[i]["pie_aplicado"])
        rr = 17 + len(am)
        ws.write(rr, 0, "TOTAL", L.f["labb"])
        ws.write(rr, 1, "", L.f["labb"])
        ws.write_formula(rr, 2, "=SUM(C18:C%d)" % rr, L.f["clpb"], sum(a["cuota"] for a in am))
        ws.write_formula(rr, 3, "=SUM(D18:D%d)" % rr, L.f["clpb"], sum(a["interes"] for a in am))
        ws.write_formula(rr, 4, "=SUM(E18:E%d)" % rr, L.f["clpb"], sum(a["capital"] for a in am))
        ws.write(rr, 5, "", L.f["labb"])
        ws.write_formula(rr, 6, "=SUM(G18:G%d)" % rr, L.f["clpb"], sum(f["pie_aplicado"] for f in filas))
        ws.write_formula(rr, 7, "=SUM(H18:H%d)" % rr, L.f["clpb"], sum(a["cuota"] for a in am) - sum(f["pie_aplicado"] for f in filas))
        FIN_ROW0 = 17  # primera fila (0-based) del cuadro
        L.fila[(k, "tabla")] = 17
        FIN = lambda col, i: "'%s'!%s" % (N_["fin"], xl_rowcol_to_cell(FIN_ROW0 + i, col))

        # --------------------------------------------------- 8 Costo financiero
        k = "cf"
        ws = L.ws[k]
        _encabezado_anios(L, k, 2)
        _serie(L, k, 3, "ini", "Deuda al inicio del año", ["=%s" % FIN(1, i) for i in range(N)], [a["saldo_inicial"] for a in am], total=False)
        _serie(L, k, 4, "cuota", "Cuota anual del crédito", ["=%s" % FIN(2, i) for i in range(N)], [a["cuota"] for a in am], total=True)
        _serie(L, k, 5, "int", "Intereses del año (costo financiero)", ["=%s" % FIN(3, i) for i in range(N)], [a["interes"] for a in am], total=True, bold=True)
        _serie(L, k, 6, "cap", "Amortización de capital", ["=%s" % FIN(4, i) for i in range(N)], [a["capital"] for a in am], total=True)
        _serie(L, k, 7, "fin", "Deuda al cierre del año", ["=%s" % FIN(5, i) for i in range(N)], [a["saldo_final"] for a in am])
        _serie(L, k, 9, "pie", "Cuota pagada con el pie (cuotas anticipadas)", ["=%s" % FIN(6, i) for i in range(N)], [f["pie_aplicado"] for f in filas], total=True)
        _serie(L, k, 8, "pct", "Intereses sobre ventas netas", ["=%s/%s" % (xl_rowcol_to_cell(5, 1 + i), V("ventas", i)) for i in range(N)],
               [am[i]["interes"] / filas[i]["ventas"] for i in range(N)], fmt="pct")
        ws.merge_range(11, 0, 11, 8, "Los intereses se descuentan en el estado de resultados y la amortización de capital en el flujo de caja; la parte de la cuota "
                       "que ya pagó el pie se devuelve en el flujo de caja, porque ese dinero salió al inicio.", L.f["nota"])
        ws.set_row(11, 30)

        # ------------------------------------------------------ 9 Depreciación
        k = "dep"
        ws = L.ws[k]
        reinv_total = sum(f["reinversion"] for f in filas)
        _param(L, k, 2, "base", "Activo fijo inicial (hoja 2)", M.EQUIP_TOTAL, "clp", formula="=%s" % INV_AF)
        _param(L, k, 3, "vida", "Vida útil (años), depreciación lineal", 5, "n0i")
        _param(L, k, 4, "anio_r", "Año de reinversión (se renueva al agotarse la vida útil)", ANIOS[5], "n0i")
        _encabezado_anios(L, k, 6)
        _serie(L, k, 7, "factor", "Factor de inflación acumulada", ["=%s" % V("factor", i) for i in range(N)], infl_f, fmt="n2")
        d0 = [M.DEPREC_ANUAL if i < 5 else 0 for i in range(N)]
        d_ = lambda row, i: xl_rowcol_to_cell(row, 1 + i)
        _serie(L, k, 8, "d0", "Depreciación del activo inicial (cuota anual)", ["=IF(%s<$B$5,$B$3/$B$4,0)" % d_(6, i) for i in range(N)], d0, total=True)
        reinv = [f["reinversion"] for f in filas]
        _serie(L, k, 9, "reinv", "Reinversión: compra del activo renovado, a precio reajustado",
               ["=IF(%s=$B$5,$B$3*%s,0)" % (d_(6, i), d_(7, i)) for i in range(N)], reinv, total=True)
        d1 = [(M.DEPREC_ANUAL * infl_f[5]) if i >= 5 else 0 for i in range(N)]
        _serie(L, k, 10, "d1", "Depreciación del activo renovado (cuota anual)", ["=IF(%s>=$B$5,$B$3*INDEX(%s,1,MATCH($B$5,%s,0))/$B$4,0)"
                                                                                % (d_(6, i), "$B$8:$%s$8" % xl_col_to_name(N), "$B$7:$%s$7" % xl_col_to_name(N)) for i in range(N)],
               d1, total=True)
        dt = [filas[i]["deprec"] for i in range(N)]
        _serie(L, k, 11, "total", "TOTAL DEPRECIACIÓN DEL EJERCICIO", ["=%s+%s" % (d_(8, i), d_(10, i)) for i in range(N)], dt, total=True, bold=True)
        ws.merge_range(13, 0, 13, 8, "El activo fijo agota su vida útil en cinco años y se renueva al inicio del sexto, a precio reajustado por inflación: esa compra "
                       "sale de la caja (hoja 12) y se deprecia desde entonces.", L.f["nota"])
        ws.set_row(13, 30)

        # ------------------------------------------------------ 10 Amortización
        k = "amo"
        ws = L.ws[k]
        _param(L, k, 2, "base", "Activo nominal (hoja 2)", M.NOMINAL_TOTAL, "clp", formula="=%s" % INV_NOM)
        _param(L, k, 3, "vida", "Años de amortización", 5, "n0i")
        _encabezado_anios(L, k, 5)
        am_n = [filas[i]["amort_nom"] for i in range(N)]
        _serie(L, k, 6, "idx", "Número de año", ["=%s-%d" % (xl_rowcol_to_cell(5, 1 + i), ANIOS[0] - 1) for i in range(N)], [i + 1 for i in range(N)], fmt="n0")
        _serie(L, k, 7, "cuota", "Amortización del activo nominal", ["=IF(%s<=$B$4,$B$3/$B$4,0)" % xl_rowcol_to_cell(6, 1 + i) for i in range(N)], am_n, total=True, bold=True)
        ws.merge_range(9, 0, 9, 8, "Los gastos de puesta en marcha no son bienes físicos: no se deprecian, se amortizan en cinco años.", L.f["nota"])

        # ------------------------------------------- 11 Estado de resultados
        k = "er"
        ws = L.ws[k]
        _encabezado_anios(L, k, 2)
        E = lambda row, i: xl_rowcol_to_cell(row, 1 + i)
        _serie(L, k, 3, "ventas", "Ventas netas", ["=%s" % V("ventas", i) for i in range(N)], [f["ventas"] for f in filas], total=True, bold=True)
        _serie(L, k, 4, "oper", "(−) Costos operacionales (hoja 4)", ["=%s" % L.ref("oper", "total", i) for i in range(N)], tot_oper, total=True)
        _serie(L, k, 5, "adm", "(−) Gastos de administración (hoja 5)", ["=%s" % L.ref("adm", "total", i) for i in range(N)], tot_adm, total=True)
        _serie(L, k, 6, "com", "(−) Gastos de comercialización (hoja 6)", ["=%s" % L.ref("com", "total", i) for i in range(N)], tot_com, total=True)
        ebit = [filas[i]["ventas"] - tot_oper[i] - tot_adm[i] - tot_com[i] for i in range(N)]
        _serie(L, k, 7, "res_op", "(=) Resultado operacional", ["=%s-%s-%s-%s" % (E(3, i), E(4, i), E(5, i), E(6, i)) for i in range(N)], ebit, total=True, bold=True)
        _serie(L, k, 8, "dep", "(−) Depreciación (hoja 9)", ["=%s" % L.ref("dep", "total", i) for i in range(N)], dt, total=True)
        _serie(L, k, 9, "amo", "(−) Amortización del activo nominal (hoja 10)", ["=%s" % L.ref("amo", "cuota", i) for i in range(N)], am_n, total=True)
        _serie(L, k, 10, "int", "(−) Intereses (hoja 8)", ["=%s" % L.ref("cf", "int", i) for i in range(N)], [f["interes"] for f in filas], total=True)
        ua = [f["util_antes"] for f in filas]
        _serie(L, k, 11, "ua", "(=) Utilidad antes de impuesto", ["=%s-%s-%s-%s" % (E(7, i), E(8, i), E(9, i), E(10, i)) for i in range(N)], ua, total=True, bold=True)
        # arrastre de perdidas
        arr0, base_i, perd_c, imp_i = [], [], [], []
        pa = 0.0
        for i in range(N):
            arr0.append(pa)
            b = ua[i] + pa
            base_i.append(b)
            if b > 0:
                pa = 0.0
            else:
                pa = b
            perd_c.append(pa)
            imp_i.append(filas[i]["impuesto"])
        _serie(L, k, 12, "arr", "Pérdida acumulada de arrastre al inicio",
               ["=0"] + ["=%s" % E(14, i - 1) for i in range(1, N)], arr0)
        _serie(L, k, 13, "base", "Base imponible (utilidad más pérdida de arrastre)", ["=%s+%s" % (E(11, i), E(12, i)) for i in range(N)], base_i)
        _serie(L, k, 14, "perd", "Pérdida acumulada al cierre", ["=IF(%s>0,0,%s)" % (E(13, i), E(13, i)) for i in range(N)], perd_c)
        tasas = [M.tasa_impuesto(a) for a in ANIOS]
        _serie(L, k, 15, "tasa", "Tasa de impuesto a la renta (régimen Pro Pyme)", None, tasas, fmt="pct")
        _serie(L, k, 16, "imp", "(−) Impuesto a la renta", ["=IF(%s>0,%s*%s,0)" % (E(13, i), E(13, i), E(15, i)) for i in range(N)], imp_i, total=True)
        un = [f["util_neta"] for f in filas]
        _serie(L, k, 17, "un", "(=) UTILIDAD DEL EJERCICIO", ["=%s-%s" % (E(11, i), E(16, i)) for i in range(N)], un, total=True, bold=True)
        ws.merge_range(19, 0, 19, 8, "Los ejercicios con pérdida no pagan impuesto y la pérdida se arrastra contra las utilidades siguientes.", L.f["nota"])

        # ------------------------------------------------------ 12 Flujo de caja
        k = "fc"
        ws = L.ws[k]
        ws.set_column(1, 1, 16)
        ws.write(2, 0, "Concepto", L.f["encl"])
        ws.write(2, 1, "Inicio (año 0)", L.f["enc"])
        for i, a in enumerate(ANIOS):
            ws.write_number(2, 2 + i, a, L.f["enc"])
        ws.write(2, 2 + N, "Total", L.f["enc"])
        ws.set_row(2, 22)
        F_ = lambda row, i: xl_rowcol_to_cell(row, 2 + i)
        ER = lambda key, i: L.ref("er", key, i)
        _serie(L, k, 3, "un", "Utilidad del ejercicio (hoja 11)", ["=%s" % ER("un", i) for i in range(N)], un, total=True)
        _serie(L, k, 4, "dep", "(+) Depreciación (hoja 9)", ["=%s" % ER("dep", i) for i in range(N)], dt, total=True)
        _serie(L, k, 5, "amo", "(+) Amortización del activo nominal (hoja 10)", ["=%s" % ER("amo", i) for i in range(N)], am_n, total=True)
        cap = [f["capital"] for f in filas]
        _serie(L, k, 6, "cap", "(−) Amortización de capital del crédito (hoja 8)", ["=%s" % L.ref("cf", "cap", i) for i in range(N)], cap, total=True)
        _serie(L, k, 7, "reinv", "(−) Reinversión en activo fijo (hoja 9)", ["=%s" % L.ref("dep", "reinv", i) for i in range(N)], reinv, total=True)
        _serie(L, k, 8, "pie", "(+) Cuota ya pagada con el pie (hoja 8)", ["=%s" % L.ref("cf", "pie", i) for i in range(N)],
               [f["pie_aplicado"] for f in filas], total=True)
        fl = [f["flujo"] for f in filas]
        _serie(L, k, 9, "flujo", "(=) FLUJO DE FONDOS DEL AÑO",
               ["=%s+%s+%s-%s-%s+%s" % (F_(3, i), F_(4, i), F_(5, i), F_(6, i), F_(7, i), F_(8, i)) for i in range(N)],
               fl, total=True, bold=True)
        caja = [f["caja"] for f in filas]
        ws.write(10, 0, "Caja acumulada (parte con el capital de trabajo)", L.f["lab"])
        L.fila[(k, "caja")] = 10
        ws.write_formula(10, 1, "=%s" % INV_CT, L.f["clp"], inv["capital_trabajo"])
        for i in range(N):
            ws.write_formula(10, 2 + i, "=%s+%s" % (xl_rowcol_to_cell(10, 1 + i), F_(9, i)), L.f["clp"], caja[i])
        # flujos para VAN y TIR
        PIE_FIN = "'%s'!$B$6" % N_["fin"]
        ws.write(12, 0, "Flujo neto para evaluar (año 0 = −inversión inicial − pie)", L.f["labb"])
        L.fila[(k, "eval")] = 12
        ws.write_formula(12, 1, "=-%s-%s" % (INV_TOTAL, PIE_FIN), L.f["clpb"], -r["desembolso"])
        for i in range(N):
            ws.write_formula(12, 2 + i, "=%s" % F_(9, i), L.f["clpb"], fl[i])
        # acumulado y recuperacion
        acum, acumd = [-r["desembolso"]], [-r["desembolso"]]
        tasa = S["tasa_descuento"]
        for i in range(N):
            acum.append(acum[-1] + fl[i])
            acumd.append(acumd[-1] + fl[i] / (1 + tasa) ** (i + 1))
        ws.write(13, 0, "Flujo acumulado", L.f["lab"])
        ws.write_formula(13, 1, "=B13", L.f["clp"], acum[0])
        for i in range(N):
            ws.write_formula(13, 2 + i, "=%s+%s" % (xl_rowcol_to_cell(13, 1 + i), xl_rowcol_to_cell(12, 2 + i)), L.f["clp"], acum[i + 1])
        ws.write(14, 0, "Flujo descontado de cada año (a la tasa de descuento)", L.f["lab"])
        L.fila[(k, "desc")] = 14
        ws.write(14, 1, "", L.f["lab"])
        TASA = "'%s'!$B$%d" % (N_["resumen"], 4)
        for i in range(N):
            ws.write_formula(14, 2 + i, "=%s/(1+%s)^%d" % (xl_rowcol_to_cell(12, 2 + i), TASA, i + 1), L.f["clp"], fl[i] / (1 + tasa) ** (i + 1))
        ws.write(15, 0, "Flujo descontado acumulado", L.f["lab"])
        ws.write_formula(15, 1, "=B13", L.f["clp"], acumd[0])
        for i in range(N):
            ws.write_formula(15, 2 + i, "=%s+%s" % (xl_rowcol_to_cell(15, 1 + i), xl_rowcol_to_cell(14, 2 + i)), L.f["clp"], acumd[i + 1])

        def payback_vals(ac, fv):
            out = []
            for i in range(N):
                if ac[i] < 0 and ac[i + 1] >= 0:
                    out.append(i + (-ac[i]) / fv[i])
                else:
                    out.append(None)
            return out
        pb = payback_vals(acum, fl)
        fd = [fl[i] / (1 + tasa) ** (i + 1) for i in range(N)]
        pbd = payback_vals(acumd, fd)
        ws.write(16, 0, "Año de recuperación simple (años desde el inicio)", L.f["lab"])
        ws.write(17, 0, "Año de recuperación descontado (años desde el inicio)", L.f["lab"])
        L.fila[(k, "pb")] = 16
        L.fila[(k, "pbd")] = 17
        ws.write(16, 1, "", L.f["lab"])
        ws.write(17, 1, "", L.f["lab"])
        for i in range(N):
            ws.write_formula(16, 2 + i, '=IF(AND(%s<0,%s>=0),%d+(-%s)/%s,"")' % (xl_rowcol_to_cell(13, 1 + i), xl_rowcol_to_cell(13, 2 + i), i,
                                                                                 xl_rowcol_to_cell(13, 1 + i), xl_rowcol_to_cell(12, 2 + i)), L.f["n2"],
                             pb[i] if pb[i] is not None else "")
            ws.write_formula(17, 2 + i, '=IF(AND(%s<0,%s>=0),%d+(-%s)/%s,"")' % (xl_rowcol_to_cell(15, 1 + i), xl_rowcol_to_cell(15, 2 + i), i,
                                                                                 xl_rowcol_to_cell(15, 1 + i), xl_rowcol_to_cell(14, 2 + i)), L.f["n2"],
                             pbd[i] if pbd[i] is not None else "")
        ws.merge_range(19, 0, 19, 8, "El flujo de fondos ya descuenta el servicio de la deuda (intereses en la utilidad y capital en esta hoja) y devuelve la parte "
                       "de las cuotas que el pie pagó por anticipado. La inversión inicial se financia con el crédito, por eso la caja parte del capital "
                       "de trabajo; el año 0 de la evaluación descuenta la inversión y el pie.", L.f["nota"])
        ws.set_row(19, 45)
        FC_FLUJOS = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(9, 2), xl_rowcol_to_cell(9, 1 + N))
        FC_EVAL = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(12, 1), xl_rowcol_to_cell(12, 1 + N))
        FC_FLUJOS5 = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(9, 2), xl_rowcol_to_cell(9, 6))
        FC_EVAL5 = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(12, 1), xl_rowcol_to_cell(12, 6))
        FC_CAJA = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(10, 2), xl_rowcol_to_cell(10, 1 + N))
        FC_PB = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(16, 2), xl_rowcol_to_cell(16, 1 + N))
        FC_PBD = "'%s'!%s:%s" % (N_["fc"], xl_rowcol_to_cell(17, 2), xl_rowcol_to_cell(17, 1 + N))

        # ----------------------------------------------------------- 1 Resumen
        k = "resumen"
        ws = L.ws[k]
        ws.set_column(0, 0, 60)
        ws.set_column(1, 1, 22)
        ws.set_column(2, 2, 36)
        ws.write_row(2, 0, ["Parámetro de evaluación", "Valor", "Dónde se origina"], L.f["encl"])
        ws.write(3, 0, "Tasa de descuento", L.f["lab"])
        ws.write_number(3, 1, tasa, L.f["pcti"])
        ws.write(3, 2, "Costo de oportunidad del capital, supuesto de la evaluación", L.f["txt"])
        ws.write(5, 0, "Indicador", L.f["encl"])
        ws.write(5, 1, "Valor", L.f["enc"])
        ws.write(5, 2, "Cálculo", L.f["encl"])
        van10 = ind["van"]
        van5 = M.van(r["desembolso"], fl[:5], tasa)
        tir10 = ind["tir"]
        tir5 = M.tir(r["desembolso"], fl[:5])
        rows = [
            ("Precio neto de venta, %d" % ANIOS[0], "=%s" % V("precio", 0), r["precio_neto_base"], "clp", "Hoja 3, derivado del costo total"),
            ("Precio de lista con IVA, %d" % ANIOS[0], "=%s" % V("lista", 0), r["precio_lista"], "clp", "Hoja 3"),
            ("Inversión inicial total", "=%s" % INV_TOTAL, inv["total"], "clp", "Hoja 2"),
            ("Crédito bancario (desembolsa el 100 % de la inversión)", "='%s'!B5" % N_["fin"], r["credito"], "clp", "Hoja 7"),
            ("Pie de los socios (cuotas pagadas por anticipado)", "='%s'!B6" % N_["fin"], r["pie"], "clp", "Hoja 7"),
            ("Pie por socio", "='%s'!B8" % N_["fin"], r["pie"] / S["socios"], "clp", "Hoja 7"),
            ("Cuota mensual del crédito", "='%s'!B13" % N_["fin"], r["cuota"], "clp", "Hoja 7"),
            ("Cuotas mensuales que cubre el pie", "='%s'!B14" % N_["fin"], r["cuotas_anticipadas"], "dec", "Hoja 7"),
            ("Desembolso inicial evaluado (inversión + pie)", "=%s+'%s'!B6" % (INV_TOTAL, N_["fin"]), r["desembolso"], "clp", "Hojas 2 y 7"),
            ("VAN a 10 años", "=-B15+NPV(B4,%s)" % FC_FLUJOS, van10, "clp", "Flujo de fondos de la hoja 12 descontado a la tasa de descuento, sin valor terminal"),
            ("TIR a 10 años", "=IRR(%s)" % FC_EVAL, tir10, "pctb", "Flujo neto con la inversión inicial y el pie de la hoja 12"),
            ("VAN a 5 años", "=-B15+NPV(B4,%s)" % FC_FLUJOS5, van5, "clp", "Primeros cinco flujos"),
            ("TIR a 5 años", "=IRR(%s)" % FC_EVAL5, tir5, "pctb", "Primeros cinco flujos"),
            ("Payback simple (años)", '=IF(COUNT(%s)=0,"No recupera",MIN(%s))' % (FC_PB, FC_PB), ind["payback"], "dec", "Hoja 12, flujo acumulado"),
            ("Payback descontado (años)", '=IF(COUNT(%s)=0,"No recupera",MIN(%s))' % (FC_PBD, FC_PBD), ind["payback_desc"], "dec", "Hoja 12, flujo descontado acumulado"),
            ("Caja mínima del horizonte", "=MIN(%s)" % FC_CAJA, min(caja), "clp", "Hoja 12"),
            ("Caja acumulada al cierre de %d" % ANIOS[-1], "=%s" % ("'%s'!%s" % (N_["fc"], xl_rowcol_to_cell(9, 1 + N))), caja[-1], "clp", "Hoja 12"),
            ("Deuda al cierre de %d" % ANIOS[-1], "=%s" % L.ref("cf", "fin", N - 1), am[-1]["saldo_final"], "clp", "Hoja 8"),
        ]
        for i, (et, fo, v, fm, org) in enumerate(rows):
            rr = 6 + i
            ws.write(rr, 0, et, L.f["lab"])
            ws.write_formula(rr, 1, fo, L.f[fm] if fm in L.f else L.f["clp"], v)
            ws.write(rr, 2, org, L.f["txt"])
        rr = 6 + len(rows) + 1
        ws.write(rr, 0, "Resumen anual", L.f["encl"])
        for i, a in enumerate(ANIOS):
            ws.write_number(rr, 1 + i, a, L.f["enc"])
        ws.set_column(3, 10, 16)
        tabla = [("Equipos vendidos", "unid", "ventas", "n0", q), ("Ventas netas", "ventas", "er", "clp", [f["ventas"] for f in filas]),
                 ("Costo total (hojas 4, 5 y 6)", None, None, "clp", [re[i]["total"] for i in range(N)]),
                 ("Utilidad del ejercicio", "un", "er", "clp", un), ("Flujo de fondos", "flujo", "fc", "clp", fl), ("Caja acumulada", "caja", "fc", "clp", caja)]
        for j, (et, key, hoja, fm, vals) in enumerate(tabla, 1):
            ws.write(rr + j, 0, et, L.f["lab"])
            for i in range(N):
                if key is None:
                    fo = "=%s+%s+%s" % (L.ref("oper", "total", i), L.ref("adm", "total", i), L.ref("com", "total", i))
                elif hoja == "ventas":
                    fo = "=%s" % L.ref("ventas", key, i)
                else:
                    fo = "=%s" % L.ref(hoja, key, i)
                ws.write_formula(rr + j, 1 + i, fo, L.f[fm], vals[i])
        ws.merge_range(rr + len(tabla) + 2, 0, rr + len(tabla) + 2, 8,
                       "Evaluación a diez años (%d–%d) sin valor terminal, en pesos nominales. Cada cifra se enlaza con las hojas 2 a 12; "
                       "las celdas en azul son los datos de entrada." % (ANIOS[0], ANIOS[-1]), L.f["nota"])
        ws.set_row(rr + len(tabla) + 2, 30)
        ws.activate()
        ws.set_first_sheet()

    return {"hojas": [N_[x] for x in ("resumen", "inv", "ventas", "oper", "adm", "com", "fin", "cf", "dep", "amo", "er", "fc")]}
