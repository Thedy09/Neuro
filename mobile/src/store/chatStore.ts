import { create } from "zustand";
import { agentApi } from "../services/api";
import { useWalletStore } from "./walletStore";

export interface ChatAction {
  type: "bridge" | "yield" | "risk";
  data: Record<string, string>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: ChatAction;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

const SAMPLE_RESPONSES: Record<
  string,
  { content: string; action?: ChatAction }
> = {
  bridge: {
    content:
      "I found the optimal route via LI.FI. Bridging 300 USDC from Base to Solana through Stargate. Estimated arrival: ~45 seconds. Gas cost: $0.12. Shall I proceed?",
    action: {
      type: "bridge",
      data: {
        from: "Base",
        to: "Solana",
        amount: "300 USDC",
        route: "Stargate",
        gas: "$0.12",
        eta: "~45s",
      },
    },
  },
  yield: {
    content:
      "Based on your medium risk profile, I recommend:\n\n1. Kamino USDC Vault — 8.2% APY, low risk\n2. Drift USDC-SOL — 12.4% APY, medium risk\n3. MarginFi Lending — 6.8% APY, lowest risk\n\nKamino offers the best risk-adjusted return.",
    action: {
      type: "yield",
      data: {
        recommended: "Kamino USDC",
        apy: "8.2%",
        risk: "Low",
        liquidity: "High",
      },
    },
  },
  risk: {
    content:
      "Your portfolio risk analysis:\n\n- Stablecoin exposure: 72% (healthy)\n- Chain concentration: 85% Solana (moderate)\n- Protocol diversification: 3 protocols (good)\n- Estimated volatility: Low-Medium\n\nOverall risk score: 34/100 — Conservative profile.",
    action: {
      type: "risk",
      data: {
        score: "34/100",
        stablecoin: "72%",
        volatility: "Low-Med",
        status: "Healthy",
      },
    },
  },
};

function detectIntent(msg: string): string {
  const lower = msg.toLowerCase();
  if (
    lower.includes("bridge") ||
    lower.includes("move") ||
    lower.includes("transfer")
  )
    return "bridge";
  if (
    lower.includes("yield") ||
    lower.includes("apy") ||
    lower.includes("optimize") ||
    lower.includes("earn")
  )
    return "yield";
  if (
    lower.includes("risk") ||
    lower.includes("portfolio") ||
    lower.includes("analyze")
  )
    return "risk";
  return "yield";
}

function mapAgentActionToChatAction(
  action: { type: string; data: Record<string, unknown> } | null | undefined
): ChatAction | undefined {
  if (!action) return undefined;
  if (action.type !== "bridge" && action.type !== "yield" && action.type !== "risk")
    return undefined;
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(action.data ?? {})) {
    data[k] = typeof v === "string" ? v : String(v);
  }
  return { type: action.type, data };
}

let mobileChatSessionId: string | undefined;

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: "init",
      role: "assistant",
      content:
        "Hello. I'm NEURO, your AI wealth operating system. I can bridge assets, analyze yield opportunities, and manage your vault risk. What would you like to do?",
      timestamp: new Date(),
    },
  ],
  isTyping: false,

  sendMessage: async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isTyping: true,
    }));

    try {
      const wallet = useWalletStore.getState().address ?? undefined;
      const result = await agentApi.chat({
        message: text,
        session_id: mobileChatSessionId,
        wallet_address: wallet,
      });
      mobileChatSessionId = result.session_id;
      const aiMsg: Message = {
        id: `${Date.now()}-api`,
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
        action: mapAgentActionToChatAction(
          result.action as { type: string; data: Record<string, unknown> } | null
        ),
      };
      set((state) => ({
        messages: [...state.messages, aiMsg],
        isTyping: false,
      }));
      return;
    } catch {
      /* local demo */
    }

    const intent = detectIntent(text);
    const response = SAMPLE_RESPONSES[intent] || SAMPLE_RESPONSES.yield;
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response.content,
      timestamp: new Date(),
      action: response.action,
    };

    set((state) => ({
      messages: [...state.messages, aiMsg],
      isTyping: false,
    }));
  },

  clearMessages: () =>
    set({
      messages: [
        {
          id: "init",
          role: "assistant",
          content: "Chat cleared. How can I help you?",
          timestamp: new Date(),
        },
      ],
    }),
}));
