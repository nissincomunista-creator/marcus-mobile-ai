// Public auction portal payload parser. Parse embedded JSON state only; never execute source scripts.
export function officialLotFinancials(html: string, url: string) {
  let lot: any;
  try {
    const m = html.match(/(?:var|let|const)\s+lote\s*=\s*(\{[^\r\n]+\});/);
    if (m) lot = JSON.parse(m[1]);
  } catch {
    return undefined;
  }
  if (!lot || typeof lot !== 'object') return undefined;

  const date = (val: any) =>
    typeof val?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.date) ? val.date.slice(0, 10) : undefined;

  const evalAmount = Number(lot.valorAvaliacao) > 0 ? Number(lot.valorAvaliacao) : undefined;
  let amount = 0;
  let auctionDate: string | undefined = undefined;
  let firstAuctionDate: string | undefined = undefined;
  let secondAuctionDate: string | undefined = undefined;

  if (lot.leilao) {
    const round = Number(lot.leilao.praca) || 1;
    firstAuctionDate = date(lot.leilao.data1);
    secondAuctionDate = date(lot.leilao.data2);
    auctionDate = date(lot.leilao['data' + round]) || firstAuctionDate || secondAuctionDate;

    if (typeof lot.valorInicialAtual === 'number' && lot.valorInicialAtual > 0) {
      amount = lot.valorInicialAtual;
    } else if (round === 2 && typeof lot.valorInicial2 === 'number' && lot.valorInicial2 > 0) {
      amount = lot.valorInicial2;
    } else if (typeof lot.valorInicial === 'number' && lot.valorInicial > 0) {
      amount = lot.valorInicial;
    }
  } else {
    // Portella / De Paula format
    const vInit = Number(lot.valorInicial);
    const vMin = Number(lot.valorMinimo);
    if (Number.isFinite(vInit) && vInit > 0) amount = vInit;
    else if (Number.isFinite(vMin) && vMin > 0) amount = vMin;
  }

  // Legal default for judicial auctions: 50% of appraisal if 2nd round / no bid explicit
  if (amount <= 0 && evalAmount) {
    amount = Math.round(evalAmount * 0.5);
  }

  if (amount <= 0 && !evalAmount) return undefined;

  return {
    ...(amount > 0 ? { auctionPrice: amount, priceVerified: true } : {}),
    ...(evalAmount ? { estimatedValue: evalAmount } : {}),
    ...(auctionDate ? { auctionDate } : {}),
    ...(firstAuctionDate ? { firstAuctionDate } : {}),
    ...(secondAuctionDate ? { secondAuctionDate } : {})
  };
}

