#!/usr/bin/env bash
set -euo pipefail

# ─── NEURO Devnet Deployment Script ──────────────────────────────────────────

echo "╔══════════════════════════════════════╗"
echo "║     NEURO — Devnet Deployment        ║"
echo "╚══════════════════════════════════════╝"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check prerequisites
echo -e "${CYAN}Checking prerequisites...${NC}"

command -v anchor >/dev/null 2>&1 || { echo "anchor CLI required. Install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "solana CLI required. Install: sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""; exit 1; }

# Configure for devnet
echo -e "${CYAN}Configuring Solana CLI for devnet...${NC}"
solana config set --url https://api.devnet.solana.com

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo -e "Current balance: ${GREEN}${BALANCE} SOL${NC}"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${CYAN}Requesting devnet airdrop...${NC}"
    solana airdrop 2
    sleep 5
fi

# Build program
echo -e "${CYAN}Building Solana program...${NC}"
cd "$(dirname "$0")/.."/contracts
anchor build

# Deploy
echo -e "${CYAN}Deploying to devnet...${NC}"
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract program ID
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

if [ -n "$PROGRAM_ID" ]; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Deployment Successful!              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Program ID: ${CYAN}${PROGRAM_ID}${NC}"
    echo -e "Explorer:   ${CYAN}https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet${NC}"
    echo ""
else
    echo -e "Program already deployed at: ${CYAN}E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT${NC}"
fi

echo "Done."
