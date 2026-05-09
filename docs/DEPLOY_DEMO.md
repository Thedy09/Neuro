# Déploiement démo NEURO X (lien live hackathon)

Objectif : une **URL front** (HTTPS) + une **URL API** (HTTPS). Le navigateur appelle l’API en **CORS** : l’origine du site doit être listée dans `CORS_ORIGINS` côté backend, et le build front doit connaître l’URL de l’API via **`VITE_API_URL`**.

## Rappels

1. Déployer **l’API en premier**, noter son URL publique (ex. `https://neuro-api.onrender.com`, **sans** slash final).
2. Dans `backend/.env` (ou variables du PaaS) :  
   `CORS_ORIGINS=["https://ton-front.vercel.app","http://localhost:5173"]`  
   (JSON sur une ligne ; inclure **exactement** l’origine du site démo, schéma + host, sans chemin.)
3. Build du front avec **`VITE_API_URL=https://neuro-api.onrender.com`** (même valeur que l’URL publique de l’API).

---

## Option A — Render (API) + Vercel (front)

### API — Render (Web Service)

1. Repo GitHub → **New Web Service** → branche principale.
2. **Root Directory** : `NEURO X/backend` (ou racine monorepo + commande adaptée).
3. **Runtime** : **Docker** *(recommandé)* : `Dockerfile` déjà prêt ; Render envoie **`PORT`** (pris en charge par l’image).
   - Alternative **Python** : Build `pip install -r requirements.txt` ; Start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. **Environment** : coller les clés depuis `backend/.env.example` (ElevenLabs, `LIFI_API_KEY` si besoin, RPC, etc.).
5. **Important** : `CORS_ORIGINS` doit contenir l’URL Vercel finale (tu pourras la mettre à jour après la première deploy du front).
6. Vérifier : `https://<service>.onrender.com/health` → `{"status":"ok",...}`.

*Cold start* : gratuit mais lent au réveil ; pour une démo live, ouvrir l’URL une minute avant.

### Front — Vercel

1. **New Project** → importer le même repo.
2. **Root Directory** : dossier du front Vite (ex. `NEURO X` si la racine repo est le monorepo avec `package.json` au bon endroit).
3. **Framework Preset** : *Other* ou *Vite* selon le wizard.
4. **Environment Variables** (build) :  
   `VITE_API_URL` = `https://<ton-service-render>.onrender.com` (URL API HTTPS).
5. Déployer. Ouvrir le site : chat / bridge doivent joindre l’API (les secrets ElevenLabs restent côté backend ; la voix signée passe par l’API).

`vercel.json` à la racine du projet Vite configure le **SPA** (réécriture vers `index.html`).

---

## Option B — Un seul VPS (Docker)

Fichiers : `docker-compose.prod.yml` + `Dockerfile.web.prod`.

```bash
cd "NEURO X"
export NEURO_API_PUBLIC=https://api.tondomaine.com   # URL publique du backend
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

- Le conteneur **web** écoute en **8080** → à mettre derrière un reverse-proxy (Caddy / Nginx) en HTTPS si besoin.
- `backend/.env` : `CORS_ORIGINS` doit inclure `https://app.tondomaine.com`.

Pour un essai **local** uniquement :

```bash
export NEURO_API_PUBLIC=http://localhost:8000
docker compose -f docker-compose.prod.yml up --build
```

Puis ouvrir **http://localhost:8080** (front) ; l’API reste sur **http://localhost:8000**.

---

## Option C — API seulement (démo minimale)

Si tu n’as que l’API en ligne : documenter dans le README un lien **Swagger** `https://…/docs` + démo en local pour le front ; pour le hackathon, l’exigence « live demo » est mieux couverte avec **front + API** accessibles.

---

## Après déploiement

- Tester **connexion wallet** + **devnet** depuis l’URL HTTPS (certains wallets sont sensibles au domaine).
- **LI.FI** : l’hébergeur doit pouvoir joindre `li.quest` (pare-feu / DNS).
- Mettre les **deux URLs** dans le README et [`HACKATHON_CHECKLIST.md`](../HACKATHON_CHECKLIST.md).
