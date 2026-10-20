# -*- coding: utf-8 -*-
"""Genera una presentación breve del modelo económico en el README.

Las cifras y tablas viven en sus documentos específicos. Sólo se reemplaza el
bloque FINANZAS; el resto del README se mantiene fuera de la generación.
"""
from pathlib import Path

README = Path(__file__).resolve().parents[1] / "README.md"
INICIO = "<!-- FINANZAS:INICIO -->"
FIN = "<!-- FINANZAS:FIN -->"

bloque = """<!-- FINANZAS:INICIO -->

<a id="finanzas-y-modelo-económico"></a>

## Modelo económico

El proyecto contempla la venta del equipo, con la app y la evaluación local sin suscripción. El precio se deriva de la estructura completa de costos y de la utilidad exigida por el modelo.

Los supuestos, el financiamiento y los resultados de viabilidad se consultan en el [modelo económico](docs/MODELO_ECONOMICO.md) y los [resultados financieros](docs/RESULTADOS_FINANCIEROS.md). Las cifras se regeneran con `python finanzas/modelo.py`.

<!-- FINANZAS:FIN -->"""

texto = README.read_text(encoding="utf-8")
i = texto.index(INICIO)
j = texto.index(FIN, i) + len(FIN)
texto = texto[:i] + bloque + texto[j:]
README.write_text(texto, encoding="utf-8", newline="\r\n")
print("README actualizado:", len(texto), "caracteres")
