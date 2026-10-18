/**
 * src/utils/publicationDateParser.ts
 * Parser especializado em extrair e normalizar datas de publicação de portais imobiliários
 */

export interface ParsedPublicationDate {
  data_publicacao_iso: string;
  dias_publicado: number;
  texto_publicacao: string;
}

function formatBrlDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function parseRelativePublicationDate(
  rawInput: string | number | Date | null | undefined,
  referenceDate: Date = new Date()
): ParsedPublicationDate {
  const now = referenceDate.getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * ONE_HOUR_MS;

  // Fallback padrão com data exata de hoje
  const todayDate = new Date(now);
  const todayFormatted = formatBrlDate(todayDate);
  const defaultFallback: ParsedPublicationDate = {
    data_publicacao_iso: todayDate.toISOString(),
    dias_publicado: 0,
    texto_publicacao: `Publicado em ${todayFormatted} (Hoje)`
  };

  if (!rawInput) return defaultFallback;

  // 1. Caso seja número (timestamp ms ou s)
  if (typeof rawInput === 'number') {
    const timestamp = rawInput > 1e11 ? rawInput : rawInput * 1000;
    const diffMs = Math.max(0, now - timestamp);
    const dias = Math.floor(diffMs / ONE_DAY_MS);
    const dateObj = new Date(timestamp);
    const dateFormatted = formatBrlDate(dateObj);
    const rel = dias === 0 ? '(Hoje)' : dias === 1 ? '(Ontem)' : `(há ${dias} dias)`;
    return {
      data_publicacao_iso: dateObj.toISOString(),
      dias_publicado: dias,
      texto_publicacao: `Publicado em ${dateFormatted} ${rel}`
    };
  }

  // 2. Caso seja objeto Date
  if (rawInput instanceof Date) {
    const diffMs = Math.max(0, now - rawInput.getTime());
    const dias = Math.floor(diffMs / ONE_DAY_MS);
    const dateFormatted = formatBrlDate(rawInput);
    const rel = dias === 0 ? '(Hoje)' : dias === 1 ? '(Ontem)' : `(há ${dias} dias)`;
    return {
      data_publicacao_iso: rawInput.toISOString(),
      dias_publicado: dias,
      texto_publicacao: `Publicado em ${dateFormatted} ${rel}`
    };
  }

  const str = String(rawInput).trim();
  if (!str) return defaultFallback;

  // 3. Caso seja formato ISO (ex: 2026-08-15T12:00:00Z)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsedTime = Date.parse(str);
    if (!isNaN(parsedTime)) {
      const diffMs = Math.max(0, now - parsedTime);
      const dias = Math.floor(diffMs / ONE_DAY_MS);
      const dateObj = new Date(parsedTime);
      const dateFormatted = formatBrlDate(dateObj);
      const rel = dias === 0 ? '(Hoje)' : dias === 1 ? '(Ontem)' : `(há ${dias} dias)`;
      return {
        data_publicacao_iso: dateObj.toISOString(),
        dias_publicado: dias,
        texto_publicacao: `Publicado em ${dateFormatted} ${rel}`
      };
    }
  }

  // 4. Caso contenha formato brasileiro DD/MM/AAAA ou DD/MM/AAAA HH:mm
  const brMatch = str.match(/(?:publicado\s*(?:em\s*)?)?(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/i);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 12;
    const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const dateObj = new Date(year, month, day, hour, min);
    if (!isNaN(dateObj.getTime())) {
      const diffMs = Math.max(0, now - dateObj.getTime());
      const dias = Math.floor(diffMs / ONE_DAY_MS);
      const dateFormatted = formatBrlDate(dateObj);
      const rel = dias === 0 ? '(Hoje)' : dias === 1 ? '(Ontem)' : `(há ${dias} dias)`;
      return {
        data_publicacao_iso: dateObj.toISOString(),
        dias_publicado: dias,
        texto_publicacao: `Publicado em ${dateFormatted} ${rel}`
      };
    }
  }

  // 5. Normalização de texto relativo em português
  const lower = str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ');

  // Extrair detalhes de "atualizado há X" se houver
  let atualizadoStr = '';
  const updateMatch = lower.match(/atualizado h[aá]\s+(\d+)\s*(minuto|hora|dia|semana|mes|ano)/i);
  if (updateMatch) {
    const uVal = updateMatch[1];
    const uUnit = updateMatch[2].startsWith('min') ? 'min' :
                  updateMatch[2].startsWith('hor') ? 'h' :
                  updateMatch[2].startsWith('dia') ? 'd' : 'sem';
    atualizadoStr = ` • Atualizado há ${uVal}${uUnit}`;
  }

  let calculatedDays = 0;

  // Casos especiais diretos
  if (lower.includes('hoje') || lower.includes('poucas horas') || lower.includes('menos de 1 hora') || lower.includes('recentemente')) {
    calculatedDays = 0;
  } else if (lower.includes('ontem')) {
    calculatedDays = 1;
  } else if (lower.includes('mais de 1 ano') || lower.includes('mais de um ano')) {
    calculatedDays = 380;
  } else {
    // Casos com número explícito: "há X horas/dias/semanas/meses/anos"
    // ou "publicado há X ..."
    const relMatch = lower.match(/(?:publicado\s+)?h[aá]\s+(\d+)\s*(hora|dia|semana|m[eê]s|mes|ano)s?/i);
    if (relMatch) {
      const val = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();

      if (unit.startsWith('hor')) {
        calculatedDays = Math.max(0, Math.floor(val / 24));
      } else if (unit.startsWith('dia')) {
        calculatedDays = val;
      } else if (unit.startsWith('sem')) {
        calculatedDays = val * 7;
      } else if (unit.startsWith('m')) {
        calculatedDays = val * 30;
      } else if (unit.startsWith('ano')) {
        calculatedDays = val * 365;
      }
    } else {
      // Padrões como "há 1 semana", "há um mês", etc.
      if (lower.includes('uma semana') || lower.includes('1 semana')) {
        calculatedDays = 7;
      } else if (lower.includes('duas semanas') || lower.includes('2 semanas')) {
        calculatedDays = 14;
      } else if (lower.includes('tres semanas') || lower.includes('3 semanas')) {
        calculatedDays = 21;
      } else if (lower.includes('um mes') || lower.includes('1 mes')) {
        calculatedDays = 30;
      } else if (lower.includes('dois meses') || lower.includes('2 meses')) {
        calculatedDays = 60;
      } else if (lower.includes('tres meses') || lower.includes('3 meses')) {
        calculatedDays = 90;
      } else if (lower.includes('seis meses') || lower.includes('6 meses')) {
        calculatedDays = 180;
      } else if (lower.includes('um ano') || lower.includes('1 ano')) {
        calculatedDays = 365;
      }
    }
  }

  const calculatedDate = new Date(now - (calculatedDays * ONE_DAY_MS));
  const calculatedFormatted = formatBrlDate(calculatedDate);
  let relLabel = '';
  if (calculatedDays === 0) {
    relLabel = '(Hoje)';
  } else if (calculatedDays === 1) {
    relLabel = '(Ontem)';
  } else if (calculatedDays < 7) {
    relLabel = `(há ${calculatedDays} dias)`;
  } else if (calculatedDays < 30) {
    const weeks = Math.round(calculatedDays / 7);
    relLabel = `(há ${calculatedDays} dias / ${weeks} sem)`;
  } else if (calculatedDays < 365) {
    const months = Math.round(calculatedDays / 30);
    relLabel = `(há ${calculatedDays} dias / ${months} ${months === 1 ? 'mês' : 'meses'})`;
  } else {
    relLabel = `(há ${calculatedDays} dias / >1 ano)`;
  }

  return {
    data_publicacao_iso: calculatedDate.toISOString(),
    dias_publicado: calculatedDays,
    texto_publicacao: `Publicado em ${calculatedFormatted} ${relLabel}${atualizadoStr}`
  };
}
