# Publier NEURO X sur GitHub (sans fuite de secrets)

## Avant le premier `git push`

1. **Dépôt Git à la racine du projet**  
   Ouvre un terminal **dans le dossier `NEURO X/`** (pas dans ton `$HOME`). Si ce dossier n’a pas encore son propre dépôt :
   ```bash
   cd "/chemin/vers/NEURO X"
   git init
   git branch -M main
   ```
   Évite d’initialiser Git dans ton répertoire personnel : tu risquerais d’indexer des centaines de fichiers hors projet.

2. **Vérifier qu’aucun secret n’est tracké**
   ```bash
   git grep -n "sk_" -- "*.example" "*.md" "*.ts" "*.tsx" "*.py" || true
   git grep -n "ELEVENLABS_API_KEY=" -- . || true
   ```
   Les `.env` et `.env.*` (sauf `*.example` appropriés) doivent être **ignorés** par `.gitignore`.

3. **Fichiers qui doivent rester vides d’exemple**  
   - `backend/.env.example` : jamais de vraie clé ElevenLabs, LI.FI, QuickNode, etc.  
   - Racine `.env.example` / `mobile/.env.example` : idem.

4. **Clés déjà exposées**  
   Si une clé a été committée ou collée dans un fichier versionné : **révoque-la** sur le fournisseur (ElevenLabs, QuickNode, …) et régénère.

5. **Avant d’ajouter les fichiers**
   ```bash
   git status
   ```
   Vérifie qu’il n’y a **pas** de `node_modules/`, `dist/`, `.env`, `backend/.env`, `mobile/.env`, `contracts/target/`, etc.

6. **Premier commit**
   ```bash
   git add .
   git status   # re-vérifie une dernière fois
   git commit -m "Initial commit: NEURO X"
   ```
   Puis ajoute le remote GitHub et `git push`.

## Variables : où les mettre (jamais dans Git)

| Fichier | Rôle |
|---------|------|
| `backend/.env` | Clés serveur (copie de `.env.example`) — **non versionné** |
| `.env` (racine) | `VITE_*` pour le front — **non versionné** |
| `mobile/.env` | `EXPO_PUBLIC_*` — **non versionné** |
| `eas.json` (mobile) | OK pour des URLs placeholder ; secrets via EAS ou profil `env` |

## Après publication

- Garde le README avec les **adresses programme devnet** (ce sont des infos publiques).
- Lien **live demo** + repo : pas de clés dans l’URL ni dans les issues publiques.
