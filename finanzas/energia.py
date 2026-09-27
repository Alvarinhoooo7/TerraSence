# -*- coding: utf-8 -*-
"""Balance energético del instrumento según el esquemático de la placa V2.

Fuente única de las cifras de consumo y autonomía: la usan el informe corregido
(`corregir_informe.py`) y el informe interno (`informe.py`). Las corrientes son de
hoja de datos o estimaciones declaradas; ninguna está medida todavía en banco.
"""


def num(x, d=1):
    return (("%." + str(d) + "f") % x).replace(".", ",")


def pct(x, d=1):
    return num(x * 100, d) + " %"


V_BAT, ETA, V5 = 3.7, 0.85, 5.0
CAPACIDAD_UTIL_MAH = 1600
E_UTIL = CAPACIDAD_UTIL_MAH * V_BAT                 # mWh
PROPIO_PLACA = 6.0                                  # mA en la entrada de 5 V: regulador ~5 mA y LED ~1 mA
DIVISOR = V_BAT / 200.0                             # mA, 100 kΩ + 100 kΩ
DIVISOR_1M = V_BAT / 2000.0                         # mA, alternativa 1 MΩ + 1 MΩ
MODULO_VACIO = 0.100                                # mA, extremo superior de 30–100 µA
AUTODESCARGA = 2000 * 0.02 / 30 * V_BAT             # mWh/día (2 % mensual)
ESPERA_ESP32, SONDA_MW, POLARIZACION_MW = 18.0, 150.0, 2.5
JORNADA_H, MEDICIONES = 2, 10
FASES = [  # fase, duracion s, corriente de la rama de 3,3 V (mA), potencia de la rama de 5 V (mW)
    ("1. Publicidad y conexión", 12, 40.0, 0.0),
    ("2. Adquisición del conjunto", 3, 95.0 + 2.0 + 0.0036, SONDA_MW + POLARIZACION_MW),
    ("3. Envío del resultado", 1, 150.0, 0.0),
]


def desde_bateria(i33, p5=0.0, propio=PROPIO_PLACA):
    """mW que entrega la celda: la rama de 3,3 V pasa por un regulador lineal alimentado a 5 V."""
    return (V5 * (i33 + propio) + p5) / ETA


def ciclo(propio=PROPIO_PLACA):
    return sum(desde_bateria(i, p5, propio) * s for _, s, i, p5 in FASES) / 3600.0


def jornada(horas=JORNADA_H, propio=PROPIO_PLACA):
    duracion = 16 * MEDICIONES
    return (horas * 3600 - duracion) * desde_bateria(ESPERA_ESP32, 0, propio) / 3600 + MEDICIONES * ciclo(propio)


def apagado(divisor=DIVISOR, modulo=MODULO_VACIO):
    return V_BAT * (divisor + modulo)                # mW con el interruptor abierto


def autonomia(jornadas_semana, horas=JORNADA_H, propio=PROPIO_PLACA, divisor=DIVISOR, modulo=MODULO_VACIO):
    """Días que dura una carga con el patrón de uso dado."""
    semana = (jornadas_semana * jornada(horas, propio)
              + (168 - jornadas_semana * horas) * apagado(divisor, modulo) + 7 * AUTODESCARGA)
    return E_UTIL / semana * 7


P_ESPERA = desde_bateria(ESPERA_ESP32)
P_PROPIO = V5 * PROPIO_PLACA / ETA
E_CICLO, E_JORNADA = ciclo(), jornada()
DIAS_HABITUAL, DIAS_INTENSIVO = autonomia(2), autonomia(7)
DIAS_1M = autonomia(2, divisor=DIVISOR_1M)
HORAS_ENCENDIDO = E_UTIL / P_ESPERA
DIAS_ALMACEN = E_UTIL / (apagado() * 24 + AUTODESCARGA)
RENDIMIENTO_33 = 3.3 / V5 * ETA                     # fraccion de la energia que llega a la rama de 3,3 V
MEDICIONES_HABITUAL = int(DIAS_HABITUAL / 7 * 2) * MEDICIONES
SEMANAS_HABITUAL = DIAS_HABITUAL / 7


def dias(d):
    if d >= 120:
        return "%s días (≈ %s meses)" % (num(d), num(d / 30.4))
    if d >= 14:
        return "%s días (≈ %s semanas)" % (num(d), num(d / 7))
    return "%s horas (≈ %s días)" % (num(d * 24), num(d))


# Tablas del balance, como listas de filas (la primera es el encabezado)
filas_nodo = [["Fase", "Componente", "Nodo / tensión", "Corriente en el nodo", "Potencia en el nodo",
               "Potencia desde la batería (3,7 V)"],
              ["Todas", "Consumo propio de la placa de desarrollo (regulador y LED)", "5 V (entrada de la placa)",
               "%s mA" % num(PROPIO_PLACA, 0), "%s mW" % num(V5 * PROPIO_PLACA), "%s mW" % num(P_PROPIO)],
              ["Espera encendido", "ESP32 con enlace BLE en espera", "3,3 V (regulador de la placa)",
               "%s mA" % num(ESPERA_ESP32, 0), "%s mW" % num(3.3 * ESPERA_ESP32),
               "%s mW" % num(V5 * ESPERA_ESP32 / ETA)],
              ["1. Publicidad y conexión", "ESP32 en advertising BLE", "3,3 V (regulador de la placa)", "40 mA",
               "132 mW", "%s mW" % num(V5 * 40 / ETA)],
              ["2. Adquisición del conjunto", "ESP32 (temporización Modbus)", "3,3 V (regulador de la placa)",
               "95 mA", "313,5 mW", "%s mW" % num(V5 * 95 / ETA)],
              ["", "Transceptor SP3485 (driver activo) [24]", "3,3 V (regulador de la placa)", "2 mA", "6,6 mW",
               "%s mW" % num(V5 * 2 / ETA)],
              ["", "BME280 (muestreo forced-mode)", "3,3 V (regulador de la placa)", "0,0036 mA", "0,012 mW",
               "%s mW" % num(V5 * 0.0036 / ETA, 3)],
              ["", "Sonda 7-en-1 (excitación y lectura)", "5 V (elevador, η≈0,85)", "30 mA", "150 mW",
               "150 mW / 0,85 ≈ %s mW" % num(SONDA_MW / ETA)],
              ["", "Polarización del corte de la sonda (10 kΩ)", "5 V (elevador, η≈0,85)", "0,5 mA", "2,5 mW",
               "%s mW" % num(POLARIZACION_MW / ETA)],
              ["3. Envío del resultado", "ESP32 transmitiendo BLE", "3,3 V (regulador de la placa)", "150 mA",
               "495 mW", "%s mW" % num(V5 * 150 / ETA)]]
filas_ciclo = [["Fase Operativa", "Potencia desde la batería", "Duración", "Energía por ciclo"]]
for nombre, s, i, p5 in FASES:
    pot = desde_bateria(i, p5)
    filas_ciclo.append([nombre, "%s mW" % num(pot), "%d s" % s, "%s mWh" % num(pot * s / 3600, 3)])
filas_ciclo.append(["Total por ciclo", "Variable", "16 s", "%s mWh" % num(E_CICLO, 3)])

ESCENARIOS = [
    ("Equipo olvidado encendido, sin medir", "Continuo", HORAS_ENCENDIDO / 24, "—"),
    ("Uso intensivo: una jornada diaria de %d h con %d mediciones" % (JORNADA_H, MEDICIONES), "Diario",
     DIAS_INTENSIVO, format(int(DIAS_INTENSIVO) * MEDICIONES, ",d").replace(",", ".")),
    ("Uso habitual: dos jornadas semanales de %d h con %d mediciones" % (JORNADA_H, MEDICIONES), "2 por semana",
     DIAS_HABITUAL, format(MEDICIONES_HABITUAL, ",d").replace(",", ".")),
    ("Almacenado apagado, sin uso", "Ninguno", DIAS_ALMACEN, "—"),
]
filas_esc = [["Patrón de uso", "Jornadas", "Autonomía con una carga", "Mediciones por carga"]]
for nombre, frecuencia, d, med in ESCENARIOS:
    filas_esc.append([nombre, frecuencia, dias(d), med])

SENSIBILIDAD = [
    ("Diseño adoptado (valores de la tabla de balance)", DIAS_HABITUAL),
    ("Consumo propio de la placa del doble de lo estimado (%s mA)" % num(2 * PROPIO_PLACA, 0),
     autonomia(2, propio=2 * PROPIO_PLACA)),
    ("Fuga no identificada de 1 mA con el equipo apagado", autonomia(2, modulo=MODULO_VACIO + 1.0)),
    ("Jornadas de 4 h en lugar de 2 h", autonomia(2, horas=4)),
    ("Divisor de batería de 1 MΩ + 1 MΩ", DIAS_1M),
]
filas_sens = [["Variación sobre el uso habitual", "Autonomía con una carga", "Cambio frente al diseño adoptado"]]
for nombre, d in SENSIBILIDAD:
    cambio = d / DIAS_HABITUAL - 1
    filas_sens.append([nombre, dias(d), "—" if d == DIAS_HABITUAL
                       else ("+" if cambio > 0 else "") + pct(cambio).replace("-", "−")])
