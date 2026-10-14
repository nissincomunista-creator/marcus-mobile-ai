export type CaixaModality = 
  | 'VENDA_DIRETA_ONLINE'  // Venda Direta Online (Proposta imediata)
  | 'VENDA_ONLINE'         // Venda Online (Disputa de lances com cronômetro)
  | 'LICITACAO_ABERTA'     // Licitação Aberta
  | 'LEILAO_SFI';          // 1º ou 2º Leilão SFI

/**
 * Normaliza e classifica de forma determinística a modalidade de alienação da Caixa Econômica Federal.
 * Elimina falsos positivos e colisões de substring entre "Venda Online" e "Venda Direta Online".
 */
export function normalizeCaixaModality(rawModality: string): CaixaModality | 'OUTRO' {
  const norm = (rawModality || '').trim().toUpperCase();
  if (norm.includes('DIRETA')) return 'VENDA_DIRETA_ONLINE';
  if (norm.includes('LICITA') || norm.includes('ABERTA')) return 'LICITACAO_ABERTA';
  if (norm.includes('LEIL') || norm.includes('SFI')) return 'LEILAO_SFI';
  if (norm.includes('ONLINE')) return 'VENDA_ONLINE';
  return 'OUTRO';
}

export interface CaixaModalityInfo {
  id: CaixaModality;
  label: string;
  shortLabel: string;
  disputeType: string;
  description: string;
  icon: string;
  color: string;
  badgeClass: string;
}

export const CAIXA_MODALITY_CONFIG: Record<CaixaModality, CaixaModalityInfo> = {
  VENDA_DIRETA_ONLINE: {
    id: 'VENDA_DIRETA_ONLINE',
    label: 'Venda Direta Online',
    shortLabel: 'Venda Direta',
    disputeType: 'Proposta Imediata',
    description: 'Sem disputa de lances: a primeira proposta válida arremata o imóvel.',
    icon: '🤝',
    color: 'emerald',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-xs'
  },
  VENDA_ONLINE: {
    id: 'VENDA_ONLINE',
    label: 'Venda Online',
    shortLabel: 'Venda Online',
    disputeType: 'Disputa Cronômetro',
    description: 'Disputa de lances com encerramento por cronômetro regressivo no portal da Caixa.',
    icon: '⏱️',
    color: 'cyan',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-xs'
  },
  LICITACAO_ABERTA: {
    id: 'LICITACAO_ABERTA',
    label: 'Licitação Aberta',
    shortLabel: 'Licitação',
    disputeType: 'Leilão Público Aberto',
    description: 'Disputa aberta Caixa conduzida por leiloeiro credenciado.',
    icon: '📢',
    color: 'amber',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-xs'
  },
  LEILAO_SFI: {
    id: 'LEILAO_SFI',
    label: 'Leilão SFI',
    shortLabel: 'Leilão SFI',
    disputeType: '1º e 2º Leilão SFI',
    description: 'Alienação fiduciária regulada pela Lei 9.514/97 (1º ou 2º leilão).',
    icon: '⚖️',
    color: 'indigo',
    badgeClass: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/60 shadow-xs'
  }
};

export function isCaixaAuction(auc: { origin?: string; id?: string }): boolean {
  return auc.origin === 'caixa' || auc.origin === 'caixa_radar' || (typeof auc.id === 'string' && auc.id.startsWith('auc-caixa'));
}

export function getCaixaModality(auc: {
  modalidadeCaixa?: CaixaModality | 'OUTRO';
  saleMode?: string;
  description?: string;
  title?: string;
  paymentTerms?: string;
}): CaixaModality | 'OUTRO' {
  if (auc.modalidadeCaixa && auc.modalidadeCaixa !== 'OUTRO') {
    return auc.modalidadeCaixa;
  }
  const combined = `${auc.saleMode || ''} ${auc.description || ''} ${auc.title || ''} ${auc.paymentTerms || ''}`;
  return normalizeCaixaModality(combined);
}
