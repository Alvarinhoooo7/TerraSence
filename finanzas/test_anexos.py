# -*- coding: utf-8 -*-
"""Pruebas de los anexos A y B de la Evaluacion 2, de la BOM estructurada y de los modulos de ensamble y energia.

    python -m unittest discover -s finanzas -p "test_*.py"
"""
import os
import re
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import openpyxl  # noqa: E402

import anexos  # noqa: E402
import energia_v3 as EV  # noqa: E402
import ensamble as EN  # noqa: E402
import verificar_informe_e2 as VI  # noqa: E402
import modelo as M  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CARPETA = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2", "Anexos")
ANEXO_A = os.path.join(CARPETA, "Anexo A - Cotizaciones TerraSense.xlsx")
ANEXO_B = os.path.join(CARPETA, "Anexo B - Flujo de caja TerraSense.xlsx")

COLUMNAS = ["Equipo", "Modelo", "Cantidad", "Proveedor", "Valor unitario", "Valor total"]
HOJAS_B = ["1 Resumen", "2 Inversión", "3 Ventas", "4 Costos operacionales", "5 Gastos de administración",
           "6 Gastos de comercialización", "7 Financiamiento", "8 Costo financiero", "9 Depreciación",
           "10 Amortización", "11 Estado de resultados", "12 Flujo de caja"]
PROHIBIDO_EN_ANEXOS = re.compile(r"finanzas/|\.py\b|\.json\b|supuestos\.json|docs/|PCB/|Firmware/|[A-Z]:\\|`|python finanzas")


def texto_del_xlsx(ruta):
    """Todo el texto del libro: cadenas compartidas, hojas, formulas y propiedades."""
    out = []
    with zipfile.ZipFile(ruta) as z:
        for n in z.namelist():
            if n.endswith(".xml") or n.endswith(".rels"):
                out.append(z.read(n).decode("utf-8", "ignore"))
    return "\n".join(out)


class TestBomEstructurada(unittest.TestCase):
    def test_cada_fila_trae_sus_campos(self):
        campos = ("bloque", "equipo", "modelo", "codigo", "cantidad", "proveedor", "precio_clp", "moneda",
                  "precio_original", "tramo", "fecha", "enlace", "alternativa", "estado")
        for f in M.S["bom_filas"]:
            for c in campos:
                self.assertIn(c, f, f["equipo"])
                self.assertNotIn(f[c], (None, ""), "%s: %s vacío" % (f["equipo"], c))
            self.assertIn(f["estado"], ("consultado", "estimación"))
            if f["estado"] == "estimación":
                self.assertTrue(f["nota"], "toda estimación declara su razón")

    def test_lcsc_es_el_proveedor_principal_de_la_electronica(self):
        electronica = [f for f in M.S["bom_filas"] if f["codigo"].startswith("C")]
        self.assertGreater(len(electronica), 30)
        for f in electronica:
            self.assertEqual(f["proveedor"], "LCSC")
            self.assertEqual(f["moneda"], "USD")
            self.assertAlmostEqual(f["precio_clp"], round(f["precio_original"] * M.TC, 2), places=2)

    def test_la_v3_no_lleva_placas_de_desarrollo_ni_modulos(self):
        texto = " ".join(f["equipo"] + " " + f["modelo"] for f in M.S["bom_filas"]).lower()
        for prohibido in ("devkit", "lx-lcbst", "módulo bme280", "módulo transceptor", "módulo de carga"):
            self.assertNotIn(prohibido, texto)
        self.assertIn("esp32-wroom-32d", texto)

    def test_el_corte_de_la_sonda_conserva_el_par_de_mosfet(self):
        # el MT3608 no desconecta la carga con EN bajo: el AO3401A tras el elevador da el corte real
        corte = [f["modelo"] for f in M.S["bom_filas"] if f["bloque"] == "Elevador 5 V"]
        self.assertIn("AO3400A", corte)
        self.assertIn("AO3401A", corte)

    def test_la_bom_v2_se_conserva_como_antecedente(self):
        self.assertTrue(any("DevKitC" in n for n, *_ in M.S["bom_prototipo_v2"]))

    def test_las_4_tuplas_derivadas_cuadran_con_las_filas(self):
        self.assertEqual(len(M.S["bom"]), len(M.S["bom_filas"]))
        self.assertAlmostEqual(M.BOM, sum(f["cantidad"] * f["precio_clp"] for f in M.S["bom_filas"]), places=6)

    def test_el_total_por_bloque_cuadra_con_la_bom(self):
        self.assertAlmostEqual(sum(s for _, _, s in M.bom_por_bloque()), M.BOM, places=6)


class TestTaller(unittest.TestCase):
    def test_taller_trae_modelo_proveedor_y_precio(self):
        for f in M.S["taller_filas"]:
            for c in ("modelo", "proveedor", "precio_neto_clp", "uso", "estado"):
                self.assertTrue(f[c], "%s: %s" % (f["equipo"], c))
        self.assertIn("Creality K1C", [f["modelo"] for f in M.S["taller_filas"]])

    def test_activo_fijo_es_la_suma_de_las_filas_del_taller(self):
        self.assertEqual(M.EQUIP_TOTAL, sum(f["cantidad"] * f["precio_neto_clp"] for f in M.S["taller_filas"]))

    def test_el_taller_incluye_el_instrumental_pedido(self):
        nombres = " ".join(f["equipo"] for f in M.S["taller_filas"]).lower()
        for k in ("impresora 3d", "soldadura", "aire caliente", "calefactora", "esténcil", "microscopio", "osciloscopio",
                  "fuente", "multímetro", "analizador", "fixture", "notebook", "monitor", "muebles", "impresora de oficina"):
            self.assertIn(k, nombres)


class TestAnexoA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.ruta = os.path.join(cls.dir.name, "a.xlsx")
        cls.totales = anexos.anexo_a(cls.ruta)
        cls.wb = openpyxl.load_workbook(cls.ruta, data_only=True)

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def test_hojas_y_columnas_principales_exactas(self):
        self.assertEqual(self.wb.sheetnames, ["Producto (BOM por equipo)", "Taller (activo fijo)", "Servicios", "Resumen por proveedor"])
        for h in self.wb.sheetnames[:3]:
            enc = [c.value for c in self.wb[h][1]][:6]
            self.assertEqual(enc, COLUMNAS, h)
        enc = [c.value for c in self.wb["Producto (BOM por equipo)"][1]]
        self.assertEqual(enc[6:8], ["Fecha de consulta", "Enlace"])

    def test_total_del_producto_coincide_con_el_modelo(self):
        self.assertAlmostEqual(self.totales["producto"], M.BOM, places=6)
        ws = self.wb["Producto (BOM por equipo)"]
        fila_total = next(r for r in ws.iter_rows(values_only=True) if r[0] and str(r[0]).startswith("TOTAL POR EQUIPO"))
        self.assertAlmostEqual(fila_total[5], M.BOM, places=2)

    def test_total_del_taller_coincide_con_el_activo_fijo(self):
        self.assertEqual(self.totales["taller"], M.EQUIP_TOTAL)
        ws = self.wb["Taller (activo fijo)"]
        fila_total = next(r for r in ws.iter_rows(values_only=True) if r[0] and str(r[0]).startswith("TOTAL ACTIVO FIJO"))
        self.assertAlmostEqual(fila_total[5], M.EQUIP_TOTAL, places=2)

    def test_resumen_por_proveedor_cuadra_con_las_hojas(self):
        ws = self.wb["Resumen por proveedor"]
        total = next(r for r in ws.iter_rows(values_only=True) if r[0] == "TOTAL")
        self.assertAlmostEqual(total[1], M.BOM, places=2)
        self.assertAlmostEqual(total[2], M.EQUIP_TOTAL, places=2)
        self.assertAlmostEqual(total[3], anexos.total_servicios(), places=2)
        provs = [r[0] for r in ws.iter_rows(min_row=2, values_only=True) if r[0] and r[0] != "TOTAL"]
        self.assertEqual(provs[:3], ["LCSC", "DigiKey", "JLCPCB"])

    def test_cada_fila_tiene_fecha_y_enlace(self):
        for h in ("Producto (BOM por equipo)", "Taller (activo fijo)"):
            ws = self.wb[h]
            n = 0
            for r in ws.iter_rows(min_row=2, values_only=True):
                if r[0] and not str(r[0]).startswith(("TOTAL", "Subtotal", "Total", "Los ")) and r[2] is not None and r[3]:
                    n += 1
                    self.assertTrue(r[6], "sin fecha: %s" % r[0])
                    self.assertTrue(r[7], "sin enlace: %s" % r[0])
            self.assertGreater(n, 10)

    def test_los_totales_son_formulas_con_valor_en_cache(self):
        wf = openpyxl.load_workbook(self.ruta)
        ws = wf["Producto (BOM por equipo)"]
        formulas = [c.value for r in ws.iter_rows() for c in r if isinstance(c.value, str) and c.value.startswith("=SUM")]
        self.assertTrue(formulas)

    def test_sin_referencias_al_repositorio(self):
        self.assertIsNone(PROHIBIDO_EN_ANEXOS.search(texto_del_xlsx(self.ruta)))


class TestAnexoB(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = M.dimensionar()
        cls.dir = tempfile.TemporaryDirectory()
        cls.ruta = os.path.join(cls.dir.name, "b.xlsx")
        anexos.planilla_flujo(cls.r, cls.ruta)
        cls.wb = openpyxl.load_workbook(cls.ruta, data_only=True)

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def fila(self, hoja, etiqueta):
        for r in self.wb[hoja].iter_rows(values_only=True):
            if r[0] == etiqueta:
                return r
        self.fail("no hay %r en %s" % (etiqueta, hoja))

    def test_doce_hojas_en_orden_y_con_tildes(self):
        self.assertEqual(self.wb.sheetnames, HOJAS_B)
        self.assertEqual(self.wb.sheetnames[6:10], ["7 Financiamiento", "8 Costo financiero", "9 Depreciación", "10 Amortización"])

    def test_totales_coinciden_con_dimensionar(self):
        filas = self.r["filas"]
        n = len(filas)
        er = self.wb["11 Estado de resultados"]
        un = self.fila("11 Estado de resultados", "(=) UTILIDAD DEL EJERCICIO")[1:1 + n]
        for v, f in zip(un, filas):
            self.assertAlmostEqual(v, f["util_neta"], places=1)
        ventas = self.fila("3 Ventas", "Ventas netas")[1:1 + n]
        for v, f in zip(ventas, filas):
            self.assertAlmostEqual(v, f["ventas"], places=1)
        flujo = self.fila("12 Flujo de caja", "(=) FLUJO DE FONDOS DEL AÑO")[2:2 + n]
        for v, f in zip(flujo, filas):
            self.assertAlmostEqual(v, f["flujo"], places=1)
        caja = self.fila("12 Flujo de caja", "Caja acumulada (parte con el capital de trabajo)")[2:2 + n]
        for v, f in zip(caja, filas):
            self.assertAlmostEqual(v, f["caja"], places=1)
        self.assertIsNotNone(er)

    def test_indicadores_del_resumen_coinciden_con_el_modelo(self):
        ind = M.resumen(self.r)
        res = {r[0]: r[1] for r in self.wb["1 Resumen"].iter_rows(values_only=True) if r[0]}
        self.assertAlmostEqual(res["VAN a 10 años"], ind["van"], places=0)
        self.assertAlmostEqual(res["TIR a 10 años"], ind["tir"], places=6)
        self.assertAlmostEqual(res["Payback simple (años)"], ind["payback"], places=6)
        self.assertAlmostEqual(res["Payback descontado (años)"], ind["payback_desc"], places=6)
        self.assertAlmostEqual(res["Caja mínima del horizonte"], M.caja_minima(self.r), places=1)
        self.assertAlmostEqual(res["Inversión inicial total"], self.r["inversion"]["total"], places=1)
        self.assertAlmostEqual(res["Crédito bancario (100 % de la inversión)"], self.r["credito"], places=1)
        self.assertAlmostEqual(res["Pie propio exigido (condición de entrada)"], self.r["pie"], places=1)

    def test_pie_y_credito_no_se_suman_como_fuentes(self):
        res = {r[0]: r[1] for r in self.wb["1 Resumen"].iter_rows(values_only=True) if r[0]}
        self.assertAlmostEqual(res["Crédito bancario (100 % de la inversión)"], res["Inversión inicial total"], places=1)

    def test_la_reagrupacion_conserva_el_costo_total_de_cada_anio(self):
        """Separar administracion de comercializacion es solo reagrupar: hojas 4 + 5 + 6 = costo total del modelo."""
        for g in anexos.reagrupacion(self.r):
            self.assertAlmostEqual(g["total"], g["costo_total_modelo"], places=4, msg=str(g["anio"]))
        n = len(self.r["filas"])
        oper = self.fila("4 Costos operacionales", "TOTAL COSTOS OPERACIONALES")[1:1 + n]
        adm = self.fila("5 Gastos de administración", "TOTAL GASTOS DE ADMINISTRACIÓN")[1:1 + n]
        com = self.fila("6 Gastos de comercialización", "TOTAL GASTOS DE COMERCIALIZACIÓN")[1:1 + n]
        for i, f in enumerate(self.r["filas"]):
            self.assertAlmostEqual(oper[i] + adm[i] + com[i], f["costo_total"], places=1)

    def test_la_nomina_por_cargo_suma_la_nomina_del_modelo(self):
        for fila in self.r["filas"]:
            adm, com, pro = anexos._nomina_por_cargo(fila["anio"])
            self.assertAlmostEqual(adm[0] + com[0] + pro[0], fila["gastos"]["nomina"], places=4)
            self.assertAlmostEqual(adm[1] + com[1] + pro[1], fila["gastos"]["beneficios"], places=4)

    def test_publicidad_y_nomina_comercial_estan_en_comercializacion(self):
        com = self.wb["6 Gastos de comercialización"]
        etiquetas = [r[0] for r in com.iter_rows(values_only=True) if r[0]]
        self.assertTrue(any("Publicidad" in e for e in etiquetas))
        self.assertTrue(any("comerciales" in e for e in etiquetas))

    def test_hay_formulas_enlazadas_entre_hojas(self):
        wf = openpyxl.load_workbook(self.ruta)
        cruzadas = 0
        for ws in wf.worksheets:
            for fila in ws.iter_rows():
                for c in fila:
                    if isinstance(c.value, str) and c.value.startswith("=") and "!" in c.value:
                        cruzadas += 1
        self.assertGreater(cruzadas, 200)

    def test_etiquetas_con_tildes_correctas(self):
        texto = texto_del_xlsx(self.ruta)
        for malo in ("Depreciacion", "Amortizacion", "anios", "Inversion ", "Administracion", "Comercializacion"):
            self.assertNotIn(malo, texto)

    def test_sin_referencias_al_repositorio(self):
        self.assertIsNone(PROHIBIDO_EN_ANEXOS.search(texto_del_xlsx(self.ruta)))

    def test_amortizacion_cierra_en_cero(self):
        fila = self.fila("8 Costo financiero", "Deuda al cierre del año")
        self.assertAlmostEqual(fila[len(self.r["filas"])], 0, places=2)


class TestAnexosGenerados(unittest.TestCase):
    """Los archivos que entrega el repositorio existen y coinciden con el modelo vigente."""

    def test_existen_los_dos_anexos(self):
        self.assertTrue(os.path.exists(ANEXO_A), ANEXO_A)
        self.assertTrue(os.path.exists(ANEXO_B), ANEXO_B)

    def test_anexo_a_generado_cuadra_con_la_bom(self):
        wb = openpyxl.load_workbook(ANEXO_A, data_only=True)
        total = next(r for r in wb["Producto (BOM por equipo)"].iter_rows(values_only=True) if r[0] and str(r[0]).startswith("TOTAL POR EQUIPO"))
        self.assertAlmostEqual(total[5], M.BOM, places=2)

    def test_anexo_b_generado_cuadra_con_el_modelo(self):
        wb = openpyxl.load_workbook(ANEXO_B, data_only=True)
        self.assertEqual(wb.sheetnames, HOJAS_B)
        res = {r[0]: r[1] for r in wb["1 Resumen"].iter_rows(values_only=True) if r[0]}
        self.assertAlmostEqual(res["VAN a 10 años"], M.resumen(M.dimensionar())["van"], places=0)


class TestEnsambleYCapacidad(unittest.TestCase):
    def test_c_cuesta_menos_que_a_en_todos_los_lotes(self):
        for f in EN.comparacion():
            self.assertEqual(f["mejor"], "C", f["lote"])

    def test_cargos_del_pcba_incluyen_las_tarifas_publicadas(self):
        c = M.pcba_cargos(200)
        p = M.S["pcba"]
        esperado = (p["preparacion_estandar_usd"] + p["estencil_estandar_usd"] + c["extendidas"] * p["pieza_extendida_usd"]
                    + c["juntas"] * 200 * p["junta_usd"] + p["envio_base_usd"] + p["envio_por_placa_usd"] * 200)
        self.assertAlmostEqual(c["total_usd"], esperado, places=6)

    def test_la_fila_pcba_de_la_bom_es_la_del_lote_de_200(self):
        fila = next(f for f in M.S["bom_filas"] if f.get("calculo") == "pcba_lote")
        self.assertAlmostEqual(fila["precio_clp"], round(M.pcba_cargos(200)["por_placa_clp"], 2), places=2)

    def test_cama_de_220_con_la_huella_vigente_da_una_carcasa_por_cama(self):
        self.assertEqual(EN.piezas_por_cama(), 2)
        self.assertEqual(EN.capacidad_impresion()["equipos_cama"], 1)

    def test_una_huella_menor_cabe_mas_veces(self):
        self.assertGreater(EN.piezas_por_cama(huella=[80, 70]), EN.piezas_por_cama())

    def test_las_dos_impresoras_se_justifican_con_la_demanda_maxima(self):
        maxima = max(M.S["ventas"].values())
        self.assertEqual(EN.impresoras_necesarias(maxima)["impresoras"], 2)
        n = sum(f["cantidad"] for f in M.S["taller_filas"] if f["equipo"] == "Impresora 3D")
        self.assertGreaterEqual(n, EN.impresoras_necesarias(maxima)["impresoras"])

    def test_las_personas_de_taller_no_superan_la_dotacion_total(self):
        for f in EN.tabla_personas():
            self.assertLessEqual(f["personas_C"], f["ensambladores"] + f["socios"])


class TestEnergiaV3(unittest.TestCase):
    def test_potencia_instalada_total_es_la_suma_de_los_consumidores(self):
        filas, rail, fuente = EV.potencia_instalada()
        self.assertAlmostEqual(fuente, sum(f[4] for f in filas[:8]), places=9)
        self.assertGreater(fuente, rail)          # las perdidas del LDO y del elevador

    def test_modos_ordenados_por_consumo(self):
        m = {n: p for n, p, _, _ in EV.modos()}
        self.assertEqual(m["Apagado (interruptor abierto)"], 0.0)
        self.assertLess(m["Reposo profundo (mejora, con divisor de 1 MΩ)"], m["Conectado en espera"])
        self.assertLess(m["Conectado en espera"], m["Midiendo (adquisición de la sonda)"])

    def test_la_v3_dura_mas_que_la_v2_con_reposo(self):
        for _, actual, v2, v3, prof in EV.autonomias():
            self.assertGreater(v2, actual)
            self.assertGreater(v3, v2)
            self.assertGreaterEqual(prof, v3)

    def test_kwh_de_red_es_mayor_que_los_wh_de_la_celda(self):
        self.assertGreater(EV.kwh_red_anuales(EV.JORNADAS_HABITUAL) * 1000, EV.wh_anuales(EV.JORNADAS_HABITUAL))

    def test_la_electricidad_del_modelo_calza_con_la_potencia_instalada(self):
        """La electricidad de los servicios basicos sale del taller y la oficina: el supuesto es el calculo redondeado hacia arriba a $5.000."""
        _, _, sin, con = EV.electricidad_requerida()
        self.assertEqual(EV.electricidad_supuesto(), (sin, con))

    def test_los_servicios_basicos_suman_su_detalle(self):
        self.assertEqual(M.S["servicios_basicos_con_oficina"], sum(v for _, v in M.S["_servicios_detalle_oficina"]))
        self.assertEqual(M.S["servicios_basicos_sin_oficina"], sum(v for _, v in M.S["_servicios_detalle_sin_oficina"]))

    def test_la_energia_de_la_carcasa_cuadra_con_el_taller(self):
        kwh = M.S["capacidad_impresion"]["potencia_promedio_w"] * EN.capacidad_impresion()["h_equipo"] / 1000
        energia = next(v for n, v, _ in M.S["_carcasa_detalle"] if n.startswith("Energía"))
        self.assertAlmostEqual(energia, kwh * M.S["tarifa_electrica_clp_kwh"], delta=10)


class TestValidadorInforme(unittest.TestCase):
    def cats(self, texto):
        return {c for c, _ in VI.validar(texto, con_anexos=False)}

    def test_detecta_marcadores_y_terminos_prohibidos(self):
        c = self.cats("## I. Introducción\n\nEl EBITDA ⟦PENDIENTE: x⟧ y el predio.\n")
        self.assertIn("Marcadores", c)
        self.assertIn("Términos", c)

    def test_detecta_tablas_con_columnas_desiguales_o_celdas_vacias(self):
        t = "| A | B |\n|---|---|\n| 1 | 2 | 3 |\n| 4 |  |\n"
        mensajes = [m for c, m in VI.validar(t, con_anexos=False) if c == "Tablas"]
        self.assertTrue(any("columnas" in m for m in mensajes))
        self.assertTrue(any("vacía" in m for m in mensajes))

    def test_detecta_totales_que_no_cuadran(self):
        t = "| A | B |\n|---|---|\n| x | 10 |\n| y | 20 |\n| Total | 99 |\n"
        self.assertIn("Tablas", self.cats(t))
        ok = "| A | B |\n|---|---|\n| x | 10 |\n| y | 20 |\n| Total | 30 |\n"
        self.assertNotIn("Tablas", self.cats(ok))

    def test_detecta_numeracion_rota_e_indice_distinto(self):
        t = "### Índice de tablas\n\n- Tabla 1.0 “Uno”\n\n## I. Intro\n\n**Tabla 1.0 “Uno”**\n\n**Tabla 1.2 “Tres”**\n\nVer Tabla 9.9.\n"
        mensajes = [m for c, m in VI.validar(t, con_anexos=False) if c == "Numeración"]
        self.assertGreaterEqual(len(mensajes), 2)

    def test_detecta_modulos_fuera_del_prototipo(self):
        t = "## IV. Básica\n\nUsa un DevKit.\n\n### III.6 El prototipo V2\n\nUsa un DevKit.\n"
        mensajes = [m for c, m in VI.validar(t, con_anexos=False) if c == "Sin módulos"]
        self.assertEqual(len(mensajes), 1)

    def test_detecta_referencias_al_repositorio(self):
        self.assertIn("Sin repositorio", self.cats("Ver `modelo.py` y finanzas/supuestos.json"))

    def test_los_anexos_generados_pasan_la_validacion(self):
        errores = []
        VI.anexos(lambda c, m: errores.append((c, m)))
        self.assertEqual(errores, [])


class TestAnexoE(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.ruta = os.path.join(cls.dir.name, "e.xlsx")
        cls.res = anexos.anexo_e(cls.ruta)

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def test_una_hoja_por_protocolo(self):
        wb = openpyxl.load_workbook(self.ruta)
        self.assertEqual(wb.sheetnames, ["FAT", "SAT", "Instrucciones"])

    def test_cada_prueba_tiene_criterio_y_requerimiento(self):
        for prueba, metodo, criterio, req in anexos.pruebas_fat() + anexos.pruebas_sat():
            self.assertTrue(prueba and metodo and criterio)
            self.assertRegex(req, r"^R\d{2}(, R\d{2})*$")

    def test_la_corriente_de_referencia_sale_del_modelo_energetico(self):
        espera = EV.p_bateria(EV.ESPERA_REPOSO) / EV.V_BAT
        fila = next(x for x in anexos.pruebas_fat() if x[0] == "Corriente en espera")
        self.assertIn("%.0f mA" % espera, fila[2])

    def test_sin_referencias_al_repositorio(self):
        with zipfile.ZipFile(self.ruta) as z:
            t = "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml"))
        self.assertIsNone(VI.REPO.search(t))


if __name__ == "__main__":
    unittest.main()
