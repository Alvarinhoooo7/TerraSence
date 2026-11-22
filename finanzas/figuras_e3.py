"""Genera las figuras de las mediciones del informe de la Evaluación 3.

Lee los registros crudos de `Evaluacion/Evaluacion 3/Registros de ensayo/` y los del
ensayo de consumo del informe 2, y escribe `Evaluacion/Evaluacion 3/Figuras/fig3_*.png`.
Cada figura se dibuja sólo si existe su registro: un ensayo no ejecutado no produce
una gráfica inventada.

    python finanzas/figuras_e3.py
"""

import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
E3 = RAIZ / "Evaluacion" / "Evaluacion 3"
REG = E3 / "Registros de ensayo"
D07 = RAIZ / "Evaluacion" / "Evaluacion 2" / "Registros de banco" / "D-07 consumo"
SALIDA = E3 / "Figuras"

VERDE = "#1F5E3B"
VERDE_M = "#3C8D5A"
VERDE_C = "#E7F1EA"
GRIS = "#4A5560"
GRIS_M = "#8A949C"
GRIS_C = "#F2F3F1"
ROJO = "#A93A3A"
ROJO_C = "#F8E6E4"
AZUL = "#2B6CB0"
AZUL_C = "#E5EEF8"
AMBAR = "#B7791F"
AMBAR_C = "#FBF1DF"
TINTA = "#1B1B1B"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.edgecolor": "#B8BEC3",
    "axes.linewidth": 0.8,
    "axes.labelcolor": TINTA,
    "axes.titleweight": "bold",
    "axes.titlesize": 11.5,
    "axes.titlelocation": "left",
    "axes.titlepad": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": "#E3E6E8",
    "grid.linewidth": 0.7,
    "xtick.color": GRIS,
    "ytick.color": GRIS,
    "legend.frameon": False,
    "figure.dpi": 100,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.15,
})


def guardar(fig, nombre):
    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta = SALIDA / nombre
    fig.savefig(ruta, facecolor="white")
    plt.close(fig)
    print("  %s" % ruta.relative_to(RAIZ))


def nota(fig, texto):
    fig.text(0.01, -0.01, texto, fontsize=8.2, color=GRIS_M, ha="left", va="top")


def leer_csv(ruta):
    with open(ruta, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def etiqueta_barra(ax, barras, fmt, dy=0.01, color=TINTA, dentro=False):
    alto = ax.get_ylim()[1]
    for b in barras:
        v = b.get_height()
        y = v - alto * 0.06 if dentro else v + alto * dy
        ax.text(b.get_x() + b.get_width() / 2, y, fmt(v), ha="center", va="bottom",
                fontsize=9, color="white" if dentro else color, fontweight="bold")


# --------------------------------------------------------------------------- consumo
def corriente(carpeta):
    filas = leer_csv(carpeta / "corriente.csv")
    t = np.array([float(r["t_unix"]) for r in filas])
    v = np.array([float(r["voltaje_V"]) for r in filas])
    i = np.array([float(r["corriente_A"]) for r in filas]) * 1000
    return t, v, i


def media_movil(x, n):
    relleno = np.concatenate([np.full(n // 2, x[0]), x, np.full(n - 1 - n // 2, x[-1])])
    return np.convolve(relleno, np.ones(n) / n, mode="valid")


def fig_consumo_firmware():
    """Corriente por estado del firmware original frente al ajustado (D-07)."""
    a = json.loads((D07 / "1 firmware original" / "resumen.json").read_text(encoding="utf-8"))
    b = json.loads((D07 / "3 firmware final 80 MHz y anuncio 150 ms" / "resumen.json").read_text(encoding="utf-8"))
    estados = [("Reposo con\nanuncio BLE", "Reposo con anuncio BLE"),
               ("LED y\nbuzzer", "LED y buzzer"),
               ("Sonda\nenergizada", "Sonda energizada (consulta continua)")]
    va = [a["tramos"][k]["i_med"] for _, k in estados] + [np.mean([m["i_med"] for m in a["mediciones"]])]
    vb = [b["tramos"][k]["i_med"] for _, k in estados] + [np.mean([m["i_med"] for m in b["mediciones"]])]
    nombres = [e for e, _ in estados] + ["Medición\ncompleta"]
    x = np.arange(len(nombres))
    fig, ax = plt.subplots(figsize=(8.6, 4.3))
    w = 0.36
    b1 = ax.bar(x - w / 2, va, w, color=GRIS_M, label="Firmware original (240 MHz, anuncio cada 20–40 ms)")
    b2 = ax.bar(x + w / 2, vb, w, color=VERDE, label="Firmware ajustado (80 MHz, anuncio cada 152–162 ms)")
    ax.set_ylim(0, 105)
    etiqueta_barra(ax, b1, lambda v: "%.1f" % v, color=GRIS)
    etiqueta_barra(ax, b2, lambda v: "%.1f" % v, color=VERDE)
    for k in range(len(nombres)):
        red = (va[k] - vb[k]) / va[k] * 100
        ax.annotate("−%.0f %%" % red, (x[k] + w / 2, vb[k]), xytext=(0, 22), textcoords="offset points",
                    ha="center", fontsize=8.5, color=VERDE_M)
    ax.set_xticks(x, nombres)
    ax.set_ylabel("Corriente media a 5,05 V (mA)")
    ax.grid(axis="x", visible=False)
    ax.legend(loc="upper left", fontsize=8.6, ncol=1)
    ax.set_title("Corriente por estado antes y después del ajuste del firmware")
    nota(fig, "Medidor USB FNIRSI FNB58 a 100 muestras/s en la entrada de alimentación de la placa de laboratorio.")
    guardar(fig, "fig3_consumo_firmware.png")


def fig_perfil_consumo():
    """Perfil de corriente con el firmware vigente y detalle de una medición."""
    carpeta = REG / "consumo"
    if not (carpeta / "marcas.json").exists():
        return
    t, v, i = corriente(carpeta)
    r = resumen_consumo(carpeta)
    marcas = json.loads((carpeta / "marcas.json").read_text(encoding="utf-8"))
    t0 = min(m["t"] for m in marcas)
    tf = max(m["t"] for m in marcas)
    m = (t >= t0) & (t <= tf)
    ts = t[m] - t0
    fig, (ax, ax2) = plt.subplots(2, 1, figsize=(10, 6.8), gridspec_kw={"height_ratios": [1.1, 1], "hspace": 0.5})
    for k, (c, txt) in {"A": (GRIS_C, "Reposo con\nanuncio BLE"), "B": (AZUL_C, "Diez mediciones con el ciclo de la aplicación"),
                        "E": (GRIS_C, "Reposo\nfinal")}.items():
        e = [x["t"] - t0 for x in marcas if x["tramo"] == k]
        ax.axvspan(min(e), max(e), color=c, zorder=0, lw=0)
        ax.text((min(e) + max(e)) / 2, 143, txt, ha="center", va="center", fontsize=8.8, color=GRIS)
    ax.plot(ts, media_movil(i[m], 10), color="#9DB9DA", lw=0.6, label="media móvil de 100 ms")
    ax.plot(ts, media_movil(i[m], 100), color=AZUL, lw=1.6, label="media móvil de 1 s")
    ax.axhline(r["base"], color=VERDE, ls="--", lw=1.1)
    ax.text(2, r["base"] - 9, ("reposo: %.1f mA" % r["base"]).replace(".", ","), fontsize=8.8, color=VERDE,
            fontweight="bold")
    con = [x["t"] - t0 for x in marcas if x["evento"].endswith(": conectado")]
    for k, c in enumerate(con, 1):
        ax.text(c + 1.5, 118, str(k), ha="center", fontsize=8, color=AZUL, fontweight="bold")
    ax.set_xlim(0, ts[-1])
    ax.set_ylim(0, 160)
    ax.set_xlabel("Tiempo (s)")
    ax.set_ylabel("Corriente (mA)")
    ax.legend(loc="lower right", fontsize=8.3, ncol=2)
    ax.set_title("Corriente del prototipo con el firmware vigente: reposo y diez mediciones")
    con_abs = [x["t"] for x in marcas if x["evento"].endswith(": conectado")]
    des_abs = [x["t"] for x in marcas if x["evento"].endswith("desconectado")]
    c0 = con_abs[4]
    d0 = min(d for d in des_abs if d > c0)
    w = (t >= c0 - 2) & (t <= d0 + 2)
    ax2.axvspan(0, d0 - c0, color=AZUL_C, zorder=0, lw=0)
    ax2.plot(t[w] - c0, i[w], color="#9DB9DA", lw=0.7, label="muestras cada 10 ms")
    ax2.plot(t[w] - c0, media_movil(i[w], 25), color=AZUL, lw=1.6, label="media móvil de 250 ms")
    ax2.axhline(r["base"], color=VERDE, ls="--", lw=1.1)
    med = r["mediciones"][4]
    ax2.text((d0 - c0) / 2, 165, ("medición: %.1f s, %.0f mA de media, %.3f mWh" % (med["s"], med["i"], med["e"])).replace(".", ","),
             ha="center", fontsize=8.8, color=AZUL, fontweight="bold")
    ax2.set_ylim(0, 180)
    ax2.set_xlim(-2, d0 - c0 + 2)
    ax2.set_xlabel("Tiempo desde la conexión (s)")
    ax2.set_ylabel("Corriente (mA)")
    ax2.legend(loc="lower right", fontsize=8.3, ncol=2)
    ax2.set_title("Detalle de la medición 5: conexión, lectura de la sonda, envío y desconexión")
    nota(fig, "FNIRSI FNB58 a 100 muestras/s en la entrada USB de 5,05 V de la placa de laboratorio; mediciones disparadas "
              "desde el PC con el mismo ciclo de la aplicación.")
    guardar(fig, "fig3_perfil_consumo.png")


def resumen_consumo(carpeta):
    """Reposo y energía de cada medición de una campaña con marcas de conexión y desconexión."""
    t, v, i = corriente(carpeta)
    marcas = json.loads((carpeta / "marcas.json").read_text(encoding="utf-8"))

    def tramo(k):
        e = [m["t"] for m in marcas if m["tramo"] == k]
        return min(e) + 2, max(e) - 1

    def stats(a, b):
        s = (t >= a) & (t < b)
        return dict(i=float(i[s].mean()), e=float((v[s] * i[s]).sum() * 0.01 / 3600), s=float(b - a), v=float(v[s].mean()))

    base = np.mean([stats(*tramo("A"))["i"], stats(*tramo("E"))["i"]])
    con = [m["t"] for m in marcas if m["evento"].endswith(": conectado")]
    des = [m["t"] for m in marcas if m["evento"].endswith("desconectado")]
    med = [stats(c - 0.3, d + 0.3) for c, d in zip(con, des)]
    for m in med:
        m["exceso"] = m["e"] - base * m["v"] * m["s"] / 3600
    return dict(base=float(base), mediciones=med)


def fig_energia_medicion():
    """Energía de cada medición en las dos campañas de consumo frente al balance de diseño."""
    b = json.loads((D07 / "3 firmware final 80 MHz y anuncio 150 ms" / "resumen.json").read_text(encoding="utf-8"))
    series = [("31-10-2026, desde la aplicación", [m["e_mwh"] for m in b["mediciones"]],
               [m["s"] for m in b["mediciones"]], b["base_i"], GRIS_M)]
    nueva = REG / "consumo"
    if (nueva / "marcas.json").exists():
        r = resumen_consumo(nueva)
        (nueva / "resumen.json").write_text(json.dumps(r, indent=1), encoding="utf-8")
        series.append(("21-11-2026, desde el PC con el ciclo de la aplicación", [m["e"] for m in r["mediciones"]],
                       [m["s"] for m in r["mediciones"]], r["base"], VERDE))
    fig, ax = plt.subplots(figsize=(9, 4.2))
    w = 0.8 / len(series)
    for k, (nombre, e, dur, base, color) in enumerate(series):
        n = np.arange(1, len(e) + 1)
        ax.bar(n - 0.4 + w * (k + 0.5), e, w * 0.92, color=color,
               label="%s: %s mWh en %s s (reposo %s mA)" % (nombre, ("%.2f" % np.mean(e)).replace(".", ","),
                                                           ("%.1f" % np.mean(dur)).replace(".", ","),
                                                           ("%.1f" % base).replace(".", ",")))
    ax.axhline(1.106, color=ROJO, ls="--", lw=1.1)
    ax.text(10.45, 1.13, "balance de diseño: 1,106 mWh por ciclo de 16 s", ha="right", fontsize=8.6, color=ROJO)
    ax.set_ylim(0, 1.45)
    ax.set_xticks(range(1, 11))
    ax.set_xlabel("Medición")
    ax.set_ylabel("Energía por medición (mWh)")
    ax.grid(axis="x", visible=False)
    ax.legend(loc="upper left", fontsize=8.3, bbox_to_anchor=(0, 0.9))
    ax.set_title("Energía de cada medición frente al balance de diseño")
    nota(fig, "Energía integrada de tensión × corriente en la ventana de conexión de cada medición (FNB58, 100 muestras/s, entrada de 5,05 V).")
    guardar(fig, "fig3_energia_medicion.png")


def fig_autonomia():
    """Semanas y mediciones por carga en uso habitual: sin reposo, diseño y reposo profundo."""
    sin_reposo = semanas_por_carga(escenarios_descarga()[0][1])
    filas = [("Firmware sin reposo\n(consumo medido)", sin_reposo, GRIS_M),
             ("Balance de diseño\n(reposo ligero, 18 mA)", 17.9, "#B8BEC3", 359)]
    if (REPOSO / "marcas.json").exists():
        r = resumen_reposo()
        filas += [("Reposo profundo:\nmedir 60 s tras despertar", autonomia_reposo(DESPERTAR_S["peor"], r=r)["semanas"], VERDE_M),
                  ("Reposo profundo:\nmedir 15 s tras despertar", autonomia_reposo(DESPERTAR_S["tipico"], r=r)["semanas"], VERDE)]
    fig, ax = plt.subplots(figsize=(9.2, 3.9))
    y = np.arange(len(filas))[::-1]
    bb = ax.barh(y, [f[1] for f in filas], color=[f[2] for f in filas], height=0.58)
    for b, f in zip(bb, filas):
        ax.text(b.get_width() + 0.4, b.get_y() + b.get_height() / 2,
                ("%.1f semanas · %d mediciones" % (f[1], f[3] if len(f) > 3 else round(f[1] * 20))).replace(".", ","),
                va="center", fontweight="bold", color=TINTA if f[2] == "#B8BEC3" else f[2], fontsize=9)
    ax.axvline(6.5, color=ROJO, ls="--", lw=1.2)
    ax.text(6.7, y[0] + 0.45, "criterio R07: 130 mediciones", color=ROJO, fontsize=8.4)
    ax.axvline(17.4, color=AZUL, ls=":", lw=1.4)
    ax.text(17.6, y[-1] - 0.5, "≈ 4 meses", color=AZUL, fontsize=8.4)
    ax.set_yticks(y, [f[0] for f in filas])
    ax.set_xlim(0, 40)
    ax.set_ylim(y[-1] - 0.75, y[0] + 0.75)
    ax.set_xlabel("Semanas por carga en uso habitual (dos jornadas semanales de 2 h con 10 mediciones)")
    ax.grid(axis="y", visible=False)
    ax.set_title("Autonomía por carga antes y después del reposo profundo")
    nota(fig, "Placa del instrumento: 5.920 mWh útiles, espera despierta medida en banco, reposo profundo de 40 µA estimado "
              "por hoja de datos, gracia de 120 s tras cada medición,\napagado entre jornadas y autodescarga del 2 % mensual.")
    guardar(fig, "fig3_autonomia.png")


def fig_perfil_reposo():
    """Campaña con reposo profundo: despierta, dormida, diez mediciones, gracia y dormida."""
    if not (REPOSO / "marcas.json").exists():
        return
    r = resumen_reposo()
    (REPOSO / "resumen.json").write_text(json.dumps(r, indent=1, ensure_ascii=False), encoding="utf-8")
    t, v, i = corriente(REPOSO)
    marcas = json.loads((REPOSO / "marcas.json").read_text(encoding="utf-8"))
    t0 = min(m["t"] for m in marcas)
    tf = max(m["t"] for m in marcas)
    m = (t >= t0) & (t <= tf)
    ts = t[m] - t0
    fig, ax = plt.subplots(figsize=(10.4, 4.6))
    nombres = {"A": ("Despierta,\nsin conexión", GRIS_C), "D1": ("Dormida", VERDE_C), "B": ("Diez mediciones\ncada 20 s", AZUL_C),
               "G": ("Gracia de\n120 s", GRIS_C), "D2": ("Dormida", VERDE_C)}
    for k, (txt, c) in nombres.items():
        e = [x["t"] - t0 for x in marcas if x["tramo"] == k]
        a, b = min(e), max(e)
        ax.axvspan(a, b, color=c, zorder=0, lw=0)
        ax.text((a + b) / 2, 150, txt, ha="center", va="center", fontsize=8.6, color=GRIS)
        ax.text((a + b) / 2, 124, ("media\n%.1f mA" % r["tramos"][k]["i"]).replace(".", ","),
                ha="center", fontsize=9, fontweight="bold", color=VERDE if k.startswith("D") else AZUL)
    ax.plot(ts, media_movil(i[m], 10), color="#9DB9DA", lw=0.5, label="media móvil de 100 ms")
    ax.plot(ts, media_movil(i[m], 100), color=AZUL, lw=1.5, label="media móvil de 1 s")
    d1 = [x["t"] - t0 for x in marcas if x["tramo"] == "D1"]
    xm = (min(d1) + max(d1)) / 2
    ax.annotate("", xy=(xm, r["dormida"] + 2), xytext=(xm, r["despierta"] - 2),
                arrowprops=dict(arrowstyle="->", color=VERDE, lw=1.6))
    ax.text(xm + 6, (r["dormida"] + r["despierta"]) / 2 + 4, ("−%.1f mA\n(−%.0f %%)" % (r["caida"], r["caida"] / r["despierta"] * 100)).replace(".", ","),
            fontsize=9.5, color=VERDE, fontweight="bold", va="center")
    ax.axhline(r["dormida"], color=AMBAR, ls=":", lw=1.1)
    g = [x["t"] - t0 for x in marcas if x["tramo"] == "G"]
    ax.text((min(g) + max(g)) / 2, r["dormida"] + 14, "piso de la placa de laboratorio:\ntarjeta de desarrollo y módulo de carga",
            ha="center", va="center", fontsize=8.2, color=AMBAR)
    ax.set_xlim(0, ts[-1])
    ax.set_ylim(0, 165)
    ax.set_xlabel("Tiempo (s)")
    ax.set_ylabel("Corriente en la entrada USB (mA)")
    ax.legend(loc="lower left", fontsize=8.2, ncol=1, bbox_to_anchor=(0.285, 0.0))
    ax.set_title("Corriente con reposo profundo: el equipo duerme entre mediciones")
    nota(fig, "FNIRSI FNB58 a 100 muestras/s en la entrada USB de 5,05 V de la placa de laboratorio con el firmware 1.2.0; "
              "mediciones disparadas desde el PC con el ciclo de la aplicación.")
    guardar(fig, "fig3_perfil_reposo.png")


# --------------------------------------------------------------------------- sonda
CONDICIONES = [("Aire", "Al aire", GRIS_M), ("Agua potable", "Agua potable", AZUL),
               ("Suelo seco", "Suelo seco", AMBAR), ("Suelo regado (estabilizacion)", "Suelo regado", VERDE)]


def sonda():
    ruta = REG / "sonda.csv"
    return leer_csv(ruta) if ruta.exists() else []


def fig_sonda_condiciones():
    filas = sonda()
    if not filas:
        return
    variables = [("humedad_pct", "Humedad (% vol.)"), ("ce_uScm", "CE (µS/cm)"),
                 ("ph", "pH"), ("temp_suelo_C", "Temperatura (°C)")]
    fig, ejes = plt.subplots(1, 4, figsize=(11.2, 3.9))
    for ax, (campo, titulo) in zip(ejes, variables):
        for k, (cond, nombre, color) in enumerate(CONDICIONES):
            vals = np.array([float(f[campo]) for f in filas if f["condicion"] == cond])
            if cond.startswith("Suelo regado"):
                vals = vals[-8:]
            if not len(vals):
                continue
            jit = (np.random.default_rng(k).random(len(vals)) - 0.5) * 0.28
            ax.scatter(np.full(len(vals), k) + jit, vals, s=14, color=color, alpha=0.55, lw=0)
            ax.errorbar(k, vals.mean(), yerr=vals.std(ddof=1) if len(vals) > 1 else 0, fmt="o", ms=7,
                        color=color, mec="white", mew=1.2, capsize=4, lw=1.4)
            ax.text(k, ax.get_ylim()[1], "", fontsize=1)
        ax.set_xticks(range(len(CONDICIONES)), [c[1].replace(" ", "\n") for c in CONDICIONES], fontsize=8.6)
        ax.set_title(titulo, fontsize=10)
        ax.grid(axis="x", visible=False)
        ax.margins(y=0.15)
    ejes[2].axhspan(3, 9, color=VERDE_C, zorder=0)
    ejes[2].text(3.45, 8.75, "rango de la sonda", fontsize=7.5, color=VERDE_M, ha="right", va="top")
    fig.suptitle("Lecturas de la sonda en cuatro condiciones (media ± desviación estándar)", x=0.01, ha="left",
                 fontweight="bold", fontsize=11.5)
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    nota(fig, "Sonda alimentada por la placa de laboratorio; cada punto es una ráfaga de 10 consultas Modbus con media recortada. "
              "El pH al aire carece de significado físico.")
    guardar(fig, "fig3_sonda_condiciones.png")


def fig_riego():
    filas = [f for f in sonda() if f["condicion"].startswith("Suelo")]
    if not filas:
        return
    seco = [f for f in filas if f["condicion"] == "Suelo seco"]
    mojado = [f for f in filas if f["condicion"] != "Suelo seco"]
    t = np.array([datetime.strptime(f["fecha_hora"], "%Y-%m-%d %H:%M:%S").timestamp() for f in mojado])
    x = (t - t[0]) / 60
    fig, ejes = plt.subplots(3, 1, figsize=(9.4, 7.4), sharex=True, gridspec_kw={"hspace": 0.22})
    for ax, (campo, nombre, color) in zip(ejes, [("humedad_pct", "Humedad (% vol.)", AZUL),
                                                ("ce_uScm", "CE (µS/cm)", AMBAR), ("ph", "pH", VERDE)]):
        y = np.array([float(f[campo]) for f in mojado])
        base = np.mean([float(f[campo]) for f in seco])
        ax.plot(x, y, "o-", ms=3.6, lw=1.3, color=color, label="suelo regado")
        ax.axhline(base, color=GRIS_M, ls="--", lw=1.1, label="suelo seco, antes del riego")
        ax.text(x[-1], base, ("  %.1f" % base).replace(".", ","), va="center", ha="left", fontsize=8.6, color=GRIS)
        ax.text(x[-1], y[-1], ("  %.1f" % y[-1]).replace(".", ","), va="center", ha="left", fontsize=8.6,
                color=color, fontweight="bold")
        ax.set_ylabel(nombre)
        ax.margins(y=0.2)
    ejes[0].legend(loc="center right", fontsize=8.6, bbox_to_anchor=(1, 0.45))
    ejes[-1].set_xlabel("Tiempo desde la primera lectura después del riego (min)")
    ejes[-1].set_xlim(-0.2, x[-1] * 1.07)
    ejes[0].set_title("Respuesta de la sonda al riego de la maceta")
    nota(fig, "La humedad sube de inmediato y se estabiliza; la CE y el pH se reacomodan durante varios minutos "
              "mientras el agua se reparte en el suelo.")
    guardar(fig, "fig3_riego.png")


def fig_npk_ce():
    filas = [f for f in sonda() if float(f["ce_uScm"]) > 0]
    if not filas:
        return
    ce = np.array([float(f["ce_uScm"]) for f in filas])
    fig, ax = plt.subplots(figsize=(7.6, 4.4))
    for campo, nombre, color in [("n_mgkg", "N", VERDE), ("p_mgkg", "P", AMBAR), ("k_mgkg", "K", AZUL)]:
        y = np.array([float(f[campo]) for f in filas])
        a, b = np.polyfit(ce, y, 1)
        r2 = np.corrcoef(ce, y)[0, 1] ** 2
        ax.scatter(ce, y, s=18, color=color, alpha=0.7, lw=0, label=("%s = %.4f · CE %+.1f   (R² = %.4f)" % (nombre, a, b, r2)).replace(".", ","))
        xs = np.linspace(0, ce.max() * 1.05, 50)
        ax.plot(xs, a * xs + b, color=color, lw=1)
    ax.set_xlabel("Conductividad eléctrica (µS/cm)")
    ax.set_ylabel("Valor de referencia (mg/kg)")
    ax.set_xlim(0)
    ax.set_ylim(0)
    ax.legend(loc="upper left", fontsize=8.6)
    ax.set_title("N, P y K entregados por la sonda frente a la conductividad")
    nota(fig, "Todas las lecturas con CE mayor que cero (agua potable, suelo seco y suelo regado).")
    guardar(fig, "fig3_npk_ce.png")


def fig_modbus():
    corridas = [("Al aire\n31-10-2026", 64, 69, 74), ("Al aire, repetición\n31-10-2026", 64, 69, 74)]
    ruta = REG / "03_D14_enterrada.txt"
    if ruta.exists():
        import re
        m = re.search(r"mín (\d+) ms, prom (\d+) ms, máx (\d+) ms", ruta.read_text(encoding="utf-8"))
        if m:
            corridas.append(("Enterrada en suelo\n21-11-2026", *map(int, m.groups())))
    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(10, 3.6), gridspec_kw={"width_ratios": [1, 1.25], "wspace": 0.35})
    y = np.arange(len(corridas))[::-1]
    bb = ax.barh(y, [1000] * len(corridas), color=VERDE, height=0.55)
    for b in bb:
        ax.text(500, b.get_y() + b.get_height() / 2, "1.000 de 1.000 sin error de CRC", ha="center", va="center",
                color="white", fontsize=8.6, fontweight="bold")
    ax.set_yticks(y, [c[0] for c in corridas], fontsize=8.6)
    ax.set_xlim(0, 1000)
    ax.set_xlabel("Consultas Modbus consecutivas")
    ax.set_title("Lecturas correctas por corrida")
    ax.grid(axis="y", visible=False)
    for yy, c in zip(y, corridas):
        ax2.plot([c[1], c[3]], [yy, yy], color=AZUL, lw=2.4, solid_capstyle="round")
        ax2.plot(c[2], yy, "o", color=AZUL, mec="white", ms=9)
        ax2.text(c[3] + 0.6, yy, "mín %d · prom %d · máx %d ms" % c[1:], va="center", fontsize=8.6, color=GRIS)
    ax2.set_yticks(y, [""] * len(y))
    ax2.set_xlim(60, 92)
    ax2.set_xlabel("Tiempo de respuesta por consulta (ms)")
    ax2.set_title("Tiempo de respuesta de la sonda")
    ax2.grid(axis="y", visible=False)
    nota(fig, "Ensayo D-14: 4.800 baudios, sin reintentos y con la sonda energizada durante toda la corrida (unos 120 s).")
    guardar(fig, "fig3_modbus.png")


def fig_bme():
    ruta = REG / "bme.csv"
    if not ruta.exists():
        return
    filas = leer_csv(ruta)
    t = [datetime.strptime(f["fecha_hora"], "%Y-%m-%d %H:%M:%S") for f in filas]
    # Primera lectura del día, 38 s después del reinicio de la placa (monitor serie, comando 6).
    t_ini, ini = datetime(2026, 11, 21, 11, 36, 55), {"temp_aire_C": 22.71, "presion_hPa": 961.92, "hr_pct": 49.18}
    app = datetime(2026, 11, 21, 12, 24, 11), {"temp_aire_C": 24.1, "presion_hPa": 962.0, "hr_pct": 47.5}
    import matplotlib.dates as mdates
    fig, ejes = plt.subplots(1, 3, figsize=(11.4, 3.7), gridspec_kw={"wspace": 0.36})
    for ax, (campo, nombre, color, fmt) in zip(ejes, [("temp_aire_C", "Temperatura del aire (°C)", ROJO, "%.2f"),
                                                     ("hr_pct", "Humedad relativa (%)", AZUL, "%.1f"),
                                                     ("presion_hPa", "Presión (hPa)", VERDE, "%.1f")]):
        y = np.array([float(f[campo]) for f in filas])
        ax.plot(t, y, "o-", ms=2.8, lw=1, color=color, label="registro cada 20 s")
        ax.plot([t_ini], [ini[campo]], "D", ms=6, color=GRIS, label="lectura al reiniciar")
        ax.plot([app[0]], [app[1][campo]], "s", ms=6, color=AMBAR, label="medición desde la aplicación")
        ax.set_title(nombre, fontsize=10)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax.set_xlabel("Hora del 21-11-2026")
        ax.margins(y=0.25)
        ax.text(0.98, 0.05, ("10 min: ±" + fmt) % ((y.max() - y.min()) / 2), transform=ax.transAxes, ha="right",
                fontsize=8.4, color=GRIS)
    ejes[0].legend(loc="center right", fontsize=7.6)
    fig.suptitle("Sensor ambiental de la placa de laboratorio a lo largo de la sesión de ensayo", x=0.01, ha="left",
                 fontweight="bold", fontsize=11.5)
    fig.subplots_adjust(top=0.82)
    nota(fig, "BME280 en modo forzado, ráfaga de 10 con media recortada; placa sin carcasa sobre la mesa, sin referencia de contraste.")
    guardar(fig, "fig3_bme280.png")


# Celda de 2.000 mAh con 1.600 mAh útiles a 3,7 V (5.920 mWh), como en el modelo de autonomía del capítulo V.
ENERGIA_UTIL_MWH = 5920.0
CURVA_CELDA = [(3.30, 0), (3.60, 5), (3.70, 15), (3.75, 25), (3.80, 40), (3.85, 55), (3.95, 70), (4.05, 85), (4.20, 100)]


def tension_celda(pct):
    v = [c[0] for c in CURVA_CELDA]
    p = [c[1] for c in CURVA_CELDA]
    return np.interp(pct, p, v)


def semanas_por_carga(p_mw):
    """Método del modelo de autonomía: dos jornadas semanales de 2 h, consumo apagado y autodescarga."""
    por_semana = 2 * 2 * p_mw + 7 * 24 * 0.076 + 7 * 4.93
    return ENERGIA_UTIL_MWH / por_semana


# Reposo profundo (firmware 1.2.0). La corriente dormida de la placa del instrumento es una estimación
# de hoja de datos (ESP32 en reposo profundo, corriente propia del RT9080 y divisor de batería): la placa
# de laboratorio no la muestra porque su tarjeta de desarrollo y su módulo de carga siguen consumiendo.
REPOSO = REG / "reposo"
DORMIDA_INSTRUMENTO_MA = 0.040
GRACIA_S = 120.0
EXCESO_MEDICION_MWH = 0.08  # máximo medido sobre la espera despierta (campaña de consumo del 21-11-2026)
DESPERTAR_S = {"tipico": 15.0, "peor": 60.0}


def resumen_reposo():
    """Corriente media de cada tramo de la campaña con reposo profundo y tiempos de sus mediciones."""
    t, v, i = corriente(REPOSO)
    marcas = json.loads((REPOSO / "marcas.json").read_text(encoding="utf-8"))

    def limites(k):
        e = [m["t"] for m in marcas if m["tramo"] == k]
        return min(e), max(e)

    tramos = {}
    for k in ("A", "D1", "B", "G", "D2"):
        a, b = limites(k)
        # Se descartan 2 s en cada borde: arranque, apagado de la radio y cambio de tramo.
        sel = (t >= a + 2) & (t < b - 2)
        tramos[k] = dict(i=float(i[sel].mean()), i_min=float(i[sel].min()), i_max=float(i[sel].max()),
                         v=float(v[sel].mean()), s=float(b - a))
    med = leer_csv(REPOSO / "mediciones.csv")
    ciclos = [float(m["ciclo_s"]) for m in med]
    r = dict(tramos=tramos, despierta=(tramos["A"]["i"] + tramos["G"]["i"]) / 2,
             dormida=(tramos["D1"]["i"] + tramos["D2"]["i"]) / 2,
             ciclo_medio=float(np.mean(ciclos)), ciclo_min=min(ciclos), ciclo_max=max(ciclos),
             mediciones=len(med), correctas=sum(1 for m in med if not m["error"]))
    r["caida"] = r["despierta"] - r["dormida"]
    return r


def autonomia_reposo(despertar_s, jornadas=2, apaga=True, r=None):
    """Semanas y mediciones por carga con reposo profundo: cada medición mantiene despierto el equipo
    desde que se despierta hasta el fin de la gracia; el resto de la jornada duerme."""
    r = r or resumen_reposo()
    p_despierta = r["tramos"]["A"]["i"] * 3.7
    p_dormida = DORMIDA_INSTRUMENTO_MA * 3.7
    despierto = despertar_s + r["ciclo_medio"] + GRACIA_S
    e_medicion = p_despierta * despierto / 3600 + EXCESO_MEDICION_MWH
    e_jornada = 10 * e_medicion + p_dormida * (7200 - 10 * despierto) / 3600
    resto = 7 * 24 * 0.076 if apaga else (168 - 2 * jornadas) * p_dormida
    por_semana = jornadas * e_jornada + resto + 7 * 4.93
    semanas = ENERGIA_UTIL_MWH / por_semana
    return dict(semanas=semanas, mediciones=semanas * 10 * jornadas, e_medicion=e_medicion,
                e_jornada=e_jornada, despierto_s=despierto, p_despierta=p_despierta, p_dormida=p_dormida)


def escenarios_descarga():
    """Potencia que toma de la celda cada configuración, a partir del consumo medido en banco."""
    b = json.loads((D07 / "3 firmware final 80 MHz y anuncio 150 ms" / "resumen.json").read_text(encoding="utf-8"))
    p_entrada = b["base_p"]  # mW en la entrada de 5,05 V
    return [("Placa del instrumento: corriente medida desde la celda de 3,7 V", b["base_i"] * 3.7, VERDE),
            ("Placa de laboratorio tal como está: elevador a 5 V (η ≈ 0,87)", p_entrada / 0.87, AMBAR)]


def fig_descarga():
    curvas = [("Sin reposo: espera despierta medida (firmware anterior)", semanas_por_carga(escenarios_descarga()[0][1]), GRIS_M)]
    if (REPOSO / "marcas.json").exists():
        r = resumen_reposo()
        curvas += [("Reposo profundo, medir 60 s tras despertar", autonomia_reposo(DESPERTAR_S["peor"], r=r)["semanas"], VERDE_M),
                   ("Reposo profundo, medir 15 s tras despertar", autonomia_reposo(DESPERTAR_S["tipico"], r=r)["semanas"], VERDE)]
    fig, ax = plt.subplots(figsize=(9.6, 4.5))
    fin = 1 - np.interp(3.40, [c[0] for c in CURVA_CELDA], [c[1] for c in CURVA_CELDA]) / 100
    for nombre, semanas, color in curvas:
        w = np.linspace(0, semanas, 300)
        ax.plot(w, tension_celda(100 * (1 - w / semanas)), color=color, lw=2.2, label=nombre)
        ax.plot([semanas * fin], [3.40], "o", color=color, ms=7, mec="white", mew=1.2)
        ax.annotate(("%.1f semanas\n%d mediciones" % (semanas, round(semanas * 20))).replace(".", ","), (semanas * fin, 3.40),
                    xytext=(-8, 26), textcoords="offset points", ha="right", fontsize=8.8, color=color, fontweight="bold")
    ax.axhline(3.40, color=ROJO, ls="--", lw=1)
    ax.text(0.3, 3.42, "aviso de batería baja: 3,40 V", fontsize=8.6, color=ROJO)
    ax.set_xlim(0, 30)
    ax.set_ylim(3.25, 4.25)
    ax.set_xlabel("Semanas de uso habitual (dos jornadas semanales de 2 h con 10 mediciones)")
    ax.set_ylabel("Tensión estimada de la celda (V)")
    ax.legend(loc="upper right", fontsize=8.4)
    ax.set_title("Descarga estimada de la placa del instrumento antes y después del reposo profundo")
    nota(fig, "Estimación: 5.920 mWh útiles (1.600 mAh a 3,7 V), espera despierta medida en banco, reposo profundo de 40 µA "
              "estimado por hoja de datos, apagado entre jornadas\ny autodescarga del 2 % mensual; curva de tensión que usa el "
              "firmware para el porcentaje de batería.")
    guardar(fig, "fig3_descarga.png")


def fig_carga():
    carpeta = REG / "carga"
    if not (carpeta / "corriente.csv").exists():
        return
    t, v, i = corriente(carpeta)
    o = np.argsort(t)
    t, v, i = t[o], v[o], i[o]
    m = (t - t[0]) / 60
    hueco = np.where(np.diff(t) > 1)[0]
    fig, ax = plt.subplots(figsize=(9.6, 4.3))
    tramos = np.split(np.arange(len(t)), hueco + 1)
    for k, idx in enumerate(tramos):
        ax.plot(m[idx], media_movil(i[idx], 500), color=AZUL, lw=1.8, label="placa de laboratorio (media de 5 s)" if k == 0 else None)
    for a in hueco:
        ax.axvspan(m[a], m[a + 1], color=GRIS_C, lw=0)
        ax.text((m[a] + m[a + 1]) / 2, 300, "sin\ndatos", ha="center", fontsize=7.5, color=GRIS_M)
    ax.axhline(500, color=ROJO, ls="--", lw=1.1)
    ax.text(0.5, 512, "límite de R08: 500 mA", fontsize=8.6, color=ROJO)
    ax.axhline(444, color=VERDE, ls=":", lw=1.4)
    ax.text(0.5, 418, "placa del instrumento: 444 mA (RPROG de 2,7 kΩ)", fontsize=8.6, color=VERDE)
    dt = np.diff(t, append=t[-1])
    dt[dt > 1] = 0
    mah = (i * dt).sum() / 3600
    wh = (v * i * dt).sum() / 3600000
    ax.text(m[-1], 690, ("%.0f mAh y %.2f Wh en %.0f min" % (mah, wh, m[-1])).replace(".", ","), ha="right",
            fontsize=9, color=AZUL, fontweight="bold")
    ax.text(m[-1] * 0.03, 768, "la corriente baja a medida que sube la tensión de la celda", fontsize=8.6, color=GRIS)
    ax.set_ylim(0, 800)
    ax.set_xlim(0, m[-1])
    ax.set_xlabel("Tiempo de carga desde el 70 % (min)")
    ax.set_ylabel("Corriente en la entrada USB (mA)")
    ax.legend(loc="lower left", fontsize=8.4)
    ax.set_title("Carga de la celda por USB: corriente medida frente al límite de diseño")
    nota(fig, "FNIRSI FNB58 a 100 muestras/s entre el cargador USB y el módulo de carga de la placa de laboratorio, con el equipo apagado.")
    guardar(fig, "fig3_carga.png")


def fig_alcance_ble():
    fig, ax = plt.subplots(figsize=(7.4, 3.4))
    datos = [("5 m, línea de vista", 19, 19), ("Más de 10 m, una puerta\ny muros intermedios", 5, 5)]
    y = np.arange(len(datos))[::-1]
    for yy, (nombre, ok, n) in zip(y, datos):
        ax.barh(yy, 100, color=VERDE, height=0.5)
        ax.text(50, yy, "%d de %d mediciones completas" % (ok, n), ha="center", va="center", color="white",
                fontweight="bold", fontsize=9)
    ax.set_yticks(y, [d[0] for d in datos])
    ax.set_xlim(0, 100)
    ax.set_xlabel("Mediciones exitosas (%)")
    ax.grid(axis="y", visible=False)
    ax.set_title("Enlace Bluetooth del prototipo con la aplicación")
    nota(fig, "Ensayo preliminar del 31-10-2026: prototipo con batería y sin carcasa, teléfono Motorola moto g56 5G.")
    guardar(fig, "fig3_alcance_ble.png")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    print("Figuras de la Evaluación 3:")
    for f in (fig_consumo_firmware, fig_perfil_consumo, fig_energia_medicion, fig_perfil_reposo, fig_autonomia, fig_sonda_condiciones,
              fig_riego, fig_npk_ce, fig_modbus, fig_bme, fig_descarga, fig_carga, fig_alcance_ble):
        f()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
