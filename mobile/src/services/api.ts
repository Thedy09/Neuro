/**
 * NEURO Mobile — API Service
 * Communicates with the FastAPI backend
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_WS_TOKEN = process.env.EXPO_PUBLIC_AGENT_WS_TOKEN || "";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Bridge endpoints
export const bridgeApi = {
  getQuote: (params: {
    from_chain: string;
    from_token: string;
    amount: string;
    destination_token?: string;
  }) => request("/api/v1/bridge/quote", { method: "POST", body: params }),

  getChains: () => request("/api/v1/bridge/chains"),

  getStatus: (txHash: string) => request(`/api/v1/bridge/status/${txHash}`),
};

// Agent endpoints
export const agentApi = {
  chat: (params: {
    message: string;
    wallet_address?: string;
    session_id?: string;
  }) => request("/api/v1/agent/chat", { method: "POST", body: params }),

  getTools: () => request("/api/v1/agent/tools"),
};

// Voice (server-side ElevenLabs TTS + STT)
export const voiceApi = {
  tts: async (text: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/api/v1/agent/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => "TTS error");
      throw new Error(err.slice(0, 200));
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:audio/mpeg;base64,${base64}`;
  },

  stt: async (
    fileUri: string,
    languageCode?: string
  ): Promise<{ text: string; language_code?: string }> => {
    const form = new FormData();
    const filename = fileUri.split("/").pop() || "audio.m4a";
    const mimeType = filename.endsWith(".wav")
      ? "audio/wav"
      : filename.endsWith(".mp3")
      ? "audio/mpeg"
      : filename.endsWith(".webm")
      ? "audio/webm"
      : "audio/m4a";

    form.append("file", {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    if (languageCode) {
      form.append("language_code", languageCode);
    }

    const response = await fetch(`${API_BASE}/api/v1/agent/voice/stt`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      const err = await response.text().catch(() => "STT error");
      throw new Error(err.slice(0, 200));
    }
    return response.json();
  },
};

// Vault endpoints
export const vaultApi = {
  getVault: (ownerPubkey: string) =>
    request(`/api/v1/vault/${ownerPubkey}`),

  initializeVault: (params: { owner_pubkey: string; risk_score: number }) =>
    request("/api/v1/vault/initialize", { method: "POST", body: params }),

  updateRisk: (params: { owner_pubkey: string; new_score: number }) =>
    request("/api/v1/vault/update-risk", { method: "POST", body: params }),

  deposit: (params: { owner_pubkey: string; amount: number }) =>
    request("/api/v1/vault/deposit", { method: "POST", body: params }),
};

// WebSocket connection for real-time agent chat
export function createAgentWebSocket(sessionId: string, wsToken?: string) {
  const wsUrl = API_BASE.replace("http", "ws");
  const base = `${wsUrl}/api/v1/agent/ws/${sessionId}`;
  const token = wsToken || AGENT_WS_TOKEN;
  const url =
    token.length > 0
      ? `${base}?token=${encodeURIComponent(token)}`
      : base;
  return new WebSocket(url);
}
