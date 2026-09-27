"""Match ITBI sales to exact numbered address points from the local address files.

Only unique address-number coordinates are emitted. Street centroids and
neighborhood/city centroids are never used as transaction locations.
"""
import collections
import csv
import gzip
import io
import json
import math
import re
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CNEFE = ROOT / ".cache" / "map-cnefe"
STORE = ROOT / "data_store.json.gz"
OUTPUT = ROOT / "itbi_address_locations.json"
TARGETS = {
    ("RJ", "RIO DE JANEIRO"): "3304557_RIO_DE_JANEIRO.zip",
    ("RJ", "NITEROI"): "3303302_NITEROI.zip",
    ("MG", "JUIZ DE FORA"): "3136702_JUIZ_DE_FORA.zip",
}


def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(c for c in value if not unicodedata.combining(c)).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value).strip()
    return re.sub(r"\s+", " ", value)


TITLES = {
    "dr": "doutor", "dra": "doutora", "prof": "professor", "profa": "professora",
    "eng": "engenheiro", "cel": "coronel", "dep": "deputado", "gov": "governador",
    "pres": "presidente", "sen": "senador", "pe": "padre", "sta": "santa", "sto": "santo",
    "gal": "general", "gen": "general",
}


def street(value):
    value = norm(value)
    value = re.sub(r"^(rua|r|avenida|av|avn|estrada|estr|est|travessa|trav|trv|praca|pca|p|alameda|al|rodovia|rod|largo)\b\s*", "", value)
    return " ".join(TITLES.get(token, token) for token in value.split() if token not in {"de", "da", "do", "das", "dos", "e"})


def number(value):
    found = re.match(r"\s*0*(\d+[a-z]?)\b", norm(value))
    return found.group(1) if found else ""


def distance_m(a, b):
    lat = math.radians((a["lat"] + b["lat"]) / 2)
    return math.hypot((a["lat"] - b["lat"]) * 111320, (a["lng"] - b["lng"]) * 111320 * math.cos(lat))


with gzip.open(STORE, "rt", encoding="latin1") as source:
    store = json.load(source)

transactions = store.get("itbiTransactions", [])
target_rows = collections.defaultdict(list)
for tx in transactions:
    state = str(tx.get("state") or "").upper().strip()
    city = norm(tx.get("city"))
    city_key = next((key for key in TARGETS if key[0] == state and norm(key[1]) == city), None)
    if not city_key or not tx.get("street") or not number(tx.get("number")):
        continue
    key = (street(tx["street"]), number(tx["number"]))
    if key[0]:
        target_rows[city_key].append((tx, key, norm(tx.get("neighborhood"))))

locations = {}
summary = {}
for city_key, zip_name in TARGETS.items():
    rows = target_rows.get(city_key, [])
    wanted = collections.defaultdict(set)
    for _, (street_name, house_number), _ in rows:
        wanted[house_number].add(street_name)
    candidates = collections.defaultdict(list)
    with zipfile.ZipFile(CNEFE / zip_name) as archive:
        with archive.open(archive.namelist()[0]) as stream:
            reader = csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline=""), delimiter=";")
            for row in reader:
                house_number = number(row.get("NUM_ENDERECO"))
                if not house_number or house_number not in wanted:
                    continue
                street_name = street(" ".join(filter(None, [row.get("NOM_TIPO_SEGLOGR"), row.get("NOM_TITULO_SEGLOGR"), row.get("NOM_SEGLOGR")])))
                if street_name not in wanted[house_number] or row.get("NV_GEO_COORD") not in {"1", "2"}:
                    continue
                try:
                    lat, lng = float(row["LATITUDE"]), float(row["LONGITUDE"])
                except (TypeError, ValueError):
                    continue
                if not (-34 < lat < 6 and -74 < lng < -32):
                    continue
                candidates[(street_name, house_number)].append({
                    "lat": lat,
                    "lng": lng,
                    "locality": norm(row.get("DSC_LOCALIDADE")),
                    "id": row.get("COD_UNICO_ENDERECO"),
                })

    matched = ambiguous = 0
    for tx, key, neighborhood in rows:
        points = candidates.get(key, [])
        if not points:
            continue
        # If an address-number is reused in the municipality, use locality only
        # when it resolves to an unambiguous matching point; otherwise exclude it.
        unique = {}
        for point in points:
            unique[(round(point["lat"], 6), round(point["lng"], 6))] = point
        point_list = list(unique.values())
        if len(point_list) > 1:
            locality_matches = [p for p in point_list if p["locality"] == neighborhood]
            if locality_matches:
                point_list = locality_matches
        extent = max((distance_m(point_list[0], point) for point in point_list), default=0)
        if extent > 20:
            ambiguous += 1
            continue
        # Choose an actual recorded address point, never a computed midpoint.
        medoid = min(point_list, key=lambda point: sum(distance_m(point, other) for other in point_list))
        locations[str(tx["id"])] = {
            "lat": medoid["lat"],
            "lng": medoid["lng"],
            "precision": "exact_number",
            "source": "numbered_address_point",
            "spreadMeters": round(extent, 2),
        }
        matched += 1
    summary["/".join(city_key)] = {"transactionsWithNumber": len(rows), "exactAddressPoints": matched, "ambiguousExcluded": ambiguous}

tmp = OUTPUT.with_suffix(".json.tmp")
tmp.write_text(json.dumps(locations, separators=(",", ":")), encoding="utf-8")
tmp.replace(OUTPUT)
print(json.dumps({"locations": len(locations), "cities": summary, "output": str(OUTPUT)}, ensure_ascii=False, indent=2))
