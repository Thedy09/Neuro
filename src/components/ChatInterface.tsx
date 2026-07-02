/**
 * ChatInterface — Unified text + voice AI chat
 *
 * Text mode:  standard chat with simulated intent detection (demo)
 * Voice mode: real ElevenLabs Conversational AI via WebSocket
 *
 * Voice transcripts are merged into the main message stream so the
 * conversation feels continuous regardless of input modality.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Loader2,
  ArrowUpRight,
  Shield,
  TrendingUp,
  Globe,
  Mic,
  Expand,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@solana/wallet-adapter-react';
import VoiceSessionPanel from './VoiceSessionPanel';
import VoiceConfigModal, { getStoredAgentId, storeAgentId } from './VoiceConfigModal';
import UpgradeProModal from './UpgradeProModal';
import {
  useElevenLabsVoice,
  type VoiceTranscript,
  type ToolCall,
} from '@/hooks/useElevenLabsVoice';
import { getVoiceSignedUrlEndpoint } from '@/lib/voiceBackend';
import { isNeuroApiConfigured, postAgentChat } from '@/lib/neuroApi';

// ── Types ────────────────────────────────────────────────────────────────────

interface MessageAction {
  type: 'bridge' | 'yield' | 'risk';
  data: Record<string, string>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: MessageAction;
  source?: 'text' | 'voice';
}

// ── Demo responses (used for text-mode) ──────────────────────────────────────

const sampleResponses: Record<string, { content: string; action?: MessageAction }> = {
  bridge: {
    content:
      'I found the optimal route via LI.FI. Bridging 300 USDC from Base to Solana through Stargate. Estimated arrival: ~45 seconds. Gas cost: $0.12. Shall I proceed?',
    action: {
      type: 'bridge',
      data: { from: 'Base', to: 'Solana', amount: '300 USDC', route: 'Stargate', gas: '$0.12', eta: '~45s' },
    },
  },
  yield: {
    content:
      'Based on your medium risk profile, I recommend:\n\n1. **Kamino USDC Vault** - 8.2% APY, low risk\n2. **Drift USDC-SOL** - 12.4% APY, medium risk\n3. **MarginFi Lending** - 6.8% APY, lowest risk\n\nKamino offers the best risk-adjusted return for your profile.',
    action: {
      type: 'yield',
      data: { recommended: 'Kamino USDC Vault', apy: '8.2%', risk: 'Low', liquidity: 'High' },
    },
  },
  risk: {
    content:
      'Your portfolio risk analysis:\n\n- **Stablecoin exposure**: 72% (healthy)\n- **Chain concentration**: 85% Solana (moderate)\n- **Protocol diversification**: 3 protocols (good)\n- **Estimated volatility**: Low-Medium\n\nOverall risk score: **34/100** - Conservative profile.',
    action: {
      type: 'risk',
      data: { score: '34/100', stablecoin: '72%', volatility: 'Low-Medium', status: 'Healthy' },
    },
  },
};

function detectIntent(msg: string): string {
  const l = msg.toLowerCase();
  if (['bridge', 'move', 'transfer', 'send'].some((w) => l.includes(w))) return 'bridge';
  if (['yield', 'apy', 'optimize', 'earn'].some((w) => l.includes(w))) return 'yield';
  if (['risk', 'portfolio', 'analyze', 'score'].some((w) => l.includes(w))) return 'risk';
  return 'yield';
}

// ── ActionCard sub-component ─────────────────────────────────────────────────

const ActionCard: React.FC<{ action: MessageAction }> = ({ action }) => {
  const { t } = useTranslation();
  const icons = { bridge: Globe, yield: TrendingUp, risk: Shield };
  const labels = {
    bridge: t('chat.actionLabels.bridge'),
    yield: t('chat.actionLabels.yield'),
    risk: t('chat.actionLabels.risk'),
  };
  const Icon = icons[action.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 rounded-lg border border-primary/20 bg-primary/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          {labels[action.type]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(action.data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
      {action.type === 'bridge' && (
        <button className="mt-3 w-full py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
          {t('chat.executeTransaction')} <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
};

// ── Main ChatInterface ───────────────────────────────────────────────────────

const ChatInterface: React.FC = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { t } = useTranslation();

  // ── Text chat state ────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: '1',
      role: 'assistant',
      content: t('chat.welcome'),
      timestamp: new Date(),
      source: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionIdRef = useRef<string | undefined>(undefined);

  // ── Voice state ────────────────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [agentId, setAgentId] = useState<string>(getStoredAgentId() || '');

  // Track transcripts we already added to messages to avoid duplicates
  const processedTranscriptsRef = useRef<Set<string>>(new Set());

  // ── ElevenLabs voice hook ──────────────────────────────────────────────
  const handleTranscript = useCallback(
    (transcript: VoiceTranscript) => {
      if (!transcript.isFinal) return;

      const key = `${transcript.role}-${transcript.text}-${transcript.timestamp.getTime()}`;
      if (processedTranscriptsRef.current.has(key)) return;
      processedTranscriptsRef.current.add(key);

      const msg: Message = {
        id: `voice-${Date.now()}-${Math.random()}`,
        role: transcript.role === 'agent' ? 'assistant' : 'user',
        content: transcript.text,
        timestamp: transcript.timestamp,
        source: 'voice',
      };

      setMessages((prev) => [...prev, msg]);
    },
    [],
  );

  const handleToolCall = useCallback(async (tool: ToolCall): Promise<string> => {
    // Handle ElevenLabs tool calls from the agent
    if (tool.toolName === 'get_yield_analysis') {
      return JSON.stringify({
        protocols: [
          { protocol: 'Kamino', apy: 8.2, risk: 'Low' },
          { protocol: 'Drift', apy: 12.4, risk: 'Medium' },
          { protocol: 'MarginFi', apy: 6.8, risk: 'Low' },
          { protocol: 'Jito', apy: 7.1, risk: 'Low' },
        ],
        recommended: 'Kamino USDC Vault at 8.2% APY',
      });
    }
    if (tool.toolName === 'execute_cross_chain_move') {
      return JSON.stringify({
        status: 'route_found',
        bridge: 'Stargate',
        from: tool.parameters.source_chain || 'Base',
        to: 'Solana',
        eta: '45 seconds',
        gas: '$0.12',
      });
    }
    if (tool.toolName === 'get_portfolio_risk') {
      return JSON.stringify({
        risk_score: 34,
        stablecoin_exposure: '72%',
        chain_concentration: '85% Solana',
        volatility: 'Low-Medium',
      });
    }
    return JSON.stringify({ error: 'Unknown tool' });
  }, []);

  const voice = useElevenLabsVoice({
    agentId,
    signedUrlEndpoint: getVoiceSignedUrlEndpoint(),
    walletAddress: publicKey?.toBase58(),
    onTranscript: handleTranscript,
    onToolCall: handleToolCall,
    onQuotaExceeded: () => {
      setVoiceMode(false);
      setShowUpgradeModal(true);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: t('chat.voiceError', { error: err }),
          timestamp: new Date(),
          source: 'voice',
        },
      ]);
      setVoiceMode(false);
    },
  });

  // ── Scroll to bottom ──────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // ── Text send handler ─────────────────────────────────────���───────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      source: 'text',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (isNeuroApiConfigured()) {
        const result = await postAgentChat({
          message: trimmed,
          session_id: chatSessionIdRef.current,
          wallet_address: publicKey?.toBase58(),
        });
        chatSessionIdRef.current = result.session_id;

        let action: MessageAction | undefined;
        const rawAction = result.action;
        if (
          rawAction &&
          (rawAction.type === 'bridge' || rawAction.type === 'yield' || rawAction.type === 'risk')
        ) {
          const data: Record<string, string> = {};
          for (const [k, v] of Object.entries(rawAction.data ?? {})) {
            data[k] = typeof v === 'string' ? v : String(v);
          }
          action = { type: rawAction.type, data };
        }

        const aiMsg: Message = {
          id: `${Date.now()}-api`,
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          action,
          source: 'text',
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const intent = detectIntent(trimmed);
        const response = sampleResponses[intent] || sampleResponses.yield;
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          action: response.action,
          source: 'text',
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: t('chat.apiError', { error: msg }),
          timestamp: new Date(),
          source: 'text',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, publicKey, t]);

  // ── Voice toggle handler ──────────────────────────────────────────────
  const handleVoiceToggle = useCallback(() => {
    if (voice.isActive) {
      voice.stop();
      setVoiceMode(false);
      return;
    }

    // Check for stored agent ID
    const stored = getStoredAgentId();
    if (stored) {
      setAgentId(stored);
      setVoiceMode(true);
      // Start will be called by the voice mode panel mount
    } else {
      setShowConfigModal(true);
    }
  }, [voice]);

  const handleConfigConfirm = useCallback(
    (id: string) => {
      storeAgentId(id);
      setAgentId(id);
      setShowConfigModal(false);
      setVoiceMode(true);
    },
    [],
  );

  // Auto-start voice when entering voice mode with a valid agent ID
  useEffect(() => {
    if (voiceMode && agentId && !voice.isActive) {
      voice.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, agentId]);

  // ── Render: Voice mode ─────────────────────────────────────────────────

  if (voiceMode) {
    return (
      <>
        <VoiceSessionPanel
          state={voice.state}
          transcripts={voice.transcripts}
          volume={voice.volume}
          conversationId={voice.conversationId}
          onStop={() => {
            voice.stop();
            setVoiceMode(false);
          }}
        />
        <VoiceConfigModal
          open={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setVoiceMode(false);
          }}
          onConfirm={handleConfigConfirm}
        />
        <UpgradeProModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    );
  }

  // ── Render: Text mode ──────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'assistant' ? 'bg-primary/20' : 'bg-secondary'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-2.5'
                      : 'bg-secondary/50 border border-border rounded-2xl rounded-tl-sm px-4 py-2.5'
                  }`}
                >
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i} className="font-semibold text-primary">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                  </div>
                  {msg.action && <ActionCard action={msg.action} />}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.source === 'voice' && (
                      <span className="px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                        {t('chat.voiceBadge')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-secondary/50 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">{t('chat.typing')}</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            {/* Voice buttons */}
            <div className="flex flex-shrink-0 gap-1.5">
              <button
                onClick={handleVoiceToggle}
                aria-label={t('chat.startVoice')}
                className="relative w-12 h-12 rounded-full flex items-center justify-center border-2 border-border bg-secondary hover:border-primary/40 hover:bg-primary/10 active:scale-95 transition-all group"
                title={t('chat.inlineVoiceTitle')}
              >
                <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-card animate-pulse" />
              </button>
              <button
                onClick={() => navigate('/voice')}
                aria-label={t('chat.fullscreenVoice')}
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-border bg-secondary hover:border-primary/40 hover:bg-primary/10 active:scale-95 transition-all group"
                title={t('chat.fullscreenVoiceTitle')}
              >
                <Expand className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-secondary/30 focus-within:border-primary/40 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('chat.placeholder')}
                aria-label={t('chat.messageNeuro')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label={t('chat.sendMessage')}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 ml-[4.25rem]">
            {[t('chat.suggestions.bridge'), t('chat.suggestions.yield'), t('chat.suggestions.risk')].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground border border-border rounded-full hover:border-primary/30 hover:text-foreground transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Config modal */}
      <VoiceConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfirm={handleConfigConfirm}
      />
      <UpgradeProModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
};

export default ChatInterface;