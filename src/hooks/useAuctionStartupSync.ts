import { useEffect, useState } from 'react';

// One automatic collection per page opening, including React StrictMode remounts.
let openingRun: Promise<void> | undefined;
async function runOpeningSync() {
  const started = await fetch('/api/sync/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'app-open' }),
  });
  if (!started.ok) throw new Error(`HTTP ${started.status}`);
  let failures = 0;
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      const response = await fetch('/api/sync/status', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const state = await response.json();
      if (state.status !== 'running' && !state.stage && !state.availabilityRunning) return;
      failures = 0;
    } catch (error) { if (++failures >= 3) throw error; }
  }
}

/** Start one opening sync without replacing the catalog during the user's session. */
export function useAuctionStartupSync() {
  const [phase, setPhase] = useState<'running' | 'ready' | 'error'>('running');
  useEffect(() => {
    let mounted = true;
    openingRun ||= runOpeningSync();
    openingRun.then(() => { if (mounted) setPhase('ready'); }).catch(error => {
      console.error('Falha na sincronização de abertura', error);
      if (mounted) setPhase('error');
    });
    return () => { mounted = false; };
  }, []);
  return phase;
}
