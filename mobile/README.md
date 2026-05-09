# NEURO — app mobile

Application **React Native (Expo SDK 52)** avec **expo-router**, orientée **Solana Devnet** et **Mobile Wallet Adapter** (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`). Elle consomme le **backend FastAPI** du monorepo (bridge LI.FI, agent, vault) via `src/services/api.ts`.

Pour les exigences **Solana Mobile** (APK, MWA, dApp Store), suivre le règlement officiel du hackathon et les sections ci-dessous dans ce fichier.

---

## Prérequis

- Node.js (LTS recommandé)
- Dépendances installées : `npm install` dans ce dossier
- **Backend** lancé depuis `../backend` (ex. `uvicorn main:app --reload --host 0.0.0.0 --port 8000`) si vous testez chat, bridge ou endpoints vault
- **Wallet Solana mobile** compatible MWA (Phantom, Solflare, etc.) sur l’appareil ou l’émulateur

Pour un **APK** de soumission : Android Studio (SDK + build tools) et/ou [EAS Build](https://docs.expo.dev/build/introduction/) (compte Expo).

---

## Configuration environnement

1. Copier l’exemple :

   ```bash
   cp .env.example .env
   ```

2. Ajuster **`EXPO_PUBLIC_API_URL`** selon l’environnement :

   | Contexte | URL typique |
   |----------|-------------|
   | Android Emulator | `http://10.0.2.2:8000` |
   | iOS Simulator | `http://localhost:8000` |
   | Téléphone physique (même Wi‑Fi que le PC) | `http://<IP_LAN_DU_PC>:8000` |

3. Variables utiles (voir `.env.example`) :

   - `EXPO_PUBLIC_SOLANA_RPC` — RPC Devnet (par défaut endpoint public)
   - `EXPO_PUBLIC_PROGRAM_ID` — ID du programme Anchor (aligné sur le README racine)
   - `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` — si la voix côté mobile est branchée
   - `EXPO_PUBLIC_AGENT_WS_TOKEN` — doit correspondre au backend si le garde WebSocket est activé

Après modification de `.env`, redémarrer Expo avec cache vidé :

```bash
npx expo start -c
```

---

## Développement

```bash
npm run start          # Metro + QR (Expo Go ou dev client)
npm run android        # Ouvre sur Android
npm run ios            # Ouvre sur iOS (macOS + Xcode)
npm run lint
npm run typecheck
```

**Connexion wallet** : écran `connect` → flux `transact()` / `authorize` sur **cluster `devnet`** (`src/store/walletStore.ts`). Un wallet MWA doit être installé sur l’appareil.

**API** : toutes les URLs passent par `EXPO_PUBLIC_API_URL` — pas de `localhost` depuis un téléphone réel sans tunnel ni IP correcte.

---

## Build APK (soumission / test hors Expo Go)

Le fichier [`eas.json`](./eas.json) définit trois profils :

| Profil | Usage |
|--------|--------|
| `preview` | **APK** téléchargeable (internal) — idéal hackathon / QA |
| `development` | Dev client + APK (features natives hors Expo Go) |
| `production` | **AAB** Play Store / releases « store » |

### EAS Build (recommandé)

Depuis le dossier `mobile/` :

```bash
npx eas-cli login
npx eas-cli init          # une fois : lie le projet Expo et écrit projectId dans app.json
npm run build:android:preview
```

Équivalents : `npm run build:android:dev` / `npm run build:android:production`.

### Variables embarquées dans l’APK (`eas.json`)

Les profils **`preview`** et **`production`** incluent un bloc `env` d’exemple :

| Variable | Rôle |
|----------|------|
| `EXPO_PUBLIC_API_URL` | URL **HTTPS** de ton FastAPI déployé (remplace `https://YOUR-BACKEND.example.com` avant le build) |
| `EXPO_PUBLIC_SOLANA_RPC` | RPC devnet (défaut public ; tu peux mettre un endpoint QuickNode si besoin) |
| `EXPO_PUBLIC_PROGRAM_ID` | Programme Anchor NEURO (même ID que le README racine) |

Avant `npm run build:android:preview`, **édite `eas.json`** et mets la vraie base URL du backend (sans slash final superflu si ton client concatène déjà `/api/v1/...`).

Pour **ElevenLabs** ou **`EXPO_PUBLIC_AGENT_WS_TOKEN`**, ajoute les clés dans le même bloc `env` ou via [`eas env:create` / secrets](https://docs.expo.dev/build-reference/variables/) pour ne pas committer de clés. Les valeurs du `.env` local ne sont **pas** envoyées automatiquement sur les serveurs EAS.

### Prebuild + Android Studio (sans EAS)

```bash
npx expo prebuild --platform android
```

Ouvrir le dossier `android/` dans Android Studio et générer un APK/AAB signé localement.

### Soumission

Vérifier le **package** Android dans `app.json` (`com.neuro.app`) pour le **Solana dApp Store** ([publish.solanamobile.com](https://publish.solanamobile.com)).

**Soumission hackathon (piste Solana Mobile)** : APK installable, MWA testé sur device, interaction devnet réelle (vault / solde), listing [publish.solanamobile.com](https://publish.solanamobile.com) si exigé par le règlement.

---

## Structure utile

| Chemin | Rôle |
|--------|------|
| `app/` | Écrans expo-router (`index`, `connect`, `dashboard`, `vault`, `chat`, `voice`, …) |
| `src/store/chatStore.ts` | Chat : appelle `agentApi.chat` (LI.FI / yield / risk via backend), fallback démo si offline |
| `src/services/api.ts` | Client HTTP bridge / agent / vault vers le backend |
| `src/providers/WalletProvider.tsx` | Contexte wallet pour l’arbre React |
| `app.json` | `scheme`, bundle id Android/iOS |
| `eas.json` | Profils EAS (APK preview, AAB production) |

---

## Dépannage rapide

- **Network request failed** vers l’API : mauvaise `EXPO_PUBLIC_API_URL` (téléphone ≠ localhost) ou firewall PC.
- **CORS** : si le backend refuse le navigateur, ce n’est en principe pas le cas pour `fetch` natif React Native ; si tu passes par un tunnel web Expo, vérifier la config CORS du FastAPI.
- **Wallet ne s’ouvre pas** : confirmer l’installation du wallet et Devnet ; tester sur appareil physique si l’émulateur limite MWA.

---

## Alignement monorepo

- Programme Solana & adresses : [`../README.md`](../README.md)
- Backend & clés : `../backend/.env.example`
