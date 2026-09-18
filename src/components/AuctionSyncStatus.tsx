import React, {useEffect,useRef,useState} from 'react';
export default function AuctionSyncStatus({onUpdated}:{onUpdated:()=>Promise<void>}) {
 const [report,setReport]=useState<any>(null);const [error,setError]=useState('');
 const refresh=useRef(onUpdated);refresh.current=onUpdated;
 useEffect(()=>{
  let mounted=true;let lastCount=-1;
  const check=async()=>{try{const response=await fetch('/api/sync/status');if(!response.ok)throw Error('Não foi possível ler o andamento da sincronização.');const next=await response.json();if(!mounted)return;setReport(next);setError('');const count=(next?.sources||[]).reduce((sum:number,s:any)=>sum+s.imported+s.updated,0);if(lastCount>=0&&count!==lastCount)await refresh.current();lastCount=count;}catch(e:any){if(mounted)setError(e.message);}};
  void check();
  const timer=setInterval(check,15000);return()=>{mounted=false;clearInterval(timer);};
 },[]);
 if(error)return <div className="mb-4 rounded-lg border border-amber-500 p-3 text-sm">{error}</div>;
 if(!report)return null;
 const sources=report.sources||[];const completed=sources.filter((s:any)=>['completed','partial','failed'].includes(s.status)).length;
 const added=sources.reduce((n:number,s:any)=>n+s.imported,0),updated=sources.reduce((n:number,s:any)=>n+s.updated,0);
 const labels:Record<string,string>={running:'Sincronizando fontes',completed:'Coleta concluída',partial:'Coleta com pendências',failed:'Falha na coleta',interrupted:'Coleta interrompida',queued:'Na fila'};
 return <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-200 text-sm" aria-live="polite">
  <strong>{labels[report.status]||report.status}</strong> · {completed}/{sources.length} fontes · {added} novos · {updated} atualizados
  <p className="mt-1 text-slate-400">Rio de Janeiro, Niterói e Juiz de Fora. Atualização automática ao abrir o app.</p>
  <details className="mt-2"><summary className="cursor-pointer">Ver resultados por fonte</summary><ul className="mt-2 space-y-2">{sources.map((s:any)=><li key={s.id}><strong>{s.name}</strong>: {labels[s.status]||s.status} · {s.accepted} imóveis na região · {s.imported} novos · {s.pending} pendentes de dados{s.errors?.length>0&&<span className="block text-amber-300">{s.errors.length} falha(s): {s.errors[0].message}</span>}</li>)}</ul></details>
 </section>;
}
