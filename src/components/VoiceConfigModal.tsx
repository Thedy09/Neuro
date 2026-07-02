/**
 * VoiceConfigModal — Prompts user for ElevenLabs Agent ID before starting voice
 *
 * The agent ID is stored in localStorage so it persists across sessions.
 * Users can create a free agent at https://elevenlabs.io/conversational-ai
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Zap, ExternalLink, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'neuro_elevenlabs_agent_id';
// Public agent baked into the bundle so the live demo (judges, fresh browsers,
// no Vercel env var) gets voice working out of the box. Override via
// `VITE_ELEVENLABS_AGENT_ID` at build time or via the in-app modal.
const DEFAULT_AGENT_ID = 'agent_0401kr6t1c6kf9gsdxr71mfhaw0q';
const ENV_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;

interface VoiceConfigModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (agentId: string) => void;
}

export function getStoredAgentId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || ENV_AGENT_ID || null;
  } catch {
    return ENV_AGENT_ID || null;
  }
}

export function storeAgentId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable
  }
}

const VoiceConfigModal: React.FC<VoiceConfigModalProps> = ({ open, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    if (open) {
      const stored = getStoredAgentId();
      if (stored) setAgentId(stored);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = () => {
    const trimmed = agentId.trim();
    if (!trimmed) return;
    storeAgentId(trimmed);
    onConfirm(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('voiceConfig.dialogLabel')}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-1">
              {t('voiceConfig.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {t('voiceConfig.subtitle')}
            </p>

            {/* Input */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {t('voiceConfig.agentIdLabel')}
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('voiceConfig.placeholder')}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors font-mono"
                />
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p className="mb-1">
                    {t('voiceConfig.info')}
                  </p>
                  <a
                    href="https://elevenlabs.io/conversational-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    {t('voiceConfig.createAgent')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!agentId.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all"
              >
                {t('voiceConfig.startVoice')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceConfigModal;
