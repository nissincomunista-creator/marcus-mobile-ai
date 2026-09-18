import assert from 'node:assert/strict';
import { collectListingPages } from '../auctioneerSyncService.ts';
class FakePage {
 index=0;
 constructor(public mode:'link'|'button'|'failure'){}
 url(){return 'https://fixture.invalid/list'+(this.mode==='button'?'':'?page='+this.index);}
 async evaluate(fn:any){
  if(fn.toString().includes("querySelectorAll('button")){if(this.mode==='button'&&this.index<2){this.index++;return true;}return false;}
  return {next:this.mode!=='button'&&this.index<2?'https://fixture.invalid/list?page='+(this.index+1):'',children:[]};
 }
 async goto(){if(this.mode==='failure')throw Error('fixture timeout');this.index++;}
 async waitForNetworkIdle(){}
}
for(const mode of ['link','button','failure'] as const){const page=new FakePage(mode);const rows=await collectListingPages(page,async()=>Array.from({length:160},(_,i)=>({link:`https://fixture.invalid/item/${page.index*160+i}`})));assert.equal(rows.length,mode==='failure'?160:480);}
console.log('PASS: 480 lots with link pagination and load-more; partial results retained after navigation failure.');
