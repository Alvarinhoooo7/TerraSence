"""Comprueba navegación, escenas, gráficos, calculadoras, video y desbordes del preview en Chrome.

Requiere playwright y Chrome instalados. Las capturas de revisión van al directorio temporal del sistema.
"""
from pathlib import Path
import json
import tempfile
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / "index.html").as_uri()
CAPTURES = Path(tempfile.gettempdir()) / "terrasense-presentacion-preview"
CAPTURES.mkdir(exist_ok=True)
for old in CAPTURES.glob("*.png"):
    old.unlink()
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
data_js = (HERE / "datos.js").read_text(encoding="utf-8")
DATA = json.loads(data_js[data_js.index("=") + 1:].rstrip().rstrip(";"))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(CHROME), headless=True, args=["--autoplay-policy=no-user-gesture-required"])
    page = browser.new_page(viewport={"width": 1440, "height": 868}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(URL)
    page.wait_for_function("window.TERRA_DECK && document.querySelector('.slide.is-active')")
    ids = page.evaluate("window.TERRA_DECK.ids")
    findings = []
    for i, slide_id in enumerate(ids):
        page.goto(URL + "#" + slide_id)
        page.wait_for_function(f"document.querySelector('#s-{slide_id}.is-active')")
        page.wait_for_timeout(2600)
        broken = page.locator(".slide:not([hidden]) img").evaluate_all("els=>els.filter(e=>!e.naturalWidth).map(e=>e.src)")
        assert not broken, broken
        dims = page.locator(".slide:not([hidden])").evaluate("e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight})")
        decorative = slide_id.startswith("cap-")  # el número gigante del separador se recorta a propósito
        if dims["sw"] > dims["w"] + 2 or (dims["sh"] > dims["h"] + 2 and not decorative):
            findings.append({"slide": slide_id, "viewport": "desktop", **dims})
        # Contenido que baja hasta el pie de página.
        low = page.evaluate(f"""()=>{{const s=document.querySelector('#s-{slide_id}');
          if(['cover','divider','closing'].some(c=>s.classList.contains(c)))return [];
          const r=s.getBoundingClientRect(),k=r.height/810;
          return [...s.querySelectorAll('h2,h3,p,figure,article,.band,.statement,video,.stack,.phone,.milestones,.journey-stage,.auto-result,.slider-box')]
            .filter(e=>!e.closest('.foot')).map(e=>[e.tagName+'.'+e.className,Math.round((e.getBoundingClientRect().bottom-r.top)/k)]).filter(x=>x[1]>770)}}""")
        if low:
            findings.append({"slide": slide_id, "viewport": "desktop", "bajo_el_margen": low[:4]})
        # Ningún texto en rojo: el rojo queda para fondos, barras y bordes.
        red = page.evaluate(f"""()=>[...document.querySelectorAll('#s-{slide_id} *')].filter(e=>
          [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&
          ['rgb(200, 16, 46)','rgb(155, 12, 35)','rgb(255, 138, 155)','rgb(255, 77, 101)'].includes(getComputedStyle(e).color)).map(e=>e.textContent.trim().slice(0,40))""")
        if red:
            findings.append({"slide": slide_id, "texto_rojo": red[:4]})
        page.locator("#deck").screenshot(path=str(CAPTURES / f"{i + 1:02d}-{slide_id}.png"))

    # Pasos: entrar con la flecha muestra el paso 0; avanzar revela el resto antes de cambiar de pantalla.
    def enter_from_previous(slide_id):
        page.evaluate(f"window.TERRA_DECK.show({ids.index(slide_id) - 1})")
        page.wait_for_timeout(150)
        page.keyboard.press("ArrowRight")
        assert page.url.endswith("#" + slide_id), page.url
    enter_from_previous("resultados")
    assert page.locator("#s-resultados .reveal.is-hidden").count() == 1
    page.keyboard.press("ArrowRight")
    assert page.locator("#s-resultados .reveal.is-hidden").count() == 0
    enter_from_previous("precio")
    assert page.locator("#s-precio [data-reveal].is-hidden").count() == 4
    # Alcance del relato y correcciones del piloto.
    assert len(ids) == 22, ids
    assert not set(ids) & {"demo", "escena3d", "autonomia", "sensibilidad", "carcasa", "alternativas", "consecuencias", "temporada", "conclusiones"}
    assert page.locator("iframe").count() == 0
    assert DATA["battery"]["mah"] == 5000 and DATA["battery"]["wh"] == 18.5
    assert "autonomy" not in DATA
    all_text = page.locator("#deck").text_content()
    assert not any(t in all_text for t in ["20 bytes", "HTTPS", "CRC", "2.000 mAh", "Demostración en vivo"])
    assert "30 % de utilidad" in all_text and "valor de referencia" not in all_text and "IVA" in all_text
    assert not any(w in all_text.lower() for w in ["plata", "a ojo", "capítulo"]), "registro informal o numeración de capítulos"
    assert ids[-1] == "demostracion" and ids[-2] == "resultados"
    assert all(c in ids for c in ("cap-problema", "cap-objetivos", "cap-hardware", "cap-equipo", "cap-energia", "cap-economia"))

    # Video: decodifica, salta de capítulo y se pausa al salir.
    page.goto(URL + "#ensamblaje")
    page.wait_for_function("document.querySelector('video').readyState>=1")
    video = page.locator("video").evaluate("v=>({duration:v.duration,width:v.videoWidth})")
    assert video["duration"] > 20 and video["width"] > 0, video
    page.locator('[data-video-time="17.6"]').click()
    page.wait_for_function("!document.querySelector('video').paused")
    page.get_by_role("button", name="Pantalla siguiente", exact=True).click()
    assert page.locator("video").evaluate("v=>v.paused")

    # Índice y notas.
    page.get_by_role("button", name="Índice", exact=False).click()
    page.locator(f'[data-index="{ids.index("mercado")}"]').click()
    assert page.url.endswith("#mercado")
    page.get_by_role("button", name="Notas", exact=True).click()
    assert "TAM" in page.locator("#notes-content").inner_text()
    page.locator("#notes-dialog [data-close]").click()

    for width, height in [(390, 844), (320, 740), (768, 1024)]:
        page.set_viewport_size({"width": width, "height": height})
        for slide_id in ids:
            page.goto(URL + "#" + slide_id)
            d = page.evaluate("({w:innerWidth,sw:document.documentElement.scrollWidth,vw:document.getElementById('viewport').clientWidth,vs:document.getElementById('viewport').scrollWidth})")
            if d["sw"] > d["w"] + 2 or d["vs"] > d["vw"] + 2:
                findings.append({"slide": slide_id, "viewport": width, **d})
    browser.close()

print(json.dumps({"slides": len(ids), "video": video, "errors": errors, "overflow": findings, "captures": str(CAPTURES)}, ensure_ascii=False, indent=2))
assert not errors, errors
assert not findings, findings
