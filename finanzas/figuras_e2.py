# -*- coding: utf-8 -*-
"""Figuras del informe de la Evaluacion 2, dibujadas como imagenes (sin Mermaid).

    python finanzas/figuras_e2.py

Escribe los PNG en Evaluacion/Evaluacion 2/Figuras. FIGURAS relaciona el titulo de cada figura del
informe con su archivo. La carta Gantt sale de plan_proyecto() de anexos.py, de modo que repite las
mismas fechas del anexo F; la placa y la carcasa usan las coordenadas de diseno del capitulo VII.
"""
import os
from pathlib import Path
import shutil
import sys
import textwrap
from datetime import date

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Circle, FancyBboxPatch, Polygon, Rectangle  # noqa: E402

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(BASE, ".."))
DESTINO = os.path.join(RAIZ, "Evaluacion", "Evaluacion 2", "Figuras")
sys.path.insert(0, BASE)

VERDE = "#1F5E3B"
VERDE_M = "#3C8D5A"
VERDE_C = "#E7F1EA"
GRIS = "#4A5560"
GRIS_C = "#F2F3F1"
ROJO = "#A93A3A"
ROJO_C = "#F8E6E4"
AZUL = "#2B6CB0"
AZUL_C = "#E5EEF8"
AMBAR = "#B7791F"
AMBAR_C = "#FBF1DF"
plt.rcParams["font.family"] = "DejaVu Sans"

ESTILOS = {
    "normal": (VERDE, "white", "#1B1B1B"),
    "fuerte": (VERDE, VERDE, "white"),
    "suave": (VERDE_M, VERDE_C, "#1B1B1B"),
    "gris": (GRIS, GRIS_C, "#1B1B1B"),
    "alerta": (ROJO, ROJO_C, "#1B1B1B"),
    "azul": (AZUL, AZUL_C, "#1B1B1B"),
    "ambar": (AMBAR, AMBAR_C, "#1B1B1B"),
}

FIGURAS = {
    "Diagrama de Decisiones y Consecuencias": "fig_decisiones.png",
    "Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic": "fig_arq_8bits.png",
    "Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla": "fig_arq_embebido_pantalla.png",
    "Diagrama de Flujo Arquitectura con Datalogger Estacionario": "fig_arq_datalogger.png",
    "Diagrama de Flujo Arquitectura de Nodos con LoRaWAN": "fig_arq_lorawan.png",
    "Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono": "fig_arq_sonda_telefono.png",
    "Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo": "fig_arq_bajo_consumo.png",
    "Diagrama de Flujo Arquitectura de Conectividad": "fig_conectividad.png",
    "Árbol de Alimentación y Nodos de Tensión": "fig_nodos_tension.png",
    "Concepto funcional de la carcasa": "fig_carcasa_concepto.png",
    "Estados de operación del equipo": "fig_estados.png",
    "Secuencia de una jornada de medición": "fig_jornada.png",
    "Aplicación móvil: inicio, tema oscuro, vinculación y preferencias": "fig_app_pantallas.png",
    "Consola de soporte: búsqueda de equipos y ficha del equipo": "fig_consola.png",
    "Diagrama de bloques del hardware del instrumento": "fig_bloques.png",
    "Árbol de alimentación del instrumento": "fig_alimentacion.png",
    "Flujo de datos y digitalización del proceso": "fig_flujo_datos.png",
    "Placa del instrumento: vista tridimensional": "fig_placa_3d.png",
    "Plano de la placa del instrumento": "fig_placa.png",
    "Ruteo de la placa: cara superior e inferior": "fig_ruteo.png",
    "Carcasa: planta, vista frontal y corte": "fig_carcasa.png",
    "Secuencia de montaje del equipo": "fig_montaje.png",
    "Proceso de fabricación por estaciones": "fig_fabricacion.png",
    "Carta Gantt del proyecto": "fig_gantt.png",
}


# --------------------------------------------------------------------------- lienzo de diagramas
class Lienzo:
    """Coordenadas en unidades de dibujo, con el eje y hacia abajo."""

    def __init__(self, ancho, alto, escala=0.62, fuente=9.5):
        self.fig, self.ax = plt.subplots(figsize=(ancho * escala, alto * escala))
        self.ax.set_xlim(0, ancho)
        self.ax.set_ylim(alto, 0)
        self.ax.axis("off")
        self.escala = escala
        self.fuente = fuente
        self.cajas = {}

    def _envolver(self, texto, ancho, fuente):
        chars = max(8, int(ancho * self.escala * 0.86 / (fuente * 0.0080)))
        return "\n".join(textwrap.fill(p, chars) for p in texto.split("\n"))

    def caja(self, clave, x, y, w, h, texto, estilo="normal", fuente=None, forma="caja", negrita=False):
        borde, relleno, color = ESTILOS[estilo]
        f = fuente or self.fuente
        if forma == "rombo":
            self.ax.add_patch(Polygon([(x + w / 2, y), (x + w, y + h / 2), (x + w / 2, y + h), (x, y + h / 2)],
                                      closed=True, ec=borde, fc=relleno, lw=1.4, zorder=3))
        elif forma == "cilindro":
            self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=%.2f" % (h * 0.45),
                                             ec=borde, fc=relleno, lw=1.4, zorder=3))
        else:
            self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.18",
                                             ec=borde, fc=relleno, lw=1.4, zorder=3))
        factor = 0.62 if forma == "rombo" else (0.8 if (negrita or estilo == "fuerte") else 0.9)
        self.ax.text(x + w / 2, y + h / 2, self._envolver(texto, w * factor, f),
                     ha="center", va="center", fontsize=f, color=color, zorder=4,
                     fontweight="bold" if negrita or estilo == "fuerte" else "normal", linespacing=1.15)
        self.cajas[clave] = (x, y, w, h)

    def grupo(self, x, y, w, h, titulo, color=VERDE):
        self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.25",
                                         ec=color, fc="#FAFBF9", lw=1.1, ls=(0, (4, 3)), zorder=1))
        self.ax.text(x + 0.25, y + 0.2, titulo, ha="left", va="top", fontsize=self.fuente, color=color,
                     fontweight="bold", zorder=2)

    def titulo_col(self, x, y, texto, fuente=None):
        self.ax.text(x, y, texto, ha="center", va="center", fontsize=fuente or self.fuente + 0.5,
                     color=VERDE, fontweight="bold")

    def _anclas(self, a, b, lado_a, lado_b):
        ax_, ay, aw, ah = self.cajas[a]
        bx, by, bw, bh = self.cajas[b]
        if lado_a is None:
            if bx >= ax_ + aw - 0.01:
                lado_a, lado_b = "d", "i"
            elif bx + bw <= ax_ + 0.01:
                lado_a, lado_b = "i", "d"
            elif by >= ay + ah:
                lado_a, lado_b = "ab", "ar"
            else:
                lado_a, lado_b = "ar", "ab"

        def punto(c, lado):
            x, y, w, h = c
            return {"d": (x + w, y + h / 2), "i": (x, y + h / 2), "ab": (x + w / 2, y + h), "ar": (x + w / 2, y)}[lado]
        return punto(self.cajas[a], lado_a), punto(self.cajas[b], lado_b), lado_a, lado_b

    def flecha(self, a, b, texto=None, lado_a=None, lado_b=None, puntos=None, discontinua=False, doble=False,
               color=GRIS, dx=0.0, dy=0.0, pos_texto=0.5, fuente=None, da=(0, 0), db=(0, 0)):
        p0, p1, la, lb = self._anclas(a, b, lado_a, lado_b)
        p0 = (p0[0] + dx + da[0], p0[1] + dy + da[1])
        p1 = (p1[0] + dx + db[0], p1[1] + dy + db[1])
        if puntos is None:
            if la in ("d", "i") and lb in ("d", "i") and abs(p0[1] - p1[1]) > 0.01:
                xm = (p0[0] + p1[0]) / 2
                puntos = [(xm, p0[1]), (xm, p1[1])]
            elif la in ("ab", "ar") and lb in ("ab", "ar") and abs(p0[0] - p1[0]) > 0.01:
                ym = (p0[1] + p1[1]) / 2
                puntos = [(p0[0], ym), (p1[0], ym)]
            elif la in ("d", "i") and lb in ("ab", "ar"):
                puntos = [(p1[0], p0[1])]
            elif la in ("ab", "ar") and lb in ("d", "i"):
                puntos = [(p0[0], p1[1])]
            else:
                puntos = []
        traza = [p0] + list(puntos) + [p1]
        ls = (0, (4, 3)) if discontinua else "-"
        for (x0, y0), (x1, y1) in zip(traza[:-2], traza[1:-1]):
            self.ax.plot([x0, x1], [y0, y1], color=color, lw=1.3, ls=ls, zorder=2, solid_capstyle="round")
        estilo = "<|-|>" if doble else "-|>"
        self.ax.annotate("", xy=traza[-1], xytext=traza[-2],
                         arrowprops=dict(arrowstyle=estilo, color=color, lw=1.3, ls=ls, mutation_scale=12,
                                         shrinkA=0, shrinkB=0), zorder=2)
        if texto:
            segs = list(zip(traza[:-1], traza[1:]))
            largo = max(segs, key=lambda s: abs(s[1][0] - s[0][0]) + abs(s[1][1] - s[0][1]))
            xm = largo[0][0] + (largo[1][0] - largo[0][0]) * pos_texto
            ym = largo[0][1] + (largo[1][1] - largo[0][1]) * pos_texto
            horizontal = abs(largo[1][1] - largo[0][1]) < 0.01
            if horizontal:
                self.ax.text(xm, ym - 0.12, texto, ha="center", va="bottom", fontsize=(fuente or self.fuente - 1.2),
                             color=GRIS, zorder=5, bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.85))
            else:
                self.ax.text(xm, ym, texto, ha="center", va="center", fontsize=(fuente or self.fuente - 1.2), color=GRIS,
                             zorder=5, bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="none"))

    def nota(self, x, y, texto, fuente=None, color=GRIS, ha="left"):
        self.ax.text(x, y, texto, ha=ha, va="center", fontsize=fuente or self.fuente - 1, color=color, style="italic")

    def guardar(self, titulo):
        os.makedirs(DESTINO, exist_ok=True)
        self.fig.savefig(os.path.join(DESTINO, FIGURAS[titulo]), dpi=200, bbox_inches="tight", pad_inches=0.15,
                         facecolor="white")
        plt.close(self.fig)


# --------------------------------------------------------------------------- capítulo II y V
def decisiones():
    L = Lienzo(23, 12.2)
    for x, t in ((2.0, "Etapa"), (6.8, "Decisión sin medición"), (13.3, "Fallo agronómico"), (19.8, "Consecuencia económica")):
        L.titulo_col(x, 0.5, t)
    filas = [
        ("Pre-siembra", "Sembrar según el calendario, sin medir salinidad ni temperatura del suelo",
         "La semilla queda en un suelo frío o salino", "Siembra perdida, sin ventana para resembrar"),
        ("Vegetativo", "Regar por costumbre, sin medir la humedad", "Raíces asfixiadas o fertilizante arrastrado",
         "Insumo y crecimiento pagados dos veces"),
        ("Floración", "No detectar a tiempo el estrés hídrico", "Aborto floral masivo", "Rendimiento de la temporada perdido"),
        ("Cosecha", "Entrar con maquinaria sobre suelo húmedo", "Suelo compactado y sin estructura",
         "Más labores y menos agua útil la temporada siguiente"),
    ]
    for i, (et, d, f, c) in enumerate(filas):
        y = 1.3 + i * 2.75
        L.caja("e%d" % i, 0.4, y, 3.2, 2.0, et, "fuerte")
        L.caja("d%d" % i, 4.3, y, 5.0, 2.0, d, "gris")
        L.caja("f%d" % i, 10.8, y, 5.0, 2.0, f, "ambar")
        L.caja("c%d" % i, 17.3, y, 5.0, 2.0, c, "alerta")
        L.flecha("e%d" % i, "d%d" % i)
        L.flecha("d%d" % i, "f%d" % i)
        L.flecha("f%d" % i, "c%d" % i)
    L.guardar("Diagrama de Decisiones y Consecuencias")


def arquitecturas():
    L = Lienzo(21, 8)
    L.caja("p", 0.4, 0.6, 4.2, 1.6, "Pilas", "gris")
    L.caja("s", 0.4, 4.0, 4.2, 1.6, "Sonda de suelo", "gris")
    L.caja("m", 7.2, 2.3, 5.0, 1.8, "Microcontrolador de 8 bits", "suave")
    L.caja("pa", 15.4, 0.4, 5.2, 1.5, "Pantalla LCD u OLED", "normal")
    L.caja("t", 15.4, 2.5, 5.2, 1.5, "Teléfono: sólo Android", "normal")
    L.caja("i", 15.4, 4.9, 5.2, 1.5, "Interpretación agronómica", "alerta")
    L.flecha("p", "m", db=(0, -0.45))
    L.flecha("s", "m", "Analógica o UART", db=(0, 0.45))
    L.flecha("m", "pa", da=(0, -0.6))
    L.flecha("m", "t", "Bluetooth Classic", doble=True, da=(0, 0.05))
    L.flecha("m", "i", "Sin memoria para el motor", discontinua=True, color=ROJO, da=(0, 0.6))
    L.nota(0.4, 7.3, "Eliminada en el filtro de viabilidad: iOS no admite el perfil serie sin certificación MFi y no cabe el motor agronómico.")
    L.guardar("Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic")

    L = Lienzo(21, 8)
    L.caja("s", 0.4, 0.4, 4.4, 1.4, "Sonda RS-485", "gris")
    L.caja("a", 0.4, 2.4, 4.4, 1.4, "Sensor ambiental", "gris")
    L.caja("b", 0.4, 4.4, 4.4, 1.4, "Batería", "gris")
    L.caja("m", 7.4, 2.1, 5.4, 2.0, "Microcontrolador con motor agronómico embebido", "suave")
    L.caja("p", 15.4, 0.4, 5.2, 1.5, "Pantalla activa y teclado", "normal")
    L.caja("c", 15.4, 2.6, 5.2, 1.5, "Contexto climático", "alerta")
    L.caja("f", 15.4, 4.8, 5.2, 1.5, "Nuevo conocimiento agronómico", "alerta")
    for k, d in (("s", -0.6), ("a", 0), ("b", 0.6)):
        L.flecha(k, "m", db=(0, d))
    L.flecha("m", "p", da=(0, -0.6))
    L.flecha("m", "c", "Sin GPS ni red", discontinua=True, color=ROJO, da=(0, 0.25))
    L.flecha("f", "m", "Exige cargar un firmware nuevo", lado_a="i", lado_b="ab", discontinua=True, color=ROJO)
    L.nota(0.4, 7.3, "Duplica en el instrumento la pantalla, el cómputo y el GPS que el agricultor ya tiene en su teléfono.")
    L.guardar("Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla")

    L = Lienzo(23, 6.4)
    L.caja("s", 0.3, 2.2, 3.8, 1.8, "Sonda enterrada en un único punto", "gris")
    L.caja("e", 5.1, 0.2, 3.8, 1.5, "Panel solar y batería", "gris")
    L.caja("d", 5.1, 2.2, 3.8, 1.8, "Datalogger fijo", "suave")
    L.caja("mo", 10.0, 2.2, 3.8, 1.8, "Módem de red móvil", "normal")
    L.caja("w", 14.9, 2.2, 3.8, 1.8, "Plataforma web por suscripción", "alerta")
    L.caja("u", 19.6, 2.2, 3.2, 1.8, "Agricultor consulta a distancia", "normal")
    L.flecha("s", "d")
    L.flecha("e", "d", "Energía")
    L.flecha("d", "mo")
    L.flecha("mo", "w")
    L.flecha("w", "u")
    L.nota(0.3, 5.6, "Mide un solo punto y depende de cobertura celular y de una cuota mensual.")
    L.guardar("Diagrama de Flujo Arquitectura con Datalogger Estacionario")

    L = Lienzo(21, 7.4)
    for i in range(3):
        L.caja("n%d" % i, 0.4, 0.4 + i * 2.1, 4.4, 1.5, ["Nodo 1 con sonda", "Nodo 2 con sonda", "Nodo N con sonda"][i], "gris")
    L.caja("g", 7.4, 2.5, 4.6, 1.5, "Estación concentradora en el campo", "suave")
    L.caja("r", 13.0, 2.5, 3.8, 1.5, "Servidor de red y aplicación", "normal")
    L.caja("u", 17.6, 2.5, 3.2, 1.5, "Agricultor consulta a distancia", "normal")
    for i in range(3):
        L.flecha("n%d" % i, "g", "LoRa" if i == 1 else None, db=(0, (i - 1) * 0.45))
    L.flecha("g", "r", "Internet")
    L.flecha("r", "u")
    L.nota(0.4, 7.0, "Exige una red fija en cada campo: sirve a una explotación, no a un instrumento que se traslada.")
    L.guardar("Diagrama de Flujo Arquitectura de Nodos con LoRaWAN")

    L = Lienzo(25, 5.0)
    L.caja("f", 0.3, 1.2, 3.8, 1.8, "Fuente compatible con la sonda", "gris")
    L.caja("s", 5.8, 1.2, 3.4, 1.8, "Sonda RS-485", "gris")
    L.caja("a", 11.2, 1.2, 3.8, 1.8, "Adaptador USB a RS-485", "suave")
    L.caja("t", 17.2, 1.2, 3.0, 1.8, "Teléfono", "normal")
    L.caja("i", 21.6, 1.2, 3.2, 1.8, "Aplicación e interpretación", "normal")
    L.flecha("f", "s", "Energía")
    L.flecha("s", "a", "Modbus RTU", doble=True)
    L.flecha("a", "t", "USB en modo host", doble=True)
    L.flecha("t", "i")
    L.nota(0.3, 4.4, "Cable físico al teléfono y una fuente externa: incómodo en el campo y dependiente del modelo de teléfono.")
    L.guardar("Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono")

    L = Lienzo(21, 7.6)
    L.caja("s", 0.4, 0.4, 4.4, 1.5, "Sonda 7 en 1 RS-485", "gris")
    L.caja("a", 0.4, 2.6, 4.4, 1.5, "BME280", "gris")
    L.caja("b", 0.4, 4.8, 4.4, 1.5, "Celda recargable por USB-C", "gris")
    L.caja("e", 7.6, 2.3, 4.6, 2.1, "Instrumento portátil con ESP32", "fuerte")
    L.caja("t", 14.8, 2.3, 5.8, 2.1, "Teléfono: interpreta, georreferencia y guarda", "suave")
    L.caja("n", 14.8, 5.4, 5.8, 1.5, "Nube", "normal")
    L.flecha("s", "e", "Modbus RTU", doble=True, db=(0, -0.65))
    L.flecha("a", "e", "I²C", doble=True)
    L.flecha("b", "e", "Energía", db=(0, 0.65))
    L.flecha("e", "t", "BLE, 20 bytes", doble=True)
    L.flecha("t", "n", "Con red: respaldo y pronóstico", discontinua=True)
    L.guardar("Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo")


def conectividad():
    L = Lienzo(24, 8.8)
    L.grupo(0.2, 0.2, 16.9, 8.2, "En el campo, sin cobertura")
    L.caja("so", 0.6, 1.2, 3.8, 1.4, "Sonda de suelo", "gris")
    L.caja("bm", 0.6, 3.6, 3.8, 1.4, "BME280", "gris")
    L.caja("e", 7.4, 2.4, 3.0, 1.4, "ESP32", "fuerte")
    L.caja("t", 12.2, 2.4, 3.6, 1.4, "Teléfono", "suave")
    L.caja("m", 12.2, 4.5, 3.6, 1.4, "Motor agronómico local", "normal")
    L.caja("l", 11.4, 6.6, 5.2, 1.4, "Almacenamiento local y cola de envío", "normal", forma="cilindro")
    L.caja("n", 18.6, 6.6, 5.0, 1.4, "Nube: respaldo e histórico", "normal", forma="cilindro")
    L.caja("w", 18.6, 2.4, 5.0, 1.4, "Pronóstico a cinco días", "azul")
    L.flecha("so", "e", "RS-485 Modbus RTU", db=(0, -0.35), doble=True)
    L.flecha("bm", "e", "I²C", db=(0, 0.35), doble=True)
    L.flecha("e", "t", "BLE: 20 bytes", doble=True)
    L.flecha("t", "m")
    L.flecha("m", "l")
    L.flecha("l", "n", "HTTPS con cobertura")
    L.flecha("t", "w", "Con red y ubicación", discontinua=True, color=AZUL)
    L.guardar("Diagrama de Flujo Arquitectura de Conectividad")


def alimentacion_v2():
    """Nodos de tensión de la placa del instrumento y dónde se paga cada conversión (figura del capítulo V)."""
    L = Lienzo(24, 10.2)
    L.caja("usb", 0.3, 0.6, 3.4, 1.3, "USB-C 5 V", "gris")
    L.caja("tp", 4.6, 0.4, 3.8, 1.7, "Cargador TP4056 con termistor", "suave")
    L.caja("cel", 0.3, 4.3, 3.4, 1.5, "Celda LiPo 2.000 mAh", "gris")
    L.caja("fu", 4.6, 4.3, 3.8, 1.5, "PTC de 1 A y diodo de protección", "normal")
    L.caja("vc", 9.2, 4.2, 3.2, 1.7, "Nodo de celda: 3,0 a 4,2 V", "fuerte")
    L.caja("sw", 9.2, 0.6, 3.2, 1.5, "Ruta de carga e interruptor", "normal")
    L.caja("ldo", 13.4, 0.4, 4.0, 1.9, "LDO RT9080: 3,3 V con η = 3,3/3,7 ≈ 89 %", "suave")
    L.caja("v33", 18.4, 0.4, 5.3, 1.9, "Nodo de 3,3 V: ESP32, BME280, SP3485, LED y buzzer", "fuerte", fuente=8.6)
    L.caja("ele", 13.4, 3.4, 4.0, 1.9, "Elevador MT3608: 5 V con η ≈ 0,85, sólo al medir", "suave", fuente=8.8)
    L.caja("cor", 18.4, 3.4, 5.3, 1.9, "Corte de la sonda: AO3401A con AO3400A", "ambar")
    L.caja("son", 18.4, 6.8, 5.3, 1.4, "Sonda de suelo a 5 V", "gris")
    L.caja("div", 4.6, 7.2, 3.8, 1.4, "Divisor 100 kΩ + 100 kΩ", "normal")
    L.caja("adc", 0.3, 7.2, 3.4, 1.4, "Entrada analógica IO34", "normal")
    L.flecha("usb", "tp")
    L.flecha("tp", "vc", lado_a="ab", lado_b="ar", puntos=[(6.5, 3.1), (10.8, 3.1)])
    L.flecha("cel", "fu")
    L.flecha("fu", "vc", doble=True)
    L.flecha("vc", "sw", lado_a="ar", lado_b="ab", dx=0.9)
    L.flecha("sw", "ldo")
    L.flecha("ldo", "v33")
    L.flecha("sw", "ele", lado_a="d", lado_b="i", puntos=[(12.9, 1.35), (12.9, 4.35)])
    L.flecha("ele", "cor")
    L.flecha("cor", "son", lado_a="ab", lado_b="ar")
    L.flecha("v33", "cor", "IO5", lado_a="ab", lado_b="ar", discontinua=True, fuente=8)
    L.flecha("fu", "div", lado_a="ab", lado_b="ar")
    L.flecha("div", "adc")
    L.nota(0.3, 9.6, "Sólo la sonda paga la conversión a 5 V; la electrónica de 3,3 V toma la energía de la celda a través del regulador lineal.")
    L.guardar("Árbol de Alimentación y Nodos de Tensión")


# --------------------------------------------------------------------------- capítulo VI
def estados():
    L = Lienzo(25.5, 11.2)
    L.caja("ap", 0.4, 4.4, 4.6, 1.8, "Apagado y almacenamiento", "gris")
    L.caja("ca", 0.4, 0.4, 4.6, 1.8, "Apagado y cargando", "ambar")
    L.caja("re", 10.6, 4.4, 4.6, 1.8, "Encendido en reposo", "fuerte")
    L.caja("ve", 20.6, 0.4, 4.6, 1.8, "Ventana de vinculación (30 s)", "azul")
    L.caja("me", 20.6, 4.4, 4.6, 1.8, "Medición (ciclo de 16 s)", "suave")
    L.caja("av", 20.6, 8.6, 4.6, 1.8, "Aviso al usuario", "normal")
    L.caja("bb", 10.6, 8.6, 4.6, 1.8, "Batería baja", "alerta")
    f = 8.2
    L.flecha("ap", "ca", "Conecta USB-C", dx=-1.5, fuente=f)
    L.flecha("ca", "ap", "Retira cable", dx=1.5, fuente=f)
    L.flecha("ap", "re", "Interruptor cerrado", da=(0, -0.45), db=(0, -0.45), fuente=f)
    L.flecha("re", "ap", "Interruptor abierto", da=(0, 0.45), db=(0, 0.45), fuente=f)
    L.flecha("re", "ve", "PAIR 3 s", lado_a="ar", lado_b="i", da=(-1.0, 0), puntos=[(11.9, 1.3)], fuente=f)
    L.flecha("ve", "re", "Vinculada o a los 30 s", lado_a="ab", lado_b="ar", da=(-0.8, 0), db=(1.2, 0),
             puntos=[(22.1, 3.2), (14.1, 3.2)], fuente=f)
    L.flecha("re", "me", "La app pide medir", da=(0, -0.45), db=(0, -0.45), fuente=f)
    L.flecha("me", "av", "Trama enviada o error", lado_a="ab", lado_b="ar", fuente=f)
    L.flecha("av", "re", "Aviso terminado", lado_a="i", lado_b="d", db=(0, 0.5), puntos=[(18.0, 9.5), (18.0, 5.8)], fuente=f)
    L.flecha("re", "bb", "Bajo 3,40 V", dx=-1.0, fuente=f)
    L.flecha("bb", "re", "Sobre 3,50 V", dx=1.0, fuente=f)
    L.flecha("bb", "ap", "Interruptor abierto", lado_a="i", lado_b="ab", puntos=[(2.7, 9.5)], fuente=f)
    L.nota(0.4, 10.9, "Señales: encendido, verde 1 s y pitido de 80 ms; ventana, azul a 2 Hz y pitido de 60 ms; éxito, tres destellos verdes y dos pitidos "
                      "ascendentes; error, tres destellos rojos y tono grave de 0,4 s; batería baja, destello rojo cada 10 s.", fuente=8)
    L.guardar("Estados de operación del equipo")


def jornada():
    actores = ["Agricultor", "Equipo", "Aplicación", "Nube"]
    xs = [2.0, 8.0, 14.0, 20.0]
    pasos = [
        (0, 1, "Enciende con el interruptor", None), (1, 0, "LED verde 1 s y un pitido", None),
        (0, 2, "Elige Medir y la fase fenológica", None), (2, 1, "Busca el anuncio y conecta por BLE", None),
        (2, 1, "Se suscribe a la telemetría", None), (1, 1, "Energiza la sonda, lee Modbus y el BME280", None),
        (1, 2, "Trama única de 20 bytes", None), (1, 0, "Verde y dos pitidos, o rojo y tono grave", None),
        (2, 2, "Valida la trama y evalúa el suelo", None), (2, 2, "Con red: pronóstico a cinco días", "opt"),
        (2, 0, "Veredicto, diez variables y recomendación", None), (0, 2, "Guarda el resultado", None),
        (2, 2, "Guarda en el teléfono y encola el envío", None), (2, 1, "Lee la batería y cierra el enlace", None),
        (0, 1, "Apaga con el interruptor", None), (2, 3, "Con cobertura: envía la cola", "opt"),
        (3, 2, "Acuse de recibo", "opt"),
    ]
    alto = 2.4 + len(pasos) * 0.95
    L = Lienzo(22.5, alto, escala=0.6)
    for x, a in zip(xs, actores):
        L.caja(a, x - 1.8, 0.2, 3.6, 1.1, a, "fuerte")
        L.ax.plot([x, x], [1.3, alto - 0.2], color="#9AA5A0", lw=1, ls=(0, (3, 3)), zorder=1)
    for i, (a, b, texto, tipo) in enumerate(pasos):
        y = 2.0 + i * 0.95
        if tipo == "opt":
            L.ax.add_patch(Rectangle((0.2, y - 0.45), 22.0, 0.9, fc=AZUL_C, ec="none", zorder=0))
        if a == b:
            x = xs[a]
            L.ax.plot([x, x + 0.9, x + 0.9, x + 0.08], [y - 0.25, y - 0.25, y + 0.2, y + 0.2], color=GRIS, lw=1.2, zorder=2)
            L.ax.annotate("", xy=(x + 0.02, y + 0.2), xytext=(x + 0.5, y + 0.2),
                          arrowprops=dict(arrowstyle="-|>", color=GRIS, lw=1.2), zorder=2)
            L.ax.text(x + 1.1, y, texto, ha="left", va="center", fontsize=8.6, color="#1B1B1B")
        else:
            x0, x1 = xs[a], xs[b]
            ret = b < a
            L.ax.annotate("", xy=(x1, y + 0.15), xytext=(x0, y + 0.15),
                          arrowprops=dict(arrowstyle="-|>", color=VERDE if not ret else GRIS, lw=1.3,
                                          ls=(0, (4, 2)) if ret else "-"), zorder=2)
            L.ax.text((x0 + x1) / 2, y - 0.18, texto, ha="center", va="center", fontsize=8.6, color="#1B1B1B",
                      bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"), zorder=3)
    L.nota(0.3, alto - 0.05, "Franjas azules: pasos opcionales que dependen de la red.")
    L.guardar("Secuencia de una jornada de medición")


def bloques_v3():
    L = Lienzo(26, 16.4, escala=0.6)
    f = 8.5
    L.grupo(0.2, 0.2, 7.6, 6.6, "USB-C: carga y programación")
    L.caja("j1", 0.6, 1.0, 6.8, 1.2, "Conector USB-C de 16 pines", "gris")
    L.caja("esd", 0.6, 2.9, 3.2, 1.4, "Protección ESD USBLC6-2SC6", "normal", fuente=f)
    L.caja("ptc", 4.2, 2.9, 3.2, 1.4, "PTC de 1,0 A en VBUS", "normal", fuente=f)
    L.caja("ch", 0.6, 5.0, 3.2, 1.4, "Puente USB-serie CH340C", "suave", fuente=f)
    L.grupo(8.4, 0.2, 17.4, 6.6, "Energía")
    L.caja("cel", 8.8, 1.0, 3.6, 1.4, "Celda LiPo de 2.000 mAh", "gris", fuente=f)
    L.caja("fus", 8.8, 3.0, 3.6, 1.4, "PTC de 1 A y puente JP1", "normal", fuente=f)
    L.caja("ntc", 14.0, 1.0, 3.2, 1.2, "Termistor NTC en la celda", "normal", fuente=f)
    L.caja("tp", 13.0, 3.0, 3.6, 1.4, "Cargador TP4056", "suave", fuente=f)
    L.caja("ruta", 17.2, 3.0, 4.0, 1.4, "Ruta de carga: P-MOSFET y Schottky", "normal", fuente=f)
    L.caja("sw", 17.2, 5.1, 4.0, 1.3, "Interruptor de panel", "normal", fuente=f)
    L.caja("ldo", 21.8, 3.0, 3.6, 1.4, "LDO de 3,3 V RT9080-33", "suave", fuente=f)
    L.caja("ele", 21.8, 5.1, 3.6, 1.3, "Elevador MT3608 con EN", "suave", fuente=f)
    L.caja("div", 8.8, 5.1, 3.6, 1.3, "Divisor 100 kΩ + 100 kΩ", "normal", fuente=f)
    L.grupo(0.2, 7.4, 13.0, 4.8, "Control y comunicación")
    L.caja("mcu", 4.0, 8.4, 5.4, 1.6, "Módulo ESP32-WROOM-32D con antena impresa", "fuerte", fuente=f)
    L.caja("bme", 0.6, 10.5, 3.2, 1.3, "BME280", "normal", fuente=f)
    L.caja("trx", 9.6, 10.5, 3.2, 1.3, "Transceptor SP3485", "normal", fuente=f)
    L.grupo(13.8, 7.4, 12.0, 4.8, "Sonda de suelo")
    L.caja("cor", 14.2, 8.4, 5.0, 1.6, "Corte de la sonda: AO3401A con AO3400A", "ambar", fuente=f)
    L.caja("bor", 14.2, 10.5, 5.0, 1.3, "Bornera de la sonda y TVS SM712", "normal", fuente=f)
    L.caja("son", 20.4, 10.5, 5.0, 1.3, "Sonda 7 en 1 RS-485", "gris", fuente=f)
    L.grupo(0.2, 13.2, 25.6, 3.0, "Interfaz de usuario")
    L.caja("led", 0.6, 14.3, 6.4, 1.4, "LED azul, verde y rojo con 330 Ω", "normal", fuente=f)
    L.caja("bz", 8.0, 14.3, 7.0, 1.4, "Buzzer YS-MBZ9042 con transistor S8050 y diodo", "normal", fuente=f)
    L.caja("pair", 16.0, 14.3, 4.4, 1.4, "Pulsador PAIR", "normal", fuente=f)
    L.flecha("j1", "esd", lado_a="ab", lado_b="ar")
    L.flecha("j1", "ptc", lado_a="ab", lado_b="ar")
    L.flecha("esd", "ch")
    L.flecha("ptc", "tp", "VBUS", lado_a="d", lado_b="ar", db=(-1.4, 0), puntos=[(8.1, 3.6), (8.1, 0.75), (13.4, 0.75)])
    L.flecha("cel", "fus")
    L.flecha("fus", "tp", doble=True)
    L.flecha("ntc", "tp", "TEMP", lado_a="ab", lado_b="ar", db=(0.8, 0))
    L.flecha("tp", "ruta")
    L.flecha("ruta", "sw")
    L.flecha("sw", "ldo", lado_a="d", lado_b="i", puntos=[(21.5, 5.75), (21.5, 3.7)])
    L.flecha("sw", "ele")
    L.flecha("fus", "div")
    L.flecha("ch", "mcu", "UART0, EN e IO0", lado_a="ab", lado_b="i", puntos=[(2.2, 9.2)], pos_texto=0.75, fuente=8)
    L.flecha("div", "mcu", "IO34", lado_a="ab", lado_b="ar", db=(1.2, 0), puntos=[(10.6, 7.9), (7.9, 7.9)], fuente=8)
    L.flecha("mcu", "bme", "I²C", lado_a="ab", lado_b="d", da=(-2.3, 0), fuente=8)
    L.flecha("mcu", "trx", "UART y DE/RE", lado_a="ab", lado_b="i", da=(1.8, 0), fuente=8)
    L.flecha("ele", "cor", "5 V", lado_a="ab", lado_b="ar", puntos=[(23.6, 7.1), (16.7, 7.1)])
    L.flecha("mcu", "cor", "IO5: EN y compuerta", lado_a="d", lado_b="i", fuente=8)
    L.flecha("cor", "bor")
    L.flecha("trx", "bor", "A y B")
    L.flecha("bor", "son", doble=True)
    L.flecha("mcu", "led", lado_a="ab", lado_b="ar", da=(-1.1, 0), puntos=[(5.6, 13.0), (3.8, 13.0)])
    L.flecha("mcu", "bz", "IO19", lado_a="ab", lado_b="ar", da=(-0.5, 0), puntos=[(6.2, 12.6), (11.5, 12.6)], fuente=8)
    L.flecha("pair", "mcu", "IO33", lado_a="ar", lado_b="ab", db=(0.6, 0), puntos=[(18.2, 12.45), (7.3, 12.45)], fuente=8)
    L.guardar("Diagrama de bloques del hardware del instrumento")


def alimentacion_v3():
    L = Lienzo(26, 10.4)
    r0, r1, r2, r3, h = 0.4, 2.6, 4.8, 7.0, 1.4
    L.caja("usb", 0.3, r0, 3.6, h, "USB-C: VBUS 5 V", "gris")
    L.caja("ptc", 4.8, r0, 3.0, h, "PTC 1,0 A", "normal")
    L.caja("sch", 9.0, r0, 3.6, h, "Diodo Schottky", "normal")
    L.caja("vs", 13.6, r0, 3.4, h, "Nodo de sistema", "fuerte")
    L.caja("sw", 18.0, r0, 3.4, h, "Interruptor de panel", "normal")
    L.caja("ldo", 22.2, r0, 3.6, h, "LDO RT9080-33: riel de 3,3 V", "suave")
    L.caja("ch", 0.3, r1, 3.6, h, "CH340C: sólo con USB", "normal")
    L.caja("ntc", 4.8, r1, 3.0, h, "NTC en la celda", "normal")
    L.caja("tp", 9.0, r1, 3.6, h, "TP4056: carga a 4,20 V", "suave")
    L.caja("car", 22.2, r1, 3.6, h, "ESP32, BME280, SP3485, LED y buzzer", "normal", fuente=8.2)
    L.caja("cel", 0.3, r2, 3.6, h, "Celda LiPo con protección", "gris")
    L.caja("fus", 4.8, r2, 3.0, h, "PTC 1 A y JP1", "normal")
    L.caja("nb", 9.0, r2, 3.6, h, "Nodo de celda: 3,0 a 4,2 V", "fuerte")
    L.caja("pm", 13.6, r2, 3.4, h, "P-MOSFET de ruta de carga", "normal")
    L.caja("ele", 22.2, r2, 3.6, h, "Elevador MT3608", "suave")
    L.caja("adc", 0.3, r3, 3.6, h, "IO34: medición de batería", "normal")
    L.caja("div", 4.8, r3, 3.0, h, "Divisor 100 kΩ + 100 kΩ", "normal")
    L.caja("son", 16.4, r3, 4.8, h, "Sonda: 5,00 V con IO5 alto y 0 V con IO5 bajo", "gris", fuente=8.4)
    L.caja("cor", 22.2, r3, 3.6, h, "Corte AO3401A con AO3400A", "ambar")
    L.flecha("usb", "ptc")
    L.flecha("ptc", "sch")
    L.flecha("sch", "vs")
    L.flecha("vs", "sw")
    L.flecha("sw", "ldo")
    L.flecha("ldo", "car", lado_a="ab", lado_b="ar")
    L.flecha("ptc", "ch", lado_a="ab", lado_b="ar", puntos=[(6.3, 2.2), (2.1, 2.2)])
    L.flecha("ptc", "tp", lado_a="d", lado_b="ar", da=(0, 0.35), puntos=[(8.4, 1.45), (8.4, 2.2), (10.8, 2.2)])
    L.flecha("ntc", "tp", "TEMP")
    L.flecha("tp", "nb", lado_a="ab", lado_b="ar")
    L.flecha("cel", "fus")
    L.flecha("fus", "nb")
    L.flecha("nb", "pm")
    L.flecha("pm", "vs", lado_a="ar", lado_b="ab")
    L.flecha("sw", "ele", lado_a="ab", lado_b="i", puntos=[(19.7, 5.5)])
    L.flecha("ele", "cor", lado_a="ab", lado_b="ar")
    L.flecha("cor", "son")
    L.flecha("nb", "div", lado_a="ab", lado_b="d", puntos=[(10.8, 7.7)])
    L.flecha("div", "adc")
    L.nota(0.3, 9.6, "La celda y el cargador quedan siempre unidos: el equipo carga con el interruptor abierto. El puente USB-serie sólo se alimenta desde VBUS.")
    L.guardar("Árbol de alimentación del instrumento")


def flujo_datos():
    L = Lienzo(27, 8.6)
    L.caja("s", 0.3, 0.6, 3.8, 1.8, "Sonda 7 en 1 y BME280", "gris")
    L.caja("e", 5.8, 0.6, 3.6, 1.8, "Equipo con ESP32", "fuerte")
    L.caja("p", 11.0, 0.6, 5.0, 1.8, "Aplicación: valida, diagnostica y georreferencia", "suave")
    L.caja("l", 11.0, 3.6, 5.0, 1.5, "Almacenamiento local y cola de envío", "normal", forma="cilindro")
    L.caja("n", 17.6, 3.6, 4.6, 1.5, "Base de datos con seguridad por fila", "normal", forma="cilindro")
    L.caja("w", 17.6, 0.6, 4.6, 1.8, "Servicio de pronóstico", "azul")
    L.caja("d", 23.2, 3.6, 3.4, 1.5, "Despachador de avisos", "azul", fuente=8.8)
    L.caja("b", 23.2, 6.4, 3.4, 1.4, "Consola de soporte", "normal", fuente=8.8)
    L.caja("f", 11.0, 6.4, 5.0, 1.4, "Taller: FAT por número de serie", "ambar")
    L.flecha("s", "e", "RS-485 e I²C")
    L.flecha("e", "p", "BLE, 20 bytes")
    L.flecha("p", "l")
    L.flecha("l", "n", "HTTPS con TLS")
    L.flecha("n", "b", lado_a="ab", lado_b="i", da=(1.3, 0))
    L.flecha("p", "w", "Ubicación y red", discontinua=True, color=AZUL)
    L.flecha("n", "d", discontinua=True, color=AZUL)
    L.flecha("f", "n", "Registro por número de serie", lado_a="d", lado_b="ab", db=(-0.9, 0), discontinua=True, color=AMBAR)
    L.nota(0.3, 8.3, "Líneas continuas: flujo de cada medición. Discontinuas: servicios que dependen de la red y registro de fábrica.")
    L.guardar("Flujo de datos y digitalización del proceso")


# --------------------------------------------------------------------------- capítulo VII y VIII
def montaje():
    L = Lienzo(19.2, 25, escala=0.5)
    pasos = [
        ("a1", "Recibir la placa con sus componentes montados e inspeccionar", "normal"),
        ("a2", "Programar el firmware por USB", "normal"),
        ("a3", "Prueba eléctrica por etapas con los puntos de prueba", "normal"),
        ("d1", "¿Pasa la prueba?", "rombo"),
        ("a5", "Cablear celda, interruptor y sonda", "normal"),
        ("a6", "Instalar insertos, interruptor, respiradero, prensaestopa y tapón", "normal"),
        ("a7", "Fijar la placa sobre los separadores y conectar la celda", "normal"),
        ("a8", "Colocar el cordón de silicona y cerrar con los cuatro tornillos", "normal"),
        ("a9", "FAT: prueba de aceptación en fábrica", "suave"),
        ("d2", "¿Pasa el FAT?", "rombo"),
        ("a11", "Etiquetar con el número de serie y embalar", "fuerte"),
    ]
    y = 0.3
    for k, t, e in pasos:
        if e == "rombo":
            L.caja(k, 3.5, y, 7.0, 2.4, t, "ambar", forma="rombo")
            y += 2.9
        else:
            L.caja(k, 2.5, y, 9.0, 1.5, t, e)
            y += 2.0
    ks = [p[0] for p in pasos]
    for a, b in zip(ks[:-1], ks[1:]):
        L.flecha(a, b, "Sí" if a.startswith("d") else None, lado_a="ab", lado_b="ar")
    x, yy, w, h = L.cajas["d1"]
    L.caja("r1", 13.0, yy + 0.45, 4.6, 1.5, "Retrabajo o descarte", "alerta")
    L.flecha("d1", "r1", "No", lado_a="d", lado_b="i")
    L.flecha("r1", "a3", lado_a="ar", lado_b="d", db=(0, 0.3), puntos=[(15.3, L.cajas["a3"][1] + 1.05)])
    x, yy, w, h = L.cajas["d2"]
    L.caja("r2", 13.0, yy + 0.45, 4.6, 1.5, "Abrir y diagnosticar", "alerta")
    L.flecha("d2", "r2", "No", lado_a="d", lado_b="i")
    ya3 = L.cajas["a3"][1] + 0.75
    L.flecha("r2", "a3", lado_a="d", lado_b="d", db=(0, -0.4), puntos=[(18.6, L.cajas["r2"][1] + 0.75), (18.6, ya3 - 0.4)])
    L.guardar("Secuencia de montaje del equipo")


def fabricacion():
    L = Lienzo(26, 7.4)
    est = ["1. Recepción de placa y componentes", "2. Placa montada: fabricante con retoque, o taller en prototipos",
           "3. Programación por USB y lectura del identificador", "4. Ensamble mecánico y cableado",
           "5. FAT al 100 % de las unidades", "6. Etiquetado, embalaje y despacho"]
    for i, t in enumerate(est):
        L.caja("e%d" % i, 0.3 + i * 4.3, 1.2, 3.7, 2.2, t, "fuerte" if i == 4 else "suave", fuente=8.8)
    for i in range(5):
        L.flecha("e%d" % i, "e%d" % (i + 1))
    L.caja("imp", 12.9, 4.6, 3.7, 1.4, "Impresión de carcasas por lotes", "normal", fuente=8.8)
    L.flecha("imp", "e3", lado_a="ar", lado_b="ab")
    L.caja("ret", 17.2, 4.6, 3.7, 1.4, "Retrabajo o descarte", "alerta", fuente=8.8)
    L.flecha("e4", "ret", "Falla", lado_a="ab", lado_b="ar", discontinua=True, color=ROJO)
    L.flecha("ret", "e2", "Vuelve a programación", lado_a="ab", lado_b="ab", puntos=[(19.05, 6.6), (10.75, 6.6)], discontinua=True, color=ROJO)
    L.guardar("Proceso de fabricación por estaciones")


def gantt():
    import anexos as A
    plan = A.plan_proyecto()
    try:
        holg = A.holguras()
    except Exception:  # noqa: BLE001
        holg = {}
    corte = date.fromisoformat(A.FECHA_CORTE)
    filas = [p for p in plan]
    fig, ax = plt.subplots(figsize=(15, 0.36 * len(filas) + 1.9))
    d0 = date(2026, 7, 1)            # inicio del Q3 de 2026
    dfin = date(2027, 10, 1)         # fin del Q3 de 2027
    for i, p in enumerate(filas):
        edt, nombre, area, ini, fin, pred, entr, tipo = p
        a, b = date.fromisoformat(ini), date.fromisoformat(fin)
        y = i
        etiqueta = ("%s  %s" % (edt, nombre))
        if tipo == "fase":
            ax.text(-2, y, etiqueta, ha="right", va="center", fontsize=8.6, fontweight="bold", color=VERDE)
            ax.add_patch(Rectangle(((a - d0).days, y - 0.12), (b - a).days + 1, 0.24, fc=VERDE, ec="none"))
            continue
        ax.text(-2, y, etiqueta if len(etiqueta) < 70 else etiqueta[:67] + "…", ha="right", va="center", fontsize=8.2)
        h = holg.get(edt) if isinstance(holg, dict) else None
        critica = (h == 0) if h is not None else False
        hecho = b < corte
        color = GRIS_C if tipo == "operacion" else ("#9DB8A6" if hecho else (ROJO if critica else VERDE_M))
        if tipo == "hito":
            x = (a - d0).days
            ax.add_patch(Polygon([(x, y - 0.35), (x + 3.5, y), (x, y + 0.35), (x - 3.5, y)], fc=AMBAR if not hecho else "#9DB8A6", ec="black", lw=0.6))
            ax.text(x + 5, y, a.strftime("%d-%m-%Y"), va="center", fontsize=7.4, color=GRIS)
        else:
            ax.add_patch(Rectangle(((a - d0).days, y - 0.3), (b - a).days + 1, 0.6, fc=color,
                                   ec=GRIS if tipo == "operacion" else "none", ls=(0, (3, 2)) if tipo == "operacion" else "-"))
    # División por trimestres (Q), con los meses como subdivisión tenue
    nombres = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    m = d0
    while m < dfin:
        x = (m - d0).days
        siguiente = date(m.year + (m.month == 12), m.month % 12 + 1, 1)
        if (m.month - 1) % 3 == 0:
            fin_q = date(m.year + (m.month >= 10), (m.month + 2) % 12 + 1, 1)
            ancho = (fin_q - m).days
            ax.add_patch(Rectangle((x, -2.55), ancho, 0.75, fc=VERDE if ((m.month - 1) // 3) % 2 == 0 else VERDE_M, ec="white", lw=1.5, clip_on=False))
            ax.text(x + ancho / 2, -2.17, "Q%d %d" % ((m.month - 1) // 3 + 1, m.year), ha="center", va="center", fontsize=9.5,
                    color="white", fontweight="bold")
            ax.axvline(x, color="#9AA59C", lw=1.3, zorder=0)
        else:
            ax.axvline(x, color="#E4E7E2", lw=0.6, zorder=0)
        ax.text(x + (siguiente - m).days / 2, -1.2, nombres[m.month - 1], ha="center", fontsize=7.4, color=GRIS)
        m = siguiente
    ax.axvline((dfin - d0).days, color="#9AA59C", lw=1.3, zorder=0)
    xc = (corte - d0).days
    ax.axvline(xc, color=AZUL, lw=1.2, ls=(0, (4, 2)))
    ax.text(xc, len(filas) + 0.3, "Corte %s" % corte.strftime("%d-%m-%Y"), color=AZUL, fontsize=8, ha="center")
    ax.set_xlim(0, (dfin - d0).days)
    ax.axis("off")
    ley = [("Ejecutado", "#9DB8A6"), ("Planificado", VERDE_M), ("Ruta crítica", ROJO), ("Hito", AMBAR), ("Operación (fuera del alcance)", GRIS_C)]
    for j, (t, c) in enumerate(ley):
        ax.add_patch(Rectangle((j * 90, len(filas) + 1.4), 12, 0.5, fc=c, ec=GRIS, lw=0.5, clip_on=False))
        ax.text(j * 90 + 15, len(filas) + 1.65, t, va="center", fontsize=8.2, clip_on=False)
    ax.set_ylim(len(filas) + 2.2, -2.7)
    fig.savefig(os.path.join(DESTINO, FIGURAS["Carta Gantt del proyecto"]), dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# --------------------------------------------------------------------------- capturas
def capturas():
    origen = os.path.join(RAIZ, "Comercializacion de Tecnologias", "Unidad 2", "Figuras")
    shutil.copyfile(os.path.join(origen, "app_mosaico.png"), os.path.join(DESTINO, FIGURAS["Aplicación móvil: inicio, tema oscuro, vinculación y preferencias"]))
    import matplotlib.image as mpimg
    # Capturas de la consola tomadas por el equipo; se recorta la barra del navegador.
    buscar = mpimg.imread(os.path.join(DESTINO, "buscar_equipo.png"))
    ficha = mpimg.imread(os.path.join(DESTINO, "dashboard_control.png"))
    buscar = buscar[int(buscar.shape[0] * 0.10):int(buscar.shape[0] * 0.47), :]
    ficha = ficha[int(ficha.shape[0] * 0.05):, :]
    fig, axs = plt.subplots(2, 1, figsize=(12, 9.6), gridspec_kw={"height_ratios": [0.42, 1]})
    for a, img, t in zip(axs, (buscar, ficha), ("Búsqueda por identificador o correo", "Ficha del equipo: estado, usuarios, mediciones y actualización")):
        a.imshow(img)
        a.axis("off")
        a.set_title(t, fontsize=11, color=VERDE)
    fig.tight_layout()
    fig.savefig(os.path.join(DESTINO, FIGURAS["Consola de soporte: búsqueda de equipos y ficha del equipo"]), dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)


# --------------------------------------------------------------------------- placa y carcasa del instrumento
PCB_V3 = os.path.join(RAIZ, "PCB", "V3", "V3.kicad_pcb")
KICAD_CLI = os.environ.get("KICAD_CLI") or shutil.which("kicad-cli") or r"C:\Program Files\KiCad\9.0\bin\kicad-cli.exe"
PLACA_W, PLACA_H = 90.0, 64.0
ORIGEN_PCB = (100.0, 100.0)    # esquina superior izquierda del contorno en coordenadas de KiCad
ANTENA = 6.3                   # vuelo de la antena del módulo sobre el borde superior
AGUJEROS = ((3.2, 3.2), (86.8, 3.2), (3.2, 60.8), (86.8, 60.8))
PARED, HOLGURA, HOLGURA_ANTENA, HOLGURA_BORNERAS = 2.5, 2.0, 1.5, 10.2
DX = PARED + HOLGURA
DY = PARED + HOLGURA_ANTENA + ANTENA
CARCASA_W = PLACA_W + 2 * DX
CARCASA_L = DY + PLACA_H + HOLGURA_BORNERAS + PARED
CARCASA_H = 31.0
# posiciones de diseño en la placa (mm desde la esquina superior izquierda del contorno)
LED = ((39.0, 31.0), (45.0, 31.0), (51.0, 31.0))
PAIR = (45.0, 25.5)
BUZZER = (80.0, 8.75)
USB_Y = 11.0
BME = (87.0, 26.0)
SONDA_X = 69.5                 # centro de la bornera de cuatro vías
INTERRUPTOR_X = 36.5           # centro de la bornera del interruptor


def mm_txt(v):
    return ("%.1f" % v).replace(".", ",")


def renders_placa():
    """Renders 3D y vistas de cobre de PCB/V3/V3.kicad_pcb con kicad-cli; sin KiCad se usan las imágenes versionadas."""
    import subprocess
    salidas = ("render_placa_superior.png", "render_placa_iso.png", "ruteo_superior.png", "ruteo_inferior.png")
    if not (os.path.exists(KICAD_CLI) and os.path.exists(PCB_V3)):
        for nombre in salidas:
            if not os.path.isfile(os.path.join(DESTINO, nombre)):
                raise FileNotFoundError(f"Falta {nombre}; configura KICAD_CLI para generar las vistas de la placa.")
        print("KiCad no disponible: se usan las vistas de la placa versionadas.")
        return
    for nombre, extra in (("render_placa_superior.png", ["--side", "top", "--width", "2000", "--height", "1600"]),
                          ("render_placa_iso.png", ["--width", "2000", "--height", "1500", "--perspective", "--rotate", " -50,0,-30", "--zoom", "0.9"])):
        resultado = subprocess.run([KICAD_CLI, "pcb", "render", "--quality", "high", "--background", "opaque", "-o",
                                    os.path.join(DESTINO, nombre)] + extra + [PCB_V3], capture_output=True, timeout=300)
        if resultado.returncode:
            raise RuntimeError(resultado.stderr.decode("utf-8", errors="replace"))
    import tempfile
    import pymupdf
    ox, oy = ORIGEN_PCB
    for nombre, capas, espejo in (("ruteo_superior.png", "F.Cu,F.Silkscreen,Edge.Cuts", False), ("ruteo_inferior.png", "B.Cu,Edge.Cuts", True)):
        with tempfile.TemporaryDirectory() as tmp:
            pdf = os.path.join(tmp, "capa.pdf")
            args = [KICAD_CLI, "pcb", "export", "pdf", "--layers", capas, "--mode-single", "-o", pdf, PCB_V3]
            if espejo:
                args.insert(-1, "--mirror")
            resultado = subprocess.run(args, capture_output=True, timeout=180)
            if resultado.returncode:
                raise RuntimeError(resultado.stderr.decode("utf-8", errors="replace"))
            doc = pymupdf.open(pdf)
            pag = doc[0]
            k = 72 / 25.4
            if espejo:
                x0 = pag.rect.width / k - (ox + PLACA_W)
            else:
                x0 = ox
            clip = pymupdf.Rect((x0 - 1) * k, (oy - 1) * k, (x0 + PLACA_W + 1) * k, (oy + PLACA_H + 1) * k)
            pag.get_pixmap(dpi=300, clip=clip).save(os.path.join(DESTINO, nombre))
            doc.close()


def placa_3d():
    import matplotlib.image as mpimg
    ruta = os.path.join(DESTINO, "render_placa_iso.png")
    if not os.path.exists(ruta):
        return
    img = mpimg.imread(ruta)
    fig = plt.figure(figsize=(11, 8.2))
    a = fig.add_axes([0, 0, 1, 1])
    a.imshow(img)
    a.axis("off")
    fig.savefig(os.path.join(DESTINO, FIGURAS["Placa del instrumento: vista tridimensional"]), dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)


def plano_placa():
    import matplotlib.image as mpimg
    import numpy as np
    ruta = os.path.join(DESTINO, "render_placa_superior.png")
    if not os.path.exists(ruta):
        return
    img = mpimg.imread(ruta)[:, :, :3]
    verde = (img[:, :, 1] > img[:, :, 0] + 0.04) & (img[:, :, 1] > img[:, :, 2] + 0.02) & (img[:, :, 1] < 0.55)
    cols = np.where(verde.sum(0) > 150)[0]
    filas = np.where(verde.sum(1) > 150)[0]
    x0, y0 = cols.min(), filas.min()
    esc = (cols.max() - cols.min()) / PLACA_W
    P = lambda x, y: (x0 + x * esc, y0 + y * esc)
    fig, ax = plt.subplots(figsize=(13, 10.5))
    ax.imshow(img)
    ax.set_xlim(x0 - 34 * esc, x0 + (PLACA_W + 36) * esc)
    ax.set_ylim(y0 + (PLACA_H + 16) * esc, y0 - 12 * esc)
    ax.axis("off")

    def cota(xa, ya, xb, yb, texto, desplaz=(0, 0), rot=0):
        (pa, qa), (pb, qb) = P(xa, ya), P(xb, yb)
        ax.annotate("", xy=(pa, qa), xytext=(pb, qb), arrowprops=dict(arrowstyle="<->", color="black", lw=1.2))
        ax.text((pa + pb) / 2 + desplaz[0] * esc, (qa + qb) / 2 + desplaz[1] * esc, texto, ha="center", va="center",
                fontsize=10, rotation=rot, bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none"))

    cota(0, PLACA_H + 5, PLACA_W, PLACA_H + 5, "%s mm" % mm_txt(PLACA_W))
    cota(PLACA_W + 4, 0, PLACA_W + 4, PLACA_H, "%s mm" % mm_txt(PLACA_H), rot=90)
    cota(57.0, -ANTENA, 57.0, 0, "%s mm" % mm_txt(ANTENA), desplaz=(3.4, 0), rot=90)
    for xm, ym in AGUJEROS:
        px, py = P(xm, ym)
        ax.plot([px], [py], marker="+", color="#FFE36E", ms=14, mew=2)
    notas = [
        (45.0, -3.4, 75.0, -9.0, "Antena del ESP32-WROOM-32D fuera del contorno"),
        (2.0, USB_Y, -8.0, 4.0, "USB-C de 16 pines"),
        (12.5, 11.0, -8.0, 12.0, "ESD USBLC6 y PTC"),
        (24.0, 9.0, -8.0, 20.0, "Cargador TP4056"),
        (7.5, 30.0, -8.0, 30.0, "Puente USB-serie CH340C"),
        (26.5, 30.5, -8.0, 38.0, "Pulsadores EN y BOOT"),
        (8.0, 44.0, -8.0, 46.0, "Protección y medición de celda"),
        (BUZZER[0], BUZZER[1], PLACA_W + 9, 4.0, "Buzzer"),
        (BME[0], BME[1], PLACA_W + 9, 18.0, "BME280 y ranura térmica"),
        (PAIR[0], PAIR[1], PLACA_W + 9, 26.0, "Pulsador PAIR"),
        (LED[2][0], LED[2][1], PLACA_W + 9, 32.0, "LED azul, verde y rojo"),
        (39.5, 39.0, PLACA_W + 9, 38.0, "LDO RT9080-33"),
        (48.5, 47.0, PLACA_W + 9, 44.0, "Elevador MT3608 y bobina"),
        (68.0, 42.0, PLACA_W + 9, 50.0, "RS-485: SP3485 y SM712"),
        (11.5, 57.0, 11.5, PLACA_H + 12, "Celda"),
        (24.0, 57.0, 24.0, PLACA_H + 12, "Termistor"),
        (36.5, 57.0, 36.5, PLACA_H + 12, "Interruptor"),
        (SONDA_X, 57.0, SONDA_X, PLACA_H + 12, "Sonda: +, −, A y B"),
        (3.2, 60.8, -8.0, 56.0, "Agujeros M2 (+)"),
    ]
    for xa, ya, xb, yb, t in notas:
        pa, qa = P(xa, ya)
        pb, qb = P(xb, yb)
        ax.annotate(t, xy=(pa, qa), xytext=(pb, qb), fontsize=9.5, color="#1B1B1B", ha="left" if xb > PLACA_W else ("right" if xb < 0 else "center"),
                    va="center", arrowprops=dict(arrowstyle="-", color=GRIS, lw=0.9),
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec=GRIS_C))
    fig.savefig(os.path.join(DESTINO, FIGURAS["Plano de la placa del instrumento"]), dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)


def ruteo_placa():
    import matplotlib.image as mpimg
    sup, inf = (os.path.join(DESTINO, n) for n in ("ruteo_superior.png", "ruteo_inferior.png"))
    if not (os.path.exists(sup) and os.path.exists(inf)):
        return
    fig, axs = plt.subplots(1, 2, figsize=(15, 5.9))
    for a, ruta, t in zip(axs, (sup, inf), ("Cara superior: pistas, plano de masa y serigrafía", "Cara inferior (vista en espejo): pistas y plano de masa")):
        a.imshow(mpimg.imread(ruta))
        a.axis("off")
        a.set_title(t, fontsize=11, color=VERDE)
    fig.tight_layout()
    fig.savefig(os.path.join(DESTINO, FIGURAS["Ruteo de la placa: cara superior e inferior"]), dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)


def carcasa_concepto():
    """Esquema funcional de la envolvente: qué cumple cada elemento, sin representar la forma final."""
    L = Lienzo(26, 13.6, escala=0.58)
    f = 8.6
    # corte esquemático
    L.ax.add_patch(Rectangle((3.0, 2.0), 13.0, 0.55, fc="#C9CEC6", ec=GRIS, lw=1.2))
    L.ax.add_patch(Rectangle((3.0, 2.55), 13.0, 0.18, fc=AMBAR, ec="none"))
    L.ax.add_patch(Rectangle((3.0, 2.73), 0.45, 7.3, fc="#D5DAD2", ec=GRIS, lw=1.2))
    L.ax.add_patch(Rectangle((15.55, 2.73), 0.45, 7.3, fc="#D5DAD2", ec=GRIS, lw=1.2))
    L.ax.add_patch(Rectangle((3.0, 10.03), 13.0, 0.45, fc="#D5DAD2", ec=GRIS, lw=1.2))
    L.ax.add_patch(Rectangle((4.2, 5.1), 10.6, 0.3, fc=VERDE, ec=VERDE))
    for xc in (4.9, 6.4, 8.4, 10.6, 12.6):
        L.ax.add_patch(Rectangle((xc, 4.45), 0.9, 0.65, fc="#9AA0A6", ec=GRIS, lw=0.6))
    for xs in (4.6, 14.2):
        L.ax.add_patch(Rectangle((xs, 5.4), 0.25, 4.63, fc="#BFC6BC", ec=GRIS, lw=0.6))
    L.ax.add_patch(Rectangle((5.6, 7.2), 7.8, 2.8, fc=AMBAR_C, ec=AMBAR, lw=1.1))
    L.ax.text(9.5, 8.6, "Celda LiPo 2.000 mAh", ha="center", va="center", fontsize=f)
    for xl, c in ((7.6, "#3B82F6"), (8.3, "#22C55E"), (9.0, "#EF4444")):
        L.ax.add_patch(Circle((xl, 2.27), 0.2, fc=c, ec="black", lw=0.5))
    L.ax.add_patch(Rectangle((10.2, 2.05), 0.8, 0.45, fc="#C9CEC6", ec="black", lw=0.6))
    L.ax.add_patch(Rectangle((2.6, 4.5), 0.8, 0.9, fc="#9AA0A6", ec="black", lw=0.8))      # USB-C
    L.ax.add_patch(Rectangle((15.6, 3.6), 0.8, 1.2, fc="#C9CEC6", ec="black", lw=0.8))     # respiradero
    L.ax.add_patch(Rectangle((11.6, 10.0), 1.4, 0.9, fc="#C9CEC6", ec="black", lw=0.8))    # prensaestopa
    L.ax.plot([12.3, 12.3, 13.4], [10.9, 12.4, 13.2], color="black", lw=2.2)
    L.ax.add_patch(Rectangle((6.0, 10.0), 0.8, 0.8, fc="#9AA0A6", ec="black", lw=0.8))     # interruptor
    L.ax.text(9.5, 1.4, "Esquema funcional en corte: no representa la forma final de la carcasa", ha="center", fontsize=f, style="italic", color=GRIS)

    def nota(xa, ya, xb, yb, texto, ha="left"):
        L.ax.annotate(texto, xy=(xa, ya), xytext=(xb, yb), fontsize=f, ha=ha, va="center", color="#1B1B1B",
                      arrowprops=dict(arrowstyle="-", color=GRIS, lw=0.9), bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=GRIS_C))

    nota(8.3, 2.1, 17.6, 0.7, "Tapa con ventanas para los tres LED y el pulsador PAIR")
    nota(14.0, 2.64, 17.6, 2.0, "Junta de silicona comprimida por cuatro tornillos M3")
    nota(16.4, 4.2, 17.6, 3.6, "Respiradero con membrana, frente al sensor ambiental")
    nota(13.0, 5.25, 17.6, 5.3, "Placa electrónica sobre separadores M2")
    nota(13.4, 8.6, 17.6, 7.4, "Celda bajo la placa, sujeta por nervios de la base")
    nota(12.3, 10.5, 17.6, 9.4, "Prensaestopa del cable de la sonda (alivio de tracción)")
    nota(13.4, 13.2, 17.6, 12.6, "Cable hacia la sonda de suelo")
    nota(2.6, 4.95, 0.2, 4.0, "USB-C con tapón\nde silicona", ha="left")
    nota(6.4, 10.8, 0.2, 12.4, "Interruptor de palanca\ncon capuchón estanco", ha="left")
    L.guardar("Concepto funcional de la carcasa")


def carcasa():
    from matplotlib.patches import FancyBboxPatch as FB
    fig = plt.figure(figsize=(14, 10.5))
    W, L, Hc, pared = CARCASA_W, CARCASA_L, CARCASA_H, PARED
    base_placa = 14.0                          # cara inferior de la placa sobre la base
    sep = base_placa - pared                   # largo de los separadores

    def cota(ax, xa, ya, xb, yb, t, d=(0, 0), rot=0):
        ax.annotate("", xy=(xa, ya), xytext=(xb, yb), arrowprops=dict(arrowstyle="<->", lw=1.0))
        ax.text((xa + xb) / 2 + d[0], (ya + yb) / 2 + d[1], t, ha="center", va="center", fontsize=8.6, rotation=rot,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))

    # Planta
    ax = fig.add_axes([0.02, 0.30, 0.46, 0.66])
    ax.set_title("Planta, vista superior sin tapa", fontsize=11, color=VERDE)
    ax.add_patch(FB((0, 0), W, L, boxstyle="round,pad=0,rounding_size=4", fc="#E9ECE6", ec=GRIS, lw=2))
    ax.add_patch(Rectangle((pared, pared), W - 2 * pared, L - 2 * pared, fc="#F8F9F6", ec="#B8BFB5"))
    ax.add_patch(Rectangle((DX, DY), PLACA_W, PLACA_H, fc="none", ec=VERDE_M, lw=1.4, ls=(0, (4, 3))))
    ax.add_patch(Rectangle((DX + 45.0 - 9.0, DY - ANTENA), 18.0, ANTENA, fc=AZUL_C, ec=AZUL, lw=1))
    ax.text(DX + 45.0, DY - ANTENA / 2, "Antena", ha="center", va="center", fontsize=7.5, color=AZUL)
    cx, cy = DX + PLACA_W / 2 - 17.0, DY + 6.0
    ax.add_patch(Rectangle((cx, cy), 34.0, 54.0, fc="none", ec=AMBAR, lw=1.2, ls=(0, (2, 2))))
    ax.text(cx + 17.0, cy + 47.0, "Celda bajo la placa\n34 × 54 × 10 mm", ha="center", fontsize=7.5, color=AMBAR)
    for x, y in ((6, 6), (W - 6, 6), (6, L - 6), (W - 6, L - 6)):
        ax.add_patch(Rectangle((x - 6, y - 6), 12, 12, fc="#D5DAD2", ec=GRIS, lw=0.8))
        ax.add_patch(Circle((x, y), 1.7, fc="white", ec=GRIS))
    for x, y in AGUJEROS:
        ax.add_patch(Circle((DX + x, DY + y), 3.0, fc="none", ec=VERDE, lw=1.1))
        ax.add_patch(Circle((DX + x, DY + y), 0.9, fc=VERDE))
    for (x, y), c in zip(LED, ("#3B82F6", "#22C55E", "#EF4444")):
        ax.add_patch(Circle((DX + x, DY + y), 1.5, fc=c, ec="black", lw=0.5))
    ax.add_patch(Circle((DX + PAIR[0], DY + PAIR[1]), 2.5, fc="#C9CEC6", ec="black", lw=0.7))
    ax.text(DX + PAIR[0], DY + PAIR[1] - 4.0, "PAIR", ha="center", fontsize=7.5)
    ax.add_patch(Circle((DX + BUZZER[0], DY + BUZZER[1]), 5, fc="none", ec="black", lw=0.7, ls=(0, (2, 2))))
    ax.text(DX + BUZZER[0], DY + BUZZER[1] + 7.5, "Zona acústica", ha="center", fontsize=7.5)
    yu = DY + USB_Y
    ax.add_patch(Rectangle((-1.5, yu - 4.75), 4.0, 9.5, fc="#9AA0A6", ec="black"))
    ax.text(-2.5, yu, "USB-C\nY = %s" % mm_txt(yu), ha="right", va="center", fontsize=8)
    yr = DY + BME[1]
    ax.add_patch(Rectangle((W - 2.5, yr - 6.0), 4.0, 12.0, fc="#C9CEC6", ec="black"))
    ax.text(W + 2.4, yr, "Respiradero\nY = %s" % mm_txt(yr), ha="left", va="center", fontsize=8)
    xp = DX + SONDA_X
    ax.add_patch(Rectangle((xp - 6.4, L - 2.5), 12.8, 4.0, fc="#C9CEC6", ec="black"))
    ax.text(xp, L + 4.6, "Prensaestopa PG7\nX = %s" % mm_txt(xp), ha="center", va="center", fontsize=8)
    xi = DX + INTERRUPTOR_X
    ax.add_patch(Rectangle((xi - 3.1, L - 2.5), 6.2, 4.0, fc="#9AA0A6", ec="black"))
    ax.text(xi, L + 4.6, "Interruptor\nX = %s" % mm_txt(xi), ha="center", va="center", fontsize=8)
    cota(ax, 0, -5, W, -5, "%s mm" % mm_txt(W))
    cota(ax, -14, 0, -14, L, "%s mm" % mm_txt(L), rot=90)
    ax.set_xlim(-22, W + 20)
    ax.set_ylim(L + 10, -10)
    ax.set_aspect("equal")
    ax.axis("off")
    # Vista frontal (pared inferior)
    ax = fig.add_axes([0.52, 0.62, 0.46, 0.32])
    ax.set_title("Vista frontal, pared de los cables", fontsize=11, color=VERDE)
    ax.add_patch(Rectangle((0, 0), W, Hc - 2.5, fc="#E9ECE6", ec=GRIS, lw=1.6))
    ax.add_patch(Rectangle((0, Hc - 2.5), W, 2.5, fc="#D5DAD2", ec=GRIS, lw=1.6))
    ax.add_patch(Circle((xp, 20.0), 6.4, fc="white", ec="black"))
    ax.text(xp, 20.0, "PG7", ha="center", va="center", fontsize=8)
    ax.add_patch(Circle((xi, 20.0), 3.1, fc="white", ec="black"))
    cota(ax, 0, -3.5, W, -3.5, "%s mm" % mm_txt(W))
    cota(ax, W + 4, 0, W + 4, Hc, "%s mm" % mm_txt(Hc), rot=90)
    ax.text(W / 2, Hc - 1.25, "Tapa 2,5 mm", ha="center", va="center", fontsize=7.5)
    ax.set_xlim(-4, W + 10)
    ax.set_ylim(-7, Hc + 3)
    ax.set_aspect("equal")
    ax.axis("off")
    # Corte
    ax = fig.add_axes([0.52, 0.10, 0.46, 0.44])
    ax.set_title("Corte por el centro, de la antena a las borneras", fontsize=11, color=VERDE)
    ax.add_patch(Rectangle((0, 0), L, pared, fc="#D5DAD2", ec=GRIS))
    ax.add_patch(Rectangle((0, 0), pared, Hc - pared, fc="#D5DAD2", ec=GRIS))
    ax.add_patch(Rectangle((L - pared, 0), pared, Hc - pared, fc="#D5DAD2", ec=GRIS))
    ax.add_patch(Rectangle((0, Hc - pared), L, pared, fc="#C9CEC6", ec=GRIS))
    ax.add_patch(Rectangle((DY + 6.0, pared), 54.0, 10.0, fc=AMBAR_C, ec=AMBAR))
    ax.text(DY + 33.0, pared + 5, "Celda LiPo 2.000 mAh", ha="center", va="center", fontsize=8)
    ax.add_patch(Rectangle((DY, base_placa), PLACA_H, 1.6, fc=VERDE, ec=VERDE))
    ax.add_patch(Rectangle((DY - ANTENA, base_placa), ANTENA, 1.0, fc=AZUL_C, ec=AZUL))
    ax.add_patch(Rectangle((DY + 0.3, base_placa + 1.6), 19.5, 3.1, fc="#EDEDED", ec=GRIS))
    ax.text(DY + 10.0, base_placa + 3.2, "ESP32", ha="center", va="center", fontsize=7.5)
    ax.add_patch(Rectangle((DY + PLACA_H - 9.4, base_placa + 1.6), 9.4, 11.0, fc="#7CCB8F", ec=VERDE))
    ax.text(DY + PLACA_H - 4.7, base_placa + 7.0, "Borneras", ha="center", va="center", fontsize=7.5, rotation=90)
    for y in (AGUJEROS[0][1], AGUJEROS[2][1]):
        ax.add_patch(Rectangle((DY + y - 1.0, pared), 2.0, sep, fc="#BFC6BC", ec=GRIS))
    alto_borneras = 11.0
    libre = Hc - pared - (base_placa + 1.6 + alto_borneras)
    cota(ax, -4, 0, -4, Hc, mm_txt(Hc), rot=90)
    cota(ax, L + 3, pared, L + 3, base_placa, mm_txt(sep), rot=90)
    cota(ax, L + 9, base_placa + 1.6, L + 9, base_placa + 1.6 + alto_borneras, mm_txt(alto_borneras), rot=90)
    cota(ax, DY + PLACA_H, 22.0, L - pared, 22.0, mm_txt(HOLGURA_BORNERAS))
    ax.text(L / 2, -4.0, "Separadores M2 de %s mm · placa a %s mm de la base · %s mm libres bajo la tapa" % (mm_txt(sep), mm_txt(base_placa), mm_txt(libre)),
            ha="center", fontsize=8)
    ax.set_xlim(-8, L + 13)
    ax.set_ylim(-7, Hc + 3)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.text(0.02, 0.05, "Cotas en mm. Planta medida desde la esquina exterior superior izquierda; la placa queda desplazada %s mm en X y %s mm en Y "
                         "(pared, holgura y espacio de la antena)." % (mm_txt(DX), mm_txt(DY)), fontsize=9, color=GRIS)
    fig.savefig(os.path.join(DESTINO, FIGURAS["Carcasa: planta, vista frontal y corte"]), dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)


def anexos_geometricos():
    """PDF de los planos de la placa y de la carcasa; no son documentos de liberación a fabricación."""
    from matplotlib.backends.backend_pdf import PdfPages
    import matplotlib.image as mpimg

    destino = Path(RAIZ) / "Evaluacion" / "Evaluacion 2" / "Anexos"
    destino.mkdir(exist_ok=True)
    for antiguo in ("Anexo C - Distribucion conceptual placa V3.pdf", "Anexo D - Geometria conceptual carcasa V3.pdf"):
        if (destino / antiguo).exists():
            (destino / antiguo).unlink()
    anexos = (
        ("Anexo C - Placa TerraSense.pdf", "Anexo C · Placa del instrumento", (
            ("Placa del instrumento: vista tridimensional", "Vista tridimensional de la placa ruteada"),
            ("Plano de la placa del instrumento", "Vista superior y cotas del contorno"),
            ("Ruteo de la placa: cara superior e inferior", "Pistas y planos de masa de ambas caras"),
        ), "Placa de diseño ruteada en dos capas, con planos de masa en ambas caras. Se libera a fabricación tras la revisión de reglas de diseño y del montaje en la carcasa."),
        ("Anexo D - Carcasa TerraSense.pdf", "Anexo D · Geometría de la carcasa", (
            ("Carcasa: planta, vista frontal y corte", "Planta, vista frontal y corte de la envolvente"),
        ), "Envolvente de diseño. Las cotas nominales definen el montaje; el ajuste y la estanqueidad se validan con el prototipo impreso."),
    )
    for nombre, titulo, paginas, nota in anexos:
        with PdfPages(destino / nombre, metadata={"Title": titulo, "Author": "TerraSense"}) as pdf:
            for figura, subtitulo in paginas:
                fig = plt.figure(figsize=(11.69, 8.27))
                fig.text(0.05, 0.95, titulo, fontsize=15, color=VERDE, weight="bold")
                fig.text(0.05, 0.91, subtitulo, fontsize=11)
                ax = fig.add_axes([0.04, 0.14, 0.92, 0.73])
                ax.imshow(mpimg.imread(os.path.join(DESTINO, FIGURAS[figura])))
                ax.axis("off")
                fig.text(0.05, 0.06, textwrap.fill(nota, 140), fontsize=9, color=GRIS)
                pdf.savefig(fig, facecolor="white")
                plt.close(fig)


def main():
    os.makedirs(DESTINO, exist_ok=True)
    renders_placa()
    for f in (decisiones, arquitecturas, conectividad, alimentacion_v2, carcasa_concepto, estados, jornada, bloques_v3, alimentacion_v3,
              flujo_datos, placa_3d, plano_placa, ruteo_placa, carcasa, montaje, fabricacion, gantt, capturas):
        f()
    anexos_geometricos()
    print("Figuras escritas en", DESTINO)


if __name__ == "__main__":
    main()
