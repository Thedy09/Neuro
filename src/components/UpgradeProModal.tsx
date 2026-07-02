/**
 * UpgradeProModal — Paywall shown when the free daily voice quota is exhausted
 * (backend returns HTTP 429 on voice endpoints).
 *
 * Payment is on-chain: the user sends PRO_PRICE_SOL to the treasury wallet
 * (plain SOL transfer signed in their own wallet), then the backend verifies
 * the transaction and activates Pro. Falls back to a contact link when
 * on-chain subscriptions are not enabled on the server or no wallet is
 * connected.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Mic, BarChart3, Bell, Wallet, Loader2, CheckCircle2 } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getProConfig, postProVerify, type ProConfig } from '@/lib/neuroApi';

const CONTACT_URL =
  import.meta.env.VITE_UPGRADE_URL || 'mailto:hello@neuro.app?subject=NEURO%20Pro';

const PRO_FEATURES = [
  { icon: Mic, label: 'Unlimited voice sessions' },
  { icon: BarChart3, label: 'Advanced portfolio analytics' },
  { icon: Bell, label: 'Real-time risk alerts' },
  { icon: Wallet, label: 'Multi-wallet support' },
];

type PayState = 'idle' | 'paying' | 'verifying' | 'success';

interface UpgradeProModalProps {
  open: boolean;
  onClose: () => void;
  /** Free-tier daily limit, shown in the message when known */
  dailyLimit?: number;
  /** Called after a successful on-chain subscription (e.g. refresh quota UI) */
  onSubscribed?: () => void;
}

const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  open,
  onClose,
  dailyLimit,
  onSubscribed,
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [config, setConfig] = useState<ProConfig | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayState('idle');
    setError(null);
    getProConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [open]);

  const canPayOnChain =
    config?.enabled && config.treasury_wallet && publicKey && sendTransaction;

  const handlePay = useCallback(async () => {
    if (!canPayOnChain || !config?.treasury_wallet || !publicKey) return;
    setError(null);
    setPayState('paying');

    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(config.treasury_wallet),
          lamports: Math.round(config.price_sol * LAMPORTS_PER_SOL),
        }),
      );

      const signature = await sendTransaction(tx, connection);
      setPayState('verifying');
      await connection.confirmTransaction(signature, 'confirmed');

      await postProVerify({
        wallet_address: publicKey.toBase58(),
        tx_signature: signature,
      });

      setPayState('success');
      onSubscribed?.();
    } catch (err) {
      setPayState('idle');
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  }, [canPayOnChain, config, publicKey, sendTransaction, connection, onSubscribed]);

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

            {payState === 'success' ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Welcome to NEURO Pro
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Your subscription is active
                  {config ? ` for ${config.duration_days} days` : ''}. Voice is now
                  unlimited on this wallet.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Start talking
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Daily voice limit reached
                </h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {dailyLimit
                    ? `You've used your ${dailyLimit} free voice interactions for today. `
                    : "You've used your free voice interactions for today. "}
                  Upgrade to NEURO Pro for unlimited voice — or come back tomorrow.
                </p>

                <ul className="space-y-2.5 mb-6">
                  {PRO_FEATURES.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>

                {error && (
                  <p className="text-xs text-destructive mb-4 leading-relaxed">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                  >
                    Maybe later
                  </button>
                  {canPayOnChain ? (
                    <button
                      onClick={handlePay}
                      disabled={payState !== 'idle'}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                    >
                      {payState === 'paying' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sign in wallet...
                        </>
                      )}
                      {payState === 'verifying' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                      )}
                      {payState === 'idle' && `Pay ${config?.price_sol} SOL`}
                    </button>
                  ) : (
                    <a
                      href={CONTACT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all text-center"
                    >
                      {publicKey ? 'Contact us' : 'Connect wallet to pay'}
                    </a>
                  )}
                </div>

                {canPayOnChain && (
                  <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed text-center">
                    One transaction of {config?.price_sol} SOL from your wallet —{' '}
                    {config?.duration_days} days of Pro. Non-custodial: you sign, we verify
                    on-chain.
                  </p>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeProModal;
