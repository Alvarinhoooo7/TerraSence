# -*- coding: utf-8 -*-
"""Energia del equipo sobre la PCB V3 y del taller, en potencia instalada (W), modos de consumo,
kWh anuales y costo, con los parametros de la V3.

Complementa a `energia.py` (balance de la V2 con placa de desarrollo, que sigue siendo la fuente
de las cifras del prototipo). Lo que no esta medido es estimacion y se declara como tal: ninguna
corriente de la V3 se ha medido en banco porque la placa aun no esta fabricada, y el firmware
todavia no implementa la lectura de la sonda ni el reposo profundo.
"""
import math

import energia as E2
import ensamble as EN
import modelo as M

S = M.S

# ---------------------------------------------------------------- parametros V3
V_BAT = 3.7
CAPACIDAD_UTIL_MAH = E2.CAPACIDAD_UTIL_MAH                 # 80 % de los 2.000 mAh
E_UTIL = CAPACIDAD_UTIL_MAH * V_BAT                         # mWh
IQ_LDO_UA = 2.0                                             # RT9080-33GJ5, hoja de datos
ETA_ELEVADOR = 0.85                                         # MT3608 de 3,6 V a 5 V con ~100 mA (estimacion; la hoja de datos da hasta 93 % a mayor carga)
DIVISOR_MA = V_BAT / 200.0                                  # 100 kΩ + 100 kΩ
DIVISOR_1M_MA = V_BAT / 2000.0
CH340_MA = 10.0                                             # estimacion; alimentado solo desde VBUS
I_CARGA_A = 0.444                                           # TP4056 con R_PROG de 2,7 kΩ (≈ 1200/R_PROG), bajo los 500 mA de un puerto USB 2.0
ETA_CELDA = 0.95                                            # eficiencia de carga de la celda (estimacion)
ETA_ADAPTADOR = 0.80                                        # cargador USB de pared (estimacion)
ETA_TP4056 = V_BAT / 5.0                                    # cargador lineal: toma 5 V y entrega la corriente de la celda
HORAS_CARGA = 2.0 / I_CARGA_A * 1.1                         # 2.000 mAh a corriente constante mas la cola de tension constante
DEEP_SLEEP_MA = 0.010                                       # ESP32 en reposo profundo (estimacion de hoja de datos)
OTROS_REPOSO_MA = 0.0036                                    # LDO 2 µA, BME280 0,1 µA, SP3485 y elevador apagados (estimacion)
VIDA_EQUIPO_ANIOS = 5                                       # misma del activo y del TCO del agricultor

BUZZER_MA, LED_MA = 52.0, 3.9                               # corrientes de diseno de la tabla de potencia del informe
AVISO_MEDICION_MAS = 0.160 * BUZZER_MA + 0.360 * LED_MA     # mA·s: dos pitidos (70 + 90 ms) y tres destellos de 120 ms
AVISO_ENCENDIDO_MAS = 0.080 * BUZZER_MA + 1.0 * LED_MA      # mA·s: un pitido de 80 ms y el LED verde 1 s

# fases del ciclo de medicion (las mismas del firmware descrito en energia.py)
FASES = E2.FASES                                            # (nombre, s, mA en 3,3 V, mW en 5 V)
JORNADA_H, MEDICIONES = E2.JORNADA_H, E2.MEDICIONES
ESPERA_ACTUAL, ESPERA_REPOSO = E2.ESPERA_SIN_REPOSO, E2.ESPERA_ESP32   # 40 mA sin reposo, 18 mA con reposo ligero
AUTODESCARGA_MWH_DIA = 2000 * 0.02 / 30 * V_BAT             # 2 % mensual de la celda
ESPERA_PROFUNDO = DEEP_SLEEP_MA + OTROS_REPOSO_MA              # entre mediciones, con el reposo profundo de la mejora


def p_bateria(i33_ma, p5_mw=0.0, divisor_ma=DIVISOR_MA):
    """mW que entrega la celda: la rama de 3,3 V pasa por un LDO (misma corriente que entrega) y la de 5 V por el elevador."""
    return V_BAT * (i33_ma + IQ_LDO_UA / 1000 + divisor_ma) + p5_mw / ETA_ELEVADOR


def aviso_mwh(ma_s):
    return V_BAT * ma_s / 3600.0                            # el consumo de base ya esta en la fase en que ocurre


E_AVISO_MEDICION = aviso_mwh(AVISO_MEDICION_MAS)
E_AVISO_ENCENDIDO = aviso_mwh(AVISO_ENCENDIDO_MAS)

# fases de V3: iguales a las de V2. El par AO3400A/AO3401A se conserva tras el elevador (el MT3608 no desconecta
# la carga con EN bajo), asi que su polarizacion de 10 kΩ sigue presente durante la adquisicion
FASES_V3 = list(FASES)


def ciclo_mwh():
    return sum(p_bateria(i, p5) * s for _, s, i, p5 in FASES_V3) / 3600.0 + E_AVISO_MEDICION


def jornada_mwh(horas=JORNADA_H, espera=ESPERA_REPOSO, divisor_ma=DIVISOR_MA):
    duracion = sum(s for _, s, _, _ in FASES_V3) * MEDICIONES
    return ((horas * 3600 - duracion) * p_bateria(espera, 0.0, divisor_ma) / 3600 + MEDICIONES * ciclo_mwh() + E_AVISO_ENCENDIDO)


E_CICLO, E_JORNADA = ciclo_mwh(), jornada_mwh()


def autonomia_dias(jornadas_semana, horas=JORNADA_H, espera=ESPERA_REPOSO, divisor_ma=DIVISOR_MA):
    """Dias con una carga: jornadas con el equipo encendido; el resto de la semana, interruptor abierto (solo autodescarga)."""
    semana = jornadas_semana * jornada_mwh(horas, espera, divisor_ma) + 7 * AUTODESCARGA_MWH_DIA
    return E_UTIL / semana * 7


# ------------------------------------------------- potencia instalada del equipo
def potencia_instalada():
    """Filas (consumidor, rail, corriente mA, potencia en el rail W, potencia desde la fuente W, estado) y total."""
    pf = lambda i33: V_BAT * (i33 / 1000)
    filas = [
        ("ESP32-WROOM-32D transmitiendo BLE", "3,3 V", 150.0, 3.3 * 0.150, pf(150.0), "estimación de hoja de datos"),
        ("Sonda 7 en 1 (excitación y lectura)", "5 V", 30.0, 5.0 * 0.030, 5.0 * 0.030 / ETA_ELEVADOR, "estimación del fabricante"),
        ("Transceptor SP3485 con el driver activo", "3,3 V", 2.0, 3.3 * 0.002, pf(2.0), "hoja de datos"),
        ("Sensor BME280 en muestreo", "3,3 V", 0.0036, 3.3 * 0.0000036, pf(0.0036), "hoja de datos"),
        ("LED de estado (uno encendido a la vez)", "3,3 V", LED_MA, 3.3 * LED_MA / 1000, pf(LED_MA), "corriente de diseño"),
        ("Buzzer pasivo en pitido", "3,3 V", BUZZER_MA, 3.3 * BUZZER_MA / 1000, pf(BUZZER_MA), "corriente de diseño, sin medir"),
        ("Divisor de medición de batería", "VBAT", DIVISOR_MA, V_BAT * DIVISOR_MA / 1000, V_BAT * DIVISOR_MA / 1000, "cálculo"),
        ("Polarización del corte de la sonda (10 kΩ a 5 V)", "5 V", 0.5, 5.0 * 0.0005, 5.0 * 0.0005 / ETA_ELEVADOR, "cálculo"),
        ("Pérdida del LDO de 3,3 V (a 150 mA)", "—", None, 0.0, (V_BAT - 3.3) * 0.150, "cálculo"),
        ("Pérdida del elevador de 5 V", "—", None, 0.0, 5.0 * 0.030 / ETA_ELEVADOR - 5.0 * 0.030, "cálculo con η de %d %%" % round(ETA_ELEVADOR * 100)),
    ]
    # La fila de perdidas del LDO ya esta contada en la potencia desde la fuente de las filas de 3,3 V (corriente × 3,7 V):
    # se muestra como desglose y no se suma dos veces.
    consumidores = filas[:8]
    total_fuente = sum(f[4] for f in consumidores)
    total_rail = sum(f[3] for f in consumidores)
    return filas, total_rail, total_fuente


def potencia_usb_w():
    """Potencia de entrada por USB con la carga en curso y el CH340 activo."""
    return 5.0 * (I_CARGA_A + CH340_MA / 1000)


# ----------------------------------------------------------------- modos de consumo
def modos():
    """(modo, potencia mW desde la fuente, minutos por jornada de 2 h con 10 mediciones, nota)."""
    t_med = sum(s for n, s, _, _ in FASES_V3 if "Adquisición" in n) * MEDICIONES
    t_pub = sum(s for n, s, _, _ in FASES_V3 if "Publicidad" in n) * MEDICIONES
    t_env = sum(s for n, s, _, _ in FASES_V3 if "Envío" in n) * MEDICIONES
    t_con = JORNADA_H * 3600 - t_med - t_pub - t_env
    p_con = p_bateria(ESPERA_REPOSO)
    p_pub = p_bateria(FASES_V3[0][2])
    p_med = p_bateria(FASES_V3[1][2], FASES_V3[1][3])
    p_env = p_bateria(FASES_V3[2][2])
    p_prof = p_bateria(DEEP_SLEEP_MA + OTROS_REPOSO_MA, 0.0, DIVISOR_1M_MA)
    return [
        ("Apagado (interruptor abierto)", 0.0, 0.0, "solo autodescarga de la celda, %.2f mWh/día" % AUTODESCARGA_MWH_DIA),
        ("Reposo profundo (mejora, con divisor de 1 MΩ)", p_prof, 0.0, "pendiente en el firmware; despierta con PAIR"),
        ("Anuncio BLE", p_pub, t_pub / 60, "12 s por medición"),
        ("Conectado en espera", p_con, t_con / 60, "reposo ligero del módem, 18 mA"),
        ("Midiendo (adquisición de la sonda)", p_med, t_med / 60, "3 s por medición"),
        ("Enviando el resultado", p_env, t_env / 60, "1 s por medición"),
        ("Cargando por USB", potencia_usb_w() * 1000, 0.0, "hasta %s h por carga completa" % ("%.1f" % HORAS_CARGA).replace(".", ",")),
    ]


# -------------------------------------------------------------- consumo anual
JORNADAS_HABITUAL, JORNADAS_INTENSIVO = 104, 365


def wh_anuales(jornadas):
    return (jornadas * E_JORNADA + 365 * AUTODESCARGA_MWH_DIA) / 1000


def kwh_red_anuales(jornadas):
    """kWh que toma de la red una unidad al recargar lo que gasta: eficiencia del cargador lineal, de la celda y del adaptador."""
    eta = ETA_TP4056 * ETA_CELDA * ETA_ADAPTADOR
    return wh_anuales(jornadas) / eta / 1000


def base_instalada(anio):
    """Equipos en servicio ese anio: los vendidos en los ultimos cinco."""
    return sum(S["ventas"][str(a)] for a in M.ANIOS if anio - VIDA_EQUIPO_ANIOS < a <= anio)


def flota():
    out = []
    for a in M.ANIOS:
        b = base_instalada(a)
        out.append({"anio": a, "base": b, "kwh": b * kwh_red_anuales(JORNADAS_HABITUAL), "kwh_intensivo": b * kwh_red_anuales(JORNADAS_INTENSIVO)})
    return out


# ------------------------------------------------------------------- autonomias
def autonomias():
    """(escenario, actual V2, V2 con reposo ligero, V3, V3 con reposo profundo) en dias."""
    olv_actual = E2.E_UTIL / E2.desde_bateria(ESPERA_ACTUAL) / 24
    olv_v2 = E2.HORAS_ENCENDIDO / 24
    olv_v3 = E_UTIL / p_bateria(ESPERA_REPOSO) / 24
    p_prof = p_bateria(DEEP_SLEEP_MA + OTROS_REPOSO_MA, 0.0, DIVISOR_1M_MA)
    olv_prof = E_UTIL / (p_prof + AUTODESCARGA_MWH_DIA / 24) / 24
    return [
        ("Equipo olvidado encendido, sin medir", olv_actual, olv_v2, olv_v3, olv_prof),
        ("Uso habitual: dos jornadas semanales de 2 h", E2.autonomia(2, espera=ESPERA_ACTUAL), E2.DIAS_HABITUAL,
         autonomia_dias(2), autonomia_dias(2, espera=ESPERA_PROFUNDO, divisor_ma=DIVISOR_1M_MA)),
        ("Uso intensivo: una jornada diaria de 2 h", E2.autonomia(7, espera=ESPERA_ACTUAL), E2.DIAS_INTENSIVO,
         autonomia_dias(7), autonomia_dias(7, espera=ESPERA_PROFUNDO, divisor_ma=DIVISOR_1M_MA)),
    ]


# ----------------------------------------------------------------------- taller
TARIFA = S["tarifa_electrica_clp_kwh"]
HORAS_OFICINA = 2000          # 8 h por 250 dias
M2_OFICINA, W_M2 = 50, 6      # iluminacion LED de la oficina (estimacion)


def taller(anio):
    """Filas (equipo, cantidad, W instalados por unidad, uso medio, horas/anio, kWh/anio, nota) del taller y la oficina."""
    u = S["ventas"][str(anio)]
    oficina = S["dotacion_por_anio"][str(anio)]["oficina"]
    imp = EN.impresoras_necesarias(u)
    cap = EN.capacidad_impresion()
    e = S["ensamble"]
    h_sold = u * e["min_pcba_retoque_jlcpcb"] / 60 + 120
    h_fat = u * e["min_fat"] / 60 + 600
    h_micro = u * 5 / 60 + 100
    h_aire = u * e["merma_retrabajo_taller"] * 10 / 60 + 120
    filas = [
        ("Impresora 3D Creality K1C", S["taller_filas"][0]["cantidad"], 350, S["capacidad_impresion"]["potencia_promedio_w"] / 350, imp["horas"], "350 W de placa; 262 W promedio al imprimir PETG (estimación)"),
        ("Estación de soldadura Hakko FX-888D", 2, 70, 0.60, h_sold, "70 W de placa"),
        ("Estación de aire caliente Quick 861DW", 1, 1000, 0.50, h_aire, "retrabajo y lotes de prototipos"),
        ("Placa calefactora de 100 × 100 mm", 1, 400, 0.50, 60, "prototipos"),
        ("Microscopio estereoscópico con luz LED", 1, 10, 1.0, h_micro, "estimación"),
        ("Osciloscopio Rigol DS1054Z", 1, 50, 0.80, h_fat, "desarrollo y FAT"),
        ("Fuente de laboratorio Korad KA3005P", 1, 150, 0.15, h_fat, "carga media de 20 W"),
        ("Analizador lógico USB", 1, 1, 1.0, 300, "alimentado por USB"),
        ("Notebook", 3, 65, 0.70, HORAS_OFICINA, "cargador de 65 W"),
        ("Monitor de 24 pulgadas", 3, 25, 1.0, HORAS_OFICINA, "estimación"),
        ("Impresora de oficina", 1, 400, 0.05, 150, "reposo y ráfagas de impresión"),
    ]
    if oficina:
        filas.append(("Iluminación LED de la oficina", 1, M2_OFICINA * W_M2, 1.0, HORAS_OFICINA, "%d m² a %d W/m² (estimación)" % (M2_OFICINA, W_M2)))
    return [(n, c, w, uso, h, c * w * uso * h / 1000, nota) for n, c, w, uso, h, nota in filas]


def taller_kwh(anio):
    return sum(f[5] for f in taller(anio))


def taller_potencia_instalada_w(anio):
    return sum(f[1] * f[2] for f in taller(anio))


def electricidad_mensual_clp(anio):
    return taller_kwh(anio) * TARIFA / 12


def electricidad_requerida():
    """(mensual sin oficina el primer anio, mensual con oficina al maximo del horizonte), en pesos de 2027, redondeados hacia arriba a $5.000."""
    sin = electricidad_mensual_clp(M.ANIOS[0])
    con = max(electricidad_mensual_clp(a) for a in M.ANIOS if S["dotacion_por_anio"][str(a)]["oficina"])
    red = lambda x: int(math.ceil(x / 5000.0) * 5000)
    return sin, con, red(sin), red(con)


def electricidad_supuesto():
    """Lineas de electricidad vigentes en supuestos.json (sin oficina, con oficina)."""
    sin = next(v for n, v in S["_servicios_detalle_sin_oficina"] if "electricidad" in n.lower())
    con = next(v for n, v in S["_servicios_detalle_oficina"] if "electricidad" in n.lower())
    return sin, con


if __name__ == "__main__":
    print("Potencia instalada", potencia_instalada()[1:])
    for m in modos():
        print(m)
    print("E ciclo %.3f mWh, jornada %.1f mWh" % (E_CICLO, E_JORNADA))
    print("Wh/año habitual %.1f; kWh red %.4f" % (wh_anuales(JORNADAS_HABITUAL), kwh_red_anuales(JORNADAS_HABITUAL)))
    for a in autonomias():
        print(a)
    for f in flota():
        print(f)
    for a in (2027, 2028, 2036):
        print(a, round(taller_kwh(a)), round(electricidad_mensual_clp(a)), round(taller_potencia_instalada_w(a)))
    print(electricidad_requerida(), electricidad_supuesto())
