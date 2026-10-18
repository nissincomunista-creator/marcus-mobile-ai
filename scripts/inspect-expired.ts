import fs from 'node:fs';
import {isExpiredAuction} from '../auctionPipeline/lifecycle.ts';
const store=JSON.parse(fs.readFileSync('data_store.json','utf8'));
const expired=store.auctions.filter((a:any)=>isExpiredAuction(a)&&!['closed','removed'].includes(a.availability?.state)&&!a.sourceClosed&&!a.sourceRecords?.length);
console.log(JSON.stringify(expired.slice(0,3).map((a:any)=>({id:a.id,url:a.auctionLink,first:a.firstAuctionDate,second:a.secondAuctionDate,date:a.auctionDate,origin:a.origin,status:a.ingestionStatus}))));
