"""Bloque económico del README, generado desde el modelo; sin cifras duplicadas."""
from pathlib import Path


def update_readme(base, variants, settings, yearly, evaluation_markdown):
    path=Path(__file__).resolve().parents[1]/'README.md'
    text=path.read_text(encoding='utf-8')
    start='<!-- FINANZAS:INICIO -->'
    end='<!-- FINANZAS:FIN -->'
    if start not in text:
        return
    money=lambda v: '$'+f'{v:,.0f}'.replace(',','.')
    net=settings['precio_iva']/(1+settings['iva'])
    extra=base['bom']*(settings['merma_fraccion_bom']+settings['garantia_fraccion_bom'])+settings['envio_neto']+settings['precio_iva']*settings['comision_sobre_bruto']
    lines=['## Finanzas y modelo económico','',
        f'Precio de venta: **{money(settings["precio_iva"])} CLP con IVA** ({money(net)} netos). Evaluación del proyecto a cinco años, 2027–2031, con flujos mensuales y tasa de descuento del 20 % anual.','',
        '### BOM y margen por equipo','',
        '| Componente | Cantidad | Costo unitario neto CLP | Subtotal CLP |','|---|---:|---:|---:|']
    for name,q,p,_ in settings['bom']:
        lines.append(f'| {name} | {q} | {money(p)} | {money(q*p)} |')
    lines += [f'| **Total BOM** | | | **{money(base["bom"])}** |','',
        'El **BME280 cuesta $3.500 con IVA** por equipo. La **carcasa impresa en 3D** se incluye como servicio externo a $6.000 netos, con material, impresión, energía y acabado. Las fijaciones, juntas y ventilación protegida del sensor se contabilizan aparte a $1.500 netos.','',
        f'Merma (3 %), reposiciones (5 %), envío y comisión suman **{money(extra)} por equipo**. El costo variable total es **{money(base["bom"]+extra)}** y el margen de contribución es **{money(net-base["bom"]-extra)} ({(net-base["bom"]-extra)/net:.1%} de la venta neta)**. El ensamblaje final se paga en la nómina. La API de pronóstico tiene costo directo de **$0**; los servicios digitales restantes conservan su presupuesto.','',
        '### Inversión y financiamiento','',
        '| Concepto | CLP |','|---|---:|',
        f'| Activos, desarrollo y formalización | {money(base["setup"])} |',
        f'| Inventario inicial, IVA incluido | {money(base["initial_uses"]-base["setup"])} |',
        f'| **Desembolso inicial** | **{money(base["initial_uses"])}** |',
        f'| Aporte de socios | {money(settings["aporte_socios"])} |',
        f'| Crédito a {settings["plazo_base"]} años, 12 % efectivo anual | {money(base["principal"])} |',
        f'| Gastos de apertura | {money(base["fees"])} |',
        f'| Caja inicial, reserva incluida | {money(base["initial_cash"])} |',
        f'| Cuota mensual | {money(base["payment"])} |','',
        'El crédito cubre el desembolso y las necesidades de caja estacionales. Se dimensiona en tramos de $100.000 para mantener, durante los primeros 24 meses, una reserva de tres meses de gastos fijos y cuotas más 10 % del desembolso inicial.','',
        '### Flujo de caja anual','',
        '| Año | Equipos vendidos | EBITDA | Servicio deuda | Caja final | DSCR | Equilibrio operativo / con deuda |',
        '|---|---:|---:|---:|---:|---:|---:|']
    for r in yearly(base)[:5]:
        lines.append(f'| {r["anio"]} | {r["unidades"]} | {money(r["ebitda"])} | {money(r["servicio_deuda"])} | {money(r["caja"])} | {r["dscr"]:.2f} | {r["equilibrio_operativo"]} / {r["equilibrio_con_deuda"]} |')
    lines += ['', 'La nómina incluye socios, producción y soporte. La contabilidad externa se incorpora desde el primer mes; la contratación aumenta con las horas de trabajo y la base de equipos activos. El DSCR compara la caja disponible para deuda con capital e intereses.','',
        '### VAN, TIR y payback','',evaluation_markdown(variants),'',
        'Los tres indicadores se calculan sobre el flujo del proyecto: inversión inicial, operación, impuestos, inventario, reinversión y variaciones de caja mínima operativa. La TIR se expresa como tasa efectiva anual y el payback interpola el mes de recuperación. El horizonte de evaluación es de 60 meses, sin valor terminal.','',
        'La inversión económica incluye el desembolso inicial y la caja mínima operativa. El préstamo y sus cuotas se analizan en el flujo de financiamiento; los sueldos forman parte del costo de operación.','',
        '[Flujo de caja Excel](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) · [BOM Excel](PCB/BOM_TerraSense.xlsx) · [Resultados completos](docs/RESULTADOS_FINANCIEROS.md) · [Metodología y supuestos](docs/MODELO_ECONOMICO.md)','',
        'Actualizar cifras: `python finanzas/modelo.py`.']
    path.write_text(text.split(start)[0]+start+'\n\n'+'\n'.join(lines)+'\n\n'+end+text.split(end)[1],encoding='utf-8')
