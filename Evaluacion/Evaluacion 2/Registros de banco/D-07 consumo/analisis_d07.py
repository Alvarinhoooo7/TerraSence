"""Análisis D-07: consumo por estado, energía por medición y figura."""
import csv
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
d = Path(sys.argv[1])
fig_out = Path(sys.argv[2])
r = list(csv.DictReader(open(d / "corriente.csv", encoding="utf-8")))
t = np.array([float(x["t_unix"]) for x in r])
v = np.array([float(x["voltaje_V"]) for x in r])
i = np.array([float(x["corriente_A"]) for x in r]) * 1000
p = v * i  # mW
marcas = json.loads((d / "marcas.json").read_text(encoding="utf-8"))
serie = [l.split("\t", 1) for l in (d / "monitor_serie.txt").read_text(encoding="utf-8").splitlines() if "\t" in l]
serie = [(float(a), b) for a, b in serie]
t0 = t[0]


def tramo(nombre):
    ev = [m["t"] for m in marcas if m["tramo"] == nombre]
    return min(ev), max(ev)


def stats(a, b):
    m = (t >= a) & (t < b)
    dt = np.diff(t[m]).mean() if m.sum() > 1 else 0.01
    return dict(n=int(m.sum()), s=b - a, i_med=i[m].mean(), i_max=i[m].max(), p_med=p[m].mean(),
                e_mwh=(p[m] * dt).sum() / 3600.0, v_med=v[m].mean())


res = {}
for nombre, etiqueta in [("A", "Reposo con anuncio BLE"), ("E", "Reposo final")]:
    a, b = tramo(nombre)
    res[etiqueta] = stats(a + 2, b - 1)
base_i = np.mean([res["Reposo con anuncio BLE"]["i_med"], res["Reposo final"]["i_med"]])
base_p = np.mean([res["Reposo con anuncio BLE"]["p_med"], res["Reposo final"]["p_med"]])

# Ventanas de conexión BLE de cada medición (hora del PC al leer el monitor serie).
con_crudo = [ts for ts, l in serie if "conectado" in l and "desconectado" not in l]
des = [ts for ts, l in serie if "Teléfono desconectado" in l]
# Una línea serie puede llegar mezclada con otra; si falta la de conexión, se
# toma la duración típica de la ventana (3,3 s) antes de la desconexión.
con = []
for b in des:
    previas = [c for c in con_crudo if 0 < b - c < 6]
    con.append(max(previas) if previas else b - 3.3)
med = []
for k, (a, b) in enumerate(zip(con, des), 1):
    s = stats(a - 0.3, b + 0.3)
    s["exceso_mwh"] = s["e_mwh"] - base_p * s["s"] / 3600.0
    med.append(s)
c_a, c_b = tramo("C")
res["LED y buzzer"] = stats(c_a + 4, c_b)
d_a, d_b = tramo("D")
ens = [ts for ts, l in serie if "[ENSAYO]" in l]
res["Sonda energizada (consulta continua)"] = stats(min(ens) + 1.5, max(ens) - 0.5)

print(f"Tensión USB media: {v.mean():.3f} V | muestras {len(t)} | duración {t[-1]-t0:.0f} s")
for k, s in res.items():
    print(f"{k:40s} I media {s['i_med']:6.1f} mA | máx {s['i_max']:6.1f} mA | P media {s['p_med']:6.1f} mW | {s['s']:.0f} s")
print("Mediciones desde la app (ventana conexión-desconexión):")
for k, s in enumerate(med, 1):
    print(f"  {k}: {s['s']:.2f} s | I media {s['i_med']:.1f} mA | máx {s['i_max']:.1f} mA | energía {s['e_mwh']:.3f} mWh | sobre el reposo {s['exceso_mwh']:.3f} mWh")
dur = np.mean([s["s"] for s in med]); e = np.mean([s["e_mwh"] for s in med]); ex = np.mean([s["exceso_mwh"] for s in med])
imax = max(s["i_max"] for s in med)
print(f"  promedio: {dur:.2f} s | {e:.3f} mWh por medición | exceso {ex:.3f} mWh | pico máximo {imax:.1f} mA")
json.dump({"base_i": base_i, "base_p": base_p, "tramos": res, "mediciones": med,
           "medicion_s": dur, "medicion_mwh": e, "medicion_exceso_mwh": ex, "v_media": float(v.mean())},
          open(d / "resumen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=float)

# ---------------------------------------------------------------- figura
plt.rcParams.update({"font.family": "Arial", "font.size": 10})
fig, (ax, az) = plt.subplots(2, 1, figsize=(11, 6.8), gridspec_kw={"height_ratios": [1.35, 1]})
tt = t - t0
paso = 10  # media móvil de 100 ms para la vista general
k = np.convolve(i, np.ones(paso) / paso, mode="same")
ax.plot(tt, k, color="#2E5E8C", lw=0.7)
colores = {"A": "#E8E8E8", "B": "#E6EEF6", "C": "#FBE9EA", "D": "#E7F2E8", "E": "#E8E8E8"}
nombres = {"A": "A · reposo con\nanuncio BLE", "B": "B · mediciones desde la aplicación",
           "C": "C · LED\ny buzzer", "D": "D · sonda energizada\n(consulta continua)", "E": "E · reposo"}
for n in "ABCDE":
    a, b = tramo(n)
    ax.axvspan(a - t0, b - t0, color=colores[n], zorder=0)
    ax.text((a + b) / 2 - t0, 178, nombres[n], ha="center", va="top", fontsize=8.5, color="#404040")
for a in con:
    ax.axvline(a - t0, color="#D71920", lw=0.6, ls=":")
ax.set_xlim(0, tt[-1]); ax.set_ylim(0, 185)
ax.set_ylabel("Corriente en la entrada USB (mA)")
ax.set_xlabel("Tiempo (s)")
ax.set_title("Consumo del prototipo de banco por estado (FNB58, 100 muestras/s, media móvil de 100 ms)", fontsize=10.5)
ax.grid(axis="y", color="#E0E0E0", lw=0.6)
# Detalle de la tercera medición, sin suavizar
a, b = con[2] - 2, des[2] + 2
m = (t >= a) & (t <= b)
az.plot(t[m] - con[2], i[m], color="#2E5E8C", lw=0.8)
az.axhline(base_i, color="#808080", lw=0.8, ls="--")
az.text(des[2] - con[2] + 1.9, base_i + 3, f"reposo {base_i:.0f} mA", ha="right", fontsize=8.5, color="#606060")
for ts, l in serie:
    if a <= ts <= b and any(x in l for x in ("conectado", "Suscripción", "TRAMA] 0")):
        etq = ("conexión" if "Teléfono conectado" in l else "suscripción y sonda energizada" if "Suscripción" in l
               else "trama notificada" if "TRAMA" in l else "desconexión")
        az.axvline(ts - con[2], color="#D71920", lw=0.7, ls=":")
        az.text(ts - con[2] + 0.05, 172, etq, fontsize=8, color="#404040", va="top", rotation=90)
az.set_xlim(-2, des[2] - con[2] + 2); az.set_ylim(0, 180)
az.set_xlabel("Tiempo desde la conexión del teléfono (s)")
az.set_ylabel("Corriente (mA)")
az.set_title("Detalle de una medición (muestras sin suavizar)", fontsize=10.5)
az.grid(axis="y", color="#E0E0E0", lw=0.6)
fig.tight_layout()
fig.savefig(fig_out, dpi=200, facecolor="white")
print("figura", fig_out)
