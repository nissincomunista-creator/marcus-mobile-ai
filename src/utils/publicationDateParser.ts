/**
 * src/utils/publicationDateParser.ts
 * Parser especializado em extrair e normalizar datas de publicação de portais imobiliários
 */

export interface ParsedPublicationDate {
  data_publicacao_iso: string;
  dias_publicado: number;
  texto_publicacao: string;
}

export function parseRelativePublicationDate(
  rawInput: string | number | Date | null | undefined,
  referenceDate: Date = new Date()
): ParsedPublicationDate {
  const now = referenceDate.getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * ONE_HOUR_MS;

  // Fallback padrão se não houver entrada
  const defaultFallback: ParsedPublicationDate = {
    data_publicacao_iso: new Date(now).toISOString(),
    dias_publicado: 0,
    texto_publicacao: 'Recém-publicado'
  };

  if (!rawInput) return defaultFallback;

  // 1. Caso seja número (timestamp ms ou s)
  if (typeof rawInput === 'number') {
    const timestamp = rawInput > 1e11 ? rawInput : rawInput * 1000;
    const diffMs = Math.max(0, now - timestamp);
    const dias = Math.floor(diffMs / ONE_DAY_MS);
    return {
      data_publicacao_iso: new Date(timestamp).toISOString(),
      dias_publicado: dias,
      texto_publicacao: dias === 0 ? 'Publicado hoje' : dias === 1 ? 'Publicado há 1 dia' : `Publicado há ${dias} dias`
    };
  }

  // 2. Caso seja objeto Date
  if (rawInput instanceof Date) {
    const diffMs = Math.max(0, now - rawInput.getTime());
    const dias = Math.floor(diffMs / ONE_DAY_MS);
    return {
      data_publicacao_iso: rawInput.toISOString(),
      dias_publicado: dias,
      texto_publicacao: dias === 0 ? 'Publicado hoje' : dias === 1 ? 'Publicado há 1 dia' : `Publicado há ${dias} dias`
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
      return {
        data_publicacao_iso: new Date(parsedTime).toISOString(),
        dias_publicado: dias,
        texto_publicacao: dias === 0 ? 'Publicado hoje' : dias === 1 ? 'Publicado há 1 dia' : `Publicado há ${dias} dias`
      };
    }
  }

  // 4. Caso seja formato brasileiro DD/MM/AAAA ou DD/MM/AAAA HH:mm
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
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
      return {
        data_publicacao_iso: dateObj.toISOString(),
        dias_publicado: dias,
        texto_publicacao: dias === 0 ? 'Publicado hoje' : dias === 1 ? 'Publicado há 1 dia' : `Publicado há ${dias} dias`
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

  const calculatedIso = new Date(now - (calculatedDays * ONE_DAY_MS)).toISOString();
  let label = '';
  if (calculatedDays === 0) {
    label = 'Publicado há poucas horas';
  } else if (calculatedDays === 1) {
    label = 'Publicado há 1 dia';
  } else if (calculatedDays < 7) {
    label = `Publicado há ${calculatedDays} dias`;
  } else if (calculatedDays < 30) {
    const weeks = Math.round(calculatedDays / 7);
    label = `Publicado há ${calculatedDays} dias (${weeks} sem)`;
  } else if (calculatedDays < 365) {
    const months = Math.round(calculatedDays / 30);
    label = `Publicado há ${calculatedDays} dias (${months} ${months === 1 ? 'mês' : 'meses'})`;
  } else {
    label = `Publicado há mais de 1 ano (${calculatedDays} dias)`;
  }

  return {
    data_publicacao_iso: calculatedIso,
    dias_publicado: calculatedDays,
    texto_publicacao: `${label}${atualizadoStr}`
  };
}
