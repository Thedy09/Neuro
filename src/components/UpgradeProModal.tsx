/**
 * UpgradeProModal — Paywall shown when the free daily voice quota is exhausted
 * (backend returns HTTP 429 on voice endpoints).
 *
 * The CTA target is configurable via VITE_UPGRADE_URL (pricing page, Stripe
 * checkout, etc.). Without it, the button falls back to a contact mailto.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Mic, BarChart3, Bell, Wallet } from 'lucide-react';

const UPGRADE_URL =
  import.meta.env.VITE_UPGRADE_URL || 'mailto:hello@neuro.app?subject=NEURO%20Pro';

const PRO_FEATURES = [
  { icon: Mic, label: 'Unlimited voice sessions' },
  { icon: BarChart3, label: 'Advanced portfolio analytics' },
  { icon: Bell, label: 'Real-time risk alerts' },
  { icon: Wallet, label: 'Multi-wallet support' },
];

interface UpgradeProModalProps {
  open: boolean;
  onClose: () => void;
  /** Free-tier daily limit, shown in the message when known */
  dailyLimit?: number;
}

const UpgradeProModal: React.FC<UpgradeProModalProps> = ({ open, onClose, dailyLimit }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-primary" />
          </div>

          <h3 className="text-lg font-semibold text-foreground mb-1">
            Daily voice limit reached
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {dailyLimit
              ? `You've used your ${dailyLimit} free voice interactions for today. `
              : "You've used your free voice interactions for today. "}
            Upgrade to NEURO Pro for unlimited voice and premium features — or come
            back tomorrow.
          </p>

          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              Maybe later
            </button>
            <a
              href={UPGRADE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all text-center"
            >
              Upgrade to Pro
            </a>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default UpgradeProModal;
