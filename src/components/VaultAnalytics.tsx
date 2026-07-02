/**
 * VaultAnalytics — On-chain vault management UI
 *
 * Reads real PDA vault data via useNeuroVault hook.
 * Supports: initialize_vault, update_risk, deposit_tracking
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  TrendingUp,
  Shield,
  Settings,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useNeuroVault } from '@/hooks/useNeuroVault';
import { CLUSTER_LABEL, explorerTxUrl } from '@/lib/solanaConfig';

// ── Yield data (static — these are off-chain protocol APYs) ──────────────────

const yieldOps = [
  { protocol: 'Jito', type: 'Liquid Staking', apy: 7.1, risk: 'Low', liquidity: 98, recommendation: 'Conservative pick. Reliable yield with high liquidity.' },
  { protocol: 'Kamino', type: 'USDC Vault', apy: 8.2, risk: 'Low', liquidity: 95, recommendation: 'Best risk-adjusted return for stablecoin exposure.' },
  { protocol: 'Drift', type: 'USDC-SOL LP', apy: 12.4, risk: 'Medium', liquidity: 82, recommendation: 'Higher yield. Suitable for medium risk tolerance.' },
  { protocol: 'MarginFi', type: 'Lending', apy: 6.8, risk: 'Low', liquidity: 97, recommendation: 'Most conservative. Lending with high liquidity.' },
];

const riskGradient = (score: number) => {
  if (score <= 30) return 'from-success to-success/50';
  if (score <= 60) return 'from-warning to-warning/50';
  return 'from-destructive to-destructive/50';
};

const riskLabel = (score: number) => {
  if (score <= 25) return 'Conservative';
  if (score <= 50) return 'Moderate';
  if (score <= 75) return 'Growth';
  return 'Aggressive';
};

// ── Toast-like status banner ─────────────────────────────────────────────────

const StatusBanner: React.FC<{ type: 'success' | 'error'; message: string; signature?: string; onDismiss: () => void }> = ({
  type, message, signature, onDismiss,
}) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={`p-3 rounded-lg border flex items-center justify-between gap-3 mb-4 ${
      type === 'success'
        ? 'bg-success/5 border-success/20 text-success'
        : 'bg-destructive/5 border-destructive/20 text-destructive'
    }`}
  >
    <div className="flex items-center gap-2 text-xs font-medium">
      {type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      <span>{message}</span>
      {signature && (
        <a
          href={explorerTxUrl(signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline opacity-80 hover:opacity-100"
        >
          {signature.slice(0, 8)}... <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
    <button onClick={onDismiss} className="text-xs opacity-60 hover:opacity-100">dismiss</button>
  </motion.div>
);

// ── Main component ───────────────────────────────────────────────────────────

const VaultAnalytics: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const {
    vault,
    vaultExists,
    vaultLoading,
    vaultError,
    solBalance,
    initializeVault,
    updateRisk,
    depositTracking,
    refreshVault,
    txLoading,
    sdk,
  } = useNeuroVault();

  // Local UI state
  const [initRiskScore, setInitRiskScore] = useState(34);
  const [newRiskScore, setNewRiskScore] = useState(34);
  const [depositAmount, setDepositAmount] = useState('');
  const [showRiskEditor, setShowRiskEditor] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; signature?: string } | null>(null);

  // Sync risk slider when vault loads
  React.useEffect(() => {
    if (vault) setNewRiskScore(vault.riskToleranceScore);
  }, [vault]);

  const truncatedOwner = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : '—';

  const totalDepositedSol = vault
    ? (sdk?.toSol(vault.totalDeposited) ?? 0)
    : 0;

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleInitialize = async () => {
    setStatus(null);
    const result = await initializeVault(initRiskScore);
    if (result.success) {
      setStatus({ type: 'success', message: 'Vault initialized!', signature: result.data?.signature });
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed' });
    }
  };

  const handleUpdateRisk = async () => {
    setStatus(null);
    const result = await updateRisk(newRiskScore);
    if (result.success) {
      setStatus({ type: 'success', message: `Risk score updated to ${newRiskScore}`, signature: result.data?.signature });
      setShowRiskEditor(false);
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed' });
    }
  };

  const handleDeposit = async () => {
    setStatus(null);
    const lamports = Math.floor(parseFloat(depositAmount || '0') * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid amount' });
      return;
    }
    const result = await depositTracking(lamports);
    if (result.success) {
      setStatus({ type: 'success', message: `Tracked deposit of ${depositAmount} SOL`, signature: result.data?.signature });
      setDepositAmount('');
      setShowDepositForm(false);
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed' });
    }
  };

  // ── Not connected state ──────────────────────────────────────────────

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connect your wallet to view vault data</p>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────

  if (vaultLoading && !vault) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Loading vault from Solana {CLUSTER_LABEL}...</p>
      </div>
    );
  }

  // ── No vault — Initialize form ───────────────────────────────────────

  if (!vaultExists) {
    return (
      <div className="space-y-4">
        {status && <StatusBanner {...status} onDismiss={() => setStatus(null)} />}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-border bg-card/50 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Create Your Vault</h3>
          <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
            Initialize a PDA vault on Solana to track your deposits and risk preferences on-chain.
          </p>

          {/* Risk slider */}
          <div className="max-w-xs mx-auto mb-6">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 text-left">
              Risk Tolerance: {initRiskScore}/100 — {riskLabel(initRiskScore)}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={initRiskScore}
              onChange={(e) => setInitRiskScore(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full bg-secondary"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-success font-mono">0</span>
              <span className="text-[9px] text-warning font-mono">50</span>
              <span className="text-[9px] text-destructive font-mono">100</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleInitialize}
              disabled={txLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {txLoading ? 'Initializing...' : 'Initialize Vault'}
            </button>
            <p className="text-[10px] text-muted-foreground">
              SOL Balance: {solBalance.toFixed(4)} SOL
            </p>
          </div>

          {vaultError && (
            <p className="text-xs text-destructive mt-3">{vaultError}</p>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Vault exists — Full analytics ────────────────────────────────────

  const riskScore = vault!.riskToleranceScore;

  return (
    <div className="space-y-5">
      {status && <StatusBanner {...status} onDismiss={() => setStatus(null)} />}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            Program: {sdk?.programId.toString().slice(0, 8)}...
          </span>
        </div>
        <button
          onClick={refreshVault}
          disabled={vaultLoading}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${vaultLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Vault overview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl border border-border bg-card/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">PDA Vault</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
              On-Chain
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-success/10 text-success border border-success/20">
              Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Owner</p>
            <p className="text-sm font-mono font-medium text-foreground">{truncatedOwner}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Deposited</p>
            <p className="text-sm font-medium text-foreground">{totalDepositedSol.toFixed(4)} SOL</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">SOL Balance</p>
            <p className="text-sm font-medium text-foreground">{solBalance.toFixed(4)} SOL</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">PDA Bump</p>
            <p className="text-sm font-mono font-medium text-foreground">{vault!.bump}</p>
          </div>
        </div>

        {/* Deposit button */}
        <div className="mt-4 pt-4 border-t border-border">
          {showDepositForm ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.001"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="SOL amount"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40"
              />
              <button
                onClick={handleDeposit}
                disabled={txLoading || !depositAmount}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90"
              >
                {txLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Track Deposit
              </button>
              <button
                onClick={() => setShowDepositForm(false)}
                className="px-3 py-2 rounded-lg text-xs text-muted-foreground border border-border hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDepositForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Track New Deposit
            </button>
          )}
        </div>
      </motion.div>

      {/* Risk score with update */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl border border-border bg-card/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Risk Tolerance</h3>
          </div>
          <button
            onClick={() => setShowRiskEditor(!showRiskEditor)}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Settings className="w-3 h-3" /> {showRiskEditor ? 'Close' : 'Adjust'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(riskScore / 100) * 213.6} 213.6`}
                initial={{ strokeDashoffset: 213.6 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{riskScore}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{riskLabel(riskScore)} Profile</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              On-chain risk score {riskScore}/100 stored in your PDA vault.
            </p>
          </div>
        </div>

        {/* Risk progress bar */}
        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            key={riskScore}
            initial={{ width: 0 }}
            animate={{ width: `${riskScore}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full bg-gradient-to-r ${riskGradient(riskScore)}`}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-success font-mono">Conservative</span>
          <span className="text-[10px] text-warning font-mono">Moderate</span>
          <span className="text-[10px] text-destructive font-mono">Aggressive</span>
        </div>

        {/* Risk editor */}
        {showRiskEditor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-border"
          >
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
              New Score: {newRiskScore} — {riskLabel(newRiskScore)}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={newRiskScore}
              onChange={(e) => setNewRiskScore(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full bg-secondary mb-3"
            />
            <button
              onClick={handleUpdateRisk}
              disabled={txLoading || newRiskScore === riskScore}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90"
            >
              {txLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Update Risk Score On-Chain
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Yield opportunities (static off-chain data) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card/50 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Yield Opportunities</h3>
        </div>

        <div className="divide-y divide-border">
          {yieldOps.map((op, i) => (
            <motion.div
              key={op.protocol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-primary">{op.protocol[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{op.protocol}</p>
                    <p className="text-[11px] text-muted-foreground">{op.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">{op.apy}%</p>
                    <p className="text-[10px] text-muted-foreground">APY</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-4 ml-12">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Risk:</span>
                  <span className={`text-[10px] font-medium ${op.risk === 'Low' ? 'text-success' : op.risk === 'Medium' ? 'text-warning' : 'text-destructive'}`}>{op.risk}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Liquidity:</span>
                  <span className="text-[10px] font-medium text-foreground">{op.liquidity}%</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 ml-12">{op.recommendation}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default VaultAnalytics;
