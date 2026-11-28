import csv
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CNEFE_DIR = ROOT / '.cache' / 'map-cnefe'
OUT_DIR = ROOT / '.cache' / 'cnefe-360'
OUT_DIR.mkdir(parents=True, exist_ok=True)

CITIES = [
    ('3304557', '3304557_RIO_DE_JANEIRO.zip', 'Rio de Janeiro', 'RJ'),
    ('3303302', '3303302_NITEROI.zip', 'Niterói', 'RJ'),
    ('3136702', '3136702_JUIZ_DE_FORA.zip', 'Juiz de Fora', 'MG'),
]

GENERIC_NAMES = {
    '', 'ESTABELECIMENTO SEM NOME', 'SEM NOME', 'NAO INFORMADO', 'COMERCIO',
    'LOJA', 'BAR', 'SALAO', 'IGREJA', 'ESCRITORIO', 'SALA COMERCIAL',
    'PONTO COMERCIAL', 'SALA', 'QUIOSQUE', 'BOX',
}

VACANT_OR_INACTIVE_RE = re.compile(
    r'\b(?:LOJA\s+VAGA|LOJA\s+FECHADA|IMOVEL\s+FECHADO|ESTABELECIMENTO\s+FECHADO|ESTABELECIMENTO\s+VAGO|'
    r'SALA\s+VAGA|SALA\s+VAZIA|PORTA\s+FECHADA|SEM\s+ATIVIDADE|EM\s+OBRAS|DESATIVAD[OA]?|'
    r'DESOCUPAD[OA]?|ABANDONAD[OA]?|DEPOSITO|GARAGEM|ALMOXARIFADO|ALUGA[\-\s]?SE|VENDE[\-\s]?SE)\b|'
    r'^(?:VAGA|VAGO|FECHADA|FECHADO|OBRA)$',
    re.IGNORECASE,
)

RELIGIOUS_RE = re.compile(
    r'\b(?:IGREJA|PAROQUIA|TEMPLO|ASSEMBL[EÉ]IA\s+DE\s+DEUS|CONGREGA[CÇ][AÃ]O|CAPELA|CENTRO\s+ESP[IÍ]RITA|TERREIRO|MESQUITA|SINAGOGA)\b',
    re.IGNORECASE,
)


def build_city(code: str, zip_name: str, city: str, state: str):
    zip_path = CNEFE_DIR / zip_name
    if not zip_path.exists():
        print(f'[CNEFE-360] Skipping missing {zip_path}')
        return
    # Grid cell ~ 220m x 220m (0.002 deg)
    cells = defaultdict(lambda: [0, 0, 0, 0])  # [casas, aptos, construcao, estComercioAtivo]
    cep_counts = defaultdict(Counter)
    pois = []  # [lat, lng, especie, nome, bairro]
    seen_pois = set()
    bairros = defaultdict(lambda: [0, 0, 0])  # [casas, aptos, totalDom]

    with zipfile.ZipFile(zip_path) as zf:
        with zf.open(zf.namelist()[0]) as f:
            reader = csv.reader(io.TextIOWrapper(f, encoding='utf-8-sig', newline=''), delimiter=';')
            header = next(reader)
            idx = {k: header.index(k) for k in [
                'LATITUDE', 'LONGITUDE', 'COD_ESPECIE', 'COD_TIPO_ESPECI',
                'DSC_ESTABELECIMENTO', 'DSC_LOCALIDADE', 'CEP'
            ] if k in header}

            i_lat = idx['LATITUDE']
            i_lng = idx['LONGITUDE']
            i_esp = idx['COD_ESPECIE']
            i_tip = idx['COD_TIPO_ESPECI']
            i_dsc = idx['DSC_ESTABELECIMENTO']
            i_loc = idx['DSC_LOCALIDADE']
            i_cep = idx.get('CEP', -1)

            for row in reader:
                if not row:
                    continue
                try:
                    lat = float(row[i_lat])
                    lng = float(row[i_lng])
                except Exception:
                    continue
                if not (-34 < lat < 6 and -74 < lng < -32):
                    continue
                esp = row[i_esp]
                tip = row[i_tip]
                loc = (row[i_loc] or '').strip()
                gy = int(round(lat * 500))
                gx = int(round(lng * 500))
                ckey = f'{gy},{gx}'
                cell = cells[ckey]

                if i_cep >= 0:
                    raw_cep = re.sub(r'\D', '', row[i_cep] or '')
                    if len(raw_cep) == 8:
                        cep_counts[ckey][raw_cep] += 1

                if esp == '1':
                    if tip == '103':
                        cell[1] += 1
                        if loc:
                            bairros[loc][1] += 1
                            bairros[loc][2] += 1
                    else:
                        cell[0] += 1
                        if loc:
                            bairros[loc][0] += 1
                            bairros[loc][2] += 1
                elif esp == '7':
                    cell[2] += 1
                elif esp in ('4', '5', '6'):
                    name = re.sub(r'\s+', ' ', (row[i_dsc] or '').strip().upper())
                    if VACANT_OR_INACTIVE_RE.search(name):
                        continue
                    if esp == '6' and RELIGIOUS_RE.search(name):
                        continue
                    if esp == '6':
                        cell[3] += 1
                    clean_label = name or ('ESCOLA' if esp == '4' else 'SAUDE' if esp == '5' else '')
                    if esp in ('4', '5') or (clean_label and clean_label not in GENERIC_NAMES):
                        # Deduplicate same POI within ~45m door bucket
                        door_y = int(round(lat * 2200))
                        door_x = int(round(lng * 2200))
                        dedup_key = (int(esp), clean_label, door_y, door_x)
                        if dedup_key not in seen_pois:
                            seen_pois.add(dedup_key)
                            pois.append([round(lat, 5), round(lng, 5), int(esp), clean_label, loc])

    ceps = {}
    for ckey, cnt in cep_counts.items():
        if cnt:
            top = cnt.most_common(1)[0][0]
            ceps[ckey] = f'{top[:5]}-{top[5:]}'

    out_path = OUT_DIR / f'{code}.json'
    payload = {
        'city': city,
        'state': state,
        'code': code,
        'cells': dict(cells),
        'ceps': ceps,
        'bairros': dict(bairros),
        'pois': pois,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f'[CNEFE-360] {city}/{state}: {len(cells)} grid cells, {len(ceps)} CEPs, {len(pois)} POIs, {len(bairros)} localidades -> {out_path.name} ({size_mb:.2f} MB)')


if __name__ == '__main__':
    for code, zname, city, state in CITIES:
        build_city(code, zname, city, state)
