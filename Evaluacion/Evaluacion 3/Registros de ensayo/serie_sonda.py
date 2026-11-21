"""Serie de lecturas de la sonda (comando 7) o del BME280 (comando 6) a un CSV.

Uso: python serie_sonda.py sonda|bme ETIQUETA N INTERVALO_S
Guarda cada respuesta cruda en crudo_<tipo>.txt y la fila parseada en <tipo>.csv.
"""
import csv
import re
import sys
import time
from pathlib import Path

import serial

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
tipo, etiqueta, n, intervalo = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
AQUI = Path(__file__).parent
ser = serial.Serial()
ser.port, ser.baudrate, ser.timeout, ser.dtr, ser.rts = "COM10", 115200, 0.1, False, False
ser.open()
RE_SONDA = re.compile(r"Humedad ([\d.]+) % \| temperatura (-?[\d.]+) °C \| CE (\d+) µS/cm \| pH ([\d.]+)"
                      r".*?N (\d+) \| P (\d+) \| K (\d+)", re.S)
RE_DISP = re.compile(r"Δhum ([\d.]+) %, Δtemp ([\d.]+) °C, ΔCE (\d+) µS/cm, ΔpH ([\d.]+)")
RE_BME = re.compile(r"temperatura (-?[\d.]+) °C \| presión ([\d.]+) hPa \| humedad ([\d.]+) %")
cmd, espera = ("7", 4.0) if tipo == "sonda" else ("6", 1.5)
campos = (["humedad_pct", "temp_suelo_C", "ce_uScm", "ph", "n_mgkg", "p_mgkg", "k_mgkg",
           "d_hum", "d_temp", "d_ce", "d_ph"] if tipo == "sonda" else ["temp_aire_C", "presion_hPa", "hr_pct"])
ruta_csv = AQUI / f"{tipo}.csv"
nuevo = not ruta_csv.exists()
ser.write(b"d\n")
time.sleep(1.0)
ser.reset_input_buffer()
t0 = time.time()
with open(ruta_csv, "a", newline="", encoding="utf-8") as fc, open(AQUI / f"crudo_{tipo}.txt", "a", encoding="utf-8") as fr:
    w = csv.writer(fc)
    if nuevo:
        w.writerow(["fecha_hora", "t_s", "condicion", "k"] + campos)
    for k in range(1, n + 1):
        inicio = time.time()
        ser.write((cmd + "\n").encode())
        buf = b""
        while time.time() - inicio < espera:
            buf += ser.read(4096)
        txt = buf.decode("utf-8", "replace").replace("\r", "")
        hora = time.strftime("%Y-%m-%d %H:%M:%S")
        fr.write(f"\n### [{hora}] {etiqueta} #{k}\n{txt}")
        fr.flush()
        if tipo == "sonda":
            m, d = RE_SONDA.search(txt), RE_DISP.search(txt)
            fila = list(m.groups()) + (list(d.groups()) if d else [""] * 4) if m else None
        else:
            m = RE_BME.search(txt)
            fila = list(m.groups()) if m else None
        if fila:
            w.writerow([hora, f"{inicio - t0:.1f}", etiqueta, k] + fila)
            fc.flush()
            print(f"{etiqueta} #{k}: {fila}", flush=True)
        else:
            print(f"{etiqueta} #{k}: sin lectura -> {txt.strip()[-300:]}", flush=True)
        resto = intervalo - (time.time() - inicio)
        if resto > 0 and k < n:
            time.sleep(resto)
ser.write(b"q\n")
ser.close()
