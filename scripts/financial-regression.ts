import { calculateFlip, auctionCosts } from '../src/utils/flipCalculation.ts';
import assert from 'node:assert/strict';
const p={auctionPrice:100000,auctioneerFee:5000,itbiCost:3000,notaryCost:2000,certificatesCost:650,lawyerFee:6000,estimatedRepair:5000,pendingIptuCost:0,pendingCondoCost:0};
const server=auctionCosts(p),calculator=auctionCosts({...p,purchasePrice:p.auctionPrice});
assert.deepEqual(server,calculator);
const total=Object.values(server).reduce((a,b)=>a+b,0);
assert.deepEqual(calculateFlip(160000,total),calculateFlip(160000,total,0));
assert.equal(calculateFlip(90000,100000).tax,0);
console.log('PASS: card/calculator cost inputs and flip math');
