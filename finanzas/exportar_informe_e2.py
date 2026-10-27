"""Exporta el informe 2 a Word conservando los enlaces internos a la bibliografía.

El entregable se arma en Word, pero su fuente es el Markdown del informe: así la numeración
de tablas y figuras, los índices y las referencias salen de un solo lugar y no pueden
desincronizarse. Este guion traduce el Markdown a un `.docx` con estilos de encabezado
reales (para que Word genere el índice con sus números de página), tablas con fila de
cabecera repetida, las figuras incrustadas y, sobre todo, cada cita «[n]» convertida en un
enlace que salta a su entrada de la bibliografía.

El documento sale ya con el marco de la institución: tamaño carta, Arial 11 justificado a
1,5 líneas, títulos en Arial negrita, el logotipo en el encabezado de cada página y, en el
pie, el número de página y la franja roja. Esos dos elementos gráficos están recortados del
informe entregado y viven en `Evaluacion/Evaluacion 2/Plantilla/`.

Lo que queda para Word: pulsar «actualizar campos» para que el índice general tome sus
números de página y revisar el corte de las tablas más anchas.

    python finanzas/exportar_informe_e2.py
"""

import os
import re
import sys

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2")
ORIGEN = os.path.join(CARPETA, "INFORME 2.md")
DESTINO = os.path.join(CARPETA, "INFORME 2.docx")
LOGOTIPO = os.path.join(CARPETA, "Plantilla", "encabezado.png")
FRANJA = os.path.join(CARPETA, "Plantilla", "pie.png")

ANCHO_TEXTO = Cm(16.0)

# Un solo barrido reconoce negrita, cursiva, código, cita bibliográfica, enlace y URL suelta.
INLINE = re.compile(
    r"\*\*(?P<negrita>.+?)\*\*"
    r"|(?<![\*\w])\*(?P<cursiva>[^*]+?)\*(?!\w)"
    r"|`(?P<codigo>[^`]+?)`"
    r"|\[(?P<enlace>[^\]]+?)\]\((?P<url>[^)]+?)\)"
    r"|\[(?P<cita>\d{1,3})\]"
    r"|(?P<suelta>https?://[^\s,;)\]]+)"
)
IMAGEN = re.compile(r"^!\[(?P<alt>[^\]]*)\]\((?P<ruta>[^)]+)\)\s*$")
ROTULO = re.compile(r"^\*\*(Tabla|Figura) \d+\.\d “.+”\*\*\s*$")
BIBLIO = re.compile(r"^(\d{1,3})\.\s+(.*)$")
RUIDO = re.compile(r"^\s*(<!--.*-->|<a id=\"[^\"]*\"></a>)\s*$")


def _sub(padre, etiqueta, **atributos):
    hijo = OxmlElement(etiqueta)
    for clave, valor in atributos.items():
        hijo.set(qn("w:" + clave), valor)
    padre.append(hijo)
    return hijo


class Exportador:
    def __init__(self, doc):
        self.doc = doc
        self.marcador = 0

    # ---------------------------------------------------------------- piezas de bajo nivel
    def marcar(self, parrafo, nombre):
        """Coloca un marcador de Word alrededor del párrafo, para que un enlace pueda saltar aquí."""
        self.marcador += 1
        ident = str(self.marcador)
        inicio = OxmlElement("w:bookmarkStart")
        inicio.set(qn("w:id"), ident)
        inicio.set(qn("w:name"), nombre)
        fin = OxmlElement("w:bookmarkEnd")
        fin.set(qn("w:id"), ident)
        parrafo._p.insert(0, inicio)
        parrafo._p.append(fin)

    def enlace(self, parrafo, texto, destino, interno):
        h = OxmlElement("w:hyperlink")
        if interno:
            h.set(qn("w:anchor"), destino)
        else:
            rid = parrafo.part.relate_to(destino, RT.HYPERLINK, is_external=True)
            h.set(qn("r:id"), rid)
        r = OxmlElement("w:r")
        rpr = _sub(r, "w:rPr")
        _sub(rpr, "w:rStyle", val="Hyperlink")
        t = _sub(r, "w:t")
        t.text = texto
        t.set(qn("xml:space"), "preserve")
        h.append(r)
        parrafo._p.append(h)

    def texto(self, parrafo, cadena, negrita=False, tam=None):
        """Escribe una línea resolviendo negrita, cursiva, código, citas y enlaces."""
        pos = 0
        for m in INLINE.finditer(cadena):
            if m.start() > pos:
                self._run(parrafo, cadena[pos:m.start()], negrita, tam)
            if m.group("negrita"):
                self._run(parrafo, m.group("negrita"), True, tam)
            elif m.group("cursiva"):
                r = self._run(parrafo, m.group("cursiva"), negrita, tam)
                r.italic = True
            elif m.group("codigo"):
                r = self._run(parrafo, m.group("codigo"), negrita, tam)
                r.font.name = "Consolas"
            elif m.group("enlace"):
                self.enlace(parrafo, m.group("enlace"), m.group("url"), interno=False)
            elif m.group("cita"):
                # La cita salta a su entrada de la bibliografía.
                self.enlace(parrafo, "[%s]" % m.group("cita"), "ref_%s" % m.group("cita"), interno=True)
            elif m.group("suelta"):
                self.enlace(parrafo, m.group("suelta"), m.group("suelta"), interno=False)
            pos = m.end()
        if pos < len(cadena):
            self._run(parrafo, cadena[pos:], negrita, tam)

    @staticmethod
    def _run(parrafo, cadena, negrita, tam):
        r = parrafo.add_run(cadena)
        r.bold = negrita
        if tam:
            r.font.size = Pt(tam)
        return r

    # ---------------------------------------------------------------- bloques
    def indice_de_word(self):
        """Campo TOC: Word lo rellena con los títulos y sus números de página."""
        p = self.doc.add_paragraph()
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="begin")
        p._p.append(r)
        r = OxmlElement("w:r")
        instr = _sub(r, "w:instrText")
        instr.text = ' TOC \\o "1-2" \\h \\z \\u '
        instr.set(qn("xml:space"), "preserve")
        p._p.append(r)
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="separate")
        p._p.append(r)
        p.add_run("Índice generado por Word: seleccionar y pulsar F9 para actualizarlo.")
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="end")
        p._p.append(r)

    def tabla(self, filas):
        cabecera = [c.strip() for c in filas[0].strip().strip("|").split("|")]
        cuerpo = [[c.strip() for c in f.strip().strip("|").split("|")] for f in filas[2:]]
        ncol = len(cabecera)
        # Las tablas anchas sólo caben con cuerpo reducido; es lo que hace legible una de ocho columnas.
        tam = 7 if ncol >= 7 else 8 if ncol >= 5 else 9
        t = self.doc.add_table(rows=1, cols=ncol)
        t.style = "Table Grid"
        t.autofit = True
        for i, celda in enumerate(cabecera):
            p = t.rows[0].cells[i].paragraphs[0]
            self.texto(p, celda, negrita=True, tam=tam)
            _compacto(p)
        _sub(_sub(t.rows[0]._tr, "w:trPr"), "w:tblHeader", val="true")
        for fila in cuerpo:
            celdas = t.add_row().cells
            for i, celda in enumerate(fila[:ncol]):
                p = celdas[i].paragraphs[0]
                self.texto(p, celda, tam=tam)
                _compacto(p)

    def imagen(self, alt, ruta):
        absoluta = os.path.join(CARPETA, ruta.replace("/", os.sep))
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if not os.path.exists(absoluta):
            self.texto(p, "[Falta la figura: %s]" % alt)
            return False
        p.add_run().add_picture(absoluta, width=ANCHO_TEXTO)
        return True


def _compacto(parrafo):
    """Deja una celda de tabla a una línea y alineada a la izquierda.

    El cuerpo del informe va justificado y a 1,5 líneas, que es lo correcto en el texto
    corrido y pésimo dentro de una celda angosta: una tabla de ocho columnas se duplicaría
    de alto y partiría las palabras.
    """
    formato = parrafo.paragraph_format
    formato.alignment = WD_ALIGN_PARAGRAPH.LEFT
    formato.line_spacing = 1.0
    formato.space_before = Pt(1)
    formato.space_after = Pt(1)


def tipografia(doc):
    """Fija la tipografía del informe: Arial 11 en el cuerpo y Arial negrita en los títulos.

    Son las medidas de los dos informes ya entregados: cuerpo Arial 11 justificado con
    interlineado de 1,5 líneas y títulos de capítulo en Arial negrita 14. Los estilos de
    encabezado que trae Word vienen en Calibri Light azul, así que se redefinen uno por uno.
    """
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(11)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(6)
    for nivel, tamano in ((1, 14), (2, 12), (3, 11)):
        estilo = doc.styles["Heading %d" % nivel]
        estilo.font.name = "Arial"
        estilo.font.size = Pt(tamano)
        estilo.font.bold = True
        estilo.font.color.rgb = RGBColor(0, 0, 0)
        estilo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        estilo.paragraph_format.line_spacing = 1.5
        estilo.paragraph_format.space_before = Pt(12)
        estilo.paragraph_format.space_after = Pt(6)


def marco_institucional(doc):
    """Pone el logotipo en el encabezado y, en el pie, el número de página y la franja roja.

    Son los dos elementos que la plantilla de la institución repite en todas las páginas, y
    están recortados del propio informe entregado, de modo que el documento generado salga
    con el marco puesto y no haya que montarlo a mano en Word.
    """
    seccion = doc.sections[0]

    encabezado = seccion.header.paragraphs[0]
    encabezado.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(LOGOTIPO):
        encabezado.add_run().add_picture(LOGOTIPO, width=Cm(3.8))

    pie = seccion.footer.paragraphs[0]
    pie.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pie.paragraph_format.space_after = Pt(0)
    for marca, instruccion in (("begin", None), (None, "PAGE"), ("end", None)):
        run = pie.add_run()
        if marca:
            _sub(run._r, "w:fldChar", fldCharType=marca)
        else:
            campo = _sub(run._r, "w:instrText")
            campo.text = instruccion
            campo.set(qn("xml:space"), "preserve")
        run.font.name = "Arial"
        run.font.size = Pt(10)

    if os.path.exists(FRANJA):
        banda = seccion.footer.add_paragraph()
        banda.alignment = WD_ALIGN_PARAGRAPH.LEFT
        # La franja sangra fuera de los márgenes porque cruza la página de borde a borde.
        banda.paragraph_format.left_indent = -seccion.left_margin
        banda.paragraph_format.space_before = Pt(0)
        banda.paragraph_format.space_after = Pt(0)
        banda.paragraph_format.line_spacing = 1.0
        banda.add_run().add_picture(FRANJA, width=seccion.page_width, height=Cm(0.65))


def convertir():
    with open(ORIGEN, encoding="utf-8", newline="") as f:
        lineas = f.read().replace("\r\n", "\n").split("\n")

    doc = Document()
    seccion = doc.sections[0]
    seccion.orientation = WD_ORIENT.PORTRAIT
    # Tamaño carta: es el de los dos informes ya entregados.
    seccion.page_width, seccion.page_height = Cm(21.59), Cm(27.94)
    seccion.left_margin = seccion.right_margin = Cm(2.0)
    # El margen superior deja sitio al logotipo y el inferior a la franja roja del pie.
    seccion.top_margin = Cm(2.5)
    seccion.bottom_margin = Cm(2.0)
    seccion.header_distance = Cm(1.0)
    seccion.footer_distance = Cm(0)
    tipografia(doc)
    marco_institucional(doc)

    ex = Exportador(doc)
    faltan_figuras = []
    citas = set()
    i = 0
    portada = True
    en_bibliografia = False
    primer_capitulo = True

    while i < len(lineas):
        linea = lineas[i].rstrip()

        if not linea.strip() or RUIDO.match(linea):
            i += 1
            continue

        # ------------------------------------------------ encabezados
        if linea.startswith("## "):
            titulo = linea[3:].strip()
            en_bibliografia = titulo.startswith("XIII.")
            if not primer_capitulo:
                doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
            primer_capitulo = False
            doc.add_heading(titulo, level=1)
            i += 1
            continue

        if linea.startswith("### "):
            titulo = linea[4:].strip()
            if portada and titulo == "Índice general":
                portada = False
                doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
                doc.add_heading(titulo, level=1)
                ex.indice_de_word()
                # El índice del Markdown se omite: lo genera Word con sus números de página.
                i += 1
                while i < len(lineas) and not lineas[i].startswith("#"):
                    i += 1
                continue
            if portada:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(titulo)
                r.bold = True
                r.font.size = Pt(26 if titulo == "TERRASENSE" else 14)
                i += 1
                continue
            if titulo in ("Índice de figuras", "Índice de tablas"):
                doc.add_heading(titulo, level=1)
            else:
                doc.add_heading(titulo, level=2)
            i += 1
            continue

        # ------------------------------------------------ figura y rótulo
        m = IMAGEN.match(linea)
        if m:
            if not ex.imagen(m.group("alt"), m.group("ruta")):
                faltan_figuras.append(m.group("ruta"))
            i += 1
            continue

        if ROTULO.match(linea):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            ex.texto(p, linea.strip(), tam=9)
            i += 1
            continue

        # ------------------------------------------------ tabla
        if linea.startswith("|"):
            bloque = []
            while i < len(lineas) and lineas[i].startswith("|"):
                bloque.append(lineas[i])
                i += 1
            if len(bloque) >= 2:
                ex.tabla(bloque)
            continue

        # ------------------------------------------------ lista
        if re.match(r"^\s*[-*] ", linea):
            sangria = len(linea) - len(linea.lstrip())
            estilo = "List Bullet 2" if sangria >= 2 else "List Bullet"
            p = doc.add_paragraph(style=estilo)
            ex.texto(p, re.sub(r"^\s*[-*] ", "", linea))
            i += 1
            continue

        if re.match(r"^\s*\d+\. ", linea):
            m = BIBLIO.match(linea.strip())
            if en_bibliografia and m:
                p = doc.add_paragraph()
                ex.marcar(p, "ref_%s" % m.group(1))
                ex.texto(p, "%s. " % m.group(1), negrita=True)
                ex.texto(p, m.group(2))
                citas.add(int(m.group(1)))
            else:
                p = doc.add_paragraph(style="List Number")
                ex.texto(p, re.sub(r"^\s*\d+\. ", "", linea))
            i += 1
            continue

        # ------------------------------------------------ párrafo
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if portada else WD_ALIGN_PARAGRAPH.JUSTIFY
        ex.texto(p, linea.strip())
        i += 1

    # Word pregunta por los campos al abrir, de modo que el índice llegue con sus páginas.
    _sub(doc.settings.element, "w:updateFields", val="true")
    doc.save(DESTINO)
    return citas, faltan_figuras


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    citas, faltan = convertir()
    with open(ORIGEN, encoding="utf-8") as f:
        texto = f.read()
    referidas = {int(n) for n in re.findall(r"\[(\d{1,3})\]", texto)}
    huerfanas = sorted(referidas - citas)
    print("Informe exportado: %s" % os.path.basename(DESTINO))
    print("  %d entradas de bibliografía con marcador; %d números citados en el texto"
          % (len(citas), len(referidas)))
    if huerfanas:
        print("  citas sin entrada en la bibliografía: %s" % huerfanas)
    if faltan:
        print("  figuras que no se encontraron: %s" % sorted(set(faltan)))
    return 1 if huerfanas or faltan else 0


if __name__ == "__main__":
    raise SystemExit(main())
