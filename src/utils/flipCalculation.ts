export function isCaixaAuctionWithFee(p: any): boolean {
  if (!p) return false;
  const isCaixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  if (!isCaixa) return false;
  const text = `${p.saleMode || ''} ${p.title || ''} ${p.description || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /licitacao\s*aberta|sfi|leilao/.test(text);
}

export function auctionCosts(p: any) {
  const bid = p.purchasePrice ?? p.auctionPrice ?? 0;
  const caixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  const caixaWithFee = isCaixaAuctionWithFee(p);
  const isDirectSale = caixa && !caixaWithFee;
  const gabarito = Number(p.estimatedValue) || Number(p.vendaBaixaPrice) || Number(p.vendaMediaPrice) || 0;
  const custoCarregamento = p.custoCarregamentoEstimado !== undefined
    ? Number(p.custoCarregamentoEstimado) || 0
    : Math.round(gabarito * 0.015);

  return {
    bid,
    auctioneer: p.auctioneerFee !== undefined ? p.auctioneerFee : (isDirectSale ? 0 : Math.round(bid * 0.05)),
    itbi: p.itbiCost ?? Math.round(bid * ((p.itbiPercent ?? 3) / 100)),
    registry: p.notaryCost !== undefined ? p.notaryCost + (p.caixaContractCost || 0) + (p.certificatesCost || 0) : Math.round(bid * 0.03),
    repair: p.estimatedRepair ?? Math.round(bid * 0.05),
    legal: p.lawyerFee ?? (caixa ? 6000 : (p.otherCosts || 0)),
    iptu: p.pendingIptuCost ?? 0,
    condo: (p.propertyType && /casa|sobrado/i.test(p.propertyType)) ? 0 : (p.pendingCondoCost ?? p.pendingDebts ?? 0),
    custoCarregamento
  };
}
export function calculateFlip(exitValue: number, acquisitionCost: number, monthlyHolding = 0) {
  const brokerFee = Math.round(exitValue * 0.04);
  const holding = monthlyHolding * 3;
  const netProfit = Math.round(exitValue - acquisitionCost);
  const roi = acquisitionCost > 0 ? Number(((netProfit / acquisitionCost) * 100).toFixed(2)) : 0;
  return { brokerFee, holding, grossGain: netProfit, tax: 0, netProfit, roi };
}
