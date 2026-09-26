// Shared by the calculator and the server. Robust street normalization and matching (NBR 14.653).
export function canonicalStreet(value?: string | null): string {
  if (!value) return '';

  const titles: Record<string, string> = {
    dr: 'doutor', dra: 'doutora', eng: 'engenheiro', enga: 'engenheira',
    prof: 'professor', profa: 'professora', cel: 'coronel', gen: 'general', gal: 'general',
    dep: 'deputado', gov: 'governador', pres: 'presidente', sen: 'senador',
    pe: 'padre', sta: 'santa', sto: 'santo', mal: 'marechal', cmdte: 'comandante',
    visc: 'visconde', bpo: 'bispo', dom: 'dom'
  };

  // 1. Normalização de acentos e minúsculas
  let s = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // 2. Extrai até a vírgula e remove numeração / complementos prediais
  s = s.split(',')[0]
    .replace(/\s+n[ºo°.]?\s*\d+.*$/i, '')
    .replace(/\s+(?:apto|apt|ap|bloco|bl|casa|lote|qd|quadra)\b.*$/i, '');

  // 3. Remove prefixos de tipos de logradouro
  s = s.replace(/^(?:rua|r|avenida|avn|av|estrada|etr|estr|est|travessa|trv|trav|praca|prc|pca|alameda|alm|al|rodovia|rod|largo|lrg|vila|vl|beco|servidao|passagem|psg|boulevard|blvd|via)\b\.?\s*/i, '');

  // 4. Remove pontuações e caracteres especiais
  const tokens = s.replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(t))
    .map(t => titles[t] || t);

  // Se o primeiro token for um título de honraria/cargo (ex: doutor, presidente, general),
  // e existirem outros tokens significativos, permite match mais flexível
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

export function resolveOfficialStreet(target: string, candidates: string[]): string | null {
  const wanted = canonicalStreet(target);
  if (!wanted) return null;

  const unique = [...new Set(candidates.filter(Boolean))].map(street => ({
    street,
    key: canonicalStreet(street)
  })).filter(c => c.key.length > 0);

  // Match exato após normalização
  const exact = unique.filter(c => c.key === wanted);
  if (exact.length) return exact[0].street;

  // Match fonético / token-wise
  const tokens = wanted.split(' ');
  const scored = unique.map(c => {
    const ts = c.key.split(' ');
    // Caso especial: um tem título (ex: "doutor arnaldo") e outro não ("arnaldo")
    const simplifiedWanted = tokens.filter(t => !['doutor', 'doutora', 'presidente', 'general', 'coronel', 'padre', 'santa', 'santo', 'marechal'].includes(t)).join(' ');
    const simplifiedCandidate = ts.filter(t => !['doutor', 'doutora', 'presidente', 'general', 'coronel', 'padre', 'santa', 'santo', 'marechal'].includes(t)).join(' ');
    if (simplifiedWanted && simplifiedCandidate && simplifiedWanted === simplifiedCandidate) {
      return { ...c, score: 0.95 };
    }

    if (ts.length !== tokens.length) return { ...c, score: 0 };
    let score = 0;
    for (let i = 0; i < tokens.length; i++) {
      const a = tokens[i];
      const b = ts[i];
      if (a === b) score += 1;
      else if (a.length >= 2 && b.length >= 2 && (a.startsWith(b) || b.startsWith(a))) score += 0.9;
      else if (Math.min(a.length, b.length) >= 4 && editDistance(a, b) === 1) score += 0.85;
      else return { ...c, score: 0 };
    }
    return { ...c, score: score / tokens.length };
  }).filter(c => c.score >= 0.85).sort((a, b) => b.score - a.score);

  if (!scored.length || (scored[1] && scored[0].key !== scored[1].key && scored[0].score - scored[1].score < 0.08)) {
    return null;
  }
  return scored[0].street;
}
