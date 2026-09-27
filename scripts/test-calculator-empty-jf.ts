import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import RealValueCalculator from '../src/components/RealValueCalculator.tsx';

const markup = renderToString(React.createElement(RealValueCalculator, {
  itbiStats: [],
  prefillData: {
    state: 'MG',
    city: 'Juiz de Fora',
    neighborhood: 'São Mateus',
    address: 'Rua Guaçuí, 35, apartamento 404',
    sizeSqm: 147,
    propertyType: 'Apartamento'
  } as any
}));

assert.match(markup, /Juiz de Fora/);
assert.match(markup, /Sem transa|Sem dados suficientes/i);
assert.doesNotMatch(markup, /NaN|undefined\/m²/);
console.log('Juiz de Fora calculator renders safely without local ITBI samples.');
