/**
 * Backend URL for ElevenLabs signed WebSocket URL (private agents).
 * Set VITE_API_URL in .env to match your FastAPI origin (e.g. http://localhost:8000).
 */
export function getVoiceSignedUrlEndpoint(): string | undefined {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === '') return undefined;
  const base = String(raw).replace(/\/$/, '');
  return `${base}/api/v1/agent/voice/signed-url`;
}
