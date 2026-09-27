import os
import json
import gzip
import shutil
import re
import openpyxl

possible_paths = [
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-4 (1).xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-4.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-4.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI_TRANSACOES_2025_diante-4.xlsx"
]

json_path = "data_store.json"
gz_path = "data_store.json.gz"

def clean_excel_str(val):
    if val is None:
        return ''
    s = str(val)
    # Decode XML escaped characters, e.g. _x0020_ -> space, _x0035_ -> 5
    s = re.sub(r'_x([0-9a-fA-F]{4})_', lambda m: chr(int(m.group(1), 16)), s)
    return s.strip()

def clean_number_str(val):
    s = clean_excel_str(val)
    if not s or s.lower() == 'nan':
        return ''
    m = re.search(r'\d+', s)
    if m:
        return str(int(m.group(0)))
    return s

def determine_property_type(tipologia, descricao):
    tipologia_str = clean_excel_str(tipologia).upper()
    desc_str = clean_excel_str(descricao).upper()

    if any(k in tipologia_str for k in ['APART', 'FLAT', 'STUDIO', 'CONJUGADO', 'QUITINETE', 'LOFT']):
        return 'Apartamento'
    if 'CASA' in tipologia_str:
        return 'Casa'
    if any(k in tipologia_str for k in ['TERRENO', 'LOTE']):
        return 'Terreno'
    if any(k in tipologia_str for k in ['SALA', 'LOJA', 'GALPAO', 'GALPÃO', 'PREDIO', 'PRÉDIO', 'HOTEL', 'COMERC', 'INDUSTRIA', 'INDÚSTRIA', 'ARMAZEM', 'ARMAZÉM', 'CLUBE', 'COLEGIO', 'COLÉGIO', 'HOSPITAL', 'SOBRELOJA']):
        return 'Comercial'
    if 'GARAGEM' in tipologia_str:
        return 'Garagem'
    if 'RESIDENCIAL' in desc_str and not ('NAO' in desc_str or 'NÃO' in desc_str):
        return 'Apartamento'
    return 'Comercial'

def canonical_street(val):
    s = clean_excel_str(val).lower()
    s = re.sub(r'^(rua|r\.|avenida|av\.|estrada|est\.|travessa|trv\.|praca|praça|pc\.)\s+', '', s.strip())
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

def import_data():
    excel_path = None
    for path in possible_paths:
        if os.path.exists(path):
            excel_path = path
            break
            
    if not excel_path:
        print(f"Error: No ITBI Excel file found. Checked paths: {possible_paths}")
        return False
        
    print(f"Reading Excel file from: {excel_path}...")
    
    # Also sync to Desktop folder if we read from Downloads
    desktop_dest = r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-4.xlsx"
    if excel_path != desktop_dest:
        try:
            os.makedirs(os.path.dirname(desktop_dest), exist_ok=True)
            shutil.copy2(excel_path, desktop_dest)
            print(f"Synced latest sheet to Desktop: {desktop_dest}")
        except Exception as copy_err:
            print(f"Notice: Could not copy to desktop folder: {copy_err}")

    try:
        wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
        ws = wb.active
    except Exception as e:
        print(f"Error opening Excel with openpyxl: {e}")
        return False

    row_iter = ws.iter_rows(values_only=True)
    try:
        raw_headers = next(row_iter)
    except StopIteration:
        print("Error: Empty Excel sheet")
        return False

    headers = [clean_excel_str(c).lower() for c in raw_headers]
    print(f"Identified headers: {headers}")

    col_map = {}
    for idx, h in enumerate(headers):
        col_map[h] = idx

    # Resolve indices
    logr_idx = col_map.get('logradouro', col_map.get('nm_logradouro'))
    num_idx = col_map.get('numero', col_map.get('nu_numero'))
    compl_idx = col_map.get('complemento', col_map.get('ds_complemento'))
    bairro_idx = col_map.get('bairro', col_map.get('nm_bairro_norm', col_map.get('nm_bairro')))
    tipo_idx = col_map.get('ds_imovel_tipologia', col_map.get('tipologia', col_map.get('cod_tipologia')))
    desc_idx = col_map.get('descricao')
    val_idx = col_map.get('vl_declarado', col_map.get('valor_transacoes', col_map.get('valor_transacao')))
    area_idx = col_map.get('area')
    m2_idx = col_map.get('valor_m2')
    ano_idx = col_map.get('ano')
    mes_idx = col_map.get('mes')

    if bairro_idx is None:
        print("Error: Could not identify neighborhood column in Excel.")
        return False

    transactions = []
    skipped_nan = 0
    row_count = 0

    for row in row_iter:
        row_count += 1
        raw_bairro = row[bairro_idx]
        if raw_bairro is None or clean_excel_str(raw_bairro) == '':
            skipped_nan += 1
            continue

        bairro_str = clean_excel_str(raw_bairro).upper()

        # Values
        val = 0.0
        m2 = 0.0
        area = 0.0

        if val_idx is not None and row[val_idx] is not None:
            try:
                val = float(row[val_idx])
            except Exception:
                val = 0.0

        if m2_idx is not None and row[m2_idx] is not None:
            try:
                m2 = float(row[m2_idx])
            except Exception:
                m2 = 0.0

        if area_idx is not None and row[area_idx] is not None:
            try:
                area = float(row[area_idx])
            except Exception:
                area = 0.0

        # Recover missing metrics
        if val <= 0 and m2 > 0 and area > 0:
            val = round(m2 * area, 2)
        if m2 <= 0 and val > 0 and area > 0:
            m2 = round(val / area, 2)
        if area <= 0 and val > 0 and m2 > 0:
            area = round(val / m2, 2)

        if m2 <= 0 or val <= 0:
            skipped_nan += 1
            continue

        # Property type
        raw_tipo = row[tipo_idx] if tipo_idx is not None else ''
        raw_desc = row[desc_idx] if desc_idx is not None else ''
        prop_type = determine_property_type(raw_tipo, raw_desc)

        # Date
        ano = row[ano_idx] if ano_idx is not None else None
        mes = row[mes_idx] if mes_idx is not None else None
        try:
            if ano and mes:
                date_str = f"{int(ano)}-{int(mes):02d}-01"
            else:
                date_str = "2025-01-01"
        except Exception:
            date_str = "2025-01-01"

        raw_street = row[logr_idx] if logr_idx is not None else ''
        raw_num = row[num_idx] if num_idx is not None else ''
        raw_compl = row[compl_idx] if compl_idx is not None else ''

        street_str = clean_excel_str(raw_street)
        num_str = clean_number_str(raw_num)
        compl_str = clean_excel_str(raw_compl)
        desc_str = clean_excel_str(raw_desc)

        transactions.append({
            "id": f"itbi-rj-{row_count}",
            "neighborhood": bairro_str,
            "propertyType": prop_type,
            "sizeSqm": round(area, 2),
            "transactionValue": round(val, 2),
            "date": date_str,
            "unitValueSqm": round(m2, 2),
            "state": "RJ",
            "city": "Rio de Janeiro",
            "street": street_str or 'Não informado',
            "number": num_str,
            "complement": compl_str,
            "description": desc_str,
            "_core": canonical_street(street_str),
            "sourceFile": os.path.basename(excel_path),
            "sourceRow": row_count + 1,
            "sourceVerified": True
        })

    print(f"Total rows examined: {row_count}")
    print(f"Skipped {skipped_nan} empty or invalid rows.")
    print(f"Successfully processed {len(transactions)} valid Rio de Janeiro transactions.")

    # Load existing store to preserve auctions, users, sessions, Niterói & Juiz de Fora transactions
    store_data = {}
    existing_non_rj = []
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                store_data = json.load(f)
                existing_txs = store_data.get("itbiTransactions", [])
                existing_non_rj = [t for t in existing_txs if not (t.get("state") == "RJ" and t.get("city") == "Rio de Janeiro")]
                print(f"Preserved {len(existing_non_rj)} existing non-RJ (Niterói / Juiz de Fora) transactions.")
                print(f"Preserved {len(store_data.get('auctions', []))} auctions, {len(store_data.get('users', []))} users.")
        except Exception as e:
            print(f"Failed to read existing store: {e}")

    # Merge transactions and update calibration version to trigger automatic index recalibration
    store_data["itbiTransactions"] = transactions + existing_non_rj
    # Invalidate calibration version so server recalculates indexes and caches with fresh data
    store_data["calibrationVersion"] = f"v{int(os.path.getmtime(excel_path))}"

    try:
        print(f"Writing updated {json_path} ({len(store_data['itbiTransactions'])} total transactions)...")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(store_data, f, ensure_ascii=False, indent=2)
        print("data_store.json written successfully!")

        print(f"Compressing into {gz_path}...")
        compressed_bytes = gzip.compress(json.dumps(store_data, ensure_ascii=False).encode('utf-8'))
        with open(gz_path, 'wb') as f_gz:
            f_gz.write(compressed_bytes)
        print(f"data_store.json.gz updated successfully ({len(compressed_bytes)} bytes)!")

        # Verify Princesa Isabel 500
        p500 = [t for t in transactions if 'princesa isabel' in t['street'].lower() and t['number'] == '500']
        print(f"\n[Verification] Found {len(p500)} transactions for 'Avenida Princesa Isabel, 500':")
        for p in p500[:5]:
            print(f"  - ID: {p['id']}, Tipo: {p['propertyType']}, m²: R$ {p['unitValueSqm']:,.2f}, Total: R$ {p['transactionValue']:,.2f}, Área: {p['sizeSqm']}m², Compl: {p['complement']}")

        return True
    except Exception as e:
        print(f"Failed to write store: {e}")
        return False

if __name__ == "__main__":
    import_data()
