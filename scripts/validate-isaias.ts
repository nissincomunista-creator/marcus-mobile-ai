import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { enrichLotDetails } from '../auctioneerSyncService.ts';
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try {
  const draft=await enrichLotDetails(browser,{portalId:'isaias',auctioneerName:'Isaías Leilões',title:'Imóvel em Juiz de Fora',address:'',neighborhood:'Benfica',city:'Juiz de Fora',state:'MG',propertyType:'Casa',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:'https://www.isaiasleiloes.com.br/item/27791/detalhes',origin:'judicial'});
  fs.writeFileSync('isaias-validation.json',JSON.stringify([draft],null,2));
  console.log(JSON.stringify({date:draft.auctionDate,price:draft.auctionPrice,size:draft.sizeSqm,address:draft.address,verified:[draft.priceVerified,draft.addressVerified,draft.sizeVerified]}));
 }finally{await browser.close();}
})();
