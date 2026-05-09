FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check (PORT utilisé par Render/Railway, sinon 8000)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import os,httpx; p=os.environ.get('PORT','8000'); httpx.get(f'http://127.0.0.1:{p}/health')" || exit 1

# Render/Railway injectent PORT ; Docker local garde 8000 par défaut.
# Plan gratuit Render : 1 worker par défaut (moins de RAM). Sur instance plus grande : UVICORN_WORKERS=2
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-1}"]
