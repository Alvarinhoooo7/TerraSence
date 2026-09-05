"""Tablas y comentarios cuantitativos del Informe 1, desde el modelo vigente."""
import copy
from pathlib import Path

REPORT = Path(__file__).resolve().parents[1] / 'docs/INFORME 1 .docx.md'


def money(value):
    return ('−' if value < 0 else '') + '$' + f'{abs(value):,.0f}'.replace(',', '.')


def decimal(value, places=2):
    return f'{value:.{places}f}'.replace('.', ',')


def table(headers, rows):
    return '\n'.join(['| ' + ' | '.join(headers) + ' |',
                      '|' + '|'.join(['---'] * len(headers)) + '|',
                      *['| ' + ' | '.join(str(v) for v in row) + ' |' for row in rows]])


def report_blocks(base, variants, model):
    s = model.S
    annual = model.yearly(base)[:5]
    k = model.indicators(base, s['tasa_descuento_proyecto'])
    net = s['precio_iva'] / (1 + s['iva'])
    extra = base['bom'] * (s['merma_fraccion_bom'] + s['garantia_fraccion_bom']) + s['envio_neto'] + s['precio_iva'] * s['comision_sobre_bruto']
    margin = net - base['bom'] - extra
    blocks = {}
    blocks['VENTAS'] = table(['Año', 'Equipos', 'Pauta anual', 'Técnicos FTE', 'Soporte FTE', 'Agencia anual'],
        [[r['anio'], r['unidades'], money(r['marketing']), decimal(r['tecnicos_fte'],1), decimal(r['soporte_fte'],1), money(r['agencia'])] for r in annual])
    total_units = sum(r['unidades'] for r in annual)
    blocks['VENTAS'] += f'\n\nEl plan suma **{total_units:,} equipos en cinco años**. A precio inicial constante, representa {money(total_units*s["precio_iva"])} brutos; el flujo nominal incorpora reajustes anuales. El SOM es una meta de ventas, no una cifra censal de compradores. La pauta del primer año es {money(annual[0]["marketing"])} y la agencia aparece desde {s["agencia_desde_ventas_anuales"]} ventas anuales.'.replace(f'{total_units:,}', f'{total_units:,}'.replace(',','.'))
    blocks['BOM'] = table(['Material o servicio por equipo', 'Cantidad', 'Neto unitario CLP', 'Subtotal CLP'],
        [[name, q, money(p), money(q*p)] for name,q,p,_ in s['bom']] + [['**Total BOM**', '', '', '**'+money(base['bom'])+'**']])
    blocks['BOM'] += '\n\n' + table(['Economía unitaria, año 1', 'CLP'], [
        ['Precio con IVA', money(s['precio_iva'])], ['Ingreso neto de IVA', money(net)],
        ['Materiales y servicios incluidos en BOM', money(base['bom'])],
        ['Merma, 3 % de BOM', money(base['bom']*s['merma_fraccion_bom'])],
        ['Reposiciones y garantía, 5 % de BOM', money(base['bom']*s['garantia_fraccion_bom'])],
        ['Envío', money(s['envio_neto'])], ['Comisión comercial, 5 % del bruto', money(s['precio_iva']*s['comision_sobre_bruto'])],
        ['**Costo variable total**', '**'+money(base['bom']+extra)+'**'],
        ['**Margen de contribución**', '**'+money(margin)+'**'],
        ['Margen / ingreso neto', decimal(margin/net*100,1)+' %']])
    blocks['BOM'] += f'\n\nLa sonda concentra **{decimal(48000/base["bom"]*100,1)} %** de los materiales. El BME280 cuesta **$3.500 finales**, equivalentes a $2.941,18 netos bajo el supuesto de IVA del 19 %. La carcasa 3D cuesta $6.000 netos y sus fijaciones, juntas y respiradero suman $1.500. Los subtotales se calculan antes de redondear; la presentación en pesos enteros puede producir diferencias de un peso al sumar visualmente las filas.'
    fixed_keys = [('nomina','Nómina y cargas'),('contador','Contabilidad'),('digital','Servicios digitales'),('agencia','Gestión de agencia'),('administracion','Taller, administración y seguros'),('marketing','Pauta comercial'),('fijos','**Total gastos fijos**')]
    blocks['FIJOS'] = table(['Concepto'] + [str(r['anio']) for r in annual],
        [[label]+[money(r[key]) for r in annual] for key,label in fixed_keys])
    blocks['FIJOS'] += '\n\n' + table(['Año','Equilibrio operativo','Equilibrio con deuda','Ventas planificadas'],
        [[r['anio'],r['equilibrio_operativo'],r['equilibrio_con_deuda'],r['unidades']] for r in annual])
    blocks['FIJOS'] += f'\n\nEn el primer año, {money(annual[0]["fijos"])} de gastos fijos se cubren con {annual[0]["equilibrio_operativo"]} unidades al margen calculado. Al añadir capital e intereses, el umbral sube a {annual[0]["equilibrio_con_deuda"]}. La meta de {annual[0]["unidades"]} unidades cubre la operación, pero queda por debajo del equilibrio con deuda. Esta diferencia explica el uso de liquidez inicial durante el arranque; no se confunde una venta con caja libre inmediatamente distribuible.'
    sources = s['aporte_socios']+base['principal']
    blocks['INVERSION'] = table(['Origen de fondos','CLP','Participación'],[
        ['Aporte socios',money(s['aporte_socios']),decimal(s['aporte_socios']/sources*100,1)+' %'],
        ['Crédito',money(base['principal']),decimal(base['principal']/sources*100,1)+' %'],
        ['**Total fuentes de financiamiento**',money(sources),'100 %']])
    blocks['INVERSION'] += '\n\n' + table(['Destino de fondos','CLP'],[
        ['Activos, desarrollo y formalización, con IVA presupuestado',money(base['setup'])],
        ['Inventario inicial, IVA incluido',money(base['initial_uses']-base['setup'])],
        ['Gastos de apertura del crédito',money(base['fees'])],
        ['Caja inicial, con reserva incluida',money(base['initial_cash'])],
        ['**Total destinos**',money(base['initial_uses']+base['fees']+base['initial_cash'])]])
    blocks['INVERSION'] += f'\n\nEl desembolso de apertura es **{money(base["initial_uses"])}**. Los {money(sources)} son fuentes de financiamiento y no deben denominarse inversión económica consumida: una parte permanece en caja. Para VAN y TIR, el capital comprometido en mes 0 es **{money(k["inversion"])}**, compuesto por el desembolso y la caja mínima operativa independiente de la deuda.'
    debt_rows=[]
    for term in (5,10,15):
        r=model.simulate(s,base['principal'],term)
        debt_rows.append([term,money(r['payment']),money(sum(x['interes'] for x in r['rows'])),money(model.yearly(r)[4]['saldo_deuda']),money(min(x['caja_libre'] for x in r['rows'][:24]))])
    blocks['INVERSION'] += '\n\n' + table(['Plazo, años','Cuota mensual','Intereses totales','Saldo al año 5','Mínimo sobre reserva, 24 meses'],debt_rows)
    blocks['INVERSION'] += '\n\nLa comparación utiliza el mismo principal y 12 % efectivo anual. Diez años reduce el servicio de arranque frente a cinco; quince reduce nuevamente la cuota pero aumenta intereses y exposición temporal. El crédito no desaparece al terminar la evaluación de cinco años: el saldo pendiente se muestra expresamente, y el Excel prolonga la amortización completa.'
    blocks['FLUJOS'] = table(['Año','Venta neta','EBITDA','FCFF antes de caja mínima','FCFE','Caja final','DSCR'],
        [[r['anio'],money(r['ventas_netas']),money(r['ebitda']),money(r['fcff']),money(r['fcfe']),money(r['caja']),decimal(r['dscr'])] for r in annual])
    flows=model.project_flows(base)
    blocks['FLUJOS'] += '\n\n' + table(['Período','Flujo económico para evaluación','Acumulado sin descuento'],
        [['Mes 0',money(flows[0]),money(flows[0])]] + [[r['anio'],money(sum(flows[1+i*12:13+i*12])),money(sum(flows[:13+i*12]))] for i,r in enumerate(annual)])
    blocks['FLUJOS'] += f'\n\nEn {annual[0]["anio"]}, el EBITDA de {money(annual[0]["ebitda"])} se transforma en FCFE de {money(annual[0]["fcfe"])} después de compras, IVA, impuestos y deuda. La caja final sigue positiva porque parte de la caja inicial. El **DSCR de {decimal(annual[0]["dscr"])}** significa que la generación disponible para deuda no cubre por sí sola todo el servicio del primer año. Desde el año siguiente, el aumento de ventas mejora esa cobertura dentro del escenario base.'
    blocks['INDICADORES'] = model.evaluation_markdown(variants)
    blocks['INDICADORES'] += f'\n\nEl **VAN base de {money(k["van"])}** indica excedente económico después de remunerar el capital al 20 % anual. La **TIR de {decimal(k["tir_anual"]*100)} %** supera esa tasa en {decimal(k["tir_anual"]*100-20)} puntos porcentuales. El **payback simple de {decimal(k["payback"])} meses** mide recuperación nominal; al reconocer el valor temporal del dinero se amplía a **{decimal(k["payback_descontado"])} meses**. Son preguntas distintas y por ello los dos plazos no deben mezclarse.'
    cases=[('Base',{},1),('Ventas −10 %',{},.9),('Ventas −25 %',{},.75),('Ventas −35 %',{},.65),('Precio $299.990',{'precio_iva':299990},1),('BOM +15 %',{'bom_factor':1.15},1),('Tasa crédito 18 %',{'tasa_credito_efectiva_anual':.18},1)]
    rows=[]
    for label,changes,factor in cases:
        assumptions=copy.deepcopy(s)
        for key,value in changes.items():
            if key=='bom_factor':
                for item in assumptions['bom']: item[2]*=value
            else: assumptions[key]=value
        r=model.simulate(assumptions,base['principal'],s['plazo_base'],factor)
        a=model.yearly(r)[0]
        rows.append([label,a['unidades'],money(a['ebitda']),decimal(a['dscr']),money(model.indicators(r,.2)['van']),money(min(x['caja_libre'] for x in r['rows'][:24]))])
    blocks['SENSIBILIDAD'] = table(['Caso','Ventas año 1','EBITDA año 1','DSCR año 1','VAN 5 años','Mínimo sobre reserva 24 meses'],rows)
    blocks['SENSIBILIDAD'] += '\n\nEn estas sensibilidades se modifica una condición a la vez y se mantiene el principal del caso base. Menores ventas no reducen automáticamente la pauta. El caso BOM +15 % afecta materiales, inventario, merma y reposiciones; no equivale a aumentar todos los gastos de la empresa un 15 %. El alza de tasa altera deuda y caja del accionista, pero conserva el VAN del proyecto porque su FCFF se calcula antes del financiamiento.'
    rows=[]
    for rate in (.05,.08,.10,.15,.20,.30,.40):
        value=model.indicators(base,rate)['van']
        rows.append([decimal(rate*100,0)+' %',money(value),'Positivo' if value>0 else 'Negativo'])
    rows.append([f'TIR: {decimal(k["tir_anual"]*100)} %',money(sum(f/(1+k['tir_anual'])**(i/12) for i,f in enumerate(flows))),'VAN aproximadamente cero'])
    blocks['DESCUENTO']=table(['Tasa efectiva anual','VAN','Interpretación'],rows)
    blocks['DESCUENTO'] += '\n\nTodas las filas descuentan exactamente la misma serie mensual. En este caso el VAN disminuye al elevar la tasa y cruza cero en la TIR. Esto corrige la tabla anterior, que mezclaba resultados de distintos modelos y mostraba un aumento del VAN al pasar de 15 % a 20 % sin cambiar los flujos.'
    blocks['CIERRE']=f'En el escenario base, el proyecto presenta **VAN de {money(k["van"])}**, **TIR efectiva anual de {decimal(k["tir_anual"]*100)} %** y **payback simple de {decimal(k["payback"])} meses**. La BOM completa asciende a **{money(base["bom"])} netos por equipo**, con BME280 y carcasa 3D. El análisis mensual identifica el financiamiento de arranque y permite relacionar margen, producción, inventario y pagos de deuda con las decisiones comerciales.'
    return blocks


def update_report(base, variants, model):
    text=REPORT.read_text(encoding='utf-8')
    for name,content in report_blocks(base,variants,model).items():
        start=f'<!-- INFORME:{name}:INICIO -->'
        end=f'<!-- INFORME:{name}:FIN -->'
        if text.count(start)!=1 or text.count(end)!=1:
            raise ValueError(f'Bloque financiero ausente o duplicado en Informe 1: {name}')
        before,tail=text.split(start)
        _,after=tail.split(end)
        text=before+start+'\n\n'+content+'\n\n'+end+after
    REPORT.write_text(text,encoding='utf-8')
