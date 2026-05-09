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
