import pandas as pd
import sys

file_path = "Flujo de caja y financiamiento - TerraSense.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    for sheet_name in xl.sheet_names:
        print(f"=== Sheet: {sheet_name} ===")
        df = xl.parse(sheet_name)
        # Drop completely empty columns and rows to reduce output size
        df = df.dropna(how='all', axis=1).dropna(how='all', axis=0)
        # Print a concise representation of the dataframe
        with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 1000):
            print(df)
        print("\n" + "="*50 + "\n")
except Exception as e:
    print(f"Error: {e}")
