"""Prepara el preview y sus figuras sin modificar informes ni registros de ensayo.

Ejecutar: python "Evaluacion/Evaluacion 3/Presentacion/preparar.py"
La capacidad del piloto (5.000 mAh) fue confirmada por su constructor.
Los registros FNB58 miden en la entrada USB, no en bornes de la batería.
"""
from pathlib import Path
import csv
import hashlib
import json
import shutil
import sys
import zipfile

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REG = HERE.parent / "Registros de ensayo"
ASSETS = HERE / "assets"
CHARTS = HERE / "graficos"
for folder in (ASSETS, CHARTS):
    folder.mkdir(exist_ok=True)

sys.path.insert(0, str(ROOT / "finanzas"))
import modelo

GREEN, RED, BLUE, INK, MUTED = "#155d45", "#c8102e", "#356c9a", "#202b26", "#647069"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 12,
                     "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#c9d0cb", "axes.labelcolor": MUTED,
                     "xtick.color": MUTED, "ytick.color": MUTED,
                     "text.color": INK, "svg.fonttype": "none"})


def csv_rows(path):
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def campaign(name):
    path = REG / name
    rows = csv_rows(path / "corriente.csv")
    return dict(t=np.array([float(r["t_unix"]) for r in rows]),
                i=np.array([float(r["corriente_A"]) * 1000 for r in rows]),
                v=np.array([float(r["voltaje_V"]) for r in rows]),
                marks=json.loads((path / "marcas.json").read_text(encoding="utf-8")),
                measures=csv_rows(path / "mediciones.csv"))


def bounds(c, key):
    ts = [m["t"] for m in c["marks"] if m["tramo"] == key]
    return min(ts), max(ts)


def stats(c, a, b):
    sel = (c["t"] >= a) & (c["t"] < b)
    # Registro adquirido a 100 Hz: mismo integrador rectangular que el informe.
    i, v = c["i"][sel], c["v"][sel]
    assert len(i), "Ventana sin muestras"
    return dict(i=float(i.mean()), p=float((v * i).mean()), v=float(v.mean()),
                e=float((v * i).sum() * 0.01 / 3600), n=len(i), seconds=b-a)


def smooth(values, n):
    return np.convolve(np.pad(values, (n//2, n-1-n//2), mode="edge"), np.ones(n)/n, mode="valid")


def number(x, digits=1):
    return f"{x:.{digits}f}".replace(".", ",")


def save(fig, stem, caption):
    fig.text(.07, .018, caption, fontsize=9, color=MUTED, va="bottom")
    for extension in ("svg", "png"):
        fig.savefig(CHARTS / f"{stem}.{extension}", dpi=220, facecolor="white")
    plt.close(fig)


def axes(title, figsize=(12.8, 5.8)):
    fig, ax = plt.subplots(figsize=figsize)
    fig.subplots_adjust(left=.08, right=.98, top=.85, bottom=.20)
    ax.set_title(title, loc="left", fontsize=18, fontweight="bold", pad=24)
    ax.grid(axis="y", color="#e6ebe7", zorder=0)
    ax.set_axisbelow(True)
    return fig, ax


sleep = campaign("reposo")
capture = campaign("consumo")
phase_names = {"A": "Anuncio BLE", "D1": "Reposo profundo", "B": "10 mediciones + esperas",
               "G": "Espera posterior", "D2": "Reposo profundo"}
phase_colors = {"A": "#9baaa2", "D1": GREEN, "B": BLUE, "G": "#aa7738", "D2": GREEN}
phase_stats = {}
for k in phase_names:
    a, b = bounds(sleep, k)
    phase_stats[k] = stats(sleep, a+2, b-2)
    phase_stats[k]["duration"] = b-a
awake_i = (phase_stats["A"]["i"] + phase_stats["G"]["i"]) / 2
asleep_i = (phase_stats["D1"]["i"] + phase_stats["D2"]["i"]) / 2
reduction = (1-asleep_i/awake_i)*100
for metric, unit in (("i", "mA"), ("p", "mW")):
    t0 = sleep["marks"][0]["t"]
    t1 = sleep["marks"][-1]["t"]
    mask = (sleep["t"] >= t0) & (sleep["t"] <= t1)
    t = sleep["t"][mask]-t0
    values = sleep["i"][mask] if metric == "i" else (sleep["i"]*sleep["v"])[mask]
    fig, ax = axes("El reposo reduce el consumo del piloto")
    upper = 180 if metric == "i" else 900
    for k, title in phase_names.items():
        a, b = bounds(sleep, k)
        ax.axvspan(a-t0, b-t0, color=phase_colors[k], alpha=.08, lw=0)
        ax.text((a+b)/2-t0, upper*.97, title.replace(" + ", "\n+ "), ha="center", va="top", fontsize=10)
        ax.hlines(phase_stats[k][metric], a-t0+2, b-t0-2, colors=phase_colors[k], lw=2.3)
    # Min/max envelope preserves observed peaks; 1 s moving average improves projection readability.
    step = 25
    ts, lows, highs = [], [], []
    for pos in range(0, len(t), step):
        chunk=values[pos:pos+step]
        ts.append(float(t[pos:pos+step].mean())); lows.append(float(chunk.min())); highs.append(float(chunk.max()))
    ax.fill_between(ts, lows, highs, color=BLUE, alpha=.2, linewidth=0, label="Rango real por cada 250 ms")
    ax.plot(t[::10], smooth(values,100)[::10], color=GREEN, lw=1.5, label="Media móvil de 1 s")
    ax.set(xlim=(0,t1-t0), ylim=(0,upper), xlabel="Tiempo desde el inicio del ensayo (s)",
           ylabel=f"{'Corriente' if metric == 'i' else 'Potencia'} en la entrada USB ({unit})")
    ax.legend(loc="lower right", fontsize=10)
    save(fig, f"perfil-reposo-{unit.lower()}", "Piloto V2 · FNB58 · 100 muestras/s · 21-11-2026 · entrada USB ≈ 5,05 V. No es consumo exclusivo del ESP32.")

    fig, ax = axes("Consumo medio en cada estado observado")
    keys=["A","B","G","D1"]
    vals=[phase_stats[k][metric] for k in keys]
    bars=ax.bar(range(4), vals, color=[phase_colors[k] for k in keys], width=.52)
    for bar,val in zip(bars,vals):
        ax.text(bar.get_x()+bar.get_width()/2,val+max(vals)*.04,f"{number(val)} {unit}",ha="center",fontweight="bold",fontsize=17)
    ax.set_xticks(range(4), ["Anuncio BLE", "10 mediciones\ny esperas", "Espera posterior", "Reposo profundo"])
    ax.set(ylim=(0,max(vals)*1.35), ylabel=f"{'Corriente' if metric=='i' else 'Potencia'} media ({unit})")
    save(fig, f"estados-{unit.lower()}", "Medias de tramos estables (se excluyen 2 s por borde). La fase de mediciones incluye las esperas entre lecturas.")

connections=[m["t"] for m in capture["marks"] if m["evento"].endswith(": conectado")]
disconnections=[m["t"] for m in capture["marks"] if m["evento"].endswith(": desconectado")]
measurements=[stats(capture,a-.3,b+.3) for a,b in zip(connections,disconnections)]
baseline=np.mean([stats(capture,bounds(capture,k)[0]+2,bounds(capture,k)[1]-1)["i"] for k in ("A","E")])
for m in measurements:
    m["excess"]=m["e"]-baseline*m["v"]*m["seconds"]/3600
a,b=connections[4],disconnections[4]
sel=(capture["t"]>=a-2)&(capture["t"]<=b+2)
for metric,unit in (("i","mA"),("p","mW")):
    vals=capture["i"][sel] if metric=="i" else (capture["i"]*capture["v"])[sel]
    fig,ax=axes("Una lectura real, vista de cerca")
    ax.axvspan(0,b-a,color=BLUE,alpha=.09)
    ax.plot(capture["t"][sel]-a,vals,color="#b4c7d7",lw=.7,label="Muestras originales · 10 ms")
    ax.plot(capture["t"][sel]-a,smooth(vals,25),color=BLUE,lw=2,label="Media móvil de 250 ms")
    for x,txt in [(0,"Conectado"),(b-a,"Desconectado")]:
        ax.axvline(x,color=MUTED,ls="--",lw=1)
        ax.text(x,max(vals)*1.12,txt,ha="center",fontsize=11)
    ax.set(xlim=(-2,b-a+2),ylim=(0,max(vals)*1.23),xlabel="Tiempo desde la conexión BLE (s)",ylabel=f"Entrada USB ({unit})")
    ax.legend(loc="upper left",fontsize=10)
    save(fig,f"detalle-medicion-{unit.lower()}","Medición 5 · campaña consumo · 21-11-2026. El registro no separa eléctricamente adquisición y envío.")

fig,ax=axes("La energía de diez ventanas de conexión")
energies=[m["e"] for m in measurements]
bars=ax.bar(range(1,11),energies,color=GREEN,width=.62)
mean_e=float(np.mean(energies))
ax.axhline(mean_e,color=RED,ls="--",lw=1.5,label=f"Media: {number(mean_e,3)} mWh")
for bar,val in zip(bars,energies):
    ax.text(bar.get_x()+bar.get_width()/2,val+.012,number(val,3),ha="center",fontsize=10)
ax.set(ylim=(0,.48),xlabel="Número de medición",ylabel="Energía en la entrada USB (mWh)",xticks=range(1,11))
ax.legend(loc="upper right")
save(fig,"energia-mediciones","Integral de V × I a 100 Hz, desde 0,3 s antes de conectar hasta 0,3 s después de desconectar. Excluye búsqueda y espera posterior.")

r=modelo.correr()
summary=modelo.resumen(r)
financial={**summary,"credit":r["credito"],"downpayment":r["pie"],"monthly":r["cuota"],
           "prepaid":r["cuotas_anticipadas"],"netPrice":r["precio_neto_base"],
           "rate":modelo.S["tasa_credito_efectiva_anual"],"markup":modelo.S["margen_objetivo"],
           "rows":[{k:f[k] for k in ("anio","util_neta","flujo","unidades")} for f in r["filas"]]}
financial["investment"]={k:v for k,v in r["inversion"].items()}
financial["terms"]=[dict(years=y,monthly=modelo.cuota_francesa(r["credito"],modelo.S["tasa_credito_efectiva_anual"],y)[0]) for y in (5,10)]
fig,ax=axes("El arranque y la consolidación del negocio")
years=[f["anio"] for f in r["filas"]]
profits=[f["util_neta"]/1e6 for f in r["filas"]]
ax.bar(years,profits,color=[RED if p<0 else GREEN for p in profits],width=.6)
ax.axhline(0,color=INK,lw=.8)
ax.set(xticks=years,ylabel="Utilidad del ejercicio (millones de CLP)",ylim=(-9,max(profits)*1.17))
for year,profit in zip(years,profits):
    ax.text(year,profit+(3 if profit>=0 else -3),number(profit),ha="center",va="bottom" if profit>=0 else "top",fontsize=11)
save(fig,"utilidad-anual","Proyección del modelo vigente · 2027–2036 · valores nominales. Utilidad anual positiva no equivale a inversión recuperada.")

# Series para los gráficos SVG de la presentación (se dibujan en el navegador).
# Perfil: cubetas de 250 ms con mínimo y máximo reales y media móvil de 1 s.
t0, t1 = sleep["marks"][0]["t"], sleep["marks"][-1]["t"]
mask = (sleep["t"] >= t0) & (sleep["t"] <= t1)
p_all = (sleep["i"] * sleep["v"])[mask]
i_all = sleep["i"][mask]
t_all = sleep["t"][mask] - t0
p_avg, i_avg = smooth(p_all, 100), smooth(i_all, 100)
profile = {"t": [], "lo": [], "hi": [], "p": [], "i": []}
for pos in range(0, len(t_all), 25):
    sl = slice(pos, pos + 25)
    profile["t"].append(round(float(t_all[sl].mean()), 2))
    profile["lo"].append(round(float(p_all[sl].min()), 1))
    profile["hi"].append(round(float(p_all[sl].max()), 1))
    profile["p"].append(round(float(p_avg[sl].mean()), 1))
    profile["i"].append(round(float(i_avg[sl].mean()), 2))
profile["duration"] = round(t1 - t0, 2)
profile["phases"] = [{"key": k, "start": round(bounds(sleep, k)[0] - t0, 2), "end": round(bounds(sleep, k)[1] - t0, 2)}
                     for k in phase_names]
# Medición 5 de la campaña consumo, muestras originales de 10 ms.
sel = (capture["t"] >= a - 2) & (capture["t"] <= b + 2)
p_det = (capture["i"] * capture["v"])[sel]
detail = {"t": [round(float(x), 2) for x in capture["t"][sel] - a],
          "p": [round(float(x), 1) for x in p_det],
          "avg": [round(float(x), 1) for x in smooth(p_det, 25)],
          "connected": 0, "disconnected": round(b - a, 3)}
# Energía de una sesión de un punto: la ventana de medición y la gracia del firmware
# (REPOSO_GRACIA_TRAS_DESCONEXION_MS = 120 s; el tramo G medido dura 123,4 s).
g_a, g_b = bounds(sleep, "G")
grace = stats(sleep, g_a, g_b)
asleep_p = (phase_stats["D1"]["p"] + phase_stats["D2"]["p"]) / 2
session = {"measurement": mean_e, "grace": grace["e"], "graceSeconds": g_b - g_a,
           "graceAsleep": asleep_p * (g_b - g_a) / 3600, "asleepMw": asleep_p,
           "awakeMw": (phase_stats["A"]["p"] + phase_stats["G"]["p"]) / 2}
session["graceInMeasurements"] = session["grace"] / mean_e
fig, ax = axes("Medir cuesta poco. Esperar despierto, no.", figsize=(12.8, 5.2))
fig.subplots_adjust(left=.27, right=.9)
labels = ["Una medición\n(conexión, lectura y envío)", "Gracia de 2 min despierto", "Los mismos 2 min dormido\n(calculado)"]
values = [session["measurement"], session["grace"], session["graceAsleep"]]
ax.barh(range(3), values, color=["#3a7fd0", "#c97a14", "#228a5a"], height=.42)
for k, val in enumerate(values):
    ax.text(val + .15, k, f"{number(val, 2)} mWh", va="center", fontsize=16, fontweight="bold")
ax.set_yticks(range(3), labels, fontsize=13)
ax.invert_yaxis()
ax.grid(axis="x", color="#e6ebe7"); ax.grid(axis="y", visible=False)
ax.set(xlim=(0, 11.5), xlabel="Energía en la entrada USB (mWh)")
save(fig, "energia-sesion", f"Piloto V2 · 21-11-2026 · la gracia equivale a ≈ {round(session['graceInMeasurements'])} mediciones. Dormido: potencia medida en reposo × duración del tramo de gracia.")


# Economía para las pantallas del negocio: desglose del precio, caja y sensibilidad de ventas.
u_base, U_pond = r["unidades"], r["unidades_ponderadas"]
gastos = {}
for anio in modelo.ANIOS:
    g = modelo.gastos_anio(anio, u_base[anio])
    for k in ("nomina", "beneficios", "arriendo", "servicios", "patente", "software", "materiales", "mantencion", "pauta"):
        gastos[k] = gastos.get(k, 0) + g[k]
P_neto = r["precio_neto_base"]
price_parts = [
    ("Materiales del equipo", modelo.BOM),
    ("Merma, garantía y envío", modelo.BOM * (modelo.S["merma_fraccion_bom"] + modelo.S["garantia_fraccion_bom"]) + modelo.S["envio_neto_por_equipo"]),
    ("Personas", (gastos["nomina"] + gastos["beneficios"]) / U_pond),
    ("Administración", sum(gastos[k] for k in ("arriendo", "servicios", "patente", "software", "materiales", "mantencion")) / U_pond),
    ("Publicidad", gastos["pauta"] / U_pond),
    ("Comisión a canales", modelo.S["comision_sobre_bruto"] * P_neto * (1 + modelo.IVA)),
]
cost_total = sum(v for _, v in price_parts)
financial["price"] = {"parts": [{"name": n, "value": v} for n, v in price_parts], "cost": cost_total,
                      "profit": P_neto - cost_total, "net": P_neto, "vat": r["precio_lista"] - P_neto, "list": r["precio_lista"]}
acum = -r["desembolso"]
for fila, out in zip(r["filas"], financial["rows"]):
    out["caja"] = fila["caja"]
    acum += fila["flujo"] / (1 + modelo.S["tasa_descuento"]) ** (fila["anio"] - modelo.ANIOS[0] + 1)
    out["acumDesc"] = acum
financial["discountRate"] = modelo.S["tasa_descuento"]
ct_base = r["inversion"]["capital_trabajo"]
def escenario(caida):
    rr = modelo.correr(factor_ventas=1 - caida, precio_forzado=r["precio_lista"], capital_trabajo=ct_base)
    sm = modelo.resumen(rr)
    return {"drop": caida, "van": sm["van"], "tir": sm["tir"], "cajaMin": modelo.caja_minima(rr),
            "units": sum(rr["unidades"].values())}
financial["sensitivity"] = [escenario(k / 100) for k in range(0, 31)]
def limite(campo):
    lo, hi = 0.0, 0.5
    for _ in range(40):
        mid = (lo + hi) / 2
        if escenario(mid)[campo] > 0: lo = mid
        else: hi = mid
    return lo
financial["limits"] = {"cajaMin": limite("cajaMin"), "van": limite("van")}
financial["unitsTotal"] = sum(u_base.values())

def timings(rows):
    return {k:float(np.mean([float(m[k]) for m in rows])) for k in ("busqueda_s","conexion_s","adquisicion_envio_s","ciclo_s")}

data={"battery":{"mah":5000,"nominalV":3.7,"wh":18.5,"source":"Capacidad del piloto confirmada por su constructor"},
      "phases":phase_stats,"awakeMa":awake_i,"asleepMa":asleep_i,"reductionPct":reduction,
      "energyMean":mean_e,"energyMin":min(energies),"energyMax":max(energies),
      "connectionWindowSeconds":float(np.mean([m["seconds"] for m in measurements])),
      "timings":timings(sleep["measures"]),"samples":len(sleep["t"]),
      "correct":sum(not m.get("error") for m in sleep["measures"]),"measurements":measurements,"financial":financial,
      "profile":profile,"detail":detail,"session":session}
(HERE/"datos.js").write_text("// Generado por preparar.py a partir de registros reales y del modelo financiero.\nwindow.TERRA_DATA = "+json.dumps(data,ensure_ascii=False,indent=2)+";\n",encoding="utf-8")

media={"ensamblaje.mp4":ROOT/"PCB/Carcasa/salida/TerraSense_ensamblaje.mp4",
       "piloto.jpg":ROOT/"PCB/Carcasa/salida/capturas/t24.0.jpg",
       "placa.jpg":ROOT/"PCB/Carcasa/salida/capturas/t09.0.jpg",
       "despiece.jpg":ROOT/"PCB/Carcasa/salida/capturas/t05.0.jpg",
       # Láminas del carrusel de Comercialización con pantallas reales de la aplicación.
       "carrusel-etapa.png":ROOT/"Comercializacion de Tecnologias/Unidad 2/Carrusel/slide_3.png",
       "carrusel-plan.png":ROOT/"Comercializacion de Tecnologias/Unidad 2/Carrusel/slide_4.png"}
for name,path in media.items():
    shutil.copy2(path,ASSETS/name)
with zipfile.ZipFile(ROOT/"Tecnologias Aplicadas a Los Sistemas Inteligentes/Evaluacion 3/Evaluacion 3.pptx") as z:
    (ASSETS/"inacap.png").write_bytes(z.read("ppt/media/image1.png"))

# Procedencia y condiciones del cálculo: separadas de la pantalla del expositor.
files=[REG/n/f for n in ("reposo","consumo") for f in ("corriente.csv","marcas.json","mediciones.csv")]
manifest={"inputs":[{"path":str(p.relative_to(ROOT)),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],
          "samplePeriodSeconds":.01,"integration":"Suma rectangular de V × I × 0,01 / 3600; mW a mWh",
          "phaseMeans":"Se excluyen 2 s a cada borde; reducción calculada promediando A/G y D1/D2, como en el informe",
          "measurementWindow":"Campaña consumo: conectado−0,3 s hasta desconectado+0,3 s; no incluye búsqueda ni gracia",
          "battery":"5.000 mAh confirmados por el usuario; 3,7 V nominales; no se extrapola una descarga completa",
          "financial":"Se importa modelo.py y se llama correr(); no se regeneran los entregables financieros"}
(HERE/"procedencia.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
assert abs(awake_i-56.4544234394366)<1e-6
assert abs(asleep_i-20.59843529747758)<1e-6
assert len(measurements)==10 and all(m["e"]>0 for m in measurements)
runtime_files=[HERE/n for n in ("index.html","estilos.css","contenido.js","presentacion.js","graficos.js","escenas.js","datos.js")]
if all(p.exists() for p in runtime_files):
    with zipfile.ZipFile(HERE/"TerraSense-presentacion.zip","w",compression=zipfile.ZIP_DEFLATED) as archive:
        for path in runtime_files+sorted(ASSETS.glob("*"))+sorted(CHARTS.glob("*")):
            if path.is_file() and path.name != "carcasa_3d.html":
                archive.write(path,path.relative_to(HERE))
print(f"Preparado: {len(list(CHARTS.glob('*.svg')))} gráficos SVG + PNG; {len(sleep['t']):,} muestras de reposo; reducción {reduction:.2f} %; energía media {mean_e:.4f} mWh")
