#!/usr/bin/env bash
set -euo pipefail

# ─── NEURO Project Setup ────────────────────────────────────────────────────

echo "╔══════════════════════════════════════╗"
echo "║     NEURO — Project Setup            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Backend setup
echo "[1/4] Setting up backend..."
cp backend/.env.example backend/.env
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
echo "  ✓ Backend ready"

# Web frontend setup
echo "[2/4] Setting up web frontend..."
npm install
echo "  ✓ Web frontend ready"

# Mobile setup
echo "[3/4] Setting up mobile app..."
cd mobile
npm install
cd ..
echo "  ✓ Mobile app ready"

# Final
echo "[4/4] Configuration..."
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                 ║"
echo "║                                                  ║"
echo "║  Next steps:                                     ║"
echo "║  1. Edit backend/.env with your API keys         ║"
echo "║  2. Run: make dev  (Docker) or make web          ║"
echo "║  3. Run: make backend  (FastAPI server)          ║"
echo "║  4. Run: make mobile  (Expo dev server)          ║"
echo "║                                                  ║"
echo "║  Program: E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGz  ║"
echo "║  Network: Solana Devnet                          ║"
echo "╚══════════════════════════════════════════════════╝"
