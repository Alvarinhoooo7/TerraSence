# -*- coding: utf-8 -*-
"""Genera un Markdown espejo del PDF del informe, conservando el orden de lectura,
las tablas y los rotulos, para poder comparar ambos documentos lado a lado.
"""
import re
import sys

import pymupdf

PDF = r"C:\dev\terrasense\Evaluacion\Evaluacion 1\INFORME 1 .docx.pdf"
OUT = sys.argv[1] if len(sys.argv) > 1 else r"C:\dev\terrasense\docs\INFORME_1_ESPEJO.md"

NBSP = "\u00a0"
ZWSP = "\u200b"


def limpiar(t):
    t = t.replace(NBSP, " ").replace(ZWSP, "")
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()


def celda(c):
    c = limpiar((c or "").replace("\n", " "))
    return c.replace("|", "\\|")


def normalizar(rows):
    rows = [[celda(c) for c in r] for r in rows if any((c or "").strip() for c in r)]
    if not rows:
        return []
    ancho = max(len(r) for r in rows)
    return [r + [""] * (ancho - len(r)) for r in rows]


def tabla_md(rows, continuacion=False):
    rows = normalizar(rows)
    if not rows:
        return ""
    ancho = len(rows[0])
    if continuacion:
        # La tabla viene partida desde la pagina anterior: sin encabezado nuevo.
        return "\n".join("| " + " | ".join(r) + " |" for r in rows)
    out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * ancho]
    for r in rows[1:]:
        out.append("| " + " | ".join(r) + " |")
    return "\n".join(out)


ROMANO = re.compile(r"^(I{1,3}|IV|V|VI{1,2}|VII)\.\s*$")
CAPTION = re.compile(r"^(Tabla|Figura)\s+\d+\.\d+")


def es_titulo_seccion(txt):
    return bool(re.match(r"^(I{1,3}|IV|VI{0,2}|VII)\.\s+\S", txt))


def bloque_md(txt, tam, negrita):
    """Convierte un bloque de texto en Markdown segun su aspecto."""
    t = limpiar(txt)
    if not t:
        return ""
    if CAPTION.match(t):
        return "**" + t + "**"
    if es_titulo_seccion(t):
        return "## " + t
    # Subtitulos: linea corta, en negrita, que suele terminar en dos puntos
    if negrita and len(t) < 90 and not t.startswith("●"):
        return "### " + t.rstrip(":") if t.endswith(":") else "### " + t
    # Vinetas
    if t.startswith("●"):
        cuerpo = t.lstrip("● ").strip()
        return "- " + cuerpo
    return t


TERMINAL = re.compile(r"[.:;!?»”\)]$")


def render(flujo):
    """Une lineas en parrafos, fusiona tablas partidas y emite el Markdown."""
    salida, buffer, ultima_pagina = [], [], 0
    ancho_previo, previo_fue_tabla = 0, False

    def vaciar():
        if buffer:
            salida.append(" ".join(buffer))
            buffer.clear()

    pendiente = None

    def marcador():
        """Entrega el salto de pagina pendiente una sola vez."""
        nonlocal pendiente
        m, pendiente = pendiente, None
        return m

    for pagina, tipo, dato in flujo:
        if pagina != ultima_pagina:
            ultima_pagina = pagina
            pendiente = "\n<!-- ===== PAGINA %d ===== -->\n" % pagina

        if tipo == "tabla":
            filas = normalizar(dato)
            ancho = len(filas[0]) if filas else 0
            sigue = previo_fue_tabla and ancho == ancho_previo
            vaciar()
            m = marcador()
            if m:
                salida.append(m)
            md = tabla_md(dato, continuacion=sigue)
            if md:
                salida.append(md)
            ancho_previo, previo_fue_tabla = ancho, True
            continue

        if tipo == "figura":
            vaciar()
            m = marcador()
            if m:
                salida.append(m)
            salida.append("> *[imagen del documento original]*")
            previo_fue_tabla = False
            continue

        md = bloque_md(*dato)
        if not md:
            continue
        # Un salto de pagina no corta un parrafo; cualquier otro elemento si.
        es_parrafo = not md.startswith(("#", "-", "**", ">"))
        continua = es_parrafo and buffer and not TERMINAL.search(buffer[-1])
        if continua:
            buffer.append(md)          # la linea anterior venia cortada
        else:
            vaciar()
            m = marcador()
            if m:
                salida.append(m)
            if es_parrafo:
                buffer.append(md)
            else:
                salida.append(md)
        previo_fue_tabla = False
    vaciar()
    return salida


def main():
    doc = pymupdf.open(PDF)
    partes = ["<!-- INFORME 1 de TerraSense. Contraparte en texto de la exportación",
              "     `INFORME 1 .docx.pdf` de esta misma carpeta. Documento generado: no editar a mano. -->",
              ""]
    flujo = []
    for n, page in enumerate(doc):
        tablas = page.find_tables()
        cajas = [pymupdf.Rect(t.bbox) for t in tablas.tables]
        elementos = []
        for i, t in enumerate(tablas.tables):
            elementos.append((pymupdf.Rect(t.bbox).y0, "tabla", t.extract()))

        d = page.get_text("dict")
        for blk in d.get("blocks", []):
            r = pymupdf.Rect(blk["bbox"])
            if blk.get("type") != 0:
                # Solo imagenes con superficie real; se descartan fondos y filetes.
                if r.width > 80 and r.height > 80:
                    elementos.append((r.y0, "figura", None))
                continue
            if any(r.intersects(c) and r.get_area() and
                   (r & c).get_area() / r.get_area() > 0.5 for c in cajas):
                continue  # el bloque pertenece a una tabla ya capturada
            texto, tam_max, negrita = [], 0, False
            for line in blk["lines"]:
                seg = "".join(s["text"] for s in line["spans"])
                texto.append(seg)
                for s in line["spans"]:
                    tam_max = max(tam_max, s["size"])
                    if s["flags"] & 2 ** 4 or "bold" in s.get("font", "").lower():
                        negrita = True
            # Un bloque es un parrafo: sus lineas se reunen en una sola.
            elementos.append((r.y0, "texto", (" ".join(texto), tam_max, negrita)))

        elementos.sort(key=lambda e: e[0])
        for _, tipo, dato in elementos:
            flujo.append((n + 1, tipo, dato))

    partes += render(flujo)
    texto = "\n\n".join(p for p in partes if p)
    texto = re.sub(r"\n{4,}", "\n\n\n", texto)
    with open(OUT, "w", encoding="utf-8", newline="\r\n") as fh:
        fh.write(texto)
    print("Escrito:", OUT)
    print("Paginas:", doc.page_count, "| caracteres:", len(texto))


if __name__ == "__main__":
    main()
