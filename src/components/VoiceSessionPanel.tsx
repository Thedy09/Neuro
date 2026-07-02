/**
 * VoiceSessionPanel — Full voice conversation UI
 *
 * Displays:
 * - Active voice orb with real volume-driven animation
 * - Live transcript stream (user + agent)
 * - State indicator (connecting / listening / processing / speaking)
 * - Waveform visualization
 * - Session controls (end, mute concept)
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Wifi, WifiOff, Bot, User, Loader2 } from 'lucide-react';
import type { VoiceState, VoiceTranscript } from '@/hooks/useElevenLabsVoice';
import VoiceOrb from './VoiceOrb';

interface VoiceSessionPanelProps {
  state: VoiceState;
  transcripts: VoiceTranscript[];
  volume: number;
  conversationId: string | null;
  onStop: () => void;
}

// Waveform visualization bar count
const BAR_COUNT = 32;

const WaveformVisualizer: React.FC<{ volume: number; isActive: boolean }> = ({ volume, isActive }) => {
  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const baseHeight = Math.sin((i / BAR_COUNT) * Math.PI) * 0.7 + 0.3;
      const randomFactor = 0.5 + Math.random() * 0.5;
      return baseHeight * randomFactor;
    });
  }, []);

  return (
    <div className="flex items-center justify-center gap-[2px] h-12 px-4">
      {bars.map((base, i) => {
        const height = isActive ? Math.max(3, base * volume * 48) : 3;
        return (
          <motion.div
            key={i}
            animate={{ height }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="w-[3px] rounded-full bg-primary"
            style={{ opacity: isActive ? 0.3 + volume * 0.7 : 0.15 }}
          />
        );
      })}
    </div>
  );
};

const VoiceSessionPanel: React.FC<VoiceSessionPanelProps> = ({
  state,
  transcripts,
  volume,
  conversationId,
  onStop,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcripts]);

  const isActive = state !== 'idle';
  const isListeningOrSpeaking = state === 'listening' || state === 'speaking';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Wifi className="w-3.5 h-3.5 text-success animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">
            {t(`voicePanel.states.${state}`)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {conversationId && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {conversationId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={onStop}
            aria-label={t('voicePanel.endSessionLabel')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center — Orb + waveform */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center py-6 gap-4">
        <VoiceOrb
          size="md"
          isListening={state === 'listening'}
          isSpeaking={state === 'speaking'}
        />
        <WaveformVisualizer volume={volume} isActive={isListeningOrSpeaking} />
        <p className="text-xs text-muted-foreground font-mono text-center px-8">
          {t(`voicePanel.hints.${state}`)}
        </p>
      </div>

      {/* Transcript stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <AnimatePresence>
          {transcripts.map((t, i) => (
            <motion.div
              key={`${t.role}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
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
                className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm text-foreground'
                    : 'bg-secondary/50 border border-border rounded-xl rounded-tl-sm text-foreground'
                } ${!t.isFinal ? 'opacity-60 italic' : ''}`}
              >
                {t.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {state === 'processing' && (
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
              <span className="text-xs text-muted-foreground">{t('common.thinking')}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* End session button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onStop}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
        >
          {t('voicePanel.endVoiceSession')}
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceSessionPanel;
