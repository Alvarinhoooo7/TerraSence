import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const src=await SpreadsheetFile.importXlsx(await FileBlob.load("Flujo de caja final.xlsx"));
const out=await SpreadsheetFile.importXlsx(await FileBlob.load("outputs/terrasense-flujo-caja/Flujo de caja final - TerraSense formulado.xlsx"));
await fs.mkdir(".codex-work/final-previews",{recursive:true});
console.log("SRC_SHEETS\n"+(await src.inspect({kind:"sheet",include:"id,name",maxChars:5000})).ndjson);
console.log("OUT_SHEETS\n"+(await out.inspect({kind:"sheet",include:"id,name",maxChars:5000})).ndjson);
console.log("FORMULA_ERRORS\n"+(await out.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:300},summary:"final formula error scan",maxChars:5000})).ndjson);
console.log("KEY_FORMULAS\n"+(await out.inspect({kind:"formula",sheetId:"PROYECCIÓN + VAN",range:"A5:G50",maxChars:16000,options:{maxResults:300}})).ndjson);
for(const name of ["PARÁMETROS","BOM - COMPONENTES","EQUIPAMIENTO LAB","INVERSIÓN INICIAL","AMORTIZACIÓN BANCARIA","COSTO x UNIDAD","PROYECCIÓN + VAN"]){
 const region=await out.inspect({kind:"region",sheetId:name,maxChars:8000,tableMaxRows:60,tableMaxCols:15,tableMaxCellChars:100});
 console.log(`REGION ${name}\n${region.ndjson}`);
 const formulas=await out.inspect({kind:"formula",sheetId:name,maxChars:5000,options:{maxResults:100}});
 console.log(`FORMULAS ${name}\n${formulas.ndjson}`);
 const img=await out.render({sheetName:name,autoCrop:"all",scale:1.3,format:"png"});
 await fs.writeFile(`.codex-work/final-previews/${name.replace(/[^a-z0-9_-]/gi,"_")}.png`,new Uint8Array(await img.arrayBuffer()));
}

const params=out.worksheets.getItem("PARÁMETROS");
params.getRange("B14").values=[[0.60]];
params.getRange("B7").values=[[250]];
console.log("SCENARIO_MARGIN_60_UNITS_250\n"+(await out.inspect({kind:"region",sheetId:"PROYECCIÓN + VAN",range:"A5:G19",maxChars:8000,tableMaxRows:20,tableMaxCols:8})).ndjson);
console.log("SCENARIO_OUTPUTS\n"+(await out.inspect({kind:"region",sheetId:"PROYECCIÓN + VAN",range:"A28:G50",maxChars:10000,tableMaxRows:30,tableMaxCols:8})).ndjson);
