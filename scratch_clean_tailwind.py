import os

replacements = {
    'text-indigo-650': 'text-indigo-600',
    'text-slate-850': 'text-slate-800',
    'border-indigo-150': 'border-indigo-200',
    'bg-amber-450': 'bg-amber-500',
    'bg-blue-750': 'bg-blue-700',
    'border-gray-150': 'border-gray-200',
    'text-gray-550': 'text-gray-500',
    'text-slate-550': 'text-slate-500',
    'bg-slate-105': 'bg-slate-100',
    'bg-indigo-650': 'bg-indigo-600',
    'text-red-650': 'text-red-600',
    'text-gray-450': 'text-gray-400',
    'bg-slate-150': 'bg-slate-100',
    'ring-indigo-550': 'ring-indigo-500',
    'border-gray-350': 'border-gray-300',
    'text-indigo-750': 'text-indigo-700',
    'text-slate-450': 'text-slate-400',
    'text-slate-655': 'text-slate-600',
    'text-slate-650': 'text-slate-600',
    'border-slate-305': 'border-slate-300',
    'text-slate-455': 'text-slate-400',
    'text-amber-850': 'text-amber-800',
    'text-amber-805': 'text-amber-800',
    'border-rose-150': 'border-rose-200',
    'border-slate-350': 'border-slate-300',
    'text-slate-905': 'text-slate-900',
}

src_dir = 'src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            modified = False
            for orig, rep in replacements.items():
                if orig in content:
                    content = content.replace(orig, rep)
                    modified = True
            
            if modified:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed invalid classes in: {path}")

print("Tailwind clean completed.")
