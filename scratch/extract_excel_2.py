import pandas as pd
import sys

file_path = "Flujo de caja y financiamiento - TerraSense.xlsx"
out_path = "scratch/excel_output_utf8.txt"

try:
    with open(out_path, 'w', encoding='utf-8') as f:
        xl = pd.ExcelFile(file_path)
        for sheet_name in xl.sheet_names:
            f.write(f"=== Sheet: {sheet_name} ===\n")
            df = xl.parse(sheet_name)
            df = df.dropna(how='all', axis=1).dropna(how='all', axis=0)
            with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 1000):
                f.write(str(df) + "\n")
            f.write("\n" + "="*50 + "\n")
except Exception as e:
    print(f"Error: {e}")
