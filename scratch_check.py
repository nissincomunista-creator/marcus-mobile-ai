with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for idx, line in enumerate(lines):
    if '_cache.json' in line or 'write' in line or 'save' in line:
        if 'json' in line.lower() or 'cache' in line.lower():
            print(f"Line {idx+1}: {line.strip()}")
