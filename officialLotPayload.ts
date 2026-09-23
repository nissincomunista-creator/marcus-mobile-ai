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

  // Resilient ID check: match /lote/123, /id-123, /123/ or URL containing lot.id / aid / bemId
  try {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname;
    const expectedId = urlPath.match(/(?:lote|id)[/-](\d+)(?:\/|$)/i)?.[1] || urlPath.match(/\/(\d+)(?:[/-]|$)/)?.[1];
    const lotId = lot.id || lot.bemId || lot.aid;
    if (lotId && expectedId && String(lotId) !== expectedId && !url.includes(String(lotId))) {
      return undefined;
    }
  } catch {
    // If URL parsing fails, proceed if lot object has valid data
  }

  const date = (val: any) =>
    typeof val?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.date) ? val.date.slice(0, 10) : undefined;

  const evalAmount = Number(lot.valorAvaliacao) > 0 ? Number(lot.valorAvaliacao) : undefined;
  let amount = 0;
  let auctionDate: string | undefined = undefined;
  let firstAuctionDate: string | undefined = undefined;
  let secondAuctionDate: string | undefined = undefined;
  let firstAuctionPrice: number | undefined = undefined;
  let secondAuctionPrice: number | undefined = undefined;

  const today = new Date().toISOString().slice(0, 10);

  if (lot.leilao) {
    const round = Number(lot.leilao.praca);
    firstAuctionDate = date(lot.leilao.data1);
    secondAuctionDate = date(lot.leilao.data2);
    firstAuctionPrice = Number(lot.leilao.valor1) > 0 ? Number(lot.leilao.valor1) : undefined;
    secondAuctionPrice = Number(lot.leilao.valor2) > 0 ? Number(lot.leilao.valor2) : undefined;
    auctionDate = date(lot.leilao['data' + round]) || firstAuctionDate || secondAuctionDate;

    if (typeof lot.valorInicialAtual === 'number' && lot.valorInicialAtual > 0) {
      amount = lot.valorInicialAtual;
    } else if (round === 2 && secondAuctionPrice) {
      amount = secondAuctionPrice;
    } else if (firstAuctionPrice) {
      amount = firstAuctionPrice;
    }
  } else {
    // Portella / De Paula / common auctioneer formats
    const vInit = Number(lot.valorInicial);
    const vInit2 = Number(lot.valorInicial2);
    const vMin = Number(lot.valorMinimo);
    const vAtual = Number(lot.valorAtual);

    if (vInit > 0) firstAuctionPrice = vInit;
    if (vInit2 > 0) secondAuctionPrice = vInit2;

    // Determine active bid based on auction dates if present, or current active value
    if (firstAuctionDate && firstAuctionDate >= today && firstAuctionPrice) {
      amount = firstAuctionPrice;
    } else if (Number.isFinite(vAtual) && vAtual > 0) {
      amount = vAtual;
    } else if (Number.isFinite(vInit) && vInit > 0) {
      amount = vInit;
    } else if (Number.isFinite(vMin) && vMin > 0) {
      amount = vMin;
    }
  }

  // An appraisal never supplies a missing bid; only explicit source amounts do.
  if (amount <= 0 && !evalAmount) return undefined;

  return {
    ...(amount > 0 ? { auctionPrice: amount, priceVerified: true } : {}),
    ...(evalAmount ? { estimatedValue: evalAmount } : {}),
    ...(auctionDate ? { auctionDate } : {}),
    ...(firstAuctionDate ? { firstAuctionDate } : {}),
    ...(secondAuctionDate ? { secondAuctionDate } : {}),
    ...(firstAuctionPrice ? { firstAuctionPrice } : {}),
    ...(secondAuctionPrice ? { secondAuctionPrice } : {})
  };
}
