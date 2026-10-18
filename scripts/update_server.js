import fs from 'fs';
import path from 'path';

const filePath = path.resolve('server.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const normalize = s => s.replace(/\r\n/g, '\n');
let norm = normalize(content);

// 1. Update import from bidirectionalBenchmark.ts
const targetImport = `import { computeBidirectionalBenchmarks, isGenericStreet } from './src/utils/bidirectionalBenchmark.ts';`;
const replImport = `import { computeBidirectionalBenchmarks, isGenericStreet, getTxIntegralValue, filterByIQR, inferReverseArea } from './src/utils/bidirectionalBenchmark.ts';`;

if (norm.includes(targetImport)) {
  norm = norm.replace(targetImport, replImport);
} else {
  console.error('targetImport not found');
  process.exit(1);
}

// 2. Update Juiz de Fora block in buildItbiIndexes first loop
const targetJfFirstLoop = `    const isJF = nTxs.some(t => (t.city && t.city.toLowerCase().includes('juiz')) || t.state === 'MG' || (t.unitValueSqm === 0 && t.transactionValue > 0));
    if (isJF) {
      // Em Juiz de Fora a precificação é absoluta e dinâmica no computeBidirectionalBenchmarks
      continue;
    }`;

const replJfFirstLoop = `    const isJF = nTxs.some(t => (t.city && t.city.toLowerCase().includes('juiz')) || (t.state && t.state.toUpperCase() === 'MG') || (t.unitValueSqm === 0 && t.transactionValue > 0));
    if (isJF) {
      const area_referencia = 60.0;
      const bIntegralVals = nTxs.map(t => getTxIntegralValue(t)).filter(v => v >= 15000 && v <= 50000000);
      const bIqr = filterByIQR(bIntegralVals);
      const bMediana = bIqr.filtered.length > 0 ? computeMedian(bIqr.filtered) : 0;
      const m2_base_bairro = bMediana > 0 ? Math.round(bMediana / area_referencia) : 3500;

      const streetGroup = new Map<string, ItbiTransaction[]>();
      for (let i = 0; i < nTxs.length; i++) {
        const sc = (nTxs[i] as any)._core;
        if (!sc) continue;
        let sList = streetGroup.get(sc);
        if (!sList) {
          sList = [];
          streetGroup.set(sc, sList);
        }
        sList.push(nTxs[i]);
      }

      for (const [, sTxs] of streetGroup.entries()) {
        const sIntegralVals = sTxs.map(t => getTxIntegralValue(t)).filter(v => v >= 15000 && v <= 50000000);
        const sIqr = filterByIQR(sIntegralVals);
        const sMediana = sIqr.filtered.length > 0 ? computeMedian(sIqr.filtered) : bMediana;
        const m2_base_rua = sMediana > 0 ? Math.round(sMediana / area_referencia) : m2_base_bairro;

        for (let i = 0; i < sTxs.length; i++) {
          const t = sTxs[i];
          const vInt = getTxIntegralValue(t);
          t.normalizedTotalValue = vInt;
          t.estimatedSizeSqm = inferReverseArea(vInt, m2_base_rua);
          t.sizeSqm = t.estimatedSizeSqm;
          t.unitValueSqm = m2_base_rua;
          t.isDerivedSqm = true;
          validTxSet.add(t);
        }
      }
      continue;
    }`;

if (norm.includes(normalize(targetJfFirstLoop))) {
  norm = norm.replace(normalize(targetJfFirstLoop), normalize(replJfFirstLoop));
} else {
  console.error('targetJfFirstLoop not found');
  process.exit(1);
}

// 3. Update Juiz de Fora block in buildItbiIndexes second loop
const targetJfSecondLoop = `    if (isJF) {
      if (t.isCompraEVenda === false) continue;
      // Em Juiz de Fora a precificação é absoluta. Não poluímos avgSqmMap com 0,
      // mas alimentamos o volume, nome de cidade e os mapas de resolução de rua e número:
      const volKey = \`\${state}|\${normCity}|\${neigh}\`;
      volMap.set(volKey, (volMap.get(volKey) || 0) + 1);
      neighCityMap.set(\`\${state}|\${neigh}\`, t.city || 'Juiz de Fora');

      if (t.street) {
        const streetPhon = phoneticStreet(t.street);
        if (streetPhon) {
          const cityStreetKey = \`\${state}|\${normCity}|\${streetPhon}\`;
          let csEntry = cityStreetToNeighMap.get(cityStreetKey);
          if (!csEntry) {
            csEntry = { neighborhood: t.neighborhood, sumSqm: 0, count: 0, officialStreet: t.street };
            cityStreetToNeighMap.set(cityStreetKey, csEntry);
          }
          csEntry.count += 1;

          if (t.number) {
            const numClean = parseInt(String(t.number).replace(/\\D/g, ''), 10);
            if (!isNaN(numClean) && numClean > 0) {
              let numList = streetNumberNeighMap.get(cityStreetKey);
              if (!numList) {
                numList = [];
                streetNumberNeighMap.set(cityStreetKey, numList);
              }
              numList.push({ number: numClean, neighborhood: t.neighborhood, unitValueSqm: 0, propType: t.propertyType });
            }
          }
        }
      }
      continue;
    }`;

const replJfSecondLoop = `    if (isJF) {
      if (t.isCompraEVenda === false) continue;
      const volKey = \`\${state}|\${normCity}|\${neigh}\`;
      volMap.set(volKey, (volMap.get(volKey) || 0) + 1);
      neighCityMap.set(\`\${state}|\${neigh}\`, t.city || 'Juiz de Fora');

      if (t.unitValueSqm > 0) {
        const avgKey = \`\${state}|\${normCity}|\${neigh}|\${propType}\`;
        let avgEntry = avgSqmMap.get(avgKey);
        if (!avgEntry) {
          avgEntry = { sumSqm: 0, count: 0 };
          avgSqmMap.set(avgKey, avgEntry);
        }
        avgEntry.sumSqm += t.unitValueSqm;
        avgEntry.count += 1;
      }

      if (t.street) {
        const streetPhon = phoneticStreet(t.street);
        if (streetPhon) {
          const cityStreetKey = \`\${state}|\${normCity}|\${streetPhon}\`;
          let csEntry = cityStreetToNeighMap.get(cityStreetKey);
          if (!csEntry) {
            csEntry = { neighborhood: t.neighborhood, sumSqm: 0, count: 0, officialStreet: t.street };
            cityStreetToNeighMap.set(cityStreetKey, csEntry);
          }
          csEntry.count += 1;
          csEntry.sumSqm += t.unitValueSqm;

          const streetKey = \`\${state}|\${normCity}|\${neigh}|\${propType}|\${streetPhon}\`;
          let stEntry = streetAvgSqmMap.get(streetKey);
          if (!stEntry) {
            stEntry = { sumSqm: 0, count: 0 };
            streetAvgSqmMap.set(streetKey, stEntry);
          }
          stEntry.sumSqm += t.unitValueSqm;
          stEntry.count += 1;

          if (t.number) {
            const numClean = parseInt(String(t.number).replace(/\\D/g, ''), 10);
            if (!isNaN(numClean) && numClean > 0) {
              let numList = streetNumberNeighMap.get(cityStreetKey);
              if (!numList) {
                numList = [];
                streetNumberNeighMap.set(cityStreetKey, numList);
              }
              numList.push({ number: numClean, neighborhood: t.neighborhood, unitValueSqm: t.unitValueSqm, propType: t.propertyType });
            }
          }
        }
      }
      continue;
    }`;

if (norm.includes(normalize(targetJfSecondLoop))) {
  norm = norm.replace(normalize(targetJfSecondLoop), normalize(replJfSecondLoop));
} else {
  console.error('targetJfSecondLoop not found');
  process.exit(1);
}

// 4. Update recalculateAuctionWithIndex Juiz de Fora block
const targetJfRecalc = `        if (bidi.isAbsolutePricing || isJuizDeForaAuc) {
          isJfAbsolute = true;
          jfGabaritoTotal = weighted.value;
          jfFlipTotal = Math.round(weighted.value * 0.90);
          jfCompraEVendaCount = bidi.compraEVendaCount || 0;
          jfDateRange = bidi.dateRange;
          auc.itbiIsAbsolutePricing = true;
          auc.itbiAbsoluteAvgPrice = weighted.value;
          auc.itbiCompraEVendaCount = bidi.compraEVendaCount;
          auc.itbiPeriodRange = bidi.dateRange;
          auc.itbiStreetAvgSqm = undefined;
          auc.itbiUnitValueAvg = undefined;
          auc.itbiSurroundingAvgSqm = undefined;
          auc.itbiSurroundingCount = undefined;
          auc.streetRadiusDeviationPct = undefined;
          auc.streetRadiusCalibrated = false;
        } else {
          bidiSqm = Math.round(weighted.value * 0.90);
          bidiGabaritoSqm = weighted.value;
          auc.itbiSurroundingAvgSqm = bidi.radiusVerified ? (bidi.raio.saneada || undefined) : undefined;
          auc.itbiSurroundingCount = bidi.radiusVerified ? (bidi.raio.validas || undefined) : undefined;
          auc.itbiBuildingCount = bidi.predio.validas || undefined;
          auc.streetRadiusDeviationPct = bidi.radiusVerified ? (bidi.ruaRaioDesvioPct || undefined) : undefined;
          auc.streetRadiusCalibrated = bidi.radiusVerified && bidi.ruaRaioCalibrada;
        }`;

const replJfRecalc = `        if (isJuizDeForaAuc || bidi.isDerivedSqm) {
          bidiSqm = bidi.flipRapidoSqm;
          bidiGabaritoSqm = bidi.mediaCorteReal;
          auc.itbiStreetAvgSqm = bidi.rua.saneada || bidi.mediaCorteReal;
          auc.itbiUnitValueAvg = bidi.mediaCorteReal;
          auc.itbiSurroundingAvgSqm = bidi.raio.saneada || undefined;
          auc.itbiSurroundingCount = bidi.raio.validas || undefined;
          auc.itbiBuildingCount = bidi.predio.validas || undefined;
          auc.itbiStreetCount = bidi.rua.validas || undefined;
          auc.itbiIsDerivedSqm = true;
          auc.itbiIsAbsolutePricing = false;
          auc.itbiCompraEVendaCount = bidi.compraEVendaCount;
          auc.itbiPeriodRange = bidi.dateRange;
          auc.estimatedValue = bidi.gabaritoTotal;
          auc.vendaBaixaPrice = bidi.flipTotal;
          auc.vendaMediaPrice = bidi.flipTotal;
        } else {
          bidiSqm = Math.round(weighted.value * 0.90);
          bidiGabaritoSqm = weighted.value;
          auc.itbiSurroundingAvgSqm = bidi.radiusVerified ? (bidi.raio.saneada || undefined) : undefined;
          auc.itbiSurroundingCount = bidi.radiusVerified ? (bidi.raio.validas || undefined) : undefined;
          auc.itbiBuildingCount = bidi.predio.validas || undefined;
          auc.streetRadiusDeviationPct = bidi.radiusVerified ? (bidi.ruaRaioDesvioPct || undefined) : undefined;
          auc.streetRadiusCalibrated = bidi.radiusVerified && bidi.ruaRaioCalibrada;
        }`;

if (norm.includes(normalize(targetJfRecalc))) {
  norm = norm.replace(normalize(targetJfRecalc), normalize(replJfRecalc));
} else {
  console.error('targetJfRecalc not found');
  process.exit(1);
}

// 5. Update valuationBasis
const targetValBasis = `  if (isJfAbsolute && jfGabaritoTotal > 0) {
    auc.valuationBasis = hasVerifiedLocalMicroData
      ? \`Preço Médio ITBI (Compra e Venda) - \${valuationLevel} (\${valuationSampleCount} amostras)\`
      : \`Referência ITBI Juiz de Fora - \${valuationLevel}\${valuationSampleCount > 0 ? \` (\${valuationSampleCount} amostras)\` : ''}\`;
  } else if (hasMicroData) {`;

const replValBasis = `  if (isJuizDeForaAuc && bidi?.isDerivedSqm) {
    auc.valuationBasis = hasVerifiedLocalMicroData
      ? \`ITBI Homogeneizado NBR 14.653 - \${valuationLevel} (Ref. 60m²: R$ \${bidi.m2BaseRua?.toLocaleString('pt-BR') || '-'}/m², Escala: \${bidi.fatorEscala?.toFixed(3) || '1.000'})\`
      : \`ITBI Homogeneizado Juiz de Fora - \${valuationLevel} (\${valuationSampleCount} amostras Compra e Venda)\`;
  } else if (hasMicroData) {`;

if (norm.includes(normalize(targetValBasis))) {
  norm = norm.replace(normalize(targetValBasis), normalize(replValBasis));
} else {
  console.error('targetValBasis not found');
  process.exit(1);
}

if (content.includes('\r\n')) {
  fs.writeFileSync(filePath, norm.replace(/\n/g, '\r\n'), 'utf-8');
} else {
  fs.writeFileSync(filePath, norm, 'utf-8');
}

console.log('Successfully updated server.ts!');
