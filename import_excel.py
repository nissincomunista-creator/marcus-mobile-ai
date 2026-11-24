import os
import json
import gzip
import shutil
import re
import openpyxl

possible_paths = [
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-8.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-8.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-7-1.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-7-1.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-5.xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\itbi 2025-26.xlsx.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-4 (1).xlsx",
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_2025_diante-4.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_2025_diante-4.xlsx",
]

historical_paths = [
    r"C:\Users\Marcus\OneDrive\Desktop\ITBI DAS CIDADES\ITBI_TRANSACOES_PERIODO_2019_2024.xlsx",
    r"C:\Users\Marcus\Downloads\ITBI_TRANSACOES_PERIODO_2019_2024.xlsx",
]

MIN_ACTIVE_RIO_YEAR = 2024
MAP_ITBI_GZ_PATH = "map_itbi_2019_2026.json.gz"

json_path = "data_store.json"
gz_path = "data_store.json.gz"
itbi_gz_path = "itbi_store.json.gz"

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

def parse_monetary_or_decimal(raw_val):
    if raw_val is None:
        return 0.0
    if isinstance(raw_val, (int, float)):
        return float(raw_val)
    s = clean_excel_str(raw_val).strip()
    if not s or s.lower() == 'nan':
        return 0.0
    # Remove currency symbols, non-numeric chars except digits, comma, period
    s = re.sub(r'[^\d,.]', '', s)
    if not s:
        return 0.0
    if ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    try:
        return float(s)
    except Exception:
        return 0.0

def is_voluntary_market_sale(val):
    if val <= 0:
        return False
    if abs(val - round(val)) > 1e-4:
        return False
    if int(round(val)) % 100 != 0:
        return False
    return True

PERIPHERAL_BAIRROS = {'COSMOS', 'GUARATIBA', 'SANTA CRUZ', 'CAMPO GRANDE', 'INHOAIBA'}

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

def parse_excel_sheet(excel_path, id_prefix="itbi-rj"):
    print(f"Reading Excel file from: {excel_path}...")
    try:
        wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
        ws = wb.active
    except Exception as e:
        print(f"Error opening Excel {excel_path} with openpyxl: {e}")
        return []

    row_iter = ws.iter_rows(values_only=True)
    try:
        raw_headers = next(row_iter)
    except StopIteration:
        print(f"Error: Empty Excel sheet in {excel_path}")
        return []

    headers = [clean_excel_str(c).lower() for c in raw_headers]
    print(f"Identified headers in {os.path.basename(excel_path)}: {headers}")

    col_map = {h: idx for idx, h in enumerate(headers)}
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
        print(f"Error: Could not identify neighborhood column in {excel_path}.")
        return []

    parsed_rows = []
    skipped_nan = 0
    row_count = 0

    for row in row_iter:
        row_count += 1
        raw_bairro = row[bairro_idx]
        if raw_bairro is None or clean_excel_str(raw_bairro) == '':
            skipped_nan += 1
            continue

        bairro_str = clean_excel_str(raw_bairro).upper()
        val = parse_monetary_or_decimal(row[val_idx]) if val_idx is not None else 0.0
        m2 = parse_monetary_or_decimal(row[m2_idx]) if m2_idx is not None else 0.0
        area = parse_monetary_or_decimal(row[area_idx]) if area_idx is not None else 0.0

        if val <= 0 and m2 > 0 and area > 0:
            val = round(m2 * area, 2)
        if m2 <= 0 and val > 0 and area > 0:
            m2 = round(val / area, 2)
        if area <= 0 and val > 0 and m2 > 0:
            area = round(val / m2, 2)

        if m2 <= 0 or val <= 0:
            skipped_nan += 1
            continue

        if bairro_str in PERIPHERAL_BAIRROS and m2 > 7000:
            skipped_nan += 1
            continue

        raw_tipo = row[tipo_idx] if tipo_idx is not None else ''
        raw_desc = row[desc_idx] if desc_idx is not None else ''
        prop_type = determine_property_type(raw_tipo, raw_desc)

        ano = row[ano_idx] if ano_idx is not None else None
        mes = row[mes_idx] if mes_idx is not None else None
        try:
            year_int = int(clean_excel_str(ano)) if ano else 2025
            month_int = int(clean_excel_str(mes)) if mes else 1
            date_str = f"{year_int}-{month_int:02d}-01"
        except Exception:
            year_int = 2025
            date_str = "2025-01-01"

        raw_street = row[logr_idx] if logr_idx is not None else ''
        raw_num = row[num_idx] if num_idx is not None else ''
        raw_compl = row[compl_idx] if compl_idx is not None else ''

        street_str = clean_excel_str(raw_street)
        num_str = clean_number_str(raw_num)
        compl_str = clean_excel_str(raw_compl)
        desc_str = clean_excel_str(raw_desc)

        parsed_rows.append({
            "id": f"{id_prefix}-{year_int}-{row_count}",
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
            "_year": year_int,
            "sourceFile": os.path.basename(excel_path),
            "sourceRow": row_count + 1,
            "sourceVerified": True,
            "isCompraEVenda": is_voluntary_market_sale(val),
            "isFiduciario": not is_voluntary_market_sale(val)
        })

    print(f"Examined {row_count} rows (skipped {skipped_nan}) -> {len(parsed_rows)} valid from {os.path.basename(excel_path)}.")
    return parsed_rows


def import_data():
    excel_path = next((p for p in possible_paths if os.path.exists(p)), None)
    if not excel_path:
        print(f"Error: No ITBI Excel file found. Checked paths: {possible_paths}")
        return False

    recent_txs = parse_excel_sheet(excel_path, id_prefix="itbi-rj")
    hist_path = next((p for p in historical_paths if os.path.exists(p)), None)
    hist_txs = parse_excel_sheet(hist_path, id_prefix="itbi-rj-hist") if hist_path else []

    # Active valuation store keeps Jan/2024 - present (~3 years) to prevent 2019-2023 price skew & Render OOM
    recent_years_in_primary = {t["_year"] for t in recent_txs}
    hist_for_active = [t for t in hist_txs if t["_year"] >= MIN_ACTIVE_RIO_YEAR and t["_year"] not in recent_years_in_primary]
    transactions = hist_for_active + recent_txs

    # Combined 2019-2026 Rio ITBI feed for offline 3D Map PMTiles generation (static tiles, zero Node RAM)
    all_map_transactions = [t for t in hist_txs if t["_year"] not in recent_years_in_primary] + recent_txs
    for t in all_map_transactions:
        t.pop("_year", None)
    for t in transactions:
        t.pop("_year", None)

    print(f"Active Valuation Rio ITBI (>= {MIN_ACTIVE_RIO_YEAR}): {len(transactions)} | Full 2019-2026 Map Feed: {len(all_map_transactions)}")

    # Load existing store to preserve auctions, users, sessions, Niterói & Juiz de Fora transactions
    store_data = {}
    existing_non_rj = []
    existing_coords = {}

    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                store_data = json.load(f)
                existing_txs = store_data.get("itbiTransactions", [])
                for t in existing_txs:
                    if t.get("transactionLocationLat") and t.get("transactionLocationLng"):
                        existing_coords[t["id"]] = {
                            "lat": t["transactionLocationLat"],
                            "lng": t["transactionLocationLng"],
                            "precision": t.get("transactionLocationPrecision", "exact_number"),
                            "spreadMeters": t.get("transactionLocationSpreadMeters", 0)
                        }
                existing_non_rj = [t for t in existing_txs if not (t.get("state") == "RJ" and t.get("city") == "Rio de Janeiro")]
                print(f"Preserved {len(existing_non_rj)} existing non-RJ (Niterói / Juiz de Fora) transactions.")
                print(f"Preserved {len(existing_coords)} coordinates from existing transactions.")
                print(f"Preserved {len(store_data.get('auctions', []))} auctions, {len(store_data.get('users', []))} users.")
        except Exception as e:
            print(f"Failed to read existing store: {e}")

    # Hydrate coordinates from itbi_address_locations.json and previous store
    loc_path = "itbi_address_locations.json"
    locations = {}
    if os.path.exists(loc_path):
        try:
            with open(loc_path, 'r', encoding='utf-8') as f_loc:
                locations = json.load(f_loc)
        except Exception as e:
            print(f"Notice: Could not load {loc_path}: {e}")

    hydrated_count = 0
    for tx in transactions:
        tx_id = tx['id']
        point = locations.get(tx_id)
        if point and point.get('precision') == 'exact_number' and point.get('lat') and point.get('lng'):
            tx['transactionLocationLat'] = point['lat']
            tx['transactionLocationLng'] = point['lng']
            tx['transactionLocationPrecision'] = point['precision']
            if 'spreadMeters' in point:
                tx['transactionLocationSpreadMeters'] = point['spreadMeters']
            hydrated_count += 1
        elif tx_id in existing_coords:
            c = existing_coords[tx_id]
            tx['transactionLocationLat'] = c['lat']
            tx['transactionLocationLng'] = c['lng']
            tx['transactionLocationPrecision'] = c['precision']
            if 'spreadMeters' in c:
                tx['transactionLocationSpreadMeters'] = c['spreadMeters']
            hydrated_count += 1

    print(f"Hydrated {hydrated_count} Rio de Janeiro transactions with coordinates.")

    # Merge transactions and reset calibration version to trigger automatic index recalibration
    store_data["itbiTransactions"] = transactions + existing_non_rj
    store_data["calibrationVersion"] = "needs_v28_recalibration"

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

        print(f"Compressing into {itbi_gz_path}...")
        itbi_bytes = gzip.compress(json.dumps(store_data["itbiTransactions"], ensure_ascii=False).encode('utf-8'))
        with open(itbi_gz_path, 'wb') as f_itbi:
            f_itbi.write(itbi_bytes)
        print(f"{itbi_gz_path} updated successfully ({len(itbi_bytes)} bytes)!")

        print(f"Compressing full 2019-2026 map ITBI feed into {MAP_ITBI_GZ_PATH}...")
        map_bytes = gzip.compress(json.dumps(all_map_transactions, ensure_ascii=False).encode('utf-8'))
        with open(MAP_ITBI_GZ_PATH, 'wb') as f_map:
            f_map.write(map_bytes)
        print(f"{MAP_ITBI_GZ_PATH} updated successfully ({len(map_bytes)} bytes)!")

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
