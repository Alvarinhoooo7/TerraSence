# -*- coding: utf-8 -*-
"""Valida el informe de la Evaluacion 2 y sus anexos contra el modelo (F12).

    python finanzas/verificar_informe_e2.py [ruta_del_informe]

Sale con codigo 1 si hay errores. No edita el informe: solo lo reporta.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8")

import modelo as M  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
INFORME = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2", "INFORME CORREGIDO.md")
ANEXOS = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2", "Anexos")
SIGLAS = ["TAM", "SAM", "SOM", "VAN", "TIR", "TCO", "BOM", "FAT", "SAT", "PCBA", "LDO", "ESD", "IoT"]
PROHIBIDOS = [r"\bEBITDA\b", r"\bFCFF\b", r"\bFCFE\b", r"\bDSCR\b", r"\bFTE\b", r"\bpredio", r"\bpotrero"]
MODULOS = [r"DevKit", r"LX-LCBST", r"módulo BME280"]
REPO = re.compile(r"`|finanzas/|supabase/|docs/|Firmware/|App/src|PCB/|\.(py|ts|tsx|h|ino|sql|json)\b|modelo\.py|pines\.h")


def _num(s):
    s = s.replace("$", "").replace("%", "").replace("*", "").strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def tablas(lineas):
    """[(inicio, [filas])] con cada fila como lista de celdas."""
    out, cur, ini = [], [], 0
    for i, l in enumerate(lineas + [""]):
        if l.lstrip().startswith("|"):
            if not cur:
                ini = i
            cur.append([c.strip() for c in re.split(r"(?<!\\)\|", l.strip())[1:-1]])
        elif cur:
            out.append((ini, cur))
            cur = []
    return out


def revisar_tablas(lineas, err):
    for ini, filas in tablas(lineas):
        n = len(filas[0])
        for k, f in enumerate(filas):
            if len(f) != n:
                err("Tablas", "línea %d: la fila tiene %d columnas y el encabezado %d" % (ini + k + 1, len(f), n))
            if k != 1 and any(c == "" for c in f):
                err("Tablas", "línea %d: celda vacía" % (ini + k + 1))
        datos = [f for f in filas[2:]]
        for k, f in enumerate(datos):
            if re.match(r"\**total", f[0].strip(), re.I):
                prev = datos[:k]
                for c in range(1, len(f)):
                    tot = _num(f[c])
                    vals = [_num(p[c]) for p in prev if c < len(p)]
                    if tot is None or not vals or any(v is None for v in vals):
                        continue
                    if abs(sum(vals) - tot) > max(1.0, abs(tot) * 0.0005):
                        err("Tablas", "línea %d: el total de la columna %d no cuadra (%s frente a %s)" % (ini + k + 3, c + 1, tot, sum(vals)))


def numeracion(texto, lineas, err):
    pie = re.compile(r"^\*\*(Tabla|Figura) (\d+)\.(\d) “(.+)”\*\*\s*$")
    reales = {"Tabla": [], "Figura": []}
    for l in lineas:
        m = pie.match(l.strip())
        if m:
            reales[m.group(1)].append((int(m.group(2)) * 10 + int(m.group(3)), m.group(4)))
    for tipo, lst in reales.items():
        for i, (n, _) in enumerate(lst):
            if n != 10 + i:
                err("Numeración", "%s %d.%d no es consecutiva (se esperaba %d.%d)" % (tipo, n // 10, n % 10, (10 + i) // 10, (10 + i) % 10))
                break
        ind = []
        activo = False
        for l in lineas:
            if re.match(r"^#+ Índice de %s" % ("tablas" if tipo == "Tabla" else "figuras"), l):
                activo = True
                continue
            if activo and l.startswith("#"):
                break
            m = re.match(r"^- %s (\d+)\.(\d) “(.+)”\s*$" % tipo, l)
            if activo and m:
                ind.append((int(m.group(1)) * 10 + int(m.group(2)), m.group(3)))
        if ind != lst:
            err("Numeración", "el índice de %s no coincide con los títulos (%d en el índice, %d en el texto)" % (tipo.lower() + "s", len(ind), len(lst)))
        existentes = {n for n, _ in lst}
        for m in re.finditer(r"(?<!\*)\b%s (\d+)\.(\d)\b(?! “)" % tipo, texto):
            if int(m.group(1)) * 10 + int(m.group(2)) not in existentes:
                err("Numeración", "la referencia «%s %s.%s» no existe" % (tipo, m.group(1), m.group(2)))


def siglas(lineas, err):
    inicio = next((i for i, l in enumerate(lineas) if re.match(r"^## I\. ", l)), 0)
    cuerpo = "\n".join(lineas[inicio:])
    for s in SIGLAS:
        m = re.search(r"\b%s\b" % s, cuerpo)
        if m:
            ventana = cuerpo[max(0, m.start() - 90): m.end() + 90]
            if not (re.search(r"\b%s\b\s*\(" % s, ventana) or re.search(r"\(\s*%s\s*[,)]" % s, ventana)
                    or re.search(r"\(\s*\*?[A-Za-zÁ-ú ]*%s" % s, ventana)):
                err("Siglas", "«%s» aparece sin su significado en la primera mención" % s)


def sin_modulos(lineas, err):
    permitido = False
    nivel = 0
    for i, l in enumerate(lineas):
        m = re.match(r"^(#+) (.*)", l)
        if m:
            if permitido and len(m.group(1)) <= nivel:
                permitido = False
            if re.search(r"V2|prototipo", m.group(2), re.I) and not permitido:
                permitido, nivel = True, len(m.group(1))
        if permitido or re.search(r"V2|prototipo", l, re.I):
            continue
        for p in MODULOS:
            if re.search(p, l):
                err("Sin módulos", "línea %d: «%s» fuera de la sección del prototipo V2" % (i + 1, p))


def cifras(texto, err):
    r = M.dimensionar()
    ind = M.resumen(r)
    fmt = M.fmt
    clave = {"precio de lista": fmt(r["precio_lista"]), "BOM total": fmt(M.BOM), "inversión inicial": fmt(r["inversion"]["total"]),
             "crédito": fmt(r["credito"]), "pie": fmt(r["pie"]), "VAN": fmt(ind["van"]), "TIR": M.porc(ind["tir"], 2),
             "caja mínima": fmt(M.caja_minima(r)), "activo fijo": fmt(M.EQUIP_TOTAL)}
    for k, v in clave.items():
        if v not in texto:
            err("Cifras", "falta la cifra del modelo «%s» = %s" % (k, v))
    # Comparar las celdas, no sólo la presencia de una cifra en cualquier párrafo.
    esperados = {
        "Precio neto de venta 2027": r["precio_neto_base"],
        "IVA 19 %": r["precio_lista"] - r["precio_neto_base"],
        "Precio de lista con IVA": r["precio_lista"],
        "Costo y gasto total de los 10 años": sum(f["costo_total"] for f in r["filas"]),
        "Ventas netas necesarias en los 10 años": sum(f["ventas"] for f in r["filas"]),
    }
    for _, filas in tablas(texto.splitlines()):
        for fila in filas[2:]:
            etiqueta = fila[0].replace("*", "")
            if etiqueta in esperados and len(fila) > 1:
                valor = _num(fila[1])
                if valor is None or abs(valor - esperados[etiqueta]) > 0.51:
                    err("Cifras", "%s no coincide con el modelo" % etiqueta)
        if filas[0][:3] == ["Año", "Equipos", "Ventas netas"]:
            por_anio = {str(f["anio"]): f for f in r["filas"]}
            for fila in filas[2:]:
                if fila[0] not in por_anio:
                    continue
                f = por_anio[fila[0]]
                for c, k in ((2, "ventas"), (3, "util_neta"), (4, "flujo"), (5, "caja")):
                    v = _num(fila[c]) if c < len(fila) else None
                    if v is None or abs(v - f[k]) > 0.51:
                        err("Cifras", "%s: %s no coincide con el modelo" % (fila[0], k))


def matrices(lineas, err):
    for ini, filas in tablas(lineas):
        if len(filas[0]) < 3 or filas[0][1] != "Peso":
            continue
        pesos = [_num(f[1]) for f in filas[2:-1]]
        if any(p is None for p in pesos):
            continue
        if abs(sum(pesos) - 100) > 0.001:
            err("Matrices", "línea %d: pesos distintos de 100 %%" % (ini + 1))
        for col in range(2, len(filas[0])):
            notas = [_num(f[col]) if col < len(f) else None for f in filas[2:-1]]
            declarado = _num(filas[-1][col]) if col < len(filas[-1]) else None
            if declarado is None or any(n is None for n in notas):
                continue
            calculado = sum(p * n / 100 for p, n in zip(pesos, notas))
            if abs(calculado - declarado) > 0.0051:
                err("Matrices", "línea %d: puntaje de %s debe ser %.2f" % (ini + 1, filas[0][col], calculado))


def protocolos(texto, err):
    import anexos as A
    for numero, definicion in (("6.7", A.pruebas_fat()), ("6.8", A.pruebas_sat())):
        fin = texto.find("**Tabla " + numero)
        if fin < 0:
            continue
        anteriores = tablas(texto[:fin].splitlines())
        if not anteriores:
            continue
        filas = anteriores[-1][1][2:]
        por_nombre = {f[0]: f for f in filas}
        for prueba in definicion:
            if list(prueba) != por_nombre.get(prueba[0]):
                err("Protocolos", "Tabla %s: «%s» difiere del anexo E" % (numero, prueba[0]))


def hardware(texto, err):
    ruta = os.path.join(RAIZ, "Firmware", "pines.h")
    if not os.path.exists(ruta):
        return
    pines = dict(re.findall(r"#define\s+(PIN_\w+)\s+(\d+)", open(ruta, encoding="utf-8").read()))
    for nombre, io in (("PIN_PARING", "PAIR"), ("PIN_BUZZER", "buzzer"), ("PIN_VBAT_SENSE", "batería")):
        if nombre in pines and "IO%s" % pines[nombre] not in texto:
            err("Hardware", "el informe no menciona IO%s (%s) del firmware" % (pines[nombre], io))


def trazabilidad(lineas, err):
    ids = set()
    for _, filas in tablas(lineas):
        for f in filas[2:]:
            if re.fullmatch(r"R\d\d", f[0].strip()) and len(f) >= 5:
                ids.add(f[0].strip())
    if not ids:
        err("Trazabilidad", "no hay tabla de requerimientos con identificadores R01…")
        return
    texto = "\n".join(lineas)
    for clave in ("Requerimiento → Prueba", "trazabilidad maestra"):
        i = texto.lower().find(clave.lower())
        if i < 0:
            err("Trazabilidad", "no existe la tabla «%s»" % clave)
            continue
        seccion = texto[i:i + 40000]
        for r in sorted(ids):
            if not re.search(r"\b%s\b" % r, seccion):
                err("Trazabilidad", "%s no aparece en «%s»" % (r, clave))


def anexos(err):
    try:
        import openpyxl
    except ImportError:
        err("Anexos", "falta openpyxl")
        return
    a = os.path.join(ANEXOS, "Anexo A - Cotizaciones TerraSense.xlsx")
    b = os.path.join(ANEXOS, "Anexo B - Flujo de caja TerraSense.xlsx")
    for ruta in (a, b):
        if not os.path.exists(ruta):
            err("Anexos", "no existe %s" % os.path.basename(ruta))
            return
    wa = openpyxl.load_workbook(a, data_only=True)
    tot = next((r for r in wa["Producto (BOM por equipo)"].iter_rows(values_only=True) if r[0] and str(r[0]).startswith("TOTAL POR EQUIPO")), None)
    if not tot or abs(tot[5] - M.BOM) > 0.01:
        err("Anexos", "el total de la BOM del anexo A no coincide con el modelo")
    r = M.dimensionar()
    wb = openpyxl.load_workbook(b, data_only=True)
    res = {x[0]: x[1] for x in wb["1 Resumen"].iter_rows(values_only=True) if x[0]}
    if abs(res.get("VAN a 10 años", 0) - M.resumen(r)["van"]) > 1:
        err("Anexos", "el VAN del anexo B no coincide con dimensionar()")
    if abs(res.get("Inversión inicial total", 0) - r["inversion"]["total"]) > 1:
        err("Anexos", "la inversión del anexo B no coincide con dimensionar()")
    e = os.path.join(ANEXOS, "Anexo E - Protocolos FAT y SAT TerraSense.xlsx")
    if not os.path.exists(e):
        err("Anexos", "no existe %s" % os.path.basename(e))
        return
    f = os.path.join(ANEXOS, "Anexo F - Carta Gantt TerraSense.xlsx")
    if not os.path.exists(f):
        err("Anexos", "no existe %s" % os.path.basename(f))
        return
    import zipfile
    for ruta in (a, b, e, f):
        with zipfile.ZipFile(ruta) as z:
            t = "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml"))
        if REPO.search(t):
            err("Sin repositorio", "%s contiene referencias al repositorio" % os.path.basename(ruta))


def gantt(texto, err):
    """La carta del capítulo IX y la tabla de hitos repiten las fechas del anexo F."""
    import anexos as A
    plan = A.plan_proyecto()
    lineas = texto.splitlines()
    fin = texto.find("**Tabla 8.5")
    if fin < 0:
        err("Gantt", "no existe la tabla de hitos")
        return
    anteriores = tablas(texto[:fin].splitlines())
    filas = {f[0].replace("*", ""): f for f in anteriores[-1][1][2:]} if anteriores else {}
    for p in plan:
        if p[7] != "hito":
            continue
        fila = filas.get(p[1])
        if not fila:
            err("Gantt", "el hito «%s» del anexo F falta en la tabla de hitos" % p[1])
        elif not fila[1].replace("*", "").startswith(A.fecha_texto(p[3])):
            err("Gantt", "el hito «%s» tiene otra fecha que en el anexo F" % p[1])
    m = re.search(r"```mermaid\s+gantt\n(.*?)```", texto, re.S)
    if not m:
        err("Gantt", "falta la carta Gantt del capítulo IX")
        return
    tareas = {}
    for l in m.group(1).splitlines():
        x = re.match(r"\s*(.+?)\s*:.*?\bt([\d_]+), (\d{4}-\d\d-\d\d)(?:, (\d{4}-\d\d-\d\d|0d))?\s*$", l)
        if x:
            tareas[x.group(2).replace("_", ".")] = (x.group(1), x.group(3), x.group(4))
    for p in plan:
        if p[7] == "fase":
            continue
        t = tareas.get(p[0])
        if not t:
            err("Gantt", "la actividad %s del anexo F falta en la carta del informe" % p[0])
        elif t[1] != p[3] or (p[7] != "hito" and t[2] != p[4]):
            err("Gantt", "la actividad %s tiene otras fechas que en el anexo F" % p[0])
    if len(tareas) != sum(p[7] != "fase" for p in plan):
        err("Gantt", "la carta del informe y el anexo F no tienen las mismas actividades")


def validar(texto, con_anexos=True):
    errores = []
    err = lambda cat, msg: errores.append((cat, msg))
    lineas = texto.splitlines()
    if "⟦PENDIENTE" in texto:
        err("Marcadores", "quedan %d marcadores ⟦PENDIENTE" % texto.count("⟦PENDIENTE"))
    revisar_tablas(lineas, err)
    matrices(lineas, err)
    protocolos(texto, err)
    numeracion(texto, lineas, err)
    siglas(lineas, err)
    sin_modulos(lineas, err)
    for p in PROHIBIDOS:
        for m in re.finditer(p, texto):
            err("Términos", "término prohibido «%s»" % m.group(0))
    sin_mermaid = re.sub(r"```mermaid\s.*?```", "", texto, flags=re.S)  # las vallas Mermaid son legítimas
    sin_urls = re.sub(r"https?://[^\s<>]+", "", sin_mermaid)
    if REPO.search(sin_urls):
        m = REPO.search(sin_urls)
        err("Sin repositorio", "el informe contiene una referencia al repositorio: «%s»" % m.group(0))
    if re.search(r"informe (?:1|anterior|pasado|original)\b|versiones anteriores|sin cambios|changelog", sin_mermaid, re.I):
        err("Autonomía documental", "el informe remite a una entrega anterior o relata cambios")
    cifras(texto, err)
    hardware(texto, err)
    trazabilidad(lineas, err)
    gantt(texto, err)
    if con_anexos:
        anexos(err)
    return errores


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else INFORME
    texto = open(ruta, encoding="utf-8").read()
    errores = validar(texto)
    for cat, msg in errores[:200]:
        print("[%s] %s" % (cat, msg))
    print("%d errores" % len(errores))
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
