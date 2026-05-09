# Build context = monorepo root (Render / docker compose avec context: .).
# Chemins explicites backend/… pour que requirements.txt et le code soient trouvés.

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import os,httpx; p=os.environ.get('PORT','8000'); httpx.get(f'http://127.0.0.1:{p}/health')" || exit 1

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-1}"]
