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
    import zipfile
    for ruta in (a, b, e):
        with zipfile.ZipFile(ruta) as z:
            t = "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml"))
        if REPO.search(t):
            err("Sin repositorio", "%s contiene referencias al repositorio" % os.path.basename(ruta))


def validar(texto, con_anexos=True):
    errores = []
    err = lambda cat, msg: errores.append((cat, msg))
    lineas = texto.splitlines()
    if "⟦PENDIENTE" in texto:
        err("Marcadores", "quedan %d marcadores ⟦PENDIENTE" % texto.count("⟦PENDIENTE"))
    revisar_tablas(lineas, err)
    numeracion(texto, lineas, err)
    siglas(lineas, err)
    sin_modulos(lineas, err)
    for p in PROHIBIDOS:
        for m in re.finditer(p, texto):
            err("Términos", "término prohibido «%s»" % m.group(0))
    sin_mermaid = re.sub(r"```mermaid\s.*?```", "", texto, flags=re.S)  # las vallas Mermaid son legítimas
    if REPO.search(sin_mermaid):
        m = REPO.search(sin_mermaid)
        err("Sin repositorio", "el informe contiene una referencia al repositorio: «%s»" % m.group(0))
    cifras(texto, err)
    hardware(texto, err)
    trazabilidad(lineas, err)
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
