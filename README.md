# NEURO — AI Wealth Operating System

![NEURO Banner](src/assets/readme-banner.png)

**NEURO** is a voice-first AI wealth operating system built on Solana. It combines real-time conversational AI (ElevenLabs), on-chain PDA vaults (Anchor), and a premium dark-themed dashboard into a single DeFi command center.

---

## Features

### Voice-First AI Interface

NEURO's core interaction model is voice. Users speak natural language DeFi commands and NEURO responds with real-time voice streaming powered by ElevenLabs Conversational AI.

- **Real WebSocket streaming** — Full-duplex audio via ElevenLabs Conversational AI WebSocket API
- **Browser microphone capture** — PCM16 encoding via ScriptProcessor with echo cancellation and noise suppression
- **Live audio playback** — Web Audio API playback queue with analyser-driven volume visualization
- **Waveform visualizer** — 48-bar frequency display driven by real audio volume data
- **Live transcripts** — Real-time user + agent transcript stream with timestamps
- **Client tool calls** — Agent can invoke client-side tools (yield analysis, bridge routes, risk scoring)
- **Inline + fullscreen modes** — Voice available in the chat panel or as an immersive fullscreen page at `/voice`

**Example commands:**
> "Move 300 USDC from Base to Solana and optimize my yield"
> "What's my portfolio risk score?"
> "Find the best stablecoin yield under 10% risk"

### On-Chain PDA Vaults (Solana)

Each user gets a Program Derived Address (PDA) vault on Solana Devnet. The vault stores risk preferences and deposit tracking entirely on-chain.

| Instruction | Description |
|---|---|
| `initialize_vault` | Creates a PDA vault with initial risk score (0-100) |
| `update_risk` | Updates the on-chain risk tolerance score |
| `deposit_tracking` | Records deposit amounts in the vault ledger |

- **Program ID:** `E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT`
- **Framework:** Anchor 0.30
- **Network:** Solana Devnet
- **PDA Seeds:** `[user_pubkey, "vault"]`

### Portfolio Dashboard

Real-time portfolio overview pulling live data from the Solana blockchain:

- **SOL Balance** — Live wallet balance from Devnet RPC
- **Vault Deposited** — Total tracked deposits read from PDA account data
- **Risk Score** — On-chain risk tolerance from vault PDA
- **Active Positions** — DeFi protocol allocations across Kamino, Drift, MarginFi, Jito
- **Chain Allocation** — Cross-chain exposure breakdown with animated progress bars

### Text Chat with Intent Detection

Standard text chat with simulated intent detection for three DeFi verticals:

| Intent | Trigger Words | Response |
|---|---|---|
| Bridge | "bridge", "move", "transfer", "send" | Optimal route via LI.FI with gas estimate |
| Yield | "yield", "apy", "optimize", "earn" | Risk-adjusted protocol recommendations |
| Risk | "risk", "portfolio", "analyze", "score" | Full portfolio risk breakdown |

Each response includes an actionable card with structured data and (for bridges) a transaction execution button.

---

## Architecture

```
src/
├── components/
│   ├── Header.tsx              # Top nav with wallet button
│   ├── HeroSection.tsx         # Landing page hero with voice orb
│   ├── ChatInterface.tsx       # Unified text + voice chat panel
│   ├── VoiceOrb.tsx            # Animated orb (idle/listening/speaking/processing)
│   ├── VoiceSessionPanel.tsx   # Inline voice mode with waveform + transcripts
│   ├── VoiceConfigModal.tsx    # ElevenLabs Agent ID configuration
│   ├── VaultAnalytics.tsx      # On-chain vault management (init/deposit/risk)
│   ├── PortfolioDashboard.tsx  # Live portfolio stats from chain
│   └── ui/                     # shadcn/radix primitives
├── hooks/
│   ├── useElevenLabsVoice.ts   # ElevenLabs WebSocket streaming hook
│   └── useNeuroVault.ts        # Anchor provider + vault SDK hook
├── lib/
│   ├── neuroVault.ts           # Production SDK (PDA derivation, instructions, fetching)
│   ├── configAddress.ts        # Program ID export
│   └── utils.ts                # Tailwind merge utility
├── idl/
│   └── neuroVaultIDL.json      # Anchor IDL for neuro_vault program
├── pages/
│   ├── Index.tsx               # Landing page
│   ├── Dashboard.tsx           # Main dashboard with tabs
│   ├── Voice.tsx               # Fullscreen immersive voice mode
│   └── NotFound.tsx            # 404 page
├── App.tsx                     # Route definitions
├── main.tsx                    # Entry point with providers
└── index.css                   # Design system tokens + animations
```

### Data Flow

```
┌──────────────┐     WebSocket (PCM16)     ┌────────────────────┐
│   Browser     │ ◄──────────────────────► │  ElevenLabs Conv.  │
│   Microphone  │    audio + transcripts    │  AI WebSocket API  │
└──────┬───────┘                           └────────────────────┘
       │
       ▼
┌──────────────┐     Anchor RPC (confirmed)  ┌──────────────────┐
│  React App   │ ◄──────────────────────────►│  Solana Devnet    │
│  (Vite + TS) │   initialize / update /     │  neuro_vault      │
└──────────────┘   deposit_tracking          │  PDA Accounts     │
                                             └──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Blockchain | Solana, Anchor 0.30, @solana/web3.js |
| Wallet | Solana Wallet Adapter (Phantom, Solflare, etc.) |
| Voice AI | ElevenLabs Conversational AI (WebSocket) |
| Audio | Web Audio API, ScriptProcessor, AnalyserNode |
| State | React hooks, localStorage for config persistence |

---

## Démo en ligne (hackathon)

Déploiement recommandé : **API sur [Render](https://render.com)** + **front sur [Vercel](https://vercel.com)**. Repo public : **[Thedy09/Neuro](https://github.com/Thedy09/Neuro)** (racine = monorepo : `package.json` à la racine, API dans `backend/`).

### 1. API (Render)

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service** → connecter GitHub **`Thedy09/Neuro`**, branche **`main`**.
2. **Root Directory** : `backend` (important : pas `NEURO X/backend`).
3. **Runtime** : **Docker** (fichier `backend/Dockerfile`). Render injecte **`PORT`** ; l’image l’utilise déjà.
4. **Health check path** : `/health`.
5. **Environment** → ajouter les variables (voir `backend/.env.example`, **sans** commiter ton `.env` local) :
   - **`ELEVENLABS_API_KEY`**, **`ELEVENLABS_AGENT_ID`**
   - **`CORS_ORIGINS`** : JSON sur une ligne, ex. au départ `["http://localhost:5173"]` — tu ajouteras l’URL Vercel à l’étape 3.
   - **`SOLANA_RPC_URL`**, **`LIFI_API_KEY`** (optionnel mais utile), etc.
6. **Create Web Service**. Quand c’est vert, copier l’URL HTTPS, ex. `https://neuro-api-xxxx.onrender.com` (**sans** slash final). C’est la base pour **`VITE_API_URL`**.

*Plan gratuit* : “cold start” possible ; ouvre l’URL ~1 min avant une démo live. Fichier optionnel **`render.yaml`** à la racine pour un **Blueprint** Render.

### 2. Front (Vercel)

1. [Vercel](https://vercel.com) → **Add New…** → **Project** → importer **`Thedy09/Neuro`**.
2. **Root Directory** : laisser **vide** (racine du repo, là où est `package.json`).
3. **Environment Variables** (Build) : **`VITE_API_URL`** = l’URL HTTPS Render de l’étape 1 (ex. `https://neuro-api-xxxx.onrender.com`).
4. **Deploy**. Noter l’URL du site, ex. `https://neuro-xxx.vercel.app`.

### 3. CORS final

Sur Render → service API → **Environment** : mets à jour **`CORS_ORIGINS`** pour inclure **exactement** l’origine Vercel (schéma + host, sans chemin), ex.  
`["https://neuro-xxx.vercel.app","http://localhost:5173"]`  
Puis **Manual Deploy** → **Clear build cache & deploy** si le service ne redémarre pas tout seul.

### 4. Vérifier

- `https://<ton-api>.onrender.com/health` → `{"status":"ok",...}`
- Site Vercel : chat agent, LI.FI, voix (URL signée via backend) selon tes clés.

**Docker prod tout-en-un (VPS)** : `Dockerfile.web.prod`, `docker-compose.prod.yml` (variable **`NEURO_API_PUBLIC`** au build du front).

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom recommended)
- Devnet SOL for transactions ([faucet](https://faucet.solana.com))
- ElevenLabs account with a Conversational AI agent ([create one](https://elevenlabs.io/conversational-ai))

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

**Wallet:** Connect any Solana wallet via the top-right button. Switch to Devnet in your wallet settings.

**Voice:** Click the microphone button in the chat or navigate to `/voice`. On first use, you'll be prompted to enter your ElevenLabs Agent ID. This is stored in `localStorage` and persists across sessions.

**Vault:** Navigate to Dashboard > Vault tab. If no vault exists, you'll see the initialization form. Set your risk tolerance (0-100) and sign the transaction to create your PDA vault on-chain.

---

## On-Chain Interaction

### Initialize Vault

```typescript
import { NeuroVaultSDK } from '@/lib/neuroVault';

const sdk = new NeuroVaultSDK(anchorProvider);
const result = await sdk.initializeVault({ riskScore: 34 });
// result.data.signature — transaction hash
// result.data.vaultAddress — PDA address
```

### Update Risk Score

```typescript
const result = await sdk.updateRisk({ newScore: 65 });
```

### Track Deposit

```typescript
const result = await sdk.depositTracking({ amount: 1_000_000_000 }); // 1 SOL in lamports
```

### Fetch Vault Data

```typescript
const result = await sdk.fetchVault(userPublicKey);
// result.data.riskToleranceScore — 0-100
// result.data.totalDeposited — BN (lamports)
// result.data.owner — PublicKey
// result.data.bump — PDA bump seed
```

---

## Voice Integration

### Hook Usage

```typescript
import { useElevenLabsVoice } from '@/hooks/useElevenLabsVoice';

const voice = useElevenLabsVoice({
  agentId: 'your-agent-id',
  onTranscript: (t) => console.log(t.role, t.text),
  onToolCall: async (tool) => {
    // Handle agent tool calls
    return JSON.stringify({ result: 'data' });
  },
});

// Start voice session
await voice.start();

// voice.state — 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'
// voice.volume — 0-1 (for waveform visualization)
// voice.transcripts — VoiceTranscript[]

// End session
voice.stop();
```

### Supported Tool Calls

The ElevenLabs agent can invoke these client-side tools during conversation:

| Tool | Description |
|---|---|
| `get_yield_analysis` | Returns current DeFi yield opportunities |
| `execute_cross_chain_move` | Finds optimal bridge route |
| `get_portfolio_risk` | Returns portfolio risk assessment |

---

## Design System

The app uses a centralized design system defined in `index.css` and `tailwind.config.ts`:

- **Theme:** Dark-first with cyan (`hsl(187, 90%, 51%)`) as the primary accent
- **Typography:** Mono for data, sans-serif for UI
- **Animations:** Custom keyframes for orb glow, waveform bars, voice pulse, shimmer, and breathing effects
- **Tokens:** All colors, gradients, shadows, and transitions defined as CSS custom properties — no inline color values

---

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | Index | Landing page with hero, features, architecture |
| `/dashboard` | Dashboard | Tabbed dashboard (Chat, Portfolio, Vault, History) |
| `/voice` | Voice | Fullscreen immersive voice mode |

---

## Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

---

## License

MIT

---

<p align="center">
  <sub>Built with React, Solana, ElevenLabs, and Framer Motion</sub>
</p>
