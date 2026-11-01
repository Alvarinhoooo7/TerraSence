"""Campaña D-07: consumo por estado con el FNB58, el monitor serie y la app.

Uso: python campana_d07.py CARPETA_SALIDA
Registra en paralelo: corriente (fnb58.py, 100 muestras/s), monitor serie con
hora del PC y marcas de inicio/fin de cada tramo. Tramos:
  A reposo 60 s | B 10 mediciones desde la app | C LED y buzzer | D sonda
  energizada 45 s | E reposo 30 s
"""
import io
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import serial
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
AQUI = Path(__file__).parent
APP = "cl.terrasense.app"
marcas = []


def marcar(etiqueta, evento):
    marcas.append({"t": time.time(), "tramo": etiqueta, "evento": evento})
    print(f"[{time.strftime('%H:%M:%S')}] {etiqueta}: {evento}", flush=True)


# --- monitor serie en un hilo, cada línea con la hora del PC -----------------
ser = serial.Serial()
ser.port, ser.baudrate, ser.timeout, ser.dtr, ser.rts = "COM10", 115200, 0.1, False, False
ser.open()
lineas = []
corriendo = True


def leer_serie():
    buf = b""
    while corriendo:
        buf += ser.read(4096)
        while b"\n" in buf:
            linea, buf = buf.split(b"\n", 1)
            lineas.append((time.time(), linea.decode("utf-8", "replace").rstrip("\r")))


hilo = threading.Thread(target=leer_serie, daemon=True)
hilo.start()


def enviar(cmd, espera=1.5):
    ser.write((cmd + "\n").encode())
    time.sleep(espera)


# --- teléfono -----------------------------------------------------------------
def adb(*args):
    return subprocess.run(["adb", *args], capture_output=True)


def captura():
    return Image.open(io.BytesIO(adb("exec-out", "screencap", "-p").stdout)).convert("RGB")


def tap(x, y, espera=2.0):
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(espera)


def medir_desde_app(i):
    adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
    adb("shell", "wm", "dismiss-keyguard")
    adb("shell", "am", "force-stop", APP)
    time.sleep(1)
    adb("shell", "monkey", "-p", APP, "-c", "android.intent.category.LAUNCHER", "1")
    for _ in range(30):
        time.sleep(1)
        im = captura()
        r, g, b = im.getpixel((540, 140))
        if not (r > 180 and g > 120 and b < 110) and im.getpixel((540, 1248))[1] > 180:
            break
    tap(540, 1248, 2.5)
    tap(292, 1487, 1.5)
    tap(540, 2189, 2.5)
    tap(847, 182, 2.5)
    tap(540, 2189, 2.5)
    marcar("B", f"medición {i}: toque en Medir")
    tap(540, 2189, 0.5)
    time.sleep(18)
    captura().save(out / f"B_medicion_{i}.png")
    marcar("B", f"medición {i}: captura del resultado")


# --- registro de corriente -------------------------------------------------------
fnb = subprocess.Popen([sys.executable, str(AQUI / "fnb58.py"), str(out / "corriente.csv")],
                       stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
time.sleep(15)
# El registro de corriente debe estar llenándose antes de seguir.
if (out / "corriente.csv").stat().st_size < 10000:
    fnb.terminate()
    ser.close()
    sys.exit("El FNB58 no está entregando datos; campaña cancelada")
enviar("q", 1)

marcar("A", "inicio reposo con anuncio BLE")
time.sleep(60)
marcar("A", "fin")

marcar("B", "inicio")
for i in range(1, 11):
    medir_desde_app(i)
adb("shell", "am", "force-stop", APP)
time.sleep(5)
marcar("B", "fin")

marcar("C", "inicio LED y buzzer")
enviar("d", 1)
enviar("q", 3)
enviar("d", 0.5)
marcar("C", "secuencia de LED (opción 11)")
enviar("11", 7)
marcar("C", "buzzer 2 s (opción 2)")
enviar("2", 4)
enviar("q", 2)
marcar("C", "fin")

marcar("D", "inicio sonda energizada (ensayo 12)")
enviar("d", 1)
enviar("12", 45)
enviar("x", 3)
enviar("q", 1)
marcar("D", "fin")

marcar("E", "inicio reposo final")
time.sleep(30)
marcar("E", "fin")

corriendo = False
time.sleep(0.5)
fnb.terminate()
fnb.wait(5)
ser.close()
(out / "marcas.json").write_text(json.dumps(marcas, ensure_ascii=False, indent=1), encoding="utf-8")
with open(out / "monitor_serie.txt", "w", encoding="utf-8") as f:
    for t, l in lineas:
        f.write(f"{t:.3f}\t{l}\n")
print("listo", len(lineas), "líneas serie", flush=True)
