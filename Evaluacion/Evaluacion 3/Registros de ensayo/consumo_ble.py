"""Campaña de consumo con el firmware vigente: FNB58 a 100 muestras/s y mediciones por BLE desde el PC.

Uso: python consumo_ble.py CARPETA
Tramos: A reposo con anuncio 60 s | B 10 mediciones (ciclo de la app: buscar, conectar,
leer estado, suscribirse, recibir la trama, desconectar) cada 20 s | E reposo 30 s.
Guarda corriente.csv, marcas.json y mediciones.csv.
"""
import asyncio
import csv
import json
import subprocess
import sys
import time
from pathlib import Path

from bleak import BleakClient, BleakScanner

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
FNB = Path(__file__).resolve().parents[2] / "Evaluacion 2" / "Registros de banco" / "D-07 consumo" / "fnb58.py"
SERVICIO = "00000001-5e4e-4c69-6d61-746572726101"
TELEMETRIA = "00000002-5e4e-4c69-6d61-746572726102"
ESTADO = "00000005-5e4e-4c69-6d61-746572726105"
marcas = []


def marcar(tramo, evento):
    marcas.append({"t": time.time(), "tramo": tramo, "evento": evento})
    print(f"[{time.strftime('%H:%M:%S')}] {tramo}: {evento}", flush=True)


async def medir(i):
    t_toque = time.time()
    dev = await BleakScanner.find_device_by_filter(
        lambda d, ad: SERVICIO in [s.lower() for s in ad.service_uuids], timeout=20)
    t_hallado = time.time()
    llegada = asyncio.get_running_loop().create_future()
    async with BleakClient(dev, timeout=20) as cli:
        t_con = time.time()
        marcar("B", f"medición {i}: conectado")
        await cli.read_gatt_char(ESTADO)
        t_sus = time.time()
        await cli.start_notify(TELEMETRIA, lambda _, d: llegada.done() or llegada.set_result((time.time(), bytes(d))))
        t_trama, trama = await asyncio.wait_for(llegada, 15)
        await cli.stop_notify(TELEMETRIA)
    t_fin = time.time()
    marcar("B", f"medición {i}: desconectado")
    return dict(i=i, busqueda_s=round(t_hallado - t_toque, 2), conexion_s=round(t_con - t_hallado, 2),
                adquisicion_envio_s=round(t_trama - t_sus, 2), ciclo_s=round(t_fin - t_toque, 2), trama=trama.hex())


async def main():
    fnb = subprocess.Popen([sys.executable, str(FNB), str(out / "corriente.csv")],
                           stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    await asyncio.sleep(10)
    if (out / "corriente.csv").stat().st_size < 5000:
        fnb.terminate()
        sys.exit("El FNB58 no entrega datos; campaña cancelada")
    filas = []
    try:
        marcar("A", "inicio reposo con anuncio BLE")
        await asyncio.sleep(60)
        marcar("A", "fin")
        marcar("B", "inicio")
        for i in range(1, 11):
            t = time.time()
            try:
                filas.append(await medir(i))
                print(filas[-1], flush=True)
            except Exception as e:  # noqa: BLE001
                filas.append(dict(i=i, error=repr(e)[:150]))
                print("error", e, flush=True)
            await asyncio.sleep(max(3, 20 - (time.time() - t)))
        marcar("B", "fin")
        marcar("E", "inicio reposo final")
        await asyncio.sleep(30)
        marcar("E", "fin")
    finally:
        fnb.terminate()
        (out / "marcas.json").write_text(json.dumps(marcas, indent=1), encoding="utf-8")
        with open(out / "mediciones.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["i", "busqueda_s", "conexion_s", "adquisicion_envio_s", "ciclo_s", "trama", "error"])
            w.writeheader()
            w.writerows(filas)


asyncio.run(main())
