"""Renumera los rótulos de tablas y figuras del informe 2 y rehace sus índices.

El informe numera tablas y figuras con un contador decimal corrido (1.0, 1.1,
… 11.5) que debe cumplir tres condiciones a la vez: los rótulos van en orden
consecutivo, el índice los repite exactamente y ninguna referencia del texto
apunta a un número que no existe. Mantener eso a mano con más de cien rótulos
es lo que produce números repetidos e índices truncados, así que al insertar,
mover o quitar una tabla se corre este guion: reasigna los números por orden de
aparición, reescribe las referencias del texto con el número nuevo y regenera
los dos índices.

    python finanzas/renumerar_informe_e2.py            # reescribe el informe
    python finanzas/renumerar_informe_e2.py --revisar  # sólo informa, no escribe
"""

import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INFORME = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2", "INFORME 2.md")

TIPOS = ("Tabla", "Figura")
ROTULO = re.compile(r"^\*\*(Tabla|Figura) (\d+)\.(\d) “(.+)”\*\*\s*$")
ENTRADA = re.compile(r"^- (Tabla|Figura) (\d+)\.(\d) “(.+)”\s*$")
# Los rótulos van precedidos de «**», así que `(?<!\*)` los excluye y no hace falta mirar la comilla
# siguiente: eso dejaría fuera las referencias del texto que citan el título, como «Tabla 5.9 “…”».
REFERENCIA = re.compile(r"(?<!\*)\b(Tabla|Figura) (\d+)\.(\d)\b(\s+“(?:.+?)”)?")
# Las referencias en plural enumeran o encadenan números («Tablas 8.7 a 8.9», «Figuras 2.0 y 2.1»):
# se captura el encabezado y toda la lista que le sigue, y después se traduce número por número.
PLURAL = re.compile(r"(?<!\*)\b(Tablas|Figuras)((?:\s+\d+\.\d(?:\s*(?:,|a|y)(?=\s+\d+\.\d))?)+)")
NUMERO = re.compile(r"\b(\d+)\.(\d)\b")
TITULO_INDICE = re.compile(r"^#+ Índice de (tablas|figuras)\s*$")


def _clave(mayor, menor):
    return int(mayor) * 10 + int(menor)


def _texto(clave):
    return "%d.%d" % (clave // 10, clave % 10)


def rotulos(lineas):
    """Devuelve {tipo: [(nº de línea, clave antigua, título)]} en orden de aparición."""
    hallados = {t: [] for t in TIPOS}
    for i, linea in enumerate(lineas):
        m = ROTULO.match(linea.strip())
        if m:
            hallados[m.group(1)].append((i, _clave(m.group(2), m.group(3)), m.group(4)))
    return hallados


def mapa(hallados, avisos):
    """Construye {tipo: {clave antigua: clave nueva}} y avisa de números repetidos."""
    equivalencias = {}
    for tipo, lista in hallados.items():
        vistos = {}
        equivalencias[tipo] = {}
        for orden, (_, antigua, titulo) in enumerate(lista):
            if antigua in vistos:
                avisos.append(
                    "%s %s está usada por «%s» y por «%s»: las referencias a ese "
                    "número son ambiguas y hay que desambiguarlas a mano"
                    % (tipo, _texto(antigua), vistos[antigua], titulo)
                )
            vistos[antigua] = titulo
            equivalencias[tipo][antigua] = 10 + orden
    return equivalencias


def indice_general(lineas):
    """Rehace el «Índice general» a partir de los encabezados de capítulo y de sección del cuerpo."""
    try:
        inicio = next(i for i, l in enumerate(lineas) if l.strip() == "### Índice general")
    except StopIteration:
        return lineas
    cuerpo = next((i for i, l in enumerate(lineas) if re.match(r"^## ", l)), None)
    if cuerpo is None:
        return lineas
    entradas = []
    for linea in lineas[cuerpo:]:
        if re.match(r"^## ", linea):
            entradas.append("- " + linea[3:].strip())
        elif re.match(r"^### ", linea):
            entradas.append("  - " + linea[4:].strip())
    fin = next(i for i, l in enumerate(lineas) if i > inicio and l.startswith("#"))
    return lineas[:inicio + 1] + [""] + entradas + [""] + lineas[fin:]


def indices(lineas, hallados):
    """Reemplaza el contenido de «Índice de tablas» y «Índice de figuras»."""
    salida = []
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        m = TITULO_INDICE.match(linea)
        if not m:
            salida.append(linea)
            i += 1
            continue
        tipo = "Tabla" if m.group(1) == "tablas" else "Figura"
        salida.append(linea)
        i += 1
        # El índice llega hasta el siguiente encabezado; se conserva lo que no sea una entrada.
        cola = []
        while i < len(lineas) and not lineas[i].startswith("#"):
            if not ENTRADA.match(lineas[i]):
                cola.append(lineas[i])
            i += 1
        while cola and not cola[-1].strip():
            cola.pop()
        if cola and cola[0].strip():
            cola.insert(0, "")
        salida.extend(cola or [""])
        for orden, (_, _, titulo) in enumerate(hallados[tipo]):
            salida.append("- %s %s “%s”" % (tipo, _texto(10 + orden), titulo))
        salida.append("")
    return salida


def renumerar(texto, avisos):
    lineas = texto.split("\n")
    hallados = rotulos(lineas)
    equivalencias = mapa(hallados, avisos)

    # Los rótulos se reescriben por número de línea, que es su orden definitivo.
    for tipo, lista in hallados.items():
        for orden, (n, antigua, titulo) in enumerate(lista):
            nueva = 10 + orden
            if antigua != nueva:
                avisos.append(
                    "%s %s → %s («%s»)" % (tipo, _texto(antigua), _texto(nueva), titulo)
                )
            lineas[n] = '**%s %s “%s”**' % (tipo, _texto(nueva), titulo)

    # Las referencias se traducen en una sola pasada para que no choquen entre sí.
    protegidas = {n for lista in hallados.values() for n, _, _ in lista}
    huerfanas = []

    # Cuando la referencia cita el título, éste manda sobre el número: así se corrige una referencia
    # que quedó apuntando a un número que hoy pertenece a otra tabla.
    por_titulo = {}
    for tipo, lista in hallados.items():
        for orden, (_, _, titulo) in enumerate(lista):
            por_titulo.setdefault((tipo, titulo), 10 + orden)

    def traducir(m):
        tipo, antigua, cola = m.group(1), _clave(m.group(2), m.group(3)), m.group(4) or ""
        nueva = None
        if cola:
            nueva = por_titulo.get((tipo, cola.strip().strip("“”")))
        if nueva is None:
            nueva = equivalencias[tipo].get(antigua)
        if nueva is None:
            huerfanas.append("%s %s" % (tipo, _texto(antigua)))
            return m.group(0)
        return "%s %s%s" % (tipo, _texto(nueva), cola)

    def traducir_plural(m):
        tipo = m.group(1)[:-1]  # «Tablas» → «Tabla»

        def uno(n):
            antigua = _clave(n.group(1), n.group(2))
            nueva = equivalencias[tipo].get(antigua)
            if nueva is None:
                huerfanas.append("%s %s" % (tipo, _texto(antigua)))
                return n.group(0)
            return _texto(nueva)

        return m.group(1) + NUMERO.sub(uno, m.group(2))

    for i, linea in enumerate(lineas):
        if i in protegidas or ENTRADA.match(linea):
            continue
        linea = PLURAL.sub(traducir_plural, linea)
        lineas[i] = REFERENCIA.sub(traducir, linea)

    for referencia in sorted(set(huerfanas)):
        avisos.append("la referencia «%s» no corresponde a ningún rótulo" % referencia)

    lineas = indices(lineas, rotulos(lineas))
    lineas = indice_general(lineas)
    return "\n".join(lineas)


def main():
    # La consola de Windows usa cp1252 y los avisos llevan flechas y comillas tipográficas.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    revisar = "--revisar" in sys.argv
    with open(INFORME, encoding="utf-8", newline="") as f:
        original = f.read()

    # Se trabaja con saltos de línea sueltos y se devuelve el CRLF del archivo.
    plano = original.replace("\r\n", "\n")
    avisos = []
    resultado = renumerar(plano, avisos)

    for aviso in avisos:
        print("  %s" % aviso)

    if resultado == plano:
        print("Numeración ya consecutiva: no hay nada que reescribir.")
        return 0
    if revisar:
        print("Hay cambios pendientes: ejecutar sin --revisar para aplicarlos.")
        return 1

    with open(INFORME, "w", encoding="utf-8", newline="") as f:
        f.write(resultado.replace("\n", "\r\n"))
    print("Informe renumerado e índices regenerados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
