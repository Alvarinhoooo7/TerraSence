"""Campaña de consumo con el firmware 1.2.0 (reposo profundo): FNB58 a 100 muestras/s en la
entrada USB, consola por COM10 y mediciones por BLE desde el PC con el ciclo de la app.

Uso: python campana_reposo.py CARPETA
Tramos: A despierta sin conexión hasta dormirse sola | D1 dormida 90 s | (despertar por EN)
B 10 mediciones cada 20 s | G gracia tras la última desconexión hasta dormirse | D2 dormida 90 s.
Guarda corriente.csv, marcas.json, mediciones.csv y consola.log.
"""
import asyncio
import csv
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

import serial
from bleak import BleakClient, BleakScanner

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
# El registrador de las campañas D-07: una sola apertura durante toda la campaña.
FNB = Path(r"C:\dev\terrasense\Evaluacion\Evaluacion 2\Registros de banco\D-07 consumo\fnb58.py")
SERVICIO = "00000001-5e4e-4c69-6d61-746572726101"
TELEMETRIA = "00000002-5e4e-4c69-6d61-746572726102"
ESTADO = "00000005-5e4e-4c69-6d61-746572726105"
marcas, consola = [], []
durmio = threading.Event()


def marcar(tramo, evento):
    marcas.append({"t": time.time(), "tramo": tramo, "evento": evento})
    print(f"[{time.strftime('%H:%M:%S')}] {tramo}: {evento}", flush=True)


def leer_consola(puerto, fin):
    buf = b""
    with open(out / "consola.log", "w", encoding="utf-8") as f:
        while not fin.is_set():
            buf += puerto.read(512)
            while b"\n" in buf:
                linea, buf = buf.split(b"\n", 1)
                texto = linea.decode("utf-8", "replace").rstrip()
                f.write(f"{time.time():.3f} {texto}\n")
                f.flush()
                if "reposo profundo" in texto:
                    consola.append(time.time())
                    durmio.set()


def reiniciar(puerto):
    puerto.rts = True
    time.sleep(0.1)
    puerto.rts = False


async def esperar_reposo(tramo, limite):
    durmio.clear()
    t = time.time()
    while not durmio.is_set() and time.time() - t < limite:
        await asyncio.sleep(0.2)
    marcar(tramo, f"durmió ({time.time() - t:.1f} s)" if durmio.is_set() else "NO durmió dentro del límite")


async def medir(i):
    t_toque = time.time()
    dev = await BleakScanner.find_device_by_filter(
        lambda d, ad: SERVICIO in [s.lower() for s in ad.service_uuids], timeout=20)
    if dev is None:
        raise RuntimeError("sonda no encontrada")
    t_hallado = time.time()
    llegada = asyncio.get_running_loop().create_future()
    async with BleakClient(dev, timeout=20) as cli:
        t_con = time.time()
        estado = bytes(await cli.read_gatt_char(ESTADO))
        t_sus = time.time()
        await cli.start_notify(TELEMETRIA, lambda _, d: llegada.done() or llegada.set_result((time.time(), bytes(d))))
        t_trama, trama = await asyncio.wait_for(llegada, 15)
        await cli.stop_notify(TELEMETRIA)
    t_fin = time.time()
    marcar("B", f"medición {i}: desconectado")
    return dict(i=i, busqueda_s=round(t_hallado - t_toque, 2), conexion_s=round(t_con - t_hallado, 2),
                adquisicion_envio_s=round(t_trama - t_sus, 2), ciclo_s=round(t_fin - t_toque, 2),
                estado=estado.hex(), trama=trama.hex(), t_desconexion=round(t_fin, 3))


async def main():
    fnb = subprocess.Popen([sys.executable, str(FNB), str(out / "corriente.csv"), "1500"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    await asyncio.sleep(15)
    if not (out / "corriente.csv").exists() or (out / "corriente.csv").stat().st_size < 3000:
        fnb.terminate()
        sys.exit("El FNB58 no entrega datos; campaña cancelada")
    puerto = serial.Serial("COM10", 115200, timeout=0.2)
    puerto.dtr = False
    puerto.rts = False
    fin = threading.Event()
    hilo = threading.Thread(target=leer_consola, args=(puerto, fin), daemon=True)
    hilo.start()
    filas = []
    try:
        reiniciar(puerto)
        marcar("A", "encendido por EN: despierta y anunciando, sin conexión")
        await esperar_reposo("A", 100)
        marcar("D1", "inicio dormida")
        await asyncio.sleep(90)
        marcar("D1", "fin")
        reiniciar(puerto)
        marcar("B", "despertada por EN")
        await asyncio.sleep(3)
        marcar("B", "inicio mediciones")
        for i in range(1, 11):
            t = time.time()
            try:
                filas.append(await medir(i))
                print(filas[-1], flush=True)
            except Exception as e:  # noqa: BLE001
                filas.append(dict(i=i, error=repr(e)[:150]))
                print("error", e, flush=True)
            if i < 10:
                await asyncio.sleep(max(3, 20 - (time.time() - t)))
        marcar("G", "inicio gracia tras la última desconexión")
        await esperar_reposo("G", 170)
        marcar("D2", "inicio dormida")
        await asyncio.sleep(90)
        marcar("D2", "fin")
    finally:
        fin.set()
        hilo.join(1)
        puerto.close()
        fnb.terminate()
        (out / "marcas.json").write_text(json.dumps(marcas, indent=1, ensure_ascii=False), encoding="utf-8")
        with open(out / "mediciones.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["i", "busqueda_s", "conexion_s", "adquisicion_envio_s", "ciclo_s",
                                              "estado", "trama", "t_desconexion", "error"])
            w.writeheader()
            w.writerows(filas)


asyncio.run(main())
