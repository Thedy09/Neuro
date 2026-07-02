import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Shield, ExternalLink, Filter } from 'lucide-react';
import { CLUSTER_LABEL, explorerTxUrl } from '@/lib/solanaConfig';

interface Transaction {
  id: string;
  type: 'deposit' | 'bridge' | 'risk_update' | 'withdrawal';
  descriptionKey: string;
  descriptionParams?: Record<string, string>;
  amount: string;
  from?: string;
  to?: string;
  signature: string;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
}

const transactions: Transaction[] = [
  {
    id: '1',
    type: 'deposit',
    descriptionKey: 'history.descriptions.vaultDeposit',
    amount: '+$2,000.00',
    to: 'NEURO Vault',
    signature: '4xKm7nBr2pQw8vLc3dFh9sYm5tRk6wJb',
    timestamp: '2026-05-08 14:32',
    status: 'confirmed',
  },
  {
    id: '2',
    type: 'bridge',
    descriptionKey: 'history.descriptions.bridgeFrom',
    descriptionParams: { chain: 'Base' },
    amount: '+$300.00',
    from: 'Base (USDC)',
    to: 'Solana (USDC)',
    signature: '8nPr4kL2wQx6vBc9mHj3tRf7sYd5nGh8',
    timestamp: '2026-05-08 09:15',
    status: 'confirmed',
  },
  {
    id: '3',
    type: 'risk_update',
    descriptionKey: 'history.descriptions.riskUpdated',
    amount: '38 -> 34',
    signature: '2mQx5rT5vBn8kL3wPf7sYd9nGh4jRm6t',
    timestamp: '2026-05-07 18:45',
    status: 'confirmed',
  },
  {
    id: '4',
    type: 'deposit',
    descriptionKey: 'history.descriptions.vaultDeposit',
    amount: '+$5,120.00',
    to: 'NEURO Vault',
    signature: '9vBc2nH8kLm4wPf6sYd7tRj3qGh5xKn9',
    timestamp: '2026-05-05 11:20',
    status: 'confirmed',
  },
  {
    id: '5',
    type: 'bridge',
    descriptionKey: 'history.descriptions.bridgeFrom',
    descriptionParams: { chain: 'Ethereum' },
    amount: '+$1,000.00',
    from: 'Ethereum (USDC)',
    to: 'Solana (USDC)',
    signature: '6pLm3nK8wQx5vBc7sYd4tRf9hGj2rNb1',
    timestamp: '2026-05-04 16:08',
    status: 'confirmed',
  },
  {
    id: '6',
    type: 'deposit',
    descriptionKey: 'history.descriptions.vaultDeposit',
    amount: '+$1,000.00',
    to: 'NEURO Vault',
    signature: '3kWm8nPr5vLc2dFh7sYt4rQx9bGj6hN1',
    timestamp: '2026-05-03 09:00',
    status: 'confirmed',
  },
];

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  deposit: ArrowDownLeft,
  bridge: RefreshCw,
  risk_update: Shield,
  withdrawal: ArrowUpRight,
};

const typeColors: Record<string, string> = {
  deposit: 'bg-success/10 text-success',
  bridge: 'bg-primary/10 text-primary',
  risk_update: 'bg-warning/10 text-warning',
  withdrawal: 'bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-success',
  pending: 'bg-warning',
  failed: 'bg-destructive',
};

const TransactionHistory: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('history.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('history.subtitle', { count: transactions.length, cluster: CLUSTER_LABEL })}</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:text-foreground hover:border-primary/30 transition-all">
          <Filter className="w-3 h-3" />
          {t('history.filter')}
        </button>
      </div>

      {/* Transactions list */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden divide-y divide-border">
        {transactions.map((tx, i) => {
          const Icon = typeIcons[tx.type];
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="px-5 py-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeColors[tx.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t(tx.descriptionKey, tx.descriptionParams)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-4)}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColors[tx.status]}`} />
                      <span className="text-[10px] text-muted-foreground capitalize">{t(`history.status.${tx.status}`)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        tx.type === 'withdrawal' ? 'text-destructive' : tx.type === 'risk_update' ? 'text-warning' : 'text-success'
                      }`}
                    >
                      {tx.amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tx.timestamp}</p>
                  </div>
                  <a
                    href={explorerTxUrl(tx.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>

              {(tx.from || tx.to) && (
                <div className="flex items-center gap-2 mt-2 ml-12">
                  {tx.from && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-secondary text-secondary-foreground">
                      {tx.from}
                    </span>
                  )}
                  {tx.from && tx.to && <span className="text-[10px] text-muted-foreground">-&gt;</span>}
                  {tx.to && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-primary/10 text-primary">
                      {tx.to}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionHistory;
