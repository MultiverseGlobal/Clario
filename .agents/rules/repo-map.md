# Pseudonyms Ecosystem — Repository Map
# Each app has its own dedicated GitHub repo. NEVER commit cross-app to a single monorepo.

## App → Git Remote Mapping

| App | Local Path | GitHub Remote | Branch |
|---|---|---|---|
| **Clario** | `c:\Users\SUDO\Documents\Pseudonyms\` (root) | `https://github.com/MultiverseGlobal/Clario.git` | `main` |
| **Atlas** | `c:\Users\SUDO\Documents\Pseudonyms\Atlas io\` | `https://github.com/MultiverseGlobal/atlas-growth-compass-c374efb4.git` | `main` (remote name: `atlas`) |
| **Orion** | `c:\Users\SUDO\Documents\Pseudonyms\Orion\` | `https://github.com/MultiverseGlobal/William.git` | `master` |
| **Metaphor** | `c:\Users\SUDO\Documents\Pseudonyms\Metaphor\` | lives inside Clario root repo | `main` |
| **PseudonymsID** | `c:\Users\SUDO\Documents\Pseudonyms\PseudonymsID\` | lives inside Clario root repo | `main` |
| **packages/** | `c:\Users\SUDO\Documents\Pseudonyms\packages\` | lives inside Clario root repo | `main` |

## Push Commands Per App

### Clario (+ Metaphor + PseudonymsID + packages)
```bash
cd "c:\Users\SUDO\Documents\Pseudonyms"
git add -A && git commit -m "..." && git push
```

### Atlas
```bash
cd "c:\Users\SUDO\Documents\Pseudonyms\Atlas io"
git add -A && git commit -m "..." && git push atlas main
```

### Orion
```bash
cd "c:\Users\SUDO\Documents\Pseudonyms\Orion"
git add -A && git commit -m "..." && git push
```

## Key Rules
- The `Pseudonyms/` root IS the Clario repo. The git remote for root is MultiverseGlobal/Clario.
- Metaphor and PseudonymsID do NOT have separate git repos — they commit through the Clario root.
- Atlas has a separate `.git` inside `Atlas io/` with remote name `atlas` (not `origin`).
- Orion has a separate `.git` inside `Orion/` with remote name `origin`, branch `master`.
- BRAND.md and `packages/` commit through the Clario root repo.
