import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = "Flujo de caja final.xlsx";
const outDir = "outputs/terrasense-flujo-caja";
const outputPath = `${outDir}/Flujo de caja final - TerraSense formulado.xlsx`;
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(input));

const set = (sheet, range, values) => wb.worksheets.getItem(sheet).getRange(range).values = values;
const formulas = (sheet, range, values) => wb.worksheets.getItem(sheet).getRange(range).formulas = values;
const clear = (sheet, range) => wb.worksheets.getItem(sheet).getRange(range).clear({ applyTo: "contents" });

set("PARÁMETROS", "A1:C25", [
  ["PROYECTO TERRASENSE — SISTEMA IoT DE DIAGNÓSTICO AGRONÓMICO",null,null],
  ["Equipo: Alan Escobar - Alvaro Villenas",null,null],
  ["0",null,null],
  ["PARÁMETROS GENERALES","Valor","Notas"],
  ["Tipo de cambio USD → CLP",915,"BCCh, referencia 18-ago-2026"],
  ["Lote inicial (unidades beta)",10,"Preserie de validación"],
  ["Unidades Año 1",200,"Plan comercial adoptado"],
  ["Unidades Año 2",350,"Canal PRODESAL/INDAP"],
  ["Unidades Año 3",500,"Distribuidor agrícola"],
  ["Unidades Año 4",650,"Consolidación B2B"],
  ["Unidades Año 5",850,"Cobertura multirregional"],
  ["Tasa de descuento (r)",0.20,"Exigida por pauta de evaluación"],
  ["Tasa impuesto a la renta",0.25,"Régimen Pro Pyme General"],
  ["Margen de ganancia objetivo",0.30,"Mínimo sobre costo total"],
  ["0",null,null],
  ["FINANCIAMIENTO BANCARIO","Valor","Notas"],
  ["Monto financiado",15000000,"CLP: crédito largo + línea corta"],
  ["Tasa anual",0.10,"Crédito PYME largo plazo; línea corta 23%"],
  ["Tasa mensual",0.10/12,"Referencia del crédito largo"],
  ["Plazo","60 meses","5 años"],
  ["Cuota mensual fija",212471,"Referencia: crédito largo de $10.000.000"],
  ["Total a pagar",18190720,"Capital e intereses de ambas deudas"],
  ["Total intereses pagados",3190720,"$2.040.720 largo + $1.150.000 corto"],
  ["0",null,null],
  ["EXPLICACIÓN TASA DE DESCUENTO 20% La tasa representa la rentabilidad mínima exigida por la pauta. El modelo usa horizonte de 5 años, precio neto de IVA y costos en CLP; los supuestos provienen de la Sección XII del README del proyecto.","0","0"],
]);

const raw = [
 ["U1",1,"ESP32-WROOM-32E",3.2],["U2",1,"CH340C USB-Serial",0.35],["U3",1,"MAX3485 RS-485",0.15],["U4",1,"BME280",2.5],
 ["U5",1,"MT3608 elevador",0.08],["U6",1,"TP4056 cargador",0.10],["U7",1,"AP2112K-3.3 LDO",0.12],["Q1",1,"AO3401A P-MOSFET",0.02],
 ["Q2-Q3",2,"MMBT3904 NPN",0.04],["L1",1,"Inductor 22µH",0.20],["D3",1,"SS34 Schottky",0.05],["D4",1,"TVS dual ESD",0.08],
 ["D2/D5/D6",3,"LED 0603",0.03],["J1",1,"USB-C SMD",0.15],["J2",1,"Terminal 4 pines",0.18],["BT1",1,"JST PH batería",0.12],
 ["SW1/SW2",2,"Pulsador + interruptor",0.23],["R/C",30,"Resistores y capacitores SMD",0.17]
];
const factor = 6711 / (raw.reduce((a,r)=>a+r[3],0)*915);
const detailCosts = raw.map(r=>Math.round(r[3]*915*factor));
detailCosts[detailCosts.length-1] += 6711-detailCosts.reduce((a,b)=>a+b,0);
const bomRows = raw.map((r,i)=>[i+1,"Electrónica",r[2],r[0],"Según BOM",r[1],r[1],r[3],Math.round(r[3]*915),detailCosts[i],detailCosts[i],"PCB/BOM_TerraSense.xlsx"]);
[
 ["PCB + PCBA","JLCPCB",2229], ["Flete + arancel","Courier consolidado",1183], ["Baterías y protección","2×18650 + portacelda + fusible",4510],
 ["Conectores y sellado","USB-C, prensaestopas, O-ring, insertos",3250], ["Carcasa y empaque","PETG, energía, caja y manual",4773],
 ["Sonda principal","Sonda 7-en-1 RS-485 inox 316L",48000]
].forEach((r,j)=>bomRows.push([19+j,"Integración",r[0],r[1],"N/A",1,1,0,r[2],r[2],r[2],"README §XII.2.1"]));
set("BOM - COMPONENTES","A1:L32",[
 ["LISTA DE MATERIALES (BOM) - TERRASENSE",null,null,null,null,null,null,null,null,null,null,null],
 ["Costo unitario validado | USD 1 = CLP 915",null,null,null,null,null,null,null,null,null,null,null],
 ["0",null,null,null,null,null,null,null,null,null,null,null],
 ["ID","Categoría","Componente","Referencia","Encapsulado","Cant/Placa","Cant Compra","P.Unit USD","P.Unit CLP","Total Compra CLP","Costo/Unidad CLP","Distribuidor"],
 ...bomRows,
 ["0",null,null,null,null,null,null,null,null,null,null,null],
 ["0","0","0","0","0","0","0","0","0","TOTAL COMPRA",70656,"0"],
 ["0","0","0","0","0","0","0","0","0","Costo componentes / unidad",70656,"0"],
 ["0","0","0","0","0","0","0","0","0","Herramientas lab",0,"Incluidas en activo fijo"]
]);

set("EQUIPAMIENTO LAB","A1:E22",[
 ["EQUIPAMIENTO DE LABORATORIO TERRASENSE",null,null,null,null],["0",null,null,null,null],["DISPONIBLES (sin costo adicional)",null,null,null,null],
 ["  ✅ Espacio de trabajo en casa de socios",null,null,null,null],["  ✅ Internet base",null,null,null,null],["  ✅ Herramienta manual básica",null,null,null,null],
 ["  ✅ Teléfonos de prueba",null,null,null,null],["  ✅ Software y repositorio",null,null,null,null],["0",null,null,null,null],["A ADQUIRIR!!!","0","0","0","0"],
 ["0","Instrumento","Marca / Modelo","Precio CLP","Prioridad"],
 ["0","Impresora 3D FDM principal","Cámara cerrada",900000,"🔴 Alta"],["0","Impresora 3D FDM secundaria","Redundancia",450000,"🟡 Media"],
 ["0","Secador y almacenamiento filamento","Estanco",80000,"🟡 Media"],["0","Soldadura, aire caliente y microscopio","Banco SMD",240000,"🔴 Alta"],
 ["0","Fuente programable + multímetro banco","Banco eléctrico",250000,"🔴 Alta"],["0","Osciloscopio 100 MHz 2 canales","Instrumentación",400000,"🔴 Alta"],
 ["0","Analizador, programador y sonda µA","Instrumentación",160000,"🟡 Media"],["0","Banco IP67 + patrón pH/EC","Validación",530000,"🔴 Alta"],
 ["0","2 notebooks y puestos desarrollo","Uno por socio",1600000,"🔴 Alta"],["0","Mobiliario y almacenamiento","Taller",300000,"🟡 Media"],
 ["0","TOTAL",null,4910000,"0"]
]);

set("INVERSIÓN INICIAL","A1:D29",[
 ["INVERSIÓN INICIAL - TERRASENSE",null,null,null],["0",null,null,null],["COMPONENTE","Costo (CLP)","Notas",null],
 ["A. Constitución SpA y trámites",150000,"Activo nominal",null],["B. Ensayos agronómicos",900000,"30 muestras",null],["C. Ensayos IP67 y EMC",1500000,"Externos",null],
 ["D. Sitio web, marca y material",450000,"Comercial",null],["E. Patrones de calibración",120000,"pH y EC",null],["F. Herramienta menor y consumibles",150000,"Taller",null],
 ["G. Lote piloto de validación",913090,"10 uds × $91.309",null],["H. Capital de trabajo",14806910,"3 meses + primer lote 100 uds",null],
 ["I. Equipamiento de laboratorio",4910000,"Ver hoja EQUIPAMIENTO LAB",null],["J. Otros",0,"Sin partidas adicionales",null],["SUBTOTAL",23900000,"0",null],
 ["K. Contingencia / imprevistos",0,"Incorporada en capital de trabajo",null],["TOTAL INVERSIÓN INICIAL",23900000,"0",null],["0",null,null,null],
 ["FINANCIADO CON PRÉSTAMO BANCARIO",15000000,"$10MM largo + $5MM corto",null],["APORTE PROPIO",8900000,"2 socios: $4.450.000 cada uno",null],["0",null,null,null],
 ["HORAS DE TRABAJO (sin costo monetario)","H/Unid","# Unid","Total Horas"],["Ensamblado y QA por unidad",1.5,200,300],
 ["Programación y flasheo firmware",0.5,200,100],["Testing y calibración",0.5,200,100],["Embalaje y despacho",0.25,200,50],
 ["Desarrollo App y Web (total)",0,1,600],["Gestión / Administración / Compras",0,1,300],["TOTAL HORAS (2 socios)","0","0",1450],["Horas por socio","0","0",725]
]);

const annual = [[1,8788120,6638120,2150000,8361880],[2,2638120,1801932,836188,6559948],[3,2638120,1982125,655995,4577823],["Años 4-5",5276240,4578709,697531,0]];
const monthly=[]; let bal=10000000; const rate=.10/12; const pay=212471;
for(let m=1;m<=36;m++){const interest=Math.round(bal*rate); const principal=Math.min(bal,pay-interest); bal=Math.max(0,bal-principal); monthly.push([m,pay,principal,interest,bal]);}
set("AMORTIZACIÓN BANCARIA","A1:E55",[
 ["TABLA DE AMORTIZACIÓN BANCARIA - TERRASENSE",null,null,null,null],["0",null,null,null,null],["Monto préstamo",15000000,"CLP (incluye línea corta)",null,null],
 ["Tasa anual","10% / 23%","Largo / corto",null,null],["Tasa mensual",0.10/12,"Crédito largo",null,null],["Plazo","60 meses","Largo; línea corta 12 meses",null,null],
 ["Cuota mensual fija",212471,"Referencia crédito largo",null,null],["Total a pagar",18190720,"Ambas deudas",null,null],["Total intereses",3190720,"Ambas deudas",null,null],
 ["0",null,null,null,null],["RESUMEN ANUAL","0","0","0","0"],["Año","Cuotas pagadas","Capital amortizado","Intereses pagados","Saldo restante"],
 ...annual,["0",null,null,null,null],["TABLA MENSUAL DETALLADA","0","0","0","0"],["Mes","Cuota (CLP)","Capital (CLP)","Intereses (CLP)","Saldo (CLP)"],...monthly
]);

set("COSTO x UNIDAD","A1:D30",[
 ["ESTRUCTURA DE COSTOS POR UNIDAD Y PRECIO DE VENTA",null,null,null],["TerraSense — Año 1",null,null,null],["0",null,null,null],["COSTO VARIABLE / UNIDAD","CLP","Detalle",null],
 ["Componentes electrónicos y sistema (BOM)",70656,"Ver hoja BOM",null],["Flete nacional",6000,"Bluexpress",null],["Merma y scrap",2120,"3% del BOM",null],
 ["Provisión garantía legal",3533,"5% del BOM",null],["Mano de obra directa",9000,"1,5 h × $6.000",null],["COSTO TOTAL / UNIDAD",91309,"0",null],
 ["0",null,null,null],["PRECIO DE VENTA","0","0",null],["Costo variable / unidad",91309,"0",null],["Margen de ganancia",0.30,"Mínimo exigido",null],
 ["Precio de Venta (PVP)",249990,"CLP con IVA",null],["IVA incluido (19%)",-39914,"Débito fiscal",null],["Precio Neto Recibido",210076,"Sin IVA",null],
 ["UTILIDAD NETA / UNIDAD",118767,"Margen contribución antes de gastos fijos",null],["0",null,null,null],["BREAK-EVEN","0","0",null],
 ["Inversión Inicial Total",23900000,"CLP",null],["Utilidad neta / unidad",118767,"Contribución",null],["Unidades necesarias para recuperar inversión",168,"Punto equilibrio contable Año 1",null],
 ["0",null,null,null],["COMPARATIVA POR LOTE","Año 1","Año 3","Año 5"],["Componentes",70656,66417,63590],
 ["PCB / escala",0,0,0],["Carcasa / escala",0,0,0],["Otros costos variables",20653,19413,18588],["COSTO TOTAL / UNIDAD",91309,85830,82178]
]);

set("PROYECCIÓN + VAN","A1:G50",[
 ["PROYECCIÓN FINANCIERA A 5 AÑOS - TERRASENSE",null,null,null,null,null,null],["Tasa descuento 20% | Precio $249.990 IVA incl. | Inversión $23.900.000",null,null,null,null,null,null],["0",null,null,null,null,null,null],
 ["SUPUESTOS","0","0","0","0","0","0"],["Tasa de descuento (r)",0.20,"Pauta de evaluación",null,null,null,null],["Tasa impuesto renta",0.25,"Pro Pyme General",null,null,null,null],
 ["PVP","CLP 249990","IVA incluido",null,null,null,null],["Precio neto (sin IVA)","CLP 210076","Ingreso real por venta",null,null,null,null],["Costo variable / unidad","CLP 91309","Año 1",null,null,null,null],["0",null,null,null,null,null,null],
 ["ESTADO DE RESULTADOS","AÑO 0","AÑO 1","AÑO 2","AÑO 3","AÑO 4","AÑO 5"],["Unidades",10,200,350,500,650,850],
 ["(+) Ingresos netos (CLP)",0,42015200,73526600,105038000,136549400,178564600],["(-) Costos variables",0,18261800,30999500,42915000,54602600,69851300],
 ["(=) Margen Bruto",0,23753400,42527100,62123000,81946800,108713300],["(-) Costo financiero (intereses préstamo)",0,2150000,836188,655995,457782,239749],
 ["(=) Utilidad Operacional",0,3845358,11889722,5215815,14207828,24142361],["(-) Impuesto renta (25%)",0,961340,2972431,1303954,3551957,6035590],
 ["(=) Utilidad Neta",0,2884019,8917292,3911861,10655871,18106771],["0",null,null,null,null,null,null],
 ["FLUJO DE CAJA","AÑO 0","AÑO 1","AÑO 2","AÑO 3","AÑO 4","AÑO 5"],["Inversión inicial",-23900000,0,0,0,0,0],
 ["Utilidad neta","0",2884019,8917292,3911861,10655871,18106771],["(-) Amortización capital préstamo","0",6638120,1801932,1982125,2180338,2398371],
 ["FLUJO NETO DEL PERÍODO",-23900000,-2942911,7926550,2740926,9286723,16519590],["FLUJO ACUMULADO",-23900000,-26842911,-18916361,-16175435,-8508508,9630878],["0",null,null,null,null,null,null],
 ["CÁLCULO DEL VAN (r = 20%)","0","0","0","0","0","0"],["Factor descuento (1+r)^n","0",1.2,1.44,1.728,2.0736,2.48832],
 ["Valor Presente de flujos","0",-2452426,5504549,1586184,4478543,6638855],["Sumatoria VP flujos","0","0","0","0","0",15755705],
 ["Inversión inicial",-23900000,"0","0","0","0","0"],["VAN (Valor Actual Neto)",-8144295,"0","0","0","0","0"],
 ["Resultado","❌ VAN NEGATIVO","0","0","0","0","0"],["0",null,null,null,null,null,null],
 ["PAY BACK","AÑO 0","AÑO 1","AÑO 2","AÑO 3","AÑO 4","AÑO 5"],["Flujo acumulado",-23900000,-26842911,-18916361,-16175435,-8508508,9630878],
 ["¿Inversión recuperada?","NO ❌","NO ❌","NO ❌","NO ❌","NO ❌","SÍ ✅"],["0",null,null,null,null,null,null],
 ["TOMA DE DECISIONES","0","0","0","0","0","0"],["1. En base al VAN (r = 20%):",null,null,null,null,null,null],
 ["   VAN ≈ -CLP 8,14 millones",null,null,null,null,null,null],["   ❌ No cumple 20% a 5 años.",null,null,null,null,null,null],
 ["   Utilidad positiva desde Año 1; flujo Año 1 negativo por deuda.",null,null,null,null,null,null],["0",null,null,null,null,null,null],
 ["2. En base al PAY BACK:",null,null,null,null,null,null],["   Unidades proyectadas (Años 1-5): 2.550",null,null,null,null,null,null],
 ["   Punto de equilibrio contable Año 1: 168 unidades; plan: 200.",null,null,null,null,null,null],
 ["   Pay Back estimado: 4,42 años.",null,null,null,null,null,null],
 ["   El flujo acumulado pasa a positivo durante el Año 5.",null,null,null,null,null,null]
]);

// Limpiar los ceros de relleno de la pauta sin tocar formatos, dimensiones ni estructura.
[
 ["PARÁMETROS","A3:C3"],["PARÁMETROS","A15:C15"],["PARÁMETROS","A24:C24"],
 ["BOM - COMPONENTES","A3:L3"],["BOM - COMPONENTES","A29:L29"],["BOM - COMPONENTES","A30:I32"],["BOM - COMPONENTES","L30:L32"],
 ["EQUIPAMIENTO LAB","A2:E2"],["EQUIPAMIENTO LAB","A9:E9"],["EQUIPAMIENTO LAB","B10:E10"],["EQUIPAMIENTO LAB","A11"],["EQUIPAMIENTO LAB","A22"],["EQUIPAMIENTO LAB","E22"],
 ["INVERSIÓN INICIAL","A2:D2"],["INVERSIÓN INICIAL","A17:D17"],["INVERSIÓN INICIAL","A20:D20"],["INVERSIÓN INICIAL","C14:C16"],
 ["AMORTIZACIÓN BANCARIA","A2:E2"],["AMORTIZACIÓN BANCARIA","A10:E10"],["AMORTIZACIÓN BANCARIA","B11:E11"],["AMORTIZACIÓN BANCARIA","A17:E17"],["AMORTIZACIÓN BANCARIA","B18:E18"],
 ["COSTO x UNIDAD","A3:D3"],["COSTO x UNIDAD","A11:D11"],["COSTO x UNIDAD","A19:D19"],["COSTO x UNIDAD","A24:D24"],["COSTO x UNIDAD","B12:C12"],["COSTO x UNIDAD","B20:C20"],
 ["PROYECCIÓN + VAN","A3:G3"],["PROYECCIÓN + VAN","B4:G4"],["PROYECCIÓN + VAN","A20:G20"],["PROYECCIÓN + VAN","A27:G27"],["PROYECCIÓN + VAN","B28:G28"],
 ["PROYECCIÓN + VAN","B31:F31"],["PROYECCIÓN + VAN","C32:G34"],["PROYECCIÓN + VAN","A35:G35"],["PROYECCIÓN + VAN","A39:G39"],["PROYECCIÓN + VAN","B40:G40"],["PROYECCIÓN + VAN","A45:G45"]
].forEach(([s,r])=>clear(s,r));

// Entradas ajustables centrales.
set("PARÁMETROS","B14:C14",[[0.5653517741,"🔧 AJUSTABLE: margen bruto sobre precio neto"]]);
set("PARÁMETROS","C7:C11",[["🔧 AJUSTABLE: unidades Año 1"],["🔧 AJUSTABLE: unidades Año 2"],["🔧 AJUSTABLE: unidades Año 3"],["🔧 AJUSTABLE: unidades Año 4"],["🔧 AJUSTABLE: unidades Año 5"]]);
set("PARÁMETROS","C12:C13",[["🔧 AJUSTABLE: tasa de descuento"],["🔧 AJUSTABLE: impuesto renta"]]);

// BOM: precios base por pieza en USD; las columnas CLP, compras y costo unitario son fórmulas.
const bomUnitClp = [...detailCosts,2229,1183,4510,3250,4773,48000];
const bomQty = raw.map(r=>r[1]).concat([1,1,1,1,1,1]);
set("BOM - COMPONENTES","H5:H28",bomUnitClp.map((v,i)=>[v/(bomQty[i]*915)]));
formulas("BOM - COMPONENTES","I5:K28",bomUnitClp.map((_,i)=>{
  const row=i+5;
  return [`=H${row}*'PARÁMETROS'!$B$5`,`=I${row}*G${row}`,`=ROUND(I${row}*F${row},0)`];
}));
set("BOM - COMPONENTES","J30:J32",[["TOTAL COMPRA"],["Costo componentes / unidad"],["Herramientas lab"]]);
formulas("BOM - COMPONENTES","K30:K32",[["=ROUND(SUM(J5:J28),0)"],["=SUM(K5:K28)"],["='EQUIPAMIENTO LAB'!D22"]]);

// Equipamiento e inversión inicial.
formulas("EQUIPAMIENTO LAB","D22",[["=SUM(D12:D21)"]]);
formulas("INVERSIÓN INICIAL","B14:B16",[["=SUM(B4:B13)"],["=0"],["=SUM(B14:B15)"]]);
formulas("INVERSIÓN INICIAL","B18:B19",[["='AMORTIZACIÓN BANCARIA'!B3"],["=B16-B18"]]);
set("INVERSIÓN INICIAL","B22:C27",[[1.5,200],[0.5,200],[0.5,200],[0.25,200],[600,1],[300,1]]);
formulas("INVERSIÓN INICIAL","D22:D27",Array.from({length:6},(_,i)=>[`=B${22+i}*C${22+i}`]));
formulas("INVERSIÓN INICIAL","D28:D29",[["=SUM(D22:D27)"],["=D28/2"]]);

// Financiamiento: supuestos visibles para crédito largo y línea corta.
set("AMORTIZACIÓN BANCARIA","D3:E6",[["Crédito largo",10000000],["Tasa largo",0.10],["Línea corta",5000000],["Tasa corta",0.23]]);
set("AMORTIZACIÓN BANCARIA","A18",[["TABLA MENSUAL — CRÉDITO LARGO (MESES 1–36 DE 60)"]]);
formulas("AMORTIZACIÓN BANCARIA","B3:B9",[
 ["=E3+E5"],["=E4"],["=E4/12"],["=60"],["=ROUND(-PMT(E4/12,B6,E3),0)"],["=B7*B6+E5*(1+E6)"],["=B8-B3"]
]);
set("AMORTIZACIÓN BANCARIA","C3:C9",[["CLP total"],["Crédito largo; línea corta en E6"],["Crédito largo"],["Meses crédito largo"],["Cuota crédito largo"],["Ambas deudas"],["Ambas deudas"]]);
formulas("AMORTIZACIÓN BANCARIA","E7:E9",[
 ["=ROUND(MAX(0,$E$3*(1+$B$5)^48-$B$7*((1+$B$5)^48-1)/$B$5),0)"],["=0"],["=$B$7*12"]
]);
set("AMORTIZACIÓN BANCARIA","D7:D9",[["Saldo fin Año 4"],["Saldo fin Año 5"],["Pago anual largo"]]);
formulas("AMORTIZACIÓN BANCARIA","B13:E16",[
 ["=ROUND($E$9+$E$5*(1+$E$6),0)","=ROUND($E$3+$E$5-E13,0)","=B13-C13","=ROUND(MAX(0,$E$3*(1+$B$5)^12-$B$7*((1+$B$5)^12-1)/$B$5),0)"],
 ["=$E$9","=E13-E14","=B14-C14","=ROUND(MAX(0,E13*(1+$B$5)^12-$B$7*((1+$B$5)^12-1)/$B$5),0)"],
 ["=$E$9","=E14-E15","=B15-C15","=ROUND(MAX(0,E14*(1+$B$5)^12-$B$7*((1+$B$5)^12-1)/$B$5),0)"],
 ["=$E$9*2","=E15-$E$8","=B16-C16","=$E$8"]
]);
for(let i=0;i<36;i++){
  const row=20+i, month=i+1;
  set("AMORTIZACIÓN BANCARIA",`A${row}`,[[month]]);
  formulas("AMORTIZACIÓN BANCARIA",`B${row}:E${row}`,[[
   "=$B$7",
   `=ROUND(B${row}-D${row},0)`,
   month===1?"=ROUND($E$3*$B$5,0)":`=ROUND(E${row-1}*$B$5,0)`,
   month===1?`=ROUND($E$3-C${row},0)`:`=ROUND(E${row-1}-C${row},0)`
  ]]);
}

// La hoja PARÁMETROS enlaza los resultados de financiamiento.
formulas("PARÁMETROS","B17:B23",[
 ["='AMORTIZACIÓN BANCARIA'!B3"],["='AMORTIZACIÓN BANCARIA'!E4"],["=B18/12"],["='AMORTIZACIÓN BANCARIA'!B6"],
 ["='AMORTIZACIÓN BANCARIA'!B7"],["='AMORTIZACIÓN BANCARIA'!B8"],["='AMORTIZACIÓN BANCARIA'!B9"]
]);

// Costo unitario y precio: el margen de PARÁMETROS!B14 determina el precio.
formulas("COSTO x UNIDAD","B5:B10",[
 ["='BOM - COMPONENTES'!K31"],["=6000"],["=ROUND(B5*3%,0)"],["=ROUND(B5*5%,0)"],["=9000"],["=SUM(B5:B9)"]
]);
formulas("COSTO x UNIDAD","B13:B18",[
 ["=B10"],["='PARÁMETROS'!B14"],["=ROUND(B13/(1-B14)*1.19,0)"],["=-ROUND(B15*19/119,0)"],["=B15+B16"],["=B17-B13"]
]);
formulas("COSTO x UNIDAD","B21:B23",[
 ["='INVERSIÓN INICIAL'!B16"],["=B18"],["=ROUNDUP(('PROYECCIÓN + VAN'!C15-'PROYECCIÓN + VAN'!C17)/B18,0)"]
]);
formulas("COSTO x UNIDAD","B26:D26",[["=B5","=ROUND(B5*94%,0)","=ROUND(B5*90%,0)"]]);
formulas("COSTO x UNIDAD","B27:D28",[["=0","=0","=0"],["=0","=0","=0"]]);
formulas("COSTO x UNIDAD","B29:D29",[["=B30-B26","=C30-C26","=D30-D26"]]);
formulas("COSTO x UNIDAD","B30:D30",[["=B10","=ROUND(B10*94%,0)","=ROUND(B10*90%,0)"]]);

// Proyección dinámica: unidades y margen se propagan a todo el modelo.
formulas("PROYECCIÓN + VAN","B5:B9",[
 ["='PARÁMETROS'!B12"],["='PARÁMETROS'!B13"],["='COSTO x UNIDAD'!B15"],["='COSTO x UNIDAD'!B17"],["='COSTO x UNIDAD'!B10"]
]);
set("PROYECCIÓN + VAN","A10:G10",[["Gastos fijos",0,16946852,28990000,55440000,66470000,83520000]]);
formulas("PROYECCIÓN + VAN","B12:G12",[[
 "='PARÁMETROS'!B6","='PARÁMETROS'!B7","='PARÁMETROS'!B8","='PARÁMETROS'!B9","='PARÁMETROS'!B10","='PARÁMETROS'!B11"
]]);
formulas("PROYECCIÓN + VAN","B13:G13",[["=0","=C12*$B$8","=D12*$B$8","=E12*$B$8","=F12*$B$8","=G12*$B$8"]]);
formulas("PROYECCIÓN + VAN","B14:G14",[[
 "=0","=C12*'COSTO x UNIDAD'!B30","=D12*AVERAGE('COSTO x UNIDAD'!B30,'COSTO x UNIDAD'!C30)",
 "=E12*'COSTO x UNIDAD'!C30","=F12*AVERAGE('COSTO x UNIDAD'!C30,'COSTO x UNIDAD'!D30)","=G12*'COSTO x UNIDAD'!D30"
]]);
formulas("PROYECCIÓN + VAN","B15:G15",[["=B13-B14","=C13-C14","=D13-D14","=E13-E14","=F13-F14","=G13-G14"]]);
formulas("PROYECCIÓN + VAN","B16:G16",[[
 "=0","='AMORTIZACIÓN BANCARIA'!D13","='AMORTIZACIÓN BANCARIA'!D14","='AMORTIZACIÓN BANCARIA'!D15",
 "='AMORTIZACIÓN BANCARIA'!$E$9-('AMORTIZACIÓN BANCARIA'!E15-'AMORTIZACIÓN BANCARIA'!$E$7)",
 "='AMORTIZACIÓN BANCARIA'!$E$9-('AMORTIZACIÓN BANCARIA'!$E$7-'AMORTIZACIÓN BANCARIA'!$E$8)"
]]);
const depreciation="=('EQUIPAMIENTO LAB'!D22-'EQUIPAMIENTO LAB'!D21)/6+'EQUIPAMIENTO LAB'!D21/7";
formulas("PROYECCIÓN + VAN","B17:G17",[[
 "=0",`=ROUND(C15-C10-(${depreciation.slice(1)})-C16,0)`,`=ROUND(D15-D10-(${depreciation.slice(1)})-D16,0)`,`=ROUND(E15-E10-(${depreciation.slice(1)})-E16,0)`,
 `=ROUND(F15-F10-(${depreciation.slice(1)})-F16,0)`,`=ROUND(G15-G10-(${depreciation.slice(1)})-G16,0)`
]]);
formulas("PROYECCIÓN + VAN","B18:G18",[["=0","=ROUND(MAX(0,C17*$B$6),0)","=ROUND(MAX(0,D17*$B$6),0)","=ROUND(MAX(0,E17*$B$6),0)","=ROUND(MAX(0,F17*$B$6),0)","=ROUND(MAX(0,G17*$B$6),0)"]]);
formulas("PROYECCIÓN + VAN","B19:G19",[["=B17-B18","=C17-C18","=D17-D18","=E17-E18","=F17-F18","=G17-G18"]]);
formulas("PROYECCIÓN + VAN","B22:G22",[["=-'INVERSIÓN INICIAL'!B16","=0","=0","=0","=0","=0"]]);
formulas("PROYECCIÓN + VAN","B23:G23",[["=0","=C19","=D19","=E19","=F19","=G19"]]);
formulas("PROYECCIÓN + VAN","B24:G24",[[
 "=0","='AMORTIZACIÓN BANCARIA'!C13","='AMORTIZACIÓN BANCARIA'!C14","='AMORTIZACIÓN BANCARIA'!C15",
 "='AMORTIZACIÓN BANCARIA'!E15-'AMORTIZACIÓN BANCARIA'!$E$7","='AMORTIZACIÓN BANCARIA'!$E$7-'AMORTIZACIÓN BANCARIA'!$E$8"
]]);
formulas("PROYECCIÓN + VAN","B25:G25",[["=B22",`=ROUND(C23+(${depreciation.slice(1)})-C24,0)`,`=ROUND(D23+(${depreciation.slice(1)})-D24,0)`,`=ROUND(E23+(${depreciation.slice(1)})-E24,0)`,`=ROUND(F23+(${depreciation.slice(1)})-F24,0)`,`=ROUND(G23+(${depreciation.slice(1)})-G24,0)`]]);
formulas("PROYECCIÓN + VAN","B26:G26",[["=B25","=B26+C25","=C26+D25","=D26+E25","=E26+F25","=F26+G25"]]);
formulas("PROYECCIÓN + VAN","B29:G29",[["=1","=(1+$B$5)^1","=(1+$B$5)^2","=(1+$B$5)^3","=(1+$B$5)^4","=(1+$B$5)^5"]]);
formulas("PROYECCIÓN + VAN","B30:G30",[["=0","=ROUND(C25/C29,0)","=ROUND(D25/D29,0)","=ROUND(E25/E29,0)","=ROUND(F25/F29,0)","=ROUND(G25/G29,0)"]]);
formulas("PROYECCIÓN + VAN","G31",[["=SUM(C30:G30)"]]);
formulas("PROYECCIÓN + VAN","B32:B34",[["=B22"],["=G31+B32"],["=IF(B33>=0,\"✅ VAN POSITIVO\",\"❌ VAN NEGATIVO\")"]]);
formulas("PROYECCIÓN + VAN","B37:G37",[["=B26","=C26","=D26","=E26","=F26","=G26"]]);
formulas("PROYECCIÓN + VAN","B38:G38",[["=IF(B37>=0,\"SÍ ✅\",\"NO ❌\")","=IF(C37>=0,\"SÍ ✅\",\"NO ❌\")","=IF(D37>=0,\"SÍ ✅\",\"NO ❌\")","=IF(E37>=0,\"SÍ ✅\",\"NO ❌\")","=IF(F37>=0,\"SÍ ✅\",\"NO ❌\")","=IF(G37>=0,\"SÍ ✅\",\"NO ❌\")"]]);
formulas("PROYECCIÓN + VAN","A42:A44",[["=\"VAN = CLP \"&TEXT(B33,\"#,##0\")"],["=IF(B33>=0,\"✅ Cumple la tasa exigida\",\"❌ No cumple la tasa exigida\")"],["=\"TIR = \"&TEXT(IRR(B25:G25),\"0.0%\")"]]);
formulas("PROYECCIÓN + VAN","A47:A50",[
 ["=\"Unidades proyectadas (Años 1-5): \"&TEXT(SUM(C12:G12),\"#,##0\")"],
 ["=\"Punto equilibrio Año 1: \"&TEXT('COSTO x UNIDAD'!B23,\"#,##0\")&\" unidades; plan: \"&TEXT(C12,\"#,##0\")"],
 ["=\"Pay Back: \"&IF(C26>=0,TEXT(ABS(B26)/C25,\"0.00\"),IF(D26>=0,TEXT(1+ABS(C26)/D25,\"0.00\"),IF(E26>=0,TEXT(2+ABS(D26)/E25,\"0.00\"),IF(F26>=0,TEXT(3+ABS(E26)/F25,\"0.00\"),IF(G26>=0,TEXT(4+ABS(F26)/G25,\"0.00\"),\"más de 5\")))))&\" años\""],
 ["=IF(G26>=0,\"El flujo acumulado pasa a positivo dentro de 5 años.\",\"El flujo acumulado no se recupera en 5 años.\")"]
]);

// Títulos dinámicos y presentación numérica; no se modifican anchos, filas ni estilos base.
formulas("PROYECCIÓN + VAN","A2",[["=\"Tasa descuento \"&TEXT(B5,\"0%\")&\" | Precio $\"&TEXT(B7,\"#,##0\")&\" IVA incl. | Inversión $\"&TEXT('INVERSIÓN INICIAL'!B16,\"#,##0\")"]]);
formulas("PROYECCIÓN + VAN","A28",[["=\"CÁLCULO DEL VAN (r = \"&TEXT(B5,\"0%\")&\")\""]]);
formulas("PROYECCIÓN + VAN","A41",[["=\"1. En base al VAN (r = \"&TEXT(B5,\"0%\")&\"):\""]]);
formulas("PARÁMETROS","A25",[["=\"EXPLICACIÓN TASA DE DESCUENTO \"&TEXT(B12,\"0%\")&\" La tasa representa la rentabilidad mínima exigida por la pauta. El modelo usa horizonte de 5 años, precio neto de IVA y costos en CLP; los supuestos provienen de la Sección XII del README del proyecto.\""]]);
clear("PARÁMETROS","B25:C29");
clear("EQUIPAMIENTO LAB","A12:A21");
clear("COSTO x UNIDAD","C10:C10");
clear("COSTO x UNIDAD","C13:C14");
wb.worksheets.getItem("PARÁMETROS").getRange("B12:B14").setNumberFormat("0.0%");
wb.worksheets.getItem("PARÁMETROS").getRange("B18:B19").setNumberFormat("0.0%");
wb.worksheets.getItem("AMORTIZACIÓN BANCARIA").getRange("B4:B5").setNumberFormat("0.0%");
wb.worksheets.getItem("AMORTIZACIÓN BANCARIA").getRange("E4:E4").setNumberFormat("0.0%");
wb.worksheets.getItem("AMORTIZACIÓN BANCARIA").getRange("E6:E6").setNumberFormat("0.0%");
wb.worksheets.getItem("COSTO x UNIDAD").getRange("B14:B14").setNumberFormat("0.0%");
wb.worksheets.getItem("PROYECCIÓN + VAN").getRange("B5:B6").setNumberFormat("0.0%");
wb.worksheets.getItem("BOM - COMPONENTES").getRange("H5:H28").setNumberFormat("0.0000");
wb.worksheets.getItem("BOM - COMPONENTES").getRange("I5:I28").setNumberFormat("#,##0.00");

await fs.mkdir(outDir,{recursive:true});
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);
console.log(outputPath);
