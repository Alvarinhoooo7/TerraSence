# -*- coding: utf-8 -*-
"""Reformulacion economica TerraSense. Modelo anual, estructura escalonada.

El precio NO es un dato de entrada: se deriva del costo total con el margen objetivo.
"""
import json, math, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(BASE, "supuestos.json"), encoding="utf-8"))

TC = S["tipo_cambio_usd_clp"]


# ------------------------------------------- BOM y taller estructurados
def pcba_cargos(lote):
    """Cargos de ensamble PCBA de JLCPCB por un lote de placas (US$): tarifas publicadas y envio estimado."""
    p = S["pcba"]
    filas = [f for f in S["bom_filas"] if f.get("jlcpcb") in ("b", "e")]
    juntas = sum(f["pines"] * f["cantidad"] for f in filas)
    extendidas = len({f["codigo"] for f in filas if f["jlcpcb"] == "e"})
    eco = lote <= p["lote_maximo_economico"]
    preparacion = p["preparacion_economico_usd" if eco else "preparacion_estandar_usd"]
    estencil = p["estencil_economico_usd" if eco else "estencil_estandar_usd"]
    piezas = extendidas * p["pieza_extendida_usd"]
    soldadura = juntas * lote * p["junta_usd"]
    envio = p["envio_base_usd"] + p["envio_por_placa_usd"] * lote
    total = preparacion + estencil + piezas + soldadura + envio
    return {"lote": lote, "economico": eco, "preparacion": preparacion, "estencil": estencil, "extendidas": extendidas,
            "piezas": piezas, "juntas": juntas, "soldadura": soldadura, "envio": envio, "total_usd": total,
            "por_placa_usd": total / lote, "por_placa_clp": total / lote * TC}


def internacion_por_equipo_clp():
    c = S["internacion_componentes"]
    return (c["flete_usd"] + c["aduana_usd"]) / c["equipos_por_pedido"] * TC


def derivar_bom_y_taller():
    for f in S["bom_filas"]:
        calculo = f.get("calculo")
        if calculo == "pcba_lote":
            c = pcba_cargos(S["pcba"]["lote_bom"])
            f["precio_original"], f["precio_clp"] = round(c["por_placa_usd"], 4), round(c["por_placa_clp"], 2)
        elif calculo == "carcasa":
            f["precio_clp"] = f["precio_original"] = sum(v for _, v, _ in S["_carcasa_detalle"])
        elif calculo == "internacion":
            f["precio_clp"] = round(internacion_por_equipo_clp(), 2)
            c = S["internacion_componentes"]
            f["precio_original"] = round((c["flete_usd"] + c["aduana_usd"]) / c["equipos_por_pedido"], 4)
    S["bom"] = [[f["equipo"] + (": " + f["modelo"] if f["codigo"] != "—" else ""), f["cantidad"], f["precio_clp"], f["nota"]]
                for f in S["bom_filas"]]
    k = S["internacion_taller"]
    for f in S["taller_filas"]:
        if f["precio_neto_clp"] is None:
            f["precio_neto_clp"] = round(f["precio_original"] * TC * (1 + k["flete_seguro"]) * (1 + k["arancel"]))
    S["equipamiento"] = [[f["equipo"] + ": " + f["modelo"], f["cantidad"], f["precio_neto_clp"], f["vida_util"]]
                         for f in S["taller_filas"]]
    nominal = dict((n, v) for n, v in S["activo_nominal"])
    for f in S["servicios_filas"]:
        if "nominal" in f:
            f["precio_clp"] = nominal[f["nominal"]]
        elif f.get("calculo") == "pcba_total_lote":
            f["precio_clp"] = round(pcba_cargos(S["pcba"]["lote_bom"])["total_usd"] * TC)
        elif f.get("calculo") == "pcba_estencil":
            f["precio_clp"] = round(pcba_cargos(S["pcba"]["lote_bom"])["estencil"] * TC)


derivar_bom_y_taller()


def bom_por_bloque():
    """[(bloque, lineas, subtotal neto por equipo)] en el orden de aparicion."""
    orden = {}
    for f in S["bom_filas"]:
        b = orden.setdefault(f["bloque"], [0, 0.0])
        b[0] += 1
        b[1] += f["cantidad"] * f["precio_clp"]
    return [(k, v[0], v[1]) for k, v in orden.items()]


ANIOS = [S["anio_inicio"] + i for i in range(S["horizonte_anios"])]
INFL = S["inflacion"]
IVA = S["iva"]


def infl(anio):
    """Factor de inflacion acumulada desde el anio base."""
    return (1 + INFL) ** (anio - S["anio_inicio"])


# ---------------------------------------------------------------- BOM
def bom_total():
    return sum(c * p for _, c, p, _ in S["bom"])


BOM = bom_total()
# Costo variable por equipo, sin comision (la comision depende del precio)
VAR_UNIT = BOM * (1 + S["merma_fraccion_bom"] + S["garantia_fraccion_bom"]) + S["envio_neto_por_equipo"]


# ---------------------------------------------------------- costo laboral
def factor_empleador(anio):
    """Costo sobre el bruto: cotizaciones de cargo del empleador mas provisiones."""
    tabla = S["aporte_previsional_empleador"]
    prev = tabla.get(str(anio), tabla[max(tabla, key=lambda k: int(k))])
    return 1 + prev + S["cesantia_empleador"] + S["mutual"] + S["provision_vacaciones"] + S["provision_indemnizacion"]


def sueldo_socio(anio):
    """Escala progresiva por escalones hasta el ultimo tramo declarado; luego inflacion."""
    tabla = S["sueldo_socio_por_anio"]
    ultimo = max(int(k) for k in tabla)
    if str(anio) in tabla:
        return tabla[str(anio)]
    return tabla[str(ultimo)] * (1 + INFL) ** (anio - ultimo)


def nomina(anio):
    d = S["dotacion_por_anio"][str(anio)]
    bruto = d["socios"] * sueldo_socio(anio) + (
        d["contador"] * S["sueldo_contador"]
        + d["marketing"] * S["sueldo_marketing"]
        + d["ensambladores"] * S["sueldo_ensamblador"]
    ) * infl(anio)
    personas = d["socios"] + d["contador"] + d["marketing"] + d["ensambladores"]
    costo = bruto * factor_empleador(anio) * 12
    beneficios = personas * (S["colacion_mensual"] + S["movilizacion_mensual"]) * infl(anio) * 12
    return costo, beneficios, personas, bruto


# ------------------------------------------------- gastos de estructura
def gastos_anio(anio, unidades):
    d = S["dotacion_por_anio"][str(anio)]
    nom, benef, personas, bruto = nomina(anio)
    f = infl(anio)
    arriendo = (S["arriendo_oficina"] if d["oficina"] else 0) * f * 12
    servicios = (S["servicios_basicos_con_oficina"] if d["oficina"] else S["servicios_basicos_sin_oficina"]) * f * 12
    patente = S["patente_comercial_anual"] * f
    software = S["softwares_cloud"] * f * 12
    materiales = S["materiales_oficina"] * f * 12
    mantencion = S["mantencion_equipos"] * f * 12
    pauta = S["pauta_por_equipo"] * f * unidades
    return {
        "nomina": nom,
        "beneficios": benef,
        "personas": personas,
        "bruto_mensual": bruto,
        "arriendo": arriendo,
        "servicios": servicios,
        "patente": patente,
        "software": software,
        "materiales": materiales,
        "mantencion": mantencion,
        "pauta": pauta,
        "total": nom + benef + arriendo + servicios + patente + software + materiales + mantencion + pauta,
    }


# --------------------------------------------------- inversion inicial
EQUIP_TOTAL = sum(c * v for _, c, v, _ in S["equipamiento"])
DEPREC_ANUAL = sum(c * v / vu for _, c, v, vu in S["equipamiento"])
NOMINAL_TOTAL = sum(v for _, v in S["activo_nominal"])
AMORT_NOMINAL_ANUAL = NOMINAL_TOTAL / 5


def inversion_inicial(unidades_anio1, capital_trabajo=None):
    g = gastos_anio(ANIOS[0], unidades_anio1)
    burn_mensual = g["total"] / 12
    if capital_trabajo is None:
        capital_trabajo = burn_mensual * S["capital_trabajo_meses"]
    inventario = VAR_UNIT * unidades_anio1 / 12 * 2  # dos meses de ventas
    total = EQUIP_TOTAL + NOMINAL_TOTAL + capital_trabajo + inventario
    return {
        "equipamiento": EQUIP_TOTAL,
        "activo_nominal": NOMINAL_TOTAL,
        "capital_trabajo": capital_trabajo,
        "inventario": inventario,
        "burn_mensual": burn_mensual,
        "meses_cubiertos": capital_trabajo / burn_mensual,
        "total": total,
    }


# --------------------------------------------------------- precio
def derivar_precio(unidades_por_anio):
    """Resuelve el precio neto base que entrega el margen objetivo sobre el costo total."""
    U = sum(unidades_por_anio[a] * infl(a) for a in ANIOS)
    F = sum(gastos_anio(a, unidades_por_anio[a])["total"] for a in ANIOS)
    v = VAR_UNIT
    m = 1 + S["margen_objetivo"]
    k = S["comision_sobre_bruto"] * (1 + IVA)
    # P*U = m * (F + v*U + k*P*U)  ->  P*U*(1 - m*k) = m*F + m*v*U
    P = (m * F + m * v * U) / (U * (1 - m * k))
    return P, F, U


def redondear_lista(lista):
    """Lleva el precio de lista a la terminación comercial declarada, al alza.

    El redondeo es siempre hacia arriba: el margen resultante nunca baja del
    exigido, sólo lo supera en la fracción redondeada. Es idempotente, de modo
    que un precio ya terminado en la cifra declarada no se mueve.
    """
    paso, fin = S["paso_redondeo_precio"], S["terminacion_precio"]
    return math.ceil((lista - fin) / paso) * paso + fin


# --------------------------------------------------------- credito
def cuota_francesa(capital, tasa_anual, anios):
    i = (1 + tasa_anual) ** (1 / 12) - 1
    n = anios * 12
    return capital * i / (1 - (1 + i) ** -n), i, n


def tabla_amortizacion(capital, tasa_anual, anios):
    cuota, i, n = cuota_francesa(capital, tasa_anual, anios)
    saldo = capital
    filas = []
    for anio in range(1, anios + 1):
        interes_anio = capital_anio = 0.0
        saldo_inicial = saldo
        for _ in range(12):
            interes = saldo * i
            amort = cuota - interes
            saldo -= amort
            interes_anio += interes
            capital_anio += amort
        filas.append({
            "anio": ANIOS[anio - 1],
            "saldo_inicial": saldo_inicial,
            "capital": capital_anio,
            "interes": interes_anio,
            "cuota": capital_anio + interes_anio,
            "saldo_final": max(saldo, 0),
        })
    return cuota, filas


# --------------------------------------------------------- resultados
def tasa_impuesto(anio):
    return S["tasa_impuesto"].get(str(anio), S["tasa_impuesto"]["default"])


def correr(unidades_por_anio=None, precio_forzado=None, factor_ventas=1.0, factor_bom=1.0,
           capital_trabajo=None):
    global VAR_UNIT
    var_guardado = VAR_UNIT
    VAR_UNIT = (BOM * factor_bom) * (1 + S["merma_fraccion_bom"] + S["garantia_fraccion_bom"]) + S["envio_neto_por_equipo"]

    u = unidades_por_anio or {a: round(S["ventas"][str(a)] * factor_ventas) for a in ANIOS}
    P, F, U = derivar_precio(u)
    # El precio derivado se lleva a la terminación comercial antes de que lo use
    # el resto del modelo: las ventas, el flujo y el costo del agricultor parten
    # todos del precio que el cliente ve en la lista.
    P = redondear_lista(P * (1 + IVA)) / (1 + IVA)
    if precio_forzado:
        P = precio_forzado / (1 + IVA)

    inv = inversion_inicial(u[ANIOS[0]], capital_trabajo)
    credito = inv["total"]
    pie = S["pie_total"]
    cuota, amort = tabla_amortizacion(credito, S["tasa_credito_efectiva_anual"], S["plazo_credito_anios"])
    # El pie se abona al banco al desembolso como cuotas pagadas por anticipado:
    # cubre las primeras cuotas del calendario hasta agotarse.
    saldo_pie, pie_aplicado = pie, []
    for a_ in amort:
        cubierto = min(saldo_pie, a_["cuota"])
        pie_aplicado.append(cubierto)
        saldo_pie -= cubierto

    filas, perdida_acum, caja = [], 0.0, inv["capital_trabajo"]
    for idx, a in enumerate(ANIOS):
        q = u[a]
        f = infl(a)
        precio_neto = P * f
        ventas_netas = precio_neto * q
        var_total = VAR_UNIT * f * q + S["comision_sobre_bruto"] * precio_neto * (1 + IVA) * q
        g = gastos_anio(a, q)
        deprec = DEPREC_ANUAL * (infl(ANIOS[5]) if idx >= 5 else 1) if idx < 10 else 0
        # El activo fijo agota su vida util en cinco anios y se renueva al inicio
        # del sexto, a precio reajustado: esa compra sale de la caja.
        reinversion = EQUIP_TOTAL * f if idx == 5 else 0.0
        amort_nom = AMORT_NOMINAL_ANUAL if idx < 5 else 0
        interes = amort[idx]["interes"]
        util_antes = ventas_netas - var_total - g["total"] - deprec - amort_nom - interes
        base = util_antes + perdida_acum
        if base > 0:
            imp = base * tasa_impuesto(a)
            perdida_acum = 0.0
        else:
            imp = 0.0
            perdida_acum = base
        util_neta = util_antes - imp
        flujo = util_neta + deprec + amort_nom - amort[idx]["capital"] - reinversion + pie_aplicado[idx]
        caja += flujo
        filas.append({
            "caja": caja,
            "anio": a, "unidades": q, "precio_neto": precio_neto,
            "ventas": ventas_netas, "variables": var_total, "gastos": g,
            "deprec": deprec, "amort_nom": amort_nom, "interes": interes,
            "util_antes": util_antes, "impuesto": imp, "util_neta": util_neta,
            "capital": amort[idx]["capital"], "reinversion": reinversion, "pie_aplicado": pie_aplicado[idx],
            "flujo": flujo,
            "costo_total": var_total + g["total"],
        })

    VAR_UNIT = var_guardado
    return {
        "precio_neto_base": P, "precio_lista": P * (1 + IVA),
        "inversion": inv, "credito": credito, "pie": pie, "cuota": cuota,
        "cuotas_anticipadas": pie / cuota, "desembolso": inv["total"] + pie,
        "amortizacion": amort, "filas": filas, "unidades": u,
        "fijos_total": F, "unidades_ponderadas": U,
    }


# --------------------------------------------------------- indicadores
def van(inversion, flujos, tasa):
    return -inversion + sum(f / (1 + tasa) ** (i + 1) for i, f in enumerate(flujos))


def tir(inversion, flujos):
    lo, hi = -0.99, 10.0
    for _ in range(300):
        mid = (lo + hi) / 2
        if van(inversion, flujos, mid) > 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def payback(inversion, flujos, tasa=0.0):
    acum = -inversion
    for i, f in enumerate(flujos):
        vf = f / (1 + tasa) ** (i + 1) if tasa else f
        previo = acum
        acum += vf
        if acum >= 0:
            return i + previo / -vf if vf else i + 1
    return None


def resumen(r, etiqueta=""):
    flujos = [f["flujo"] for f in r["filas"]]
    inv = r["desembolso"]
    v = van(inv, flujos, S["tasa_descuento"])
    t = tir(inv, flujos)
    ps = payback(inv, flujos)
    pd = payback(inv, flujos, S["tasa_descuento"])
    return {"etiqueta": etiqueta, "precio": r["precio_lista"], "inversion": r["inversion"]["total"], "desembolso": inv,
            "van": v, "tir": t, "payback": ps, "payback_desc": pd}


def caja_minima(r):
    return min(f["caja"] for f in r["filas"])


def precio_de_quiebre(r_base, criterio, lo=250000.0, hi=None):
    """Precio de lista en que el indicador pedido cruza cero, con el financiamiento congelado.

    criterio: "van" (el proyecto deja de crear valor) o "caja" (la caja se vuelve negativa).
    """
    ct = r_base["inversion"]["capital_trabajo"]
    hi = hi or r_base["precio_lista"] * 1.5

    def valor(precio):
        r = correr(precio_forzado=precio, capital_trabajo=ct)
        return resumen(r)["van"] if criterio == "van" else caja_minima(r)

    for _ in range(60):
        mid = (lo + hi) / 2
        if valor(mid) > 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def dimensionar(reserva_minima=5000000, **kw):
    """Itera el capital de trabajo hasta que la caja nunca baje de la reserva minima.

    Es circular: mas capital de trabajo -> mas credito -> mas interes -> mas perdida.
    """
    ct = None
    piso = None
    for _ in range(60):
        r = correr(capital_trabajo=ct, **kw)
        if piso is None:
            # Piso de politica: nunca menos de N meses de estructura del primer anio.
            piso = r["inversion"]["burn_mensual"] * S["capital_trabajo_meses"]
        caja_min = min(f["caja"] for f in r["filas"])
        objetivo = r["inversion"]["capital_trabajo"] + (reserva_minima - caja_min)
        ct = max(objetivo, piso)
        if abs(r["inversion"]["capital_trabajo"] - ct) < 50000:
            return correr(capital_trabajo=ct, **kw)
    return r


# ==========================================================================
# Salidas: planillas, resultados y documentos generados
# ==========================================================================
import os
import subprocess

ROOT = os.path.abspath(os.path.join(BASE, ".."))


def fmt(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def dec(x, d=2):
    return (("%." + str(d) + "f") % x).replace(".", ",")


def porc(x, d=1):
    return (("%." + str(d) + "f") % (x * 100)).replace(".", ",") + " %"


def planilla_flujo(r, ruta):
    """Escribe la planilla de flujo de caja (doce hojas enlazadas por formulas)."""
    import anexos
    return anexos.planilla_flujo(r, ruta)


def planilla_bom(ruta):
    import anexos
    return anexos.planilla_bom(ruta)


def resultados_markdown(r, ruta):
    ind = resumen(r)
    L = ["# Resultados financieros generados", "",
         "No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.", "",
         "El precio **se deriva** del costo total con un margen exigido del %s; no es un supuesto de "
         "entrada. Una vez derivado se redondea al alza a la terminación comercial de %s, de modo que "
         "el margen resultante supera al exigido y nunca queda por debajo."
         % (porc(S["margen_objetivo"], 0), fmt(S["terminacion_precio"])), "",
         "Precio de lista: **%s** con IVA (%s netos). BOM neta por equipo: **%s**."
         % (fmt(r["precio_lista"]), fmt(r["precio_neto_base"]), fmt(BOM)), "",
         "Inversión inicial: **%s**, desembolsada íntegra por el crédito. Pie de los socios: **%s** "
         "(%s por socio), abonado al banco al desembolso como cuotas pagadas por anticipado: cubre las "
         "primeras %s cuotas mensuales de %s. Desembolso inicial evaluado (inversión más pie): %s."
         % (fmt(r["inversion"]["total"]), fmt(r["pie"]), fmt(r["pie"] / S["socios"]), dec(r["cuotas_anticipadas"], 1),
            fmt(r["cuota"]), fmt(r["desembolso"])), "",
         "| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |",
         "|---|---:|---:|---:|---:|---:|"]
    for f in r["filas"]:
        L.append("| %d | %d | %s | %s | %s | %s |" % (f["anio"], f["unidades"], fmt(f["ventas"]),
                                                      fmt(f["util_neta"]), fmt(f["flujo"]), fmt(f["caja"])))
    L += ["", "| Indicador | Valor |", "|---|---:|",
          "| VAN al %s | %s |" % (porc(S["tasa_descuento"], 0), fmt(ind["van"])),
          "| TIR efectiva anual | %s |" % porc(ind["tir"], 2),
          "| Payback simple | %s años |" % dec(ind["payback"]),
          "| Payback descontado | %s años |" % dec(ind["payback_desc"]),
          "| Caja mínima del horizonte | %s |" % fmt(min(f["caja"] for f in r["filas"])),
          "| Deuda al cierre de %d | %s |" % (ANIOS[-1], fmt(0)), "",
          "Evaluación anual sobre diez años (2027–2036), sin valor terminal. Los ejercicios %d y %d cierran "
          "con pérdida: la estructura mínima para operar formalmente no se cubre con el volumen inicial, y "
          "esa pérdida está financiada por el capital de trabajo." % (ANIOS[0], ANIOS[1]), ""]
    with open(ruta, "w", encoding="utf-8", newline="\r\n") as fh:
        fh.write("\n".join(L))


def main():
    r = dimensionar()
    import anexos
    destino = os.path.join(ROOT, "Evaluacion", "Evaluacion 2", "Anexos")
    os.makedirs(destino, exist_ok=True)
    planilla_flujo(r, os.path.join(ROOT, "Flujo de caja y financiamiento - TerraSense.xlsx"))
    planilla_flujo(r, os.path.join(destino, "Anexo B - Flujo de caja TerraSense.xlsx"))
    anexos.anexo_a(os.path.join(destino, "Anexo A - Cotizaciones TerraSense.xlsx"))
    anexos.anexo_e(os.path.join(destino, "Anexo E - Protocolos FAT y SAT TerraSense.xlsx"))
    anexos.anexo_f(os.path.join(destino, "Anexo F - Carta Gantt TerraSense.xlsx"))
    planilla_bom(os.path.join(ROOT, "PCB", "BOM_TerraSense.xlsx"))
    resultados_markdown(r, os.path.join(ROOT, "docs", "RESULTADOS_FINANCIEROS.md"))
    for script in ("seccion_economica.py", "corregir_informe.py", "documentacion.py",
                   "informe.py", "comercial.py"):
        subprocess.run([sys.executable, os.path.join(BASE, script)], check=True, cwd=BASE)
    ind = resumen(r)
    print("Precio de lista: %s | BOM: %s | VAN: %s | TIR: %s"
          % (fmt(r["precio_lista"]), fmt(BOM), fmt(ind["van"]), porc(ind["tir"], 2)))


if __name__ == "__main__":
    main()
