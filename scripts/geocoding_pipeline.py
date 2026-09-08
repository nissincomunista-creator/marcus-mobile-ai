#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEOSPATIAL DATA PIPELINE - ANTIGRAVITY ENGINE (PYTHON)
Arquitetura Determinística de Geocodificação & Saneamento Cadastral

Etapa 1: Parsing e Limpeza Estrita (Regex com Marcadores Explícitos)
Etapa 2: Cascata Hierárquica (Nível 1 Escrituras -> Nível 2 Geocode Predial -> Nível 3 Interpolação Via)
Etapa 3: Bloqueio Rigoroso de Falsa Precisão (Regra de Ouro)
Etapa 4: Preservação de Coordenadas Físicas Puras (Spiderfy Estritamente Visual no Frontend)
"""

import re
import json
import time
import unicodedata
import math
import urllib.parse
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Tuple, Any

def normalize_str(s: Optional[str]) -> str:
    if not s:
        return ""
    nfkd = unicodedata.normalize('NFD', s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip()

# --------------------------------------------------------------------------
# CONTROLE DE TAXA NOMINATIM (1 req/segundo + Retry Exponencial)
# --------------------------------------------------------------------------
LAST_NOMINATIM_CALL_TIME = 0.0

def call_nominatim_with_rate_limit(url: str, headers: Dict[str, str], max_retries: int = 3) -> Optional[List[Dict[str, Any]]]:
    global LAST_NOMINATIM_CALL_TIME
    
    # Limite estrito de 1 requisição por segundo para proteger contra HTTP 429
    now = time.time()
    elapsed = now - LAST_NOMINATIM_CALL_TIME
    if elapsed < 1.05:
        time.sleep(1.05 - elapsed)
        
    backoff = 2.0
    for attempt in range(max_retries):
        try:
            LAST_NOMINATIM_CALL_TIME = time.time()
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status == 200:
                    raw = resp.read().decode('utf-8')
                    data = json.loads(raw)
                    return data if isinstance(data, list) else [data]
        except urllib.error.HTTPError as e:
            # 429 = Too Many Requests, 503 = Service Unavailable
            if e.code in (429, 503):
                time.sleep(backoff)
                backoff *= 2.0
                continue
            else:
                break
        except Exception:
            time.sleep(1.0)
            continue
            
    return None

# --------------------------------------------------------------------------
# ETAPA 1: Parsing e Limpeza Estrita (Regex com Marcadores Explícitos)
# --------------------------------------------------------------------------
def parse_address_strict(
    raw_address: str,
    raw_neighborhood: str = "",
    raw_city: str = "",
    raw_state: str = "",
    raw_cep: str = ""
) -> Dict[str, Any]:
    text = normalize_str(raw_address)

    # 1. Extração Estrita de CEP: ^\d{5}-?\d{3}$
    cep = None
    cep_match = re.search(r'\b(\d{5})-?(\d{3})\b', raw_address)
    if not cep_match and raw_cep:
        cep_match = re.search(r'\b(\d{5})-?(\d{3})\b', raw_cep)
    if cep_match:
        cep = f"{cep_match.group(1)}-{cep_match.group(2)}"

    # Remove CEP do corpo do endereço
    text = re.sub(r'\b\d{5}-?\d{3}\b', '', text)
    text = re.sub(r'\bcep:?\b', '', text, flags=re.IGNORECASE).strip()

    # 2. Isolar Prefixo Padronizado (logradouro_tipo)
    prefix_regex = r'^(rua|r\.|r\b|avenida|av\.|av\b|estrada|estr\.|estr\b|travessa|trav\.|trav\b|alameda|al\.|al\b|praca|praça|pca\.|pca\b|rodovia|rod\.|rod\b|largo|lrg\.|lrg\b|beco|bc\.|bc\b|ladeira|lad\.|lad\b)'
    prefix_match = re.match(prefix_regex, text, flags=re.IGNORECASE)
    
    logradouro_tipo = "Rua"
    remaining = text

    if prefix_match:
        raw_p = prefix_match.group(1).lower().replace('.', '')
        if raw_p.startswith('av'):
            logradouro_tipo = 'Avenida'
        elif raw_p.startswith('estr'):
            logradouro_tipo = 'Estrada'
        elif raw_p.startswith('tra'):
            logradouro_tipo = 'Travessa'
        elif raw_p.startswith('al'):
            logradouro_tipo = 'Alameda'
        elif raw_p.startswith('pr') or raw_p.startswith('pc'):
            logradouro_tipo = 'Praca'
        elif raw_p.startswith('rod'):
            logradouro_tipo = 'Rodovia'
        elif raw_p.startswith('l'):
            logradouro_tipo = 'Largo'
        elif raw_p.startswith('bec') or raw_p.startswith('bc'):
            logradouro_tipo = 'Beco'
        elif raw_p.startswith('lad'):
            logradouro_tipo = 'Ladeira'
        else:
            logradouro_tipo = 'Rua'
        remaining = text[prefix_match.end():].strip()

    remaining = re.sub(r'^[-;,\.\s]+', '', remaining).strip()

    # 3. Número e Complemento com Marcador Estrito
    # Impede que vias como "Rua 24 de Maio, 120" ou "Av. 15 de Novembro, 450" tenham o número da via capturado
    numero = None
    complemento = ""
    logradouro_nome = remaining

    sn_regex = r'\b(s/n|sem numero|s/ numero|s\.n\.)\b'
    if re.search(sn_regex, remaining, flags=re.IGNORECASE):
        numero = None
        parts = re.split(sn_regex, remaining, flags=re.IGNORECASE)
        logradouro_nome = parts[0]
        complemento = " ".join(parts[1:])
    else:
        # Exigência de marcador explícito: vírgula OU palavras-chave (nº, n., numero, num, n)
        # Ignora números isolados que façam parte do nome do logradouro
        num_pattern = re.compile(
            r'^(.*?)(?:,\s*(?:n[ºo°\.]*|n\b|num\b|numero\b)?\s*|[\s]+(?:n[ºo°\.]+|n\.\s*|num\b|numero\b)\s*:?\s*)(\d{1,6})\b(.*)$',
            re.IGNORECASE
        )
        num_match = num_pattern.match(remaining)
        if num_match:
            logradouro_nome = num_match.group(1)
            numero = num_match.group(2)
            complemento = num_match.group(3) or ""
        else:
            comp_regex = r'\b(apto|apt|apartamento|ap|bl|bloco|qd|quadra|lt|lote|cs|casa|fundos|fdo|sobrado|sob|sala|unidade|un|pavimento|pav|andar|edificio|edf|condominio)\b'
            comp_match = re.search(comp_regex, remaining, flags=re.IGNORECASE)
            if comp_match:
                logradouro_nome = remaining[:comp_match.start()]
                complemento = remaining[comp_match.start():]

    # Limpeza de Logradouro Nome
    logradouro_nome = re.sub(r'[,\-\.]+', ' ', logradouro_nome)
    logradouro_nome = re.sub(r'\s+', ' ', logradouro_nome).strip()
    logradouro_nome = " ".join(w.capitalize() for w in logradouro_nome.split())

    # Limpeza de Complemento
    complemento = re.sub(r'^[-;,\.\s:]+|[-;,\.\s:]+$', '', complemento)
    complemento = re.sub(r'\s+', ' ', complemento).strip().upper()

    # Bairro, Cidade, UF
    bairro = re.sub(r'[^A-Z0-9\s]', '', normalize_str(raw_neighborhood).upper()).strip()
    cidade = re.sub(r'[^a-zA-Z0-9\s]', '', normalize_str(raw_city)).strip() if raw_city else "Rio de Janeiro"
    uf = raw_state.strip().upper() if raw_state else "RJ"

    return {
        "logradouro_tipo": logradouro_tipo,
        "logradouro_nome": logradouro_nome,
        "numero": numero,
        "complemento": complemento,
        "bairro": bairro,
        "cidade": cidade,
        "uf": uf,
        "cep": cep
    }

# --------------------------------------------------------------------------
# ETAPA 2 & 3: Cascata e Bloqueio de Falsa Precisão
# --------------------------------------------------------------------------
def resolve_coordinates_cascade(
    record_id: str,
    raw_address: str,
    raw_neighborhood: str = "",
    raw_city: str = "",
    raw_state: str = "",
    raw_cep: str = "",
    internal_cache: Optional[Dict[str, Tuple[float, float]]] = None
) -> Dict[str, Any]:
    parsed = parse_address_strict(raw_address, raw_neighborhood, raw_city, raw_state, raw_cep)
    full_logradouro = f"{parsed['logradouro_tipo']} {parsed['logradouro_nome']}".strip()

    # NÍVEL 1: Base Própria de Escrituras / IPTU / ITBI (EXATO_PREDIO)
    if parsed["numero"] and internal_cache:
        cache_key = f"{parsed['logradouro_nome'].lower()}|{parsed['numero']}|{parsed['bairro'].lower()}"
        if cache_key in internal_cache:
            coords = internal_cache[cache_key]
            return {
                "id": record_id,
                "endereco_original": raw_address,
                "logradouro": full_logradouro,
                "numero": parsed["numero"],
                "bairro": parsed["bairro"],
                "cep": parsed["cep"],
                "lat": round(coords[0], 6),
                "lon": round(coords[1], 6),
                "status_geocodificacao": "EXATO_PREDIO",
                "precisa_revisao": False,
                "detalhe_resolucao": "Base Oficial de Escrituras/ITBI Municipal"
            }

    # NÍVEL 2 & NÍVEL 3: Geocodificação Estruturada via API Nominatim com Rate Limit
    try:
        street_param = f"{parsed['numero']} {parsed['logradouro_tipo']} {parsed['logradouro_nome']}" if parsed["numero"] else full_logradouro
        params = {
            "street": street_param,
            "city": parsed["cidade"],
            "state": parsed["uf"],
            "country": "Brazil",
            "format": "jsonv2",
            "addressdetails": "1"
        }
        if parsed["cep"]:
            params["postalcode"] = parsed["cep"]

        query_str = urllib.parse.urlencode(params)
        url = f"https://nominatim.openstreetmap.org/search?{query_str}"
        headers = {'User-Agent': 'MarcusAssessoriaGarimpo/2.0 (Deterministic Geocoding Engine)'}
        
        data = call_nominatim_with_rate_limit(url, headers=headers)
        if data and len(data) > 0:
            top = data[0]
            lat = float(top.get("lat", 0))
            lon = float(top.get("lon", 0))
            place_rank = top.get("place_rank", 0)
            category = top.get("category", "")
            type_ = top.get("type", "")

            # NÍVEL 2: Nível Predial / Lote / Número (house, building, address, place_rank >= 30)
            if place_rank >= 30 or type_ in ['house', 'building'] or category == 'building':
                return {
                    "id": record_id,
                    "endereco_original": raw_address,
                    "logradouro": full_logradouro,
                    "numero": parsed["numero"],
                    "bairro": parsed["bairro"],
                    "cep": parsed["cep"] or top.get("address", {}).get("postcode"),
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "status_geocodificacao": "GEOCODE_NUMERO",
                    "precisa_revisao": False,
                    "detalhe_resolucao": f"Nominatim Predial (place_rank {place_rank}, {type_})"
                }

            # NÍVEL 3: Interpolação de Via / Eixo de Rua (highway, residential, road, place_rank 26-28)
            if (26 <= place_rank <= 28) or category == "highway":
                return {
                    "id": record_id,
                    "endereco_original": raw_address,
                    "logradouro": full_logradouro,
                    "numero": parsed["numero"],
                    "bairro": parsed["bairro"],
                    "cep": parsed["cep"] or top.get("address", {}).get("postcode"),
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "status_geocodificacao": "INTERPOLACAO_RUA",
                    "precisa_revisao": False,
                    "detalhe_resolucao": f"Interpolação no Eixo da Via (place_rank {place_rank})"
                }
    except Exception:
        pass

    # ETAPA 3: Bloqueio Rigoroso de Falsa Precisão (Regra de Ouro)
    # JAMAIS atribuir coordenadas de centróide de bairro ou cidade!
    return {
        "id": record_id,
        "endereco_original": raw_address,
        "logradouro": full_logradouro,
        "numero": parsed["numero"],
        "bairro": parsed["bairro"],
        "cep": parsed["cep"],
        "lat": None,
        "lon": None,
        "status_geocodificacao": "PENDENTE_REVISAO",
        "precisa_revisao": True,
        "detalhe_resolucao": "Logradouro não validado com certeza cartográfica predial ou viária"
    }

# --------------------------------------------------------------------------
# ETAPA 4: GeoJSON com Coordenadas Puras (Sem Contaminação Espacial)
# --------------------------------------------------------------------------
def export_to_geojson(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    features = []

    # Contagem de unidades por coordenada física para alimentar metadados visuais
    coord_counts: Dict[str, int] = {}
    for r in records:
        if r["lat"] is not None and r["lon"] is not None and not r["precisa_revisao"]:
            k = f"{r['lat']:.4f}|{r['lon']:.4f}"
            coord_counts[k] = coord_counts.get(k, 0) + 1

    for r in records:
        if r["lat"] is None or r["lon"] is None or r["precisa_revisao"]:
            continue
            
        k = f"{r['lat']:.4f}|{r['lon']:.4f}"
        cluster_count = coord_counts.get(k, 1)

        # As coordenadas físicas REAIS permanecem 100% puras [lon, lat]!
        # Spiderfy é estritamente uma camada de visualização no Leaflet (frontend).
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [r["lon"], r["lat"]]
            },
            "properties": {
                "id": r["id"],
                "endereco_original": r["endereco_original"],
                "logradouro": r["logradouro"],
                "numero": r["numero"],
                "bairro": r["bairro"],
                "cep": r["cep"],
                "status_geocodificacao": r["status_geocodificacao"],
                "precisa_revisao": r["precisa_revisao"],
                "detalhe_resolucao": r.get("detalhe_resolucao"),
                "total_unidades_edificio": cluster_count
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total_analisados": len(records),
            "geocodificados_sucesso": len(features),
            "pendentes_revisao": sum(1 for r in records if r["precisa_revisao"])
        },
        "features": features
    }

if __name__ == "__main__":
    test_cases = [
        ("1", "RUA 24 DE MAIO, 120 APTO 101", "Riachuelo", "Rio de Janeiro", "RJ", "20950-090"),
        ("2", "AV. 15 DE NOVEMBRO, Nº 450", "Centro", "Petrópolis", "RJ", "25685-050"),
        ("3", "RUA ADAIL, N. 266 APTO 606 BL 02 QD 14 LT 08", "Penha Circular", "Rio de Janeiro", "RJ", "21210-000"),
        ("4", "RUA ENGENHEIRO ARTUR MOURA, N. 456, Apto 311, BL 4", "Bonsucesso", "Rio de Janeiro", "RJ", ""),
        ("5", "RUA FANTASMA INEXISTENTE ZZZ, 9999", "Bonsucesso", "Rio de Janeiro", "RJ", "")
    ]

    print("--- Executando Testes do Pipeline Determinístico ---")
    results = []
    for t in test_cases:
        p = parse_address_strict(t[1], t[2], t[3], t[4], t[5])
        print(f"Parsed: '{t[1]}' -> Logradouro: '{p['logradouro_tipo']} {p['logradouro_nome']}' | Num: '{p['numero']}' | Comp: '{p['complemento']}'")
        res = resolve_coordinates_cascade(t[0], t[1], t[2], t[3], t[4], t[5])
        results.append(res)
        print(f"  => [{res['status_geocodificacao']}] Lat: {res['lat']}, Lon: {res['lon']} (Revisao: {res['precisa_revisao']})")

    geojson_out = export_to_geojson(results)
    print("\nGeoJSON Feature Count:", len(geojson_out["features"]))
    print("Metadata:", json.dumps(geojson_out["metadata"], indent=2))
