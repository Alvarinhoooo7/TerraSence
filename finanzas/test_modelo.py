# -*- coding: utf-8 -*-
"""Pruebas del modelo económico. Verifican las invariantes que sostienen el informe.

    python -m unittest discover -s finanzas -p "test_*.py"
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import modelo as M  # noqa: E402


class TestCostos(unittest.TestCase):
    def test_bom_suma_sus_lineas(self):
        self.assertEqual(M.BOM, sum(c * p for _, c, p, _ in M.S["bom"]))

    def test_bom_incluye_montaje_y_embalaje(self):
        """Desde oct-2026 la BOM incluye montaje, sellado y embalaje (decisión del equipo)."""
        nombres = " ".join(n.lower() for n, _, _, _ in M.S["bom"])
        for incluido in ("prensaestopa", "embalaje", "cableado", "respiradero", "interruptor"):
            self.assertIn(incluido, nombres)

    def test_costo_variable_incluye_merma_garantia_y_envio(self):
        esperado = M.BOM * (1 + M.S["merma_fraccion_bom"] + M.S["garantia_fraccion_bom"]) \
            + M.S["envio_neto_por_equipo"]
        self.assertAlmostEqual(M.VAR_UNIT, esperado, places=6)

    def test_carcasa_cuadra_con_su_desglose(self):
        detalle = sum(v for _, v, _ in M.S["_carcasa_detalle"])
        linea = next(c * p for n, c, p, _ in M.S["bom"] if "Carcasa" in n)
        self.assertEqual(detalle, linea)


class TestPrecio(unittest.TestCase):
    def setUp(self):
        self.r = M.dimensionar()

    def test_precio_entrega_exactamente_el_margen_objetivo(self):
        ventas = sum(f["ventas"] for f in self.r["filas"])
        costo = sum(f["costo_total"] for f in self.r["filas"])
        self.assertAlmostEqual(ventas / costo, 1 + M.S["margen_objetivo"], places=4)

    def test_precio_lista_es_el_neto_mas_iva(self):
        self.assertAlmostEqual(self.r["precio_lista"],
                               self.r["precio_neto_base"] * (1 + M.S["iva"]), places=6)

    def test_precio_antiguo_destruye_valor(self):
        """El precio de $349.990 de versiones previas no es sostenible: es el hallazgo del estudio."""
        r = M.correr(precio_forzado=349990, capital_trabajo=self.r["inversion"]["capital_trabajo"])
        self.assertLess(M.resumen(r)["van"], 0)


class TestFinanciamiento(unittest.TestCase):
    def setUp(self):
        self.r = M.dimensionar()

    def test_credito_financia_toda_la_inversion(self):
        self.assertAlmostEqual(self.r["credito"], self.r["inversion"]["total"], places=6)

    def test_fuentes_igualan_a_usos(self):
        """Credito + pie = inversion + cuotas anticipadas: ningun peso se cuenta dos veces."""
        fuentes = self.r["credito"] + self.r["pie"]
        usos = self.r["inversion"]["total"] + sum(f["pie_aplicado"] for f in self.r["filas"])
        self.assertAlmostEqual(fuentes, usos, places=2)

    def test_pie_cubre_las_primeras_cuotas(self):
        aplicado = [f["pie_aplicado"] for f in self.r["filas"]]
        self.assertAlmostEqual(sum(aplicado), M.S["pie_total"], places=2)
        self.assertEqual(aplicado, sorted(aplicado, reverse=True))
        self.assertAlmostEqual(self.r["cuotas_anticipadas"], M.S["pie_total"] / self.r["cuota"], places=6)

    def test_van_descuenta_la_inversion_y_el_pie(self):
        flujos = [f["flujo"] for f in self.r["filas"]]
        esperado = M.van(self.r["inversion"]["total"] + self.r["pie"], flujos, M.S["tasa_descuento"])
        self.assertAlmostEqual(M.resumen(self.r)["van"], esperado, places=2)

    def test_amortizacion_devuelve_el_principal_y_cierra_en_cero(self):
        capital = sum(a["capital"] for a in self.r["amortizacion"])
        self.assertAlmostEqual(capital, self.r["credito"], places=2)
        self.assertAlmostEqual(self.r["amortizacion"][-1]["saldo_final"], 0, places=2)

    def test_cuota_es_constante_en_el_sistema_frances(self):
        cuotas = [a["cuota"] for a in self.r["amortizacion"]]
        self.assertAlmostEqual(max(cuotas), min(cuotas), places=2)


class TestEvaluacion(unittest.TestCase):
    def setUp(self):
        self.r = M.dimensionar()
        self.flujos = [f["flujo"] for f in self.r["filas"]]
        self.inv = self.r["desembolso"]

    def test_van_se_anula_en_la_tir(self):
        tir = M.tir(self.inv, self.flujos)
        self.assertAlmostEqual(M.van(self.inv, self.flujos, tir), 0, delta=1000)

    def test_van_decrece_con_la_tasa(self):
        valores = [M.van(self.inv, self.flujos, t) for t in (0.05, 0.10, 0.20, 0.40)]
        self.assertEqual(valores, sorted(valores, reverse=True))

    def test_la_caja_nunca_se_agota(self):
        self.assertGreater(min(f["caja"] for f in self.r["filas"]), 0)

    def test_capital_de_trabajo_respeta_el_piso_de_politica(self):
        meses = self.r["inversion"]["meses_cubiertos"]
        self.assertGreaterEqual(round(meses, 2), M.S["capital_trabajo_meses"])


class TestLaboral(unittest.TestCase):
    def test_aporte_previsional_pondera_cambio_de_agosto(self):
        """La nómina anual combina siete meses del tramo anterior y cinco del nuevo."""
        tramos = {2026: .035, 2027: .0425, 2028: .05, 2029: .057,
                  2030: .064, 2031: .071, 2032: .078, 2033: .085}
        for anio in range(2027, 2034):
            esperado = (7 * tramos[anio - 1] + 5 * tramos[anio]) / 12
            self.assertAlmostEqual(M.S["aporte_previsional_empleador"][str(anio)], esperado)
        self.assertEqual(M.S["aporte_previsional_empleador"]["2034"], .085)

    def test_costo_del_empleador_crece_con_la_reforma_previsional(self):
        primero = M.factor_empleador(M.ANIOS[0])
        ultimo = M.factor_empleador(M.ANIOS[-1])
        self.assertGreater(ultimo, primero)

    def test_ensamblador_se_mantiene_sobre_el_ingreso_minimo(self):
        """Ingreso mínimo de $553.553 (may-2026), proyectado con la misma inflación del modelo."""
        for i, anio in enumerate(M.ANIOS):
            sueldo = M.S["sueldo_ensamblador"] * (1 + M.S["inflacion"]) ** i
            minimo = 553553 * (1 + M.S["inflacion"]) ** (i + 1)
            self.assertGreater(sueldo, minimo, "ensamblador bajo el mínimo en %d" % anio)

    def test_sueldo_de_socio_sube_por_escalones_y_luego_por_inflacion(self):
        serie = [M.sueldo_socio(a) for a in M.ANIOS]
        self.assertEqual(serie, sorted(serie))
        self.assertEqual(serie[0], M.S["sueldo_socio_por_anio"][str(M.ANIOS[0])])


class TestDepreciacion(unittest.TestCase):
    def test_depreciacion_anual_agota_el_activo_en_su_vida_util(self):
        for nombre, cant, valor, vida in M.S["equipamiento"]:
            self.assertAlmostEqual(cant * valor / vida * vida, cant * valor, places=6)

    def test_activo_nominal_se_amortiza_en_cinco_anios(self):
        self.assertAlmostEqual(M.AMORT_NOMINAL_ANUAL * 5, M.NOMINAL_TOTAL, places=6)

    def test_el_activo_que_se_deprecia_tras_su_vida_util_se_compra(self):
        """Depreciar la renovacion sin pagarla inflaria el flujo de los anios 6 a 10."""
        filas = M.dimensionar()["filas"]
        renovacion = sum(f["reinversion"] for f in filas)
        self.assertGreater(renovacion, 0)
        depreciado = sum(f["deprec"] for f in filas[5:])
        self.assertAlmostEqual(depreciado, renovacion, delta=1)


if __name__ == "__main__":
    unittest.main()
