import pandas as pd
import json
import os

excel_path = r"C:\Users\Marcus\OneDrive\Desktop\itbi 2025-26.xlsx"
store_path = "data_store.json"

print("Excel File exists:", os.path.exists(excel_path))
if os.path.exists(excel_path):
    try:
        # Load excel file structure
        xl = pd.ExcelFile(excel_path)
        print("Sheet names:", xl.sheet_names)
        
        # Load first sheet
        df = xl.parse(xl.sheet_names[0])
        print("Columns:", df.columns.tolist())
        print("Row count:", len(df))
        print("Preview (first 5 rows):")
        print(df.head(5))
        print("Preview (last 5 rows):")
        print(df.tail(5))
        
        # Let's count non-null values in columns
        print("Non-null counts:")
        print(df.count())
        
    except Exception as e:
        print("Error reading excel:", e)

if os.path.exists(store_path):
    try:
        with open(store_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("\nStore details:")
        print("Auctions count in store:", len(data.get("auctions", [])))
        print("ITBI transactions in store:", len(data.get("itbiTransactions", [])))
        if len(data.get("itbiTransactions", [])) > 0:
            print("First transaction in store:", data["itbiTransactions"][0])
            print("Last transaction in store:", data["itbiTransactions"][-1])
    except Exception as e:
        print("Error reading store:", e)
