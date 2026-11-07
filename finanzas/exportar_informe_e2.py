"""Exporta el informe 2 a Word conservando los enlaces internos a la bibliografía.

El Word contiene correcciones editoriales manuales y es la versión vigente del entregable.
Sin --desde-markdown se conserva su contenido; --paginar sólo actualiza sus campos.
La reconstrucción explícita desde Markdown permite mantener la numeración
de tablas y figuras, los índices y las referencias salen de un solo lugar y no pueden
desincronizarse. Este guion traduce el Markdown a un `.docx` con estilos de encabezado
reales (para que Word genere el índice con sus números de página), tablas con fila de
cabecera repetida, las figuras incrustadas y, sobre todo, cada cita «[n]» convertida en un
enlace que salta a su entrada de la bibliografía.

El documento utiliza la portada y el marco del Word original entregado: tamaño carta,
márgenes superior de 3 cm, inferior de 2 cm y laterales de 1,5 cm, fondo institucional,
encabezados y pies originales. El cuerpo usa Calibri 11 a 1,5 líneas; las tablas, Calibri 9.
La base reutilizable está en `Evaluacion/Evaluacion 2/Plantilla/base_institucional.docx`.

La opción --paginar actualiza el índice y los números de página mediante LibreOffice
instalado, en una instancia oculta y aislada. --pdf-revision permite guardar una copia
para inspeccionar las tablas y los saltos de página antes de entregar.

    python finanzas/exportar_informe_e2.py --paginar
"""

import os
import re
import sys
import argparse
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from copy import deepcopy

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.style import WD_STYLE_TYPE
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
PLANTILLA = os.path.join(CARPETA, "Plantilla", "base_institucional.docx")

ANCHO_TEXTO = Cm(16.0)

# Un solo barrido reconoce negrita, cursiva, código, cita bibliográfica, enlace y URL suelta.
INLINE = re.compile(
    r"\*\*(?P<negrita>.+?)\*\*"
    r"|(?<![\*\w])\*(?P<cursiva>[^*]+?)\*(?!\w)"
    r"|`(?P<codigo>[^`]+?)`"
    r"|\[(?P<enlace>[^\]]+?)\]\((?P<url>[^)]+?)\)"
    r"|\[(?P<cita>\d{1,3}(?:\s*,\s*\d{1,3})*)\]"
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

    def enlace(self, parrafo, texto, destino, interno, tam=None):
        h = OxmlElement("w:hyperlink")
        if interno:
            h.set(qn("w:anchor"), destino)
        else:
            rid = parrafo.part.relate_to(destino, RT.HYPERLINK, is_external=True)
            h.set(qn("r:id"), rid)
        r = OxmlElement("w:r")
        rpr = _sub(r, "w:rPr")
        _sub(rpr, "w:rStyle", val=self.doc.styles["Hyperlink"].style_id)
        if tam:
            _sub(rpr, "w:sz", val=str(tam * 2))
        t = _sub(r, "w:t")
        t.text = texto
        t.set(qn("xml:space"), "preserve")
        h.append(r)
        parrafo._p.append(h)

    def texto(self, parrafo, cadena, negrita=False, cursiva=False, tam=None):
        """Escribe una línea resolviendo negrita, cursiva, código, citas y enlaces."""
        pos = 0
        for m in INLINE.finditer(cadena):
            if m.start() > pos:
                self._run(parrafo, cadena[pos:m.start()], negrita, cursiva, tam)
            if m.group("negrita"):
                self.texto(parrafo, m.group("negrita"), negrita=True, cursiva=cursiva, tam=tam)
            elif m.group("cursiva"):
                self.texto(parrafo, m.group("cursiva"), negrita=negrita, cursiva=True, tam=tam)
            elif m.group("codigo"):
                r = self._run(parrafo, m.group("codigo"), negrita, cursiva, tam)
                r.font.name = "Consolas"
            elif m.group("enlace"):
                self.enlace(parrafo, m.group("enlace"), m.group("url"), interno=False, tam=tam)
            elif m.group("cita"):
                # Cada número salta a su entrada de la bibliografía; los corchetes y las comas
                # quedan como texto, para que «[2, 3]» se lea igual y sus dos números enlacen.
                numeros = [n.strip() for n in m.group("cita").split(",")]
                self._run(parrafo, "[", negrita, cursiva, tam)
                for k, numero in enumerate(numeros):
                    if k:
                        self._run(parrafo, ", ", negrita, cursiva, tam)
                    self.enlace(parrafo, numero, "ref_%s" % numero, interno=True, tam=tam)
                self._run(parrafo, "]", negrita, cursiva, tam)
            elif m.group("suelta"):
                self.enlace(parrafo, m.group("suelta"), m.group("suelta"), interno=False, tam=tam)
            pos = m.end()
        if pos < len(cadena):
            self._run(parrafo, cadena[pos:], negrita, cursiva, tam)

    @staticmethod
    def _run(parrafo, cadena, negrita=False, cursiva=False, tam=None):
        r = parrafo.add_run(cadena)
        r.bold = negrita
        r.italic = cursiva
        if tam:
            r.font.size = Pt(tam)
        return r

    # ---------------------------------------------------------------- bloques
    def indice_de_word(self, instruccion=None, entradas=()):
        """Índice nativo actualizable, con títulos visibles incluso antes de paginar."""
        p = self.doc.add_paragraph(style="Cuerpo del informe")
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="begin")
        p._p.append(r)
        r = OxmlElement("w:r")
        instr = _sub(r, "w:instrText")
        instr.text = instruccion or ' TOC \\o "1-2" \\h \\z \\u '
        instr.set(qn("xml:space"), "preserve")
        p._p.append(r)
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="separate")
        p._p.append(r)
        for texto, nivel in entradas:
            p = self.doc.add_paragraph(style="Índice del informe")
            p.paragraph_format.left_indent = Cm(0.5 if nivel == 2 else 0)
            self.texto(p, texto)
        r = OxmlElement("w:r")
        _sub(r, "w:fldChar", fldCharType="end")
        p._p.append(r)

    def tabla(self, filas):
        def celdas(fila):
            return [c.strip().replace(r"\|", "|") for c in re.split(r"(?<!\\)\|", fila.strip())[1:-1]]

        if len(filas) < 2 or not all(re.fullmatch(r":?-{3,}:?", c) for c in celdas(filas[1])):
            raise ValueError("Tabla sin separador de encabezado: %s" % filas[0][:100])
        cabecera = celdas(filas[0])
        cuerpo = [celdas(f) for f in filas[2:]]
        ncol = len(cabecera)
        if any(len(celdas(f)) != ncol for f in filas[1:]):
            raise ValueError("Tabla con distinta cantidad de columnas: %s" % filas[0][:100])
        # El original utiliza Calibri 9 también en las tablas anchas.
        tam = 9
        matriz_aceptacion = cabecera[:4] == ["ID", "Ensayos", "Prueba y método", "Criterio de aceptación"] and ncol == 7
        if matriz_aceptacion:
            # Los identificadores ocupan poco; reservar espacio al método y a la evidencia
            # permite mantener Calibri 8 y evita siete columnas iguales casi vacías.
            tam = 9
        t = self.doc.add_table(rows=1, cols=ncol)
        t.style = "Table Grid"
        bordes = _sub(t._tbl.tblPr, "w:tblBorders")
        for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
            _sub(bordes, "w:" + lado, val="single", sz="6", color="000000")
        margenes = _sub(t._tbl.tblPr, "w:tblCellMar")
        for lado, valor in (("top", 100), ("bottom", 100), ("left", 100), ("right", 100)):
            _sub(margenes, "w:" + lado, w=str(valor), type="dxa")
        t.autofit = not matriz_aceptacion
        anchos = [1.1, 1.8, 3.1, 3.3, 1.95, 3.65, 2.69] if matriz_aceptacion else None
        if anchos:
            for columna, ancho in zip(t.columns, anchos):
                columna.width = Cm(ancho)
        for i, celda in enumerate(cabecera):
            if anchos:
                t.rows[0].cells[i].width = Cm(anchos[i])
            p = t.rows[0].cells[i].paragraphs[0]
            p.style = "Cuerpo del informe"
            self.texto(p, celda, negrita=True, tam=tam)
            _compacto(p)
        _sub(_sub(t.rows[0]._tr, "w:trPr"), "w:tblHeader", val="true")
        for fila in cuerpo:
            row = t.add_row()
            celdas = row.cells
            if anchos:
                _sub(_sub(row._tr, "w:trPr"), "w:cantSplit")
            for i, celda in enumerate(fila):
                if anchos:
                    celdas[i].width = Cm(anchos[i])
                p = celdas[i].paragraphs[0]
                p.style = "Cuerpo del informe"
                self.texto(p, celda, tam=tam)
                _compacto(p)

    def imagen(self, alt, ruta):
        absoluta = os.path.join(CARPETA, ruta.replace("/", os.sep))
        p = self.doc.add_paragraph(style="Cuerpo del informe")
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
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
    """Fija la tipografía del informe: Calibri 11 en el cuerpo y Calibri negrita en los títulos.

    Son las medidas de los dos informes ya entregados: cuerpo Calibri 11 justificado con
    interlineado de 1,5 líneas y títulos de capítulo en Calibri negrita 14. Los estilos de
    encabezado que trae Word vienen en Calibri Light azul, así que se redefinen uno por uno.
    """
    # No modificar Normal: la portada, el encabezado y el pie originales lo heredan.
    normal = doc.styles.add_style("Cuerpo del informe", WD_STYLE_TYPE.PARAGRAPH)
    normal.base_style = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.widow_control = True
    for nombre in ("List Bullet", "List Bullet 2", "List Number"):
        if nombre not in doc.styles:
            original = Document().styles[nombre]
            doc.styles.element.append(deepcopy(original.element))
        estilo = doc.styles[nombre]
        estilo.font.name = "Calibri"
        estilo.font.size = Pt(11)
        estilo.paragraph_format.line_spacing = 1.5
        estilo.paragraph_format.space_after = Pt(6)
    # Los identificadores de numeración del Word original no coinciden con los de
    # python-docx. Crear listas propias evita heredar romanos o reinicios ajenos.
    numeracion = doc.part.numbering_part.element
    for nombre, formato, marca, sangria in (
        ("List Bullet", "bullet", "•", 360),
        ("List Bullet 2", "bullet", "–", 720),
        ("List Number", "decimal", "%1.", 360),
    ):
        aid = max([int(e.get(qn("w:abstractNumId"))) for e in numeracion
                   if e.tag == qn("w:abstractNum")] + [-1]) + 1
        abstracta = OxmlElement("w:abstractNum")
        abstracta.set(qn("w:abstractNumId"), str(aid))
        _sub(abstracta, "w:multiLevelType", val="singleLevel")
        nivel = _sub(abstracta, "w:lvl", ilvl="0")
        _sub(nivel, "w:start", val="1")
        _sub(nivel, "w:numFmt", val=formato)
        _sub(nivel, "w:lvlText", val=marca)
        _sub(nivel, "w:lvlJc", val="left")
        _sub(_sub(nivel, "w:pPr"), "w:ind", left=str(sangria), hanging="240")
        _sub(_sub(nivel, "w:rPr"), "w:rFonts", ascii="Calibri", hAnsi="Calibri")
        numeracion.insert(0, abstracta)
        numero = numeracion.add_num(aid)
        props = doc.styles[nombre].element.get_or_add_pPr().get_or_add_numPr()
        props.get_or_add_ilvl().val = 0
        props.get_or_add_numId().val = numero.numId
    for nivel, tamano in ((1, 14), (2, 12), (3, 11)):
        estilo = doc.styles["Heading %d" % nivel]
        estilo.font.name = "Calibri"
        estilo.font.size = Pt(tamano)
        estilo.font.bold = True
        estilo.font.italic = False
        estilo.font.color.rgb = RGBColor(0, 0, 0)
        estilo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        estilo.paragraph_format.line_spacing = 1.5
        estilo.paragraph_format.space_before = Pt(12)
        estilo.paragraph_format.space_after = Pt(6)
        estilo.paragraph_format.keep_with_next = True
        estilo.paragraph_format.left_indent = Pt(0)
        _sub(estilo.element.get_or_add_pPr(), "w:outlineLvl", val=str(nivel - 1))

    rotulo = doc.styles.add_style("Rótulo del informe", WD_STYLE_TYPE.PARAGRAPH)
    rotulo.base_style = normal
    rotulo.font.size = Pt(10)
    rotulo.font.bold = True
    rotulo.font.color.rgb = RGBColor.from_string("666666")
    rotulo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rotulo.paragraph_format.space_before = Pt(6)
    rotulo.paragraph_format.space_after = Pt(12)
    rotulo.paragraph_format.keep_together = True
    for nombre in ("Rótulo de tabla", "Rótulo de figura"):
        doc.styles.add_style(nombre, WD_STYLE_TYPE.PARAGRAPH).base_style = rotulo
    indice = doc.styles.add_style("Índice del informe", WD_STYLE_TYPE.PARAGRAPH)
    indice.base_style = normal
    indice.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    indice.paragraph_format.line_spacing = 1.0
    indice.paragraph_format.space_after = Pt(6)


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
        run.font.name = "Calibri"
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

    usa_plantilla = os.path.exists(PLANTILLA)
    doc = Document(PLANTILLA) if usa_plantilla else Document()
    doc.core_properties.title = "TerraSense — Ingeniería conceptual, básica y de detalle"
    doc.core_properties.author = "Álvaro Nicolás Villena Torrejón; Alan Paul Escobar Rojas"
    doc.core_properties.comments = ""
    doc.core_properties.created = doc.core_properties.modified = datetime.now(timezone.utc)
    seccion = doc.sections[0]
    if not usa_plantilla:
        seccion.orientation = WD_ORIENT.PORTRAIT
        seccion.page_width, seccion.page_height = Cm(21.59), Cm(27.94)
        seccion.left_margin = seccion.right_margin = Cm(1.5)
        seccion.top_margin = Cm(3.0)
        seccion.bottom_margin = Cm(2.0)
        seccion.header_distance = seccion.footer_distance = Cm(0.7)
    tipografia(doc)
    if not usa_plantilla:
        marco_institucional(doc)

    ex = Exportador(doc)
    faltan_figuras = []
    citas = set()
    i = 0
    if usa_plantilla:
        # La portada original ya está en el documento y no se reconstruye desde texto.
        i = next(n for n, linea in enumerate(lineas) if linea.strip() == "### Índice general")
    portada = True
    en_bibliografia = False

    while i < len(lineas):
        linea = lineas[i].rstrip()

        if not linea.strip() or RUIDO.match(linea):
            i += 1
            continue

        # ------------------------------------------------ encabezados
        if linea.startswith("## "):
            titulo = linea[3:].strip()
            en_bibliografia = "Referencias Bibliográficas" in titulo
            doc.add_paragraph(style="Cuerpo del informe").add_run().add_break(WD_BREAK.PAGE)
            doc.add_heading(titulo, level=1)
            i += 1
            continue

        if linea.startswith("#### "):
            doc.add_heading(linea[5:].strip(), level=3)
            i += 1
            continue

        if linea.startswith("### "):
            titulo = linea[4:].strip()
            if portada and titulo == "Índice general":
                portada = False
                doc.add_paragraph(style="Cuerpo del informe").add_run().add_break(WD_BREAK.PAGE)
                encabezado_indice = doc.add_heading(titulo, level=1)
                ex.marcar(encabezado_indice, "indice_general")
                entradas = [(l.lstrip("# "), 1 if l.startswith("## ") else 2)
                            for l in lineas[i + 1:]
                            if (l.startswith("## ") or l.startswith("### "))
                            and "Índice de " not in l]
                ex.indice_de_word(entradas=entradas)
                # El índice del Markdown se omite: lo genera Word con sus números de página.
                i += 1
                while i < len(lineas) and not lineas[i].startswith("#"):
                    i += 1
                continue
            if portada:
                p = doc.add_paragraph(style="Cuerpo del informe")
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(titulo)
                r.bold = True
                r.font.size = Pt(26 if titulo == "TERRASENSE" else 14)
                i += 1
                continue
            if titulo in ("Índice de figuras", "Índice de tablas"):
                doc.add_paragraph(style="Cuerpo del informe").add_run().add_break(WD_BREAK.PAGE)
                doc.add_heading(titulo, level=1)
                entradas = []
                i += 1
                while i < len(lineas) and not lineas[i].startswith("#"):
                    if lineas[i].startswith("- "):
                        entradas.append((lineas[i][2:], 1))
                    i += 1
                estilo = "Rótulo de figura" if titulo.endswith("figuras") else "Rótulo de tabla"
                ex.indice_de_word(' TOC \\t "%s,1" \\h \\z ' % estilo, entradas)
                continue
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
            estilo = "Rótulo de tabla" if linea.startswith("**Tabla") else "Rótulo de figura"
            p = doc.add_paragraph(style=estilo)
            ex.texto(p, linea.strip(), tam=10)
            i += 1
            continue

        # ------------------------------------------------ tabla
        if linea.startswith("|"):
            bloque = []
            while i < len(lineas) and lineas[i].startswith("|"):
                bloque.append(lineas[i])
                i += 1
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
                p = doc.add_paragraph(style="Cuerpo del informe")
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
        p = doc.add_paragraph(style="Cuerpo del informe")
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if portada else WD_ALIGN_PARAGRAPH.JUSTIFY
        ex.texto(p, linea.strip())
        i += 1

    # Word pregunta por los campos al abrir, de modo que el índice llegue con sus páginas.
    _sub(doc.settings.element, "w:updateFields", val="true")
    doc.save(DESTINO)
    return citas, faltan_figuras


PAGINAR_WORD = r'''
param([string]$Origen, [string]$Pdf)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.Options.PrintBackgrounds = $true
$doc = $null
try {
    $doc = $word.Documents.Open($Origen, $false, $false, $false)
    $ancho = $doc.PageSetup.PageWidth - $doc.PageSetup.LeftMargin - $doc.PageSetup.RightMargin
    $rotulo = '^(Figura|Tabla) \d+\.\d+ \u201C'
    foreach ($vuelta in 1..2) {
        foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
        $doc.Fields.Update() | Out-Null
        $doc.Repaginate()
        # Los rótulos van centrados en el cuerpo; las entradas de los índices de
        # figuras y de tablas repiten el mismo texto sin centrar.
        $paginas = @{}
        $entradas = New-Object System.Collections.ArrayList
        foreach ($p in $doc.Paragraphs) {
            $texto = $p.Range.Text.Trim()
            if ($texto -match $rotulo) {
                $clave = ($texto -split "`t")[0].Trim()
                if ($p.Alignment -eq 1) { $paginas[$clave] = $p.Range.Information(3) }
                else { [void]$entradas.Add(@($p, $clave)) }
            }
        }
        foreach ($e in $entradas) {
            $p = $e[0]; $clave = $e[1]
            if (-not $paginas.ContainsKey($clave)) { continue }
            $p.Range.ListFormat.RemoveNumbers()
            $p.LeftIndent = 0
            $p.FirstLineIndent = 0
            $p.Alignment = 0
            $p.TabStops.ClearAll()
            [void]$p.TabStops.Add($ancho, 2, 1)
            $r = $p.Range
            [void]$r.MoveEnd(1, -1)
            $r.Text = $clave + "`t" + $paginas[$clave]
        }
    }
    $doc.Save()
    if ($Pdf) { $doc.ExportAsFixedFormat($Pdf, 17) }
    "  Índices y números de página actualizados con Microsoft Word: " + $doc.ComputeStatistics(2) + " páginas."
} finally {
    if ($doc -ne $null) { $doc.Close($false) }
    $word.Quit()
}
'''


def paginar_word(ruta, pdf_revision=None):
    """Actualiza el índice general y pagina los de figuras y tablas con Microsoft Word."""
    from uuid import uuid4
    # Un archivo temporal en el proyecto evita las ACL especiales de mkdtemp en Windows.
    guion = Path(RAIZ) / (".paginar-" + uuid4().hex + ".ps1")
    try:
        # PowerShell 5.1 lee como ANSI un guion sin BOM y estropearía las comillas de los rótulos.
        guion.write_text(PAGINAR_WORD, encoding="utf-8-sig")
        resultado = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(guion),
             "-Origen", str(Path(ruta).resolve()), "-Pdf", str(Path(pdf_revision).resolve()) if pdf_revision else ""],
            capture_output=True, timeout=900)
        salida = resultado.stdout.decode("utf-8", "replace") + resultado.stderr.decode("utf-8", "replace")
        if resultado.returncode != 0:
            raise RuntimeError("Microsoft Word no pudo paginar el informe: " + salida.strip()[-400:])
        print(salida.strip(), flush=True)
    finally:
        guion.unlink(missing_ok=True)


def paginar(ruta, pdf_revision=None):
    """Actualiza campos en una instancia oculta y aislada, sin tocar documentos abiertos."""
    office = shutil.which("soffice")
    if not office:
        candidato = Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "LibreOffice/program/soffice.exe"
        if candidato.exists():
            office = str(candidato)
    if not office and os.name == "nt":
        return paginar_word(ruta, pdf_revision)
    if not office:
        raise RuntimeError("No se encontró LibreOffice para paginar el informe")
    python_uno = Path(office).with_name("python.exe") if os.name == "nt" else Path(sys.executable)
    if not python_uno.exists():
        raise RuntimeError("No se encontró el intérprete Python con UNO de LibreOffice")
    # El Python de LibreOffice incluye UNO, pero no necesariamente python-docx.
    codigo = r'''
import os, sys, time, uuid, tempfile, subprocess, shutil
from pathlib import Path
import uno

def prop(nombre, valor):
    p = uno.createUnoStruct("com.sun.star.beans.PropertyValue")
    p.Name, p.Value = nombre, valor
    return p


def ancho_del_texto(documento):
    """Ancho util de la caja de texto, para alinear el numero de pagina a la derecha."""
    familias = documento.StyleFamilies.getByName("PageStyles")
    for nombre in familias.getElementNames():
        estilo = familias.getByName(nombre)
        if estilo.isInUse():
            return estilo.Width - estilo.LeftMargin - estilo.RightMargin
    return 17000


def es_centrado(par):
    ajuste = getattr(par.ParaAdjust, "value", par.ParaAdjust)
    return ajuste in ("CENTER", 3)


def numerar_listas(documento):
    """Escribe el numero de pagina en los indices de figuras y de tablas.

    Writer sabe paginar el campo TOC del indice general, pero los indices de
    figuras y de tablas son listas de parrafos y no un campo, de modo que nadie
    les pone la pagina. Aqui se hace lo mismo que el guion de Word: el rotulo
    del cuerpo va centrado y la entrada del indice repite su texto sin centrar,
    asi que el centrado da la pagina y la entrada la recibe, con un tabulador
    derecho y relleno de puntos.
    """
    import re
    rotulo = re.compile("^(Figura|Tabla) \\d+\\.\\d+ \\u201c")
    vista = documento.getCurrentController().getViewCursor()
    paginas, entradas = {}, []
    enumeracion = documento.Text.createEnumeration()
    while enumeracion.hasMoreElements():
        par = enumeracion.nextElement()
        if not par.supportsService("com.sun.star.text.Paragraph"):
            continue
        texto = par.getString().strip()
        if not rotulo.match(texto):
            continue
        clave = texto.split("\t")[0].strip()
        if es_centrado(par):
            vista.gotoRange(par.getStart(), False)
            paginas[clave] = vista.getPage()
        else:
            entradas.append((par, clave))
    tope = uno.createUnoStruct("com.sun.star.style.TabStop")
    tope.Position = ancho_del_texto(documento)
    tope.Alignment = uno.Enum("com.sun.star.style.TabAlign", "RIGHT")
    tope.FillChar = "."
    izquierda = uno.Enum("com.sun.star.style.ParagraphAdjust", "LEFT")
    cambios = 0
    for par, clave in entradas:
        if clave not in paginas:
            continue
        destino = clave + "\t" + str(paginas[clave])
        if par.getString() == destino:
            continue
        par.setString(destino)
        par.ParaTabStops = (tope,)
        par.ParaAdjust = izquierda
        par.ParaFirstLineIndent = 0
        par.ParaLeftMargin = 0
        cambios += 1
    return cambios, len(entradas), len(paginas)

office, origen, pdf = sys.argv[1:]
origen = Path(origen).resolve()
with tempfile.TemporaryDirectory(prefix="terrasense-word-") as trabajo:
    carpeta = Path(trabajo)
    canal = "terrasense_" + uuid.uuid4().hex
    conexion = "pipe,name=" + canal + ";urp;StarOffice.ComponentContext"
    proceso = subprocess.Popen([
        office, "-env:UserInstallation=" + (carpeta / "perfil").as_uri(),
        "--headless", "--nologo", "--nodefault", "--norestore", "--nofirststartwizard",
        "--accept=" + conexion,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
       creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    documento = escritorio = None
    try:
        local = uno.getComponentContext()
        resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
        limite = time.monotonic() + 45
        while True:
            try:
                contexto = resolver.resolve("uno:" + conexion)
                break
            except Exception:
                if proceso.poll() is not None or time.monotonic() >= limite:
                    raise RuntimeError("LibreOffice no inició la conexión de paginación")
                time.sleep(0.25)
        escritorio = contexto.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", contexto)
        documento = escritorio.loadComponentFromURL(origen.as_uri(), "_blank", 0, (
            prop("Hidden", True), prop("UpdateDocMode", 0),
            prop("MacroExecutionMode", uno.getConstantByName("com.sun.star.document.MacroExecMode.NEVER_EXECUTE")),
        ))
        if documento is None:
            raise RuntimeError("LibreOffice no pudo abrir el informe")
        indices = documento.getDocumentIndexes()
        if indices.getCount() == 0:
            # Writer puede omitir un campo TOC que todavía no tiene resultados.
            ancla = documento.getBookmarks().getByName("indice_general").getAnchor()
            cursor = documento.Text.createTextCursorByRange(ancla.End)
            cursor.gotoNextParagraph(False)
            indice = documento.createInstance("com.sun.star.text.ContentIndex")
            indice.CreateFromOutline = True
            indice.Level = 2
            indice.Title = ""
            documento.Text.insertTextContent(cursor, indice, False)
            indices = documento.getDocumentIndexes()
        for vuelta in range(3):
            documento.getTextFields().refresh()
            for i in range(indices.getCount()):
                indices.getByIndex(i).update()
        # Numerar las listas mueve texto y puede correr las paginas, asi que se
        # repite hasta que una vuelta no cambie nada.
        for vuelta in range(4):
            cambios, entradas, rotulos = numerar_listas(documento)
            documento.getTextFields().refresh()
            for i in range(indices.getCount()):
                indices.getByIndex(i).update()
            if not cambios:
                break
        print("  Indices de figuras y tablas: %d entradas numeradas sobre %d rotulos, %d vueltas."
              % (entradas, rotulos, vuelta + 1), flush=True)
        destino = carpeta / "informe.docx"
        documento.storeAsURL(destino.as_uri(), (prop("FilterName", "Office Open XML Text"), prop("Overwrite", True)))
        if pdf:
            documento.storeToURL(Path(pdf).resolve().as_uri(), (prop("FilterName", "writer_pdf_Export"), prop("Overwrite", True)))
        documento.close(True)
        documento = None
        # Copiar sobre el archivo existente conserva los permisos de la carpeta del proyecto.
        shutil.copyfile(destino, origen)
        print("  Índice y números de página actualizados con LibreOffice.", flush=True)
    finally:
        if documento is not None:
            documento.close(True)
        if escritorio is not None:
            escritorio.terminate()
        try:
            proceso.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proceso.terminate()
            proceso.wait(timeout=10)
'''
    entorno = dict(os.environ, PYTHONIOENCODING="utf-8")
    sys.stdout.flush()
    subprocess.run([str(python_uno), "-u", "-c", codigo, office, str(ruta), pdf_revision or ""],
                   check=True, timeout=240, env=entorno)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--desde-markdown", action="store_true",
                        help="Reconstruye el Word desde Markdown y sustituye las correcciones manuales")
    parser.add_argument("--paginar", action="store_true", help="Actualiza el índice y las páginas con LibreOffice instalado")
    parser.add_argument("--pdf-revision", help="Ruta opcional de una copia PDF para revisar la paginación")
    args = parser.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    if os.path.exists(DESTINO) and not args.desde_markdown:
        if args.paginar:
            try:
                paginar(DESTINO, args.pdf_revision)
            except (RuntimeError, subprocess.SubprocessError, OSError) as e:
                print("No se pudo paginar el Word vigente: %s" % e)
                return 1
        else:
            print("Word vigente conservado con sus correcciones manuales. "
                  "Use --paginar para actualizar campos o --desde-markdown para reconstruirlo.")
        return 0
    citas, faltan = convertir()
    with open(ORIGEN, encoding="utf-8") as f:
        texto = f.read()
    referidas = {int(n) for grupo in re.findall(r"\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]", texto)
                 for n in re.findall(r"\d{1,3}", grupo)}
    huerfanas = sorted(referidas - citas)
    print("Informe exportado: %s" % os.path.basename(DESTINO))
    print("  %d entradas de bibliografía con marcador; %d números citados en el texto"
          % (len(citas), len(referidas)))
    if huerfanas:
        print("  citas sin entrada en la bibliografía: %s" % huerfanas)
    if faltan:
        print("  figuras que no se encontraron: %s" % sorted(set(faltan)))
    if not huerfanas and not faltan and args.paginar:
        # El .docx ya quedó escrito: si la paginación no se puede hacer, se dice por qué y se
        # devuelve error, para que nadie entregue el informe con el índice en blanco.
        try:
            paginar(DESTINO, args.pdf_revision)
        except (RuntimeError, subprocess.SubprocessError, OSError) as e:
            print("  no se pudo paginar: %s" % e)
            print("  el .docx quedó exportado sin números de página: actualiza el índice antes de entregarlo")
            return 1
    return 1 if huerfanas or faltan else 0


if __name__ == "__main__":
    raise SystemExit(main())
