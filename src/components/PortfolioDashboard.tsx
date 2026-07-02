/**
 * PortfolioDashboard — Portfolio overview with live on-chain vault data
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Shield, DollarSign, Layers, Activity, Loader2, WalletCards, AlertCircle, RefreshCw } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNeuroVault } from '@/hooks/useNeuroVault';
import { CLUSTER_LABEL } from '@/lib/solanaConfig';

const positions = [
  { protocol: 'Kamino', asset: 'USDC', deposited: '$4,200', apy: '8.2%', risk: 'Low', status: 'active' },
  { protocol: 'Drift', asset: 'USDC-SOL', deposited: '$2,800', apy: '12.4%', risk: 'Medium', status: 'active' },
  { protocol: 'MarginFi', asset: 'USDC', deposited: '$1,420', apy: '6.8%', risk: 'Low', status: 'active' },
  { protocol: 'Jito', asset: 'SOL', deposited: '$2,427', apy: '7.1%', risk: 'Low', status: 'staking' },
];

const riskColors: Record<string, string> = {
  Low: 'text-success bg-success/10 border-success/20',
  Medium: 'text-warning bg-warning/10 border-warning/20',
  High: 'text-destructive bg-destructive/10 border-destructive/20',
};

const PortfolioDashboard: React.FC = () => {
  const { connected } = useWallet();
  const { t } = useTranslation();
  const { vault, vaultExists, vaultLoading, vaultError, solBalance, sdk, refreshVault } = useNeuroVault();

  const totalDepositedSol = vault ? (sdk?.toSol(vault.totalDeposited) ?? 0) : 0;
  const riskScore = vault?.riskToleranceScore ?? 0;

  const stats = [
    {
      label: t('portfolio.solBalance'),
      value: connected ? `${solBalance.toFixed(4)} SOL` : '—',
      change: connected ? CLUSTER_LABEL : '',
      positive: true,
      icon: DollarSign,
      live: true,
    },
    {
      label: t('portfolio.vaultDeposited'),
      value: vaultExists ? `${totalDepositedSol.toFixed(4)} SOL` : connected ? t('portfolio.noVault') : '—',
      change: vaultExists ? t('portfolio.onChain') : '',
      positive: true,
      icon: Layers,
      live: vaultExists,
    },
    {
      label: t('portfolio.avgApy'),
      value: '9.4%',
      change: '+0.6%',
      positive: true,
      icon: TrendingUp,
      live: false,
    },
    {
      label: t('portfolio.riskScore'),
      value: vaultExists ? `${riskScore}/100` : connected ? '—' : '—',
      change: vaultExists ? t('portfolio.onChain') : '',
      positive: true,
      icon: Shield,
      live: vaultExists,
    },
  ];

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <WalletCards className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('portfolio.connectPrompt')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {vaultError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{vaultError}</span>
          </div>
          <button
            onClick={refreshVault}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/20 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="w-3 h-3" />
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              {vaultLoading && stat.live ? (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              ) : stat.change ? (
                <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${
                  stat.live ? 'text-primary' : stat.positive ? 'text-success' : 'text-destructive'
                }`}>
                  {!stat.live && stat.positive && <TrendingUp className="w-2.5 h-2.5" />}
                  {!stat.live && !stat.positive && <TrendingDown className="w-2.5 h-2.5" />}
                  {stat.change}
                </span>
              ) : null}
            </div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Active positions */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border border-border bg-card/50 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t('portfolio.activePositions')}</h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{t('portfolio.positionsCount', { count: positions.length })}</span>
        </div>

        <div className="divide-y divide-border">
          {positions.map((pos, i) => (
            <motion.div
              key={pos.protocol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{pos.protocol[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{pos.protocol}</p>
                  <p className="text-[11px] text-muted-foreground">{pos.asset}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{pos.deposited}</p>
                  <p className="text-[11px] font-mono text-success">{pos.apy} APY</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${riskColors[pos.risk]}`}>
                  {t(`portfolio.risk.${pos.risk}`)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Chain allocation */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-5 rounded-xl border border-border bg-card/50"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">{t('portfolio.chainAllocation')}</h3>
        <div className="space-y-3">
          {[
            { chain: 'Solana', pct: 85, value: `${solBalance.toFixed(2)} SOL` },
            { chain: 'Base', pct: 8, value: '—' },
            { chain: 'Ethereum', pct: 7, value: '—' },
          ].map((chain) => (
            <div key={chain.chain} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-16">{chain.chain}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${chain.pct}%` }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-full rounded-full bg-primary"
                  style={{ opacity: 0.3 + (chain.pct / 100) * 0.7 }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">{chain.pct}%</span>
              <span className="text-xs font-medium text-foreground w-20 text-right">{chain.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PortfolioDashboard;
