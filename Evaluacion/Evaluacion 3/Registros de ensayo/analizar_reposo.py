"""Resumen de la campaña de reposo: corriente media por tramo y vista previa del perfil."""
import csv
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
d = Path(sys.argv[1])
filas = list(csv.DictReader(open(d / "corriente.csv", encoding="utf-8")))
t = [float(f["t_unix"]) for f in filas]
i_ma = [float(f["corriente_A"]) * 1000 for f in filas]
v = [float(f["voltaje_V"]) for f in filas]
marcas = json.load(open(d / "marcas.json", encoding="utf-8"))
med = list(csv.DictReader(open(d / "mediciones.csv", encoding="utf-8")))


def m(tramo, evento_contiene):
    for x in marcas:
        if x["tramo"] == tramo and evento_contiene in x["evento"]:
            return x["t"]
    return None


def media(t0, t1, margen=2.0):
    vals = [c for tt, c in zip(t, i_ma) if t0 + margen <= tt <= t1 - margen]
    vs = [vv for tt, vv in zip(t, v) if t0 + margen <= tt <= t1 - margen]
    if not vals:
        return None
    return dict(ma=sum(vals) / len(vals), min=min(vals), max=max(vals), v=sum(vs) / len(vs), n=len(vals), s=t1 - t0)


tA0, tA1 = m("A", "encendido"), m("A", "durmió")
tD1a, tD1b = m("D1", "inicio"), m("D1", "fin")
tB0 = m("B", "inicio mediciones")
tBdesp = m("B", "despertada")
t_ult = float(med[-1]["t_desconexion"]) if med and med[-1].get("t_desconexion") else None
tG1 = m("G", "durmió")
tD2a, tD2b = m("D2", "inicio"), m("D2", "fin")

tramos = {
    "A despierta sin conexión (anuncio)": media(tA0 + 3, tA1),
    "D1 dormida": media(tD1a, tD1b),
    "B 10 mediciones (conexiones y esperas)": media(tB0, t_ult) if t_ult else None,
    "G gracia tras la última desconexión": media(t_ult, tG1) if t_ult and tG1 else None,
    "D2 dormida": media(tD2a, tD2b),
}
print(f"Muestras: {len(t)} en {t[-1] - t[0]:.0f} s")
for k, r in tramos.items():
    if r:
        print(f"{k:42s} {r['ma']:7.2f} mA (mín {r['min']:6.2f}, máx {r['max']:6.2f}) a {r['v']:.3f} V; {r['s']:.0f} s")
ok = [x for x in med if not x.get("error")]
print(f"Mediciones: {len(ok)} de {len(med)} correctas; banderas de estado: {sorted({x['estado'][-2:] for x in ok})}")
if ok:
    ciclos = [float(x["ciclo_s"]) for x in ok]
    print(f"Ciclo completo: {min(ciclos):.2f}–{max(ciclos):.2f} s")
if tA1 and tA0:
    print(f"A: se durmió {tA1 - tA0:.1f} s después del encendido por EN")
if tG1 and t_ult:
    print(f"G: se durmió {tG1 - t_ult:.1f} s después de la última desconexión vista por el PC")

t0 = t[0]
fig, ax = plt.subplots(figsize=(12, 4.2))
ax.plot([x - t0 for x in t], i_ma, lw=0.5, color="#1F5B3F")
for x in marcas:
    ax.axvline(x["t"] - t0, color="#C9762B", lw=0.6, alpha=0.5)
ax.set_xlabel("Tiempo (s)")
ax.set_ylabel("Corriente en la entrada USB (mA)")
ax.set_title("Vista previa: despierta, dormida, 10 mediciones, gracia y dormida")
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(d / "vista_previa.png", dpi=110)
