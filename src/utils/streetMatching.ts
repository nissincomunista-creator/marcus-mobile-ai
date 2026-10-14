// Shared by the calculator and the server. Robust street normalization and matching (NBR 14.653).
import { sanitizeStreetName } from './addressParser.ts';

export function canonicalStreet(value?: string | null): string {
  if (!value) return '';

  const titles: Record<string, string> = {
    dr: 'doutor', dra: 'doutora', eng: 'engenheiro', enga: 'engenheira',
    prof: 'professor', profa: 'professora', cel: 'coronel', gen: 'general', gal: 'general',
    dep: 'deputado', gov: 'governador', pres: 'presidente', sen: 'senador',
    pe: 'padre', sta: 'santa', sto: 'santo', mal: 'marechal', cmdte: 'comandante',
    visc: 'visconde', bpo: 'bispo', dom: 'dom'
  };

  // 1. Sanitizar primeiro com o higienizador universal anti-junk
  const cleaned = sanitizeStreetName(value);

  // 2. Normalização de acentos, entidades XML hex (_x0020_) e minúsculas
  let s = String(cleaned)
    .replace(/_x([0-9a-fA-F]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 3. Extrai até a vírgula e remove numeração / complementos prediais
  s = s.split(',')[0]
    .replace(/\s+n[ºo°.]?\s*\d+.*$/i, '')
    .replace(/\s+(?:apto|apt|ap|bloco|bl|casa|lote|qd|quadra|sala|loja)\b.*$/i, '');

  // 4. Remove prefixos de tipos de logradouro
  s = s.replace(/^(?:rua|r|avenida|avn|av|estrada|etr|estr|est|travessa|trv|trav|praca|prc|pca|alameda|alm|al|rodovia|rod|largo|lrg|vila|vl|beco|servidao|passagem|psg|boulevard|blvd|via)\b\.?\s*/i, '');

  // 5. Remove pontuações e caracteres especiais
  const tokens = s.replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(t))
    .map(t => titles[t] || t);

  return tokens.join(' ').trim();
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) row[j] = next[j];
  }
  return row[b.length];
}

function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = editDistance(a, b);
  return 1 - dist / maxLen;
}

export function resolveOfficialStreet(target: string, candidates: string[]): string | null {
  if (!target || !Array.isArray(candidates) || candidates.length === 0) return null;
  const wanted = canonicalStreet(target);
  if (!wanted) return null;

  const unique = [...new Set(candidates.map(c => typeof c === 'string' ? c : (c as any)?.street).filter(Boolean))].map(street => ({
    street: String(street),
    key: canonicalStreet(String(street))
  })).filter(c => c.key.length > 0);

  // 1. Match exato após normalização
  const exact = unique.filter(c => c.key === wanted);
  if (exact.length) return exact[0].street;

  const wantedTokens = wanted.split(/\s+/).filter(Boolean);

  // 2. Coincidência total de tokens principais (ex: "silva rabelo" em "silva rabelo" ou com conectivos)
  const tokenMatch = unique.filter(c => {
    const cTokens = c.key.split(/\s+/).filter(Boolean);
    if (cTokens.length >= 2 && wantedTokens.length >= 2) {
      const allInWanted = cTokens.every(t => wantedTokens.includes(t));
      const allInCandidate = wantedTokens.every(t => cTokens.includes(t));
      return allInWanted || allInCandidate;
    }
    return false;
  });
  if (tokenMatch.length === 1) return tokenMatch[0].street;
  if (tokenMatch.length > 1) {
    // Escolhe o de tamanho mais próximo
    tokenMatch.sort((a, b) => Math.abs(a.key.length - wanted.length) - Math.abs(b.key.length - wanted.length));
    return tokenMatch[0].street;
  }

  // 3. Substring match de raiz única quando tamanho expressivo (>= 4 caracteres)
  const substringMatch = unique.filter(c => {
    if (c.key.length >= 5 && wanted.length >= 5) {
      return c.key.includes(wanted) || wanted.includes(c.key);
    }
    return false;
  });
  if (substringMatch.length === 1) return substringMatch[0].street;

  // 4. Algoritmo de Similaridade e Auto-Seleção (NBR 14.653 / threshold 75%)
  const scored = unique.map(c => {
    const ts = c.key.split(/\s+/).filter(Boolean);
    const simplifiedWanted = wantedTokens.filter(t => !['doutor', 'doutora', 'presidente', 'general', 'coronel', 'padre', 'santa', 'santo', 'marechal'].includes(t)).join(' ');
    const simplifiedCandidate = ts.filter(t => !['doutor', 'doutora', 'presidente', 'general', 'coronel', 'padre', 'santa', 'santo', 'marechal'].includes(t)).join(' ');
    if (simplifiedWanted && simplifiedCandidate && simplifiedWanted === simplifiedCandidate) {
      return { ...c, score: 0.95 };
    }

    // Levenshtein normalizado global
    const globalSim = calculateStringSimilarity(wanted, c.key);

    // Similaridade token a token
    let tokenScore = 0;
    const minTokens = Math.min(wantedTokens.length, ts.length);
    for (let i = 0; i < minTokens; i++) {
      const a = wantedTokens[i];
      const b = ts[i];
      if (a === b) tokenScore += 1;
      else if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) tokenScore += 0.9;
      else if (Math.min(a.length, b.length) >= 4 && editDistance(a, b) === 1) tokenScore += 0.85;
      else tokenScore += calculateStringSimilarity(a, b) * 0.8;
    }
    const avgTokenScore = minTokens > 0 ? tokenScore / Math.max(wantedTokens.length, ts.length) : 0;
    const finalScore = Math.max(globalSim, avgTokenScore);

    return { ...c, score: finalScore };
  }).filter(c => c.score >= 0.75).sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  // Se o primeiro tiver score isolado ou destacado
  if (!scored[1] || scored[0].score - scored[1].score >= 0.05) {
    return scored[0].street;
  }

  return scored[0].street;
}
