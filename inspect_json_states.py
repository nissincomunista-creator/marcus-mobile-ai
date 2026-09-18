import json

json_path = r"C:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\app-marcus-main\app-marcus-main\data_store.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

json_txs = data.get("itbiTransactions", [])
states = {}
cities = {}
for tx in json_txs:
    st = tx.get("state", "None")
    ct = tx.get("city", "None")
    states[st] = states.get(st, 0) + 1
    cities[ct] = cities.get(ct, 0) + 1

print("--- STATES ---")
for k, v in states.items():
    print(f"  {k}: {v}")

print("--- CITIES ---")
for k, v in cities.items():
    print(f"  {k}: {v}")
