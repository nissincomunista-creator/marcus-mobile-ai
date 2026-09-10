import { MatriculaAuditData, MatriculaGravame } from '../types.ts';

export function auditRegistryText(text: string): MatriculaAuditData {
  const number = text.match(/matr[ií]cula(?:\(s\))?\s*[:nº°.\s]*([\d.]+[A-Z]?)/i)?.[1];
  const office = text.match(/[^\n]{0,70}(?:registro de im[oó]veis|of[ií]cio de im[oó]veis)[^\n]{0,70}/i)?.[0];
  const entries = text.split(/(?=\b(?:R|AV)[-.\s]+\d+\b)/i);
  const gravames: MatriculaGravame[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const code = entry.match(/^\s*((?:R|AV)[-.\s]+\d+)/i)?.[1]?.replace(/\s+/g, '').toUpperCase() || 'Referência no texto';
    const types = [
      ['Penhora', /penhora/i], ['Hipoteca', /hipotec/i],
      ['Alienação fiduciária', /aliena[cç][aã]o fiduci[aá]ria/i],
      ['Indisponibilidade', /indisponibilidade|\bCNIB\b/i],
      ['Usufruto', /usufruto/i]
    ] as const;
    for (const [type, pattern] of types) {
      const match = entry.match(pattern);
      if (!match || seen.has(`${code}:${type}`)) continue;
      seen.add(`${code}:${type}`);
      const excerpt = entry.slice(Math.max(0, (match.index || 0) - 80), (match.index || 0) + 260).replace(/\s+/g, ' ');
      const cancellation = /cancelad|cancelamento|baixa/i.test(excerpt);
      gravames.push({ code, type: `${type}${cancellation ? ' — menção a cancelamento' : ''}`,
        beneficiaryOrCourt: excerpt,
        severity: !cancellation && /penhora|indisponibilidade/i.test(type) ? 'Alta' : 'Média',
        legalSolution: cancellation
          ? 'Conferir qual registro foi cancelado e se a baixa abrange este ônus.'
          : 'Conferir vigência, beneficiário e condições de baixa na certidão atualizada e no edital.' });
    }
  }
  const qualifications = text.split(/\n+/).map(line => line.trim()).filter(line =>
    /[aá]rea|fra[cç][aã]o ideal|apartamento|confronta|propriet[aá]ri|inscri[cç][aã]o|situad[oa]/i.test(line)
  ).slice(0, 12).map(line => line.slice(0, 400));
  return {
    matriculaNumber: number ? `Matrícula nº ${number}` : 'Número não identificado',
    registryOffice: office?.trim() || 'Cartório não identificado no texto',
    overallStatus: gravames.some(item => item.severity === 'Alta') ? 'ALTO_RISCO' : 'ATENCAO',
    gravames,
    pontosApurados: [...qualifications, gravames.length
      ? `${gravames.length} referências registrais identificadas; verificar vigência e baixas.`
      : 'Não foram identificados gravames no texto legível. Isso não certifica ausência de ônus.'],
    rawText: text, analyzedAt: new Date().toISOString()
  };
}
