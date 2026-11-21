"""Registro continuo del FNIRSI FNB58 que se reconecta solo ante un error de lectura HID.

Uso: python fnb58_continuo.py SALIDA.csv SEGUNDOS
Anexa al CSV (mismo formato que fnb58.py). Cada reconexión queda anotada en SALIDA.log.
"""
import csv
import sys
import time

import hid

VID, PID = 0x2E3C, 0x5558
salida, duracion = sys.argv[1], float(sys.argv[2])


def comando(dev, b1, chk):
    dev.write(bytes([0x00, 0xAA, b1] + [0x00] * 61 + [chk]))


def abrir():
    dev = hid.device()
    dev.open(VID, PID)
    comando(dev, 0x81, 0x8E)
    comando(dev, 0x82, 0x96)
    comando(dev, 0x82, 0x96)
    return dev


t0 = time.time()
nuevo = True
try:
    nuevo = open(salida, encoding="utf-8").read(10) == ""
except FileNotFoundError:
    pass
with open(salida, "a", newline="", encoding="utf-8") as f, open(salida + ".log", "a", encoding="utf-8") as lg:
    w = csv.writer(f)
    if nuevo:
        w.writerow(["t_unix", "t_s", "voltaje_V", "corriente_A", "potencia_W"])
    while time.time() - t0 < duracion:
        try:
            dev = abrir()
            refresco = time.time()
            t_muestra = None
            while time.time() - t0 < duracion:
                datos = dev.read(64, 1000)
                ahora = time.time()
                if ahora - refresco >= 1.0:
                    comando(dev, 0x83, 0x9E)
                    refresco = ahora
                if not datos or len(datos) < 62 or datos[1] != 0x04:
                    continue
                if t_muestra is None or ahora - t_muestra > 1:
                    t_muestra = ahora
                for i in range(4):
                    o = 2 + 15 * i
                    v = int.from_bytes(bytes(datos[o:o + 4]), "little") / 1e5
                    a = int.from_bytes(bytes(datos[o + 4:o + 8]), "little") / 1e5
                    t_muestra += 0.01
                    w.writerow([f"{t_muestra:.3f}", f"{t_muestra - t0:.3f}", f"{v:.5f}", f"{a:.5f}", f"{v * a:.5f}"])
                f.flush()
        except (OSError, IOError) as e:
            lg.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} reconexión tras: {e}\n")
            lg.flush()
            try:
                dev.close()
            except Exception:  # noqa: BLE001
                pass
            time.sleep(2)
