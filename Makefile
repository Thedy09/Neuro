.PHONY: help dev web backend mobile mobile-build-preview build deploy clean test lint elevenlabs-test

PORT ?= 8000

# ─── NEURO Makefile ───────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ──────────────────────────────────────────────────────────────

dev: ## Start all services in development mode
	docker compose up --build

web: ## Start web frontend only
	cd . && npm run dev

backend: ## Start backend only (override port: make backend PORT=8001)
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port $(PORT)

mobile: ## Start mobile app
	cd mobile && npx expo start

mobile-build-preview: ## EAS Android APK (preview) — requires: cd mobile && npx eas-cli login && npx eas-cli init
	cd mobile && npx eas-cli build --platform android --profile preview

elevenlabs-agent: ## Create ElevenLabs NEURO agent (requires ELEVENLABS_API_KEY in backend/.env)
	python backend/scripts/create_elevenlabs_agent.py

elevenlabs-test: ## Verify ElevenLabs API key + agent ID against ConvAI API
	cd backend && python scripts/test_elevenlabs_connection.py

# ─── Build ────────────────────────────────────────────────────────────────────

build: ## Build all services
	docker compose build

build-web: ## Build web frontend
	npm run build

# ─── Solana Program ──────────────────────────────────────────────────────────

program-build: ## Build Solana program
	cd contracts && anchor build

program-test: ## Test Solana program
	cd contracts && anchor test

program-deploy: ## Deploy Solana program to devnet
	cd contracts && anchor deploy --provider.cluster devnet

# ─── Infrastructure ──────────────────────────────────────────────────────────

up: ## Start all containers
	docker compose up -d

down: ## Stop all containers
	docker compose down

logs: ## View all logs
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

# ─── Quality ─────────────────────────────────────────────────────────────────

lint: ## Run linters
	cd . && npm run lint
	cd backend && python -m ruff check .

format: ## Format code
	cd backend && python -m ruff format .

test: ## Run backend tests (requires: pip install -r backend/requirements-dev.txt)
	cd backend && python -m pytest tests/ -v

# ─── Utilities ───────────────────────────────────────────────────────────────

clean: ## Clean build artifacts
	docker compose down -v --remove-orphans
	rm -rf node_modules dist .next
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf mobile/node_modules

setup: ## Initial project setup
	cp backend/.env.example backend/.env
	npm install
	cd backend && pip install -r requirements.txt
	cd mobile && npm install
	@echo "✓ Setup complete. Edit backend/.env with your API keys."
