/**
 * NEURO FastAPI client (agent chat, etc.)
 */

export interface AgentChatResponse {
  response: string;
  intent: string | null;
  action: {
    type: string;
    data: Record<string, string>;
  } | null;
  session_id: string;
}

function apiBase(): string | null {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).replace(/\/$/, '');
}

export function isNeuroApiConfigured(): boolean {
  return apiBase() !== null;
}

export async function postAgentChat(body: {
  message: string;
  wallet_address?: string;
  session_id?: string;
}): Promise<AgentChatResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error('VITE_API_URL is not set — cannot reach NEURO backend');
  }
  const res = await fetch(`${base}/api/v1/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = (await res.json()) as { detail?: string };
      if (typeof err.detail === 'string') detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AgentChatResponse>;
}
