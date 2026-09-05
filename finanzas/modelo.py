"""Modelo mensual reproducible, CLP nominales. python finanzas/modelo.py

Editar supuestos.json y regenerar; las hojas son resultados, no un simulador
interactivo completo. Fórmulas de conciliación llevan caché calculada. Sin macros.
No necesita Excel. No escribe servicios remotos. Archiva originales una sola vez.
"""
from __future__ import annotations
import copy
import json
import math
import shutil
from pathlib import Path
import xlsxwriter
from xlsxwriter.utility import xl_col_to_name

ROOT = Path(__file__).resolve().parents[1]
S = json.loads((ROOT / 'finanzas/supuestos.json').read_text(encoding='utf-8'))


def cuota(capital, tasa, meses):
    r = (1 + tasa) ** (1 / 12) - 1
    return capital / meses if r == 0 else capital * r / (1 - (1 + r) ** -meses)


def ventas(s, factor=1):
    annual = [round(x * factor) for x in s['ventas_base']]
    while len(annual) < s['horizonte']:
        annual.append(round(annual[-1] * (1 + s['crecimiento_despues_5'])))
    monthly = []
    for total in annual:
        weights = s['pesos_mensuales']
        raw = [total * w / sum(weights) for w in weights]
        values = [math.floor(v) for v in raw]
        for i in sorted(range(12), key=lambda i: raw[i] - values[i], reverse=True)[:total-sum(values)]:
            values[i] += 1
        monthly.extend(values)
    return annual, monthly


def simulate(s=S, principal=0, term=10, factor=1, marketing_factor=1, bullet=0):
    annual, units = ventas(s, factor)
    # Marketing no baja automáticamente si una campaña falla (estrés).
    targets, _ = ventas(s, marketing_factor)
    bom = sum(q * p for _, q, p, _ in s['bom'])
    initial_inventory = math.ceil(sum(units[:s['inventario_meses']]) / s['lote_compra']) * s['lote_compra']
    # Conservador: no se utiliza crédito IVA de inversión/desarrollo inicial.
    setup = (s['activos_iniciales_netos'] + s['desarrollo_validacion_neto'] + s['formalizacion_neto']) * (1+s['iva'])
    stock = initial_inventory
    inventory_value = stock * bom
    initial_uses = setup + inventory_value * (1+s['iva'])
    fees = principal * s['gastos_credito_fraccion']
    cash = s['aporte_socios'] + principal - initial_uses - fees
    initial_cash = cash
    balance = principal - bullet
    payment = cuota(balance, s['tasa_credito_efectiva_anual'], term*12)
    r = (1+s['tasa_credito_efectiva_anual'])**(1/12)-1
    tax_loss = project_loss = 0
    year_taxable = year_project_taxable = 0
    cum = 0
    rows = []
    prev_vat = 0
    # 10% del desembolso no financiero, además de 3 meses de costos fijos y deuda.
    contingency = initial_uses * s['contingencia_inicial']
    for m, sold in enumerate(units):
        y = m // 12
        inflation = (1+s['inflacion'])**y
        active = sum(annual[max(0,y-4):y]) + annual[y]/2  # base activa móvil de 5 años, supuesto
        technician = math.ceil(max(0, annual[y]*s['horas_unidad']-s['horas_fundadores_produccion']) / s['horas_productivas_fte'] * 2)/2
        support = math.ceil(max(0, active*s['horas_soporte_equipo_anio']+annual[y]*s['horas_comerciales_por_venta']-s['horas_fundadores_soporte']) / s['horas_productivas_fte'] * 2)/2
        founder_salary = s['sueldos_socios_base_por_anio'][min(y,len(s['sueldos_socios_base_por_anio'])-1)]
        payroll = (2*founder_salary + technician*s['sueldo_bruto_tecnico'] + support*s['sueldo_bruto_soporte']) * (1+s['sobrecosto_laboral_presupuesto']) * inflation
        accountant = (s['contador_mensual']+(technician+support)*s['contador_incremento_fte'])*inflation
        digital = (s['servicios_digitales_mensual']+active*s['servicios_por_equipo_activo_anio']/12)*inflation
        agency = s['agencia_mensual']*inflation if targets[y]>=s['agencia_desde_ventas_anuales'] else 0
        admin = (s['taller_servicios_mensual']+s['administracion_seguros_mensual'])*inflation
        marketing = targets[y]*s['marketing_venta_objetivo']*inflation/12
        fixed = payroll + accountant + digital + agency + admin + marketing
        gross = sold*s['precio_iva']*inflation
        revenue = gross/(1+s['iva'])
        # FIFO simplificado: costo promedio ponderado móvil; stock no se revaloriza.
        required = sold + sum(units[m+1:m+1+s['inventario_meses']])
        purchase_units = math.ceil(max(0,required-stock)/s['lote_compra'])*s['lote_compra']
        purchases = purchase_units*bom*inflation
        avg_cost = (inventory_value+purchases)/(stock+purchase_units) if stock+purchase_units else 0
        cogs = sold*avg_cost
        stock += purchase_units-sold
        inventory_value += purchases-cogs
        # Merma y garantías: desembolso prudencial inmediato de reposición, no provisión ficticia.
        variable = cogs*(s['merma_fraccion_bom']+s['garantia_fraccion_bom']) + sold*s['envio_neto']*inflation + gross*s['comision_sobre_bruto']
        ebitda = revenue-cogs-variable-fixed
        interest = balance*r if m<term*12 else 0
        paid = min(payment, balance+interest) if balance>0.001 and m<term*12 else 0
        amortization = paid-interest
        balance = max(0,balance-amortization)
        bullet_interest = bullet*0.15 if m==11 else 0
        bullet_principal = bullet if m==11 else 0
        interest += bullet_interest
        amortization += bullet_principal
        debt = interest+amortization
        capex = s['reinversion_activos_cada_3_anios']*inflation if m>0 and m%36==0 else 0
        # Base caja Pro Pyme estimada, no EBITDA menos depreciación contable.
        # Deducción inicial incluye inventario y activos; sin beneficio tributario adelantado.
        taxable = revenue-purchases-variable-fixed-capex-interest
        project_taxable = taxable+interest
        if m==0:
            taxable -= initial_uses
            project_taxable -= initial_uses
        year_taxable += taxable
        year_project_taxable += project_taxable
        tax_rate = 0.125 if s['inicio']+y<=2027 else 0.15 if s['inicio']+y==2028 else 0.25
        tax = project_tax = 0
        if m%12==11:
            tax = max(0,year_taxable-tax_loss)*tax_rate
            tax_loss = max(0,tax_loss-year_taxable)
            project_tax = max(0,year_project_taxable-project_loss)*tax_rate
            project_loss = max(0,project_loss-year_project_taxable)
            year_taxable = year_project_taxable = 0
        # IVA de ventas se inmoviliza en el mismo mes. Crédito de compras a mes siguiente.
        # Sin crédito de servicios/capex ni de carga PCB900: prudente, no declaración F29.
        vat_output = gross-revenue
        vat_input = purchases * s['iva'] - purchase_units*900*inflation*s['iva']
        vat_usable = min(vat_output, prev_vat)
        prev_vat = prev_vat-vat_usable+vat_input
        vat_cash = vat_input-vat_usable
        # Todos los costos están netos salvo gastos iniciales. IVA no recuperable PCB está
        # contenido en 900; compras con factura añaden crédito financiado temporalmente.
        fcff = revenue-purchases-variable-fixed-capex-project_tax-vat_cash
        fcfe = revenue-purchases-variable-fixed-capex-tax-vat_cash-debt
        cash += fcfe
        reserve = s['reserva_meses']*(fixed+payment)+contingency
        available = cash-reserve
        cum += sold
        rows.append(dict(mes=m+1,anio=s['inicio']+y,unidades=sold,precio_bruto=s['precio_iva']*inflation,ventas_brutas=gross,ventas_netas=revenue,
            compras_unidades=purchase_units,compras_netas=purchases,stock_unidades=stock,inventario_neto=inventory_value,
            costo_vendido=cogs,variables=variable,nomina=payroll,tecnicos_fte=technician,soporte_fte=support,
            contador=accountant,digital=digital,agencia=agency,administracion=admin,marketing=marketing,fijos=fixed,ebitda=ebitda,
            interes=interest,amortizacion=amortization,servicio_deuda=debt,saldo_deuda=balance+(bullet if m<11 else 0),
            capex=capex,impuesto_reservado=tax,impuesto_proyecto=project_tax,iva_inmovilizado=vat_cash,credito_iva=prev_vat,
            fcff=fcff,fcfe=fcfe,caja=cash,reserva=reserve,caja_libre=available,tasa_impuesto=tax_rate))
    return dict(rows=rows,initial_uses=initial_uses,initial_cash=initial_cash,setup=setup,initial_inventory=initial_inventory,
                bom=bom,fees=fees,principal=principal,payment=payment,contingency=contingency,annual=annual)


def funding(s=S, term=10):
    # Mínimo préstamo en incrementos de 100 mil que mantiene reserva primeros 24 meses.
    for p in range(0,150000001,100000):
        result=simulate(s,p,term)
        if min(r['caja_libre'] for r in result['rows'][:24])>=0 and result['initial_cash']>=result['rows'][0]['reserva']:
            return result
    raise ValueError('No se financia la reserva con hasta CLP150 millones; revisar viabilidad')


def yearly(result):
    answer=[]
    for y in range(len(result['rows'])//12):
        group=result['rows'][y*12:(y+1)*12]
        row={k:sum(r[k] for r in group) for k in group[0]}
        for k in ('anio','saldo_deuda','caja','reserva','caja_libre','inventario_neto','stock_unidades','credito_iva','precio_bruto','tasa_impuesto','tecnicos_fte','soporte_fte'):
            row[k]=group[-1][k]
        row['dscr']=(row['ebitda']-row['impuesto_reservado']-row['capex']-(group[-1]['inventario_neto']-(result['initial_inventory']*result['bom'] if y==0 else result['rows'][y*12-1]['inventario_neto']))-row['iva_inmovilizado'])/row['servicio_deuda'] if row['servicio_deuda'] else 0
        row['min_caja_libre']=min(r['caja_libre'] for r in group)
        row['equilibrio_operativo']=math.ceil(row['fijos']/((row['ventas_netas']-row['costo_vendido']-row['variables'])/row['unidades']))
        row['equilibrio_con_deuda']=math.ceil((row['fijos']+row['servicio_deuda'])/((row['ventas_netas']-row['costo_vendido']-row['variables'])/row['unidades']))
        answer.append(row)
    return answer


def npv_monthly(initial, rows, column, discount, months=60):
    return initial+sum(r[column]/(1+discount)**(r['mes']/12) for r in rows[:months])


def archive(path):
    if path.exists():
        target=ROOT/'finanzas/historico'/path.relative_to(ROOT)
        if not target.exists():
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(path,target)


def workbook(path, base, variants):
    archive(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    with xlsxwriter.Workbook(path) as wb:
        wb.set_properties({'title':'TerraSense — modelo financiero auditable 2026-09-04','comments':'Editar finanzas/supuestos.json y regenerar. No editar resultados aislados.'})
        header=wb.add_format({'bold':True,'bg_color':'#174B40','font_color':'white','text_wrap':True})
        money=wb.add_format({'num_format':'#,##0;[Red]-#,##0'})
        decimal=wb.add_format({'num_format':'0.00'})
        notes=wb.add_worksheet('LEEME')
        notes.set_column(0,0,125)
        for i,line in enumerate([
            'TerraSense: CLP nominales; año 1 = 2027. Aporte socios 9 millones. Precio con IVA.',
            'Fuente única: finanzas/supuestos.json. Regenerar con python finanzas/modelo.py.',
            'Las hojas son resultados del modelo Python, no simulador interactivo completo. Fórmulas concilian totales y caja con caché.',
            'Base: 200/350/500/650/850 ventas; desde año 6 crecimiento 5% hipotético, no valor terminal automático.',
            'Estrés: 65% ventas, mismo marketing. Crecimiento: 150% ventas y marketing; personal e inventario se recalculan.',
            'Crédito 12% efectivo anual es supuesto, no oferta. 2% de apertura/timbres/seguros es reserva por cotizar; no CAE.',
            '5/10/15 años comparados con MISMO principal. 15 años no se presume elegible FOGAPE.',
            'Reserva: 3 meses de fijos y cuota +10% de desembolso inicial. Incluida en caja, no gasto ni suma doble.',
            'Sueldos socios son costo laboral, nunca retorno al capital. 35% sobre sueldo es presupuesto, no tasa legal única.',
            'Sin MOD variable: ensamblaje final incluido en nómina. 2.25 h/unidad, 1400 h productivas/FTE/año.',
            'Contador externo desde mes 1. Agencia condicional desde objetivo 650/año. No obligaciones legales por año.',
            'IVA: crédito compras con factura se usa desde mes siguiente; inversión/servicios iniciales sin recuperación: prudente.',
            'Impuesto estimado caja Pro Pyme con pérdidas; se inmoviliza al cierre anual. No reproduce F29/PPM/abril; no usar para declarar.',
            'FCFF antes de financiamiento con impuesto sin intereses; FCFE después de deuda. No mezclar para VAN.',
            'VAN proyecto incluye desembolso inicial y reserva inicial como capital comprometido; sin liquidación/rescate terminal.',
            'No hay dividendos automáticos. FCFE es generación de caja, no depósito al socio. VAN de socios no se presenta sin política de salida.',
            'Ventas cobradas mismo mes, sin crédito a clientes ni mayoristas. Comisiones 5% sobre precio bruto presupuestadas.',
            'Validar SKU, IVA facturado, plazos de importación, CAC, contratación, impuestos y crédito antes de comprometer dinero.',
            'Consulte docs/MODELO_ECONOMICO.md y docs/PLAN_VALIDACION.md para fuentes, límites y tareas físicas pendientes.',
        ]): notes.write(i,0,line)
        inp=wb.add_worksheet('Supuestos'); inp.set_column(0,0,45); inp.set_column(1,1,95)
        inp.write_row(0,0,['Parámetro','Valor / lista'],header)
        for i,(k,v) in enumerate(S.items(),1): inp.write_row(i,0,[k,json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v])
        bom=wb.add_worksheet('BOM');bom.set_column(0,0,55);bom.set_column(1,3,18);bom.set_column(4,4,95)
        bom.write_row(0,0,['Componente','Cantidad','Neto unitario CLP','Subtotal CLP','Evidencia / pendiente'],header)
        for i,(name,q,p,note) in enumerate(S['bom'],1):
            bom.write_row(i,0,[name,q,p]);bom.write_formula(i,3,f'=B{i+1}*C{i+1}',money,q*p);bom.write(i,4,note)
        bom.write(len(S['bom'])+1,0,'TOTAL BOM NETO');bom.write_formula(len(S['bom'])+1,3,f'=SUM(D2:D{len(S["bom"])+1})',money,base['bom'])
        startup=wb.add_worksheet('Origen y usos');startup.set_column(0,0,55);startup.set_column(1,1,22)
        for i,(k,v) in enumerate({'Aporte socios':S['aporte_socios'],'Crédito bruto':base['principal'],'Activos/desarrollo/formalización con IVA prudencial':base['setup'],'Inventario inicial con IVA prudencial':base['initial_uses']-base['setup'],'Gastos de apertura presupuestados':base['fees'],'Caja inicial (incluye reserva)':base['initial_cash'],'Reserva inicial objetivo':base['rows'][0]['reserva']}.items()): startup.write_row(i,0,[k,v],money)
        for name,result in variants.items():
            monthly=wb.add_worksheet(name+'_mensual'); yearly_sheet=wb.add_worksheet(name+'_anual')
            for sheet,data in ((monthly,result['rows']),(yearly_sheet,yearly(result))):
                keys=list(data[0]);sheet.freeze_panes(1,3);sheet.set_column(0,len(keys)-1,20);sheet.set_row(0,45)
                sheet.write_row(0,0,keys,header);sheet.autofilter(0,0,len(data),len(keys)-1)
                for i,row in enumerate(data,1):
                    for j,k in enumerate(keys):
                        fmt=decimal if k in ('tecnicos_fte','soporte_fte','dscr','tasa_impuesto') else money
                        if sheet==yearly_sheet and k not in ('anio','mes','saldo_deuda','caja','reserva','caja_libre','inventario_neto','stock_unidades','credito_iva','precio_bruto','tasa_impuesto','tecnicos_fte','soporte_fte','dscr','min_caja_libre','equilibrio_operativo','equilibrio_con_deuda'):
                            c=xl_col_to_name(j);sheet.write_formula(i,j,f"=SUM('{name}_mensual'!{c}{(i-1)*12+2}:{c}{i*12+1})",fmt,row[k])
                        elif sheet==monthly and k in ('ventas_netas','fijos','ebitda','servicio_deuda','fcff','fcfe','caja','caja_libre'):
                            ref=lambda key: f'{xl_col_to_name(keys.index(key))}{i+1}'
                            expression={
                                'ventas_netas':f'{ref("ventas_brutas")}/{1+S["iva"]}',
                                'fijos':'+'.join(ref(t) for t in ['nomina','contador','digital','agencia','administracion','marketing']),
                                'ebitda':f'{ref("ventas_netas")}-{ref("costo_vendido")}-{ref("variables")}-{ref("fijos")}',
                                'servicio_deuda':f'{ref("interes")}+{ref("amortizacion")}',
                                'fcff':f'{ref("ventas_netas")}-{ref("compras_netas")}-{ref("variables")}-{ref("fijos")}-{ref("capex")}-{ref("impuesto_proyecto")}-{ref("iva_inmovilizado")}',
                                'fcfe':f'{ref("ventas_netas")}-{ref("compras_netas")}-{ref("variables")}-{ref("fijos")}-{ref("capex")}-{ref("impuesto_reservado")}-{ref("iva_inmovilizado")}-{ref("servicio_deuda")}',
                                'caja':f'{result["initial_cash"] if i==1 else xl_col_to_name(keys.index("caja"))+str(i)}+{ref("fcfe")}',
                                'caja_libre':f'{ref("caja")}-{ref("reserva")}',
                            }[k]
                            sheet.write_formula(i,j,'='+expression,fmt,row[k])
                        else: sheet.write(i,j,row[k],fmt)
        compare=wb.add_worksheet('Comparacion deuda');compare.set_column(0,12,23)
        compare.write_row(0,0,['Alternativa','Principal','Cuota mensual tramo','Interés total','Deuda al año 5','Servicio año 1','Mín caja libre 24m','DSCR año 1','Crédito mínimo que sostiene la reserva a ese plazo'],header)
        def compare_row(i,label,r,extra=None):
            a=yearly(r)
            compare.write_row(i,0,[label,base['principal'],r['payment'],sum(x['interes'] for x in r['rows']),a[4]['saldo_deuda'],a[0]['servicio_deuda'],min(x['caja_libre'] for x in r['rows'][:24])],money)
            compare.write(i,7,a[0]['dscr'],decimal)  # ratio, no moneda
            if extra is not None: compare.write(i,8,extra,money)
        for i,term in enumerate((5,10,15),1):
            compare_row(i,f'{term} años',simulate(S,base['principal'],term),funding(S,term)['principal'])
        compare_row(4,'5 años + bullet 5M',simulate(S,base['principal'],5,bullet=min(5000000,base['principal'])))
        compare.write(6,0,'DSCR: caja operativa luego de impuesto, reinversión, inventario e IVA / servicio deuda; no EBITDA solo.')
        sens=wb.add_worksheet('Sensibilidades');sens.set_column(0,0,38);sens.set_column(1,5,24)
        sens.write_row(0,0,['Caso','Unidades año 1','EBITDA año 1','Mín caja libre 24m','VAN proyecto 5 años 20%'],header)
        for i,(label,price,factor,rate) in enumerate([
            ('Base',349990,1,.12),('Precio anterior',249990,1,.12),('Precio 299990',299990,1,.12),('Precio 329990',329990,1,.12),('Ventas -35%, mismo marketing',349990,.65,.12),('Tasa 18%',349990,1,.18)
        ],1):
            s=copy.deepcopy(S);s['precio_iva']=price;s['tasa_credito_efectiva_anual']=rate
            r=simulate(s,base['principal'],10,factor)
            committed=r['initial_uses']+base['initial_cash']
            sens.write_row(i,0,[label,yearly(r)[0]['unidades'],yearly(r)[0]['ebitda'],min(x['caja_libre'] for x in r['rows'][:24]),npv_monthly(-committed,r['rows'],'fcff',.20)],money)


def write_summary(base, variants):
    currency=lambda v: '$'+f'{v:,.0f}'.replace(',','.')
    lines=['# Resultados financieros generados','', 'No editar a mano: `python finanzas/modelo.py`. Fuente: `finanzas/supuestos.json`.', '',
        f'Precio inicial con IVA: **{currency(S["precio_iva"])}**; neto: {currency(S["precio_iva"]/(1+S["iva"]))}. BOM neto provisional: **{currency(base["bom"])}**.',
        f'Aporte: **{currency(S["aporte_socios"])}**. Crédito base dimensionado: **{currency(base["principal"])}**, cuota {currency(base["payment"])} a 10 años y 12% efectivo anual hipotético.',
        f'Desembolso inicial: {currency(base["initial_uses"])}; gastos crédito: {currency(base["fees"])}; caja inicial: {currency(base["initial_cash"])} (incluye reserva; no sumar otra vez).', '',
        '| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Técnicos FTE | Soporte FTE | Equilibrio operativo / con deuda |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for r in yearly(base)[:5]:
        lines.append(f'| {r["anio"]} | {r["unidades"]} | {currency(r["ebitda"])} | {currency(r["servicio_deuda"])} | {currency(r["caja"])} | {currency(r["reserva"])} | {r["dscr"]:.2f} | {r["tecnicos_fte"]:g} | {r["soporte_fte"]:g} | {r["equilibrio_operativo"]} / {r["equilibrio_con_deuda"]} |')
    lines+=['','Equilibrio con deuda incluye capital e intereses, no impuesto ni acumulación de inventario: la prueba de liquidez es la caja mensual y el DSCR. FTE es equivalente de jornada presupuestado, no número de contratos.', '', '| Crédito (mismo principal) | Cuota | Intereses totales | Saldo año 5 | Mínimo sobre reserva, 24 meses |','|---|---:|---:|---:|---:|']
    for term in (5,10,15):
        r=simulate(S,base['principal'],term)
        lines.append(f'| {term} años | {currency(r["payment"])} | {currency(sum(x["interes"] for x in r["rows"]))} | {currency(yearly(r)[4]["saldo_deuda"])} | {currency(min(x["caja_libre"] for x in r["rows"][:24]))} |')
    two=simulate(S,base['principal'],5,bullet=5000000)
    lines+=['',f'Dos créditos (resto a 5 años y $5 millones al 15% pagados íntegros mes 12): servicio del primer año **{currency(yearly(two)[0]["servicio_deuda"])}**, mínimo sobre reserva **{currency(min(x["caja_libre"] for x in two["rows"][:24]))}**.', '', '| Escenario | Ventas año 1 | Mínimo caja libre 24m | VAN proyecto 5 años / 20% |', '|---|---:|---:|---:|']
    committed=base['initial_uses']+base['initial_cash']
    for name,r in variants.items():
        lines.append(f'| {name} | {yearly(r)[0]["unidades"]} | {currency(min(x["caja_libre"] for x in r["rows"][:24]))} | {currency(npv_monthly(-committed,r["rows"],"fcff",S["tasa_descuento_proyecto"]))} |')
    lines+=['','VAN sin rescate, recuperación de reserva/inventario ni valor terminal. La reserva inicial se trata como capital comprometido. Los gastos de apertura son del financiamiento, no del FCFF. El FCFE no se distribuye automáticamente; no se publica una falsa TIR del socio sumando su sueldo.', '', 'Los años 6–15 son extensión mecánica para mostrar toda la deuda; no evidencia de demanda, supervivencia, precio ni rentabilidad futura.']
    (ROOT/'docs/RESULTADOS_FINANCIEROS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')


def main():
    base=funding(S,S['plazo_base'])
    variants={'Base':base,'Estres':simulate(S,base['principal'],10,S['ventas_estres_factor']),
              'Crecimiento':simulate(S,base['principal'],10,S['ventas_crecimiento_factor'],S['ventas_crecimiento_factor'])}
    path=ROOT/'Flujo de caja y financiamiento - TerraSense.xlsx'
    workbook(path,base,variants)
    # Se eliminó la copia en outputs/: era idéntica a la planilla de la raíz y creaba
    # una segunda fuente "final". El original previo queda en finanzas/historico/.
    bompath=ROOT/'PCB/BOM_TerraSense.xlsx';archive(bompath)
    with xlsxwriter.Workbook(bompath) as wb:
        ws=wb.add_worksheet('BOM vigente provisional');ws.set_column(0,0,58);ws.set_column(1,3,18);ws.set_column(4,4,90)
        ws.write_row(0,0,['Componente','Cantidad','Neto unitario CLP','Subtotal','Estado / evidencia'])
        for i,(n,q,p,note) in enumerate(S['bom'],1):
            ws.write_row(i,0,[n,q,p]);ws.write_formula(i,3,f'=B{i+1}*C{i+1}',None,q*p);ws.write(i,4,note)
        ws.write(len(S['bom'])+1,0,'TOTAL NETO PROVISIONAL');ws.write_formula(len(S['bom'])+1,3,f'=SUM(D2:D{len(S["bom"])+1})',None,base['bom'])
        ws.write(len(S['bom'])+3,0,'No es lista liberada a fabricación. ESP32 devkit + LiPo2000 + carga/boost900. Sin CH340/TP4056/MT3608 separados.')
    write_summary(base,variants)
    print(json.dumps({'credito':base['principal'],'cuota':base['payment'],'bom':base['bom'],'anio1':yearly(base)[0]},ensure_ascii=False,indent=2))


if __name__=='__main__': main()
