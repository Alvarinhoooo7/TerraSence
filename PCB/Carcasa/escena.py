"""Arma `salida/escena.glb`: placa + carcasa en un solo archivo liviano para el visor web.

- La placa (`placa.glb`, exportada por kicad-cli) se lleva a milímetros y al sistema de la
  carcasa, y sus ~28 000 nodos se funden en una malla por material.
- Cada pieza de `carcasa.glb` queda como un nodo con su nombre (base, tapa, boton, ...),
  con sus mallas agrupadas por color.

Uso:  python escena.py      (después de exportar la placa y de correr carcasa.py)
"""
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
import trimesh

SALIDA = Path(__file__).resolve().parent / "salida"


def clave_material(m):
    bc = getattr(m, "baseColorFactor", None)
    bc = tuple(int(x) for x in bc) if bc is not None else (200, 200, 200, 255)
    met = float(getattr(m, "metallicFactor", 0) or 0)
    rough = float(getattr(m, "roughnessFactor", 0.5) if getattr(m, "roughnessFactor", None) is not None else 0.5)
    return bc, round(met, 2), round(rough, 2)


def material(clave):
    bc, met, rough = clave
    return trimesh.visual.material.PBRMaterial(
        baseColorFactor=list(bc), metallicFactor=met, roughnessFactor=rough,
        alphaMode="BLEND" if bc[3] < 250 else "OPAQUE", doubleSided=True,
    )


def simplificar(m: trimesh.Trimesh, max_caras: int) -> trimesh.Trimesh:
    if len(m.faces) <= max_caras:
        return m
    import fast_simplification
    v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces, target_reduction=1 - max_caras / len(m.faces))
    return trimesh.Trimesh(v, f, process=False)


def mallas_por_material(escena: trimesh.Scene, filtro=lambda nodo: True, max_caras: int = 10**9):
    grupos = defaultdict(list)
    for nodo in escena.graph.nodes_geometry:
        if not filtro(nodo):
            continue
        tf, gname = escena.graph[nodo]
        g = escena.geometry[gname]
        if not isinstance(g, trimesh.Trimesh) or len(g.faces) == 0:
            continue
        m = g.copy()
        m.apply_transform(tf)
        grupos[clave_material(g.visual.material)].append(m)
    salida = []
    for clave, lista in grupos.items():
        unida = trimesh.util.concatenate([trimesh.Trimesh(m.vertices, m.faces, process=False) for m in lista])
        unida.merge_vertices(digits_vertex=4)
        unida = simplificar(unida, max_caras)
        unida.visual = trimesh.visual.TextureVisuals(material=material(clave))
        salida.append(unida)
    return salida


def raiz_de(escena: trimesh.Scene, nodo: str, raiz: str) -> str:
    padres = escena.graph.transforms.parents
    actual = nodo
    while actual in padres and padres[actual] != raiz:
        actual = padres[actual]
    return actual


def main():
    info = json.loads((SALIDA / "posiciones.json").read_text(encoding="utf-8"))
    cx, cy = info["placa"]["origen_kicad"]
    zp = info["placa"]["z_inferior"]

    final = trimesh.Scene()

    # --- placa -------------------------------------------------------------
    placa = trimesh.load(SALIDA / "placa.glb")
    tf = np.eye(4)
    tf[:3, :3] *= 1000.0                         # m -> mm
    tf[:3, 3] = [-cx, zp, -cy]
    final.graph.update(frame_from="world", frame_to="placa", matrix=np.eye(4))
    for i, m in enumerate(mallas_por_material(placa)):
        m.apply_transform(tf)
        final.add_geometry(m, geom_name=f"placa_{i}", node_name=f"placa_{i}", parent_node_name="placa")

    # --- carcasa -------------------------------------------------------------
    carc = trimesh.load(SALIDA / "carcasa.glb")
    raiz = "carcasa"
    piezas = sorted({raiz_de(carc, n, raiz) for n in carc.graph.nodes_geometry})
    for pieza in piezas:
        mallas = mallas_por_material(carc, lambda n, p=pieza: raiz_de(carc, n, raiz) == p)
        final.graph.update(frame_from="world", frame_to=pieza, matrix=np.eye(4))
        for i, m in enumerate(mallas):
            nombre = f"{pieza}__{i}"
            final.add_geometry(m, geom_name=nombre, node_name=nombre, parent_node_name=pieza)

    destino = SALIDA / "escena.glb"
    final.export(destino, include_normals=False)
    caras = sum(len(g.faces) for g in final.geometry.values())
    print(f"{destino.name}: {len(final.geometry)} mallas, {caras} caras, piezas: {', '.join(piezas)}")


if __name__ == "__main__":
    main()
