/**
 * Voice — Full-screen immersive voice mode page
 *
 * Centered animated orb, real-time waveform, live transcript feed,
 * floating particle backdrop, and ElevenLabs Conversational AI streaming.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MessageSquare,
  Wifi,
  WifiOff,
  Bot,
  User,
  Loader2,
  Settings,
  Zap,
  PhoneOff,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import VoiceOrb from '@/components/VoiceOrb';
import VoiceConfigModal, {
  getStoredAgentId,
  storeAgentId,
} from '@/components/VoiceConfigModal';
import UpgradeProModal from '@/components/UpgradeProModal';
import {
  useElevenLabsVoice,
  type VoiceState,
  type ToolCall,
} from '@/hooks/useElevenLabsVoice';
import { getVoiceSignedUrlEndpoint } from '@/lib/voiceBackend';
import { getVoiceUsage, isNeuroApiConfigured, type VoiceUsage } from '@/lib/neuroApi';

// ── Immersive waveform ───────────────────────────────────────────────────────

const BAR_COUNT = 48;

const ImmersiveWaveform: React.FC<{ volume: number; isActive: boolean }> = ({
  volume,
  isActive,
}) => {
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        const center = BAR_COUNT / 2;
        const dist = Math.abs(i - center) / center;
        const base = (1 - dist * 0.6) * (0.5 + Math.random() * 0.5);
        return base;
      }),
    [],
  );

  return (
    <div className="flex items-center justify-center gap-[2px] h-16 w-full max-w-md mx-auto">
      {bars.map((base, i) => {
        const height = isActive ? Math.max(2, base * volume * 64) : 2;
        return (
          <motion.div
            key={i}
            animate={{ height }}
            transition={{ duration: 0.08, ease: 'easeOut' }}
            className="w-[2.5px] rounded-full bg-primary"
            style={{ opacity: isActive ? 0.25 + volume * 0.75 : 0.08 }}
          />
        );
      })}
    </div>
  );
};

// ── Floating particles backdrop ──────────────────────────────────────────────

const Particles: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={
            isActive
              ? {
                  y: [0, -30, 0],
                  opacity: [0.05, 0.2, 0.05],
                }
              : { opacity: 0.03 }
          }
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
};

// ── State labels ─────────────────────────────────────────────────────────────

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Tap the orb to speak',
  connecting: 'Connecting to NEURO...',
  listening: 'Listening...',
  processing: 'Processing your request...',
  speaking: 'NEURO is responding...',
};

const STATE_HINTS: Record<VoiceState, string> = {
  idle: '"Move 300 USDC from Base to Solana and optimize my yield"',
  connecting: 'Establishing secure voice channel',
  listening: 'Speak naturally — I understand DeFi commands',
  processing: 'Analyzing intent and fetching routes...',
  speaking: 'Responding via voice...',
};

// ── Main page component ──────────────────────────────────────────────────────

const Voice: React.FC = () => {
  const navigate = useNavigate();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { publicKey } = useWallet();

  const [showConfig, setShowConfig] = useState(false);
  const [agentId, setAgentId] = useState<string>(getStoredAgentId() || '');
  const [showTranscripts, setShowTranscripts] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usage, setUsage] = useState<VoiceUsage | null>(null);

  // ── Voice quota (freemium) ───────────────────────────────────────────
  const walletAddress = publicKey?.toBase58();

  const refreshUsage = useCallback(() => {
    if (!isNeuroApiConfigured()) return;
    getVoiceUsage(walletAddress)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [walletAddress]);

  useEffect(refreshUsage, [refreshUsage]);

  // ── Tool call handler ────────────────────────────────────────────────
  const handleToolCall = useCallback(async (tool: ToolCall): Promise<string> => {
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

  // ── Voice hook ───────────────────────────────────────────────────────
  const voice = useElevenLabsVoice({
    agentId,
    signedUrlEndpoint: getVoiceSignedUrlEndpoint(),
    walletAddress,
    onToolCall: handleToolCall,
    onError: () => {
      // Errors are visible in transcript panel via state
    },
    onQuotaExceeded: () => {
      refreshUsage();
      setShowUpgrade(true);
    },
  });

  // Each started session consumes one free-tier request — keep the counter fresh.
  useEffect(() => {
    if (voice.conversationId) refreshUsage();
  }, [voice.conversationId, refreshUsage]);

  // ── Auto-scroll transcripts ──────────────────────────────────────────
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [voice.transcripts]);

  // ── Orb press ────────────────────────────────────────────────────────
  const handleOrbPress = useCallback(() => {
    if (voice.isActive) {
      voice.stop();
      return;
    }

    const stored = getStoredAgentId();
    if (stored) {
      setAgentId(stored);
      voice.start();
    } else {
      setShowConfig(true);
    }
  }, [voice]);

  const handleConfigConfirm = useCallback(
    (id: string) => {
      storeAgentId(id);
      setAgentId(id);
      setShowConfig(false);
      // Small delay so hook picks up new agentId
      setTimeout(() => voice.start(), 100);
    },
    [voice],
  );

  const isActive = voice.state !== 'idle';
  const isAudioActive = voice.state === 'listening' || voice.state === 'speaking';

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <Particles isActive={isActive} />

      {/* Radial gradient glow behind orb */}
      <motion.div
        animate={{
          opacity: isActive ? 0.15 : 0.05,
          scale: isActive ? 1.2 : 1,
        }}
        transition={{ duration: 1.5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, hsl(187 90% 51% / 0.15) 0%, transparent 70%)',
        }}
      />

      {/* ── Top bar ──────────────────────────────────────���──────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2.5">
          {isActive ? (
            <Wifi className="w-3.5 h-3.5 text-success animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Voice Mode</span>
          {voice.conversationId && (
            <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-border">
              {voice.conversationId.slice(0, 8)}
            </span>
          )}
          {usage && usage.is_pro && (
            <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 uppercase tracking-wider">
              Pro
            </span>
          )}
          {usage && !usage.is_pro && usage.limit > 0 && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                usage.remaining === 0
                  ? 'text-destructive border-destructive/30 bg-destructive/10'
                  : 'text-muted-foreground border-border'
              }`}
              title="Free voice interactions remaining today"
            >
              {usage.remaining}/{usage.limit} today
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Voice settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:border-primary/30 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Text Chat</span>
          </button>
        </div>
      </div>

      {/* ── Center content ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* State label */}
        <motion.p
          key={voice.state}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em] mb-10 text-center"
        >
          {STATE_LABELS[voice.state]}
        </motion.p>

        {/* Voice orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <VoiceOrb
            size="lg"
            isListening={voice.state === 'listening'}
            isSpeaking={voice.state === 'speaking'}
            isProcessing={voice.state === 'processing'}
            isConnecting={voice.state === 'connecting'}
            onToggle={handleOrbPress}
          />
        </motion.div>

        {/* Waveform */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 w-full"
        >
          <ImmersiveWaveform volume={voice.volume} isActive={isAudioActive} />
        </motion.div>

        {/* Hint text */}
        <motion.p
          key={voice.state + '-hint'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm text-muted-foreground font-mono text-center max-w-md leading-relaxed"
        >
          {STATE_HINTS[voice.state]}
        </motion.p>

        {/* End call button (visible when active) */}
        <AnimatePresence>
          {isActive && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => voice.stop()}
              className="mt-8 flex items-center gap-2 px-6 py-3 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all text-sm font-medium"
            >
              <PhoneOff className="w-4 h-4" />
              End Session
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Transcript drawer (bottom) ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col" style={{ maxHeight: '35vh' }}>
        {/* Toggle bar */}
        <button
          onClick={() => setShowTranscripts(!showTranscripts)}
          className="flex items-center justify-center gap-2 py-2 border-t border-border bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors"
        >
          <motion.div
            animate={{ rotate: showTranscripts ? 180 : 0 }}
            className="w-4 h-4 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              className="w-3 h-3 text-muted-foreground"
            >
              <path
                d="M2 8L6 4L10 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Transcript{voice.transcripts.length > 0 && ` (${voice.transcripts.length})`}
          </span>
        </button>

        {/* Transcript content */}
        <AnimatePresence>
          {showTranscripts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-card/30 backdrop-blur-md"
            >
              <div
                ref={transcriptRef}
                className="overflow-y-auto px-6 py-4 space-y-3"
                style={{ maxHeight: '28vh' }}
              >
                {voice.transcripts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 font-mono">
                    {isActive
                      ? 'Waiting for conversation...'
                      : 'Start a voice session to see transcripts here'}
                  </p>
                )}

                {voice.transcripts.map((t, i) => (
                  <motion.div
                    key={`${t.role}-${i}-${t.timestamp.getTime()}`}
                    initial={{ opacity: 0, x: t.role === 'user' ? 12 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-2.5 ${t.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        t.role === 'agent' ? 'bg-primary/20' : 'bg-secondary'
                      }`}
                    >
                      {t.role === 'agent' ? (
                        <Bot className="w-3 h-3 text-primary" />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                        t.role === 'user'
                          ? 'bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm'
                          : 'bg-secondary/50 border border-border rounded-xl rounded-tl-sm'
                      } ${!t.isFinal ? 'opacity-50 italic' : ''} text-foreground`}
                    >
                      {t.text}
                      <span className="block text-[9px] text-muted-foreground font-mono mt-1">
                        {t.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {voice.state === 'processing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 py-3 flex items-center justify-center border-t border-border bg-card/20 backdrop-blur-sm">
        <p className="text-[10px] text-muted-foreground font-mono">
          Voice powered by ElevenLabs Conversational AI
        </p>
      </div>

      {/* ── Config modal ────────────────────────────────────────────────── */}
      <VoiceConfigModal
        open={showConfig}
        onClose={() => setShowConfig(false)}
        onConfirm={handleConfigConfirm}
      />

      {/* ── Pro paywall (free daily voice limit reached) ────────────────── */}
      <UpgradeProModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        dailyLimit={usage?.limit && usage.limit > 0 ? usage.limit : undefined}
      />
    </div>
  );
};

export default Voice;
