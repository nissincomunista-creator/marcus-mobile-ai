import os
import json
import pandas as pd

# List potential file paths on Desktop
possible_paths = [
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI_TRANSACOES_2025_diante-2.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI_TRANSACOES_PUBLICAR-8.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\itbi 2025-26.xlsx",
    r"c:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\itbi 2025-26.xlsx.xlsx"
]

json_path = "data_store.json"

def import_data():
    excel_path = None
    for path in possible_paths:
        if os.path.exists(path):
            excel_path = path
            break
            
    if not excel_path:
        print(f"Error: No ITBI Excel file found on Desktop. Checked paths: {possible_paths}")
        return False
        
    print(f"Reading Excel file from: {excel_path}...")
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return False

    print(f"Excel row count: {len(df)}")
    
    # Process rows
    transactions = []
    skipped_nan = 0
    
    # Determine the column names dynamically
    cols = df.columns.tolist()
    bairro_col = 'nm_bairro_norm' if 'nm_bairro_norm' in cols else ('bairro' if 'bairro' in cols else ('nm_bairro' if 'nm_bairro' in cols else None))
    tipo_col = 'ds_imovel_tipologia' if 'ds_imovel_tipologia' in cols else ('tipologia' if 'tipologia' in cols else None)
    val_col = 'vl_declarado' if 'vl_declarado' in cols else ('Valor_transacoes' if 'Valor_transacoes' in cols else ('valor_transacao' if 'valor_transacao' in cols else None))
    m2_col = 'valor_m2' if 'valor_m2' in cols else None
    area_col = 'area' if 'area' in cols else None
    anomes_col = 'anomes' if 'anomes' in cols else None
    ano_col = 'ano' if 'ano' in cols else None
    mes_col = 'mes' if 'mes' in cols else None
    logr_col = 'nm_logradouro' if 'nm_logradouro' in cols else ('logradouro' if 'logradouro' in cols else None)
    num_col = 'NUMERO' if 'NUMERO' in cols else ('numero' if 'numero' in cols else ('nu_numero' if 'nu_numero' in cols else None))
    compl_col = 'COMPLEMENTO' if 'COMPLEMENTO' in cols else ('complemento' if 'complemento' in cols else ('ds_complemento' if 'ds_complemento' in cols else None))
    desc_col = 'DESCRICAO' if 'DESCRICAO' in cols else ('descricao' if 'descricao' in cols else None)
    
    if not bairro_col:
        print("Error: Could not identify neighborhood (bairro/nm_bairro/nm_bairro_norm) column in Excel.")
        return False

    for idx, row in df.iterrows():
        bairro = row.get(bairro_col)
        if pd.isna(bairro):
            skipped_nan += 1
            continue
            
        bairro_str = str(bairro).strip()
        
        # Mapped property type
        tipologia = row.get(tipo_col, 'APARTAMENTO') if tipo_col else 'APARTAMENTO'
        tipologia_str = str(tipologia).upper()
        if 'APARTAMENTO' in tipologia_str:
            prop_type = 'Apartamento'
        elif 'CASA' in tipologia_str:
            prop_type = 'Casa'
        elif 'TERRENO' in tipologia_str:
            prop_type = 'Terreno'
        else:
            prop_type = 'Comercial'
            
        # Value & m2
        try:
            val_val = row.get(val_col, 0) if val_col else 0
            m2_val = row.get(m2_col, 0) if m2_col else 0
            
            val = float(val_val)
            m2 = float(m2_val)
            
            if m2 <= 0 or val <= 0:
                skipped_nan += 1
                continue
                
            area_val = row.get(area_col, 0) if area_col else 0
            if area_val and float(area_val) > 0:
                size = float(area_val)
            else:
                size = val / m2
            unit_val = m2
        except Exception:
            skipped_nan += 1
            continue
            
        # Date mapping
        if ano_col and mes_col and not pd.isna(row.get(ano_col)) and not pd.isna(row.get(mes_col)):
            try:
                date_str = f"{int(row.get(ano_col))}-{int(row.get(mes_col)):02d}-01"
            except Exception:
                date_str = "2025-01-01"
        elif anomes_col:
            anomes = str(row.get(anomes_col, '2025/1')).strip()
            try:
                parts = anomes.split('/')
                date_str = f"{parts[0]}-{int(parts[1]):02d}-01"
            except Exception:
                date_str = "2025-01-01"
        else:
            date_str = "2025-01-01"
            
        street_val = row.get(logr_col, '') if logr_col else ''
        num_val = row.get(num_col, '') if num_col else ''
        compl_val = row.get(compl_col, '') if compl_col else ''
        desc_val = row.get(desc_col, '') if desc_col else ''

        num_str = str(num_val).strip() if not pd.isna(num_val) and str(num_val).strip() != 'nan' else ''
        compl_str = str(compl_val).strip() if not pd.isna(compl_val) and str(compl_val).strip() != 'nan' else ''
        desc_str = str(desc_val).strip() if not pd.isna(desc_val) and str(desc_val).strip() != 'nan' else ''

        transactions.append({
            "id": f"itbi-rj-{idx}",
            "neighborhood": bairro_str,
            "propertyType": prop_type,
            "sizeSqm": size,
            "transactionValue": val,
            "date": date_str,
            "unitValueSqm": unit_val,
            "state": "RJ",
            "city": "Rio de Janeiro",
            "street": str(street_val).strip() if not pd.isna(street_val) else 'Não informado',
            "number": num_str,
            "complement": compl_str,
            "description": desc_str
        })

    print(f"Skipped {skipped_nan} empty or invalid rows.")
    print(f"Successfully processed {len(transactions)} valid transactions.")
    
    # Load existing store to preserve auctions, users, sessions and SP transactions
    auctions = []
    users = []
    sessions = []
    existing_sp_txs = []
    store_data = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                store_data = json.load(f)
                auctions = store_data.get("auctions", [])
                users = store_data.get("users", [])
                sessions = store_data.get("sessions", [])
                existing_txs = store_data.get("itbiTransactions", [])
                existing_sp_txs = [t for t in existing_txs if not (t.get("state") == "RJ" and t.get("city") == "Rio de Janeiro")]
                print(f"Preserved {len(auctions)} existing auctions, {len(users)} users, {len(existing_sp_txs)} SP transactions, and {len(sessions)} sessions from store.")
        except Exception as e:
            print(f"Failed to read existing store: {e}")
            
    # Write merged store back
    store_data = {
        **store_data,
        "auctions": auctions,
        "itbiTransactions": transactions + existing_sp_txs,
        "users": users,
        "sessions": sessions
    }
    
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(store_data, f, ensure_ascii=False, indent=2)
        print("data_store.json updated successfully!")
        return True
    except Exception as e:
        print(f"Failed to write store: {e}")
        return False

if __name__ == "__main__":
    import_data()
