// Higienizador universal de logradouros e parser de endereços (NBR 14.653)
// Elimina prefixos ruidosos de scrapers, editais, numerações e complementos residuais

export function sanitizeStreetName(rawStreet: string | null | undefined): string {
  if (!rawStreet) return '';
  let s = String(rawStreet).trim();

  // 1. Remover entidades hex/XML residuais e underlines
  s = s.replace(/_x([0-9a-fA-F]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
       .replace(/_/g, ' ');

  // 2. Remoção de prefixos ruidosos de scrapers e editais (case-insensitive)
  // Ex: "do Imóvel: Rua Silva Rabelo", "do Bem: ", "Endereço: ", "Localização: ", "Imóvel: ", "Dados do Imóvel: "
  s = s.replace(/^(?:dados\s+do\s+im[oó]vel|dados\s+do\s+bem|do\s+im[oó]vel|do\s+bem|do\s+lote|endere[cç]o|local(?:iza[cç][aã]o)?|im[oó]vel|lote|bem)\s*[:\-–]\s*/i, '');
  s = s.replace(/^(?:obs\.?\s*\d*\s*[:\-–]?\s*)+/i, '');

  // 3. Remover prefixos de condomínio/edifício/bloco/sala/casa quando vazam no início
  // Ex: "Edifício Master Business Center, Rua Silva Rabelo" ou "Condomínio XYZ, Rua ..."
  s = s.replace(/^(?:edif[íi]cio|ed\.?|condom[íi]nio|cond\.?|bloco|bl\.?|apto\.?|apt\.?|sala|casa)\s+[^,–-]+[,\-–]\s*/i, '');

  // 4. Se contiver vírgula, hífen duplo ou " - ", extrai apenas a primeira parte antes do número/complemento
  // Ex: "Rua Silva Rabelo, 57, Sala 205 - Edificio..." -> "Rua Silva Rabelo"
  const commaParts = s.split(',');
  if (commaParts.length > 1) {
    s = commaParts[0].trim();
  }
  const hyphenParts = s.split(/\s+[-–—]\s+/);
  if (hyphenParts.length > 1 && !/^(?:rua|avenida|estrada|travessa)/i.test(hyphenParts[0])) {
    // Se a primeira parte for um nome de edifício (ex: "Master Business Center - Rua Silva Rabelo")
    if (/(?:rua|avenida|estrada|travessa|alameda|praca|praça)/i.test(hyphenParts[1])) {
      s = hyphenParts[1].trim();
    }
  }

  // 5. Remover numeração e complementos residuais que vazem no final da string
  s = s.replace(/\s+n[ºo°.]?\s*\d+.*$/i, '')
       .replace(/\s+\d{1,6}(?:\s*[-–/].*)?$/, '')
       .replace(/\s+(?:sala|apto|apt|ap|bloco|bl|casa|lote|qd|quadra|edificio|ed|loja)\b.*$/i, '');

  // 6. Remover pontuação solta inicial ou final
  s = s.replace(/^[,\-–:.]+\s*/, '').replace(/[,\-–:.]+\s*$/, '').replace(/\s+/g, ' ').trim();

  // 7. Normalizar prefixos comuns de tipo de logradouro
  s = s.replace(/^r\.\s*/i, 'Rua ')
       .replace(/^av\.\s*|^avn\.\s*/i, 'Avenida ')
       .replace(/^est\.\s*|^estr\.\s*/i, 'Estrada ')
       .replace(/^tr\.\s*|^trv\.\s*/i, 'Travessa ')
       .replace(/^pca\.\s*|^pça\.\s*/i, 'Praça ')
       .replace(/^al\.\s*|^alm\.\s*/i, 'Alameda ')
       .replace(/^rod\.\s*/i, 'Rodovia ')
       .replace(/^lg\.\s*|^lgo\.\s*/i, 'Largo ');

  return s;
}

export function parseCleanAddress(rawAddress: string | null | undefined): {
  street: string;
  number: string;
  complement: string;
} {
  if (!rawAddress) return { street: '', number: '', complement: '' };
  let text = String(rawAddress).trim();

  // 1. Remover notas parentéticas como (Antiga Rua ...), (Lote ...), etc.
  text = text.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  // 2. Remover CEP e UF residuais
  text = text.replace(/cep:?\s*\d{5}-?\d{3}/gi, '');
  text = text.replace(/,\s*(?:pe|rj|sp|mg|df|pr|sc|rs|es|ba|ce|go|ma|pb|am|rn|al|pi|mt|ms|se|ro|to|ac|ap|rr)\b/gi, '').trim();

  // 3. Remover sufixos de cartório/matrícula
  const legalCutoffs = [
    /,\s*(?:constitu[ií]d[oa]|formad[oa]|inscrit[oa]|matriculado|objeto|lote\s+n?[ºo°]?\s*\d+|quadra\s+[a-z0-9]+|pa\s*n?[ºo°]?\s*\d+|pal\s*n?[ºo°]?\s*\d+|do\s+bairro\b|designad[oa]|sublote).*$/i,
    /\b(?:constitu[ií]d[oa]|formad[oa])\s+pelo\s+lote.*$/i,
    /\bdo\s+PA\s*n?[ºo°]?\s*\d+.*$/i,
    /\bPA\s*n?[ºo°]?\s*\d+.*$/i,
    /\bdo\s+bairro\s+[A-Za-zÀ-ÿ\s]+.*$/i,
    /\bmatr[íi]cula:?.*$/i
  ];
  for (const cutoff of legalCutoffs) {
    text = text.replace(cutoff, '').trim();
  }

  // 4. Remover prefixos de scrapers do texto bruto antes de extrair número
  text = text.replace(/^(?:dados\s+do\s+im[oó]vel|dados\s+do\s+bem|do\s+im[oó]vel|do\s+bem|do\s+lote|endere[cç]o|local(?:iza[cç][aã]o)?|im[oó]vel|lote|bem)\s*[:\-–]\s*/i, '');
  text = text.replace(/^(?:obs\.?\s*\d*\s*[:\-–]?\s*)+/i, '');

  // 5. Extrair número predial
  let number = '';
  let complement = '';

  const numPrefixMatch = text.match(/(?:,\s*|\s+)(?:n[ºo°.]?|num(?:ero)?\.?|nro\.?)\s*(\d+(?:\.\d+)?)\s*(?:e\s*\d+)?\s*[-–/]?\s*(fundos|fds|casa|apto|bloco|bl|sobrado|sala|loja)?/i);
  if (numPrefixMatch) {
    number = numPrefixMatch[1].replace(/\./g, '');
    if (numPrefixMatch[2]) complement = numPrefixMatch[2].trim();
  } else {
    const commaNumMatch = text.match(/,\s*(\d{1,6})\b(?:\s*[-–/]?\s*(fundos|fds|casa|apto|bloco|bl|sala|loja))?/i);
    if (commaNumMatch) {
      number = commaNumMatch[1];
      if (commaNumMatch[2]) complement = commaNumMatch[2].trim();
    }
  }

  // 6. Extrair complemento predial após número se existir
  if (number) {
    const splitByNum = text.split(new RegExp(`(?:,\\s*|\\s+)(?:n[ºo°.]?|num(?:ero)?\\.?|nro\\.?)?\\s*${number}\\b`, 'i'));
    if (splitByNum.length > 1 && splitByNum[1].trim()) {
      let comp = splitByNum[1].trim();
      comp = comp.replace(/^[,\-–/.]+\s*/, '').replace(/\s+/g, ' ').trim();
      // Não incluir o bairro ou cidade no complemento
      comp = comp.replace(/,\s*[A-Za-zÀ-ÿ\s]+,\s*(?:RJ|SP|MG|DF).*$/i, '');
      if (comp && !complement) complement = comp;
    }
  }

  // 7. Higienizar a rua usando o sanitizador
  const rawStreetPart = number ? text.split(new RegExp(`(?:,\\s*|\\s+)(?:n[ºo°.]?|num(?:ero)?\\.?|nro\\.?)?\\s*${number}\\b`, 'i'))[0] : text;
  const street = sanitizeStreetName(rawStreetPart);

  return { street, number, complement };
}
