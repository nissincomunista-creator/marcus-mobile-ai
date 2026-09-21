import { useEffect, useRef } from 'react';

/** One request on app mount; the server joins an already-running collection. */
export function useAuctionStartupSync(onUpdated: () => Promise<void>) {
  const refresh = useRef(onUpdated);
  refresh.current = onUpdated;
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastVersion = '';
    const check = async () => {
      try {
        const response = await fetch('/api/sync/status');
        if (!response.ok) throw new Error(`Sincronização: HTTP ${response.status}`);
        const report = await response.json();
        const count = (report?.sources || []).reduce((n: number, s: {imported:number;updated:number}) => n + s.imported + s.updated, 0);
        const version = `${report?.id || ''}:${count}`;
        if (!disposed && version !== lastVersion && count > 0) await refresh.current();
        lastVersion = version;
      } catch (error) { console.error('Não foi possível conferir a sincronização', error); }
      finally { if (!disposed) timer = setTimeout(check, 15000); }
    };
    void fetch('/api/sync/start', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'app-open'})})
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); })
      .catch(error => console.error('Não foi possível iniciar a sincronização', error));
    void check();
    return () => { disposed = true; if (timer) clearTimeout(timer); };
  }, []);
}
