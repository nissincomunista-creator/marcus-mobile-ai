export function auctionCosts(p: any) {
  const bid = p.purchasePrice ?? p.auctionPrice ?? 0;
  const caixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  return {
    bid,
    auctioneer: p.auctioneerFee ?? (caixa ? 0 : Math.round(bid * 0.05)),
    itbi: p.itbiCost ?? Math.round(bid * ((p.itbiPercent ?? 3) / 100)),
    registry: p.notaryCost !== undefined ? p.notaryCost + (p.caixaContractCost || 0) + (p.certificatesCost || 0) : Math.round(bid * 0.03),
    repair: p.estimatedRepair ?? Math.round(bid * 0.05),
    legal: p.lawyerFee ?? (caixa ? 6000 : (p.otherCosts || 0)),
    iptu: p.pendingIptuCost ?? 0,
    condo: p.pendingCondoCost ?? (String(p.propertyType).toLowerCase().includes('casa') ? 0 : (p.pendingDebts || 0))
  };
}
export function calculateFlip(exitValue: number, acquisitionCost: number, monthlyHolding = 0) {
  const brokerFee = Math.round(exitValue * 0.04);
  const holding = monthlyHolding * 3;
  const grossGain = exitValue - acquisitionCost - holding - brokerFee;
  const tax = grossGain > 0 ? Math.round(grossGain * 0.15) : 0;
  const netProfit = grossGain - tax;
  const roi = acquisitionCost > 0 ? Number((netProfit / (acquisitionCost + holding) * 100).toFixed(2)) : 0;
  return { brokerFee, holding, grossGain, tax, netProfit, roi };
}
