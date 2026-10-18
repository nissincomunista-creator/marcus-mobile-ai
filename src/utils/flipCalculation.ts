export function isCaixaAuctionWithFee(p: any): boolean {
  if (!p) return false;
  const isCaixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  if (!isCaixa) return false;
  const text = `${p.saleMode || ''} ${p.title || ''} ${p.description || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /licitacao\s*aberta|sfi|leilao/.test(text);
}

export function auctionCosts(p: any) {
  const isPortal = p.origin === 'portal';
  const isFlip = isPortal || p.acquisitionMode === 'flip' || p.acquisitionRule === 'flip';
  const bid = p.purchasePrice ?? p.precoAnunciado ?? p.auctionPrice ?? 0;
  const caixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  const caixaWithFee = isCaixaAuctionWithFee(p);
  const isDirectSale = (caixa && !caixaWithFee) || isFlip;
  const gabarito = Number(p.estimatedValue) || Number(p.vendaBaixaPrice) || Number(p.vendaMediaPrice) || Number(p.valorMercadoEstimado) || 0;
  const custoCarregamento = isFlip
    ? 0
    : (p.custoCarregamentoEstimado !== undefined
      ? Number(p.custoCarregamentoEstimado) || 0
      : Math.round(gabarito * 0.015));

  return {
    bid,
    auctioneer: p.auctioneerFee !== undefined ? p.auctioneerFee : (isDirectSale ? 0 : Math.round(bid * 0.05)),
    itbi: p.itbiCost ?? Math.round(bid * ((p.itbiPercent ?? 3) / 100)),
    registry: p.notaryCost !== undefined ? p.notaryCost + (p.caixaContractCost || 0) + (p.certificatesCost || 0) : Math.round(bid * 0.02),
    repair: p.estimatedRepair !== undefined ? p.estimatedRepair : (isFlip ? Math.round(bid * 0.05) : Math.round((p.sizeSqm || 60) * 350)),
    legal: p.lawyerFee ?? (isFlip ? 0 : (caixa ? 6000 : (p.otherCosts || 0))),
    iptu: isFlip ? 0 : (p.pendingIptuCost ?? p.valorIptu ?? 0),
    condo: (isFlip || (p.propertyType && /casa|sobrado/i.test(p.propertyType))) ? 0 : (p.pendingCondoCost ?? p.valorCondominio ?? p.pendingDebts ?? 0),
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
