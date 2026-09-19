import os

out_path = 'C:/Users/SUDO/.gemini/antigravity-ide/brain/37fc9596-8ea9-4fec-a5d9-ca0747ac3f01/scratch/frontend_source_for_ai.md'
files = [
    'frontend/src/app/page.tsx',
    'frontend/src/app/globals.css',
    'frontend/src/app/layout.tsx',
    'frontend/src/components/layout/FloatingNav.tsx'
]

with open(out_path, 'w', encoding='utf-8') as out:
    out.write('# Frontend Source Code for AI Review\n\n')
    for f in files:
        if os.path.exists(f):
            content = open(f, encoding='utf-8').read()
            out.write(f'\n## {f}\n```tsx\n{content}\n```\n')
        else:
            print(f"Warning: {f} not found.")

print(f"Exported to {out_path}")
