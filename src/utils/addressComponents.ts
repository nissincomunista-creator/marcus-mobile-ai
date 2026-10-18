export interface AddressComponents {
  street: string;
  number: string;
  complement: string;
}

const STREET_PREFIX = /^(?:rua|r\.?|avenida|av\.?|estrada|est\.?|travessa|trv\.?|alameda|al\.?|rodovia|rod\.?|pra[cç]a|largo)\s+/i;
const STREET_START = /\b(?:rua|r\.?|avenida|av\.?|estrada|est\.?|travessa|trv\.?|alameda|al\.?|rodovia|rod\.?|pra[cç]a|largo)\s+/i;
const UNIT_WORD = '(fundos|fds|casa|apto|apartamento|bloco|bl|sobrado|unidade|sala)';
const NUMBER = '(\\d{1,6}(?:\\.\\d{3})?(?:[A-Za-z])?)';

export function parseAddressComponents(rawAddress: string | null | undefined): AddressComponents {
  if (!rawAddress) return { street: '', number: '', complement: '' };
  let text = String(rawAddress).trim()
    .replace(/^\s*(?:endere[cç]o(?:\s+do\s+im[oó]vel)?|logradouro|localiza[cç][aã]o)\s*[:\-]?\s*/i, '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/cep:?\s*\d{5}-?\d{3}/gi, '')
    .replace(/,\s*(?:pe|rj|sp|mg|df|pr|sc|rs|es|ba|ce|go|ma|pb|am|rn|al|pi|mt|ms|se|ro|to|ac|ap|rr)\b/gi, '')
    .trim();

  const streetStart = text.search(STREET_START);
  if (streetStart >= 0) text = text.slice(streetStart);
  text = text.replace(/\s*(?:,|[-–])\s*(?:bairro|cidade|munic[ií]pio|cep)\s*[:\-]?.*$/i, '').trim();

  const legalCutoffs = [
    /,\s*(?:constitu[ií]d[oa]|formad[oa]|inscrit[oa]|matriculado|objeto|lote\s+n?[ºo°]?\s*\d+|quadra\s+[a-z0-9]+|pa\s*n?[ºo°]?\s*\d+|pal\s*n?[ºo°]?\s*\d+|do\s+bairro\b|designad[oa]|sublote).*$/i,
    /\b(?:constitu[ií]d[oa]|formad[oa])\s+pelo\s+lote.*$/i,
    /\b(?:matr[íi]cula|inscri[cç][aã]o\s+imobili[aá]ria)\s*:?.*$/i
  ];
  for (const cutoff of legalCutoffs) text = text.replace(cutoff, '').trim();

  const multiStreetMatch = text.match(/(?:rua\s*\d{1,2}|casa\s*\d+|bloco\s*\w+),\s*((?:avenida|av\.|rua|r\.|estrada|est\.|travessa|trv\.|alameda|pra[cç]a)\s+[^,]+),\s*(.*)/i);
  if (multiStreetMatch) text = `${multiStreetMatch[1]}, ${multiStreetMatch[2]}`;

  const numberPattern = new RegExp(`\\b(?:n[ºo°.]?|num(?:ero)?\\.?|nro\\.?)\\s*${NUMBER}(?:\\s*[-–/]\\s*${UNIT_WORD})?`, 'i');
  const commaNumberPattern = new RegExp(`,\\s*${NUMBER}(?:\\s*[-–/]\\s*${UNIT_WORD})?`, 'i');
  let numberMatch = text.match(numberPattern) || text.match(commaNumberPattern);

  if (!numberMatch) {
    const looseNumberPattern = new RegExp(`\\s+${NUMBER}(?:\\s*[-–/]\\s*${UNIT_WORD})?(?=\\s*(?:,|;|$))`, 'i');
    const looseMatch = text.match(looseNumberPattern);
    const streetName = looseMatch
      ? text.slice(0, looseMatch.index)
        .replace(/^(?:rua|r\.?|avenida|av\.?|estrada|est\.?|travessa|trv\.?|alameda|al\.?|rodovia|rod\.?|pra[cç]a|largo)\s*/i, '')
        .trim()
      : '';
    // A numbered street such as "Rua 35" is not a property number. Accept a
    // number without comma/prefix only after a named street with real letters.
    if (looseMatch && /[A-Za-zÀ-ÿ]{3}/.test(streetName)) numberMatch = looseMatch;
  }

  let number = '';
  let complement = '';
  let street = text;
  if (numberMatch) {
    number = String(numberMatch[1] || '').replace(/\./g, '');
    complement = String(numberMatch[2] || '').trim();
    street = text.slice(0, numberMatch.index);
    const remaining = text.slice((numberMatch.index || 0) + numberMatch[0].length).replace(/^[,;:\s\-–]+/, '');
    if (!complement) {
      const trailingUnit = remaining.match(new RegExp(`^${UNIT_WORD}\\.?\\s*[A-Za-z0-9/-]*`, 'i'));
      if (trailingUnit) complement = trailingUnit[0].trim();
    }
  } else {
    // When there is NO building number, text might still contain comma-separated neighborhood or city,
    // e.g. "Avenida Rainha Elisabeth da Bélgica, Ipanema, Rio de Jane"
    // Extract strictly the first segment representing the public street!
    const parts = text.split(/\s*,\s*|\s+[-–—]\s+/);
    if (parts.length > 1) {
      street = parts[0].trim();
    }
  }

  street = street
    .replace(/[,;]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^r\.\s*/i, 'Rua ')
    .replace(/^av\.\s*/i, 'Avenida ')
    .replace(/^est\.\s*/i, 'Estrada ')
    .replace(/^tr\.\s*/i, 'Travessa ')
    .replace(/^pca\.\s*/i, 'Praça ');

  return { street, number, complement };
}
