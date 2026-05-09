# NEURO

### AI-Powered Cross-Chain Wealth Operating System on Solana

> *"Move 300 USDC from Base to Solana and optimize my yield with medium risk."*

NEURO is a voice-first AI agent that understands natural language DeFi commands, bridges assets across chains via LI.FI, deposits into risk-weighted Solana vaults, and optimizes yield — all through a premium conversational interface powered by ElevenLabs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      NEURO Architecture                      │
├──────────────┬──────────────┬───────────────┬───────────────┤
│  Mobile App  │   Web App    │   AI Agent    │  Smart Contract│
│  React Native│   React 18   │  ElevenLabs   │  Anchor/Rust  │
│  Expo Router │   Vite       │  WebSocket    │  PDA Vaults   │
├──────────────┴──────────────┴───────────────┴───────────────┤
│                     FastAPI Backend                           │
│  LI.FI Integration │ Agent Service │ QuickNode Streams       │
├────────────────────────────────────────────────────────────���─┤
│                     Solana Devnet                             │
│  Risk-Weighted Vaults │ PDA Accounts │ On-chain Events       │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Anchor, Rust, Solana 2.x |
| Backend | FastAPI, Python 3.12, Pydantic v2, uvicorn |
| Cross-Chain | LI.FI API (real integration) |
| AI / Voice | ElevenLabs Conversational AI, WebSocket |
| Monitoring | QuickNode Streams |
| Web Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Mobile | React Native, Expo Router, NativeWind, Reanimated |
| State | Zustand, React Query |
| Wallet | Solana Wallet Adapter (Web), Mobile Wallet Adapter (Mobile) |
| Infra | Docker, docker-compose, Makefile |

---

## Features

- **Voice-First AI Agent** — Speak naturally to execute DeFi operations
- **Cross-Chain Bridging** — Bridge from Ethereum, Base, Arbitrum, Polygon, BSC to Solana via LI.FI
- **Risk-Weighted Vaults** — PDA-based vaults with configurable risk tolerance (0-100)
- **Yield Optimization** — AI analyzes Jito, Kamino, Drift, MarginFi for best risk-adjusted APY
- **Portfolio Risk Analysis** — Stablecoin exposure, chain concentration, protocol diversification
- **Real-time Monitoring** — QuickNode Streams for instant deposit confirmation
- **Premium Mobile App** — Native iOS/Android with voice orb, chat, portfolio dashboard
- **Transaction Preview Cards** — Visual confirmation before signing

---

## Monorepo Structure

```
neuro/
├── src/              # React web frontend
├── backend/          # FastAPI backend
│   ├── routers/      # API routes (bridge, agent, vault, webhooks)
│   ├── services/     # Business logic (lifi, agent, quicknode, elevenlabs)
│   └── config.py     # Typed configuration
├── mobile/           # React Native mobile app
│   ├── app/          # Expo Router screens
│   └── src/          # Components, stores, hooks, services
├── contracts/        # Solana program (Anchor)
├── scripts/          # Deployment & setup scripts
├── docs/             # Documentation
├── docker-compose.yml
└── Makefile
```

---

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Rust & Anchor CLI
- Solana CLI
- Docker (optional)

### Quick Start

```bash
# 1. Clone and setup
chmod +x scripts/setup.sh
./scripts/setup.sh

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# 3. Start development
make web        # Web frontend on :5173
make backend    # API server on :8000
make mobile     # Expo dev server

# Or use Docker
make dev        # All services via docker-compose
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-----------|----------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `NEURO_PROGRAM_ID` | Deployed program address | Yes |
| `LIFI_API_KEY` | LI.FI API key | Optional |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | For voice |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID | For voice |
| `QUICKNODE_ENDPOINT` | QuickNode RPC endpoint | For streams |
| `QUICKNODE_STREAM_TOKEN` | QuickNode stream auth token | For streams |

---

## Deployment

### Solana Program (Devnet)

```
Program ID: E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT
Network:    Solana Devnet
Explorer:   https://explorer.solana.com/address/E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT?cluster=devnet
```

**Instructions:**
- `initialize_vault(risk_score: u8)` — Create PDA vault with risk tolerance
- `update_risk(new_score: u8)` — Update risk tolerance (owner-only)
- `deposit_tracking(amount: u64)` — Track deposits with events

---

## Demo Flow

1. User opens NEURO web/mobile app
2. Connects Solana wallet (Phantom/Backpack/Solflare)
3. Speaks: *"Move 300 USDC from Base to Solana and optimize my yield"*
4. AI agent detects intent: bridge + yield optimization
5. Backend fetches optimal LI.FI bridge route (Base → Solana)
6. Transaction preview card shown with route details, gas, ETA
7. User signs transaction in wallet
8. Funds bridge to Solana (~45s)
9. QuickNode Streams detects deposit arrival
10. AI deposits into Kamino USDC Vault (8.2% APY, Low risk)
11. Voice confirmation: *"300 USDC bridged and deposited into Kamino at 8.2% APY"*

---

## API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/bridge/quote` | Get cross-chain bridge quote |
| GET | `/api/v1/bridge/chains` | List supported chains |
| POST | `/api/v1/agent/chat` | Chat with AI agent |
| WS | `/api/v1/agent/ws/{session}` | Real-time AI WebSocket |
| GET | `/api/v1/vault/{pubkey}` | Get vault data |
| POST | `/api/v1/vault/initialize` | Prepare init vault TX |
| POST | `/api/v1/vault/deposit` | Prepare deposit TX |
| POST | `/api/v1/webhooks/quicknode/deposit` | QuickNode deposit webhook |

---

## Roadmap

- [x] Risk-Weighted Vault program (Anchor)
- [x] FastAPI backend with LI.FI integration
- [x] ElevenLabs conversational agent
- [x] QuickNode Streams monitoring
- [x] React web frontend with AI chat
- [x] React Native mobile app
- [x] Voice mode with animated orb
- [ ] Mainnet deployment
- [ ] Live ElevenLabs voice integration
- [ ] Real-time portfolio tracking via Helius
- [ ] Multi-vault strategies
- [ ] Social trading features
- [ ] iOS App Store / Google Play release

---

## License

MIT

---

*Built for Solana hackathon. Finalist-grade architecture and engineering.*
