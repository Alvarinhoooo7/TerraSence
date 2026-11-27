"""Genera el visor web autocontenido y, opcionalmente, capturas y el video de ensamblaje.

    python visor.py                 -> salida/TerraSense_carcasa_3D.html (escena incrustada)
    python visor.py --capturas      -> además, capturas PNG de control en salida/capturas/
    python visor.py --video         -> además, salida/TerraSense_ensamblaje.mp4 (1920x1080, 30 fps)

El HTML carga three.js 0.160.0 desde cdn.jsdelivr.net: al abrirlo necesita internet.
El video se renderiza cuadro a cuadro en Chrome sin interfaz, así que sale fluido
aunque el equipo sea lento.
"""
import base64
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / "salida"
HTML = SALIDA / "TerraSense_carcasa_3D.html"
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
DURACION = 24.0


def generar_html() -> Path:
    glb = base64.b64encode((SALIDA / "escena.glb").read_bytes()).decode("ascii")
    plantilla = (AQUI / "visor_plantilla.html").read_text(encoding="utf-8")
    HTML.write_text(plantilla.replace("__GLB_BASE64__", glb), encoding="utf-8")
    print(f"ok {HTML.name} ({HTML.stat().st_size / 1e6:.1f} MB)")
    return HTML


def _pagina(p, ancho, alto):
    # GPU por Direct3D 11: ~0,4 s por cuadro en 1080p, contra ~4,5 s con el render por software (SwiftShader)
    nav = p.chromium.launch(executable_path=CHROME, args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
    pag = nav.new_page(viewport={"width": ancho, "height": alto})
    errores = []
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pag.on("pageerror", lambda e: errores.append(str(e)))
    pag.goto(HTML.as_uri() + "?video=1")
    pag.wait_for_function("window.__listo === true", timeout=180_000)
    return nav, pag, errores


def _guardar_jpeg(data_url: str, destino: Path):
    destino.write_bytes(base64.b64decode(data_url.split(",", 1)[1]))


def capturas():
    from playwright.sync_api import sync_playwright
    carpeta = SALIDA / "capturas"
    carpeta.mkdir(exist_ok=True)
    with sync_playwright() as p:
        nav, pag, errores = _pagina(p, 1600, 900)
        for t in (0.5, 5.0, 9.0, 10.6, 12.4, 14.0, 17.0, 20.0, 22.0, 24.0):
            url = pag.evaluate(f"window.__render({t}, 1600, 900)")
            _guardar_jpeg(url, carpeta / f"t{t:04.1f}.jpg")
        nav.close()
    print("ok capturas en", carpeta, "| errores de consola:", errores or "ninguno")


def video(fps=30, ancho=1920, alto=1080):
    import imageio_ffmpeg
    import subprocess
    from playwright.sync_api import sync_playwright
    destino = SALIDA / "TerraSense_ensamblaje.mp4"
    n = int(DURACION * fps) + 1
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
           # los JPEG vienen en rango completo; se pasa a rango de TV para que PowerPoint no lave los colores
           "-vf", "scale=in_range=full:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", str(destino)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with sync_playwright() as p:
        nav, pag, errores = _pagina(p, ancho, alto)
        for i in range(n):
            url = pag.evaluate(f"window.__render({i / fps}, {ancho}, {alto})")
            ff.stdin.write(base64.b64decode(url.split(",", 1)[1]))
            if i % 60 == 0:
                print(f"  cuadro {i}/{n}", flush=True)
        nav.close()
    ff.stdin.close()
    ff.wait()
    print(f"ok {destino.name} ({destino.stat().st_size / 1e6:.1f} MB) | errores de consola:", errores or "ninguno")


if __name__ == "__main__":
    generar_html()
    if "--capturas" in sys.argv:
        capturas()
    if "--video" in sys.argv:
        video()
