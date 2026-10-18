import { useEffect, useState } from 'react';

// Checagem rápida de sincronização sem bloquear o carregamento do app nem travar o status em loop infinito
export function useAuctionStartupSync() {
  const [phase, setPhase] = useState<'running' | 'ready' | 'error'>('ready');

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);

    // Consulta rápida apenas para verificar se há algum processo pendente no servidor
    fetch('/api/sync/status', { signal: ctrl.signal })
      .then(res => res.ok ? res.json() : null)
      .then(state => {
        if (!mounted) return;
        if (state && (state.status === 'running' || state.stage || state.availabilityRunning)) {
          setPhase('running');
        } else {
          setPhase('ready');
        }
      })
      .catch(() => {
        if (mounted) setPhase('ready');
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, []);

  return phase;
}
