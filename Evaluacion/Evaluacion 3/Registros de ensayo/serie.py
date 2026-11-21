"""Envía comandos al monitor serie del equipo y guarda la respuesta con la hora del PC.

Uso: python serie.py ARCHIVO.txt ESPERA_S CMD [CMD ...]
Cada comando se envía con LF y se espera ESPERA_S segundos (o «cmd@segundos»).
"""
import sys
import time

import serial

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
salida, espera, cmds = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
ser = serial.Serial()
ser.port, ser.baudrate, ser.timeout, ser.dtr, ser.rts = "COM10", 115200, 0.1, False, False
ser.open()
with open(salida, "a", encoding="utf-8") as f:
    for c in cmds:
        cmd, _, s = c.partition("@")
        t = float(s) if s else espera
        f.write(f"\n### [{time.strftime('%Y-%m-%d %H:%M:%S')}] envío: {cmd}\n")
        ser.reset_input_buffer()
        ser.write((cmd + "\n").encode())
        fin = time.time() + t
        buf = b""
        while time.time() < fin:
            buf += ser.read(4096)
        texto = buf.decode("utf-8", "replace").replace("\r", "")
        f.write(texto)
        f.flush()
        print(f"### {cmd}\n{texto}", flush=True)
ser.close()
