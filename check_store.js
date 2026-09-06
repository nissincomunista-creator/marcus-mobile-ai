import fs from 'fs';

const storePath = 'data_store.json';
if (fs.existsSync(storePath)) {
  const content = fs.readFileSync(storePath, 'utf-8');
  try {
    const data = JSON.parse(content);
    console.log('--- DATA STORE STATS ---');
    console.log('Auctions count:', data.auctions ? data.auctions.length : 0);
    console.log('ITBI Transactions count:', data.itbiTransactions ? data.itbiTransactions.length : 0);
    if (data.itbiTransactions && data.itbiTransactions.length > 0) {
      console.log('Sample ITBI transaction:', data.itbiTransactions[0]);
    }
  } catch (e) {
    console.error('Failed to parse json:', e.message);
  }
} else {
  console.log('Store path does not exist');
}
