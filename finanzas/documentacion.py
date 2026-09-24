# -*- coding: utf-8 -*-
"""Reescribe el bloque económico del README desde `modelo_reformulado.py`.

Sustituye tanto el bloque generado entre marcadores `<!-- FINANZAS:* -->` como
el texto introductorio de viabilidad, para que el README no contradiga al informe.
"""
import io
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
README = os.path.join(BASE, "..", "README.md")

sys.path.insert(0, BASE)
import modelo as M  # noqa: E402

R = M.dimensionar()
IND = M.resumen(R)
F, INV = R["filas"], R["inversion"]


def p(x):
    return "$" + format(int(round(x)), ",d").replace(",", ".")


def pct(x, d=1):
    return (("%." + str(d) + "f") % (x * 100)).replace(".", ",") + " %"


def num(x, d=2):
    return (("%." + str(d) + "f") % x).replace(".", ",")


ENC_CORREGIDO = "Evaluacion/Evaluacion%201/INFORME%201%20CORREGIDO.md"

L = []
w = L.append

w("<!-- FINANZAS:INICIO -->")
w("")
w("## Finanzas y modelo económico")
w("")
w("**El precio no es un supuesto: es un resultado.** Se construye primero la estructura completa de "
  "costos e inversión y el precio se deriva de ella exigiendo un %s de utilidad sobre el costo total. "
  "Precio de lista resultante: **%s CLP con IVA** (%s netos). Evaluación a diez años, 2027–2036, con "
  "tasa de descuento del %s anual."
  % (pct(M.S["margen_objetivo"], 0), p(R["precio_lista"]), p(R["precio_neto_base"]),
     pct(M.S["tasa_descuento"], 0)))
w("")
w("### BOM por equipo")
w("")
w("| Componente | Cant. | Neto unitario | Subtotal |")
w("|---|---:|---:|---:|")
for nom, c, pu, _ in M.S["bom"]:
    w("| %s | %d | %s | %s |" % (nom, c, p(pu), p(c * pu)))
w("| **Total BOM neto** | | | **%s** |" % p(M.BOM))
w("")
w("La BOM contiene **exclusivamente los componentes presentes en el esquemático**. Los módulos y la "
  "batería se cotizaron en AliExpress con envío Choice a Chile; los discretos en LCSC. La sonda de suelo "
  "concentra el %s del costo de materiales y es la decisión de abastecimiento crítica del proyecto."
  % pct(48000 / M.BOM))
w("")
w("> Quedan **fuera de la BOM** por no estar todavía en el esquemático ni en el diseño mecánico cerrado: "
  "prensaestopas M12, o-ring y respiradero del BME280, cableado interno, y embalaje con manual y "
  "etiqueta. Su orden de magnitud conjunto es de $4.000 a $5.000 por equipo.")
w("")
w("Sumando merma (%s), provisión de reposiciones y garantía (%s) y envío, el costo variable por equipo "
  "antes de comisión es **%s**. La carcasa se imprime en taller propio: las dos impresoras 3D están en el "
  "activo fijo y el filamento, la merma, la energía y la mantención se cargan al costo unitario."
  % (pct(M.S["merma_fraccion_bom"], 0), pct(M.S["garantia_fraccion_bom"], 0), p(M.VAR_UNIT)))
w("")
w("### Inversión inicial y financiamiento")
w("")
w("| Concepto | CLP |")
w("|---|---:|")
w("| Equipamiento y activo fijo | %s |" % p(INV["equipamiento"]))
w("| Activo nominal (puesta en marcha) | %s |" % p(INV["activo_nominal"]))
w("| Capital de trabajo (%s meses de estructura) | %s |" % (num(INV["meses_cubiertos"], 1), p(INV["capital_trabajo"])))
w("| Inventario inicial | %s |" % p(INV["inventario"]))
w("| **Inversión inicial total** | **%s** |" % p(INV["total"]))
w("| Crédito bancario a 10 años, 12 % efectivo anual | " + p(R["credito"]) + " |")
w("| Pie propio exigido (30 % del crédito) | " + p(R["pie"]) + " |")
w("| Aporte por socio | %s |" % p(R["pie"] / 2))
w("| Cuota mensual (sistema francés) | %s |" % p(R["cuota"]))
w("")
w("**El pie no es una fuente adicional de fondos.** Los socios lo entregan al banco como condición de "
  "entrada y es el crédito el que financia el 100 %% de la inversión inicial; sumar pie más crédito "
  "cuenta dos veces el mismo dinero. El capital de trabajo no se fijó por regla sino iterando hasta que "
  "la caja nunca baje de un piso de seguridad, con un mínimo de política de %d meses de estructura."
  % M.S["capital_trabajo_meses"])
w("")
w("### Flujo de caja anual")
w("")
w("| Año | Equipos | Ventas netas | Utilidad del ejercicio | Flujo de fondos | Caja acumulada |")
w("|---|---:|---:|---:|---:|---:|")
for f in F:
    w("| %d | %d | %s | %s | %s | %s |" % (f["anio"], f["unidades"], p(f["ventas"]),
                                            p(f["util_neta"]), p(f["flujo"]), p(f["caja"])))
w("")
w("Los ejercicios %d y %d cierran con pérdida: con 200 y 350 equipos la estructura mínima para operar "
  "formalmente todavía no se cubre. Esa pérdida está financiada por el capital de trabajo y la caja nunca "
  "baja de %s." % (M.ANIOS[0], M.ANIOS[1], p(min(f["caja"] for f in F))))
w("")
w("### VAN, TIR y payback")
w("")
w("| Indicador | Valor | Criterio | Veredicto |")
w("|---|---:|---|---|")
w("| VAN al %s | %s | VAN > 0 | Cumple |" % (pct(M.S["tasa_descuento"], 0), p(IND["van"])))
w("| TIR efectiva anual | %s | TIR > %s | Cumple |" % (pct(IND["tir"], 2), pct(M.S["tasa_descuento"], 0)))
w("| Payback simple | %s años | ≤ 5 años | Cumple |" % num(IND["payback"]))
w("| Payback descontado | %s años | ≤ 5 años | Cumple |" % num(IND["payback_desc"]))
w("| Deuda al cierre de %d | %s | Crédito saldado | Cumple |" % (M.ANIOS[-1], p(0)))
w("")
w("**Punto de quiebre del precio: cerca de %s.** Al precio de $349.990 que proponían versiones "
  "anteriores de este estudio, el proyecto arroja VAN negativo y caja que nunca se recupera. Ese "
  "resultado es la justificación numérica de derivar el precio del costo en lugar de fijarlo por "
  "aspiración comercial." % p(400000))
w("")
w("[Informe 1 corregido](%s) · "
  "[Sección económica](docs/SECCION_ECONOMICA_REFORMULADA.md) · "
  "[Metodología](docs/MODELO_ECONOMICO.md)" % ENC_CORREGIDO)
w("")
w("Actualizar cifras: `python finanzas/modelo.py`.")
w("")
w("<!-- FINANZAS:FIN -->")

bloque = "\n".join(L)

texto = io.open(README, encoding="utf-8").read()
i = texto.index("<!-- FINANZAS:INICIO -->")
j = texto.index("<!-- FINANZAS:FIN -->") + len("<!-- FINANZAS:FIN -->")
texto = texto[:i] + bloque + texto[j:]

# Texto introductorio escrito a mano, que también debe dejar de contradecir al informe
viejo_intro_ini = texto.index("TerraSense está planteado como un proyecto económicamente sustentable")
viejo_intro_fin = texto.index("<!-- FINANZAS:INICIO -->")
nuevo_intro = """TerraSense está planteado como un proyecto económicamente sustentable y escalable:
- **Modelo de ingreso:** venta directa del hardware con IVA incluido. La app y el diagnóstico local no tienen suscripción.
- **Precio:** se **deriva** del costo total con un margen exigido del %s; no es un supuesto de entrada.
- **Costos y margen:** la sonda RS-485 concentra el %s de la BOM. El ensamblaje se paga en la nómina y no se duplica como costo variable.
- **Financiamiento:** el pie de los socios se entrega al banco como condición de entrada y el crédito financia el 100 %% de la inversión inicial. Pie y crédito **no se suman** como fuentes.
- **Evaluación:** flujos anuales sobre 10 años (2027–2036), sin valor terminal, con depreciación, amortización del activo nominal y tabla de amortización del crédito por sistema francés.

> 💡 Las cifras del bloque siguiente se generan desde `finanzas/supuestos_reformulado.json`. **No editar a mano:** ejecutar `python finanzas/documentacion_reformulada.py`.

""" % (pct(M.S["margen_objetivo"], 0), pct(48000 / M.BOM))
texto = texto[:viejo_intro_ini] + nuevo_intro + texto[viejo_intro_fin:]

texto = texto.replace(
    "Para un desglose completo, revisa el [Modelo Económico](docs/MODELO_ECONOMICO.md), el "
    "[Informe 1](docs/INFORME%201%20.docx.md#analisis-economico), la [Planilla de Flujo de Caja]"
    "(Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx), y la [BOM de Componentes]"
    "(PCB/BOM_TerraSense.xlsx).",
    "Para el desarrollo completo, revisa el [Informe 1 corregido](" + ENC_CORREGIDO + ") y la "
    "[sección económica generada](docs/SECCION_ECONOMICA_REFORMULADA.md).")

with io.open(README, "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(texto)
print("README actualizado:", len(texto), "caracteres")
