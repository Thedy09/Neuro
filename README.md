# NEURO — AI Wealth Operating System

![NEURO Banner](src/assets/readme-banner.png)

**NEURO** is a voice-first AI wealth operating system built on Solana. It combines real-time conversational AI (ElevenLabs), on-chain PDA vaults (Anchor), and a premium dark-themed dashboard into a single DeFi command center.

---

## Live demo (hackathon submission)

| Resource | URL |
|---|---|
| Repository | https://github.com/Thedy09/Neuro |
| Backend API (FastAPI) | https://neuro-bii5.onrender.com — health: `/health`, docs: `/docs` |
| Solana program (devnet) | [`E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT`](https://explorer.solana.com/address/E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT?cluster=devnet) |
| Deploy signature (devnet) | [`29MSiLerLicTio2NTFT9srHo2HDv1YLCM9UGAMMJNNnjKm156TMJbRjXPTQCwACjsD7XTEeL2k28GBm4qKTTVH1E`](https://explorer.solana.com/tx/29MSiLerLicTio2NTFT9srHo2HDv1YLCM9UGAMMJNNnjKm156TMJbRjXPTQCwACjsD7XTEeL2k28GBm4qKTTVH1E?cluster=devnet) |
| Frontend deploy | Vercel — set `VITE_API_URL=https://neuro-bii5.onrender.com` (see [Démo en ligne](#démo-en-ligne-hackathon)) |

> Free Render plan can cold-start (~30 s on first request). Hit `/health` once before opening the front for the judges.

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

Repo : **[Thedy09/Neuro](https://github.com/Thedy09/Neuro)**.

### Front sur [Vercel](https://vercel.com) — **API ailleurs** (ex. [Render](https://render.com))

Le **`vercel.json`** ne déclare que le service **frontend** (Vite). L’API n’est **pas** buildée sur Vercel.

1. **New Project** → **`Thedy09/Neuro`**, branche **`main`**.
2. **Preset** : **Services** si proposé, ou framework **Vite**. **Root Directory** : vide. Clique **Refresh** si Vercel demandait un `vercel.json`.
3. **Environment (Build)** : **`VITE_API_URL`** = URL **HTTPS de ton API** (**sans** `/` final), ex. `https://neuro-bii5.onrender.com`.
4. **Deploy**. Ouvre ton `.vercel.app`, teste chat / voix (l’API doit avoir les bonnes variables et CORS).

**CORS** (sur l’hébergeur API) : inclure l’origine Vercel exacte + le dev local, ex.  
`["https://ton-site.vercel.app","http://localhost:5173","http://localhost:5174"]`  
(voir `backend/.env.example`.)

### API sur Render (rappel)

Web Service Docker, root vide, **`backend/Dockerfile`**, health **`/health`**, variables depuis **`backend/.env.example`**.

---

**Docker prod tout-en-un (VPS)** : `Dockerfile.web.prod`, `docker-compose.prod.yml`.

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
