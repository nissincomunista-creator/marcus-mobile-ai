import { useEffect } from 'react';

// One automatic collection per page opening, including React StrictMode remounts.
let requestedOnThisOpening = false;

/** Start one opening sync without replacing the catalog during the user's session. */
export function useAuctionStartupSync() {
  useEffect(() => {
    if (requestedOnThisOpening) return;
    requestedOnThisOpening = true;

    void fetch('/api/sync/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'app-open' })
      }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }).catch(error => console.error('Não foi possível iniciar a sincronização de abertura', error));
  }, []);
}
