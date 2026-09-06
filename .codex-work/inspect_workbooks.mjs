import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

async function inspectBook(path, tag) {
  const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
  const summary = await wb.inspect({ kind: "workbook,sheet,table,definedName,drawing", maxChars: 18000, tableMaxRows: 40, tableMaxCols: 30, tableMaxCellChars: 120 });
  console.log(`---${tag}---\n${summary.ndjson}`);
  const sheets = JSON.parse(`[${(await wb.inspect({kind:"sheet",include:"id,name",maxChars:5000})).ndjson.trim().split("\n").filter(Boolean).join(",")}]`);
  await fs.mkdir(".codex-work/previews", { recursive: true });
  for (const s of sheets) {
    const name = s.name ?? s.sheetName;
    if (!name) continue;
    const region = await wb.inspect({kind:"region",sheetId:name,maxChars:24000,tableMaxRows:100,tableMaxCols:40,tableMaxCellChars:100});
    console.log(`---${tag}:${name}:REGION---\n${region.ndjson}`);
    const formulas = await wb.inspect({kind:"formula",sheetId:name,maxChars:12000,options:{maxResults:300}});
    console.log(`---${tag}:${name}:FORMULAS---\n${formulas.ndjson}`);
    const img = await wb.render({sheetName:name,autoCrop:"all",scale:1.2,format:"png"});
    await fs.writeFile(`.codex-work/previews/${tag}-${name.replace(/[^a-z0-9_-]/gi,"_")}.png`, new Uint8Array(await img.arrayBuffer()));
  }
}

await inspectBook("Flujo de caja final.xlsx", "template");
await inspectBook("PCB/BOM_TerraSense.xlsx", "bom");
