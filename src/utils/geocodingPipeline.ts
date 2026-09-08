/**
 * GEOSPATIAL DATA PIPELINE - ANTIGRAVITY ENGINE
 * Arquitetura Determinística de Geocodificação & Saneamento Cadastral
 * 
 * Regras de Ouro:
 * 1. Sanitização estrita via Regex (isolamento de tipo, nome, número, complemento e CEP).
 * 2. Cascata Hierárquica: Nível 1 (Base Interna) -> Nível 2 (Geocode Predial) -> Nível 3 (Interpolação de Via).
 * 3. Bloqueio Rigoroso de Falsa Precisão: JAMAIS atribuir centróides de bairro, cidade ou estado.
 * 4. Clusterização e Spiderfy para unidades sobrepostas no mesmo condomínio/edifício.
 */

export type StatusGeocodificacao = 
  | 'EXATO_PREDIO'
  | 'GEOCODE_NUMERO'
  | 'INTERPOLACAO_RUA'
  | 'PENDENTE_REVISAO';

export interface ParsedAddress {
  logradouro_tipo: string;
  logradouro_nome: string;
  numero: string | null;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
}

export interface GeocodedRecord {
  id: string;
  endereco_original: string;
  logradouro: string;
  numero: string | null;
  bairro: string;
  cep: string | null;
  lat: number | null;
  lon: number | null;
  status_geocodificacao: StatusGeocodificacao;
  precisa_revisao: boolean;
  detalhe_resolucao?: string;
  cluster_id?: string;
}

// --------------------------------------------------------------------------
// ETAPA 1: Algoritmo Estrito de Parsing e Limpeza (Regex)
// --------------------------------------------------------------------------

export function normalizeStr(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function parseAddressStrict(
  rawAddress: string,
  rawNeighborhood: string = '',
  rawCity: string = '',
  rawState: string = '',
  rawCep: string = ''
): ParsedAddress {
  let text = normalizeStr(rawAddress);

  // 1. Extração Estrita de CEP: ^\d{5}-?\d{3}$
  let cep: string | null = null;
  const cepMatch = rawAddress.match(/\b(\d{5})-?(\d{3})\b/) || (rawCep ? rawCep.match(/\b(\d{5})-?(\d{3})\b/) : null);
  if (cepMatch) {
    cep = `${cepMatch[1]}-${cepMatch[2]}`;
  }

  // Remove CEP do corpo do endereço para não poluir nome de rua ou número
  text = text
    .replace(/\b\d{5}-?\d{3}\b/g, '')
    .replace(/\bcep:?\b/i, '')
    .trim();

  // 2. Isolar Prefixo Padronizado (logradouro_tipo)
  const prefixRegex = /^(rua|r\.|r\b|avenida|av\.|av\b|estrada|estr\.|estr\b|travessa|trav\.|trav\b|alameda|al\.|al\b|praca|praça|pca\.|pca\b|rodovia|rod\.|rod\b|largo|lrg\.|lrg\b|beco|bc\.|bc\b|ladeira|lad\.|lad\b)/i;
  const prefixMatch = text.match(prefixRegex);
  let logradouro_tipo = 'Rua';
  let remaining = text;

  if (prefixMatch) {
    const rawP = prefixMatch[1].toLowerCase().replace('.', '');
    if (rawP.startsWith('av')) logradouro_tipo = 'Avenida';
    else if (rawP.startsWith('estr')) logradouro_tipo = 'Estrada';
    else if (rawP.startsWith('tra')) logradouro_tipo = 'Travessa';
    else if (rawP.startsWith('al')) logradouro_tipo = 'Alameda';
    else if (rawP.startsWith('pr') || rawP.startsWith('pc')) logradouro_tipo = 'Praca';
    else if (rawP.startsWith('rod')) logradouro_tipo = 'Rodovia';
    else if (rawP.startsWith('l')) logradouro_tipo = 'Largo';
    else if (rawP.startsWith('bec') || rawP.startsWith('bc')) logradouro_tipo = 'Beco';
    else if (rawP.startsWith('lad')) logradouro_tipo = 'Ladeira';
    else logradouro_tipo = 'Rua';

    remaining = text.slice(prefixMatch[0].length).trim();
  }

  remaining = remaining.replace(/^[-,\.\s]+/, '').trim();

  // 3. Isolar Número Predial Principal e Descartar Complementos
  let numero: string | null = null;
  let complemento = '';
  let logradouro_nome = remaining;

  // Verificação de Sem Número (S/N)
  const snRegex = /\b(s\/n|sem numero|s\/ numero|s\.n\.)\b/i;
  if (snRegex.test(remaining)) {
    numero = null;
    const parts = remaining.split(snRegex);
    logradouro_nome = parts[0];
    complemento = parts.slice(1).join(' ');
  } else {
    // Captura padrão: Rua [Nome], N. [Numero] [Complemento]
    const numRegex = /^(.*?)(?:[,\s]+(?:n[ºo°\.]*|num|numero|n)\s*:?\s*|[,\s]+)(\d{1,6})\b(.*)$/i;
    const numMatch = remaining.match(numRegex);

    if (numMatch) {
      logradouro_nome = numMatch[1];
      numero = numMatch[2];
      complemento = numMatch[3] || '';
    } else {
      // Caso sem número explícito, verificar complementos
      const compRegex = /\b(apto|apt|apartamento|ap|bl|bloco|qd|quadra|lt|lote|cs|casa|fundos|fdo|sobrado|sob|sala|unidade|un|pavimento|pav|andar|edificio|edf|condominio)\b/i;
      const compIndex = remaining.search(compRegex);
      if (compIndex !== -1) {
        logradouro_nome = remaining.slice(0, compIndex);
        complemento = remaining.slice(compIndex);
      }
    }
  }

  // Sanitizar logradouro_nome
  logradouro_nome = logradouro_nome
    .replace(/[,\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Sanitizar complemento
  complemento = complemento
    .replace(/^[-,\.\s:]+|[-,\.\s:]+$/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();

  // Bairro, Cidade, UF
  const bairro = normalizeStr(rawNeighborhood).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
  const cidade = rawCity ? normalizeStr(rawCity).replace(/[^a-zA-Z0-9\s]/g, '').trim() : 'Rio de Janeiro';
  const uf = rawState ? rawState.toUpperCase().trim() : 'RJ';

  return {
    logradouro_tipo,
    logradouro_nome,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep
  };
}

// --------------------------------------------------------------------------
// ETAPA 2 & 3: Cascata Hierárquica e Bloqueio de Falsa Precisão
// --------------------------------------------------------------------------

export interface InternalGeoCache {
  getExactBuildingCoords?: (street: string, number: string, neighborhood: string) => [number, number] | null;
  getStreetAxisCoords?: (street: string, neighborhood: string, city: string) => [number, number] | null;
}

export async function resolveCoordinatesCascade(
  id: string,
  rawAddress: string,
  rawNeighborhood: string = '',
  rawCity: string = '',
  rawState: string = '',
  rawCep: string = '',
  cache?: InternalGeoCache
): Promise<GeocodedRecord> {
  const parsed = parseAddressStrict(rawAddress, rawNeighborhood, rawCity, rawState, rawCep);
  const fullLogradouro = `${parsed.logradouro_tipo} ${parsed.logradouro_nome}`.trim();

  // NÍVEL 1: Base Própria de Escrituras / IPTU / ITBI (EXATO_PREDIO)
  if (parsed.numero && cache?.getExactBuildingCoords) {
    const internalCoords = cache.getExactBuildingCoords(
      parsed.logradouro_nome.toLowerCase(),
      parsed.numero,
      parsed.bairro.toLowerCase()
    );

    if (internalCoords && internalCoords[0] !== 0 && internalCoords[1] !== 0) {
      return {
        id,
        endereco_original: rawAddress,
        logradouro: fullLogradouro,
        numero: parsed.numero,
        bairro: parsed.bairro,
        cep: parsed.cep,
        lat: Number(internalCoords[0].toFixed(6)),
        lon: Number(internalCoords[1].toFixed(6)),
        status_geocodificacao: 'EXATO_PREDIO',
        precisa_revisao: false,
        detalhe_resolucao: 'Base Oficial de Escrituras/ITBI Municipal'
      };
    }
  }

  // NÍVEL 2 & NÍVEL 3: Geocodificação Estruturada via API Externa (Nominatim)
  try {
    const streetParam = parsed.numero 
      ? `${parsed.numero} ${parsed.logradouro_tipo} ${parsed.logradouro_nome}`
      : `${parsed.logradouro_tipo} ${parsed.logradouro_nome}`;

    const queryParams = new URLSearchParams({
      street: streetParam,
      city: parsed.cidade,
      state: parsed.uf,
      country: 'Brazil',
      format: 'jsonv2',
      addressdetails: '1'
    });

    if (parsed.cep) {
      queryParams.set('postalcode', parsed.cep);
    }

    const apiUrl = `https://nominatim.openstreetmap.org/search?${queryParams.toString()}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'MarcusAssessoriaGarimpo/2.0 (Geocoding Engine)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const results = await response.json();

      if (Array.isArray(results) && results.length > 0) {
        const top = results[0];
        const lat = parseFloat(top.lat);
        const lon = parseFloat(top.lon);
        const placeRank = top.place_rank || 0;
        const category = top.category || '';
        const type = top.type || '';

        // NÍVEL 2: Nível Predial / Lote / Número (house, building, address, place_rank >= 30)
        if (placeRank >= 30 || type === 'house' || type === 'building' || category === 'building') {
          return {
            id,
            endereco_original: rawAddress,
            logradouro: fullLogradouro,
            numero: parsed.numero,
            bairro: parsed.bairro,
            cep: parsed.cep || top.address?.postcode || null,
            lat: Number(lat.toFixed(6)),
            lon: Number(lon.toFixed(6)),
            status_geocodificacao: 'GEOCODE_NUMERO',
            precisa_revisao: false,
            detalhe_resolucao: `Nominatim Predial (place_rank ${placeRank}, ${type})`
          };
        }

        // NÍVEL 3: Interpolação de Via / Eixo de Rua (highway, residential, road, place_rank 26-28)
        if ((placeRank >= 26 && placeRank <= 28) || category === 'highway') {
          return {
            id,
            endereco_original: rawAddress,
            logradouro: fullLogradouro,
            numero: parsed.numero,
            bairro: parsed.bairro,
            cep: parsed.cep || top.address?.postcode || null,
            lat: Number(lat.toFixed(6)),
            lon: Number(lon.toFixed(6)),
            status_geocodificacao: 'INTERPOLACAO_RUA',
            precisa_revisao: false,
            detalhe_resolucao: `Interpolação no Eixo da Via (place_rank ${placeRank})`
          };
        }
      }
    }
  } catch (err) {
    // Timeout ou erro de rede: continua para cache local
  }

  // Fallback seguro Nível 3: Cache local de eixos de rua conhecidos
  if (cache?.getStreetAxisCoords) {
    const streetAxis = cache.getStreetAxisCoords(
      parsed.logradouro_nome.toLowerCase(),
      parsed.bairro.toLowerCase(),
      parsed.cidade.toLowerCase()
    );

    if (streetAxis && streetAxis[0] !== 0 && streetAxis[1] !== 0) {
      return {
        id,
        endereco_original: rawAddress,
        logradouro: fullLogradouro,
        numero: parsed.numero,
        bairro: parsed.bairro,
        cep: parsed.cep,
        lat: Number(streetAxis[0].toFixed(6)),
        lon: Number(streetAxis[1].toFixed(6)),
        status_geocodificacao: 'INTERPOLACAO_RUA',
        precisa_revisao: false,
        detalhe_resolucao: 'Base Cartográfica Local de Eixo de Vias'
      };
    }
  }

  // ETAPA 3: Bloqueio Rigoroso de Falsa Precisão (Regra de Ouro)
  // Sob nenhuma hipótese atribua coordenadas do centro do bairro ou da cidade!
  return {
    id,
    endereco_original: rawAddress,
    logradouro: fullLogradouro,
    numero: parsed.numero,
    bairro: parsed.bairro,
    cep: parsed.cep,
    lat: null,
    lon: null,
    status_geocodificacao: 'PENDENTE_REVISAO',
    precisa_revisao: true,
    detalhe_resolucao: 'Logradouro não validado com certeza cartográfica predial ou viária'
  };
}

// --------------------------------------------------------------------------
// ETAPA 4: Deduplicação de Coordenadas (Spiderfy) & Estrutura GeoJSON
// --------------------------------------------------------------------------

export interface SpiderfiedLocation {
  id: string;
  originalLat: number;
  originalLon: number;
  displayLat: number;
  displayLon: number;
  isSpiderfied: boolean;
  spiderClusterCount: number;
}

export function applySpiderfyClustering(records: GeocodedRecord[]): Map<string, SpiderfiedLocation> {
  const resultMap = new Map<string, SpiderfiedLocation>();
  const coordGroups = new Map<string, GeocodedRecord[]>();

  records.forEach(r => {
    if (r.lat === null || r.lon === null || r.precisa_revisao) return;
    const key = `${r.lat.toFixed(4)}|${r.lon.toFixed(4)}`;
    if (!coordGroups.has(key)) coordGroups.set(key, []);
    coordGroups.get(key)!.push(r);
  });

  coordGroups.forEach((group) => {
    const count = group.length;

    if (count === 1) {
      const item = group[0];
      resultMap.set(item.id, {
        id: item.id,
        originalLat: item.lat!,
        originalLon: item.lon!,
        displayLat: item.lat!,
        displayLon: item.lon!,
        isSpiderfied: false,
        spiderClusterCount: 1
      });
      return;
    }

    const radiusMeters = Math.min(35, 12 + count * 2.5);
    const latDelta = radiusMeters / 111000;
    const centerLat = group[0].lat!;
    const centerLon = group[0].lon!;
    const lonDelta = radiusMeters / (111000 * Math.cos((centerLat * Math.PI) / 180));

    group.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / count;
      const displayLat = Number((centerLat + latDelta * Math.sin(angle)).toFixed(6));
      const displayLon = Number((centerLon + lonDelta * Math.cos(angle)).toFixed(6));

      resultMap.set(item.id, {
        id: item.id,
        originalLat: centerLat,
        originalLon: centerLon,
        displayLat,
        displayLon,
        isSpiderfied: true,
        spiderClusterCount: count
      });
    });
  });

  return resultMap;
}

export function exportToGeoJSON(records: GeocodedRecord[]): any {
  const spiderMap = applySpiderfyClustering(records);

  const features = records
    .filter(r => r.lat !== null && r.lon !== null && !r.precisa_revisao)
    .map(r => {
      const sp = spiderMap.get(r.id);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [sp ? sp.displayLon : r.lon, sp ? sp.displayLat : r.lat]
        },
        properties: {
          id: r.id,
          endereco_original: r.endereco_original,
          logradouro: r.logradouro,
          numero: r.numero,
          bairro: r.bairro,
          cep: r.cep,
          status_geocodificacao: r.status_geocodificacao,
          precisa_revisao: r.precisa_revisao,
          detalhe_resolucao: r.detalhe_resolucao,
          is_spiderfied: sp?.isSpiderfied || false,
          total_unidades_edificio: sp?.spiderClusterCount || 1,
          coord_original_lat: sp?.originalLat || r.lat,
          coord_original_lon: sp?.originalLon || r.lon
        }
      };
    });

  return {
    type: 'FeatureCollection',
    metadata: {
      total_analisados: records.length,
      geocodificados_sucesso: features.length,
      pendentes_revisao: records.filter(r => r.precisa_revisao).length,
      timestamp: new Date().toISOString()
    },
    features
  };
}
