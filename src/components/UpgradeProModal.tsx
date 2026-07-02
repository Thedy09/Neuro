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
import { useTranslation } from 'react-i18next';
import { X, Crown, Mic, BarChart3, Bell, Wallet, Loader2, CheckCircle2 } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getProConfig, postProVerify, type ProConfig } from '@/lib/neuroApi';

const CONTACT_URL =
  import.meta.env.VITE_UPGRADE_URL || 'mailto:hello@neuro.app?subject=NEURO%20Pro';

const PRO_FEATURES = [
  { icon: Mic, labelKey: 'upgradePro.features.voice' },
  { icon: BarChart3, labelKey: 'upgradePro.features.analytics' },
  { icon: Bell, labelKey: 'upgradePro.features.alerts' },
  { icon: Wallet, labelKey: 'upgradePro.features.multiWallet' },
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
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
            role="dialog"
            aria-modal="true"
            aria-label={t('upgradePro.dialogLabel')}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Crown className="w-6 h-6 text-primary" />
            </div>

            {payState === 'success' ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t('upgradePro.successTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {t('upgradePro.successBody', {
                    duration: config
                      ? t('upgradePro.successDuration', { days: config.duration_days })
                      : '',
                  })}
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('upgradePro.startTalking')}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t('upgradePro.limitTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {dailyLimit
                    ? t('upgradePro.limitBodyWithCount', { count: dailyLimit })
                    : t('upgradePro.limitBody')}
                  {t('upgradePro.limitUpgrade')}
                </p>

                <ul className="space-y-2.5 mb-6">
                  {PRO_FEATURES.map(({ icon: Icon, labelKey }) => (
                    <li
                      key={labelKey}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </span>
                      {t(labelKey)}
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
                    {t('upgradePro.maybeLater')}
                  </button>
                  {canPayOnChain ? (
                    <button
                      onClick={handlePay}
                      disabled={payState !== 'idle'}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                    >
                      {payState === 'paying' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> {t('upgradePro.signInWallet')}
                        </>
                      )}
                      {payState === 'verifying' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> {t('upgradePro.verifying')}
                        </>
                      )}
                      {payState === 'idle' && t('upgradePro.pay', { price: config?.price_sol })}
                    </button>
                  ) : (
                    <a
                      href={CONTACT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all text-center"
                    >
                      {publicKey ? t('upgradePro.contactUs') : t('upgradePro.connectToPay')}
                    </a>
                  )}
                </div>

                {canPayOnChain && (
                  <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed text-center">
                    {t('upgradePro.paymentNote', {
                      price: config?.price_sol,
                      days: config?.duration_days,
                    })}
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
