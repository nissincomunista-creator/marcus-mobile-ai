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
  const expectedId = new URL(url).pathname.match(/\/lote\/(\d+)(?:\/|$)/)?.[1];
  if (!expectedId || String(lot.id) !== expectedId) return undefined;

  const date = (val: any) =>
    typeof val?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.date) ? val.date.slice(0, 10) : undefined;

  const evalAmount = Number(lot.valorAvaliacao) > 0 ? Number(lot.valorAvaliacao) : undefined;
  let amount = 0;
  let auctionDate: string | undefined = undefined;
  let firstAuctionDate: string | undefined = undefined;
  let secondAuctionDate: string | undefined = undefined;

  if (lot.leilao) {
    const round = Number(lot.leilao.praca);
    if (![1, 2, 3].includes(round)) return undefined;
    firstAuctionDate = date(lot.leilao.data1);
    secondAuctionDate = date(lot.leilao.data2);
    auctionDate = date(lot.leilao['data' + round]) || firstAuctionDate || secondAuctionDate;

    if (typeof lot.valorInicialAtual === 'number' && lot.valorInicialAtual > 0) {
      amount = lot.valorInicialAtual;
    } else return undefined;
  } else {
    // Portella / De Paula format
    const vInit = Number(lot.valorInicial);
    const vMin = Number(lot.valorMinimo);
    if (Number.isFinite(vInit) && vInit > 0) amount = vInit;
    else if (Number.isFinite(vMin) && vMin > 0) amount = vMin;
  }

  // An appraisal never supplies a missing bid; only explicit source amounts do.

  if (amount <= 0 && !evalAmount) return undefined;

  return {
    ...(amount > 0 ? { auctionPrice: amount, priceVerified: true } : {}),
    ...(evalAmount ? { estimatedValue: evalAmount } : {}),
    ...(auctionDate ? { auctionDate } : {}),
    ...(firstAuctionDate ? { firstAuctionDate } : {}),
    ...(secondAuctionDate ? { secondAuctionDate } : {})
  };
}
