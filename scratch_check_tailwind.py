import os
import re

src_dir = 'src'
pattern = re.compile(r'\b(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+)\b')

valid_suffixes = {'50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'}

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, encoding='utf-8', errors='ignore') as f:
                content = f.read()
            matches = pattern.findall(content)
            for prefix, color, suffix in matches:
                if suffix not in valid_suffixes:
                    print(f"File: {path} | Class: {prefix}-{color}-{suffix}")
