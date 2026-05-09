# Checklist soumission hackathon (tracks combinés)

Coche `[ ]` → `[x]` au fur et à mesure. Adapte selon les **tracks** que vous réclamez officiellement.

---

## Exigences communes (toutes pistes)

- [ ] **Nom du projet** + **description courte** (1–2 phrases) prêts pour le formulaire
- [ ] **Repo GitHub public** : racine = ce monorepo uniquement (pas de dossier home / fichiers perso) — voir [`docs/GITHUB_PUBLISH.md`](docs/GITHUB_PUBLISH.md)
- [ ] **README** : installation claire (prérequis, `npm install`, backend Python, variables d’environnement, `make`/docker si utilisé)
- [ ] **Aucun secret** dans le repo (`.env` non versionné ; clés uniquement dans `.env.example` sans valeurs)
- [ ] **Vidéo démo** : **&lt; 3 minutes**, parcours lisible (son OK, pas seulement capture floue)
- [ ] **Lien live demo** : URL publique qui charge (souvent API Render + front Vercel, voir README) ; tester dans un navigateur “vide” / autre machine
- [ ] **Lien vidéo** : YouTube non listé, Loom, Drive public, etc.

---

## Track Solana (programme on-chain)

- [ ] Programme **unique** Rust (Anchor / autre framework autorisé)
- [ ] **Déployé sur devnet** (ou mainnet si vous le déclarez) au moment de la soumission
- [ ] **Adresse du programme** (et si besoin IDL / vault) **écrite dans le README** — section visible “Contract / Program addresses”
- [ ] Démo vidéo / live : au moins une action **réelle** (init vault, update risk, deposit tracking, etc.) visible côté UI ou expliquée avec signature tx devnet

---

## Track LI.FI

- [ ] README : **idée produit** + **parcours utilisateur** (étapes cliquées / messages)
- [ ] README : **comment LI.FI est intégré** — ex. **REST API** `li.quest`, routes backend (`/api/...` bridge), clé optionnelle `LIFI_API_KEY`
- [ ] **Flux réel** montré en démo : **quote / route / bridge** (pas uniquement un texte statique dans le chat)
- [ ] **Solana au cœur du journey** : expliqué en README + visible en vidéo (ex. destination Solana, wallet, vault)
- [ ] Vérifier que la démo ne repose pas seulement sur des **réponses simulées** dans le front ; montrer l’appel API / backend si c’est là que LI.FI vit

---

## Track ElevenLabs

- [ ] **Adresses contrat** (devnet/mainnet) dans le README (même bloc que Solana si c’est le même programme)
- [ ] README : **idée** + **user flow** + **chemin d’intégration ElevenLabs** (ex. Conversational AI / WebSocket / agent ID / outils côté serveur — ce que vous utilisez vraiment)
- [ ] Vidéo + live : **voix** ou **agent** clairement démontré (&lt; 3 min au total avec le reste)
- [ ] *(Optionnel)* Soumission [showcase.elevenlabs.io](https://showcase.elevenlabs.io) pour le merch

---

## Track Solana Mobile (uniquement si vous postulez à cette piste)

Guide install, `.env`, dev et **build APK** : [`mobile/README.md`](mobile/README.md). Fichier **EAS** : `mobile/eas.json` (profil `preview` = APK).

- [ ] **APK Android** buildé et installable (test sur device réel)
- [ ] **Mobile Wallet Adapter** + usage **Solana Mobile** documenté (voir `mobile/README.md`)
- [ ] App **pensée mobile** (pas livrable principal = PWA / `expo web` seul)
- [ ] **Interaction Solana** réelle (solde, tx, vault, etc.) montrée sur mobile
- [ ] `eas.json` : remplacer le placeholder **`EXPO_PUBLIC_API_URL`** (`YOUR-BACKEND.example.com`) par l’URL HTTPS réelle du backend avant le build APK pour les juges
- [ ] **Adresses contrat** rappelées dans le README principal ; lien vers le monorepo dans `mobile/README.md`

---

## Qualité “jour J”

- [ ] Relecture README : liens cliquables (repo, démo, vidéo)
- [ ] Test complet **depuis clone frais** (ou `git clone` + README) sur une machine propre
- [ ] RPC devnet : préciser si besoin d’un endpoint (public vs clé) pour éviter rate-limit le jour du jugement
- [ ] Branch ou tag `submission` / date figeant le commit de rendu (optionnel mais pro)

---

## Bonus (Solana libs / SDK)

- [ ] README ou section “Tech” : lister **@solana/web3.js**, **Anchor / IDL**, **MWA** (mobile), etc., avec une phrase sur **l’usage** (pas seulement les noms)

---

_Dernière mise à jour : checklist interne NEURO X — à synchroniser avec le règlement officiel Dev3pack si des points diffèrent._
