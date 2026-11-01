"""Registra tensión y corriente del FNIRSI FNB58 (HID 2E3C:5558) en un CSV.

Uso: python fnb58.py SALIDA.csv [SEGUNDOS]
El FNB58 entrega 4 muestras por paquete a 100 muestras/s. Protocolo según el
registrador abierto fnirsi-usb-power-data-logger (baryluk): inicio con aa 81
y aa 82, refresco con aa 83 cada segundo; paquetes de tipo 04 con 4 bloques
de 15 bytes (tensión y corriente en 1e-5, little endian).
"""
import csv
import sys
import time

import hid

VID, PID = 0x2E3C, 0x5558
salida = sys.argv[1]
duracion = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9


def comando(dev, b1, chk):
    dev.write(bytes([0x00, 0xAA, b1] + [0x00] * 61 + [chk]))


def main():
    dev = hid.device()
    dev.open(VID, PID)
    dev.set_nonblocking(False)
    comando(dev, 0x81, 0x8E)
    comando(dev, 0x82, 0x96)
    comando(dev, 0x82, 0x96)
    t0 = time.time()
    ultimo_refresco = t0
    n = 0
    with open(salida, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["t_unix", "t_s", "voltaje_V", "corriente_A", "potencia_W"])
        t_muestra = None
        while time.time() - t0 < duracion:
            datos = dev.read(64, 1000)
            ahora = time.time()
            if ahora - ultimo_refresco >= 1.0:
                comando(dev, 0x83, 0x9E)
                ultimo_refresco = ahora
            if not datos or len(datos) < 62 or datos[1] != 0x04:
                continue
            if t_muestra is None:
                t_muestra = ahora
            for i in range(4):
                o = 2 + 15 * i
                v = int.from_bytes(bytes(datos[o:o + 4]), "little") / 1e5
                a = int.from_bytes(bytes(datos[o + 4:o + 8]), "little") / 1e5
                t_muestra += 0.01
                w.writerow([f"{t_muestra:.3f}", f"{t_muestra - t0:.3f}", f"{v:.5f}", f"{a:.5f}", f"{v * a:.5f}"])
                n += 1
            if n % 1000 < 4:
                f.flush()
                print(f"{n} muestras | {v:.3f} V {a * 1000:.1f} mA", flush=True)
    dev.close()


if __name__ == "__main__":
    main()
